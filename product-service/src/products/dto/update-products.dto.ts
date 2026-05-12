import { PartialType } from '@nestjs/mapped-types';
import { CreateProductsDto } from './create-products.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * @class UpdateProductDto
 * @description Наследуем всё от Create, но делаем поля необязательными.
 */
export class UpdateProductsDto extends PartialType(CreateProductsDto) {
	// messageId всё равно оставляем обязательным! 
	// Даже при обновлении мы должны соблюдать идемпотентность.
	@IsUUID()
	@IsNotEmpty()
	messageId: string;
}
