OnlineRepetitor v178 — LOCAL TEST BUILD
Do not publish yet.

Cumulative local patch: includes v176 + v177.

v178:
- command palette now supports Arrow Up / Arrow Down navigation;
- Enter executes the currently highlighted result;
- mouse hover and keyboard selection stay synchronized;
- search changes reset selection to the first result;
- Esc/backdrop close resets palette state;
- improved highlighted state and focus feedback;
- subtle opening animation respects prefers-reduced-motion.

Test:
npm run build
npm run dev
