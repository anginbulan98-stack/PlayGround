/* Guoke AMHDQ service worker: cache aplikasi + data agar bisa dibuka
   offline / dipasang ke layar HP. Gambar chapter TIDAK di-cache
   (hemat penyimpanan); selalu diambil langsung saat online. */
const CACHE = 'guoke-amhdq-v4';
const CORE = [
  './', './index.html', './styles.css', './app.js', './proses.js', './data-anime.js',
  './manifest.webmanifest', './sitemap.xml',
  './data/anime.json', './data/anikoto.json', './data/manhwa.json',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // hanya aset sendiri
  if (/\.(webp|png|jpe?g|gif|avif)$/i.test(u.pathname)) return; // gambar: selalu live
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net; // stale-while-revalidate
    })
  );
});
