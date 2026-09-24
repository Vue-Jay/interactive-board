import fs from "node:fs";

const appPath = "src/App.tsx";
const cssPath = "src/App.css";
const modulePath = "src/boardViewSync.ts";

for (const path of [appPath, cssPath, modulePath]) {
  if (!fs.existsSync(path)) {
    console.error(`v28: не найден ${path}. Запустите установщик из корня проекта.`);
    process.exit(1);
  }
}

let app = fs.readFileSync(appPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (app.includes(replacement)) return;
  if (!app.includes(needle)) {
    console.error(`v28: не найден ожидаемый фрагмент App.tsx: ${label}`);
    process.exit(1);
  }
  app = app.replace(needle, replacement);
}

replaceOnce(
  'import { connectBoardCursorChannel, type BoardCursorChannel, type RemoteCursor } from "./boardBroadcast";',
  'import { connectBoardCursorChannel, type BoardCursorChannel, type RemoteCursor } from "./boardBroadcast";\nimport { connectBoardViewControl, type BoardViewControlChannel } from "./boardViewSync";',
  "импорт управления экраном",
);

replaceOnce(
  '  const cursorChannel = useRef<BoardCursorChannel | null>(null);',
  '  const cursorChannel = useRef<BoardCursorChannel | null>(null);\n  const viewControlChannel = useRef<BoardViewControlChannel | null>(null);',
  "ref канала управления экраном",
);

const cursorEffectEnd = `  }, [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    const online = new Set(presenceUsers.map((user) => user.userId));`;

const viewEffectInserted = `  }, [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    const channel = connectBoardViewControl(
      boardSummary.id,
      { userId: authUser.id, name: authUser.name },
      (command) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - command.centerX * command.zoom,
          y: rect.height / 2 - command.centerY * command.zoom,
          zoom: command.zoom,
        });
        setNotice(\`\${command.senderName} переместил вас к своей области доски\`);
      },
    );

    viewControlChannel.current = channel;

    return () => {
      viewControlChannel.current = null;
      channel.close();
    };
  }, [boardSummary.id, authUser.id, authUser.name]);

  useEffect(() => {
    const online = new Set(presenceUsers.map((user) => user.userId));`;

replaceOnce(
  cursorEffectEnd,
  viewEffectInserted,
  "подписка канала управления экраном",
);

const oldPerson = `              {presenceUsers.length ? presenceUsers.map((user) => <div className="presence-person" key={user.userId}>
                <span className="presence-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span className="presence-person-copy">
                  <b>{user.name}{user.userId === authUser.id ? " · Вы" : ""}</b>
                  <small>{BOARD_ROLE_LABELS[user.role]}</small>
                </span>
              </div>) : <div className="presence-person">`;

const newPerson = `              {presenceUsers.length ? presenceUsers.map((user) => <div className="presence-person" key={user.userId}>
                <span className="presence-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span className="presence-person-copy">
                  <b>{user.name}{user.userId === authUser.id ? " · Вы" : ""}</b>
                  <small>{BOARD_ROLE_LABELS[user.role]}</small>
                </span>
                {boardSummary.role === "owner" && user.userId !== authUser.id && <button
                  type="button"
                  className="presence-focus-button"
                  title={\`Переместить экран пользователя \${user.name} к вашей текущей области доски\`}
                  onClick={() => {
                    const rect = board.current?.getBoundingClientRect();
                    if (!rect) return;
                    const center = world({ x: rect.width / 2, y: rect.height / 2 });
                    viewControlChannel.current?.sendFocus(user.userId, center.x, center.y, view.zoom);
                    setNotice(\`\${user.name}: экран перемещён к вам\`);
                  }}
                >
                  Ко мне
                </button>}
              </div>) : <div className="presence-person">`;

replaceOnce(
  oldPerson,
  newPerson,
  "кнопка «Ко мне»",
);

fs.writeFileSync(appPath, app, "utf8");

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* v28 · move student to teacher */";

if (!css.includes(marker)) {
  css += `

${marker}
.presence-person {
  grid-template-columns:auto minmax(0,1fr) auto;
}
.presence-focus-button {
  height:27px;
  padding:0 8px;
  border:0;
  border-radius:7px;
  background:#eef0ff;
  color:#5355c9;
  font-size:9px;
  font-weight:800;
  cursor:pointer;
  white-space:nowrap;
}
.presence-focus-button:hover {
  background:#e3e5ff;
  color:#4648b6;
}
@media(max-width:760px) {
  .presence-focus-button {
    height:30px;
    padding:0 9px;
  }
}
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("v28 установлен: кнопка «Ко мне» добавлена.");
console.log("Теперь выполните npm run build");
