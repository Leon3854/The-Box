import { 
  IsString, 
  IsNumber, 
  IsUUID, 
  IsNotEmpty, 
  Min, 
  MaxLength, 
  Matches 
} from 'class-validator';

/**
 * @class CreateProductDto
 * @description Входные ворота для создания товара. 
 * Каждый атрибут — это титановая защита.
 */
export class CreateProductDto {

	@IsNotEmpty({ message: 'messageId (UUID) обязателен для обеспечения идемпотентности' })
  @IsUUID('4', { message: 'messageId должен быть валидным UUID v4' })
  messageId: string; // Наш ключ для Redis

	@IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9\sа-яА-ЯёЁ-]+$/, { 
    message: 'Название содержит недопустимые символы (защита от XSS/инъекций)' 
  })
  name: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	@Matches(/^[a-z0-9-]+$/, { 
    message: 'SLUG должен состоять из строчных латинских букв, цифр и дефисов' 
  })
	slug: string;

	@IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, { 
    message: 'SKU должен состоять только из заглавных букв, цифр и дефисов' 
  })
  sku: string; // Артикул — наш уникальный ключ для Склада

	@IsNumber({}, { message: 'Цена должна быть числом' })
  @Min(1, { message: 'Цена не может быть меньше 1' })
  price: number;

  @IsString()
  @MaxLength(2000)
	@Matches(/^[a-zA-Z0-9\sа-яА-ЯёЁ.,!?-]+$/, { 
    message: 'DESCRIPTION содержит недопустимые спецсимволы' 
  })
  description?: string;
}
