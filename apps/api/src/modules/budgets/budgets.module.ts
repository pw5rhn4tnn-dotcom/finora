import { PrismaModule } from '../../prisma/prisma.module.js';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { BudgetsController } from './budgets.controller.js';
import { BudgetsService } from './budgets.service.js';
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
