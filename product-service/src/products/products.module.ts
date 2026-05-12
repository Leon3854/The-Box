import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { RedisService } from 'provider/redis/redis.service';
import { RaabbitMQService } from 'provider/rabbitmq/rabbitmq.service';
import { PrismaService } from 'src/prisma.service';

@Module({
	imports: [RedisService, RaabbitMQService],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
})
export class ProductsModule {}
