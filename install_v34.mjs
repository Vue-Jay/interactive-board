import fs from "node:fs";

const appPath="src/App.tsx", cssPath="src/App.css";
for(const p of [appPath,cssPath]) if(!fs.existsSync(p)){console.error(`v34: не найден ${p}`);process.exit(1);}
let app=fs.readFileSync(appPath,"utf8"), css=fs.readFileSync(cssPath,"utf8");
const patch=(t,n,r,l)=>{if(t.includes(r))return t;if(!t.includes(n)){console.error(`v34: не найден фрагмент «${l}»`);process.exit(1);}return t.replace(n,r);};

/* State for safe conflict backup and retry. */
app=patch(app,
`  const [remoteConflict, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);`,
`  const [remoteConflict, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);
  const [conflictLocalBackup, setConflictLocalBackup] = useState<DocumentData | null>(null);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflictDetailsOpen, setConflictDetailsOpen] = useState(false);`,
"conflict state");

/* Capture a durable local backup exactly when conflict appears. */
app=patch(app,
`        pendingRemote.current = { ...row, document: data };
        setRemoteConflict(pendingRemote.current);
        snapshot.current = currentDocument();
        try { localStorage.setItem(storageKey, JSON.stringify(snapshot.current)); } catch { /* keep edits in memory */ }`,
`        pendingRemote.current = { ...row, document: data };
        setRemoteConflict(pendingRemote.current);
        snapshot.current = currentDocument();
        setConflictLocalBackup(parseDocument(JSON.stringify(snapshot.current)));
        setConflictDetailsOpen(false);
        try {
          localStorage.setItem(storageKey, JSON.stringify(snapshot.current));
          localStorage.setItem(\`\${storageKey}.conflict-backup\`, JSON.stringify(snapshot.current));
        } catch { /* keep edits in memory */ }`,
"conflict backup");

/* Server apply now preserves local copy until user explicitly discards it. */
app=patch(app,
`    setRemoteConflict(null);
    setTableEditorId(null);`,
`    setRemoteConflict(null);
    setConflictBusy(false);
    setTableEditorId(null);`,
"apply server busy reset");

/* Replace old overwrite function with safer async resolution + restore/export helpers. */
app=patch(app,
`  const keepLocalChanges = () => {
    const row = pendingRemote.current;
    if (!row) return;
    // Explicit consent to replace this version, still protected against a later save.
    remoteVersion.current = row.version;
    acknowledgedDocument.current = documentFingerprint(parseDocument(JSON.stringify(row.document)));
    pendingRemote.current = null;
    setRemoteConflict(null);
    snapshot.current = currentDocument();
    flushSave();
  };`,
`  const keepLocalChanges = async () => {
    const row = pendingRemote.current;
    if (!row || conflictBusy) return;
    const local = parseDocument(JSON.stringify(conflictLocalBackup ?? currentDocument()));
    setConflictBusy(true);
    try {
      await ensureBoardAssets(boardSummary.id, local);
      const result = await saveRemoteBoardDocument(boardSummary.id, local, row.version);
      if (result.conflict) {
        const newer = {
          board_id: boardSummary.id,
          version: result.version,
          document: result.document,
          updated_at: result.updated_at ?? "",
        };
        pendingRemote.current = newer;
        setRemoteConflict(newer);
        setSaveStatus("Сервер снова изменился · ваши данные сохранены в резервной копии");
        return;
      }
      remoteVersion.current = result.version;
      acknowledgedDocument.current = documentFingerprint(local);
      pendingRemote.current = null;
      setRemoteConflict(null);
      setConflictLocalBackup(null);
      try { localStorage.removeItem(\`\${storageKey}.conflict-backup\`); } catch {}
      setSaveStatus("Ваши изменения сохранены поверх предыдущей серверной версии");
      setNotice("Конфликт разрешён: сохранена ваша версия");
    } catch {
      setSaveStatus("Не удалось разрешить конфликт · резервная копия сохранена локально");
      setNotice("Сервер недоступен. Ваши изменения не потеряны.");
    } finally {
      setConflictBusy(false);
    }
  };

  const applyServerKeepingBackup = () => {
    const row = pendingRemote.current;
    if (!row) return;
    if (!conflictLocalBackup) setConflictLocalBackup(parseDocument(JSON.stringify(currentDocument())));
    applyServerDocument(row);
    setNotice("Серверная версия применена. Ваш вариант можно восстановить.");
  };

  const restoreConflictBackup = () => {
    if (!conflictLocalBackup) return;
    const restored = parseDocument(JSON.stringify(conflictLocalBackup));
    applyDocument(restored, true);
    snapshot.current = restored;
    try { localStorage.setItem(storageKey, JSON.stringify(restored)); } catch {}
    setSaveStatus("Восстановлена локальная копия · сохраните её на сервер");
    setNotice("Ваш вариант восстановлен");
  };

  const discardConflictBackup = () => {
    setConflictLocalBackup(null);
    try { localStorage.removeItem(\`\${storageKey}.conflict-backup\`); } catch {}
    setNotice("Резервная копия конфликта удалена");
  };

  const exportConflictBackup = () => {
    if (!conflictLocalBackup) return;
    const blob = new Blob([JSON.stringify(conflictLocalBackup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = \`onlinerepetitor-conflict-\${boardSummary.id}.json\`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Резервная копия скачана");
  };`,
"safe conflict actions");

