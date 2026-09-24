import fs from "node:fs";
const p="src/App.tsx";
if(!fs.existsSync(p)){console.error("live merge hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");

// Remove the manual conflict UI/state path. In a collaborative whiteboard a newer server
// revision is immediately accepted and the local snapshot is retried on top of it.
const oldReceive=`      if (decision === "conflict") {
        if (pendingRemote.current && row.version <= pendingRemote.current.version) return;
        pendingRemote.current = { ...row, document: data };
        setRemoteConflict(pendingRemote.current);
        snapshot.current = currentDocument();
        setConflictLocalBackup(parseDocument(JSON.stringify(snapshot.current)));
        setConflictDetailsOpen(false);
        try {
          localStorage.setItem(storageKey, JSON.stringify(snapshot.current));
          localStorage.setItem(\`${storageKey}.conflict-backup\`, JSON.stringify(snapshot.current));
        } catch { /* keep edits in memory */ }
        queuedRemoteSnapshot.current = null;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaveStatus("Есть новая серверная версия · выберите действие");
        return;
      }
      applyServerDocument(row);`;
const newReceive=`      if (decision === "conflict") {
        const local = parseDocument(JSON.stringify(currentDocument()));
        const remote = data;

        // Merge by object id. Remote state is the fresh baseline; locally changed/new
        // objects are replayed on top so collaboration continues without a blocking dialog.
        const acknowledged = acknowledgedDocument.current;
        let baseItems: typeof remote.items = [];
        try {
          const previousRaw = localStorage.getItem(storageKey);
          baseItems = previousRaw ? parseDocument(previousRaw).items : [];
        } catch { baseItems = []; }
        const baseById = new Map(baseItems.map(item => [item.id, item]));
        const localById = new Map(local.items.map(item => [item.id, item]));
        const remoteById = new Map(remote.items.map(item => [item.id, item]));
        const mergedById = new Map(remote.items.map(item => [item.id, item]));

        for (const [id, item] of localById) {
          const base = baseById.get(id);
          const changedLocally = !base || JSON.stringify(base) !== JSON.stringify(item);
          if (changedLocally) mergedById.set(id, item);
        }
        for (const [id, base] of baseById) {
          if (!localById.has(id) && remoteById.has(id)) {
            // A locally deleted object stays deleted unless the remote side changed it too.
            if (JSON.stringify(remoteById.get(id)) === JSON.stringify(base)) mergedById.delete(id);
          }
        }

        const merged: DocumentData = {
          ...remote,
          title: local.title !== remote.title ? local.title : remote.title,
          view: local.view,
          items: [...mergedById.values()],
        };
        remoteVersion.current = row.version;
        acknowledgedDocument.current = documentFingerprint(remote);
        pendingRemote.current = null;
        setRemoteConflict(null);
        setConflictLocalBackup(null);
        try { localStorage.removeItem(\`${storageKey}.conflict-backup\`); } catch {}
        applyDocument(merged, true);
        snapshot.current = merged;
        queuedRemoteSnapshot.current = merged;
        setSaveStatus("Синхронизировано");
        window.setTimeout(() => void pushRemoteSnapshot(merged), 0);
        return;
      }
      applyServerDocument(row);`;
if(!s.includes(oldReceive)){
 console.error("live merge hotfix: блок обработки конфликта не найден. Сначала установите предыдущий hotfix навигации, если он ещё не установлен, затем используйте актуальный main.");
 process.exit(1);
}
s=s.replace(oldReceive,newReceive);

// Completely hide the old conflict and conflict-backup bars. Keep helper functions for now
// to minimize risky surgery in this patch; they are no longer reachable from UI.
const start=s.indexOf('      {remoteConflict && <div className="remote-conflict remote-conflict-v34"');
const endMarker='      {historyOpen&&';
if(start<0){console.error("live merge hotfix: конфликтный баннер не найден");process.exit(1)}
const end=s.indexOf(endMarker,start);
if(end<0){console.error("live merge hotfix: конец конфликтного UI не найден");process.exit(1)}
s=s.slice(0,start)+s.slice(end);

fs.writeFileSync(p,s);
console.log("Live merge установлен: ручные сообщения о параллельных версиях удалены, конфликт синхронизируется автоматически.");
console.log("Запустите npm run build.");
