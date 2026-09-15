/**
 * Ошибки полей
 */
export type ProblemDtoErrors = {[key: string]: string[]};

export interface ProblemDto {
  /** Категория ошибки */
  type: string;
  /** Краткое описание ошибки */
  title: string;
  /** HTTP-статус */
  status: number;
  /** Безопасное описание причины */
  detail: string;
  /** Ошибки полей */
  errors: ProblemDtoErrors;
  /** Идентификатор запроса */
  traceId: string;
}

/**
 * Состояние инфраструктуры
 */
export type HealthDtoStatus = typeof HealthDtoStatus[keyof typeof HealthDtoStatus];


export const HealthDtoStatus = {
  ok: 'ok',
} as const;

export interface HealthDto {
  /** Состояние инфраструктуры */
  status: HealthDtoStatus;
}

export interface RegisterInputDto {
  /**
     * Имя профиля
     * @minLength 1
     * @maxLength 100
     */
  displayName: string;
  /** Код основной валюты из /settings/options */
  baseCurrency: string;
  /** Часовой пояс IANA из /settings/options */
  timeZone: string;
  /**
     * Email нового пользователя
     * @maxLength 254
     */
  email: string;
  /**
     * Пароль от 12 до 128 символов
     * @minLength 12
     * @maxLength 128
     */
  password: string;
}

export interface UserDto {
  /**
     * Имя профиля
     * @minLength 1
     * @maxLength 100
     */
  displayName: string;
  /** Код основной валюты из /settings/options */
  baseCurrency: string;
  /** Часовой пояс IANA из /settings/options */
  timeZone: string;
  /** Идентификатор текущего пользователя */
  id: string;
  /** Нормализованный email */
  email: string;
  /** Основная валюта заблокирована финансовыми данными или их историей */
  baseCurrencyLocked: boolean;
}

export interface LoginInputDto {
  /**
     * Email, регистр не учитывается
     * @maxLength 254
     */
  email: string;
  /**
     * Пароль
     * @minLength 1
     * @maxLength 128
     */
  password: string;
}

export interface PreferenceOptionsDto {
  /** Поддерживаемые коды валют */
  currencies: string[];
  /** Поддерживаемые часовые пояса IANA */
  timeZones: string[];
}

export interface ProfileInputDto {
  /**
     * Имя профиля
     * @minLength 1
     * @maxLength 100
     */
  displayName: string;
  /** Код основной валюты из /settings/options */
  baseCurrency: string;
  /** Часовой пояс IANA из /settings/options */
  timeZone: string;
}

/**
 * Тип затронутой сущности
 */
export type AuditEntryDtoEntityType = typeof AuditEntryDtoEntityType[keyof typeof AuditEntryDtoEntityType];


export const AuditEntryDtoEntityType = {
  Transaction: 'Transaction',
  Budget: 'Budget',
  Category: 'Category',
  RecurringTransaction: 'RecurringTransaction',
} as const;

/**
 * Действие
 */
export type AuditEntryDtoAction = typeof AuditEntryDtoAction[keyof typeof AuditEntryDtoAction];


export const AuditEntryDtoAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ARCHIVE: 'ARCHIVE',
} as const;

/**
 * Снимок до изменения; отсутствует для CREATE. Раскладка полей зависит от entityType
 * @nullable
 */
export type AuditEntryDtoBefore = { [key: string]: unknown } | null;

/**
 * Снимок после изменения; отсутствует для DELETE
 * @nullable
 */
export type AuditEntryDtoAfter = { [key: string]: unknown } | null;

export interface AuditEntryDto {
  /** Идентификатор записи аудита */
  id: string;
  /** Тип затронутой сущности */
  entityType: AuditEntryDtoEntityType;
  /** Идентификатор затронутой сущности; сущность может быть уже удалена */
  entityId: string;
  /** Действие */
  action: AuditEntryDtoAction;
  /**
     * Снимок до изменения; отсутствует для CREATE. Раскладка полей зависит от entityType
     * @nullable
     */
  before: AuditEntryDtoBefore;
  /**
     * Снимок после изменения; отсутствует для DELETE
     * @nullable
     */
  after: AuditEntryDtoAfter;
  /** Момент записи */
  createdAt: string;
}

export interface AuditPageDto {
  /** Номер страницы */
  page: number;
  /** Размер страницы */
  pageSize: number;
  /** Всего собственных записей после фильтрации */
  total: number;
  /** Записи страницы */
  items: AuditEntryDto[];
}

/**
 * Тип категории
 */
export type CategoryDtoType = typeof CategoryDtoType[keyof typeof CategoryDtoType];


export const CategoryDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

/**
 * Иконка категории
 */
export type CategoryDtoIcon = typeof CategoryDtoIcon[keyof typeof CategoryDtoIcon];


export const CategoryDtoIcon = {
  'briefcase-business': 'briefcase-business',
  laptop: 'laptop',
  'shopping-basket': 'shopping-basket',
  house: 'house',
  'tram-front': 'tram-front',
  utensils: 'utensils',
  'train-front': 'train-front',
  repeat: 'repeat',
  heart: 'heart',
  gift: 'gift',
  'graduation-cap': 'graduation-cap',
  wallet: 'wallet',
} as const;

export interface CategoryDto {
  /**
     * Название категории; trim, уникально без регистра в пределах владельца и типа
     * @minLength 1
     * @maxLength 100
     */
  name: string;
  /** Тип категории */
  type: CategoryDtoType;
  /** Иконка категории */
  icon: CategoryDtoIcon;
  /**
     * Цвет категории
     * @pattern ^#[0-9a-fA-F]{6}$
     */
  color: string;
  /** Идентификатор категории */
  id: string;
  /**
     * Дата архивирования
     * @nullable
     */
  archivedAt: string | null;
  /** Создана */
  createdAt: string;
  /** Изменена */
  updatedAt: string;
}

export interface CategoryPageDto {
  /** Номер страницы */
  page: number;
  /** Размер страницы */
  pageSize: number;
  /** Всего собственных записей после фильтрации */
  total: number;
  /** Категории страницы */
  items: CategoryDto[];
}

/**
 * Тип категории
 */
export type CategoryInputDtoType = typeof CategoryInputDtoType[keyof typeof CategoryInputDtoType];


export const CategoryInputDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

/**
 * Иконка категории
 */
export type CategoryInputDtoIcon = typeof CategoryInputDtoIcon[keyof typeof CategoryInputDtoIcon];


export const CategoryInputDtoIcon = {
  'briefcase-business': 'briefcase-business',
  laptop: 'laptop',
  'shopping-basket': 'shopping-basket',
  house: 'house',
  'tram-front': 'tram-front',
  utensils: 'utensils',
  'train-front': 'train-front',
  repeat: 'repeat',
  heart: 'heart',
  gift: 'gift',
  'graduation-cap': 'graduation-cap',
  wallet: 'wallet',
} as const;

export interface CategoryInputDto {
  /**
     * Название категории; trim, уникально без регистра в пределах владельца и типа
     * @minLength 1
     * @maxLength 100
     */
  name: string;
  /** Тип категории */
  type: CategoryInputDtoType;
  /** Иконка категории */
  icon: CategoryInputDtoIcon;
  /**
     * Цвет категории
     * @pattern ^#[0-9a-fA-F]{6}$
     */
  color: string;
}

/**
 * Тип категории
 */
export type CategoryPatchDtoType = typeof CategoryPatchDtoType[keyof typeof CategoryPatchDtoType];


export const CategoryPatchDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

/**
 * Иконка категории
 */
export type CategoryPatchDtoIcon = typeof CategoryPatchDtoIcon[keyof typeof CategoryPatchDtoIcon];


export const CategoryPatchDtoIcon = {
  'briefcase-business': 'briefcase-business',
  laptop: 'laptop',
  'shopping-basket': 'shopping-basket',
  house: 'house',
  'tram-front': 'tram-front',
  utensils: 'utensils',
  'train-front': 'train-front',
  repeat: 'repeat',
  heart: 'heart',
  gift: 'gift',
  'graduation-cap': 'graduation-cap',
  wallet: 'wallet',
} as const;

export interface CategoryPatchDto {
  /**
     * Название категории; trim, уникально без регистра в пределах владельца и типа
     * @minLength 1
     * @maxLength 100
     */
  name?: string;
  /** Тип категории */
  type?: CategoryPatchDtoType;
  /** Иконка категории */
  icon?: CategoryPatchDtoIcon;
  /**
     * Цвет категории
     * @pattern ^#[0-9a-fA-F]{6}$
     */
  color?: string;
}

/**
 * Результат: удалена неиспользованная либо архивирована используемая категория; активные связанные правила также архивируются
 */
export type CategoryRemovalDtoOutcome = typeof CategoryRemovalDtoOutcome[keyof typeof CategoryRemovalDtoOutcome];


export const CategoryRemovalDtoOutcome = {
  deleted: 'deleted',
  archived: 'archived',
} as const;

export interface CategoryRemovalDto {
  /** Результат: удалена неиспользованная либо архивирована используемая категория; активные связанные правила также архивируются */
  outcome: CategoryRemovalDtoOutcome;
}

/**
 * Тип операции
 */
export type TransactionDtoType = typeof TransactionDtoType[keyof typeof TransactionDtoType];


export const TransactionDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

/**
 * Источник операции
 */
export type TransactionDtoSource = typeof TransactionDtoSource[keyof typeof TransactionDtoSource];


export const TransactionDtoSource = {
  MANUAL: 'MANUAL',
  CSV: 'CSV',
  RECURRING: 'RECURRING',
} as const;

export interface TransactionDto {
  /**
     * Положительная сумма десятичной строкой; точность валюты из ICU, максимум 16 целых и 8 дробных знаков
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amount: string;
  /** Код валюты из /settings/options */
  currency: string;
  /**
     * Сохранённый курс
     * @pattern ^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$
     */
  exchangeRate?: string;
  /** Собственная категория соответствующего типа */
  categoryId: string;
  /** Тип операции */
  type: TransactionDtoType;
  /** Календарная дата, без сдвига timezone */
  transactionDate: string;
  /**
     * Описание; пробелы по краям удаляются
     * @minLength 1
     * @maxLength 500
     */
  description: string;
  /** Идентификатор операции */
  id: string;
  /**
     * Сумма в основной валюте, рассчитанная сервером
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amountInBaseCurrency: string;
  /** Категория, включая архивную */
  category: CategoryDto;
  /** Источник операции */
  source: TransactionDtoSource;
  /**
     * Историческая связь с правилом
     * @nullable
     */
  recurringTransactionId: string | null;
  /**
     * Дата исходного повторения
     * @nullable
     */
  recurringOccurrenceDate: string | null;
  /** Создана */
  createdAt: string;
  /** Изменена */
  updatedAt: string;
}

export interface TransactionPageDto {
  /** Номер страницы */
  page: number;
  /** Размер страницы */
  pageSize: number;
  /** Всего собственных записей после фильтрации */
  total: number;
  /** Операции страницы */
  items: TransactionDto[];
}

/**
 * Тип операции
 */
export type TransactionInputDtoType = typeof TransactionInputDtoType[keyof typeof TransactionInputDtoType];


export const TransactionInputDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export interface TransactionInputDto {
  /**
     * Положительная сумма десятичной строкой; точность валюты из ICU, максимум 16 целых и 8 дробных знаков
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amount: string;
  /** Код валюты из /settings/options */
  currency: string;
  /**
     * Положительный курс к основной валюте; обязателен для чужой валюты и при смене валюты. Для основной валюты равен 1
     * @pattern ^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$
     */
  exchangeRate?: string;
  /** Собственная категория соответствующего типа */
  categoryId: string;
  /** Тип операции */
  type: TransactionInputDtoType;
  /** Календарная дата, без сдвига timezone */
  transactionDate: string;
  /**
     * Описание; пробелы по краям удаляются
     * @minLength 1
     * @maxLength 500
     */
  description: string;
}

