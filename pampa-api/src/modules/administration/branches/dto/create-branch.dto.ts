import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { BranchAddressDto } from './branch-address.dto';

export class CreateBranchDto {
  @IsString()
  @Length(1, 150)
  name!: string;

  @IsString()
  @Length(1, 20)
  code!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ValidateNested()
  @Type(() => BranchAddressDto)
  address!: BranchAddressDto;
}
