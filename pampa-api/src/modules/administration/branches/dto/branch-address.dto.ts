import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class BranchAddressDto {
  @IsUUID()
  cityId!: string;

  @IsString()
  @MaxLength(150)
  street!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  apartment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;
}
