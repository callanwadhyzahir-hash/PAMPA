import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/core/companies/companies.module';
import { CompanyTypesModule } from './modules/core/company-types/company-types.module';
import { CountriesModule } from './modules/core/countries/countries.module';
import { CurrenciesModule } from './modules/core/currencies/currencies.module';
import { TaxConditionsModule } from './modules/core/tax-conditions/tax-conditions.module';
import { UsersModule } from './modules/administration/users/users.module';
import { RolesModule } from './modules/administration/roles/roles.module';
import { BranchesModule } from './modules/administration/branches/branches.module';
import { CitiesModule } from './modules/core/cities/cities.module';
import { ProductCategoriesModule } from './modules/catalog/product-categories/product-categories.module';
import { ProductsModule } from './modules/catalog/products/products.module';
import { WarehousesModule } from './modules/inventory/warehouses/warehouses.module';
import { StockModule } from './modules/inventory/stock/stock.module';
import { ClientsModule } from './modules/commercial/clients/clients.module';
import { SalesModule } from './modules/commercial/sales/sales.module';
import { PaymentsModule } from './modules/commercial/payments/payments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { MercadoLibreModule } from './modules/integrations/mercadolibre/mercadolibre.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CountriesModule,
    CompaniesModule,
    CompanyTypesModule,
    TaxConditionsModule,
    CurrenciesModule,
    AuthModule,
    UsersModule,
    RolesModule,
    BranchesModule,
    CitiesModule,
    ProductCategoriesModule,
    ProductsModule,
    WarehousesModule,
    StockModule,
    ClientsModule,
    SalesModule,
    PaymentsModule,
    AnalyticsModule,
    FiscalModule.forRoot(),
    MercadoLibreModule,
    PlatformAdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
