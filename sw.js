/* SOS Schule – Service Worker (ab App-Version 2.7.0)
   Sorgt dafür, dass die App auch ohne Internet startet. */
const CACHE = 'sos-schule-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['./', './index.html']).catch(() => {})
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst, bei fehlender Verbindung aus dem Zwischenspeicher.
// Nur eigene Seiten – Daten vom Server speichert die App selbst.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const isPage = req.mode === 'navigate';
        return (await caches.match(req, { ignoreSearch: isPage }))
          || (isPage && (await caches.match('./index.html') || await caches.match('./')))
          || Response.error();
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
