/* सूत्रधार — global refresh worker (20261118-inbox-premium-phase1) */
const BUILD = '20261118-inbox-premium-phase1';
const CACHE_PREFIX = 'sutradhar-';
const CACHE_NAME = `${CACHE_PREFIX}20261118-inbox-premium-phase1`;
const PRECACHE_ASSETS = [
  './', './index.html', './mobile-app.html', './mobile-reader.html', './shastriya.html', './admin-bulk-upload.html',
  './styles.css', './mobile-app.css', './mobile-reader.css', './shastriya.css', './admin-bulk-upload.css',
  './app.js', './admin-author-books.js', './push-notifications.js', './mobile-offline-vault.js', './reader-security.js', './protected-pdf-viewer.html', './mobile-app.js', './mobile-app-enhancements.js', './mobile-reader.js', './shastriya.js', './admin-bulk-upload.js', './ui-localization.js', './supabase-config.js',
  './manifest.webmanifest', './assets/sutradhar-logo.png', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A missing optional asset must not prevent the new worker from installing.
    await Promise.allSettled(PRECACHE_ASSETS.map(async path => {
      try {
        const cacheURL = new URL(path, self.registration.scope);
        cacheURL.searchParams.set('__ss_build', BUILD);
        const response = await fetch(cacheURL.href, {cache:'no-store'});
        if (response.ok && response.type !== 'opaque') await cache.put(new Request(new URL(path, self.registration.scope)), response.clone());
      } catch (_) { /* The live network request will retry when the page opens. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Remove every older Sahitya Sutradhar cache namespace, including recovery/stability releases.
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of clients) client.postMessage({type:'SS_APP_UPDATED', build:BUILD});
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Never intercept Supabase/CDN/third-party traffic.

  // Network-first for every same-origin resource. Cache is only a fallback when offline.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const freshURL = new URL(request.url);
      freshURL.searchParams.set('__ss_build', BUILD);
      const response = await fetch(freshURL.href, {cache:'no-store', credentials:request.credentials, headers:request.headers});
      if (response && response.ok && response.type !== 'opaque') {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    } catch (_) {
      const exact = await cache.match(request);
      if (exact) return exact;
      const compatible = await cache.match(request, {ignoreSearch:true});
      if (compatible) return compatible;
      return new Response('ऑफ़लाइन: यह संसाधन अभी उपलब्ध नहीं है।', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});


self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = String(data.title || 'सूत्रधार').slice(0,100);
  const body = String(data.body || 'आपके लिए एक नई सूचना है।').slice(0,240);
  const target = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : './mobile-app.html';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: './assets/icon-192.png', badge: './assets/icon-192.png',
    data: { url: target }, tag: 'sutradhar-' + Date.now(), renotify: false
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || './mobile-app.html';
  event.waitUntil((async () => {
    const url = new URL(target, self.registration.scope).href;
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
