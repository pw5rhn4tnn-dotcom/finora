import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './health/health.module.js';

import { CategoriesModule } from './modules/categories/categories.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { BudgetsModule } from './modules/budgets/budgets.module.js';
@Module({
  imports: [
    HealthModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
  ],
})
export class AppModule {}
