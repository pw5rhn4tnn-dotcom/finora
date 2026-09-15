// Денежная строка форматируется без потери точности в Number.
export function moneyText(value: string, currency: string) {
  const [integer = '0', fraction = ''] = value.split('.');
  const digits =
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return `${integer === '-0' ? '−0' : BigInt(integer).toLocaleString('ru-RU')}${Math.max(digits, fraction.length) ? ',' + fraction.padEnd(digits, '0') : ''} ${currency}`;
}
export function dateText(value: string) {
  return value.split('-').reverse().join('.');
}
// createdAt — момент события в UTC (не business date), поэтому в отличие от
// dateText показывается в локальном времени владельца через IANA timeZone.
export function dateTimeText(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
}
export function todayInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join('-');
}
