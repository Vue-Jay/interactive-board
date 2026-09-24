import fs from "node:fs";
for(const p of ["src/App.tsx","src/ShareDialog.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v78: не найден "+p);process.exit(1)}

let a=fs.readFileSync("src/App.tsx","utf8");

// v77 repair: actual main still did not contain the presentation query integration.
a=a.replace('  const canEdit = boardSummary.role !== "viewer";','  const canEdit = boardSummary.role !== "viewer";\n  const publicPresentation = !canEdit && new URLSearchParams(window.location.search).get("present")==="1";');
a=a.replace('const [presentation, setPresentation] = useState(false);','const [presentation, setPresentation] = useState(() => new URLSearchParams(window.location.search).get("present")==="1");');
a=a.replace('navigate(`/board/${redeemed.board_id}`);','navigate(`/board/${redeemed.board_id}${new URLSearchParams(window.location.search).get("present")==="1"?"?present=1":""}`);');

const stepAnchor='  const stepPresentation = (direction: number) => {';
if(!a.includes(stepAnchor)){console.error("v78: presentation step anchor не найден");process.exit(1)}
if(!a.includes("publicPresentationAutoStarted")){
a=a.replace(stepAnchor,`  const publicPresentationAutoStarted = useRef(false);
  useEffect(() => {
    if (!publicPresentation || publicPresentationAutoStarted.current) return;
    publicPresentationAutoStarted.current = true;
    setPresentation(true);
    setPresentationTimerRunning(false);
    setPresentationFrameIndex(0);
    setPresentationSlidesOpen(false);
    window.setTimeout(() => showPresentationFrame(0), 80);
  }, [publicPresentation, boardSummary.id]);

${stepAnchor}`);
}

a=a.replace('<div className={`app ${presentation ? "presentation-mode" : ""} ${!canEdit ? "viewer-mode" : ""}`}>','<div className={`app ${presentation ? "presentation-mode" : ""} ${!canEdit ? "viewer-mode" : ""} ${publicPresentation ? "public-presentation-mode" : ""}`}>');

// Mark teacher-only presentation controls, leaving prev/title/next/slides/fullscreen for public viewers.
a=a.replace('<div className={`presentation-timer ${presentationTimerMode === "countdown" ? "countdown" : ""}`}', '<div className={`presentation-timer presentation-author-only ${presentationTimerMode === "countdown" ? "countdown" : ""}`}');
a=a.replace('<button className={presentationLaser ? "active laser-active" : ""}', '<button className={`presentation-author-only ${presentationLaser ? "active laser-active" : ""}`}');
a=a.replace('<button className={presentationSpotlight ? "active" : ""}', '<button className={`presentation-author-only ${presentationSpotlight ? "active" : ""}`}');
a=a.replace('{presentationSpotlight && <div className="presentation-spotlight-size"', '{presentationSpotlight && <div className="presentation-spotlight-size presentation-author-only"');
a=a.replace('{presentationQuizzes.length > 0 && <button ', '{presentationQuizzes.length > 0 && <button className="presentation-author-only" ');
a=a.replace('{presentationFlashcards.length > 0 && <button ', '{presentationFlashcards.length > 0 && <button className="presentation-author-only" ');
a=a.replace('{(presentationQuizzes.length > 0 || presentationFlashcards.length > 0 || presentationChecklists.length > 0 || presentationCovers.length > 0) && <button ', '{(presentationQuizzes.length > 0 || presentationFlashcards.length > 0 || presentationChecklists.length > 0 || presentationCovers.length > 0) && <button className="presentation-author-only" ');
a=a.replace('<button className={presentationBlackout ? "active" : ""}', '<button className={`presentation-author-only ${presentationBlackout ? "active" : ""}`}');
a=a.replace('{activePresentationFrame && <button className={presentationNotesOpen ? "active" : ""}', '{activePresentationFrame && <button className={`presentation-author-only ${presentationNotesOpen ? "active" : ""}`}');
a=a.replace('{activePresentationFrame && <button onClick={() => void exportItemsToPng("frame", activePresentationFrame.id)}', '{activePresentationFrame && <button className="presentation-author-only" onClick={() => void exportItemsToPng("frame", activePresentationFrame.id)}');
a=a.replace('<span className="presentation-controls-separator" />','<span className="presentation-controls-separator presentation-author-only" />');
a=a.replace('<button onClick={() => { setPresentation(false); setPresentationTimerRunning(false);', '<button className="presentation-author-only" onClick={() => { setPresentation(false); setPresentationTimerRunning(false);');

