/* Guoke AMHDQ service worker: cache aplikasi + data agar bisa dibuka
   offline / dipasang ke layar HP. Gambar chapter TIDAK di-cache
   (hemat penyimpanan); selalu diambil langsung saat online.
   TAHAN-LAMA v22: JANGAN cache data/eps/*, data/mw/*, data/mwch/* (total
   100MB+) — dulu tiap fetch di-cache tanpa batas → QuotaExceeded → situs
   error setelah dibuka beberapa lama. Kini hanya CORE + aset statis. */
const CACHE = 'guoke-amhdq-v24';
const CORE = [
  './', './index.html', './guoke/', './guoke/index.html', './styles.css', './app.js', './proses.js', './data-anime.js',
  './manifest.webmanifest', './sitemap.xml', './ikon/ikon-01.jpg', './ikon/ikon-02.png',
  './data/anime.json', './data/anikoto.json', './data/manhwa.json', './data/ikon.json',
  './data/ikon-couple.json', './data/ikon-couple-manhwa.json', './data/ikon-couple-manhwa-pin.json', './data/ikon-marin.json',
];
// Boleh di-cache saat runtime: hanya file kecil statis. Selain ini = network-only.
function cacheable(path) {
  if (/(^|\/)(styles\.css|app\.js|proses\.js|data-anime\.js|manifest\.webmanifest|sitemap\.xml|index\.html)$/.test(path)) return true;
  if (/^\/data\/(anime|anikoto|manhwa|ikon[^/]*|eps_recent)\.json$/.test(path)) return true;
  if (/^data\/(anime|anikoto|manhwa|ikon[^/]*|eps_recent)\.json$/.test(path)) return true;
  if (path === '/' || path === './' || path === '.' || path === '') return true;
  return false;
}
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k).catch(() => {}))))
    .then(() => self.clients.claim()).catch(() => {}));
});
self.addEventListener('fetch', (e) => {
  try {
    const u = new URL(e.request.url);
    // NAVIGASI (buka/refresh halaman): network dulu, gagal = tampilkan shell
    // cache — pengguna TIDAK PERNAH lihat halaman error browser walau server
    // mati / offline total (syarat: pernah dibuka sekali saat online).
    if (e.request.mode === 'navigate') {
      e.respondWith(
        fetch(e.request)
          .then((res) => {
            // Simpan shell beranda saja (bukan halaman /guoke/) sebagai fallback offline.
            if (res && res.ok && /(^\/$|index\.html$)/.test(u.pathname) && u.pathname.indexOf('/guoke/') < 0) {
              caches.open(CACHE).then((c) => {
                try { c.put('./index.html', res.clone()).catch(() => {}); } catch (_) {}
              }).catch(() => {});
            }
            return res;
          })
          .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
      );
      return;
    }
    if (e.request.method !== 'GET' || u.origin !== location.origin) return; // hanya aset sendiri
    if (/\.(webp|png|jpe?g|gif|avif)$/i.test(u.pathname)) return; // gambar: selalu live
    if (/\/data\/(eps|mw|mwch)\//.test(u.pathname)) return; // file episode/chapter besar: JANGAN cache
    if (!cacheable(u.pathname)) return; // di luar allowlist = network-only, tanpa error
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const net = fetch(e.request).then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => {
              try { c.put(e.request, res.clone()).catch(() => {}); } catch (_) {}
            }).catch(() => {});
          }
          return res;
        }).catch(() => hit);
        return hit || net; // stale-while-revalidate
      }).catch(() => fetch(e.request).catch(() => undefined))
    );
  } catch (_) { /* jangan pernah lempar error SW */ }
});
