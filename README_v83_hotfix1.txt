OnlineRepetitor v83 hotfix 1

Исправляет TS2322:
Property 'accountRole' does not exist on type Props в ScheduleScreen.

Причина:
основной installer v83 успел изменить App.tsx, но часть замен в ScheduleScreen.tsx не применилась.

Установка:
node install_v83_hotfix1.mjs
npm run build

SQL повторно выполнять не нужно.
Пока не коммитьте, сначала убедитесь, что сборка проходит.
