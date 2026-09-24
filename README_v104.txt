OnlineRepetitor v104 — toolbar clipping fix

Исправлена именно первопричина:
старый базовый CSS панели содержал transform: translateY(-50%).
В v100-v103 менялся top, но transform продолжал поднимать всю панель на половину её высоты.

Теперь:
- desktop: transform полностью сброшен;
- панель начинается с безопасным отступом внутри рабочей области;
- высота считается от workspace, а не от всей страницы;
- мобильная анимация открытия сохранена.

SQL не нужен.
TypeScript: OK.

npm run build
git add .
git commit -m "v104: fix toolbar clipping root cause"
git push origin main
