import { INestApplication, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "prisma/client";


export class PrismaService extends PrismaClient implements OnModuleInit {
	constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

	async onModuleDestroy() {
    await this.$disconnect();
  }

	async enableShutdownHooks(app: INestApplication) {
    app.enableShutdownHooks()
  }
}