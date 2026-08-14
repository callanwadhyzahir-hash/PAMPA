import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { RbacModule } from '../../auth/rbac/rbac.module';
import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, RbacModule, SecurityAuditModule],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
})
export class UsersModule {}
