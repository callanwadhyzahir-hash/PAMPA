import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString, IsUUID, Length, Min } from 'class-validator';

export class StockAdjustmentDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsIn([
    'INITIAL',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'RETURN_IN',
    'RETURN_OUT',
  ])
  movementType!:
    'INITIAL' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN_IN' | 'RETURN_OUT';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsString()
  @Length(3, 1000)
  reason!: string;
}
