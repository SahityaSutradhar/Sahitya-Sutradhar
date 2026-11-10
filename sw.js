/* साहित्य सूत्रधार — update-aware cache strategy */
const CACHE_PREFIX = "sahitya-sutradhar-";
const CACHE_NAME = `${CACHE_PREFIX}shell-v20-final-i18n-premium`;
const PRECACHE_ASSETS = [
  "./", "./index.html", "./mobile-app.html", "./styles.css", "./mobile-app.css",
  "./app.js", "./mobile-app.js", "./mobile-app-enhancements.js", "./ui-localization.js",
  "./mobile-reader.html", "./mobile-reader.css", "./mobile-reader.js",
  "./supabase-config.js", "./manifest.webmanifest",
  "./assets/sahitya-sutradhar-logo.png", "./assets/icon-192.png", "./assets/icon-512.png",
  "./assets/icon-maskable-512.png", "./shastriya.html", "./shastriya.css", "./shastriya.js",
  "./admin-bulk-upload.html", "./admin-bulk-upload.css", "./admin-bulk-upload.js"
];
const NETWORK_FIRST_EXT = /\.(?:html?|js|css|json|webmanifest)$/i;

self.addEventListener("install", event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_ASSETS.map(path=>new Request(path,{cache:"reload"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request=event.request;
  if(request.method!=="GET"||request.headers.has("range"))return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return; // Never intercept Supabase or third-party requests.

  if(request.mode==="navigate"||NETWORK_FIRST_EXT.test(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request,{cache:"no-cache"});
        if(response&&response.ok&&response.type!=="opaque")await cache.put(request,response.clone());
        return response;
      }catch(error){
        return (await cache.match(request))||(await cache.match(request,{ignoreSearch:true}))||(await cache.match(url.pathname.endsWith("mobile-app.html")?"./mobile-app.html":"./index.html"))||new Response("Offline — this page is not available yet.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  // Images/fonts: stale-while-revalidate for quick repeat visits, refresh in background.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    const network=fetch(request).then(response=>{
      if(response&&response.ok&&response.type==="basic")cache.put(request,response.clone());
      return response;
    }).catch(()=>null);
    if(cached){event.waitUntil(network);return cached;}
    return (await network)||new Response("Offline asset unavailable",{status:503});
  })());
});
