import fs from "node:fs";

const p="src/ScheduleScreen.tsx";
if(!fs.existsSync(p)){console.error("v83 hotfix 1: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");

let changed=0;

if(!s.includes('import type { AccountRole } from "./accountRoleStore";')){
  const anchor='import type { AuthUser } from "./authStore";';
  if(!s.includes(anchor)){console.error("v83 hotfix 1: import anchor не найден");process.exit(1)}
  s=s.replace(anchor,anchor+'\nimport type { AccountRole } from "./accountRoleStore";');
  changed++;
}

const oldProps='type Props={user:AuthUser;onBack:()=>void;onOpenBoard:(b:BoardSummary)=>void};';
const newProps='type Props={user:AuthUser;accountRole:AccountRole;onBack:()=>void;onOpenBoard:(b:BoardSummary)=>void};';
if(s.includes(oldProps)){s=s.replace(oldProps,newProps);changed++}
else if(!s.includes(newProps)){console.error("v83 hotfix 1: Props anchor не найден");process.exit(1)}

const oldFn='export default function ScheduleScreen({user,onBack,onOpenBoard}:Props){';
const newFn='export default function ScheduleScreen({user,accountRole,onBack,onOpenBoard}:Props){';
if(s.includes(oldFn)){s=s.replace(oldFn,newFn);changed++}
else if(!s.includes(newFn)){console.error("v83 hotfix 1: component anchor не найден");process.exit(1)}

const oldLoad='const load=async()=>{setLoading(true);try{const [r,s,b]=await Promise.all([listScheduledLessons(user.id),getStudentsForTeacher(user).catch(()=>[]),getUserBoards(user)]);setRows(r);setStudents(s);setBoards(b)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось загрузить расписание")}finally{setLoading(false)}};';
const newLoad='const load=async()=>{setLoading(true);try{const [r,s,b]=await Promise.all([listScheduledLessons(user.id),accountRole==="teacher"?getStudentsForTeacher(user).catch(()=>[]):Promise.resolve([]),getUserBoards(user)]);setRows(r);setStudents(s);setBoards(b)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось загрузить расписание")}finally{setLoading(false)}};';
if(s.includes(oldLoad)){s=s.replace(oldLoad,newLoad);changed++}

if(s.includes('useEffect(()=>{void load()},[user.id]);')){
  s=s.replace('useEffect(()=>{void load()},[user.id]);','useEffect(()=>{void load()},[user.id,accountRole]);');
  changed++;
}

if(s.includes('const teacher=students.length>0||rows.some(x=>x.teacherId===user.id);')){
  s=s.replace('const teacher=students.length>0||rows.some(x=>x.teacherId===user.id);','const teacher=accountRole==="teacher";');
  changed++;
}

fs.writeFileSync(p,s);
console.log(`v83 hotfix 1 установлен: ScheduleScreen синхронизирован с accountRole (${changed} изменений).`);
console.log("Теперь запустите npm run build.");
