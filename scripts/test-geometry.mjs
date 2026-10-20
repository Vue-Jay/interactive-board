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
console.log("Shared geometry serialization test passed");
