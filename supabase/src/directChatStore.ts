import { isRemoteBackendEnabled, remoteRequest } from "./backend";

export type DirectChatConversation={
  id:string;other_user_id:string;other_name:string;other_email:string|null;
  last_message:string|null;last_message_at:string|null;unread_count:number;
};
export type DirectChatContact={user_id:string;display_name:string;email:string|null};
export type DirectChatMessage={id:string;conversation_id:string;sender_id:string;sender_name:string;body:string;created_at:string};

export async function listDirectChats():Promise<DirectChatConversation[]>{
  if(!isRemoteBackendEnabled())return [];
  return remoteRequest<DirectChatConversation[]>("/rest/v1/rpc/list_direct_chats",{method:"POST",body:"{}"});
}
export async function listDirectChatContacts():Promise<DirectChatContact[]>{
  if(!isRemoteBackendEnabled())return [];
  return remoteRequest<DirectChatContact[]>("/rest/v1/rpc/list_direct_chat_contacts",{method:"POST",body:"{}"});
}
export async function ensureDirectChat(otherUserId:string):Promise<string>{
  return remoteRequest<string>("/rest/v1/rpc/ensure_direct_chat",{method:"POST",body:JSON.stringify({p_other_user_id:otherUserId})});
}
export async function listDirectMessages(conversationId:string):Promise<DirectChatMessage[]>{
  return remoteRequest<DirectChatMessage[]>(`/rest/v1/direct_chat_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,conversation_id,sender_id,sender_name,body,created_at&order=created_at.asc&limit=500`);
}
export async function sendDirectMessage(conversationId:string,body:string):Promise<void>{
  const text=body.trim(); if(!text)return;
  await remoteRequest("/rest/v1/direct_chat_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({conversation_id:conversationId,body:text})});
}
export async function markDirectChatRead(conversationId:string):Promise<void>{
  await remoteRequest("/rest/v1/rpc/mark_direct_chat_read",{method:"POST",body:JSON.stringify({p_conversation_id:conversationId})});
}
