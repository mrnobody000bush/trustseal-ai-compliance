## TrustSeal & Compliance AI — MVP

Полный SaaS для интернет-магазинов: проверка сайта на соответствие EU AI Act + встраиваемый виджет доверия для покупателей.

### Что получит пользователь

**Публичная часть (маркетинг):**
- Лендинг с описанием продукта, ценообразованием, FAQ
- Переключатель языка EN/RU (i18n)
- Форма регистрации / входа

**Кабинет владельца магазина (после входа):**
- Дашборд: список подключённых сайтов, статус compliance, метрики виджета
- Мастер добавления сайта: URL → AI-скан → отчёт (маркировка ИИ-контента, вотермарки, соответствие AI Act, риски)
- История отчётов, повторный скан
- Генератор embed-кода виджета (одна строчка `<script>`) + настройки внешнего вида
- Настройки профиля / выход

**Виджет доверия (для покупателей на сайте магазина):**
- Демо на лендинге
- Компактный «trust badge» + модалка с: верифицированные отзывы, метки легальности ИИ-контента, гарантии, живой AI-чат для вопросов о доверии

### Технический план

**Стек:** уже настроенный TanStack Start + Tailwind v4 + Lovable Cloud (auth, БД, storage) + Lovable AI Gateway (`google/gemini-3-flash-preview`) для скана и чата.

**Данные (Lovable Cloud):**
- `profiles` — профиль пользователя
- `user_roles` — роли (`owner`, `admin`) в отдельной таблице через `has_role()`
- `sites` — подключённые магазины (user_id, domain, widget_config)
- `compliance_scans` — результаты AI-скана сайта (site_id, status, findings jsonb, score, created_at)
- `widget_events` — события виджета (site_id, type, meta) для аналитики
- RLS: пользователь видит только свои строки; сервисная роль пишет скан-результаты

**Server functions (`src/lib/*.functions.ts`):**
- `scanSite` — тянет URL, вызывает Gemini через AI Gateway со структурированным выводом (findings + score), сохраняет `compliance_scans`
- `chatTrust` — обрабатывает вопросы покупателя из виджета (streaming через server route `/api/chat`)
- `getDashboardData`, `createSite`, `updateWidgetConfig` — CRUD через `requireSupabaseAuth`

**Публичный endpoint виджета:**
- `src/routes/api/public/widget/$siteId.ts` — отдаёт JSON конфига и trust-данных для встраивания (только безопасные публичные поля, `TO anon` политика)
- `public/embed.js` — крошечный скрипт, который магазин вставляет; монтирует iframe/shadow DOM с виджетом

**Роуты:**
- `/` — лендинг
- `/pricing`, `/about` — доп. страницы
- `/auth` — вход/регистрация
- `/_authenticated/dashboard`
- `/_authenticated/sites/$siteId` — детали сайта + отчёты + настройки виджета
- `/widget-demo` — живая демка виджета
- `/api/chat`, `/api/public/widget/$siteId` — server routes

**Визуал:** чистый минималистичный tech-SaaS.
- Светлая тема (белый фон `#FFFFFF`, поверхности `#F8F9FB`), тёмный текст `#0A0A0B`, акцент индиго `#4F46E5`, успех `#10B981`, предупреждение `#F59E0B`
- Тёмная тема как опция
- Шрифты: **Inter** (UI/текст) + **JetBrains Mono** (кодовые сниппеты embed)
- Скругления 12px, тонкие бордеры, мягкие тени, много воздуха
- Токены прописаны в `src/styles.css` (oklch), никаких хардкод-цветов в компонентах

**i18n:** `react-i18next` + JSON-словари `en.json`/`ru.json`, переключатель в шапке, выбор сохраняется в localStorage (читаем через `useEffect`).

### Этапы

1. Дизайн-система (токены, шрифты), layout, i18n, переключатель темы
2. Лендинг + страницы pricing/about + демо виджета
3. Lovable Cloud: авторизация, миграции (`sites`, `compliance_scans`, `widget_events`, `user_roles`, RLS + GRANTs)
4. Кабинет: дашборд, добавление сайта, страница сайта
5. AI-скан через Gemini (структурированный вывод) + отображение отчёта
6. Публичный endpoint виджета + `public/embed.js` + shadow-DOM UI виджета
7. AI-чат в виджете (streaming) + аналитика событий

### Что вне MVP
Платежи/Stripe, real-time парсинг отзывов из внешних сетей (Reddit/Google), Shopify-плагин, команды/мультипользовательские аккаунты, вебхуки — добавим после валидации.
