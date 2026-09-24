OnlineRepetitor v74 hotfix 1

Исправляет TS6133 в src/workspaceBackup.ts:
удалён неиспользуемый тип PortableBoardBundle из импорта.

SQL повторно выполнять не нужно.

1. Извлечь архив в корень проекта.
2. node install_v74_hotfix1.mjs
3. npm run build
