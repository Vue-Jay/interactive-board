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

export async function putAsset(id: string, blob: Blob) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  database.close();
}

export async function getAsset(id: string): Promise<Blob | null> {
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
