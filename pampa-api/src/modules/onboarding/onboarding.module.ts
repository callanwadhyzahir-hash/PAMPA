import { Module } from '@nestjs/common';

import { OnboardingController } from './onboarding.controller';
import { OnboardingRepository } from './onboarding.repository';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingRepository],
})
export class OnboardingModule {}
