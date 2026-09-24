OnlineRepetitor live merge hotfix 5

Причина ошибки:
hotfix 4 удалил state conflictBusy и ручные conflict handlers, но один вызов
setConflictBusy(false) остался раньше удалённого диапазона App.tsx.

Установка:
1. Распакуйте этот ZIP в корень проекта.
2. Выполните:
   node install_live_merge_hotfix5.mjs
3. Затем:
   npm run build

Установщик специально:
- удаляет только один точный остаточный вызов setConflictBusy(false);
- не меняет файл, если структура отличается от ожидаемой;
- проверяет, что старые conflictBusy/conflictDetails/manual handlers больше не остались.

SQL не нужен.
