import fs from "node:fs";
for(const p of ["src/authStore.ts","src/App.tsx","src/ProfileScreen.tsx","src/BoardsScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v81: не найден "+p);process.exit(1)}

fs.writeFileSync("src/accountRoleStore.ts",`import { isRemoteBackendEnabled,remoteRequest } from "./backend";
export type AccountRole="teacher"|"student";
const KEY="onlinerepetitor.account-role.v81";
export async function getAccountRole():Promise<AccountRole>{
 if(!isRemoteBackendEnabled())return localStorage.getItem(KEY)==="student"?"student":"teacher";
 const value=await remoteRequest<string>("/rest/v1/rpc/get_my_account_role",{method:"POST",body:"{}"});
 return value==="student"?"student":"teacher";
}
export async function setAccountRole(role:AccountRole){
 localStorage.setItem(KEY,role);
 if(isRemoteBackendEnabled())await remoteRequest("/rest/v1/rpc/set_my_account_role",{method:"POST",body:JSON.stringify({p_role:role})});
 window.dispatchEvent(new CustomEvent("onlinerepetitor:account-role",{detail:role}));
 return role;
}
`);

let a=fs.readFileSync("src/App.tsx","utf8");
const importAnchor='import ProfileScreen from "./ProfileScreen";';
if(!a.includes(importAnchor)){console.error("v81: App ProfileScreen import anchor не найден");process.exit(1)}
a=a.replace(importAnchor,importAnchor+'\nimport { getAccountRole,type AccountRole } from "./accountRoleStore";');
const authAnchor='const [authUser, setAuthUser] = useState<AuthUser | null>(null);';
if(!a.includes(authAnchor)){console.error("v81: auth state anchor не найден");process.exit(1)}
a=a.replace(authAnchor,authAnchor+'\n  const [accountRole,setAccountRoleState]=useState<AccountRole>("teacher");');
const routeAnchor='if (!authUser) {';
if(!a.includes(routeAnchor)){console.error("v81: unauth anchor не найден");process.exit(1)}
a=a.replace(routeAnchor,`useEffect(()=>{if(!authUser)return;let alive=true;const refresh=()=>void getAccountRole().then(r=>{if(alive)setAccountRoleState(r)}).catch(()=>{});refresh();const listener=(e:Event)=>setAccountRoleState((e as CustomEvent<AccountRole>).detail);window.addEventListener("onlinerepetitor:account-role",listener);return()=>{alive=false;window.removeEventListener("onlinerepetitor:account-role",listener)}},[authUser?.id]);

  ${routeAnchor}`);
a=a.replace(': section==="students"\n          ? <StudentsScreen', ': section==="students" && accountRole==="teacher"\n          ? <StudentsScreen');
a=a.replace(': section==="progress"\n          ? <ProgressScreen', ': section==="progress" && accountRole==="teacher"\n          ? <ProgressScreen');
a=a.replace(': section==="materials"\n          ? <MaterialsScreen', ': section==="materials" && accountRole==="teacher"\n          ? <MaterialsScreen');
a=a.replace('<BoardsScreen user={authUser} onOpenBoard=', '<BoardsScreen user={authUser} accountRole={accountRole} onOpenBoard=');
fs.writeFileSync("src/App.tsx",a);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
b=b.replace('import { exportWorkspace, importWorkspace, validateWorkspaceBackup, workspaceFileName, type WorkspaceBackup } from "./workspaceBackup";',
'import { exportWorkspace, importWorkspace, validateWorkspaceBackup, workspaceFileName, type WorkspaceBackup } from "./workspaceBackup";\nimport type { AccountRole } from "./accountRoleStore";');
b=b.replace('type Props={user:AuthUser;onOpenBoard:(b:BoardSummary)=>void;onLogout:()=>void};',
'type Props={user:AuthUser;accountRole:AccountRole;onOpenBoard:(b:BoardSummary)=>void;onLogout:()=>void};');
b=b.replace('export default function BoardsScreen({user,onOpenBoard,onLogout}:Props){',
'export default function BoardsScreen({user,accountRole,onOpenBoard,onLogout}:Props){');
const nav='<nav className="dashboard-nav"><button className="active">Доски</button><button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button><button onClick={()=>{window.history.pushState({}, "", "/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button><button onClick={()=>{window.history.pushState({}, "", "/?section=progress");window.dispatchEvent(new PopStateEvent("popstate"))}}>Прогресс</button><button onClick={()=>{window.history.pushState({},"","/?section=schedule");window.dispatchEvent(new PopStateEvent("popstate"))}}>Расписание</button><button onClick={()=>{window.history.pushState({},"","/?section=materials");window.dispatchEvent(new PopStateEvent("popstate"))}}>Материалы</button><button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны</button><button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления{notificationUnreadCount>0&&<b className="nav-badge">{notificationUnreadCount>99?"99+":notificationUnreadCount}</b>}</button></nav>';
if(!b.includes(nav)){console.error("v81: BoardsScreen nav anchor не найден");process.exit(1)}
b=b.replace(nav,`<nav className="dashboard-nav"><button className="active">Доски</button>{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({}, "", "/?section=students");window.dispatchEvent(new PopStateEvent("popstate"))}}>Ученики</button>}<button onClick={()=>{window.history.pushState({}, "", "/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button>{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({}, "", "/?section=progress");window.dispatchEvent(new PopStateEvent("popstate"))}}>Прогресс</button>}<button onClick={()=>{window.history.pushState({},"","/?section=schedule");window.dispatchEvent(new PopStateEvent("popstate"))}}>Расписание</button>{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({},"","/?section=materials");window.dispatchEvent(new PopStateEvent("popstate"))}}>Материалы</button>}<button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны</button><button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления{notificationUnreadCount>0&&<b className="nav-badge">{notificationUnreadCount>99?"99+":notificationUnreadCount}</b>}</button></nav>`);
b=b.replace('<span>{isRemoteBackendEnabled()?"Синхронизация включена":"Локальный режим"}</span>','<span>{accountRole==="teacher"?"Преподаватель":"Ученик"} · {isRemoteBackendEnabled()?"синхронизация включена":"локальный режим"}</span>');
fs.writeFileSync("src/BoardsScreen.tsx",b);

