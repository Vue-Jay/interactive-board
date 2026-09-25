OnlineRepetitor v114 — ускорение загрузки и устойчивость сети

Изменено:
- мгновенный HTML-экран запуска до загрузки React;
- App загружается отдельным lazy chunk;
- React/ReactDOM вынесены в отдельный кэшируемый vendor chunk;
- immutable cache headers для /assets на Vercel;
- Service Worker: stale-while-revalidate для статики и fallback навигации после 3.5 с;
- Dockerfile + nginx-конфигурация для альтернативного production-хостинга.

SQL не требуется.
