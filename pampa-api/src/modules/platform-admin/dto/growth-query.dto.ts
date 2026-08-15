import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

const GROWTH_WINDOWS = [7, 30, 90] as const;

export class PlatformGrowthQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(GROWTH_WINDOWS)
  days: 7 | 30 | 90 = 30;
}
