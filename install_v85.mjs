import fs from "node:fs";
for(const p of ["src/App.tsx","src/App.css","src/backend.ts"]){
  if(!fs.existsSync(p)){console.error("v85: не найден "+p);process.exit(1)}
}
fs.copyFileSync("src/commentThreadsStore.ts","src/commentThreadsStore.ts");

let a=fs.readFileSync("src/App.tsx","utf8");
if(!a.includes('from "./commentThreadsStore"')){
  const anchor='import { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";';
  if(!a.includes(anchor)){console.error("v85: не найден импорт historyStore. Нужна актуальная версия после v68.");process.exit(1)}
  a=a.replace(anchor,anchor+'\nimport { createBoardComment, listBoardComments, setBoardCommentResolved, type BoardCommentThread } from "./commentThreadsStore";');
}

const stateAnchor='  const [historyError,setHistoryError]=useState("");';
if(!a.includes("commentThreadsOpen")){
  if(!a.includes(stateAnchor)){console.error("v85: не найден блок history-state");process.exit(1)}
  a=a.replace(stateAnchor,stateAnchor+`
  const [commentThreadsOpen,setCommentThreadsOpen]=useState(false);
  const [commentThreads,setCommentThreads]=useState<BoardCommentThread[]>([]);
  const [commentThreadsBusy,setCommentThreadsBusy]=useState(false);
  const [commentThreadsError,setCommentThreadsError]=useState("");
  const [commentDraft,setCommentDraft]=useState("");
  const [commentReplyTo,setCommentReplyTo]=useState<string|null>(null);`);
}

const handlerAnchor='  const openHistory = async () => {';
if(!a.includes("openCommentThreads")){
  const pos=a.indexOf(handlerAnchor);
  if(pos<0){console.error("v85: не найдена функция openHistory");process.exit(1)}
  const handlers=`  const refreshCommentThreads=async()=>{if(!boardId)return;setCommentThreadsBusy(true);setCommentThreadsError("");try{setCommentThreads(await listBoardComments(boardId))}catch(e){setCommentThreadsError(e instanceof Error?e.message:"Не удалось загрузить комментарии")}finally{setCommentThreadsBusy(false)}};
  const openCommentThreads=async()=>{setCommentThreadsOpen(true);await refreshCommentThreads()};
  const submitCommentThread=async()=>{const body=commentDraft.trim();if(!body||!boardId)return;setCommentThreadsBusy(true);setCommentThreadsError("");try{await createBoardComment(boardId,body,commentReplyTo);setCommentDraft("");setCommentReplyTo(null);setCommentThreads(await listBoardComments(boardId))}catch(e){setCommentThreadsError(e instanceof Error?e.message:"Не удалось отправить комментарий")}finally{setCommentThreadsBusy(false)}};
  const toggleCommentResolved=async(row:BoardCommentThread)=>{setCommentThreadsBusy(true);try{await setBoardCommentResolved(row.id,!row.resolved);setCommentThreads(await listBoardComments(boardId))}catch(e){setCommentThreadsError(e instanceof Error?e.message:"Не удалось изменить статус")}finally{setCommentThreadsBusy(false)}};

`;
  a=a.slice(0,pos)+handlers+a.slice(pos);
}

if(!a.includes('title="Обсуждения доски"')){
  const hbtn='<button className="lesson-button history-button" onClick={()=>void openHistory()} title="История сохранённых версий доски">История</button>';
  if(!a.includes(hbtn)){console.error("v85: не найдена кнопка История");process.exit(1)}
  a=a.replace(hbtn,hbtn+'\n          <button className="lesson-button comments-thread-button" onClick={()=>void openCommentThreads()} title="Обсуждения доски">Обсуждения</button>');
}

