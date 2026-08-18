import { MercadoLibreAccountAlreadyLinkedError } from '../mercadolibre.errors';
import { MercadoLibreConnectionService } from './connection.service';
import type { MercadoLibreConnectionRepository } from './connection.repository';
import type { MercadoLibreTokenCipher } from '../crypto/mercadolibre-token-cipher';
import type { MercadoLibreConfigService } from '../mercadolibre.config';

describe('MercadoLibreConnectionService.persistFromOAuth', () => {
  const userInfo = { id: 'ML-1', nickname: 'seller', siteId: 'MLA' };
  const tokenSet = {
    accessToken: 'a',
    refreshToken: 'r',
    expiresIn: 3600,
    mlUserId: 'ML-1',
  };

  function build(findConnectedByMlUserId: jest.Mock) {
    const repository = {
      findConnectedByMlUserId,
      upsert: jest.fn().mockResolvedValue(undefined),
    } as unknown as MercadoLibreConnectionRepository;
    const cipher = {
      encrypt: jest.fn((value: string) => `enc(${value})`),
    } as unknown as MercadoLibreTokenCipher;
    const config = {} as MercadoLibreConfigService;
    return new MercadoLibreConnectionService(repository, cipher, config);
  }

  it('rejects a REAL connection whose ml_user_id is already CONNECTED to a different company', async () => {
    const findConnectedByMlUserId = jest.fn().mockResolvedValue({ company_id: 'other-company' });
    const service = build(findConnectedByMlUserId);

    await expect(
      service.persistFromOAuth('company-a', tokenSet, userInfo, 'REAL'),
    ).rejects.toThrow(MercadoLibreAccountAlreadyLinkedError);
  });

  it('allows a REAL connection reconnecting to the same company', async () => {
    const findConnectedByMlUserId = jest.fn().mockResolvedValue({ company_id: 'company-a' });
    const service = build(findConnectedByMlUserId);

    await expect(
      service.persistFromOAuth('company-a', tokenSet, userInfo, 'REAL'),
    ).resolves.toBeUndefined();
  });

  it('never checks cross-company linkage for MOCK connections', async () => {
    const findConnectedByMlUserId = jest.fn();
    const service = build(findConnectedByMlUserId);

    await service.persistFromOAuth('company-a', tokenSet, userInfo, 'MOCK');

    expect(findConnectedByMlUserId).not.toHaveBeenCalled();
  });
});
