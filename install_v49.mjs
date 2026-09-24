import fs from "node:fs";
for(const p of ["src/App.tsx","src/BoardsScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v49: не найден "+p);process.exit(1)}
let a=fs.readFileSync("src/App.tsx","utf8");
if(!a.includes('NotificationsScreen'))a=a.replace('import MaterialsScreen from "./MaterialsScreen";','import MaterialsScreen from "./MaterialsScreen";\nimport NotificationsScreen from "./NotificationsScreen";');
a=a.replace(': section==="materials"\n          ? <MaterialsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />\n          : <BoardsScreen',': section==="materials"\n          ? <MaterialsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />\n          : section==="notifications"\n          ? <NotificationsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />\n          : <BoardsScreen');
fs.writeFileSync("src/App.tsx",a);
for(const f of ["src/BoardsScreen.tsx","src/StudentsScreen.tsx","src/AssignmentsScreen.tsx","src/ProgressScreen.tsx","src/ScheduleScreen.tsx","src/MaterialsScreen.tsx"]){
 if(!fs.existsSync(f))continue;let s=fs.readFileSync(f,"utf8");
 if(!s.includes('/?section=notifications')){
  const nav='</nav>';const pos=s.indexOf(nav);if(pos>=0)s=s.slice(0,pos)+'<button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления</button>'+s.slice(pos);
 }
 fs.writeFileSync(f,s);
}
let c=fs.readFileSync("src/App.css","utf8");if(!c.includes("/* v49 · notifications */"))c+=`
/* v49 · notifications */
.notifications-shell{min-height:100vh;background:#f6f6f9;color:#292a34}.notifications-content{max-width:980px;margin:auto;padding:22px 24px 60px}.notification-filters{display:flex;gap:6px;margin:16px 0}.notification-filters button{border:1px solid #dedfe7;background:#fff;border-radius:999px;padding:7px 11px;font-size:9px;cursor:pointer}.notification-filters button.active{background:#5b5dc4;color:#fff;border-color:#5b5dc4}.notification-list{display:grid;gap:7px}.notification-card{width:100%;border:1px solid #e1e2e9;background:#fff;border-radius:11px;padding:11px;display:grid;grid-template-columns:8px 1fr auto;gap:10px;text-align:left;cursor:pointer}.notification-card.unread{border-color:#cfd0f5;background:#fbfbff}.notification-dot{width:7px;height:7px;border-radius:50%;background:#d7d8df;margin-top:5px}.notification-card.unread .notification-dot{background:#5b5dc4}.notification-card div{display:grid;gap:2px}.notification-card small{font-size:8px;color:#8a8d98}.notification-card strong{font-size:10px}.notification-card p{font-size:9px;color:#666a76;margin:2px 0}
`;fs.writeFileSync("src/App.css",c);
console.log("v49 установлен. Выполните SQL, затем npm run build");
