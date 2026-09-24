import fs from "node:fs";
const appPath="src/App.tsx",boardsPath="src/BoardsScreen.tsx",cssPath="src/App.css";
for(const p of [appPath,boardsPath,cssPath,"src/StudentsScreen.tsx","src/studentsStore.ts"])if(!fs.existsSync(p)){console.error(`v35: не найден ${p}`);process.exit(1);}
let app=fs.readFileSync(appPath,"utf8"), boards=fs.readFileSync(boardsPath,"utf8"), css=fs.readFileSync(cssPath,"utf8");
const patch=(t,n,r,l)=>{if(t.includes(r))return t;if(!t.includes(n)){console.error(`v35: не найден фрагмент «${l}»`);process.exit(1);}return t.replace(n,r);};

app=patch(app,
'import BoardsScreen from "./BoardsScreen";',
'import BoardsScreen from "./BoardsScreen";\nimport StudentsScreen from "./StudentsScreen";',
"Students import");

app=patch(app,
`        {route.kind === "home" && <BoardsScreen user={authUser} onOpenBoard={(board) => navigate(\`/board/\${board.id}\`)} onLogout={logout} />}`,
`        {route.kind === "home" && (new URLSearchParams(window.location.search).get("section")==="students"
          ? <StudentsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(\`/board/\${board.id}\`)} />
          : <BoardsScreen user={authUser} onOpenBoard={(board) => navigate(\`/board/\${board.id}\`)} onLogout={logout} />)}`,
"home route");

boards=patch(boards,
`<section className="boards-content"><div className="boards-heading-row"><div><h1>Мои доски</h1>`,
`<section className="boards-content"><nav className="dashboard-nav"><button className="active">Доски</button><button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button><button disabled title="Появится в следующих этапах">Расписание</button><button disabled title="Появится в следующих этапах">Материалы</button></nav><div className="boards-heading-row"><div><h1>Мои доски</h1>`,
"dashboard nav");

fs.writeFileSync(appPath,app,"utf8");fs.writeFileSync(boardsPath,boards,"utf8");

if(!css.includes("/* v35 · students */")){
css+=`

/* v35 · students */
.dashboard-nav{display:flex;gap:6px;margin:0 0 18px;padding:5px;background:#f2f2f8;border-radius:12px;width:max-content;max-width:100%;overflow:auto}
.dashboard-nav button{border:0;background:transparent;padding:8px 13px;border-radius:8px;font-weight:750;color:#676978;cursor:pointer;white-space:nowrap}
.dashboard-nav button.active{background:#fff;color:#36386d;box-shadow:0 1px 5px rgba(30,32,70,.08)}
.dashboard-nav button:disabled{opacity:.42;cursor:default}
.students-shell{min-height:100vh;background:#f7f7fb;color:#292b38}
.students-header{height:68px;padding:0 28px;background:#fff;border-bottom:1px solid #e8e8ef;display:flex;align-items:center;justify-content:space-between}
.students-header>div{display:flex;align-items:center;gap:14px}.students-header>div>div{display:flex;flex-direction:column}.students-header strong{font-size:17px}.students-header span{font-size:11px;color:#7a7d8c}
.students-content{max-width:1280px;margin:0 auto;padding:28px}
.students-toolbar{display:flex;gap:8px;margin-bottom:14px}.students-toolbar input{flex:1;min-height:40px;border:1px solid #dddde7;border-radius:10px;padding:0 13px;background:#fff}.students-toolbar button,.students-primary{border:0;border-radius:9px;background:#5355c9;color:#fff;font-weight:750;padding:0 14px;cursor:pointer}
.students-layout{display:grid;grid-template-columns:minmax(300px,.85fr) minmax(430px,1.3fr);gap:18px;align-items:start}
.students-list,.student-card{background:#fff;border:1px solid #e8e8ef;border-radius:15px;box-shadow:0 8px 25px rgba(40,42,80,.04)}
.students-list{padding:8px;display:grid;gap:4px;max-height:calc(100vh - 180px);overflow:auto}
.student-row{display:flex;text-align:left;gap:11px;padding:11px;border:0;background:transparent;border-radius:10px;cursor:pointer}.student-row:hover,.student-row.active{background:#f1f0ff}.student-row>span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:2px}.student-row b{font-size:13px}.student-row small{color:#777b89;overflow:hidden;text-overflow:ellipsis}.student-row em{font-style:normal;font-size:10px;color:#9a9ca8}
.student-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:grid;place-items:center;background:#e9e8ff;color:#5355c9;font-weight:850}.student-avatar.large{width:52px;height:52px;flex-basis:52px;font-size:18px}
.student-card{padding:20px}.student-placeholder{min-height:300px;display:grid;place-content:center;text-align:center;color:#8b8e9d;gap:5px}
.student-card-head{display:flex;gap:13px;align-items:center}.student-card-head h2{margin:0;font-size:20px}.student-card-head p{margin:3px 0 0;color:#777b89;font-size:12px}
.student-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.student-stat-grid>div{padding:12px;border-radius:10px;background:#f7f7fb;display:flex;flex-direction:column}.student-stat-grid b{font-size:14px}.student-stat-grid span{font-size:10px;color:#858896}
.student-field{display:grid;gap:6px;margin:13px 0}.student-field>span{font-size:11px;font-weight:800;color:#555867}.student-field input,.student-field textarea{border:1px solid #dddde7;border-radius:9px;padding:10px 11px;font:inherit;resize:vertical}.students-primary{min-height:38px}
.student-boards{margin-top:22px;border-top:1px solid #ececf2;padding-top:14px}.student-boards h3{font-size:13px;margin:0 0 8px}.student-boards>button{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:10px;border:0;border-radius:9px;background:#f8f8fb;cursor:pointer;margin-top:5px}.student-boards>button>span{display:flex;flex-direction:column}.student-boards small{color:#888b98;font-size:10px}.student-boards>button>strong{font-size:10px;color:#5355c9}
@media(max-width:820px){.students-layout{grid-template-columns:1fr}.students-list{max-height:360px}.students-content{padding:16px}.students-header{padding:0 16px}}
`;
fs.writeFileSync(cssPath,css,"utf8");
}
console.log("v35 установлен: раздел «Ученики», карточки, заметки, теги и связанные доски.");
console.log("Выполните npm run build");
