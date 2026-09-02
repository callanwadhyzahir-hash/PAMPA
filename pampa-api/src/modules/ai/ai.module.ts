import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AnalyticsModule } from '../analytics/analytics.module';
import { SecurityAuditModule } from '../auth/audit/security-audit.module';
import { RateLimitService } from '../auth/rate-limit/rate-limit.service';
import { ProductsModule } from '../catalog/products/products.module';
import { StockModule } from '../inventory/stock/stock.module';
import { AiAdminController } from './admin/ai-admin.controller';
import { AiAdminService } from './admin/ai-admin.service';
import { AiConfigService } from './ai.config';
import type { AiProvider } from './provider/ai-provider.interface';
import { AiController } from './ai.controller';
import { AiCreditsService } from './credits/ai-credits.service';
import { AiGatewayService } from './gateway/ai-gateway.service';
import { AiPricingService } from './pricing/ai-pricing.service';
import { AI_PROVIDER } from './provider/ai-provider.token';
import { GeminiProvider } from './provider/gemini-provider.service';
import { OpenAiProvider } from './provider/openai-provider.service';
import { AiQuotaService } from './quota/ai-quota.service';
import { AiSubscriptionRepository } from './subscription/ai-subscription.repository';
import { AiSubscriptionService } from './subscription/ai-subscription.service';
import { AiToolRegistry } from './tools/ai-tool-registry';
import { AiToolsRegistrar } from './tools/ai-tools.registrar';
import { AiToolsRepository } from './tools/ai-tools.repository';
import { AiUsageRepository } from './usage/ai-usage.repository';

/**
 * Centralized PAMPA IA infrastructure module. Every future AI feature
 * (invoice parsing, stock assistants, agents, ...) must be built as a new
 * caller of AiGatewayService inside this module or a sibling that imports
 * it — never a direct dependency on OpenAiProvider or the `openai` package.
 * See docs/pampa-ai-architecture.md.
 *
 * Imports ProductsModule/StockModule/AnalyticsModule only to reuse their
 * real, already-tenant-scoped services as AI tools (AiToolsRegistrar) — the
 * AI module never talks to Prisma for ERP data on its own.
 */
@Module({
  imports: [
    ConfigModule,
    SecurityAuditModule,
    ProductsModule,
    StockModule,
    AnalyticsModule,
  ],
  controllers: [AiController, AiAdminController],
  providers: [
    AiConfigService,
    AiPricingService,
    AiCreditsService,
    AiSubscriptionRepository,
    AiSubscriptionService,
    AiQuotaService,
    AiUsageRepository,
    RateLimitService,
    OpenAiProvider,
    GeminiProvider,
    /**
     * Prefer Gemini when it's configured — same "which provider is actually
     * usable right now" logic as AiGatewayService.extractProducts()'s own
     * fallback, just decided once at boot instead of per-call, since chat()
     * only ever talks to one provider (no mid-conversation fallback: a tool
     * call already went out under one provider's function-calling format,
     * switching mid-loop would desync the transcript). Falls back to
     * OpenAiProvider when GEMINI_API_KEY isn't set, so a Gemini-only outage
     * doesn't remove the assistant for an install that never configured it.
     */
    {
      provide: AI_PROVIDER,
      useFactory: (
        config: AiConfigService,
        openai: OpenAiProvider,
        gemini: GeminiProvider,
      ): AiProvider => (config.geminiConfigured ? gemini : openai),
      inject: [AiConfigService, OpenAiProvider, GeminiProvider],
    },
    AiToolRegistry,
    AiToolsRepository,
    AiToolsRegistrar,
    AiGatewayService,
    AiAdminService,
  ],
  exports: [AiGatewayService, AiSubscriptionService],
})
export class AiModule {}
