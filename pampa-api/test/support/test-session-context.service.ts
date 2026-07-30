import type { SecurityContext } from '../../src/modules/auth/types/security-context';

export class TestSessionContextService {
  resolve(input: {
    userId: string;
    companyId: string;
    sessionId: string;
    tokenVersion: number;
  }): Promise<SecurityContext> {
    return Promise.resolve({
      userId: input.userId,
      companyId: input.companyId,
      branchId: null,
      sessionId: input.sessionId,
      tokenVersion: input.tokenVersion,
      email: 'actor@example.com',
      roles: ['OWNER'],
      permissions: input.sessionId === 'none' ? [] : input.sessionId.split('|'),
    });
  }
}
