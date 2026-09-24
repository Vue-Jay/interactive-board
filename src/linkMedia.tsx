import { useMemo, useState } from "react";
import type { Item } from "./boardModel";

export type LinkMediaKind="youtube"|"vimeo"|"audio"|"video"|"web";
export type LinkMediaInfo={kind:LinkMediaKind;sourceUrl:string;embedUrl:string;host:string};

const safeUrl=(raw:string)=>{try{const u=new URL(raw.trim());return u.protocol==="https:"||u.protocol==="http:"?u:null}catch{return null}};
export function resolveLinkMedia(raw:string):LinkMediaInfo|null{
 const u=safeUrl(raw);if(!u)return null;const host=u.hostname.replace(/^www\./,"").toLowerCase();
 let id="";
 if(host==="youtu.be")id=u.pathname.split("/").filter(Boolean)[0]||"";
 else if(host.endsWith("youtube.com")){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else{const m=u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);id=m?.[1]||""}}
 if(id&&/^[A-Za-z0-9_-]{6,20}$/.test(id)){const origin=typeof window!=="undefined"&&/^https?:$/.test(window.location.protocol)?window.location.origin:"";const qs=new URLSearchParams({rel:"0"});if(origin){qs.set("origin",origin);qs.set("widget_referrer",window.location.href)}return{kind:"youtube",sourceUrl:u.href,embedUrl:`https://www.youtube.com/embed/${id}?${qs.toString()}`,host}}
 if(host.endsWith("vimeo.com")){const m=u.pathname.match(/\/(?:video\/)?(\d{5,})/);if(m)return{kind:"vimeo",sourceUrl:u.href,embedUrl:`https://player.vimeo.com/video/${m[1]}`,host}}
 const path=u.pathname.toLowerCase();
 if(/\.(mp3|m4a|aac|ogg|oga|wav|flac)(?:$)/.test(path))return{kind:"audio",sourceUrl:u.href,embedUrl:u.href,host};
 if(/\.(mp4|webm|ogv|mov|m4v)(?:$)/.test(path))return{kind:"video",sourceUrl:u.href,embedUrl:u.href,host};
 return{kind:"web",sourceUrl:u.href,embedUrl:u.href,host};
}
export function LinkMediaPlayer({item}: {item:Item}){
 const info=useMemo(()=>resolveLinkMedia(item.mediaUrl??""),[item.mediaUrl]);const [activated,setActivated]=useState(false);
 if(!info)return <div className="link-media-error"><strong>Ссылка недоступна</strong><span>Проверьте адрес мультимедиа</span></div>;
 if(info.kind==="youtube"||info.kind==="vimeo"){
  if(!activated)return <button type="button" className="link-media-cover" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setActivated(true)}}><span className="link-media-play">▶</span><strong>{item.mediaTitle||"Видео"}</strong><small>{info.host} · нажмите для загрузки плеера</small></button>;
  return <iframe className="link-media-frame" src={info.embedUrl} title={item.mediaTitle||"Видео"} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen onPointerDown={e=>e.stopPropagation()}/>;
 }
 if(info.kind==="audio")return <div className="link-audio-player" onPointerDown={e=>e.stopPropagation()}><strong>{item.mediaTitle||"Аудио"}</strong><audio controls preload="metadata" src={info.embedUrl}/><small>{info.host}</small></div>;
 if(info.kind==="video")return <video className="link-direct-video" controls preload="metadata" src={info.embedUrl} onPointerDown={e=>e.stopPropagation()}/>;
 return <div className="link-web-card"><strong>{item.mediaTitle||"Медиа по ссылке"}</strong><span>{info.host}</span><a href={info.sourceUrl} target="_blank" rel="noreferrer" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>Открыть источник ↗</a><small>Сайт запрещает безопасное встраивание или формат ссылки не распознан.</small></div>;
}
