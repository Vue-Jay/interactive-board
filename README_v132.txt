OnlineRepetitor v132 - TURN infrastructure

Сделано:
- подготовлена Supabase Edge Function turn-credentials;
- функция проверяет текущую авторизованную Supabase-сессию;
- общий TURN-секрет не попадает во frontend;
- credentials имеют ограниченный срок действия;
- TTL ограничен диапазоном 60-86400 секунд;
- клиент v130 уже умеет автоматически запрашивать endpoint и кэшировать credentials.

Для реального запуска нужно настроить Supabase secrets:
TURN_URLS
TURN_SHARED_SECRET
TURN_CREDENTIAL_TTL (например 3600)

После этого развернуть Edge Function:
supabase functions deploy turn-credentials

TURN_SHARED_SECRET должен соответствовать shared secret на вашем TURN-сервере.
Следующий этап: реальный TURN-сервер и тест звонка между разными сетями.
