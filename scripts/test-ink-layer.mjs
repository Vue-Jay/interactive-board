import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const load = (file, requireModule = () => { throw Error("Unexpected runtime import"); }) => {
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  if (compiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error))
    throw new Error("TypeScript transpilation failed");
  const exported = {};
  runInNewContext(compiled.outputText, { exports: exported, require: requireModule }, { filename: file });
  return exported;
};
const model = load("boardModel.ts");
const lasso = load("inkLasso.ts", id => {
  assert.equal(id, "./boardModel");
  return model;
});
const p = (x,y) => ({x,y});
const pen = model.stroke("p", "pen", [p(0,0),p(100,0)], "#111111", 3);
const marker = model.stroke("m", "marker", [p(50,50),p(150,50)], "#123456", 6);
const text = {id:"t",kind:"text",x:10,y:10,width:100,height:50,text:"Text"};
const image = {id:"im",kind:"shape",x:200,y:200,width:80,height:60,text:""};
const legacy = {version:1,title:"test",view:{x:0,y:0,zoom:1},items:[pen,text,marker,image]};
const packed = model.parseDocument(JSON.stringify(legacy));
assert.deepEqual(Array.from(packed.items, i=>i.id), ["t","im"], "ink must not be board objects");
assert.deepEqual(Array.from(packed.ink, i=>i.stroke.id), ["p","m"], "strokes retained");
assert.deepEqual(Array.from(packed.ink, i=>i.after), [0,1], "layer z-order preserved");
assert.deepEqual(Array.from(model.expandDocumentInk(packed), i=>i.id), ["p","t","m","im"]);
const roundtrip = model.parseDocument(JSON.stringify(packed));
assert.equal(JSON.stringify(roundtrip),JSON.stringify(packed), "new format must be stable");
const changed = model.packDocumentInk({...packed,items:[...model.expandDocumentInk(packed), model.stroke("q","pen",[p(0,100),p(80,100)], "#ffffff",4)],ink:undefined});
assert.equal(changed.items.length, 2);
assert.equal(changed.ink.length, 3);
assert.equal(model.parseDocument(JSON.stringify(changed)).ink.length, 3);
const polygon = [p(40,-10),p(60,-10),p(60,10),p(40,10)];
const erased = lasso.inkIdsInLasso(model.expandDocumentInk(packed),polygon);
assert.ok(erased.has("p"), "lasso erases a line passing through");
assert.ok(!erased.has("m"), "lasso preserves distant drawing");
assert.ok(!erased.has("t"), "lasso never erases ordinary objects");
assert.ok(!lasso.inkIdsInLasso([{...pen,locked:true}],polygon).size,"locked ink survives");
const afterErase = model.packDocumentInk({...packed,items:model.expandDocumentInk(packed).filter(i=>!erased.has(i.id)),ink:undefined});
assert.deepEqual(Array.from(afterErase.ink,i=>i.stroke.id),["m"]);
assert.deepEqual(Array.from(packed.ink,i=>i.stroke.id),["p","m"],"old undo snapshot retains ink");
console.log("Drawing layer migration, storage roundtrip, z-order, lasso and undo tests passed.");
