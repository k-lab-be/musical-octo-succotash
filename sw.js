// Zet de app offline klaar. Eerst het netwerk (nieuwste versie), pas bij geen of traag netwerk de opgeslagen kopie.
const V = 'dst-v9';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Gegevens, inloggen en foto's nooit uit de opslag van de app
  if (url.hostname.endsWith('.supabase.co')) return;
  const sameOrigin = url.origin === location.origin;
  const libHost = ['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname);
  if (!sameOrigin && !libHost) return;
  e.respondWith(caches.open(V).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (!sameOrigin && hit) return hit;
    const net = fetch(req, sameOrigin ? { cache: 'no-cache' } : undefined).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    if (!hit) {
      try { return await net; } catch (_) {}
      if (req.mode === 'navigate') { const idx = await cache.match('index.html'); if (idx) return idx; }
      return new Response('', { status: 504 });
    }
    e.waitUntil(net.catch(() => null));
    return Promise.race([net.catch(() => hit), new Promise(r => setTimeout(() => r(hit), 3000))]);
  }));
});
