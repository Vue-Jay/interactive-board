OnlineRepetitor v171 — mobile updates delivery fix

This release fixes the reason recent mobile/PWA changes could exist in source code
but not appear in the installed application.

Included and verified in the source:
- Lasso is a PRIMARY mobile tool: Hand / Select / Lasso.
- The former Study section is split into:
  Tasks: Checklist / Quiz / Flashcards.
  Interactive: Table / Formula / Graph / Cover / Comment.
- Per-board viewport persistence is present: refresh/reopen restores x/y/zoom.

Update-delivery fix:
- installed app checks /version.json on startup, focus, return from background and every 60 seconds;
- version.json is always fetched with cache:no-store;
- HTML, manifest, version marker and retired sw.js receive explicit no-cache/no-store headers on Vercel;
- legacy Service Workers are unregistered;
- ALL old Cache Storage entries are removed, not only caches with one historical prefix;
- if an old Service Worker was still controlling the installed app, the app performs one guarded reload after cleanup;
- Vercel SPA rewrite no longer catches real assets/version/manifest/sw requests.

IMPORTANT FOR FUTURE RELEASES:
Increment APP_BUILD_VERSION in src/main.tsx and version in public/version.json together.
