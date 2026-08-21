import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSecurityContext } from '../auth/decorators/current-security-context.decorator';
import type { SecurityContext } from '../auth/types/security-context';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { OnboardingRepository } from './onboarding.repository';

@ApiTags('Onboarding')
@ApiCookieAuth('pampa_access')
@Controller()
export class OnboardingController {
  constructor(private readonly repository: OnboardingRepository) {}

  @Get('onboarding/progress')
  progress(@CurrentSecurityContext() context: SecurityContext) {
    return this.repository.listProgress(context.userId);
  }

  @Put('onboarding/progress/:tourId')
  updateProgress(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('tourId') tourId: string,
    @Body() body: UpdateProgressDto,
  ) {
    return this.repository.upsertProgress(
      context.userId,
      context.companyId,
      tourId,
      body,
    );
  }

  @Get('onboarding/setup-status')
  setupStatus(@CurrentSecurityContext() context: SecurityContext) {
    return this.repository.setupStatus(context.companyId);
  }
}
