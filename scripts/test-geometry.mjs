import assert from "node:assert/strict";
import { parseDocument } from "../src/boardModel.ts";

const make = (id, type, x) => ({
  id, kind:"geometry",geometryType:type,text:type,
  x,y:120,width:type==="ruler"?410:340,height:type==="ruler"?88:260,rotation:25
});
const fixtures = [
  make("ruler-a","ruler",100),
  make("ruler-b","ruler",600),
  make("triangle-a","triangle",250),
  { id:"note",kind:"text",x:0,y:0,width:140,height:80,text:"Test" }
];
const input = { version:1,title:"Shared instruments",view:{x:0,y:0,zoom:1},items:fixtures };
const serialized = JSON.stringify(input);
const restored = parseDocument(serialized);
assert.equal(restored.items.length,4,"All multiple measuring tools survive");
assert.equal(restored.items.filter(x=>x.kind==="geometry"&&x.geometryType==="ruler").length,2);
assert.equal(restored.items[1].x,600,"Independent positions survive serialization");
assert.equal(restored.items[2].rotation,25,"Rotation survives serialization");
assert.equal(restored.items[3].kind,"text","Ordinary objects stay intact");
assert.deepEqual(parseDocument(JSON.stringify(restored)).items,restored.items,"Round-trip remains stable");
assert.throws(()=>parseDocument(JSON.stringify({...input,items:[{...fixtures[0],geometryType:"unknown"}]})));

import { createGeometryItem } from "../src/geometryPlacement.ts";
const view = {x:0,y:0,zoom:1};
const viewport = {width:1000,height:740};
const first=createGeometryItem("ruler",[],view,viewport);
const second=createGeometryItem("ruler",[first],view,viewport);
const third=createGeometryItem("ruler",[first,second],view,viewport);
assert.notEqual(first.id,second.id,"Every addition must create a new ID");
assert.notEqual(first.id,third.id,"All rulers must have distinct IDs");
assert.ok(Math.hypot(second.x-first.x,second.y-first.y)>first.height,"The second ruler must not hide behind the first");
assert.ok(Math.hypot(third.x-second.x,third.y-second.y)>first.height,"The third ruler must be visibly separate");
const copy=createGeometryItem("ruler",[first,second,third],view,viewport,first);
assert.notEqual(copy.id,first.id,"Copy must have an independent ID");
assert.notDeepEqual([copy.x,copy.y],[first.x,first.y],"A copy must not cover its original");
const roundTrip=parseDocument(JSON.stringify({...input,items:[first,second,third,copy]}));
assert.equal(roundTrip.items.length,4,"Multiple rulers persist as separate board objects");
console.log("Shared geometry placement and serialization test passed");
