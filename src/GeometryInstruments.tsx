import { useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
type Instrument = "ruler" | "triangle" | "protractor";
const labels: Record<Instrument, string> = {ruler:"Линейка",triangle:"Угольник",protractor:"Транспортир"};
export default function GeometryInstruments({mobile = false}:{mobile?:boolean}) {
  const [tool,setTool] = useState<Instrument|null>(null);
  const [open,setOpen] = useState(false);
  const [menuPosition,setMenuPosition] = useState({left:72,top:120});
  const toggleMenu=(element:HTMLButtonElement)=>{
    const rect=element.getBoundingClientRect();
    const menuWidth=158;
    const left=mobile ? Math.min(Math.max(8,rect.left-45),window.innerWidth-menuWidth-8) : Math.min(rect.right+8,window.innerWidth-menuWidth-8);
    const top=mobile ? Math.max(8,rect.top-62) : Math.max(8,Math.min(rect.top,window.innerHeight-62));
    setMenuPosition({left,top});
    setOpen(value=>!value);
  };
  const rotationGesture = useRef<{pointer:number;startAngle:number;original:number;centerX:number;centerY:number}|null>(null);
  const [position,setPosition] = useState({x:90,y:100});
  const [rotation,setRotation] = useState(0);
  const [scale,setScale] = useState(1);
  const [drag,setDrag] = useState<{x:number;y:number;left:number;top:number}|null>(null);
  const down=(e:PointerEvent<HTMLDivElement>)=>{
    if((e.target as HTMLElement).closest("button"))return;
    e.preventDefault();e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({x:e.clientX,y:e.clientY,left:position.x,top:position.y});
  };
  const move=(e:PointerEvent<HTMLDivElement>)=>{
    if(!drag)return;e.preventDefault();e.stopPropagation();
    setPosition({x:drag.left+e.clientX-drag.x,y:drag.top+e.clientY-drag.y});
  };
  const select=(id:Instrument)=>{setTool(id);setOpen(false);setPosition({x:Math.min(120,window.innerWidth/6),y:Math.min(150,window.innerHeight/5)});setRotation(0);setScale(1)};
  const rotateDown=(e:PointerEvent<HTMLButtonElement>)=>{
    e.preventDefault();e.stopPropagation();
    const rect=e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if(!rect)return;
    const centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
    rotationGesture.current={pointer:e.pointerId,startAngle:Math.atan2(e.clientY-centerY,e.clientX-centerX)*180/Math.PI,original:rotation,centerX,centerY};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const rotateMove=(e:PointerEvent<HTMLButtonElement>)=>{
    const g=rotationGesture.current;if(!g||g.pointer!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    const angle=Math.atan2(e.clientY-g.centerY,e.clientX-g.centerX)*180/Math.PI;
    setRotation(g.original+angle-g.startAngle);
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
    {tool&&createPortal(<div className="geometry-instrument" style={{left:position.x,top:position.y,transform:`rotate(${rotation}deg) scale(${scale})`,transformOrigin:"0 0"}} onPointerDown={down} onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}>
      <div className="geometry-instrument-actions">
        <span>{labels[tool]}</span>
        <button type="button" className="geometry-rotation-handle" onPointerDown={rotateDown} onPointerMove={rotateMove} onPointerUp={()=>{rotationGesture.current=null}} onPointerCancel={()=>{rotationGesture.current=null}} aria-label="Повернуть свободно" title="Потяните для свободного вращения">⟳</button>
        <button type="button" onClick={()=>setScale(v=>Math.max(.5,v-.1))} aria-label="Уменьшить">−</button>
        <button type="button" onClick={()=>setScale(v=>Math.min(2.5,v+.1))} aria-label="Увеличить">+</button>
        <button type="button" onClick={()=>setTool(null)} aria-label="Убрать инструмент">×</button>
      </div>
      {tool==="ruler"&&<svg width="410" height="88" viewBox="0 0 410 88" aria-label="Линейка с делениями"><rect x="3" y="3" width="404" height="82" rx="5" fill="#fce8a5" fillOpacity=".85" stroke="#805e25"/>{Array.from({length:41},(_,i)=><g key={i}><line x1={5+i*10} y1="45" x2={5+i*10} y2={i%10===0?13:i%5===0?23:34} stroke="#624c30" strokeWidth="1"/>{i%10===0&&<text x={5+i*10} y="62" textAnchor="middle" fontSize="12" fill="#543f26">{i/10}</text>}</g>)}</svg>}
      {tool==="triangle"&&<svg width="340" height="260" viewBox="0 0 340 260" aria-label="Прямоугольный угольник"><path d="M8 8 L8 250 L330 250 Z" fill="#afe5ee" fillOpacity=".7" stroke="#367b88" strokeWidth="2"/><path d="M55 127 L55 215 L171 215 Z" fill="white" fillOpacity=".8" stroke="#367b88"/>{Array.from({length:17},(_,i)=><line key={i} x1={10+i*20} y1="249" x2={10+i*20} y2={i%5===0?229:238} stroke="#367b88"/>)}</svg>}
      {tool==="protractor"&&<svg width="360" height="205" viewBox="0 0 360 205" aria-label="Транспортир с делениями от 0 до 180 градусов"><path d="M10 190 A170 170 0 0 1 350 190 Z" fill="#b8e6f6" fillOpacity=".72" stroke="#277293" strokeWidth="2"/><path d="M65 190 A115 115 0 0 1 295 190" fill="none" stroke="#277293"/>{Array.from({length:37},(_,i)=>{const a=Math.PI-i*Math.PI/36;const x=180+170*Math.cos(a),y=190-170*Math.sin(a);const xx=180+(i%2===0?151:160)*Math.cos(a),yy=190-(i%2===0?151:160)*Math.sin(a);return <g key={i}><line x1={x} y1={y} x2={xx} y2={yy} stroke="#277293"/>{i%6===0&&<text x={180+132*Math.cos(a)} y={190-132*Math.sin(a)} textAnchor="middle" fontSize="11" fill="#16445f">{i*5}°</text>}</g>})}<circle cx="180" cy="190" r="4" fill="#277293"/></svg>}
    </div>,document.body)}
  </>;
}
