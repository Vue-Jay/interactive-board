import { isRemoteBackendEnabled, remoteRequest } from "./backend";

export type BoardCommentThread={
  id:string;board_id:string;author_id:string;author_name:string;parent_id:string|null;
  body:string;resolved:boolean;created_at:string;updated_at:string;
};
export type BoardCommentParticipant={user_id:string;display_name:string};

export async function listBoardComments(boardId:string):Promise<BoardCommentThread[]>{
  if(!isRemoteBackendEnabled())return [];
  return remoteRequest<BoardCommentThread[]>(`/rest/v1/board_comments?board_id=eq.${encodeURIComponent(boardId)}&select=id,board_id,author_id,author_name,parent_id,body,resolved,created_at,updated_at&order=created_at.asc`);
}
export async function listBoardCommentParticipants(boardId:string):Promise<BoardCommentParticipant[]>{
  if(!isRemoteBackendEnabled())return [];
  return remoteRequest<BoardCommentParticipant[]>("/rest/v1/rpc/list_board_comment_participants",{method:"POST",body:JSON.stringify({p_board_id:boardId})});
}
export async function createBoardComment(boardId:string,body:string,parentId:string|null=null){
  const text=body.trim();
  if(!text)throw new Error("Комментарий пуст");
  if(!isRemoteBackendEnabled())throw new Error("Серверная синхронизация не настроена");
  const rows=await remoteRequest<BoardCommentThread[]>("/rest/v1/board_comments",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({board_id:boardId,body:text,parent_id:parentId})});
  return rows[0];
}
export async function setBoardCommentResolved(id:string,resolved:boolean){
  if(!isRemoteBackendEnabled())throw new Error("Серверная синхронизация не настроена");
  await remoteRequest(`/rest/v1/board_comments?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({resolved})});
}
