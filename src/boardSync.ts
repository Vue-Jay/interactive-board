import type { DocumentData } from "./boardModel";
import type { RemoteBoardDocument } from "./backend";

// Stable compact hash for JSON-compatible board content. Supabase JSONB may reorder
// object keys, so key order cannot participate in equality. Hashing while walking the
// value avoids allocating a second multi-megabyte canonical JSON string for big boards.
const stableJsonHash = (value: unknown): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const feed = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = Math.imul(h2 ^ c, 0x85ebca6b);
      h2 ^= h2 >>> 13;
    }
  };
  const visit = (entry: unknown) => {
    if (entry === null) { feed("n;"); return; }
    if (typeof entry === "string") { feed("s"); feed(JSON.stringify(entry)); feed(";"); return; }
    if (typeof entry === "number") { feed("d"); feed(Number.isFinite(entry) ? String(entry) : "null"); feed(";"); return; }
    if (typeof entry === "boolean") { feed(entry ? "t;" : "f;"); return; }
    if (Array.isArray(entry)) {
      feed("[");
      for (const item of entry) { visit(item); feed(","); }
      feed("]");
      return;
    }
    if (entry && typeof entry === "object") {
      feed("{");
      const object = entry as Record<string, unknown>;
      const keys = Object.keys(object).filter((key) => object[key] !== undefined).sort();
      for (const key of keys) {
        feed(JSON.stringify(key));
        feed(":");
        visit(object[key]);
        feed(",");
      }
      feed("}");
      return;
    }
    // JSON.stringify omits undefined/function/symbol object properties. Arrays in the
    // document do not contain those values, but keep a marker for defensive stability.
    feed("u;");
  };
  visit(value);
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
};

export function documentFingerprint(document: DocumentData): string {
  // Viewport is personal UI state. Panning/zooming must never create a collaborative
  // revision or a false conflict between participants.
  return stableJsonHash({ version: document.version, title: document.title, items: document.items });
}

export function remoteUpdateDecision(currentVersion: number | null, nextVersion: number,
  saving: boolean, hasLocalChanges: boolean): "ignore" | "defer" | "conflict" | "apply" {
  if (!Number.isSafeInteger(nextVersion) || nextVersion <= (currentVersion ?? 0)) return "ignore";
  // RPC acknowledgement records our own version before queued events are handled.
  if (saving) return "defer";
  return hasLocalChanges ? "conflict" : "apply";
}

export function isOwnRemoteRevision(row: RemoteBoardDocument, userId: string,
  attempt: { version: number; fingerprint: string } | null): boolean {
  return !!attempt && row.updated_by === userId && row.version === attempt.version &&
    documentFingerprint(row.document as DocumentData) === attempt.fingerprint;
}
