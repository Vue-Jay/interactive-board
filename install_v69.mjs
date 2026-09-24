import fs from "node:fs";
for(const p of ["src/boardStore.ts","src/BoardsScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v69: не найден "+p);process.exit(1)}

let s=fs.readFileSync("src/boardStore.ts","utf8");
s=s.replace('export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string};',
'export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string;deletedAt?:string|null};');
s=s.replace('const rowToBoard=(row:any,role:BoardRole):BoardSummary=>({id:row.id,title:row.title,ownerId:row.owner_id,role,createdAt:row.created_at,updatedAt:row.updated_at});',
'const rowToBoard=(row:any,role:BoardRole):BoardSummary=>({id:row.id,title:row.title,ownerId:row.owner_id,role,createdAt:row.created_at,updatedAt:row.updated_at,deletedAt:row.deleted_at??null});');
s=s.replace('remoteRequest<any[]>("/rest/v1/boards?select=id,title,owner_id,created_at,updated_at&order=updated_at.desc"),',
'remoteRequest<any[]>("/rest/v1/boards?deleted_at=is.null&select=id,title,owner_id,created_at,updated_at,deleted_at&order=updated_at.desc"),');
s=s.replace('`/rest/v1/boards?id=eq.${encodeURIComponent(id)}&select=id,title,owner_id,created_at,updated_at&limit=1`',
'`/rest/v1/boards?id=eq.${encodeURIComponent(id)}&deleted_at=is.null&select=id,title,owner_id,created_at,updated_at,deleted_at&limit=1`');
s=s.replace('export const deleteBoard=async(u:string,id:string)=>{if(isRemoteBackendEnabled()){await remoteRequest(`/rest/v1/boards?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});return true}',
'export const deleteBoard=async(u:string,id:string)=>{if(isRemoteBackendEnabled()){await remoteRequest("/rest/v1/rpc/trash_board",{method:"POST",body:JSON.stringify({p_board_id:id})});return true}');
if(!s.includes("export const getTrashedBoards"))s+=`
export const getTrashedBoards=async(user:AuthUser):Promise<BoardSummary[]>=>{
 if(!isRemoteBackendEnabled())return[];
 const rows=await remoteRequest<any[]>(\`/rest/v1/boards?owner_id=eq.\${encodeURIComponent(user.id)}&deleted_at=not.is.null&select=id,title,owner_id,created_at,updated_at,deleted_at&order=deleted_at.desc\`);
 return rows.map(row=>rowToBoard(row,"owner"));
};
export const restoreBoard=async(id:string)=>{await remoteRequest("/rest/v1/rpc/restore_board",{method:"POST",body:JSON.stringify({p_board_id:id})});return true};
export const deleteBoardForever=async(id:string)=>{await remoteRequest("/rest/v1/rpc/delete_board_forever",{method:"POST",body:JSON.stringify({p_board_id:id})});return true};
`;
fs.writeFileSync("src/boardStore.ts",s);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
b=b.replace('createBoard, deleteBoard, ensureUserBoards, getUserBoards, renameBoard, getBoardAccess, changeMemberRole, removeMember,',
'createBoard, deleteBoard, deleteBoardForever, ensureUserBoards, getTrashedBoards, getUserBoards, restoreBoard, renameBoard, getBoardAccess, changeMemberRole, removeMember,');
b=b.replace(' const [filter,setFilter]=useState<BoardFilter>("all"); const [sort,setSort]=useState<BoardSort>("recent");',
' const [filter,setFilter]=useState<BoardFilter>("all"); const [sort,setSort]=useState<BoardSort>("recent"); const [trashOpen,setTrashOpen]=useState(false); const [trash,setTrash]=useState<BoardSummary[]>([]);');
b=b.replace(' const refresh=async()=>setBoards(await getUserBoards(user));',
' const refresh=async()=>setBoards(await getUserBoards(user));\n const loadTrash=async()=>{if(!isRemoteBackendEnabled()){setTrash([]);return}setTrash(await getTrashedBoards(user))};');
b=b.replace('<span>{loading?"Загрузка…":`${visible.length} из ${boards.length}`}</span>',
'<span>{loading?"Загрузка…":`${visible.length} из ${boards.length}`}</span><button className="boards-secondary trash-open-button" disabled={!isRemoteBackendEnabled()} onClick={()=>{setTrashOpen(true);void loadTrash()}}>Корзина</button>');
b=b.replace('if(confirm(`Удалить доску «${b.title}»?`)){await deleteBoard(user.id,b.id);await refresh()}',
'if(confirm(`Переместить доску «${b.title}» в корзину? Её можно будет восстановить.`)){await deleteBoard(user.id,b.id);setNotice("Доска перемещена в корзину");await refresh()}');
const end=' </main>}';
const modal=` {trashOpen&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setTrashOpen(false)}}><section className="access-modal trash-modal"><div className="access-head"><div><h2>Корзина</h2><p>Удалённые доски можно восстановить или удалить окончательно.</p></div><button onClick={()=>setTrashOpen(false)}>×</button></div>{trash.length===0?<div className="boards-empty trash-empty"><strong>Корзина пуста</strong><span>Удалённые доски появятся здесь.</span></div>:<div className="trash-list">{trash.map(board=><div className="trash-row" key={board.id}><div><strong>{board.title}</strong><span>Удалена {board.deletedAt?fmt(board.deletedAt):"недавно"}</span></div><div><button disabled={busy} onClick={async()=>{setBusy(true);try{await restoreBoard(board.id);setNotice(\`Доска «\${board.title}» восстановлена\`);await Promise.all([refresh(),loadTrash()])}catch(e){setNotice(e instanceof Error?e.message:"Не удалось восстановить доску")}finally{setBusy(false)}}}>Восстановить</button><button className="danger" disabled={busy} onClick={async()=>{if(!confirm(\`Удалить «\${board.title}» навсегда? Это действие нельзя отменить.\`))return;setBusy(true);try{await deleteBoardForever(board.id);setNotice("Доска удалена окончательно");await loadTrash()}catch(e){setNotice(e instanceof Error?e.message:"Не удалось удалить доску")}finally{setBusy(false)}}}>Удалить навсегда</button></div></div>)}</div>}<div className="trash-warning">Окончательное удаление удаляет саму доску и связанные серверные данные. Восстановление после этого невозможно.</div></section></div>}
${end}`;
if(!b.includes(end)){console.error("v69: не найден конец BoardsScreen");process.exit(1)}
b=b.replace(end,modal);
fs.writeFileSync("src/BoardsScreen.tsx",b);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v69 · board trash */"))c+=`
/* v69 · board trash */
.trash-open-button{margin-left:auto}.trash-modal{width:min(680px,calc(100vw - 28px));max-height:min(760px,calc(100vh - 32px));overflow:auto}.trash-list{display:grid;gap:8px}.trash-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid #e3e5ea;border-radius:12px}.trash-row>div:first-child{display:grid;gap:4px}.trash-row span{font-size:12px;color:#858895}.trash-row>div:last-child{display:flex;gap:7px;flex-wrap:wrap}.trash-warning{margin-top:14px;padding:10px 12px;border-radius:10px;background:#fff6f2;color:#8b5141;font-size:12px;line-height:1.45}.trash-empty{margin:10px 0}
@media(max-width:700px){.trash-row{align-items:flex-start;flex-direction:column}.trash-open-button{margin-left:0}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v69 установлен. Выполните supabase/v69_board_trash.sql, затем npm run build");
