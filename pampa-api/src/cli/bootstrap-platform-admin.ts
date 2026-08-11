import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { PlatformAdminBootstrapService } from '../modules/platform-admin/platform-admin-bootstrap.service';
import { PlatformAdminCliModule } from './platform-admin-cli.module';

function getEmailArgument(args: string[]) {
  const inline = args.find((argument) => argument.startsWith('--email='));
  if (inline) return inline.slice('--email='.length);

  const index = args.indexOf('--email');
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const logger = new Logger('BootstrapPlatformAdmin');
  const email = getEmailArgument(process.argv.slice(2));

  if (!email) {
    throw new Error('Required argument: --email=<user-email>');
  }

  const app = await NestFactory.createApplicationContext(
    PlatformAdminCliModule,
    { logger: ['error', 'log'] },
  );

  try {
    const service = app.get(PlatformAdminBootstrapService);
    const result = await service.bootstrapByEmail(email);
    logger.log(
      `${result.alreadyPlatformAdmin ? 'Confirmed' : 'Granted'} PLATFORM_ADMIN ` +
        `for ${result.userName} (tenant: ${result.companyName}).`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const logger = new Logger('BootstrapPlatformAdmin');
  logger.error(
    error instanceof Error ? error.message : 'PlatformAdmin bootstrap failed.',
  );
  process.exitCode = 1;
});
