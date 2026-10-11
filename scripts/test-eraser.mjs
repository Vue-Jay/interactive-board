import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Load the real TypeScript implementation without introducing another test dependency.
const source = readFileSync(new URL("../src/inkEraser.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
runInNewContext(compiled, { exports, crypto: { randomUUID } }, { filename: "inkEraser.js" });
const { eraseInkAlongPath } = exports;
assert.equal(typeof eraseInkAlongPath, "function");

const point = (x, y) => ({ x, y });
const stroke = (kind = "pen") => ({
  id: randomUUID(), kind, x: -2, y: -2, width: 5004, height: 4,
  text: "", color: "#000000", weight: 4,
  points: [point(2, 2), point(5002, 2)],
});
const spans = (pieces) => pieces.map((i) => {
  const values = i.points.map((p) => p.x + i.x);
  return [Math.min(...values), Math.max(...values)];
}).sort((a, b) => a[0] - b[0]);

for (const kind of ["pen", "marker"]) {
  const original = stroke(kind);
  // One click near the middle MUST make a gap, even in a 5,000px two-point stroke.
  const cut = eraseInkAlongPath([original], [point(2500, 0)], 10);
  assert.equal(cut.length, 2, kind + ": partial erasure must leave two pieces");
  const ends = spans(cut);
  assert.ok(ends[0][1] < 2500 && ends[1][0] > 2500, kind + ": the gap must be visible");
  assert.ok(ends[0][0] <= 0.01 && ends[1][1] >= 4999.99, kind + ": both ends remain");
  const cross = eraseInkAlongPath([original], [point(2500, -100), point(2500, 100)], 10);
  assert.equal(cross.length, 2, kind + ": a perpendicular sweep cuts the line");
  const missed = eraseInkAlongPath([original], [point(2500, 100)], 10);
  assert.equal(missed[0], original);
  assert.equal(eraseInkAlongPath([original], [point(0, 0), point(5000, 0)], 10).length, 0,
    kind + ": covering the full stroke removes it");
  assert.equal(eraseInkAlongPath(cut, [point(2500, 0)], 10).length, 2,
    kind + ": erasing the gap again must not remove the remaining halves");
}
const locked = { ...stroke(), locked: true };
assert.equal(eraseInkAlongPath([locked], [point(2500, 0)], 10)[0], locked,
  "locked strokes must remain unchanged");
const untouched = stroke();
const nearby = stroke();
nearby.y = 100;
const cutWithUntouched = eraseInkAlongPath([untouched, nearby], [point(2500, 0)], 10);
assert.equal(cutWithUntouched.length, 3);
assert.equal(cutWithUntouched[2], nearby, "other strokes must be preserved");

console.log("Eraser regression tests passed: partial, crossed, long, full, repeated and locked strokes.");
