import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async consume(input: {
    action: string;
    key: string;
    limit: number;
    windowMs: number;
  }) {
    const keyHash = createHash('sha256')
      .update(input.key.trim().toLowerCase())
      .digest('hex');
    const now = new Date();

    const blocked = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${input.action}),
          hashtext(${keyHash})
        )
      `;
      const current = await tx.rate_limit_bucket.findUnique({
        where: {
          action_key_hash: { action: input.action, key_hash: keyHash },
        },
      });
      if (current?.blocked_until && current.blocked_until > now) return true;

      const expired =
        !current ||
        current.window_started.getTime() + input.windowMs <= now.getTime();
      const attempts = expired ? 1 : current.attempts + 1;
      const blockedUntil =
        attempts > input.limit
          ? new Date(now.getTime() + input.windowMs)
          : null;

      await tx.rate_limit_bucket.upsert({
        where: {
          action_key_hash: { action: input.action, key_hash: keyHash },
        },
        create: {
          action: input.action,
          key_hash: keyHash,
          window_started: now,
          attempts,
          blocked_until: blockedUntil,
        },
        update: {
          window_started: expired ? now : current.window_started,
          attempts,
          blocked_until: blockedUntil,
          updated_at: now,
        },
      });
      return blockedUntil !== null;
    });

    if (blocked) {
      throw new HttpException(
        'Demasiados intentos. Esperá unos minutos antes de volver a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async clear(action: string, key: string) {
    const keyHash = createHash('sha256')
      .update(key.trim().toLowerCase())
      .digest('hex');
    await this.prisma.rate_limit_bucket.deleteMany({
      where: { action, key_hash: keyHash },
    });
  }
}
