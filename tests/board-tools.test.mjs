import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const source=readFileSync(new URL("../src/boardModel.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {stroke,eraseInk}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
const cutter=readFileSync(new URL("../src/inkEraser.ts",import.meta.url),"utf8");
const cutterJS=ts.transpileModule(cutter,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {eraseInkAt}=await import("data:text/javascript;base64,"+Buffer.from(cutterJS).toString("base64"));

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

test("new live eraser cuts only the middle of a long two-point stroke",()=>{
 const item=stroke("line","pen",[{x:0,y:0},{x:300,y:0}],"#000",3);
 const pieces=eraseInkAt([item],{x:150,y:0},{x:150,y:0},10);
 assert.equal(pieces.length,2);
 assert.ok(Math.max(...pieces[0].points.map(p=>p.x+pieces[0].x))<150);
 assert.ok(Math.min(...pieces[1].points.map(p=>p.x+pieces[1].x))>150);
});
test("new live eraser preserves other shapes and distant marker",()=>{
 const label={id:"text",kind:"text",x:0,y:0,width:30,height:30,text:"keep"};
 const ink=stroke("mark","marker",[{x:0,y:100},{x:300,y:100}],"#aaf",18);
 const pieces=eraseInkAt([label,ink],{x:150,y:100},{x:150,y:100},10);
 assert.equal(pieces[0],label);
 assert.equal(pieces.length,3);
});
test("new live eraser does not rerender unrelated items",()=>{
 const ink=stroke("line","pen",[{x:0,y:0},{x:300,y:0}],"#000",3);
 const original=[ink];
 assert.equal(eraseInkAt(original,{x:500,y:500},{x:500,y:501},8),original);
});
test("incremental brush movement retains both halves of a stroke",()=>{
 let current=[stroke("line","pen",[{x:0,y:0},{x:300,y:0}],"#000",3)];
 for(let y=-20;y<20;y+=4)current=eraseInkAt(current,{x:150,y},{x:150,y:y+4},8);
 assert.equal(current.length,2);
 assert.ok(current[0].x<10 && current[1].x>140);
});
test("eraser has dedicated capture listeners and keeps tool registry",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const registered=[...app.matchAll(/\{ id: "(select|hand|lasso|pen|marker|eraser|connector|frame|comment|table|formula|graph|checklist|quiz|flashcard|cover|sticky|text|shape|media|linkmedia)", icon:/g)].map(m=>m[1]);
 assert.equal(new Set(registered).size,21);
 assert.ok(app.includes('onPointerDownCapture='));
 assert.ok(app.includes('onPointerMoveCapture='));
 assert.ok(app.includes('onPointerUpCapture='));
 assert.ok(app.includes('beginEraserPreview();'));
 assert.ok(app.includes('previewEraserSegment(previous,screen)'));
});

test("eraser draws a lightweight canvas preview and commits once at gesture end",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.ok(app.includes("const beginEraserPreview=()=>"));
 assert.ok(app.includes("const previewEraserSegment=(from:Point,to:Point)=>"));
 assert.ok(app.includes("const recordEraserPoint=(point:Point)=>"));
 assert.ok(app.includes("const finishEraser=(point:Point|null)=>"));
 assert.ok(app.includes("const next=eraseInkAlongPath(before,g.path,eraserSize/2/g.zoom)"));
 assert.ok(app.includes("commit(next);"));
 assert.ok(app.includes("stopEraserPreview();"));
});

test("eraser hover does not render the entire board or broadcast cursor each mouse event",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.ok(app.includes('if(tool==="eraser"){if(!eraserSession.current)'));
 assert.ok(app.includes("setLiveEraserCursor(p.x,p.y)"));
 assert.ok(!app.includes("setEraserCursor("));
 assert.ok(!app.includes("eraserCursor &&"));
 assert.ok(app.includes('el.style.visibility="visible"'));
});

test("autosave waits until eraser stroke ends and only commits once",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.ok(app.includes("if (saveBlocked || gesture.current || eraserSession.current) return;"));
 assert.ok(app.includes("const next=eraseInkAlongPath(before,g.path,eraserSize/2/g.zoom)"));
 assert.ok(app.includes("commit(next);"));
 assert.ok(app.includes("stopEraserPreview();"));
 assert.ok(app.includes("eraserSession.current=null;"));
});
