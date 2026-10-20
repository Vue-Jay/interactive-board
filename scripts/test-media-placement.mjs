import assert from "node:assert/strict";
import { planMediaPositions } from "../src/mediaPlacement.ts";
const view={x:0,y:0,zoom:1};
const separate=(a,b,g=23.99)=>
  a.x+a.width+g<=b.x||b.x+b.width+g<=a.x||
  a.y+a.height+g<=b.y||b.y+b.height+g<=a.y;
const media=(item,id)=>({...item,id,kind:"image",text:""});
const sizes=[{width:350,height:230},{width:260,height:300},{width:300,height:210}];
const batch=planMediaPositions(sizes,[],{x:500,y:360},view,{width:1000,height:720});
assert.equal(batch.length,3);
for(let i=0;i<batch.length;i++){
  assert.equal(batch[i].width,sizes[i].width);
  assert.equal(batch[i].height,sizes[i].height);
  for(let j=0;j<i;j++)assert.ok(separate(batch[i],batch[j]),"Batch items overlap");
}
assert.ok(batch[1].x>batch[0].x,"Desktop images should lay out left to right");
const later=planMediaPositions([{width:350,height:230}],
  batch.map((item,i)=>media(item,String(i))),
  {x:500,y:360},view,{width:1000,height:720})[0];
for(const item of batch)assert.ok(separate(item,later),"Repeated photo import overlaps");
const narrow=planMediaPositions([{width:320,height:240},{width:300,height:200},{width:250,height:190}],[],
  {x:200,y:350},view,{width:400,height:700});
for(let i=0;i<narrow.length;i++)for(let j=0;j<i;j++)
  assert.ok(separate(narrow[i],narrow[j]),"Mobile rows overlap");
const drop=planMediaPositions([{width:210,height:180},{width:220,height:210}],[],
  {x:1450,y:800},view,{width:1100,height:800});
assert.ok(separate(drop[0],drop[1]),"Dropped files overlap");
console.log("Photo/PDF placement tests passed");
