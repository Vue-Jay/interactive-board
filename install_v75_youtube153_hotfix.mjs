import fs from "node:fs";
const p="src/linkMedia.tsx";
if(!fs.existsSync(p)){console.error("hotfix: не найден "+p);process.exit(1)}
let s=fs.readFileSync(p,"utf8");
const old='if(id&&/^[A-Za-z0-9_-]{6,20}$/.test(id))return{kind:"youtube",sourceUrl:u.href,embedUrl:`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,host};';
const neu='if(id&&/^[A-Za-z0-9_-]{6,20}$/.test(id)){const origin=typeof window!=="undefined"&&/^https?:$/.test(window.location.protocol)?window.location.origin:"";const qs=new URLSearchParams({rel:"0"});if(origin){qs.set("origin",origin);qs.set("widget_referrer",window.location.href)}return{kind:"youtube",sourceUrl:u.href,embedUrl:`https://www.youtube.com/embed/${id}?${qs.toString()}`,host}}';
if(!s.includes(old)){console.error("hotfix: ожидаемая строка YouTube embed не найдена");process.exit(1)}
s=s.replace(old,neu);
const oldFrame='<iframe className="link-media-frame" src={info.embedUrl} title={item.mediaTitle||"Видео"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onPointerDown={e=>e.stopPropagation()}/>';
const newFrame='<iframe className="link-media-frame" src={info.embedUrl} title={item.mediaTitle||"Видео"} referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onPointerDown={e=>e.stopPropagation()}/>';
if(!s.includes(oldFrame)){console.error("hotfix: iframe anchor не найден");process.exit(1)}
s=s.replace(oldFrame,newFrame);
fs.writeFileSync(p,s);
console.log("YouTube error 153 hotfix установлен. Запустите npm run build");
