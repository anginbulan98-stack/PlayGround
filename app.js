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
const TIKTOK_SELS = ['.hero', '.specs', '#cek', '#proses', '#kalkulator', '#presetSiap', '#panduan', '.compare', '#faq'];
function setCat(cat) {
  document.querySelectorAll('.catbar .cat').forEach((b) => {
    const on = b.dataset.cat === cat;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-selected', 'true'); else b.removeAttribute('aria-selected');
  });
  // Semua = preview pilihan tiap kategori; Anime/Manhwa = katalog penuh masing-masing
  const showTiktok = cat === 'tiktok';
  const showManhwa = cat === 'semua' || cat === 'manhwa';
  const showAnime = cat === 'semua' || cat === 'anime';
  TIKTOK_SELS.forEach((s) => document.querySelectorAll(s).forEach((el) => { el.hidden = !showTiktok; }));
  const m = $('manhwaPanel'), a = $('animePanel');
  if (cat === 'semua') {
    // mode preview: panel penuh disembunyikan, preview ringkas ditampilkan
    if (m) m.hidden = true;
    if (a) a.hidden = true;
    paintPreview();
  } else {
    if (m) m.hidden = !showManhwa;
    if (a) a.hidden = !showAnime;
  }
  // Tiga pintu masuk + preview + lanjutkan hanya relevan di tab Semua
  const pintu = $('pintu');
  if (pintu) pintu.hidden = cat !== 'semua';
  const prev = $('semuaPreview');
  if (prev) prev.hidden = cat !== 'semua';
  if (showManhwa && cat !== 'semua') ensureMw(); // data 4MB+ hanya diunduh saat dibutuhkan
  if (cat === 'semua') ensureMw().then(() => { paintPreview(); });
  CURCAT = cat;
  sessSet('gq_cat', cat);
  // Tab aktif tetap terlihat: scroll manual di container-nya (scrollIntoView
  // pada bar fixed bisa ikut menggeser HALAMAN di sebagian browser → dilarang).
  try {
    const bar = document.querySelector('.catbar'), act = bar && bar.querySelector('.cat.active');
    if (bar && act) {
      const br = bar.getBoundingClientRect(), ar = act.getBoundingClientRect();
      if (ar.left < br.left - 2 || ar.right > br.right + 2) {
        bar.scrollTo({ left: act.offsetLeft - br.width / 2 + ar.width / 2, behavior: 'auto' });
      }
    }
  } catch (e) {}
}
document.querySelectorAll('.catbar .cat').forEach((b) =>
  b.addEventListener('click', () => {
    // Hanya ganti isi daftar: tanpa reload, tanpa lempar ke atas
    goCat(b.dataset.cat);
  })
);
document.querySelectorAll('[data-goto-tiktok]').forEach((b) =>
  b.addEventListener('click', () => goCat('tiktok'))
);
// Tiga pintu masuk di beranda → pindah tab + scroll ke panelnya
document.querySelectorAll('[data-goto]').forEach((b) =>
  b.addEventListener('click', () => {
    const c = b.dataset.goto;
    goCat(c);
    const target = { manhwa: 'manhwaPanel', anime: 'animePanel', tiktok: 'alatTiktok' }[c];
    if (target && $(target)) $(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  })
);
// Navigasi atas (4 grup) → tab + panel yang sesuai (tanpa tulis hash anchor)
document.querySelectorAll('[data-navcat]').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const map = { manhwa: 'manhwa', anime: 'anime', tiktok: 'tiktok', baca: 'manhwa', tonton: 'anime' };
    const c = map[a.dataset.navcat] || 'semua';
    goCat(c);
    const target = { manhwa: 'manhwaPanel', anime: 'animePanel', tiktok: 'alatTiktok' }[c];
    if (target && $(target)) $(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  })
);
// Logo → tab Semua (satu-satunya yang boleh "pulang" ke utama)
document.querySelectorAll('.brand').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (e && e.preventDefault) e.preventDefault();
    goCat('semua');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  })
);
/* Panggilan awal setCat ada di bawah file (setelah semua state terisi) */

/* ---------- 4. ANIME: nonton langsung di situs ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* --- Gambar siap-CDN: set window.GQ_IMG_CDN di console/deploy untuk
   melewatkan cover via image-proxy (mis. weserv), contoh:
   window.GQ_IMG_CDN = 'https://images.weserv.nl/?url=';  (lalu &w=800)
   Default '' = langsung dari sumber (tanpa proxy). --- */
