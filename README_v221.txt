OnlineRepetitor v221 LOCAL

Fixed pointer cursor specifically inside Settings.
The actual settings tiles use .settings-row-card / .settings-plan-row / .settings-role-row,
so v220's generic selectors did not cover every clickable row.

This patch:
- gives all active Settings tiles and controls cursor:pointer;
- keeps disabled controls as the normal arrow;
- keeps text fields as the text cursor;
- includes the v220 global cursor stylesheet and complete main.tsx imports.

No SQL.
Run npm run build before push.
