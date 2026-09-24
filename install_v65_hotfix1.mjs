import fs from "node:fs";
const files=["src/backend.ts","src/authStore.ts","src/AuthScreen.tsx","src/App.css"];
for(const p of files)if(!fs.existsSync(p)){console.error("v65 hotfix: не найден "+p);process.exit(1)}

let b=fs.readFileSync("src/backend.ts","utf8");
b=b.replace(/\\n/g,"\n");
if(!b.includes("export const signInAnonymousRemote")) {
  const anchor='export const signInRemote = async (email: string, password: string) => {';
  if(!b.includes(anchor)){console.error("v65 hotfix: не найдена точка вставки signInRemote");process.exit(1)}
  b=b.replace(anchor,`export const signInAnonymousRemote = async () => {
  const response = await fetch(\`\${url}/auth/v1/signup\`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ data: { display_name: "Гость", is_guest: true } }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const data = await response.json();
  if (!data.access_token) throw new Error("Анонимный вход отключён в настройках Supabase.");
  const session = normalizeSession(data);
  saveSession(session);
  return session;
};

${anchor}`);
}
fs.writeFileSync("src/backend.ts",b);

let a=fs.readFileSync("src/authStore.ts","utf8");
a=a.replace(/\\n/g,"\n");
a=a.replace('signInRemote, signOutRemote, signUpRemote','signInRemote, signInAnonymousRemote, signOutRemote, signUpRemote');
a=a.replace('export type AuthUser = { id:string; name:string; email:string; createdAt:string };','export type AuthUser = { id:string; name:string; email:string; createdAt:string; isGuest?:boolean };');
a=a.replace('return {id:s.user.id,name,email:s.user.email||"",createdAt:s.user.created_at||new Date().toISOString()};','return {id:s.user.id,name,email:s.user.email||"",createdAt:s.user.created_at||new Date().toISOString(),isGuest:Boolean(meta.is_guest)||!s.user.email};');
if(!a.includes("export const loginGuest")) {
  const anchor='export const logoutUser=async()=>';
  if(!a.includes(anchor)){console.error("v65 hotfix: не найдена точка вставки logoutUser");process.exit(1)}
  a=a.replace(anchor,`export const loginGuest=async():Promise<AuthUser>=>{
 if(!isRemoteBackendEnabled())throw new Error("Гостевой вход доступен только при серверной синхронизации.");
 const s=await signInAnonymousRemote();
 return remoteUser(s)!;
};
${anchor}`);
}
fs.writeFileSync("src/authStore.ts",a);

let au=fs.readFileSync("src/AuthScreen.tsx","utf8");
au=au.replace('import { loginUser, registerUser, type AuthUser } from "./authStore";','import { loginGuest, loginUser, registerUser, type AuthUser } from "./authStore";');
au=au.replace('Войдите или зарегистрируйтесь, чтобы открыть доску по приглашению.','Откройте доску по приглашению: войдите в аккаунт или продолжите без регистрации.');
const needle=`          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Подождите…" : mode === "register" ? "Зарегистрироваться" : "Войти"}
          </button>`;
if(!au.includes('className="auth-guest"')) {
 if(!au.includes(needle)){console.error("v65 hotfix: не найдена кнопка входа");process.exit(1)}
 au=au.replace(needle,needle+`
          {joining && <>
            <div className="auth-or"><span>или</span></div>
            <button className="auth-guest" type="button" disabled={busy} onClick={async()=>{
              if(busy)return;
              setBusy(true); setError("");
              try { onAuthenticated(await loginGuest()); }
              catch(value){ setError(value instanceof Error ? value.message : "Не удалось войти как гость"); }
              finally { setBusy(false); }
            }}>Продолжить как гость</button>
            <p className="auth-guest-note">Без регистрации. Доступ определяется ссылкой владельца.</p>
          </>}`);
}
fs.writeFileSync("src/AuthScreen.tsx",au);

let c=fs.readFileSync("src/App.css","utf8");
c=c.replace(/\\n\/\* v65 · guest access \*\//g,"\n/* v65 · guest access */").replace(/\\n/g,"\n");
if(!c.includes("/* v65 · guest access */"))c+=`
/* v65 · guest access */
.auth-or{display:flex;align-items:center;gap:10px;color:#9a9daa;font-size:12px}.auth-or:before,.auth-or:after{content:"";height:1px;background:#e3e4e9;flex:1}.auth-guest{width:100%;min-height:42px;border:1px solid #cfd0f1;border-radius:10px;background:#f4f4ff;color:#4e50bd;font-weight:700;cursor:pointer}.auth-guest:hover{background:#ebebff}.auth-guest:disabled{opacity:.55;cursor:default}.auth-guest-note{margin:0;text-align:center;color:#888b96;font-size:11px;line-height:1.4}
`;
fs.writeFileSync("src/App.css",c);
console.log("v65 hotfix установлен. Теперь npm run build");
