OnlineRepetitor v25 — небольшой шаг

Что добавлено:
- фильтр досок: Все / Мои / Общие со мной
- сортировка: недавние / по названию / давние
- счётчик показывает видимые доски
- нормальное пустое состояние после фильтра/поиска

Затронут только главный экран списка досок.
Supabase, Realtime, ссылки и SQL не менялись.

Установка:
1. заменить src/BoardsScreen.tsx
2. ДОБАВИТЬ содержимое v25_App_css_append.txt в самый конец src/App.css
3. npm run build
4. git add .
5. git commit -m "v25: add board filters and sorting"
6. git push
