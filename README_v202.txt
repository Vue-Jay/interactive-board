OnlineRepetitor v202 LOCAL

Selection toolbar interaction fix:
- the floating toolbar under a selected object is now an explicit interactive UI layer;
- pointer/click events are stopped before they reach board pan/selection handlers;
- all toolbar buttons explicitly use type=button;
- pointer events and touch interaction are forced on for buttons, links, menu, summary and inputs;
- toolbar/menu z-index is above board transform overlays;
- More menu remains clickable above the toolbar;
- v201 realtime attachment approval remains intact.

Test every visible action on an image:
Open, Download, Duplicate, Lock/Unlock, Rotate left/right, More, Delete.
Also test the More dropdown and a PDF page control.

Commands:
npm run build
npm run dev
