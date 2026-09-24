import { getRealtimeSocketUrl, getRemoteBoardDocument, getRemoteSession, isRemoteBackendEnabled, type RemoteBoardDocument } from "./backend";

export type RealtimeStatus = "online" | "reconnecting" | "offline";

// One socket per mounted board. Protocol 1.0.0 uses JSON Phoenix envelopes.
// https://supabase.com/docs/guides/realtime/protocol
export function subscribeBoardDocument(boardId: string, onDocument: (row: RemoteBoardDocument) => void,
  onStatus: (status: RealtimeStatus) => void): () => void {
  if (!isRemoteBackendEnabled()) return () => {};
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
  let reading = false;
  let readAgain = false;
  const topic = `realtime:board:${boardId}`;

  // Re-read through RLS, also recovering changes missed while disconnected.
  const readLatest = async () => {
    if (stopped) return;
    if (reading) { readAgain = true; return; }
    reading = true;
    try {
      do {
        readAgain = false;
        const row = await getRemoteBoardDocument(boardId);
        if (!stopped && row) onDocument(row);
      } while (!stopped && readAgain);
    } catch {
      if (!stopped) reconnect();
    } finally { reading = false; }
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
    onStatus(navigator.onLine ? "reconnecting" : "offline");
    retry = setTimeout(() => void connect(), Math.min(1000 * 2 ** attempt++, 30000));
  };
  const connect = async () => {
    if (stopped) return;
    const current = ++generation;
    onStatus(navigator.onLine ? "reconnecting" : "offline");
    try {
      const session = await getRemoteSession();
      if (stopped || current !== generation) return;
      if (!session) { onStatus("offline"); reconnect(); return; }
      const ws = new WebSocket(getRealtimeSocketUrl());
      socket = ws;
      let joined = false;
      let token = session.access_token;
      const joinRef = String(++sequence);
      const active = () => !stopped && current === generation;
      const send = (event: string, payload: unknown, channel = topic, ref = String(++sequence)) => {
        if (active() && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ topic: channel, event, payload, ref, join_ref: channel === topic ? joinRef : null }));
        }
        return ref;
      };
      deadline = setTimeout(reconnect, 15000);
      ws.onopen = () => {
        if (!active()) return;
        try { send("phx_join", {
          access_token: token,
          config: { broadcast: { self: false, ack: false }, presence: { enabled: false },
            postgres_changes: ["INSERT", "UPDATE"].map(event => ({ event, schema: "public", table: "board_documents", filter: `board_id=eq.${boardId}` })) },
        }, topic, joinRef); } catch { reconnect(); return; }
        heartbeat = setInterval(() => {
          if (pendingHeartbeat) { reconnect(); return; }
          try { pendingHeartbeat = send("heartbeat", {}, "phoenix"); } catch { reconnect(); }
        }, 25000);
        let refreshing = false;
        refresh = setInterval(() => {
          if (refreshing) return;
          refreshing = true;
          void getRemoteSession().then(next => {
            if (!active()) return;
            if (!next) { reconnect(); return; }
            if (next.access_token !== token) { token = next.access_token; send("access_token", { access_token: token }); }
          }).catch(() => { if (active()) reconnect(); }).finally(() => { refreshing = false; });
        }, 20000);
      };
      ws.onmessage = event => {
        if (!active()) return;
        try {
          const message = JSON.parse(String(event.data));
          if (message.topic === "phoenix" && message.event === "phx_reply" && message.ref === pendingHeartbeat) {
            pendingHeartbeat = null;
            return;
          }
          if (message.topic !== topic) return;
          if (message.event === "phx_error" || message.event === "phx_close" ||
            (message.event === "phx_reply" && message.payload?.status === "error") ||
            (message.event === "system" && message.payload?.status === "error")) { reconnect(); return; }
          if (message.event === "system" && message.payload?.extension === "postgres_changes" && message.payload?.status === "ok") {
            joined = true;
            clearTimeout(deadline);
            attempt = 0;
            onStatus("online");
            void readLatest();
          }
          if (joined && message.event === "postgres_changes") void readLatest();
        } catch { /* Ignore malformed/unrelated protocol frames. */ }
      };
      ws.onerror = ws.onclose = () => { if (active()) reconnect(); };
    } catch { if (!stopped && current === generation) reconnect(); }
  };
  const networkChanged = () => { reconnect(); };
  window.addEventListener("online", networkChanged);
  window.addEventListener("offline", networkChanged);
  void connect();
  return () => {
    stopped = true;
    generation++;
    clearTimeout(retry);
    closeSocket();
    window.removeEventListener("online", networkChanged);
    window.removeEventListener("offline", networkChanged);
  };
}
