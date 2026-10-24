/* Foothold service worker. The precache list and cache version are injected at build time (vite.config.ts). */
const PRECACHE = __PRECACHE__;
const CACHE = 'foothold-__VERSION__';
const scope = self.registration.scope;
const INDEX = new URL('./', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([INDEX, ...PRECACHE.map((p) => new URL(p, scope).href)]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('foothold-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;

  if (request.mode === 'navigate') {
    // Network first so updates arrive; the cached shell keeps the app working offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(INDEX, copy));
          return response;
        })
        .catch(() => caches.match(INDEX)),
    );
    return;
  }

  // Hashed build assets never change: cache first.
  event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
});
