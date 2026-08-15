import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { SYSTEM_ROLE_CODES } from '../../auth/rbac/rbac.definitions';

const RECENCY_WINDOWS = [7, 30, 90] as const;
const SORT_FIELDS = [
  'createdAt',
  'lastLoginAt',
  'firstName',
  'company',
] as const;

export class PlatformUserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsIn(['VERIFIED', 'PENDING'])
  emailVerified?: 'VERIFIED' | 'PENDING';

  @IsOptional()
  @IsIn(SYSTEM_ROLE_CODES)
  roleCode?: (typeof SYSTEM_ROLE_CODES)[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  neverLoggedIn?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(RECENCY_WINDOWS)
  createdWithinDays?: 7 | 30 | 90;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: (typeof SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

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
