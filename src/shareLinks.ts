import { isRemoteBackendEnabled, remoteRequest } from "./backend";
import type { BoardSummary } from "./boardStore";
import type { BoardRole } from "./authStore";

export type ShareRole = Exclude<BoardRole, "owner">;

export type BoardShareLink = {
  id: string;
  boardId: string;
  role: ShareRole;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

type CreatedShareLink = BoardShareLink & { token: string };

const requireRemote = () => {
  if (!isRemoteBackendEnabled()) {
    throw new Error("Ссылки доступа работают только при включённой серверной синхронизации.");
  }
};

export async function createBoardShareLink(boardId: string, role: ShareRole): Promise<CreatedShareLink> {
  requireRemote();
  const row = await remoteRequest<any>("/rest/v1/rpc/create_board_share_link", {
    method: "POST",
    body: JSON.stringify({ p_board_id: boardId, p_role: role }),
  });
  return {
    id: row.id,
    boardId: row.board_id,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    revokedAt: null,
    token: row.token,
  };
}

export async function listBoardShareLinks(boardId: string): Promise<BoardShareLink[]> {
  requireRemote();
  const rows = await remoteRequest<any[]>("/rest/v1/rpc/list_board_share_links", {
    method: "POST",
    body: JSON.stringify({ p_board_id: boardId }),
  });
  return (rows || []).map((row) => ({
    id: row.id,
    boardId: row.board_id,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
  }));
}

export async function revokeBoardShareLink(linkId: string) {
  requireRemote();
  await remoteRequest("/rest/v1/rpc/revoke_board_share_link", {
    method: "POST",
    body: JSON.stringify({ p_link_id: linkId }),
  });
}

export async function redeemBoardShareLink(token: string): Promise<BoardSummary> {
  requireRemote();
  const row = await remoteRequest<any>("/rest/v1/rpc/redeem_board_share_link", {
    method: "POST",
    body: JSON.stringify({ p_token: token }),
  });
  return {
    id: row.id,
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
