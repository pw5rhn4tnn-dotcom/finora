# Frontend Finora · Stage 3–5

Работающая адаптивная оболочка, общие UI primitives и светлая тема.
Stage 4 реализует авторизацию и настройки профиля. Stage 5 добавляет реальные категории и операции, Stage 6 — месячные бюджеты. Остальные финансовые разделы ещё не реализованы. Разделы явно обозначены
как предварительный просмотр. Главный экран не использует seed и не показывает
вымышленные финансовые показатели.

## Структура и границы

- `src/app`: Query provider, shell, branding и единая конфигурация navigation.
- `src/App.tsx`: React Router routes и общий `AppShell` с `Outlet`.
- `src/pages`: композиция обзорного экрана, placeholders, 404 и dev-витрина.
- `src/shared/ui`: Button/ButtonLink/IconButton, Card/Badge/Divider,
  PageContainer/PageHeader/Section, Input/Select/FilterBar, Sheet,
  EmptyState/ErrorState/LoadingState/Skeleton.
- `src/shared/styles`: tokens, базовый слой и общие component styles.
- `e2e`: настоящие браузерные проверки shell, responsive и accessibility.

Shared не импортирует app/pages/domain. UI остаётся внутри web: второго потребителя
для нового workspace UI package пока нет. `features/auth` и `features/profile` содержат формы и сессию.
Пустые каталоги и domain-заглушки не создаются.
QueryClient создаётся в AppProviders отдельно для каждого mount, без глобального
singleton. AuthProvider получает сессию через generated `/auth/me`; пользовательские данные
удаляются при logout/смене владельца, запросы отменяются до замены сессии.

## Tokens и тема

Единственный источник — `src/shared/styles/tokens.css`. Tailwind 4 `@theme static`
экспортирует CSS custom properties и semantic utilities, CSS компонентов использует
эти же значения. `data-theme="light"` задан на html до первого paint;
`color-scheme: light` согласует native controls. Нет localStorage, переключателя,
внешнего theme-provider и автоматического перехода в незавершённый dark mode.

| Система   | Решение                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Палитра   | background/surface/surface-secondary, foreground/text-secondary/text-muted, border/input-border, primary/hover/active/soft/on-primary, focus, disabled/text-disabled |
| Семантика | success/income — зелёный, danger/expense — красный, warning — янтарный; каждый статус дополнен текстом                                                               |
| Шрифт     | системный sans-serif с кириллицей; без внешней загрузки и font layout shift                                                                                          |
| Иерархия  | display 36/43.2, title 28/35, section 20/28, card/body 16/24–25.6, secondary/label 14/21–19.6, caption 12/18 px при стандартном root 16px                            |
| Деньги    | financial 32/40, `numeric`: tabular-nums + lining-nums + перенос длинного значения; никакой финансовой арифметики                                                    |
| Отступы   | базовый `--spacing: 0.25rem` (4px); 4/8/12/16/20/24/32/40/48 px и кратные значения                                                                                   |
| Radius    | 6/8/12 px                                                                                                                                                            |
| Elevation | только sm для surfaces и md для Sheet                                                                                                                                |
| Borders   | 1px; focus 2px с offset 3px; input-border отличается от декоративного divider и имеет достаточный contrast                                                           |
| Motion    | tokens 150/200/250ms; загрузочный pulse 1500ms; reduced-motion отключает все transition/animation                                                                    |

Финансовый пример в dev-витрине имеет русское представление `12 450,00 ₽` и явно
подписан как пример. Stage 5 форматирует реальные decimal strings без Number: целая часть через BigInt, дробная — строкой. Все расчёты выполняет API.
Иконки Lucide импортируются по именам, tree shaking исключает неиспользованные.
Только статический favicon/meta theme-color повторяет brand hex за пределами CSS.

## Responsive

Breakpoints централизованы в `@theme`: tablet 48rem (768px), desktop 64rem
(1024px), wide 90rem (1440px). Используйте semantic variants `tablet:`, `desktop:`
или `@media (width >= theme(--breakpoint-tablet))`, без новых случайных порогов.