/**
 * Тип операции
 */
export type TransactionPatchDtoType = typeof TransactionPatchDtoType[keyof typeof TransactionPatchDtoType];


export const TransactionPatchDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export interface TransactionPatchDto {
  /**
     * Положительная сумма десятичной строкой; точность валюты из ICU, максимум 16 целых и 8 дробных знаков
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amount?: string;
  /** Код валюты из /settings/options */
  currency?: string;
  /**
     * Положительный курс к основной валюте; обязателен для чужой валюты и при смене валюты. Для основной валюты равен 1
     * @pattern ^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$
     */
  exchangeRate?: string;
  /** Собственная категория соответствующего типа */
  categoryId?: string;
  /** Тип операции */
  type?: TransactionPatchDtoType;
  /** Календарная дата, без сдвига timezone */
  transactionDate?: string;
  /**
     * Описание; пробелы по краям удаляются
     * @minLength 1
     * @maxLength 500
     */
  description?: string;
}

export interface BudgetDto {
  /** Собственная активная expense-категория; прежняя архивная связь сохраняется при изменении лимита */
  categoryId: string;
  /**
     * Календарный год
     * @minimum 1
     * @maximum 9999
     */
  year: number;
  /**
     * Календарный месяц
     * @minimum 1
     * @maximum 12
     */
  month: number;
  /**
     * Положительный лимит в основной валюте; точность валюты из /settings/options, максимум 16 целых знаков
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  limitAmount: string;
  /** Идентификатор бюджета */
  id: string;
  /** Категория, включая архивную */
  category: CategoryDto;
  /** Основная валюта владельца */
  currency: string;
  /**
     * Сумма расходов в основной валюте за календарный месяц по DATE; все операции категории, независимо от пагинации
     * @pattern ^\d+(\.\d+)?$
     */
  spent: string;
  /**
     * Лимит минус расходы; отрицательный остаток означает превышение
     * @pattern ^-?\d+(\.\d+)?$
     */
  remaining: string;
  /** Расходы строго больше лимита */
  overBudget: boolean;
  /**
     * Использование в процентах, строка с 2 знаками HALF_UP; может быть больше 100
     * @pattern ^\d+\.\d{2}$
     */
  progress: string;
  /** Создан */
  createdAt: string;
  /** Изменён */
  updatedAt: string;
}

export interface BudgetPageDto {
  /** Номер страницы */
  page: number;
  /** Размер страницы */
  pageSize: number;
  /** Всего собственных записей после фильтрации */
  total: number;
  /** Бюджеты выбранного месяца */
  items: BudgetDto[];
}

