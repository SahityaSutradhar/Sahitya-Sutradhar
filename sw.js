/* साहित्य सूत्रधार — reliable update + cache strategy (stability-2) */
const CACHE_PREFIX = "sahitya-sutradhar-stability-";
const CACHE_NAME = `${CACHE_PREFIX}shell-v2`;
const OLD_CACHE_PREFIXES = ["sahitya-sutradhar-recovery-"];
const PRECACHE_ASSETS = [
  "./", "./index.html", "./mobile-app.html",
  "./styles.css", "./mobile-app.css",
  "./app.js", "./mobile-app-enhancements.js",
  "./supabase-config.js", "./manifest.webmanifest",
  "./assets/sahitya-sutradhar-logo.png",
  "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon-maskable-512.png",
  "./shastriya.html", "./shastriya.css", "./shastriya.js",
  "./admin-bulk-upload.html", "./admin-bulk-upload.css", "./admin-bulk-upload.js"
];
const NETWORK_FIRST_EXT = /\.(?:html?|js|css|json|webmanifest)$/i;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache each existing resource independently. A missing optional file must
    // never abort installation of the entire Service Worker.
    await Promise.allSettled(PRECACHE_ASSETS.map(async path => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response && response.ok && response.type !== "opaque") {
          await cache.put(path, response.clone());
        }
      } catch (_) { /* Offline or optional resource: skip this item. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const prefixes = [CACHE_PREFIX, ...OLD_CACHE_PREFIXES];
    await Promise.all(keys.filter(key => prefixes.some(prefix => key.startsWith(prefix)) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase and third-party calls are never intercepted.

  if (request.mode === "navigate" || NETWORK_FIRST_EXT.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-cache" });
        if (response && response.ok && response.type !== "opaque") {
          try { await cache.put(request, response.clone()); } catch (_) {}
        }
        return response;
      } catch (_) {
        const exact = await cache.match(request);
        if (exact) return exact;
        const withoutQuery = await cache.match(request, { ignoreSearch: true });
        if (withoutQuery) return withoutQuery;
        const fallback = url.pathname.endsWith("mobile-app.html") ? "./mobile-app.html" : "./index.html";
        return (await cache.match(fallback)) || new Response("Offline — this page is not available yet.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  // Images and other static media: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then(async response => {
      if (response && response.ok && response.type === "basic") {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    }).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    return (await network) || new Response("Offline asset unavailable", { status: 503 });
  })());
});
