import fs from "node:fs";

const appPath="src/App.tsx", cssPath="src/App.css";
for (const p of [appPath,cssPath,"src/boardWorkSync.ts"]) if(!fs.existsSync(p)){console.error(`v32: не найден ${p}`);process.exit(1);}
let app=fs.readFileSync(appPath,"utf8");
const patch=(text,needle,repl,label)=>{if(text.includes(repl))return text;if(!text.includes(needle)){console.error(`v32: не найден фрагмент ${label}`);process.exit(1);}return text.replace(needle,repl);};

app=patch(app,
'import { connectBoardViewControl, type BoardViewControlChannel } from "./boardViewSync";',
'import { connectBoardViewControl, type BoardViewControlChannel } from "./boardViewSync";\nimport { connectBoardWorkChannel, type BoardWorkChannel, type RemoteWorkState } from "./boardWorkSync";',
"import");

app=patch(app,
'  const teacherViewBroadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);',
'  const teacherViewBroadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const [remoteWork, setRemoteWork] = useState<Record<string, RemoteWorkState>>({});\n  const workChannel = useRef<BoardWorkChannel | null>(null);',
"state");

app=patch(app,
`  useEffect(() => {
    followTeacherRef.current = followTeacher;
  }, [followTeacher]);`,
`  useEffect(() => {
    followTeacherRef.current = followTeacher;
  }, [followTeacher]);

  useEffect(() => {
    const channel = connectBoardWorkChannel(
      boardSummary.id,
      { userId: authUser.id, name: authUser.name, role: boardSummary.role },
      (state) => setRemoteWork((current) => ({ ...current, [state.userId]: state })),
      (userId) => setRemoteWork((current) => {
        if (!(userId in current)) return current;
        const next = { ...current };
        delete next[userId];
        return next;
      }),
    );
    workChannel.current = channel;
    return () => {
      workChannel.current = null;
      channel.close();
      setRemoteWork({});
    };
  }, [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    workChannel.current?.publish(selected, editing);
  }, [selected, editing]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 15000;
      const online = new Set(presenceUsers.map((user) => user.userId));
      setRemoteWork((current) => {
        let changed = false;
        const next: Record<string, RemoteWorkState> = {};
        for (const [userId, state] of Object.entries(current)) {
          if (state.updatedAt >= cutoff && online.has(userId)) next[userId] = state;
          else changed = true;
        }
        return changed ? next : current;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [presenceUsers]);

  const remoteEditorFor = (itemId: string) =>
    Object.values(remoteWork).find((state) => state.editingId === itemId);

  const remoteSelectorsFor = (itemId: string) =>
    Object.values(remoteWork).filter((state) => state.selectedIds.includes(itemId));

  const remoteEditingCount = Object.values(remoteWork).filter((state) => state.editingId).length;`,
"work effects");

app=patch(app,
`                onDoubleClick={() => {
                  if (
                    tool === "select"`,
`                onDoubleClick={() => {
                  const remoteEditor = remoteEditorFor(item.id);
                  if (remoteEditor) {
                    setNotice(\`\${remoteEditor.name} уже редактирует этот объект\`);
                    return;
                  }
                  if (
                    tool === "select"`,
"remote edit guard");

app=patch(app,
`              >
                {item.points && <Ink item={item} />}`,
`              >
                {remoteSelectorsFor(item.id).slice(0, 3).map((remote, indexValue) => <div
                  key={remote.userId}
                  className={\`remote-selection-outline \${remote.editingId === item.id ? "editing" : ""}\`}
                  style={{ inset: -3 - indexValue * 3 }}
                  aria-hidden="true"
                >
                  <span>{remote.name}{remote.editingId === item.id ? " · редактирует" : ""}</span>
                </div>)}
                {item.points && <Ink item={item} />}`,
"remote outline");

app=patch(app,
`          {boardSummary.role !== "owner" && isRemoteBackendEnabled() && <button`,
`          {remoteEditingCount > 0 && <span className="collab-editing-status" title="Сейчас другие участники редактируют объекты">
            ✎ {remoteEditingCount}
          </span>}
          {boardSummary.role !== "owner" && isRemoteBackendEnabled() && <button`,
"top editing count");

app=patch(app,
`                <span className="presence-person-copy">
                  <b>{user.name}{user.userId === authUser.id ? " · Вы" : ""}</b>
                  <small>{BOARD_ROLE_LABELS[user.role]}</small>
                </span>`,
`                <span className="presence-person-copy">
                  <b>{user.name}{user.userId === authUser.id ? " · Вы" : ""}</b>
                  <small>{BOARD_ROLE_LABELS[user.role]}{remoteWork[user.userId]?.editingId ? " · редактирует объект" : remoteWork[user.userId]?.selectedIds.length ? \` · выбрано: \${remoteWork[user.userId].selectedIds.length}\` : ""}</small>
                </span>`,
"presence activity");

fs.writeFileSync(appPath,app,"utf8");

let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("/* v32 · collaboration awareness */")){
css+=`

/* v32 · collaboration awareness */
.remote-selection-outline{
  position:absolute;
  z-index:30;
  border:2px solid #6c6ee8;
  border-radius:7px;
  pointer-events:none;
  box-shadow:0 0 0 1px rgba(255,255,255,.8);
}
.remote-selection-outline.editing{
  border-style:dashed;
  animation:remote-edit-pulse 1.4s ease-in-out infinite;
}
.remote-selection-outline>span{
  position:absolute;
  left:-2px;
  bottom:100%;
  max-width:180px;
  margin-bottom:4px;
  padding:3px 7px;
  border-radius:6px 6px 6px 2px;
  background:#5355c9;
  color:#fff;
  font-size:10px;
  font-weight:750;
  line-height:1.2;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  box-shadow:0 2px 8px rgba(30,32,80,.16);
}
.collab-editing-status{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:30px;
  height:28px;
  padding:0 8px;
  border-radius:8px;
  background:#f0efff;
  color:#5355c9;
  font-size:11px;
  font-weight:800;
}
@keyframes remote-edit-pulse{
  0%,100%{opacity:1}
  50%{opacity:.55}
}
`;
fs.writeFileSync(cssPath,css,"utf8");
}
console.log("v32 установлен: совместное выделение, индикаторы редактирования и защита от одновременного текстового редактирования.");
console.log("Выполните npm run build");
