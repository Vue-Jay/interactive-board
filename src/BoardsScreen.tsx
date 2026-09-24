import { useEffect, useMemo, useState } from "react";
import { BOARD_ROLE_LABELS, isRemoteBackendEnabled, type AuthUser, type BoardRole } from "./authStore";
import { createBoard, deleteBoard, deleteBoardForever, ensureUserBoards, getTrashedBoards, getUserBoards, restoreBoard, renameBoard, getBoardAccess, changeMemberRole, removeMember, type BoardAccessMember, type BoardInvitation, type BoardSummary } from "./boardStore";
import { boardShareUrl, clearPendingShareToken, createBoardShareLink, listBoardShareLinks, pendingShareToken, redeemBoardShareLink, revokeBoardShareLink, type BoardShareLink, type ShareRole } from "./shareLinks";

type Props={user:AuthUser;accountRole:AccountRole;isAppAdmin:boolean;onOpenBoard:(b:BoardSummary)=>void;onLogout:()=>void};
type BoardFilter="all"|"mine"|"shared";
type BoardSort="recent"|"name"|"oldest";
const fmt=(iso:string)=>new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));

import { listNotifications } from "./notificationsStore";
import { importAsNewBoard, inspectBoardImport, type BoardImportPreview } from "./dashboardImport";
import { exportWorkspace, importWorkspace, validateWorkspaceBackup, workspaceFileName, type WorkspaceBackup } from "./workspaceBackup";
import type { AccountRole } from "./accountRoleStore";

