import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("hotfix 4: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");

const stateOld=`  const [remoteConflict, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);
  const [conflictLocalBackup, setConflictLocalBackup] = useState<DocumentData | null>(null);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflictDetailsOpen, setConflictDetailsOpen] = useState(false);`;
const stateNew=`  const [, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);
  const [, setConflictLocalBackup] = useState<DocumentData | null>(null);`;
if(!s.includes(stateOld)){console.error("hotfix 4: точный блок старых conflict-state не найден, файл не изменён");process.exit(1)}
s=s.replace(stateOld,stateNew);

const startNeedle='  const keepLocalChanges = async () => {';
const endNeedle='  useEffect(()=>{if(boardSummary.role!=="owner")return;void getActiveLesson';
const start=s.indexOf(startNeedle);
const end=s.indexOf(endNeedle,start);
if(start<0||end<0){console.error("hotfix 4: точные границы старых conflict handlers не найдены, файл не изменён");process.exit(1)}
s=s.slice(0,start)+s.slice(end);

fs.writeFileSync(p,s);
console.log("hotfix 4 установлен: старые conflict-state и ВСЕ ручные conflict handlers удалены одним точным диапазоном.");
console.log("Запустите npm run build.");
