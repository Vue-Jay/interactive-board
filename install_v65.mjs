import fs from "node:fs";
for(const p of ["src/backend.ts","src/authStore.ts","src/AuthScreen.tsx","src/App.css"])if(!fs.existsSync(p)){console.error("v65: не найден "+p);process.exit(1)}
let b=fs.readFileSync("src/backend.ts","utf8");
if(!b.includes("signInAnonymousRemote"))b=b.replace('export const signInRemote = async (email: string, password: string) => {','export const signInAnonymousRemote = async () => {\\n  const response = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ data: { display_name: "Гость", is_guest: true } }) });\\n  if (!response.ok) throw new Error(await errorMessage(response));\\n  const data = await response.json();\\n  if (!data.access_token) throw new Error("Анонимный вход отключён в настройках Supabase.");\\n  const session = normalizeSession(data); saveSession(session); return session;\\n};\\n\\nexport const signInRemote = async (email: string, password: string) => {');
fs.writeFileSync("src/backend.ts",b);
let a=fs.readFileSync("src/authStore.ts","utf8");
a=a.replace('signInRemote, signOutRemote, signUpRemote','signInRemote, signInAnonymousRemote, signOutRemote, signUpRemote');
a=a.replace('export type AuthUser = { id:string; name:string; email:string; createdAt:string };','export type AuthUser = { id:string; name:string; email:string; createdAt:string; isGuest?:boolean };');
a=a.replace('return {id:s.user.id,name,email:s.user.email||"",createdAt:s.user.created_at||new Date().toISOString()};','return {id:s.user.id,name,email:s.user.email||"",createdAt:s.user.created_at||new Date().toISOString(),isGuest:Boolean(meta.is_guest)||!s.user.email};');
if(!a.includes("loginGuest"))a=a.replace('export const logoutUser=async()=>','export const loginGuest=async():Promise<AuthUser>=>{ if(!isRemoteBackendEnabled())throw new Error("Гостевой вход доступен только при серверной синхронизации."); const s=await signInAnonymousRemote(); return remoteUser(s)!; };\\nexport const logoutUser=async()=>');
fs.writeFileSync("src/authStore.ts",a);
let au=fs.readFileSync("src/AuthScreen.tsx","utf8");
au=au.replace('loginUser, registerUser','loginUser, loginGuest, registerUser');
au=au.replace('Войдите или зарегистрируйтесь, чтобы открыть доску по приглашению.','Откройте доску по приглашению: войдите в аккаунт или продолжите без регистрации.');
const needle=`          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Подождите…" : mode === "register" ? "Зарегистрироваться" : "Войти"}
          </button>`;
const extra=needle+`
          {joining && <><div className="auth-or"><span>или</span></div><button className="auth-guest" type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setError("");try{onAuthenticated(await loginGuest())}catch(value){setError(value instanceof Error?value.message:"Не удалось войти как гость")}finally{setBusy(false)}}}>Продолжить как гость</button><p className="auth-guest-note">Без регистрации. Доступ действует в этом браузере и определяется ссылкой владельца.</p></>}`;
if(!au.includes('className="auth-guest"'))au=au.replace(needle,extra);
fs.writeFileSync("src/AuthScreen.tsx",au);
let c=fs.readFileSync("src/App.css","utf8");
if(!c.includes("/* v65 · guest access */"))c+='\\n/* v65 · guest access */\\n.auth-or{display:flex;align-items:center;gap:10px;color:#9a9daa;font-size:12px}.auth-or:before,.auth-or:after{content:"";height:1px;background:#e3e4e9;flex:1}.auth-guest{width:100%;min-height:42px;border:1px solid #cfd0f1;border-radius:10px;background:#f4f4ff;color:#4e50bd;font-weight:700;cursor:pointer}.auth-guest:hover{background:#ebebff}.auth-guest:disabled{opacity:.55;cursor:default}.auth-guest-note{margin:0;text-align:center;color:#888b96;font-size:11px;line-height:1.4}\\n';
fs.writeFileSync("src/App.css",c);
console.log("v65 установлен. SQL не требуется. В Supabase включите Anonymous Sign-Ins, затем npm run build");
