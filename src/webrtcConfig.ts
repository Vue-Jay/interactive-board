export type IceServerSource="stun"|"turn";

const DEFAULT_STUN:RTCIceServer={urls:"stun:stun.l.google.com:19302"};

function splitUrls(value:string|undefined):string[]{
 return (value??"").split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
}

export function getBoardCallIceServers():RTCIceServer[]{
 const servers:RTCIceServer[]=[DEFAULT_STUN];
 const stun=splitUrls(import.meta.env.VITE_WEBRTC_STUN_URLS);
 if(stun.length)servers.splice(0,1,{urls:stun});
 const turn=splitUrls(import.meta.env.VITE_WEBRTC_TURN_URLS);
 const username=(import.meta.env.VITE_WEBRTC_TURN_USERNAME??"").trim();
 const credential=(import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL??"").trim();
 if(turn.length&&username&&credential)servers.push({urls:turn,username,credential});
 return servers;
}

export function hasTurnServer():boolean{
 return getBoardCallIceServers().some(server=>{
  const urls=Array.isArray(server.urls)?server.urls:[server.urls];
  return urls.some(url=>/^turns?:/i.test(url));
 });
}
