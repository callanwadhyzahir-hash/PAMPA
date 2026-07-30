import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
