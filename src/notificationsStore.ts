import { isRemoteBackendEnabled,remoteRequest } from "./backend";
export type NotificationKind="assignment"|"submission"|"review"|"lesson"|"material";
export type AppNotification={id:string;kind:NotificationKind;title:string;body:string;href:string;createdAt:string;readAt:string|null};
export async function listNotifications():Promise<AppNotification[]>{if(!isRemoteBackendEnabled())return [];const r=await remoteRequest<any[]>("/rest/v1/notifications?select=id,kind,title,body,href,created_at,read_at&order=created_at.desc&limit=100");return r.map(x=>({id:x.id,kind:x.kind,title:x.title,body:x.body||"",href:x.href||"",createdAt:x.created_at,readAt:x.read_at||null}))}
export async function markNotificationRead(id:string){if(!isRemoteBackendEnabled())return;await remoteRequest(`/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({read_at:new Date().toISOString()})})}
export async function markAllNotificationsRead(){if(!isRemoteBackendEnabled())return;await remoteRequest("/rest/v1/rpc/mark_all_notifications_read",{method:"POST",body:"{}"})}