export interface BudgetInputDto {
  /** Собственная активная expense-категория; прежняя архивная связь сохраняется при изменении лимита */
  categoryId: string;
  /**
     * Календарный год
     * @minimum 1
     * @maximum 9999
     */
  year: number;
  /**
     * Календарный месяц
     * @minimum 1
     * @maximum 12
     */
  month: number;
  /**
     * Положительный лимит в основной валюте; точность валюты из /settings/options, максимум 16 целых знаков
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  limitAmount: string;
}

export interface BudgetPatchDto {
  /** Собственная активная expense-категория; прежняя архивная связь сохраняется при изменении лимита */
  categoryId?: string;
  /**
     * Календарный год
     * @minimum 1
     * @maximum 9999
     */
  year?: number;
  /**
     * Календарный месяц
     * @minimum 1
     * @maximum 12
     */
  month?: number;
  /**
     * Положительный лимит в основной валюте; точность валюты из /settings/options, максимум 16 целых знаков
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  limitAmount?: string;
}

/**
 * Тип операции
 */
export type RecurringDtoType = typeof RecurringDtoType[keyof typeof RecurringDtoType];


export const RecurringDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

/**
 * Частота
 */
export type RecurringDtoFrequency = typeof RecurringDtoFrequency[keyof typeof RecurringDtoFrequency];


export const RecurringDtoFrequency = {
  MONTHLY: 'MONTHLY',
} as const;

export interface RecurringDto {
  /** Идентификатор правила */
  id: string;
  /** Категория, включая архивную (после архивирования категории) */
  category: CategoryDto;
  /** Тип операции */
  type: RecurringDtoType;
  /**
     * Сумма шаблона
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amount: string;
  /** Валюта шаблона */
  currency: string;
  /**
     * Курс к основной валюте
     * @pattern ^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$
     */
  exchangeRate: string;
  /** Описание */
  description: string;
  /** Частота */
  frequency: RecurringDtoFrequency;
  /**
     * День месяца; при коротком месяце используется последний день
     * @minimum 1
     * @maximum 31
     */
  dayOfMonth: number;
  /** Дата первой occurrence */
  startDate: string;
  /**
     * Последняя допустимая дата occurrence включительно
     * @nullable
     */
  endDate: string | null;
  /** Следующая (или последняя обработанная, если правило архивировано) дата occurrence */
  nextOccurrenceDate: string;
  /**
     * Дата архивирования/деактивации
     * @nullable
     */
  archivedAt: string | null;
  /** Хотя бы одна операция уже сгенерирована — hard delete недоступен, доступно только архивирование */
  hasGeneratedTransactions: boolean;
  /** Создано */
  createdAt: string;
  /** Изменено */
  updatedAt: string;
}

export interface RecurringPageDto {
  /** Номер страницы */
  page: number;
  /** Размер страницы */
  pageSize: number;
  /** Всего собственных записей после фильтрации */
  total: number;
  /** Правила страницы */
  items: RecurringDto[];
}

/**
 * Тип операции
 */
export type RecurringInputDtoType = typeof RecurringInputDtoType[keyof typeof RecurringInputDtoType];


export const RecurringInputDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export interface RecurringInputDto {
  /**
     * Положительная сумма шаблона десятичной строкой
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amount: string;
  /** Код валюты из /settings/options */
  currency: string;
  /**
     * Курс к основной валюте; обязателен для чужой валюты. Для основной валюты равен 1
     * @pattern ^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$
     */
  exchangeRate?: string;
  /** Собственная активная категория соответствующего типа */
  categoryId: string;
  /** Тип операции */
  type: RecurringInputDtoType;
  /**
     * Описание, переносится в каждую сгенерированную операцию
     * @minLength 1
     * @maxLength 500
     */
  description: string;
  /** Дата первой occurrence; её календарный день фиксируется как dayOfMonth правила */
  startDate: string;
  /** Последняя допустимая дата occurrence включительно */
  endDate?: string;
}

/**
 * Тип операции
 */
export type RecurringPatchDtoType = typeof RecurringPatchDtoType[keyof typeof RecurringPatchDtoType];


export const RecurringPatchDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export interface RecurringPatchDto {
  /**
     * Положительная сумма шаблона десятичной строкой
     * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
     */
  amount?: string;
  /** Код валюты из /settings/options */
  currency?: string;
  /**
     * Курс к основной валюте; обязателен для чужой валюты. Для основной валюты равен 1
     * @pattern ^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$
     */
  exchangeRate?: string;
  /** Собственная активная категория соответствующего типа */
  categoryId?: string;
  /** Тип операции */
  type?: RecurringPatchDtoType;
  /**
     * Описание, переносится в каждую сгенерированную операцию
     * @minLength 1
     * @maxLength 500
     */
  description?: string;
  /**
     * День месяца 1–31; смена приводит к обязательному catch-up по прежнему расписанию перед применением
     * @minimum 1
     * @maximum 31
     */
  dayOfMonth?: number;
  /**
     * Последняя допустимая дата occurrence включительно; null снимает ограничение
     * @nullable
     */
  endDate?: string | null;
}

/**
 * Результат: удалено (ещё не создавало операций) либо архивировано (история сохранена)
 */
export type RecurringRemovalDtoOutcome = typeof RecurringRemovalDtoOutcome[keyof typeof RecurringRemovalDtoOutcome];


export const RecurringRemovalDtoOutcome = {
  deleted: 'deleted',
  archived: 'archived',
} as const;

export interface RecurringRemovalDto {
  /** Результат: удалено (ещё не создавало операций) либо архивировано (история сохранена) */
  outcome: RecurringRemovalDtoOutcome;
}

export interface DashboardMonthDto {
  /** Доходы в основной валюте, точная десятичная строка */
  income: string;
  /** Расходы в основной валюте, точная десятичная строка */
  expense: string;
  /** Доходы минус расходы, может быть отрицательным */
  net: string;
  /**
     * (Доходы − расходы) / доходы × 100, HALF_UP до 2 знаков; null при нулевом доходе
     * @nullable
     */
  savingsRate: string | null;
  /** Есть хотя бы одна операция в этом месяце */
  hasTransactions: boolean;
  /** Календарный год */
  year: number;
  /** Календарный месяц 1–12 */
  month: number;
}

export interface DashboardCategoryDto {
  /** Собственная категория, включая архивную */
  category: CategoryDto;
  /** Сумма расходов в основной валюте */
  amount: string;
  /** Доля расходов в процентах, HALF_UP до 2 знаков */
  share: string;
}

/**
 * Стабильный код правила
 */
export type DashboardInsightDtoCode = typeof DashboardInsightDtoCode[keyof typeof DashboardInsightDtoCode];


export const DashboardInsightDtoCode = {
  BUDGET_OVER: 'BUDGET_OVER',
  BUDGET_NEAR: 'BUDGET_NEAR',
  EXPENSE_UP: 'EXPENSE_UP',
  SAVINGS_DOWN: 'SAVINGS_DOWN',
  SAVINGS_UP: 'SAVINGS_UP',
  EXPENSE_DOWN: 'EXPENSE_DOWN',
  LARGEST_CATEGORY: 'LARGEST_CATEGORY',
} as const;

export interface DashboardInsightDto {
  /** Стабильный код правила */
  code: DashboardInsightDtoCode;
  /** Краткий вывод */
  title: string;
  /** Наблюдение на основе выбранного и предыдущего календарных месяцев; не прогноз */
  description: string;
}

/**
 * Тип операции
 */
export type DashboardUpcomingRecurringDtoType = typeof DashboardUpcomingRecurringDtoType[keyof typeof DashboardUpcomingRecurringDtoType];


export const DashboardUpcomingRecurringDtoType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export interface DashboardUpcomingRecurringDto {
  /** Идентификатор правила */
  id: string;
  /** Категория, включая архивную */
  category: CategoryDto;
  /** Тип операции */
  type: DashboardUpcomingRecurringDtoType;
  /** Сумма шаблона */
  amount: string;
  /** Валюта шаблона */
  currency: string;
  /** Описание */
  description: string;
  /** Ближайшая дата occurrence */
  nextOccurrenceDate: string;
}

export interface DashboardDto {
  /** Доходы в основной валюте, точная десятичная строка */
  income: string;
  /** Расходы в основной валюте, точная десятичная строка */
  expense: string;
  /** Доходы минус расходы, может быть отрицательным */
  net: string;
  /**
     * (Доходы − расходы) / доходы × 100, HALF_UP до 2 знаков; null при нулевом доходе
     * @nullable
     */
  savingsRate: string | null;
  /** Есть хотя бы одна операция в этом месяце */
  hasTransactions: boolean;
  /** Календарный год */
  year: number;
  /** Календарный месяц 1–12 */
  month: number;
  /** Основная валюта владельца из того же снимка БД */
  currency: string;
  /** Шесть месяцев по возрастанию: выбранный и пять предыдущих; отсутствующие месяцы заполнены нулями */
  trend: DashboardMonthDto[];
  /** Все категории расходов; сумма DESC, UUID ASC при равенстве */
  distribution: DashboardCategoryDto[];
  /** Первые пять категорий того же распределения */
  topCategories: DashboardCategoryDto[];
  /** Все собственные бюджеты выбранного месяца с семантикой Stage 6, UUID ASC */
  budgets: BudgetDto[];
  /** До четырёх детерминированных наблюдений по приоритету; пусто при недостатке данных */
  insights: DashboardInsightDto[];
  /** До пяти ближайших активных recurring правил по возрастанию nextOccurrenceDate; не зависит от выбранного месяца */
  upcomingRecurring: DashboardUpcomingRecurringDto[];
}

export interface ImportPreviewDto {
  /** Заголовки столбцов файла в исходном порядке */
  columns: string[];
  /** Первые строки данных файла для предпросмотра маппинга */
  sampleRows: string[][];
  /** Всего строк данных в файле (без заголовка) */
  totalRows: number;
}

export interface ImportRowErrorDto {
  /** Поле цели маппинга, к которому относится ошибка */
  field: string;
  /** Читаемое описание ошибки */
  message: string;
}

/**
 * valid — будет импортирована; invalid — пропущена по ошибке; duplicate — пропущена как вероятный дубль
 */
export type ImportRowResultDtoStatus = typeof ImportRowResultDtoStatus[keyof typeof ImportRowResultDtoStatus];


export const ImportRowResultDtoStatus = {
  valid: 'valid',
  invalid: 'invalid',
  duplicate: 'duplicate',
} as const;

export interface ImportRowResultDto {
  /** Номер строки данных файла, начиная с 1 */
  row: number;
  /** valid — будет импортирована; invalid — пропущена по ошибке; duplicate — пропущена как вероятный дубль */
  status: ImportRowResultDtoStatus;
  /** Ошибки строки */
  errors: ImportRowErrorDto[];
}

export interface ImportAnalysisDto {
  /** Всего строк данных в файле */
  totalRows: number;
  /** Строк, готовых к импорту */
  importableRows: number;
  /** Строк, пропущенных как вероятные дубли */
  duplicateRows: number;
  /** Строк, пропущенных по ошибкам валидации */
  invalidRows: number;
  /** Результат по каждой строке */
  rows: ImportRowResultDto[];
  /** Уникальные исходные значения категории без сопоставления в categoryMap — для шага category mapping мастера */
  unmappedCategories: string[];
  /** Валюты, для которых в файле или в rates не хватает курса к основной валюте */
  missingRateCurrencies: string[];
}

export interface ImportResultDto {
  /** Всего строк данных в файле */
  totalRows: number;
  /** Строк, готовых к импорту */
  importableRows: number;
  /** Строк, пропущенных как вероятные дубли */
  duplicateRows: number;
  /** Строк, пропущенных по ошибкам валидации */
  invalidRows: number;
  /** Результат по каждой строке */
  rows: ImportRowResultDto[];
  /** Уникальные исходные значения категории без сопоставления в categoryMap — для шага category mapping мастера */
  unmappedCategories: string[];
  /** Валюты, для которых в файле или в rates не хватает курса к основной валюте */
  missingRateCurrencies: string[];
  /** Фактически импортировано операций */
  imported: number;
}

export type AuditListParams = {
/**
 * Номер страницы от 1
 * @minimum 1
 * @maximum 9999999
 */
page?: number;
/**
 * Размер страницы
 */
pageSize?: AuditListPageSize;
/**
 * Тип сущности
 */
entityType?: AuditListEntityType;
/**
 * История одной сущности (обычно вместе с entityType)
 */
entityId?: string;
/**
 * Действие
 */
action?: AuditListAction;
/**
 * Начальная дата включительно
 */
dateFrom?: string;
/**
 * Конечная дата включительно
 */
dateTo?: string;
};

export type AuditListPageSize = typeof AuditListPageSize[keyof typeof AuditListPageSize];


export const AuditListPageSize = {
  NUMBER_10: 10,
  NUMBER_25: 25,
  NUMBER_50: 50,
} as const;

export type AuditListEntityType = typeof AuditListEntityType[keyof typeof AuditListEntityType];


export const AuditListEntityType = {
  ALL: 'ALL',
  Transaction: 'Transaction',
  Budget: 'Budget',
  Category: 'Category',
  RecurringTransaction: 'RecurringTransaction',
} as const;

export type AuditListAction = typeof AuditListAction[keyof typeof AuditListAction];


export const AuditListAction = {
  ALL: 'ALL',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ARCHIVE: 'ARCHIVE',
} as const;

export type CategoriesListParams = {
/**
 * Номер страницы от 1
 * @minimum 1
 * @maximum 9999999
 */
page?: number;
/**
 * Размер страницы
 */
pageSize?: CategoriesListPageSize;
/**
 * Состояние категорий
 */
state?: CategoriesListState;
};

export type CategoriesListPageSize = typeof CategoriesListPageSize[keyof typeof CategoriesListPageSize];


export const CategoriesListPageSize = {
  NUMBER_10: 10,
  NUMBER_25: 25,
  NUMBER_50: 50,
} as const;

export type CategoriesListState = typeof CategoriesListState[keyof typeof CategoriesListState];


export const CategoriesListState = {
  all: 'all',
  active: 'active',
  archived: 'archived',
} as const;

export type TransactionsListParams = {
/**
 * Номер страницы от 1
 * @minimum 1
 * @maximum 9999999
 */
page?: number;
/**
 * Размер страницы
 */
pageSize?: TransactionsListPageSize;
/**
 * Буквальный поиск без регистра по описанию и категории; пробелы по краям удаляются
 * @maxLength 200
 */
search?: string;
/**
 * Тип операции
 */
type?: TransactionsListType;
/**
 * Категория, включая архивную
 */
categoryId?: string;
/**
 * Начальная дата включительно
 */
dateFrom?: string;
/**
 * Конечная дата включительно
 */
dateTo?: string;
/**
 * Минимум в основной валюте
 * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
 */
amountMin?: string;
/**
 * Максимум в основной валюте
 * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
 */
amountMax?: string;
/**
 * Исходная валюта из /settings/options
 */
currency?: string;
/**
 * Порядок; суммы в основной валюте, стабильный дополнительный порядок по id
 */
sort?: TransactionsListSort;
};

export type TransactionsListPageSize = typeof TransactionsListPageSize[keyof typeof TransactionsListPageSize];


export const TransactionsListPageSize = {
  NUMBER_10: 10,
  NUMBER_25: 25,
  NUMBER_50: 50,
} as const;

export type TransactionsListType = typeof TransactionsListType[keyof typeof TransactionsListType];


export const TransactionsListType = {
  ALL: 'ALL',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionsListSort = typeof TransactionsListSort[keyof typeof TransactionsListSort];


export const TransactionsListSort = {
  newest: 'newest',
  oldest: 'oldest',
  amountDesc: 'amountDesc',
  amountAsc: 'amountAsc',
} as const;

export type TransactionsExportParams = {
/**
 * Буквальный поиск без регистра по описанию и категории; пробелы по краям удаляются
 * @maxLength 200
 */
search?: string;
/**
 * Тип операции
 */
type?: TransactionsExportType;
/**
 * Категория, включая архивную
 */
categoryId?: string;
/**
 * Начальная дата включительно
 */
dateFrom?: string;
/**
 * Конечная дата включительно
 */
dateTo?: string;
/**
 * Минимум в основной валюте
 * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
 */
amountMin?: string;
/**
 * Максимум в основной валюте
 * @pattern ^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$
 */
amountMax?: string;
/**
 * Исходная валюта из /settings/options
 */
currency?: string;
/**
 * Порядок; суммы в основной валюте, стабильный дополнительный порядок по id
 */
sort?: TransactionsExportSort;
};

export type TransactionsExportType = typeof TransactionsExportType[keyof typeof TransactionsExportType];


export const TransactionsExportType = {
  ALL: 'ALL',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionsExportSort = typeof TransactionsExportSort[keyof typeof TransactionsExportSort];


export const TransactionsExportSort = {
  newest: 'newest',
  oldest: 'oldest',
  amountDesc: 'amountDesc',
  amountAsc: 'amountAsc',
} as const;

export type BudgetsListParams = {
/**
 * Номер страницы от 1
 * @minimum 1
 * @maximum 9999999
 */
page?: number;
/**
 * Размер страницы
 */
pageSize?: BudgetsListPageSize;
/**
 * Год выбранного месяца, обязателен
 * @minimum 1
 * @maximum 9999
 */
year: number;
/**
 * Месяц 1–12, обязателен; без ведущего нуля
 * @minimum 1
 * @maximum 12
 */
month: number;
};

export type BudgetsListPageSize = typeof BudgetsListPageSize[keyof typeof BudgetsListPageSize];


export const BudgetsListPageSize = {
  NUMBER_10: 10,
  NUMBER_25: 25,
  NUMBER_50: 50,
} as const;

export type RecurringListParams = {
/**
 * Номер страницы от 1
 * @minimum 1
 * @maximum 9999999
 */
page?: number;
/**
 * Размер страницы
 */
pageSize?: RecurringListPageSize;
/**
 * Состояние правил
 */
state?: RecurringListState;
};

export type RecurringListPageSize = typeof RecurringListPageSize[keyof typeof RecurringListPageSize];


export const RecurringListPageSize = {
  NUMBER_10: 10,
  NUMBER_25: 25,
  NUMBER_50: 50,
} as const;

export type RecurringListState = typeof RecurringListState[keyof typeof RecurringListState];


export const RecurringListState = {
  all: 'all',
  active: 'active',
  archived: 'archived',
} as const;

export type DashboardGetParams = {
/**
 * Год выбранного месяца, обязателен
 * @minimum 1
 * @maximum 9999
 */
year: number;
/**
 * Месяц 1–12, обязателен; без ведущего нуля
 * @minimum 1
 * @maximum 12
 */
month: number;
};

export type ImportsPreviewBody = {
  /** CSV-файл, UTF-8, до 5 МБ */
  file: Blob | File;
};

export type ImportsValidateBody = {
  /** CSV-файл, UTF-8, до 5 МБ */
  file: Blob | File;
  /** JSON: соответствие целей (transactionDate/type/amount/currency/exchangeRate?/category/description) заголовкам столбцов файла */
  mapping: string;
  /** JSON: соответствие исходных значений категории собственным categoryId */
  categoryMap?: string;
  /** JSON: курс к основной валюте по коду валюты для строк без курса в файле */
  rates?: string;
  /** "true" разрешает импорт строк, отмеченных как вероятные дубли */
  includeDuplicates?: string;
};

export type ImportsCreateBody = {
  /** CSV-файл, UTF-8, до 5 МБ */
  file: Blob | File;
  /** JSON: соответствие целей (transactionDate/type/amount/currency/exchangeRate?/category/description) заголовкам столбцов файла */
  mapping: string;
  /** JSON: соответствие исходных значений категории собственным categoryId */
  categoryMap?: string;
  /** JSON: курс к основной валюте по коду валюты для строк без курса в файле */
  rates?: string;
  /** "true" разрешает импорт строк, отмеченных как вероятные дубли */
  includeDuplicates?: string;
};

export type healthLiveResponse200 = {
  data: HealthDto
  status: 200
}

export type healthLiveResponseSuccess = (healthLiveResponse200) & {
  headers: Headers;
};
;

export type healthLiveResponse = (healthLiveResponseSuccess)

export const getHealthLiveUrl = () => {




  return `/health/live`
}

/**
 * @summary Проверить работу процесса API
 */
export const healthLive = async ( options?: RequestInit): Promise<healthLiveResponse> => {

  const res = await fetch(getHealthLiveUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: healthLiveResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as healthLiveResponse
}



export type healthReadyResponse200 = {
  data: HealthDto
  status: 200
}

export type healthReadyResponse503 = {
  data: ProblemDto
  status: 503
}

export type healthReadyResponseSuccess = (healthReadyResponse200) & {
  headers: Headers;
};
export type healthReadyResponseError = (healthReadyResponse503) & {
  headers: Headers;
};

export type healthReadyResponse = (healthReadyResponseSuccess | healthReadyResponseError)

export const getHealthReadyUrl = () => {




  return `/health/ready`
}

/**
 * @summary Проверить доступность PostgreSQL
 */
export const healthReady = async ( options?: RequestInit): Promise<healthReadyResponse> => {

  const res = await fetch(getHealthReadyUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: healthReadyResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as healthReadyResponse
}



export type authRegisterResponse201 = {
  data: UserDto
  status: 201
}

export type authRegisterResponse400 = {
  data: ProblemDto
  status: 400
}

export type authRegisterResponse401 = {
  data: ProblemDto
  status: 401
}

export type authRegisterResponse403 = {
  data: ProblemDto
  status: 403
}

export type authRegisterResponse404 = {
  data: ProblemDto
  status: 404
}

export type authRegisterResponse409 = {
  data: ProblemDto
  status: 409
}

export type authRegisterResponse413 = {
  data: ProblemDto
  status: 413
}

export type authRegisterResponse429 = {
  data: ProblemDto
  status: 429
}

export type authRegisterResponse500 = {
  data: ProblemDto
  status: 500
}

export type authRegisterResponseSuccess = (authRegisterResponse201) & {
  headers: Headers;
};
export type authRegisterResponseError = (authRegisterResponse400 | authRegisterResponse401 | authRegisterResponse403 | authRegisterResponse404 | authRegisterResponse409 | authRegisterResponse413 | authRegisterResponse429 | authRegisterResponse500) & {
  headers: Headers;
};

export type authRegisterResponse = (authRegisterResponseSuccess | authRegisterResponseError)

export const getAuthRegisterUrl = () => {




  return `/api/v1/auth/register`
}

/**
 * @summary Создать аккаунт, стандартные категории и сессию
 */
export const authRegister = async (registerInputDto: RegisterInputDto, options?: RequestInit): Promise<authRegisterResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getAuthRegisterUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(registerInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authRegisterResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as authRegisterResponse
}



export type authLoginResponse200 = {
  data: UserDto
  status: 200
}

export type authLoginResponse400 = {
  data: ProblemDto
  status: 400
}

export type authLoginResponse401 = {
  data: ProblemDto
  status: 401
}

export type authLoginResponse403 = {
  data: ProblemDto
  status: 403
}

export type authLoginResponse404 = {
  data: ProblemDto
  status: 404
}

export type authLoginResponse409 = {
  data: ProblemDto
  status: 409
}

export type authLoginResponse413 = {
  data: ProblemDto
  status: 413
}

export type authLoginResponse429 = {
  data: ProblemDto
  status: 429
}

export type authLoginResponse500 = {
  data: ProblemDto
  status: 500
}

export type authLoginResponseSuccess = (authLoginResponse200) & {
  headers: Headers;
};
export type authLoginResponseError = (authLoginResponse400 | authLoginResponse401 | authLoginResponse403 | authLoginResponse404 | authLoginResponse409 | authLoginResponse413 | authLoginResponse429 | authLoginResponse500) & {
  headers: Headers;
};

export type authLoginResponse = (authLoginResponseSuccess | authLoginResponseError)

export const getAuthLoginUrl = () => {




  return `/api/v1/auth/login`
}

/**
 * @summary Войти по email и паролю
 */
export const authLogin = async (loginInputDto: LoginInputDto, options?: RequestInit): Promise<authLoginResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getAuthLoginUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(loginInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authLoginResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as authLoginResponse
}



export type authLogoutResponse204 = {
  data: void
  status: 204
}

export type authLogoutResponse400 = {
  data: ProblemDto
  status: 400
}

export type authLogoutResponse401 = {
  data: ProblemDto
  status: 401
}

export type authLogoutResponse403 = {
  data: ProblemDto
  status: 403
}

export type authLogoutResponse404 = {
  data: ProblemDto
  status: 404
}

export type authLogoutResponse409 = {
  data: ProblemDto
  status: 409
}

export type authLogoutResponse413 = {
  data: ProblemDto
  status: 413
}

export type authLogoutResponse429 = {
  data: ProblemDto
  status: 429
}

export type authLogoutResponse500 = {
  data: ProblemDto
  status: 500
}

export type authLogoutResponseSuccess = (authLogoutResponse204) & {
  headers: Headers;
};
export type authLogoutResponseError = (authLogoutResponse400 | authLogoutResponse401 | authLogoutResponse403 | authLogoutResponse404 | authLogoutResponse409 | authLogoutResponse413 | authLogoutResponse429 | authLogoutResponse500) & {
  headers: Headers;
};

export type authLogoutResponse = (authLogoutResponseSuccess | authLogoutResponseError)

export const getAuthLogoutUrl = () => {




  return `/api/v1/auth/logout`
}

/**
 * @summary Удалить cookie текущего браузера; ранее скопированный JWT действует до истечения 24 часов
 */
export const authLogout = async ( options?: RequestInit): Promise<authLogoutResponse> => {

  const res = await fetch(getAuthLogoutUrl(),
  {
    ...options,
    method: 'POST'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authLogoutResponse['data'] = body ? JSON.parse(body) : undefined
  return { data, status: res.status, headers: res.headers } as authLogoutResponse
}



export type authMeResponse200 = {
  data: UserDto
  status: 200
}

export type authMeResponse400 = {
  data: ProblemDto
  status: 400
}

export type authMeResponse401 = {
  data: ProblemDto
  status: 401
}

export type authMeResponse403 = {
  data: ProblemDto
  status: 403
}

export type authMeResponse404 = {
  data: ProblemDto
  status: 404
}

export type authMeResponse409 = {
  data: ProblemDto
  status: 409
}

export type authMeResponse413 = {
  data: ProblemDto
  status: 413
}

export type authMeResponse429 = {
  data: ProblemDto
  status: 429
}

export type authMeResponse500 = {
  data: ProblemDto
  status: 500
}

export type authMeResponseSuccess = (authMeResponse200) & {
  headers: Headers;
};
export type authMeResponseError = (authMeResponse400 | authMeResponse401 | authMeResponse403 | authMeResponse404 | authMeResponse409 | authMeResponse413 | authMeResponse429 | authMeResponse500) & {
  headers: Headers;
};

export type authMeResponse = (authMeResponseSuccess | authMeResponseError)

export const getAuthMeUrl = () => {




  return `/api/v1/auth/me`
}

/**
 * @summary Получить текущего пользователя из JWT cookie
 */
export const authMe = async ( options?: RequestInit): Promise<authMeResponse> => {

  const res = await fetch(getAuthMeUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: authMeResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as authMeResponse
}



export type settingsOptionsResponse200 = {
  data: PreferenceOptionsDto
  status: 200
}

export type settingsOptionsResponse400 = {
  data: ProblemDto
  status: 400
}

export type settingsOptionsResponse401 = {
  data: ProblemDto
  status: 401
}

export type settingsOptionsResponse403 = {
  data: ProblemDto
  status: 403
}

export type settingsOptionsResponse404 = {
  data: ProblemDto
  status: 404
}

export type settingsOptionsResponse409 = {
  data: ProblemDto
  status: 409
}

export type settingsOptionsResponse413 = {
  data: ProblemDto
  status: 413
}

export type settingsOptionsResponse429 = {
  data: ProblemDto
  status: 429
}

export type settingsOptionsResponse500 = {
  data: ProblemDto
  status: 500
}

export type settingsOptionsResponseSuccess = (settingsOptionsResponse200) & {
  headers: Headers;
};
export type settingsOptionsResponseError = (settingsOptionsResponse400 | settingsOptionsResponse401 | settingsOptionsResponse403 | settingsOptionsResponse404 | settingsOptionsResponse409 | settingsOptionsResponse413 | settingsOptionsResponse429 | settingsOptionsResponse500) & {
  headers: Headers;
};

export type settingsOptionsResponse = (settingsOptionsResponseSuccess | settingsOptionsResponseError)

export const getSettingsOptionsUrl = () => {




  return `/api/v1/settings/options`
}

/**
 * @summary Каталог валют и часовых поясов для регистрации и настроек
 */
export const settingsOptions = async ( options?: RequestInit): Promise<settingsOptionsResponse> => {

  const res = await fetch(getSettingsOptionsUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: settingsOptionsResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as settingsOptionsResponse
}



export type settingsGetResponse200 = {
  data: UserDto
  status: 200
}

export type settingsGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type settingsGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type settingsGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type settingsGetResponse404 = {
  data: ProblemDto
  status: 404
}

export type settingsGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type settingsGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type settingsGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type settingsGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type settingsGetResponseSuccess = (settingsGetResponse200) & {
  headers: Headers;
};
export type settingsGetResponseError = (settingsGetResponse400 | settingsGetResponse401 | settingsGetResponse403 | settingsGetResponse404 | settingsGetResponse409 | settingsGetResponse413 | settingsGetResponse429 | settingsGetResponse500) & {
  headers: Headers;
};

export type settingsGetResponse = (settingsGetResponseSuccess | settingsGetResponseError)

export const getSettingsGetUrl = () => {




  return `/api/v1/settings`
}

/**
 * @summary Получить свой профиль и настройки
 */
export const settingsGet = async ( options?: RequestInit): Promise<settingsGetResponse> => {

  const res = await fetch(getSettingsGetUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: settingsGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as settingsGetResponse
}



export type settingsUpdateResponse200 = {
  data: UserDto
  status: 200
}

export type settingsUpdateResponse400 = {
  data: ProblemDto
  status: 400
}

export type settingsUpdateResponse401 = {
  data: ProblemDto
  status: 401
}

export type settingsUpdateResponse403 = {
  data: ProblemDto
  status: 403
}

export type settingsUpdateResponse404 = {
  data: ProblemDto
  status: 404
}

export type settingsUpdateResponse409 = {
  data: ProblemDto
  status: 409
}

export type settingsUpdateResponse413 = {
  data: ProblemDto
  status: 413
}

export type settingsUpdateResponse429 = {
  data: ProblemDto
  status: 429
}

export type settingsUpdateResponse500 = {
  data: ProblemDto
  status: 500
}

export type settingsUpdateResponseSuccess = (settingsUpdateResponse200) & {
  headers: Headers;
};
export type settingsUpdateResponseError = (settingsUpdateResponse400 | settingsUpdateResponse401 | settingsUpdateResponse403 | settingsUpdateResponse404 | settingsUpdateResponse409 | settingsUpdateResponse413 | settingsUpdateResponse429 | settingsUpdateResponse500) & {
  headers: Headers;
};

export type settingsUpdateResponse = (settingsUpdateResponseSuccess | settingsUpdateResponseError)

export const getSettingsUpdateUrl = () => {




  return `/api/v1/settings`
}

/**
 * @summary Изменить имя, валюту и часовой пояс своего профиля; чужие ID запрещены
 */
export const settingsUpdate = async (profileInputDto: ProfileInputDto, options?: RequestInit): Promise<settingsUpdateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getSettingsUpdateUrl(),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(profileInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: settingsUpdateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as settingsUpdateResponse
}



export type auditListResponse200 = {
  data: AuditPageDto
  status: 200
}

export type auditListResponse400 = {
  data: ProblemDto
  status: 400
}

export type auditListResponse401 = {
  data: ProblemDto
  status: 401
}

export type auditListResponse403 = {
  data: ProblemDto
  status: 403
}

export type auditListResponse404 = {
  data: ProblemDto
  status: 404
}

export type auditListResponse409 = {
  data: ProblemDto
  status: 409
}

export type auditListResponse413 = {
  data: ProblemDto
  status: 413
}

export type auditListResponse429 = {
  data: ProblemDto
  status: 429
}

export type auditListResponse500 = {
  data: ProblemDto
  status: 500
}

export type auditListResponseSuccess = (auditListResponse200) & {
  headers: Headers;
};
export type auditListResponseError = (auditListResponse400 | auditListResponse401 | auditListResponse403 | auditListResponse404 | auditListResponse409 | auditListResponse413 | auditListResponse429 | auditListResponse500) & {
  headers: Headers;
};

export type auditListResponse = (auditListResponseSuccess | auditListResponseError)

export const getAuditListUrl = (params?: AuditListParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/audit-log?${stringifiedParams}` : `/api/v1/audit-log`
}

/**
 * @summary Read-only список собственных записей аудита с фильтрами и серверной пагинацией
 */
export const auditList = async (params?: AuditListParams, options?: RequestInit): Promise<auditListResponse> => {

  const res = await fetch(getAuditListUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: auditListResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as auditListResponse
}



export type categoriesListResponse200 = {
  data: CategoryPageDto
  status: 200
}

export type categoriesListResponse400 = {
  data: ProblemDto
  status: 400
}

export type categoriesListResponse401 = {
  data: ProblemDto
  status: 401
}

export type categoriesListResponse403 = {
  data: ProblemDto
  status: 403
}

export type categoriesListResponse404 = {
  data: ProblemDto
  status: 404
}

export type categoriesListResponse409 = {
  data: ProblemDto
  status: 409
}

export type categoriesListResponse413 = {
  data: ProblemDto
  status: 413
}

export type categoriesListResponse429 = {
  data: ProblemDto
  status: 429
}

export type categoriesListResponse500 = {
  data: ProblemDto
  status: 500
}

export type categoriesListResponseSuccess = (categoriesListResponse200) & {
  headers: Headers;
};
export type categoriesListResponseError = (categoriesListResponse400 | categoriesListResponse401 | categoriesListResponse403 | categoriesListResponse404 | categoriesListResponse409 | categoriesListResponse413 | categoriesListResponse429 | categoriesListResponse500) & {
  headers: Headers;
};

export type categoriesListResponse = (categoriesListResponseSuccess | categoriesListResponseError)

export const getCategoriesListUrl = (params?: CategoriesListParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/categories?${stringifiedParams}` : `/api/v1/categories`
}

/**
 * @summary Список собственных записей с серверной пагинацией
 */
export const categoriesList = async (params?: CategoriesListParams, options?: RequestInit): Promise<categoriesListResponse> => {

  const res = await fetch(getCategoriesListUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: categoriesListResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as categoriesListResponse
}



export type categoriesCreateResponse201 = {
  data: CategoryDto
  status: 201
}

export type categoriesCreateResponse400 = {
  data: ProblemDto
  status: 400
}

export type categoriesCreateResponse401 = {
  data: ProblemDto
  status: 401
}

export type categoriesCreateResponse403 = {
  data: ProblemDto
  status: 403
}

export type categoriesCreateResponse404 = {
  data: ProblemDto
  status: 404
}

export type categoriesCreateResponse409 = {
  data: ProblemDto
  status: 409
}

export type categoriesCreateResponse413 = {
  data: ProblemDto
  status: 413
}

export type categoriesCreateResponse429 = {
  data: ProblemDto
  status: 429
}

export type categoriesCreateResponse500 = {
  data: ProblemDto
  status: 500
}

export type categoriesCreateResponseSuccess = (categoriesCreateResponse201) & {
  headers: Headers;
};
export type categoriesCreateResponseError = (categoriesCreateResponse400 | categoriesCreateResponse401 | categoriesCreateResponse403 | categoriesCreateResponse404 | categoriesCreateResponse409 | categoriesCreateResponse413 | categoriesCreateResponse429 | categoriesCreateResponse500) & {
  headers: Headers;
};

export type categoriesCreateResponse = (categoriesCreateResponseSuccess | categoriesCreateResponseError)

export const getCategoriesCreateUrl = () => {




  return `/api/v1/categories`
}

/**
 * @summary Создать запись с атомарным аудитом
 */
export const categoriesCreate = async (categoryInputDto: CategoryInputDto, options?: RequestInit): Promise<categoriesCreateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getCategoriesCreateUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(categoryInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: categoriesCreateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as categoriesCreateResponse
}



export type categoriesOptionsResponse200 = {
  data: CategoryDto[]
  status: 200
}

export type categoriesOptionsResponse400 = {
  data: ProblemDto
  status: 400
}

export type categoriesOptionsResponse401 = {
  data: ProblemDto
  status: 401
}

export type categoriesOptionsResponse403 = {
  data: ProblemDto
  status: 403
}

export type categoriesOptionsResponse404 = {
  data: ProblemDto
  status: 404
}

export type categoriesOptionsResponse409 = {
  data: ProblemDto
  status: 409
}

export type categoriesOptionsResponse413 = {
  data: ProblemDto
  status: 413
}

export type categoriesOptionsResponse429 = {
  data: ProblemDto
  status: 429
}

export type categoriesOptionsResponse500 = {
  data: ProblemDto
  status: 500
}

export type categoriesOptionsResponseSuccess = (categoriesOptionsResponse200) & {
  headers: Headers;
};
export type categoriesOptionsResponseError = (categoriesOptionsResponse400 | categoriesOptionsResponse401 | categoriesOptionsResponse403 | categoriesOptionsResponse404 | categoriesOptionsResponse409 | categoriesOptionsResponse413 | categoriesOptionsResponse429 | categoriesOptionsResponse500) & {
  headers: Headers;
};

export type categoriesOptionsResponse = (categoriesOptionsResponseSuccess | categoriesOptionsResponseError)

export const getCategoriesOptionsUrl = () => {




  return `/api/v1/categories/options`
}

/**
 * @summary Собственный компактный справочник для выбора и фильтрации; включает архив для истории
 */
export const categoriesOptions = async ( options?: RequestInit): Promise<categoriesOptionsResponse> => {

  const res = await fetch(getCategoriesOptionsUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: categoriesOptionsResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as categoriesOptionsResponse
}



export type categoriesGetResponse200 = {
  data: CategoryDto
  status: 200
}

export type categoriesGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type categoriesGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type categoriesGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type categoriesGetResponse404 = {
  data: ProblemDto
  status: 404
}

export type categoriesGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type categoriesGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type categoriesGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type categoriesGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type categoriesGetResponseSuccess = (categoriesGetResponse200) & {
  headers: Headers;
};
export type categoriesGetResponseError = (categoriesGetResponse400 | categoriesGetResponse401 | categoriesGetResponse403 | categoriesGetResponse404 | categoriesGetResponse409 | categoriesGetResponse413 | categoriesGetResponse429 | categoriesGetResponse500) & {
  headers: Headers;
};

export type categoriesGetResponse = (categoriesGetResponseSuccess | categoriesGetResponseError)

export const getCategoriesGetUrl = (id: string,) => {




  return `/api/v1/categories/${id}`
}

/**
 * @summary Получить собственную запись
 */
export const categoriesGet = async (id: string, options?: RequestInit): Promise<categoriesGetResponse> => {

  const res = await fetch(getCategoriesGetUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: categoriesGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as categoriesGetResponse
}



export type categoriesUpdateResponse200 = {
  data: CategoryDto
  status: 200
}

export type categoriesUpdateResponse400 = {
  data: ProblemDto
  status: 400
}

export type categoriesUpdateResponse401 = {
  data: ProblemDto
  status: 401
}

export type categoriesUpdateResponse403 = {
  data: ProblemDto
  status: 403
}

export type categoriesUpdateResponse404 = {
  data: ProblemDto
  status: 404
}

export type categoriesUpdateResponse409 = {
  data: ProblemDto
  status: 409
}

export type categoriesUpdateResponse413 = {
  data: ProblemDto
  status: 413
}

export type categoriesUpdateResponse429 = {
  data: ProblemDto
  status: 429
}

export type categoriesUpdateResponse500 = {
  data: ProblemDto
  status: 500
}

export type categoriesUpdateResponseSuccess = (categoriesUpdateResponse200) & {
  headers: Headers;
};
export type categoriesUpdateResponseError = (categoriesUpdateResponse400 | categoriesUpdateResponse401 | categoriesUpdateResponse403 | categoriesUpdateResponse404 | categoriesUpdateResponse409 | categoriesUpdateResponse413 | categoriesUpdateResponse429 | categoriesUpdateResponse500) & {
  headers: Headers;
};

export type categoriesUpdateResponse = (categoriesUpdateResponseSuccess | categoriesUpdateResponseError)

export const getCategoriesUpdateUrl = (id: string,) => {




  return `/api/v1/categories/${id}`
}

/**
 * @summary Изменить собственную запись; требуется хотя бы одно разрешённое поле
 */
export const categoriesUpdate = async (id: string,
    categoryPatchDto: CategoryPatchDto, options?: RequestInit): Promise<categoriesUpdateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getCategoriesUpdateUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(categoryPatchDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: categoriesUpdateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as categoriesUpdateResponse
}



export type categoriesDeleteResponse200 = {
  data: CategoryRemovalDto
  status: 200
}

export type categoriesDeleteResponse400 = {
  data: ProblemDto
  status: 400
}

export type categoriesDeleteResponse401 = {
  data: ProblemDto
  status: 401
}

export type categoriesDeleteResponse403 = {
  data: ProblemDto
  status: 403
}

export type categoriesDeleteResponse404 = {
  data: ProblemDto
  status: 404
}

export type categoriesDeleteResponse409 = {
  data: ProblemDto
  status: 409
}

export type categoriesDeleteResponse413 = {
  data: ProblemDto
  status: 413
}

export type categoriesDeleteResponse429 = {
  data: ProblemDto
  status: 429
}

export type categoriesDeleteResponse500 = {
  data: ProblemDto
  status: 500
}

export type categoriesDeleteResponseSuccess = (categoriesDeleteResponse200) & {
  headers: Headers;
};
export type categoriesDeleteResponseError = (categoriesDeleteResponse400 | categoriesDeleteResponse401 | categoriesDeleteResponse403 | categoriesDeleteResponse404 | categoriesDeleteResponse409 | categoriesDeleteResponse413 | categoriesDeleteResponse429 | categoriesDeleteResponse500) & {
  headers: Headers;
};

export type categoriesDeleteResponse = (categoriesDeleteResponseSuccess | categoriesDeleteResponseError)

export const getCategoriesDeleteUrl = (id: string,) => {




  return `/api/v1/categories/${id}`
}

/**
 * @summary Удалить собственную запись с сохранением аудита
 */
export const categoriesDelete = async (id: string, options?: RequestInit): Promise<categoriesDeleteResponse> => {

  const res = await fetch(getCategoriesDeleteUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: categoriesDeleteResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as categoriesDeleteResponse
}



export type transactionsListResponse200 = {
  data: TransactionPageDto
  status: 200
}

export type transactionsListResponse400 = {
  data: ProblemDto
  status: 400
}

export type transactionsListResponse401 = {
  data: ProblemDto
  status: 401
}

export type transactionsListResponse403 = {
  data: ProblemDto
  status: 403
}

export type transactionsListResponse404 = {
  data: ProblemDto
  status: 404
}

export type transactionsListResponse409 = {
  data: ProblemDto
  status: 409
}

export type transactionsListResponse413 = {
  data: ProblemDto
  status: 413
}

export type transactionsListResponse429 = {
  data: ProblemDto
  status: 429
}

export type transactionsListResponse500 = {
  data: ProblemDto
  status: 500
}

export type transactionsListResponseSuccess = (transactionsListResponse200) & {
  headers: Headers;
};
export type transactionsListResponseError = (transactionsListResponse400 | transactionsListResponse401 | transactionsListResponse403 | transactionsListResponse404 | transactionsListResponse409 | transactionsListResponse413 | transactionsListResponse429 | transactionsListResponse500) & {
  headers: Headers;
};

export type transactionsListResponse = (transactionsListResponseSuccess | transactionsListResponseError)

export const getTransactionsListUrl = (params?: TransactionsListParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/transactions?${stringifiedParams}` : `/api/v1/transactions`
}

/**
 * @summary Список собственных записей с серверной пагинацией
 */
export const transactionsList = async (params?: TransactionsListParams, options?: RequestInit): Promise<transactionsListResponse> => {

  const res = await fetch(getTransactionsListUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: transactionsListResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as transactionsListResponse
}



export type transactionsCreateResponse201 = {
  data: TransactionDto
  status: 201
}

export type transactionsCreateResponse400 = {
  data: ProblemDto
  status: 400
}

export type transactionsCreateResponse401 = {
  data: ProblemDto
  status: 401
}

export type transactionsCreateResponse403 = {
  data: ProblemDto
  status: 403
}

export type transactionsCreateResponse404 = {
  data: ProblemDto
  status: 404
}

export type transactionsCreateResponse409 = {
  data: ProblemDto
  status: 409
}

export type transactionsCreateResponse413 = {
  data: ProblemDto
  status: 413
}

export type transactionsCreateResponse429 = {
  data: ProblemDto
  status: 429
}

export type transactionsCreateResponse500 = {
  data: ProblemDto
  status: 500
}

export type transactionsCreateResponseSuccess = (transactionsCreateResponse201) & {
  headers: Headers;
};
export type transactionsCreateResponseError = (transactionsCreateResponse400 | transactionsCreateResponse401 | transactionsCreateResponse403 | transactionsCreateResponse404 | transactionsCreateResponse409 | transactionsCreateResponse413 | transactionsCreateResponse429 | transactionsCreateResponse500) & {
  headers: Headers;
};

export type transactionsCreateResponse = (transactionsCreateResponseSuccess | transactionsCreateResponseError)

export const getTransactionsCreateUrl = () => {




  return `/api/v1/transactions`
}

/**
 * @summary Создать запись с атомарным аудитом
 */
export const transactionsCreate = async (transactionInputDto: TransactionInputDto, options?: RequestInit): Promise<transactionsCreateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getTransactionsCreateUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(transactionInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: transactionsCreateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as transactionsCreateResponse
}



export type transactionsExportResponse200 = {
  data: void
  status: 200
}

export type transactionsExportResponse400 = {
  data: ProblemDto
  status: 400
}

export type transactionsExportResponse401 = {
  data: ProblemDto
  status: 401
}

export type transactionsExportResponse403 = {
  data: ProblemDto
  status: 403
}

export type transactionsExportResponse404 = {
  data: ProblemDto
  status: 404
}

export type transactionsExportResponse409 = {
  data: ProblemDto
  status: 409
}

export type transactionsExportResponse413 = {
  data: ProblemDto
  status: 413
}

export type transactionsExportResponse429 = {
  data: ProblemDto
  status: 429
}

export type transactionsExportResponse500 = {
  data: ProblemDto
  status: 500
}

export type transactionsExportResponseSuccess = (transactionsExportResponse200) & {
  headers: Headers;
};
export type transactionsExportResponseError = (transactionsExportResponse400 | transactionsExportResponse401 | transactionsExportResponse403 | transactionsExportResponse404 | transactionsExportResponse409 | transactionsExportResponse413 | transactionsExportResponse429 | transactionsExportResponse500) & {
  headers: Headers;
};

export type transactionsExportResponse = (transactionsExportResponseSuccess | transactionsExportResponseError)

export const getTransactionsExportUrl = (params?: TransactionsExportParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/transactions/export?${stringifiedParams}` : `/api/v1/transactions/export`
}

/**
 * @summary Экспортировать в CSV все записи по текущим фильтрам без ограничения страницы
 */
export const transactionsExport = async (params?: TransactionsExportParams, options?: RequestInit): Promise<transactionsExportResponse> => {

  const res = await fetch(getTransactionsExportUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: transactionsExportResponse['data'] = body ? JSON.parse(body) : undefined
  return { data, status: res.status, headers: res.headers } as transactionsExportResponse
}



export type transactionsGetResponse200 = {
  data: TransactionDto
  status: 200
}

export type transactionsGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type transactionsGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type transactionsGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type transactionsGetResponse404 = {
  data: ProblemDto
  status: 404
}

export type transactionsGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type transactionsGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type transactionsGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type transactionsGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type transactionsGetResponseSuccess = (transactionsGetResponse200) & {
  headers: Headers;
};
export type transactionsGetResponseError = (transactionsGetResponse400 | transactionsGetResponse401 | transactionsGetResponse403 | transactionsGetResponse404 | transactionsGetResponse409 | transactionsGetResponse413 | transactionsGetResponse429 | transactionsGetResponse500) & {
  headers: Headers;
};

export type transactionsGetResponse = (transactionsGetResponseSuccess | transactionsGetResponseError)

export const getTransactionsGetUrl = (id: string,) => {




  return `/api/v1/transactions/${id}`
}

/**
 * @summary Получить собственную запись
 */
export const transactionsGet = async (id: string, options?: RequestInit): Promise<transactionsGetResponse> => {

  const res = await fetch(getTransactionsGetUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: transactionsGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as transactionsGetResponse
}



export type transactionsUpdateResponse200 = {
  data: TransactionDto
  status: 200
}

export type transactionsUpdateResponse400 = {
  data: ProblemDto
  status: 400
}

export type transactionsUpdateResponse401 = {
  data: ProblemDto
  status: 401
}

export type transactionsUpdateResponse403 = {
  data: ProblemDto
  status: 403
}

export type transactionsUpdateResponse404 = {
  data: ProblemDto
  status: 404
}

export type transactionsUpdateResponse409 = {
  data: ProblemDto
  status: 409
}

export type transactionsUpdateResponse413 = {
  data: ProblemDto
  status: 413
}

export type transactionsUpdateResponse429 = {
  data: ProblemDto
  status: 429
}

export type transactionsUpdateResponse500 = {
  data: ProblemDto
  status: 500
}

export type transactionsUpdateResponseSuccess = (transactionsUpdateResponse200) & {
  headers: Headers;
};
export type transactionsUpdateResponseError = (transactionsUpdateResponse400 | transactionsUpdateResponse401 | transactionsUpdateResponse403 | transactionsUpdateResponse404 | transactionsUpdateResponse409 | transactionsUpdateResponse413 | transactionsUpdateResponse429 | transactionsUpdateResponse500) & {
  headers: Headers;
};

export type transactionsUpdateResponse = (transactionsUpdateResponseSuccess | transactionsUpdateResponseError)

export const getTransactionsUpdateUrl = (id: string,) => {




  return `/api/v1/transactions/${id}`
}

/**
 * @summary Изменить собственную запись; требуется хотя бы одно разрешённое поле
 */
export const transactionsUpdate = async (id: string,
    transactionPatchDto: TransactionPatchDto, options?: RequestInit): Promise<transactionsUpdateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getTransactionsUpdateUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(transactionPatchDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: transactionsUpdateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as transactionsUpdateResponse
}



export type transactionsDeleteResponse204 = {
  data: void
  status: 204
}

export type transactionsDeleteResponse400 = {
  data: ProblemDto
  status: 400
}

export type transactionsDeleteResponse401 = {
  data: ProblemDto
  status: 401
}

export type transactionsDeleteResponse403 = {
  data: ProblemDto
  status: 403
}

export type transactionsDeleteResponse404 = {
  data: ProblemDto
  status: 404
}

export type transactionsDeleteResponse409 = {
  data: ProblemDto
  status: 409
}

export type transactionsDeleteResponse413 = {
  data: ProblemDto
  status: 413
}

export type transactionsDeleteResponse429 = {
  data: ProblemDto
  status: 429
}

export type transactionsDeleteResponse500 = {
  data: ProblemDto
  status: 500
}

export type transactionsDeleteResponseSuccess = (transactionsDeleteResponse204) & {
  headers: Headers;
};
export type transactionsDeleteResponseError = (transactionsDeleteResponse400 | transactionsDeleteResponse401 | transactionsDeleteResponse403 | transactionsDeleteResponse404 | transactionsDeleteResponse409 | transactionsDeleteResponse413 | transactionsDeleteResponse429 | transactionsDeleteResponse500) & {
  headers: Headers;
};

export type transactionsDeleteResponse = (transactionsDeleteResponseSuccess | transactionsDeleteResponseError)

export const getTransactionsDeleteUrl = (id: string,) => {




  return `/api/v1/transactions/${id}`
}

/**
 * @summary Удалить собственную запись с сохранением аудита
 */
export const transactionsDelete = async (id: string, options?: RequestInit): Promise<transactionsDeleteResponse> => {

  const res = await fetch(getTransactionsDeleteUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: transactionsDeleteResponse['data'] = body ? JSON.parse(body) : undefined
  return { data, status: res.status, headers: res.headers } as transactionsDeleteResponse
}



export type budgetsListResponse200 = {
  data: BudgetPageDto
  status: 200
}

export type budgetsListResponse400 = {
  data: ProblemDto
  status: 400
}

export type budgetsListResponse401 = {
  data: ProblemDto
  status: 401
}

export type budgetsListResponse403 = {
  data: ProblemDto
  status: 403
}

export type budgetsListResponse404 = {
  data: ProblemDto
  status: 404
}

export type budgetsListResponse409 = {
  data: ProblemDto
  status: 409
}

export type budgetsListResponse413 = {
  data: ProblemDto
  status: 413
}

export type budgetsListResponse429 = {
  data: ProblemDto
  status: 429
}

export type budgetsListResponse500 = {
  data: ProblemDto
  status: 500
}

export type budgetsListResponseSuccess = (budgetsListResponse200) & {
  headers: Headers;
};
export type budgetsListResponseError = (budgetsListResponse400 | budgetsListResponse401 | budgetsListResponse403 | budgetsListResponse404 | budgetsListResponse409 | budgetsListResponse413 | budgetsListResponse429 | budgetsListResponse500) & {
  headers: Headers;
};

export type budgetsListResponse = (budgetsListResponseSuccess | budgetsListResponseError)

export const getBudgetsListUrl = (params: BudgetsListParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/budgets?${stringifiedParams}` : `/api/v1/budgets`
}

/**
 * @summary Список собственных записей с серверной пагинацией
 */
export const budgetsList = async (params: BudgetsListParams, options?: RequestInit): Promise<budgetsListResponse> => {

  const res = await fetch(getBudgetsListUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: budgetsListResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as budgetsListResponse
}



export type budgetsCreateResponse201 = {
  data: BudgetDto
  status: 201
}

export type budgetsCreateResponse400 = {
  data: ProblemDto
  status: 400
}

export type budgetsCreateResponse401 = {
  data: ProblemDto
  status: 401
}

export type budgetsCreateResponse403 = {
  data: ProblemDto
  status: 403
}

export type budgetsCreateResponse404 = {
  data: ProblemDto
  status: 404
}

export type budgetsCreateResponse409 = {
  data: ProblemDto
  status: 409
}

export type budgetsCreateResponse413 = {
  data: ProblemDto
  status: 413
}

export type budgetsCreateResponse429 = {
  data: ProblemDto
  status: 429
}

export type budgetsCreateResponse500 = {
  data: ProblemDto
  status: 500
}

export type budgetsCreateResponseSuccess = (budgetsCreateResponse201) & {
  headers: Headers;
};
export type budgetsCreateResponseError = (budgetsCreateResponse400 | budgetsCreateResponse401 | budgetsCreateResponse403 | budgetsCreateResponse404 | budgetsCreateResponse409 | budgetsCreateResponse413 | budgetsCreateResponse429 | budgetsCreateResponse500) & {
  headers: Headers;
};

export type budgetsCreateResponse = (budgetsCreateResponseSuccess | budgetsCreateResponseError)

export const getBudgetsCreateUrl = () => {




  return `/api/v1/budgets`
}

/**
 * @summary Создать запись с атомарным аудитом
 */
export const budgetsCreate = async (budgetInputDto: BudgetInputDto, options?: RequestInit): Promise<budgetsCreateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getBudgetsCreateUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(budgetInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: budgetsCreateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as budgetsCreateResponse
}



export type budgetsGetResponse200 = {
  data: BudgetDto
  status: 200
}

export type budgetsGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type budgetsGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type budgetsGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type budgetsGetResponse404 = {
  data: ProblemDto
  status: 404
}

export type budgetsGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type budgetsGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type budgetsGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type budgetsGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type budgetsGetResponseSuccess = (budgetsGetResponse200) & {
  headers: Headers;
};
export type budgetsGetResponseError = (budgetsGetResponse400 | budgetsGetResponse401 | budgetsGetResponse403 | budgetsGetResponse404 | budgetsGetResponse409 | budgetsGetResponse413 | budgetsGetResponse429 | budgetsGetResponse500) & {
  headers: Headers;
};

export type budgetsGetResponse = (budgetsGetResponseSuccess | budgetsGetResponseError)

export const getBudgetsGetUrl = (id: string,) => {




  return `/api/v1/budgets/${id}`
}

/**
 * @summary Получить собственную запись
 */
export const budgetsGet = async (id: string, options?: RequestInit): Promise<budgetsGetResponse> => {

  const res = await fetch(getBudgetsGetUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: budgetsGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as budgetsGetResponse
}



export type budgetsUpdateResponse200 = {
  data: BudgetDto
  status: 200
}

export type budgetsUpdateResponse400 = {
  data: ProblemDto
  status: 400
}

export type budgetsUpdateResponse401 = {
  data: ProblemDto
  status: 401
}

export type budgetsUpdateResponse403 = {
  data: ProblemDto
  status: 403
}

export type budgetsUpdateResponse404 = {
  data: ProblemDto
  status: 404
}

export type budgetsUpdateResponse409 = {
  data: ProblemDto
  status: 409
}

export type budgetsUpdateResponse413 = {
  data: ProblemDto
  status: 413
}

export type budgetsUpdateResponse429 = {
  data: ProblemDto
  status: 429
}

export type budgetsUpdateResponse500 = {
  data: ProblemDto
  status: 500
}

export type budgetsUpdateResponseSuccess = (budgetsUpdateResponse200) & {
  headers: Headers;
};
export type budgetsUpdateResponseError = (budgetsUpdateResponse400 | budgetsUpdateResponse401 | budgetsUpdateResponse403 | budgetsUpdateResponse404 | budgetsUpdateResponse409 | budgetsUpdateResponse413 | budgetsUpdateResponse429 | budgetsUpdateResponse500) & {
  headers: Headers;
};

export type budgetsUpdateResponse = (budgetsUpdateResponseSuccess | budgetsUpdateResponseError)

export const getBudgetsUpdateUrl = (id: string,) => {




  return `/api/v1/budgets/${id}`
}

/**
 * @summary Изменить собственную запись; требуется хотя бы одно разрешённое поле
 */
export const budgetsUpdate = async (id: string,
    budgetPatchDto: BudgetPatchDto, options?: RequestInit): Promise<budgetsUpdateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getBudgetsUpdateUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(budgetPatchDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: budgetsUpdateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as budgetsUpdateResponse
}



export type budgetsDeleteResponse204 = {
  data: void
  status: 204
}

export type budgetsDeleteResponse400 = {
  data: ProblemDto
  status: 400
}

export type budgetsDeleteResponse401 = {
  data: ProblemDto
  status: 401
}

export type budgetsDeleteResponse403 = {
  data: ProblemDto
  status: 403
}

export type budgetsDeleteResponse404 = {
  data: ProblemDto
  status: 404
}

export type budgetsDeleteResponse409 = {
  data: ProblemDto
  status: 409
}

export type budgetsDeleteResponse413 = {
  data: ProblemDto
  status: 413
}

export type budgetsDeleteResponse429 = {
  data: ProblemDto
  status: 429
}

export type budgetsDeleteResponse500 = {
  data: ProblemDto
  status: 500
}

export type budgetsDeleteResponseSuccess = (budgetsDeleteResponse204) & {
  headers: Headers;
};
export type budgetsDeleteResponseError = (budgetsDeleteResponse400 | budgetsDeleteResponse401 | budgetsDeleteResponse403 | budgetsDeleteResponse404 | budgetsDeleteResponse409 | budgetsDeleteResponse413 | budgetsDeleteResponse429 | budgetsDeleteResponse500) & {
  headers: Headers;
};

export type budgetsDeleteResponse = (budgetsDeleteResponseSuccess | budgetsDeleteResponseError)

export const getBudgetsDeleteUrl = (id: string,) => {




  return `/api/v1/budgets/${id}`
}

/**
 * @summary Удалить собственную запись с сохранением аудита
 */
export const budgetsDelete = async (id: string, options?: RequestInit): Promise<budgetsDeleteResponse> => {

  const res = await fetch(getBudgetsDeleteUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: budgetsDeleteResponse['data'] = body ? JSON.parse(body) : undefined
  return { data, status: res.status, headers: res.headers } as budgetsDeleteResponse
}



export type recurringListResponse200 = {
  data: RecurringPageDto
  status: 200
}

export type recurringListResponse400 = {
  data: ProblemDto
  status: 400
}

export type recurringListResponse401 = {
  data: ProblemDto
  status: 401
}

export type recurringListResponse403 = {
  data: ProblemDto
  status: 403
}

export type recurringListResponse404 = {
  data: ProblemDto
  status: 404
}

export type recurringListResponse409 = {
  data: ProblemDto
  status: 409
}

export type recurringListResponse413 = {
  data: ProblemDto
  status: 413
}

export type recurringListResponse429 = {
  data: ProblemDto
  status: 429
}

export type recurringListResponse500 = {
  data: ProblemDto
  status: 500
}

export type recurringListResponseSuccess = (recurringListResponse200) & {
  headers: Headers;
};
export type recurringListResponseError = (recurringListResponse400 | recurringListResponse401 | recurringListResponse403 | recurringListResponse404 | recurringListResponse409 | recurringListResponse413 | recurringListResponse429 | recurringListResponse500) & {
  headers: Headers;
};

export type recurringListResponse = (recurringListResponseSuccess | recurringListResponseError)

export const getRecurringListUrl = (params?: RecurringListParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/recurring-transactions?${stringifiedParams}` : `/api/v1/recurring-transactions`
}

/**
 * @summary Список собственных правил с серверной пагинацией
 */
export const recurringList = async (params?: RecurringListParams, options?: RequestInit): Promise<recurringListResponse> => {

  const res = await fetch(getRecurringListUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: recurringListResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as recurringListResponse
}



export type recurringCreateResponse201 = {
  data: RecurringDto
  status: 201
}

export type recurringCreateResponse400 = {
  data: ProblemDto
  status: 400
}

export type recurringCreateResponse401 = {
  data: ProblemDto
  status: 401
}

export type recurringCreateResponse403 = {
  data: ProblemDto
  status: 403
}

export type recurringCreateResponse404 = {
  data: ProblemDto
  status: 404
}

export type recurringCreateResponse409 = {
  data: ProblemDto
  status: 409
}

export type recurringCreateResponse413 = {
  data: ProblemDto
  status: 413
}

export type recurringCreateResponse429 = {
  data: ProblemDto
  status: 429
}

export type recurringCreateResponse500 = {
  data: ProblemDto
  status: 500
}

export type recurringCreateResponseSuccess = (recurringCreateResponse201) & {
  headers: Headers;
};
export type recurringCreateResponseError = (recurringCreateResponse400 | recurringCreateResponse401 | recurringCreateResponse403 | recurringCreateResponse404 | recurringCreateResponse409 | recurringCreateResponse413 | recurringCreateResponse429 | recurringCreateResponse500) & {
  headers: Headers;
};

export type recurringCreateResponse = (recurringCreateResponseSuccess | recurringCreateResponseError)

export const getRecurringCreateUrl = () => {




  return `/api/v1/recurring-transactions`
}

/**
 * @summary Создать правило с атомарным аудитом; nextOccurrenceDate = startDate
 */
export const recurringCreate = async (recurringInputDto: RecurringInputDto, options?: RequestInit): Promise<recurringCreateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getRecurringCreateUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(recurringInputDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: recurringCreateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as recurringCreateResponse
}



export type recurringGetResponse200 = {
  data: RecurringDto
  status: 200
}

export type recurringGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type recurringGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type recurringGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type recurringGetResponse404 = {
  data: ProblemDto
  status: 404
}

export type recurringGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type recurringGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type recurringGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type recurringGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type recurringGetResponseSuccess = (recurringGetResponse200) & {
  headers: Headers;
};
export type recurringGetResponseError = (recurringGetResponse400 | recurringGetResponse401 | recurringGetResponse403 | recurringGetResponse404 | recurringGetResponse409 | recurringGetResponse413 | recurringGetResponse429 | recurringGetResponse500) & {
  headers: Headers;
};

export type recurringGetResponse = (recurringGetResponseSuccess | recurringGetResponseError)

export const getRecurringGetUrl = (id: string,) => {




  return `/api/v1/recurring-transactions/${id}`
}

/**
 * @summary Получить собственное правило
 */
export const recurringGet = async (id: string, options?: RequestInit): Promise<recurringGetResponse> => {

  const res = await fetch(getRecurringGetUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: recurringGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as recurringGetResponse
}



export type recurringUpdateResponse200 = {
  data: RecurringDto
  status: 200
}

export type recurringUpdateResponse400 = {
  data: ProblemDto
  status: 400
}

export type recurringUpdateResponse401 = {
  data: ProblemDto
  status: 401
}

export type recurringUpdateResponse403 = {
  data: ProblemDto
  status: 403
}

export type recurringUpdateResponse404 = {
  data: ProblemDto
  status: 404
}

export type recurringUpdateResponse409 = {
  data: ProblemDto
  status: 409
}

export type recurringUpdateResponse413 = {
  data: ProblemDto
  status: 413
}

export type recurringUpdateResponse429 = {
  data: ProblemDto
  status: 429
}

export type recurringUpdateResponse500 = {
  data: ProblemDto
  status: 500
}

export type recurringUpdateResponseSuccess = (recurringUpdateResponse200) & {
  headers: Headers;
};
export type recurringUpdateResponseError = (recurringUpdateResponse400 | recurringUpdateResponse401 | recurringUpdateResponse403 | recurringUpdateResponse404 | recurringUpdateResponse409 | recurringUpdateResponse413 | recurringUpdateResponse429 | recurringUpdateResponse500) & {
  headers: Headers;
};

export type recurringUpdateResponse = (recurringUpdateResponseSuccess | recurringUpdateResponseError)

export const getRecurringUpdateUrl = (id: string,) => {




  return `/api/v1/recurring-transactions/${id}`
}

/**
 * @summary Изменить активное правило; перед изменением расписания сервис завершает catch-up по прежним параметрам
 */
export const recurringUpdate = async (id: string,
    recurringPatchDto: RecurringPatchDto, options?: RequestInit): Promise<recurringUpdateResponse> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getRecurringUpdateUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(recurringPatchDto)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: recurringUpdateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as recurringUpdateResponse
}



export type recurringDeleteResponse200 = {
  data: RecurringRemovalDto
  status: 200
}

export type recurringDeleteResponse400 = {
  data: ProblemDto
  status: 400
}

export type recurringDeleteResponse401 = {
  data: ProblemDto
  status: 401
}

export type recurringDeleteResponse403 = {
  data: ProblemDto
  status: 403
}

export type recurringDeleteResponse404 = {
  data: ProblemDto
  status: 404
}

export type recurringDeleteResponse409 = {
  data: ProblemDto
  status: 409
}

export type recurringDeleteResponse413 = {
  data: ProblemDto
  status: 413
}

export type recurringDeleteResponse429 = {
  data: ProblemDto
  status: 429
}

export type recurringDeleteResponse500 = {
  data: ProblemDto
  status: 500
}

export type recurringDeleteResponseSuccess = (recurringDeleteResponse200) & {
  headers: Headers;
};
export type recurringDeleteResponseError = (recurringDeleteResponse400 | recurringDeleteResponse401 | recurringDeleteResponse403 | recurringDeleteResponse404 | recurringDeleteResponse409 | recurringDeleteResponse413 | recurringDeleteResponse429 | recurringDeleteResponse500) & {
  headers: Headers;
};

export type recurringDeleteResponse = (recurringDeleteResponseSuccess | recurringDeleteResponseError)

export const getRecurringDeleteUrl = (id: string,) => {




  return `/api/v1/recurring-transactions/${id}`
}

/**
 * @summary Удалить правило, ещё не создававшее операций, либо архивировать с сохранением истории
 */
export const recurringDelete = async (id: string, options?: RequestInit): Promise<recurringDeleteResponse> => {

  const res = await fetch(getRecurringDeleteUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: recurringDeleteResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as recurringDeleteResponse
}



export type dashboardGetResponse200 = {
  data: DashboardDto
  status: 200
}

export type dashboardGetResponse400 = {
  data: ProblemDto
  status: 400
}

export type dashboardGetResponse401 = {
  data: ProblemDto
  status: 401
}

export type dashboardGetResponse403 = {
  data: ProblemDto
  status: 403
}

export type dashboardGetResponse404 = {
  data: ProblemDto
  status: 404
}

export type dashboardGetResponse409 = {
  data: ProblemDto
  status: 409
}

export type dashboardGetResponse413 = {
  data: ProblemDto
  status: 413
}

export type dashboardGetResponse429 = {
  data: ProblemDto
  status: 429
}

export type dashboardGetResponse500 = {
  data: ProblemDto
  status: 500
}

export type dashboardGetResponseSuccess = (dashboardGetResponse200) & {
  headers: Headers;
};
export type dashboardGetResponseError = (dashboardGetResponse400 | dashboardGetResponse401 | dashboardGetResponse403 | dashboardGetResponse404 | dashboardGetResponse409 | dashboardGetResponse413 | dashboardGetResponse429 | dashboardGetResponse500) & {
  headers: Headers;
};

export type dashboardGetResponse = (dashboardGetResponseSuccess | dashboardGetResponseError)

export const getDashboardGetUrl = (params: DashboardGetParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/v1/dashboard?${stringifiedParams}` : `/api/v1/dashboard`
}

/**
 * Обязательны year и month без ведущих нулей. Неизвестные и повторные query-поля запрещены. Полное шестимесячное окно: выбранный месяц от 0001-06 до 9999-12. DATE сравнивается без сдвига timezone. Сравнения insights относятся ко всему предыдущему календарному месяцу, а не к одинаковому числу дней.
 * @summary Согласованный обзор собственных финансов за месяц
 */
export const dashboardGet = async (params: DashboardGetParams, options?: RequestInit): Promise<dashboardGetResponse> => {

  const res = await fetch(getDashboardGetUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: dashboardGetResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as dashboardGetResponse
}



export type importsPreviewResponse200 = {
  data: ImportPreviewDto
  status: 200
}

export type importsPreviewResponse400 = {
  data: ProblemDto
  status: 400
}

export type importsPreviewResponse401 = {
  data: ProblemDto
  status: 401
}

export type importsPreviewResponse403 = {
  data: ProblemDto
  status: 403
}

export type importsPreviewResponse404 = {
  data: ProblemDto
  status: 404
}

export type importsPreviewResponse409 = {
  data: ProblemDto
  status: 409
}

export type importsPreviewResponse413 = {
  data: ProblemDto
  status: 413
}

export type importsPreviewResponse429 = {
  data: ProblemDto
  status: 429
}

export type importsPreviewResponse500 = {
  data: ProblemDto
  status: 500
}

export type importsPreviewResponseSuccess = (importsPreviewResponse200) & {
  headers: Headers;
};
export type importsPreviewResponseError = (importsPreviewResponse400 | importsPreviewResponse401 | importsPreviewResponse403 | importsPreviewResponse404 | importsPreviewResponse409 | importsPreviewResponse413 | importsPreviewResponse429 | importsPreviewResponse500) & {
  headers: Headers;
};

export type importsPreviewResponse = (importsPreviewResponseSuccess | importsPreviewResponseError)

export const getImportsPreviewUrl = () => {




  return `/api/v1/imports/preview`
}

/**
 * @summary Разобрать файл и вернуть столбцы/пример строк без валидации
 */
export const importsPreview = async (importsPreviewBody: ImportsPreviewBody, options?: RequestInit): Promise<importsPreviewResponse> => {
    const formData = new FormData();
formData.append(`file`, importsPreviewBody.file);

  const res = await fetch(getImportsPreviewUrl(),
  {
    ...options,
    method: 'POST'
    ,
    body: formData
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: importsPreviewResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as importsPreviewResponse
}



export type importsValidateResponse200 = {
  data: ImportAnalysisDto
  status: 200
}

export type importsValidateResponse400 = {
  data: ProblemDto
  status: 400
}

export type importsValidateResponse401 = {
  data: ProblemDto
  status: 401
}

export type importsValidateResponse403 = {
  data: ProblemDto
  status: 403
}

export type importsValidateResponse404 = {
  data: ProblemDto
  status: 404
}

export type importsValidateResponse409 = {
  data: ProblemDto
  status: 409
}

export type importsValidateResponse413 = {
  data: ProblemDto
  status: 413
}

export type importsValidateResponse429 = {
  data: ProblemDto
  status: 429
}

export type importsValidateResponse500 = {
  data: ProblemDto
  status: 500
}

export type importsValidateResponseSuccess = (importsValidateResponse200) & {
  headers: Headers;
};
export type importsValidateResponseError = (importsValidateResponse400 | importsValidateResponse401 | importsValidateResponse403 | importsValidateResponse404 | importsValidateResponse409 | importsValidateResponse413 | importsValidateResponse429 | importsValidateResponse500) & {
  headers: Headers;
};

export type importsValidateResponse = (importsValidateResponseSuccess | importsValidateResponseError)

export const getImportsValidateUrl = () => {




  return `/api/v1/imports/validate`
}

/**
 * @summary Проверить файл с маппингом без записи в БД: построчная validation и duplicate analysis
 */
export const importsValidate = async (importsValidateBody: ImportsValidateBody, options?: RequestInit): Promise<importsValidateResponse> => {
    const formData = new FormData();
formData.append(`file`, importsValidateBody.file);
formData.append(`mapping`, importsValidateBody.mapping);
if(importsValidateBody.categoryMap !== undefined) {
 formData.append(`categoryMap`, importsValidateBody.categoryMap);
 }
if(importsValidateBody.rates !== undefined) {
 formData.append(`rates`, importsValidateBody.rates);
 }
if(importsValidateBody.includeDuplicates !== undefined) {
 formData.append(`includeDuplicates`, importsValidateBody.includeDuplicates);
 }

  const res = await fetch(getImportsValidateUrl(),
  {
    ...options,
    method: 'POST'
    ,
    body: formData
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: importsValidateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as importsValidateResponse
}



export type importsCreateResponse201 = {
  data: ImportResultDto
  status: 201
}

export type importsCreateResponse400 = {
  data: ProblemDto
  status: 400
}

export type importsCreateResponse401 = {
  data: ProblemDto
  status: 401
}

export type importsCreateResponse403 = {
  data: ProblemDto
  status: 403
}

export type importsCreateResponse404 = {
  data: ProblemDto
  status: 404
}

export type importsCreateResponse409 = {
  data: ProblemDto
  status: 409
}

export type importsCreateResponse413 = {
  data: ProblemDto
  status: 413
}

export type importsCreateResponse429 = {
  data: ProblemDto
  status: 429
}

export type importsCreateResponse500 = {
  data: ProblemDto
  status: 500
}

export type importsCreateResponseSuccess = (importsCreateResponse201) & {
  headers: Headers;
};
export type importsCreateResponseError = (importsCreateResponse400 | importsCreateResponse401 | importsCreateResponse403 | importsCreateResponse404 | importsCreateResponse409 | importsCreateResponse413 | importsCreateResponse429 | importsCreateResponse500) & {
  headers: Headers;
};

export type importsCreateResponse = (importsCreateResponseSuccess | importsCreateResponseError)

export const getImportsCreateUrl = () => {




  return `/api/v1/imports`
}

/**
 * @summary Повторить validation по актуальной БД и атомарно импортировать валидные строки с аудитом
 */
export const importsCreate = async (importsCreateBody: ImportsCreateBody, options?: RequestInit): Promise<importsCreateResponse> => {
    const formData = new FormData();
formData.append(`file`, importsCreateBody.file);
formData.append(`mapping`, importsCreateBody.mapping);
if(importsCreateBody.categoryMap !== undefined) {
 formData.append(`categoryMap`, importsCreateBody.categoryMap);
 }
if(importsCreateBody.rates !== undefined) {
 formData.append(`rates`, importsCreateBody.rates);
 }
if(importsCreateBody.includeDuplicates !== undefined) {
 formData.append(`includeDuplicates`, importsCreateBody.includeDuplicates);
 }

  const res = await fetch(getImportsCreateUrl(),
  {
    ...options,
    method: 'POST'
    ,
    body: formData
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const data: importsCreateResponse['data'] = body ? JSON.parse(body) : {}
  return { data, status: res.status, headers: res.headers } as importsCreateResponse
}
