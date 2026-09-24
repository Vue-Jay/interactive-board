import fs from "node:fs";
const p="src/workspaceBackup.ts";
if(!fs.existsSync(p)){console.error("v74 hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='import { validatePortableBundle, type PortableAsset, type PortableBoardBundle } from "./backupStore";';
const neu='import { validatePortableBundle, type PortableAsset } from "./backupStore";';
if(s.includes(old))s=s.replace(old,neu);
else if(!s.includes(neu)){console.error("v74 hotfix: ожидаемый импорт не найден");process.exit(1)}
fs.writeFileSync(p,s);
console.log("v74 hotfix 1 установлен. Запустите npm run build");
