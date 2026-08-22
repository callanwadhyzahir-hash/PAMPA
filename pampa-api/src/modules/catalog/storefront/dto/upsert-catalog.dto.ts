import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpsertCatalogDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsString()
  @Length(3, 60)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'El enlace solo puede tener minúsculas, números y guiones (ej: mi-negocio).',
  })
  slug!: string;

  @IsString()
  @Length(2, 150)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsBoolean()
  isEnabled!: boolean;

  @IsBoolean()
  showPrices!: boolean;

  @IsBoolean()
  showAvailability!: boolean;
}
