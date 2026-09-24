OnlineRepetitor v62 — mobile UX + PWA

Добавлено:
- нижняя мобильная панель быстрых инструментов: выделение, рука, карандаш, ластик, стикер;
- активный инструмент подсвечивается;
- кнопка полной панели инструментов перенесена выше quick dock;
- безопасные отступы для iPhone/iPad;
- адаптация уведомлений и zoom controls под нижнюю панель;
- PWA manifest;
- service worker с app-shell/offline fallback;
- standalone-режим;
- предложение установки приложения, когда браузер поддерживает beforeinstallprompt;
- SVG PWA icon.

SQL не требуется.

node install_v62.mjs
npm run build

После успешной сборки:
git add .
git commit -m "v62: add mobile quick tools and PWA"
git push
