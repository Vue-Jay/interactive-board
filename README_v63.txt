OnlineRepetitor v63 — PWA reliability

Добавлено:
- индикатор offline;
- обнаружение новой версии service worker;
- баннер обновления и кнопка контролируемого обновления;
- network-first для JS/CSS;
- очистка старых PWA-кэшей;
- улучшенный manifest;
- offline fallback оболочки.

SQL не требуется.

node install_v63.mjs
npm run build
git add .
git commit -m "v63: improve PWA reliability"
git push
