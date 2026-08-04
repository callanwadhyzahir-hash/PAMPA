import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { PrismaModule } from '../database/prisma.module';
import { ArcaConfigService } from '../modules/fiscal/arca/arca.config';
import { ArcaInvoiceFiscalizationService } from '../modules/fiscal/arca-invoice-fiscalization.service';
import { FiscalModule } from '../modules/fiscal/fiscal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FiscalModule.forRoot(),
  ],
})
class ArcaWsfeIssueInvoiceModule {}

async function main() {
  const [companyId, invoiceId] = process.argv.slice(2);
  if (!companyId || !invoiceId) {
    console.error(
      'Uso: ts-node src/cli/arca-wsfe-issue-invoice.ts <companyId> <invoiceId>',
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(
    ArcaWsfeIssueInvoiceModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const arcaConfig = app.get(ArcaConfigService);
    const fiscalization = app.get(ArcaInvoiceFiscalizationService);

    const result = await fiscalization.fiscalize({
      companyId,
      invoiceId,
      environment: arcaConfig.config.environment,
    });

    if (result.status === 'APPROVED') {
      console.log('ARCA WSFE (homologation): OK');
      console.log(`Resultado: APROBADO`);
      console.log(`CAE: ${result.cae}`);
      console.log(
        `Vencimiento: ${result.caeExpiration ? result.caeExpiration.toISOString() : '(sin vencimiento)'}`,
      );
    } else {
      console.log(`Resultado: ${result.status}`);
      console.log(`Codigo de error: ${result.errorCode ?? '(sin codigo)'}`);
      console.log(`Mensaje: ${result.errorMessage ?? '(sin mensaje)'}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.name : 'UnknownError');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
