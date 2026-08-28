import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';

import { SecurityAuditService } from '../auth/audit/security-audit.service';
import type { SecurityContext } from '../auth/types/security-context';
import { CompanyActivationNotifierService } from './company-activation-notifier.service';
import { PlatformActivityQueryDto } from './dto/activity-query.dto';
import { PlatformCompanyQueryDto } from './dto/company-query.dto';
import { DeleteReasonDto } from './dto/delete-reason.dto';
import { PlatformGrowthQueryDto } from './dto/growth-query.dto';
import { PlatformUserQueryDto } from './dto/user-query.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { PlatformAdminRepository } from './platform-admin.repository';
import { worstStatus } from './system-status.types';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// process.cwd() is the pampa-api project root under both `nest start` and
// `node dist/src/main.js` (start:prod), so package.json is always a direct
// child — no relative path through the compiled dist layout to get wrong.
function readAppVersion(): string | null {
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? null;
  } catch {
    return null;
  }
}

// Only the CI platforms this app actually deploys to (Railway) or might
// (Vercel, generic) auto-inject these — reading an env var already present
// in this process, never an outbound call to Railway/Vercel.
const COMMIT_ENV_VARS = [
  'RAILWAY_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'GIT_COMMIT_SHA',
  'SOURCE_VERSION',
];

