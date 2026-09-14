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
