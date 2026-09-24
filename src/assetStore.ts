import { isRemoteBackendEnabled, remoteAssetRequest } from "./backend";
import type { DocumentData } from "./boardModel";

const DB_NAME = "lesson-board.assets.v1";
const STORE = "assets";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putLocalAsset(id: string, blob: Blob) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  database.close();
}

async function getLocalAsset(id: string): Promise<Blob | null> {
  const database = await db();
  const result = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = database.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result ?? null;
}

const synchronized = new Set<string>();
const downloads = new Map<string, Promise<Blob | null>>();
const assetPath = (boardId: string, id: string) => {
  if (![boardId, id].every(value => /^[a-zA-Z0-9_-]+$/.test(value))) {
    throw new Error("Некорректный идентификатор вложения");
  }
  return `${boardId}/${id}`;
};

export async function putAsset(id: string, blob: Blob, boardId: string) {
  if (!isRemoteBackendEnabled()) return putLocalAsset(id, blob);
  if (blob.size > 50 * 1024 * 1024 || !(blob.type.startsWith("image/") || blob.type === "application/pdf")) {
    throw new Error("Нужно изображение или PDF размером до 50 МБ");
  }
  const path = assetPath(boardId, id);
  await remoteAssetRequest(path, blob);
  synchronized.add(path);
  // A full browser cache must not turn a successful upload into an error.
  await putLocalAsset(path, blob).catch(() => {});
}

export async function getAsset(id: string, boardId: string): Promise<Blob | null> {
  if (!isRemoteBackendEnabled()) return (await getLocalAsset(`${boardId}/${id}`)) ?? getLocalAsset(id);
  const path = assetPath(boardId, id);
  const cached = await getLocalAsset(path).catch(() => null);
  if (cached) return cached;
  if (downloads.has(path)) return downloads.get(path)!;
  const pending = (async () => {
    try {
      const blob = await remoteAssetRequest(path);
      if (blob) await putLocalAsset(path, blob).catch(() => {});
      return blob;
    } catch {
      // v19 attachments may still exist only in this browser.
      return getLocalAsset(id).catch(() => null);
    }
  })();
  downloads.set(path, pending);
  try { return await pending; } finally { downloads.delete(path); }
}

// Upload legacy local attachments before publishing a document referencing them.
export async function ensureBoardAssets(boardId: string, document: DocumentData) {
  if (!isRemoteBackendEnabled()) return;
  const ids = new Set(document.items.filter(item => item.kind === "image" || item.kind === "pdf").map(item => item.assetId));
  for (const id of ids) {
    if (!id) continue;
    const path = assetPath(boardId, id);
    if (synchronized.has(path)) continue;
    try {
      // Verify server presence before migrating v19 data; never overwrite it.
      const blob = await remoteAssetRequest(path);
      if (blob) await putLocalAsset(path, blob).catch(() => {});
      synchronized.add(path);
    } catch (error) {
      const legacy = await getLocalAsset(id).catch(() => null);
      if (!legacy) throw error;
      const item = document.items.find(item => item.assetId === id);
      const mime = item?.kind === "pdf" ? "application/pdf" : legacy.type || item?.mime;
      await putAsset(id, mime && mime !== legacy.type ? legacy.slice(0, legacy.size, mime) : legacy, boardId);
    }
  }
}
