OnlineRepetitor — YouTube hotfix 3

По скриншоту причина чёрного/серого экрана определена точно:
Chrome пишет «Не удалось найти IP-адрес сервера www.youtube.com».
То есть iframe уже не падает с 153, но сеть/DNS пользователя не может открыть www.youtube.com.

Hotfix 3:
- возвращает iframe на youtube-nocookie.com, который у пользователя уже открывался;
- СОХРАНЯЕТ исправление hotfix2 на уровне Vercel: Referrer-Policy strict-origin-when-cross-origin;
- сохраняет origin + widget_referrer;
- Storage не используется.

Именно комбинации youtube-nocookie + корректного Referer раньше не было:
первоначальный nocookie был до серверного Referrer-Policy.

Установка:
node install_youtube153_hotfix3.mjs
npm run build

После успешной сборки:
git add .
git commit -m "fix: use reachable privacy YouTube embed"
git push

Дождитесь Vercel deployment, затем Ctrl+F5.
