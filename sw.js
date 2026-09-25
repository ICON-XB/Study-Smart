// Study-Smart service worker: caches the app's own code so it works offline.
// It never caches study data (that lives encrypted in localStorage/IndexedDB),
// API calls (Gemini, Paddle, the entitlement service) or other sites' files.
const CACHE_NAME = 'studysmart-v7';
const APP_SHELL = [
  './',
  './index.html',
  './app.html',
  './404.html',
  './privacy.html',
  './terms.html',
  './copyright.html',
  './notices.html',
  './style.css',
  './fonts/Inter-Regular.ttf',
  './fonts/Inter-Medium.ttf',
  './fonts/Inter-SemiBold.ttf', './fonts/Inter-Bold.ttf',
  './landing.css',
  './legal.css',
  './landing.js',
  './app.js',
  './security.js',
  './idb.js',
  './vision.js',
  './agent.js',
  './paddle-integration.js',
  './data/universities.js',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './manifest.json',
];
// opencv.js (~10 MB) is cached the first time the app loads it, not at install.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheable(response) {
  return response && response.status === 200 && response.type === 'basic';
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch third-party requests

  // Pages: network first (so updates arrive), cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (cacheable(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      } catch {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        const fallback = url.pathname.endsWith('app.html') ? './app.html' : './index.html';
        return (await caches.match(fallback)) || (await caches.match('./404.html')) || Response.error();
      }
    })());
    return;
  }

  // Static files: serve from cache, refresh in the background.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request)
      .then((response) => {
        if (cacheable(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => null);
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    return (await network) || Response.error();
  })());
});
