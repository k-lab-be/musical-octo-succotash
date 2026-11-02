// Zet de app offline klaar: eerst uit de opslag, op de achtergrond vernieuwen.
const V = 'dst-v8';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
  const fontHost = ['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname);
  if (!sameOrigin && !fontHost) return;
  e.respondWith(caches.open(V).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') { const idx = await cache.match('index.html'); if (idx) return idx; }
    return new Response('', { status: 504 });
  }));
});
