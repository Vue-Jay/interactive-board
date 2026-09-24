import { useEffect, useState } from "react";
import { type AuthUser, type BoardRole, BOARD_ROLE_LABELS } from "./authStore";
import { isRemoteBackendEnabled } from "./backend";
import { getBoardAccess, inviteToBoard, changeMemberRole, removeMember, revokeInvitation, type BoardSummary } from "./boardStore";
import { createShareLink, listShareLinks, revokeShareLink, type ShareLink } from "./shareLinks";

export default function ShareDialog({ board, user, onClose }: { board: BoardSummary; user: AuthUser; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
  const [access, setAccess] = useState<Awaited<ReturnType<typeof getBoardAccess>>>({ members: [], invites: [] });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<BoardRole, "owner">>("viewer");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const remote = isRemoteBackendEnabled();
  const reload = async () => {
    const [members, rows] = await Promise.all([getBoardAccess(user.id, board.id), remote ? listShareLinks(board.id) : Promise.resolve([])]);
    setAccess(members); setLinks(rows);
  };
  useEffect(() => {
    let alive = true;
    void Promise.all([getBoardAccess(user.id, board.id), remote ? listShareLinks(board.id) : Promise.resolve([])])
      .then(([members, rows]) => { if (alive) { setAccess(members); setLinks(rows); } })
      .catch(() => { if (alive) setNotice("Не удалось загрузить доступ. Проверьте подключение и миграцию v22."); });
    return () => { alive = false; };
  }, [board.id, user.id, remote]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setNotice("");
    try { await action(); } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось выполнить действие"); }
    finally { setBusy(false); }
  };
  const create = (linkRole: ShareLink["role"]) => run(async () => {
    const link = await createShareLink(board.id, linkRole);
    setCreated({ id: link.id, url: `${window.location.origin}/join/${link.token}` });
    await reload();
  });
  if (board.role !== "owner") return null;
  return <div className="access-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="access-modal" role="dialog" aria-modal="true" aria-label="Поделиться доской">
      <div className="access-head"><div><h2>Поделиться</h2><p>{board.title}</p></div><button onClick={onClose} aria-label="Закрыть">×</button></div>
      {remote ? <>
        <p>Любой пользователь с этой ссылкой сможет войти и получить выбранный доступ.</p>
        <div className="share-actions"><button disabled={busy} onClick={() => void create("editor")}>Создать ссылку «Редактирование»</button><button disabled={busy} onClick={() => void create("viewer")}>Создать ссылку «Только просмотр»</button></div>
        {created && <div className="share-created"><label>Скопируйте сейчас: ссылка показывается только при создании.<input readOnly value={created.url} onFocus={e => e.target.select()} aria-label="Новая ссылка"/></label><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(created.url); setNotice("Ссылка скопирована"); })}>Копировать ссылку</button></div>}
        <h3>Активные ссылки</h3>
        {links.filter(l => !l.revoked_at && (!l.expires_at || Date.parse(l.expires_at) > Date.now())).map(link => <div className="access-person" key={link.id}>
          <div><strong>{BOARD_ROLE_LABELS[link.role]}</strong><span>{new Date(link.created_at).toLocaleString("ru-RU")}</span></div>
          <button disabled={busy} onClick={() => void run(async () => { await revokeShareLink(link.id); if (created?.id === link.id) setCreated(null); await reload(); })}>Отозвать ссылку</button>
        </div>)}
        <p className="share-note">Отзыв запрещает новые входы по ссылке. Для удаления уже выданного доступа удалите участника ниже.</p>
      </> : <p>В локальном режиме приглашения работают только между аккаунтами в этом браузере. Ссылки требуют Supabase.</p>}
      <details open={!remote}><summary>Приглашение по email</summary><div className="invite-row">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email пользователя" aria-label="Email пользователя"/>
        <select value={role} onChange={e => setRole(e.target.value as typeof role)} aria-label="Роль приглашения"><option value="viewer">Только просмотр</option><option value="editor">Редактор</option></select>
        <button disabled={busy} onClick={() => void run(async () => { await inviteToBoard(user.id, board.id, email, role); setEmail(""); await reload(); setNotice("Приглашение отправлено"); })}>Пригласить</button>
      </div></details>
      {notice && <div className="access-notice" role="status">{notice}</div>}
      <h3>Участники</h3><div className="access-list"><div className="access-person"><div><strong>{user.name}</strong><span>{user.email}</span></div><b>Владелец</b></div>
        {access.members.map(member => <div className="access-person" key={member.userId}><div><strong>{member.user?.name || "Пользователь"}</strong><span>{member.user?.email || "Участник доски"}</span></div><select disabled={busy} value={member.role} aria-label="Роль участника" onChange={e => { const value = e.target.value as typeof role; void run(async () => { await changeMemberRole(user.id, board.id, member.userId, value); await reload(); }); }}><option value="viewer">Просмотр</option><option value="editor">Редактор</option></select><button disabled={busy} onClick={() => void run(async () => { await removeMember(user.id, board.id, member.userId); await reload(); })}>Удалить</button></div>)}
        {access.invites.map(invite => <div className="access-person" key={invite.id}><div><strong>{invite.email}</strong><span>Ожидает входа</span></div><b>{BOARD_ROLE_LABELS[invite.role]}</b><button disabled={busy} onClick={() => void run(async () => { await revokeInvitation(user.id, board.id, invite.id); await reload(); })}>Отменить</button></div>)}
      </div>
    </section>
  </div>;
}
