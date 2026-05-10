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
        this.logger.log('🛠️ Asserting Queue: order_events');
        return channel.assertQueue('order_events',
					{ 
						durable: true,
						arguments: {
							'x-dead-letter-exchange': 'order_events_dlx', // Куда слать "трупы"
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
   * @description Отправка заказа с подтверждением и встроенным ретраем транспорта
   */
  async sendOrderEvent(data: any): Promise<boolean> {
    try {
      // ChannelWrapper сам сделает ретрай отправки, если сеть моргнет
      const result = await this.channelWrapper.sendToQueue('order_events', data, {
        persistent: true,     // Сообщение выживет при рестарте Кролика
        messageId: data.messageId, // Твой UUID для идемпотентности
      });

      this.logger.log(`🚀 Order [${data.messageId}] sent and confirmed by Broker`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Permanent failure sending order [${data.messageId}]`, error);
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