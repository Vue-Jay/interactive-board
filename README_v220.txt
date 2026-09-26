OnlineRepetitor v220 LOCAL

Adds consistent cursor feedback across the interface.

IMPORTANT:
Add this one import at the end of src/main.tsx imports:
import "./interactiveCursor.css";

The stylesheet covers active buttons, menu/dashboard/settings/profile tiles, links,
summary controls, ARIA buttons/tabs/menu items and other keyboard-clickable elements.
Disabled controls retain the normal cursor.
Board-specific cursors (grab, crosshair, resize, text, eraser) are preserved.

No SQL.
Run npm run build before push.
