import fs from "node:fs";
for(const p of ["src/App.tsx","src/ProfileScreen.tsx","src/BoardsScreen.tsx","src/App.css","src/accountRoleStore.ts"])if(!fs.existsSync(p)){console.error("v82: не найден "+p);process.exit(1)}
fs.writeFileSync("src/accountRoleStore.ts",fs.readFileSync("accountRoleStore.ts.txt","utf8"));
fs.writeFileSync("src/AdminScreen.tsx",fs.readFileSync("AdminScreen.tsx.txt","utf8"));

let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('import { getAccountRole,type AccountRole } from "./accountRoleStore";','import { getAccountAccess,type AccountRole } from "./accountRoleStore";\nimport AdminScreen from "./AdminScreen";');
a=a.replace('const [accountRole,setAccountRoleState]=useState<AccountRole>("teacher");','const [accountRole,setAccountRoleState]=useState<AccountRole>("student");\n  const [isAppAdmin,setIsAppAdmin]=useState(false);');
const oldEff='useEffect(()=>{if(!authUser)return;let alive=true;const refresh=()=>void getAccountRole().then(r=>{if(alive)setAccountRoleState(r)}).catch(()=>{});refresh();const listener=(e:Event)=>setAccountRoleState((e as CustomEvent<AccountRole>).detail);window.addEventListener("onlinerepetitor:account-role",listener);return()=>{alive=false;window.removeEventListener("onlinerepetitor:account-role",listener)}},[authUser?.id]);';
const newEff='useEffect(()=>{if(!authUser)return;let alive=true;const refresh=()=>void getAccountAccess().then(x=>{if(alive){setAccountRoleState(x.role);setIsAppAdmin(x.isAdmin)}}).catch(()=>{});refresh();const listener=()=>refresh();window.addEventListener("onlinerepetitor:account-access",listener);return()=>{alive=false;window.removeEventListener("onlinerepetitor:account-access",listener)}},[authUser?.id]);';
if(!a.includes(oldEff)){console.error("v82: App access effect anchor не найден");process.exit(1)}a=a.replace(oldEff,newEff);
a=a.replace('return section==="students"','return section==="admin" && isAppAdmin\n          ? <AdminScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />\n          : section==="students"');
a=a.replace(': section==="templates"\n          ? <TemplatesScreen', ': section==="templates" && accountRole==="teacher"\n          ? <TemplatesScreen');
a=a.replace('<BoardsScreen user={authUser} accountRole={accountRole}', '<BoardsScreen user={authUser} accountRole={accountRole} isAppAdmin={isAppAdmin}');
fs.writeFileSync("src/App.tsx",a);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
b=b.replace('type Props={user:AuthUser;accountRole:AccountRole;onOpenBoard:(b:BoardSummary)=>void;onLogout:()=>void};','type Props={user:AuthUser;accountRole:AccountRole;isAppAdmin:boolean;onOpenBoard:(b:BoardSummary)=>void;onLogout:()=>void};');
b=b.replace('export default function BoardsScreen({user,accountRole,onOpenBoard,onLogout}:Props){','export default function BoardsScreen({user,accountRole,isAppAdmin,onOpenBoard,onLogout}:Props){');
b=b.replace('const list=await ensureUserBoards(user);','const list=accountRole==="teacher"?await ensureUserBoards(user):await getUserBoards(user);');
b=b.replace('},[user.id]);','},[user.id,accountRole]);',1);
b=b.replace('<button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны</button>', '{accountRole==="teacher"&&<button onClick={()=>{window.history.pushState({},"","/?section=templates");window.dispatchEvent(new PopStateEvent("popstate"))}}>Шаблоны</button>}{isAppAdmin&&<button onClick={()=>{window.history.pushState({},"","/?section=admin");window.dispatchEvent(new PopStateEvent("popstate"))}}>Администрирование</button>}');
const actions='<div className="boards-heading-actions"><label className={`boards-secondary boards-import ${busy?"disabled":""}`}>Импортировать<input type="file" hidden disabled={busy} accept=".orboard,.json,application/json,application/vnd.onlinerepetitor.board+json" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void chooseImport(f)}}/></label><button className="boards-create" disabled={busy} onClick={()=>void add()}>+ Новая доска</button></div>';
if(!b.includes(actions)){console.error("v82: heading actions anchor не найден");process.exit(1)}
b=b.replace(actions,`<div className="boards-heading-actions">{accountRole==="teacher"?<><label className={\`boards-secondary boards-import \${busy?"disabled":""}\`}>Импортировать<input type="file" hidden disabled={busy} accept=".orboard,.json,application/json,application/vnd.onlinerepetitor.board+json" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void chooseImport(f)}}/></label><button className="boards-create" disabled={busy} onClick={()=>void add()}>+ Новая доска</button></>:<span className="student-board-note">Ученик работает только с досками, которые предоставил преподаватель.</span>}</div>`);
fs.writeFileSync("src/BoardsScreen.tsx",b);

