import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../database/prisma.module';
import { RbacModule } from '../modules/auth/rbac/rbac.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RbacModule],
})
export class RbacCliModule {}
