import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * @class UpdateProductDto
 * @description Наследуем всё от Create, но делаем поля необязательными.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
	// messageId всё равно оставляем обязательным! 
	// Даже при обновлении мы должны соблюдать идемпотентность.
	@IsUUID()
	@IsNotEmpty()
	messageId: string;
}
