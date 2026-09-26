OnlineRepetitor v205 LOCAL

Fix: selected attachments snapping back instead of moving on mobile.

Cause:
Smart Hand waited for a movement threshold before pointer capture. On Android,
a touch beginning on image/PDF content could be retargeted/cancelled during that
small interval. The object visually moved for a moment, then the cancelled
gesture restored its original coordinates.

v205:
- when Hand touches an ALREADY SELECTED unlocked object, mobile immediately
  enters the normal proven drag mode;
- pointer is captured at pointerdown, before any movement;
- preventDefault/stopPropagation are applied to that selected-object drag;
- the drag snapshot is deep-copied so the baseline cannot be mutated while moving;
- first tap on an unselected object still only selects it;
- swipe from an unselected object/empty board still pans;
- portrait zoom panel hiding and icon-only mobile controls from v204 remain.

Phone QA:
1. Hand active.
2. Tap image once -> selected.
3. Put finger inside selected image and drag continuously -> image follows finger.
4. Release -> image stays at new position.
5. Repeat with PDF.
6. Tap empty board -> selection clears.
7. Swipe empty board -> board pans.

Commands:
npm run build
npm run dev
