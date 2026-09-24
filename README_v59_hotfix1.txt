OnlineRepetitor v59 hotfix1

Исправляет TS2345 в GraphView:
onDoubleClick выдаёт React.MouseEvent, поэтому pointerCoord теперь принимает React.MouseEvent<SVGSVGElement>.

Установка:
node install_v59_hotfix1.mjs
npm run build

После успешной сборки:
git add .
git commit -m "fix: v59 graph double click event type"
git push
