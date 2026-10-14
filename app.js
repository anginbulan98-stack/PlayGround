// HDPlus — semua jalan lokal, tanpa upload server.
const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1800);
};
const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
const fmtTime = (s) => {
  s = Math.round(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/* ---------- 1. CEK VIDEO ---------- */
const dz = $('dropzone'), fi = $('fileInput');
dz.addEventListener('click', () => fi.click());
dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fi.click(); });
['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', (e) => {
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) analyze(f);
});
fi.addEventListener('change', () => { if (fi.files[0]) analyze(fi.files[0]); });

function analyze(file) {
  const url = URL.createObjectURL(file);
  const v = $('preview');
  v.src = url;
  v.onloadedmetadata = () => {
    const w = v.videoWidth, h = v.videoHeight, d = v.duration || 0;
    const br = d > 0 ? (file.size * 8) / d / 1e6 : 0; // Mbps
    $('videoResult').hidden = false;
    $('rRes').textContent = w + '×' + h + (h >= 2300 || w >= 2300 ? ' • 2K-ish' : h >= 1800 ? ' • HD' : ' • rendah');
    $('rDur').textContent = fmtTime(d) + ' • ' + d.toFixed(1) + 's';
    $('rSize').textContent = fmtMB(file.size);
    $('rBr').textContent = br.toFixed(1) + ' Mbps';
    const verdict = $('verdict'), fixes = $('fixList');
    fixes.innerHTML = '';
    const isVertical = h >= w;
    const isHD = Math.min(w, h) >= 1070 && Math.max(w, h) >= 1900;
    const is2K = Math.min(w, h) >= 1430;
    const goodBr = is2K ? br >= 18 : br >= 12;
    const add = (t) => { const li = document.createElement('li'); li.textContent = t; fixes.appendChild(li); };
    if (!isVertical) add('Video landscape — TikTok bakal dipotong/ada border hitam. Export ulang 9:16 (1080×1920 atau 1440×2560).');
    if (!isHD) add('Resolusi di bawah Full HD — export ulang minimal 1080×1920 biar teks tidak pecah.');
    if (!goodBr) add('Bitrate ' + br.toFixed(1) + ' Mbps terlalu rendah — naikkan ke ' + (is2K ? '25–45' : '15–25') + ' Mbps saat export.');
    if (file.size > 500 * 1048576) add('File >500MB — rawan gagal upload. Turunkan sedikit bitrate atau pakai H.265.');
    if (d > 180) add('Video >3 menit — TikTok kompres lebih agresif. Bagi jadi part 1/2/3 biasanya lebih tajam.');
    if (isVertical && isHD && goodBr && file.size < 500 * 1048576) {
      verdict.className = 'verdict ok';
      verdict.textContent = '✓ SIAP UPLOAD HD — setting sudah bagus. Upload via tiktok.com/upload + matikan mode hemat data.';
    } else if (isHD) {
      verdict.className = 'verdict warn';
      verdict.textContent = '△ HAMPIR HD — perbaiki ' + fixes.children.length + ' hal di bawah biar tidak burik.';
    } else {
      verdict.className = 'verdict bad';
      verdict.textContent = '✕ BELUM LAYAK HD — export ulang ikut preset di bawah.';
    }
    $('kalkulator').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  v.onerror = () => toast('File tidak terbaca. Pakai MP4/MOV.');
}

/* ---------- 2. KALKULATOR ---------- */
// Bitrate rekomendasi (Mbps, H.264). H.265 ≈ 60% dari nilai ini.
const TABLE = {
  '1080x1920': { 30: 12, 60: 20, 120: 30 },
  '1440x2560': { 30: 20, 60: 32, 120: 45 },
};
function calc() {
  const res = $('cRes').value, fps = Number($('cFps').value);
  const dur = Math.min(600, Math.max(1, Number($('cDur').value) || 30));
  const codec = $('cCodec').value;
  let br = TABLE[res][fps];
  if (codec === 'h265') br = Math.round(br * 0.6);
  const sizeMB = (br * 1e6 * dur) / 8 / 1048576;
  const uploadFps = fps >= 120 ? 'Export 60 FPS (slow-mo 0.5×)' : fps >= 60 ? 'Export 60 FPS' : 'Export 30 FPS';
  $('oBr').textContent = br + ' Mbps • ' + (codec === 'h265' ? 'H.265' : 'H.264');
  $('oSize').textContent = '≈ ' + sizeMB.toFixed(0) + ' MB / ' + dur + 's';
  $('oFps').textContent = uploadFps;
  const [W, H] = res.split('x');
  const over = sizeMB > (res.startsWith('1440') ? 500 : 250);
  $('oNote').textContent =
    (fps === 120 ? 'Kamu pilih 120FPS: rekam 120fps, edit slow-mo, tapi export 60fps — TikTok tidak menampilkan 120fps asli. ' : '') +
    (over ? '⚠ Perkiraan file > batas aman. Turunkan durasi, pakai H.265, atau bagi jadi 2 part.' : '✓ Ukuran aman untuk upload WiFi stabil.') +
    ' Audio selalu AAC 320kbps 48kHz + faststart.';
  const crf = codec === 'h265' ? 'crf 20' : 'crf 17';
  $('oCapcut').textContent =
    `CapCut PC → Export:\n• Resolusi: ${W}×${H} (9:16)\n• Frame rate: ${fps === 120 ? '60 (hasil slow-mo)' : fps}\n• Format: MP4 • Codec: ${codec === 'h265' ? 'H.265 (kalau ada)' : 'H.264'}\n• Bit rate: ${br} Mbps (${codec === 'h265' ? 'hemat ±40%' : 'kualitas maks'})\n• Audio: AAC 320kbps 48kHz`;
  const vfFps = fps === 120 ? '60' : String(fps);
  $('oFfmpeg').textContent =
    `ffmpeg -i input.mp4 -vf "scale=${W}:${H}:flags=lanczos,fps=${vfFps}" ` +
    `-c:v ${codec === 'h265' ? 'libx265' : 'libx264'} -preset slow -${crf} ` +
    `-pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart output-tiktok-HD.mp4`;
}
['cRes', 'cFps', 'cDur', 'cCodec'].forEach((id) => $(id).addEventListener('input', calc));
$('copyPreset').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('oCapcut').textContent); toast('Preset disalin!'); }
  catch { toast('Gagal menyalin'); }
});
$('copyFfmpeg').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('oFfmpeg').textContent); toast('Command disalin!'); }
  catch { toast('Gagal menyalin'); }
});
calc();

