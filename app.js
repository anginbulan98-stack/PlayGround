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
  const showTiktok = cat === 'semua' || cat === 'tiktok';
  const showManhwa = cat === 'semua' || cat === 'manhwa';
  const showAnime = cat === 'semua' || cat === 'anime';
  TIKTOK_SELS.forEach((s) => document.querySelectorAll(s).forEach((el) => { el.hidden = !showTiktok; }));
  const m = $('manhwaPanel'), a = $('animePanel');
  if (m) m.hidden = !showManhwa;
  if (a) a.hidden = !showAnime;
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

/* ---------- 4. ANIME: nonton langsung (data nyaa.si) ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GUOKE_URL = 'https://anginbulan98-stack-guoke2-0-b69e7dbe3d9d.omgithub.com/';
const WT_CDN = 'https://cdn.jsdelivr.net/npm/webtorrent@1/webtorrent.min.js';
let NYAA = { updated: '', shows: [] };
let wtClient = null, wtLoading = null, wtTimer = null;

function initials(t) {
  return t.split(/[\s:;]+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}
function showCard(s) {
  return '<article class="show-card" data-show="' + s.id + '">' +
    '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + s.entries.length + ' RILIS</span></div>' +
    '<div class="show-info"><strong>' + esc(s.title) + '</strong>' +
    '<small>▲ ' + s.seeders + ' seeder • ' + s.entries.length + ' rilis</small>' +
    '<div class="show-btns"><button class="btn" data-watch="' + s.id + '" type="button">▶ Nonton</button>' +
    '<a class="btn btn-ghost" href="' + GUOKE_URL + '" target="_blank" rel="noopener">Guoke</a></div></div></article>';
}
function relRow(s, e, i) {
  return '<div class="rel"><div class="rel-title">' + esc(e.t) + '</div>' +
    '<div class="rel-meta"><span class="tag q">' + esc(e.q) + '</span>' +
    '<span class="tag">' + esc(e.codec) + '</span><span class="tag">' + esc(e.kind) + '</span>' +
    '<span class="tag' + (e.ext === 'MP4' ? ' mp4' : '') + '">' + esc(e.ext) + '</span>' +
    (e.trusted ? '<span class="tag trust">✓ Trusted</span>' : '') + '</div>' +
    '<div class="rel-sub">' + esc(e.size) + ' • ▲ ' + e.seeders + ' • ' + esc(e.date) + '</div>' +
    '<div class="rel-btns"><button class="btn" data-play="' + s.id + ':' + i + '" type="button">▶ Tonton</button>' +
    '<button class="btn btn-ghost" data-magnet="' + i + '" data-show="' + s.id + '" type="button">🧲 Magnet</button>' +
    '<button class="btn btn-ghost" data-copy="' + i + '" data-show="' + s.id + '" type="button">Salin</button></div></div>';
}
function findShow(id) { return NYAA.shows.find((s) => s.id === id); }
function findEntry(showId, i) { const s = findShow(showId); return s ? s.entries[Number(i)] : null; }

function renderShows(filter) {
  const grid = $('showGrid'), q = (filter || '').toLowerCase().trim();
  const list = NYAA.shows.filter((s) => !q || s.title.toLowerCase().includes(q) ||
    s.entries.some((e) => e.t.toLowerCase().includes(q)));
  grid.innerHTML = list.map(showCard).join('') ||
    '<p class="muted">Tidak ketemu. Coba kata lain atau tombol “Cari live di nyaa.si”.</p>';
  $('aniCount').textContent = list.length + ' anime • ' +
    list.reduce((a, s) => a + s.entries.length, 0) + ' rilis • sumber nyaa.si';
  $('relWrap').hidden = true;
  grid.hidden = false;
}
function renderReleases(showId) {
  const s = findShow(showId);
  if (!s) return;
  $('showGrid').hidden = true;
  $('relWrap').hidden = false;
  $('relTitle').textContent = s.title;
  $('relList').innerHTML = s.entries.map((e, i) => relRow(s, e, i)).join('');
  $('relWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadWT() {
  if (window.WebTorrent) return Promise.resolve();
  if (wtLoading) return wtLoading;
  wtLoading = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = WT_CDN;
    sc.onload = () => resolve();
    sc.onerror = () => reject(new Error('CDN WebTorrent tidak terjangkau'));
    document.head.appendChild(sc);
    setTimeout(() => reject(new Error('Timeout memuat WebTorrent')), 25000);
  });
  return wtLoading;
}
function openPlayer(title, magnet) {
  $('playerModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('pTitle').textContent = title.length > 60 ? title.slice(0, 60) + '…' : title;
  const v = $('pVideo');
  v.pause();
  v.removeAttribute('src');
  v.load();
  $('pFiles').hidden = true;
  $('pFiles').innerHTML = '';
  $('pStatus').textContent = 'Menyiapkan WebTorrent…';
  $('pMagnet').onclick = () => { window.location.href = magnet; };
  $('pCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(magnet); toast('Magnet disalin!'); }
    catch { toast('Gagal menyalin'); }
  };
  clearInterval(wtTimer);
  loadWT().then(() => {
    $('pStatus').textContent = 'Mencari peer WebRTC & metadata… (bisa 30–60 dtk; torrent biasa sering tak ada peer browser)';
    if (!wtClient) wtClient = new WebTorrent();
    let done = false;
    const failTimer = setTimeout(() => {
      if (!done) {
        done = true;
        try { wtClient.remove(magnet); } catch (e) {}
        $('pStatus').textContent = 'Tidak dapat peer/metadata dalam 60 dtk. Pakai “Buka Magnet” di aplikasi torrent (qBittorrent/uTorrent) — itu cara paling pasti.';
      }
    }, 60000);
    try {
      wtClient.add(magnet, (torrent) => {
        const vids = torrent.files.filter((f) => /\.(mp4|mkv|webm|m4v)$/i.test(f.name));
        if (!vids.length) {
          clearTimeout(failTimer); done = true;
          $('pStatus').textContent = 'Tidak ada file video di torrent ini. Pakai “Buka Magnet”.';
          return;
        }
        vids.sort((a, b) => {
          const am = /\.mp4$/i.test(a.name) ? 0 : 1, bm = /\.mp4$/i.test(b.name) ? 0 : 1;
          return am - bm || b.length - a.length;
        });
        const sel = $('pFiles');
        sel.innerHTML = vids.map((f, i) => '<option value="' + i + '">' + esc(f.name) + '</option>').join('');
        sel.hidden = vids.length < 2;
        sel.onchange = () => playFile(vids[Number(sel.value)], torrent);
        playFile(vids[0], torrent);
        function playFile(f, t) {
          clearTimeout(failTimer); done = true;
          const mp4 = /\.mp4$/i.test(f.name);
          $('pStatus').textContent = mp4
            ? 'Streaming… ' + f.name
            : 'Streaming… ' + f.name + ' (MKV/HEVC mungkin tidak bisa diputar browser — kalau macet, pakai Magnet).';
          try {
            f.renderTo(v, (err) => {
              if (err) $('pStatus').textContent = 'Browser tidak bisa memutar file ini (' + (err.message || err) + '). Pakai “Buka Magnet”.';
            });
          } catch (err) {
            $('pStatus').textContent = 'Gagal memutar. Pakai “Buka Magnet”.';
          }
          clearInterval(wtTimer);
          wtTimer = setInterval(() => {
            const pct = (t.progress * 100).toFixed(1);
            const sp = (t.downloadSpeed / 1048576).toFixed(2);
            $('pStatus').textContent = '▶ ' + pct + '% • ' + sp + ' MB/s • peer: ' + t.numPeers + ' • ' + f.name;
          }, 1500);
        }
      });
    } catch (err) {
      clearTimeout(failTimer);
      $('pStatus').textContent = 'Gagal memulai torrent. Pakai “Buka Magnet”.';
    }
  }).catch(() => {
    $('pStatus').textContent = 'WebTorrent tidak bisa dimuat (offline/CDN diblokir). Pakai “Buka Magnet” / “Salin Magnet”.';
  });
}
function closePlayer() {
  $('playerModal').hidden = true;
  document.body.style.overflow = '';
  const v = $('pVideo');
  v.pause();
  v.removeAttribute('src');
  v.load();
  clearInterval(wtTimer);
}

async function liveSearchNyaa(query) {
  const proxies = [
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  ];
  const url = 'https://nyaa.si/?page=rss&q=' + encodeURIComponent(query) + '&c=1_2&f=0';
  let xml = '';
  for (const p of proxies) {
    try {
      const r = await fetch(p(url));
      if (!r.ok) continue;
      xml = await r.text();
      if (xml.includes('<item')) break;
      xml = '';
    } catch (e) { /* coba proxy berikut */ }
  }
  if (!xml) throw new Error('proxy');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item')).slice(0, 10).map((it) => {
    const g = (t) => (it.querySelector(t) || {}).textContent || '';
    const ns = (t) => {
      const el = it.getElementsByTagNameNS('https://nyaa.si/xmlns/nyaa', t)[0];
      return el ? el.textContent : '';
    };
    const title = g('title'), hash = ns('infoHash');
    const tr = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz']
      .map((t) => 'tr=' + encodeURIComponent(t)).join('&');
    return { t: title, magnet: 'magnet:?xt=urn:btih:' + hash + '&dn=' + encodeURIComponent(title) + '&' + tr,
      size: ns('size'), seeders: Number(ns('seeders') || 0), date: g('pubDate').slice(0, 16),
      q: /2160p/.test(title) ? '2160p' : /1080p/.test(title) ? '1080p' : /720p/.test(title) ? '720p' : 'SD',
      codec: /x265|hevc/i.test(title) ? 'HEVC' : 'H.264', kind: 'Live', ext: /\.mp4/i.test(title) ? 'MP4' : 'MKV', trusted: ns('trusted') === 'Yes' };
  }).filter((e) => e.t && e.magnet.includes('btih:') && !/:$/.test(e.magnet));
  return items;
}

