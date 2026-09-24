# React + TypeScript + Vite

## v22: защищённые ссылки

Для существующего v21 выполните `supabase/v22_share_links.sql` в Supabase SQL
Editor. Для нового проекта выполните весь `supabase/setup.sql`. Миграция
идемпотентна; таблицы участников, прежние email-приглашения, Storage и Realtime
сохраняются.

Владелец открывает «Поделиться» на доске или её карточке и создаёт ссылку для
редактирования либо просмотра. Полная ссылка показывается только после создания
и не восстанавливается из списка. Скопируйте её до закрытия диалога. Email-доступ
и управление существующими участниками находятся в том же диалоге.

Сервер создаёт криптографически случайный токен (244 случайных бита), хранит только
его SHA-256 и не возвращает хеши в списке. Таблица закрыта для прямого доступа
anon/authenticated, RPC проверяют владельца или авторизованного получателя.
`redeem_board_share_link` принимает только токен: доска и роль определяются из
найденной серверной записи. Проверяются отзыв и срок действия; повторный вход
обновляет существующее членство. Viewer-ссылка назначает viewer даже прежнему
editor; owner остаётся owner. Срок `expires_at` допускает NULL (без ограничения)
и может быть задан администратором в БД. Отзыв блокирует новые использования,
но не удаляет уже выданное членство — удалите участника отдельно.

`/join/:token` сохраняет ожидающий токен в sessionStorage текущей вкладки на время
входа/регистрации. После входа доступ выдаётся автоматически, токен удаляется из
sessionStorage, URL заменяется на `/board/:boardId`. Если нужна верификация email,
подтвердите email и войдите в исходной вкладке со ссылкой. `/board/:boardId`
проверяет доступ на сервере; знание UUID не выдаёт прав. В локальном режиме
сохраняются прежние доски и email-приглашения между аккаунтами одного браузера;
серверные share links недоступны.

Ссылки являются секретами доступа: пересылка передаёт выбранные права любому
авторизованному получателю. Не добавляйте запись полных `/join/` URL в аналитику.
В приложении и Vercel установлен `Referrer-Policy: no-referrer`, после получения
доступа токен убирается из текущего URL. Путь первоначального запроса всё равно
может присутствовать в журналах хостинга — ограничьте доступ к этим журналам.

Проверки: `node --test tests/*.test.mjs`, `npm run build`. Для исполнения SQL-тестов
на временном PostgreSQL, без подключения к Supabase и без зависимости приложения:

```powershell
$testRuntime = Join-Path $env:TEMP 'interactiveboard-v22-sql-tests'
npm.cmd install --prefix $testRuntime --no-save --package-lock=false @electric-sql/pglite
$env:PGLITE_MODULE = Join-Path $testRuntime 'node_modules/@electric-sql/pglite/dist/index.js'
node tests/shareLinks.sql.mjs
```

## Deployment

1. В Supabase SQL Editor примените `supabase/v22_share_links.sql` поверх v21
   (либо `supabase/setup.sql` для нового проекта).
2. Когда изменения будут опубликованы в GitHub, в Vercel выберите **Add New →
   Project → Import Git Repository** и импортируйте `Vue-Jay/interactive-board`.
   Root Directory: корень репозитория; Framework Preset: **Vite**.
3. Install Command: `npm ci`; Build Command: `npm run build`;
   Output Directory: `dist`. Выберите Node.js **22.x** (не ниже 22.12).
4. В **Settings → Environment Variables** задайте для Production:
   `VITE_SUPABASE_URL` = URL проекта Supabase;
   `VITE_SUPABASE_ANON_KEY` = его публичный anon/publishable key.
   Service role / secret key не используйте. Для Preview задавайте переменные
   отдельно, желательно от тестового проекта. После изменений переменных нужен
   новый deployment: Vite встраивает их во время сборки.
5. В Supabase **Authentication → URL Configuration** установите **Site URL**:
   `https://YOUR-PROJECT.vercel.app/` (или ваш постоянный домен).
   В **Redirect URLs** добавьте этот же адрес и, для локальной разработки,
   `http://localhost:5173/`. Для отдельных доверенных Preview-развёртываний
   добавьте их точные адреса. Не используйте общий wildcard для чужих проектов.
6. Нажмите **Deploy**. `vercel.json` направляет SPA-маршруты на `index.html`,
   поэтому `/join/:token` и `/board/:boardId` работают при прямом открытии и
   перезагрузке. Файлы `dist/assets` обслуживаются как статические ресурсы.
7. Проверьте с двумя аккаунтами: создать ссылку, открыть в приватном окне,
   войти, получить нужную роль; перезагрузить `/board/...`; проверить медиа,
   Realtime и отзыв ссылки. Подтверждение email проверяйте с реальным почтовым ящиком.

`.env.example` содержит только имена двух переменных. `.env.local` исключён через
правило `*.local` в `.gitignore` и не должен попадать в GitHub.

Источники: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## InteractiveBoard v21: live board updates

After v20, run `supabase/v21_realtime.sql` in the Supabase SQL Editor.
For a new project, `supabase/setup.sql` includes all migrations. The v21 SQL
idempotently adds `public.board_documents` to `supabase_realtime`; the existing
SELECT RLS policies continue to control viewer/editor/owner access.

The open board uses one native WebSocket subscription, with INSERT/UPDATE
filters for its board ID, the current user's JWT, heartbeats, token refresh and
bounded reconnect backoff. No new dependency is needed. After subscribing or
reconnecting, and on change notifications, the document is read through the
existing authenticated REST API, recovering missed versions.

Clean boards (including viewers) receive new versions automatically. Unsaved
edits or open editors pause remote saving and show two choices: apply the server
version, or keep local changes and save them against that server version. Keeping
local changes replaces the whole server document; it is not a per-object merge.
A newer concurrent save still triggers the existing optimistic version check.
Acknowledged versions and own echoes are ignored; applying a remote document
does not schedule another remote save. Leaving the board/logging out removes
the socket, timers and listeners and ignores delayed responses.

Validation: `node --test tests/*.test.mjs` and `npm.cmd run build` on Windows
(`npm run build` elsewhere). The tests use mocked WebSocket/REST adapters;
verify two real browser sessions after applying the migration.

Protocol reference: [Supabase Realtime protocol](https://supabase.com/docs/guides/realtime/protocol).

## InteractiveBoard v20: media storage

For an existing v19 Supabase project, run `supabase/v20_board_assets.sql` in
the SQL Editor. For a new project, run `supabase/setup.sql` (includes v19/v20).
The migration creates the private `board-assets` bucket with a 50 MiB limit
for images and PDFs. Existing `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` settings are sufficient; no service-role key is used.

Objects use `<boardId>/<assetId>` paths. RLS allows board members to read;
only owners and editors can insert, update or delete. Downloads use the
authenticated Storage endpoint and are cached in IndexedDB. Without Supabase,
the existing local storage mode is retained. New uploads must succeed before
an item is added to a remote board. Imported bundled files receive fresh IDs.
Legacy v19 attachments are uploaded from the original browser before the next
server save; files absent from that browser cannot be recovered automatically.

Asset IDs are immutable in the client: replacements/imports use new IDs.
Deleting a board item retains the binary for undo/history. Storage cleanup is
not automatic. To verify deployment, upload an image and PDF as owner/editor,
open the board on another device as viewer, then check that viewer uploads and
access from a non-member are rejected by Storage RLS.

Storage policy reference: [Supabase access control](https://supabase.com/docs/guides/storage/security/access-control).

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
