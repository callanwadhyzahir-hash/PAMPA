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
import { AiController } from './ai.controller';
import { AiCreditsService } from './credits/ai-credits.service';
import { AiGatewayService } from './gateway/ai-gateway.service';
import { AiPricingService } from './pricing/ai-pricing.service';
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
    AiToolRegistry,
    AiToolsRepository,
    AiToolsRegistrar,
    AiGatewayService,
    AiAdminService,
  ],
  exports: [AiGatewayService, AiSubscriptionService],
})
export class AiModule {}
