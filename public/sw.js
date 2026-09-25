// v151: Service Worker intentionally retired.
// Keeping this file allows old installations to update to a worker that removes
// stale application caches and then unregisters itself.
self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("onlinerepetitor-")).map(key=>caches.delete(key)));
    await self.registration.unregister();
    const clientsList=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clientsList){
      client.postMessage({type:"ONLINEREPETITOR_SW_RETIRED"});
    }
  })());
});

// No fetch handler on purpose: every request goes directly through the browser/network.
