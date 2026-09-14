import { monthNames } from '../finance/month-names';
export const monthLabel = (year: number, month: number) =>
  `${monthNames[month - 1]} ${String(year).padStart(4, '0')}`;
