import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { AI_PLAN_CODES } from '../../common/ai-plans';

export class UpdateAiSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(AI_PLAN_CODES)
  planCode?: (typeof AI_PLAN_CODES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  monthlyCreditLimit?: number;

  /** USD, e.g. "25.00" — string to avoid float precision loss in transit; parsed into Prisma.Decimal server-side. */
  @IsOptional()
  @IsNumberString()
  internalCostLimitUsd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
