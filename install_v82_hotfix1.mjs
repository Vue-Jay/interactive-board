import fs from "node:fs";
const p="src/ProfileScreen.tsx";
if(!fs.existsSync(p)){console.error("v82 hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='import { getAccountRole,setAccountRole,type AccountRole } from "./accountRoleStore";';
const neu='import { getAccountAccess,requestTeacherAccess,setStudentRole,type AccountAccess } from "./accountRoleStore";';
if(s.includes(old)) s=s.replace(old,neu);
else if(!s.includes("getAccountAccess")){console.error("v82 hotfix: старый импорт не найден");process.exit(1)}

s=s.replace(
'const [s,setS]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100}),[saved,setSaved]=useState("");const [role,setRole]=useState<AccountRole>("teacher"),[roleBusy,setRoleBusy]=useState(false);',
'const [s,setS]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100}),[saved,setSaved]=useState("");const [access,setAccess]=useState<AccountAccess>({role:"student",teacherStatus:"none",isAdmin:false,requestedAt:null,reviewedAt:null}),[roleBusy,setRoleBusy]=useState(false);'
);
s=s.replace(
'useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);applyProfileAppearance(x)});void getAccountRole().then(setRole)},[user.id]);',
'useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);applyProfileAppearance(x)});void getAccountAccess().then(setAccess)},[user.id]);'
);
const start=s.indexOf('<section className="profile-card account-role-card">');
if(start>=0){
 const end=s.indexOf('</section>',start);
 if(end<0){console.error("v82 hotfix: конец карточки роли не найден");process.exit(1)}
 const card=`<section className="profile-card account-role-card"><h2>Роль в OnlineRepetitor</h2>{access.isAdmin?<><div className="teacher-status approved"><b>Администратор</b><span>У вас есть права преподавателя и управление заявками.</span></div><button onClick={()=>location.href="/?section=admin"}>Открыть администрирование</button></>:access.role==="teacher"?<div className="teacher-status approved"><b>Преподаватель одобрен</b><span>Администратор подтвердил доступ к преподавательским функциям.</span></div>:access.teacherStatus==="pending"?<div className="teacher-status pending"><b>Заявка рассматривается</b><span>До решения администратора доступен только кабинет ученика.</span></div>:<><div className={\`teacher-status \${access.teacherStatus==="rejected"?"rejected":""}\`}><b>{access.teacherStatus==="rejected"?"Заявка отклонена":"Ученик"}</b><span>Ученики не могут создавать собственные доски и преподавательские материалы.</span></div><button className="students-primary" disabled={roleBusy} onClick={async()=>{setRoleBusy(true);try{const x=await requestTeacherAccess();setAccess(x);setSaved("Заявка преподавателя отправлена");window.dispatchEvent(new Event("onlinerepetitor:account-access"))}finally{setRoleBusy(false)}}}>Запросить роль преподавателя</button></>} {access.role==="teacher"&&!access.isAdmin&&<button disabled={roleBusy} onClick={async()=>{if(!confirm("Перейти в роль ученика? Для возврата роли преподавателя потребуется новое одобрение."))return;setRoleBusy(true);try{setAccess(await setStudentRole());window.dispatchEvent(new Event("onlinerepetitor:account-access"))}finally{setRoleBusy(false)}}}>Перейти в роль ученика</button>}<small>Права owner/editor/viewer на конкретных досках остаются отдельной системой доступа.</small></section>`;
 s=s.slice(0,start)+card+s.slice(end+"</section>".length);
}
fs.writeFileSync(p,s);
console.log("v82 hotfix 1 установлен. Запустите npm run build.");
