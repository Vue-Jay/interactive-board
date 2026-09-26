OnlineRepetitor v203 LOCAL

Smart Hand mode:
- single tap/click on an object with Hand selects it, without switching to Select;
- single tap/click on empty board clears selection and Hand remains active;
- dragging an already selected unlocked object with Hand moves that object/selection;
- dragging from empty board or an unselected object pans the canvas;
- a small movement threshold separates a click from a swipe, so ordinary panning does not accidentally select objects;
- middle mouse / Space panning behavior is unchanged;
- v201 realtime attachment approval and v202 selection-toolbar fixes are retained.

QA:
1. Choose Hand.
2. Click object -> selected.
3. Drag selected object -> object moves.
4. Click empty board -> selection clears.
5. Swipe empty board -> canvas pans.
6. Swipe starting on an unselected object -> canvas pans and does not select it.
7. Click that object without moving -> selects it.
8. Multi-selection made with Select/Lasso -> switch to Hand and drag a selected member -> selection moves together.

Commands:
npm run build
npm run dev
