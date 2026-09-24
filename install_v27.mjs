import fs from "node:fs";

const appPath = "src/App.tsx";
const cssPath = "src/App.css";
const modulePath = "src/boardBroadcast.ts";

if (!fs.existsSync(appPath) || !fs.existsSync(cssPath) || !fs.existsSync(modulePath)) {
  console.error("v27: запустите скрипт из корня проекта после распаковки архива.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (app.includes(replacement)) return;
  if (!app.includes(needle)) {
    console.error(`v27: не найден ожидаемый фрагмент App.tsx: ${label}`);
    process.exit(1);
  }
  app = app.replace(needle, replacement);
}

replaceOnce(
  'import { subscribeBoardPresence, type BoardPresenceUser } from "./boardPresence";',
  'import { subscribeBoardPresence, type BoardPresenceUser } from "./boardPresence";\nimport { connectBoardCursorChannel, type BoardCursorChannel, type RemoteCursor } from "./boardBroadcast";',
  "импорт Broadcast",
);

replaceOnce(
  '  const [presenceUsers, setPresenceUsers] = useState<BoardPresenceUser[]>([]);',
  '  const [presenceUsers, setPresenceUsers] = useState<BoardPresenceUser[]>([]);\n  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});\n  const cursorChannel = useRef<BoardCursorChannel | null>(null);',
  "состояние курсоров",
);

replaceOnce(
  `  useEffect(() => subscribeBoardPresence(
    boardSummary.id,
    { userId: authUser.id, name: authUser.name, role: boardSummary.role },
    setPresenceUsers,
  ), [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);`,
  `  useEffect(() => subscribeBoardPresence(
    boardSummary.id,
    { userId: authUser.id, name: authUser.name, role: boardSummary.role },
    setPresenceUsers,
  ), [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    const channel = connectBoardCursorChannel(
      boardSummary.id,
      { userId: authUser.id, name: authUser.name, role: boardSummary.role },
      (cursor) => setRemoteCursors((current) => ({ ...current, [cursor.userId]: cursor })),
    );
    cursorChannel.current = channel;
    return () => {
      cursorChannel.current = null;
      channel.close();
      setRemoteCursors({});
    };
  }, [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    const online = new Set(presenceUsers.map((user) => user.userId));
    setRemoteCursors((current) => {
      let changed = false;
      const next: Record<string, RemoteCursor> = {};
      for (const [userId, cursor] of Object.entries(current)) {
        if (online.has(userId)) next[userId] = cursor;
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [presenceUsers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 12000;
      setRemoteCursors((current) => {
        let changed = false;
        const next: Record<string, RemoteCursor> = {};
        for (const [userId, cursor] of Object.entries(current)) {
          if (cursor.updatedAt >= cutoff) next[userId] = cursor;
          else changed = true;
        }
        return changed ? next : current;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);`,
  "подписка живых курсоров",
);

replaceOnce(
  '          onPointerMove={(e) => { if (presentation) { const point = local(e.clientX, e.clientY); if (presentationLaser) setPresentationLaserPos(point); if (presentationSpotlight) setPresentationSpotlightPos(point); } move(e); }}',
  '          onPointerMove={(e) => { const localPoint = local(e.clientX, e.clientY); const worldPoint = world(localPoint); cursorChannel.current?.sendCursor(worldPoint.x, worldPoint.y); if (presentation) { if (presentationLaser) setPresentationLaserPos(localPoint); if (presentationSpotlight) setPresentationSpotlightPos(localPoint); } move(e); }}',
  "отправка координат курсора",
);

replaceOnce(
  `        >
          <div
            className="world"`,
  `        >
          <div className="remote-cursors-layer" aria-hidden="true">
            {Object.values(remoteCursors).map((cursor) => <div
              className="remote-cursor"
              key={cursor.userId}
              style={{
                transform: \`translate(\${cursor.x * view.zoom + view.x}px,\${cursor.y * view.zoom + view.y}px)\`,
              }}
            >
              <svg className="remote-cursor-pointer" viewBox="0 0 24 30">
                <path d="M2 2 19 17l-8.2 1.5L7 27 2 2Z"/>
              </svg>
              <span>{cursor.name}</span>
            </div>)}
          </div>
          <div
            className="world"`,
  "отрисовка живых курсоров",
);

fs.writeFileSync(appPath, app, "utf8");

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* v27 · live cursors */";
if (!css.includes(marker)) {
  css += `

${marker}
.remote-cursors-layer {
  position:absolute;
  inset:0;
  z-index:1800;
  overflow:hidden;
  pointer-events:none;
}
.remote-cursor {
  position:absolute;
  left:0;
  top:0;
  display:flex;
  align-items:flex-start;
  gap:3px;
  transform-origin:0 0;
  transition:transform 48ms linear;
  will-change:transform;
}
.remote-cursor-pointer {
  width:20px;
  height:25px;
  overflow:visible;
  filter:drop-shadow(0 1px 2px rgba(25,28,40,.18));
}
.remote-cursor-pointer path {
  fill:#5355c9;
  stroke:#fff;
  stroke-width:1.4;
  stroke-linejoin:round;
}
.remote-cursor > span {
  margin:13px 0 0 -2px;
  max-width:150px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  padding:4px 7px;
  border-radius:7px;
  background:#5355c9;
  color:#fff;
  box-shadow:0 3px 10px rgba(35,39,70,.18);
  font-size:9px;
  font-weight:800;
  line-height:1;
}
.presentation-mode .remote-cursors-layer { z-index:2200; }
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("v27 установлен: живые курсоры добавлены.");
console.log("Теперь выполните: npm run build");
