OnlineRepetitor v185 — LOCAL FINAL RELEASE CANDIDATE
Do not publish until this last mobile check passes.

Cumulative local patch: v176-v185.

v185:
- portrait mobile/tablet hides the floating zoom controls completely;
- this removes the overlap with the mobile tool rail;
- pinch-to-zoom on the board remains available;
- landscape and desktop zoom controls are unchanged;
- all v176-v184 fixes remain included.

Final check:
npm run build
npm run dev -- --host

On phone:
1. Portrait: zoom panel must be absent.
2. Portrait: pinch-to-zoom must still work.
3. Portrait: tool panel must have no overlap.
4. Landscape: zoom controls remain available.
5. Rotate portrait → landscape → portrait several times.
