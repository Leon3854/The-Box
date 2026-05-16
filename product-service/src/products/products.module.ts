import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { RedisService } from 'provider/redis/redis.service';
import { RabbitMQService } from 'provider/rabbitmq/rabbitmq.service';
import { PrismaService } from 'src/prisma.service';

@Module({
	controllers: [ProductsController],
	providers: [ProductsService, PrismaService, RedisService, RabbitMQService],
})
export class ProductsModule {}
