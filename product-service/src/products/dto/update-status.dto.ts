import { IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { ProductStatus } from 'prisma/client'; // Берем Enum прямо из Призмы

/**
 * @class UpdateStatusDto
 * @description DTO специально для смены статуса товара (Saga Step)
 */
export class UpdateStatusDto {
  @IsEnum(ProductStatus, { message: 'Некорректный статус товара' })
  @IsNotEmpty()
  status: ProductStatus;

  @IsUUID('4', { message: 'messageId должен быть валидным UUID' })
  @IsNotEmpty()
  messageId: string; // Наш ключ идемпотентности
}
