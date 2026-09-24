import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='const pointerCoord=(e: React.PointerEvent<SVGSVGElement>)=>';
const neu='const pointerCoord=(e: React.MouseEvent<SVGSVGElement>)=>';
if(!s.includes(old)){console.error("hotfix: ожидаемая строка v59 не найдена. Файл не изменён.");process.exit(2)}
s=s.replace(old,neu);
fs.writeFileSync(p,s);
console.log("v59 hotfix1 установлен. Запустите npm run build");
