import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { Clock } from './clock.js';
import { RecurringController } from './recurring.controller.js';
import { RecurringService } from './recurring.service.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RecurringController],
  providers: [Clock, RecurringService, SchedulerService],
  exports: [Clock, RecurringService, SchedulerService],
})
export class RecurringModule {}
