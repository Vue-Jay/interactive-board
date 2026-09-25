v146 — mobile startup/cache hotfix

Changed:
- public/sw.js: cache-first for immutable Vite assets; cached navigation shell is returned immediately and refreshed in background.
- src/main.tsx: removed forced page reload on service-worker controllerchange. A deployment no longer causes a second full startup on mobile.

Install: copy src/ and public/ over the project root, then run npm run build and Git commands from the accompanying instructions.
