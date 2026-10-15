/* Guoke Engine cache — cache-first khusus file engine FFmpeg.
   Membuat unduhan ~30MB benar-benar cukup sekali, dan berikutnya
   langsung siap termasuk saat offline. File lain TIDAK di-cache. */
const CACHE = 'guoke-engine-v1';
const ENGINE_RE = [
  /\/vendor\/ffmpeg[^/]*\.(js|wasm)$/,
  /@ffmpeg\/ffmpeg@[^/]+\/dist\/ffmpeg\.min\.js$/,
  /@ffmpeg\/core-st@[^/]+\/dist\/ffmpeg-core\.(js|wasm)$/
];
function isEngine(url) {
  try { return ENGINE_RE.some(function (rx) { return rx.test(url); }); }
  catch (e) { return false; }
}
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try {
      const ks = await caches.keys();
      await Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    } catch (e) {}
    try { await self.clients.claim(); } catch (e) {}
  })());
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || !isEngine(e.request.url)) return;
  e.respondWith((async function () {
    try {
      const c = await caches.open(CACHE);
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r && r.ok) { try { await c.put(e.request, r.clone()); } catch (e2) {} }
      return r;
    } catch (err) {
      try {
        const c2 = await caches.open(CACHE);
        const m2 = await c2.match(e.request);
        if (m2) return m2;
      } catch (e2) {}
      throw err;
    }
  })());
});
