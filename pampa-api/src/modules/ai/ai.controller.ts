import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSecurityContext } from '../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../auth/types/security-context';
import { AI_PERMISSIONS } from './ai.permissions';
import { AiChatRequestDto } from './dto/ai-chat-request.dto';
import { AiGatewayService } from './gateway/ai-gateway.service';
import { AiSubscriptionService } from './subscription/ai-subscription.service';

/**
 * Minimal endpoint set to validate the whole PAMPA IA gateway end to end
 * (Sprint 1 scope). No ERP tools, no data mutation — see
 * docs/pampa-ai-architecture.md.
 */
@ApiTags('AI')
@ApiCookieAuth('pampa_access')
@Controller('ai')
export class AiController {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly subscriptions: AiSubscriptionService,
  ) {}

  @Post('chat')
  @RequirePermissions(AI_PERMISSIONS.use)
  chat(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() dto: AiChatRequestDto,
  ) {
    return this.gateway.chat(context, dto.message, dto.conversationContext);
  }

  @Get('usage')
  @RequirePermissions(AI_PERMISSIONS.usageRead)
  usage(@CurrentSecurityContext() context: SecurityContext) {
    return this.subscriptions.getUsageStatus(context.companyId);
  }
}
