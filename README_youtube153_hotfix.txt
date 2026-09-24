OnlineRepetitor — hotfix YouTube Error 153

Причина: YouTube теперь блокирует embedded playback, если запрос не содержит HTTP Referer / идентификацию клиента.

Исправление:
- YouTube embed использует официальный youtube.com/embed;
- iframe явно задаёт referrerPolicy=strict-origin-when-cross-origin;
- передаются origin текущего OnlineRepetitor и widget_referrer;
- Vimeo и прямые audio/video ссылки не меняются;
- файлы по-прежнему не загружаются в Storage.

Установка:
node install_v75_youtube153_hotfix.mjs
npm run build

После успешной проверки:
git add .
git commit -m "fix: provide YouTube embed referrer identity"
git push
