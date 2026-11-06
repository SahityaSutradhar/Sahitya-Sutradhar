/* साहित्य सूत्रधार PWA cache — versioned shell cache */
const CACHE_PREFIX = "sahitya-sutradhar-";
const CACHE_NAME = `${CACHE_PREFIX}shell-v14-mobile-reader-fix`;

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./mobile-app.html",
  "./mobile-app.css",
  "./mobile-app.js",
  "./mobile-reader.html",
  "./mobile-reader.css",
  "./mobile-reader.js",
  "./styles.css",
  "./app.js",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./assets/sahitya-sutradhar-logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./shastriya.html",
  "./shastriya.css",
  "./shastriya.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // केवल इसी वेबसाइट के संसाधन; Supabase/API और बाहरी सेवाएँ कैश नहीं होंगी।
  if (url.origin !== self.location.origin) return;
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  // Static same-origin files: cache-first, then network and cache successful response.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return new Response("ऑफलाइन: यह फ़ाइल अभी उपलब्ध नहीं है।", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
