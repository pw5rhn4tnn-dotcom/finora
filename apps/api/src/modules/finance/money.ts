import { Prisma } from '../../generated/prisma/client.js';
import { currencyDigits, invalid } from './validation.js';
// 24×24 значащих разряда произведения должны сохраниться до единственного округления.
export const Decimal = Prisma.Decimal.clone({ precision: 60 });
export function financialSnapshot(
  amount: string,
  currency: string,
  baseCurrency: string,
  exchangeRate?: string,
) {
  const value = new Decimal(amount);
  if (value.decimalPlaces() > currencyDigits(currency))
    invalid(
      'amount',
      `Для ${currency} допустимо ${currencyDigits(currency)} дробных знаков`,
    );
  if (!value.gt(0)) invalid('amount', 'Сумма должна быть больше нуля');
  if (currency !== baseCurrency && exchangeRate === undefined)
    invalid('exchangeRate', 'Укажите курс к основной валюте');
  if (
    currency === baseCurrency &&
    exchangeRate !== undefined &&
    !new Decimal(exchangeRate).eq(1)
  )
    invalid('exchangeRate', 'Для основной валюты курс равен 1');
  const rate = new Decimal(currency === baseCurrency ? '1' : exchangeRate!);
  const normalized = value
    .mul(rate)
    .toDecimalPlaces(currencyDigits(baseCurrency), Decimal.ROUND_HALF_UP);
  if (normalized.gte('10000000000000000'))
    invalid('amount', 'Сумма в основной валюте превышает допустимый диапазон');
  return {
    amount: value.toFixed(),
    exchangeRate: rate.toFixed(),
    amountInBaseCurrency: normalized.toFixed(),
  };
}
