import fs from "node:fs";
for(const p of ["src/AssignmentsScreen.tsx","src/ScheduleScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v84: не найден "+p);process.exit(1)}

let a=fs.readFileSync("src/AssignmentsScreen.tsx","utf8");
a=a.replace('<header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Задания</strong><span>Выдача, сдача, проверка и результаты</span></div></div>{isTeacher&&<button className="boards-create" onClick={openCreate}>+ Новое задание</button>}</header>',
'<header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>{isTeacher?"Задания":"Мои задания"}</strong><span>{isTeacher?"Выдача, сдача, проверка и результаты":"Работы от преподавателей, сроки и результаты"}</span></div></div>{isTeacher&&<button className="boards-create" onClick={openCreate}>+ Новое задание</button>}</header>');
a=a.replace('<span>{a.teacherId===user.id?studentName(a.studentId):"От преподавателя"}</span>',
'<span>{isTeacher?studentName(a.studentId):"От преподавателя"}</span>');
a=a.replace('<button className="students-primary" onClick={()=>void submit()}>{active.submittedAt?"Отправить повторно":"Сдать работу"}</button>',
'<button className="students-primary" disabled={!answer.trim()} onClick={()=>void submit()}>{active.submittedAt?"Отправить повторно":"Сдать работу"}</button>');
fs.writeFileSync("src/AssignmentsScreen.tsx",a);

let s=fs.readFileSync("src/ScheduleScreen.tsx","utf8");
s=s.replace('<header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Расписание</strong><span>План занятий и быстрый запуск урока</span></div></div>{teacher&&<button className="boards-create" onClick={()=>openNew()}>+ Занятие</button>}</header>',
'<header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>{teacher?"Расписание":"Моё расписание"}</strong><span>{teacher?"План занятий и быстрый запуск урока":"Предстоящие занятия и доступные учебные доски"}</span></div></div>{teacher&&<button className="boards-create" onClick={()=>openNew()}>+ Занятие</button>}</header>');
s=s.replace('<span>{x.studentName}</span><small>{x.durationMinutes} мин · {x.boardTitle}</small>',
'<span>{teacher?x.studentName:"Занятие с преподавателем"}</span><small>{x.durationMinutes} мин · {x.boardTitle}</small>');
fs.writeFileSync("src/ScheduleScreen.tsx",s);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v84 · student workspace polish */"))c+=`
/* v84 · student workspace polish */
.student-role-banner b{white-space:nowrap}.assignment-card.status-reviewed .assignment-status{font-weight:700}
`;
fs.writeFileSync("src/App.css",c);
console.log("v84 установлен. Выполните supabase/v84_role_security_finish.sql, затем npm run build.");
