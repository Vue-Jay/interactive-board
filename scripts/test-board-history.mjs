import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../src/boardHistoryUtils.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText;
const exposed={};
runInNewContext(compiled,{exports:exposed},{filename:"boardHistoryUtils.js"});
const {recentBoardHistory,changesSinceLastVisit}=exposed;
const rows=[{version:12},{version:11},{version:10},{version:9},{version:8},{version:7}];
assert.deepEqual(Array.from(recentBoardHistory(rows,3),r=>r.version),[12,11,10],
 "Recent saved versions remain visible on a later visit");
assert.deepEqual(Array.from(changesSinceLastVisit(rows,10),r=>r.version),[12,11],
 "Only subsequent revisions count as unseen");
assert.equal(changesSinceLastVisit(rows,12).length,0,
 "Own previously saved revisions are not incorrectly labelled unseen");
assert.deepEqual(Array.from(recentBoardHistory(rows,2),r=>r.version),[12,11],
 "History is still accessible when there are no unseen revisions");
const sql=readFileSync(new URL("../supabase/v247_durable_board_history.sql",import.meta.url),"utf8");
for(const marker of ["trg_capture_board_document_history","after insert or update of document,version",
 "admin","board_document_history","board_activity"])assert.ok(sql.includes(marker),marker);
const delimiters=sql.match(/\$[a-z_]+\$/g)||[];
const counts=new Map();
for(const label of delimiters)counts.set(label,(counts.get(label)||0)+1);
assert.ok([...counts.values()].every(v=>v===2),"All SQL function dollar quotes must close");
console.log("Persistent revision history, re-entry and SQL structural regressions passed.");
