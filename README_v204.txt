OnlineRepetitor v204 LOCAL

Mobile fixes:

1. Attachments can be moved with touch.
- Image/PDF content no longer intercepts pointer gestures on mobile.
- The board-object wrapper receives the gesture.
- With Smart Hand: tap selects an attachment, drag the selected attachment moves it.
- PDF <object> can no longer swallow Android touch movement.
- Open/download actions remain available from the floating selected-object toolbar.

2. Mobile scale/navigation collision fixed.
- Removed visible labels “Все” and “Выбор”; both actions are icon-only.
- In portrait orientation the whole zoom/navigation panel is hidden.
  Pinch-to-zoom remains available.
- This portrait rule is based on viewport/orientation, not pointer:coarse, so it
  also works in Android WebView and Chrome mobile emulation.
- Landscape keeps a compact icon-only navigation panel and reserves more room
  for the centered tools dock when selection appears.

QA:
npm run build
npm run dev

Phone:
- portrait: no scale panel; bottom tool dock must have the full width;
- landscape: no overlap between navigation and tool dock;
- Hand -> tap image/PDF -> selected;
- Hand -> drag selected image/PDF -> attachment moves;
- tap empty board -> selection clears;
- swipe empty board -> canvas pans.
