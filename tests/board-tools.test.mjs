import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const source=readFileSync(new URL("../src/boardModel.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {stroke,eraseInk}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));

test("restored eraser removes pencil ink under a click",()=>{
  const ink=stroke("ink","pen",[{x:0,y:0},{x:8,y:0},{x:16,y:0},{x:24,y:0},{x:32,y:0}],"#000",3);
  const result=eraseInk([ink],[{x:16,y:0}],3);
  assert.ok(result.length < 5);
  assert.ok(result.every(i=>i.kind==="pen"));
  assert.ok(!result.some(i=>i.points?.some(p=>Math.abs(i.x+p.x-16)<0.5)));
});

test("restored eraser changes marker and keeps non-ink objects",()=>{
  const marker=stroke("marker","marker",[{x:0,y:0},{x:5,y:0},{x:10,y:0},{x:15,y:0},{x:20,y:0}],"#aaf",8);
  const shape={id:"shape",kind:"shape",x:0,y:0,width:30,height:30,text:""};
  const result=eraseInk([marker,shape],[{x:10,y:0}],3);
  assert.equal(result.find(i=>i.id==="shape"),shape);
  assert.ok(result.filter(i=>i.kind==="marker").length<=2);
});

test("restored eraser does not affect distant strokes",()=>{
  const ink=stroke("distant","pen",[{x:0,y:0},{x:10,y:10}],"#000",2);
  const result=eraseInk([ink],[{x:200,y:200}],4);
  assert.equal(result.length,1);
  assert.equal(result[0].kind,"pen");
});

test("restored eraser uses board-coordinate radius at zoom",()=>{
  const ink=stroke("zoom","pen",[{x:0,y:0},{x:10,y:0},{x:20,y:0}],"#000",3);
  assert.ok(eraseInk([ink],[{x:10,y:0}],6).length<=2);
});

test("board tools retain their registry and original eraser pointer path",()=>{
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  const registered=[...app.matchAll(/\{ id: "(select|hand|lasso|pen|marker|eraser|connector|frame|comment|table|formula|graph|checklist|quiz|flashcard|cover|sticky|text|shape|media|linkmedia)", icon:/g)].map(m=>m[1]);
  assert.equal(new Set(registered).size,21);
  assert.ok(app.includes('mode = "erase"'));
  assert.ok(app.includes('display(eraseInk(g.before,g.path,eraserSize/2/view.zoom))'));
  assert.ok(!app.includes('from "./inkEraser"'));
  assert.ok(!app.includes("onPointerDownCapture"));
});
