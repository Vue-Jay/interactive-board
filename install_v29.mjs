import fs from "node:fs";

const appPath = "src/App.tsx";
const cssPath = "src/App.css";

if (!fs.existsSync(appPath) || !fs.existsSync(cssPath)) {
  console.error("v29: запустите установщик из корня проекта.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

function replaceOnce(needle, replacement, label) {
  if (app.includes(replacement)) return;
  if (!app.includes(needle)) {
    console.error(`v29: не найден ожидаемый фрагмент: ${label}`);
    process.exit(1);
  }
  app = app.replace(needle, replacement);
}

replaceOnce(
`            <div className="presence-popover">
              <strong>Сейчас на доске</strong>`,
`            <div className="presence-popover">
              <div className="presence-popover-head">
                <strong>Сейчас на доске</strong>
                {boardSummary.role === "owner" && presenceUsers.some((user) => user.userId !== authUser.id) && <button
                  type="button"
                  className="presence-gather-button"
                  title="Переместить всех остальных участников к вашей текущей области доски"
                  onClick={() => {
                    const rect = board.current?.getBoundingClientRect();
                    if (!rect) return;

                    const center = world({ x: rect.width / 2, y: rect.height / 2 });
                    const targets = presenceUsers.filter((user) => user.userId !== authUser.id);

                    for (const user of targets) {
                      viewControlChannel.current?.sendFocus(user.userId, center.x, center.y, view.zoom);
                    }

                    setNotice(targets.length === 1 ? "Участник перемещён к вам" : \`Участники перемещены к вам: \${targets.length}\`);
                  }}
                >
                  Собрать всех
                </button>}
              </div>`,
"кнопка «Собрать всех»",
);

fs.writeFileSync(appPath, app, "utf8");

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* v29 · gather everyone */";
if (!css.includes(marker)) {
  css += `

${marker}
.presence-popover-head {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:3px 4px 7px;
}
.presence-popover-head > strong {
  color:#555a69;
  font-size:10px;
}
.presence-gather-button {
  height:27px;
  padding:0 9px;
  border:0;
  border-radius:7px;
  background:#5355c9;
  color:#fff;
  font-size:9px;
  font-weight:800;
  cursor:pointer;
  white-space:nowrap;
}
.presence-gather-button:hover { background:#4749b7; }
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("v29 установлен: «Собрать всех» добавлено.");
console.log("Теперь выполните npm run build");
