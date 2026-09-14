import type { UserDto } from '@finora/api-client';
export const testUser: UserDto = {
  id: 'c62050a6-3094-4c44-a998-d126084db963',
  email: 'test@example.com',
  displayName: 'Тестовый профиль',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
  baseCurrencyLocked: false,
};
export const testOptions = {
  currencies: ['RUB', 'USD', 'EUR'],
  timeZones: ['Europe/Moscow', 'UTC'],
};
