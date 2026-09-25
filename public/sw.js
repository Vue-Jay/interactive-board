const CACHE="onlinerepetitor-shell-v114";
const SHELL=["/","/index.html","/manifest.webmanifest","/favicon.svg","/pwa-icon.svg"];
const NAV_TIMEOUT=3500;
const cachePut=(request,response)=>{if(response?.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;};
const networkWithTimeout=request=>Promise.race([fetch(request),new Promise((_,reject)=>setTimeout(()=>reject(new Error("network-timeout")),NAV_TIMEOUT))]);
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("onlinerepetitor-shell-")&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);if(url.origin!==location.origin)return;
 if(event.request.mode==="navigate"){
  event.respondWith(networkWithTimeout(event.request).then(r=>cachePut("/index.html",r)).catch(async()=>await caches.match("/index.html")||fetch(event.request)));
  return;
 }
 if(["script","style","worker"].includes(event.request.destination)||url.pathname.startsWith("/assets/")){
  event.respondWith(caches.match(event.request).then(cached=>{const update=fetch(event.request).then(r=>cachePut(event.request,r)).catch(()=>cached);return cached||update;}));
  return;
 }
 if(["image","font"].includes(event.request.destination)||SHELL.includes(url.pathname)){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>cachePut(event.request,r))));
 }
});
