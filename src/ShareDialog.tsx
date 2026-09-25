import { useEffect, useState } from "react";
import { type AuthUser, type BoardRole, BOARD_ROLE_LABELS } from "./authStore";
import { isRemoteBackendEnabled } from "./backend";
import { getBoardAccess, inviteToBoard, changeMemberRole, removeMember, revokeInvitation, type BoardSummary } from "./boardStore";
import { createShareLink, listShareLinks, revokeShareLink, type ShareLink } from "./shareLinks";

export default function ShareDialog({ board, user, onClose }: { board: BoardSummary; user: AuthUser; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [created, setCreated] = useState<{ id: string; url: string; presentationUrl?: string } | null>(null);
  const [access, setAccess] = useState<Awaited<ReturnType<typeof getBoardAccess>>>({ members: [], invites: [] });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<BoardRole, "owner">>("viewer");
  const [busy, setBusy] = useState(false);
  const [expiry, setExpiry] = useState<"never"|"1d"|"7d"|"30d">("7d");
  const [maxUses, setMaxUses] = useState<number>(0);
  const [linkPassword, setLinkPassword] = useState("");
  const [notice, setNotice] = useState("");
  const remote = isRemoteBackendEnabled();
  const reload = async () => { const [members, rows] = await Promise.all([getBoardAccess(user.id, board.id), remote ? listShareLinks(board.id) : Promise.resolve([])]); setAccess(members); setLinks(rows); };
  useEffect(() => { let alive = true; void Promise.all([getBoardAccess(user.id, board.id), remote ? listShareLinks(board.id) : Promise.resolve([])]).then(([members, rows]) => { if (alive) { setAccess(members); setLinks(rows); } }).catch(() => { if (alive) setNotice("Не удалось загрузить доступ."); }); return () => { alive = false; }; }, [board.id, user.id, remote]);
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setNotice(""); try { await action(); } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось выполнить действие"); } finally { setBusy(false); } };
  const create = (linkRole: ShareLink["role"]) => run(async () => {
    const expiresAt=expiry==="never"?null:new Date(Date.now()+({"1d":1,"7d":7,"30d":30}[expiry])*86400000).toISOString();
    const link = await createShareLink(board.id, linkRole,{expiresAt,maxUses:maxUses>0?maxUses:null,password:linkPassword.trim()||null});
    const url=`${window.location.origin}/join/${link.token}`; setCreated({ id: link.id, url, ...(linkRole==="viewer"?{presentationUrl:`${url}?present=1`}:{}) }); await reload();
  });
  if (board.role !== "owner") return null;
  return <div className="access-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="access-modal invite-modal" role="dialog" aria-modal="true" aria-label="Пригласить на доску">
      <div className="access-head invite-head"><div><span className="invite-kicker">Доступ к доске</span><h2>Пригласить</h2><p>{board.title}</p></div><button onClick={onClose} aria-label="Закрыть">×</button></div>
      {remote ? <>
        <div className="invite-intro"><span>🔗</span><div><strong>Ссылка-приглашение</strong><p>Настройте права и ограничения, затем отправьте ссылку участнику. Она работает и для гостевого входа без регистрации.</p></div></div>
        <div className="share-link-settings invite-settings">
          <label><span>⏳ Срок действия</span><select value={expiry} onChange={e=>setExpiry(e.target.value as typeof expiry)}><option value="1d">1 день</option><option value="7d">7 дней</option><option value="30d">30 дней</option><option value="never">Без срока</option></select></label>
          <label><span>👥 Лимит входов</span><input type="number" min="0" max="10000" value={maxUses} onChange={e=>setMaxUses(Math.max(0,Math.min(10000,Number(e.target.value)||0)))}/><small>0 = без ограничения</small></label>
          <label><span>🔒 Пароль</span><input type="password" value={linkPassword} onChange={e=>setLinkPassword(e.target.value)} placeholder="Без пароля" minLength={4}/><small>Можно оставить пустым</small></label>
        </div>
        <div className="share-actions invite-role-cards">
          <button className="invite-role-card editor" disabled={busy} onClick={() => void create("editor")}><span>✎</span><div><strong>Редактирование</strong><small>Можно рисовать, писать и менять доску</small></div><b>Создать</b></button>
          <button className="invite-role-card viewer" disabled={busy} onClick={() => void create("viewer")}><span>👁</span><div><strong>Только просмотр</strong><small>Можно смотреть без изменения доски</small></div><b>Создать</b></button>
        </div>
        {created && <div className="share-created invite-created-full"><div className="invite-ready"><span>✓</span><div><strong>Приглашение готово</strong><small>Скопируйте ссылку и отправьте участнику</small></div></div><label><span>Ссылка на доску</span><div><input readOnly value={created.url} onFocus={e => e.target.select()} aria-label="Новая ссылка"/><button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(created.url); setNotice("Ссылка скопирована"); })}>⧉ Копировать</button></div></label>{created.presentationUrl&&<label><span>🖥️ Ссылка для презентации</span><div><input readOnly value={created.presentationUrl} onFocus={e=>e.target.select()} aria-label="Ссылка-презентация"/><button disabled={busy} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(created.presentationUrl!);setNotice("Ссылка-презентация скопирована")})}>⧉ Копировать</button></div><small>Откроется сразу в режиме показа с правами «Только просмотр».</small></label>}</div>}
        <div className="invite-section-title"><span>🔗</span><div><h3>Активные ссылки</h3><small>Ранее созданные приглашения</small></div></div>
        {links.filter(l => !l.revoked_at && (!l.expires_at || Date.parse(l.expires_at) > Date.now())).map(link => <div className="access-person invite-link-row" key={link.id}><div><strong>{BOARD_ROLE_LABELS[link.role]}</strong><span>{new Date(link.created_at).toLocaleString("ru-RU")}{link.expires_at?` · до ${new Date(link.expires_at).toLocaleString("ru-RU")}`:" · бессрочно"}{link.max_uses?` · входов ${link.use_count}/${link.max_uses}`:` · входов ${link.use_count}`}{link.protected?" · 🔒 пароль":""}</span></div><button disabled={busy} onClick={() => void run(async () => { await revokeShareLink(link.id); setLinks(current=>current.filter(item=>item.id!==link.id)); if (created?.id === link.id) setCreated(null); setNotice("Ссылка отозвана"); await reload(); })}>Отозвать</button></div>)}
        <p className="share-note">Отзыв ссылки запрещает новые входы. Уже выданный доступ можно убрать в списке участников ниже.</p>
      </> : <p>В локальном режиме приглашения работают только между аккаунтами в этом браузере. Ссылки требуют Supabase.</p>}
      <details className="invite-email-panel" open={!remote}><summary><span>✉️</span><div><strong>Пригласить по email</strong><small>Выдать доступ конкретному пользователю</small></div><b>⌄</b></summary><div className="invite-row"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email пользователя" aria-label="Email пользователя"/><select value={role} onChange={e => setRole(e.target.value as typeof role)} aria-label="Роль приглашения"><option value="viewer">Только просмотр</option><option value="editor">Редактор</option></select><button disabled={busy} onClick={() => void run(async () => { await inviteToBoard(user.id, board.id, email, role); setEmail(""); await reload(); setNotice("Приглашение отправлено"); })}>Пригласить</button></div></details>
      {notice && <div className="access-notice" role="status">{notice}</div>}
      <div className="invite-section-title members"><span>👥</span><div><h3>Участники</h3><small>Кто уже имеет доступ к доске</small></div></div>
      <div className="access-list"><div className="access-person"><div><strong>{user.name}</strong><span>{user.email}</span></div><b>Владелец</b></div>
        {access.members.map(member => <div className="access-person" key={member.userId}><div><strong>{member.user?.name || "Пользователь"}</strong><span>{member.user?.email || "Участник доски"}</span></div><select disabled={busy} value={member.role} aria-label="Роль участника" onChange={e => { const value = e.target.value as typeof role; void run(async () => { await changeMemberRole(user.id, board.id, member.userId, value); await reload(); }); }}><option value="viewer">Просмотр</option><option value="editor">Редактор</option></select><button disabled={busy} onClick={() => void run(async () => { await removeMember(user.id, board.id, member.userId); await reload(); })}>Удалить</button></div>)}
        {access.invites.map(invite => <div className="access-person" key={invite.id}><div><strong>{invite.email}</strong><span>Ожидает входа</span></div><b>{BOARD_ROLE_LABELS[invite.role]}</b><button disabled={busy} onClick={() => void run(async () => { await revokeInvitation(user.id, board.id, invite.id); await reload(); })}>Отменить</button></div>)}
      </div>
    </section>
  </div>;
}
