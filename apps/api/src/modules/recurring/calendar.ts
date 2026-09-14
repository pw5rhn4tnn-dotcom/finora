// Чистые календарные функции для MONTHLY recurrence: без Date rollover,
// без прибавления «30 дней» и без пересчёта от уже укороченной даты.
// Всё оперирует UTC-полночью как нейтральным носителем календарной DATE
// (как и Prisma @db.Date), а не мгновением времени.

export interface CalendarDate {
  year: number;
  month: number; // 1–12
  day: number;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Нормализует month в 1–12 (перенося излишек в year), затем клэмпит day
// до последнего существующего дня месяца.
export function clampCalendarDate(
  year: number,
  month: number,
  day: number,
): CalendarDate {
  let y = year;
  let m = month;
  if (m > 12) {
    y += Math.floor((m - 1) / 12);
    m = ((m - 1) % 12) + 1;
  } else if (m < 1) {
    y += Math.ceil(m / 12) - 1;
    m = ((((m - 1) % 12) + 12) % 12) + 1;
  }
  return { year: y, month: m, day: Math.min(day, daysInMonth(y, m)) };
}

export function toBusinessDate(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function fromBusinessDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function businessDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Следующий occurrence строго после переданной даты: месяц всегда считается
// от исходного dayOfMonth, а не от (возможно укороченного) дня текущей даты.
export function nextMonthlyOccurrence(current: Date, dayOfMonth: number): Date {
  const { year, month } = fromBusinessDate(current);
  return toBusinessDate(clampCalendarDate(year, month + 1, dayOfMonth));
}

// Календарная дата в IANA timeZone для данного момента времени — «today»
// владельца правила, независимая от timezone контейнера/сервера.
export function calendarDateInZone(instant: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return new Date(
    Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day'))),
  );
}