/* Replace conflict banner. */
app=patch(app,
`      {remoteConflict && <div className="remote-conflict" role="alert">
        <span>На сервере появилась более новая версия. У вас есть несохранённые изменения.</span>
        <button onClick={() => applyServerDocument(remoteConflict)}>Применить серверную</button>
        <button onClick={keepLocalChanges} title="Сохранить свои изменения вместо этой серверной версии">Оставить мои изменения</button>
      </div>}`,
`      {remoteConflict && <div className="remote-conflict remote-conflict-v34" role="alert">
        <div className="remote-conflict-copy">
          <b>Обнаружены параллельные изменения</b>
          <span>Серверная версия: v{remoteConflict.version}. Ваш текущий вариант сохранён в локальной резервной копии.</span>
          {conflictDetailsOpen && <small>
            Ничего не будет перезаписано молча. «Серверная версия» оставит ваш вариант для восстановления,
            а «Сохранить мою» повторно проверит номер серверной версии перед записью.
          </small>}
        </div>
        <div className="remote-conflict-actions">
          <button disabled={conflictBusy} onClick={applyServerKeepingBackup}>Серверная версия</button>
          <button disabled={conflictBusy} onClick={() => void keepLocalChanges()} title="Сохранить ваш вариант только если серверная версия всё ещё та же">
            {conflictBusy ? "Проверяю…" : "Сохранить мою"}
          </button>
          <button className="secondary" onClick={() => setConflictDetailsOpen((value) => !value)}>
            {conflictDetailsOpen ? "Скрыть" : "Подробнее"}
          </button>
        </div>
      </div>}
      {!remoteConflict && conflictLocalBackup && <div className="conflict-backup-bar">
        <span>Есть резервная копия ваших изменений после конфликта.</span>
        <button onClick={restoreConflictBackup}>Восстановить</button>
        <button onClick={exportConflictBackup}>Скачать JSON</button>
        <button className="secondary" onClick={discardConflictBackup}>Удалить копию</button>
      </div>}`,
"conflict UI");

fs.writeFileSync(appPath,app,"utf8");

if(!css.includes("/* v34 · conflict recovery */")){
css+=`

/* v34 · conflict recovery */
.remote-conflict-v34{
  gap:12px;
  align-items:center;
}
.remote-conflict-copy{
  display:flex;
  flex:1 1 360px;
  min-width:0;
  flex-direction:column;
  gap:2px;
}
.remote-conflict-copy b{font-size:12px}
.remote-conflict-copy span{font-size:11px}
.remote-conflict-copy small{margin-top:4px;opacity:.78;line-height:1.35}
.remote-conflict-actions{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  justify-content:flex-end;
}
.remote-conflict button:disabled{opacity:.55;cursor:wait}
.remote-conflict .secondary,
.conflict-backup-bar .secondary{
  background:transparent;
  color:inherit;
  border:1px solid currentColor;
}
.conflict-backup-bar{
  position:relative;
  z-index:80;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-wrap:wrap;
  gap:7px;
  min-height:34px;
  padding:5px 12px;
  background:#f4f1ff;
  border-bottom:1px solid #d8d3f5;
  color:#45426b;
  font-size:11px;
}
.conflict-backup-bar button{
  min-height:25px;
  padding:3px 8px;
  border:0;
  border-radius:6px;
  background:#5355c9;
  color:#fff;
  font-size:10px;
  font-weight:750;
  cursor:pointer;
}
`;
fs.writeFileSync(cssPath,css,"utf8");
}

console.log("v34 установлен: безопасное разрешение конфликтов и восстановление локальной версии.");
console.log("Выполните npm run build");
