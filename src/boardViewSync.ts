import { getRealtimeSocketUrl, getRemoteSession, isRemoteBackendEnabled } from "./backend";

export type ViewFocusCommand = {
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
};

export type GuidedFollowUpdate = {
  senderUserId: string;
  senderName: string;
  enabled: boolean;
};

export type BoardViewControlChannel = {
  sendFocus: (targetUserId: string, centerX: number, centerY: number, zoom: number) => void;
  sendTeacherView: (centerX: number, centerY: number, zoom: number) => void;
  sendGuidedFollow: (enabled: boolean) => void;
  close: () => void;
};

export function connectBoardViewControl(
  boardId: string,
  me: { userId: string; name: string },
  onFocus: (command: ViewFocusCommand) => void,
  onTeacherView: (update: TeacherViewUpdate) => void,
  onGuidedFollow: (update: GuidedFollowUpdate) => void,
): BoardViewControlChannel {
  if (!isRemoteBackendEnabled()) {
    return { sendFocus: () => {}, sendTeacherView: () => {}, sendGuidedFollow: () => {}, close: () => {} };
  }

  let stopped = false;
  let generation = 0;
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let refresh: ReturnType<typeof setInterval> | undefined;
  let attempt = 0;
  let sequence = 0;
  let pendingHeartbeat: string | null = null;
  let ready = false;

  const topic = `realtime:board-view:${boardId}`;

  const closeSocket = () => {
    clearTimeout(deadline);
    clearInterval(heartbeat);
    clearInterval(refresh);
    pendingHeartbeat = null;
    ready = false;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try { socket.close(); } catch { /* already closed */ }
      socket = null;
    }
  };

  const reconnect = () => {
    if (stopped) return;
    generation++;
    closeSocket();
    clearTimeout(retry);
    retry = setTimeout(
      () => void connect(),
      Math.min(1000 * 2 ** attempt++, 30000),
    );
  };

  const connect = async () => {
    if (stopped) return;
    const current = ++generation;

    try {
      const session = await getRemoteSession();
      if (stopped || current !== generation) return;

      if (!session) {
        reconnect();
        return;
      }

      const ws = new WebSocket(getRealtimeSocketUrl());
      socket = ws;
      let token = session.access_token;
      const joinRef = String(++sequence);

      const active = () =>
        !stopped &&
        current === generation &&
        socket === ws;

      const send = (
        event: string,
        payload: unknown,
        channel = topic,
        ref = String(++sequence),
      ) => {
        if (!active() || ws.readyState !== WebSocket.OPEN) return false;

        ws.send(JSON.stringify({
          topic: channel,
          event,
          payload,
          ref,
          join_ref: channel === topic ? joinRef : null,
        }));
        return true;
      };

      deadline = setTimeout(reconnect, 15000);

      ws.onopen = () => {
        if (!active()) return;

        try {
          send("phx_join", {
            access_token: token,
            config: {
              private: false,
              broadcast: { self: false, ack: false },
              presence: { enabled: false },
            },
          }, topic, joinRef);
        } catch {
          reconnect();
          return;
        }

        heartbeat = setInterval(() => {
          if (pendingHeartbeat) {
            reconnect();
            return;
          }

          const ref = String(++sequence);
          try {
            if (send("heartbeat", {}, "phoenix", ref)) {
              pendingHeartbeat = ref;
            }
          } catch {
            reconnect();
          }
        }, 25000);

        let refreshing = false;
        refresh = setInterval(() => {
          if (refreshing) return;
          refreshing = true;

          void getRemoteSession()
            .then((next) => {
              if (!active()) return;
              if (!next) {
                reconnect();
                return;
              }
              if (next.access_token !== token) {
                token = next.access_token;
                send("access_token", { access_token: token });
              }
            })
            .catch(() => {
              if (active()) reconnect();
            })
            .finally(() => {
              refreshing = false;
            });
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (!active()) return;

        try {
          const message = JSON.parse(String(event.data));

          if (
            message.topic === "phoenix" &&
            message.event === "phx_reply" &&
            message.ref === pendingHeartbeat
          ) {
            pendingHeartbeat = null;
            return;
          }

          if (message.topic !== topic) return;

          if (
            message.event === "phx_error" ||
            message.event === "phx_close" ||
            (message.event === "phx_reply" && message.payload?.status === "error")
          ) {
            reconnect();
            return;
          }

          if (
            message.event === "phx_reply" &&
            message.ref === joinRef &&
            message.payload?.status === "ok"
          ) {
            clearTimeout(deadline);
            attempt = 0;
            ready = true;
            return;
          }

          if (
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
          ) {
            const payload = message.payload?.payload ?? {};
            const targetUserId = String(payload.targetUserId || "").trim();
            const senderUserId = String(payload.senderUserId || "").trim();
            const senderName = String(payload.senderName || "Преподаватель").trim() || "Преподаватель";
            const centerX = Number(payload.centerX);
            const centerY = Number(payload.centerY);
            const zoom = Number(payload.zoom);

            if (
              targetUserId !== me.userId ||
              !senderUserId ||
              senderUserId === me.userId ||
              !Number.isFinite(centerX) ||
              !Number.isFinite(centerY) ||
              !Number.isFinite(zoom)
            ) {
              return;
            }

            onFocus({
              targetUserId,
              senderUserId,
              senderName,
              centerX,
              centerY,
              zoom: Math.min(4, Math.max(0.1, zoom)),
            });
          }
        } catch {
          /* Ignore malformed or unrelated frames. */
        }
      };

      ws.onerror = ws.onclose = () => {
        if (active()) reconnect();
      };
    } catch {
      if (!stopped && current === generation) reconnect();
    }
  };

  const sendFocus = (
    targetUserId: string,
    centerX: number,
    centerY: number,
    zoom: number,
  ) => {
    if (
      stopped ||
      !ready ||
      !targetUserId ||
      targetUserId === me.userId ||
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
        event: "focus_view",
        payload: {
          targetUserId,
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

  const sendTeacherView = (
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

  const sendGuidedFollow = (enabled: boolean) => {
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

  const networkChanged = () => reconnect();
  window.addEventListener("online", networkChanged);
  window.addEventListener("offline", networkChanged);

  void connect();

  return {
    sendFocus,
    sendTeacherView,
    sendGuidedFollow,
    close: () => {
      stopped = true;
      generation++;
      clearTimeout(retry);
      closeSocket();
      window.removeEventListener("online", networkChanged);
      window.removeEventListener("offline", networkChanged);
    },
  };
}
