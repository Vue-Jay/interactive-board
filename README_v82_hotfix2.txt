OnlineRepetitor v82 hotfix 2

Исправляет production crash:
Minified React error #310

Причина: useEffect для getAccountAccess был добавлен ПОСЛЕ условного `if (!authReady) return`.
На первом рендере React видел меньше hooks, на следующем — больше, что нарушает Rules of Hooks.

Установка:
node install_v82_hotfix2.mjs
npm run build

SQL повторно выполнять НЕ нужно.

После успешной сборки:
git add src/App.tsx install_v82_hotfix2.mjs README_v82_hotfix2.txt
git commit -m "fix: keep account access hook order stable"
git push
