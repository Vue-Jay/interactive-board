OnlineRepetitor v53 Hotfix 1

Исправляет два TS2345 после v53:
старые вызовы setTableDraft не передавали новые поля align, stripe, compact.

SQL не нужен.

Запуск:
node install_v53_hotfix1.mjs
npm run build

После успешной сборки:
git add .
git commit -m "fix: complete v53 table draft defaults"
git push
