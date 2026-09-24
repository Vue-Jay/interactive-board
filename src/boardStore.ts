import { STORAGE_KEY } from "./boardModel";
import { getUserByEmail, getUserById, type AuthUser, type BoardRole } from "./authStore";
import { claimRemoteInvitations, deleteRemoteStorageObjects, isRemoteBackendEnabled, listRemoteStorageObjects, remoteRequest } from "./backend";

export type BoardSummary={id:string;title:string;ownerId:string;role:BoardRole;createdAt:string;updatedAt:string;deletedAt?:string|null;purgeAfter?:string|null;purgeQueued?:boolean;purgeAssetCount?:number};
export type BoardMember={boardId:string;userId:string;role:Exclude<BoardRole,"owner">;addedAt:string};
export type BoardInvitation={id:string;boardId:string;email:string;role:Exclude<BoardRole,"owner">;createdAt:string};
export type BoardAccessMember=BoardMember&{user:AuthUser|null};

const BOARDS_KEY="lesson-board.boards.v1",MEMBERS_KEY="lesson-board.board-members.v1",INVITES_KEY="lesson-board.board-invites.v1";
const read=<T,>(k:string):T[]=>{try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return []}};
const write=(k:string,v:unknown)=>localStorage.setItem(k,JSON.stringify(v));
const boards=()=>read<BoardSummary>(BOARDS_KEY),members=()=>read<BoardMember>(MEMBERS_KEY),invites=()=>read<BoardInvitation>(INVITES_KEY);const norm=(s:string)=>s.trim().toLowerCase();
export const boardStorageKey=(id:string)=>`${STORAGE_KEY}.board.${id}`;

const localRole=(u:string,b:string):BoardRole|null=>{const x=boards().find(v=>v.id===b);if(!x)return null;if(x.ownerId===u)return"owner";return members().find(m=>m.boardId===b&&m.userId===u)?.role??null};
const claimLocal=(user:AuthUser)=>{const matched=invites().filter(i=>norm(i.email)===norm(user.email));if(!matched.length)return;const next=members();for(const i of matched)if(!next.some(m=>m.boardId===i.boardId&&m.userId===user.id))next.push({boardId:i.boardId,userId:user.id,role:i.role,addedAt:new Date().toISOString()});write(MEMBERS_KEY,next);write(INVITES_KEY,invites().filter(i=>!matched.some(x=>x.id===i.id)))};

const rowToBoard=(row:any,role:BoardRole):BoardSummary=>({id:row.id,title:row.title,ownerId:row.owner_id,role,createdAt:row.created_at,updatedAt:row.updated_at,deletedAt:row.deleted_at??null,purgeAfter:row.purge_after??null,purgeQueued:!!row.purge_queued,purgeAssetCount:Number(row.purge_asset_count??0)});

export const getUserBoards=async(user:AuthUser):Promise<BoardSummary[]>=>{
 if(isRemoteBackendEnabled()){
   await claimRemoteInvitations();
   const [bs,ms]=await Promise.all([
     remoteRequest<any[]>("/rest/v1/boards?deleted_at=is.null&select=id,title,owner_id,created_at,updated_at,deleted_at&order=updated_at.desc"),
     remoteRequest<any[]>(`/rest/v1/board_members?select=board_id,role&user_id=eq.${encodeURIComponent(user.id)}`),
   ]);
   const roleMap=new Map(ms.map(m=>[m.board_id,m.role as BoardRole]));
   return bs.map(row=>rowToBoard(row,row.owner_id===user.id?"owner":roleMap.get(row.id)||"viewer"));
 }
 claimLocal(user);const ms=members();const out:BoardSummary[]=[];for(const b of boards()){if(b.ownerId===user.id)out.push({...b,role:"owner"});else{const m=ms.find(x=>x.boardId===b.id&&x.userId===user.id);if(m)out.push({...b,role:m.role})}}return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
};

