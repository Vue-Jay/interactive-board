import { isRemoteBackendEnabled,remoteRequest } from "./backend";
export type NotificationKind="assignment"|"submission"|"review"|"lesson"|"material"|"comment";
export type AppNotification={id:string;kind:NotificationKind;title:string;body:string;href:string;createdAt:string;readAt:string|null};
const CACHE_MS=15_000;
let cache:{at:number;items:AppNotification[]}|null=null;
let inFlight:Promise<AppNotification[]>|null=null;
export function clearNotificationCache(){cache=null}
export async function listNotifications():Promise<AppNotification[]>{
 if(!isRemoteBackendEnabled())return [];
 if(cache&&Date.now()-cache.at<CACHE_MS)return cache.items;
 if(inFlight)return inFlight;
 inFlight=(async()=>{const r=await remoteRequest<any[]>("/rest/v1/notifications?select=id,kind,title,body,href,created_at,read_at&order=created_at.desc&limit=100");const items=r.map(x=>({id:x.id,kind:x.kind,title:x.title,body:x.body||"",href:x.href||"",createdAt:x.created_at,readAt:x.read_at||null}));cache={at:Date.now(),items};return items})().finally(()=>{inFlight=null});
 return inFlight;
}
export async function markNotificationRead(id:string){if(!isRemoteBackendEnabled())return;const now=new Date().toISOString();await remoteRequest(`/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({read_at:now})});if(cache)cache={at:Date.now(),items:cache.items.map(x=>x.id===id?{...x,readAt:x.readAt||now}:x)}}
export async function markAllNotificationsRead(){if(!isRemoteBackendEnabled())return;await remoteRequest("/rest/v1/rpc/mark_all_notifications_read",{method:"POST",body:"{}"});const now=new Date().toISOString();if(cache)cache={at:Date.now(),items:cache.items.map(x=>x.readAt?x:{...x,readAt:now})}}
