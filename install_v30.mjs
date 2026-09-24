import fs from "node:fs";

const appPath = "src/App.tsx";
const cssPath = "src/App.css";
const syncPath = "src/boardViewSync.ts";

for (const path of [appPath, cssPath, syncPath]) {
  if (!fs.existsSync(path)) {
    console.error(`v30: не найден ${path}. Запустите установщик из корня проекта.`);
    process.exit(1);
  }
}

let sync = fs.readFileSync(syncPath, "utf8");
let app = fs.readFileSync(appPath, "utf8");

function patch(text, needle, replacement, label) {
  if (text.includes(replacement)) return text;
  if (!text.includes(needle)) {
    console.error(`v30: не найден ожидаемый фрагмент: ${label}`);
    process.exit(1);
  }
  return text.replace(needle, replacement);
}

/* boardViewSync: one existing socket, one extra event. No extra WebSocket is created. */
sync = patch(
  sync,
`export type ViewFocusCommand = {
  targetUserId: string;
  senderUserId: string;
  senderName: string;
  centerX: number;
  centerY: number;
  zoom: number;
};`,
`export type ViewFocusCommand = {
  targetUserId: string;
  senderUserId: string;
  senderName: string;
  centerX: number;
  centerY: number;
  zoom: number;
};

export type TeacherViewUpdate = {
  senderUserId: string;
  senderName: string;
  centerX: number;
  centerY: number;
  zoom: number;
};`,
  "тип TeacherViewUpdate",
);

sync = patch(
  sync,
`export type BoardViewControlChannel = {
  sendFocus: (targetUserId: string, centerX: number, centerY: number, zoom: number) => void;
  close: () => void;
};`,
`export type BoardViewControlChannel = {
  sendFocus: (targetUserId: string, centerX: number, centerY: number, zoom: number) => void;
  sendTeacherView: (centerX: number, centerY: number, zoom: number) => void;
  close: () => void;
};`,
  "API sendTeacherView",
);

sync = patch(
  sync,
`  onFocus: (command: ViewFocusCommand) => void,
): BoardViewControlChannel {
  if (!isRemoteBackendEnabled()) {
    return { sendFocus: () => {}, close: () => {} };
  }`,
`  onFocus: (command: ViewFocusCommand) => void,
  onTeacherView: (update: TeacherViewUpdate) => void,
): BoardViewControlChannel {
  if (!isRemoteBackendEnabled()) {
    return { sendFocus: () => {}, sendTeacherView: () => {}, close: () => {} };
  }`,
  "callback TeacherView",
);

sync = patch(
  sync,
`          if (
            message.event === "broadcast" &&
            message.payload?.event === "focus_view"
          ) {`,
`          if (
            message.event === "broadcast" &&
            message.payload?.event === "teacher_view"
          ) {
            const payload = message.payload?.payload ?? {};
            const senderUserId = String(payload.senderUserId || "").trim();
            const senderName = String(payload.senderName || "Преподаватель").trim() || "Преподаватель";
            const centerX = Number(payload.centerX);
            const centerY = Number(payload.centerY);
            const zoom = Number(payload.zoom);

            if (
              !senderUserId ||
              senderUserId === me.userId ||
              !Number.isFinite(centerX) ||
              !Number.isFinite(centerY) ||
              !Number.isFinite(zoom)
            ) {
              return;
            }

            onTeacherView({
              senderUserId,
              senderName,
              centerX,
              centerY,
              zoom: Math.min(4, Math.max(0.1, zoom)),
            });
            return;
          }

          if (
            message.event === "broadcast" &&
            message.payload?.event === "focus_view"
          ) {`,
  "приём teacher_view",
);

sync = patch(
  sync,
`  const networkChanged = () => reconnect();`,
`  const sendTeacherView = (
    centerX: number,
    centerY: number,
    zoom: number,
  ) => {
    if (
      stopped ||
      !ready ||
      !Number.isFinite(centerX) ||
      !Number.isFinite(centerY) ||
      !Number.isFinite(zoom) ||
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socket.send(JSON.stringify({
      topic,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: "teacher_view",
        payload: {
          senderUserId: me.userId,
          senderName: me.name,
          centerX,
          centerY,
          zoom: Math.min(4, Math.max(0.1, zoom)),
          sentAt: Date.now(),
        },
      },
      ref: String(++sequence),
      join_ref: null,
    }));
  };

  const networkChanged = () => reconnect();`,
  "отправка teacher_view",
);

