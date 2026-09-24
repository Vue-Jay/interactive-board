import fs from "node:fs";
const p="src/App.tsx",c="src/App.css";
if(!fs.existsSync(p)||!fs.existsSync(c)){console.error("v39: App.tsx/App.css не найдены");process.exit(1)}
let s=fs.readFileSync(p,"utf8"),css=fs.readFileSync(c,"utf8");
const P=(n,r,l)=>{if(s.includes(r))return;if(!s.includes(n)){console.error("v39: не найден "+l);process.exit(1)}s=s.replace(n,r)};

P('  const [lessonResult,setLessonResult]=useState(""),[lessonHomework,setLessonHomework]=useState(""),[lessonClock,setLessonClock]=useState(Date.now());',
'  const [lessonResult,setLessonResult]=useState(""),[lessonHomework,setLessonHomework]=useState(""),[lessonClock,setLessonClock]=useState(Date.now());\n  const [lessonPanelOpen,setLessonPanelOpen]=useState(false);',
"state");

const chip='<div className="live-lesson-chip"><span className="live-lesson-dot"/><span><b>{liveLesson.studentName}</b><small>{liveLesson.topic||"Урок"} · {lessonTime}</small></span><button onClick={()=>setLessonFinishOpen(true)}>Завершить</button></div>';
const chip2='<div className="live-lesson-chip"><span className="live-lesson-dot"/><button className="live-lesson-main" onClick={()=>setLessonPanelOpen(true)} title="Открыть панель урока"><span><b>{liveLesson.studentName}</b><small>{liveLesson.topic||"Урок"} · {lessonTime}</small></span></button><button onClick={()=>setLessonFinishOpen(true)}>Завершить</button></div>';
P(chip,chip2,"lesson chip");

const anchor='{lessonFinishOpen && liveLesson && <div className="access-backdrop"><section className="access-modal lesson-live-modal">';
const panel=`{lessonPanelOpen && liveLesson && <aside className="lesson-control-panel">
        <div className="lesson-control-head"><div><span className="live-lesson-dot"/><div><b>Идёт урок</b><small>{lessonTime}</small></div></div><button onClick={()=>setLessonPanelOpen(false)}>×</button></div>
        <div className="lesson-control-student"><span className="presence-avatar">{liveLesson.studentName.charAt(0).toUpperCase()}</span><div><strong>{liveLesson.studentName}</strong><small>{liveLesson.topic||"Тема не указана"}</small></div></div>
        <div className="lesson-control-grid">
          <button onClick={()=>{const rect=board.current?.getBoundingClientRect();if(!rect)return;const center=world({x:rect.width/2,y:rect.height/2});viewControlChannel.current?.sendFocus(liveLesson.studentId,center.x,center.y,view.zoom);setNotice("Экран ученика перемещён к вам")}}>◎<span>Ко мне</span></button>
          <button className={guidedFollow?"active":""} onClick={()=>{const next=!guidedFollow;guidedFollowRef.current=next;setGuidedFollow(next);viewControlChannel.current?.sendGuidedFollow(next);if(next){const rect=board.current?.getBoundingClientRect();if(rect){const center=world({x:rect.width/2,y:rect.height/2});viewControlChannel.current?.sendFocus(liveLesson.studentId,center.x,center.y,view.zoom)}}}}>↝<span>{guidedFollow?"Ведение включено":"Вести экран"}</span></button>
          <button onClick={()=>{setPresentation(true);setPresentationFrameIndex(0);setPresentationSlidesOpen(false);setLessonPanelOpen(false)}}>▶<span>Презентация</span></button>
          <button onClick={()=>{setPresentationTimerMode("elapsed");setPresentationTimerRunning(v=>!v)}}>◷<span>{presentationTimerRunning?"Пауза таймера":"Таймер"}</span></button>
          <button onClick={()=>{setPresentationLaser(v=>!v);setPresentationSpotlight(false)}}>•<span>Лазер</span></button>
          <button onClick={()=>{setPresentationSpotlight(v=>!v);setPresentationLaser(false)}}>◉<span>Прожектор</span></button>
        </div>
        <div className="lesson-control-online"><strong>На доске сейчас</strong>{presenceUsers.map(u=><div key={u.userId}><span className="presence-avatar">{u.name.charAt(0).toUpperCase()}</span><span><b>{u.name}{u.userId===authUser.id?" · Вы":""}</b><small>{BOARD_ROLE_LABELS[u.role]}</small></span>{u.userId!==authUser.id&&<button onClick={()=>{const rect=board.current?.getBoundingClientRect();if(!rect)return;const center=world({x:rect.width/2,y:rect.height/2});viewControlChannel.current?.sendFocus(u.userId,center.x,center.y,view.zoom)}}>Ко мне</button>}</div>)}</div>
        <button className="lesson-control-finish" onClick={()=>{setLessonPanelOpen(false);setLessonFinishOpen(true)}}>Завершить урок и записать результат</button>
      </aside>}
      ${anchor}`;
