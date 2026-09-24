import fs from "node:fs";
const p="src/linkMedia.tsx";
if(!fs.existsSync(p)){console.error("hotfix3: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='return{kind:"youtube",sourceUrl:u.href,embedUrl:`https://www.youtube.com/embed/${id}?${qs.toString()}`,host}}';
const neu='return{kind:"youtube",sourceUrl:u.href,embedUrl:`https://www.youtube-nocookie.com/embed/${id}?${qs.toString()}`,host}}';
if(!s.includes(old)){console.error("hotfix3: текущий youtube.com embed не найден. Сначала должен быть установлен hotfix2.");process.exit(1)}
s=s.replace(old,neu);
fs.writeFileSync(p,s);
console.log("hotfix3 установлен: youtube-nocookie.com + уже настроенный Referer. Запустите npm run build.");
