import { Injectable, OnModuleInit } from '@nestjs/common';

import { AnalyticsRepository } from '../../analytics/analytics.repository';
import { ProductsService } from '../../catalog/products/products.service';
import { StockService } from '../../inventory/stock/stock.service';
import { AiToolRegistry } from './ai-tool-registry';
import { AiToolsRepository } from './ai-tools.repository';
import { createBusinessOverviewTool } from './definitions/business-overview.tool';
import { createCustomerBalanceSummaryTool } from './definitions/customer-balance-summary.tool';
import { createInventorySummaryTool } from './definitions/inventory-summary.tool';
import { createLowStockProductsTool } from './definitions/low-stock-products.tool';
import { createSalesSummaryTool } from './definitions/sales-summary.tool';
import { createSearchProductsTool } from './definitions/search-products.tool';
import { createTopSellingProductsTool } from './definitions/top-selling-products.tool';

/**
 * Populates AiToolRegistry at boot from real, already-tenant-scoped PAMPA
 * services (ProductsService, StockService, AnalyticsRepository) plus the
 * AI-specific read-only queries in AiToolsRepository. Add a new tool here —
 * never inline it in AiGatewayService.
 */
@Injectable()
export class AiToolsRegistrar implements OnModuleInit {
  constructor(
    private readonly registry: AiToolRegistry,
    private readonly productsService: ProductsService,
    private readonly stockService: StockService,
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly toolsRepository: AiToolsRepository,
  ) {}

  onModuleInit() {
    this.registry.register(createSearchProductsTool(this.productsService));
    this.registry.register(createLowStockProductsTool(this.stockService));
    this.registry.register(createInventorySummaryTool(this.stockService));
    this.registry.register(createSalesSummaryTool(this.toolsRepository));
    this.registry.register(createTopSellingProductsTool(this.toolsRepository));
    this.registry.register(
      createCustomerBalanceSummaryTool(this.toolsRepository),
    );
    this.registry.register(
      createBusinessOverviewTool(this.analyticsRepository),
    );
  }
}
