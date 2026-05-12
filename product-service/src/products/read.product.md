  /**
   * @description Смена статуса товара с использованием пессимистической блокировки (FOR UPDATE).
   * и так! простыми словами: - 1. мы создаем уникальный ключ по messageId далее провераяем не существует ли уже такой ключ это нам нужно будет в дальнейшем(классика работы) далее через асинхронно запустили транзакцию и она будет атомарной из за использования $transaction а еще все это становиться асинхронными в нутри асинхронности и таким образом это все асинхронная-асинхронность, все работы будут выполнены в нутри объекта tx результат либо все из этого объекта будет принято либо будет полный отказ, а использование $queryRaw просто отправляет запрос бд. Дальше у нас идет по классике условиае все ок или не. Если все ок! то обновляем заблокированный товар с которым работаем и все заряжаем в кролика если есть изменения. Если крлик не принял или что то пошло не так то  вылетит ошибка если все ок то в терминал вываодим сообщение о том что все ок и возращаем обнавленный товар. В  случае ошибки  удаляем ключ в терминал вываодим сообщение и выбрасываем исключение(для системы) с сообщением.
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
        
        // --- ВОТ ОНА, ФИЗИКА БАЗЫ (SELECT FOR UPDATE) ---
        // Мы блокируем строку товара до конца транзакции. 
        // Если другой процесс захочет её изменить в это же время — он будет ждать.
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

        this.logger.log(`🔒 Product [${id}] locked, updated to ${status} and confirmed`);
        return updatedProduct;
      });
    } catch (error) {
      // 5. Откат (Rollback)
      await this.redis.deleteIdempotencyKey(messageId);
      this.logger.error(`❌ Failed to update status for product [${id}]`, error.stack);
      throw new InternalServerErrorException('Ошибка при обновлении статуса. Блокировка снята.');
    }
  }
