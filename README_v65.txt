OnlineRepetitor v65 — гостевой вход без регистрации

Извлеките содержимое архива в корень проекта. Вложенных v65_files нет.
SQL в этом патче не требуется.

Перед проверкой включите Anonymous Sign-Ins в Supabase Authentication.

node install_v65.mjs
npm run build

После успешной сборки:
git add .
git commit -m "v65: add guest access for share links"
git push

На /join/<token> появится «Продолжить как гость». Email и пароль не нужны.
Гость получает временную анонимную Supabase-сессию, а существующие RLS, роль ссылки,
срок действия и лимит входов продолжают применяться.
