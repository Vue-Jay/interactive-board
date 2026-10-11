import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/inkHitTest.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exported = {};
runInNewContext(compiled, { exports: exported }, { filename: "inkHitTest.js" });
const { hitTestInk } = exported;
assert.equal(typeof hitTestInk, "function");
const a = {
  id: "one", kind: "pen", x: 0, y: 0, width: 100, height: 1, weight: 2,
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
};
const b = { ...a, id: "two", y: 50 };
assert.equal(hitTestInk([a, b], { x: 50, y: 0 }, 3)?.id, "one", "line hit");
assert.equal(hitTestInk([a, b], { x: 50, y: 50 }, 3)?.id, "two", "second line hit");
assert.equal(hitTestInk([a, b], { x: 50, y: 30 }, 3), null, "gap must be empty");
assert.equal(hitTestInk([a, b], { x: 50, y: 0 }, 3, 0), null, "respect DOM z-order");
assert.equal(hitTestInk([a, b], { x: 50, y: 0 }, 3, -1, new Set(["one"])), null, "selected ink uses DOM");
const rotated = {
  ...a, id: "rotated", x: 100, y: 100, width: 100, height: 10, rotation: 90,
  points: [{x: 0, y: 5}, {x: 100, y: 5}],
};
assert.equal(hitTestInk([rotated], { x: 150, y: 100 }, 3)?.id, "rotated", "rotated line");
assert.equal(hitTestInk([rotated], { x: 140, y: 100 }, 3), null, "rotated line miss");
assert.equal(hitTestInk([{...a,locked:true}], {x:50,y:0}, 3)?.id, "one", "locked ink can be selected");
console.log("Ink canvas hit-tests passed.");
