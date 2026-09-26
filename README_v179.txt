OnlineRepetitor v179 — LOCAL TEST BUILD
Do not publish yet.

Cumulative patch: v176 + v177 + v178 + v179.

v179:
- the Ctrl/Cmd+K command search is now accessible on phones and tablets;
- open “All tools” and tap “Найти”;
- touch users can search and select tools without a physical keyboard;
- compact search icon is used on very narrow phones;
- mobile command-palette help text no longer assumes a keyboard.

Local desktop:
npm run build
npm run dev

Real phone on the same Wi-Fi:
npm run dev -- --host
Then open the Network URL printed by Vite, e.g. http://192.168.1.25:5173
Windows Firewall may ask to allow Node.js on Private networks.
