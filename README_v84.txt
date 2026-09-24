OnlineRepetitor v84 — завершение разграничения ролей

Главное:
- серверная защита student_profiles и student_sessions учитывает approved teacher;
- ученик получает read-only доступ только к собственной истории занятий;
- создание/изменение/удаление заданий требует approved teacher;
- submit_assignment оставлен ученику только для собственной работы;
- review_assignment требует approved teacher;
- расписание можно менять только approved teacher;
- создание занятия дополнительно проверяет связь преподавателя с учеником/доской;
- интерфейс ученика окончательно переименован в «Мои задания» / «Моё расписание»;
- ученические карточки больше не показывают преподавательскую терминологию управления.

Установка:
node install_v84.mjs
В Supabase SQL Editor выполнить supabase/v84_role_security_finish.sql
npm run build

После успешной проверки:
git add .
git commit -m "v84: finish teacher student role security"
git push
