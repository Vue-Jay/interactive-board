OnlineRepetitor v185 — FINAL RELEASE

Cumulative release containing the verified local changes from v176-v185.

Highlights:
- optimized backend request/session handling;
- permanent mobile top bar;
- compact mobile tool search;
- Select → Hand → Lasso permanently visible in desktop navigation;
- desktop “More tools” state persists;
- desktop command search icon + Ctrl+K;
- duplicate notification/account-access startup requests reduced;
- portrait mobile zoom panel hidden to prevent overlap; pinch zoom remains;
- landscape/desktop zoom controls unchanged.

Release procedure:
1. Replace files from this archive in the project root.
2. npm run build
3. npm run dev
4. Optional final smoke test.
5. Commit and push to main to trigger the configured production deployment.

This archive intentionally contains complete replacement files only.
