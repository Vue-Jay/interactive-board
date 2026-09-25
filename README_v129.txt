OnlineRepetitor v129 — TURN-ready видеозвонки

Сделано:
- WebRTC больше не зашит на единственный STUN-сервер;
- добавлена конфигурация ICE через переменные окружения Vite;
- можно указать несколько STUN и TURN/TURNS URL;
- TURN включается только при полном наборе URL + username + credential;
- добавлен небольшой ICE candidate pool для более быстрого установления соединения;
- ошибка соединения теперь отдельно подсказывает отсутствие TURN;
- без TURN приложение сохраняет прежнее поведение и продолжает работать через STUN.

Настройка Vercel:
VITE_WEBRTC_TURN_URLS=turn:your-turn-host:3478,turns:your-turn-host:5349
VITE_WEBRTC_TURN_USERNAME=...
VITE_WEBRTC_TURN_CREDENTIAL=...

Важно: постоянный TURN credential в клиентском VITE_* виден пользователю. Для production предпочтительны краткоживущие TURN credentials, выдаваемые сервером/Edge Function. Этот патч готовит клиент к TURN и позволяет проверить выбранного провайдера без переписывания звонков.
