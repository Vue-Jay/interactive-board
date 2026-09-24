import fs from "node:fs";
const app="src/App.tsx",boards="src/BoardsScreen.tsx",students="src/StudentsScreen.tsx",cssp="src/App.css";
for(const p of [app,boards,students,cssp])if(!fs.existsSync(p)){console.error("v40: не найден "+p);process.exit(1)}
const patch=(text,needle,repl,label)=>{if(text.includes(repl))return text;if(!text.includes(needle)){console.error("v40: не найден фрагмент "+label);process.exit(1)}return text.replace(needle,repl)};
let a=fs.readFileSync(app,"utf8");
a=patch(a,'import StudentsScreen from "./StudentsScreen";','import StudentsScreen from "./StudentsScreen";\nimport AssignmentsScreen from "./AssignmentsScreen";',"import");
a=patch(a,'{route.kind === "home" && (new URLSearchParams(window.location.search).get("section")==="students"\n          ? <StudentsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />\n          : <BoardsScreen user={authUser} onOpenBoard={(board) => navigate(`/board/${board.id}`)} onLogout={logout} />)}',
`{route.kind === "home" && (()=>{const section=new URLSearchParams(window.location.search).get("section");return section==="students"
          ? <StudentsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(\`/board/\${board.id}\`)} />
          : section==="assignments"
          ? <AssignmentsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(\`/board/\${board.id}\`)} />
          : <BoardsScreen user={authUser} onOpenBoard={(board) => navigate(\`/board/\${board.id}\`)} onLogout={logout} />})()}`,"root section");
a=patch(a,'<button onClick={()=>{setPresentation(true);setPresentationFrameIndex(0);setPresentationSlidesOpen(false);setLessonPanelOpen(false)}}>▶<span>Презентация</span></button>',
'<button onClick={()=>{setPresentation(true);setPresentationFrameIndex(0);setPresentationSlidesOpen(false);setLessonPanelOpen(false)}}>▶<span>Презентация</span></button>\n          <button onClick={()=>{window.history.pushState({},"","/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>✓<span>Задания</span></button>',"lesson assignments");
fs.writeFileSync(app,a,"utf8");

let b=fs.readFileSync(boards,"utf8");
b=patch(b,'<button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button><button disabled title="Появится в следующих этапах">Расписание</button>',
'<button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button><button onClick={()=>{window.history.pushState({}, "", "/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button><button disabled title="Появится в следующих этапах">Расписание</button>',"boards nav");
fs.writeFileSync(boards,b,"utf8");

let st=fs.readFileSync(students,"utf8");
st=patch(st,'<button className="active">Ученики</button><button disabled>Расписание</button>',
'<button className="active">Ученики</button><button onClick={()=>{window.history.pushState({},"","/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button><button disabled>Расписание</button>',"students nav");
fs.writeFileSync(students,st,"utf8");

let css=fs.readFileSync(cssp,"utf8");
if(!css.includes("/* v40 · assignments */"))css+=`
/* v40 · assignments */
.assignments-shell{min-height:100vh;background:#f6f6f9;color:#252631}.assignments-content{max-width:1180px;margin:0 auto;padding:22px 24px 50px}.assignment-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:18px 0}.assignment-stats button{display:flex;flex-direction:column;align-items:flex-start;padding:14px;border:1px solid #e4e4ec;border-radius:12px;background:#fff;cursor:pointer}.assignment-stats button.active{border-color:#aaa9ee;background:#f3f2ff}.assignment-stats b{font-size:22px}.assignment-stats span{font-size:10px;color:#777b89}.assignment-list{display:grid;gap:9px}.assignment-card{position:relative;border:1px solid #e5e5ed;border-radius:13px;background:#fff;overflow:hidden}.assignment-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#9a9dac}.assignment-card.status-submitted:before{background:#e0a22c}.assignment-card.status-reviewed:before{background:#43a96e}.assignment-main{width:100%;padding:16px 92px 16px 18px;text-align:left;background:transparent;cursor:pointer}.assignment-main h3{margin:5px 0;font-size:15px}.assignment-main p{margin:0 0 10px;color:#666a77;font-size:12px;line-height:1.45}.assignment-main>div{display:flex;gap:13px;flex-wrap:wrap;font-size:10px;color:#858895}.assignment-main>div strong{color:#3d8d5e}.assignment-status{font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.4px;color:#686b7b}.assignment-delete{position:absolute;right:12px;top:12px;padding:6px 8px;border-radius:7px;background:#fff0f0;color:#a23f3f;font-size:9px;font-weight:800;cursor:pointer}.assignment-modal{max-width:680px}.assignment-form{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}.assignment-form label,.assignment-answer,.assignment-review-grid label{display:grid;gap:5px}.assignment-form label.wide{grid-column:1/-1}.assignment-form span,.assignment-answer span,.assignment-review-grid span{font-size:10px;font-weight:800;color:#626574}.assignment-form input,.assignment-form select,.assignment-form textarea,.assignment-answer textarea,.assignment-review-grid input,.assignment-review-grid textarea{width:100%;box-sizing:border-box;border:1px solid #dddde7;border-radius:9px;padding:9px 10px;font:inherit;resize:vertical}.assignment-detail{padding:12px;margin:12px 0;background:#f8f8fb;border-radius:10px}.assignment-detail p{white-space:pre-wrap;font-size:12px;line-height:1.5}.assignment-answer{margin:12px 0}.assignment-review-grid{display:grid;grid-template-columns:140px 1fr;gap:10px;margin:12px 0}.assignment-feedback{padding:12px;border-radius:10px;background:#f0f8f3;margin:12px 0}.assignment-feedback p{margin:5px 0 0;font-size:11px}.lesson-control-grid{grid-template-columns:repeat(3,1fr)}
@media(max-width:720px){.assignments-content{padding:14px}.assignment-stats{grid-template-columns:1fr 1fr}.assignment-form,.assignment-review-grid{grid-template-columns:1fr}.assignment-form label.wide{grid-column:auto}.assignment-main{padding-right:18px;padding-top:46px}.assignment-delete{top:10px}}
`;
fs.writeFileSync(cssp,css,"utf8");
console.log("v40 установлен. Выполните supabase/v40_assignments.sql, затем npm run build");
