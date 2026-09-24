import type { DocumentData } from "./boardModel";
import type { RemoteBoardDocument } from "./backend";

// JSONB can reorder object keys; equality must not depend on property order.
export function documentFingerprint(document: DocumentData): string {
  // Viewport is personal UI state. Panning/zooming must never create a collaborative revision
  // or a false conflict between participants.
  const collaborative = { ...document, view: undefined };
  return JSON.stringify(collaborative, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  });
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
