import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductsDto } from './dto/create-products.dto';
import { UpdateProductsDto } from './dto/update-products.dto';
import { PrismaService } from 'src/prisma.service';
import { RedisService } from 'provider/redis/redis.service';
import { RaabbitMQService } from 'provider/rabbitmq/rabbitmq.service';
import { Product, ProductStatus } from 'prisma/client';

@Injectable()
export class ProductsService {
	private readonly logger = new Logger(ProductsService.name);

	constructor(
		private prisma: PrismaService, 
		private redis: RedisService, 
		private rabbit: RaabbitMQService
	) {}


	/**
	 * @param - ни чего не предаем
	 * @returns  - получаем полный массив всех товаров
	 * @description - Получаем все товары одним скопом но в определенном порядке сначале новые 
	 * товары а уже потом только те что есть
	 */
	async findAll(): Promise<Product[]> {
		this.logger.log('Fetching all products');
		return this.prisma.product.findMany({
			where: { status: 'ACTIVE' }, // Показываем только живые товары
			orderBy: { createdAt: 'desc' }, // Сначала новые
		});
	}

	/**
	 * @param - получение товара по его айди
	 * @description - получение товара по его айди 
	 */
	async findIdProduct(id: string): Promise<Product> {
		const product = await this.prisma.product.findUnique({
			where: { id },
		});
	
		if (!product) {
			throw new NotFoundException(`Товар с ID ${id} не найден`);
		}
	
		return product;
	}

	/**
	 * @param - получение товара по его имени
	 * @description - получение товара по его имени будут выведенны все товары разом с этим именем
	 */
	async findProductName(name: string): Promise<Product[]> {
		const product = await this.prisma.product.findMany({
			where: { 
				name: {
          contains: name, // Поиск по части имени (LIKE в SQL)
          mode: 'insensitive' // Игнорировать регистр (чтобы "Кеды" и "кеды" находились одинаково)
        }
			 },
		});
	
		if (product.length === 0) {
      throw new NotFoundException(`Товары с именем "${name}" не найдены`);
    }
	
		return product;
	}

	 /**
		* @param dto
   * @description Создание товара с гарантией атомарности
   * @returns Promise<Product> - возвращаем объект созданного товара
   */
	 async createProduct(dto: CreateProductsDto):Promise<Product> {
    // 1. Идемпотентность (Redis) - Проверяем замок
    const isNewRequest = await this.redis.setIdempotencyKey(dto.messageId);
    if (!isNewRequest) {
      throw new ConflictException('Дубликат запроса: этот UUID уже в работе');
    }

    try {
      // 2. Транзакция (PostgreSQL) - Атомарность данных
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
						categoryId: 'default-category',
            name: dto.name,
            slug: dto.slug,
            sku: dto.sku,
            price: dto.price,
            description: dto.description,
            status: 'PENDING', // Стартуем Сагу
          },
        });

        // 3. Связь (RabbitMQ) - Гарантированная отправка
        const isSent = await this.rabbit.sendProductEvent({
          ...product,
          messageId: dto.messageId,
        });

        if (!isSent) {
          // Если Кролик не подтвердил — "взрываем" транзакцию для отката
          throw new Error('RabbitMQ Confirm Failed');
        }

        this.logger.log(`Product [${product.sku}] created and event sent`);
        return product;
      });
    } catch (error) {
      // 4. ROLLBACK в Redis
      await this.redis.deleteIdempotencyKey(dto.messageId);
      this.logger.error(`Rollback executed for request [${dto.messageId}]`, error.stack);
      
      throw new InternalServerErrorException('Ошибка при создании товара. Данные откачены.');
    }
  }



	  /**
   * @description Смена статуса товара с использованием пессимистической блокировки (FOR UPDATE).
   * 
   */
		async updateStatusWithLock(id: string, status: ProductStatus, messageId: string): Promise<Product> {
			// 1. Идемпотентность (Redis)
			const isNewRequest = await this.redis.setIdempotencyKey(messageId);
			if (!isNewRequest) {
				throw new ConflictException('Дубликат запроса на смену статуса');
			}
	
			try {
				// 2. Запускаем транзакцию с сырым SQL внутри
				return await this.prisma.$transaction(async (tx) => {
					
					// Мы блокируем строку товара до конца транзакции. 
					// Если другой процесс захочет её изменить в это же время — он будет ждать.
					// Другими словами это атомарный процесс
					const [product]: Product[] = await tx.$queryRaw`
						SELECT * FROM products 
						WHERE id = ${id} 
						FOR UPDATE
					`;
	
					if (!product) {
						throw new NotFoundException(`Товар с ID ${id} не найден для блокировки`);
					}
	
					// 3. Выполняем обновление уже заблокированной строки
					const updatedProduct = await tx.product.update({
						where: { id },
						data: { status },
					});
	
					// 4. Отправляем событие в Кролика (Гарантия доставки)
					const isSent = await this.rabbit.sendProductEvent({
						...updatedProduct,
						messageId,
					});
	
					if (!isSent) {
						throw new Error('RabbitMQ не подтвердил событие смены статуса');
					}
	
					this.logger.log(`Product [${id}] locked, updated to ${status} and confirmed`);
					return updatedProduct;
				});
			} catch (error) {
				// 5. Откат (Rollback)
				await this.redis.deleteIdempotencyKey(messageId);
				this.logger.error(`Failed to update status for product [${id}]`, error.stack);
				throw new InternalServerErrorException('Ошибка при обновлении статуса. Блокировка снята.');
			}
		}
	



	async removeProduct(id: string): Promise<Product> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
				data: { status: 'ARCHIVED' }, // Вместо удаления - в архив
      });
      this.logger.log(`Product [${product.name}] moved to Archive`);
    	return product;
    } catch (error) {
      this.logger.error(`Error archiving product [${id}]`, error);
      throw new NotFoundException('Товар не найден или уже удален');
    }
  }


}
