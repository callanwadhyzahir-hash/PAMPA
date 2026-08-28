import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { LoginDto } from './dto/login.dto';
import { AuthRepository } from './repositories/auth.repository';
import { AuthenticatedUser } from './auth.types';
import { SessionService } from './sessions/session.service';

const FALLBACK_HASH =
  '$2b$12$2b2Z6wkO4JpZG/RhdqfHwulvBQWPXcIweBEJWVOY2s4OL5cOglYlu';

type StoredUser = NonNullable<
  Awaited<ReturnType<AuthRepository['findByEmail']>>
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessions: SessionService,
  ) {}

  async login(loginDto: LoginDto, userAgent?: string) {
    const storedUser = await this.authRepository.findByEmail(loginDto.email);
    const passwordHash = storedUser?.password_hash ?? FALLBACK_HASH;
    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      passwordHash,
    );

    if (!storedUser || !passwordMatches) {
      throw new UnauthorizedException(
        'El correo o la contraseña son incorrectos.',
      );
    }

    if (!storedUser.is_active || !storedUser.company.is_active) {
      // Only reachable after the password already matched, so this never
      // reveals account status to someone who doesn't already know the
      // credentials — same info-hiding posture as the generic message
      // above, just more useful once you've actually proven you own the
      // account. Covers both "never approved yet" and "suspended later"
      // with one honest message, since login can't tell those apart from
      // is_active alone.
      throw new UnauthorizedException({
        message:
          'Tu cuenta todavía no fue habilitada. Te avisamos por correo cuando esté lista para usarse.',
        details: { code: 'ACCOUNT_PENDING_APPROVAL' },
      });
    }

    if (!storedUser.email_verified_at) {
      // The global HttpExceptionFilter only forwards `message` and
      // `details` from the exception response — a top-level `code` field
      // would silently be dropped before reaching the frontend.
      throw new UnauthorizedException({
        message: 'Necesitás verificar tu correo antes de iniciar sesión.',
        details: { code: 'EMAIL_NOT_VERIFIED' },
      });
    }

    const user = this.toAuthenticatedUser(storedUser);
    const tokens = await this.sessions.create({
      userId: user.id,
      companyId: user.companyId,
      tokenVersion: storedUser.token_version,
      userAgent,
    });
    await this.authRepository.updateLastLogin(user.id);

    return { ...tokens, user };
  }

  async getCurrentUser(userId: string) {
    const storedUser = await this.authRepository.findById(userId);

    if (!storedUser || !storedUser.is_active || !storedUser.company.is_active) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    return this.toAuthenticatedUser(storedUser);
  }

  private toAuthenticatedUser(user: StoredUser): AuthenticatedUser {
    const activeRoles = user.user_role
      .map(({ role }) => role)
      .filter((role) => role.is_active && role.company_id === user.company_id);

    return {
      id: user.id,
      companyId: user.company_id,
      branchId: user.branch_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      company: {
        id: user.company.id,
        name: user.company.name,
      },
      roles: activeRoles.map((role) => role.system_code ?? role.name),
      permissions: [
        ...new Set(
          activeRoles.flatMap((role) =>
            role.role_permission.map(({ permission }) => permission.code),
          ),
        ),
      ],
      isPlatformAdmin: user.platform_admin !== null,
    };
  }
}
