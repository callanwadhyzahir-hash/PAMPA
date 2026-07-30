import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { TenantIntegrityService } from '../database/integrity/tenant-integrity.service';
import { TenantIntegrityAuditModule } from './tenant-integrity-audit.module';

async function main() {
  const logger = new Logger('TenantIntegrityAudit');
  const app = await NestFactory.createApplicationContext(
    TenantIntegrityAuditModule,
    { logger: ['error', 'log'] },
  );
  try {
    const result = await app.get(TenantIntegrityService).auditOrFail();
    logger.log(`Audit passed: ${JSON.stringify(result)}`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const logger = new Logger('TenantIntegrityAudit');
  logger.error(
    error instanceof Error ? error.message : 'Tenant integrity audit failed.',
  );
  process.exitCode = 1;
});
