import fs from "node:fs";
const p="src/boardStore.ts";
if(!fs.existsSync(p)){console.error("v70 hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='export const getTrashedBoards=async(user:AuthUser):Promise<BoardSummary[]>=>{';
const neu='export const getTrashedBoards=async(_user:AuthUser):Promise<BoardSummary[]>=>{';
if(s.includes(old))s=s.replace(old,neu);
else if(!s.includes(neu)){console.error("v70 hotfix: сигнатура getTrashedBoards не найдена");process.exit(1)}
fs.writeFileSync(p,s);
console.log("v70 hotfix установлен. Запустите npm run build");
