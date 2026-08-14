import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordNotifierService {
  private readonly logger = new Logger(PasswordNotifierService.name);

  constructor(private readonly config: ConfigService) {}

  async sendReset(input: { email: string; firstName: string; token: string }) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('PASSWORD_RESET_FROM');
    const replyTo = this.config.get<string>('EMAIL_REPLY_TO');
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (!apiKey || !from || !frontendUrl) {
      if (this.config.get('NODE_ENV') === 'production') {
        this.logger.error('Password reset email infrastructure is incomplete.');
      }
      return;
    }

    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;
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
        subject: 'Restablecé tu acceso a PAMPA',
        html: `<p>Hola ${this.escape(input.firstName)},</p><p>Recibimos una solicitud para restablecer tu acceso a PAMPA.</p><p><a href="${this.escape(resetUrl)}">Crear una nueva contraseña</a></p><p>El enlace vence en 30 minutos. Si no realizaste esta solicitud, podés ignorar este correo.</p>`,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Password reset email delivery failed: ${response.status} ${body}`,
      );
    }
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
