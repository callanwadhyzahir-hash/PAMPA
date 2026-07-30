import { Type } from 'class-transformer';
import { IsNumber, IsString, IsUUID, Length, Min } from 'class-validator';

export class StockTransferDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  sourceWarehouseId!: string;

  @IsUUID()
  targetWarehouseId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsString()
  @Length(3, 1000)
  reason!: string;
}
