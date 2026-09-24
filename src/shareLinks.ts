import { isRemoteBackendEnabled, remoteRequest } from "./backend";
import type { BoardSummary } from "./boardStore";
import type { BoardRole } from "./authStore";

export type ShareRole = Exclude<BoardRole, "owner">;

/** Server-shaped link used by the existing ShareDialog. */
export type ShareLink = {
  id: string;
  board_id: string;
  role: ShareRole;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  max_uses: number | null;
  use_count: number;
};

export type CreatedShareLink = ShareLink & { token: string };

/** Camel-cased compatibility shape used by BoardsScreen from the archive workflow. */
export type BoardShareLink = {
  id: string;
  boardId: string;
  role: ShareRole;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  maxUses: number | null;
  useCount: number;
};

const requireRemote = () => {
  if (!isRemoteBackendEnabled()) {
    throw new Error("Ссылки доступа работают только при включённой серверной синхронизации.");
  }
};

const normalizeServerLink = (row: any): ShareLink => ({
  id: String(row.id),
  board_id: String(row.board_id),
  role: row.role as ShareRole,
  created_at: String(row.created_at),
  expires_at: row.expires_at ?? null,
  revoked_at: row.revoked_at ?? null,
  max_uses: row.max_uses == null ? null : Number(row.max_uses),
  use_count: Number(row.use_count || 0),
});

/* API expected by the current Codex-created App.tsx / ShareDialog.tsx. */
export async function createShareLink(boardId: string, role: ShareRole, options?: { expiresAt?: string | null; maxUses?: number | null }): Promise<CreatedShareLink> {
  requireRemote();
  const row = await remoteRequest<any>("/rest/v1/rpc/create_board_share_link", {
    method: "POST",
    body: JSON.stringify({ p_board_id: boardId, p_role: role, p_expires_at: options?.expiresAt || null, p_max_uses: options?.maxUses || null }),
  });
  return {
    ...normalizeServerLink({ ...row, revoked_at: null }),
    token: String(row.token),
  };
}

export async function listShareLinks(boardId: string): Promise<ShareLink[]> {
  requireRemote();
  const rows = await remoteRequest<any[]>("/rest/v1/rpc/list_board_share_links", {
    method: "POST",
    body: JSON.stringify({ p_board_id: boardId }),
  });
  return (rows || []).map(normalizeServerLink);
}

export async function revokeShareLink(linkId: string): Promise<void> {
  requireRemote();
  await remoteRequest("/rest/v1/rpc/revoke_board_share_link", {
    method: "POST",
    body: JSON.stringify({ p_link_id: linkId }),
  });
}

/**
 * Returns the server-shaped RPC response because the existing App.tsx
 * navigates with redeemed.board_id after accepting /join/<token>.
 */
export async function redeemShareLink(token: string): Promise<{
  id: string;
  board_id: string;
  title: string;
  owner_id: string;
  role: BoardRole;
  created_at: string;
  updated_at: string;
}> {
  requireRemote();
  return remoteRequest("/rest/v1/rpc/redeem_board_share_link", {
    method: "POST",
    body: JSON.stringify({ p_token: token }),
  });
}

/* Compatibility aliases for BoardsScreen used in the archive patches. */
export async function createBoardShareLink(
  boardId: string,
  role: ShareRole,
): Promise<BoardShareLink & { token: string }> {
  const row = await createShareLink(boardId, role);
  return {
    id: row.id,
    boardId: row.board_id,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    maxUses: row.max_uses,
    useCount: row.use_count,
    token: row.token,
  };
}

export async function listBoardShareLinks(boardId: string): Promise<BoardShareLink[]> {
  const rows = await listShareLinks(boardId);
  return rows.map((row) => ({
    id: row.id,
    boardId: row.board_id,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    maxUses: row.max_uses,
    useCount: row.use_count,
  }));
}

export const revokeBoardShareLink = revokeShareLink;

export async function redeemBoardShareLink(token: string): Promise<BoardSummary> {
  const row = await redeemShareLink(token);
  return {
    id: row.board_id || row.id,
    title: row.title,
    ownerId: row.owner_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const JOIN_PREFIX = "/join/";

export function boardShareUrl(token: string) {
  return `${window.location.origin}${JOIN_PREFIX}${encodeURIComponent(token)}`;
}

export function pendingShareToken() {
  const path = window.location.pathname;
  if (path.startsWith(JOIN_PREFIX)) {
    const raw = path.slice(JOIN_PREFIX.length).split("/")[0];
    try { return decodeURIComponent(raw).trim() || null; } catch { return null; }
  }
  return new URL(window.location.href).searchParams.get("join")?.trim() || null;
}

export function clearPendingShareToken() {
  const url = new URL(window.location.href);
  url.searchParams.delete("join");
  window.history.replaceState({}, "", `/${url.search}${url.hash}`);
}
