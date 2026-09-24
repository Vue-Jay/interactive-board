OnlineRepetitor v27 HOTFIX

Исправлена ошибка TypeScript:
  Cannot find name 'flush'

Причина:
flush был объявлен внутри connect(), а sendCursor() вызывал его снаружи.

Что делать:
1. заменить только:
   src/boardBroadcast.ts
2. выполнить:
   npm run build

Другие файлы v27 менять не нужно.
SQL не нужен.
