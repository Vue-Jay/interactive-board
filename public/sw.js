const CACHE="onlinerepetitor-shell-v146";
const SHELL=["/","/index.html","/manifest.webmanifest","/favicon.svg","/pwa-icon.svg"];

const put=async(request,response)=>{
  if(response?.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}
  return response;
};

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("onlinerepetitor-shell-")&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  // Hashed Vite assets are immutable. Never wait for the network if we already have them.
  if(url.pathname.startsWith("/assets/")){
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      return put(event.request,await fetch(event.request));
    })());
    return;
  }

  // For navigation show the cached application shell immediately, while refreshing it in background.
  if(event.request.mode==="navigate"){
    event.respondWith((async()=>{
      const cached=await caches.match("/index.html");
      const network=fetch(event.request).then(r=>put("/index.html",r)).catch(()=>null);
      if(cached){event.waitUntil(network);return cached}
      return (await network)||Response.error();
    })());
    return;
  }

  if(["image","font"].includes(event.request.destination)||SHELL.includes(url.pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      return put(event.request,await fetch(event.request));
    })());
  }
});
