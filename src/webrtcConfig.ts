import { isRemoteBackendEnabled,remoteFunctionRequest } from "./backend";

const DEFAULT_STUN:RTCIceServer={urls:"stun:stun.l.google.com:19302"};
type TurnResponse={iceServers:RTCIceServer[];expiresAt?:number};
export type BoardCallIceMode="direct"|"turn";
export type BoardCallIceConfig={iceServers:RTCIceServer[];mode:BoardCallIceMode};
let cached:{servers:RTCIceServer[];expiresAt:number}|null=null;

function splitUrls(value:string|undefined):string[]{
 return (value??"").split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
}
function localIceServers():RTCIceServer[]{
 const servers:RTCIceServer[]=[DEFAULT_STUN];
 const stun=splitUrls(import.meta.env.VITE_WEBRTC_STUN_URLS);
 if(stun.length)servers.splice(0,1,{urls:stun});
 const turn=splitUrls(import.meta.env.VITE_WEBRTC_TURN_URLS);
 const username=(import.meta.env.VITE_WEBRTC_TURN_USERNAME??"").trim();
 const credential=(import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL??"").trim();
 if(turn.length&&username&&credential)servers.push({urls:turn,username,credential});
 return servers;
}
function containsTurn(servers:RTCIceServer[]):boolean{
 return servers.some(server=>{
  const urls=Array.isArray(server.urls)?server.urls:[server.urls];
  return urls.some(url=>/^turns?:/i.test(url));
 });
}

export async function getBoardCallIceConfig():Promise<BoardCallIceConfig>{
 const iceServers=await getBoardCallIceServers();
 return {iceServers,mode:containsTurn(iceServers)?"turn":"direct"};
}

export async function getBoardCallIceServers():Promise<RTCIceServer[]>{
 const now=Math.floor(Date.now()/1000);
 if(cached&&cached.expiresAt>now+60)return cached.servers;
 if(isRemoteBackendEnabled()){
  try{
   const result=await remoteFunctionRequest<TurnResponse>("turn-credentials",{method:"POST",body:"{}"});
   if(Array.isArray(result.iceServers)&&result.iceServers.length){
    cached={servers:result.iceServers,expiresAt:Number(result.expiresAt||now+300)};
    return cached.servers;
   }
  }catch{ /* Static TURN/STUN fallback below keeps calls available. */ }
 }
 return localIceServers();
}

export async function hasTurnServer():Promise<boolean>{
 return containsTurn(await getBoardCallIceServers());
}
