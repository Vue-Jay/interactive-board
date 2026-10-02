OnlineRepetitor v230 — полное удаление звонков

Удалено из активного проекта:
- интерфейс и стили звонков;
- BoardVideoCallPanel;
- WebRTC / STUN / TURN конфигурация;
- realtime сигнализация звонков;
- REST-хранилище сигналов;
- TURN credentials Edge Function;
- coturn deployment-конфигурация;
- VITE_WEBRTC_* из .env.example.

Добавлена миграция supabase/v230_remove_call_feature.sql, которая удаляет board_call_signals и cleanup_old_board_call_signals на сервере при применении миграции.

После распаковки приложение уже не содержит исполняемого кода звонков. Чтобы физически удалить старые файлы, оставшиеся в папке проекта от прежних версий, один раз запустите REMOVE_CALL_FILES_v230.bat.

GitHub не изменялся.
