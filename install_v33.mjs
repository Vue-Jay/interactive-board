import fs from "node:fs";

const appPath="src/App.tsx", workPath="src/boardWorkSync.ts", cssPath="src/App.css";
for(const p of [appPath,workPath,cssPath]) if(!fs.existsSync(p)){console.error(`v33: не найден ${p}. Сначала установите v32.`);process.exit(1);}
let app=fs.readFileSync(appPath,"utf8"), work=fs.readFileSync(workPath,"utf8"), css=fs.readFileSync(cssPath,"utf8");
const patch=(text,needle,repl,label)=>{if(text.includes(repl))return text;if(!text.includes(needle)){console.error(`v33: не найден фрагмент «${label}». Убедитесь, что v32 установлен.`);process.exit(1);}return text.replace(needle,repl);};

/* Extend awareness payload with current manipulation mode. */
work=patch(work,
`  editingId: string | null;
  updatedAt: number;`,
`  editingId: string | null;
  action: "idle" | "editing" | "moving" | "resizing" | "rotating";
  activeIds: string[];
  updatedAt: number;`,
"RemoteWorkState action");

work=patch(work,
`  publish: (selectedIds: string[], editingId: string | null) => void;`,
`  publish: (
    selectedIds: string[],
    editingId: string | null,
    action?: RemoteWorkState["action"],
    activeIds?: string[],
  ) => void;`,
"publish signature");

work=patch(work,
`  let latest: { selectedIds: string[]; editingId: string | null } = { selectedIds: [], editingId: null };`,
`  let latest: {
    selectedIds: string[];
    editingId: string | null;
    action: RemoteWorkState["action"];
    activeIds: string[];
  } = { selectedIds: [], editingId: null, action: "idle", activeIds: [] };`,
"latest state");

work=patch(work,
`          editingId: latest.editingId,
          sentAt: Date.now(),`,
`          editingId: latest.editingId,
          action: latest.action,
          activeIds: latest.activeIds.slice(0, 100),
          sentAt: Date.now(),`,
"payload action");

work=patch(work,
`          const editingId = typeof payload.editingId === "string" && payload.editingId ? payload.editingId : null;

          onState({`,
`          const editingId = typeof payload.editingId === "string" && payload.editingId ? payload.editingId : null;
          const action: RemoteWorkState["action"] =
            payload.action === "editing" || payload.action === "moving" ||
            payload.action === "resizing" || payload.action === "rotating"
              ? payload.action
              : "idle";
          const activeIds = Array.isArray(payload.activeIds)
            ? payload.activeIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 100)
            : [];

          onState({`,
"parse action");

work=patch(work,
`            editingId,
            updatedAt: Date.now(),`,
`            editingId,
            action,
            activeIds,
            updatedAt: Date.now(),`,
"state action");

work=patch(work,
`  const publish = (selectedIds: string[], editingId: string | null) => {
    if (stopped) return;
    latest = { selectedIds: [...new Set(selectedIds)].slice(0, 100), editingId };`,
`  const publish = (
    selectedIds: string[],
    editingId: string | null,
    action: RemoteWorkState["action"] = editingId ? "editing" : "idle",
    activeIds: string[] = editingId ? [editingId] : [],
  ) => {
    if (stopped) return;
    latest = {
      selectedIds: [...new Set(selectedIds)].slice(0, 100),
      editingId,
      action,
      activeIds: [...new Set(activeIds)].slice(0, 100),
    };`,
"publish implementation");

fs.writeFileSync(workPath,work,"utf8");

/* App: helper functions and activity publishing. */
app=patch(app,
`  const remoteEditingCount = Object.values(remoteWork).filter((state) => state.editingId).length;`,
`  const remoteEditingCount = Object.values(remoteWork).filter((state) => state.editingId).length;
  const remoteBusyFor = (itemId: string) =>
    Object.values(remoteWork).find((state) =>
      state.editingId === itemId ||
      ((state.action === "moving" || state.action === "resizing" || state.action === "rotating") &&
        state.activeIds.includes(itemId))
    );
  const workActionLabel = (state: RemoteWorkState) =>
    state.action === "moving" ? "перемещает" :
    state.action === "resizing" ? "изменяет размер" :
    state.action === "rotating" ? "поворачивает" :
    state.action === "editing" ? "редактирует" : "";`,
"busy helpers");

app=patch(app,
`    if (gesture.current || (e.target as HTMLElement).closest("textarea"))
      return;`,
`    if (gesture.current || (e.target as HTMLElement).closest("textarea"))
      return;
    const pressedObjectId = (e.target as HTMLElement).closest<HTMLElement>("[data-object]")?.dataset.object;
    if (pressedObjectId) {
      const remoteBusy = remoteBusyFor(pressedObjectId);
      if (remoteBusy) {
        e.preventDefault();
        e.stopPropagation();
        setNotice(\`\${remoteBusy.name} сейчас \${workActionLabel(remoteBusy) || "работает с этим объектом"}\`);
        return;
      }
    }`,
"pointer busy guard");

