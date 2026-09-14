import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  FolderOpen,
  History,
  LayoutGrid,
  Repeat2,
  Settings2,
} from 'lucide-react';

export const primaryNavigation = [
  {
    to: '/',
    label: 'Обзор',
    icon: LayoutGrid,
    description: 'Общая картина ваших финансов.',
  },
  {
    to: '/transactions',
    label: 'Транзакции',
    icon: ArrowLeftRight,
    description: 'История доходов и расходов в одном месте.',
  },
  {
    to: '/budgets',
    label: 'Бюджеты',
    icon: ChartNoAxesCombined,
    description: 'Планирование расходов на каждый месяц.',
  },
] as const;
export const moreNavigation = [
  {
    to: '/recurring',
    label: 'Регулярные операции',
    icon: Repeat2,
    description: 'Расписание повторяющихся доходов и расходов.',
  },
  {
    to: '/categories',
    label: 'Категории',
    icon: FolderOpen,
    description: 'Понятная структура доходов и расходов.',
  },
  {
    to: '/audit-log',
    label: 'Журнал изменений',
    icon: History,
    description: 'История изменений ваших данных.',
  },
  {
    to: '/settings',
    label: 'Настройки',
    icon: Settings2,
    description: 'Профиль и личные предпочтения.',
  },
] as const;
export const navigation = [...primaryNavigation, ...moreNavigation];
export type NavigationItem = (typeof navigation)[number];
