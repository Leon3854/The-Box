import { Controller, Get, Post, Body, Patch, Param, Delete, Logger, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductsDto } from './dto/create-products.dto';
import { UpdateProductsDto } from './dto/update-products.dto';
import { Product } from 'prisma/client';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('products')
export class ProductsController {
	private readonly logger = new Logger(ProductsController.name);
  constructor(private readonly productsService: ProductsService) {}

	/**
   * @description Получение витрины (всех активных товаров)
   */
	@Get()
  async findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

	/**
	 * @param - id товара
   * @description Точечный запрос по ID с валидацией UUID в параметрах
   */
	@Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findIdProduct(id);
  }

	/**
	 * @param - наименование товара
   * @description Поиск по имени (использует индекс БД)
   */
	@Get('search/:name')
  async findByName(@Param('name') name: string): Promise<Product[]> {
    return this.productsService.findProductName(name);
  }

	/**
   * @description Создание нового товара с защитой от дублей (идемпотентность)
   */
	@Post()
  async create(@Body() createProductsDto: CreateProductsDto): Promise<Product> {
    this.logger.log(`Request to create product: ${createProductsDto.sku}`);
    return this.productsService.createProduct(createProductsDto);
  }

	/**
   * @description Смена статуса через Pessimistic Locking (SELECT FOR UPDATE)
   */
	@Patch(':id/status')
  async updateProductsStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<Product> {
    this.logger.log(`Request to change status for product ${id} to ${updateStatusDto.status}`);
    return this.productsService.updateStatusWithLock(
      id,
      updateStatusDto.status,
      updateStatusDto.messageId,
    );
  }

	/**
	 * @param - по id
   * @description Мягкое удаление (архивация) товара. 
   * Мы не удаляем данные физически, чтобы сохранить консистентность системы.
   */
	@Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    this.logger.log(`Request to archive product: ${id}`);
    return this.productsService.removeProduct(id);
  }

}
