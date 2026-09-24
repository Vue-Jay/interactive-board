import fs from "node:fs";
for(const p of ["src/notificationSettingsStore.ts","src/NotificationsScreen.tsx","src/BoardsScreen.tsx"])if(!fs.existsSync(p)){console.error("v79: не найден "+p);process.exit(1)}

let s=fs.readFileSync("src/notificationSettingsStore.ts","utf8");
const old='export async function saveNotificationSettings(s:NotificationSettings){if(!isRemoteBackendEnabled())return;await remoteRequest("/rest/v1/notification_settings",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({assignment:s.assignment,submission:s.submission,review:s.review,lesson:s.lesson,material:s.material,lesson_reminder:s.lessonReminder,assignment_reminder:s.assignmentReminder})})}';
const neu='export async function saveNotificationSettings(s:NotificationSettings){if(!isRemoteBackendEnabled())return;await remoteRequest("/rest/v1/rpc/save_my_notification_settings",{method:"POST",body:JSON.stringify({p_assignment:s.assignment,p_submission:s.submission,p_review:s.review,p_lesson:s.lesson,p_material:s.material,p_lesson_reminder:s.lessonReminder,p_assignment_reminder:s.assignmentReminder})})}';
if(!s.includes(old)){console.error("v79: saveNotificationSettings anchor не найден");process.exit(1)}
s=s.replace(old,neu);
fs.writeFileSync("src/notificationSettingsStore.ts",s);

let n=fs.readFileSync("src/NotificationsScreen.tsx","utf8");
const eff='useEffect(()=>{void load()},[user.id]);';
if(!n.includes(eff)){console.error("v79: NotificationsScreen effect anchor не найден");process.exit(1)}
n=n.replace(eff,`useEffect(()=>{void load();const refresh=()=>void load();const timer=window.setInterval(refresh,60000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)}},[user.id]);`);
n=n.replace('const load=async()=>{setLoading(true);try{const [items,prefs]=await Promise.all([listNotifications(),getNotificationSettings()]);setRows(items);setSettings(prefs)}finally{setLoading(false)}};',
'const load=async()=>{setLoading(true);try{const [items,prefs]=await Promise.all([listNotifications(),getNotificationSettings()]);setRows(items);setSettings(prefs)}finally{setLoading(false)}};');
fs.writeFileSync("src/NotificationsScreen.tsx",n);

let b=fs.readFileSync("src/BoardsScreen.tsx","utf8");
const beff='useEffect(()=>{void listNotifications().then(x=>setNotificationUnreadCount(x.filter(v=>!v.readAt).length)).catch(()=>{})},[user.id]);';
if(!b.includes(beff)){console.error("v79: BoardsScreen badge effect anchor не найден");process.exit(1)}
b=b.replace(beff,`useEffect(()=>{const refresh=()=>void listNotifications().then(x=>setNotificationUnreadCount(x.filter(v=>!v.readAt).length)).catch(()=>{});refresh();const timer=window.setInterval(refresh,60000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)}},[user.id]);`);
fs.writeFileSync("src/BoardsScreen.tsx",b);

console.log("v79 установлен. Теперь выполните SQL supabase/v79_notifications_finish.sql и затем npm run build.");