export default function BoardsScreen({user,accountRole,isAppAdmin,onOpenBoard,onLogout}:Props){
 const [notificationUnreadCount,setNotificationUnreadCount]=useState(0);
 useEffect(()=>{const refresh=()=>void listNotifications().then(x=>setNotificationUnreadCount(x.filter(v=>!v.readAt).length)).catch(()=>{});refresh();const timer=window.setInterval(refresh,60000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)}},[user.id,accountRole]);
 const [boards,setBoards]=useState<BoardSummary[]>([]); const [loading,setLoading]=useState(true); const [query,setQuery]=useState(""); const [editingId,setEditingId]=useState<string|null>(null); const [draftTitle,setDraftTitle]=useState("");
 const [filter,setFilter]=useState<BoardFilter>("all"); const [sort,setSort]=useState<BoardSort>("recent"); const [trashOpen,setTrashOpen]=useState(false); const [trash,setTrash]=useState<BoardSummary[]>([]);
 const [manage,setManage]=useState<BoardSummary|null>(null); const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(false);
 const [access,setAccess]=useState<{members:BoardAccessMember[];invites:BoardInvitation[]}>({members:[],invites:[]});
 const [shareLinks,setShareLinks]=useState<BoardShareLink[]>([]); const [createdUrl,setCreatedUrl]=useState("");
 const [importPreview,setImportPreview]=useState<BoardImportPreview|null>(null); const [importFileName,setImportFileName]=useState(""); const [importProgress,setImportProgress]=useState("");
 const [workspacePreview,setWorkspacePreview]=useState<WorkspaceBackup|null>(null); const [workspaceProgress,setWorkspaceProgress]=useState("");

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
     const list=accountRole==="teacher"?await ensureUserBoards(user):await getUserBoards(user);
     if(alive)setBoards(list);
   }catch(e){
     if(alive)setNotice(e instanceof Error?e.message:"Не удалось загрузить доски");
   }finally{if(alive)setLoading(false)}
 })();return()=>{alive=false}},[user.id]);

 useEffect(()=>{if(manage){void loadAccess(manage);void loadLinks(manage)}else{setAccess({members:[],invites:[]});setShareLinks([]);setCreatedUrl("")}},[manage?.id]);

 const add=async()=>{if(busy)return;setBusy(true);try{const b=await createBoard(user);await refresh();onOpenBoard(b)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать доску")}finally{setBusy(false)}};
 const saveRename=async(b:BoardSummary)=>{await renameBoard(user.id,b.id,draftTitle);setEditingId(null);await refresh()};
 const chooseImport=async(file:File)=>{setBusy(true);setImportProgress("Проверяем файл…");try{const preview=await inspectBoardImport(file);setImportPreview(preview);setImportFileName(file.name);setImportProgress("")}catch(e){setNotice(e instanceof Error?e.message:"Не удалось прочитать резервную копию");setImportProgress("")}finally{setBusy(false)}};
 const confirmImport=async()=>{if(!importPreview||busy)return;setBusy(true);setImportProgress("Создаём новую доску…");try{const board=await importAsNewBoard(user,importPreview,setImportProgress);setImportPreview(null);setImportProgress("");await refresh();setNotice(`Импортирована новая доска «${board.title}»`);onOpenBoard(board)}catch(e){setNotice(e instanceof Error?e.message:"Импорт не завершён")}finally{setBusy(false)}};
 const downloadWorkspace=async()=>{if(busy)return;setBusy(true);setWorkspaceProgress("Собираем резервную копию…");try{const backup=await exportWorkspace(user,setWorkspaceProgress);const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:"application/vnd.onlinerepetitor.workspace+json"}));const link=document.createElement("a");link.href=url;link.download=workspaceFileName();link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(`Резервная копия пространства создана · досок: ${backup.boards.length}`)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать общую копию")}finally{setBusy(false);setWorkspaceProgress("")}};
 const chooseWorkspace=async(file:File)=>{if(file.size>750*1024*1024){setNotice("Копия пространства больше 750 МБ");return}setBusy(true);setWorkspaceProgress("Проверяем пространство…");try{const parsed=JSON.parse(await file.text());const backup=validateWorkspaceBackup(parsed);setWorkspacePreview(backup)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось прочитать копию пространства")}finally{setBusy(false);setWorkspaceProgress("")}};
 const restoreWorkspace=async()=>{if(!workspacePreview||busy)return;setBusy(true);try{const result=await importWorkspace(user,workspacePreview,setWorkspaceProgress);setWorkspacePreview(null);await refresh();setNotice(result.failed.length?`Восстановлено: ${result.created.length}. Ошибок: ${result.failed.length}. ${result.failed[0]}`:`Восстановлено досок: ${result.created.length}`)}catch(e){setNotice(e instanceof Error?e.message:"Восстановление не завершено")}finally{setBusy(false);setWorkspaceProgress("")}};



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

 return <main className="boards-shell"><header className="boards-header"><div className="boards-brand"><div className="auth-logo" aria-label="OnlineRepetitor">OR</div><div><strong>OnlineRepetitor</strong><span>{accountRole==="teacher"?"Преподаватель":"Ученик"} · {isRemoteBackendEnabled()?"синхронизация включена":"локальный режим"}</span></div></div><div className="boards-account"><div className="account-chip"><span className="account-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="account-copy"><strong>{user.name}</strong><small>{user.email}</small></span></div><button className="boards-secondary" onClick={()=>{window.history.pushState({},"","/?section=profile");window.dispatchEvent(new PopStateEvent("popstate"))}}>⚙ Настройки</button><button className="boards-secondary" onClick={onLogout}>Выйти</button></div></header>

 <section className="boards-content"><nav className="dashboard-nav"><button className="active">Доски</button>{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button>}<button onClick={()=>{window.history.pushState({}, "", "/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button>{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({}, "", "/?section=progress");window.dispatchEvent(new PopStateEvent("popstate"))}}>Прогресс</button>}<button onClick={()=>{window.history.pushState({},"","/?section=schedule");window.dispatchEvent(new PopStateEvent("popstate"))}}>Расписание</button>{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({},"","/?section=materials");window.dispatchEvent(new PopStateEvent("popstate"))}}>Материалы</button>}{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны</button>}{isAppAdmin&&<button onClick={()=>{window.history.pushState({},"","/?section=admin");window.dispatchEvent(new PopStateEvent("popstate"))}}>Администрирование</button>}<button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления{notificationUnreadCount>0&&<b className="nav-badge">{notificationUnreadCount>99?"99+":notificationUnreadCount}</b>}</button></nav><div className="boards-heading-row"><div><h1>Мои доски</h1><p>{isRemoteBackendEnabled()?"Уроки, материалы и совместные доски в одном месте.":"Сейчас данные хранятся в этом браузере. Ссылки доступа появятся после подключения сервера."}</p></div><div className="boards-heading-actions">{accountRole==="teacher"?<><label className={`boards-secondary boards-import ${busy?"disabled":""}`}>Импортировать<input type="file" hidden disabled={busy} accept=".orboard,.json,application/json,application/vnd.onlinerepetitor.board+json" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void chooseImport(f)}}/></label><button className="boards-create" disabled={busy} onClick={()=>void add()}>+ Новая доска</button></>:<span className="student-board-note">Ученик работает только с досками, которые предоставил преподаватель.</span>}</div></div>

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
   <span>{loading?"Загрузка…":`${visible.length} из ${boards.length}`}</span><div className="backup-menu"><button className="boards-secondary" disabled={busy} onClick={()=>void downloadWorkspace()}>{workspaceProgress||"Скачать все мои"}</button><label className={`boards-secondary boards-import ${busy?"disabled":""}`}>Восстановить набор<input type="file" hidden disabled={busy} accept=".orworkspace,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void chooseWorkspace(f)}}/></label></div><button className="boards-secondary trash-open-button" disabled={!isRemoteBackendEnabled()} onClick={()=>{setTrashOpen(true);void loadTrash()}}>Корзина</button>
 </div>

 {notice&&<div className="access-notice" style={{marginBottom:12}}>{notice}</div>}

 {!loading&&visible.length===0
   ? <div className="boards-empty"><strong>{boards.length?"Ничего не найдено":"Пока нет досок"}</strong><span>{boards.length?"Попробуйте изменить поиск или фильтр.":"Создайте первую доску и начните занятие."}</span></div>
   : <div className="boards-grid">{visible.map(b=><article className="board-card" key={b.id}><button className="board-card-preview" onClick={()=>onOpenBoard(b)}><span className="board-card-grid"/><span className="board-card-letter">OR</span></button><div className="board-card-body">{editingId===b.id?<input className="board-card-rename" value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} onBlur={()=>void saveRename(b)} onKeyDown={e=>{if(e.key==="Enter")void saveRename(b);if(e.key==="Escape")setEditingId(null)}} autoFocus/>:<button className="board-card-title" onClick={()=>onOpenBoard(b)}>{b.title}</button>}<div className="board-card-meta"><span>{BOARD_ROLE_LABELS[b.role]}</span><span>Изменено {fmt(b.updatedAt)}</span></div><div className="board-card-actions">{b.role==="owner"&&<><button onClick={()=>{setEditingId(b.id);setDraftTitle(b.title)}}>Переименовать</button><button onClick={()=>{setManage(b);setNotice("");setCreatedUrl("")}}>Поделиться</button><button className="danger" onClick={async()=>{if(confirm(`Переместить доску «${b.title}» в корзину? Её можно будет восстановить.`)){await deleteBoard(user.id,b.id);setNotice("Доска перемещена в корзину");await refresh()}}}>Удалить</button></>} {b.role!=="owner"&&<button onClick={()=>onOpenBoard(b)}>Открыть</button>}</div></div></article>)}</div>}
 </section>

 {workspacePreview&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setWorkspacePreview(null)}}><section className="access-modal workspace-modal"><div className="access-head"><div><h2>Восстановить набор досок</h2><p>Копия от {fmt(workspacePreview.exportedAt)}</p></div><button disabled={busy} onClick={()=>setWorkspacePreview(null)}>×</button></div><div className="workspace-summary"><strong>{workspacePreview.boards.length}</strong><span>досок будет создано как новые</span></div><div className="workspace-board-list">{workspacePreview.boards.slice(0,12).map((board,index)=><div key={index}><strong>{board.title}</strong><span>{board.document.items.length} объектов · {board.assets.length} вложений</span></div>)}{workspacePreview.boards.length>12&&<small>И ещё {workspacePreview.boards.length-12}…</small>}</div><p className="share-note">Существующие доски не перезаписываются. Каждая доска из копии будет создана отдельно.</p>{workspaceProgress&&<div className="access-notice">{workspaceProgress}</div>}<div className="access-actions"><button disabled={busy} onClick={()=>setWorkspacePreview(null)}>Отмена</button><button className="boards-create" disabled={busy} onClick={()=>void restoreWorkspace()}>{busy?"Восстанавливаем…":"Восстановить все"}</button></div></section></div>}

 {importPreview&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setImportPreview(null)}}><section className="access-modal import-board-modal"><div className="access-head"><div><h2>Импорт новой доски</h2><p>{importFileName}</p></div><button disabled={busy} onClick={()=>setImportPreview(null)}>×</button></div><div className="import-summary"><div><strong>{importPreview.title}</strong><span>Название доски</span></div><div><strong>{importPreview.objects}</strong><span>Объектов</span></div><div><strong>{importPreview.assets}</strong><span>Вложений</span></div><div><strong>{importPreview.format==="orboard"?"ORBOARD":importPreview.format==="legacy"?"Старый bundle":"JSON"}</strong><span>Формат</span></div></div><p className="share-note">Импорт создаст <b>новую отдельную доску</b>. Существующие доски изменены не будут. Изображения и PDF будут перенесены вместе с копией.</p>{importProgress&&<div className="access-notice">{importProgress}</div>}<div className="access-actions"><button disabled={busy} onClick={()=>setImportPreview(null)}>Отмена</button><button className="boards-create" disabled={busy} onClick={()=>void confirmImport()}>{busy?"Импортируем…":"Создать из копии"}</button></div></section></div>}

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
 {trashOpen&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setTrashOpen(false)}}><section className="access-modal trash-modal"><div className="access-head"><div><h2>Корзина</h2><p>Удалённые доски можно восстановить или удалить окончательно.</p></div><button onClick={()=>setTrashOpen(false)}>×</button></div>{trash.length===0?<div className="boards-empty trash-empty"><strong>Корзина пуста</strong><span>Удалённые доски появятся здесь.</span></div>:<div className="trash-list">{trash.map(board=><div className="trash-row" key={board.id}><div><strong>{board.title}</strong><span>Удалена {board.deletedAt?fmt(board.deletedAt):"недавно"}{board.purgeAfter?` · срок хранения до ${fmt(board.purgeAfter)}`:""}{board.purgeQueued?` · в очереди очистки${board.purgeAssetCount?` · файлов: ${board.purgeAssetCount}`:""}`:""}</span></div><div><button disabled={busy} onClick={async()=>{setBusy(true);try{await restoreBoard(board.id);setNotice(`Доска «${board.title}» восстановлена`);await Promise.all([refresh(),loadTrash()])}catch(e){setNotice(e instanceof Error?e.message:"Не удалось восстановить доску")}finally{setBusy(false)}}}>Восстановить</button><button className="danger" disabled={busy} onClick={async()=>{const confirmation=window.prompt(`Окончательное удаление нельзя отменить.\n\nЧтобы удалить доску навсегда, введите её название:\n${board.title}`);if(confirmation===null)return;if(confirmation!==board.title){setNotice("Название не совпало. Доска не удалена.");return}setBusy(true);try{const result=await deleteBoardForever(board.id,confirmation);setNotice(result.deletedAssets>0?`Доска удалена окончательно. Удалено файлов: ${result.deletedAssets}`:"Доска удалена окончательно");await loadTrash()}catch(e){setNotice(e instanceof Error?e.message:"Не удалось удалить доску")}finally{setBusy(false)}}}>Удалить навсегда</button></div></div>)}</div>}<div className="trash-warning">Доски хранятся в корзине 30 дней. После срока сервер ставит их в очередь автоматической очистки. Доска без файлов удаляется автоматически; если остались приватные файлы Storage, она безопасно остаётся в очереди до их очистки. Ручное окончательное удаление по-прежнему сначала очищает Storage и требует точного названия доски.</div></section></div>}
 </main>}
