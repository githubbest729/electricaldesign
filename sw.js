/* 2026 Electrical Design Guide — Service Worker
 * Bump VERSION whenever any precached file changes so clients receive the update toast.
 * All URLs are relative to the service worker scope, so this works under /electricaldesign/. */
const VERSION = 'v1.0.0';
const CACHE = `edg-2026-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './favicon.ico',
  './favicon.svg',
  './apple-touch-icon.png',
  './images/og-image.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // No automatic skipWaiting: the page shows "New version available" and asks the SW to activate.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('edg-2026-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: network first, fall back to cached shell, then the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match('./index.html')) || (await cache.match('./')) || (await cache.match('./offline.html'));
        })
    );
    return;
  }

  // Static assets: cache first, refresh in the background (stale-while-revalidate).
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        network.catch(() => {});
        return cached;
      }
      const res = await network;
      if (res) return res;
      if (req.destination === 'document') return cache.match('./offline.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    })
  );
});
