import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { listRecentBoardCallSignals,sendBoardCallSignal,type BoardCallSignal } from "./boardCallStore";
import { subscribeBoardCallSignals } from "./boardCallRealtime";
import { getBoardCallIceConfig,hasTurnServer,type BoardCallIceMode } from "./webrtcConfig";

export type BoardCallParticipant={userId:string;name:string};
type Props={boardId:string;userId:string;participants:BoardCallParticipant[]};
type CallState="idle"|"incoming"|"calling"|"connecting"|"connected";
type ConnectionRoute="unknown"|"direct"|"relay";

export default function BoardVideoCallPanel({boardId,userId,participants}:Props){
 const [state,setState]=useState<CallState>("idle"),[open,setOpen]=useState(false),[chooser,setChooser]=useState(false),[targetId,setTargetId]=useState<string|null>(null),[incomingId,setIncomingId]=useState<string|null>(null),[muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(true),[error,setError]=useState("");
 const [iceMode,setIceMode]=useState<BoardCallIceMode|null>(null),[connectionRoute,setConnectionRoute]=useState<ConnectionRoute>("unknown"),[remoteVideoActive,setRemoteVideoActive]=useState(false),[callSeconds,setCallSeconds]=useState(0),[callNotice,setCallNotice]=useState("");
 const stateRef=useRef<CallState>("idle"),localVideo=useRef<HTMLVideoElement>(null),remoteVideo=useRef<HTMLVideoElement>(null),pc=useRef<RTCPeerConnection|null>(null),stream=useRef<MediaStream|null>(null),cameraTrack=useRef<MediaStreamTrack|null>(null),disconnectTimer=useRef<number|null>(null),callTimer=useRef<number|null>(null),pendingOffer=useRef<RTCSessionDescriptionInit|null>(null),candidateQueue=useRef<RTCIceCandidateInit[]>([]),seen=useRef(new Set<string>()),noticeTimer=useRef<number|null>(null);
 const setCallState=(next:CallState)=>{stateRef.current=next;setState(next)};
 const notify=(message:string)=>{setCallNotice(message);if(noticeTimer.current!==null)window.clearTimeout(noticeTimer.current);noticeTimer.current=window.setTimeout(()=>{setCallNotice("");noticeTimer.current=null},5000)};
 const peerId=incomingId||targetId;
 const peerName=useMemo(()=>participants.find(p=>p.userId===peerId)?.name||"Участник доски",[participants,peerId]);
 const activeCall=state!=="idle";

 const stopMedia=()=>{cameraTrack.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(localVideo.current)localVideo.current.srcObject=null;if(remoteVideo.current)remoteVideo.current.srcObject=null};
 const clearDisconnectTimer=()=>{if(disconnectTimer.current!==null){window.clearTimeout(disconnectTimer.current);disconnectTimer.current=null}};
 const clearCallTimer=()=>{if(callTimer.current!==null){window.clearTimeout(callTimer.current);callTimer.current=null}};
 const closePeer=()=>{clearDisconnectTimer();clearCallTimer();pc.current?.close();pc.current=null;candidateQueue.current=[]};
 const reset=useCallback(()=>{closePeer();stopMedia();pendingOffer.current=null;setCallState("idle");setOpen(false);setChooser(false);setTargetId(null);setIncomingId(null);setMuted(false);setCameraOff(true);setIceMode(null);setConnectionRoute("unknown");setRemoteVideoActive(false);setCallSeconds(0)},[]);
 const media=async()=>{if(stream.current)return stream.current;if(!navigator.mediaDevices?.getUserMedia)throw new Error("Браузер не поддерживает звонки");try{const st=await navigator.mediaDevices.getUserMedia({audio:true,video:false});stream.current=st;cameraTrack.current=null;setCameraOff(true);if(localVideo.current)localVideo.current.srcObject=st;return st}catch(e){const name=(e as DOMException)?.name;if(name==="NotAllowedError"||name==="SecurityError")throw new Error("Разрешите доступ к микрофону в браузере");if(name==="NotFoundError")throw new Error("Микрофон не найден");if(name==="NotReadableError")throw new Error("Микрофон уже используется другим приложением");throw e}};
 const detectConnectionRoute=async(peer:RTCPeerConnection)=>{
  try{
   const stats=await peer.getStats(),byId=new Map<string,any>();
   stats.forEach(report=>byId.set(report.id,report));
   let pair:any;
   stats.forEach(report=>{
    if(report.type==="transport"&&report.selectedCandidatePairId){const selected=byId.get(report.selectedCandidatePairId);if(selected)pair=selected}
   });
   if(!pair)stats.forEach(report=>{if(report.type==="candidate-pair"&&report.state==="succeeded"&&report.nominated)pair=report});
   if(!pair){setConnectionRoute("unknown");return}
   const local=byId.get(pair.localCandidateId),remote=byId.get(pair.remoteCandidateId);
   setConnectionRoute(local?.candidateType==="relay"||remote?.candidateType==="relay"?"relay":"direct");
  }catch{setConnectionRoute("unknown")}
 };
 const createPeer=async(otherId:string)=>{const s=await media();const iceConfig=await getBoardCallIceConfig();setIceMode(iceConfig.mode);const peer=new RTCPeerConnection({iceServers:iceConfig.iceServers,iceCandidatePoolSize:4});pc.current=peer;s.getTracks().forEach(track=>peer.addTrack(track,s));peer.addTransceiver("video",{direction:"sendrecv"});peer.ontrack=e=>{if(remoteVideo.current)remoteVideo.current.srcObject=e.streams[0];if(e.track.kind==="video"){const sync=()=>setRemoteVideoActive(!e.track.muted&&e.track.readyState==="live");e.track.onunmute=sync;e.track.onmute=sync;e.track.onended=()=>setRemoteVideoActive(false);sync()}};peer.onicecandidate=e=>{if(e.candidate)void sendBoardCallSignal(boardId,otherId,"candidate",e.candidate.toJSON()).catch(()=>{})};peer.onconnectionstatechange=()=>{
  const connectionState=peer.connectionState;
  if(connectionState==="connected"){clearDisconnectTimer();clearCallTimer();setError("");setCallState("connected");void detectConnectionRoute(peer);return}
  if(connectionState==="disconnected"){
   clearDisconnectTimer();
   disconnectTimer.current=window.setTimeout(()=>{
    if(pc.current!==peer||peer.connectionState!=="disconnected")return;
    setError("Связь прервалась. Пытаемся восстановить звонок…");
    if(userId.localeCompare(otherId)<0){
     void (async()=>{
      try{
       peer.restartIce();
       const offer=await peer.createOffer({iceRestart:true});
       await peer.setLocalDescription(offer);
       await sendBoardCallSignal(boardId,otherId,"offer",offer);
      }catch{setError("Не удалось автоматически восстановить соединение.")}
     })();
    }
   },3000);
   return;
  }
  if(connectionState==="failed"){
   clearDisconnectTimer();
   void hasTurnServer().then(hasTurn=>notify(hasTurn?"Соединение потеряно. Повторите звонок.":"Соединение потеряно. TURN-сервер пока недоступен."));
   reset();
  }
 };return peer};
 const flushCandidates=async()=>{if(!pc.current?.remoteDescription)return;for(const c of candidateQueue.current.splice(0)){try{await pc.current.addIceCandidate(c)}catch{}}};
 const handleSignal=useCallback(async(signal:BoardCallSignal)=>{if(signal.board_id!==boardId||signal.receiver_id!==userId||seen.current.has(signal.id))return;seen.current.add(signal.id);try{if(signal.kind==="offer"){if(stateRef.current!=="idle"&&signal.sender_id!==peerId){void sendBoardCallSignal(boardId,signal.sender_id,"hangup",{});return}const offer=signal.payload as RTCSessionDescriptionInit;if(pc.current&&signal.sender_id===peerId&&stateRef.current!=="idle"){await pc.current.setRemoteDescription(offer);await flushCandidates();const answer=await pc.current.createAnswer();await pc.current.setLocalDescription(answer);await sendBoardCallSignal(boardId,signal.sender_id,"answer",answer);setCallState("connecting");return}pendingOffer.current=offer;setIncomingId(signal.sender_id);if(stateRef.current==="idle"){setCallState("incoming");setOpen(true)}}else if(signal.kind==="answer"&&pc.current&&signal.sender_id===targetId){await pc.current.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);await flushCandidates();setCallState("connecting")}else if(signal.kind==="candidate"&&signal.sender_id===peerId){const c=signal.payload as RTCIceCandidateInit;if(pc.current?.remoteDescription)await pc.current.addIceCandidate(c);else candidateQueue.current.push(c)}else if(signal.kind==="hangup"&&signal.sender_id===peerId){notify(stateRef.current==="incoming"?"Вызов отменён":"Звонок завершён");reset()}}catch(e){setError(e instanceof Error?e.message:"Ошибка звонка")}},[boardId,userId,targetId,peerId,reset]);
 useEffect(()=>{const since=new Date(Date.now()-15000).toISOString();const off=subscribeBoardCallSignals(userId,s=>void handleSignal(s));void listRecentBoardCallSignals(boardId,since).then(rows=>rows.forEach(s=>void handleSignal(s))).catch(()=>{});return()=>{off();closePeer();stopMedia()}},[boardId,userId,handleSignal]);
 useEffect(()=>{
  if(state!=="connected"){setCallSeconds(0);return}
  const started=Date.now();
  const update=()=>setCallSeconds(Math.floor((Date.now()-started)/1000));
  update();const timer=window.setInterval(update,1000);return()=>window.clearInterval(timer);
 },[state,peerId]);
 const callDuration=`${String(Math.floor(callSeconds/60)).padStart(2,"0")}:${String(callSeconds%60).padStart(2,"0")}`;
 useEffect(()=>{
  clearCallTimer();
  if(state==="incoming"){callTimer.current=window.setTimeout(()=>{const otherId=incomingId;if(otherId)void sendBoardCallSignal(boardId,otherId,"hangup",{}).catch(()=>{});reset()},45000)}
  else if(state==="calling"||state==="connecting"){callTimer.current=window.setTimeout(()=>{const otherId=peerId;if(otherId)void sendBoardCallSignal(boardId,otherId,"hangup",{}).catch(()=>{});notify("Не удалось установить соединение. Попробуйте ещё раз.");reset()},35000)}
  return clearCallTimer;
 },[state,incomingId,peerId,boardId,reset]);
 const call=async(otherId:string)=>{setError("");setChooser(false);setTargetId(otherId);setOpen(true);setCallState("calling");try{const peer=await createPeer(otherId);const offer=await peer.createOffer();await peer.setLocalDescription(offer);await sendBoardCallSignal(boardId,otherId,"offer",offer)}catch(e){notify(e instanceof Error?e.message:"Не удалось начать звонок");reset()}};
 const accept=async()=>{const offer=pendingOffer.current,otherId=incomingId;if(!offer||!otherId)return;setError("");setCallState("connecting");try{const peer=await createPeer(otherId);await peer.setRemoteDescription(offer);await flushCandidates();const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await sendBoardCallSignal(boardId,otherId,"answer",answer)}catch(e){notify(e instanceof Error?e.message:"Не удалось принять звонок");reset()}};
 const hangup=async()=>{const otherId=peerId;try{if(otherId)await sendBoardCallSignal(boardId,otherId,"hangup",{})}catch{}reset()};
 const toggleMute=()=>{const next=!muted;stream.current?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next)};
 const toggleCamera=async()=>{const peer=pc.current;const sender=peer?.getTransceivers().find(item=>item.receiver.track.kind==="video")?.sender;if(!cameraOff){cameraTrack.current?.stop();if(sender)try{await sender.replaceTrack(null)}catch{}if(cameraTrack.current&&stream.current)stream.current.removeTrack(cameraTrack.current);cameraTrack.current=null;setCameraOff(true);if(localVideo.current)localVideo.current.srcObject=stream.current;return}if(!navigator.mediaDevices?.getUserMedia){setError("Браузер не поддерживает камеру");return}try{const cameraStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});const track=cameraStream.getVideoTracks()[0];if(!track)return;if(sender)await sender.replaceTrack(track);cameraTrack.current=track;stream.current?.addTrack(track);setCameraOff(false);if(localVideo.current)localVideo.current.srcObject=stream.current;track.onended=()=>{cameraTrack.current=null;setCameraOff(true)}}catch(e){const name=(e as DOMException)?.name;if(name==="NotAllowedError"||name==="SecurityError")setError("Разрешите доступ к камере в браузере");else if(name==="NotFoundError")setError("Камера не найдена");else if(name==="NotReadableError")setError("Камера уже используется другим приложением");else setError(e instanceof Error?e.message:"Не удалось включить камеру")}};

 const others=participants.filter(p=>p.userId!==userId);
 return <div className="board-call-control"><button className={`top-button board-call-button ${activeCall?"active":""}`} disabled={state!=="idle"||others.length===0} onClick={()=>others.length===1?void call(others[0].userId):setChooser(v=>!v)} title={others.length?"Позвонить участнику этой доски":"Для звонка нужен ещё один участник на доске"} aria-label={activeCall?"Звонок активен":"Начать звонок"}><svg className="board-call-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.7 9.5 7c.35.5.3 1.18-.12 1.62L8.1 9.96a14.2 14.2 0 0 0 5.94 5.94l1.34-1.28c.44-.42 1.12-.47 1.62-.12l3.3 2.3c.48.34.67.96.45 1.5l-.9 2.2c-.22.53-.74.87-1.31.86C9.76 21.18 2.82 14.24 2.64 5.46c-.01-.57.33-1.09.86-1.31l2.2-.9c.54-.22 1.16-.03 1.5.45Z"/></svg></button>{chooser&&state==="idle"&&<div className="board-call-chooser"><strong>Позвонить</strong>{others.map(p=><button key={p.userId} onClick={()=>void call(p.userId)}><span>{p.name.trim().charAt(0).toUpperCase()||"U"}</span><b>{p.name}</b></button>)}</div>}{open&&createPortal(<div className="video-call-layer compact-call-layer"><section className="video-call-card compact-call-card"><header><div><strong>{state==="incoming"?`${peerName} звонит`:state==="connected"?peerName:`Соединяем с ${peerName}`}</strong><span>{state==="incoming"?"Входящий звонок":state==="connected"?callDuration:"Устанавливаем соединение…"}</span></div></header><div className={`video-call-stage compact-call-stage ${remoteVideoActive?"has-video":"audio-only"}`}><video ref={remoteVideo} autoPlay playsInline className="video-call-remote"/><video ref={localVideo} autoPlay muted playsInline className={`video-call-local ${cameraOff?"camera-off":""}`}/><div className="video-call-placeholder">{(state==="incoming"||state==="connected"&&!remoteVideoActive)?peerName.trim().charAt(0).toUpperCase()||"U":""}</div>{iceMode&&<span className="video-call-sharing-badge" title={connectionRoute==="relay"?"Звонок фактически передаётся через TURN relay":connectionRoute==="direct"?"WebRTC выбрал прямой маршрут между участниками":iceMode==="turn"?"TURN доступен, определяем фактический маршрут":"TURN не получен, используется прямое ICE-соединение"}>{connectionRoute==="relay"?"TURN":connectionRoute==="direct"?"Прямое":"ICE"}</span>}</div>{error&&<div className="video-call-error">{error}</div>}<footer className="compact-call-actions">{state==="incoming"?<><button className="compact-call-action video-call-decline" onClick={()=>void hangup()} title="Отклонить" aria-label="Отклонить"><svg className="call-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9.5c4.8-3 10.2-3 15 0l-2.6 4.2-3-1.5.7-1.7a10.2 10.2 0 0 0-5.2 0l.7 1.7-3 1.5-2.6-4.2Z"/></svg></button><button className="compact-call-action video-call-accept" onClick={()=>void accept()} title="Принять" aria-label="Принять"><svg className="call-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 14.5c4.8 3 10.2 3 15 0l-2.6-4.2-3 1.5.7 1.7a10.2 10.2 0 0 1-5.2 0l.7-1.7-3-1.5-2.6 4.2Z"/></svg></button></>:<><button className={`compact-call-action ${muted?"active":""}`} onClick={toggleMute} title={muted?"Включить микрофон":"Выключить микрофон"} aria-label={muted?"Включить микрофон":"Выключить микрофон"}><svg className="call-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg></button><button className={`compact-call-action ${!cameraOff?"active":""}`} onClick={()=>void toggleCamera()} title={cameraOff?"Включить камеру":"Выключить камеру"} aria-label={cameraOff?"Включить камеру":"Выключить камеру"}><svg className="call-action-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/></svg></button><button className="compact-call-action video-call-decline" onClick={()=>void hangup()} title="Завершить звонок" aria-label="Завершить звонок"><svg className="call-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9.5c4.8-3 10.2-3 15 0l-2.6 4.2-3-1.5.7-1.7a10.2 10.2 0 0 0-5.2 0l.7 1.7-3 1.5-2.6-4.2Z"/></svg></button></>}</footer></section></div>,document.body)}{callNotice&&<div className="call-toast" role="status">{callNotice}</div>}</div>;
}
