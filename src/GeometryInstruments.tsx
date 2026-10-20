import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Item } from "./boardModel";

type Instrument = NonNullable<Item["geometryType"]>;
type Point = { x:number; y:number };
type Mode = "move" | "rotate" | "scale";
type Props = {
  mobile?:boolean;
  view:{x:number;y:number;zoom:number};
  boardRef:RefObject<HTMLElement | null>;
  items:Item[];
  canEdit:boolean;
  onAdd:(item:Item)=>void;
  onUpdate:(id:string,patch:Partial<Item>)=>void;
  onRemove:(id:string)=>void;
  renderOverlay?:boolean;
};
type Gesture = {
  id:string; pointer:number; mode:Mode; base:Item;
  startX:number; startY:number; pivotX:number; pivotY:number;
  startAngle:number; startDistance:number; next:Partial<Item>|null;
};
const labels:Record<Instrument,string> = {ruler:"Линейка",triangle:"Угольник",protractor:"Транспортир"};
const dimensions:Record<Instrument,[number,number]> = {ruler:[410,88],triangle:[340,260],protractor:[360,205]};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const angleAt=(x:number,y:number,cx:number,cy:number)=>Math.atan2(y-cy,x-cx)*180/Math.PI;

function InstrumentDrawing({type}:{type:Instrument}) {
  return <>
      {type==="ruler"&&<svg width="410" height="88" viewBox="0 0 410 88" aria-label="Линейка с делениями"><rect x="3" y="3" width="404" height="82" rx="5" fill="#fce8a5" fillOpacity=".85" stroke="#805e25"/>{Array.from({length:41},(_,i)=><g key={i}><line x1={5+i*10} y1="45" x2={5+i*10} y2={i%10===0?13:i%5===0?23:34} stroke="#624c30" strokeWidth="1"/>{i%10===0&&<text x={5+i*10} y="62" textAnchor="middle" fontSize="12" fill="#543f26">{i/10}</text>}</g>)}</svg>}
      {type==="triangle"&&<svg width="340" height="260" viewBox="0 0 340 260" aria-label="Прямоугольный угольник"><path d="M8 8 L8 250 L330 250 Z" fill="#afe5ee" fillOpacity=".7" stroke="#367b88" strokeWidth="2"/><path d="M55 127 L55 215 L171 215 Z" fill="white" fillOpacity=".8" stroke="#367b88"/>{Array.from({length:17},(_,i)=><line key={i} x1={10+i*20} y1="249" x2={10+i*20} y2={i%5===0?229:238} stroke="#367b88"/>)}</svg>}
      {type==="protractor"&&<svg width="360" height="205" viewBox="0 0 360 205" aria-label="Транспортир с делениями от 0 до 180 градусов"><path d="M10 190 A170 170 0 0 1 350 190 Z" fill="#b8e6f6" fillOpacity=".72" stroke="#277293" strokeWidth="2"/><path d="M65 190 A115 115 0 0 1 295 190" fill="none" stroke="#277293"/>{Array.from({length:37},(_,i)=>{const a=Math.PI-i*Math.PI/36;const x=180+170*Math.cos(a),y=190-170*Math.sin(a);const xx=180+(i%2===0?151:160)*Math.cos(a),yy=190-(i%2===0?151:160)*Math.sin(a);return <g key={i}><line x1={x} y1={y} x2={xx} y2={yy} stroke="#277293"/>{i%6===0&&<text x={180+132*Math.cos(a)} y={190-132*Math.sin(a)} textAnchor="middle" fontSize="11" fill="#16445f">{i*5}°</text>}</g>})}<circle cx="180" cy="190" r="4" fill="#277293"/></svg>}
  </>;
}