До 768px — верхний бренд и bottom navigation «Обзор / Транзакции / Бюджеты / Ещё».
Bottom navigation использует `position: sticky; bottom: 0` и участвует в потоке:
высота текста и safe-area не требуют JS-измерений или фиксированного padding
контента. Панель «Ещё» показывает четыре вторичных раздела.
От 768px — sidebar 224px, от 1024px — 248px; длинные названия переносятся.
Content ограничен 1200px, отступы растут с 16px до 32/40px. Sheet на mobile
открывается снизу, на tablet/desktop — справа. Высота ограничена `dvh`, body
панели прокручивается независимо; учитывается `safe-area-inset-bottom`.

Основные маршруты соответствуют Discovery. `/transactions/import` — только
placeholder deep link; транзакции остаются активным родительским пунктом.
Неизвестный адрес получает честный экран 404 со ссылкой к обзору. Публичные login/register и защищённые маршруты используют auth context;
финансовых API-запросов к будущим разделам нет.

## Использование primitives

```tsx
<Card>
  <EmptyState
    title="Пока ничего нет"
    description="Содержимое появится после первого действия."
    action={<Button onClick={onAction}>Продолжить</Button>}
  />
</Card>
<Input label="Название" hint="Подсказка" error={error} />
<ButtonLink variant="secondary"><Link to="/">К обзору</Link></ButtonLink>
<Sheet>
  <SheetTrigger asChild><Button>Открыть</Button></SheetTrigger>
  <SheetContent title="Панель" description="Назначение панели.">
    <Input label="Название" />
  </SheetContent>
</Sheet>
```

Button по умолчанию `type="button"`; для form submit укажите type явно.
ButtonLink сохраняет семантику дочерней ссылки, не имеет фиктивного disabled.
IconButton требует label, декоративной иконке задайте `aria-hidden`.
Нативные props/ref доступны через React 19. Input/Select связывают label,
hint/error и внешний aria-describedby, error выставляет aria-invalid.
ErrorState принимает только безопасные пользовательские тексты, не exception.
LoadingState объявляет статус один раз, skeletons скрыты от screen reader.

Sheet использует точечный Radix Dialog: portal, modal semantics, title/description,
focus trap, Escape, scroll lock и возврат focus. При переходе по ссылке из «Ещё»
focus идёт в новый main, при обычном закрытии — к trigger. Route transition
меняет document.title, переводит focus в main и сбрасывает scroll. Есть skip link,
видимый focus и touch targets от 44px. Цвет не служит единственным признаком active.

## Витрина и проверки

После `pnpm dev:web` доступна dev-only `/design-system`: кнопки/disabled, feedback,
каркас формы/фильтров, типографика/статусы, Sheet и loading/empty/error.
В production отсутствуют этот route, ссылка и JavaScript витрины; это не новый
продуктовый раздел. Проверяется сборкой и просмотром production preview.

Из корня monorepo:

```bash
pnpm --filter @finora/web test
pnpm --filter @finora/web exec playwright install chromium
pnpm test:e2e
```

В Linux CI установка браузера использует `--with-deps`. Playwright сам поднимает
Vite на свободном фиксированном порту 4173; существующий сервер не переиспользуется.
Trace/screenshots сохраняются при ошибке и игнорируются Git/lint/format.
Vitest/Testing Library проверяют поведение компонентов; jsdom не используется
как доказательство layout. Playwright проверяет 320/390/640/767/768/1024/1440/1920px,
landscape, keyboard/focus, размеры и видимость навигации, длинный текст, 200% шрифт,
reduced motion и axe WCAG 2.2 AA для страниц и открытого dialog.
Это accessibility foundation, а не сертификат полного приложения; реальные
screen reader/iOS/Android проверки и domain-specific accessibility ещё впереди.

## Stage 4: формы и server state

`AuthPage` компонует вход/регистрацию и реальные demo-кнопки; `SettingsPage`
показывает и сохраняет собственный профиль. React Hook Form + Zod дают ранние
русские сообщения; API остаётся authoritative validation boundary.
Общий адаптер `shared/api/client.ts` вызывает только generated Orval functions,
переводит Problem Details в типизированные ошибки и скрывает transport details.
Новых fetch endpoints, дублированных DTO и UI primitives нет.

