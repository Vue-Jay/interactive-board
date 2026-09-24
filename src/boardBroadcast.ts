import { getRealtimeSocketUrl, getRemoteSession, isRemoteBackendEnabled } from "./backend";
import type { BoardRole } from "./authStore";

export type RemoteCursor = {
  userId: string;
  name: string;
  role: BoardRole;
  x: number;
  y: number;
  updatedAt: number;
};

export type BoardCursorChannel = {
  sendCursor: (x: number, y: number) => void;
  close: () => void;
};

const isRole = (value: unknown): value is BoardRole =>
  value === "owner" || value === "editor" || value === "viewer";

export function connectBoardCursorChannel(
  boardId: string,
  me: { userId: string; name: string; role: BoardRole },
  onCursor: (cursor: RemoteCursor) => void,
): BoardCursorChannel {
  if (!isRemoteBackendEnabled()) {
    return { sendCursor: () => {}, close: () => {} };
  }

  let stopped = false;
  let generation = 0;
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let refresh: ReturnType<typeof setInterval> | undefined;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  let attempt = 0;
  let sequence = 0;
  let pendingHeartbeat: string | null = null;
  let ready = false;

  let latest: { x: number; y: number } | null = null;
  let lastSentAt = 0;

  const topic = `realtime:board-cursors:${boardId}`;
  const minInterval = 45;

  const active = () => !stopped && socket?.readyState === WebSocket.OPEN;

  const rawSend = (
    event: string,
    payload: unknown,
    channel = topic,
    ref = String(++sequence),
  ) => {
    if (active() && socket) {
      socket.send(JSON.stringify({
        topic: channel,
        event,
        payload,
        ref,
        join_ref: channel === topic ? String(generation) : null,
      }));
      return true;
    }
    return false;
  };

  const broadcastCursor = (point: { x: number; y: number }) => {
    if (!ready) return false;

    const sent = rawSend("broadcast", {
      type: "broadcast",
      event: "cursor",
      payload: {
        userId: me.userId,
        name: me.name,
        role: me.role,
        x: point.x,
        y: point.y,
        sentAt: Date.now(),
      },
    });

    if (sent) lastSentAt = Date.now();
    return sent;
  };

  const flush = () => {
    flushTimer = undefined;
    if (!latest || !ready) return;

    const point = latest;
    latest = null;

    if (!broadcastCursor(point)) {
      latest = point;
    }
  };

  const closeSocket = () => {
    clearTimeout(deadline);
    clearTimeout(flushTimer);
    clearInterval(heartbeat);
    clearInterval(refresh);

    flushTimer = undefined;
    pendingHeartbeat = null;
    ready = false;

    if (socket) {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
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
      const joinRef = String(current);

      const currentConnection = () =>
        !stopped &&
        current === generation &&
        socket === ws;

      const send = (
        event: string,
        payload: unknown,
        channel = topic,
        ref = String(++sequence),
      ) => {
        if (currentConnection() && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: channel,
            event,
            payload,
            ref,
            join_ref: channel === topic ? joinRef : null,
          }));
          return true;
        }
        return false;
      };

      deadline = setTimeout(reconnect, 15000);

      ws.onopen = () => {
        if (!currentConnection()) return;

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

          try {
            const ref = String(++sequence);
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
              if (!currentConnection()) return;

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
              if (currentConnection()) reconnect();
            })
            .finally(() => {
              refreshing = false;
            });
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (!currentConnection()) return;

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

            if (latest) flush();
            return;
          }

          if (
            message.event === "broadcast" &&
            message.payload?.event === "cursor"
          ) {
            const payload = message.payload?.payload ?? {};
            const userId = String(payload.userId || "").trim();
            const x = Number(payload.x);
            const y = Number(payload.y);

            if (
              !userId ||
              userId === me.userId ||
              !Number.isFinite(x) ||
              !Number.isFinite(y)
            ) {
              return;
            }

            onCursor({
              userId,
              name: String(payload.name || "Пользователь").trim() || "Пользователь",
              role: isRole(payload.role) ? payload.role : "viewer",
              x,
              y,
              updatedAt: Date.now(),
            });
          }
        } catch {
          /* Ignore malformed or unrelated frames. */
        }
      };

      ws.onerror = ws.onclose = () => {
        if (currentConnection()) reconnect();
      };
    } catch {
      if (!stopped && current === generation) reconnect();
    }
  };

  const sendCursor = (x: number, y: number) => {
    if (stopped || !Number.isFinite(x) || !Number.isFinite(y)) return;

    latest = { x, y };

    const elapsed = Date.now() - lastSentAt;

    if (ready && elapsed >= minInterval && !flushTimer) {
      flush();
      return;
    }

    if (!flushTimer) {
      flushTimer = setTimeout(
        flush,
        Math.max(8, minInterval - elapsed),
      );
    }
  };

  const networkChanged = () => reconnect();

  window.addEventListener("online", networkChanged);
  window.addEventListener("offline", networkChanged);

  void connect();

  return {
    sendCursor,
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
