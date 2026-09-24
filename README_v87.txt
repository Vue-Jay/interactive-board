OnlineRepetitor v87 — реальные обсуждения доски

Что изменено:
- интерфейс серверных обсуждений реально подключён к доске;
- комментарии и ответы загружаются из Supabase;
- решённые ветки можно закрывать и открывать снова;
- @упоминания из v86 работают из этого интерфейса;
- открытое окно обсуждений обновляется в реальном времени через Supabase Realtime;
- добавлена подписка INSERT / UPDATE / DELETE для board_comments.

Перед запуском выполните SQL по порядку, если соответствующий файл ещё не выполнялся:
1. supabase/v85_comment_threads.sql
2. supabase/v86_comment_notifications.sql
3. supabase/v87_comment_realtime.sql

Затем:
npm run build
git add .
git commit -m "v87: finish realtime board discussions"
git push origin main
