import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PaymentItemDto {
  @IsIn([
    'CASH',
    'BANK_TRANSFER',
    'DEBIT_CARD',
    'CREDIT_CARD',
    'MERCADO_PAGO_MANUAL',
    'OTHER',
  ])
  method!:
    | 'CASH'
    | 'BANK_TRANSFER'
    | 'DEBIT_CARD'
    | 'CREDIT_CARD'
    | 'MERCADO_PAGO_MANUAL'
    | 'OTHER';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}

export class CreatePaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items!: PaymentItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CancelPaymentDto {
  @IsString()
  @Length(3, 1000)
  reason!: string;
}
