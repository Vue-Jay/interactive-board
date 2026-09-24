import fs from "node:fs";

const appPath = "src/App.tsx";
const cssPath = "src/App.css";
const syncPath = "src/boardViewSync.ts";

for (const path of [appPath, cssPath, syncPath]) {
  if (!fs.existsSync(path)) {
    console.error(`v31: не найден ${path}. Запустите установщик из корня проекта.`);
    process.exit(1);
  }
}

let app = fs.readFileSync(appPath, "utf8");
let sync = fs.readFileSync(syncPath, "utf8");

function patch(text, needle, replacement, label) {
  if (text.includes(replacement)) return text;
  if (!text.includes(needle)) {
    console.error(`v31: не найден ожидаемый фрагмент: ${label}`);
    process.exit(1);
  }
  return text.replace(needle, replacement);
}

/* Extend the EXISTING board-view channel. No new socket. */
sync = patch(
  sync,
`export type TeacherViewUpdate = {
  senderUserId: string;
  senderName: string;
  centerX: number;
  centerY: number;
  zoom: number;
};`,
`export type TeacherViewUpdate = {
  senderUserId: string;
  senderName: string;
  centerX: number;
  centerY: number;
  zoom: number;
};

export type GuidedFollowUpdate = {
  senderUserId: string;
  senderName: string;
  enabled: boolean;
};`,
"тип GuidedFollowUpdate",
);

sync = patch(
  sync,
`  sendTeacherView: (centerX: number, centerY: number, zoom: number) => void;
  close: () => void;`,
`  sendTeacherView: (centerX: number, centerY: number, zoom: number) => void;
  sendGuidedFollow: (enabled: boolean) => void;
  close: () => void;`,
"API sendGuidedFollow",
);

sync = patch(
  sync,
`  onTeacherView: (update: TeacherViewUpdate) => void,
): BoardViewControlChannel {
  if (!isRemoteBackendEnabled()) {
    return { sendFocus: () => {}, sendTeacherView: () => {}, close: () => {} };
  }`,
`  onTeacherView: (update: TeacherViewUpdate) => void,
  onGuidedFollow: (update: GuidedFollowUpdate) => void,
): BoardViewControlChannel {
  if (!isRemoteBackendEnabled()) {
    return { sendFocus: () => {}, sendTeacherView: () => {}, sendGuidedFollow: () => {}, close: () => {} };
  }`,
"callback GuidedFollow",
);

sync = patch(
  sync,
`          if (
            message.event === "broadcast" &&
            message.payload?.event === "teacher_view"
          ) {`,
`          if (
            message.event === "broadcast" &&
            message.payload?.event === "guided_follow"
          ) {
            const payload = message.payload?.payload ?? {};
            const senderUserId = String(payload.senderUserId || "").trim();
            const senderName = String(payload.senderName || "Преподаватель").trim() || "Преподаватель";

            if (!senderUserId || senderUserId === me.userId || typeof payload.enabled !== "boolean") {
              return;
            }

            onGuidedFollow({
              senderUserId,
              senderName,
              enabled: payload.enabled,
            });
            return;
          }

          if (
            message.event === "broadcast" &&
            message.payload?.event === "teacher_view"
          ) {`,
"приём guided_follow",
);

sync = patch(
  sync,
`  const networkChanged = () => reconnect();`,
`  const sendGuidedFollow = (enabled: boolean) => {
    if (
      stopped ||
      !ready ||
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
        event: "guided_follow",
        payload: {
          senderUserId: me.userId,
          senderName: me.name,
          enabled,
          sentAt: Date.now(),
        },
      },
      ref: String(++sequence),
      join_ref: null,
    }));
  };

  const networkChanged = () => reconnect();`,
"отправка guided_follow",
);

sync = patch(
  sync,
`    sendFocus,
    sendTeacherView,
    close: () => {`,
`    sendFocus,
    sendTeacherView,
    sendGuidedFollow,
    close: () => {`,
"return sendGuidedFollow",
);

fs.writeFileSync(syncPath, sync, "utf8");