sync = patch(
  sync,
`  return {
    sendFocus,
    close: () => {`,
`  return {
    sendFocus,
    sendTeacherView,
    close: () => {`,
  "return sendTeacherView",
);

fs.writeFileSync(syncPath, sync, "utf8");

/* App */
app = patch(
  app,
`import { connectBoardViewControl, type BoardViewControlChannel } from "./boardViewSync";`,
`import { connectBoardViewControl, type BoardViewControlChannel } from "./boardViewSync";`,
  "импорт boardViewSync",
);

app = patch(
  app,
`  const viewControlChannel = useRef<BoardViewControlChannel | null>(null);`,
`  const viewControlChannel = useRef<BoardViewControlChannel | null>(null);
  const [followTeacher, setFollowTeacher] = useState(false);
  const followTeacherRef = useRef(false);
  const teacherViewBroadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);`,
  "состояние следования",
);

app = patch(
  app,
`      (command) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - command.centerX * command.zoom,
          y: rect.height / 2 - command.centerY * command.zoom,
          zoom: command.zoom,
        });
        setNotice(\`\${command.senderName} переместил вас к своей области доски\`);
      },
    );`,
`      (command) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - command.centerX * command.zoom,
          y: rect.height / 2 - command.centerY * command.zoom,
          zoom: command.zoom,
        });
        setNotice(\`\${command.senderName} переместил вас к своей области доски\`);
      },
      (teacherView) => {
        if (!followTeacherRef.current) return;
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - teacherView.centerX * teacherView.zoom,
          y: rect.height / 2 - teacherView.centerY * teacherView.zoom,
          zoom: teacherView.zoom,
        });
      },
    );`,
  "приём позиции преподавателя",
);

app = patch(
  app,
`  useEffect(() => {
    const online = new Set(presenceUsers.map((user) => user.userId));`,
`  useEffect(() => {
    followTeacherRef.current = followTeacher;
  }, [followTeacher]);

  useEffect(() => {
    if (boardSummary.role !== "owner") return;
    if (teacherViewBroadcastTimer.current) clearTimeout(teacherViewBroadcastTimer.current);

    teacherViewBroadcastTimer.current = setTimeout(() => {
      teacherViewBroadcastTimer.current = null;
      const rect = board.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = (rect.width / 2 - view.x) / view.zoom;
      const centerY = (rect.height / 2 - view.y) / view.zoom;
      viewControlChannel.current?.sendTeacherView(centerX, centerY, view.zoom);
    }, 90);

    return () => {
      if (teacherViewBroadcastTimer.current) {
        clearTimeout(teacherViewBroadcastTimer.current);
        teacherViewBroadcastTimer.current = null;
      }
    };
  }, [boardSummary.role, view.x, view.y, view.zoom]);

  useEffect(() => {
    const online = new Set(presenceUsers.map((user) => user.userId));`,
  "передача позиции преподавателя",
);

app = patch(
  app,
`          {boardSummary.role === "owner" && <button className="lesson-button" onClick={() => setSharing(true)}>Поделиться</button>}`,
`          {boardSummary.role !== "owner" && isRemoteBackendEnabled() && <button
            type="button"
            className={\`lesson-button follow-teacher-button \${followTeacher ? "active" : ""}\`}
            title={followTeacher ? "Перестать автоматически следовать за экраном преподавателя" : "Автоматически следовать за экраном преподавателя"}
            onClick={() => {
              setFollowTeacher((current) => {
                const next = !current;
                followTeacherRef.current = next;
                setNotice(next ? "Следование за преподавателем включено" : "Следование за преподавателем выключено");
                return next;
              });
            }}
          >
            {followTeacher ? "Следую за преподавателем" : "Следовать за преподавателем"}
          </button>}
          {boardSummary.role === "owner" && <button className="lesson-button" onClick={() => setSharing(true)}>Поделиться</button>}`,
  "кнопка следования",
);

fs.writeFileSync(appPath, app, "utf8");

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* v30 · follow teacher */";
if (!css.includes(marker)) {
  css += `

${marker}
.follow-teacher-button {
  max-width:190px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.follow-teacher-button.active {
  background:#5355c9;
  color:#fff;
  border-color:#5355c9;
  box-shadow:0 0 0 2px rgba(83,85,201,.12);
}
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("v30 установлен: режим «Следовать за преподавателем» добавлен.");
console.log("Теперь выполните npm run build");
