import { ConfigService } from '@nestjs/config';

import { PasswordNotifierService } from './password-notifier.service';

interface ResendEmailBody {
  from: string;
  to: string[];
  reply_to?: string;
  subject: string;
  html: string;
}

function fakeConfigService(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('PasswordNotifierService', () => {
  const baseConfig = {
    RESEND_API_KEY: 'resend-test-key',
    PASSWORD_RESET_FROM: 'PAMPA <acceso@pampa-erp.com>',
    EMAIL_REPLY_TO: 'pampa@pampa-erp.com',
    FRONTEND_URL: 'https://app.pampa-erp.com',
  };

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('sends the reset email to Resend with from, reply_to, subject and the reset link', async () => {
    const service = new PasswordNotifierService(fakeConfigService(baseConfig));

    await service.sendReset({
      email: 'user@example.com',
      firstName: 'Ana',
      token: 'reset-token-123',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');

    const body = JSON.parse(init.body as string) as ResendEmailBody;
    expect(body.from).toBe('PAMPA <acceso@pampa-erp.com>');
    expect(body.to).toEqual(['user@example.com']);
    expect(body.reply_to).toBe('pampa@pampa-erp.com');
    expect(body.subject).toBe('Restablecé tu acceso a PAMPA');
    expect(body.html).toContain(
      'https://app.pampa-erp.com/reset-password?token=reset-token-123',
    );
  });

  it('omits reply_to when EMAIL_REPLY_TO is not configured', async () => {
    const configWithoutReplyTo: Record<string, string> = { ...baseConfig };
    delete configWithoutReplyTo.EMAIL_REPLY_TO;
    const service = new PasswordNotifierService(
      fakeConfigService(configWithoutReplyTo),
    );

    await service.sendReset({
      email: 'user@example.com',
      firstName: 'Ana',
      token: 'reset-token-123',
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as ResendEmailBody;
    expect(body.reply_to).toBeUndefined();
    expect('reply_to' in body).toBe(false);
  });
});
