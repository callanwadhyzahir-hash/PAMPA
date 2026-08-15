import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const RECENCY_WINDOWS = [7, 30, 90] as const;

export class PlatformCompanyQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsIn(['WITH', 'WITHOUT'])
  hasUsers?: 'WITH' | 'WITHOUT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(RECENCY_WINDOWS)
  createdWithinDays?: 7 | 30 | 90;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
