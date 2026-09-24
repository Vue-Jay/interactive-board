OnlineRepetitor v48 — материалы ученика и задания

Добавлено:
- материал из библиотеки можно прикрепить к новому заданию;
- ученик получает read-only доступ к прикреплённому файлу;
- в карточке ученика появился блок материалов;
- материал можно отвязать;
- исправлена гонка сохранения заметок/тегов ученика: один атомарный upsert.

Установка:
1. Выполнить supabase/v48_student_materials.sql.
2. node install_v48.mjs
3. npm run build
4. git add .
   git commit -m "v48: link materials to students and assignments"
   git push
