import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Item } from "./boardModel";
import { createGeometryItem, instrumentDimensions, type InstrumentType } from "./geometryPlacement";

type Instrument = InstrumentType;
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
  activeId:string|null;
  onSelect:(id:string|null)=>void;
  onFocus:(item:Item)=>void;
};
type Gesture = {
  id:string; pointer:number; mode:Mode; base:Item;
  startX:number; startY:number; pivotX:number; pivotY:number;
  startAngle:number; startDistance:number; next:Partial<Item>|null;
};
const labels:Record<Instrument,string> = {ruler:"Линейка",triangle:"Угольник",protractor:"Транспортир"};
const dimensions=instrumentDimensions;
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
  mobile=false,view,boardRef,items,canEdit,onAdd,onUpdate,onRemove,renderOverlay=true,activeId,onSelect,onFocus
}:Props) {
  const [open,setOpen]=useState(false);
  const [menuPosition,setMenuPosition]=useState({left:72,top:120});
  const [drafts,setDrafts]=useState<Record<string,Partial<Item>>>({});
  const gesture=useRef<Gesture|null>(null);
  const visible=items.filter(item=>item.kind==="geometry"&&!item.hidden);
  const zoom=Math.max(.01,view.zoom);
  const toolCount=visible.length;

  const toggleMenu=(element:HTMLButtonElement)=>{
    const rect=element.getBoundingClientRect(),width=Math.min(342,window.innerWidth-16);
    const left=mobile?clamp(rect.left+rect.width/2-width/2,8,window.innerWidth-width-8):clamp(rect.right+8,8,window.innerWidth-width-8);
    const top=mobile?8:clamp(rect.top,8,Math.max(8,window.innerHeight-300));
    setMenuPosition({left,top});setOpen(value=>!value);
  };

  const addInstrument=(type:Instrument)=>{
    if(!canEdit)return;
    const rect=boardRef.current?.getBoundingClientRect();
    if(!rect)return;
    const next=createGeometryItem(type,items,view,{width:rect.width,height:rect.height});
    onAdd(next);
    onSelect(next.id);
  };

  const duplicate=(item:Item)=>{
    if(!canEdit)return;
    const rect=boardRef.current?.getBoundingClientRect();
    if(!rect)return;
    const next=createGeometryItem(item.geometryType??"ruler",items,view,{width:rect.width,height:rect.height},item);
    onAdd(next);
    onSelect(next.id);
  };
  const select=(item:Item)=>{
    onSelect(item.id);
    onFocus(item);
    setOpen(false);
  };

  const start=(event:PointerEvent<HTMLElement>,item:Item,mode:Mode,pivot:Point)=>{
    if(!canEdit)return;
    event.preventDefault();event.stopPropagation();
    onSelect(item.id);
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
      patch={width,height,x:g.base.x,y:g.base.y};
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
    onUpdate(item.id,{width,height,x:item.x,y:item.y});
  };

  return <>
    <div className={"geometry-tools "+(mobile?"geometry-tools-mobile":"")} onPointerDown={event=>event.stopPropagation()}>
      <button type="button" data-geometry-trigger="true" className={"geometry-trigger "+(open||toolCount?"active":"")}
        title={"Измерительные инструменты на доске: "+toolCount}
        aria-label={"Измерительные инструменты. На доске: "+toolCount}
        aria-expanded={open} disabled={!canEdit} onClick={event=>toggleMenu(event.currentTarget)}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18 17.5 4.5l3 3L7 21H4z"/><path d="m13 9 2 2M10 12l2 2M7 15l2 2"/></svg>
        {toolCount>0&&<span className="geometry-trigger-count">{toolCount}</span>}
      </button>
      {open&&canEdit&&createPortal(<div data-geometry-picker="true"
        className="geometry-picker geometry-picker-portal geometry-picker-expanded"
        style={{left:menuPosition.left,top:menuPosition.top}} role="dialog"
        aria-label="Измерительные инструменты">
        <header className="geometry-picker-header">
          <strong>Измерительные инструменты</strong>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Закрыть меню">×</button>
        </header>
        <p className="geometry-picker-hint">Нажимайте «Добавить» сколько нужно. Каждый новый инструмент появится отдельно.</p>
        <div className="geometry-picker-add">
          {(["ruler","triangle","protractor"] as const).map(type=><button type="button" key={type}
            onClick={()=>addInstrument(type)} aria-label={"Добавить: "+labels[type]}>
            <span className="geometry-add-symbol">+</span><span>Добавить {type==="ruler"?"линейку":type==="triangle"?"угольник":"транспортир"}</span>
            <small>{visible.filter(item=>item.geometryType===type).length}</small>
          </button>)}
        </div>
        <div className="geometry-picker-existing">
          <strong>На доске: {toolCount}</strong>
          {!toolCount&&<p>Пока ничего нет. Добавьте первый инструмент кнопкой выше.</p>}
          {visible.map(item=>{
            const type:Instrument=item.geometryType??"ruler";
            const number=visible.filter(other=>other.geometryType===type).findIndex(other=>other.id===item.id)+1;
            return <div className={"geometry-picker-entry "+(activeId===item.id?"active":"")} key={item.id}>
              <button type="button" className="geometry-entry-title" onClick={()=>select(item)}
                title="Показать и выделить на доске">{labels[type]} {number}</button>
              <button type="button" className="geometry-entry-copy" onClick={()=>duplicate(item)}
                aria-label={"Сделать копию "+labels[type].toLowerCase()+" "+number} title="Сделать копию">Копия</button>
              <button type="button" className="geometry-entry-remove" onClick={()=>{onRemove(item.id);if(activeId===item.id)onSelect(null)}}
                aria-label={"Удалить "+labels[type].toLowerCase()+" "+number} title="Удалить">×</button>
            </div>;
          })}
        </div>
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
      const number=visible.filter(other=>other.geometryType===type).findIndex(other=>other.id===item.id)+1;
      const isActive=activeId===item.id;
      return createPortal(<div key={item.id} className={"geometry-instrument geometry-instrument-centered "+(isActive?"geometry-instrument-active ":"")+(!canEdit?"geometry-instrument-viewer":"")}
        style={{left:centerX,top:centerY}}>
        {canEdit&&isActive&&<div className="geometry-instrument-actions" style={{top:toolbarOffset}} onPointerDown={event=>event.stopPropagation()} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
          <span>{labels[type]} {number}</span>
          <button type="button" className="geometry-duplicate-button" onClick={()=>duplicate(item)} title="Создать такую же линейку или другой измерительный инструмент">+ Копия</button>
          <span className="geometry-angle-readout">{Math.round(((angle%360)+360)%360)}°</span>
          <button type="button" className="geometry-rotation-handle" onPointerDown={event=>start(event,item,"rotate",pivot)} title="Вращать вокруг центра">⟳</button>
          <button type="button" onClick={()=>onUpdate(item.id,{rotation:0})} title="Сбросить поворот">0°</button>
          <button type="button" onClick={()=>resizeBy(item,-.1)} title="Уменьшить">−</button>
          <button type="button" onClick={()=>resizeBy(item,.1)} title="Увеличить">+</button>
          <button type="button" onClick={()=>{onRemove(item.id);onSelect(null)}} title="Удалить этот инструмент">×</button>
        </div>}
        <div className="geometry-instrument-body" style={{width:nativeWidth,height:nativeHeight,transform:"translate(-50%,-50%) rotate("+angle+"deg) scale("+visualScale+")",transformOrigin:"center center"}}
          onPointerDown={event=>start(event,item,"move",pivot)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
          <InstrumentDrawing type={type}/>
          {canEdit&&<button type="button" className="geometry-item-label" onPointerDown={event=>event.stopPropagation()}
            onClick={event=>{event.stopPropagation();onSelect(item.id)}}
            title={"Выбрать "+labels[type].toLowerCase()+" "+number}>{labels[type]} {number}</button>}
          {canEdit&&isActive&&<button type="button" className="geometry-scale-handle" title="Изменить масштаб по диагонали" aria-label="Изменить масштаб по диагонали"
            onPointerDown={event=>start(event,item,"scale",pivot)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>↘</button>}
        </div>
        <span className="geometry-pivot" aria-hidden="true"/>
      </div>,document.body);
    })}
  </>;
}
