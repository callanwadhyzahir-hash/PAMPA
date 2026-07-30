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
  ],
})
export class AppModule {}
