import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsIn(['not_started', 'in_progress', 'completed', 'skipped'])
  status!: 'not_started' | 'in_progress' | 'completed' | 'skipped';

  @IsOptional()
  @IsInt()
  @Min(0)
  currentStep?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  onboardingVersion?: number;
}
