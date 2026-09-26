OnlineRepetitor v214 LOCAL

FIX: mobile main-screen scrolling.

Cause:
v180 intentionally locks html/body/#root scrolling on coarse touch devices so the board topbar cannot be swiped away. The dashboard inherited that global lock and had no independent scroll container.

Fix:
- Boards/main dashboard is now its own 100dvh vertical scroll container on touch devices.
- Horizontal overflow remains blocked.
- Native momentum scrolling is enabled.
- Bottom safe-area/padding is reserved so the last board/card/action can be reached.
- Board workspace scrolling/topbar behavior is unchanged.

No SQL changes.

QA:
npm run build
npm run dev -- --host
