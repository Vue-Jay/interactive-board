import { memo, useLayoutEffect, useRef } from "react";
import type { Item, View } from "./boardModel";

type ViewportSize = { width: number; height: number };
type InkBounds = { x: number; y: number; width: number; height: number };
type RasterCache = {
  left: number; top: number; right: number; bottom: number;
  zoom: number; width: number; height: number; strokes: Item[];
};

/**
 * Read-only ink is rasterized in contiguous z-order batches instead of one
 * SVG + React object per stroke. A small screen-space overscan is painted once
 * and then moved by the parent's CSS transform. Ordinary pans do not repaint.
 * No board data or ink geometry is changed.
 */
const ViewerInkLayer = memo(function ViewerInkLayer({
  strokes, bounds, view, viewport,
}: {
  strokes: Item[]; bounds: InkBounds; view: View; viewport: ViewportSize;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<RasterCache | null>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width <= 0 || viewport.height <= 0 || view.zoom <= 0) return;
    const zoom = view.zoom;
    const worldLeft = -view.x / zoom, worldTop = -view.y / zoom;
    const worldRight = worldLeft + viewport.width / zoom;
    const worldBottom = worldTop + viewport.height / zoom;
    const cached = cacheRef.current;
    const padding = 40 / zoom;
    const tileBuffer = 320 / zoom;
    const minBuffer = 70 / zoom;
    const boundLeft = bounds.x - padding;
    const boundTop = bounds.y - padding;
    const boundRight = bounds.x + bounds.width + padding;
    const boundBottom = bounds.y + bounds.height + padding;
    // A cached tile can be reused if it contains the visible portion of
    // this batch, even when the viewport itself extends beyond its bounds.
    const requiredLeft = Math.max(worldLeft - minBuffer, boundLeft);
    const requiredTop = Math.max(worldTop - minBuffer, boundTop);
    const requiredRight = Math.min(worldRight + minBuffer, boundRight);
    const requiredBottom = Math.min(worldBottom + minBuffer, boundBottom);
    if (cached && cached.strokes === strokes && cached.zoom === zoom &&
        cached.width === viewport.width && cached.height === viewport.height &&
        cached.left <= requiredLeft && cached.top <= requiredTop &&
        cached.right >= requiredRight && cached.bottom >= requiredBottom) return;

    // Rasterize only the intersection of the nearby viewport and this group's
    // actual world bounds, rather than allocating a full viewport canvas for
    // every layer separated by a photo or PDF.
    const left = Math.max(worldLeft - tileBuffer, boundLeft);
    const top = Math.max(worldTop - tileBuffer, boundTop);
    const right = Math.min(worldRight + tileBuffer, boundRight);
    const bottom = Math.min(worldBottom + tileBuffer, boundBottom);
    if (right <= left || bottom <= top) return;
    const cssWidth = right - left;
    const cssHeight = bottom - top;
    const ratio = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.max(1, Math.ceil(cssWidth * zoom * ratio));
    const pixelHeight = Math.max(1, Math.ceil(cssHeight * zoom * ratio));
    const factor = Math.min(1, 4096 / Math.max(pixelWidth, pixelHeight));
    const actualRatio = ratio * factor;
    canvas.width = Math.max(1, Math.ceil(cssWidth * zoom * actualRatio));
    canvas.height = Math.max(1, Math.ceil(cssHeight * zoom * actualRatio));
    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const scale = zoom * actualRatio;
    ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
    for (const item of strokes) {
      if (item.hidden || !item.points?.length) continue;
      const weight = item.weight ?? 3, pad = weight / 2;
      if (item.x + item.width + pad < left || item.x - pad > right ||
          item.y + item.height + pad < top || item.y - pad > bottom) continue;
      ctx.save();
      if (item.rotation) {
        const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(item.rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.globalAlpha = item.kind === "marker" ? 0.32 : 1;
      ctx.strokeStyle = item.color ?? "#000000";
      ctx.fillStyle = item.color ?? "#000000";
      ctx.lineWidth = weight; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const points = item.points;
      ctx.beginPath();
      if (points.length === 1) {
        ctx.arc(item.x + points[0].x, item.y + points[0].y, weight / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(item.x + points[0].x, item.y + points[0].y);
        for (let index = 1; index < points.length; index++) {
          ctx.lineTo(item.x + points[index].x, item.y + points[index].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    cacheRef.current = {
      left, top, right, bottom, zoom,
      width: viewport.width, height: viewport.height, strokes,
    };
  }, [strokes, bounds, view.x, view.y, view.zoom, viewport.width, viewport.height]);

  return <canvas ref={canvasRef} className="viewer-ink-canvas" aria-hidden="true"
    style={{ position: "absolute", pointerEvents: "none", maxWidth: "none", maxHeight: "none" }} />;
});
export default ViewerInkLayer;
