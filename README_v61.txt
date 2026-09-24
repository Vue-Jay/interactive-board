OnlineRepetitor v61 — первый большой mobile/tablet patch

Добавлено:
- pinch-to-zoom двумя пальцами с сохранением точки между пальцами;
- одновременное перемещение области при pinch-жесте;
- touch-action/overscroll для доски;
- мобильная кнопка инструментов и выезжающая панель;
- крупные touch targets;
- адаптация topbar;
- горизонтальный скролл перегруженных панелей;
- скрытие minimap на небольших экранах;
- адаптация редакторов графиков/таблиц/формул/тестов;
- улучшения для coarse pointer / планшетов.

SQL не требуется.

node install_v61.mjs
npm run build
git add .
git commit -m "v61: improve mobile and tablet board"
git push
