import {useEffect,useState} from "react";
import type {AuthUser} from "./authStore";
import {applyProfileAppearance,getProfileSettings,saveProfileSettings,type ProfileSettings} from "./profileStore";
import type {AccountRole} from "./accountRoleStore";

type Props={user:AuthUser;accountRole:AccountRole;isAppAdmin:boolean;onBack:()=>void};

export default function ProfileScreen({user,accountRole,isAppAdmin,onBack}:Props){
 const [profile,setProfile]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100});
 const [name,setName]=useState(user.name),[saved,setSaved]=useState("");
 useEffect(()=>{void getProfileSettings(user).then(x=>{setProfile(x);setName(x.displayName)})},[user.id]);
 const valid=name.trim().length>=2;
 const save=async()=>{if(!valid)return;const next={...profile,displayName:name.trim()};await saveProfileSettings(next);applyProfileAppearance(next);setProfile(next);setName(next.displayName);setSaved("Профиль сохранён");setTimeout(()=>setSaved(""),1600)};
 return <main className="profile-shell profile-only-shell">
   <header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Профиль</strong><span>Личная информация аккаунта</span></div></div></header>
   <section className="profile-compact-wrap">
     {saved&&<div className="access-notice">{saved}</div>}
     <section className="profile-identity-card">
       <div className="profile-big-avatar">{name.trim().charAt(0).toUpperCase()||"?"}</div>
       <div className="profile-identity-copy"><h1>{profile.displayName||user.name}</h1><p>{user.email}</p><div className="profile-role-pills"><span>{accountRole==="teacher"?"Преподаватель":"Ученик"}</span>{isAppAdmin&&<span>Администратор</span>}</div></div>
     </section>
     <section className="profile-compact-card">
       <label><span>Отображаемое имя</span><input value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label>
       {!valid&&<small className="profile-field-error">Минимум 2 символа.</small>}
       <div className="profile-inline-actions"><button className="boards-create" disabled={!valid||name.trim()===profile.displayName} onClick={()=>void save()}>Сохранить имя</button></div>
     </section>
   </section>
 </main>
}
