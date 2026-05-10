import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqp-connection-manager";


@Injectable()
export class RaabbitMQService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RaabbitMQService.name)
	private connection: amqp.AmqpConnectionManager;
	private channelWrapper: amqp.ChannelWrapper;

	/**
	 * @description - В данном хуке настроили как само соедиение с файлом окружения
	 * и в случае "отвала" файла env так и автоматическое востановление, перезапуск и
	 * сразу же настроили DLX - отстойники "больных и прокаженных" сообщений
	 * что бы наш брокер не приворотился в "карусель бессмысленных" битых JSON сообщений
	 * или поврежденного или неверного Id при использовании ретраев.
	 */
	async onModuleInit() {

		const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

		// 1. Создаем менеджер соединений
		this.connection = amqp.connect([rabbitMqUrl]);

		// 2. Создаем именно WRAPPER. Он — сердце надежности.
		this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: any) => {
        // Эта функция выполнится ПРИ КАЖДОМ реконнекте автоматически
        this.logger.log('🛠️ Asserting Queue: product_events');
        return channel.assertQueue('product_events',
					{ 
						durable: true,
						arguments: {
							'x-dead-letter-exchange': 'product_events_dlx', // Куда слать "трупы"
							'x-dead-letter-routing-key': 'failed_orders',
						}
				});
      },
		});

    this.connection.on('connect', () => this.logger.log('✅ RabbitMQ Connected'));
    this.connection.on('disconnect', (err) => this.logger.error('❌ RabbitMQ Disconnected', err.err));
	}

	/**
	 * @data - какието данные 
	 * @Promise - булеан значение ож
   * @description Отправка события создания/обновления товара с подтверждением
   */
		async sendProductEvent(data: any): Promise<boolean> {
			try {
				// Отправляем в очередь product_events (которую мы объявили в setup)
				const result = await this.channelWrapper.sendToQueue('product_events', data, {
					persistent: true,          // Выживет при падении Кролика
					messageId: data.messageId, // Твой UUID
				});
	
				this.logger.log(`🚀 Product Event [${data.messageId}] sent and confirmed`);
				return result;
			} catch (error) {
				this.logger.error(`❌ Failed to send product event [${data.messageId}]`, error);
				return false;
			}
		}
	

	/**
	 * @description Мягкое завершение всех опираций
	 */
	async onModuleDestroy() {
		try{
			// закрытие умного канала
			if (this.channelWrapper) {
				await this.channelWrapper.close();
			}
			// закрытие соединения
			if(this.connection) {
				await this.connection.close();
			}
			this.logger.log('RabbitMQ connection closed');
		} catch(error) {
			this.logger.error('Error closing RabbitMQ connection', error);
		}
	}
}