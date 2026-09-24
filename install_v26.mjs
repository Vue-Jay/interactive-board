import fs from "node:fs";

const appPath = "src/App.tsx";
const cssPath = "src/App.css";
const presencePath = "src/boardPresence.ts";

if (!fs.existsSync(appPath) || !fs.existsSync(cssPath) || !fs.existsSync(presencePath)) {
  console.error("v26: запустите скрипт из корня проекта после распаковки архива.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (app.includes(replacement)) return;
  if (!app.includes(needle)) {
    console.error(`v26: не найден ожидаемый фрагмент App.tsx: ${label}`);
    process.exit(1);
  }
  app = app.replace(needle, replacement);
  changed = true;
}

replaceOnce(
  'import { subscribeBoardDocument, type RealtimeStatus } from "./boardRealtime";',
  'import { subscribeBoardDocument, type RealtimeStatus } from "./boardRealtime";\nimport { subscribeBoardPresence, type BoardPresenceUser } from "./boardPresence";',
  "импорт Presence",
);

replaceOnce(
  '  const [sharing, setSharing] = useState(false);',
  '  const [sharing, setSharing] = useState(false);\n  const [presenceUsers, setPresenceUsers] = useState<BoardPresenceUser[]>([]);',
  "состояние Presence",
);

replaceOnce(
  '  useEffect(() => subscribeBoardDocument(boardSummary.id, row => receiveRemote.current(row), setRealtimeStatus), [boardSummary.id]);',
  `  useEffect(() => subscribeBoardDocument(boardSummary.id, row => receiveRemote.current(row), setRealtimeStatus), [boardSummary.id]);

  useEffect(() => subscribeBoardPresence(
    boardSummary.id,
    { userId: authUser.id, name: authUser.name, role: boardSummary.role },
    setPresenceUsers,
  ), [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);`,
  "подписка Presence",
);

replaceOnce(
  `        <div className="topbar-right">
          {boardSummary.role === "owner" && <button className="lesson-button" onClick={() => setSharing(true)}>Поделиться</button>}`,
  `        <div className="topbar-right">
          {isRemoteBackendEnabled() && <details className="presence-menu">
            <summary title="Пользователи, которые сейчас находятся на доске">
              <span className="presence-live-dot" aria-hidden="true"/>
              <span>В сети {Math.max(1, presenceUsers.length)}</span>
            </summary>
            <div className="presence-popover">
              <strong>Сейчас на доске</strong>
              {presenceUsers.length ? presenceUsers.map((user) => <div className="presence-person" key={user.userId}>
                <span className="presence-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span className="presence-person-copy">
                  <b>{user.name}{user.userId === authUser.id ? " · Вы" : ""}</b>
                  <small>{BOARD_ROLE_LABELS[user.role]}</small>
                </span>
              </div>) : <div className="presence-person">
                <span className="presence-avatar" aria-hidden="true">{authUser.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span className="presence-person-copy">
                  <b>{authUser.name} · Вы</b>
                  <small>{BOARD_ROLE_LABELS[boardSummary.role]}</small>
                </span>
              </div>}
            </div>
          </details>}
          {boardSummary.role === "owner" && <button className="lesson-button" onClick={() => setSharing(true)}>Поделиться</button>}`,
  "виджет пользователей онлайн",
);

if (changed) {
  fs.writeFileSync(appPath, app, "utf8");
}

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* v26 · board presence */";
if (!css.includes(marker)) {
  css += `

${marker}
.presence-menu { position:relative; }
.presence-menu > summary {
  height:34px;
  display:flex;
  align-items:center;
  gap:7px;
  padding:0 10px;
  border:1px solid #dedfe7;
  border-radius:9px;
  background:#fff;
  color:#626776;
  font-size:10px;
  font-weight:750;
  cursor:pointer;
  list-style:none;
  white-space:nowrap;
}
.presence-menu > summary::-webkit-details-marker { display:none; }
.presence-menu[open] > summary,.presence-menu > summary:hover { background:#f5f6f8; color:#454a58; }
.presence-live-dot {
  width:7px;
  height:7px;
  border-radius:50%;
  background:#36a269;
  box-shadow:0 0 0 3px rgba(54,162,105,.12);
}
.presence-popover {
  position:absolute;
  right:0;
  top:42px;
  z-index:3500;
  width:260px;
  padding:10px;
  border:1px solid #e2e4eb;
  border-radius:13px;
  background:#fff;
  box-shadow:0 16px 45px rgba(28,33,47,.16);
}
.presence-popover > strong {
  display:block;
  padding:3px 4px 9px;
  color:#555a69;
  font-size:10px;
}
.presence-person {
  display:flex;
  align-items:center;
  gap:9px;
  padding:8px 6px;
  border-radius:9px;
}
.presence-person:hover { background:#f6f7fa; }
.presence-avatar {
  width:30px;
  height:30px;
  flex:0 0 30px;
  display:grid;
  place-items:center;
  border-radius:9px;
  background:#eef0ff;
  color:#5355c9;
  font-size:11px;
  font-weight:850;
}
.presence-person-copy { min-width:0; display:grid; gap:2px; }
.presence-person-copy b {
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:#3f4350;
  font-size:11px;
}
.presence-person-copy small { color:#8a8f9e; font-size:9px; }
@media(max-width:760px) {
  .presence-menu > summary span:last-child { display:none; }
  .presence-menu > summary { width:34px; justify-content:center; padding:0; }
  .presence-popover { right:-80px; width:min(260px,calc(100vw - 28px)); }
}
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("v26 установлен: Presence пользователей добавлен.");
console.log("Теперь выполните: npm run build");
