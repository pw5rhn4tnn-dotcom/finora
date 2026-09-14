import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import { errorDiagnostics } from '../../infrastructure/error-diagnostics.js';
import { Clock } from './clock.js';
import { runSchedulerTick } from './engine.js';

const logger = new Logger('RecurringScheduler');

// Периодичность тика — доверенный in-memory триггер, НЕ граница корректности:
// её роль полностью играет engine.ts (блокировки + unique constraint).
// Поэтому несколько независимых процессов API с разными таймерами безопасны.
const DEFAULT_INTERVAL_MS = 60_000;

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
    private readonly clock: Clock,
  ) {}
  onModuleInit() {
    if (process.env['RECURRING_SCHEDULER_DISABLED'] === 'true') return;
    const interval = Number(
      process.env['RECURRING_SCHEDULER_INTERVAL_MS'] ?? DEFAULT_INTERVAL_MS,
    );
    // Запуск сразу при старте — перезапуск контейнера не откладывает
    // накопленный долг до следующего тика.
    void this.tick();
    this.timer = setInterval(() => void this.tick(), interval);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  // Экспортируется отдельно от таймера, чтобы тесты могли вызывать проход
  // детерминированно (управляемые Clock) без ожидания реального интервала.
  async tick() {
    if (this.running) return { rulesProcessed: 0, occurrences: 0, failed: 0 };
    this.running = true;
    try {
      const result = await runSchedulerTick(
        this.prisma,
        this.audit,
        this.clock.now(),
      );
      if (result.occurrences > 0 || result.failed > 0)
        logger.log({ message: 'Recurring tick завершён', ...result });
      return result;
    } catch (error) {
      logger.error({
        message: 'Recurring tick завершился ошибкой верхнего уровня',
        ...errorDiagnostics(error),
      });
      return { rulesProcessed: 0, occurrences: 0, failed: 1 };
    } finally {
      this.running = false;
    }
  }
}
