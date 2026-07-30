import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '',
  )
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'La contraseña debe incluir una minúscula.' })
  @Matches(/[A-Z]/, { message: 'La contraseña debe incluir una mayúscula.' })
  @Matches(/\d/, { message: 'La contraseña debe incluir un número.' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'La contraseña debe incluir un símbolo.',
  })
  temporaryPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}
