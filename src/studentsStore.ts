import type { AuthUser } from "./authStore";
import { getUserBoards, getBoardAccess } from "./boardStore";
import { isRemoteBackendEnabled, remoteRequest } from "./backend";

export type StudentSession={id:string;studentId:string;boardId:string;boardTitle:string;date:string;durationMinutes:number;topic:string;homework:string;result:string};
export type StudentRecord={userId:string;name:string;email:string;boardIds:string[];boardTitles:string[];lastBoardAt:string;note:string;tags:string[];sessions:StudentSession[]};

const NOTES_KEY="onlinerepetitor.student-notes.v1",TAGS_KEY="onlinerepetitor.student-tags.v1",SESSIONS_KEY="onlinerepetitor.student-sessions.v1";
const MIGRATED_KEY="onlinerepetitor.student-data-migrated.v37";
const readObject=<T,>(key:string,fallback:T):T=>{try{const value=JSON.parse(localStorage.getItem(key)||"");return value??fallback}catch{return fallback}};
const write=(key:string,value:unknown)=>localStorage.setItem(key,JSON.stringify(value));
const localSessions=()=>readObject<StudentSession[]>(SESSIONS_KEY,[]);

const profileRows=async()=>isRemoteBackendEnabled()?remoteRequest<any[]>("/rest/v1/student_profiles?select=student_id,note,tags"):[];

export async function migrateLocalStudentData(){
 if(!isRemoteBackendEnabled()||localStorage.getItem(MIGRATED_KEY)==="1")return;
 const notes=readObject<Record<string,string>>(NOTES_KEY,{}),tags=readObject<Record<string,string[]>>(TAGS_KEY,{});
 try{
   for(const studentId of new Set([...Object.keys(notes),...Object.keys(tags)])){
     await remoteRequest("/rest/v1/student_profiles?on_conflict=teacher_id,student_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({student_id:studentId,note:notes[studentId]||"",tags:tags[studentId]||[]})});
   }
   for(const s of localSessions()){
     await remoteRequest("/rest/v1/student_sessions?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:s.id,student_id:s.studentId,board_id:s.boardId||null,date:s.date,duration_minutes:s.durationMinutes,topic:s.topic,homework:s.homework,result:s.result})});
   }
   localStorage.setItem(MIGRATED_KEY,"1");
 }catch{/* local copy remains available; retry next load */}
}

export async function saveStudentNote(userId:string,note:string){
 if(isRemoteBackendEnabled()){await remoteRequest("/rest/v1/student_profiles?on_conflict=teacher_id,student_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({student_id:userId,note})});return}
 const all=readObject<Record<string,string>>(NOTES_KEY,{});all[userId]=note;write(NOTES_KEY,all);
}
export async function saveStudentTags(userId:string,tags:string[]){
 if(isRemoteBackendEnabled()){await remoteRequest("/rest/v1/student_profiles?on_conflict=teacher_id,student_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({student_id:userId,tags})});return}
 const all=readObject<Record<string,string[]>>(TAGS_KEY,{});all[userId]=tags;write(TAGS_KEY,all);
}
export async function getStudentSessions(studentId:string):Promise<StudentSession[]>{
 if(isRemoteBackendEnabled()){
   const rows=await remoteRequest<any[]>(`/rest/v1/student_sessions?student_id=eq.${encodeURIComponent(studentId)}&select=id,student_id,board_id,date,duration_minutes,topic,homework,result,boards(title)&order=date.desc`);
   return rows.map(r=>({id:r.id,studentId:r.student_id,boardId:r.board_id||"",boardTitle:r.boards?.title||"Без доски",date:r.date,durationMinutes:r.duration_minutes||0,topic:r.topic||"",homework:r.homework||"",result:r.result||""}));
 }
 return localSessions().filter(s=>s.studentId===studentId).sort((a,b)=>b.date.localeCompare(a.date));
}
export async function saveStudentSession(s:StudentSession){
 if(isRemoteBackendEnabled()){await remoteRequest("/rest/v1/student_sessions?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:s.id,student_id:s.studentId,board_id:s.boardId||null,date:s.date,duration_minutes:s.durationMinutes,topic:s.topic,homework:s.homework,result:s.result})});return}
 const all=localSessions(),next=all.some(x=>x.id===s.id)?all.map(x=>x.id===s.id?s:x):[...all,s];write(SESSIONS_KEY,next);
}
export async function deleteStudentSession(id:string){
 if(isRemoteBackendEnabled()){await remoteRequest(`/rest/v1/student_sessions?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});return}
 write(SESSIONS_KEY,localSessions().filter(s=>s.id!==id));
}

export async function getStudentsForTeacher(user:AuthUser):Promise<StudentRecord[]>{
 await migrateLocalStudentData();
 const boards=(await getUserBoards(user)).filter(b=>b.role==="owner");
 const localNotes=readObject<Record<string,string>>(NOTES_KEY,{}),localTags=readObject<Record<string,string[]>>(TAGS_KEY,{});
 const profiles=isRemoteBackendEnabled()?await profileRows():[];
 const profileMap=new Map(profiles.map(p=>[p.student_id,p]));
 const byUser=new Map<string,StudentRecord>();
 for(const board of boards){try{
   const access=await getBoardAccess(user.id,board.id);
   for(const member of access.members){if(!member.user)continue;const p=profileMap.get(member.userId);
     const previous=byUser.get(member.userId),next:StudentRecord=previous??{userId:member.userId,name:member.user.name||"Ученик",email:member.user.email||"",boardIds:[],boardTitles:[],lastBoardAt:board.updatedAt,note:p?.note??localNotes[member.userId]??"",tags:p?.tags??localTags[member.userId]??[],sessions:await getStudentSessions(member.userId)};
     if(!next.boardIds.includes(board.id)){next.boardIds.push(board.id);next.boardTitles.push(board.title)}if(board.updatedAt>next.lastBoardAt)next.lastBoardAt=board.updatedAt;byUser.set(member.userId,next);
   }
 }catch{/* skip inaccessible board */}}
 return [...byUser.values()].sort((a,b)=>a.name.localeCompare(b.name,"ru",{sensitivity:"base"}));
}
