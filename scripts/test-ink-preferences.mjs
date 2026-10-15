import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const transpiled=ts.transpileModule(
  readFileSync(new URL("../src/inkPreferences.ts",import.meta.url),"utf8"),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}},
).outputText;
const {
  DEFAULT_INK_PREFERENCES, loadInkPreferences, saveInkPreferences,
  changeInkPreference, inkPreferencesKey,
} = await import("data:text/javascript;base64,"+Buffer.from(transpiled).toString("base64"));
const store=new Map();
globalThis.localStorage={
  getItem:key=>store.get(key)??null,
  setItem:(key,value)=>{store.set(key,String(value))},
  removeItem:key=>{store.delete(key)},
};
const id="teacher-one",another="teacher-two";
const initial=loadInkPreferences(id);
assert.deepEqual(initial,DEFAULT_INK_PREFERENCES);
const afterPen=changeInkPreference(initial,"pen",{color:"#1188ee",size:11});
assert.equal(afterPen.marker.color,"#5355c9");
assert.equal(afterPen.marker.size,22);
const afterMarker=changeInkPreference(afterPen,"marker",{color:"#ee7722",size:38});
assert.equal(afterMarker.pen.color,"#1188ee");
assert.equal(afterMarker.pen.size,11);
saveInkPreferences(id,afterMarker);
assert.deepEqual(loadInkPreferences(id),afterMarker,"Reload must preserve both tool styles");
assert.deepEqual(loadInkPreferences(id),afterMarker,"Any board of same user must get same styles");
assert.deepEqual(loadInkPreferences(another),initial,"Different account must remain independent");
assert.notEqual(inkPreferencesKey(id),inkPreferencesKey(another));
store.set(inkPreferencesKey(id),JSON.stringify({
 pen:{color:"javascript:alert(1)",size:999},marker:{color:"#123abc",size:-4},
}));
assert.deepEqual(loadInkPreferences(id),{
 pen:{color:"#5355c9",size:16},marker:{color:"#123abc",size:8},
});
store.set(inkPreferencesKey(id),"{broken");
assert.deepEqual(loadInkPreferences(id),initial,"Malformed preferences must not break the board");
globalThis.localStorage.setItem=()=>{throw new Error("QuotaExceededError")};
assert.doesNotThrow(()=>saveInkPreferences(id,afterMarker),"Storage full must not prevent drawing");

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
assert.ok(app.includes('useState(() => loadInkPreferences(authUser.id))'));
assert.ok(app.includes('saveInkPreferences(authUser.id, inkPreferences)'));
assert.ok(app.includes('color: tool === "marker" ? markerColor : penColor'));
assert.ok(app.includes('value={tool === "marker" ? markerColor : penColor}'));
assert.ok(app.includes('(tool === "marker" ? setMarkerColor : setPenColor)(e.target.value)'));
assert.ok(app.includes('weight: tool === "marker" ? markerWeight : weight'));
assert.ok(app.includes('value={color} onChange={(e) => setColor(e.target.value)}'),
  "Connector color must retain its existing controls");
console.log("Classic InteractiveBoard: independent pencil/marker color and size survive reload without touching board saves.");
