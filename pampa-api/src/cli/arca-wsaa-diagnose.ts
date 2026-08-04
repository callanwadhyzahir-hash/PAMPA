import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ArcaModule } from '../modules/fiscal/arca/arca.module';
import {
  ARCA_FETCH,
  ArcaWsaaService,
  FetchLike,
} from '../modules/fiscal/arca/arca-wsaa.service';

const diagnoseLogger = new Logger('ArcaWsaaDiagnose');

function sanitize(text: string): string {
  return text
    .replace(/<([\w:]*token)>[\s\S]*?<\/\1>/gi, '<$1>[REDACTED]</$1>')
    .replace(/<([\w:]*sign)>[\s\S]*?<\/\1>/gi, '<$1>[REDACTED]</$1>')
    .replace(/<([\w:]*in0)>[\s\S]*?<\/\1>/gi, '<$1>[REDACTED CMS]</$1>')
    .replace(
      /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g,
      '[REDACTED CERTIFICATE/KEY]',
    );
}

const diagnosticFetch: FetchLike = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method ?? 'GET';
  const requestHeaders = new Headers(init?.headers);

  diagnoseLogger.log(`URL: ${url}`);
  diagnoseLogger.log(`Metodo HTTP: ${method}`);
  diagnoseLogger.log(
    `Content-Type enviado: ${requestHeaders.get('Content-Type') ?? '(no definido)'}`,
  );

  const response = await fetch(input, init);
  const inspectable = response.clone();

  diagnoseLogger.log(`HTTP status: ${inspectable.status} ${inspectable.statusText}`);
  diagnoseLogger.log('Headers de respuesta:');
  inspectable.headers.forEach((value, key) => {
    diagnoseLogger.log(`  ${key}: ${value}`);
  });

  const bodyText = await inspectable.text();
  diagnoseLogger.log('Body SOAP completo (sanitizado):');
  diagnoseLogger.log(sanitize(bodyText) || '(cuerpo vacio)');

  const faultMatch = bodyText.match(/<[^>]*Fault[\s\S]*?<\/[^>]*Fault>/i);
  if (faultMatch) {
    diagnoseLogger.log('SOAP Fault detectado:');
    diagnoseLogger.log(sanitize(faultMatch[0]));
  } else {
    diagnoseLogger.log('No se detecto un elemento <Fault> en el body.');
  }

  return response;
}) as FetchLike;

@Global()
@Module({
  providers: [{ provide: ARCA_FETCH, useValue: diagnosticFetch }],
  exports: [ARCA_FETCH],
})
class ArcaFetchDiagnosticModule {}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ArcaFetchDiagnosticModule,
    ArcaModule,
  ],
})
class ArcaWsaaDiagnoseModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(
    ArcaWsaaDiagnoseModule,
    { logger: ['error', 'warn', 'log'] },
  );

  try {
    const service = app.get(ArcaWsaaService);
    await service.getAccessTicket();
    diagnoseLogger.log('La llamada tuvo exito (no se reprodujo el error).');
  } catch (error) {
    if (error instanceof Error) {
      diagnoseLogger.error(`Excepcion final: ${error.name} - ${error.message}`);
    }
  } finally {
    await app.close();
  }
}

void main();
