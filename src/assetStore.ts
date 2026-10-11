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


// Compress raster photos before they enter IndexedDB or remote storage.
// Preserve GIF/SVG (animations/vectors), and never enlarge a small image.
// Keep alpha when converting PNG to WebP. Original uploads are not modified on disk.
async function optimizeImage(blob: Blob): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type) ||
      blob.size < 250_000 || typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height);
    // Compression is worthwhile for either high resolution OR high byte size.
    if (longest <= 1600 && blob.size <= 500_000) return blob;
    const scale = Math.min(1, 2048 / Math.max(1, longest));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    let optimized: Blob | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return blob;
      context.drawImage(bitmap, 0, 0, width, height);
      optimized = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
    } else if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return blob;
      context.drawImage(bitmap, 0, 0, width, height);
      optimized = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/webp", 0.82));
      canvas.width = 0;
      canvas.height = 0;
    }
    // Some browsers silently ignore WebP and produce PNG; never upload a
    // larger or incompatible output just because transcoding was attempted.
    return optimized && optimized.type === "image/webp" &&
      optimized.size < blob.size * 0.88 ? optimized : blob;
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

const displayPreviews = new Map<string, Promise<Blob | null>>();
const DISPLAY_PREVIEW_LIMIT = 12;
export function getDisplayAsset(id: string, boardId: string): Promise<Blob | null> {
  const key = boardId + "/" + id;
  const existing = displayPreviews.get(key);
  if (existing) return existing;
  const pending = (async () => {
    const blob = await getAsset(id, boardId);
    if (!blob || !["image/jpeg", "image/png", "image/webp"].includes(blob.type) ||
        typeof createImageBitmap !== "function") return blob;
    let bitmap: ImageBitmap | undefined;
    try {
      // Existing high-resolution attachments get a smaller display-only copy.
      bitmap = await createImageBitmap(blob);
      const longest = Math.max(bitmap.width, bitmap.height);
      if (longest <= 1400) return blob;
      const scale = 1400 / longest;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      let preview: Blob | null = null;
      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return blob;
        ctx.drawImage(bitmap, 0, 0, width, height);
        preview = await canvas.convertToBlob({ type: "image/webp", quality: 0.78 });
      } else if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return blob;
        ctx.drawImage(bitmap, 0, 0, width, height);
        preview = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.78));
        canvas.width = 0;
        canvas.height = 0;
      }
      return preview || blob;
    } catch {
      return blob;
    } finally {
      bitmap?.close();
    }
  })();
  displayPreviews.set(key, pending);
  while (displayPreviews.size > DISPLAY_PREVIEW_LIMIT) {
    const oldest = displayPreviews.keys().next().value;
    if (oldest === undefined) break;
    displayPreviews.delete(oldest);
  }
  void pending.catch(() => { if (displayPreviews.get(key) === pending) displayPreviews.delete(key); });
  return pending;
}
