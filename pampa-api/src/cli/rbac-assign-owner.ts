import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { RbacBootstrapService } from '../modules/auth/rbac/rbac-bootstrap.service';
import { RbacCliModule } from './rbac-cli.module';

function getEmailArgument(args: string[]) {
  const inline = args.find((argument) => argument.startsWith('--email='));
  if (inline) return inline.slice('--email='.length);

  const index = args.indexOf('--email');
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const logger = new Logger('RbacAssignOwner');
  const email = getEmailArgument(process.argv.slice(2));

  if (!email) {
    throw new Error('Required argument: --email=<user-email>');
  }

  const app = await NestFactory.createApplicationContext(RbacCliModule, {
    logger: ['error', 'log'],
  });

  try {
    const service = app.get(RbacBootstrapService);
    const result = await service.assignInitialOwnerByEmail(email);
    logger.log(
      `${result.alreadyAssigned ? 'Confirmed' : 'Assigned'} ${result.roleCode} ` +
        `for ${result.userName} in ${result.companyName}.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const logger = new Logger('RbacAssignOwner');
  logger.error(
    error instanceof Error ? error.message : 'OWNER assignment failed.',
  );
  process.exitCode = 1;
});
