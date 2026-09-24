const CACHE="onlinerepetitor-shell-v106";
const SHELL=["/","/index.html","/manifest.webmanifest","/favicon.svg","/pwa-icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("onlinerepetitor-shell-")&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url); if(url.origin!==location.origin)return;
 if(event.request.mode==="navigate"){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put("/index.html",copy))}return response}).catch(()=>caches.match("/index.html")));
  return;
 }
 if(["script","style","worker"].includes(event.request.destination)){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return response}).catch(()=>caches.match(event.request)));
  return;
 }
 if(["image","font"].includes(event.request.destination)||SHELL.includes(url.pathname)){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return response})));
 }
});