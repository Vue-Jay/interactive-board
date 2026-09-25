import { getRealtimeSocketUrl,getRemoteSession,isRemoteBackendEnabled } from "./backend";
import type { CallSignal } from "./videoCallStore";

export function subscribeCallSignals(userId:string,onSignal:(signal:CallSignal)=>void):()=>void{
 if(!isRemoteBackendEnabled())return()=>{};
 let stopped=false,socket:WebSocket|null=null,retry:ReturnType<typeof setTimeout>|undefined,heartbeat:ReturnType<typeof setInterval>|undefined,seq=0,attempt=0;
 const topic=`realtime:video-call:${userId}`;
 const close=()=>{clearTimeout(retry);clearInterval(heartbeat);if(socket){socket.onopen=socket.onmessage=socket.onerror=socket.onclose=null;try{socket.close()}catch{}socket=null}};
 const schedule=()=>{if(stopped)return;close();retry=setTimeout(()=>void connect(),Math.min(1000*2**attempt++,30000))};
 const connect=async()=>{
  if(stopped)return;
  try{
   const session=await getRemoteSession();if(!session||stopped)return schedule();
   const ws=new WebSocket(getRealtimeSocketUrl());socket=ws;const joinRef=String(++seq);
   const send=(event:string,payload:unknown,channel=topic,ref=String(++seq))=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({topic:channel,event,payload,ref,join_ref:channel===topic?joinRef:null}));return ref};
   ws.onopen=()=>{attempt=0;send("phx_join",{access_token:session.access_token,config:{broadcast:{self:false,ack:false},presence:{enabled:false},postgres_changes:[{event:"INSERT",schema:"public",table:"direct_call_signals",filter:`receiver_id=eq.${userId}`}]}},topic,joinRef);heartbeat=setInterval(()=>{try{send("heartbeat",{},"phoenix")}catch{schedule()}},25000)};
   ws.onmessage=e=>{try{const m=JSON.parse(String(e.data));if(m.topic===topic&&m.event==="postgres_changes"){const row=m.payload?.data?.record??m.payload?.record;if(row)onSignal(row as CallSignal)}if(m.topic===topic&&m.event==="phx_reply"&&m.payload?.status==="error")schedule()}catch{}};
   ws.onerror=ws.onclose=()=>schedule();
  }catch{schedule()}
 };
 void connect();return()=>{stopped=true;close()};
}
