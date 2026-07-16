const CACHE_NAME = "booking-app-cache-v1";
const PRECACHE_URLS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const CACHEABLE_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCacheableCDN = CACHEABLE_HOSTS.includes(url.hostname);
  // 不攔截 Firestore / Google API 等即時資料請求，只加速網站本身跟固定的字型/SDK 檔案
  if (!isSameOrigin && !isCacheableCDN) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
