import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { SecurityContext } from '../auth/types/security-context';
import type { PlatformActivityQueryDto } from './dto/activity-query.dto';
import type { PlatformGrowthQueryDto } from './dto/growth-query.dto';
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
    getActiveOwnerContacts: jest.fn(),
    listUsers: jest.fn(),
    getUserDetail: jest.fn(),
    growthSeries: jest.fn(),
    securitySummary: jest.fn(),
    databaseHealth: jest.fn(),
    migrationsHealth: jest.fn(),
  };
  const audit = { record: jest.fn(), listGlobal: jest.fn() };
  const configValues: Record<string, string | undefined> = {};
  const config = { get: jest.fn((key: string) => configValues[key]) };
  const activationNotifier = { sendActivated: jest.fn() };
  const service = new PlatformAdminService(
    repository as unknown as PlatformAdminRepository,
    audit as unknown as never,
    config as unknown as never,
    activationNotifier as unknown as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.getActiveOwnerContacts.mockResolvedValue([]);
    for (const key of Object.keys(configValues)) delete configValues[key];
  });

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

  it('forwards activity filters to the audit service and paginates the result', async () => {
    audit.listGlobal.mockResolvedValue({
      items: [
        {
          id: 'event-1',
          event_type: 'LOGIN_FAILED',
          result: 'FAILURE',
          created_at: new Date('2026-08-15T00:00:00Z'),
          metadata: { reason: 'bad_password' },
          company: { id: 'company-1', name: 'Company 1' },
          actor_user: null,
          target_user: {
            id: 'user-1',
            first_name: 'Ana',
            last_name: 'Gomez',
            email: 'ana@example.com',
          },
        },
      ],
      total: 1,
    });

    const query: PlatformActivityQueryDto = {
      eventTypes: ['LOGIN_FAILED'],
      page: 2,
      limit: 10,
    };
    const result = await service.listActivity(query);

    expect(audit.listGlobal).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      eventTypes: ['LOGIN_FAILED'],
      companyId: undefined,
      result: undefined,
      userId: undefined,
    });
    expect(result.items[0].id).toBe('event-1');
    expect(result.items[0].eventType).toBe('LOGIN_FAILED');
    expect(result.items[0].actor).toBeNull();
    expect(result.items[0].target?.email).toBe('ana@example.com');
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      pages: 1,
    });
  });

  it('throws NotFoundException when the target user does not exist', async () => {
    repository.getUserDetail.mockResolvedValue(null);

    await expect(service.getUser('missing-user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the mapped user detail, never exposing password/token fields', async () => {
    const userDetail = {
      id: 'user-1',
      firstName: 'Ana',
      lastName: 'Gomez',
      email: 'ana@example.com',
      phone: null,
      isActive: true,
      emailVerifiedAt: new Date('2026-08-01T00:00:00Z'),
      lastLoginAt: new Date('2026-08-14T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-08-14T00:00:00Z'),
      company: { id: 'company-1', name: 'Company 1', isActive: true },
      branch: null,
      roles: [{ id: 'role-1', name: 'Propietario', systemCode: 'OWNER' }],
    };
    repository.getUserDetail.mockResolvedValue(userDetail);

    const result = await service.getUser('user-1');

    expect(repository.getUserDetail).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(userDetail);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password_hash');
  });

  it('fills days with no activity as zero in the growth series', async () => {
    const since = new Date('2026-08-13T00:00:00.000Z');
    repository.growthSeries.mockResolvedValue({
      since,
      userRows: [{ day: new Date('2026-08-13T00:00:00.000Z'), count: 2 }],
      companyRows: [],
      loginRows: [{ day: new Date('2026-08-15T00:00:00.000Z'), count: 5 }],
    });

    const query: PlatformGrowthQueryDto = { days: 3 };
    const result = await service.growth(query);

    expect(repository.growthSeries).toHaveBeenCalledWith(3);
    expect(result).toEqual({
      days: 3,
      series: [
        { date: '2026-08-13', newUsers: 2, newCompanies: 0, logins: 0 },
        { date: '2026-08-14', newUsers: 0, newCompanies: 0, logins: 0 },
        { date: '2026-08-15', newUsers: 0, newCompanies: 0, logins: 5 },
      ],
    });
  });

  describe('systemStatus', () => {
    const baseSecuritySummary = {
      users: {
        total: 10,
        pendingVerification: 0,
        verified: 10,
        deactivated: 0,
      },
      emails: {
        sentLast7d: 0,
        verifiedLast7d: 0,
        deliveryFailuresLast7d: 0,
        deliveryFailuresLast30d: 0,
      },
      auth: { failedLoginsLast24h: 0, failedLoginsLast7d: 0 },
    };

    it('reports email as UNAVAILABLE when Resend is not configured, and rolls up to overall status', async () => {
      repository.securitySummary.mockResolvedValue(baseSecuritySummary);
      repository.databaseHealth.mockResolvedValue({
        status: 'HEALTHY',
        latencyMs: 5,
      });
      repository.migrationsHealth.mockResolvedValue({
        status: 'HEALTHY',
        appliedCount: 14,
        latestMigration: '20260817090000_add_company_user_created_indexes',
        latestAppliedAt: new Date('2026-08-15T00:00:00Z'),
        pending: false,
      });

      const result = await service.systemStatus();

      expect(result.email).toEqual({
        status: 'UNAVAILABLE',
        configured: false,
        deliveryFailuresLast7d: 0,
      });
      expect(result.status).toBe('UNAVAILABLE');
      expect(result.api).toEqual({ status: 'HEALTHY' });
    });

    it('marks email DEGRADED when configured but with recent delivery failures', async () => {
      configValues.RESEND_API_KEY = 'key';
      configValues.PASSWORD_RESET_FROM = 'from@pampa.test';
      configValues.FRONTEND_URL = 'https://app.pampa.test';
      repository.securitySummary.mockResolvedValue({
        ...baseSecuritySummary,
        emails: { ...baseSecuritySummary.emails, deliveryFailuresLast7d: 2 },
      });
      repository.databaseHealth.mockResolvedValue({
        status: 'HEALTHY',
        latencyMs: 5,
      });
      repository.migrationsHealth.mockResolvedValue({
        status: 'HEALTHY',
        appliedCount: 14,
        latestMigration: 'x',
        latestAppliedAt: new Date(),
        pending: false,
      });

      const result = await service.systemStatus();

      expect(result.email).toEqual({
        status: 'DEGRADED',
        configured: true,
        deliveryFailuresLast7d: 2,
      });
      expect(result.status).toBe('DEGRADED');
    });

    it('never exposes the configured secret values, only booleans/env/version', async () => {
      configValues.RESEND_API_KEY = 'super-secret-key';
      configValues.PASSWORD_RESET_FROM = 'from@pampa.test';
      configValues.FRONTEND_URL = 'https://app.pampa.test';
      configValues.NODE_ENV = 'production';
      repository.securitySummary.mockResolvedValue(baseSecuritySummary);
      repository.databaseHealth.mockResolvedValue({
        status: 'HEALTHY',
        latencyMs: 5,
      });
      repository.migrationsHealth.mockResolvedValue({
        status: 'HEALTHY',
        appliedCount: 14,
        latestMigration: 'x',
        latestAppliedAt: new Date(),
        pending: false,
      });

      const result = await service.systemStatus();

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('super-secret-key');
      expect(result.environment).toBe('production');
    });

    it('falls back to UNAVAILABLE overall status when the database is unreachable', async () => {
      repository.securitySummary.mockResolvedValue(baseSecuritySummary);
      repository.databaseHealth.mockResolvedValue({
        status: 'UNAVAILABLE',
        latencyMs: null,
      });
      repository.migrationsHealth.mockResolvedValue({
        status: 'UNKNOWN',
        appliedCount: null,
        latestMigration: null,
        latestAppliedAt: null,
        pending: null,
      });

      const result = await service.systemStatus();

      expect(result.status).toBe('UNAVAILABLE');
      expect(result.database.status).toBe('UNAVAILABLE');
      expect(result.migrations.status).toBe('UNKNOWN');
    });
  });
});
