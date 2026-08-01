import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { AuthRepository } from './repositories/auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SessionContextService } from './sessions/session-context.service';
import { SessionRepository } from './sessions/session.repository';
import { SessionService } from './sessions/session.service';
import { SecurityAuditModule } from './audit/security-audit.module';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { PasswordRecoveryRepository } from './password/password-recovery.repository';
import { PasswordRecoveryService } from './password/password-recovery.service';
import { PasswordNotifierService } from './password/password-notifier.service';
import { RegistrationRepository } from './registration/registration.repository';
import { RegistrationService } from './registration/registration.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must contain at least 32 characters.');
        }

        return {
          secret,
          signOptions: {
            expiresIn: '15m',
            issuer: 'pampa-api',
            audience: 'pampa-web',
          },
        };
      },
    }),
    SecurityAuditModule,
  ],
  providers: [
    AuthService,
    AuthRepository,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    SessionRepository,
    SessionService,
    SessionContextService,
    RateLimitService,
    PasswordRecoveryRepository,
    PasswordRecoveryService,
    PasswordNotifierService,
    RegistrationRepository,
    RegistrationService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
