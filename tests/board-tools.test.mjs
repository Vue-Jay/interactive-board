import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source=readFileSync(new URL("../src/boardModel.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {stroke}=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));
const eraserSource=readFileSync(new URL("../src/inkEraser.ts",import.meta.url),"utf8");
const eraserJS=ts.transpileModule(eraserSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {eraseInk}=await import("data:text/javascript;base64,"+Buffer.from(eraserJS).toString("base64"));

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

test("new eraser splits a line in the middle and preserves both ends",()=>{
  const ink=stroke("line","pen",[{x:0,y:0},{x:300,y:0}],"#000",3);
  const fragments=eraseInk([ink],[{x:150,y:0}],9).filter(i=>i.kind==="pen");
  assert.equal(fragments.length,2);
  const xs=fragments.map(f=>f.points.map(p=>p.x+f.x));
  assert.ok(Math.max(...xs[0])<150 && Math.min(...xs[1])>150);
  assert.ok(xs[0][0]<=0 && xs[1].at(-1)>=300);
});

test("new eraser handles a series of real-time moves",()=>{
  const ink=stroke("line","pen",[{x:0,y:0},{x:300,y:0}],"#000",3);
  let result=[ink];
  for(let y=-20;y<20;y+=4)result=eraseInk(result,[{x:150,y},{x:150,y:y+4}],8);
  assert.equal(result.filter(i=>i.kind==="pen").length,2);
  assert.ok(result.some(i=>i.kind==="pen"&&i.x<10));
  assert.ok(result.some(i=>i.kind==="pen"&&i.x>140));
});

test("new eraser removes one-point ink without affecting other objects",()=>{
  const dot=stroke("dot","pen",[{x:18,y:21}],"#000",7);
  const label={id:"label",kind:"text",x:10,y:10,width:20,height:20,text:"keep"};
  const items=eraseInk([dot,label],[{x:18,y:21}],8);
  assert.equal(items.length,1);
  assert.equal(items[0],label);
});

test("new eraser works at different zoom levels",()=>{
  const ink=stroke("p","pen",[{x:0,y:0},{x:400,y:0}],"#000",2);
  for(const zoom of [.25,1,3]){
    const pieces=eraseInk([ink],[{x:200,y:0}],10/zoom);
    assert.equal(pieces.filter(i=>i.kind==="pen").length,2);
  }
});

test("new eraser is wired into board pointer capture independently",()=>{
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  assert.ok(app.includes('from "./inkEraser"'));
  assert.ok(app.includes("onPointerDownCapture"));
  assert.ok(app.includes("onPointerMoveCapture"));
});
