import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './health/health.module.js';

import { CategoriesModule } from './modules/categories/categories.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { BudgetsModule } from './modules/budgets/budgets.module.js';
import { RecurringModule } from './modules/recurring/recurring.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';
@Module({
  imports: [
    HealthModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    RecurringModule,
    DashboardModule,
    ImportsModule,
  ],
})
export class AppModule {}