function initAnime() {
  fetch('data/nyaa.json')
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then((d) => {
      NYAA = d;
      $('nyaaDate').textContent = d.updated || '';
      renderShows('');
    })
    .catch(() => {
      $('showGrid').innerHTML = '<p class="muted">Data anime tidak termuat. Periksa koneksi lalu refresh.</p>';
    });
  $('aniSearch').addEventListener('input', (e) => renderShows(e.target.value));
  $('relBack').addEventListener('click', () => renderShows($('aniSearch').value));
  $('aniLive').addEventListener('click', async () => {
    const q = $('aniSearch').value.trim();
    if (!q) { toast('Ketik judul dulu'); return; }
    $('aniLive').disabled = true;
    $('aniLive').textContent = 'Mencari…';
    try {
      const items = await liveSearchNyaa(q);
      $('showGrid').hidden = true;
      $('relWrap').hidden = false;
      $('relTitle').textContent = 'Hasil live: ' + q;
      const fake = { id: 'live' };
      NYAA.shows = NYAA.shows.filter((s) => s.id !== 'live');
      NYAA.shows.unshift({ id: 'live', title: q, cover: '', seeders: 0, entries: items });
      $('relList').innerHTML = items.length
        ? items.map((e, i) => relRow(fake, e, i)).join('')
        : '<p class="muted">Tidak ada hasil.</p>';
    } catch (e) {
      toast('Live search gagal (proxy diblokir) — pakai data lokal');
    } finally {
      $('aniLive').disabled = false;
      $('aniLive').textContent = 'Cari live di nyaa.si';
    }
  });
  document.addEventListener('click', (e) => {
    const w = e.target.closest('[data-watch]');
    if (w) { renderReleases(w.dataset.watch); return; }
    const p = e.target.closest('[data-play]');
    if (p) {
      const [sid, i] = p.dataset.play.split(':');
      const en = findEntry(sid, i);
      if (en) openPlayer(en.t, en.magnet);
      return;
    }
    const m = e.target.closest('[data-magnet]');
    if (m) {
      const en = findEntry(m.dataset.show, m.dataset.magnet);
      if (en) window.location.href = en.magnet;
      return;
    }
    const c = e.target.closest('[data-copy]');
    if (c) {
      const en = findEntry(c.dataset.show, c.dataset.copy);
      if (en) navigator.clipboard.writeText(en.magnet)
        .then(() => toast('Magnet disalin!')).catch(() => toast('Gagal menyalin'));
    }
  });
  $('pClose').addEventListener('click', closePlayer);
  $('playerModal').addEventListener('click', (e) => { if (e.target === $('playerModal')) closePlayer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('playerModal').hidden) closePlayer(); });
}
initAnime();
