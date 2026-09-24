import { claimRemoteInvitations, getRemoteSession, isRemoteBackendEnabled, signInRemote, signOutRemote, signUpRemote } from "./backend";

export type BoardRole = "owner" | "editor" | "viewer";
export const BOARD_ROLE_LABELS: Record<BoardRole, string> = { owner:"Владелец", editor:"Редактор", viewer:"Просмотр" };
export type AuthUser = { id:string; name:string; email:string; createdAt:string };
type StoredUser = AuthUser & { passwordHash:string; passwordSalt:string };
type Session = { userId:string; createdAt:string };
const USERS_KEY="lesson-board.auth.users.v1"; const SESSION_KEY="lesson-board.auth.session.v1";
const normalizeEmail=(v:string)=>v.trim().toLowerCase();
const bytesToHex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
const randomSalt=()=>{const b=new Uint8Array(16);crypto.getRandomValues(b);return bytesToHex(b)};
const hashPassword=async(p:string,s:string)=>bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${s}:${p}`))));
const loadUsers=():StoredUser[]=>{try{const v=JSON.parse(localStorage.getItem(USERS_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return []}};
const saveUsers=(v:StoredUser[])=>localStorage.setItem(USERS_KEY,JSON.stringify(v));
const saveSession=(id:string)=>localStorage.setItem(SESSION_KEY,JSON.stringify({userId:id,createdAt:new Date().toISOString()} satisfies Session));
const publicUser=({passwordHash:_h,passwordSalt:_s,...u}:StoredUser):AuthUser=>u;
const remoteUser=(s:Awaited<ReturnType<typeof getRemoteSession>>):AuthUser|null=>{
 if(!s)return null; const meta=s.user.user_metadata||{}; const name=String(meta.display_name||meta.full_name||s.user.email?.split("@")[0]||"Пользователь");
 return {id:s.user.id,name,email:s.user.email||"",createdAt:s.user.created_at||new Date().toISOString()};
};
export const getCurrentUser=async():Promise<AuthUser|null>=>{
 if(isRemoteBackendEnabled()) return remoteUser(await getRemoteSession());
 try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const id=JSON.parse(raw)?.userId;const u=loadUsers().find(x=>x.id===id);return u?publicUser(u):null}catch{return null}
};
export const registerUser=async(input:{name:string;email:string;password:string}):Promise<AuthUser>=>{
 const name=input.name.trim(),email=normalizeEmail(input.email),password=input.password;
 if(name.length<2)throw new Error("Введите имя не короче 2 символов"); if(!/^\S+@\S+\.\S+$/.test(email))throw new Error("Введите корректный email"); if(password.length<6)throw new Error("Пароль должен содержать минимум 6 символов");
 if(isRemoteBackendEnabled()){const s=await signUpRemote(email,password,name);await claimRemoteInvitations();return remoteUser(s)!}
 const users=loadUsers();if(users.some(u=>u.email===email))throw new Error("Пользователь с таким email уже зарегистрирован");const salt=randomSalt();const user:StoredUser={id:crypto.randomUUID(),name,email,createdAt:new Date().toISOString(),passwordHash:await hashPassword(password,salt),passwordSalt:salt};saveUsers([...users,user]);saveSession(user.id);return publicUser(user)
};
export const loginUser=async(input:{email:string;password:string}):Promise<AuthUser>=>{
 const email=normalizeEmail(input.email);
 if(isRemoteBackendEnabled()){const s=await signInRemote(email,input.password);await claimRemoteInvitations();return remoteUser(s)!}
 const u=loadUsers().find(x=>x.email===email);if(!u||await hashPassword(input.password,u.passwordSalt)!==u.passwordHash)throw new Error("Неверный email или пароль");saveSession(u.id);return publicUser(u)
};
export const logoutUser=async()=>{if(isRemoteBackendEnabled())await signOutRemote();else localStorage.removeItem(SESSION_KEY)};
export const getUserById=(id:string):AuthUser|null=>{const u=loadUsers().find(x=>x.id===id);return u?publicUser(u):null};
export const getUserByEmail=(email:string):AuthUser|null=>{const e=normalizeEmail(email);const u=loadUsers().find(x=>x.email===e);return u?publicUser(u):null};
export { isRemoteBackendEnabled } from "./backend";
