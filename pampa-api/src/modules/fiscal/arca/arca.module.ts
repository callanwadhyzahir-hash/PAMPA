import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ArcaConfigService } from './arca.config';
import { ArcaWsaaService } from './arca-wsaa.service';
import { ArcaWsfeService } from './arca-wsfe.service';

@Module({
  imports: [ConfigModule],
  providers: [ArcaConfigService, ArcaWsaaService, ArcaWsfeService],
  exports: [ArcaWsaaService, ArcaWsfeService],
})
export class ArcaModule {}
