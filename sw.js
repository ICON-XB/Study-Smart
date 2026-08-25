const CACHE_NAME = 'studysmart-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './security.js',
  './paddle-integration.js',
  './icon.svg',
  './manifest.json'
  // Note: paddle.js CDN is intentionally NOT cached — must load fresh for PCI compliance
];


self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests and local app files (prevent caching external APIs/extensions)
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // Silently catch network errors (offline)
      });

      return cachedResponse || fetchPromise;
    })
  );
});
