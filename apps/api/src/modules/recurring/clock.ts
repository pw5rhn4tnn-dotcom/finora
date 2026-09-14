import { Injectable } from '@nestjs/common';

// Единая точка доступа к «текущему времени» для recurring domain logic.
// Production всегда использует системные часы; тесты подменяют момент через
// override — без sleep и без ожидания реальной полуночи/DST. Не HTTP API:
// override недоступен снаружи процесса, поэтому backdoor в production нет.
@Injectable()
export class Clock {
  private override: Date | null = null;
  now(): Date {
    return this.override ?? new Date();
  }
  setOverride(date: Date | null): void {
    this.override = date;
  }
}
