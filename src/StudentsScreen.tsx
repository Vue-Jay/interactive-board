import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./authStore";
import type { BoardSummary } from "./boardStore";
import { getUserBoards } from "./boardStore";
import {
  deleteStudentSession,getStudentsForTeacher,saveStudentProfile,saveStudentSession,
  type StudentRecord,type StudentSession,
} from "./studentsStore";
import { listStudentMaterials,unlinkMaterial,type MaterialLink } from "./materialLinksStore";
import { downloadMaterial,type Material } from "./materialsStore";
import { listAssignments,type Assignment } from "./assignmentsStore";
import { listScheduledLessons,type ScheduledLesson } from "./scheduleStore";

type Props={user:AuthUser;onBack:()=>void;onOpenBoard:(board:BoardSummary)=>void};
const fmt=(iso:string)=>iso?new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso)):"—";
const fmtDateTime=(iso:string)=>iso?new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso)):"—";
const today=()=>new Date().toISOString().slice(0,10);
const overdue=(a:Assignment)=>a.status==="assigned"&&!!a.dueAt&&Date.parse(a.dueAt)<Date.now();

export default function StudentsScreen({user,onBack,onOpenBoard}:Props){
 const [students,setStudents]=useState<StudentRecord[]>([]),[boards,setBoards]=useState<BoardSummary[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]),[schedule,setSchedule]=useState<ScheduledLesson[]>([]);
 const [loading,setLoading]=useState(true),[query,setQuery]=useState(""),[selected,setSelected]=useState<string|null>(null);
 const [note,setNote]=useState(""),[tags,setTags]=useState(""),[notice,setNotice]=useState("");
 const [linkedMaterials,setLinkedMaterials]=useState<MaterialLink[]>([]);
 const [sessionOpen,setSessionOpen]=useState(false),[sessionId,setSessionId]=useState<string|null>(null);
 const [sessionDate,setSessionDate]=useState(today()),[sessionBoard,setSessionBoard]=useState("");
 const [sessionDuration,setSessionDuration]=useState("60"),[sessionTopic,setSessionTopic]=useState("");
 const [sessionHomework,setSessionHomework]=useState(""),[sessionResult,setSessionResult]=useState("");

 const load=async()=>{setLoading(true);try{
   const [s,b,a,sch]=await Promise.all([getStudentsForTeacher(user),getUserBoards(user),listAssignments(user.id),listScheduledLessons(user.id)]);
   setStudents(s);setBoards(b);setAssignments(a.filter(x=>x.teacherId===user.id));setSchedule(sch.filter(x=>x.teacherId===user.id));
 }catch(e){setNotice(e instanceof Error?e.message:"Не удалось загрузить учеников")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[user.id]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return students.filter(s=>!q||s.name.toLowerCase().includes(q)||s.email.toLowerCase().includes(q)||s.tags.some(t=>t.toLowerCase().includes(q)))},[students,query]);
 const student=students.find(s=>s.userId===selected)||null;
 useEffect(()=>{setNote(student?.note||"");setTags(student?.tags.join(", ")||"");if(student)void listStudentMaterials(student.userId).then(setLinkedMaterials).catch(()=>setLinkedMaterials([]));else setLinkedMaterials([])},[selected,student?.note]);

 const persistCard=async()=>{if(!student)return;const parsed=tags.split(",").map(x=>x.trim()).filter(Boolean).slice(0,12);try{await saveStudentProfile(student.userId,note,parsed);setStudents(cur=>cur.map(s=>s.userId===student.userId?{...s,note,tags:parsed}:s));setNotice("Карточка ученика сохранена")}catch{setNotice("Не удалось сохранить карточку на сервере")}};
 const resetSession=()=>{setSessionId(null);setSessionDate(today());setSessionBoard(student?.boardIds[0]||"");setSessionDuration("60");setSessionTopic("");setSessionHomework("");setSessionResult("")};
 const openNewSession=()=>{resetSession();setSessionOpen(true)};
 const editSession=(s:StudentSession)=>{setSessionId(s.id);setSessionDate(s.date.slice(0,10));setSessionBoard(s.boardId);setSessionDuration(String(s.durationMinutes));setSessionTopic(s.topic);setSessionHomework(s.homework);setSessionResult(s.result);setSessionOpen(true)};
 const persistSession=async()=>{if(!student)return;const board=boards.find(b=>b.id===sessionBoard);const session:StudentSession={id:sessionId||crypto.randomUUID(),studentId:student.userId,boardId:sessionBoard,boardTitle:board?.title||"Без доски",date:new Date(`${sessionDate}T12:00:00`).toISOString(),durationMinutes:Math.max(0,Number(sessionDuration)||0),topic:sessionTopic.trim(),homework:sessionHomework.trim(),result:sessionResult.trim()};try{await saveStudentSession(session);setStudents(cur=>cur.map(s=>s.userId===student.userId?{...s,sessions:[...s.sessions.filter(x=>x.id!==session.id),session].sort((a,b)=>b.date.localeCompare(a.date))}:s));setSessionOpen(false);setNotice(sessionId?"Запись занятия обновлена":"Занятие добавлено")}catch{setNotice("Не удалось сохранить занятие на сервере")}};

 const studentBoards=student?boards.filter(b=>student.boardIds.includes(b.id)):[];
 const totalMinutes=student?.sessions.reduce((sum,s)=>sum+s.durationMinutes,0)||0;
 const studentAssignments=student?assignments.filter(a=>a.studentId===student.userId):[];
 const reviewed=studentAssignments.filter(a=>a.status==="reviewed");
 const scored=reviewed.filter(a=>a.score!=null&&a.maxScore>0);
 const average=scored.length?Math.round(scored.reduce((n,a)=>n+(a.score!/a.maxScore*100),0)/scored.length):null;
 const late=studentAssignments.filter(overdue).length;
 const pendingReview=studentAssignments.filter(a=>a.status==="submitted").length;
 const nextLesson=student?schedule.filter(x=>x.studentId===student.userId&&x.status==="planned"&&Date.parse(x.startsAt)>=Date.now()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt))[0]||null:null;
 const openProgress=()=>{if(!student)return;sessionStorage.setItem("onlinerepetitor.progress.student",student.userId);window.history.pushState({},"","/?section=progress");window.dispatchEvent(new PopStateEvent("popstate"))};
 const openAssignments=()=>{if(!student)return;sessionStorage.setItem("onlinerepetitor.assignments.student",student.userId);window.history.pushState({},"","/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))};
 const openSchedule=()=>{window.history.pushState({},"","/?section=schedule");window.dispatchEvent(new PopStateEvent("popstate"))};

 return <main className="students-shell">
  <header className="students-header"><div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Ученики</strong><span>Карточки, история, результаты, задания и расписание</span></div></div><span>{loading?"Загрузка…":`${students.length} учеников`}</span></header>
  <section className="students-content">
   <nav className="dashboard-nav"><button onClick={onBack}>Доски</button><button className="active">Ученики</button><button onClick={()=>{window.history.pushState({},"","/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>Задания</button><button onClick={()=>{window.history.pushState({},"","/?section=progress");window.dispatchEvent(new PopStateEvent("popstate"))}}>Прогресс</button><button onClick={()=>{window.history.pushState({},"","/?section=schedule");window.dispatchEvent(new PopStateEvent("popstate"))}}>Расписание</button><button onClick={()=>{window.history.pushState({},"","/?section=materials");window.dispatchEvent(new PopStateEvent("popstate"))}}>Материалы</button><button onClick={()=>{window.history.pushState({},"","/?section=notifications");window.dispatchEvent(new PopStateEvent("popstate"))}}>Уведомления</button><button onClick={()=>{window.history.pushState({},"","/?section=profile");window.dispatchEvent(new PopStateEvent("popstate"))}}>Настройки</button></nav>
   <div className="students-toolbar"><input type="search" placeholder="Поиск по имени, email или тегу" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>void load()}>Обновить</button></div>
   {notice&&<div className="access-notice">{notice}</div>}
   <div className="students-layout">
    <div className="students-list">{!loading&&visible.length===0&&<div className="boards-empty"><strong>Учеников пока нет</strong><span>Они появятся после добавления на ваши доски.</span></div>}{visible.map(s=>{const sa=assignments.filter(a=>a.studentId===s.userId);const alert=sa.filter(overdue).length+sa.filter(a=>a.status==="submitted").length;return <button key={s.userId} className={`student-row ${selected===s.userId?"active":""}`} onClick={()=>setSelected(s.userId)}><span className="student-avatar">{s.name.charAt(0).toUpperCase()}</span><span><b>{s.name}</b><small>{s.email||"Email не указан"}</small><em>{s.boardIds.length} досок · {s.sessions.length} занятий{alert?` · требует внимания: ${alert}`:""}</em></span></button>})}</div>
    <aside className="student-card">
     {!student?<div className="student-placeholder"><strong>Выберите ученика</strong><span>Здесь появится единая карточка ученика.</span></div>:<>
      <div className="student-card-head"><span className="student-avatar large">{student.name.charAt(0).toUpperCase()}</span><div><h2>{student.name}</h2><p>{student.email}</p></div></div>
      <div className="student-stat-grid student-stat-grid-4"><div><b>{student.boardIds.length}</b><span>досок</span></div><div><b>{student.sessions.length}</b><span>занятий</span></div><div><b>{Math.round(totalMinutes/60*10)/10} ч</b><span>в истории</span></div><div><b>{fmt(student.lastBoardAt)}</b><span>активность</span></div></div>
      <div className="student-stat-grid student-stat-grid-4"><div><b>{studentAssignments.length}</b><span>заданий</span></div><div><b>{average==null?"—":`${average}%`}</b><span>средний балл</span></div><div><b>{pendingReview}</b><span>на проверке</span></div><div><b>{late}</b><span>просрочено</span></div></div>
      <div className="student-history-empty">{nextLesson?<><b>Следующее занятие:</b> {fmtDateTime(nextLesson.startsAt)} · {nextLesson.title} · {nextLesson.durationMinutes} мин</>:<>Следующих занятий в расписании нет.</>}</div>
      <label className="student-field"><span>Теги</span><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="математика, 9 класс, ЕГЭ"/></label>
      <label className="student-field"><span>Заметки преподавателя</span><textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} placeholder="Что важно помнить к следующему занятию…"/></label>
      <div className="student-card-actions"><button className="students-primary" onClick={()=>void persistCard()}>Сохранить карточку</button><button className="boards-secondary" onClick={openProgress}>Прогресс</button><button className="boards-secondary" onClick={openAssignments}>Задания</button><button className="boards-secondary" onClick={openSchedule}>Расписание</button></div>
      <div className="student-section-head"><h3>История занятий</h3><button onClick={openNewSession}>+ Добавить занятие</button></div>
      <div className="student-history">{student.sessions.length===0?<div className="student-history-empty">Пока нет записей о занятиях.</div>:student.sessions.map(s=><article key={s.id} className="student-session"><div><b>{s.topic||"Занятие без темы"}</b><span>{fmt(s.date)} · {s.durationMinutes} мин · {s.boardTitle}</span>{s.result&&<p><strong>Итог:</strong> {s.result}</p>}{s.homework&&<p><strong>Домашнее:</strong> {s.homework}</p>}</div><div><button onClick={()=>editSession(s)}>Изменить</button><button className="danger" onClick={async()=>{if(confirm("Удалить запись занятия?")){try{await deleteStudentSession(s.id);setStudents(cur=>cur.map(x=>x.userId===student.userId?{...x,sessions:x.sessions.filter(v=>v.id!==s.id)}:x))}catch{setNotice("Не удалось удалить занятие на сервере")}}}}>Удалить</button></div></article>)}</div>
      <div className="student-materials"><div className="student-section-head"><h3>Материалы ученика</h3><span>{linkedMaterials.length}</span></div>{linkedMaterials.length===0?<div className="student-history-empty">Материалы пока не назначены.</div>:linkedMaterials.map(m=><article key={m.id}><div><b>{m.materialTitle}</b><span>{m.assignmentId?"К заданию":"Личный материал"}</span></div><div><button onClick={()=>void downloadMaterial({id:m.materialId,ownerId:user.id,folder:"",title:m.materialTitle,fileName:m.fileName,mime:m.mime,size:0,storagePath:m.storagePath,createdAt:m.createdAt,favorite:false,useCount:0,lastUsedAt:null} as Material).catch(e=>setNotice(e.message))}>Скачать</button><button className="danger" onClick={async()=>{await unlinkMaterial(m.id);setLinkedMaterials(x=>x.filter(v=>v.id!==m.id))}}>Убрать</button></div></article>)}</div>
      <div className="student-boards"><h3>Доски ученика</h3>{studentBoards.map(b=><button key={b.id} onClick={()=>onOpenBoard(b)}><span><b>{b.title}</b><small>Изменено {fmt(b.updatedAt)}</small></span><strong>Открыть →</strong></button>)}</div>
     </>}
    </aside>
   </div>
  </section>
  {sessionOpen&&student&&<div className="access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSessionOpen(false)}}><section className="access-modal student-session-modal"><div className="access-head"><div><h2>{sessionId?"Изменить занятие":"Новое занятие"}</h2><p>{student.name}</p></div><button onClick={()=>setSessionOpen(false)}>×</button></div><div className="session-form"><label><span>Дата</span><input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></label><label><span>Доска</span><select value={sessionBoard} onChange={e=>setSessionBoard(e.target.value)}><option value="">Без доски</option>{studentBoards.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label><label><span>Длительность, минут</span><input type="number" min="0" step="5" value={sessionDuration} onChange={e=>setSessionDuration(e.target.value)}/></label><label className="wide"><span>Тема занятия</span><input value={sessionTopic} onChange={e=>setSessionTopic(e.target.value)} placeholder="Квадратные уравнения"/></label><label className="wide"><span>Итог / прогресс</span><textarea rows={3} value={sessionResult} onChange={e=>setSessionResult(e.target.value)} placeholder="Что получилось, над чем ещё работать"/></label><label className="wide"><span>Домашнее задание</span><textarea rows={3} value={sessionHomework} onChange={e=>setSessionHomework(e.target.value)} placeholder="Что выполнить к следующему занятию"/></label></div><div className="session-actions"><button className="students-primary" onClick={()=>void persistSession()}>Сохранить занятие</button><button className="boards-secondary" onClick={()=>setSessionOpen(false)}>Отмена</button></div></section></div>}
 </main>;
}
