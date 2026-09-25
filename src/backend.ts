export type BackendSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    created_at?: string;
  };
};

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, "") || "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";
const SESSION_KEY = "lesson-board.supabase.session.v1";
const NETWORK_TIMEOUT_MS = 5000;

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = NETWORK_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
};

export const isRemoteBackendEnabled = () => Boolean(url && anonKey);

export const getCachedRemoteSession = (): BackendSession | null => loadSession();

export const isCachedRemoteSessionUsable = () => {
  const session = loadSession();
  return Boolean(session && session.expires_at > Math.floor(Date.now() / 1000) + 30);
};

export const getRealtimeSocketUrl = () =>
  `${url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(anonKey)}&vsn=1.0.0`;

const loadSession = (): BackendSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as BackendSession;
    return value?.access_token && value?.refresh_token && value?.user?.id ? value : null;
  } catch {
    return null;
  }
};

const saveSession = (session: BackendSession | null) => {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const authHeaders = (token?: string) => ({
  apikey: anonKey,
  Authorization: `Bearer ${token || anonKey}`,
  "Content-Type": "application/json",
});

const errorMessage = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.msg || data?.message || data?.error_description || data?.error || `Ошибка сервера ${response.status}`;
  } catch {
    return `Ошибка сервера ${response.status}`;
  }
};

const normalizeSession = (data: any): BackendSession => ({
  access_token: data.access_token,
  refresh_token: data.refresh_token,
  expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
  user: data.user,
});

export const signUpRemote = async (email: string, password: string, name: string) => {
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password, data: { display_name: name } }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Аккаунт создан. Подтвердите email по письму, затем выполните вход.");
  }
  const session = normalizeSession(data);
  saveSession(session);
  return session;
};

export const signInAnonymousRemote = async (name = "Гость") => {
  const response = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ data: { display_name: name.trim() || "Гость", is_guest: true } }) });
  if (!response.ok) throw new Error(await errorMessage(response));
  const data = await response.json();
  if (!data.access_token) throw new Error("Анонимный вход отключён в настройках Supabase.");
  const session = normalizeSession(data); saveSession(session); return session;
};

export const signInRemote = async (email: string, password: string) => {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const session = normalizeSession(await response.json());
  saveSession(session);
  return session;
};

const refreshRemoteSession = async (session: BackendSession) => {
  const response = await fetchWithTimeout(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    saveSession(null);
    return null;
  }
  const next = normalizeSession(await response.json());
  saveSession(next);
  return next;
};

export const getRemoteSession = async (): Promise<BackendSession | null> => {
  let session = loadSession();
  if (!session) return null;
  // A valid JWT is enough to boot the app. Do not block every page load on /auth/v1/user.
  // Protected Supabase requests still validate the token server-side.
  if (session.expires_at > Math.floor(Date.now() / 1000) + 30) return session;
  try {
    session = await refreshRemoteSession(session);
    return session;
  } catch {
    return null;
  }
};

export const signOutRemote = async () => {
  const session = loadSession();
  if (session) {
    try {
      await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: authHeaders(session.access_token) });
    } catch { /* local logout still succeeds */ }
  }
  saveSession(null);
};

export const remoteRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const session = await getRemoteSession();
  if (!session) throw new Error("Сессия истекла. Войдите снова.");
  const headers = new Headers(init.headers || {});
  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(await errorMessage(response));
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

export const claimRemoteInvitations = async () => {
  if (!isRemoteBackendEnabled()) return;
  await remoteRequest("/rest/v1/rpc/claim_my_board_invites", { method: "POST", body: "{}" });
};

