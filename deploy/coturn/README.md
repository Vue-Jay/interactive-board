# TURN для OnlineRepetitor

Этот каталог содержит готовую схему coturn для VPS с публичным IPv4.

1. Укажите DNS A-запись `turn.example.com` на публичный IP VPS.
2. Скопируйте `.env.example` в `.env` и замените `TURN_REALM`, `TURN_PUBLIC_IP`, `TURN_SHARED_SECRET`.
3. Откройте firewall: TCP/UDP 3478 и UDP 49160-49200.
4. Запустите `docker compose up -d`.
5. В Supabase Edge Function задайте тот же `TURN_SHARED_SECRET`.
6. В Supabase задайте `TURN_URLS`:
   `turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp`
7. `TURN_CREDENTIAL_TTL` можно оставить `3600`.
8. Разверните функцию `turn-credentials` и откройте приложение заново.

В окне звонка метка `Через TURN` означает, что WebRTC действительно выбрал relay-кандидат, а не просто получил TURN в конфигурации.

Важно: если VPS сам находится за NAT, `TURN_PUBLIC_IP` должен быть его внешним адресом, а relay-порты должны пробрасываться без изменения номера порта.
