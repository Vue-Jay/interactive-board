import { isRemoteBackendEnabled, remoteRequest } from "./backend";

export type AssignmentStatus="assigned"|"submitted"|"reviewed";
export type Assignment={
 id:string;teacherId:string;studentId:string;boardId:string;boardTitle:string;title:string;description:string;
 dueAt:string|null;createdAt:string;status:AssignmentStatus;submissionText:string;submittedAt:string|null;
 score:number|null;maxScore:number;feedback:string;reviewedAt:string|null;
};

const KEY="onlinerepetitor.assignments.v40";
const readLocal=():Assignment[]=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}};
const writeLocal=(rows:Assignment[])=>localStorage.setItem(KEY,JSON.stringify(rows));

const mapRow=(r:any):Assignment=>({
 id:r.id,teacherId:r.teacher_id,studentId:r.student_id,boardId:r.board_id||"",boardTitle:r.boards?.title||"Без доски",
 title:r.title||"",description:r.description||"",dueAt:r.due_at||null,createdAt:r.created_at,
 status:r.submissions?.reviewed_at?"reviewed":r.submissions?.submitted_at?"submitted":"assigned",
 submissionText:r.submissions?.content||"",submittedAt:r.submissions?.submitted_at||null,
 score:r.submissions?.score??null,maxScore:r.max_score??100,feedback:r.submissions?.feedback||"",reviewedAt:r.submissions?.reviewed_at||null,
});

export async function listAssignments(userId:string):Promise<Assignment[]>{
 if(!isRemoteBackendEnabled())return readLocal().filter(a=>a.teacherId===userId||a.studentId===userId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const rows=await remoteRequest<any[]>("/rest/v1/assignments?select=id,teacher_id,student_id,board_id,title,description,due_at,max_score,created_at,boards(title),submissions(content,submitted_at,score,feedback,reviewed_at)&order=created_at.desc");
 return rows.map(mapRow);
}

export async function createAssignment(input:{teacherId:string;studentId:string;boardId:string;boardTitle:string;title:string;description:string;dueAt:string|null;maxScore:number}):Promise<Assignment>{
 const a:Assignment={id:crypto.randomUUID(),teacherId:input.teacherId,studentId:input.studentId,boardId:input.boardId,boardTitle:input.boardTitle,title:input.title.trim(),description:input.description.trim(),dueAt:input.dueAt,createdAt:new Date().toISOString(),status:"assigned",submissionText:"",submittedAt:null,score:null,maxScore:input.maxScore,feedback:"",reviewedAt:null};
 if(!isRemoteBackendEnabled()){writeLocal([a,...readLocal()]);return a}
 await remoteRequest("/rest/v1/assignments",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:a.id,student_id:a.studentId,board_id:a.boardId||null,title:a.title,description:a.description,due_at:a.dueAt,max_score:a.maxScore})});
 return a;
}
export async function deleteAssignment(id:string){
 if(!isRemoteBackendEnabled()){writeLocal(readLocal().filter(a=>a.id!==id));return}
 await remoteRequest(`/rest/v1/assignments?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
}
export async function submitAssignment(a:Assignment,content:string){
 const now=new Date().toISOString();
 if(!isRemoteBackendEnabled()){writeLocal(readLocal().map(x=>x.id===a.id?{...x,status:"submitted",submissionText:content,submittedAt:now,score:null,feedback:"",reviewedAt:null}:x));return}
 await remoteRequest("/rest/v1/rpc/submit_assignment",{method:"POST",body:JSON.stringify({p_assignment_id:a.id,p_content:content.trim()})});
}
export async function reviewAssignment(a:Assignment,score:number|null,feedback:string){
 const now=new Date().toISOString();
 if(!isRemoteBackendEnabled()){writeLocal(readLocal().map(x=>x.id===a.id?{...x,status:"reviewed",score,feedback,reviewedAt:now}:x));return}
 await remoteRequest("/rest/v1/rpc/review_assignment",{method:"POST",body:JSON.stringify({p_assignment_id:a.id,p_score:score,p_feedback:feedback.trim()})});
}
