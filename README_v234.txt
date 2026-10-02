OnlineRepetitor v234

Исправлено:
- восстановлен повреждённый CSS-селектор мобильного профиля, из-за которого Vite/LightningCSS завершал production build с ошибкой Unexpected end of input;
- удаление инструкции и служебного текста настроек сохранено;
- версия обновлена до 234.

Проверки:
- TypeScript (tsc -b): успешно;
- баланс CSS-блоков: корректный;
- полный Vite build в служебной Linux-среде не запускается из-за отсутствующего Linux native binding Rolldown в Windows node_modules. На Windows исходная CSS-ошибка устранена.
