import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @Length(1, 50)
  label!: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  skuSuffix?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
