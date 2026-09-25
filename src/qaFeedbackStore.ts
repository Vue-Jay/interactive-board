import { isRemoteBackendEnabled, remoteRequest } from "./backend";

export type QaSeverity="low"|"medium"|"high"|"critical";
export type QaStatus="open"|"in_progress"|"fixed"|"closed";
export type QaReport={id:string;userId:string;testId:string;title:string;description:string;expected:string;environment:string;severity:QaSeverity;status:QaStatus;createdAt:string;updatedAt:string};
type QaRow={id:string;user_id:string;test_id:string;title:string;description:string;expected:string;environment:string;severity:QaSeverity;status:QaStatus;created_at:string;updated_at:string};
const map=(x:QaRow):QaReport=>({id:x.id,userId:x.user_id,testId:x.test_id,title:x.title,description:x.description,expected:x.expected,environment:x.environment,severity:x.severity,status:x.status,createdAt:x.created_at,updatedAt:x.updated_at});

export async function createQaReport(input:{testId:string;title:string;description:string;expected:string;environment:string;severity:QaSeverity}){
 if(!isRemoteBackendEnabled())throw new Error("Отправка QA-отчётов доступна только в серверной версии.");
 const rows=await remoteRequest<QaRow[]>("/rest/v1/qa_reports",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({test_id:input.testId,title:input.title.slice(0,180),description:input.description.slice(0,6000),expected:input.expected.slice(0,3000),environment:input.environment.slice(0,1000),severity:input.severity})});
 if(!rows[0])throw new Error("Сервер не вернул созданный QA-отчёт.");
 return map(rows[0]);
}
export async function listQaReports(_admin=false){
 if(!isRemoteBackendEnabled())return [];
 const rows=await remoteRequest<QaRow[]>("/rest/v1/qa_reports?select=id,user_id,test_id,title,description,expected,environment,severity,status,created_at,updated_at&order=created_at.desc&limit=100");
 return rows.map(map);
}
export async function updateQaReportStatus(id:string,status:QaStatus){
 await remoteRequest(`/rest/v1/qa_reports?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status})});
}
