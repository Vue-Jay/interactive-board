OnlineRepetitor v110
- Удалён автоматический requestFullscreen() в обычном мобильном Chrome.
- Именно app-like fullscreen мог создавать системное уведомление Chrome «Нажмите, чтобы скопировать URL этого приложения».
- Обычная вкладка больше не переводится приложением в fullscreen.
- Landscape lock остаётся для установленной PWA.
- manifest orientation=landscape остаётся без изменений.
- Service worker cache v110.
SQL не нужен. TypeScript OK.
