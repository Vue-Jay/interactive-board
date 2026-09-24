# React + TypeScript + Vite

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
