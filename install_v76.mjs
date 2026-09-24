import fs from "node:fs";
for(const p of ["src/App.tsx","src/BoardsScreen.tsx","src/TemplatesScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v76: не найден "+p);process.exit(1)}
let a=fs.readFileSync("src/App.tsx","utf8");
if(!a.includes('import TemplatesScreen from "./TemplatesScreen";'))a=a.replace('import ProfileScreen from "./ProfileScreen";','import ProfileScreen from "./ProfileScreen";\nimport TemplatesScreen from "./TemplatesScreen";');
const profileBranch='          : section==="profile"\n          ? <ProfileScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />';
if(!a.includes(profileBranch)){console.error("v76: route anchor не найден");process.exit(1)}
a=a.replace(profileBranch,profileBranch+'\n          : section==="templates"\n          ? <TemplatesScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />');
a=a.replace('[["V / М","Выделение"],["H / Р","Рука"],["Q / Й","Петля"],["P / З","Карандаш"],["M / Ь","Маркер"],["E / У","Ластик"],["C / С","Связь / стрелка"],["F / А","Фрейм"],["N / Т","Комментарий"],["T / Е","Текст"],["S / Ы","Стикер"],["R / К","Фигуры"],["B / И","Таблица"],["X / Ч","Формула"],["Y / Н","График"],["K / Л","Чек-лист"],["G / П","Мини-тест"],["J / О","Карточка"],["U / Г","Шторка / открыть ответ"],["I / Ш","Фото / PDF"]]',
'[["V / М","Выделение"],["H / Р","Рука"],["Q / Й","Петля"],["P / З","Карандаш"],["M / Ь","Маркер"],["E / У","Ластик"],["C / С","Связь / стрелка"],["F / А","Фрейм"],["N / Т","Комментарий"],["T / Е","Текст"],["S / Ы","Стикер"],["R / К","Фигуры"],["B / И","Таблица"],["X / Ч","Формула"],["Y / Н","График"],["K / Л","Чек-лист"],["G / П","Мини-тест"],["J / О","Карточка"],["U / Г","Шторка / открыть ответ"],["I / Ш","Фото / PDF"],["L / Д","Видео / аудио по ссылке"]]');
a=a.replace('if (item && !item.locked && (item.kind === "text" || item.kind === "sticky" || item.kind === "frame" || item.kind === "comment" || item.kind === "formula" || item.kind === "table" || item.kind === "checklist" || item.kind === "quiz" || item.kind === "flashcard" || item.kind === "cover")) {',
'if (item && !item.locked && (item.kind === "text" || item.kind === "sticky" || item.kind === "frame" || item.kind === "comment" || item.kind === "formula" || item.kind === "table" || item.kind === "checklist" || item.kind === "quiz" || item.kind === "flashcard" || item.kind === "cover" || item.kind === "linkmedia")) {');
a=a.replace('if (item.kind === "table") openTableEditor(item); else if (item.kind === "formula") openFormulaEditor(item); else if (item.kind === "checklist") openChecklistEditor(item); else if (item.kind === "quiz") openQuizEditor(item); else if (item.kind === "flashcard") openFlashcardEditor(item); else startEdit(item);',
'if (item.kind === "table") openTableEditor(item); else if (item.kind === "formula") openFormulaEditor(item); else if (item.kind === "checklist") openChecklistEditor(item); else if (item.kind === "quiz") openQuizEditor(item); else if (item.kind === "flashcard") openFlashcardEditor(item); else if (item.kind === "linkmedia") openLinkMediaEditor(item); else startEdit(item);');
fs.writeFileSync("src/App.tsx",a);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
const nav='</button><button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления';
if(!b.includes(nav)){console.error("v76: boards nav anchor не найден");process.exit(1)}
b=b.replace(nav,'</button><button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны'+nav);
fs.writeFileSync("src/BoardsScreen.tsx",b);

let t=fs.readFileSync("src/TemplatesScreen.tsx","utf8");
t=t.replace('<button onClick={()=>location.href="/?section=materials"}>Материалы</button><button className="active">Шаблоны</button>',
'<button onClick={()=>location.href="/?section=materials"}>Материалы</button><button className="active">Шаблоны</button><button onClick={()=>location.href="/?section=notifications"}>Уведомления</button>');
fs.writeFileSync("src/TemplatesScreen.tsx",t);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v76 · templates finish */"))c+=`\n/* v76 · templates finish */\n.templates-content .dashboard-nav{margin-bottom:18px}.templates-grid{align-items:stretch}.template-card{min-height:220px}.template-card>div:last-child{min-width:0}.template-card p{overflow-wrap:anywhere}\n`;
fs.writeFileSync("src/App.css",c);
console.log("v76 установлен. Запустите npm run build");
