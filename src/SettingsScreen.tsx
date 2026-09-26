import {useEffect,useMemo,useState} from "react";
import type {AuthUser} from "./authStore";
import {applyProfileAppearance,getProfileSettings,saveProfileSettings,type ProfileSettings} from "./profileStore";
import {getAccountAccess,requestTeacherAccess,setStudentRole,type AccountAccess} from "./accountRoleStore";
import {getPlan} from "./billingStore";

type Props={user:AuthUser;onBack:()=>void;onLogout:()=>void;installAvailable:boolean;isInstalled:boolean;onInstall:()=>void;onBilling:()=>void};

export default function SettingsScreen({user,onBack,onLogout,installAvailable,isInstalled,onInstall,onBilling}:Props){
 const defaults:ProfileSettings={displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100};
 const [s,setS]=useState(defaults),[initial,setInitial]=useState(defaults),[notice,setNotice]=useState("");
 const [access,setAccess]=useState<AccountAccess>({role:"student",teacherStatus:"none",isAdmin:false,requestedAt:null,reviewedAt:null,subscriptionPlan:"free",subscriptionUntil:null}),[roleBusy,setRoleBusy]=useState(false);
 const plan=getPlan(access.subscriptionPlan);
 useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);setInitial(x);applyProfileAppearance(x)});const sync=()=>void getAccountAccess().then(setAccess);sync();window.addEventListener("onlinerepetitor:account-access",sync);window.addEventListener("focus",sync);return()=>{window.removeEventListener("onlinerepetitor:account-access",sync);window.removeEventListener("focus",sync)}},[user.id]);
 const dirty=useMemo(()=>JSON.stringify(s)!==JSON.stringify(initial),[s,initial]);
 const patch=<K extends keyof ProfileSettings>(k:K,v:ProfileSettings[K])=>{const next={...s,[k]:v};setS(next);applyProfileAppearance(next)};
 const save=async()=>{await saveProfileSettings(s);setInitial(s);setNotice("Настройки сохранены");setTimeout(()=>setNotice(""),1500)};
 return <main className="profile-shell settings-shell">
  <header className="students-header compact-settings-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Настройки</strong><span>Интерфейс, доска, роль и приложение</span></div></div><button className="boards-create" disabled={!dirty} onClick={()=>void save()}>Сохранить</button></header>
  <section className="settings-compact-content">{notice&&<div className="access-notice">{notice}</div>}
   <div className="settings-compact-grid">
    <section className="settings-row-card"><div><b>Тема</b><small>Оформление приложения</small></div><select value={s.theme} onChange={e=>patch("theme",e.target.value as ProfileSettings["theme"])}><option value="system">Системная</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select></section>
    <section className="settings-row-card"><div><b>Компактный интерфейс</b><small>Меньше отступов и крупности элементов</small></div><input type="checkbox" checked={s.compactUi} onChange={e=>patch("compactUi",e.target.checked)}/></section>
    <section className="settings-row-card"><div><b>Масштаб новых досок</b><small>Стартовое значение</small></div><select value={s.defaultBoardZoom} onChange={e=>patch("defaultBoardZoom",Number(e.target.value))}><option value={75}>75%</option><option value={90}>90%</option><option value={100}>100%</option><option value={110}>110%</option><option value={125}>125%</option></select></section>
    <section className="settings-row-card settings-plan-row"><div><b>Тариф · {plan.name}</b><small>{access.subscriptionUntil&&access.subscriptionPlan!=="free"?`${plan.description} · до ${new Date(access.subscriptionUntil).toLocaleDateString("ru-RU")}`:plan.description}</small></div><button onClick={onBilling}>Тарифы</button></section><section className="settings-row-card"><div><b>AI-студия</b><small>Задания, тесты и карточки</small></div><button onClick={()=>{window.history.pushState({},"","/?section=ai");window.dispatchEvent(new PopStateEvent("popstate"))}}>Открыть</button></section>
    <section className="settings-row-card settings-role-row"><div><b>Роль</b><small>{access.isAdmin?"Администратор":access.role==="teacher"?"Преподаватель":access.teacherStatus==="pending"?"Заявка преподавателя рассматривается":"Ученик"}</small></div>{!access.isAdmin&&access.role!=="teacher"&&access.teacherStatus!=="pending"?<button disabled={roleBusy} onClick={async()=>{setRoleBusy(true);try{setAccess(await requestTeacherAccess());window.dispatchEvent(new Event("onlinerepetitor:account-access"))}finally{setRoleBusy(false)}}}>Стать преподавателем</button>:access.role==="teacher"&&!access.isAdmin?<button disabled={roleBusy} onClick={async()=>{if(!confirm("Перейти в роль ученика?"))return;setRoleBusy(true);try{setAccess(await setStudentRole());window.dispatchEvent(new Event("onlinerepetitor:account-access"))}finally{setRoleBusy(false)}}}>Роль ученика</button>:null}</section>
    <section className="settings-row-card"><div><b>Приложение</b><small>{isInstalled?"Установлено на этом устройстве":"Можно установить для быстрого запуска"}</small></div>{!isInstalled&&<button disabled={!installAvailable} onClick={onInstall}>Установить</button>}</section>
   </div>
   <section className="settings-local-status"><b>Локальная разработка завершена</b><small>Доска, профиль, компактные настройки, тарифный контур и AI-студия собраны в одной ветке. Реальные платежи и внешний AI подключаются только после выбора провайдеров и серверных секретов.</small></section>
   <div className="settings-footer-actions"><button className="profile-logout-button" onClick={onLogout}>Выйти из аккаунта</button></div>
  </section>
 </main>
}
