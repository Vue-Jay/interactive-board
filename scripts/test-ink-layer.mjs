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
const sync = load("boardSync.ts");
const lasso = load("inkLasso.ts", id => {
  assert.equal(id, "./boardModel");
  return model;
});
const p=(x,y)=>({x,y});
const pen=model.stroke("p","pen",[p(0,0),p(100,0)],"#111111",3);
const marker=model.stroke("m","marker",[p(50,50),p(150,50)],"#123456",6);
const label={id:"t",kind:"text",x:10,y:10,width:100,height:50,text:"Text"};
const photo={id:"im",kind:"shape",x:200,y:200,width:80,height:60,text:""};
const ids=data=>Array.from(data.items, i=>i.id);
const legacy={version:1,title:"test",view:{x:0,y:0,zoom:1},
 items:[label,photo],
 ink:[{after:0,stroke:pen},{after:1,stroke:marker}]};
const migrated=model.parseDocument(JSON.stringify(legacy));
assert.deepEqual(ids(migrated),["p","t","m","im"],"old ink collection migrates to real objects");
assert.equal(migrated.ink,undefined,"strokes no longer reside in separate collection");
const next=model.parseDocument(JSON.stringify(migrated));
assert.equal(JSON.stringify(next),JSON.stringify(migrated),"roundtrip is stable");
const live={...migrated,items:[...migrated.items,
 model.stroke("q","pen",[p(0,100),p(80,100)],"#ffffff",4)]};
const packed=model.packDocumentInk(live);
assert.deepEqual(ids(packed),["p","t","m","im","q"],"strokes remain separate editable objects");
assert.equal(packed.ink,undefined);
const polygon=[p(40,-10),p(60,-10),p(60,10),p(40,10)];
const selection=lasso.inkIdsInLasso(packed.items,polygon);
const denseSquare=[];
for(let i=0;i<=100;i++)denseSquare.push(p(40+20*i/100,-10));
for(let i=1;i<=100;i++)denseSquare.push(p(60,-10+20*i/100));
for(let i=1;i<=100;i++)denseSquare.push(p(60-20*i/100,10));
for(let i=1;i<100;i++)denseSquare.push(p(40,10-20*i/100));
assert.ok(lasso.inkIdsInLasso(packed.items,denseSquare,1).has("p"),
 "long pointer lasso must still select crossing strokes after simplification");

assert.ok(selection.has("p"),"lasso must select crossing strokes");
assert.ok(!selection.has("m"),"lasso must not select distant strokes");
assert.ok(!selection.has("t"),"non-ink objects use their own lasso semantics");
assert.ok(lasso.inkIdsInLasso([{...pen,locked:true}],polygon).has("p"),
 "locked ink may be selected for inspecting/unlocking");
const before=packed.items;
const selectedIds=new Set(selection);
assert.equal(before.length,5,"lasso selection must never delete strokes");
assert.ok(before.some(item=>selectedIds.has(item.id)),"selection has a distinct item id");
const deleted={...packed,items:packed.items.filter(item=>!selectedIds.has(item.id))};
assert.deepEqual(ids(deleted),["t","m","im","q"],"explicit delete removes selection");
assert.deepEqual(ids(packed),["p","t","m","im","q"],"original undo snapshot remains intact");
assert.notEqual(sync.documentFingerprint(packed),sync.documentFingerprint(deleted),
 "explicit deletion syncs to server");
assert.equal(sync.documentFingerprint(packed),
 sync.documentFingerprint({...packed,view:{x:80,y:50,zoom:3}}),
 "viewport movement must not create content history");
const longLine=Array.from({length:1800},(_,i)=>p(i/12,20));
const light=model.stroke("light","pen",longLine,"#112233",3,1);
assert.ok(light.points.length < 20,"redundant collinear points are simplified");
assert.equal(light.points[0].x,1.5,"stroke start remains positioned accurately");
assert.ok(light.points.at(-1).x>140,"stroke end is preserved");
assert.equal(light.weight,3,"visual stroke thickness must not change");
const detailed=[p(0,0),p(10,0),p(10,10),p(20,10)];
assert.ok(model.simplifyStrokePath(detailed,1).length>=4,
 "intentional bends must survive simplification");
console.log("Selectable strokes, legacy migration, canvas data, lasso, undo, sync and compact points passed.");
