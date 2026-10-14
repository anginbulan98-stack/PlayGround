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
