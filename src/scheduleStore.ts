import { isRemoteBackendEnabled,remoteRequest } from "./backend";
export type ScheduleRecurrence="none"|"weekly";
export type ScheduledLesson={id:string;teacherId:string;studentId:string;studentName:string;boardId:string;boardTitle:string;title:string;startsAt:string;durationMinutes:number;recurrence:ScheduleRecurrence;recurrenceGroupId:string|null;note:string;status:"planned"|"completed"|"cancelled";createdAt:string};
const KEY="onlinerepetitor.schedule.v42";
const read=():ScheduledLesson[]=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}};
const write=(v:ScheduledLesson[])=>localStorage.setItem(KEY,JSON.stringify(v));
const map=(r:any):ScheduledLesson=>({id:r.id,teacherId:r.teacher_id,studentId:r.student_id,studentName:r.profiles?.name||"Ученик",boardId:r.board_id||"",boardTitle:r.boards?.title||"Без доски",title:r.title||"Занятие",startsAt:r.starts_at,durationMinutes:r.duration_minutes||60,recurrence:r.recurrence||"none",recurrenceGroupId:r.recurrence_group_id||null,note:r.note||"",status:r.status||"planned",createdAt:r.created_at});
export async function listScheduledLessons(userId:string){if(!isRemoteBackendEnabled())return read().filter(x=>x.teacherId===userId||x.studentId===userId).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));const rows=await remoteRequest<any[]>("/rest/v1/scheduled_lessons?select=id,teacher_id,student_id,board_id,title,starts_at,duration_minutes,recurrence,recurrence_group_id,note,status,created_at,boards(title),profiles!scheduled_lessons_student_id_fkey(name)&order=starts_at.asc");return rows.map(map)}
export async function createScheduledLessons(input:{teacherId:string;studentId:string;studentName:string;boardId:string;boardTitle:string;title:string;startsAt:string;durationMinutes:number;recurrence:ScheduleRecurrence;note:string;weeks:number}){
 const count=input.recurrence==="weekly"?Math.max(2,Math.min(24,input.weeks)):1,group=count>1?crypto.randomUUID():null,out:ScheduledLesson[]=[];
 for(let i=0;i<count;i++){const d=new Date(input.startsAt);d.setDate(d.getDate()+i*7);const x:ScheduledLesson={id:crypto.randomUUID(),teacherId:input.teacherId,studentId:input.studentId,studentName:input.studentName,boardId:input.boardId,boardTitle:input.boardTitle,title:input.title.trim()||"Занятие",startsAt:d.toISOString(),durationMinutes:input.durationMinutes,recurrence:input.recurrence,recurrenceGroupId:group,note:input.note.trim(),status:"planned",createdAt:new Date().toISOString()};out.push(x)}
 if(!isRemoteBackendEnabled()){write([...read(),...out]);return out}
 await remoteRequest("/rest/v1/scheduled_lessons",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(out.map(x=>({id:x.id,student_id:x.studentId,board_id:x.boardId||null,title:x.title,starts_at:x.startsAt,duration_minutes:x.durationMinutes,recurrence:x.recurrence,recurrence_group_id:x.recurrenceGroupId,note:x.note,status:x.status})))});
 return out;
}
export async function updateScheduledLesson(id:string,patch:Partial<Pick<ScheduledLesson,"title"|"startsAt"|"durationMinutes"|"note"|"status">>){
 if(!isRemoteBackendEnabled()){write(read().map(x=>x.id===id?{...x,...patch}:x));return}
 const body:any={};if(patch.title!==undefined)body.title=patch.title;if(patch.startsAt!==undefined)body.starts_at=patch.startsAt;if(patch.durationMinutes!==undefined)body.duration_minutes=patch.durationMinutes;if(patch.note!==undefined)body.note=patch.note;if(patch.status!==undefined)body.status=patch.status;
 await remoteRequest(`/rest/v1/scheduled_lessons?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(body)});
}
export async function deleteScheduledLesson(id:string,series=false,groupId:string|null=null){
 if(!isRemoteBackendEnabled()){write(read().filter(x=>series&&groupId?x.recurrenceGroupId!==groupId:x.id!==id));return}
 const q=series&&groupId?`recurrence_group_id=eq.${encodeURIComponent(groupId)}`:`id=eq.${encodeURIComponent(id)}`;
 await remoteRequest(`/rest/v1/scheduled_lessons?${q}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
}
