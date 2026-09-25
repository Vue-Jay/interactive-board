const CACHE="onlinerepetitor-assets-v147";

const put=async(request,response)=>{
  if(response?.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
};

self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(k=>k.startsWith("onlinerepetitor-")&&k!==CACHE)
        .map(k=>caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  // Never cache the HTML entry point. A cached index.html can reference
  // JavaScript files removed by a newer Vercel deployment and leave the
  // installed PWA on a blank/non-starting screen.
  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request,{cache:"no-store"}).catch(()=>fetch("/index.html",{cache:"no-store"}))
    );
    return;
  }

  // Vite asset filenames contain a content hash, so they are safe to cache.
  if(url.pathname.startsWith("/assets/")){
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      return put(event.request,await fetch(event.request));
    })());
  }
});