@Injectable()
export class PlatformAdminService {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    private readonly repository: PlatformAdminRepository,
    private readonly audit: SecurityAuditService,
    private readonly config: ConfigService,
    private readonly activationNotifier: CompanyActivationNotifierService,
  ) {}

  overview() {
    return this.repository.overview();
  }

  securitySummary() {
    return this.repository.securitySummary();
  }

  async systemStatus() {
    const [security, database, migrations] = await Promise.all([
      this.repository.securitySummary(),
      this.repository.databaseHealth(),
      this.repository.migrationsHealth(),
    ]);

    const emailConfigured = Boolean(
      this.config.get('RESEND_API_KEY') &&
      this.config.get('PASSWORD_RESET_FROM') &&
      this.config.get('FRONTEND_URL'),
    );
    const email = {
      status: !emailConfigured
        ? ('UNAVAILABLE' as const)
        : security.emails.deliveryFailuresLast7d > 0
          ? ('DEGRADED' as const)
          : ('HEALTHY' as const),
      configured: emailConfigured,
      deliveryFailuresLast7d: security.emails.deliveryFailuresLast7d,
    };

    const api = { status: 'HEALTHY' as const };
    let commit: string | null = null;
    for (const key of COMMIT_ENV_VARS) {
      const value = this.config.get<string>(key);
      if (value) {
        commit = value;
        break;
      }
    }

    return {
      status: worstStatus([
        api.status,
        database.status,
        migrations.status,
        email.status,
      ]),
      timestamp: new Date().toISOString(),
      environment: this.config.get<string>('NODE_ENV') ?? null,
      version: readAppVersion(),
      commit,
      uptimeSeconds: Math.floor(process.uptime()),
      api,
      database,
      migrations,
      email,
    };
  }

  async growth(query: PlatformGrowthQueryDto) {
    const days = query.days ?? 30;
    const { since, userRows, companyRows, loginRows } =
      await this.repository.growthSeries(days);

    const userMap = new Map(
      userRows.map((row) => [dateKey(row.day), row.count]),
    );
    const companyMap = new Map(
      companyRows.map((row) => [dateKey(row.day), row.count]),
    );
    const loginMap = new Map(
      loginRows.map((row) => [dateKey(row.day), row.count]),
    );

    const series = Array.from({ length: days }, (_, i) => {
      const date = new Date(since);
      date.setUTCDate(date.getUTCDate() + i);
      const key = dateKey(date);
      return {
        date: key,
        newUsers: userMap.get(key) ?? 0,
        newCompanies: companyMap.get(key) ?? 0,
        logins: loginMap.get(key) ?? 0,
      };
    });

    return { days, series };
  }

  async listCompanies(query: PlatformCompanyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.listCompanies({
      search: query.search,
      status: query.status,
      hasUsers: query.hasUsers,
      createdWithinDays: query.createdWithinDays,
      page,
      limit,
    });
    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async getCompany(id: string) {
    const company = await this.repository.getCompanyDetail(id);
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    return company;
  }

  async getUser(id: string) {
    const user = await this.repository.getUserDetail(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  async updateCompanyStatus(
    context: SecurityContext,
    id: string,
    dto: UpdateCompanyStatusDto,
  ) {
    // v1 minimal-safe rule: a platform admin can never suspend the company
    // their own user account belongs to, to avoid losing the session/context
    // needed to reactivate it. Reactivation of one's own company is allowed.
    if (!dto.isActive && id === context.companyId) {
      throw new ForbiddenException(
        'No podés suspender la empresa a la que pertenece tu propia cuenta.',
      );
    }

    const company = await this.repository.updateCompanyStatus(id, dto.isActive);
    if (!company) throw new NotFoundException('Empresa no encontrada.');

    await this.audit.record({
      companyId: id,
      actorUserId: context.userId,
      eventType: dto.isActive ? 'COMPANY_REACTIVATED' : 'COMPANY_SUSPENDED',
      result: 'SUCCESS',
      metadata: dto.reason ? { reason: dto.reason } : undefined,
    });

    if (dto.isActive) {
      const owners = await this.repository.getActiveOwnerContacts(id);
      await Promise.all(
        owners.map((owner) =>
          this.activationNotifier
            .sendActivated({ email: owner.email, firstName: owner.first_name })
            .catch((error) => {
              this.logger.error(
                `Company activation email delivery failed for ${owner.email}.`,
                error,
              );
            }),
        ),
      );
    }

    return company;
  }

  async deleteCompany(
    context: SecurityContext,
    id: string,
    dto: DeleteReasonDto,
  ) {
    if (id === context.companyId) {
      throw new ForbiddenException(
        'No podés eliminar la empresa a la que pertenece tu propia cuenta.',
      );
    }

    const company = await this.repository.deleteCompany(id);
    if (!company) throw new NotFoundException('Empresa no encontrada.');

    await this.audit.record({
      companyId: id,
      actorUserId: context.userId,
      eventType: 'COMPANY_DELETED',
      result: 'SUCCESS',
      metadata: { name: company.name, reason: dto.reason ?? null },
    });

    return company;
  }

  async deleteUser(context: SecurityContext, id: string, dto: DeleteReasonDto) {
    if (id === context.userId) {
      throw new ForbiddenException('No podés eliminar tu propia cuenta.');
    }

    const blockers = await this.repository.userDeleteBlockers(id);
    const hasHistory =
      blockers.sales > 0 ||
      blockers.payments > 0 ||
      blockers.stockMovements > 0;
    if (hasHistory) {
      throw new ConflictException(
        'Este usuario tiene ventas, pagos o movimientos de stock a su nombre — no se puede eliminar sin perder ese historial. Desactivalo en su lugar.',
      );
    }

    const user = await this.repository.deleteUser(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    await this.audit.record({
      actorUserId: context.userId,
      targetUserId: id,
      eventType: 'USER_DELETED',
      result: 'SUCCESS',
      metadata: { email: user.email, reason: dto.reason ?? null },
    });

    return user;
  }

  async listUsers(query: PlatformUserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.listUsers({
      search: query.search,
      status: query.status,
      emailVerified: query.emailVerified,
      roleCode: query.roleCode,
      neverLoggedIn: query.neverLoggedIn,
      createdWithinDays: query.createdWithinDays,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      page,
      limit,
    });
    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async listActivity(query: PlatformActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const result = await this.audit.listGlobal({
      page,
      limit,
      eventTypes: query.eventTypes,
      companyId: query.companyId,
      result: query.result,
      userId: query.userId,
    });

    return {
      items: result.items.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        result: event.result,
        createdAt: event.created_at,
        metadata: event.metadata,
        company: event.company,
        actor: event.actor_user
          ? {
              id: event.actor_user.id,
              firstName: event.actor_user.first_name,
              lastName: event.actor_user.last_name,
              email: event.actor_user.email,
            }
          : null,
        target: event.target_user
          ? {
              id: event.target_user.id,
              firstName: event.target_user.first_name,
              lastName: event.target_user.last_name,
              email: event.target_user.email,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }
}
