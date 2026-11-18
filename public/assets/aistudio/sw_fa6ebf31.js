const VERSION = 'charmacy-v4';
const STATIC = ['./manifest.json', './shared/theme.css', './shared/theme.js', './shared/firebase.js', './images/logo.jpg'];
const OFFLINE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{background:#07080b;color:#f3f4f7;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px}h1{color:#FFC107}</style></head><body><div><h1>You're offline</h1><p>Reconnect to continue tracking your CharMary delivery.</p></div></body></html>`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(STATIC.map(u => c.add(u)))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept cross-origin (Firebase, MapLibre, tiles, OSRM, Photon, fonts, CDN)
  if (url.origin !== location.origin) return;

  // HTML: network-first so deployments update instantly
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html' } })))
    );
    return;
  }

  // Static same-origin: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});