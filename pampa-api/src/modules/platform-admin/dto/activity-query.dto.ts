import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  SECURITY_EVENT_TYPES,
  type SecurityEventType,
} from '../../auth/audit/security-event-types';

export class PlatformActivityQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMaxSize(SECURITY_EVENT_TYPES.length)
  @IsIn(SECURITY_EVENT_TYPES, { each: true })
  eventTypes?: SecurityEventType[];

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'FAILURE', 'BLOCKED'])
  result?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';

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
  limit = 30;
}
