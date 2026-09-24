import fs from "node:fs";
for(const p of ["src/App.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v61: не найден "+p);process.exit(1)}
let a=fs.readFileSync("src/App.tsx","utf8");
a=a.replace('  const [panning, setPanning] = useState(false);\n  const gesture = useRef<Gesture | null>(null);','  const [panning, setPanning] = useState(false);\n  const touchPoints = useRef(new Map<number, Point>());\n  const pinchState = useRef<{ distance:number; center:Point; view:View } | null>(null);\n  const [mobileToolsOpen,setMobileToolsOpen]=useState(false);\n  const gesture = useRef<Gesture | null>(null);');

const beforeEnd='  const end = (cancel = false) => {';
const touchFns=`  const touchStart=(e: PE<HTMLElement>)=>{if(e.pointerType!=="touch")return;touchPoints.current.set(e.pointerId,local(e.clientX,e.clientY));if(touchPoints.current.size===2){end(true);const pts=[...touchPoints.current.values()];const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;pinchState.current={distance:Math.max(1,Math.hypot(dx,dy)),center:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},view:{...view}};setPanning(true)}};\n  const touchMove=(e: PE<HTMLElement>)=>{if(e.pointerType!=="touch"||!touchPoints.current.has(e.pointerId))return;touchPoints.current.set(e.pointerId,local(e.clientX,e.clientY));const pinch=pinchState.current;if(!pinch||touchPoints.current.size<2)return;e.preventDefault();const pts=[...touchPoints.current.values()];const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};const distance=Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y));const z=Math.max(.1,Math.min(8,pinch.view.zoom*distance/pinch.distance));const wx=(pinch.center.x-pinch.view.x)/pinch.view.zoom,wy=(pinch.center.y-pinch.view.y)/pinch.view.zoom;setView({zoom:z,x:center.x-wx*z,y:center.y-wy*z})};\n  const touchEnd=(e: PE<HTMLElement>)=>{if(e.pointerType!=="touch")return;touchPoints.current.delete(e.pointerId);if(touchPoints.current.size<2){pinchState.current=null;setPanning(false)}};\n\n`;
a=a.replace(beforeEnd,touchFns+beforeEnd);

a=a.replace('className={`board board-bg-${gridMode}', 'className={`board board-bg-${gridMode}');
a=a.replace('onPointerDown={(e) => { if (presentation)', 'onPointerDown={(e) => { touchStart(e); if(touchPoints.current.size>=2)return; if (presentation)');
a=a.replace('onPointerMove={(e) => { const localPoint', 'onPointerMove={(e) => { touchMove(e); if(pinchState.current)return; const localPoint');
a=a.replace('onPointerUp={(e) => {\n            if (e.pointerId === gesture.current?.pointer)', 'onPointerUp={(e) => {\n            touchEnd(e);\n            if (e.pointerId === gesture.current?.pointer)');
a=a.replace('onPointerCancel={() => end(true)}', 'onPointerCancel={(e) => { touchEnd(e); end(true); }}');

a=a.replace('<aside className="toolbar" aria-label="Инструменты">','<button type="button" className="mobile-tools-toggle" aria-expanded={mobileToolsOpen} onClick={()=>setMobileToolsOpen(v=>!v)}><Icon name={tool} size={18}/><span>Инструменты</span></button><aside className={`toolbar ${mobileToolsOpen?"mobile-open":""}`} aria-label="Инструменты">');
a=a.replace('setTool(t.id);\n                }}', 'setTool(t.id);\n                  setMobileToolsOpen(false);\n                }}');

fs.writeFileSync("src/App.tsx",a);
let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v61 · mobile/tablet */"))c+=`
/* v61 · mobile/tablet */
.mobile-tools-toggle{display:none}
.board{touch-action:none;overscroll-behavior:none}
@media(max-width:900px){
  .topbar{padding:6px 8px;gap:6px;min-height:48px}
  .topbar-left,.topbar-right{gap:5px}
  .topbar .logo-mark,.save-status{display:none}
  .board-title{max-width:34vw;min-width:90px}
  .back-to-boards{padding:6px 8px;font-size:12px}
  .topbar-right>button,.topbar-right>label,.topbar-right>details>summary{min-height:36px}
  .toolbar{left:8px;top:auto;bottom:62px;max-height:min(68vh,520px);overflow-y:auto;overscroll-behavior:contain;transform:translateX(-130%);transition:transform .18s ease;box-shadow:0 8px 28px rgba(26,28,40,.18);z-index:80}
  .toolbar.mobile-open{transform:translateX(0)}
  .mobile-tools-toggle{display:flex;position:absolute;z-index:81;left:10px;bottom:10px;height:44px;align-items:center;gap:7px;padding:0 12px;border:1px solid #dfe0e7;border-radius:12px;background:#fff;color:#303341;box-shadow:0 5px 18px rgba(26,28,40,.14);font-weight:650}
  .tool-button{width:42px;height:42px}
  .tool-icon svg{width:20px;height:20px}
  .zoom-controls{right:8px;bottom:10px}
  .minimap{display:none}
  .selection-toolbar{max-width:calc(100vw - 16px);overflow-x:auto;overscroll-behavior-x:contain}
  .shape-palette,.connector-palette{max-width:calc(100vw - 20px);overflow-x:auto}
  .graph-editor-modal,.formula-editor-modal,.table-editor-modal,.quiz-editor-modal,.flashcard-editor-modal,.checklist-editor-modal{width:calc(100vw - 18px);max-height:92dvh}
}
@media(max-width:620px){
  .topbar{flex-wrap:wrap}
  .topbar-left{flex:1 1 100%;min-width:0}
  .topbar-right{flex:1 1 100%;overflow-x:auto;padding-bottom:2px}
  .board-title{max-width:none;flex:1}
  .realtime-status{font-size:10px}
  .presence-menu summary span:last-child{font-size:11px}
  .graph-editor-body{padding:10px;gap:10px}
  .graph-editor-form{gap:9px}
  .graph-presets{grid-template-columns:repeat(2,minmax(0,1fr))}
  .graph-geometry-row{grid-template-columns:1fr 1.2fr 1fr 30px 28px}
  .graph-point-row{grid-template-columns:1fr 58px 58px 28px}
  .table-editor-grid{max-width:100%;overflow:auto}
  .modal-footer,.graph-editor-footer{position:sticky;bottom:0;background:#fff;z-index:4}
}
@media(pointer:coarse){
  .resize-handle{width:18px!important;height:18px!important}
  .rotate-handle{width:24px!important;height:24px!important}
  .connector-endpoint{width:20px!important;height:20px!important}
  button{touch-action:manipulation}
}
`;
fs.writeFileSync("src/App.css",c);
console.log("v61 установлен. Запустите npm run build");
