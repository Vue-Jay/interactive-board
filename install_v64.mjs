import fs from "node:fs";
for(const p of ["src/shareLinks.ts","src/ShareDialog.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v64: не найден "+p);process.exit(1)}
let s=fs.readFileSync("src/shareLinks.ts","utf8");
s=s.replace('  revoked_at: string | null;\n};','  revoked_at: string | null;\n  max_uses: number | null;\n  use_count: number;\n};');
s=s.replace('  revokedAt: string | null;\n};','  revokedAt: string | null;\n  maxUses: number | null;\n  useCount: number;\n};');
s=s.replace('  revoked_at: row.revoked_at ?? null,\n});','  revoked_at: row.revoked_at ?? null,\n  max_uses: row.max_uses == null ? null : Number(row.max_uses),\n  use_count: Number(row.use_count || 0),\n});');
s=s.replace('export async function createShareLink(boardId: string, role: ShareRole): Promise<CreatedShareLink> {','export async function createShareLink(boardId: string, role: ShareRole, options?: { expiresAt?: string | null; maxUses?: number | null }): Promise<CreatedShareLink> {');
s=s.replace('body: JSON.stringify({ p_board_id: boardId, p_role: role }),','body: JSON.stringify({ p_board_id: boardId, p_role: role, p_expires_at: options?.expiresAt || null, p_max_uses: options?.maxUses || null }),');
s=s.replace('    revokedAt: row.revoked_at,\n    token: row.token,','    revokedAt: row.revoked_at,\n    maxUses: row.max_uses,\n    useCount: row.use_count,\n    token: row.token,');
s=s.replace('    revokedAt: row.revoked_at,\n  }));','    revokedAt: row.revoked_at,\n    maxUses: row.max_uses,\n    useCount: row.use_count,\n  }));');
fs.writeFileSync("src/shareLinks.ts",s);

let d=fs.readFileSync("src/ShareDialog.tsx","utf8");
d=d.replace('  const [busy, setBusy] = useState(false);','  const [busy, setBusy] = useState(false);\n  const [expiry, setExpiry] = useState<"never"|"1d"|"7d"|"30d">("7d");\n  const [maxUses, setMaxUses] = useState<number>(0);');
d=d.replace('    const link = await createShareLink(board.id, linkRole);','    const expiresAt=expiry==="never"?null:new Date(Date.now()+({"1d":1,"7d":7,"30d":30}[expiry])*86400000).toISOString();\n    const link = await createShareLink(board.id, linkRole,{expiresAt,maxUses:maxUses>0?maxUses:null});');
d=d.replace('<div className="share-actions"><button disabled={busy}', '<div className="share-link-settings"><label>Срок действия<select value={expiry} onChange={e=>setExpiry(e.target.value as typeof expiry)}><option value="1d">1 день</option><option value="7d">7 дней</option><option value="30d">30 дней</option><option value="never">Без срока</option></select></label><label>Лимит входов<input type="number" min="0" max="10000" value={maxUses} onChange={e=>setMaxUses(Math.max(0,Math.min(10000,Number(e.target.value)||0)))}/><small>0 = без ограничения</small></label></div><div className="share-actions"><button disabled={busy}');
d=d.replace('<span>{new Date(link.created_at).toLocaleString("ru-RU")}</span>', '<span>{new Date(link.created_at).toLocaleString("ru-RU")}{link.expires_at?` · до ${new Date(link.expires_at).toLocaleString("ru-RU")}`:" · бессрочно"}{link.max_uses?` · входов ${link.use_count}/${link.max_uses}`:` · входов ${link.use_count}`}</span>');
fs.writeFileSync("src/ShareDialog.tsx",d);

let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v64 · share controls */"))c+='\n/* v64 · share controls */\n.share-link-settings{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.share-link-settings label{display:grid;gap:5px;font-size:12px;font-weight:650}.share-link-settings select,.share-link-settings input{min-height:36px;padding:6px 9px;border:1px solid #dfe0e7;border-radius:8px;background:#fff}.share-link-settings small{font-weight:400;color:#858895}@media(max-width:620px){.share-link-settings{grid-template-columns:1fr}}\n';
fs.writeFileSync("src/App.css",c);
console.log("v64 установлен. Теперь выполните SQL из v64_share_links.sql в Supabase SQL Editor, затем npm run build");