P(anchor,panel,"lesson panel anchor");

fs.writeFileSync(p,s,"utf8");
if(!css.includes("/* v39 · lesson control center */")){css+=`
/* v39 · lesson control center */
.live-lesson-main{border:0!important;background:transparent!important;color:inherit!important;padding:0!important;text-align:left!important}.live-lesson-main>span{display:flex;flex-direction:column}
.lesson-control-panel{position:fixed;z-index:160;right:14px;top:66px;width:min(340px,calc(100vw - 28px));max-height:calc(100vh - 82px);overflow:auto;border:1px solid #e0e0eb;border-radius:16px;background:rgba(255,255,255,.97);box-shadow:0 18px 60px rgba(25,27,44,.18);padding:14px;backdrop-filter:blur(14px)}
.lesson-control-head,.lesson-control-head>div,.lesson-control-student,.lesson-control-online>div{display:flex;align-items:center}.lesson-control-head{justify-content:space-between}.lesson-control-head>div{gap:8px}.lesson-control-head>div>div{display:flex;flex-direction:column}.lesson-control-head b{font-size:12px}.lesson-control-head small{font-size:10px;color:#747789}.lesson-control-head>button{border:0;background:#f2f2f6;border-radius:8px;width:28px;height:28px;cursor:pointer}
.lesson-control-student{gap:9px;margin:13px 0;padding:11px;background:#f7f7fb;border-radius:12px}.lesson-control-student>div{display:flex;flex-direction:column}.lesson-control-student strong{font-size:12px}.lesson-control-student small{font-size:10px;color:#7b7e8d}
.lesson-control-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.lesson-control-grid button{min-height:58px;border:1px solid #e7e7ef;border-radius:11px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:17px;cursor:pointer}.lesson-control-grid button span{font-size:9px;font-weight:800}.lesson-control-grid button.active{background:#ecebff;border-color:#c8c6fa;color:#4d4fb2}
.lesson-control-online{margin-top:15px}.lesson-control-online>strong{display:block;font-size:10px;color:#777a89;margin-bottom:6px}.lesson-control-online>div{gap:7px;padding:7px 0;border-top:1px solid #f0f0f4}.lesson-control-online>div>span:nth-child(2){display:flex;flex:1;flex-direction:column}.lesson-control-online b{font-size:10px}.lesson-control-online small{font-size:9px;color:#858896}.lesson-control-online button{border:0;border-radius:7px;padding:5px 7px;background:#f1f0ff;color:#5052ad;font-size:9px;font-weight:800;cursor:pointer}
.lesson-control-finish{width:100%;margin-top:12px;border:0;border-radius:10px;padding:10px;background:#fff0f0;color:#a33d3d;font-size:10px;font-weight:850;cursor:pointer}
`;fs.writeFileSync(c,css,"utf8")}
console.log("v39 установлен: центр управления живым уроком. SQL не нужен. Выполните npm run build");
