import fs from "node:fs";
const files=["src/App.tsx","src/ScheduleScreen.tsx","src/scheduleStore.ts","src/lessonStore.ts","src/App.css"];
for(const p of files)if(!fs.existsSync(p)){console.error("v43: не найден "+p);process.exit(1)}
let a=fs.readFileSync("src/App.tsx","utf8");
if(!a.includes('const [lessonScheduleId,setLessonScheduleId]=useState<string|null>(null);'))a=a.replace('const [lessonStudentId,setLessonStudentId]=useState(""),[lessonTopic,setLessonTopic]=useState("");','const [lessonStudentId,setLessonStudentId]=useState(""),[lessonTopic,setLessonTopic]=useState("");\n  const [lessonScheduleId,setLessonScheduleId]=useState<string|null>(null);');
const old='useEffect(()=>{if(boardSummary.role==="owner")void getActiveLesson(boardSummary.id).then(setLiveLesson).catch(()=>undefined)},[boardSummary.id,boardSummary.role]);';
const neu=`useEffect(()=>{if(boardSummary.role!=="owner")return;void getActiveLesson(boardSummary.id).then(existing=>{if(existing){setLiveLesson(existing);return}try{const raw=sessionStorage.getItem("onlinerepetitor.schedule.start");if(!raw)return;const planned=JSON.parse(raw);sessionStorage.removeItem("onlinerepetitor.schedule.start");if(!planned?.studentId)return;setLessonStudentId(planned.studentId);setLessonTopic(planned.topic||"");setLessonScheduleId(planned.scheduleId||null);setLessonOpen(true);setNotice("Занятие из расписания готово к запуску")}catch{sessionStorage.removeItem("onlinerepetitor.schedule.start")}}).catch(()=>undefined)},[boardSummary.id,boardSummary.role]);`;
if(a.includes(old))a=a.replace(old,neu);else if(!a.includes('Занятие из расписания готово к запуску')){console.error("v43: не найден lesson bootstrap");process.exit(1)}
a=a.replace('startLesson(boardSummary.id,student.userId,student.name,lessonTopic)','startLesson(boardSummary.id,student.userId,student.name,lessonTopic,lessonScheduleId)');
a=a.replace('setLiveLesson(lesson);setLessonOpen(false);','setLiveLesson(lesson);setLessonScheduleId(null);setLessonOpen(false);');
fs.writeFileSync("src/App.tsx",a);
let sc=fs.readFileSync("src/ScheduleScreen.tsx","utf8");
sc=sc.replace('<span>{x.teacherId===user.id?x.studentName:"Занятие с преподавателем"}</span>','<span>{x.teacherId===user.id?x.studentName:"Занятие с преподавателем"}</span><small>{x.durationMinutes} мин · {x.boardTitle}</small>');
fs.writeFileSync("src/ScheduleScreen.tsx",sc);
let css=fs.readFileSync("src/App.css","utf8");if(!css.includes("/* v43 · lesson flow */"))css+=`
/* v43 · lesson flow */
.schedule-side small{font-size:8px;color:#999ca7}.schedule-event.completed b{text-decoration:line-through}.schedule-event.completed:after{content:"Проведено";font-size:7px;font-weight:850;color:#39895a;text-transform:uppercase;letter-spacing:.3px}
`;fs.writeFileSync("src/App.css",css);
console.log("v43 установлен. Выполните SQL v43, затем npm run build");
