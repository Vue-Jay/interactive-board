import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("live merge hotfix 2: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");

const startNeedle='      if (decision === "conflict") {';
const endNeedle='      applyServerDocument(row);';
const start=s.indexOf(startNeedle);
if(start<0){console.error("live merge hotfix 2: блок conflict не найден");process.exit(1)}
const end=s.indexOf(endNeedle,start);
if(end<0){console.error("live merge hotfix 2: конец блока conflict не найден");process.exit(1)}

const replacement=`      if (decision === "conflict") {
        // Collaborative boards should converge automatically instead of asking the user
        // to choose between "my" and "server" versions.
        const local = parseDocument(JSON.stringify(currentDocument()));
        const remote = data;
        const remoteIds = new Set(remote.items.map(item => item.id));
        const localOnly = local.items.filter(item => !remoteIds.has(item.id));
        const merged: DocumentData = {
          ...remote,
          view: local.view,
          items: [...remote.items, ...localOnly],
        };

        remoteVersion.current = row.version;
        acknowledgedDocument.current = documentFingerprint(remote);
        pendingRemote.current = null;
        setRemoteConflict(null);
        setConflictLocalBackup(null);
        try { localStorage.removeItem(storageKey + ".conflict-backup"); } catch {}
        applyDocument(merged, true);
        snapshot.current = merged;
        queuedRemoteSnapshot.current = merged;
        setSaveStatus("Синхронизировано");
        window.setTimeout(() => void pushRemoteSnapshot(merged), 0);
        return;
      }
`;
s=s.slice(0,start)+replacement+s.slice(end);

// Remove the old blocking conflict banner if present.
const uiStart=s.indexOf('      {remoteConflict && <div className="remote-conflict remote-conflict-v34"');
if(uiStart>=0){
  const candidates=['      {historyOpen&&','      {historyOpen &&'];
  let uiEnd=-1;
  for(const q of candidates){const i=s.indexOf(q,uiStart);if(i>=0&&(uiEnd<0||i<uiEnd))uiEnd=i}
  if(uiEnd<0){console.error("live merge hotfix 2: конец конфликтного UI не найден");process.exit(1)}
  s=s.slice(0,uiStart)+s.slice(uiEnd);
}

fs.writeFileSync(p,s);
console.log("live merge hotfix 2 установлен. Запустите npm run build.");
