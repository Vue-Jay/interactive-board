import type { Item, Point } from "./boardModel";

/**
 * Hit test for ink rasterized on canvas. Coordinates are board/world units.
 * Reverse order matches DOM stacking: the last item is on top.
 * Called only at pointer down/context menu, never during pan frames.
 */
export function hitTestInk(
  items: readonly Item[],
  worldPoint: Point,
  tolerance: number,
  lowerIndex = -1,
  excluded: ReadonlySet<string> = new Set(),
): Item | null {
  const allowance = Math.max(0.5, tolerance);
  for (let index = items.length - 1; index > lowerIndex; index--) {
    const item = items[index];
    if ((item.kind !== "pen" && item.kind !== "marker") ||
        item.hidden || excluded.has(item.id) || !item.points?.length) continue;

    // Rotated strokes can extend past their axis-aligned element bounds.
    const halfDiagonal = Math.hypot(item.width, item.height) / 2;
    const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
    const radius = Math.max(halfDiagonal, Math.max(item.width, item.height) / 2) + allowance + (item.weight ?? 3) / 2;
    if (Math.abs(worldPoint.x - cx) > radius || Math.abs(worldPoint.y - cy) > radius) continue;
    let x = worldPoint.x, y = worldPoint.y;
    if (item.rotation) {
      const angle = -item.rotation * Math.PI / 180;
      const dx = x - cx, dy = y - cy;
      x = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
      y = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
    }
    const lx = x - item.x, ly = y - item.y;
    const limit = allowance + (item.weight ?? 3) / 2;
    if (lx < -limit || ly < -limit || lx > item.width + limit || ly > item.height + limit) continue;
    const sqLimit = limit * limit, points = item.points;
    if (points.length === 1) {
      const dx = lx - points[0].x, dy = ly - points[0].y;
      if (dx * dx + dy * dy <= sqLimit) return item;
      continue;
    }
    for (let j = 1; j < points.length; j++) {
      const a = points[j - 1], b = points[j];
      const vx = b.x - a.x, vy = b.y - a.y;
      const lengthSq = vx * vx + vy * vy;
      const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((lx - a.x) * vx + (ly - a.y) * vy) / lengthSq)) : 0;
      const dx = lx - (a.x + t * vx), dy = ly - (a.y + t * vy);
      if (dx * dx + dy * dy <= sqLimit) return item;
    }
  }
  return null;
}
