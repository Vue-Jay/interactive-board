OnlineRepetitor v71 hotfix 1

Причина: установщик v71 искал старую форму импорта backend.ts и поэтому не добавил
listRemoteStorageObjects/deleteRemoteStorageObjects в импорт boardStore.ts.

1. Извлечь архив в корень проекта.
2. node install_v71_hotfix1.mjs
3. npm run build

SQL повторно выполнять не нужно.
