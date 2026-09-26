OnlineRepetitor v184 — LOCAL RELEASE CANDIDATE
Do not publish until local QA passes.

Cumulative local patch: v176-v184.

v184:
- desktop toolbar now has a permanent search icon for tools/actions;
- Ctrl+K remains available as the fast keyboard path;
- search opens the same command palette as mobile;
- mobile does not duplicate the desktop search button;
- includes all mobile header, lasso, toolbar persistence and startup request stabilization work from v176-v183.

FINAL LOCAL QA:
1. npm run build
2. npm run dev
3. Desktop: Select → Hand → Lasso are always visible.
4. Desktop: search icon opens command palette; Ctrl+K does the same.
5. Desktop: More tools state survives refresh.
6. Phone: top bar never disappears after swipes.
7. Phone: All tools → search icon opens command palette.
8. Phone: portrait + landscape, pan + pinch, text keyboard.
9. Login/logout, roles, notifications, board open/save/reopen.
10. Two browsers/users: invitation, shared board, realtime presence/editing.

Real phone:
npm run dev -- --host
