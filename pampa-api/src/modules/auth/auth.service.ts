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

    if (
      !storedUser ||
      !passwordMatches ||
      !storedUser.is_active ||
      !storedUser.company.is_active
    ) {
      throw new UnauthorizedException(
        'El correo o la contraseña son incorrectos.',
      );
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
    };
  }
}
