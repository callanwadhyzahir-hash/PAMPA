import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateWarehouseDto {
  @IsUUID()
  branchId!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(1, 20)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
