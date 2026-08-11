import { PrismaService } from '../../../database/prisma.service';
import { EmailVerificationRepository } from './email-verification.repository';

function buildRepository() {
  const tx = {
    email_verification_token: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
    ),
  };
  const repository = new EmailVerificationRepository(
    prisma as unknown as PrismaService,
  );
  return { repository, tx };
}

const userId = 'user-id';
const companyId = 'company-id';
const tokenHash = 'a'.repeat(64);

function baseToken(
  overrides: Partial<{
    used_at: Date | null;
    expires_at: Date;
    is_active: boolean;
  }> = {},
) {
  return {
    id: 'token-id',
    user_id: userId,
    expires_at: overrides.expires_at ?? new Date(Date.now() + 60_000),
    used_at: overrides.used_at ?? null,
    user: { company_id: companyId, is_active: overrides.is_active ?? true },
  };
}

describe('EmailVerificationRepository.verifyToken', () => {
  it('consumes a valid token and marks the email as verified', async () => {
    const { repository, tx } = buildRepository();
    tx.email_verification_token.findUnique.mockResolvedValue(baseToken());
    tx.email_verification_token.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.verifyToken(tokenHash);

    expect(result).toEqual({ userId, companyId });
    const [consumeCall] = tx.email_verification_token.updateMany.mock
      .calls[0] as [{ where: unknown; data: { used_at: Date } }];
    expect(consumeCall.where).toEqual({ id: 'token-id', used_at: null });
    expect(consumeCall.data.used_at).toBeInstanceOf(Date);
    const [verifyCall] = tx.user.update.mock.calls[0] as [
      { where: unknown; data: { email_verified_at: Date } },
    ];
    expect(verifyCall.where).toEqual({ id: userId });
    expect(verifyCall.data.email_verified_at).toBeInstanceOf(Date);
  });

  it('rejects an expired token without consuming it or touching the user', async () => {
    const { repository, tx } = buildRepository();
    tx.email_verification_token.findUnique.mockResolvedValue(
      baseToken({ expires_at: new Date(Date.now() - 1_000) }),
    );

    await expect(repository.verifyToken(tokenHash)).resolves.toBeNull();
    expect(tx.email_verification_token.updateMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects an already-used token', async () => {
    const { repository, tx } = buildRepository();
    tx.email_verification_token.findUnique.mockResolvedValue(
      baseToken({ used_at: new Date() }),
    );

    await expect(repository.verifyToken(tokenHash)).resolves.toBeNull();
    expect(tx.email_verification_token.updateMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent token', async () => {
    const { repository, tx } = buildRepository();
    tx.email_verification_token.findUnique.mockResolvedValue(null);

    await expect(repository.verifyToken(tokenHash)).resolves.toBeNull();
    expect(tx.email_verification_token.updateMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects double consumption: a concurrent verify already claimed the token between the read and the update', async () => {
    const { repository, tx } = buildRepository();
    // findUnique still sees used_at: null (read happened before the
    // concurrent transaction committed), but the guarded updateMany()
    // affects 0 rows because the other transaction already flipped it.
    tx.email_verification_token.findUnique.mockResolvedValue(baseToken());
    tx.email_verification_token.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.verifyToken(tokenHash)).resolves.toBeNull();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});

describe('EmailVerificationRepository.createToken', () => {
  it('invalidates every previous unused token before creating the new one', async () => {
    const { repository, tx } = buildRepository();
    tx.email_verification_token.create.mockResolvedValue({
      id: 'new-token-id',
    });
    const order: string[] = [];
    tx.email_verification_token.updateMany.mockImplementation(() => {
      order.push('invalidate-previous');
      return Promise.resolve({ count: 2 });
    });
    tx.email_verification_token.create.mockImplementation(() => {
      order.push('create-new');
      return Promise.resolve({ id: 'new-token-id' });
    });

    const expiresAt = new Date(Date.now() + 86_400_000);
    await repository.createToken(userId, tokenHash, expiresAt);

    const [invalidateCall] = tx.email_verification_token.updateMany.mock
      .calls[0] as [{ where: unknown; data: { used_at: Date } }];
    expect(invalidateCall.where).toEqual({ user_id: userId, used_at: null });
    expect(invalidateCall.data.used_at).toBeInstanceOf(Date);
    expect(tx.email_verification_token.create).toHaveBeenCalledWith({
      data: { user_id: userId, token_hash: tokenHash, expires_at: expiresAt },
      select: { id: true },
    });
    expect(order).toEqual(['invalidate-previous', 'create-new']);
  });
});
