import { isRemoteBackendEnabled, remoteAssetRequest } from "./backend";
import type { DocumentData } from "./boardModel";

const DB_NAME = "lesson-board.assets.v1";
const STORE = "assets";

let databasePromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  // Opening IndexedDB is surprisingly expensive on mobile WebView/Chrome. Reuse one
  // connection instead of opening and closing the database for every image/PDF read.
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => { databasePromise = null; reject(request.error); };
    request.onblocked = () => { /* existing connection will resolve/close via versionchange */ };
  });
  return databasePromise;
}

async function putLocalAsset(id: string, blob: Blob) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getLocalAsset(id: string): Promise<Blob | null> {
  const database = await db();
  const result = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = database.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  return result ?? null;
}

const synchronized = new Set<string>();
const downloads = new Map<string, Promise<Blob | null>>();

const MEMORY_CACHE_LIMIT = 64 * 1024 * 1024;
const MEMORY_ITEM_LIMIT = 16 * 1024 * 1024;
const memoryAssets = new Map<string, Blob>();
let memoryAssetBytes = 0;
const rememberAsset = (key: string, blob: Blob) => {
  if (blob.size > MEMORY_ITEM_LIMIT) return blob;
  const previous = memoryAssets.get(key);
  if (previous) memoryAssetBytes -= previous.size;
  memoryAssets.delete(key);
  memoryAssets.set(key, blob);
  memoryAssetBytes += blob.size;
  while (memoryAssetBytes > MEMORY_CACHE_LIMIT && memoryAssets.size > 1) {
    const oldestKey = memoryAssets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const oldest = memoryAssets.get(oldestKey);
    memoryAssets.delete(oldestKey);
    if (oldest) memoryAssetBytes -= oldest.size;
  }
  return blob;
};
const assetPath = (boardId: string, id: string) => {
  if (![boardId, id].every(value => /^[a-zA-Z0-9_-]+$/.test(value))) {
    throw new Error("Некорректный идентификатор вложения");
  }
  return `${boardId}/${id}`;
};


// Downsample oversized photographs before upload. This reduces both transfer size and
// decoded texture memory on mobile. Preserve PNG/GIF/SVG and small images unchanged.
async function optimizeImage(blob: Blob): Promise<Blob> {
  if (!["image/jpeg", "image/webp"].includes(blob.type) || blob.size < 350_000 ||
      typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= 2560) return blob;
    const ratio = 2560 / longest;
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    let optimized: Blob | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) return blob;
      context.drawImage(bitmap, 0, 0, width, height);
      optimized = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
    } else if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return blob;
      context.drawImage(bitmap, 0, 0, width, height);
      optimized = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/webp", 0.85));
      canvas.width = 0;
      canvas.height = 0;
    }
    return optimized && optimized.size < blob.size * 0.9 ? optimized : blob;
  } catch {
    return blob;
  } finally {
    bitmap?.close();
  }
}

export async function putAsset(id: string, blob: Blob, boardId: string) {
  blob = await optimizeImage(blob);
  if (!isRemoteBackendEnabled()) return putLocalAsset(id, blob);
  if (blob.size > 50 * 1024 * 1024 || !(blob.type.startsWith("image/") || blob.type === "application/pdf")) {
    throw new Error("Нужно изображение или PDF размером до 50 МБ");
  }
  const path = assetPath(boardId, id);
  await remoteAssetRequest(path, blob);
  synchronized.add(path);
  rememberAsset(path, blob);
  // A full browser cache must not turn a successful upload into an error.
  await putLocalAsset(path, blob).catch(() => {});
}

export async function getAsset(id: string, boardId: string): Promise<Blob | null> {
  const path = assetPath(boardId, id);
  const inMemory = memoryAssets.get(path) ?? memoryAssets.get(id);
  if (inMemory) {
    rememberAsset(path, inMemory);
    return inMemory;
  }
  if (!isRemoteBackendEnabled()) {
    const local = (await getLocalAsset(path)) ?? await getLocalAsset(id);
    return local ? rememberAsset(path, local) : null;
  }
  const cached = await getLocalAsset(path).catch(() => null);
  if (cached) return rememberAsset(path, cached);
  if (downloads.has(path)) return downloads.get(path)!;
  const pending = (async () => {
    try {
      const blob = await remoteAssetRequest(path);
      if (blob) {
        synchronized.add(path);
        rememberAsset(path, blob);
        await putLocalAsset(path, blob).catch(() => {});
      }
      return blob;
    } catch {
      // v19 attachments may still exist only in this browser.
      const legacy = await getLocalAsset(id).catch(() => null);
      return legacy ? rememberAsset(path, legacy) : null;
    }
  })();
  downloads.set(path, pending);
  try { return await pending; } finally { downloads.delete(path); }
}

// Upload legacy local attachments before publishing a document referencing them.
export async function ensureBoardAssets(boardId: string, document: DocumentData) {
  if (!isRemoteBackendEnabled()) return;
  const ids = [...new Set(
    document.items
      .filter(item => item.kind === "image" || item.kind === "pdf")
      .map(item => item.assetId)
      .filter((id): id is string => Boolean(id))
  )];
  await Promise.all(ids.map(async (id) => {
    const path = assetPath(boardId, id);
    if (synchronized.has(path)) return;
    try {
      // Independent assets are checked in parallel. Sequential verification made
      // boards with several images/PDFs pause during their first autosave.
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
  }));
}
