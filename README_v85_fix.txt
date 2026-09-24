OnlineRepetitor v85 FIX

1. Распакуйте архив в папку, где находится ваша папка InteractiveBoard, с заменой файлов.
2. В Supabase SQL Editor выполните целиком файл supabase/v85_comment_threads.sql.
3. В проекте выполните: npm run build

Что исправлено:
- убрана ссылка SQL на отсутствующие profiles.full_name и profiles.email;
- автор комментария больше не меняется при UPDATE/отметке «решено»;
- parent comment проверяется на принадлежность той же доске;
- политики доступа используют серверные can_access_board/can_edit_board;
- commentThreadsStore проверяет пустой текст и работает с серверной таблицей.

Важно: install_v85.mjs запускать не нужно.
