const DESTINATION = "https://paolo-marcatili.github.io/hero-language-camp/danish/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.includes("danish-foundations")).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) await client.navigate(DESTINATION);
    await self.registration.unregister();
  })());
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") event.respondWith(Response.redirect(DESTINATION, 302));
});
