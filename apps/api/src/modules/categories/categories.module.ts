import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [CategoriesService],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
