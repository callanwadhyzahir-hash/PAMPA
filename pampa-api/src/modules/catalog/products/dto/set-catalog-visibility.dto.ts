import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class SetCatalogVisibilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  productIds!: string[];

  @IsBoolean()
  visible!: boolean;
}
