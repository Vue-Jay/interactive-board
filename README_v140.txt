OnlineRepetitor v140 - звонки завершены

Финальные исправления:
- исправлен разбор TURN_URLS в Supabase Edge Function;
- добавлена валидация TURN URL и Cache-Control: no-store для временных credentials;
- сообщения об ошибке соединения больше не исчезают после reset звонка;
- завершение/отмена звонка показываются пользователю отдельным уведомлением;
- deploy/coturn обновлён до coturn 4.18.0;
- realm, public IP и TURN shared secret передаются через .env;
- приложена пошаговая инструкция firewall, Supabase secrets и TURN_URLS;
- service-worker cache обновлён до v140.

Проверка:
- TypeScript `tsc -b`: успешно.
- `npm run build`: TypeScript успешно, Vite в текущем Linux-контейнере останавливается
  на отсутствующем optional native binding Rolldown.

Статус:
Разработка звонков завершена. Для работы relay в реальном интернете нужно один раз
развернуть приложенный coturn на VPS и указать реальные DNS/IP/secret.
