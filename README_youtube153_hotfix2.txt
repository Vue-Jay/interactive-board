OnlineRepetitor — YouTube Error 153 hotfix 2

Первый фикс менял iframe, но этого недостаточно, если заголовок Referrer-Policy самого сайта не гарантирован.

Этот фикс:
1. Явно задаёт для ВСЕГО Vercel-сайта:
   Referrer-Policy: strict-origin-when-cross-origin
2. Сохраняет SPA rewrite.
3. Расширяет allow iframe до рекомендуемого набора возможностей.
4. Не загружает видео в Supabase Storage. Архитектура «только ссылка» остаётся.

ВАЖНО:
Локальной npm-сборки недостаточно для проверки этого исправления, потому что главный фикс находится в vercel.json и начинает работать только после нового deployment.

Установка:
node install_youtube153_hotfix2.mjs
npm run build

Если build успешен:
git add .
git commit -m "fix: send referrer policy for YouTube embeds"
git push

После того как Vercel завершит deployment:
1. Откройте onlinerepetitor.vercel.app.
2. Сделайте Ctrl+F5.
3. Проверьте тот же ролик.