app=patch(app,
`    if (cancel) {
      display(g.restore ?? g.before);
      setView(g.view);
    } else if (g.mode === "drag" || g.mode === "erase" || g.mode === "resize" || g.mode === "rotate" || g.mode === "connector-end")
      commit(itemsRef.current);`,
`    if (cancel) {
      display(g.restore ?? g.before);
      setView(g.view);
    } else if (g.mode === "drag" || g.mode === "erase" || g.mode === "resize" || g.mode === "rotate" || g.mode === "connector-end")
      commit(itemsRef.current);
    if (g.mode === "drag" || g.mode === "resize" || g.mode === "rotate" || g.mode === "connector-end") {
      workChannel.current?.publish(selected, editing, editing ? "editing" : "idle", editing ? [editing] : []);
    }`,
"clear gesture awareness");

# Publish immediately after the three main gesture assignments, using generic insertion after capture.
app=patch(app,
`        board.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    const groupHandleEl`,
`        board.current!.setPointerCapture(e.pointerId);
        workChannel.current?.publish(selected, editing, "resizing", [connector.id]);
        return;
      }
    }
    const groupHandleEl`,
"connector gesture publish");

app=patch(app,
`        board.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    const id = target.closest<HTMLElement>("[data-object]")?.dataset.object;`,
`        board.current!.setPointerCapture(e.pointerId);
        workChannel.current?.publish(selected, editing, groupHandle === "rotate" ? "rotating" : "resizing", bases.map((i) => i.id));
        return;
      }
    }
    const id = target.closest<HTMLElement>("[data-object]")?.dataset.object;`,
"group gesture publish");

app=patch(app,
`      board.current!.setPointerCapture(e.pointerId);
      return;
    }
    if (
      tool === "text"`,
`      board.current!.setPointerCapture(e.pointerId);
      workChannel.current?.publish(selected, editing, transformHandle === "rotate" ? "rotating" : "resizing", [hit.id]);
      return;
    }
    if (
      tool === "text"`,
"single transform publish");

/* Generic drag gesture assignment is later in down(). */
app=patch(app,
`    gesture.current = {
      pointer: e.pointerId, mode, start, view, before: itemsRef.current,
      ids, path: [p], additive: e.shiftKey,
    };
    board.current!.setPointerCapture(e.pointerId);`,
`    gesture.current = {
      pointer: e.pointerId, mode, start, view, before: itemsRef.current,
      ids, path: [p], additive: e.shiftKey,
    };
    board.current!.setPointerCapture(e.pointerId);
    if (mode === "drag" && ids.length) {
      workChannel.current?.publish(ids, editing, "moving", ids);
    }`,
"drag publish");

/* Rich labels and object badges. */
app=patch(app,
`                  <small>{BOARD_ROLE_LABELS[user.role]}{remoteWork[user.userId]?.editingId ? " · редактирует объект" : remoteWork[user.userId]?.selectedIds.length ? \` · выбрано: \${remoteWork[user.userId].selectedIds.length}\` : ""}</small>`,
`                  <small>{BOARD_ROLE_LABELS[user.role]}{remoteWork[user.userId]?.action === "moving" ? " · перемещает объект" : remoteWork[user.userId]?.action === "resizing" ? " · меняет размер" : remoteWork[user.userId]?.action === "rotating" ? " · поворачивает объект" : remoteWork[user.userId]?.editingId ? " · редактирует объект" : remoteWork[user.userId]?.selectedIds.length ? \` · выбрано: \${remoteWork[user.userId].selectedIds.length}\` : ""}</small>`,
"presence action label");

app=patch(app,
`                {remoteSelectorsFor(item.id).slice(0, 3).map((remote, indexValue) => <div`,
`                {remoteBusyFor(item.id) && <div className="remote-busy-badge" aria-hidden="true">
                  {remoteBusyFor(item.id)!.name} · {workActionLabel(remoteBusyFor(item.id)!)}
                </div>}
                {remoteSelectorsFor(item.id).slice(0, 3).map((remote, indexValue) => <div`,
"busy badge");

fs.writeFileSync(appPath,app,"utf8");

if(!css.includes("/* v33 · collaboration safety */")){
css+=`

/* v33 · collaboration safety */
.remote-busy-badge{
  position:absolute;
  z-index:35;
  right:-4px;
  top:-25px;
  max-width:210px;
  padding:4px 8px;
  border-radius:7px 7px 2px 7px;
  background:#2f326f;
  color:#fff;
  font-size:10px;
  font-weight:800;
  line-height:1.2;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  pointer-events:none;
  box-shadow:0 3px 10px rgba(30,32,80,.18);
}
.board-object:has(.remote-busy-badge){
  cursor:not-allowed;
}
`;
fs.writeFileSync(cssPath,css,"utf8");
}

console.log("v33 установлен: live-состояния перемещения/resize/rotate и защита занятого объекта.");
console.log("Выполните npm run build");
