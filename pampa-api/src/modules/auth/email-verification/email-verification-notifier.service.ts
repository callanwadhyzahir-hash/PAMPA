import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailVerificationNotifierService {
  private readonly logger = new Logger(EmailVerificationNotifierService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerification(input: {
    email: string;
    firstName: string;
    token: string;
  }) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('PASSWORD_RESET_FROM');
    const replyTo = this.config.get<string>('EMAIL_REPLY_TO');
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (!apiKey || !from || !frontendUrl) {
      if (this.config.get('NODE_ENV') === 'production') {
        this.logger.error('Email verification infrastructure is incomplete.');
      }
      return;
    }

    const verifyUrl = `${frontendUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(input.token)}`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: replyTo || undefined,
        subject: 'Verificá tu correo en PAMPA',
        html: this.buildHtml(input.firstName, verifyUrl),
      }),
    });
    if (!response.ok) {
      throw new Error('Email verification delivery failed.');
    }
  }

  private buildHtml(firstName: string, verifyUrl: string) {
    const safeName = this.escape(firstName);
    const safeUrl = this.escape(verifyUrl);
    return `<div style="background:#000000;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" style="max-width:480px;margin:0 auto;border-collapse:collapse">
<tr><td style="padding-bottom:24px">
<span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:#7fee64;margin-right:8px;vertical-align:middle"></span>
<span style="color:#ddffdc;font-size:15px;font-weight:600;letter-spacing:-0.02em;vertical-align:middle">PAMPA</span>
</td></tr>
<tr><td style="background:#181818;border:1px solid #485346;border-radius:8px;padding:32px">
<h1 style="margin:0;color:#ddffdc;font-size:20px;font-weight:600;letter-spacing:-0.02em">Verificá tu correo</h1>
<p style="margin:16px 0 0;color:#8cab87;font-size:14px;line-height:22px">Hola ${safeName}, confirmá tu correo para activar tu cuenta de PAMPA.</p>
<div style="margin:28px 0">
<a href="${safeUrl}" style="display:inline-block;background:#7fee64;color:#000000;font-weight:700;font-size:14px;padding:12px 20px;border-radius:6px;text-decoration:none">Verificar correo</a>
</div>
<p style="margin:0;color:#677d64;font-size:12px;line-height:20px">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br /><a href="${safeUrl}" style="color:#7fee64;word-break:break-all">${safeUrl}</a></p>
<p style="margin:20px 0 0;color:#677d64;font-size:12px;line-height:20px">El enlace vence en 24 horas. Si no creaste esta cuenta, podés ignorar este correo.</p>
</td></tr>
</table>
</div>`;
  }

  private escape(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[character]!,
    );
  }
}
