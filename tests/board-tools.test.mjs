import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source=readFileSync(new URL("../src/boardModel.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {stroke,eraseInk}=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));

test("eraser taps the center of a sparse two-point pencil stroke",()=>{
  const ink=stroke("p","pen",[{x:0,y:0},{x:100,y:0}],"#000",3);
  const result=eraseInk([ink],[{x:50,y:0}],8);
  assert.notEqual(result.length,1,"stroke should be split by a tap");
  assert.ok(result.every(i=>i.kind==="pen"));
  assert.ok(result.every(i=>i.points.every(p=>Math.abs(i.x+p.x-50)>5)),"erased section must disappear");
});

test("eraser sweeps across marker, preserving untouched non-ink objects",()=>{
  const ink=stroke("m","marker",[{x:0,y:0},{x:100,y:0}],"#abc",16);
  const label={id:"label",kind:"text",x:40,y:0,width:20,height:20,text:"keep"};
  const result=eraseInk([ink,label],[{x:50,y:-50},{x:50,y:50}],6);
  assert.equal(result.find(i=>i.id==="label"),label);
  assert.ok(result.filter(i=>i.kind==="marker").length>=2);
});

test("eraser leaves untouched strokes unchanged for undo and no-op history",()=>{
  const ink=stroke("safe","pen",[{x:0,y:0},{x:100,y:0}],"#000",3);
  const result=eraseInk([ink],[{x:500,y:500}],8);
  assert.equal(result[0],ink);
});

test("eraser does not delete locked ink",()=>{
  const ink={...stroke("locked","pen",[{x:0,y:0},{x:100,y:0}],"#000",3),locked:true};
  assert.equal(eraseInk([ink],[{x:50,y:0}],8)[0],ink);
});

test("all registered board tools remain represented in tool selection UI",()=>{
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  const registered=[...app.matchAll(/\{ id: "(select|hand|lasso|pen|marker|eraser|connector|frame|comment|table|formula|graph|checklist|quiz|flashcard|cover|sticky|text|shape|media|linkmedia)", icon:/g)].map(m=>m[1]);
  assert.equal(new Set(registered).size,21);
  assert.ok(app.includes('mode = "erase"') && app.includes('mode = "draw"'));
  assert.ok(app.includes('id==="eraser"&&<GeometryInstruments mobile'));
});
