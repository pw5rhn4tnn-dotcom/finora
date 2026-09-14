import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser } from '../auth/auth.guard.js';
import { validate } from '../users/preferences.js';
import { dashboardQuery } from './dashboard-calculations.js';
import { DashboardDto, DashboardQueryDto } from './dashboard.dto.js';
import { DashboardService } from './dashboard.service.js';
@ApiTags('Обзор')
@ApiCookieAuth()
@ApiProblems()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get()
  @ApiOperation({
    operationId: 'dashboardGet',
    summary: 'Согласованный обзор собственных финансов за месяц',
    description:
      'Обязательны year и month без ведущих нулей. Неизвестные и повторные query-поля запрещены. Полное шестимесячное окно: выбранный месяц от 0001-06 до 9999-12. DATE сравнивается без сдвига timezone. Сравнения insights относятся ко всему предыдущему календарному месяцу, а не к одинаковому числу дней.',
  })
  @ApiOkResponse({ type: DashboardDto })
  get(@CurrentUser() user: User, @Query() query: DashboardQueryDto) {
    return this.service.get(user.id, validate(dashboardQuery, query));
  }
}
