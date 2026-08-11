import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { Request } from 'express';
import { createHash } from 'node:crypto';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentSecurityContext } from './decorators/current-security-context.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { SessionService } from './sessions/session.service';
import type { SecurityContext } from './types/security-context';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { PasswordRecoveryService } from './password/password-recovery.service';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { SecurityAuditService } from './audit/security-audit.service';
import { RegisterDto } from './dto/register.dto';
import { RegistrationService } from './registration/registration.service';
import {
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/email-verification.dto';
import { EmailVerificationService } from './email-verification/email-verification.service';

const ACCESS_COOKIE = 'pampa_access';
const REFRESH_COOKIE = 'pampa_refresh';

function extractCookie(request: Request, name: string) {
  const header = request.headers.cookie;
  if (!header) return null;
  const pair = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly sessions: SessionService,
    private readonly passwords: PasswordRecoveryService,
    private readonly rateLimit: RateLimitService,
    private readonly audit: SecurityAuditService,
    private readonly registration: RegistrationService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una empresa y su usuario propietario' })
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    await this.rateLimit.consume({
      action: 'register',
      key: `${ip}:${dto.email}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    const result = await this.registration.register(dto);
    await this.audit.record({
      companyId: result.companyId,
      actorUserId: result.userId,
      eventType: 'TENANT_REGISTERED',
      result: 'SUCCESS',
    });
    return { created: true };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiOkResponse({ description: 'Sesión iniciada correctamente.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas.' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos.' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const throttleKey = `${ip}:${loginDto.email}`;
    await this.rateLimit.consume({
      action: 'login',
      key: throttleKey,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    try {
      const { accessToken, refreshToken, user } = await this.authService.login(
        loginDto,
        userAgent,
      );
      await this.rateLimit.clear('login', throttleKey);
      response.cookie(ACCESS_COOKIE, accessToken, this.cookieOptions());
      response.cookie(
        REFRESH_COOKIE,
        refreshToken,
        this.refreshCookieOptions(),
      );
      response.setHeader('Cache-Control', 'no-store');
      await this.audit.record({
        companyId: user.companyId,
        actorUserId: user.id,
        eventType: 'LOGIN_SUCCEEDED',
        result: 'SUCCESS',
      });
      return user;
    } catch (error) {
      await this.audit.record({
        eventType: 'LOGIN_FAILED',
        result: 'FAILURE',
        metadata: { emailHash: this.safeIdentifier(loginDto.email) },
      });
      throw error;
    }
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = extractCookie(request, REFRESH_COOKIE);
    await this.rateLimit.consume({
      action: 'refresh',
      key: `${request.ip}:${refreshToken ?? 'missing'}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!refreshToken) {
      throw new UnauthorizedException('La sesión no es válida.');
    }
    const tokens = await this.sessions.refresh(refreshToken, userAgent);
    response.cookie(ACCESS_COOKIE, tokens.accessToken, this.cookieOptions());
    response.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      this.refreshCookieOptions(),
    );
    response.setHeader('Cache-Control', 'no-store');
    return { refreshed: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener la sesión actual' })
  @ApiOkResponse({ description: 'Sesión recuperada correctamente.' })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  async me(
    @CurrentUser() userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this.authService.getCurrentUser(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(
    @CurrentSecurityContext() context: SecurityContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revoke(context.userId, context.sessionId);
    await this.audit.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'LOGOUT',
      result: 'SUCCESS',
    });
    response.clearCookie(ACCESS_COOKIE, this.cookieOptions());
    response.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revokeAll(context.userId);
    await this.audit.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      eventType: 'LOGOUT_ALL',
      result: 'SUCCESS',
    });
    response.clearCookie(ACCESS_COOKIE, this.cookieOptions());
    response.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  @Get('sessions')
  sessionsList(@CurrentUser() userId: string) {
    return this.sessions.list(userId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSession(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessions.revoke(userId, sessionId);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirmar el correo con el token recibido' })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Ip() ip: string) {
    await this.rateLimit.consume({
      action: 'verify-email',
      key: ip,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    await this.emailVerification.verify(dto.token);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar el correo de verificación' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Ip() ip: string,
  ) {
    await this.rateLimit.consume({
      action: 'resend-verification',
      key: `${ip}:${dto.email}`,
      limit: 3,
      windowMs: 30 * 60 * 1000,
    });
    return this.emailVerification.resend(dto.email);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    await this.rateLimit.consume({
      action: 'forgot-password',
      key: `${ip}:${dto.email}`,
      limit: 3,
      windowMs: 30 * 60 * 1000,
    });
    return this.passwords.forgot(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    await this.rateLimit.consume({
      action: 'reset-password',
      key: ip,
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });
    await this.passwords.reset(dto.token, dto.newPassword);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.passwords.change(userId, dto.currentPassword, dto.newPassword);
    response.clearCookie(ACCESS_COOKIE, this.cookieOptions());
    response.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  private cookieOptions() {
    const production = this.configService.get('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: production,
      sameSite: 'lax' as const,
      maxAge: 15 * 60 * 1000,
      path: '/',
    };
  }

  private refreshCookieOptions() {
    const production = this.configService.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: production,
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      // '/' (not '/auth'): the browser only ever calls /api/backend/*
      // (see src/app/api/backend/[...path]/route.ts), so a narrower path
      // never matches and the cookie would never be sent back on refresh.
      path: '/',
    };
  }

  private safeIdentifier(value: string) {
    return createHash('sha256').update(value).digest('hex').slice(0, 24);
  }
}
