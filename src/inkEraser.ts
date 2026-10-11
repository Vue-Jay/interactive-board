import type { Item, Point } from "./boardModel";

/** A freehand eraser: cut an ink polyline only where the brush passed. */
const distance2 = (p:Point,a:Point,b:Point) => {
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=den>0?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)):0;
  return (p.x-a.x-dx*t)**2+(p.y-a.y-dy*t)**2;
};
const at=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const equal=(a:Point,b:Point)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<.00001;
const push=(points:Point[],p:Point)=>{if(!points.length||!equal(points[points.length-1],p))points.push(p)};
function cutInterval(a:Point,b:Point,c:Point,d:Point,r:number):[number,number]|null {
  const within=(t:number)=>distance2(at(a,b,t),c,d)<=r*r;
  let lo=0,hi=1;
  // Distance to a line segment is convex along another segment.
  for(let n=0;n<25;n++){
    const l=(2*lo+hi)/3,u=(lo+2*hi)/3;
    if(distance2(at(a,b,l),c,d)<distance2(at(a,b,u),c,d))hi=u;else lo=l;
  }
  const mid=(lo+hi)/2;
  if(!within(mid)&&!within(0)&&!within(1))return null;
  let from=0,to=1;
  if(!within(0)){
    let l=0,u=mid;
    for(let n=0;n<23;n++){const m=(l+u)/2;if(within(m))u=m;else l=m}
    from=u;
  }
  if(!within(1)){
    let l=mid,u=1;
    for(let n=0;n<23;n++){const m=(l+u)/2;if(within(m))l=m;else u=m}
    to=l;
  }
  return [from,to];
}
function piece(source:Item,points:Point[]):Item {
  const weight=source.weight??3;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
  const x=minX-weight/2,y=minY-weight/2;
  return {...source,id:crypto.randomUUID(),x,y,width:Math.max(weight,maxX-minX+weight),
    height:Math.max(weight,maxY-minY+weight),points:points.map(p=>({x:p.x-x,y:p.y-y}))};
}
export function eraseInkAt(items:Item[],from:Point,to:Point,radius:number):Item[]{
  if(!(radius>0))return items;
  const output:Item[]=[];
  let changed=false;
  for(const item of items){
    if((item.kind!=="pen"&&item.kind!=="marker")||item.locked||item.hidden||!item.points?.length){
      output.push(item);continue;
    }
    const r=radius+(item.weight??1)/2;
    const minX=Math.min(from.x,to.x)-r,maxX=Math.max(from.x,to.x)+r;
    const minY=Math.min(from.y,to.y)-r,maxY=Math.max(from.y,to.y)+r;
    if(item.x>maxX||item.x+item.width<minX||item.y>maxY||item.y+item.height<minY){output.push(item);continue;}
    const points=item.points.map(p=>({x:p.x+item.x,y:p.y+item.y}));
    if(points.length===1){
      if(distance2(points[0],from,to)<=r*r){changed=true;continue;}
      output.push(item);continue;
    }
    const runs:Point[][]=[];
    let run:Point[]=[];
    if(distance2(points[0],from,to)>r*r)run=[points[0]];
    let hit=false;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(Math.max(a.x,b.x)<minX||Math.min(a.x,b.x)>maxX||Math.max(a.y,b.y)<minY||Math.min(a.y,b.y)>maxY){
        push(run,b);continue;
      }
      const interval=cutInterval(a,b,from,to,r);
      if(!interval){push(run,b);continue;}
      hit=true;
      const [entry,exit]=interval;
      if(entry>0)push(run,at(a,b,entry));
      if(run.length){runs.push(run);run=[];}
      if(exit<1){push(run,at(a,b,exit));push(run,b);}
    }
    if(run.length)runs.push(run);
    if(!hit){output.push(item);continue;}
    changed=true;
    for(const r of runs)if(r.length)output.push(piece(item,r));
  }
  return changed?output:items;
}
