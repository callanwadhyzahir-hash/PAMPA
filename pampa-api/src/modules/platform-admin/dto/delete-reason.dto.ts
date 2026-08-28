import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
