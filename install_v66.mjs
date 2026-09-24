import fs from "node:fs";
for(const p of ["src/backend.ts","src/authStore.ts","src/AuthScreen.tsx","src/ShareDialog.tsx","src/shareLinks.ts","src/App.css"])if(!fs.existsSync(p)){console.error("v66: не найден "+p);process.exit(1)}

let b=fs.readFileSync("src/backend.ts","utf8");
b=b.replace('export const signInAnonymousRemote = async () => {','export const signInAnonymousRemote = async (name = "Гость") => {');
b=b.replace('body: JSON.stringify({ data: { display_name: "Гость", is_guest: true } })','body: JSON.stringify({ data: { display_name: name.trim() || "Гость", is_guest: true } })');
fs.writeFileSync("src/backend.ts",b);

let a=fs.readFileSync("src/authStore.ts","utf8");
a=a.replace('export const loginGuest=async():Promise<AuthUser>=>{ if(!isRemoteBackendEnabled())throw new Error("Гостевой вход доступен только при серверной синхронизации."); const s=await signInAnonymousRemote(); return remoteUser(s)!; };',
`export const loginGuest=async(name:string):Promise<AuthUser>=>{
 const guestName=name.trim();
 if(guestName.length<2)throw new Error("Введите имя гостя не короче 2 символов");
 if(guestName.length>60)throw new Error("Имя гостя слишком длинное");
 if(!isRemoteBackendEnabled())throw new Error("Гостевой вход доступен только при серверной синхронизации.");
 const s=await signInAnonymousRemote(guestName);
 return remoteUser(s)!;
};`);
fs.writeFileSync("src/authStore.ts",a);

let au=fs.readFileSync("src/AuthScreen.tsx","utf8");
au=au.replace('  const [error, setError] = useState("");','  const [error, setError] = useState("");\n  const [guestName, setGuestName] = useState("");');
const old=/<div className="auth-or"><span>или<\/span><\/div><button className="auth-guest"[\s\S]*?<p className="auth-guest-note">[\s\S]*?<\/p>/;
const repl=`<div className="auth-or"><span>или</span></div><label className="auth-field"><span>Ваше имя на доске</span><input value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Например, Анна" maxLength={60}/></label><button className="auth-guest" type="button" disabled={busy||guestName.trim().length<2} onClick={async()=>{if(busy)return;setBusy(true);setError("");try{onAuthenticated(await loginGuest(guestName))}catch(value){setError(value instanceof Error?value.message:"Не удалось войти как гость")}finally{setBusy(false)}}}>Продолжить как гость</button><p className="auth-guest-note">Аккаунт создавать не нужно. Это имя увидят участники доски.</p>`;
au=au.replace(old,repl);
fs.writeFileSync("src/AuthScreen.tsx",au);

let s=fs.readFileSync("src/shareLinks.ts","utf8");
s=s.replace('  use_count: number;\n};','  use_count: number;\n  protected: boolean;\n};');
s=s.replace('  useCount: number;\n};','  useCount: number;\n  protected: boolean;\n};');
s=s.replace('  use_count: Number(row.use_count || 0),\n});','  use_count: Number(row.use_count || 0),\n  protected: Boolean(row.protected),\n});');
s=s.replace('options?: { expiresAt?: string | null; maxUses?: number | null }','options?: { expiresAt?: string | null; maxUses?: number | null; password?: string | null }');
s=s.replace('p_max_uses: options?.maxUses || null })','p_max_uses: options?.maxUses || null, p_password: options?.password?.trim() || null })');
s=s.replace('export async function redeemShareLink(token: string): Promise<{','export async function redeemShareLink(token: string, password?: string): Promise<{');
s=s.replace('body: JSON.stringify({ p_token: token }),','body: JSON.stringify({ p_token: token, p_password: password || null }),');
s=s.replace('    useCount: row.use_count,\n    token: row.token,','    useCount: row.use_count,\n    protected: row.protected,\n    token: row.token,');
s=s.replace('    useCount: row.use_count,\n  }));','    useCount: row.use_count,\n    protected: row.protected,\n  }));');
fs.writeFileSync("src/shareLinks.ts",s);

let d=fs.readFileSync("src/ShareDialog.tsx","utf8");
d=d.replace('  const [maxUses, setMaxUses] = useState<number>(0);','  const [maxUses, setMaxUses] = useState<number>(0);\n  const [linkPassword, setLinkPassword] = useState("");');
d=d.replace('const link = await createShareLink(board.id, linkRole,{expiresAt,maxUses:maxUses>0?maxUses:null});','const link = await createShareLink(board.id, linkRole,{expiresAt,maxUses:maxUses>0?maxUses:null,password:linkPassword.trim()||null});');
d=d.replace('</label></div><div className="share-actions">','</label><label>Пароль ссылки<input type="password" value={linkPassword} onChange={e=>setLinkPassword(e.target.value)} placeholder="Необязательно" minLength={4}/><small>Пусто = без пароля</small></label></div><div className="share-actions">');
d=d.replace('` · входов ${link.use_count}`}</span>','` · входов ${link.use_count}`}{link.protected?" · 🔒 пароль":""}</span>');
fs.writeFileSync("src/ShareDialog.tsx",d);

let c=fs.readFileSync("src/App.css","utf8");
c=c.replace('grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.share-link-settings','grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}.share-link-settings');
fs.writeFileSync("src/App.css",c);
console.log("v66 установлен. Выполните supabase/v66_share_link_password.sql, затем npm run build");
