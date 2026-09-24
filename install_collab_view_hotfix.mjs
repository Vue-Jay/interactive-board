import fs from "node:fs";

for(const p of ["src/App.tsx","src/boardSync.ts"]){
  if(!fs.existsSync(p)){console.error("collab hotfix: не найден "+p);process.exit(1)}
}

let sync=fs.readFileSync("src/boardSync.ts","utf8");
const oldFp=`export function documentFingerprint(document: DocumentData): string {
  return JSON.stringify(document, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  });
}`;
const newFp=`export function documentFingerprint(document: DocumentData): string {
  // Viewport is personal UI state. Panning/zooming must never create a collaborative revision
  // or a false conflict between participants.
  const collaborative = { ...document, view: undefined };
  return JSON.stringify(collaborative, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  });
}`;
if(sync.includes(oldFp)) sync=sync.replace(oldFp,newFp);
else if(!sync.includes("Viewport is personal UI state")){console.error("collab hotfix: documentFingerprint anchor не найден");process.exit(1)}
fs.writeFileSync("src/boardSync.ts",sync);

let a=fs.readFileSync("src/App.tsx","utf8");
let n=0;

// 1. Remote document updates must update content, not steal another participant's viewport.
const oldApply=`    setTitle(data.title);
    setView(data.view);
    display(data.items);`;
const newApply=`    setTitle(data.title);
    if (!fromRemote) setView(data.view);
    display(data.items);`;
if(a.includes(oldApply)){a=a.replace(oldApply,newApply);n++}
else if(!a.includes("if (!fromRemote) setView(data.view);")){console.error("collab hotfix: applyDocument anchor не найден");process.exit(1)}

// 2. Panning/zooming is not a board edit and must not schedule a server save.
const depOld=`    items,
    title,
    view,
    editing,`;
const depNew=`    items,
    title,
    editing,`;
if(a.includes(depOld)){a=a.replace(depOld,depNew);n++}
else if(!a.includes(depNew)){console.error("collab hotfix: autosave dependencies anchor не найден");process.exit(1)}

// 3. Guided mode must not permanently turn on the student's personal follow toggle.
const teacherOld=`      (teacherView) => {
        if (!followTeacherRef.current) return;`;
const teacherNew=`      (teacherView) => {
        if (!(followTeacherRef.current || guidedFollowRef.current)) return;`;
if(a.includes(teacherOld)){a=a.replace(teacherOld,teacherNew);n++}
else if(!a.includes("if (!(followTeacherRef.current || guidedFollowRef.current)) return;")){console.error("collab hotfix: teacher view anchor не найден");process.exit(1)}

const guidedOld=`        guidedFollowRef.current = guided.enabled;
        setGuidedFollow(guided.enabled);
        followTeacherRef.current = guided.enabled || followTeacherRef.current;
        if (guided.enabled) setFollowTeacher(true);
        setNotice(guided.enabled`;
const guidedNew=`        guidedFollowRef.current = guided.enabled;
        setGuidedFollow(guided.enabled);
        setNotice(guided.enabled`;
if(a.includes(guidedOld)){a=a.replace(guidedOld,guidedNew);n++}
else if(!a.includes(guidedNew)){console.error("collab hotfix: guided follow anchor не найден");process.exit(1)}

// 4. Active appearance reflects either personal or forced guided following.
a=a.replace('className={`lesson-button follow-teacher-button ${followTeacher ? "active" : ""}`}',
            'className={`lesson-button follow-teacher-button ${followTeacher || guidedFollow ? "active" : ""}`}');

fs.writeFileSync("src/App.tsx",a);
console.log(`Исправление совместной навигации установлено (${n} ключевых замен).`);
console.log("Перемещение/масштаб больше не являются серверными изменениями; удалённое обновление не меняет viewport; guided follow не залипает.");
console.log("Запустите npm run build.");
