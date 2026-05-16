import { Module } from "@nestjs/common";
import { RabbitMQService } from './rabbitmq.service';
import { ConditionalModule } from "@nestjs/config";

@Module({
	imports: [ConditionalModule],
	exports: [RabbitMQService],
	providers: [RabbitMQService]
})
export class RabbitMQModule {}