let p=fs.readFileSync("src/ProfileScreen.tsx","utf8");
p=p.replace('import { applyProfileAppearance,getProfileSettings,saveProfileSettings,type ProfileSettings } from "./profileStore";',
'import { applyProfileAppearance,getProfileSettings,saveProfileSettings,type ProfileSettings } from "./profileStore";\nimport { getAccountRole,setAccountRole,type AccountRole } from "./accountRoleStore";');
p=p.replace('const [s,setS]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100}),[saved,setSaved]=useState("");',
'const [s,setS]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100}),[saved,setSaved]=useState("");const [role,setRole]=useState<AccountRole>("teacher"),[roleBusy,setRoleBusy]=useState(false);');
p=p.replace('useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);applyProfileAppearance(x)})},[user.id]);',
'useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);applyProfileAppearance(x)});void getAccountRole().then(setRole)},[user.id]);');
const profileCard='<section className="profile-card"><h2>Профиль</h2><label><span>Отображаемое имя</span><input value={s.displayName} maxLength={80} onChange={e=>patch("displayName",e.target.value)}/></label><label><span>Email</span><input value={user.email} disabled/></label><small>Имя видно участникам совместных досок и ученикам.</small></section>';
if(!p.includes(profileCard)){console.error("v81: profile card anchor не найден");process.exit(1)}
p=p.replace(profileCard,profileCard+`<section className="profile-card account-role-card"><h2>Роль в OnlineRepetitor</h2><p>Роль меняет рабочий кабинет, но не права конкретной доски.</p><div className="account-role-options"><button className={role==="teacher"?"active":""} disabled={roleBusy} onClick={async()=>{setRoleBusy(true);try{await setAccountRole("teacher");setRole("teacher");setSaved("Роль: преподаватель")}finally{setRoleBusy(false)}}}><b>Преподаватель</b><span>Ученики, прогресс, библиотека и управление занятиями</span></button><button className={role==="student"?"active":""} disabled={roleBusy} onClick={async()=>{setRoleBusy(true);try{await setAccountRole("student");setRole("student");setSaved("Роль: ученик")}finally{setRoleBusy(false)}}}><b>Ученик</b><span>Свои доски, задания, расписание и уведомления</span></button></div><small>Можно изменить позже. Права owner/editor/viewer на досках остаются отдельной системой доступа.</small></section>`);
fs.writeFileSync("src/ProfileScreen.tsx",p);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v81 · account roles */"))c+=`
/* v81 · account roles */
.account-role-card p{margin:0 0 12px;color:var(--muted,#737783);font-size:13px}.account-role-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.account-role-options button{display:flex;flex-direction:column;gap:5px;text-align:left;padding:14px;border:1px solid var(--line,#dfe1e7);border-radius:14px;background:transparent}.account-role-options button.active{outline:2px solid currentColor}.account-role-options button span{font-size:12px;opacity:.72}@media(max-width:650px){.account-role-options{grid-template-columns:1fr}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v81 установлен. Выполните supabase/v81_account_roles.sql, затем npm run build.");
