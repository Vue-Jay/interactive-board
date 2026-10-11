import type { Item, Point } from "./boardModel";

/**
 * Erases only portions of freehand pen/marker paths. Each pointer update sends
 * the most recent eraser segment, not the full pointer history.
 *
 * A brush stroke is a capsule (a swept circle). Because a capsule is convex,
 * its intersection with one straight ink segment is either empty or a single
 * continuous interval. Clip that interval and preserve both outside parts.
 */
const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const distSq = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len > 0 ? Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy)/len)) : 0;
  const ex = p.x - a.x - dx*t, ey = p.y - a.y - dy*t;
  return ex*ex+ey*ey;
};
const close = (a: Point, b: Point) => Math.hypot(a.x-b.x,a.y-b.y) < 0.00001;
const pushUnique = (run: Point[], p: Point) => {
  if(!run.length || !close(run[run.length-1],p)) run.push(p);
};
const brushBounds = (path: Point[], radius: number) => {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of path) { minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y); }
  return {left:minX-radius,top:minY-radius,right:maxX+radius,bottom:maxY+radius};
};
const overlaps = (a: Point,b: Point,box:ReturnType<typeof brushBounds>) =>
  Math.min(a.x,b.x)<=box.right && Math.max(a.x,b.x)>=box.left &&
  Math.min(a.y,b.y)<=box.bottom && Math.max(a.y,b.y)>=box.top;

// Find the erased interval on a single line segment using convex distance.
function interval(a:Point,b:Point,c:Point,d:Point,radiusSq:number):[number,number]|null {
  const inside=(t:number)=>distSq(lerp(a,b,t),c,d)<=radiusSq;
  // Squared distance to a convex set along a straight line is convex.
  let lo=0,hi=1;
  for(let k=0;k<28;k++){
    const l=(2*lo+hi)/3, r=(lo+2*hi)/3;
    if(distSq(lerp(a,b,l),c,d)<distSq(lerp(a,b,r),c,d))hi=r;else lo=l;
  }
  const mid=(lo+hi)/2;
  if(!inside(mid) && !inside(0) && !inside(1))return null;
  let start=0,end=1;
  if(!inside(0)){
    let l=0,r=mid;
    for(let k=0;k<24;k++){const t=(l+r)/2;if(inside(t))r=t;else l=t;}
    start=r;
  }
  if(!inside(1)){
    let l=mid,r=1;
    for(let k=0;k<24;k++){const t=(l+r)/2;if(inside(t))l=t;else r=t;}
    end=l;
  }
  return [start,end];
}

const segmentItem=(source:Item, points:Point[],id:string):Item=>{
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
  const weight=source.weight??3;
  const x=minX-weight/2,y=minY-weight/2;
  return {...source,id,x,y,width:Math.max(weight,maxX-minX+weight),height:Math.max(weight,maxY-minY+weight),points:points.map(p=>({x:p.x-x,y:p.y-y}))};
};

export function eraseInk(items:Item[],brushPath:Point[],radius:number):Item[] {
  if(!brushPath.length || !(radius>0))return items;
  const path=brushPath.length===1 ? [brushPath[0],brushPath[0]] : brushPath;
  let changed=false;
  let result:Item[]=items;
  for(let j=1;j<path.length;j++){
    const c=path[j-1],d=path[j];
    const next:Item[]=[];
    let sweepChanged=false;
    for(const item of result){
      if((item.kind!=="pen" && item.kind!=="marker") || item.locked || item.hidden || !item.points?.length){
        next.push(item);continue;
      }
      const effectiveRadius=radius+(item.weight??1)/2;
      const extended=brushBounds([c,d],effectiveRadius);
      if(item.x>extended.right || item.x+item.width<extended.left ||
        item.y>extended.bottom || item.y+item.height<extended.top){next.push(item);continue;}
      const pts=item.points.map(p=>({x:p.x+item.x,y:p.y+item.y}));
      if(pts.length===1){
        if(distSq(pts[0],c,d)<=effectiveRadius*effectiveRadius){sweepChanged=true;continue;}
        next.push(item);continue;
      }
      const runs:Point[][]=[];
      let run:Point[]=[];
      if(distSq(pts[0],c,d)> (radius+(item.weight??1)/2)**2) run=[pts[0]];
      let hit=false;
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        const cut=overlaps(a,b,extended)?interval(a,b,c,d,effectiveRadius*effectiveRadius):null;
        if(!cut){pushUnique(run,b);continue;}
        hit=true;
        const [entry,exit]=cut;
        if(entry>0)pushUnique(run,lerp(a,b,entry));
        if(run.length){runs.push(run);run=[];}
        if(exit<1){pushUnique(run,lerp(a,b,exit));pushUnique(run,b);}
      }
      if(run.length)runs.push(run);
      if(!hit){next.push(item);continue;}
      sweepChanged=true;
      let part=0;
      for(const points of runs) {
        if(points.length)next.push(segmentItem(item,points,`${item.id}.erase.${part++}.${crypto.randomUUID()}`));
      }
    }
    if(sweepChanged){result=next;changed=true;}
    // Avoid unnecessary allocations/rendering for strokes out of range.
  }
  return changed?result:items;
}
