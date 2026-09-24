import { isRemoteBackendEnabled,remoteRequest } from "./backend";
export type AccountRole="teacher"|"student";
const KEY="onlinerepetitor.account-role.v81";
export async function getAccountRole():Promise<AccountRole>{
 if(!isRemoteBackendEnabled())return localStorage.getItem(KEY)==="student"?"student":"teacher";
 const value=await remoteRequest<string>("/rest/v1/rpc/get_my_account_role",{method:"POST",body:"{}"});
 return value==="student"?"student":"teacher";
}
export async function setAccountRole(role:AccountRole){
 localStorage.setItem(KEY,role);
 if(isRemoteBackendEnabled())await remoteRequest("/rest/v1/rpc/set_my_account_role",{method:"POST",body:JSON.stringify({p_role:role})});
 window.dispatchEvent(new CustomEvent("onlinerepetitor:account-role",{detail:role}));
 return role;
}
