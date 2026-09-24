import fs from "node:fs";
const p="src/StudentsScreen.tsx";
if(!fs.existsSync(p)){console.error("v37: не найден src/StudentsScreen.tsx");process.exit(1)}
let s=fs.readFileSync(p,"utf8");
s=s.replace("saveStudentNote(student.userId,note);saveStudentTags(student.userId,parsed);setStudents", "void Promise.all([saveStudentNote(student.userId,note),saveStudentTags(student.userId,parsed)]).catch(()=>setNotice(\"Не удалось сохранить карточку на сервере\"));setStudents");
s=s.replace("saveStudentSession(session);setStudents", "void saveStudentSession(session).catch(()=>setNotice(\"Не удалось сохранить занятие на сервере\"));setStudents");
s=s.replace("deleteStudentSession(s.id);setStudents", "void deleteStudentSession(s.id).catch(()=>setNotice(\"Не удалось удалить занятие на сервере\"));setStudents");
fs.writeFileSync(p,s,"utf8");
console.log("v37 установлен. Теперь выполните SQL supabase/v37_student_records.sql, затем npm run build");
