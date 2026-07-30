import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name: string;

  @IsString()
  @Length(2, 2)
  isoCode: string;

  @IsOptional()
  @IsString()
  phoneCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
