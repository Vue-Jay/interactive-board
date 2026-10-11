import type { Item, Point } from "./boardModel";
import { isInkItem, simplifyStrokePath } from "./boardModel";

const inside = (p: Point, polygon: readonly Point[]): boolean => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
};
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (a: Point, b: Point, p: Point) =>
  Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
  Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
const intersect = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const ac = cross(a,b,c), ad = cross(a,b,d), ca = cross(c,d,a), cb = cross(c,d,b);
  if ((ac > 0 && ad < 0 || ac < 0 && ad > 0) &&
      (ca > 0 && cb < 0 || ca < 0 && cb > 0)) return true;
  return (ac === 0 && onSegment(a,b,c)) || (ad === 0 && onSegment(a,b,d)) ||
    (ca === 0 && onSegment(c,d,a)) || (cb === 0 && onSegment(c,d,b));
};

// Geometric lasso selection of individual pen/marker objects. The lasso
// never mutates a stroke. Locked ink is selectable for inspection/unlocking.
export function inkIdsInLasso(items: readonly Item[], polygon: readonly Point[], zoom = 1): Set<string> {
  const hits = new Set<string>();
  if (polygon.length < 3) return hits;
  // Reduce lasso samples once instead of comparing thousands of ink segments
  // against every pointer event in a dense freehand outline.
  const outline = polygon.length > 24 ? simplifyStrokePath(polygon, zoom) : polygon;
  if (outline.length < 3) return hits;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX,p.x); minY = Math.min(minY,p.y);
    maxX = Math.max(maxX,p.x); maxY = Math.max(maxY,p.y);
  }
  for (const item of items) {
    if (!isInkItem(item) || item.hidden || !item.points?.length) continue;
    const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
    // A conservative rotated AABB avoids testing distant strokes.
    const pad = Math.hypot(item.width,item.height) / 2 + (item.weight ?? 3);
    if (cx + pad < minX || cx - pad > maxX || cy + pad < minY || cy - pad > maxY) continue;
    const angle = (item.rotation ?? 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const toWorld = (p: Point): Point => {
      const x = item.x + p.x, y = item.y + p.y;
      const dx = x - cx, dy = y - cy;
      return { x: cx + dx*cos - dy*sin, y: cy + dx*sin + dy*cos };
    };
    let prior = toWorld(item.points[0]);
    if (inside(prior,outline)) { hits.add(item.id); continue; }
    for (let k=1; k<item.points.length; k++) {
      const next = toWorld(item.points[k]);
      if (inside(next,outline)) { hits.add(item.id); break; }
      if (!(Math.max(prior.x,next.x)<minX || Math.min(prior.x,next.x)>maxX ||
          Math.max(prior.y,next.y)<minY || Math.min(prior.y,next.y)>maxY)) {
        for (let j=0;j<outline.length;j++) {
          if (intersect(prior,next,outline[j],outline[(j+1)%outline.length])) {
            hits.add(item.id); break;
          }
        }
      }
      if (hits.has(item.id)) break;
      prior = next;
    }
  }
  return hits;
}
