// A per-user visit marker is stored locally, while the authoritative history
// is stored in Supabase. Never mark a revision as seen just by fetching it.
export function recentBoardHistory<T extends { version: number }>(
  revisions: readonly T[], limit = 5,
): T[] {
  return revisions.slice(0, Math.max(1, Math.min(20, limit)));
}

export function changesSinceLastVisit<T extends { version: number }>(
  revisions: readonly T[], lastSeenVersion: number | null, limit = 5,
): T[] {
  const max = Math.max(1, Math.min(20, limit));
  const changes = lastSeenVersion === null
    ? revisions.slice(0, 3)
    : revisions.filter(row => row.version > lastSeenVersion);
  return changes.slice(0, max);
}