`AuthProvider` хранит результат `/auth/me` в TanStack Query. AuthBoundary
различает initial loading, anonymous, initial error/retry и authenticated.
Фоновая ошибка сохраняет форму и показывает retry; 401 очищает пользовательские
данные. При смене владельца удаляются остальные queries и mutations, а observer
сессии сохраняется. Запоздалое сохранение старого профиля не меняет нового владельца.
Вход/регистрация/settings/logout — mutations без автоматических повторов;
на время операции блокируются конфликтующие действия. Каталоги используют Query,
поля не подменяются фиктивными значениями при ошибке загрузки, submit недоступен.

Поля связаны с label/hint/error. Ошибки объявляются через alert, pending/success
через status; focus после validation идёт к первому полю в порядке формы после
снятия disabled. Переход после auth переводит focus в main. Новых modal/sheet
форм этапу не требуется; прежний responsive Sheet и его проверки сохранены.
Профиль использует те же tokens, Card/Input/Select/Button, 320px reflow,
landscape и 200% шрифт. Денежных вычислений в этих формах нет.

Дополнительно к `pnpm test:e2e` выполните `pnpm test:e2e:auth` из корня:
это clean-source Compose + Playwright на production Nginx. В shell component/E2E
тестах сессия — явная fixture; их прежние navigation/focus/axe assertions сохранены.
Сквозной auth suite использует настоящие cookie, API и PostgreSQL; только сценарии
сбоев/загрузки явно перехватывают сетевой ответ. Suite выполняется последовательно,
без retries, в собственной disposable БД, с детерминированным новым аккаунтом.

## Stage 5: категории и Transaction Explorer

`pages/TransactionsPage` и `pages/CategoriesPage` компонуют `features/finance`:
Query/mutation hooks поверх Orval, editor forms, stable page dialog, подтверждение
удаления, фильтры, pagination, CategoryMark и точное представление денег/дат.
Нового handwritten HTTP client, state store или UI kit нет. CSS finance подключён
через единый shared/styles/index.css и использует существующие tokens/breakpoints.

URL хранит server filters/page/sort. Search debounce 300 мс сохраняет focus;
pageSize 10/25/50. Фильтры суммы подписаны baseCurrency. Mobile использует cards и
filter Sheet, desktop — четыре колонки операций; длинные тексты и суммы переносятся.
Нативные selectors доступны с клавиатуры. Цвет категории — декоративная метка;
иконка, название и текстовый статус не полагаются на выбранный пользователем цвет.

Loading/empty/filtered-empty/error/retry, background refetch, pending и success
реализованы. Деньги отправляются decimal strings; ввод с запятой нормализуется.
Base currency rate=1, изменение валюты очищает старый rate; серверная ошибка поля
объявляется и получает focus после pending. API остаётся validation authority.

Диалог создания/редактирования/удаления живёт на уровне страницы, вне строк списка и EmptyState, поэтому refetch и debounce
не закрывают форму. Pending блокирует submit, dismiss и logout; recoverable error
сохраняет черновик, автоматического повтора mutation нет. Удаление требует явного
подтверждения и не использует optimistic disappearance. Focus после закрытия
возвращается trigger либо main, если строка исчезла. Logout/401 очищает данные;
ключи Query включают userId, старые abortable requests не подменяют новые.

`finance.test.tsx` проверяет формы, CRUD, loading/empty/retry/pending, filters,
cache/expiry/races и сохранность открытого черновика при refetch. Новый
`finance.compose.spec.ts` проходит реальный category/transaction CRUD, reload,
logout/login, isolation и responsive/axe/keyboard без моков backend. В режиме
FINORA_COMPOSE_URL Playwright запускает все *.compose.spec.ts; shell suite остаётся
изолированным и использует явные financial fixtures, сохраняя прежние assertions.

Итог Stage 5: 47 frontend tests, 15 shell E2E и 18 Compose E2E — PASS после
self-review. Desktop filters учитывают ширину контейнера; при недостатке места
доступен Sheet. Category grid, labels, PageHeader и прокрутка Sheet проверены
при 200% текста. Подробный журнал проверок и ограничения — в ../../REPORT.md.

