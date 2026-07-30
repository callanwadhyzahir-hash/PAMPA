import { IsString, Length } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @Length(3, 1000)
  reason!: string;
}
