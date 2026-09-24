import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("live merge hotfix 3: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
let n=0;

// Keep only setters still used by automatic live merge.
const states=[
  ['const [remoteConflict, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);',
   'const [, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);'],
  ['const [conflictDetailsOpen, setConflictDetailsOpen] = useState(false);','']
];
for(const [a,b] of states){
  if(s.includes(a)){s=s.replace(a,b);n++}
}

// Remove obsolete manual-conflict handlers as complete blocks between known function anchors.
const ranges=[
  ['  const keepLocalChanges = async () => {','  const applyServerKeepingBackup = () => {'],
  ['  const applyServerKeepingBackup = () => {','  const restoreConflictBackup = () => {'],
  ['  const restoreConflictBackup = () => {','  const discardConflictBackup = () => {'],
  ['  const discardConflictBackup = () => {','  const exportConflictBackup = () => {'],
  ['  const exportConflictBackup = () => {','  const togglePresentation = () => {']
];
for(const [startNeedle,endNeedle] of ranges){
  const start=s.indexOf(startNeedle);
  if(start<0) continue;
  const end=s.indexOf(endNeedle,start);
  if(end<0){console.error("live merge hotfix 3: не найден конец блока "+startNeedle);process.exit(1)}
  s=s.slice(0,start)+s.slice(end);
  n++;
}

// If conflictDetailsOpen setter survived somewhere, it is obsolete too.
s=s.replaceAll('setConflictDetailsOpen(false);','');

fs.writeFileSync(p,s);
console.log(`live merge hotfix 3 установлен: удалён старый ручной conflict UI/state (${n} блоков).`);
console.log("Запустите npm run build.");
