// Pitoco PWA - service worker
// Estratégia: network-first para navegação (sempre busca a versão nova publicada);
// cache entra em ação apenas quando offline.
const CACHE_NAME = 'pitoco-cache-v2';
const PRECACHE = [
  new URL('./index.html', self.registration.scope).toString(),
  new URL('./manifest.webmanifest', self.registration.scope).toString()
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin === self.location.origin) {
    // Network-first: HTML e assets do próprio site
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  // CDNs externos (Firebase, Chart.js etc.): cache-first após primeira visita
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
