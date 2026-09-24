import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("Не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const bad='import { applyProfileAppearance,getProfileSettings } from "./profileStore";';
if(!s.includes(bad)){console.error("Не найден импорт v51. Возможно, исправление уже применено.");process.exit(1)}
s=s.replace(bad,"");
fs.writeFileSync(p,s);
console.log("Исправлено: удалён неиспользуемый импорт из src/App.tsx");
