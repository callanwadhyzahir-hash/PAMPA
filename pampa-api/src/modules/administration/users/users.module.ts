import { Module } from '@nestjs/common';

import { RbacModule } from '../../auth/rbac/rbac.module';
import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RbacModule, SecurityAuditModule],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
})
export class UsersModule {}