// Public viewer must not see teacher notes even if state somehow becomes true.
a=a.replace('{presentation && presentationNotesOpen && activePresentationFrame && (','{presentation && !publicPresentation && presentationNotesOpen && activePresentationFrame && (');

// Escape should not kick a public viewer out of presentation mode.
const esc='if (presentation) { setPresentation(false); setPresentationTimerRunning(false); setPresentationLaser(false); setPresentationLaserPos(null); setPresentationSpotlight(false); setPresentationSpotlightPos(null); setPresentationBlackout(false); return; }';
if(a.includes(esc))a=a.replace(esc,'if (presentation && !publicPresentation) { setPresentation(false); setPresentationTimerRunning(false); setPresentationLaser(false); setPresentationLaserPos(null); setPresentationSpotlight(false); setPresentationSpotlightPos(null); setPresentationBlackout(false); return; }');

// Disable teacher-only keyboard controls in public mode, while slide navigation stays active.
for(const key of ["KeyL","KeyO","BracketLeft","BracketRight","KeyT","KeyP","KeyB","KeyR"]){
  a=a.replace(`if (presentation && e.code === "${key}")`, `if (presentation && !publicPresentation && e.code === "${key}")`);
}

fs.writeFileSync("src/App.tsx",a);

let s=fs.readFileSync("src/ShareDialog.tsx","utf8");
// Repair v77 ShareDialog if it never landed in source.
s=s.replace('const [created, setCreated] = useState<{ id: string; url: string } | null>(null);','const [created, setCreated] = useState<{ id: string; url: string; presentationUrl?: string } | null>(null);');
s=s.replace('setCreated({ id: link.id, url: `${window.location.origin}/join/${link.token}` });','const url=`${window.location.origin}/join/${link.token}`; setCreated({ id: link.id, url, ...(linkRole==="viewer"?{presentationUrl:`${url}?present=1`}:{}) });');
const oldCreated='{created && <div className="share-created"><label>Скопируйте сейчас: ссылка показывается только при создании.<input readOnly value={created.url} onFocus={e => e.target.select()} aria-label="Новая ссылка"/></label><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(created.url); setNotice("Ссылка скопирована"); })}>Копировать ссылку</button></div>}';
if(s.includes(oldCreated)){
s=s.replace(oldCreated,`{created && <div className="share-created"><label>Обычная ссылка<input readOnly value={created.url} onFocus={e => e.target.select()} aria-label="Новая ссылка"/></label><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(created.url); setNotice("Ссылка скопирована"); })}>Копировать</button>{created.presentationUrl&&<><label>Ссылка-презентация<input readOnly value={created.presentationUrl} onFocus={e=>e.target.select()} aria-label="Ссылка-презентация"/></label><button disabled={busy} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(created.presentationUrl!);setNotice("Ссылка-презентация скопирована")})}>Копировать презентацию</button><small>Откроется сразу в чистом режиме показа. Доступ остаётся «Только просмотр».</small></>}</div>}`);
}
fs.writeFileSync("src/ShareDialog.tsx",s);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v78 · public presentation finish */"))c+=`
/* v78 · public presentation finish */
.public-presentation-mode .presentation-author-only,
.public-presentation-mode .presentation-notes,
.public-presentation-mode .notice { display:none !important; }
.public-presentation-mode .presentation-controls{
  bottom:16px;
  min-height:46px;
  padding:5px;
  border-radius:14px;
  background:rgba(25,27,32,.86);
}
.public-presentation-mode .presentation-frame-label{width:min(260px,42vw)}
.public-presentation-mode .presentation-controls>button{width:36px;height:36px}
.public-presentation-mode .board{cursor:default}
.public-presentation-mode .presentation-slides-panel{bottom:78px}
.public-presentation-mode .remote-cursor,
.public-presentation-mode .presence-strip{display:none!important}
@media(max-width:650px){
 .public-presentation-mode .presentation-controls{bottom:8px;max-width:calc(100vw - 16px)}
 .public-presentation-mode .presentation-frame-label{width:38vw}
 .public-presentation-mode .presentation-slides-panel{left:8px;bottom:66px;width:calc(100vw - 16px)}
}
`;
fs.writeFileSync("src/App.css",c);

console.log("v78 установлен. Он также восстанавливает недоставшую интеграцию v77. Запустите npm run build.");
