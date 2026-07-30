import type { PrismaService } from '../../../database/prisma.service';
import { RbacRepository } from './rbac.repository';

describe('RbacRepository OWNER locking', () => {
  it('takes a company-scoped advisory lock inside the transaction', async () => {
    const events: string[] = [];
    const tx = {
      $queryRaw: jest.fn().mockImplementation(() => {
        events.push('lock');
        return Promise.resolve([{ pg_advisory_xact_lock: null }]);
      }),
    };
    const prisma = {
      $transaction: jest.fn(
        (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
      ),
    };
    const repository = new RbacRepository(prisma as unknown as PrismaService);

    await repository.executeOwnerMutation('company-a', () => {
      events.push('mutation');
      return Promise.resolve(true);
    });

    expect(events).toEqual(['lock', 'mutation']);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
