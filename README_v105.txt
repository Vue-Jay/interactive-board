OnlineRepetitor v105 — typography + landscape mobile

- Увеличены слишком мелкие шрифты интерфейса.
- Верхняя панель, меню, подсказки, модальные окна и контекстные элементы стали читабельнее.
- PWA orientation = landscape.
- Для телефона добавлена отдельная landscape-компоновка доски.
- В портретном браузерном режиме показывается экран «Поверните телефон горизонтально».
- Service worker cache обновлён до v105.

SQL не нужен.
TypeScript: OK.

npm run build
git add .
git commit -m "v105: improve typography and landscape mobile"
git push origin main