export default function GeometryInstruments({
  mobile=false,view,boardRef,items,canEdit,onAdd,onUpdate,onRemove,renderOverlay=true
}:Props) {
  const [open,setOpen]=useState(false);
  const [menuPosition,setMenuPosition]=useState({left:72,top:120});
  const [drafts,setDrafts]=useState<Record<string,Partial<Item>>>({});
  const gesture=useRef<Gesture|null>(null);
  const visible=items.filter(item=>item.kind==="geometry"&&!item.hidden);
  const zoom=Math.max(.01,view.zoom);

  const toggleMenu=(element:HTMLButtonElement)=>{
    const rect=element.getBoundingClientRect(),width=158;
    const left=mobile?clamp(rect.left-45,8,window.innerWidth-width-8):clamp(rect.right+8,8,window.innerWidth-width-8);
    const top=mobile?Math.max(8,rect.top-62):clamp(rect.top,8,window.innerHeight-62);
    setMenuPosition({left,top});setOpen(value=>!value);
  };

  const addInstrument=(type:Instrument)=>{
    if(!canEdit)return;
    const rect=boardRef.current?.getBoundingClientRect();
    if(!rect)return;
    const [width,height]=dimensions[type];
    const scale=clamp(Math.min(1,(rect.width-70)/(width*zoom),(rect.height-140)/(height*zoom)),.35,3.5);
    const cx=(rect.width/2-view.x)/zoom,cy=(rect.height/2-view.y)/zoom;
    onAdd({
      id:"geometry-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
      kind:"geometry",geometryType:type,text:labels[type],
      x:cx-width*scale/2,y:cy-height*scale/2,width:width*scale,height:height*scale,rotation:0
    });
    setOpen(false);
  };

  const start=(event:PointerEvent<HTMLElement>,item:Item,mode:Mode,pivot:Point)=>{
    if(!canEdit)return;
    event.preventDefault();event.stopPropagation();
    gesture.current={
      id:item.id,pointer:event.pointerId,mode,base:item,
      startX:event.clientX,startY:event.clientY,pivotX:pivot.x,pivotY:pivot.y,
      startAngle:angleAt(event.clientX,event.clientY,pivot.x,pivot.y),
      startDistance:Math.max(15,Math.hypot(event.clientX-pivot.x,event.clientY-pivot.y)),next:null
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const move=(event:PointerEvent<HTMLElement>)=>{
    const g=gesture.current;
    if(!g||event.pointerId!==g.pointer)return;
    event.preventDefault();event.stopPropagation();
    let patch:Partial<Item>;
    if(g.mode==="move"){
      patch={x:g.base.x+(event.clientX-g.startX)/zoom,y:g.base.y+(event.clientY-g.startY)/zoom};
    } else if(g.mode==="rotate"){
      const delta=angleAt(event.clientX,event.clientY,g.pivotX,g.pivotY)-g.startAngle;
      patch={rotation:(g.base.rotation??0)+delta};
    } else {
      const originalWidth=dimensions[g.base.geometryType??"ruler"][0];
      const startScale=g.base.width/originalWidth;
      const distance=Math.max(1,Math.hypot(event.clientX-g.pivotX,event.clientY-g.pivotY));
      const nextScale=clamp(startScale*distance/g.startDistance,.35,3.5);
      const factor=nextScale/Math.max(.01,startScale);
      const width=g.base.width*factor,height=g.base.height*factor;
      patch={width,height,x:g.base.x+(g.base.width-width)/2,y:g.base.y+(g.base.height-height)/2};
    }
    g.next=patch;
    setDrafts(previous=>({...previous,[g.id]:patch}));
  };

  const finish=(event:PointerEvent<HTMLElement>)=>{
    const g=gesture.current;
    if(!g||event.pointerId!==g.pointer)return;
    event.preventDefault();event.stopPropagation();
    gesture.current=null;
    if(g.next)onUpdate(g.id,g.next);
    setDrafts(previous=>{const next={...previous};delete next[g.id];return next});
  };

  const resizeBy=(item:Item,delta:number)=>{
    const nativeWidth=dimensions[item.geometryType??"ruler"][0];
    const oldScale=item.width/nativeWidth,nextScale=clamp(oldScale+delta,.35,3.5);
    const factor=nextScale/Math.max(.01,oldScale);
    const width=item.width*factor,height=item.height*factor;
    onUpdate(item.id,{width,height,x:item.x+(item.width-width)/2,y:item.y+(item.height-height)/2});
  };

  return <>
    <div className={"geometry-tools "+(mobile?"geometry-tools-mobile":"")} onPointerDown={event=>event.stopPropagation()}>
      <button type="button" className={"geometry-trigger "+(open?"active":"")}
        title="Линейка, угольник и транспортир" aria-label="Измерительные инструменты"
        aria-expanded={open} disabled={!canEdit} onClick={event=>toggleMenu(event.currentTarget)}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18 17.5 4.5l3 3L7 21H4z"/><path d="m13 9 2 2M10 12l2 2M7 15l2 2"/></svg>
      </button>
      {open&&canEdit&&createPortal(<div className="geometry-picker geometry-picker-portal" style={{left:menuPosition.left,top:menuPosition.top}} role="group" aria-label="Добавить измерительный инструмент">
        {(["ruler","triangle","protractor"] as const).map(type=><button type="button" key={type} title={"Добавить: "+labels[type]} aria-label={"Добавить: "+labels[type]} onClick={()=>addInstrument(type)}>
          {type==="ruler"?<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 7v5m4-5v3m4-3v5m4-5v3"/></svg>:type==="triangle"?<svg viewBox="0 0 24 24"><path d="M3 3v18h18z"/><path d="M8 13v4h4z"/></svg>:<svg viewBox="0 0 24 24"><path d="M2 20a10 10 0 0 1 20 0z"/><path d="M12 20V9M6 20l3-8m9 8-3-8"/></svg>}
        </button>)}
      </div>,document.body)}
    </div>
    {renderOverlay&&visible.map(raw=>{
      const item={...raw,...drafts[raw.id]};
      const type:Instrument=item.geometryType??"ruler";
      const [nativeWidth,nativeHeight]=dimensions[type];
      const rect=boardRef.current?.getBoundingClientRect();
      const centerX=(rect?.left??0)+view.x+(item.x+item.width/2)*zoom;
      const centerY=(rect?.top??0)+view.y+(item.y+item.height/2)*zoom;
      const angle=item.rotation??0,radians=angle*Math.PI/180;
      const visualScale=zoom*item.width/nativeWidth;
      const toolbarOffset=-(Math.abs(Math.sin(radians))*nativeWidth+Math.abs(Math.cos(radians))*nativeHeight)*visualScale/2-57;
      const pivot={x:centerX,y:centerY};
      return createPortal(<div key={item.id} className={"geometry-instrument geometry-instrument-centered "+(!canEdit?"geometry-instrument-viewer":"")}
        style={{left:centerX,top:centerY}}>
        {canEdit&&<div className="geometry-instrument-actions" style={{top:toolbarOffset}} onPointerDown={event=>event.stopPropagation()} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
          <span>{labels[type]}</span>
          <span className="geometry-angle-readout">{Math.round(((angle%360)+360)%360)}°</span>
          <button type="button" className="geometry-rotation-handle" onPointerDown={event=>start(event,item,"rotate",pivot)} title="Вращать вокруг центра">⟳</button>
          <button type="button" onClick={()=>onUpdate(item.id,{rotation:0})} title="Сбросить поворот">0°</button>
          <button type="button" onClick={()=>resizeBy(item,-.1)} title="Уменьшить">−</button>
          <button type="button" onClick={()=>resizeBy(item,.1)} title="Увеличить">+</button>
          <button type="button" onClick={()=>onRemove(item.id)} title="Убрать инструмент">×</button>
        </div>}
        <div className="geometry-instrument-body" style={{width:nativeWidth,height:nativeHeight,transform:"translate(-50%,-50%) rotate("+angle+"deg) scale("+visualScale+")",transformOrigin:"center center"}}
          onPointerDown={event=>start(event,item,"move",pivot)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
          <InstrumentDrawing type={type}/>
          {canEdit&&<button type="button" className="geometry-scale-handle" title="Изменить масштаб по диагонали" aria-label="Изменить масштаб по диагонали"
            onPointerDown={event=>start(event,item,"scale",pivot)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>↘</button>}
        </div>
        <span className="geometry-pivot" aria-hidden="true"/>
      </div>,document.body);
    })}
  </>;
}
