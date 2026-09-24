import { isRemoteBackendEnabled, remoteRequest } from "./backend";
export type LiveLesson={id:string;boardId:string;studentId:string;studentName:string;topic:string;startedAt:string;endedAt:string|null};
const KEY="onlinerepetitor.live-lesson.v38";
export async function getActiveLesson(boardId:string):Promise<LiveLesson|null>{
 if(!isRemoteBackendEnabled()){try{return JSON.parse(localStorage.getItem(`${KEY}.${boardId}`)||"null")}catch{return null}}
 const rows=await remoteRequest<any[]>(`/rest/v1/live_lessons?board_id=eq.${encodeURIComponent(boardId)}&ended_at=is.null&select=id,board_id,student_id,topic,started_at,ended_at&order=started_at.desc&limit=1`);
 const r=rows[0];return r?{id:r.id,boardId:r.board_id,studentId:r.student_id,studentName:"Ученик",topic:r.topic||"",startedAt:r.started_at,endedAt:r.ended_at}:null;
}
export async function startLesson(boardId:string,studentId:string,studentName:string,topic:string):Promise<LiveLesson>{
 const lesson:LiveLesson={id:crypto.randomUUID(),boardId,studentId,studentName,topic:topic.trim(),startedAt:new Date().toISOString(),endedAt:null};
 if(!isRemoteBackendEnabled()){localStorage.setItem(`${KEY}.${boardId}`,JSON.stringify(lesson));return lesson}
 await remoteRequest("/rest/v1/live_lessons",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:lesson.id,board_id:boardId,student_id:studentId,topic:lesson.topic,started_at:lesson.startedAt})});return lesson;
}
export async function finishLesson(lesson:LiveLesson,result:string,homework:string){
 const endedAt=new Date().toISOString(),minutes=Math.max(1,Math.round((Date.parse(endedAt)-Date.parse(lesson.startedAt))/60000));
 if(!isRemoteBackendEnabled()){localStorage.removeItem(`${KEY}.${lesson.boardId}`);return{minutes}}
 await remoteRequest(`/rest/v1/live_lessons?id=eq.${encodeURIComponent(lesson.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({ended_at:endedAt,result:result.trim(),homework:homework.trim()})});
 await remoteRequest("/rest/v1/student_sessions?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:lesson.id,student_id:lesson.studentId,board_id:lesson.boardId,date:lesson.startedAt,duration_minutes:minutes,topic:lesson.topic,homework:homework.trim(),result:result.trim()})});return{minutes};
}
