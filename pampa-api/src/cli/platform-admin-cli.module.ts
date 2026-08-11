import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../database/prisma.module';
import { PlatformAdminBootstrapService } from '../modules/platform-admin/platform-admin-bootstrap.service';
import { PlatformAdminRepository } from '../modules/platform-admin/platform-admin.repository';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [PlatformAdminRepository, PlatformAdminBootstrapService],
})
export class PlatformAdminCliModule {}