export const ensureUserBoards=async(user:AuthUser)=>{const list=await getUserBoards(user);if(list.length)return list;return [await createBoard(user,"Моя доска",true)]};
// Resolve deep links through RLS, never fall back to a cached inaccessible board.
export const getBoardForUser=async(user:AuthUser,id:string):Promise<BoardSummary|null>=>{
 if(!isRemoteBackendEnabled())return (await getUserBoards(user)).find(b=>b.id===id)??null;
 const rows=await remoteRequest<any[]>(`/rest/v1/boards?id=eq.${encodeURIComponent(id)}&deleted_at=is.null&select=id,title,owner_id,created_at,updated_at,deleted_at&limit=1`);
 if(!rows[0])return null;
 if(rows[0].owner_id===user.id)return rowToBoard(rows[0],"owner");
 const members=await remoteRequest<any[]>(`/rest/v1/board_members?board_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`);
 return members[0]?rowToBoard(rows[0],members[0].role):null;
};
export const createBoard=async(user:AuthUser,title="Новая доска",migrateLegacy=false):Promise<BoardSummary>=>{
 const clean=title.trim()||"Новая доска";
 if(isRemoteBackendEnabled()){
   const row=await remoteRequest<any>("/rest/v1/rpc/create_board",{method:"POST",body:JSON.stringify({p_title:clean})});
   const b=rowToBoard(row,"owner"); if(migrateLegacy){const legacy=localStorage.getItem(STORAGE_KEY);if(legacy)localStorage.setItem(boardStorageKey(b.id),legacy)} return b;
 }
 const now=new Date().toISOString();const b:BoardSummary={id:crypto.randomUUID(),title:clean,ownerId:user.id,role:"owner",createdAt:now,updatedAt:now};write(BOARDS_KEY,[...boards(),b]);if(migrateLegacy){const legacy=localStorage.getItem(STORAGE_KEY);if(legacy)localStorage.setItem(boardStorageKey(b.id),legacy)}return b;
};
export const renameBoard=async(u:string,id:string,title:string)=>{const clean=title.trim();if(!clean)return null;if(isRemoteBackendEnabled()){const rows=await remoteRequest<any[]>(`/rest/v1/boards?id=eq.${encodeURIComponent(id)}&select=id,title,owner_id,created_at,updated_at`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({title:clean})});return rows[0]?rowToBoard(rows[0],"owner"):null}if(localRole(u,id)!=="owner")return null;let out:BoardSummary|null=null;write(BOARDS_KEY,boards().map(b=>b.id===id?(out={...b,title:clean,updatedAt:new Date().toISOString()}):b));return out};
export const touchBoard=async(u:string,id:string,title?:string)=>{if(isRemoteBackendEnabled()){const body: Record<string, unknown> = { updated_at: new Date().toISOString() };if(title?.trim())body.title=title.trim();const rows=await remoteRequest<any[]>(`/rest/v1/boards?id=eq.${encodeURIComponent(id)}&select=id,title,owner_id,created_at,updated_at`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!rows[0])return null;const role=rows[0].owner_id===u?"owner":(await remoteRequest<any[]>(`/rest/v1/board_members?select=role&board_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(u)}&limit=1`))[0]?.role||"viewer";return rowToBoard(rows[0],role)}const r=localRole(u,id);if(r!=="owner"&&r!=="editor")return null;write(BOARDS_KEY,boards().map(b=>b.id===id?({...b,title:title?.trim()||b.title,updatedAt:new Date().toISOString()}):b));const updated = boards().find(b=>b.id===id);return updated?{...updated,role:r}:null};
export const deleteBoard=async(u:string,id:string)=>{if(isRemoteBackendEnabled()){await remoteRequest("/rest/v1/rpc/trash_board",{method:"POST",body:JSON.stringify({p_board_id:id})});return true}if(localRole(u,id)!=="owner")return false;write(BOARDS_KEY,boards().filter(b=>b.id!==id));write(MEMBERS_KEY,members().filter(m=>m.boardId!==id));write(INVITES_KEY,invites().filter(i=>i.boardId!==id));[boardStorageKey(id),`${boardStorageKey(id)}.before-import`,`${boardStorageKey(id)}.damaged-backup`].forEach(k=>localStorage.removeItem(k));return true};

