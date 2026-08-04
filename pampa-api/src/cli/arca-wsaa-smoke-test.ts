import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ArcaModule } from '../modules/fiscal/arca/arca.module';
import { ArcaWsaaService } from '../modules/fiscal/arca/arca-wsaa.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ArcaModule],
})
class ArcaWsaaSmokeTestModule {}

async function main() {
  const logger = new Logger('ArcaWsaaSmokeTest');
  const app = await NestFactory.createApplicationContext(
    ArcaWsaaSmokeTestModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const service = app.get(ArcaWsaaService);
    const ticket = await service.getAccessTicket();
    console.log('ARCA WSAA (homologation): OK');
    console.log(`Vencimiento: ${ticket.expirationTime.toISOString()}`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const logger = new Logger('ArcaWsaaSmokeTest');
  if (error instanceof Error) {
    logger.error(error.name);
    logger.error(error.message);
    const cause = (error as { cause?: unknown }).cause;
    if (cause !== undefined) {
      logger.error(
        `cause: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  } else {
    logger.error('UnknownError: ARCA WSAA smoke test failed.');
  }
  process.exitCode = 1;
});
