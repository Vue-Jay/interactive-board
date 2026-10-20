import type { Item, View } from "./boardModel";

export type InstrumentType = NonNullable<Item["geometryType"]>;
export const instrumentDimensions: Record<InstrumentType, readonly [number, number]> = {
  ruler: [410, 88],
  triangle: [340, 260],
  protractor: [360, 205],
};
export const newInstrumentId = () =>
  "geometry-" + Date.now().toString(36) + "-" +
  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14));

type Size = { width: number; height: number };
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** Position each new measuring tool in a distinct visible space.
 * Unlike the old fixed-center placement, subsequent rulers do not stack
 * invisibly on top of one another. The same rule applies to duplicates. */
export function createGeometryItem(
  type: InstrumentType,
  existing: readonly Item[],
  view: View,
  viewport: Size,
  source?: Item,
): Item {
  const zoom = Math.max(0.1, view.zoom);
  const [naturalWidth, naturalHeight] = instrumentDimensions[type];
  const scale = source
    ? source.width / naturalWidth
    : clamp(Math.min(1, (viewport.width - 48) / (naturalWidth * zoom),
      (viewport.height - 92) / (naturalHeight * zoom)), 0.35, 3.5);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  const screenW = width * zoom;
  const screenH = height * zoom;
  const tools = existing.filter(item => item.kind === "geometry" && !item.hidden);
  const startX = source
    ? (source.x + source.width / 2) * zoom + view.x
    : viewport.width / 2;
  const startY = source
    ? (source.y + source.height / 2) * zoom + view.y
    : viewport.height / 2;
  const verticalStep = Math.max(70, screenH + 38);
  const horizontalStep = Math.max(110, screenW * 0.55 + 26);
  const offsets: [number,number][] = source
    ? [[0,verticalStep],[0,-verticalStep],[horizontalStep,0],[-horizontalStep,0]]
    : [[0,0],[0,verticalStep],[0,-verticalStep]];
  for(let radius=1;radius<=5;radius++){
    for(const x of [-radius,0,radius]){
      for(const y of [-radius,0,radius]){
        if(x===0&&y===0)continue;
        offsets.push([x*horizontalStep,y*verticalStep]);
      }
    }
  }
  const visualBounds = tools.map(item=>({
    left: item.x * zoom + view.x,
    top: item.y * zoom + view.y,
    right: (item.x + item.width) * zoom + view.x,
    bottom: (item.y + item.height) * zoom + view.y,
  }));
  const halfW = Math.min(viewport.width / 2, screenW / 2 + 12);
  const halfH = Math.min(viewport.height / 2, screenH / 2 + 12);
  let chosenX = viewport.width / 2, chosenY = viewport.height / 2;
  let bestScore = Infinity;
  for(let index=0;index<offsets.length;index++){
    const [offsetX,offsetY]=offsets[index];
    const cx=clamp(startX+offsetX,halfW,viewport.width-halfW);
    const cy=clamp(startY+offsetY,halfH,viewport.height-halfH);
    const left=cx-screenW/2,top=cy-screenH/2;
    const overlap=visualBounds.reduce((sum,b)=>{
      const w=Math.max(0,Math.min(left+screenW,b.right)-Math.max(left,b.left));
      const h=Math.max(0,Math.min(top+screenH,b.bottom)-Math.max(top,b.top));
      return sum+w*h;
    },0);
    // Overlap dominates distance, but the closest non-overlapping place wins.
    const score=overlap/Math.max(1,screenW*screenH)*1_000_000
      +Math.hypot(cx-startX,cy-startY) + index*0.01;
    if(score<bestScore){bestScore=score;chosenX=cx;chosenY=cy;}
  }
  return {
    id:newInstrumentId(),
    kind:"geometry",
    geometryType:type,
    text:type==="ruler"?"Линейка":type==="triangle"?"Угольник":"Транспортир",
    x:(chosenX-view.x)/zoom-width/2,
    y:(chosenY-view.y)/zoom-height/2,
    width,height,rotation:source?.rotation??0,
  };
}
