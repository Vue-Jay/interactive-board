import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("v78 hotfix 1: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const q='className="presentation-author-only" className={presentationQuizzesRevealed ? "active" : ""}';
const f='className={`presentation-author-only ${presentationQuizzesRevealed ? "active" : ""}`}';
const q2='className="presentation-author-only" className={presentationFlashcardsFlipped ? "active" : ""}';
const f2='className={`presentation-author-only ${presentationFlashcardsFlipped ? "active" : ""}`}';
let n=0;
if(s.includes(q)){s=s.replace(q,f);n++}
if(s.includes(q2)){s=s.replace(q2,f2);n++}
if(n!==2){console.error(`v78 hotfix 1: ожидалось 2 исправления, найдено ${n}. Файл не изменён.`);process.exit(1)}
fs.writeFileSync(p,s);
console.log("v78 hotfix 1 установлен: объединены дублирующиеся className. Запустите npm run build.");
