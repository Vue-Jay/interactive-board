OnlineRepetitor v35 hotfix

Исправляет ошибки TypeScript TS6192 и TS6133 в src/studentsStore.ts.
Удалены неиспользуемые импорты backend и BoardSummary.

Замена:
скопируйте папку src из архива в корень проекта с заменой файла.

После этого:
npm run build

Если сборка успешна:
git add .
git commit -m "fix: remove unused student store imports"
git push
