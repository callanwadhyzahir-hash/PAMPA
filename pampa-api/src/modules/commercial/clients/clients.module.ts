import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientRepository } from './repositories/client.repository';

@Module({
  imports: [SecurityAuditModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientRepository],
})
export class ClientsModule {}
