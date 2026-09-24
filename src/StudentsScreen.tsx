import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./authStore";
import type { BoardSummary } from "./boardStore";
import { getUserBoards } from "./boardStore";
import { getStudentsForTeacher, saveStudentNote, saveStudentTags, type StudentRecord } from "./studentsStore";

type Props={user:AuthUser;onBack:()=>void;onOpenBoard:(board:BoardSummary)=>void};

const fmt=(iso:string)=>iso?new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso)):"—";

export default function StudentsScreen({user,onBack,onOpenBoard}:Props){
 const [students,setStudents]=useState<StudentRecord[]>([]);
 const [boards,setBoards]=useState<BoardSummary[]>([]);
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 const [note,setNote]=useState("");
 const [tags,setTags]=useState("");
 const [notice,setNotice]=useState("");

 const load=async()=>{
   setLoading(true);
   try{
     const [s,b]=await Promise.all([getStudentsForTeacher(user),getUserBoards(user)]);
     setStudents(s);setBoards(b);
   }catch(e){setNotice(e instanceof Error?e.message:"Не удалось загрузить учеников")}
   finally{setLoading(false)}
 };
 useEffect(()=>{void load()},[user.id]);

 const visible=useMemo(()=>{
   const q=query.trim().toLowerCase();
   return students.filter(s=>!q||s.name.toLowerCase().includes(q)||s.email.toLowerCase().includes(q)||s.tags.some(t=>t.toLowerCase().includes(q)));
 },[students,query]);

 const student=students.find(s=>s.userId===selected)||null;
 useEffect(()=>{setNote(student?.note||"");setTags(student?.tags.join(", ")||"")},[selected,student?.note]);

 const save=()=>{
   if(!student)return;
   const parsed=tags.split(",").map(x=>x.trim()).filter(Boolean).slice(0,12);
   saveStudentNote(student.userId,note);
   saveStudentTags(student.userId,parsed);
   setStudents(cur=>cur.map(s=>s.userId===student.userId?{...s,note,tags:parsed}:s));
   setNotice("Карточка ученика сохранена");
 };

 return <main className="students-shell">
  <header className="students-header">
   <div><button className="boards-secondary" onClick={onBack}>← Доски</button><div><strong>Ученики</strong><span>Карточки, доски и заметки преподавателя</span></div></div>
   <span>{loading?"Загрузка…":`${students.length} учеников`}</span>
  </header>
  <section className="students-content">
   <div className="students-toolbar"><input type="search" placeholder="Поиск по имени, email или тегу" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>void load()}>Обновить</button></div>
   {notice&&<div className="access-notice">{notice}</div>}
   <div className="students-layout">
    <div className="students-list">
     {!loading&&visible.length===0&&<div className="boards-empty"><strong>Учеников пока нет</strong><span>Они появятся здесь после добавления на ваши доски.</span></div>}
     {visible.map(s=><button key={s.userId} className={`student-row ${selected===s.userId?"active":""}`} onClick={()=>setSelected(s.userId)}>
      <span className="student-avatar">{s.name.charAt(0).toUpperCase()}</span>
      <span><b>{s.name}</b><small>{s.email||"Email не указан"}</small><em>{s.boardIds.length} досок · последнее изменение {fmt(s.lastBoardAt)}</em></span>
     </button>)}
    </div>
    <aside className="student-card">
     {!student?<div className="student-placeholder"><strong>Выберите ученика</strong><span>Здесь появится его карточка.</span></div>:<>
      <div className="student-card-head"><span className="student-avatar large">{student.name.charAt(0).toUpperCase()}</span><div><h2>{student.name}</h2><p>{student.email}</p></div></div>
      <div className="student-stat-grid"><div><b>{student.boardIds.length}</b><span>досок</span></div><div><b>{fmt(student.lastBoardAt)}</b><span>последняя активность</span></div></div>
      <label className="student-field"><span>Теги</span><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="например: математика, 9 класс"/></label>
      <label className="student-field"><span>Заметки преподавателя</span><textarea value={note} onChange={e=>setNote(e.target.value)} rows={7} placeholder="Что важно помнить к следующему занятию…"/></label>
      <button className="students-primary" onClick={save}>Сохранить карточку</button>
      <div className="student-boards"><h3>Доски ученика</h3>{student.boardIds.map((id,i)=>{
       const b=boards.find(x=>x.id===id); if(!b)return null;
       return <button key={id} onClick={()=>onOpenBoard(b)}><span><b>{student.boardTitles[i]||b.title}</b><small>Изменено {fmt(b.updatedAt)}</small></span><strong>Открыть →</strong></button>
      })}</div>
     </>}
    </aside>
   </div>
  </section>
 </main>;
}
