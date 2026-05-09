import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {Redis} from "ioredis";



@Injectable()
/**
 * @class RedisService
 * @description Сервис для работы с Redis в высоконагруженных системах.
 */
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private client: Redis;
	
	async onModuleInit() {
		this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
		this.logger.log('Redis client connected');
	}

	/**
	 * 
	 * @param key приходит с клиентской стороны
	 * @param ttl время до того как "протухнет"
	 * @returns Ожидаем булеан значение true & false
	 * @description Тут мы получаем уникальный ключ 
	 * на сутки с обязательным дополнением префикса имен.
	 * Используем флаг при котором redis проверяет есть ли ключ и если 
	 * его нет то он егу установит и пропишет "ok" в противном случает будет "null"
	 */
	async setIdempotencyKey(key: string, ttl: number=86400):Promise<boolean> {
		const result = await this.client.set(`idemp:${key}`, 'locked', 'EX', ttl, 'NX' )

		if (result === 'OK') {
      this.logger.log(`✅ Key [${key}] stored. Success.`);
      return true;
    }

		 // Если попали сюда — значит, это дубликат!
		 this.logger.warn(`⚠️ Duplicate detected! Key [${key}] already exists.`);
		 return false;

	}

	async onModuleDestroy() {
		
	}
}