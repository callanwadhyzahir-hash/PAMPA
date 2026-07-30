import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { SecurityContext } from '../types/security-context';
import { SessionRepository } from './session.repository';

@Injectable()
export class SessionContextService {
  constructor(private readonly repository: SessionRepository) {}

  async resolve(input: {
    sessionId: string;
    userId: string;
    companyId: string;
    tokenVersion: number;
  }): Promise<SecurityContext> {
    const session = await this.repository.findContext(input);
    if (!session) throw new UnauthorizedException('La sesión no es válida.');

    const activeRoles = session.user.user_role
      .map(({ role }) => role)
      .filter(
        (role) => role.is_active && role.company_id === session.user.company_id,
      );

    return {
      userId: session.user.id,
      companyId: session.user.company_id,
      branchId: session.user.branch_id,
      sessionId: session.id,
      tokenVersion: session.user.token_version,
      email: session.user.email,
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
