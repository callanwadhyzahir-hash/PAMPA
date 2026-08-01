import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(/^\d{11}$/, { message: 'Ingresá un CUIT de 11 dígitos.' })
  taxId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Ingresá un correo electrónico válido.' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(12, {
    message: 'La contraseña debe tener al menos 12 caracteres.',
  })
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'La contraseña debe incluir una minúscula.' })
  @Matches(/[A-Z]/, { message: 'La contraseña debe incluir una mayúscula.' })
  @Matches(/\d/, { message: 'La contraseña debe incluir un número.' })
  password!: string;
}
