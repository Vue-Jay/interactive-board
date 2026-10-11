import { useRef, useState, type RefObject, type PointerEvent } from "react";
import { createPortal } from "react-dom";

type Instrument = "ruler" | "triangle" | "protractor";
type Point = { x: number; y: number };
type Gesture = { pointer: number; mode: "move" | "rotate"; startX: number; startY: number; x: number; y: number; angle: number; startAngle: number };
const labels: Record<Instrument, string> = { ruler: "Линейка", triangle: "Угольник", protractor: "Транспортир" };
const dimensions: Record<Instrument, [number, number]> = { ruler: [410,88], triangle: [340,260], protractor: [360,205] };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max,n));
const angleTo = (e: PointerEvent<HTMLElement>, point: Point) => Math.atan2(e.clientY-point.y,e.clientX-point.x)*180/Math.PI;

export default function GeometryInstruments({ mobile = false, view, boardRef }: { mobile?: boolean; view: {x:number;y:number;zoom:number}; boardRef: RefObject<HTMLElement | null> }) {
  const [tool,setTool] = useState<Instrument|null>(null);
  const [open,setOpen] = useState(false);
  const [menuPosition,setMenuPosition] = useState({ left:72,top:120 });
  const [position,setPosition] = useState<Point>({x:320,y:250});
  const [rotation,setRotation] = useState(0);
  const [scale,setScale] = useState(1);
  const gesture = useRef<Gesture|null>(null);
  const normalizedRotation = ((rotation%360)+360)%360;
  const boardRect = boardRef.current?.getBoundingClientRect();
  const zoom = Math.max(0.01,view.zoom);
  const screenPosition = {
    x:(boardRect?.left ?? 0)+view.x+position.x*zoom,
    y:(boardRect?.top ?? 0)+view.y+position.y*zoom,
  };
  const visualScale = zoom*scale;
  const [nativeWidth,nativeHeight] = dimensions[tool ?? "ruler"];
  const radians = rotation * Math.PI / 180;
  const rotatedHalfHeight = (Math.abs(Math.sin(radians))*nativeWidth+Math.abs(Math.cos(radians))*nativeHeight)*visualScale/2;
  const toolbarOffset = -rotatedHalfHeight-57;

  const toggleMenu=(element:HTMLButtonElement)=>{
    const rect=element.getBoundingClientRect();
    const menuWidth=158;
    const left=mobile ? clamp(rect.left-45,8,window.innerWidth-menuWidth-8) : clamp(rect.right+8,8,window.innerWidth-menuWidth-8);
    const top=mobile ? Math.max(8,rect.top-62) : clamp(rect.top,8,window.innerHeight-62);
    setMenuPosition({left,top});setOpen(value=>!value);
  };
  const select=(id:Instrument)=>{
    const [width,height]=dimensions[id];
    const rect=boardRef.current?.getBoundingClientRect();
    if(!rect)return;
    setTool(id);setOpen(false);setRotation(0);
    setScale(Math.min(1,(rect.width-70)/Math.max(1,width*zoom),(rect.height-140)/Math.max(1,height*zoom)));
    // An instrument is anchored to the board's world-space coordinates.
    setPosition({x:(rect.width/2-view.x)/zoom,y:(rect.height/2-view.y)/zoom});
  };
  const start=(e:PointerEvent<HTMLElement>,mode:Gesture["mode"])=>{
    e.preventDefault();e.stopPropagation();
    gesture.current={pointer:e.pointerId,mode,startX:e.clientX,startY:e.clientY,x:position.x,y:position.y,angle:rotation,startAngle:angleTo(e,screenPosition)};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moving=(e:PointerEvent<HTMLElement>)=>{
    const g=gesture.current;if(!g||e.pointerId!==g.pointer)return;
    e.preventDefault();e.stopPropagation();
    if(g.mode==="move")setPosition({x:g.x+(e.clientX-g.startX)/zoom,y:g.y+(e.clientY-g.startY)/zoom});
    else setRotation(g.angle+angleTo(e,screenPosition)-g.startAngle);
  };
  const finish=(e:PointerEvent<HTMLElement>)=>{
    if(gesture.current?.pointer===e.pointerId)gesture.current=null;
    e.stopPropagation();
  };
  return <>
    <div className={`geometry-tools ${mobile?"geometry-tools-mobile":""}`} onPointerDown={e=>e.stopPropagation()}>
      <button type="button" className={`geometry-trigger ${open||tool?"active":""}`} title="Линейка, угольник и транспортир" aria-label="Измерительные инструменты" aria-expanded={open} onClick={e=>toggleMenu(e.currentTarget)}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18 17.5 4.5l3 3L7 21H4z"/><path d="m13 9 2 2M10 12l2 2M7 15l2 2"/></svg>
      </button>
      {open&&createPortal(<div className="geometry-picker geometry-picker-portal" style={{left:menuPosition.left,top:menuPosition.top}} role="group" aria-label="Измерительные инструменты">
        {(["ruler","triangle","protractor"] as const).map(id=><button type="button" key={id} className={tool===id?"active":""} title={labels[id]} aria-label={labels[id]} onClick={()=>select(id)}>
          {id==="ruler"?<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 7v5m4-5v3m4-3v5m4-5v3"/></svg>:id==="triangle"?<svg viewBox="0 0 24 24"><path d="M3 3v18h18z"/><path d="M8 13v4h4z"/></svg>:<svg viewBox="0 0 24 24"><path d="M2 20a10 10 0 0 1 20 0z"/><path d="M12 20V9M6 20l3-8m9 8-3-8"/></svg>}
        </button>)}
      </div>,document.body)}
    </div>
    {tool&&createPortal(<div className="geometry-instrument geometry-instrument-centered" style={{left:screenPosition.x,top:screenPosition.y}}>
      <div className="geometry-instrument-actions" style={{top:toolbarOffset}} onPointerDown={e=>e.stopPropagation()}>
        <span>{labels[tool]}</span>
        <span className="geometry-angle-readout" title="Угол поворота">{Math.round(normalizedRotation)}°</span>
        <button type="button" className="geometry-rotation-handle" onPointerDown={e=>start(e,"rotate")} onPointerMove={moving} onPointerUp={finish} onPointerCancel={finish} aria-label="Вращать вокруг центра" title="Удерживайте и ведите вокруг центра">⟳</button>
        <button type="button" onClick={()=>setRotation(0)} aria-label="Сбросить угол" title="Сбросить угол">0°</button>
        <button type="button" onClick={()=>setScale(v=>clamp(+(v-.1).toFixed(2),.4,2.5))} aria-label="Уменьшить">−</button>
        <button type="button" onClick={()=>setScale(v=>clamp(+(v+.1).toFixed(2),.4,2.5))} aria-label="Увеличить">+</button>
        <button type="button" onClick={()=>setTool(null)} aria-label="Убрать инструмент">×</button>
      </div>
      <div className="geometry-instrument-body" style={{width:dimensions[tool][0],height:dimensions[tool][1],transform:`translate(-50%,-50%) rotate(${rotation}deg) scale(${visualScale})`,transformOrigin:"center center"}}
        onPointerDown={e=>start(e,"move")} onPointerMove={moving} onPointerUp={finish} onPointerCancel={finish}>
      {tool==="ruler"&&<svg width="410" height="88" viewBox="0 0 410 88" aria-label="Линейка с делениями"><rect x="3" y="3" width="404" height="82" rx="5" fill="#fce8a5" fillOpacity=".85" stroke="#805e25"/>{Array.from({length:41},(_,i)=><g key={i}><line x1={5+i*10} y1="45" x2={5+i*10} y2={i%10===0?13:i%5===0?23:34} stroke="#624c30" strokeWidth="1"/>{i%10===0&&<text x={5+i*10} y="62" textAnchor="middle" fontSize="12" fill="#543f26">{i/10}</text>}</g>)}</svg>}
      {tool==="triangle"&&<svg width="340" height="260" viewBox="0 0 340 260" aria-label="Прямоугольный угольник"><path d="M8 8 L8 250 L330 250 Z" fill="#afe5ee" fillOpacity=".7" stroke="#367b88" strokeWidth="2"/><path d="M55 127 L55 215 L171 215 Z" fill="white" fillOpacity=".8" stroke="#367b88"/>{Array.from({length:17},(_,i)=><line key={i} x1={10+i*20} y1="249" x2={10+i*20} y2={i%5===0?229:238} stroke="#367b88"/>)}</svg>}
      {tool==="protractor"&&<svg width="360" height="205" viewBox="0 0 360 205" aria-label="Транспортир с делениями от 0 до 180 градусов"><path d="M10 190 A170 170 0 0 1 350 190 Z" fill="#b8e6f6" fillOpacity=".72" stroke="#277293" strokeWidth="2"/><path d="M65 190 A115 115 0 0 1 295 190" fill="none" stroke="#277293"/>{Array.from({length:37},(_,i)=>{const a=Math.PI-i*Math.PI/36;const x=180+170*Math.cos(a),y=190-170*Math.sin(a);const xx=180+(i%2===0?151:160)*Math.cos(a),yy=190-(i%2===0?151:160)*Math.sin(a);return <g key={i}><line x1={x} y1={y} x2={xx} y2={yy} stroke="#277293"/>{i%6===0&&<text x={180+132*Math.cos(a)} y={190-132*Math.sin(a)} textAnchor="middle" fontSize="11" fill="#16445f">{i*5}°</text>}</g>})}<circle cx="180" cy="190" r="4" fill="#277293"/></svg>}

      </div>
      <span className="geometry-pivot" aria-hidden="true"/>
    </div>,document.body)}
  </>;
}