export const inviteToBoard=async(ownerId:string,boardId:string,email:string,role:Exclude<BoardRole,"owner">)=>{
 const e=norm(email);if(!/^\S+@\S+\.\S+$/.test(e))throw new Error("Введите корректный email");
 if(isRemoteBackendEnabled()){const result=await remoteRequest<any>("/rest/v1/rpc/invite_board_member",{method:"POST",body:JSON.stringify({p_board_id:boardId,p_email:e,p_role:role})});return result?.kind==="member"?"member" as const:"invite" as const}
 if(localRole(ownerId,boardId)!=="owner")throw new Error("Недостаточно прав");const existing=getUserByEmail(e);if(existing){if(existing.id===ownerId)throw new Error("Вы уже владелец этой доски");const ms=members().filter(m=>!(m.boardId===boardId&&m.userId===existing.id));ms.push({boardId,userId:existing.id,role,addedAt:new Date().toISOString()});write(MEMBERS_KEY,ms);return"member" as const}const inv=invites().filter(i=>!(i.boardId===boardId&&norm(i.email)===e));inv.push({id:crypto.randomUUID(),boardId,email:e,role,createdAt:new Date().toISOString()});write(INVITES_KEY,inv);return"invite" as const;
};
export const getBoardAccess=async(ownerId:string,boardId:string):Promise<{members:BoardAccessMember[];invites:BoardInvitation[]} >=>{
 if(isRemoteBackendEnabled()){const data=await remoteRequest<any>("/rest/v1/rpc/get_board_access",{method:"POST",body:JSON.stringify({p_board_id:boardId})});return {members:(data?.members||[]).map((m:any)=>({boardId,userId:m.user_id,role:m.role,addedAt:m.added_at,user:{id:m.user_id,name:m.name||"Пользователь",email:m.email||"",createdAt:m.created_at||m.added_at}})),invites:(data?.invites||[]).map((i:any)=>({id:i.id,boardId,email:i.email,role:i.role,createdAt:i.created_at}))}}
 if(localRole(ownerId,boardId)!=="owner")return{members:[],invites:[]};return{members:members().filter(m=>m.boardId===boardId).map(m=>({...m,user:getUserById(m.userId)})),invites:invites().filter(i=>i.boardId===boardId)};
};
export const changeMemberRole=async(o:string,b:string,u:string,role:Exclude<BoardRole,"owner">)=>{if(isRemoteBackendEnabled()){await remoteRequest(`/rest/v1/board_members?board_id=eq.${encodeURIComponent(b)}&user_id=eq.${encodeURIComponent(u)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({role})});return true}if(localRole(o,b)!=="owner")return false;write(MEMBERS_KEY,members().map(m=>m.boardId===b&&m.userId===u?{...m,role}:m));return true};
export const removeMember=async(o:string,b:string,u:string)=>{if(isRemoteBackendEnabled()){await remoteRequest(`/rest/v1/board_members?board_id=eq.${encodeURIComponent(b)}&user_id=eq.${encodeURIComponent(u)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});return true}if(localRole(o,b)!=="owner")return false;write(MEMBERS_KEY,members().filter(m=>!(m.boardId===b&&m.userId===u)));return true};
export const revokeInvitation=async(o:string,b:string,id:string)=>{if(isRemoteBackendEnabled()){await remoteRequest(`/rest/v1/board_invites?id=eq.${encodeURIComponent(id)}&board_id=eq.${encodeURIComponent(b)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});return true}if(localRole(o,b)!=="owner")return false;write(INVITES_KEY,invites().filter(i=>!(i.boardId===b&&i.id===id)));return true};

export const getTrashedBoards=async(_user:AuthUser):Promise<BoardSummary[]>=>{
 if(!isRemoteBackendEnabled())return[];
 const rows=await remoteRequest<any[]>("/rest/v1/rpc/list_my_trashed_boards",{method:"POST",body:"{}"});
 return rows.map(row=>rowToBoard(row,"owner"));
};
export const restoreBoard=async(id:string)=>{await remoteRequest("/rest/v1/rpc/restore_board",{method:"POST",body:JSON.stringify({p_board_id:id})});return true};
export const deleteBoardForever=async(id:string,confirmation:string)=>{
 const prep=await remoteRequest<{board_id:string;asset_count:number}>("/rest/v1/rpc/prepare_board_permanent_delete",{method:"POST",body:JSON.stringify({p_board_id:id,p_confirmation:confirmation})});
 let deleted=0;
 if((prep.asset_count||0)>0){
   const prefix=`${id}/`;
   const objects=await listRemoteStorageObjects("board-assets",prefix);
   const paths=objects.map(item=>prefix+item.name);
   for(let i=0;i<paths.length;i+=100){const batch=paths.slice(i,i+100);await deleteRemoteStorageObjects("board-assets",batch);deleted+=batch.length}
 }
 await remoteRequest("/rest/v1/rpc/finish_board_permanent_delete",{method:"POST",body:JSON.stringify({p_board_id:id,p_confirmation:confirmation})});
 return {deletedAssets:deleted};
};
