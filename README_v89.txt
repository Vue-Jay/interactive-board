OnlineRepetitor v89

Завершает пункты 5 «Совместное редактирование» и 7 «История изменений».

1. Выполните supabase/v89_collaboration_history_finish.sql в Supabase SQL Editor.
2. Замените src/historyStore.ts.
3. npm run build
4. git add .
5. git commit -m "v89: finish collaboration history"
6. git push origin main

Сервер теперь автоматически ведёт неизменяемый журнал последних 100 сохранений:
автор, версия, время, количество добавленных/изменённых/удалённых объектов.
Старые версии истории заполняются автоматически при миграции.