/* App state */
app = patch(
  app,
`  const [followTeacher, setFollowTeacher] = useState(false);
  const followTeacherRef = useRef(false);`,
`  const [followTeacher, setFollowTeacher] = useState(false);
  const followTeacherRef = useRef(false);
  const [guidedFollow, setGuidedFollow] = useState(false);
  const guidedFollowRef = useRef(false);`,
"guided state",
);

/* Third callback in the existing connection */
app = patch(
  app,
`      (teacherView) => {
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
`      (teacherView) => {
        if (!followTeacherRef.current) return;
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - teacherView.centerX * teacherView.zoom,
          y: rect.height / 2 - teacherView.centerY * teacherView.zoom,
          zoom: teacherView.zoom,
        });
      },
      (guided) => {
        guidedFollowRef.current = guided.enabled;
        setGuidedFollow(guided.enabled);
        followTeacherRef.current = guided.enabled || followTeacherRef.current;
        if (guided.enabled) setFollowTeacher(true);
        setNotice(guided.enabled
          ? \`\${guided.senderName} включил режим общего следования\`
          : \`\${guided.senderName} выключил режим общего следования\`);
      },
    );`,
"обработка guided follow",
);

/* Owner control in presence header */
app = patch(
  app,
`                {boardSummary.role === "owner" && presenceUsers.some((user) => user.userId !== authUser.id) && <button
                  type="button"
                  className="presence-gather-button"`,
`                {boardSummary.role === "owner" && presenceUsers.some((user) => user.userId !== authUser.id) && <button
                  type="button"
                  className={\`presence-gather-button \${guidedFollow ? "active" : ""}\`}
                  title={guidedFollow ? "Отключить обязательное следование участников" : "Включить следование всех участников за преподавателем"}
                  onClick={() => {
                    const next = !guidedFollow;
                    guidedFollowRef.current = next;
                    setGuidedFollow(next);
                    viewControlChannel.current?.sendGuidedFollow(next);

                    const rect = board.current?.getBoundingClientRect();
                    if (next && rect) {
                      const center = world({ x: rect.width / 2, y: rect.height / 2 });
                      const targets = presenceUsers.filter((user) => user.userId !== authUser.id);
                      for (const user of targets) {
                        viewControlChannel.current?.sendFocus(user.userId, center.x, center.y, view.zoom);
                      }
                    }

                    setNotice(next ? "Все участники следуют за вами" : "Общее следование отключено");
                  }}
                >
                  {guidedFollow ? "Все следуют" : "Вести всех"}
                </button>}
                {boardSummary.role === "owner" && presenceUsers.some((user) => user.userId !== authUser.id) && <button
                  type="button"
                  className="presence-gather-button"`,
"кнопка Вести всех",
);

/* Disable participant opt-out while guided mode is active */
app = patch(
  app,
`            title={followTeacher ? "Перестать автоматически следовать за экраном преподавателя" : "Автоматически следовать за экраном преподавателя"}
            onClick={() => {
              setFollowTeacher((current) => {`,
`            title={guidedFollow ? "Преподаватель включил общий режим следования" : followTeacher ? "Перестать автоматически следовать за экраном преподавателя" : "Автоматически следовать за экраном преподавателя"}
            disabled={guidedFollow}
            onClick={() => {
              if (guidedFollow) return;
              setFollowTeacher((current) => {`,
"блокировка выхода при guided mode",
);

app = patch(
  app,
`            {followTeacher ? "Следую за преподавателем" : "Следовать за преподавателем"}`,
`            {guidedFollow ? "Преподаватель ведёт экран" : followTeacher ? "Следую за преподавателем" : "Следовать за преподавателем"}`,
"текст guided mode",
);

fs.writeFileSync(appPath, app, "utf8");

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* v31 · guided follow */";
if (!css.includes(marker)) {
  css += `

${marker}
.presence-gather-button.active {
  background:#34369f;
  box-shadow:0 0 0 2px rgba(83,85,201,.16);
}
.follow-teacher-button:disabled {
  opacity:1;
  cursor:not-allowed;
  background:#5355c9;
  color:#fff;
  border-color:#5355c9;
}
`;
  fs.writeFileSync(cssPath, css, "utf8");
}

console.log("v31 установлен: преподаватель может включать «Вести всех».");
console.log("Теперь выполните npm run build");
