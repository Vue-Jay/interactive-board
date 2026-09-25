OnlineRepetitor v130 — безопасный путь к TURN

- клиент умеет получать временные ICE/TURN credentials через Supabase Edge Function turn-credentials;
- ответ кэшируется до истечения credentials;
- при недоступной Edge Function звонок автоматически откатывается на статическую TURN-конфигурацию или STUN;
- добавлен универсальный authenticated helper для Supabase Edge Functions;
- WebRTC использует ICE candidate pool;
- подготовлена миграция от открытых VITE_* TURN credentials к временным серверным credentials.

Следующий шаг: добавить и развернуть Edge Function turn-credentials и подключить реальный TURN-провайдер/coturn.