## Stage 6 — Budgets

`BudgetsPage` собирает monthly query, URL period/pagination, карточки и page-owned
`BudgetSheet`. `BudgetForm`, `BudgetMonthPicker`, `BudgetProgress` используют общие
finance helpers и shared UI. Денежные API types приходят из Orval, raw fetch и
клиентские финансовые aggregates не добавлены. `Number(progress)` применяется
только для ширины/ARIA полосы; spent/remaining/percent предоставлены сервером.

Состояния: loading, empty, populated, error/retry, field errors, pending, success,
confirmation, zero/partial/exact/over-budget. Синхронный submission ref блокирует
двойной submit и Escape до завершения запроса; ошибки сохраняют draft. Поздняя
загрузка category options не теряет выбранную историческую категорию.

После выявленного axe target-size дефекта на длинном budget list мобильный shell
прокручивает содержимое отдельно над bottom navigation. Desktop document scroll
сохранён. Browser tests проверяют шесть заданных размеров, 200% text, reduced motion,
keyboard/focus/confirmation, axe и сохранность черновика при server error.
`budgets.compose.spec.ts` работает с настоящими Nginx/API/PostgreSQL; тестовые
сетевые сбои помечены отдельно. Независимый suite использует общий только auth
setup, данные сценариев создаются отдельно и не требуют порядка выполнения тестов.

### Stage 6: переносимость и изоляция browser acceptance

`pnpm test:e2e:auth` запускает прежние auth/finance tests, budgets и regression
перезапуска workers/параллельных viewport. Только budget project зависит от
`budgets-auth`: два входа выполняются один раз за запуск; страницы/context
создаются заново для каждого теста. Login → «Обзор» остаётся частью UI acceptance.

Screenshot normal/200% text сохраняются через `testInfo.outputPath()` и attachments.
Compose runner выделяет уникальный каталог под игнорируемым `test-results/`.
Для отдельных одновременно запущенных Playwright процессов задайте разные
`FINORA_PLAYWRIGHT_OUTPUT_DIR`; параллельные test cases разделяет сам Playwright.
StorageState setup не следует публиковать вместе с PNG: это test session cookies.

При уже поднятом отдельном acceptance Compose можно запустить
`FINORA_COMPOSE_URL=<origin> pnpm test:e2e:stage6-regression`. Runner сам удаляет
временные copies/PNG/state, проверяет 5 заданных падений и последующие 6 успешных
viewport, затем 12 viewport на четырёх workers. Обычный suite обязан завершиться
без ошибок; в него намеренные падения не добавляются. Локальный PASS на macOS
не доказывает переносимость Linux; диагностика remote run описана в REPORT.

### Stage 5: DELETE race и независимые compose cases

После DELETE 204 mutation отменяет незавершённые finance queries владельца перед
invalidation. Это необходимо для первого GET нового search-фильтра: у него ещё нет
cached data, и обычная invalidation могла присоединиться к snapshot до DELETE.
Dialog закрывается после successful mutation и обновления; 429/503 остаются внутри
подтверждения. Component и Compose regressions управляют доставкой snapshot,
проверяют исчезновение удалённой строки и фактический refetch без retries/sleeps.

Auth/finance теперь зависят от отдельного `compose-auth` setup: immutable session
files лежат в его outputDir; каждый case получает новый context. Responsive profile
создаётся независимо от UI registration test; finance cases создают собственные
уникальные category/transaction и удаляют их в fixture finally. Можно выбирать
отдельный responsive case без CRUD-предшественника и запускать workers=1/2/4.

Для `auth.compose.spec.ts` требуется `FINORA_SECURITY_COMPOSE_URL` отдельного
чистого Compose. Его intentional limiter test не делит API process/DB с
`FINORA_COMPOSE_URL`. `pnpm test:e2e:auth` подготавливает и удаляет оба окружения
автоматически. Лимиты и защита X-Forwarded-For проверяются без изменения production
конфигурации. Budget setup/regression остаются независимыми от `compose-auth`.
