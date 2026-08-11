import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { SecurityContext } from '../auth/types/security-context';
import { PlatformAdminRepository } from './platform-admin.repository';
import { PlatformAdminService } from './platform-admin.service';

const platformAdminContext: SecurityContext = {
  userId: 'admin-user-id',
  companyId: 'admin-company-id',
  branchId: null,
  sessionId: 'session-id',
  tokenVersion: 0,
  email: 'admin@example.com',
  roles: ['OWNER'],
  permissions: [],
  isPlatformAdmin: true,
};

describe('PlatformAdminService', () => {
  const repository = {
    overview: jest.fn(),
    listCompanies: jest.fn(),
    getCompanyDetail: jest.fn(),
    updateCompanyStatus: jest.fn(),
    listUsers: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const service = new PlatformAdminService(
    repository as unknown as PlatformAdminRepository,
    audit as unknown as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects suspending the company the platform admin belongs to', async () => {
    await expect(
      service.updateCompanyStatus(
        platformAdminContext,
        platformAdminContext.companyId,
        { isActive: false },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.updateCompanyStatus).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('allows reactivating the platform admin own company', async () => {
    repository.updateCompanyStatus.mockResolvedValue({
      id: platformAdminContext.companyId,
      name: 'Own Co',
      is_active: true,
    });

    await service.updateCompanyStatus(
      platformAdminContext,
      platformAdminContext.companyId,
      { isActive: true },
    );

    expect(repository.updateCompanyStatus).toHaveBeenCalledWith(
      platformAdminContext.companyId,
      true,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'COMPANY_REACTIVATED' }),
    );
  });

  it('suspends a different company and records COMPANY_SUSPENDED', async () => {
    repository.updateCompanyStatus.mockResolvedValue({
      id: 'other-company-id',
      name: 'Other Co',
      is_active: false,
    });

    await service.updateCompanyStatus(
      platformAdminContext,
      'other-company-id',
      {
        isActive: false,
        reason: 'billing overdue',
      },
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'COMPANY_SUSPENDED',
        companyId: 'other-company-id',
        actorUserId: platformAdminContext.userId,
        metadata: { reason: 'billing overdue' },
      }),
    );
  });

  it('throws NotFoundException when the target company does not exist', async () => {
    repository.updateCompanyStatus.mockResolvedValue(null);

    await expect(
      service.updateCompanyStatus(platformAdminContext, 'missing-company-id', {
        isActive: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
