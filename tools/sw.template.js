/* Vakt service worker — precache shell + data, runtime-cache assets, offline fallback.
   Bump is automatic: CACHE_VERSION is a hash of the precached files (see tools/build). */
const CACHE_VERSION = '__VERSION__';
const PRECACHE = `vakt-pre-${CACHE_VERSION}`;
const RUNTIME = 'vakt-runtime-v1';
const ASSETS = __ASSETS__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PRECACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => (k.startsWith('vakt-pre-') && k !== PRECACHE)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // never touch third-party requests (YouTube, RSS proxies…)

  // Navigation: network first (fresh shell), fall back to cached shell, then offline page.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try { return await Promise.race([fetch(req), timeout(4000)]); }
      catch {
        return (await caches.match('index.html', { ignoreSearch: true })) || (await caches.match('./', { ignoreSearch: true })) || (await caches.match('offline.html')) || Response.error();
      }
    })());
    return;
  }

  // Prayer/content data: stale-while-revalidate (fast, but refreshed when online).
  if (url.pathname.includes('/data/')) {
    e.respondWith((async () => {
      const cache = await caches.open(PRECACHE); const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }

  // Static assets: cache-first (cache name is content-versioned).
  e.respondWith((async () => {
    const hit = await caches.match(req); if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone()); return res; }
    catch { return Response.error(); }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all[0]; if (c) return c.focus();
    return self.clients.openWindow('./#prayers');
  })());
});
