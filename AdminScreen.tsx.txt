import { useEffect,useState } from "react";
import type { AuthUser } from "./authStore";
import { listTeacherRequests,reviewTeacherRequest,type TeacherRequest } from "./accountRoleStore";
type Props={user:AuthUser;onBack:()=>void};
const fmt=(x:string|null)=>x?new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(x)):"—";
export default function AdminScreen({user,onBack}:Props){
 const [rows,setRows]=useState<TeacherRequest[]>([]),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const load=async()=>{try{setRows(await listTeacherRequests())}catch(e){setNotice(e instanceof Error?e.message:"Не удалось загрузить заявки")}};
 useEffect(()=>{void load()},[]);
 const review=async(id:string,approve:boolean)=>{setBusy(id);try{await reviewTeacherRequest(id,approve);setNotice(approve?"Преподаватель одобрен":"Заявка отклонена");await load()}catch(e){setNotice(e instanceof Error?e.message:"Не удалось обработать заявку")}finally{setBusy("")}};
 const pending=rows.filter(x=>x.status==="pending"),history=rows.filter(x=>x.status!=="pending");
 return <main className="students-shell"><header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Администрирование</strong><span>Допуск преподавателей · {user.email}</span></div></div><button className="boards-secondary" onClick={()=>void load()}>Обновить</button></header><section className="students-content">
 {notice&&<div className="access-notice">{notice}</div>}
 <div className="admin-approval-head"><h2>Заявки преподавателей</h2><span>{pending.length} ожидают решения</span></div>
 {pending.length===0?<div className="boards-empty"><strong>Новых заявок нет</strong><span>Когда пользователь запросит роль преподавателя, он появится здесь.</span></div>:<div className="admin-request-list">{pending.map(x=><article key={x.userId}><div><strong>{x.name}</strong><span>{x.email}</span><small>Заявка: {fmt(x.requestedAt)}</small></div><div><button className="students-primary" disabled={busy===x.userId} onClick={()=>void review(x.userId,true)}>Одобрить</button><button className="danger" disabled={busy===x.userId} onClick={()=>void review(x.userId,false)}>Отклонить</button></div></article>)}</div>}
 <div className="admin-approval-head"><h2>История решений</h2><span>{history.length}</span></div>
 <div className="admin-request-list">{history.map(x=><article key={x.userId}><div><strong>{x.name}</strong><span>{x.email}</span><small>{x.status==="approved"?"Одобрен":"Отклонён"} · {fmt(x.reviewedAt)}</small></div>{x.status==="approved"?<button className="danger" disabled={busy===x.userId} onClick={()=>void review(x.userId,false)}>Отозвать доступ</button>:<button disabled={busy===x.userId} onClick={()=>void review(x.userId,true)}>Одобрить</button>}</article>)}</div>
 </section></main>
}
