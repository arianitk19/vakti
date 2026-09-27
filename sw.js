/* Vakt service worker — precache shell + data, runtime-cache assets, offline fallback.
   Bump is automatic: CACHE_VERSION is a hash of the precached files (see tools/build). */
const CACHE_VERSION = '5162807671';
const PRECACHE = `vakt-pre-${CACHE_VERSION}`;
const RUNTIME = 'vakt-runtime-v1';
const ASSETS = [
 "./",
 "assets/icons/apple-touch-icon.png",
 "assets/icons/favicon-32.png",
 "assets/icons/favicon.svg",
 "assets/icons/icon-192.png",
 "assets/icons/icon-512.png",
 "assets/icons/logo.svg",
 "assets/icons/maskable-192.png",
 "assets/icons/maskable-512.png",
 "css/app.css",
 "css/fonts/plus-jakarta-sans-latin-400-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-500-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-600-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-700-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-ext-400-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-ext-500-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-ext-600-normal.woff2",
 "css/fonts/plus-jakarta-sans-latin-ext-700-normal.woff2",
 "css/fonts/scheherazade-new-arabic-400-normal.woff2",
 "css/reset.css",
 "css/tailwind.css",
 "data/dhikr.json",
 "data/duas.json",
 "data/lectures.json",
 "data/prayers.json",
 "data/scholars.json",
 "index.html",
 "js/app.js",
 "js/components/common.js",
 "js/components/iconData.js",
 "js/components/layout.js",
 "js/components/onboarding.js",
 "js/components/player.js",
 "js/components/search.js",
 "js/components/textBlock.js",
 "js/components/ui.js",
 "js/core/actions.js",
 "js/core/clock.js",
 "js/core/router.js",
 "js/core/store.js",
 "js/core/transition.js",
 "js/i18n/en.js",
 "js/i18n/index.js",
 "js/i18n/sq.js",
 "js/services/calendarService.js",
 "js/services/cities.js",
 "js/services/contentService.js",
 "js/services/installService.js",
 "js/services/kosovoPrayerService.js",
 "js/services/locationService.js",
 "js/services/newsService.js",
 "js/services/notificationService.js",
 "js/services/personalService.js",
 "js/services/qiblaService.js",
 "js/services/shareService.js",
 "js/services/storageService.js",
 "js/utils/dom.js",
 "js/utils/tz.js",
 "js/views/articles.js",
 "js/views/dhikr.js",
 "js/views/duas.js",
 "js/views/friday.js",
 "js/views/home.js",
 "js/views/lectures.js",
 "js/views/more.js",
 "js/views/prayers.js",
 "js/views/qibla.js",
 "js/views/ramadan.js",
 "js/views/saved.js",
 "js/views/settings.js",
 "js/views/stats.js",
 "manifest.webmanifest",
 "offline.html"
];

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
