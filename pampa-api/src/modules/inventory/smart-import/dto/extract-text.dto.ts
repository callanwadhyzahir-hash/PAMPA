import { IsOptional, IsString, Length } from 'class-validator';

export class ExtractTextDto {
  @IsString()
  @Length(1, 20000)
  text!: string;
}

export class ExtractImageDto {
  /** Optional extra context typed alongside the photo (e.g. "es una factura"). */
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  text?: string;
}