const IMG_CDN = (typeof window !== 'undefined' && window.GQ_IMG_CDN) || '';
function cdn(u) {
  if (!u || !IMG_CDN) return u;
  return IMG_CDN + encodeURIComponent(String(u).replace(/^https?:\/\//, ''));
}

/* --- Tanggal Indonesia: "Diperbarui 14 Okt 2026" (input "DD/MM/YYYY") --- */
const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function parseTgl(d) {
  const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0;
}
function fmtTglID(d) {
  const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return 'Diperbarui ' + (+m[1]) + ' ' + BULAN_ID[(+m[2]) - 1] + ' ' + m[3];
}
/* Update terakhir = tanggal chapter paling baru (anti salah urut data) */
function mwUpdated(t) {
  let best = 0, raw = '';
  (t.chapters || []).forEach((c) => {
    const ts = parseTgl(c.d);
    if (ts > best) { best = ts; raw = c.d; }
  });
  return raw;
}
function mwStatus(t) { return t.status || 'Ongoing'; } // dari Komiku; default Ongoing
function mwGenres(t) {
  const g = t.genres && t.genres.length ? t.genres : ['Manhwa'];
  return g.slice(0, 3); // tampilkan max 3 di kartu
}

/* --- Penyimpanan lokal tanpa login: bookmark, lanjutkan, posisi baca --- */
const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const isBookmarked = (id) => store.get('gq_bm', []).includes(id);
function toggleBookmark(id) {
  let b = store.get('gq_bm', []);
  b = b.includes(id) ? b.filter((x) => x !== id) : b.concat(id);
  store.set('gq_bm', b);
  return b.includes(id);
}
/* Status bookmark (B7): ongoing = Sedang dibaca, wishlist = Mau dibaca, done = Selesai */
const bmStatus = (id) => (store.get('gq_bms', {})[id] || '');
function setBmStatus(id, st) {
  const o = store.get('gq_bms', {});
  if (st) o[id] = st; else delete o[id];
  store.set('gq_bms', o);
}
/* Riwayat 20 terakhir (B4): {type:'mw'|'anime', id, sub, at} */
function pushHist(entry) {
  let h = store.get('gq_hist', []).filter((x) => !(x.type === entry.type && x.id === entry.id));
  h.unshift(Object.assign({ at: Date.now() }, entry));
  store.set('gq_hist', h.slice(0, 20));
}
/* Badge BARU / Update hari ini (B5): berdasarkan tanggal chapter terbaru */
function mwBadge(t) {
  const raw = mwUpdated(t);
  if (!raw) return '';
  const ts = parseTgl(raw);
  if (!ts) return '';
  const now = Date.now();
  const days = (now - ts) / 86400000;
  if (days < 0) return '';
  if (days < 1) return '<span class="badge-new today">Update hari ini</span>';
  if (days < 7) return '<span class="badge-new">BARU</span>';
  return '';
}
/* Jaga posisi scroll saat render ulang yang tak terhindarkan:
   simpan Y, render, kembalikan seketika (tanpa animasi). */
function keepScroll(fn) {
  const y = window.scrollY || 0;
  const r = fn();
  try { window.scrollTo({ top: y, behavior: 'instant' }); }
  catch (e) { window.scrollTo(0, y); }
  return r;
}
/* Preview Semua (A2): 8 anime + 8 manhwa pilihan.
   Anti-lompat: tiap grid hanya ditulis ulang bila daftar isinya BERUBAH
   (tanda tangan id), dan posisi scroll dijaga. */
const PREV_SIG = { a: '', m: '' };
function paintPreview() {
  const pa = $('prevAnime'), pm = $('prevMw');
  const y = window.scrollY || 0;
  if (pa && ANI.shows.length) {
    const list = ANI.shows.filter((s) => s.id.indexOf('rx_') !== 0).slice(0, 8);
    const sig = 'a:' + list.map((s) => s.id).join(',');
    if (sig !== PREV_SIG.a) {
      PREV_SIG.a = sig;
      pa.innerHTML = list.map(showCard).join('');
    }
  }
  if (pm && MW.loaded) {
    const list = MW.titles.slice().sort((a, b) => parseTgl(mwUpdated(b)) - parseTgl(mwUpdated(a))).slice(0, 8);
    const sig = 'm:' + list.map((t) => t.id).join(',');
    if (sig !== PREV_SIG.m) {
      PREV_SIG.m = sig;
      pm.innerHTML = list.map(mwCard).join('');
    }
  }
  if ((window.scrollY || 0) !== y) {
    try { window.scrollTo({ top: y, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  }
}
/* Lanjutkan membaca/menonton di atas beranda (B1, gabungan) */
function paintLanjutHome() {
  const wrap = $('lanjutHome');
  if (!wrap) return;
  const c = store.get('gq_cont', null);
  const v = store.get('gq_contv', null);
  // pilih yang paling baru
  let pick = null;
  if (c && v) pick = (c.at || 0) >= (v.at || 0) ? { k: 'mw', d: c } : { k: 'anime', d: v };
  else if (c) pick = { k: 'mw', d: c };
  else if (v) pick = { k: 'anime', d: v };
  if (!pick) { wrap.hidden = true; return; }
  wrap.hidden = false;
  if (pick.k === 'mw') {
    const t = findMw(pick.d.id);
    if (!t) { wrap.hidden = true; return; }
    $('lhKicker').textContent = 'LANJUTKAN MEMBACA';
    $('lhJudul').textContent = t.title;
    $('lhSub').textContent = pick.d.ch || '';
    $('lhBtn').onclick = () => openReader(pick.d.id, pick.d.idx || 0);
  } else {
    const s = findShow(pick.d.id);
    if (!s) { wrap.hidden = true; return; }
    $('lhKicker').textContent = 'LANJUTKAN MENONTON';
    $('lhJudul').textContent = s.title;
    $('lhSub').textContent = 'Episode ' + pick.d.ep;
    $('lhBtn').onclick = () => openDetailAnime(pick.d.id);
  }
}
/* SEO dinamis: tiap rute hash memperbarui <title> + meta description (unik per URL) */
function setSEO(title, desc) {
  document.title = title;
  let m = document.querySelector('meta[name="description"]');
  if (m) m.setAttribute('content', desc);
  const og = document.querySelector('meta[property="og:title"]');
  if (og) og.setAttribute('content', title);
}
const SEO_HOME = ['Guoke AMHDQ — Nonton Anime & Baca Manhwa Langsung',
  'Guoke AMHDQ: nonton anime, baca manhwa chapter lengkap, dan preset upload TikTok HD — semua langsung di situs.'];
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
  const st = s.status === 'tayang' ? 'Sedang Tayang' : 'Tamat';
  const meta = s.kind === 'film'
    ? 'Film • ' + (s.year || '')
    : eps + ' episode • ' + st + (s.year ? ' • ' + s.year : '');
  return '<article class="show-card" data-show="' + s.id + '">' +
    '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + (s.kind === 'film' ? 'FILM' : eps + ' EP') + '</span></div>' +
    '<div class="show-info"><strong>' + esc(s.title) + '</strong>' +
    '<small>' + esc(meta) + '</small>' +
    '<div class="show-btns"><button class="btn" data-watch="' + s.id + '" type="button">▶ Nonton</button></div></div></article>';
}
/* Filter status katalog: semua | tayang | tamat | film (reset Muat lagi tiap ganti) */
function aniMatchF(s, f) {
  if (f === 'tayang') return s.status === 'tayang' && s.kind !== 'film';
  if (f === 'tamat') return s.status !== 'tayang' && s.kind !== 'film';
  if (f === 'film') return s.kind === 'film';
  return true;
}
/* (daftar torrent dihapus — semua nonton/baca langsung di situs) */
function findShow(id) { return ANI.shows.find((s) => s.id === id); }
function findShowByTitle(title) {
  const s = ANI.shows.find((x) => x.title === title);
  return s ? s.id : '';
}
/* Pindah episode Prev/Next dari dalam player — jalan sampai episode terakhir.
   Di episode terakhir tombol Next nonaktif (di episode pertama: Prev). */
function stepEpisode(dir) {
  if (!PCtx || !DV || DV.type !== 'anime' || DV.id !== PCtx.showId || !DV.eps.length) {
    toast('Buka daftar episode dulu');
    return;
  }
  const i = DV.eps.findIndex((e) => String(e.number) === String(PCtx.epNum));
  if (i < 0) { toast('Episode tidak ketemu di daftar'); return; }
  const nx = DV.eps[i + dir];
  if (!nx) { toast(dir > 0 ? 'Sudah episode terakhir' : 'Sudah episode pertama'); return; }
  if (!nx.ok) { toast('Episode ' + nx.number + ' segera hadir — belum ada sumber videonya'); return; }
  const s = findShow(PCtx.showId);
  openPlayerStream(s ? s.title : '', nx.number, nx);
}
/* Status tombol Prev/Next mengikuti posisi di daftar penuh */
function paintEpNav() {
  const pp = $('pPrev'), pn = $('pNext');
  if (!pp || !pn) return;
  if (PCtx && DV && DV.type === 'anime' && DV.id === PCtx.showId && DV.eps.length) {
    const i = DV.eps.findIndex((e) => String(e.number) === String(PCtx.epNum));
    pp.disabled = i <= 0;
    pn.disabled = i < 0 || i >= DV.eps.length - 1;
  } else {
    pp.disabled = false;
    pn.disabled = false;
  }
}

/* State katalog anime: cari + filter status + Muat lagi per 12 */
const ANI_UI = { q: '', f: 'semua', limit: 12, per: 12 };
function aniFiltered() {
  return ANI.shows.filter((s) => s.id.indexOf('rx_') !== 0 &&
    aniMatchF(s, ANI_UI.f) &&
    (!ANI_UI.q || s.title.toLowerCase().includes(ANI_UI.q)));
}
function renderShows(filter) {
  return keepScroll(() => {
  if (typeof filter === 'string') ANI_UI.q = filter.toLowerCase().trim();
  const grid = $('showGrid'), q = ANI_UI.q;
  const list = aniFiltered();
  const slice = list.slice(0, ANI_UI.limit);
  grid.innerHTML = slice.map(showCard).join('') ||
    '<p class="muted">Tidak ketemu. Coba kata lain.</p>';
  $('aniCount').textContent = 'Menampilkan ' + slice.length + ' dari ' + list.length + ' anime • ' +
    list.reduce((a, s) => a + (akOf(s.id) ? akOf(s.id).episodes : s.episodes), 0) + ' episode • tonton langsung di sini';
  const more = $('aniMore');
  if (more) {
    more.hidden = slice.length >= list.length;
    more.textContent = 'Muat lagi (' + slice.length + '/' + list.length + ')';
  }
  grid.hidden = false;
  // A5: hasil kosong → tawarkan request dengan kata pencarian terisi otomatis
  const empty = $('aniEmpty');
  if (empty) {
    const show = q && !list.length;
    empty.hidden = !show;
    if (show) $('aniEmptyQ').textContent = (filter || '').trim();
  }
  });
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
    const sig = 'f:' + fresh.map((it) => it.id).join(',');
    if ($('freshWrap').hidden === false && $('freshWrap').dataset.sig === sig) return; // sudah tampil, jangan render ulang
    keepScroll(() => {
      $('freshWrap').hidden = false;
      $('freshWrap').dataset.sig = sig;
      $('freshGrid').innerHTML = fresh.map((it) =>
      '<article class="show-card">' +
      '<div class="show-cover"><i>★</i>' +
      (it.poster ? '<img src="' + esc(it.poster) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
      '<span class="show-badge">BARU</span></div>' +
      '<div class="show-info"><strong>' + esc(it.title || it.alternative || 'Tanpa judul') + '</strong>' +
      '<small>rilis terbaru • otomatis</small>' +
      '<div class="show-btns"><button class="btn" data-fresh="' + it.id + '" type="button">▶ Nonton</button></div></div></article>'
    ).join('');
    });
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
  setSEO(SEO_HOME[0], SEO_HOME[1]);
}
/* --- Routing hash: kategori + URL unik per konten (bisa dibagikan) ---
   #/semua|anime|manhwa|tiktok = kategori • #/baca/{slug}[/{idx}] = manhwa/reader
   #/tonton/{id}[/e{ep}] = anime/player. Hosting statis tanpa rewrite server,
   jadi URL memakai hash; sitemap.xml mendata URL bagikannya.
   Dipanggil dari hashchange DAN popstate; fromPop=true berarti navigasi
   Back/forward → pulihkan juga scroll kategori. Anti proses ganda via lastRouteKey. */
function route(fromPop) {
  const h = location.hash || '';
  const st = (history.state && typeof history.state === 'object') ? history.state : {};
  const key = routeKey(h, st);
  if (typeof lastRouteKey !== 'undefined' && key === lastRouteKey) {
    if (fromPop) restoreCatScroll();
    return;
  }
  lastRouteKey = key;
  let m;
  // 1) Reader / detail manhwa
  if ((m = h.match(/^#\/baca\/([^/]+)(?:\/(\d+))?/))) {
    const id = decodeURIComponent(m[1]), idx = m[2] === undefined ? null : Number(m[2]);
    if (!MW.loaded) { // data belum siap → muat dulu lalu rute ulang
      ensureMw().then(() => { lastRouteKey = '##retry'; route(fromPop); });
      return;
    }
    if (!findMw(id)) { goCatFallback(); return; }
    setCat('manhwa');
    if (idx === null) {
      if (!$('readModal').hidden) closeReader();
      openDetailMw(id, false);
    } else {
      if ($('detailView').hidden) openDetailMw(id, false);
      openReader(id, idx, false);
    }
    return;
  }
  // 2) Detail / player anime
  if ((m = h.match(/^#\/tonton\/([^/]+)(?:\/e(.+))?/))) {
    const id = decodeURIComponent(m[1]), ep = m[2] === undefined ? null : m[2];
    if (!findShow(id)) { // entri live (rx_) yang belum ada di sesi ini → ambil dulu
      const rxm = id.match(/^rx_(\d+)$/);
      if (rxm) {
        apiSeries(Number(rxm[1])).then((data) => {
          const title = (data.anime && data.anime.title) || ('Rilis ' + rxm[1]);
          if (!findShow(id)) {
            ANI.shows.unshift({ id: id, title: title, cover: '', akid: Number(rxm[1]), episodes: (data.episodes || []).length });
            AKMAP[id] = { id: Number(rxm[1]), episodes: (data.episodes || []).length };
          }
          lastRouteKey = '##retry';
          route(fromPop);
        }).catch(() => goCatFallback());
      } else goCatFallback();
      return;
    }
    setCat('anime');
    openDetailAnime(id, false);
    if (ep !== null) openEpFromRoute(id, ep);
    else if (!$('playerModal').hidden) closePlayer();
    return;
  }
  // 3) Kategori eksplisit
  const cat = catFromHash(h) || st.cat;
  if (cat && CATS.indexOf(cat) >= 0) {
    closeOverlaysSilent();
    setCat(cat);
    if (fromPop) { memRestore(cat); restoreCatScroll(); }
    return;
  }
  // 4) Hash lain (sisa anchor lama) → abaikan total: jangan tutup overlay,
  //    jangan pindah tab, supaya Back tidak merusak tampilan.
  //    Pengecualian: halaman baru dimuat tanpa state → normalisasi ke simpanan.
  if (!st.i && !fromPop && !isViewHash(h)) {
    const sc = sessGet('gq_cat', 'semua');
    setCat(CATS.indexOf(sc) >= 0 ? sc : 'semua');
  }
}
function goCatFallback() {
  closeOverlaysSilent();
  const sc = sessGet('gq_cat', 'semua');
  setCat(CATS.indexOf(sc) >= 0 ? sc : 'semua');
}
/* Buka episode dari URL (#/tonton/id/eN): tunggu daftar siap, lalu putar diam-diam. */
function openEpFromRoute(showId, epNum) {
  const attempt = () => {
    if ($('detailView').hidden || !DV || DV.id !== showId || !DV.eps.length) return false;
    const f = DV.eps.find((x) => String(x.number) === String(epNum));
    const s = findShow(showId);
    if (f && f.ok && s) openPlayerStream(s.title, epNum, f, false);
    else if (f && s) toast('Episode ' + epNum + ' segera hadir — belum ada sumber videonya');
    else if (s) toast('Episode tidak ketemu');
    return true;
  };
  if (attempt()) return;
  const t = setInterval(() => { if (attempt()) clearInterval(t); }, 300);
  setTimeout(() => clearInterval(t), 8000);
}
let DV = { type: null, id: null, eps: [], play: {}, total: 0, gsize: 50, range: 0, sort: 'asc', filter: '', status: '' };
let DVM = { id: null, filter: '' };
let epReqSeq = 0; // anti-campur: abaikan respons basi saat pindah serial
/* Bangun daftar 1..N dari total katalog; yang ada embed = bisa diputar,
   sisanya otomatis "Segera hadir" (tanpa error). */
function buildFullEps(showId, total, items) {
  const play = {};
  (items || []).forEach((e) => {
    const n = Number(e.number);
    if (!n) return;
    const eu = e.embed_url || {};
    if (eu.sub || eu.dub || Object.keys(eu).length) play[n] = e;
  });
  let N = Math.max(Number(total) || 0, 0);
  Object.keys(play).forEach((k) => { if (Number(k) > N) N = Number(k); });
  const eps = [];
  for (let n = 1; n <= N; n++) {
    eps.push(play[n]
      ? { number: n, title: play[n].title, embed_url: play[n].embed_url, ok: true }
      : { number: n, title: 'Episode ' + n, embed_url: {}, ok: false });
  }
  DV.total = N;
  DV.play = play;
  DV.eps = eps;
}
function openDetailAnime(showId, nav) {
  const s = findShow(showId);
  if (!s) return;
  const ak = akOf(showId);
  const aniFresh = $('detailView').hidden || !DV || DV.id !== showId;
  openDetail(s.title);
  DV = { type: 'anime', id: showId, eps: [], play: {}, total: Number(s.episodes) || 0,
    gsize: 50, range: 0, sort: 'asc', filter: '',
    status: s.status === 'tayang' ? 'Sedang Tayang' : (s.kind === 'film' ? 'Film' : 'Tamat') };
  const metaBits = [DV.status, s.year ? String(s.year) : '',
    (s.genres || []).join(', '), DV.total ? DV.total + ' episode' : ''].filter(Boolean);
  $('dvBody').innerHTML =
    '<div class="dv-hero">' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '">' : '') +
    '<div><h2>' + esc(s.title) + '</h2><p class="muted small">' +
    esc(metaBits.join(' • ')) + ' • tonton langsung di sini</p>' +
    (s.synopsis ? '<p class="muted small">' + esc(s.synopsis) + '</p>' : '') + '</div></div>' +
    '<div class="ep-tools">' +
    '<div class="src-tabs" role="group" aria-label="Urutan episode">' +
    '<button class="btn btn-small" data-epsort="asc" type="button">Terlama dulu</button>' +
    '<button class="btn btn-small btn-ghost" data-epsort="desc" type="button">Terbaru dulu</button>' +
    '</div></div>' +
    '<div class="ani-search"><input id="dvEpSearch" type="search" placeholder="Cari episode… (mis. 12)" autocomplete="off"></div>' +
    '<div id="dvEps"><p class="muted">Memuat daftar episode…</p></div>';
  // URL unik per anime (push bila bukaan baru; pindah judul = replace; route = diam)
  if (nav !== false) pushView('#/tonton/' + showId, { cat: CURCAT, view: 'ani', id: showId }, aniFresh);
  if (!ak || !ak.id) {
    // Tanpa embed: tampilkan rentang penuh sebagai "Segera hadir"
    buildFullEps(showId, DV.total, []);
    if (!DV.eps.length) $('dvEps').innerHTML = '<p class="muted">Streaming belum tersedia untuk judul ini.</p>';
    else paintEps();
    return;
  }
  const myReq = ++epReqSeq;
  apiSeries(ak.id).then((data) => {
    if (myReq !== epReqSeq || $('detailView').hidden || DV.id !== showId) return; // anti-campur
    buildFullEps(showId, Number(s.episodes) || 0, data.episodes || []);
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
/* Tambahan otomatis: episode yang rilis setelah data dibakar ikut masuk
   (rentang diperpanjang, bukan menimpa daftar 1..N). */
function refreshEps(showId, akid, myReq) {
  apiGet('/series/' + akid).then((j) => {
    if (myReq !== epReqSeq || $('detailView').hidden || !DV || DV.id !== showId) return;
    const live = (j.data && j.data.episodes) || [];
    const baru = live.filter((e) => !DV.play[Number(e.number)]);
    if (!baru.length) return;
    const items = DV.eps.filter((x) => x.ok)
      .map((x) => ({ number: x.number, title: x.title, embed_url: x.embed_url }))
      .concat(baru.map((e) => ({ number: e.number, title: e.title, embed_url: e.embed_url || {} })));
    let N = DV.total;
    baru.forEach((e) => { if (Number(e.number) > N) N = Number(e.number); });
    buildFullEps(showId, N, items);
    paintEps();
    toast(baru.length + ' episode baru ditambahkan otomatis');
  }).catch(() => { /* diam: data bawaan tetap dipakai */ });
}
/* Daftar episode: cari nomor + grup EP + urut terbaru/terlama.
   Tombol gelap = "Segera hadir" (tanpa error); tepi biru = episode terbaru (ongoing). */
function paintEps() {
  const box = $('dvEps');
  if (!box || !DV.eps.length) return;
  const q = DV.filter.trim();
  const s = findShow(DV.id);
  const ongoing = s && s.status === 'tayang';
  let maxOk = 0;
  DV.eps.forEach((e) => { if (e.ok && e.number > maxOk) maxOk = e.number; });
  let list;
  if (q) {
    list = DV.eps.filter((ep) => String(ep.number).includes(q));
  } else {
    list = DV.eps.slice();
  }
  list = list.slice().sort((x, y) => DV.sort === 'desc' ? y.number - x.number : x.number - y.number);
  box.innerHTML = '<div class="ep-grid">' + list.map((ep) => {
    if (!ep.ok) {
      return '<button class="ep-btn soon" disabled type="button" title="Episode ' + ep.number + ' — Segera hadir" aria-label="Episode ' + ep.number + ' segera hadir">' + ep.number + '</button>';
    }
    const isNew = ongoing && ep.number === maxOk;
    return '<button class="ep-btn' + (isNew ? ' is-new' : '') + '" data-ep="' + DV.id + ':' + ep.number + '" type="button" title="' + esc((ep.title || ('Episode ' + ep.number)) + (isNew ? ' — BARU' : '')) + '">' + ep.number + (isNew ? '<i>●</i>' : '') + '</button>';
  }).join('') + '</div><p class="muted small">' +
    (q ? list.length + ' hasil untuk “' + esc(q) + '”.'
      : DV.total + ' episode') +
    ' — klik nomor untuk menonton. <span class="ep-legend"><b class="lg-new">tepi biru</b>=terbaru, <b class="lg-soon">gelap</b>=segera hadir.</span></p>';
}

/* (player torrent/WebTorrent dihapus — semua diputar langsung di situs) */
let PCtx = null; // {showId, epNum}
function closePlayer() {
  // B3: ingat menit terakhir (waktu kunjungan; iframe embed tidak exposed ke JS)
  if (PCtx) {
    store.set('gq_posv_' + PCtx.showId + '_' + PCtx.epNum, Date.now());
  }
  PCtx = null;
  $('playerModal').hidden = true;
  if ($('readModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
  const f = $('pFrame');
  f.removeAttribute('src');
  f.hidden = true;
  $('pServers').hidden = true;
  $('pServers').innerHTML = '';
  paintLanjutHome();
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
function openPlayerStream(showTitle, epNum, ep, nav) {
  const servers = streamServers(ep);
  if (!servers.length) { toast('Server tidak tersedia untuk episode ini'); return; }
  const playFresh = $('playerModal').hidden;
  $('playerModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('pTitle').textContent = (showTitle + ' — E' + epNum).slice(0, 70);
  // B3+B1: simpan episode terakhir + riwayat; tampilkan info tontonan sebelumnya
  const sid = DV && DV.type === 'anime' ? DV.id : (findShowByTitle(showTitle) || '');
  PCtx = { showId: sid, epNum: String(epNum) };
  // URL unik per episode tayang (push bila bukaan baru; ganti server = diam; route = diam)
  if (nav !== false && sid) pushView('#/tonton/' + sid + '/e' + epNum,
    { cat: CURCAT, view: 'play', id: sid, ep: String(epNum) }, playFresh);
  if (sid) {
    store.set('gq_contv', { id: sid, ep: String(epNum), at: Date.now() });
    pushHist({ type: 'anime', id: sid, sub: 'Episode ' + epNum });
    const last = store.get('gq_posv_' + sid + '_' + epNum, 0);
    $('pResume').textContent = last
      ? 'Terakhir dibuka ' + new Date(last).toLocaleString('id-ID') + ' — lanjutkan menonton (posisi tepat tergantung server video).'
      : 'Tips: embed video dari server pihak ketiga — posisi menit tidak bisa disimpan otomatis oleh browser.';
  } else {
    $('pResume').textContent = '';
  }
  paintLanjutHome();
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
  paintEpNav();
}

/* ---------- 5. MANHWA: baca langsung di situs (Komiku) ---------- */
/* State katalog baca: filter genre, urutan, pencarian, bookmark, status, muat-lebih */
const MW_UI = { q: '', genre: '', sort: 'terbaru', bookOnly: false, bmStatus: '', limit: 24, per: 24 };
function findMw(id) { return MW.titles.find((t) => t.id === id); }
/* Kartu: seluruh kartu bisa diklik; .show-info flex column + tombol
   didorong ke bawah (margin-top:auto di CSS); judul max 2 baris (CSS clamp) */
function mwCard(t) {
  const upd = mwUpdated(t);
  const bm = isBookmarked(t.id);
  return '<article class="show-card" data-mread="' + t.id + '" tabindex="0" role="link" ' +
    'aria-label="Baca ' + esc(t.title) + '">' +
    '<div class="show-cover"><i>' + esc(initials(t.title)) + '</i>' +
    (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="Cover ' + esc(t.title) + '" ' +
      'loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + t.total + ' CH</span>' + mwBadge(t) + '</div>' +
    '<div class="show-info"><strong>' + esc(t.title) + '</strong>' +
    '<small class="show-meta">' + esc(mwStatus(t)) + ' • ' + esc(mwGenres(t).join(', ')) +
    (upd ? '<br>' + esc(fmtTglID(upd)) : '') + '</small>' +
    '<div class="show-btns"><button class="btn" data-mread="' + t.id + '" type="button">📖 Baca</button>' +
    '<button class="bm-btn' + (bm ? ' on' : '') + '" data-bm="' + t.id + '" type="button" ' +
    'aria-pressed="' + bm + '" title="Bookmark">🔖</button></div></div></article>';
}
function mwFiltered() {
  let list = MW.titles.filter((t) =>
    (!MW_UI.q || t.title.toLowerCase().includes(MW_UI.q)) &&
    (!MW_UI.genre || (t.genres || []).includes(MW_UI.genre)) &&
    (!MW_UI.bookOnly || isBookmarked(t.id)) &&
    (!MW_UI.bmStatus || bmStatus(t.id) === MW_UI.bmStatus));
  if (MW_UI.sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title, 'id'));
  else if (MW_UI.sort === 'populer') list.sort((a, b) => b.total - a.total);
  else list.sort((a, b) => parseTgl(mwUpdated(b)) - parseTgl(mwUpdated(a))); // terbaru
  return list;
}
/* Skeleton saat katalog besar dimuat (4MB+) agar tidak blank) */
function mwSkeleton() {
  $('mwGrid').innerHTML = Array.from({ length: 12 }, () =>
    '<div class="skel" aria-hidden="true"><div class="skel-cover"></div><div class="skel-line"></div></div>'
  ).join('');
  $('mwCount').textContent = 'Memuat katalog…';
}
/* Skeleton sampul (A7): dipakai saat muat awal maupun Muat lagi */
function mwSkeletonMore(n) {
  const grid = $('mwGrid');
  const d = document.createElement('div');
  d.className = 'show-grid';
  d.setAttribute('aria-hidden', 'true');
  d.innerHTML = Array.from({ length: n || 8 }, () =>
    '<div class="skel"><div class="skel-cover"></div><div class="skel-line"></div></div>'
  ).join('');
  grid.appendChild(d);
  return d;
}
function renderMw() {
  return keepScroll(() => {
  const grid = $('mwGrid');
  const list = mwFiltered();
  const slice = list.slice(0, MW_UI.limit);
  grid.innerHTML = slice.map(mwCard).join('') || '<p class="muted">Tidak ketemu. Coba kata lain.</p>';
  $('mwCount').textContent = 'Menampilkan ' + slice.length + ' dari ' + list.length + ' manhwa • ' +
    list.reduce((a, t) => a + t.total, 0) + ' chapter';
  const more = $('mwMore');
  if (more) more.hidden = slice.length >= list.length;
  grid.hidden = false;
  // A5: hasil kosong → tawarkan request dengan kata pencarian terisi otomatis
  const empty = $('mwEmpty');
  if (empty) {
    const show = MW_UI.q && !list.length;
    empty.hidden = !show;
    if (show) $('mwEmptyQ').textContent = $('mwSearch').value.trim();
  }
  paintLanjut(); // strip lanjutkan membaca ikut refresh
  paintLanjutHome();
  paintPreview();
  });
}
/* Pagination bernomor diganti tombol Muat lagi (A7) — stub agar aman */
function paintPager() {}
/* Isi dropdown genre dari data (bukan hardcode) */
function paintGenres() {
  const sel = $('mwGenre');
  if (!sel || sel.options.length > 1) return;
  const all = {};
  MW.titles.forEach((t) => (t.genres || []).forEach((g) => { all[g] = 1; }));
  Object.keys(all).sort((a, b) => a.localeCompare(b, 'id')).forEach((g) => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    sel.appendChild(o);
  });
}
/* Saran otomatis saat mengetik (maks 6, bisa keyboard) */
function paintSuggest(q) {
  const box = $('mwSuggest'), input = $('mwSearch');
  if (!box) return;
  q = (q || '').toLowerCase().trim();
  if (q.length < 2 || !MW.loaded) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  const hits = MW.titles.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6);
  if (!hits.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  box.innerHTML = hits.map((t, i) =>
    '<button role="option" data-sug="' + t.id + '" type="button" class="' + (i === 0 ? 'sel' : '') + '">' +
    (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span>' + esc(t.title) + '<br><small class="show-meta">' + t.total + ' CH • ' + esc(mwStatus(t)) + '</small></span></button>'
  ).join('');
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}
/* Strip "Lanjutkan membaca" dari localStorage */
function paintLanjut() {
  const wrap = $('lanjutWrap');
  if (!wrap) return;
  const c = store.get('gq_cont', null);
  const t = c && findMw(c.id);
  if (!t) { wrap.hidden = true; return; }
  wrap.hidden = false;
  $('lanjutJudul').textContent = t.title + ' — ' + (c.ch || '');
  $('lanjutBtn').onclick = () => openReader(c.id, c.idx || 0);
}
function openDetailMw(id, pushHash) {
  const t = findMw(id);
  if (!t) return;
  openDetail(t.title);
  // URL unik per manhwa (push bila bukaan baru, replace bila pindah judul dari detail)
  const wasDetail = !$('detailView').hidden && DVM.id === id;
  DVM = { id, filter: '' };
  if (pushHash !== false) pushView('#/baca/' + id, { cat: CURCAT, view: 'mw', id: id }, !wasDetail);
  const upd = mwUpdated(t);
  const bm = isBookmarked(id);
  const st = bmStatus(id);
  const stBtn = (v, label) => '<button data-bmstatus="' + id + ':' + v + '" type="button" class="' + (st === v ? 'on' : '') + '">' + label + '</button>';
  $('dvBody').innerHTML =
    '<div class="dv-hero">' +
    (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="Cover ' + esc(t.title) + '" loading="lazy" decoding="async">' : '') +
    '<div><h2>' + esc(t.title) + '</h2>' +
    '<p class="muted small">' + esc(mwStatus(t)) + ' • ' + esc(mwGenres(t).join(', ')) +
    (upd ? ' • ' + esc(fmtTglID(upd)) : '') + ' • ' + t.total + ' chapter</p>' +
    '<div class="btn-row"><button class="btn btn-small' + (bm ? '' : ' btn-ghost') + '" data-bm-detail="' + id + '" type="button" aria-pressed="' + bm + '">' +
    (bm ? '📌 Dibookmark' : '🔖 Bookmark') + '</button>' +
    '<button class="btn btn-small btn-ghost" data-acaktitle type="button">🎲 Acak lain</button></div>' +
    '<div class="bm-status" role="group" aria-label="Status bookmark">' +
    stBtn('ongoing', 'Sedang dibaca') + stBtn('wishlist', 'Mau dibaca') + stBtn('done', 'Selesai') + '</div></div></div>' +
    '<div class="ani-search"><input id="dvChSearch" type="search" placeholder="Cari chapter… (mis. 12)" autocomplete="off" aria-label="Cari chapter"></div>' +
    '<div id="dvChList" class="rel-list"></div>';
  paintCh();
  setSEO(t.title + ' — Baca Manhwa | Guoke AMHDQ',
    'Baca ' + t.title + ' (' + mwStatus(t) + ', ' + t.total + ' chapter) langsung di Guoke AMHDQ.');
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
let rdCtx = null, rdReqSeq = 0;
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
function openReader(titleId, chIdx, pushHash) {
  const t = findMw(titleId);
  if (!t) return;
  rdCtx = { id: titleId, i: Number(chIdx) };
  const c = t.chapters[rdCtx.i];
  if (!c) return;
  const rdFresh = $('readModal').hidden; // true = bukaan baru dari daftar
  $('readModal').hidden = false;
  document.body.style.overflow = 'hidden';
  paintFullBtns();
  applyRdWidth();
  // URL unik per chapter (push bila bukaan baru; Next/Prev/select = replace)
  if (pushHash !== false) pushView('#/baca/' + titleId + '/' + rdCtx.i,
    { cat: CURCAT, view: 'rd', id: titleId, idx: rdCtx.i }, rdFresh);
  // Simpan "lanjutkan membaca" (tanpa login) + riwayat
  store.set('gq_cont', { id: titleId, idx: rdCtx.i, ch: c.t, at: Date.now() });
  pushHist({ type: 'mw', id: titleId, sub: c.t });
  setSEO(t.title + ' ' + c.t + ' | Guoke AMHDQ', 'Baca ' + t.title + ' ' + c.t + ' langsung di Guoke AMHDQ.');
  $('rdTitle').textContent = t.title + ' — ' + c.t;
  const sel = $('rdSelect');
  sel.innerHTML = t.chapters.map((x, j) =>
    '<option value="' + j + '"' + (j === rdCtx.i ? ' selected' : '') + '>CH ' + esc(x.n) + ' — ' + esc(x.d || '') + '</option>'
  ).join('');
  sel.onchange = () => openReader(titleId, Number(sel.value));
  const atFirst = rdCtx.i <= 0, atLast = rdCtx.i >= t.chapters.length - 1;
  [$('rdPrev'), $('rdPrev2')].forEach((b) => { b.disabled = atLast; b.onclick = () => openReader(titleId, rdCtx.i + 1); });
  [$('rdNext'), $('rdNext2'), $('rdFloatNext')].forEach((b) => { if (b) { b.disabled = atFirst; b.onclick = () => openReader(titleId, rdCtx.i - 1); } });
  // A4: tombol lapor terisi otomatis judul + chapter
  const rp = $('rdReport');
  if (rp) rp.onclick = () => openBantuan('lap', { judul: t.title, ch: c.t });
  loadChapter();
}
/* B2: pengaturan lebar gambar reader */
function applyRdWidth() {
  const w = store.get('gq_rdw', 'med');
  const sel = $('rdWidth');
  if (sel) sel.value = w;
  const pg = $('rdPages');
  if (pg) pg.className = 'rd-pages rd-w-' + (w === 'full' ? 'full' : w === 'narrow' ? 'narrow' : 'med');
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
      '<img src="' + esc(cdn(u)) + '" alt="' + esc(t.title + ' ' + c.t + ' halaman ' + (k + 1)) +
      '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">'
    ).join('');
    $('rdStatus').textContent = imgs.length + ' halaman • ' + c.t + ' • geser ke bawah untuk membaca.';
    rdScroller().scrollTop = 0;
    restorePos(); // kembali ke posisi terakhir bila ada
    preloadNext(t, rdCtx.i); // siapkan gambar chapter berikut
  }).catch(() => {
    if (!rdCtx || myReq !== rdReqSeq) return;
    $('rdStatus').textContent = 'Gagal memuat gambar (jaringan sibuk). Tutup lalu buka lagi, atau coba beberapa saat lagi.';
  });
}
/* Ingat posisi baca terakhir per chapter (disimpan berkala saat scroll).
   Catatan: yang scroll adalah .pbox di dalam modal, bukan modalnya. */
let posTimer = null;
function rdScroller() { return document.querySelector('#readModal .pbox'); }
function posKey() { return rdCtx ? 'gq_pos_' + rdCtx.id + '_' + rdCtx.i : null; }
function restorePos() {
  const k = posKey();
  if (!k) return;
  const y = store.get(k, 0);
  if (y > 0) {
    rdScroller().scrollTop = y;
    $('rdStatus').textContent += ' (dilanjutkan dari posisi terakhir)';
  }
}
function savePosSoon() {
  clearTimeout(posTimer);
  posTimer = setTimeout(() => {
    const k = posKey();
    if (k) store.set(k, rdScroller().scrollTop);
  }, 600);
}
/* Preload 2 gambar pertama chapter berikut (lebih halus saat Next) */
function preloadNext(t, i) {
  const nx = t.chapters[i + 1] || t.chapters[i - 1];
  if (!nx) return;
  const slug = t.slug;
  const go = (imgs) => (imgs || []).slice(0, 2).forEach((u) => {
    const im = new Image();
    im.decoding = 'async';
    im.src = cdn(u);
  });
  if (MW.pages && MW.pages[slug] && MW.pages[slug][nx.u]) go(MW.pages[slug][nx.u]);
  else fetch('data/mw/' + slug + '.json').then((r) => r.json()).then((j) => {
    MW.pages = MW.pages || {};
    MW.pages[slug] = j.pages || {};
    go(MW.pages[slug][nx.u]);
  }).catch(() => {});
}
function closeReader() {
  $('readModal').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if ($('playerModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
  rdCtx = null;
  paintLanjut(); // strip lanjutkan ikut update setelah membaca
  paintLanjutHome();
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
  // Sumber utama: data-anime.js (satu file, bisa diedit manual).
  // Cadangan: fetch JSON bila script data belum termuat.
  const bootAnime = (d) => {
    ANI = d;
    $('aniDate').textContent = d.updated || '';
    renderShows('');
    paintPreview();
    paintLanjutHome();
    loadFresh(); // rilis baru otomatis di latar
  };
  if (window.GQ_ANIME && window.GQ_ANIME.shows && window.GQ_ANIME.shows.length) {
    (window.GQ_ANIME.shows || []).forEach((s) => {
      if (s.akid) AKMAP[s.id] = { id: s.akid, episodes: s.episodes };
    });
    bootAnime({ updated: window.GQ_ANIME.updated || '', shows: window.GQ_ANIME.shows });
  } else {
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
      bootAnime(d);
    })
    .catch(() => {
      $('showGrid').innerHTML = '<p class="muted">Data anime tidak termuat. Periksa koneksi lalu refresh.</p>';
    });
  }
  $('aniSearch').addEventListener('input', (e) => { ANI_UI.limit = ANI_UI.per; renderShows(e.target.value); });
  const am = $('aniMore');
  if (am) am.addEventListener('click', () => {
    ANI_UI.limit += ANI_UI.per;
    renderShows();
    paintPreview();
  });
  document.querySelectorAll('[data-anif]').forEach((b) => b.addEventListener('click', () => {
    ANI_UI.f = b.dataset.anif;
    ANI_UI.limit = ANI_UI.per;
    document.querySelectorAll('[data-anif]').forEach((x) => x.classList.toggle('btn-ghost', x !== b));
    renderShows();
  }));
  $('dvBack').addEventListener('click', () => {
    // Kembali ke kategori asal (anime / manhwa sesuai detail yang dibuka)
    smartBack(DV.type === 'anime' && DV.id ? 'anime' : 'manhwa');
  });
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
    const es = e.target.closest('[data-epsort]');
    if (es && DV.type === 'anime') {
      DV.sort = es.dataset.epsort === 'desc' ? 'desc' : 'asc';
      document.querySelectorAll('[data-epsort]').forEach((x) => x.classList.toggle('btn-ghost', x !== es));
      paintEps();
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
      if (found && !found.ok) { toast('Episode ' + num + ' segera hadir — belum ada sumber videonya'); return; }
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
    // Bookmark dari kartu (jangan ikut membuka detail)
    const bm = e.target.closest('[data-bm]');
    if (bm) {
      e.stopPropagation();
      const on = toggleBookmark(bm.dataset.bm);
      bm.classList.toggle('on', on);
      bm.setAttribute('aria-pressed', on);
      renderMw(); // hitung ulang bila filter bookmark aktif
      toast(on ? 'Ditambahkan ke bookmark 📌' : 'Bookmark dihapus');
      return;
    }
    // Bookmark dari halaman detail
    const bmd = e.target.closest('[data-bm-detail]');
    if (bmd) {
      const on = toggleBookmark(bmd.dataset.bmDetail);
      bmd.classList.toggle('btn-ghost', !on);
      bmd.setAttribute('aria-pressed', on);
      bmd.textContent = on ? '📌 Dibookmark' : '🔖 Bookmark';
      toast(on ? 'Ditambahkan ke bookmark 📌' : 'Bookmark dihapus');
      return;
    }
    // Pagination katalog lama sudah diganti tombol "Muat lagi" (A7)
    // Saran pencarian → buka detail
    const sg = e.target.closest('[data-sug]');
    if (sg) {
      const b = $('mwSuggest'); if (b) b.hidden = true;
      openDetailMw(sg.dataset.sug);
      return;
    }
    // Salin preset TikTok satu klik
    const cp = e.target.closest('[data-copypreset]');
    if (cp) {
      const pre = $(cp.dataset.copypreset);
      const done = () => toast('Preset disalin! Tempel ke aplikasi editing-mu.');
      if (pre) {
        if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(done, () => toast('Gagal menyalin'));
        else toast('Clipboard tidak tersedia');
      }
      return;
    }
    const ch = e.target.closest('[data-ch]');
    if (ch) {
      const [tid, idx] = ch.dataset.ch.split(':');
      openReader(tid, Number(idx));
      return;
    }
    if (e.target.closest('[data-full]')) { toggleFull(); return; }
  });
  document.addEventListener('fullscreenchange', paintFullBtns);
  $('pClose').addEventListener('click', () => smartBack('anime'));
  $('playerModal').addEventListener('click', (e) => { if (e.target === $('playerModal')) smartBack('anime'); });
  $('rdClose').addEventListener('click', keluarReader);
  $('readModal').addEventListener('click', (e) => { if (e.target === $('readModal')) keluarReader(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('playerModal').hidden) smartBack('anime');
    else if (e.key === 'Escape' && !$('readModal').hidden) keluarReader();
    else if (e.key === 'Escape' && !$('detailView').hidden) {
      smartBack(DV.type === 'anime' && DV.id ? 'anime' : 'manhwa');
    }
  });
}
function initManhwa() {
  const input = $('mwSearch');
  input.addEventListener('input', (e) => {
    MW_UI.q = e.target.value.toLowerCase().trim();
    MW_UI.limit = MW_UI.per;
    if (MW.loaded) renderMw();
    paintSuggest(e.target.value); // saran otomatis saat mengetik
  });
  // Tutup saran saat fokus lepas (beri jeda agar klik sempat terdaftar)
  input.addEventListener('blur', () => setTimeout(() => {
    const b = $('mwSuggest'); if (b) { b.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  }, 150));
  $('mwGenre').addEventListener('change', (e) => { MW_UI.genre = e.target.value; MW_UI.limit = MW_UI.per; renderMw(); });
  $('mwSort').addEventListener('change', (e) => { MW_UI.sort = e.target.value; MW_UI.limit = MW_UI.per; renderMw(); });
  $('mwBookmarked').addEventListener('change', (e) => { MW_UI.bookOnly = e.target.checked; MW_UI.limit = MW_UI.per; renderMw(); });
  const bms = $('mwBmStatus');
  if (bms) bms.addEventListener('change', (e) => { MW_UI.bmStatus = e.target.value; MW_UI.limit = MW_UI.per; renderMw(); });
  const more = $('mwMore');
  if (more) more.addEventListener('click', () => {
    more.disabled = true;
    more.textContent = 'Memuat…';
    const sk = mwSkeletonMore(8);
    setTimeout(() => {
      sk.remove();
      MW_UI.limit += MW_UI.per;
      renderMw();
      more.disabled = false;
      more.textContent = 'Muat lagi';
    }, 350);
  });
  const acak = $('mwAcak');
  if (acak) acak.addEventListener('click', () => openRandomMw());
  // B2: lebar gambar reader
  const rw = $('rdWidth');
  if (rw) rw.addEventListener('change', (e) => { store.set('gq_rdw', e.target.value); applyRdWidth(); });
  // Simpan posisi baca saat scroll reader (debounce di savePosSoon)
  const rbox = document.querySelector('#readModal .pbox');
  if (rbox) rbox.addEventListener('scroll', savePosSoon, { passive: true });
}
/* Tombol Acak (B6): rekomendasi acak dari katalog yang sudah dimuat */
function openRandomMw() {
  if (!MW.loaded || !MW.titles.length) { ensureMw().then(() => openRandomMw()); return; }
  const pool = mwFiltered();
  const src = pool.length ? pool : MW.titles;
  const t = src[Math.floor(Math.random() * src.length)];
  if (t) openDetailMw(t.id);
}
function openRandomAnime() {
  if (!ANI.shows.length) return;
  const s = ANI.shows[Math.floor(Math.random() * ANI.shows.length)];
  if (s) openDetailAnime(s.id);
}
function ensureMw() {
  if (MW.loaded) return Promise.resolve();
  if (MW.loading) return MW._p || Promise.resolve();
  MW.loading = true;
  mwSkeleton(); // skeleton dulu, bukan blank
  MW._p = fetch('data/manhwa.json')
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then((d) => {
      MW = Object.assign(d, { loaded: true, loading: false });
      $('mwDate').textContent = d.updated || '';
      paintGenres();
      renderMw();
    })
    .catch(() => {
      MW.loading = false;
      $('mwGrid').innerHTML = '<p class="muted">Data manhwa tidak termuat. Periksa koneksi lalu refresh.</p>';
    });
  return MW._p;
}
initAnime();
initManhwa();
wireModals();
paintLanjutHome();
applyRdWidth();
/* setCat awal + route() dipanggil dari initFromUrl() (ujung file) agar kategori
   mengikuti URL (#/anime dsb.) atau simpanan sesi, bukan selalu "Semua". */

/* --- Enter/Space pada kartu (aksesibilitas keyboard) --- */
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-mread]')) {
    e.preventDefault();
    openDetailMw(e.target.dataset.mread || e.target.closest('[data-mread]').dataset.mread);
  }
});
/* --- Deep-link + Back/forward: pulihkan state dari URL --- */
window.addEventListener('hashchange', () => route(false));
window.addEventListener('popstate', () => route(true));
/* Inisialisasi dari URL ada di initFromUrl() (ujung file, setelah semua
   deklarasi) agar kategori mengikuti URL/session, bukan selalu "Semua". */

/* --- Slider banding sebelum/sesudah (mouse, sentuh, keyboard) --- */
(function () {
  const box = $('cmpSlider');
  if (!box) return;
  const range = box.querySelector('.cmp-range');
  const set = (v) => box.style.setProperty('--pos', Math.max(0, Math.min(100, v)) + '%');
  range.addEventListener('input', () => set(range.value));
  set(range.value);
})();

/* --- Modal Bantuan (dua tab), Riwayat, Tentang --- */
function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModals() {
  ['bantuModal', 'riwayatModal', 'tentangModal'].forEach((id) => { const m = $(id); if (m) m.hidden = true; });
  if ($('playerModal').hidden && $('readModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
}
function openBantuan(tab, prefill) {
  openModal('bantuModal');
  if (tab) switchBtab(tab);
  if (prefill) {
    if (prefill.judul && $('laporJudul')) $('laporJudul').value = prefill.judul;
    if (prefill.ch && $('laporCh')) $('laporCh').value = prefill.ch;
    if (prefill.req && $('requestJudul')) $('requestJudul').value = prefill.req;
    if (prefill.tipe && $('requestTipe')) $('requestTipe').value = prefill.tipe;
  }
}
function switchBtab(which) {
  const isReq = which === 'req';
  $('btabReq').hidden = !isReq;
  $('btabLap').hidden = isReq;
  document.querySelectorAll('[data-btab]').forEach((b) =>
    b.classList.toggle('btn-ghost', (b.dataset.btab === 'req') !== isReq));
}
function paintHist() {
  const g = $('histGrid');
  if (!g) return;
  const h = store.get('gq_hist', []);
  if (!h.length) { g.innerHTML = '<p class="muted">Belum ada riwayat.</p>'; return; }
  g.innerHTML = h.map((x) => {
    if (x.type === 'mw') {
      const t = findMw(x.id);
      if (!t) return '';
      return '<article class="show-card" data-mread="' + t.id + '">' +
        '<div class="show-cover"><i>' + esc(initials(t.title)) + '</i>' +
        (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
        '<div class="show-info"><strong>' + esc(t.title) + '</strong><small>' + esc(x.sub || '') + '</small>' +
        '<div class="show-btns"><button class="btn" data-mread="' + t.id + '" type="button">📖 Baca</button></div></div></article>';
    }
    const s = findShow(x.id);
    if (!s) return '';
    return '<article class="show-card">' +
      '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
      (s.cover ? '<img src="' + esc(s.cover) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
      '<div class="show-info"><strong>' + esc(s.title) + '</strong><small>' + esc(x.sub || '') + '</small>' +
      '<div class="show-btns"><button class="btn" data-watch="' + s.id + '" type="button">▶ Nonton</button></div></div></article>';
  }).join('');
}
function wireModals() {
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const w = b.dataset.open;
    if (w === 'bantuan') openBantuan('req');
    else if (w === 'riwayat') { paintHist(); openModal('riwayatModal'); }
    else if (w === 'tentang') openModal('tentangModal');
  }));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
  ['bantuModal', 'riwayatModal', 'tentangModal'].forEach((id) => {
    const m = $(id);
    if (m) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
  });
  document.querySelectorAll('[data-btab]').forEach((b) =>
    b.addEventListener('click', () => switchBtab(b.dataset.btab)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
  const hc = $('histClear');
  if (hc) hc.addEventListener('click', () => { store.set('gq_hist', []); paintHist(); toast('Riwayat dihapus'); });
  const pp = $('pPrev'), pn = $('pNext');
  if (pp) pp.addEventListener('click', () => stepEpisode(-1));
  if (pn) pn.addEventListener('click', () => stepEpisode(1));
  const aa = $('aniAcak');
  if (aa) aa.addEventListener('click', openRandomAnime);
  const at = $('acakBtnTop');
  if (at) at.addEventListener('click', () => {
    if (Math.random() < 0.5) openRandomAnime(); else openRandomMw();
  });
  const lhx = $('lhX');
  if (lhx) lhx.addEventListener('click', () => {
    store.set('gq_cont', null); store.set('gq_contv', null);
    paintLanjutHome(); paintLanjut();
  });
    // Tombol "Buat Preset" selalu beralih ke tab TikTok dulu (tanpa hash anchor)
  document.querySelectorAll('a[href="#kalkulator"]').forEach((a) => a.addEventListener('click', (e) => {
    if (e && e.preventDefault) e.preventDefault();
    goCat('tiktok');
    if ($('kalkulator')) $('kalkulator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  // A5: tombol request dari empty-state + hint, kata pencarian terisi otomatis
  const reqGo = (q, tipe) => openBantuan('req', { req: q || '', tipe: tipe || 'Manhwa' });
  const me = $('mwEmptyReq');
  if (me) me.addEventListener('click', () => reqGo($('mwSearch').value.trim(), 'Manhwa'));
  const ae = $('aniEmptyReq');
  if (ae) ae.addEventListener('click', () => reqGo($('aniSearch').value.trim(), 'Anime'));
  document.querySelectorAll('[data-reqopen]').forEach((b) => b.addEventListener('click', () => {
    const kind = b.dataset.reqopen === 'anime' ? 'Anime' : 'Manhwa';
    const q = kind === 'Anime' ? ($('aniSearch') ? $('aniSearch').value.trim() : '') : ($('mwSearch') ? $('mwSearch').value.trim() : '');
    reqGo(q, kind);
  }));
  // Status bookmark dari detail (B7)
  document.addEventListener('click', (e) => {
    const sb = e.target.closest && e.target.closest('[data-bmstatus]');
    if (sb) {
      const [id, v] = sb.dataset.bmstatus.split(':');
      setBmStatus(id, bmStatus(id) === v ? '' : v);
      openDetailMw(id, false);
      if (MW.loaded) renderMw();
      toast('Status bookmark diperbarui');
      return;
    }
    const at2 = e.target.closest && e.target.closest('[data-acaktitle]');
    if (at2) { openRandomMw(); }
  });
}

/* --- Form lapor chapter rusak & request judul (localStorage + salin admin) --- */
(function () {
  const lf = $('laporForm');
  if (lf) lf.addEventListener('submit', (e) => {
    e.preventDefault();
    const lap = store.get('gq_lapor', []);
    lap.push({
      judul: $('laporJudul').value.trim(), ch: $('laporCh').value.trim(),
      masalah: $('laporMasalah').value, at: new Date().toISOString().slice(0, 10),
    });
    store.set('gq_lapor', lap);
    lf.reset();
    $('laporDone').hidden = false;
    const ul = $('laporList');
    if (ul) ul.innerHTML = lap.map((r) => '<li>' + esc(r.judul) + ' — ' + esc(r.ch) + ' <em>(' + esc(r.masalah) + ')</em></li>').join('');
    toast('Laporan tersimpan 🙏');
  });
  const paintReq = () => {
    const ul = $('requestList');
    if (!ul) return;
    const list = store.get('gq_req', []);
    ul.innerHTML = list.length
      ? list.map((r) => '<li>' + esc(r.judul) + ' <em>(' + esc(r.tipe) + ')</em></li>').join('')
      : '<li class="muted">Belum ada request.</li>';
  };
  const paintLap = () => {
    const ul = $('laporList');
    if (!ul) return;
    const list = store.get('gq_lapor', []);
    ul.innerHTML = list.length
      ? list.map((r) => '<li>' + esc(r.judul) + ' — ' + esc(r.ch) + ' <em>(' + esc(r.masalah) + ')</em></li>').join('')
      : '<li class="muted">Belum ada laporan.</li>';
  };
  const rf = $('requestForm');
  if (rf) rf.addEventListener('submit', (e) => {
    e.preventDefault();
    const list = store.get('gq_req', []);
    list.unshift({ judul: $('requestJudul').value.trim(), tipe: $('requestTipe').value });
    store.set('gq_req', list.slice(0, 50));
    rf.reset();
    paintReq();
    toast('Request tersimpan ✓');
  });
  paintReq();
  paintLap();
  const rc = $('reqCopy');
  if (rc) rc.addEventListener('click', async () => {
    const list = store.get('gq_req', []);
    if (!list.length) { toast('Belum ada request'); return; }
    const txt = 'Request judul dari Guoke AMHDQ:\n' + list.map((r, i) => (i + 1) + '. ' + r.judul + ' (' + r.tipe + ')').join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Disalin! Kirim ke admin ✓'); }
    catch { toast('Gagal menyalin'); }
  });
    const lc = $('lapCopy');
  if (lc) lc.addEventListener('click', async () => {
    const list = store.get('gq_lapor', []);
    if (!list.length) { toast('Belum ada laporan'); return; }
    const txt = 'Laporan chapter rusak (Guoke AMHDQ):\n' + list.map((r, i) => (i + 1) + '. ' + r.judul + ' — ' + r.ch + ' [' + r.masalah + '] (' + r.at + ')').join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Disalin! Kirim ke admin ✓'); }
    catch { toast('Gagal menyalin'); }
  });
})();

/* --- Jelajahi semua anime: Populer / Sedang Tayang / cari / Muat lagi ---
   API resmi hanya menyediakan /recent-anime + /series/{id} (tanpa endpoint
   search/top). Maka: "Populer" = katalog bawaan, "Sedang Tayang" = live
   recent-anime per halaman, "cari" = filter keduanya di perangkat. */
const JX = { mode: 'top', q: '', page: 1, per: 24, live: [], livePage: 0, liveDone: false, busy: false };
function jxLocal() {
  return ANI.shows.filter((s) => s.id.indexOf('rx_') !== 0);
}
function jxCardLive(it) {
  return '<article class="show-card">' +
    '<div class="show-cover"><i>★</i>' +
    (it.poster ? '<img src="' + esc(it.poster) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge">LIVE</span></div>' +
    '<div class="show-info"><strong>' + esc(it.title || it.alternative || 'Tanpa judul') + '</strong>' +
    '<small>live • klik untuk menonton</small>' +
    '<div class="show-btns"><button class="btn" data-fresh="' + it.id + '" type="button">▶ Nonton</button></div></div></article>';
}
function paintJx() {
  const grid = $('jxGrid');
  if (!grid) return;
  const more = $('jxMore');
  const q = JX.q.toLowerCase();
  if (JX.mode === 'airing' && !JX.q) {
    const pool = JX.live;
    const slice = pool.slice(0, Math.max(JX.page * JX.per, pool.length));
    grid.innerHTML = slice.map(jxCardLive).join('') ||
      (JX.busy ? '<p class="muted">Memuat…</p>' : '<p class="muted">Belum ada data live.</p>');
    if (more) { more.hidden = JX.liveDone; more.textContent = JX.busy ? 'Memuat…' : 'Muat lagi (hal. ' + (JX.livePage + 1) + ')'; }
  } else {
    const poolL = jxLocal().filter((s) => !q || s.title.toLowerCase().includes(q));
    const poolV = JX.live.filter((it) => q && String(it.title || it.alternative || '').toLowerCase().includes(q));
    const slice = poolL.slice(0, JX.page * JX.per);
    grid.innerHTML = (slice.map(showCard).join('') + poolV.slice(0, 12).map(jxCardLive).join('')) ||
      '<p class="muted">Tidak ketemu. Coba kata lain.</p>';
    if (more) {
      more.hidden = slice.length >= poolL.length;
      more.textContent = 'Muat lagi (' + slice.length + '/' + poolL.length + ')';
    }
  }
}
async function jxMoreLive() {
  if (JX.busy || JX.liveDone) return;
  JX.busy = true; paintJx();
  try {
    const j = await apiGet('/recent-anime?page=' + (JX.livePage + 1) + '&per_page=' + JX.per);
    const rows = j.data || [];
    const seen = {};
    JX.live.forEach((it) => { seen[it.id] = 1; });
    rows.forEach((it) => { if (it && it.id && !seen[it.id]) { seen[it.id] = 1; JX.live.push(it); } });
    JX.livePage++;
    if (!rows.length) JX.liveDone = true;
  } catch (e) {
    toast('Gagal memuat (jaringan/API sibuk)');
  }
  JX.busy = false; paintJx();
}
(function initJx() {
  const jm = document.querySelectorAll('[data-jxmode]');
  const curMode = () => {
    const air = document.querySelector('[data-jxmode="airing"]');
    return air && !air.classList.contains('btn-ghost') ? 'airing' : 'top';
  };
  jm.forEach((b) => b.addEventListener('click', () => {
    JX.mode = b.dataset.jxmode === 'airing' ? 'airing' : 'top';
    JX.page = 1;
    jm.forEach((x) => x.classList.toggle('btn-ghost', x !== b));
    if (JX.mode === 'airing' && !JX.live.length) jxMoreLive();
    else paintJx();
  }));
  const js = $('jxSearch');
  if (js) js.addEventListener('input', (e) => {
    JX.q = e.target.value.trim();
    if (!JX.q) JX.mode = curMode();
    JX.page = 1;
    paintJx();
  });
  const more = $('jxMore');
  if (more) more.addEventListener('click', () => {
    if (JX.mode === 'airing' && !JX.q) jxMoreLive();
    else { JX.page++; paintJx(); }
  });
  paintJx();
  // Ikut refresh begitu katalog anime selesai dimuat dari jaringan
  const rs = renderShows;
  renderShows = function (f) {
    const r = rs(f);
    try { paintJx(); } catch (e) {}
    return r;
  };
})();

/* Riwayat juga mencatat kunjungan halaman detail ("judul terakhir dibuka") */
(function wrapHist() {
  if (window.__histWrapped) return;
  window.__histWrapped = true;
  const odm = openDetailMw;
  openDetailMw = function (id, ph) {
    const r = odm(id, ph);
    const t = findMw(id);
    if (t) { pushHist({ type: 'mw', id, sub: t.total + ' chapter' }); paintHist(); }
    return r;
  };
  const oda = openDetailAnime;
  openDetailAnime = function (sid) {
    const r = oda(sid);
    const s = findShow(sid);
    if (s) {
      const ak = akOf(sid);
      pushHist({ type: 'anime', id: sid, sub: (ak ? ak.episodes : s.episodes) + ' episode' });
      paintHist(); paintLanjutHome();
    }
    return r;
  };
})();

/* --- Auto-hide header/tab/toolbar saat scroll (mulus, anti-kedip) ---
   - Scroll bawah >10px → sembunyi (translateY, transisi .25s di CSS).
   - Scroll atas >10px / posisi paling atas → muncul lagi.
   - rAF + passive listener. Fixed + padding-top (tanpa lompatan layout).
   - Jangan sembunyi bila ada modal/menu terbuka. Hormati safe-area (CSS). */
(function autoHide() {
  const doc = document.documentElement;
  const TH = 10;
  // Ukur tinggi bar aktual (berbeda HP vs desktop) → var CSS --tbh/--cbh.
  // HANYA saat lebar berubah: naik-turunnya address bar HP (tinggi saja)
  // tidak boleh memicu apa pun selain ini, dan ini pun no-op bila sama.
  let lastBarW = 0;
  const setBars = () => {
    if (window.innerWidth === lastBarW && lastBarW !== 0) return;
    lastBarW = window.innerWidth;
    const tb = document.querySelector('.topbar'), cb = document.querySelector('.catbar');
    if (tb && tb.offsetHeight) doc.style.setProperty('--tbh', tb.offsetHeight + 'px');
    if (cb && cb.offsetHeight) doc.style.setProperty('--cbh', cb.offsetHeight + 'px');
  };
  setBars();
  window.addEventListener('resize', setBars);
  window.addEventListener('orientationchange', () => setTimeout(setBars, 300));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setBars);
  setTimeout(setBars, 600);

  function watcher(scroller, onHide, onShow, isLocked) {
    let last = scroller === window ? window.scrollY : scroller.scrollTop;
    let raf = 0, hidden = false;
    const cur = () => (scroller === window ? window.scrollY : scroller.scrollTop);
    const step = () => {
      raf = 0;
      const y = Math.max(0, cur());
      if (isLocked && isLocked()) {
        if (hidden) { hidden = false; onShow(); }
        last = y; return;
      }
      if (y <= 8) { // paling atas → selalu tampil
        if (hidden) { hidden = false; onShow(); }
        last = y; return;
      }
      if (y > last + TH) {
        if (!hidden) { hidden = true; onHide(); }
        last = y;
      } else if (y < last - TH) {
        if (hidden) { hidden = false; onShow(); }
        last = y;
      }
    };
    scroller.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    return {
      sync(hideNow) {
        hidden = !!hideNow;
        last = Math.max(0, cur());
        if (hidden) onHide(); else onShow();
      },
    };
  }
  const anyModal = () => !!document.querySelector('.pmodal:not([hidden])');
  // (a) Header utama + baris tab filter (scroll halaman)
  watcher(window,
    () => document.body.classList.add('ah-hide'),
    () => document.body.classList.remove('ah-hide'),
    () => anyModal() || !$('detailView').hidden);
  // (b) Toolbar reader (scroll di dalam .pbox; berlaku juga saat fullscreen)
  const rbox = document.querySelector('#readModal .pbox');
  if (rbox) {
    const rdW = watcher(rbox,
      () => $('readModal').classList.add('rd-hide'),
      () => $('readModal').classList.remove('rd-hide'),
      () => !!document.querySelector('.pmodal:not([hidden]):not(#readModal)'));
    // (c) Ketuk sekali di sepertiga tengah layar → tampil/sembunyi toolbar
    let pd = null;
    rbox.addEventListener('pointerdown', (e) => {
      pd = { x: e.clientX, y: e.clientY, t: Date.now() };
    }, { passive: true });
    rbox.addEventListener('pointerup', (e) => {
      if (!pd || $('readModal').hidden) { pd = null; return; }
      const moved = Math.hypot(e.clientX - pd.x, e.clientY - pd.y);
      const dt = Date.now() - pd.t;
      pd = null;
      if (moved > 12 || dt > 400) return; // geser/tekan lama = bukan ketuk
      const h = window.innerHeight;
      if (e.clientY < h * 0.3 || e.clientY > h * 0.7) return;
      const t = e.target;
      if (t && t.closest && t.closest('button,select,a,input')) return;
      const m = $('readModal');
      const willHide = !m.classList.contains('rd-hide');
      m.classList.toggle('rd-hide', willHide);
      rdW.sync(willHide);
    }, { passive: true });
  }
})();

/* --- Navigasi kategori + tombol Back per kategori (tanpa reload, tanpa lempar ke atas) ---
   URL: #/semua #/anime #/manhwa #/tiktok • detail #/baca/.. • #/tonton/..
   - Klik tab → history.pushState (pushState TIDAK memicu hashchange).
   - Back/forward → popstate (+hashchange) → route() terpadu, anti proses ganda via lastRouteKey.
   - Kategori terakhir + limit "Muat lagi" dicadangkan di sessionStorage (try/catch).
   - Posisi scroll tiap kategori diingat (memori sesi) dan dipulihkan saat kembali.
   - var (bukan let) agar aman bila route() awal terpanggil sebelum blok ini dieksekusi. */
var CATS = ['semua', 'anime', 'manhwa', 'tiktok'];
var CURCAT = 'semua';
var navSeq = 0;
var lastRouteKey = '##init';
var CATMEM = { semua: {}, anime: {}, manhwa: {}, tiktok: {} };
// Satu-satunya pengatur scroll saat traversasi adalah restoreCatScroll().
// Matikan restore bawaan browser agar tak balapan/adu geser dengannya.
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
function sessGet(k, fb) { try { const v = sessionStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
function sessSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function catFromHash(h) {
  const m = String(h || '').match(/^#\/(semua|anime|manhwa|tiktok)(?:[\/?]|$)/);
  return m ? m[1] : '';
}
function isViewHash(h) { return /^#\/(baca|tonton)\//.test(String(h || '')); }
/* Simpan posisi scroll + jumlah item termuat milik kategori yang ditinggalkan */
function memSaveList() {
  CATMEM[CURCAT] = CATMEM[CURCAT] || {};
  CATMEM[CURCAT].y = window.scrollY || 0;
  if (typeof MW_UI !== 'undefined' && MW_UI) CATMEM[CURCAT].mw = MW_UI.limit;
  if (typeof ANI_UI !== 'undefined' && ANI_UI) CATMEM[CURCAT].ani = ANI_UI.limit;
  sessSet('gq_cat', CURCAT);
  sessSet('gq_lim', { mw: (typeof MW_UI !== 'undefined' && MW_UI) ? MW_UI.limit : 24,
    ani: (typeof ANI_UI !== 'undefined' && ANI_UI) ? ANI_UI.limit : 12 });
}
/* Pulihkan jumlah item termuat (render ulang bila perlu) */
function memRestore(cat) {
  const m = CATMEM[cat] || {};
  if (m.mw && typeof MW_UI !== 'undefined' && MW_UI && MW_UI.limit < m.mw) {
    MW_UI.limit = m.mw;
    if (typeof MW !== 'undefined' && MW.loaded) renderMw();
  }
  if (m.ani && typeof ANI_UI !== 'undefined' && ANI_UI && ANI_UI.limit < m.ani) {
    ANI_UI.limit = m.ani;
    renderShows();
  }
}
function restoreCatScroll() {
  const m = CATMEM[CURCAT] || {};
  const y = Math.max(0, m.y || 0);
  const apply = () => {
    try { window.scrollTo({ top: y, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  };
  apply();
  // Kompensasi layout-shift (gambar lazy-load menggeser halaman): SEKALI saja,
  // dan HANYA bila pengguna tidak scroll sendiri. Tidak pernah melawan scroll pengguna.
  const t0 = Date.now();
  let touched = false;
  const mark = () => { if (Date.now() - t0 > 250) touched = true; };
  window.addEventListener('scroll', mark, { passive: true });
  setTimeout(() => {
    window.removeEventListener('scroll', mark);
    if (touched) return; // pengguna sudah scroll → jangan sentuh
    if ($('detailView').hidden === false) return;
    if (!$('readModal').hidden || !$('playerModal').hidden) return;
    if (Math.abs((window.scrollY || 0) - y) < 40) return; // sudah pas
    apply();
  }, 900);
}
function navPush(url, state) {
  navSeq++;
  try { history.pushState(Object.assign({ i: navSeq, cat: CURCAT }, state), '', url); }
  catch (e) { location.hash = url; } // cadangan browser sangat lama
  lastRouteKey = routeKey(location.hash, history.state);
}
function navReplace(url, state) {
  const cur = (history.state && history.state.i) || navSeq;
  try { history.replaceState(Object.assign({ i: cur, cat: CURCAT }, state), '', url); }
  catch (e) {}
  lastRouteKey = routeKey(location.hash, history.state);
}
function routeKey(h, st) {
  st = (st && typeof st === 'object') ? st : {};
  return String(h || '') + '¦' + (st.i || 0) + '¦' + (st.view || '') + '¦' + (st.id || '') +
    '¦' + (st.idx !== undefined ? st.idx : (st.ep !== undefined ? 'e' + st.ep : ''));
}
/* Pindah kategori oleh pengguna: simpan memori, tampilkan, tulis URL (push). */
function goCat(cat, opts) {
  opts = opts || {};
  if (CATS.indexOf(cat) < 0) cat = 'semua';
  if (cat !== CURCAT) memSaveList();
  setCat(cat);
  const url = '#/' + cat;
  if (opts.replace) navReplace(url, { cat: cat });
  else if (opts.push !== false) {
    if (location.hash !== url) navPush(url, { cat: cat });
    else navReplace(url, { cat: cat });
  }
}
/* Buka view (detail/reader/player): push bila bukaan baru, replace bila sudah terbuka. */
function pushView(url, state, fresh) {
  memSaveList();
  if (fresh === false) navReplace(url, state);
  else navPush(url, state);
}
/* Tutup semua overlay TANPA menyentuh riwayat/URL (dipakai route & tombol). */
function closeOverlaysSilent() {
  if (typeof PCtx !== 'undefined' && PCtx && typeof store !== 'undefined') {
    try { store.set('gq_posv_' + PCtx.showId + '_' + PCtx.epNum, Date.now()); } catch (e) {}
  }
  if (typeof PCtx !== 'undefined') PCtx = null;
  if (!$('playerModal').hidden) {
    $('playerModal').hidden = true;
    const f = $('pFrame');
    f.removeAttribute('src');
    f.hidden = true;
    $('pServers').hidden = true;
    $('pServers').innerHTML = '';
  }
  if (!$('readModal').hidden) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $('readModal').hidden = true;
  }
  if (typeof rdCtx !== 'undefined') rdCtx = null;
  if (!$('detailView').hidden) $('detailView').hidden = true;
  if ($('playerModal').hidden && $('readModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
  setSEO(SEO_HOME[0], SEO_HOME[1]);
  paintLanjut();
  paintLanjutHome();
}
/* Tombol Kembali/X/Escape: mundur di riwayat bila entri sebelumnya milik kita,
   kalau tidak (deep-link) langsung ganti ke kategori asal tanpa nambah entri. */
function smartBack(fallbackCat) {
  const st = history.state;
  if (st && typeof st === 'object' && st.view && history.length > 1) { history.back(); return; }
  const cat = fallbackCat || (st && st.cat) || sessGet('gq_cat', 'semua');
  closeOverlaysSilent();
  goCat(CATS.indexOf(cat) >= 0 ? cat : 'semua', { replace: true });
}
/* Keluar reader → selalu kembali ke kategori asal (bukan ke detail). */
function keluarReader() {
  const st = history.state;
  const cat = (st && st.cat) || sessGet('gq_cat', 'manhwa');
  closeOverlaysSilent();
  goCat(CATS.indexOf(cat) >= 0 ? cat : 'manhwa');
  restoreCatScroll();
}

/* Inisialisasi dari URL (bukan selalu "Semua"): hash kategori > session > semua.
   Sengaja di ujung file agar semua var/const sudah terinisialisasi. */
(function initFromUrl() {
  const lim = sessGet('gq_lim', null);
  if (lim) {
    if (lim.mw && typeof MW_UI !== 'undefined' && MW_UI.limit < lim.mw) MW_UI.limit = lim.mw;
    if (lim.ani && typeof ANI_UI !== 'undefined' && ANI_UI.limit < lim.ani) ANI_UI.limit = lim.ani;
  }
  const hc = catFromHash(location.hash);
  const sc = sessGet('gq_cat', 'semua');
  const start = hc || (CATS.indexOf(sc) >= 0 ? sc : 'semua');
  setCat(start);
  // Normalisasi URL+state tanpa menambah entri (kecuali URL view bagikan)
  if (!isViewHash(location.hash)) navReplace('#/' + start, { cat: start });
  route(false);
})();
