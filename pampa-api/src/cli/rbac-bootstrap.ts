import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { RbacBootstrapService } from '../modules/auth/rbac/rbac-bootstrap.service';
import { RbacCliModule } from './rbac-cli.module';

async function main() {
  const logger = new Logger('RbacBootstrap');
  const app = await NestFactory.createApplicationContext(RbacCliModule, {
    logger: ['error', 'log'],
  });

  try {
    const service = app.get(RbacBootstrapService);
    const summary = await service.bootstrap();
    logger.log(
      `Synchronized ${summary.permissionsSynchronized} permissions, ` +
        `${summary.systemRolesSynchronized} system roles and ` +
        `${summary.rolePermissionSetsSynchronized} role permission sets ` +
        `for ${summary.activeCompanies} active companies.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const logger = new Logger('RbacBootstrap');
  logger.error(
    error instanceof Error ? error.message : 'RBAC bootstrap failed.',
  );
  process.exitCode = 1;
});
