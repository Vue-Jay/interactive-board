import { remoteRequest } from "./backend";

export type BoardCallSignalKind="offer"|"answer"|"candidate"|"hangup";
export type BoardCallSignal={id:string;board_id:string;sender_id:string;receiver_id:string;kind:BoardCallSignalKind;payload:unknown;created_at:string};

export async function sendBoardCallSignal(boardId:string,receiverId:string,kind:BoardCallSignalKind,payload:unknown):Promise<void>{
 await remoteRequest("/rest/v1/board_call_signals",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({board_id:boardId,receiver_id:receiverId,kind,payload})});
}
export async function listRecentBoardCallSignals(boardId:string,sinceIso:string):Promise<BoardCallSignal[]>{
 return remoteRequest<BoardCallSignal[]>(`/rest/v1/board_call_signals?board_id=eq.${encodeURIComponent(boardId)}&created_at=gte.${encodeURIComponent(sinceIso)}&select=id,board_id,sender_id,receiver_id,kind,payload,created_at&order=created_at.asc&limit=200`);
}