let p=fs.readFileSync("src/ProfileScreen.tsx","utf8");
p=p.replace('import { getAccountRole,setAccountRole,type AccountRole } from "./accountRoleStore";','import { getAccountAccess,requestTeacherAccess,setStudentRole,type AccountAccess } from "./accountRoleStore";');
p=p.replace('const [s,setS]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100}),[saved,setSaved]=useState("");const [role,setRole]=useState<AccountRole>("teacher"),[roleBusy,setRoleBusy]=useState(false);',
'const [s,setS]=useState<ProfileSettings>({displayName:user.name,theme:"system",compactUi:false,defaultBoardZoom:100}),[saved,setSaved]=useState("");const [access,setAccess]=useState<AccountAccess>({role:"student",teacherStatus:"none",isAdmin:false,requestedAt:null,reviewedAt:null}),[roleBusy,setRoleBusy]=useState(false);');
p=p.replace('useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);applyProfileAppearance(x)});void getAccountRole().then(setRole)},[user.id]);',
'useEffect(()=>{void getProfileSettings(user).then(x=>{setS(x);applyProfileAppearance(x)});void getAccountAccess().then(setAccess)},[user.id]);');
const start=p.indexOf('<section className="profile-card account-role-card">');
const end=p.indexOf('</section>',start)+10;
if(start<0||end<10){console.error("v82: role card anchor не найден");process.exit(1)}
card=`<section className="profile-card account-role-card"><h2>Роль в OnlineRepetitor</h2>{access.isAdmin?<><div className="teacher-status approved"><b>Администратор</b><span>У вас есть права преподавателя и управление заявками.</span></div><button onClick={()=>location.href="/?section=admin"}>Открыть администрирование</button></>:access.role==="teacher"?<div className="teacher-status approved"><b>Преподаватель одобрен</b><span>Администратор подтвердил доступ к преподавательским функциям.</span></div>:access.teacherStatus==="pending"?<div className="teacher-status pending"><b>Заявка рассматривается</b><span>До решения администратора доступен только кабинет ученика.</span></div>:<><div className={\`teacher-status \${access.teacherStatus==="rejected"?"rejected":""}\`}><b>{access.teacherStatus==="rejected"?"Заявка отклонена":"Ученик"}</b><span>Ученики не могут создавать собственные доски и преподавательские материалы.</span></div><button className="students-primary" disabled={roleBusy} onClick={async()=>{setRoleBusy(true);try{const x=await requestTeacherAccess();setAccess(x);setSaved("Заявка преподавателя отправлена");window.dispatchEvent(new Event("onlinerepetitor:account-access"))}finally{setRoleBusy(false)}}}>Запросить роль преподавателя</button></>} {access.role==="teacher"&&!access.isAdmin&&<button disabled={roleBusy} onClick={async()=>{if(!confirm("Перейти в роль ученика? Для возврата роли преподавателя потребуется новое одобрение."))return;setRoleBusy(true);try{setAccess(await setStudentRole());window.dispatchEvent(new Event("onlinerepetitor:account-access"))}finally{setRoleBusy(false)}}}>Перейти в роль ученика</button>}<small>Права owner/editor/viewer на конкретных досках остаются отдельной системой доступа.</small></section>`;
p=p.slice(0,start)+card+p.slice(end);
fs.writeFileSync("src/ProfileScreen.tsx",p);

let c=fs.readFileSync("src/App.css","utf8");
c+=`
/* v82 · teacher approval */
.teacher-status{display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid var(--line,#dfe1e7);border-radius:12px;margin:8px 0 12px}.teacher-status span,.student-board-note{font-size:12px;opacity:.72}.teacher-status.approved{border-color:#55a86c}.teacher-status.pending{border-color:#c79b3b}.teacher-status.rejected{border-color:#c75b5b}.admin-approval-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:22px 0 10px}.admin-request-list{display:grid;gap:10px}.admin-request-list article{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px;border:1px solid var(--line,#dfe1e7);border-radius:14px}.admin-request-list article>div:first-child{display:flex;flex-direction:column;gap:3px}.admin-request-list article>div:last-child{display:flex;gap:8px}.student-board-note{max-width:320px;text-align:right}@media(max-width:650px){.admin-request-list article{align-items:flex-start;flex-direction:column}.student-board-note{text-align:left}}
`;
fs.writeFileSync("src/App.css",c);
console.log("v82 установлен. Теперь выполните supabase/v82_teacher_approval.sql и назначьте первого администратора по README, затем npm run build.");
