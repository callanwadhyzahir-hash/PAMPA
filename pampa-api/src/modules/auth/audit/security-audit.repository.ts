import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SecurityAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    companyId?: string;
    actorUserId?: string;
    targetUserId?: string;
    sessionId?: string;
    eventType: string;
    result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.security_event.create({
      data: {
        company_id: input.companyId,
        actor_user_id: input.actorUserId,
        target_user_id: input.targetUserId,
        session_id: input.sessionId,
        event_type: input.eventType,
        result: input.result,
        metadata: input.metadata,
      },
      select: { id: true },
    });
  }

  findForCompany(companyId: string, take = 100) {
    return this.prisma.security_event.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        event_type: true,
        result: true,
        actor_user_id: true,
        target_user_id: true,
        session_id: true,
        metadata: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(take, 200),
    });
  }

  async listGlobal(filters: {
    page: number;
    limit: number;
    eventTypes?: string[];
    companyId?: string;
    result?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    userId?: string;
  }) {
    const where: Prisma.security_eventWhereInput = {
      ...(filters.eventTypes?.length
        ? { event_type: { in: filters.eventTypes } }
        : {}),
      ...(filters.companyId ? { company_id: filters.companyId } : {}),
      ...(filters.result ? { result: filters.result } : {}),
      ...(filters.userId
        ? {
            OR: [
              { actor_user_id: filters.userId },
              { target_user_id: filters.userId },
            ],
          }
        : {}),
    };

    const userSelect = {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
    } as const;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.security_event.findMany({
        where,
        select: {
          id: true,
          event_type: true,
          result: true,
          metadata: true,
          created_at: true,
          company: { select: { id: true, name: true } },
          actor_user: { select: userSelect },
          target_user: { select: userSelect },
        },
        orderBy: { created_at: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.security_event.count({ where }),
    ]);

    return { items, total };
  }
}
