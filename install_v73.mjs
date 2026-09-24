import fs from "node:fs";
for(const p of ["src/BoardsScreen.tsx","src/App.css","src/backupStore.ts"])if(!fs.existsSync(p)){console.error("v73: не найден "+p);process.exit(1)}
fs.copyFileSync("dashboardImport.ts","src/dashboardImport.ts");
let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
b=b.replace('import { listNotifications } from "./notificationsStore";','import { listNotifications } from "./notificationsStore";\nimport { importAsNewBoard, inspectBoardImport, type BoardImportPreview } from "./dashboardImport";');
b=b.replace('const [shareLinks,setShareLinks]=useState<BoardShareLink[]>([]); const [createdUrl,setCreatedUrl]=useState("");',
'const [shareLinks,setShareLinks]=useState<BoardShareLink[]>([]); const [createdUrl,setCreatedUrl]=useState("");\n const [importPreview,setImportPreview]=useState<BoardImportPreview|null>(null); const [importFileName,setImportFileName]=useState(""); const [importProgress,setImportProgress]=useState("");');

const anchor=' const saveRename=async(b:BoardSummary)=>{await renameBoard(user.id,b.id,draftTitle);setEditingId(null);await refresh()};';
if(!b.includes(anchor)){console.error("v73: anchor saveRename не найден");process.exit(1)}
b=b.replace(anchor,anchor+`
 const chooseImport=async(file:File)=>{setBusy(true);setImportProgress("Проверяем файл…");try{const preview=await inspectBoardImport(file);setImportPreview(preview);setImportFileName(file.name);setImportProgress("")}catch(e){setNotice(e instanceof Error?e.message:"Не удалось прочитать резервную копию");setImportProgress("")}finally{setBusy(false)}};
 const confirmImport=async()=>{if(!importPreview||busy)return;setBusy(true);setImportProgress("Создаём новую доску…");try{const board=await importAsNewBoard(user,importPreview,setImportProgress);setImportPreview(null);setImportProgress("");await refresh();setNotice(\`Импортирована новая доска «\${board.title}»\`);onOpenBoard(board)}catch(e){setNotice(e instanceof Error?e.message:"Импорт не завершён")}finally{setBusy(false)}};
`);

const heading='<button className="boards-create" disabled={busy} onClick={()=>void add()}>+ Новая доска</button>';
if(!b.includes(heading)){console.error("v73: кнопка создания не найдена");process.exit(1)}
b=b.replace(heading,`<div className="boards-heading-actions"><label className={\`boards-secondary boards-import \${busy?"disabled":""}\`}>Импортировать<input type="file" hidden disabled={busy} accept=".orboard,.json,application/json,application/vnd.onlinerepetitor.board+json" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void chooseImport(f)}}/></label>${heading}</div>`);

const modalAnchor=' {manage&&<div className="access-backdrop"';
if(!b.includes(modalAnchor)){console.error("v73: modal anchor не найден");process.exit(1)}
const modal=` {importPreview&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setImportPreview(null)}}><section className="access-modal import-board-modal"><div className="access-head"><div><h2>Импорт новой доски</h2><p>{importFileName}</p></div><button disabled={busy} onClick={()=>setImportPreview(null)}>×</button></div><div className="import-summary"><div><strong>{importPreview.title}</strong><span>Название доски</span></div><div><strong>{importPreview.objects}</strong><span>Объектов</span></div><div><strong>{importPreview.assets}</strong><span>Вложений</span></div><div><strong>{importPreview.format==="orboard"?"ORBOARD":importPreview.format==="legacy"?"Старый bundle":"JSON"}</strong><span>Формат</span></div></div><p className="share-note">Импорт создаст <b>новую отдельную доску</b>. Существующие доски изменены не будут. Изображения и PDF будут перенесены вместе с копией.</p>{importProgress&&<div className="access-notice">{importProgress}</div>}<div className="access-actions"><button disabled={busy} onClick={()=>setImportPreview(null)}>Отмена</button><button className="boards-create" disabled={busy} onClick={()=>void confirmImport()}>{busy?"Импортируем…":"Создать из копии"}</button></div></section></div>}\n\n`;
b=b.replace(modalAnchor,modal+modalAnchor);
fs.writeFileSync("src/BoardsScreen.tsx",b);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v73 · dashboard import */"))c+=`
/* v73 · dashboard import */
.boards-heading-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.boards-import{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.boards-import.disabled{opacity:.55;pointer-events:none}.import-board-modal{width:min(620px,calc(100vw - 28px))}.import-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.import-summary>div{padding:12px;border:1px solid #e4e5eb;border-radius:11px;display:grid;gap:4px}.import-summary strong{overflow:hidden;text-overflow:ellipsis}.import-summary span{font-size:11px;color:#858895}.access-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
@media(max-width:700px){.boards-heading-actions{width:100%}.boards-heading-actions>*{flex:1}.import-summary{grid-template-columns:1fr 1fr}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v73 установлен. Запустите npm run build");
