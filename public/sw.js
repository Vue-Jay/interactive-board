// v171: final cleanup worker for legacy PWA installations.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      client.postMessage({ type: "ONLINEREPETITOR_SW_RETIRED", version: "171" });
    }
  })());
});

// Deliberately no fetch handler. Navigations and assets go to the network/browser cache.
