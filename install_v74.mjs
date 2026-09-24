import fs from "node:fs";
for(const p of ["src/BoardsScreen.tsx","src/App.css","src/backupStore.ts"])if(!fs.existsSync(p)){console.error("v74: не найден "+p);process.exit(1)}
fs.copyFileSync("workspaceBackup.ts","src/workspaceBackup.ts");
let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
b=b.replace('import { importAsNewBoard, inspectBoardImport, type BoardImportPreview } from "./dashboardImport";',
'import { importAsNewBoard, inspectBoardImport, type BoardImportPreview } from "./dashboardImport";\nimport { exportWorkspace, importWorkspace, validateWorkspaceBackup, workspaceFileName, type WorkspaceBackup } from "./workspaceBackup";');
b=b.replace('const [importPreview,setImportPreview]=useState<BoardImportPreview|null>(null); const [importFileName,setImportFileName]=useState(""); const [importProgress,setImportProgress]=useState("");',
'const [importPreview,setImportPreview]=useState<BoardImportPreview|null>(null); const [importFileName,setImportFileName]=useState(""); const [importProgress,setImportProgress]=useState("");\n const [workspacePreview,setWorkspacePreview]=useState<WorkspaceBackup|null>(null); const [workspaceProgress,setWorkspaceProgress]=useState("");');

const anchor=' const confirmImport=async()=>{if(!importPreview||busy)return;setBusy(true);setImportProgress("Создаём новую доску…");try{const board=await importAsNewBoard(user,importPreview,setImportProgress);setImportPreview(null);setImportProgress("");await refresh();setNotice(`Импортирована новая доска «${board.title}»`);onOpenBoard(board)}catch(e){setNotice(e instanceof Error?e.message:"Импорт не завершён")}finally{setBusy(false)}};';
if(!b.includes(anchor)){console.error("v74: confirmImport не найден");process.exit(1)}
b=b.replace(anchor,anchor+`
 const downloadWorkspace=async()=>{if(busy)return;setBusy(true);setWorkspaceProgress("Собираем резервную копию…");try{const backup=await exportWorkspace(user,setWorkspaceProgress);const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:"application/vnd.onlinerepetitor.workspace+json"}));const link=document.createElement("a");link.href=url;link.download=workspaceFileName();link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(\`Резервная копия пространства создана · досок: \${backup.boards.length}\`)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать общую копию")}finally{setBusy(false);setWorkspaceProgress("")}};
 const chooseWorkspace=async(file:File)=>{if(file.size>750*1024*1024){setNotice("Копия пространства больше 750 МБ");return}setBusy(true);setWorkspaceProgress("Проверяем пространство…");try{const parsed=JSON.parse(await file.text());const backup=validateWorkspaceBackup(parsed);setWorkspacePreview(backup)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось прочитать копию пространства")}finally{setBusy(false);setWorkspaceProgress("")}};
 const restoreWorkspace=async()=>{if(!workspacePreview||busy)return;setBusy(true);try{const result=await importWorkspace(user,workspacePreview,setWorkspaceProgress);setWorkspacePreview(null);await refresh();setNotice(result.failed.length?\`Восстановлено: \${result.created.length}. Ошибок: \${result.failed.length}. \${result.failed[0]}\`:\`Восстановлено досок: \${result.created.length}\`)}catch(e){setNotice(e instanceof Error?e.message:"Восстановление не завершено")}finally{setBusy(false);setWorkspaceProgress("")}};
`);

const toolbar='<span>{loading?"Загрузка…":`${visible.length} из ${boards.length}`}</span><button className="boards-secondary trash-open-button"';
if(!b.includes(toolbar)){console.error("v74: toolbar anchor не найден");process.exit(1)}
b=b.replace(toolbar,`<span>{loading?"Загрузка…":\`\${visible.length} из \${boards.length}\`}</span><div className="backup-menu"><button className="boards-secondary" disabled={busy} onClick={()=>void downloadWorkspace()}>{workspaceProgress||"Скачать все мои"}</button><label className={\`boards-secondary boards-import \${busy?"disabled":""}\`}>Восстановить набор<input type="file" hidden disabled={busy} accept=".orworkspace,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void chooseWorkspace(f)}}/></label></div><button className="boards-secondary trash-open-button"`);

const modalAnchor=' {importPreview&&<div className="access-backdrop"';
if(!b.includes(modalAnchor)){console.error("v74: import modal anchor не найден");process.exit(1)}
const modal=` {workspacePreview&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setWorkspacePreview(null)}}><section className="access-modal workspace-modal"><div className="access-head"><div><h2>Восстановить набор досок</h2><p>Копия от {fmt(workspacePreview.exportedAt)}</p></div><button disabled={busy} onClick={()=>setWorkspacePreview(null)}>×</button></div><div className="workspace-summary"><strong>{workspacePreview.boards.length}</strong><span>досок будет создано как новые</span></div><div className="workspace-board-list">{workspacePreview.boards.slice(0,12).map((board,index)=><div key={index}><strong>{board.title}</strong><span>{board.document.items.length} объектов · {board.assets.length} вложений</span></div>)}{workspacePreview.boards.length>12&&<small>И ещё {workspacePreview.boards.length-12}…</small>}</div><p className="share-note">Существующие доски не перезаписываются. Каждая доска из копии будет создана отдельно.</p>{workspaceProgress&&<div className="access-notice">{workspaceProgress}</div>}<div className="access-actions"><button disabled={busy} onClick={()=>setWorkspacePreview(null)}>Отмена</button><button className="boards-create" disabled={busy} onClick={()=>void restoreWorkspace()}>{busy?"Восстанавливаем…":"Восстановить все"}</button></div></section></div>}\n\n`;
b=b.replace(modalAnchor,modal+modalAnchor);
fs.writeFileSync("src/BoardsScreen.tsx",b);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v74 · workspace backups */"))c+=`
/* v74 · workspace backups */
.backup-menu{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.workspace-modal{width:min(640px,calc(100vw - 28px));max-height:min(760px,calc(100vh - 32px));overflow:auto}.workspace-summary{display:flex;align-items:baseline;gap:9px;padding:13px;border:1px solid #e4e5eb;border-radius:12px;margin:12px 0}.workspace-summary strong{font-size:28px}.workspace-summary span{color:#777b86}.workspace-board-list{display:grid;gap:6px;max-height:300px;overflow:auto}.workspace-board-list>div{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:9px;background:#f6f7f9}.workspace-board-list span{font-size:12px;color:#7d818c;text-align:right}
@media(max-width:700px){.backup-menu{width:100%}.backup-menu>*{flex:1}.workspace-board-list>div{flex-direction:column}.workspace-board-list span{text-align:left}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v74 установлен. Запустите npm run build");
