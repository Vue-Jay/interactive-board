import { isRemoteBackendEnabled,remoteRequest } from "./backend";
export type AccountRole="teacher"|"student";
export type TeacherStatus="none"|"pending"|"approved"|"rejected";
export type AccountAccess={role:AccountRole;teacherStatus:TeacherStatus;isAdmin:boolean;requestedAt:string|null;reviewedAt:string|null};
export type TeacherRequest={userId:string;name:string;email:string;status:TeacherStatus;requestedAt:string|null;reviewedAt:string|null};
const KEY="onlinerepetitor.account-role.v81",CACHE_MS=30_000;
let cache:{at:number;value:AccountAccess}|null=null;
let inFlight:Promise<AccountAccess>|null=null;
const localAccess=():AccountAccess=>({role:localStorage.getItem(KEY)==="student"?"student":"teacher",teacherStatus:"approved",isAdmin:false,requestedAt:null,reviewedAt:null});
const mapAccess=(x:any):AccountAccess=>({role:x?.role==="teacher"?"teacher":"student",teacherStatus:["pending","approved","rejected"].includes(x?.teacher_status)?x.teacher_status:"none",isAdmin:!!x?.is_admin,requestedAt:x?.requested_at??null,reviewedAt:x?.reviewed_at??null});
const remember=(v:AccountAccess)=>{cache={at:Date.now(),value:v};return v};
export function clearAccountAccessCache(){cache=null}
export async function getAccountAccess():Promise<AccountAccess>{if(!isRemoteBackendEnabled())return localAccess();if(cache&&Date.now()-cache.at<CACHE_MS)return cache.value;if(inFlight)return inFlight;inFlight=(async()=>remember(mapAccess(await remoteRequest("/rest/v1/rpc/get_my_account_access",{method:"POST",body:"{}"}))))().finally(()=>{inFlight=null});return inFlight}
export async function getAccountRole():Promise<AccountRole>{return (await getAccountAccess()).role}
export async function requestTeacherAccess():Promise<AccountAccess>{if(!isRemoteBackendEnabled()){localStorage.setItem(KEY,"teacher");return localAccess()}clearAccountAccessCache();return remember(mapAccess(await remoteRequest("/rest/v1/rpc/request_teacher_access",{method:"POST",body:"{}"})))}
export async function setStudentRole():Promise<AccountAccess>{localStorage.setItem(KEY,"student");clearAccountAccessCache();if(!isRemoteBackendEnabled())return localAccess();await remoteRequest("/rest/v1/rpc/set_my_account_role",{method:"POST",body:JSON.stringify({p_role:"student"})});return getAccountAccess()}
export async function listTeacherRequests():Promise<TeacherRequest[]>{const x=await remoteRequest<any[]>("/rest/v1/rpc/list_teacher_requests",{method:"POST",body:"{}"});return(Array.isArray(x)?x:[]).map(v=>({userId:v.user_id,name:v.name||"Пользователь",email:v.email||"",status:v.status,requestedAt:v.requested_at??null,reviewedAt:v.reviewed_at??null}))}
export async function reviewTeacherRequest(userId:string,approve:boolean){const result=await remoteRequest("/rest/v1/rpc/review_teacher_request",{method:"POST",body:JSON.stringify({p_user_id:userId,p_approve:approve})});clearAccountAccessCache();return result}
