OnlineRepetitor v180 — LOCAL TEST BUILD
Do not publish yet.

Cumulative local patch: v176-v180.

v180 fixes:
- mobile top bar is now permanently fixed to the top of the viewport;
- page/root scrolling can no longer move the board header off screen;
- board workspace starts below the fixed 48 px header;
- mobile header is protected from swipe/overscroll displacement;
- the tool search action is now icon-only, without the “Найти” text.

Mobile test:
npm run dev -- --host
Open Vite Network URL on a real phone.
Test repeated upward/downward swipes starting directly on the top bar,
portrait/landscape rotation, board pan/pinch, and opening the mobile tool search.
