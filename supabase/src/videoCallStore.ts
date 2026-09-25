import { remoteRequest } from "./backend";

export type CallSignalKind="offer"|"answer"|"candidate"|"hangup";
export type CallSignal={id:string;conversation_id:string;sender_id:string;receiver_id:string;kind:CallSignalKind;payload:unknown;created_at:string};

export async function sendCallSignal(conversationId:string,receiverId:string,kind:CallSignalKind,payload:unknown):Promise<void>{
 await remoteRequest("/rest/v1/direct_call_signals",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({conversation_id:conversationId,receiver_id:receiverId,kind,payload})});
}

export async function listRecentCallSignals(conversationId:string,sinceIso:string):Promise<CallSignal[]>{
 return remoteRequest<CallSignal[]>(`/rest/v1/direct_call_signals?conversation_id=eq.${encodeURIComponent(conversationId)}&created_at=gte.${encodeURIComponent(sinceIso)}&select=id,conversation_id,sender_id,receiver_id,kind,payload,created_at&order=created_at.asc&limit=200`);
}
