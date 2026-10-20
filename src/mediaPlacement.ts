import type { Item, Point, View } from "./boardModel";

export type MediaSize = { width: number; height: number };
export type MediaPosition = MediaSize & Point;
const gapPx = 24;
const valid = (n: number) => Number.isFinite(n) && n > 0;

/** Arrange imported photos/PDFs into rows, then move the group away from
 * existing media if needed. All positions use world coordinates. */
export function planMediaPositions(
  sizes: readonly MediaSize[],
  existing: readonly Item[],
  center: Point,
  view: View,
  viewport: MediaSize,
): MediaPosition[] {
  if (!sizes.length) return [];
  if (sizes.some(s => !valid(s.width) || !valid(s.height)))
    throw new Error("Некорректный размер медиа");
  const zoom = Math.max(0.1, Math.min(8, view.zoom));
  const gap = gapPx / zoom;
  const rowLimit = Math.max(...sizes.map(s=>s.width), Math.max(200, viewport.width/zoom) - 36/zoom);
  const placements: MediaPosition[] = [];
  let x=0,y=0,rowHeight=0,fullWidth=0;
  for(const size of sizes) {
    if(x>0 && x+size.width>rowLimit+0.01) {
      y+=rowHeight+gap;
      x=0;rowHeight=0;
    }
    placements.push({x,y,width:size.width,height:size.height});
    x+=size.width+gap;
    rowHeight=Math.max(rowHeight,size.height);
    fullWidth=Math.max(fullWidth,x-gap);
  }
  const fullHeight=y+rowHeight;
  const obstacles=existing.filter(item=>
    (item.kind==="image"||item.kind==="pdf")&&!item.hidden&&
    valid(item.width)&&valid(item.height));
  const initial:Point={x:center.x-fullWidth/2,y:center.y-fullHeight/2};
  const candidates:Point[]=[initial];
  const ordered=[...obstacles].sort((a,b)=>
    Math.hypot(a.x+a.width/2-center.x,a.y+a.height/2-center.y)-
    Math.hypot(b.x+b.width/2-center.x,b.y+b.height/2-center.y)).slice(0,160);
  for(const item of ordered) {
    candidates.push(
      {x:item.x+item.width+gap,y:item.y},
      {x:item.x,y:item.y+item.height+gap},
      {x:item.x-fullWidth-gap,y:item.y},
      {x:item.x,y:item.y-fullHeight-gap});
  }
  const stepX=fullWidth+gap,stepY=fullHeight+gap;
  for(let ring=1;ring<=9;ring++)
    for(let dx=-ring;dx<=ring;dx++)
      for(let dy=-ring;dy<=ring;dy++){
        if(Math.max(Math.abs(dx),Math.abs(dy))===ring)
          candidates.push({x:initial.x+dx*stepX,y:initial.y+dy*stepY});
      }
  const visibleLeft=-view.x/zoom, visibleTop=-view.y/zoom;
  const visibleRight=visibleLeft+viewport.width/zoom;
  const visibleBottom=visibleTop+viewport.height/zoom;
  let best=initial,bestScore=Infinity;
  for(const candidate of candidates){
    let conflicts=0;
    for(const media of placements){
      const left=candidate.x+media.x,top=candidate.y+media.y;
      for(const item of obstacles){
        const w=Math.max(0,Math.min(left+media.width,item.x+item.width+gap)-Math.max(left,item.x-gap));
        const h=Math.max(0,Math.min(top+media.height,item.y+item.height+gap)-Math.max(top,item.y-gap));
        conflicts+=w*h;
      }
    }
    const outside=Math.max(0,visibleLeft-candidate.x)+
      Math.max(0,candidate.x+fullWidth-visibleRight)+
      Math.max(0,visibleTop-candidate.y)+
      Math.max(0,candidate.y+fullHeight-visibleBottom);
    // Prioritize zero overlap even when the infinite board must extend offscreen.
    const score=conflicts*100000+outside*6+
      Math.hypot(candidate.x-initial.x,candidate.y-initial.y);
    if(score<bestScore){bestScore=score;best=candidate;if(score===0)break;}
  }
  return placements.map(item=>({
    x:best.x+item.x,y:best.y+item.y,width:item.width,height:item.height
  }));
}
