# React + TypeScript + Vite

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