if(!a.includes('aria-label="Обсуждения"')){
  const modalAnchor='      {historyOpen&&';
  const pos=a.indexOf(modalAnchor);
  if(pos<0){console.error("v85: не найден history modal");process.exit(1)}
  const modal=`      {commentThreadsOpen&&<div className="access-backdrop comment-thread-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!commentThreadsBusy)setCommentThreadsOpen(false)}}><section className="access-modal comment-thread-modal" role="dialog" aria-modal="true" aria-label="Обсуждения"><div className="access-head"><div><h2>Обсуждения</h2><p>Комментарии, ответы и @упоминания участников</p></div><button disabled={commentThreadsBusy} onClick={()=>setCommentThreadsOpen(false)} aria-label="Закрыть">×</button></div>{commentThreadsError&&<div className="access-notice">{commentThreadsError}</div>}<div className="comment-compose">{commentReplyTo&&<div className="comment-reply-chip">Ответ на комментарий <button onClick={()=>setCommentReplyTo(null)}>×</button></div>}<textarea value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder={commentReplyTo?"Напишите ответ…":"Комментарий… Используйте @имя для упоминания"} maxLength={4000}/><button disabled={commentThreadsBusy||!commentDraft.trim()} onClick={()=>void submitCommentThread()}>{commentReplyTo?"Ответить":"Отправить"}</button></div>{commentThreadsBusy&&commentThreads.length===0&&<div className="history-empty">Загружаем…</div>}<div className="comment-thread-list">{commentThreads.filter(x=>!x.parent_id).map(root=><div className={\`comment-thread \${root.resolved?"resolved":""}\`} key={root.id}><div className="comment-thread-head"><strong>{root.author_name}</strong><span>{new Date(root.created_at).toLocaleString("ru-RU")}</span></div><p>{root.body}</p><div className="comment-thread-actions"><button onClick={()=>setCommentReplyTo(root.id)}>Ответить</button>{canEdit&&<button disabled={commentThreadsBusy} onClick={()=>void toggleCommentResolved(root)}>{root.resolved?"Вернуть":"Решено"}</button>}</div>{commentThreads.filter(x=>x.parent_id===root.id).map(reply=><div className="comment-reply" key={reply.id}><div><strong>{reply.author_name}</strong><span>{new Date(reply.created_at).toLocaleString("ru-RU")}</span></div><p>{reply.body}</p></div>)}</div>)}</div>{!commentThreadsBusy&&commentThreads.length===0&&<div className="history-empty">Обсуждений пока нет.</div>}</section></div>}\n`;
  a=a.slice(0,pos)+modal+a.slice(pos);
}
fs.writeFileSync("src/App.tsx",a);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v85 · comment threads */"))c+=`
/* v85 · comment threads */
.comment-thread-modal{width:min(680px,calc(100vw - 28px));max-height:min(820px,calc(100vh - 32px));overflow:auto}.comment-compose{display:grid;grid-template-columns:1fr auto;gap:8px;margin:12px 0 16px}.comment-compose textarea{grid-column:1/-1;min-height:82px;resize:vertical;border:1px solid #dfe0e8;border-radius:11px;padding:10px 12px;font:inherit}.comment-reply-chip{grid-column:1/-1;font-size:12px;color:#6d7080;display:flex;gap:8px;align-items:center}.comment-reply-chip button,.comment-thread-actions button{border:0;background:transparent;color:#5b5dc4;cursor:pointer}.comment-thread-list{display:grid;gap:10px}.comment-thread{border:1px solid #e1e2e9;background:#fff;border-radius:12px;padding:11px 12px}.comment-thread.resolved{opacity:.62}.comment-thread-head,.comment-reply>div{display:flex;justify-content:space-between;gap:12px}.comment-thread-head span,.comment-reply span{font-size:11px;color:#8a8d98}.comment-thread p,.comment-reply p{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0}.comment-thread-actions{display:flex;gap:10px}.comment-reply{margin:9px 0 0 18px;padding:9px 10px;border-left:2px solid #d9daf1;background:#f8f8fc;border-radius:0 9px 9px 0}
`;
fs.writeFileSync("src/App.css",c);
console.log("v85 установлен: серверные обсуждения, ответы, @упоминания и статус «Решено» добавлены.");
console.log("Выполните supabase/v85_comment_threads.sql, затем npm run build.");