// Binary Storage requests use the same session and refresh flow as board documents.
export const remoteAssetRequest = async (path: string, blob?: Blob): Promise<Blob | null> => {
  const session = await getRemoteSession();
  if (!session) throw new Error("Сессия истекла. Войдите снова.");
  const response = await fetch(`${url}/storage/v1/object/${blob ? "" : "authenticated/"}board-assets/${path}`, {
    method: blob ? "POST" : "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      ...(blob ? { "Content-Type": blob.type, "x-upsert": "false" } : {}),
    },
    ...(blob ? { body: blob } : {}),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return blob ? null : response.blob();
};


export type RemoteBoardDocument = {
  board_id: string;
  document: unknown;
  version: number;
  updated_at: string;
  updated_by?: string | null;
};

export const getRemoteBoardDocument = async (boardId: string): Promise<RemoteBoardDocument | null> => {
  if (!isRemoteBackendEnabled()) return null;
  const rows = await remoteRequest<RemoteBoardDocument[]>(
    `/rest/v1/board_documents?board_id=eq.${encodeURIComponent(boardId)}&select=board_id,document,version,updated_at,updated_by&limit=1`,
  );
  return rows[0] ?? null;
};

export type RemoteSaveResult = {
  ok: boolean;
  conflict: boolean;
  version: number;
  updated_at?: string;
  document?: unknown;
};

export const saveRemoteBoardDocument = async (
  boardId: string,
  document: unknown,
  expectedVersion: number | null,
): Promise<RemoteSaveResult> => {
  if (!isRemoteBackendEnabled()) {
    return { ok: true, conflict: false, version: expectedVersion ?? 0 };
  }
  return remoteRequest<RemoteSaveResult>("/rest/v1/rpc/save_board_document", {
    method: "POST",
    body: JSON.stringify({
      p_board_id: boardId,
      p_document: document,
      p_expected_version: expectedVersion,
    }),
  });
};

export const remoteStorageRequest=async(bucket:string,path:string,blob?:Blob|null,method?:string):Promise<Blob|null>=>{
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const verb=method||(blob?"POST":"GET");const response=await fetch(`${url}/storage/v1/object/${verb==="GET"?"authenticated/":""}${bucket}/${path}`,{method:verb,headers:{apikey:anonKey,Authorization:`Bearer ${session.access_token}`,...(blob?{"Content-Type":blob.type||"application/octet-stream","x-upsert":"false"}:{})},...(blob?{body:blob}:{})});
 if(!response.ok)throw new Error(await errorMessage(response));return verb==="GET"?response.blob():null;
};

export type RemoteStorageObject={name:string;id?:string;metadata?:unknown};
export const listRemoteStorageObjects=async(bucket:string,prefix:string):Promise<RemoteStorageObject[]>=>{
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const all:RemoteStorageObject[]=[];const limit=1000;
 for(let offset=0;;offset+=limit){
  const response=await fetch(`${url}/storage/v1/object/list/${bucket}`,{method:"POST",headers:{apikey:anonKey,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({prefix,limit,offset,sortBy:{column:"name",order:"asc"}})});
  if(!response.ok)throw new Error(await errorMessage(response));
  const page=await response.json() as RemoteStorageObject[];all.push(...page);if(page.length<limit)break;
 }
 return all;
};
export const deleteRemoteStorageObjects=async(bucket:string,paths:string[])=>{
 if(paths.length===0)return;
 const session=await getRemoteSession();if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const response=await fetch(`${url}/storage/v1/object/${bucket}`,{method:"DELETE",headers:{apikey:anonKey,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({prefixes:paths})});
 if(!response.ok)throw new Error(await errorMessage(response));
};


export const remoteFunctionRequest=async<T>(functionName:string,init:RequestInit={}):Promise<T>=>{
 const session=await getRemoteSession();
 if(!session)throw new Error("Сессия истекла. Войдите снова.");
 const headers=new Headers(init.headers||{});
 headers.set("apikey",anonKey);
 headers.set("Authorization",`Bearer ${session.access_token}`);
 if(!headers.has("Content-Type"))headers.set("Content-Type","application/json");
 const response=await fetch(`${url}/functions/v1/${functionName}`,{...init,headers});
 if(!response.ok)throw new Error(await errorMessage(response));
 return response.json() as Promise<T>;
};
