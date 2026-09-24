import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("v82 hotfix 2: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const hook='  useEffect(()=>{if(!authUser)return;let alive=true;const refresh=()=>void getAccountAccess().then(x=>{if(alive){setAccountRoleState(x.role);setIsAppAdmin(x.isAdmin)}}).catch(()=>{});refresh();const listener=()=>refresh();window.addEventListener("onlinerepetitor:account-access",listener);return()=>{alive=false;window.removeEventListener("onlinerepetitor:account-access",listener)}},[authUser?.id]);';
const marker='  if (!authReady) {';
const pos=s.indexOf(hook);
const mark=s.indexOf(marker);
if(pos<0){console.error("v82 hotfix 2: hook account-access не найден");process.exit(1)}
if(mark<0){console.error("v82 hotfix 2: authReady marker не найден");process.exit(1)}
if(pos<mark){console.log("v82 hotfix 2 уже установлен.");process.exit(0)}
s=s.slice(0,pos)+s.slice(pos+hook.length);
const mark2=s.indexOf(marker);
s=s.slice(0,mark2)+hook+"\n\n"+s.slice(mark2);
fs.writeFileSync(p,s);
console.log("v82 hotfix 2 установлен: React hook перенесён выше условного return. Запустите npm run build.");
