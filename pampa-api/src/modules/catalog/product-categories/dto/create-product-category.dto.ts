import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export const PRODUCT_CATEGORY_ATTRIBUTE_KINDS = [
  'NONE',
  'SIZE',
  'VOLUME_ML',
  'VOLUME_L',
  'CUSTOM',
] as const;

export type ProductCategoryAttributeKind =
  (typeof PRODUCT_CATEGORY_ATTRIBUTE_KINDS)[number];

export class CreateProductCategoryDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_CATEGORY_ATTRIBUTE_KINDS)
  attributeKind?: ProductCategoryAttributeKind;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  attributeOptions?: string[];
}
