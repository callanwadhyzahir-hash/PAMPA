import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SecurityAuditService } from '../auth/audit/security-audit.service';
import type { SecurityContext } from '../auth/types/security-context';
import { PlatformCompanyQueryDto } from './dto/company-query.dto';
import { PlatformUserQueryDto } from './dto/user-query.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { PlatformAdminRepository } from './platform-admin.repository';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly repository: PlatformAdminRepository,
    private readonly audit: SecurityAuditService,
  ) {}

  overview() {
    return this.repository.overview();
  }

  async listCompanies(query: PlatformCompanyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.listCompanies({
      search: query.search,
      status: query.status,
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

    return company;
  }

  async listUsers(query: PlatformUserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.listUsers({
      search: query.search,
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
}