/* ---------- 3. KATEGORI (Semua/Anime/Manhwa/Upload TikTok Quality) ---------- */
const TIKTOK_SELS = ['.hero', '.specs', '#cek', '#kalkulator', '#panduan', '.compare', '#faq'];
function setCat(cat) {
  document.querySelectorAll('.catbar .cat').forEach((b) => {
    const on = b.dataset.cat === cat;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-selected', 'true'); else b.removeAttribute('aria-selected');
  });
  // Semua A/M = khusus Anime + Manhwa (tool TikTok hanya di tabnya sendiri)
  const showTiktok = cat === 'tiktok';
  const showManhwa = cat === 'semua' || cat === 'manhwa';
  const showAnime = cat === 'semua' || cat === 'anime';
  TIKTOK_SELS.forEach((s) => document.querySelectorAll(s).forEach((el) => { el.hidden = !showTiktok; }));
  const m = $('manhwaPanel'), a = $('animePanel');
  if (m) m.hidden = !showManhwa;
  if (a) a.hidden = !showAnime;
  if (showManhwa) ensureMw(); // data 4MB+ hanya diunduh saat dibutuhkan
}
document.querySelectorAll('.catbar .cat').forEach((b) =>
  b.addEventListener('click', () => {
    setCat(b.dataset.cat);
    document.querySelector('main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  })
);
document.querySelectorAll('[data-goto-tiktok]').forEach((b) =>
  b.addEventListener('click', () => setCat('tiktok'))
);
setCat('semua');

/* ---------- 4. ANIME: nonton langsung di situs ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let ANI = { updated: '', shows: [] };
let MW = { updated: '', titles: [] };
/* Streaming (anikoto API via proxy — direct fetch diblokir CORS) */
let AKMAP = {};
const API_PROXY = [
  (u) => 'https://proxy.corsfix.com/?' + u,
  (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
];
const seriesCache = {};
async function apiGet(path) {
  const url = 'https://anikotoapi.site' + path;
  let lastErr = null;
  for (const p of API_PROXY) {
    try {
      const r = await fetch(p(url));
      if (!r.ok) { lastErr = r.status; continue; }
      const j = await r.json();
      if (j && j.ok !== false) return j;
      lastErr = 'bad json';
    } catch (e) { lastErr = e; }
  }
  throw lastErr || 'proxy gagal';
}
function apiSeries(id) {
  if (seriesCache[id]) return Promise.resolve(seriesCache[id]);
  try {
    const raw = localStorage.getItem('ak_' + id);
    if (raw) {
      const o = JSON.parse(raw);
      if (Date.now() - o.t < 24 * 3600 * 1000) {
        seriesCache[id] = o.d;
        return Promise.resolve(o.d);
      }
    }
  } catch (e) {}
  // sumber utama: file episode bawaan (instan, tanpa proxy)
  return fetch('data/eps/' + id + '.json')
    .then((r) => {
      if (!r.ok) throw new Error('no file');
      return r.json();
    })
    .then((j) => {
      const d = { episodes: (j.episodes || []).map((e) => ({
        number: e.n, title: e.t, embed_url: e.e || {},
      })) };
      seriesCache[id] = d;
      try { localStorage.setItem('ak_' + id, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
      return d;
    })
    .catch(() => apiGet('/series/' + id).then((j) => {
      seriesCache[id] = j.data;
      try { localStorage.setItem('ak_' + id, JSON.stringify({ t: Date.now(), d: j.data })); } catch (e) {}
      return j.data;
    }));
}
function akOf(showId) { return AKMAP[showId] || null; }

function initials(t) {
  return t.split(/[\s:;]+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}
function showCard(s) {
  const ak = akOf(s.id);
  const eps = ak ? ak.episodes : s.episodes;
  return '<article class="show-card" data-show="' + s.id + '">' +
    '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + eps + ' EP</span></div>' +
    '<div class="show-info"><strong>' + esc(s.title) + '</strong>' +
    '<small>' + eps + ' episode • tonton di sini</small>' +
    '<div class="show-btns"><button class="btn" data-watch="' + s.id + '" type="button">▶ Nonton</button></div></div></article>';
}
/* (daftar torrent dihapus — semua nonton/baca langsung di situs) */
function findShow(id) { return ANI.shows.find((s) => s.id === id); }

function renderShows(filter) {
  const grid = $('showGrid'), q = (filter || '').toLowerCase().trim();
  const list = ANI.shows.filter((s) => s.id.indexOf('rx_') !== 0 &&
    (!q || s.title.toLowerCase().includes(q)));
  grid.innerHTML = list.map(showCard).join('') ||
    '<p class="muted">Tidak ketemu. Coba kata lain.</p>';
  $('aniCount').textContent = list.length + ' anime • ' +
    list.reduce((a, s) => a + (akOf(s.id) ? akOf(s.id).episodes : s.episodes), 0) + ' episode • tonton langsung di sini';
  grid.hidden = false;
}
/* Rilis baru otomatis: ambil deretan terbaru, judul di luar katalog langsung bisa ditonton */
function loadFresh() {
  const pages = [1, 2, 3];
  const seen = {};
  const all = [];
  (async () => {
    for (const p of pages) {
      try {
        const j = await apiGet('/recent-anime?page=' + p + '&per_page=24');
        (j.data || []).forEach((it) => {
          if (!it || !it.id || seen[it.id]) return;
          seen[it.id] = 1;
          all.push(it);
        });
      } catch (e) { break; }
    }
    const known = {};
    ANI.shows.forEach((s) => { const ak = akOf(s.id); if (ak) known[ak.id] = 1; });
    const fresh = all.filter((it) => !known[it.id]).slice(0, 8);
    if (!fresh.length) return;
    $('freshWrap').hidden = false;
    $('freshGrid').innerHTML = fresh.map((it) =>
      '<article class="show-card">' +
      '<div class="show-cover"><i>★</i>' +
      (it.poster ? '<img src="' + esc(it.poster) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
      '<span class="show-badge">BARU</span></div>' +
      '<div class="show-info"><strong>' + esc(it.title || it.alternative || 'Tanpa judul') + '</strong>' +
      '<small>rilis terbaru • otomatis</small>' +
      '<div class="show-btns"><button class="btn" data-fresh="' + it.id + '" type="button">▶ Nonton</button></div></div></article>'
    ).join('');
  })();
}
/* Halaman detail (overlay penuh) — episode/chapter tidak lagi dibuka di bawah */
function openDetail(title) {
  $('dvTitle').textContent = title;
  $('dvBody').innerHTML = '';
  $('detailView').hidden = false;
  document.body.style.overflow = 'hidden';
  $('detailView').scrollTop = 0;
}
function closeDetail() {
  $('detailView').hidden = true;
  if ($('playerModal').hidden && $('readModal').hidden) document.body.style.overflow = '';
}
let DV = { type: null, id: null, eps: [], filter: '' };
let DVM = { id: null, filter: '' };
let epReqSeq = 0; // anti-campur: abaikan respons basi saat pindah serial
function openDetailAnime(showId) {
  const s = findShow(showId);
  if (!s) return;
  const ak = akOf(showId);
  openDetail(s.title);
  DV = { type: 'anime', id: showId, eps: [], filter: '' };
  $('dvBody').innerHTML =
    '<div class="dv-hero">' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '">' : '') +
    '<div><h2>' + esc(s.title) + '</h2><p class="muted small">' +
    (ak ? ak.episodes + ' episode lengkap' : '') + ' • tonton langsung di sini</p></div></div>' +
    '<div class="ani-search"><input id="dvEpSearch" type="search" placeholder="Cari episode… (mis. 12)" autocomplete="off"></div>' +
    '<div id="dvEps"><p class="muted">Memuat daftar episode…</p></div>';
  if (!ak || !ak.id) {
    $('dvEps').innerHTML = '<p class="muted">Streaming belum tersedia untuk judul ini.</p>';
    return;
  }
  const myReq = ++epReqSeq;
  apiSeries(ak.id).then((data) => {
    if (myReq !== epReqSeq || $('detailView').hidden || DV.id !== showId) return; // anti-campur
    DV.eps = data.episodes || [];
    if (!DV.eps.length) {
      $('dvEps').innerHTML = '<p class="muted">Episode kosong.</p>';
      return;
    }
    paintEps();
    refreshEps(showId, ak.id, myReq); // cek episode terbaru di latar
  }).catch(() => {
    if (myReq !== epReqSeq || $('detailView').hidden) return;
    $('dvEps').innerHTML = '<p class="muted">Gagal memuat episode (jaringan/API sibuk). <button class="btn btn-small btn-ghost" data-retry="' + showId + '" type="button">Coba lagi</button></p>';
  });
}
/* Tambahan otomatis: episode yang rilis setelah data dibakar ikut masuk */
function refreshEps(showId, akid, myReq) {
  apiGet('/series/' + akid).then((j) => {
    if (myReq !== epReqSeq || $('detailView').hidden || !DV || DV.id !== showId) return;
    const live = (j.data && j.data.episodes) || [];
    const have = {};
    DV.eps.forEach((e) => { have[String(e.number)] = 1; });
    const baru = live.filter((e) => !have[String(e.number)]);
    if (!baru.length) return;
    baru.forEach((e) => DV.eps.push({ number: e.number, title: e.title, embed_url: e.embed_url || {} }));
    DV.eps.sort((a, b) => Number(a.number) - Number(b.number));
    seriesCache[akid] = { episodes: DV.eps };
    try { localStorage.setItem('ak_' + akid, JSON.stringify({ t: Date.now(), d: seriesCache[akid] })); } catch (e) {}
    paintEps();
    toast(baru.length + ' episode baru ditambahkan otomatis');
  }).catch(() => { /* diam: data bawaan tetap dipakai */ });
}
function paintEps() {
  const box = $('dvEps');
  if (!box || !DV.eps.length) return;
  const q = DV.filter.trim();
  const list = DV.eps.filter((ep) => !q || String(ep.number).includes(q));
  box.innerHTML = '<div class="ep-grid">' + list.map((ep) =>
    '<button class="ep-btn" data-ep="' + DV.id + ':' + ep.number + '" type="button" title="' + esc(ep.title || ('Episode ' + ep.number)) + '">' + ep.number + '</button>'
  ).join('') + '</div><p class="muted small">' + list.length + ' episode — klik nomor untuk menonton.</p>';
}

/* (player torrent/WebTorrent dihapus — semua diputar langsung di situs) */
function closePlayer() {
  $('playerModal').hidden = true;
  if ($('readModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
  const f = $('pFrame');
  f.removeAttribute('src');
  f.hidden = true;
  $('pServers').hidden = true;
  $('pServers').innerHTML = '';
}
function streamServers(ep) {
  const u = ep.embed_url || {};
  const out = [];
  if (u.sub) out.push({ label: 'SUB', url: u.sub });
  Object.keys(u).forEach((k) => {
    if (k !== 'sub' && u[k] && u[k] !== u.sub) out.push({ label: k.toUpperCase(), url: u[k] });
  });
  return out;
}
function openPlayerStream(showTitle, epNum, ep) {
  const servers = streamServers(ep);
  if (!servers.length) { toast('Server tidak tersedia untuk episode ini'); return; }
  $('playerModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('pTitle').textContent = (showTitle + ' — E' + epNum).slice(0, 70);
  const f = $('pFrame');
  f.hidden = false;
  const box = $('pServers');
  box.hidden = servers.length < 2;
  box.innerHTML = servers.map((s, i) =>
    '<button class="btn btn-small' + (i ? ' btn-ghost' : '') + '" data-srv="' + i + '" type="button">' + esc(s.label) + '</button>'
  ).join('');
  const play = (i) => {
    f.src = servers[i].url;
    $('pStatus').textContent = 'Memutar Episode ' + epNum + ' (' + servers[i].label + ') langsung di situs. Kalau macet, ganti server di atas.';
    box.querySelectorAll('button').forEach((b, j) => b.classList.toggle('btn-ghost', j !== i));
  };
  box.querySelectorAll('button').forEach((b) => {
    b.onclick = () => play(Number(b.dataset.srv));
  });
  play(0);
}

/* ---------- 5. MANHWA: baca langsung di situs (Komiku) ---------- */
function findMw(id) { return MW.titles.find((t) => t.id === id); }
function mwCard(t) {
  return '<article class="show-card">' +
    '<div class="show-cover"><i>' + esc(initials(t.title)) + '</i>' +
    (t.cover ? '<img src="' + esc(t.cover) + '" alt="' + esc(t.title) + '" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + t.total + ' CH</span></div>' +
    '<div class="show-info"><strong>' + esc(t.title) + '</strong>' +
    '<small>' + t.total + ' chapter lengkap • baca di sini</small>' +
    '<div class="show-btns"><button class="btn" data-mread="' + t.id + '" type="button">📖 Baca</button></div></div></article>';
}
function renderMw(filter) {
  const grid = $('mwGrid'), q = (filter || '').toLowerCase().trim();
  mwCurrent = null;
  const list = MW.titles.filter((t) => !q || t.title.toLowerCase().includes(q));
  grid.innerHTML = list.map(mwCard).join('') || '<p class="muted">Tidak ketemu. Coba kata lain.</p>';
  $('mwCount').textContent = list.length + ' manhwa • ' +
    list.reduce((a, t) => a + t.total, 0) + ' chapter • baca langsung di sini';
  grid.hidden = false;
}
function openDetailMw(id) {
  const t = findMw(id);
  if (!t) return;
  openDetail(t.title);
  DVM = { id, filter: '' };
  $('dvBody').innerHTML =
    '<div class="dv-hero">' +
    (t.cover ? '<img src="' + esc(t.cover) + '" alt="' + esc(t.title) + '">' : '') +
    '<div><h2>' + esc(t.title) + '</h2><p class="muted small">' + t.total + ' chapter lengkap • baca di sini</p></div></div>' +
    '<div class="ani-search"><input id="dvChSearch" type="search" placeholder="Cari chapter… (mis. 12)" autocomplete="off"></div>' +
    '<div id="dvChList" class="rel-list"></div>';
  paintCh();
}
function paintCh() {
  const t = findMw(DVM.id);
  const box = $('dvChList');
  if (!t || !box) return;
  const q = DVM.filter.trim().toLowerCase();
  const list = t.chapters.filter((c) => !q || c.n.toLowerCase().includes(q));
  box.innerHTML = list.map((c) => {
    const idx = t.chapters.indexOf(c);
    return '<button class="ch-row" data-ch="' + t.id + ':' + idx + '" type="button">' +
      '<span class="ch-num">CH ' + esc(c.n) + '</span>' +
      '<span><strong>' + esc(c.t) + '</strong><small>' + esc(c.d || '') + '</small></span></button>';
  }).join('') || '<p class="muted">Chapter tidak ketemu.</p>';
}
let rdCtx = null, rdReqSeq = 0, mwCurrent = null;
async function chapterImages(t, chUrl) {
  const slug = t.slug;
  if (MW.pages && MW.pages[slug] && MW.pages[slug][chUrl]) return MW.pages[slug][chUrl];
  if (!MW.pages) MW.pages = {};
  // sumber utama: file bawaan per judul (lengkap, tanpa proxy)
  if (!MW.pages[slug]) {
    const r = await fetch('data/mw/' + slug + '.json');
    if (!r.ok) throw new Error('no file');
    const j = await r.json();
    MW.pages[slug] = j.pages || {};
    const hit = MW.pages[slug][chUrl];
    if (hit && hit.length) return hit;
  } else {
    const hit = MW.pages[slug][chUrl];
    if (hit && hit.length) return hit;
  }
  // cadangan: ambil live bila file tidak memuat chapter ini
  const url = 'https://komiku.org' + chUrl;
  let html = '';
  for (const p of API_PROXY) {
    try {
      const r = await fetch(p(url));
      if (!r.ok) continue;
      html = await r.text();
      if (html.includes('Baca_Komik') && html.includes('komiku.to')) break;
      html = '';
    } catch (e) { /* proxy berikut */ }
  }
  if (!html) throw new Error('fetch gagal');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sec = doc.getElementById('Baca_Komik') || doc;
  const imgs = Array.from(sec.querySelectorAll('img'))
    .map((im) => im.getAttribute('src') || im.getAttribute('data-src') || '')
    .filter((u) => u.indexOf('http') === 0 && !/promosi|logo|avatar|gravatar|gstatic/i.test(u));
  if (!imgs.length) throw new Error('gambar kosong');
  return imgs;
}
function openReader(titleId, chIdx) {
  const t = findMw(titleId);
  if (!t) return;
  rdCtx = { id: titleId, i: Number(chIdx) };
  const c = t.chapters[rdCtx.i];
  $('readModal').hidden = false;
  document.body.style.overflow = 'hidden';
  paintFullBtns();
  $('rdTitle').textContent = t.title + ' — ' + c.t;
  const sel = $('rdSelect');
  sel.innerHTML = t.chapters.map((x, j) =>
    '<option value="' + j + '"' + (j === rdCtx.i ? ' selected' : '') + '>CH ' + esc(x.n) + ' — ' + esc(x.d || '') + '</option>'
  ).join('');
  sel.onchange = () => openReader(titleId, Number(sel.value));
  const atFirst = rdCtx.i <= 0, atLast = rdCtx.i >= t.chapters.length - 1;
  [$('rdPrev'), $('rdPrev2')].forEach((b) => { b.disabled = atLast; b.onclick = () => openReader(titleId, rdCtx.i + 1); });
  [$('rdNext'), $('rdNext2')].forEach((b) => { b.disabled = atFirst; b.onclick = () => openReader(titleId, rdCtx.i - 1); });
  loadChapter();
}
function loadChapter() {
  if (!rdCtx) return;
  const t = findMw(rdCtx.id), c = t.chapters[rdCtx.i];
  const myReq = ++rdReqSeq;
  $('rdStatus').textContent = 'Memuat gambar ' + c.t + '…';
  $('rdPages').innerHTML = '';
  $('rdTitle').textContent = t.title + ' — ' + c.t;
  chapterImages(t, c.u).then((imgs) => {
    if (!rdCtx || myReq !== rdReqSeq) return; // anti-campur
    $('rdPages').innerHTML = imgs.map((u, k) =>
      '<img src="' + esc(u) + '" alt="Halaman ' + (k + 1) + '" loading="lazy" onerror="this.style.display=\'none\'">'
    ).join('');
    $('rdStatus').textContent = imgs.length + ' halaman • ' + c.t + ' • geser ke bawah untuk membaca.';
    $('readModal').scrollTop = 0;
  }).catch(() => {
    if (!rdCtx || myReq !== rdReqSeq) return;
    $('rdStatus').textContent = 'Gagal memuat gambar (jaringan sibuk). Tutup lalu buka lagi, atau coba beberapa saat lagi.';
  });
}
function closeReader() {
  $('readModal').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if ($('playerModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
  rdCtx = null;
}
function toggleFull() {
  const el = $('readModal');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  if (el.requestFullscreen) el.requestFullscreen().catch(() => toast('Layar penuh ditolak browser'));
  else toast('Browser tidak mendukung layar penuh');
}
function paintFullBtns() {
  const on = !!document.fullscreenElement;
  document.querySelectorAll('[data-full]').forEach((b) => { b.textContent = on ? '✕ Keluar' : '⛶ Penuh'; });
}

function initAnime() {
  Promise.all([
    fetch('data/anime.json').then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    fetch('data/anikoto.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
  ])
    .then(([d, ak]) => {
      ANI = d;
      (ak || []).forEach((o) => {
        if (!o.id) return;
        const hit = ANI.shows.find((s) => s.title === o.show);
        if (hit) AKMAP[hit.id] = o;
      });
      $('aniDate').textContent = d.updated || '';
      renderShows('');
      loadFresh(); // rilis baru otomatis di latar
    })
    .catch(() => {
      $('showGrid').innerHTML = '<p class="muted">Data anime tidak termuat. Periksa koneksi lalu refresh.</p>';
    });
  $('aniSearch').addEventListener('input', (e) => renderShows(e.target.value));
  $('dvBack').addEventListener('click', closeDetail);
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'dvEpSearch' && DV.type === 'anime') {
      DV.filter = e.target.value;
      paintEps();
    }
    if (e.target && e.target.id === 'dvChSearch' && DVM.id) {
      DVM.filter = e.target.value;
      paintCh();
    }
  });
  document.addEventListener('click', (e) => {
    const w = e.target.closest('[data-watch]');
    if (w) { openDetailAnime(w.dataset.watch); return; }
    const fr = e.target.closest('[data-fresh]');
    if (fr) {
      const apiid = Number(fr.dataset.fresh);
      fr.disabled = true;
      apiSeries(apiid).then((data) => {
        const names = {};
        ANI.shows.forEach((s) => { names[s.title] = 1; });
        const title = (data.anime && data.anime.title) || ('Rilis ' + apiid);
        const tid = 'rx_' + apiid;
        if (!findShow(tid)) {
          ANI.shows.unshift({ id: tid, title, cover: '', akid: apiid, episodes: (data.episodes || []).length });
          AKMAP[tid] = { id: apiid, episodes: (data.episodes || []).length };
        }
        openDetailAnime(tid);
      }).catch(() => toast('Gagal memuat judul baru')).finally(() => { fr.disabled = false; });
      return;
    }
    const rt = e.target.closest('[data-retry]');
    if (rt) { openDetailAnime(rt.dataset.retry); return; }
    const ep = e.target.closest('[data-ep]');
    if (ep) {
      const parts = ep.dataset.ep.split(':');
      const sid = parts[0], num = parts.slice(1).join(':');
      const s = findShow(sid);
      if (!s) return;
      // anti-campur: pakai daftar episode halaman detail yang sedang dibuka
      const found = (DV.type === 'anime' && DV.id === sid)
        ? DV.eps.find((x) => String(x.number) === String(num)) : null;
      if (found) { openPlayerStream(s.title, num, found); return; }
      const ak = akOf(sid);
      if (!ak) return;
      ep.disabled = true;
      apiSeries(ak.id).then((data) => {
        const f2 = (data.episodes || []).find((x) => String(x.number) === String(num));
        if (f2) openPlayerStream(s.title, num, f2);
        else toast('Episode tidak ketemu');
      }).catch(() => toast('Gagal memuat episode')).finally(() => { ep.disabled = false; });
      return;
    }
    const mr = e.target.closest('[data-mread]');
    if (mr) { openDetailMw(mr.dataset.mread); return; }
    const ch = e.target.closest('[data-ch]');
    if (ch) {
      const [tid, idx] = ch.dataset.ch.split(':');
      openReader(tid, Number(idx));
      return;
    }
    if (e.target.closest('[data-full]')) { toggleFull(); return; }
  });
  document.addEventListener('fullscreenchange', paintFullBtns);
  $('pClose').addEventListener('click', closePlayer);
  $('playerModal').addEventListener('click', (e) => { if (e.target === $('playerModal')) closePlayer(); });
  $('rdClose').addEventListener('click', closeReader);
  $('readModal').addEventListener('click', (e) => { if (e.target === $('readModal')) closeReader(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('playerModal').hidden) closePlayer();
    else if (e.key === 'Escape' && !$('readModal').hidden) closeReader();
    else if (e.key === 'Escape' && !$('detailView').hidden) closeDetail();
  });
}
function initManhwa() {
  $('mwSearch').addEventListener('input', (e) => {
    renderMw(e.target.value);
    liveMdxSearch(e.target.value);
  });
}
function ensureMw() {
  if (MW.loaded || MW.loading) return;
  MW.loading = true;
  fetch('data/manhwa.json')
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then((d) => {
      MW = Object.assign(d, { loaded: true, loading: false });
      $('mwDate').textContent = d.updated || '';
      renderMw($('mwSearch').value);
    })
    .catch(() => {
      MW.loading = false;
      $('mwGrid').innerHTML = '<p class="muted">Data manhwa tidak termuat. Periksa koneksi lalu refresh.</p>';
    });
}
initAnime();
initManhwa();
