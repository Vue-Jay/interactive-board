import { useEffect,useMemo,useState } from "react";
import type { AuthUser } from "./authStore";
import { adminSetSubscription,listAdminUsers,listTeacherRequests,reviewTeacherRequest,type AdminUser,type SubscriptionPlan,type TeacherRequest } from "./accountRoleStore";

type Props={user:AuthUser;onBack:()=>void};
const fmt=(x:string|null,withTime=false)=>x?new Intl.DateTimeFormat("ru-RU",withTime?{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"long",year:"numeric"}).format(new Date(x)):"—";
const PLAN_LABEL:Record<SubscriptionPlan,string>={free:"Бесплатный",basic:"Базовый",pro:"PRO"};
const isoDate=(days:number)=>{const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};

export default function AdminScreen({user,onBack}:Props){
 const [tab,setTab]=useState<"users"|"teachers">("users");
 const [users,setUsers]=useState<AdminUser[]>([]),[requests,setRequests]=useState<TeacherRequest[]>([]);
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[query,setQuery]=useState("");
 const [drafts,setDrafts]=useState<Record<string,{plan:SubscriptionPlan;until:string}>>({});
 const load=async()=>{try{const [u,r]=await Promise.all([listAdminUsers(),listTeacherRequests()]);setUsers(u);setRequests(r);setDrafts(current=>{const next={...current};for(const x of u)if(!next[x.userId])next[x.userId]={plan:x.subscriptionPlan,until:x.subscriptionUntil?.slice(0,10)??isoDate(30)};return next})}catch(e){setNotice(e instanceof Error?e.message:"Не удалось загрузить данные администратора")}};
 useEffect(()=>{void load()},[]);
 const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase("ru");return !q?users:users.filter(x=>`${x.name} ${x.email}`.toLocaleLowerCase("ru").includes(q))},[users,query]);
 const review=async(id:string,approve:boolean)=>{setBusy(id);try{await reviewTeacherRequest(id,approve);setNotice(approve?"Преподаватель одобрен":"Доступ преподавателя отозван");await load()}catch(e){setNotice(e instanceof Error?e.message:"Не удалось изменить доступ")}finally{setBusy("")}};
 const grant=async(x:AdminUser)=>{const draft=drafts[x.userId]??{plan:x.subscriptionPlan,until:isoDate(30)};setBusy(x.userId);try{await adminSetSubscription(x.userId,draft.plan,draft.plan==="free"?null:new Date(`${draft.until}T23:59:59`).toISOString());setNotice(draft.plan==="free"?`Тариф ${x.name} сброшен на бесплатный`:`${PLAN_LABEL[draft.plan]} выдан пользователю ${x.name}`);await load()}catch(e){setNotice(e instanceof Error?e.message:"Не удалось изменить тариф")}finally{setBusy("")}};
 const pending=requests.filter(x=>x.status==="pending"),history=requests.filter(x=>x.status!=="pending");
 return <main className="students-shell admin-users-shell">
  <header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Администрирование</strong><span>{user.email}</span></div></div><button className="boards-secondary" onClick={()=>void load()}>Обновить</button></header>
  <section className="students-content">
   {notice&&<div className="access-notice">{notice}</div>}
   <nav className="admin-tabs"><button className={tab==="users"?"active":""} onClick={()=>setTab("users")}>Все пользователи <span>{users.length}</span></button><button className={tab==="teachers"?"active":""} onClick={()=>setTab("teachers")}>Преподаватели {pending.length>0&&<span>{pending.length}</span>}</button></nav>
   {tab==="users"?<>
    <div className="admin-users-toolbar"><div><h2>Пользователи</h2><span>Тариф можно выдать вручную, независимо от оплаты.</span></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по имени или email"/></div>
    <div className="admin-users-list">{filtered.map(x=>{const draft=drafts[x.userId]??{plan:x.subscriptionPlan,until:x.subscriptionUntil?.slice(0,10)??isoDate(30)};const active=x.subscriptionPlan!=="free"&&(!x.subscriptionUntil||new Date(x.subscriptionUntil)>new Date());return <article className="admin-user-card" key={x.userId}>
      <div className="admin-user-main"><div className="admin-user-avatar">{(x.name||x.email||"?").slice(0,1).toUpperCase()}</div><div><strong>{x.name}</strong><span>{x.email}</span><small>{x.isAdmin?"Администратор":x.role==="teacher"?"Преподаватель":"Ученик"}{x.createdAt?` · с ${fmt(x.createdAt)}`:""}</small></div></div>
      <div className="admin-user-current"><span>Текущий тариф</span><strong className={`admin-plan admin-plan-${x.subscriptionPlan}`}>{PLAN_LABEL[x.subscriptionPlan]}</strong><small>{x.subscriptionPlan==="free"?"Без подписки":active?`до ${fmt(x.subscriptionUntil)}`:`истёк ${fmt(x.subscriptionUntil)}`}</small></div>
      <div className="admin-user-grant"><label>Выдать тариф<select value={draft.plan} onChange={e=>setDrafts(v=>({...v,[x.userId]:{...draft,plan:e.target.value as SubscriptionPlan}}))}><option value="free">Бесплатный</option><option value="basic">Базовый</option><option value="pro">PRO</option></select></label><label>До даты<input type="date" disabled={draft.plan==="free"} value={draft.until} min={new Date().toISOString().slice(0,10)} onChange={e=>setDrafts(v=>({...v,[x.userId]:{...draft,until:e.target.value}}))}/></label><div className="admin-duration-buttons"><button type="button" disabled={draft.plan==="free"} onClick={()=>setDrafts(v=>({...v,[x.userId]:{...draft,until:isoDate(30)}}))}>30 дн.</button><button type="button" disabled={draft.plan==="free"} onClick={()=>setDrafts(v=>({...v,[x.userId]:{...draft,until:isoDate(90)}}))}>90 дн.</button><button type="button" disabled={draft.plan==="free"} onClick={()=>setDrafts(v=>({...v,[x.userId]:{...draft,until:isoDate(365)}}))}>Год</button></div><button className="students-primary admin-grant-button" disabled={busy===x.userId||(!draft.until&&draft.plan!=="free")} onClick={()=>void grant(x)}>{busy===x.userId?"Сохраняем…":draft.plan==="free"?"Сбросить тариф":"Выдать"}</button></div>
    </article>})}</div>
    {filtered.length===0&&<div className="boards-empty"><strong>Пользователи не найдены</strong><span>Измени строку поиска.</span></div>}
   </>:<>
    <div className="admin-approval-head"><h2>Заявки преподавателей</h2><span>{pending.length} ожидают решения</span></div>
    {pending.length===0?<div className="boards-empty"><strong>Новых заявок нет</strong><span>Когда пользователь запросит роль преподавателя, он появится здесь.</span></div>:<div className="admin-request-list">{pending.map(x=><article key={x.userId}><div><strong>{x.name}</strong><span>{x.email}</span><small>Заявка: {fmt(x.requestedAt,true)}</small></div><div><button className="students-primary" disabled={busy===x.userId} onClick={()=>void review(x.userId,true)}>Одобрить</button><button className="danger" disabled={busy===x.userId} onClick={()=>void review(x.userId,false)}>Отклонить</button></div></article>)}</div>}
    <div className="admin-approval-head"><h2>История решений</h2><span>{history.length}</span></div>
    <div className="admin-request-list">{history.map(x=><article key={x.userId}><div><strong>{x.name}</strong><span>{x.email}</span><small>{x.status==="approved"?"Одобрен":"Отклонён"} · {fmt(x.reviewedAt,true)}</small></div>{x.status==="approved"?<button className="danger" disabled={busy===x.userId} onClick={()=>void review(x.userId,false)}>Отозвать доступ</button>:<button disabled={busy===x.userId} onClick={()=>void review(x.userId,true)}>Одобрить</button>}</article>)}</div>
   </>}
  </section>
 </main>
}
