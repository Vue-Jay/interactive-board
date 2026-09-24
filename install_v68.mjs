import fs from "node:fs";
for(const p of ["src/App.tsx","src/App.css","src/backend.ts"])if(!fs.existsSync(p)){console.error("v68: не найден "+p);process.exit(1)}
fs.copyFileSync("historyStore.ts","src/historyStore.ts");

let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('import { ensureBoardAssets, getAsset, putAsset } from "./assetStore";',
'import { ensureBoardAssets, getAsset, putAsset } from "./assetStore";\nimport { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";');
a=a.replace('  const [sharing, setSharing] = useState(false);',
'  const [sharing, setSharing] = useState(false);\n  const [historyOpen,setHistoryOpen]=useState(false);\n  const [historyRows,setHistoryRows]=useState<BoardHistoryEntry[]>([]);\n  const [historyBusy,setHistoryBusy]=useState(false);\n  const [historyError,setHistoryError]=useState("");');
const anchor='  const exportBoard = async () => {';
const block=`  const openHistory=async()=>{
    if(!isRemoteBackendEnabled()){setNotice("История версий доступна при серверной синхронизации");return}
    setHistoryOpen(true);setHistoryBusy(true);setHistoryError("");
    try{setHistoryRows(await listBoardHistory(boardSummary.id,40))}
    catch(error){setHistoryError(error instanceof Error?error.message:"Не удалось загрузить историю")}
    finally{setHistoryBusy(false)}
  };
  const restoreHistoryVersion=async(entry:BoardHistoryEntry)=>{
    if(!canEdit){setNotice("У вас доступ только для просмотра");return}
    if(!window.confirm(\`Восстановить версию №\${entry.version}? Текущее состояние останется в истории после следующего сохранения.\`))return;
    setHistoryBusy(true);setHistoryError("");
    try{
      const data=parseDocument(JSON.stringify(await getBoardHistoryVersion(boardSummary.id,entry.version)));
      applyDocument(data);
      setHistoryOpen(false);
      setNotice(\`Версия №\${entry.version} восстановлена. Изменение будет сохранено как новая версия.\`);
    }catch(error){setHistoryError(error instanceof Error?error.message:"Не удалось восстановить версию")}
    finally{setHistoryBusy(false)}
  };

${anchor}`;
if(!a.includes(anchor)){console.error("v68: не найдена точка exportBoard");process.exit(1)}
a=a.replace(anchor,block);
const shareBtn='{boardSummary.role === "owner" && <button className="lesson-button" onClick={() => setSharing(true)}>Поделиться</button>}';
if(!a.includes(shareBtn)){console.error("v68: не найдена кнопка Поделиться");process.exit(1)}
a=a.replace(shareBtn,shareBtn+'\n          <button className="lesson-button history-button" onClick={()=>void openHistory()} title="История сохранённых версий доски">История</button>');
const returnMarker='      {!canEdit && <div className="viewer-banner">Только просмотр</div>}';
const modal=`      {historyOpen&&<div className="access-backdrop history-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!historyBusy)setHistoryOpen(false)}}><section className="access-modal history-modal" role="dialog" aria-modal="true" aria-label="История версий"><div className="access-head"><div><h2>История версий</h2><p>Последние сохранённые состояния доски</p></div><button disabled={historyBusy} onClick={()=>setHistoryOpen(false)} aria-label="Закрыть">×</button></div>{historyBusy&&<div className="history-empty">Загружаем…</div>}{historyError&&<div className="access-notice">{historyError}</div>}{!historyBusy&&!historyError&&historyRows.length===0&&<div className="history-empty">История пока пуста. Новые сохранения начнут появляться после установки v68.</div>}<div className="history-list">{historyRows.map((entry,index)=><div className="history-row" key={entry.id}><div><strong>{index===0?"Текущая сохранённая":\`Версия №\${entry.version}\`}</strong><span>{new Date(entry.saved_at).toLocaleString("ru-RU")} · объектов: {entry.item_count}</span></div>{canEdit&&<button disabled={historyBusy||index===0} onClick={()=>void restoreHistoryVersion(entry)}>{index===0?"Текущая":"Восстановить"}</button>}</div>)}</div><p className="share-note">Хранятся последние 100 серверных снимков. Восстановление создаёт новое состояние, старые версии не удаляются.</p></section></div>}
${returnMarker}`;
if(!a.includes(returnMarker)){console.error("v68: не найдена viewer-banner");process.exit(1)}
a=a.replace(returnMarker,modal);
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v68 · history */"))c+=`
/* v68 · history */
.history-modal{width:min(620px,calc(100vw - 28px));max-height:min(760px,calc(100vh - 32px));overflow:auto}.history-list{display:grid;gap:8px}.history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #e4e5eb;border-radius:11px}.history-row>div{display:grid;gap:3px;min-width:0}.history-row span{font-size:12px;color:#81848f}.history-row button{flex:0 0 auto}.history-empty{padding:18px;text-align:center;color:#858895}
`;
fs.writeFileSync("src/App.css",c);
console.log("v68 установлен. Выполните supabase/v68_board_history.sql, затем npm run build");
