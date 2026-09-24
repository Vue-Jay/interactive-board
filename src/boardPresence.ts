import { getRealtimeSocketUrl, getRemoteSession, isRemoteBackendEnabled } from "./backend";
import type { BoardRole } from "./authStore";

export type BoardPresenceUser = {
  userId: string;
  name: string;
  role: BoardRole;
  onlineAt: string;
};

type PresenceMeta = {
  phx_ref?: string;
  userId?: string;
  name?: string;
  role?: BoardRole;
  onlineAt?: string;
};

type PresenceState = Record<string, { metas?: PresenceMeta[] }>;

const validRole = (value: unknown): value is BoardRole =>
  value === "owner" || value === "editor" || value === "viewer";

const usersFromState = (state: PresenceState): BoardPresenceUser[] => {
  const byUser = new Map<string, BoardPresenceUser>();

  for (const [key, entry] of Object.entries(state)) {
    for (const meta of entry?.metas ?? []) {
      const userId = String(meta.userId || key || "").trim();
      if (!userId) continue;

      const candidate: BoardPresenceUser = {
        userId,
        name: String(meta.name || "Пользователь").trim() || "Пользователь",
        role: validRole(meta.role) ? meta.role : "viewer",
        onlineAt: String(meta.onlineAt || ""),
      };

      const current = byUser.get(userId);
      if (!current || candidate.onlineAt >= current.onlineAt) byUser.set(userId, candidate);
    }
  }

  return [...byUser.values()].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
  });
};

const mergePresenceDiff = (
  state: PresenceState,
  payload: { joins?: PresenceState; leaves?: PresenceState },
): PresenceState => {
  const next: PresenceState = {};

  for (const [key, value] of Object.entries(state)) {
    next[key] = { metas: [...(value.metas ?? [])] };
  }

  for (const [key, value] of Object.entries(payload.joins ?? {})) {
    const existing = next[key]?.metas ?? [];
    const refs = new Set(existing.map((meta) => meta.phx_ref).filter(Boolean));
    const additions = (value.metas ?? []).filter((meta) => !meta.phx_ref || !refs.has(meta.phx_ref));
    next[key] = { metas: [...existing, ...additions] };
  }

  for (const [key, value] of Object.entries(payload.leaves ?? {})) {
    const leavingRefs = new Set((value.metas ?? []).map((meta) => meta.phx_ref).filter(Boolean));
    const remaining = (next[key]?.metas ?? []).filter((meta) => !meta.phx_ref || !leavingRefs.has(meta.phx_ref));
    if (remaining.length) next[key] = { metas: remaining };
    else delete next[key];
  }

  return next;
};

export function subscribeBoardPresence(
  boardId: string,
  me: { userId: string; name: string; role: BoardRole },
  onPresence: (users: BoardPresenceUser[]) => void,
): () => void {
  if (!isRemoteBackendEnabled()) {
    onPresence([]);
    return () => {};
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
  let presenceState: PresenceState = {};

  const topic = `realtime:board-presence:${boardId}`;

  const emit = () => {
    if (!stopped) onPresence(usersFromState(presenceState));
  };

  const closeSocket = () => {
    clearTimeout(deadline);
    clearInterval(heartbeat);
    clearInterval(refresh);
    pendingHeartbeat = null;

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
    presenceState = {};
    emit();
    retry = setTimeout(() => void connect(), Math.min(1000 * 2 ** attempt++, 30000));
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
      const active = () => !stopped && current === generation;

      const send = (
        event: string,
        payload: unknown,
        channel = topic,
        ref = String(++sequence),
      ) => {
        if (active() && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: channel,
            event,
            payload,
            ref,
            join_ref: channel === topic ? joinRef : null,
          }));
        }
        return ref;
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
              presence: { enabled: true, key: me.userId },
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
            pendingHeartbeat = send("heartbeat", {}, "phoenix");
          } catch {
            reconnect();
          }
        }, 25000);

        let refreshing = false;
        refresh = setInterval(() => {
          if (refreshing) return;
          refreshing = true;
          void getRemoteSession().then((next) => {
            if (!active()) return;
            if (!next) {
              reconnect();
              return;
            }
            if (next.access_token !== token) {
              token = next.access_token;
              send("access_token", { access_token: token });
            }
          }).catch(() => {
            if (active()) reconnect();
          }).finally(() => {
            refreshing = false;
          });
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (!active()) return;

        try {
          const message = JSON.parse(String(event.data));

          if (message.topic === "phoenix" && message.event === "phx_reply" && message.ref === pendingHeartbeat) {
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

          if (message.event === "phx_reply" && message.ref === joinRef && message.payload?.status === "ok") {
            clearTimeout(deadline);
            attempt = 0;
            send("presence", {
              type: "presence",
              event: "track",
              payload: {
                userId: me.userId,
                name: me.name,
                role: me.role,
                onlineAt: new Date().toISOString(),
              },
            });
            return;
          }

          if (message.event === "presence_state") {
            presenceState = (message.payload ?? {}) as PresenceState;
            emit();
            return;
          }

          if (message.event === "presence_diff") {
            presenceState = mergePresenceDiff(presenceState, message.payload ?? {});
            emit();
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

  const networkChanged = () => reconnect();
  window.addEventListener("online", networkChanged);
  window.addEventListener("offline", networkChanged);
  void connect();

  return () => {
    stopped = true;
    generation++;
    clearTimeout(retry);
    closeSocket();
    presenceState = {};
    onPresence([]);
    window.removeEventListener("online", networkChanged);
    window.removeEventListener("offline", networkChanged);
  };
}
