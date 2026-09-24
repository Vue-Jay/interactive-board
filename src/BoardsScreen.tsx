import { useEffect, useMemo, useState } from "react";
import { BOARD_ROLE_LABELS, isRemoteBackendEnabled, type AuthUser, type BoardRole } from "./authStore";
import { createBoard, deleteBoard, deleteBoardForever, ensureUserBoards, getTrashedBoards, getUserBoards, restoreBoard, renameBoard, getBoardAccess, changeMemberRole, removeMember, type BoardAccessMember, type BoardInvitation, type BoardSummary } from "./boardStore";
import { boardShareUrl, clearPendingShareToken, createBoardShareLink, listBoardShareLinks, pendingShareToken, redeemBoardShareLink, revokeBoardShareLink, type BoardShareLink, type ShareRole } from "./shareLinks";

type Props={user:AuthUser;onOpenBoard:(b:BoardSummary)=>void;onLogout:()=>void};
type BoardFilter="all"|"mine"|"shared";
type BoardSort="recent"|"name"|"oldest";
const fmt=(iso:string)=>new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));

import { listNotifications } from "./notificationsStore";

export default function BoardsScreen({user,onOpenBoard,onLogout}:Props){
 const [notificationUnreadCount,setNotificationUnreadCount]=useState(0);
 useEffect(()=>{void listNotifications().then(x=>setNotificationUnreadCount(x.filter(v=>!v.readAt).length)).catch(()=>{})},[user.id]);
 const [boards,setBoards]=useState<BoardSummary[]>([]); const [loading,setLoading]=useState(true); const [query,setQuery]=useState(""); const [editingId,setEditingId]=useState<string|null>(null); const [draftTitle,setDraftTitle]=useState("");
 const [filter,setFilter]=useState<BoardFilter>("all"); const [sort,setSort]=useState<BoardSort>("recent"); const [trashOpen,setTrashOpen]=useState(false); const [trash,setTrash]=useState<BoardSummary[]>([]);
 const [manage,setManage]=useState<BoardSummary|null>(null); const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(false);
 const [access,setAccess]=useState<{members:BoardAccessMember[];invites:BoardInvitation[]}>({members:[],invites:[]});
 const [shareLinks,setShareLinks]=useState<BoardShareLink[]>([]); const [createdUrl,setCreatedUrl]=useState("");

 const visible=useMemo(()=>{
   const q=query.trim().toLowerCase();
   let list=boards.filter(b=>{
     if(q&&!b.title.toLowerCase().includes(q))return false;
     if(filter==="mine"&&b.role!=="owner")return false;
     if(filter==="shared"&&b.role==="owner")return false;
     return true;
   });
   list=[...list];
   if(sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title,"ru",{sensitivity:"base"}));
   else if(sort==="oldest")list.sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
   else list.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
   return list;
 },[boards,query,filter,sort]);

 const refresh=async()=>setBoards(await getUserBoards(user));
 const loadTrash=async()=>{if(!isRemoteBackendEnabled()){setTrash([]);return}setTrash(await getTrashedBoards(user))};
 const loadAccess=async(board=manage)=>{if(!board)return;setAccess(await getBoardAccess(user.id,board.id))};
 const loadLinks=async(board=manage)=>{if(!board||!isRemoteBackendEnabled()){setShareLinks([]);return}setShareLinks(await listBoardShareLinks(board.id))};

 useEffect(()=>{let alive=true;(async()=>{
   const token=pendingShareToken();
   if(token&&isRemoteBackendEnabled()){
     try{
       const joined=await redeemBoardShareLink(token);
       clearPendingShareToken();
       const list=await getUserBoards(user);
       if(!alive)return;
       setBoards(list);
       setNotice(`Доступ к доске «${joined.title}» получен`);
       onOpenBoard(joined);
       setLoading(false);
       return;
     }catch(e){
       clearPendingShareToken();
       if(alive)setNotice(e instanceof Error?e.message:"Ссылка доступа недействительна");
     }
   }else if(token&&!isRemoteBackendEnabled()){
     clearPendingShareToken();
     if(alive)setNotice("Эта ссылка требует серверной версии приложения.");
   }
   try{
     const list=await ensureUserBoards(user);
     if(alive)setBoards(list);
   }catch(e){
     if(alive)setNotice(e instanceof Error?e.message:"Не удалось загрузить доски");
   }finally{if(alive)setLoading(false)}
 })();return()=>{alive=false}},[user.id]);

 useEffect(()=>{if(manage){void loadAccess(manage);void loadLinks(manage)}else{setAccess({members:[],invites:[]});setShareLinks([]);setCreatedUrl("")}},[manage?.id]);

 const add=async()=>{if(busy)return;setBusy(true);try{const b=await createBoard(user);await refresh();onOpenBoard(b)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать доску")}finally{setBusy(false)}};
 const saveRename=async(b:BoardSummary)=>{await renameBoard(user.id,b.id,draftTitle);setEditingId(null);await refresh()};

 const createLink=async(role:ShareRole)=>{
   if(!manage||busy)return;
   setBusy(true);
   try{
     const link=await createBoardShareLink(manage.id,role);
     const url=boardShareUrl(link.token);
     setCreatedUrl(url);
     setNotice(role==="editor"?"Создана ссылка для редактирования":"Создана ссылка только для просмотра");
     try{await navigator.clipboard.writeText(url);setNotice("Ссылка создана и скопирована")}catch{/* поле ниже всё равно доступно */}
     await loadLinks(manage);
   }catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать ссылку")}finally{setBusy(false)}
 };

 const copyCreated=async()=>{if(!createdUrl)return;try{await navigator.clipboard.writeText(createdUrl);setNotice("Ссылка скопирована")}catch{setNotice("Не удалось скопировать автоматически. Выделите ссылку вручную.")}};

 return <main className="boards-shell"><header className="boards-header"><div className="boards-brand"><div className="auth-logo" aria-label="OnlineRepetitor">OR</div><div><strong>OnlineRepetitor</strong><span>{isRemoteBackendEnabled()?"Синхронизация включена":"Локальный режим"}</span></div></div><div className="boards-account"><div className="account-chip"><span className="account-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="account-copy"><strong>{user.name}</strong><small>{user.email}</small></span></div><button className="boards-secondary" onClick={()=>{window.history.pushState({},"","/?section=profile");window.dispatchEvent(new PopStateEvent("popstate"))}}>⚙ Настройки</button><button className="boards-secondary" onClick={onLogout}>Выйти</button></div></header>

 <section className="boards-content"><nav className="dashboard-nav"><button className="active">Доски</button><button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button><button onClick={()=>{window.history.pushState({}, "", "/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button><button onClick={()=>{window.history.pushState({}, "", "/?section=progress");window.dispatchEvent(new PopStateEvent("popstate"))}}>Прогресс</button><button onClick={()=>{window.history.pushState({},"","/?section=schedule");window.dispatchEvent(new PopStateEvent("popstate"))}}>Расписание</button><button onClick={()=>{window.history.pushState({},"","/?section=materials");window.dispatchEvent(new PopStateEvent("popstate"))}}>Материалы</button><button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления{notificationUnreadCount>0&&<b className="nav-badge">{notificationUnreadCount>99?"99+":notificationUnreadCount}</b>}</button></nav><div className="boards-heading-row"><div><h1>Мои доски</h1><p>{isRemoteBackendEnabled()?"Уроки, материалы и совместные доски в одном месте.":"Сейчас данные хранятся в этом браузере. Ссылки доступа появятся после подключения сервера."}</p></div><button className="boards-create" disabled={busy} onClick={()=>void add()}>+ Новая доска</button></div>

 <div className="boards-toolbar">
   <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по названию доски"/>
   <select value={filter} onChange={e=>setFilter(e.target.value as BoardFilter)} aria-label="Фильтр досок">
     <option value="all">Все доски</option>
     <option value="mine">Мои</option>
     <option value="shared">Общие со мной</option>
   </select>
   <select value={sort} onChange={e=>setSort(e.target.value as BoardSort)} aria-label="Сортировка досок">
     <option value="recent">Сначала недавние</option>
     <option value="name">По названию</option>
     <option value="oldest">Сначала давние</option>
   </select>
   <span>{loading?"Загрузка…":`${visible.length} из ${boards.length}`}</span><button className="boards-secondary trash-open-button" disabled={!isRemoteBackendEnabled()} onClick={()=>{setTrashOpen(true);void loadTrash()}}>Корзина</button>
 </div>

 {notice&&<div className="access-notice" style={{marginBottom:12}}>{notice}</div>}

 {!loading&&visible.length===0
   ? <div className="boards-empty"><strong>{boards.length?"Ничего не найдено":"Пока нет досок"}</strong><span>{boards.length?"Попробуйте изменить поиск или фильтр.":"Создайте первую доску и начните занятие."}</span></div>
   : <div className="boards-grid">{visible.map(b=><article className="board-card" key={b.id}><button className="board-card-preview" onClick={()=>onOpenBoard(b)}><span className="board-card-grid"/><span className="board-card-letter">OR</span></button><div className="board-card-body">{editingId===b.id?<input className="board-card-rename" value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} onBlur={()=>void saveRename(b)} onKeyDown={e=>{if(e.key==="Enter")void saveRename(b);if(e.key==="Escape")setEditingId(null)}} autoFocus/>:<button className="board-card-title" onClick={()=>onOpenBoard(b)}>{b.title}</button>}<div className="board-card-meta"><span>{BOARD_ROLE_LABELS[b.role]}</span><span>Изменено {fmt(b.updatedAt)}</span></div><div className="board-card-actions">{b.role==="owner"&&<><button onClick={()=>{setEditingId(b.id);setDraftTitle(b.title)}}>Переименовать</button><button onClick={()=>{setManage(b);setNotice("");setCreatedUrl("")}}>Поделиться</button><button className="danger" onClick={async()=>{if(confirm(`Переместить доску «${b.title}» в корзину? Её можно будет восстановить.`)){await deleteBoard(user.id,b.id);setNotice("Доска перемещена в корзину");await refresh()}}}>Удалить</button></>} {b.role!=="owner"&&<button onClick={()=>onOpenBoard(b)}>Открыть</button>}</div></div></article>)}</div>}
 </section>

 {manage&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setManage(null)}}><section className="access-modal"><div className="access-head"><div><h2>Поделиться доской</h2><p>{manage.title}</p></div><button onClick={()=>setManage(null)}>×</button></div>

 <div style={{display:"grid",gap:10,marginBottom:16}}>
   <strong>Ссылка доступа</strong>
   <span style={{fontSize:13,opacity:.72}}>Создайте ссылку с нужными правами и отправьте её ученику, преподавателю или коллеге. После входа или регистрации доступ применится автоматически.</span>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <button disabled={busy||!isRemoteBackendEnabled()} onClick={()=>void createLink("editor")}>Редактирование</button>
     <button disabled={busy||!isRemoteBackendEnabled()} onClick={()=>void createLink("viewer")}>Только просмотр</button>
   </div>
   {!isRemoteBackendEnabled()&&<div className="access-notice">Для ссылок доступа нужна серверная синхронизация.</div>}
   {createdUrl&&<div style={{display:"flex",gap:8}}><input readOnly value={createdUrl} onFocus={e=>e.currentTarget.select()} style={{flex:1}}/><button onClick={()=>void copyCreated()}>Копировать</button></div>}
 </div>

 {notice&&<div className="access-notice">{notice}</div>}

 <div className="access-list">
   {shareLinks.length>0&&<><div style={{padding:"8px 0",fontWeight:700}}>Активные ссылки</div>{shareLinks.map(link=><div className="access-person" key={link.id}><div><strong>{link.role==="editor"?"Редактирование":"Только просмотр"}</strong><span>Создана {fmt(link.createdAt)}</span></div><button className="danger" onClick={async()=>{await revokeBoardShareLink(link.id);await loadLinks(manage);setNotice("Ссылка отозвана")}}>Отозвать</button></div>)}</>}
   <div style={{padding:"14px 0 8px",fontWeight:700}}>Участники</div>
   <div className="access-person"><div><strong>{user.name}</strong><span>{user.email}</span></div><b>Владелец</b></div>
   {access.members.map(m=><div className="access-person" key={m.userId}><div><strong>{m.user?.name||"Пользователь"}</strong><span>{m.user?.email||m.userId}</span></div><select value={m.role} onChange={async e=>{await changeMemberRole(user.id,manage.id,m.userId,e.target.value as Exclude<BoardRole,"owner">);await loadAccess(manage)}}><option value="editor">Редактор</option><option value="viewer">Просмотр</option></select><button className="danger" onClick={async()=>{await removeMember(user.id,manage.id,m.userId);await loadAccess(manage)}}>Удалить</button></div>)}
 </div></section></div>}
 {trashOpen&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setTrashOpen(false)}}><section className="access-modal trash-modal"><div className="access-head"><div><h2>Корзина</h2><p>Удалённые доски можно восстановить или удалить окончательно.</p></div><button onClick={()=>setTrashOpen(false)}>×</button></div>{trash.length===0?<div className="boards-empty trash-empty"><strong>Корзина пуста</strong><span>Удалённые доски появятся здесь.</span></div>:<div className="trash-list">{trash.map(board=><div className="trash-row" key={board.id}><div><strong>{board.title}</strong><span>Удалена {board.deletedAt?fmt(board.deletedAt):"недавно"}{board.purgeAfter?` · срок хранения до ${fmt(board.purgeAfter)}`:""}</span></div><div><button disabled={busy} onClick={async()=>{setBusy(true);try{await restoreBoard(board.id);setNotice(`Доска «${board.title}» восстановлена`);await Promise.all([refresh(),loadTrash()])}catch(e){setNotice(e instanceof Error?e.message:"Не удалось восстановить доску")}finally{setBusy(false)}}}>Восстановить</button><button className="danger" disabled={busy} onClick={async()=>{const confirmation=window.prompt(`Окончательное удаление нельзя отменить.\n\nЧтобы удалить доску навсегда, введите её название:\n${board.title}`);if(confirmation===null)return;if(confirmation!==board.title){setNotice("Название не совпало. Доска не удалена.");return}setBusy(true);try{await deleteBoardForever(board.id,confirmation);setNotice("Доска удалена окончательно");await loadTrash()}catch(e){setNotice(e instanceof Error?e.message:"Не удалось удалить доску")}finally{setBusy(false)}}}>Удалить навсегда</button></div></div>)}</div>}<div className="trash-warning">Доски в корзине помечаются сроком хранения 30 дней. Сейчас автоматическое физическое удаление не включено: это будет сделано только после безопасной очистки файлов Storage. Для ручного окончательного удаления нужно точно ввести название доски.</div></section></div>}
 </main>}
