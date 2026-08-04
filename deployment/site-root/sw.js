const ROOT_PATH = "/hero-language-camp/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.includes("hero-language-camp")).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      const url = new URL(client.url);
      if (url.pathname.startsWith(ROOT_PATH)) await client.navigate(client.url);
    }
    await self.registration.unregister();
  })());
});
