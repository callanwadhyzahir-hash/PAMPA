import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const repository = {
    create: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    revokeAll: jest.fn(),
    list: jest.fn(),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const service = new SessionService(
    repository as unknown as SessionRepository,
    jwt as unknown as JwtService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('stores only a refresh token hash and returns the opaque token', async () => {
    repository.create.mockResolvedValue({
      id: 'session-id',
      family_id: 'family-id',
    });

    const result = await service.create({
      userId: 'user-id',
      companyId: 'company-id',
      tokenVersion: 2,
    });

    const createCalls = repository.create.mock.calls as unknown as Array<
      [{ refreshTokenHash: string }]
    >;
    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(createCalls[0][0].refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createCalls[0][0].refreshTokenHash).not.toBe(result.refreshToken);
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      companyId: 'company-id',
      sessionId: 'session-id',
      tokenVersion: 2,
    });
  });

  it('rotates a valid token and signs a new minimal access token', async () => {
    repository.rotate.mockResolvedValue({
      status: 'ROTATED',
      sessionId: 'next-session',
      userId: 'user-id',
      companyId: 'company-id',
      tokenVersion: 3,
    });

    await expect(service.refresh('refresh-token')).resolves.toEqual(
      expect.objectContaining({ accessToken: 'access-token' }),
    );
    const rotateCalls = repository.rotate.mock.calls as unknown as Array<
      [{ currentHash: string; nextHash: string }]
    >;
    expect(rotateCalls[0][0].currentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rotateCalls[0][0].nextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rotateCalls[0][0].nextHash).not.toBe(rotateCalls[0][0].currentHash);
  });

  it('rejects reused, expired or inactive sessions', async () => {
    repository.rotate.mockResolvedValue({ status: 'REUSED_OR_INACTIVE' });

    await expect(service.refresh('reused-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
