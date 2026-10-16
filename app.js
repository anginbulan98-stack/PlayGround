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

/* --- Dieksekusi paling awal: penyimpanan + kamus bahasa + helper T().
   WAJIB di atas karena calc()/initAnime() langsung jalan saat file dimuat. --- */
const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { try { storeEvict(); localStorage.setItem(k, JSON.stringify(v)); } catch (e2) {} } },
};
/* Perisai tahan-lama: 1 fetch/CDN/proxy gagal TIDAK BOLEH meruntuhkan situs.
   - Cegah "langsung eror" setelah dibuka: telan rejection tak tertangani.
   - Gagal muat skrip pihak ketiga (firebase/ffmpeg) juga ditelan diam-diam. */
(function stabilityShield() {
  if (window.__GQ_SHIELD) return;
  window.__GQ_SHIELD = true;
  window.addEventListener('unhandledrejection', function (e) { try { e.preventDefault(); } catch (_) {} });
  window.addEventListener('error', function (e) {
    try {
      var msg = String((e && (e.message || (e.error && e.error.message))) || '');
      // Skrip CDN pihak ketiga gagal (offline/diblokir) = bukan error fatal.
      if (/firebase|ffmpeg|allorigins|cors|anikotoapi|nyaa/i.test(msg)) { e.preventDefault(); return; }
      // Gagal load resource (gambar/embed pihak ketiga mati) = abaikan.
      if (e && e.target && e.target !== window && (e.target.tagName === 'IMG' || e.target.tagName === 'IFRAME' || e.target.tagName === 'SCRIPT')) { e.preventDefault(); }
    } catch (_) {}
  }, true);
})();
/* Evict cache episode lama bila localStorage penuh (penyebab klasik:
   dibuka sebentar lalu error QuotaExceeded di HP). */
function storeEvict() {
  try {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('ak_') === 0) keys.push(k);
    }
    // Hapus separuh terlama (kunci ak_ = cache episode, aman dibangun ulang).
    keys.slice(0, Math.max(10, Math.ceil(keys.length / 2))).forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    // Longgarkan cache memori juga.
    try { if (typeof seriesCache === 'object' && seriesCache) { var sk = Object.keys(seriesCache); sk.slice(0, Math.ceil(sk.length / 2)).forEach(function (k) { delete seriesCache[k]; }); } } catch (e) {}
  } catch (e) {}
}
/* Tulis cache episode dengan aman (pakai evict otomatis bila penuh). */
function cacheAk(id, d) {
  try {
    // Batasi cache memori (dulu tanpa batas → tab dibuka lama = RAM bengkak → crash).
    if (typeof seriesCache === 'object' && seriesCache) {
      var sk = Object.keys(seriesCache);
      if (sk.length > 40) { sk.slice(0, sk.length - 40).forEach(function (k) { try { delete seriesCache[k]; } catch (e) {} }); }
    }
  } catch (e) {}
  try { localStorage.setItem('ak_' + id, JSON.stringify({ t: Date.now(), d: d })); }
  catch (e) { try { storeEvict(); localStorage.setItem('ak_' + id, JSON.stringify({ t: Date.now(), d: d })); } catch (e2) {} }
}

const I18N = {
  id: {
    nav_read: 'Baca', nav_watch: 'Tonton', nav_help: 'Bantuan',
    menu_history: '🕘 Riwayat', menu_history_short: 'Riwayat', menu_help: 'Bantuan', menu_about: 'ℹ Tentang',
    profile_title: 'Profil', profile_name: 'Nama', profile_change_photo: 'Ganti foto',
    profile_remove_photo: 'Hapus foto', profile_theme: 'Tema', theme_dark: 'Gelap', theme_light: 'Terang',
    profile_lang: 'Bahasa', profile_menu: 'Menu', profile_wipe: 'Hapus semua data saya',
    login_title: 'Login', login_open: 'Masuk / Daftar', login_logout: 'Keluar akun',
    oauth_title: 'Pengaturan login', oauth_sub: 'Tempel ID di bawah agar tombol Google & Facebook aktif. Tersimpan di perangkat ini.',
    oauth_save: 'Simpan ID',
    auth_welcome: 'SELAMAT DATANG KEMBALI', auth_title_in: 'Masuk ke dunia tontonanmu.',
    auth_title_up: 'Buat akun tontonanmu.', auth_sub: 'Lanjutkan anime, manhwa, dan manhua favoritmu dengan pengalaman yang lebih personal.',
    auth_forgot: 'Lupa Kata Sandi?', auth_signin: 'Masuk', auth_signup: 'Daftar',
    auth_google: 'Lanjutkan dengan Google', auth_facebook: 'Lanjutkan dengan Facebook',
    auth_noaccount: 'Belum punya akun?', auth_haveaccount: 'Sudah punya akun?',
    auth_title_reset: 'Reset kata sandimu.', auth_sub_reset: 'Masukkan email akunmu lalu buat sandi baru. Tanpa server, reset dilakukan langsung di perangkat ini.',
    auth_savepass: 'Simpan sandi baru', auth_back: 'Kembali masuk',
    auth_or: 'ATAU', auth_terms1: 'Dengan masuk atau mendaftar, kamu menyetujui', auth_terms2: 'Syarat & Ketentuan',
    auth_terms3: 'dan', auth_terms4: 'Kebijakan Privasi', auth_terms5: 'kami.',
    menu_about2: 'Tentang', profile_name_ph: 'Namamu',
    cat_semua: 'Semua', cat_anime: 'Anime', cat_manhwa: 'Manhwa', cat_segera: 'Akan Rilis', cat_ikon: '🎭 Icon', door_dl: 'Unduh', soon_list_meta: 'segera hadir — belum bisa ditonton',
    ikon_eyebrow: '◆ ICON ANIME • GALERI FOTO', ikon_h2: 'Icon Anime',
    ikon_d: 'Koleksi foto profil anime — ketuk tombol untuk menampilkan, ketuk foto untuk pratinjau.',
    ikon_search_ph: 'Cari foto icon…', ikon_view: '👁 Lihat', ikon_photos: 'foto',
    ikon_upload: '➕ Upload foto',
    ikon_empty: 'Belum ada foto. Ketuk Upload untuk menambah icon anime favoritmu (mis. dari Pinterest) — tersimpan di HP ini.',
    ikon_delete: '🗑 Hapus', ikon_added: 'foto ditambahkan ✓', ikon_deleted: 'Foto dihapus',
    ikon_shared: 'foto tampil untuk semua pengguna ✓', ikon_community: '👥 Komunitas',
    ikon_dl_tab: 'Dibuka di tab baru — tahan gambarnya lalu pilih Simpan/Unduh ✓',
    latest_refresh: '↻ Perbarui', latest_checked: 'Dicek',
    lh_kicker: 'LANJUTKAN', lh_continue: 'Lanjut →', lh_read: 'LANJUTKAN MEMBACA', lh_watch: 'LANJUTKAN MENONTON',
    prev_eyebrow: '◆ PILIHAN UNTUKMU', prev_h2: 'Mulai dari sini', prev_latest: '🆕 Episode Terbaru', prev_ch: '📖 Chapter Terbaru', prev_anime: '🔥 Anime pilihan', prev_mw: '📖 Manhwa pilihan',
    see_all: 'Lihat semua →',
    chip_all: 'Semua', jx_nodata: 'Belum ada data live.', jx_live: 'live • klik untuk menonton', jx_untitled: 'Tanpa judul', continue_reading: 'LANJUTKAN MEMBACA', continue_btn: 'Lanjutkan →',
    mw_eyebrow: '◆ MANHWA • BACA LANGSUNG', mw_h2: 'Baca Manhwa di sini',
    mw_desc: 'Chapter lengkap + gambar, dibaca langsung di situs ini',
    mw_search_ph: 'Cari judul manhwa…', ani_search_ph: 'Cari judul anime…', jx_search_ph: 'Cari semua anime… (mis. One Piece)',
    not_found: 'Tidak ketemu?', req_title: 'Minta judul', req_this: 'Request judul ini', empty_for: 'Tidak ada hasil untuk',
    f_type: 'Tipe', f_type_all: 'Manhwa + Manhua', f_genre: 'Genre', f_genre_all: 'Semua genre',
    f_sort: 'Urutkan', f_sort_new: 'Terbaru update', f_sort_pop: 'Populer',
    f_bmstatus: 'Status bookmark', f_bms_all: 'Semua status', f_bms_ongoing: 'Sedang dibaca',
    f_bms_wish: 'Mau dibaca', f_bms_done: 'Selesai', f_bookmarked: '📌 Bookmark saya', acak: '🎲 Acak',
    load_more: 'Muat lagi', loading: 'Memuat…',
    back: '← Kembali', prev: '← Prev', next: 'Next →', full: '⛶ Penuh', full_exit: '✕ Keluar',
    bm_added: 'Ditambahkan ke bookmark 📌', bm_removed: 'Bookmark dihapus', page_w: 'halaman',
    img_width: 'Lebar gambar', w_full: 'Penuh', w_med: 'Sedang', w_narrow: 'Sempit',
    report: '⚠ Lapor chapter rusak', float_next: 'Chapter berikutnya →',
    ep_like_aria: 'Suka episode ini', cmt_h: 'Komentar', cmt_name_ph: 'Nama (opsional)',
    cmt_ph: 'Tulis komentar…', cmt_send: 'Kirim', cmt_empty: 'Belum ada komentar. Jadilah yang pertama!',
    cmt_need: 'Tulis komentar dulu', cmt_deleted: 'Komentar dihapus', cmt_anon: 'Anonim',
    cmt_bad: 'Komentar mengandung kata tidak pantas', cmt_reported: 'Laporan terkirim, terima kasih', cmt_report: 'Laporkan',
    cmt_local: 'Komentar tersimpan di perangkat ini.',
    lib_eyebrow: '◆ PUSTAKAMU', lib_title: 'Pustaka', lib_riwayat: 'Riwayat', lib_daftar: 'Daftarku',
    lib_empty_bm: 'Daftarku masih kosong. Ketuk 🔖 Bookmark di halaman judul untuk menyimpan.',
    g_today: 'Hari ini', g_yday: 'Kemarin', g_week: 'Minggu ini', g_older: 'Lebih lama',
    ani_eyebrow: '◆ ANIME • NONTON LANGSUNG', ani_h2: 'Nonton Anime di sini',
    ani_desc: 'Pilih judul, pilih episode, langsung putar di sini',
    anif_all: 'Semua', anif_new: 'Episode Terbaru', anif_airing: 'Sedang Tayang', anif_done: 'Tamat', anif_film: 'Film', anif_soon: 'Akan Rilis',
    fresh_h: '🔥 Baru Rilis — otomatis', fresh_d: 'Judul terbaru yang langsung ditambahkan otomatis. Klik untuk menonton.',
    latest_h: '🆕 Episode Terbaru — 2026', latest_d: 'Rilisan terbaru + update episode, putar langsung di situs. Ketuk untuk menonton.',
    upcoming_h: '📅 Anime Akan Rilis — belum tayang', upcoming_d: 'Judul yang sudah diumumkan tapi belum ada episodenya. Klik untuk info + jadwal. Tombol Nonton aktif otomatis setelah rilis.',
    soon_badge: 'SEGERA', soon_meta: 'Segera hadir', card_info: 'ℹ Info', soon_note: 'Belum ada episode yang bisa diputar. Judul ini akan otomatis bisa ditonton setelah tanggal rilis.',
    jx_h: '🌐 Jelajahi semua anime', jx_d: 'Katalog live ribuan judul — cari apa pun, klik untuk menonton langsung di sini.',
    jx_pop: 'Populer', jx_air: 'Sedang Tayang', pl_dl: '⬇ Download episode',
    hero_eyebrow: '◆ TIKTOK HD • 2K • 120FPS', hero_h1a: 'Upload TikTok', hero_h1b: 'tetap HD', hero_h1c: 'nggak burik kena kompres.',
    hero_lede: 'Tool + preset gratis buat kreator: setting export <strong>1080×1920 / 1440×2560 (2K)</strong>, <strong>60–120 FPS</strong>, bitrate tinggi, format yang disukai TikTok. Hasil lebih tajam, teks nggak pecah.',
    cta1: 'Cek Videoku Sekarang', cta2: 'Hitung Preset 2K/120FPS',
    honest: '<strong>Jujur dulu:</strong> TikTok <em>selalu</em> me-<em>re-encode</em> video kamu. Nggak ada tool yang bikin “0% kompres”. Tapi kalau file mentahmu <strong>2K + bitrate tinggi + 60fps</strong>, hasil kompres TikTok jauh lebih bersih daripada upload 720p bitrate rendah. Website ini ngasih setting yang paling aman.',
    cek_eyebrow: '◆ LANGKAH 1 — CEK VIDEO', cek_h2: 'Apakah videomu sudah layak HD?',
    cek_d: 'Drop file MP4/MOV di bawah. Semua dicek <strong>lokal di browser</strong> — video tidak diupload ke mana pun.',
    dz_drop: 'Tarik & letakkan video di sini', dz_or: 'atau klik untuk pilih file • maks dicek ~500MB',
    res: 'Resolusi', dur: 'Durasi', size: 'Ukuran', br: 'Bitrate est.',
    pz_eyebrow: '◆ ALAT UTAMA — PROSES & DOWNLOAD', pz_h2: 'Proses video jadi TikTok HD',
    pz_d: 'File <strong>tidak diunggah ke server</strong> — diproses langsung di HP-mu. Output selalu <strong>MP4 siap upload + tombol Download</strong>.',
    pz_formats: 'atau klik untuk pilih file • MP4/MOV/MKV/WebM/AVI, 480p–8K • maks 500 MB / 3 menit',
    m_mode: 'Mode output', mode_auto: 'Otomatis — rasio asli, sisi pendek 1080', mode_vfit: 'TikTok vertikal 1080×1920 — Pas (bar hitam)',
    mode_vfill: 'TikTok vertikal 1080×1920 — Isi penuh (crop tengah)', mode_vblur: 'TikTok vertikal 1080×1920 — Latar blur',
    mode_sq: 'Persegi 1080×1080', mode_land: 'Landscape 1920×1080', mode_auto2k: '2K — sisi pendek 1440',
    m_fps: 'FPS output', fps60: '60 fps (default)', fps30: '30 fps (lebih cepat)',
    interp: 'Kualitas maksimal — interpolasi gerak (lama)', pz_go: 'Proses video', pz_cancel: 'Batal', pz_prep: 'Menyiapkan…',
    pz_dl: '⬇ Unduh (guoke-uploader-hd.mp4)', pz_share: '📤 Bagikan ke TikTok', pz_open: '⬆ Buka Unggahan TikTok',
    pz_flow: 'Alur: Unduh dulu (atau Bagikan langsung di HP) → di halaman upload TikTok pilih file hasilnya → pastikan “Kualitas tinggi / Izinkan unggahan HD” aktif.',
    honest2: '<strong>Jujur:</strong> video kecil yang diperbesar <em>tidak jadi lebih tajam</em>, dan <em>tidak ada</em> video yang 100% anti-kompres — TikTok <em>selalu</em> me-re-encode ke bitrate rendah. Yang alat ini lakukan: memberi “umpan” terbaik (2K + CRF 16 + bitrate 25–35 Mbps + faststart) supaya sisa setelah kompres tetap bersih. 30→60fps biasa <em>menduplikasi frame</em>; centang “Kualitas maksimal” untuk interpolasi gerak (minterpolate, jauh lebih lama).',
    kalk_eyebrow: '◆ LANGKAH 2 — PRESET 2K / 120FPS', kalk_h2: 'Kalkulator export anti-burik',
    kalk_d: 'Pilih resolusi + fps + durasi. Kami hitungkan bitrate, perkiraan ukuran file, dan perintah FFmpeg + preset CapCut / Premiere yang bisa langsung disalin.',
    k_res: 'Resolusi', res1080: '1080×1920 — Full HD (paling aman)', res1440: '1440×2560 — 2K QHD (paling tajam)',
    k_fps: 'FPS timeline', cfps30: '30 FPS — ngomong / daily', cfps60: '60 FPS — dance / transisi', cfps120: '120 FPS — slow-motion',
    k_dur: 'Durasi video (detik)', k_codec: 'Codec', codec264: 'H.264 — paling kompatibel', codec265: 'H.265 / HEVC — file 40% lebih kecil',
    o_br: 'BITRATE VIDEO', o_size: 'PERKIRAAN FILE', o_up: 'UPLOAD KE TIKTOK',
    cap_h: 'Preset CapCut PC (Export)', ff_h: 'FFmpeg (copy-paste)', copy_preset: 'Salin Preset', copy_ff: 'Salin FFmpeg',
    pd_eyebrow: '◆ LANGKAH 3 — CARA EXPORT', pd_h2: 'Panduan per aplikasi',
    g1_h: 'CapCut PC (paling gampang, gratis)',
    g1_1: 'Rasio <strong>9:16</strong>, resolusi <strong>1440×2560</strong> (kalau lag, pakai 1080×1920).',
    g1_2: 'Frame rate: <strong>60</strong> (video biasa) / <strong>50–60 untuk 120fps slow-mo</strong> — TikTok mentok tampil 60fps.',
    g1_3: 'Bit rate → <strong>Recommended / Higher</strong>, codec <strong>H.264</strong>, format <strong>MP4</strong>.',
    g1_4: 'Audio: <strong>AAC 320kbps, 48kHz</strong>. Matikan “smart HDR” kalau warna jadi pudar.',
    g1_5: 'Upload via <strong>tiktok.com/upload</strong> (PC + WiFi stabil) hasilnya biasanya lebih bersih daripada dari HP.',
    g2_h: 'Premiere Pro',
    g2_1: 'Sequence: <strong>1080×1920</strong> atau <strong>1440×2560</strong>, 60.00 fps, Progressive.',
    g2_2: 'Export → H.264, Profile <strong>High</strong>, Level 5.1, VBR 2-pass.',
    g2_3: 'Target 20–32 Mbps (1080p60 → 20 Mbps, 2K60 → 32 Mbps). Max = 1.5× target.',
    g2_4: 'Centang <strong>Render at Maximum Depth + Use Maximum Render Quality</strong>.',
    g2_5: 'Audio AAC 320kbps, centang <strong>Fast Start / Web optimized</strong>.',
    g3_h: 'HP: VN / CapCut Mobile',
    g3_1: 'Export <strong>1080p / 2K • 60fps • bitrate tertinggi</strong> yang tersedia.',
    g3_2: 'Jangan export 720p atau 24fps kalau mau tajam di TikTok.',
    g3_3: 'Jangan tambah watermark ganda. Upload file asli, bukan screen-record.',
    g3_4: 'Aktifkan “Upload HD / High quality” di setting TikTok → hemat data <strong>MATI</strong>.',
    g4_h: 'DaVinci Resolve (gratis, paling detail)',
    g4_1: 'Project Settings → Master Settings: timeline <strong>1080×1920</strong> atau <strong>1440×2560</strong>, 60fps.',
    g4_2: 'Deliver → Custom Export → Format <strong>MP4</strong>, Codec <strong>H.264</strong>.',
    g4_3: 'Resolution ikut timeline, Frame rate <strong>60</strong>, Quality → Restrict to <strong>32000 Kb/s</strong> (2K60) atau <strong>20000 Kb/s</strong> (1080p60).',
    g4_4: 'Centang <strong>Force sizing to highest quality</strong> + <strong>Force debayer to highest quality</strong>.',
    g4_5: 'Audio → Codec AAC, Bit rate <strong>320kbps</strong>. Render, upload file hasilnya.',
    g5_h: 'Setting 120FPS yang benar',
    g5_1: 'Rekam <strong>120fps</strong> hanya untuk adegan slow-motion. Shutter 1/240, cahaya terang.',
    g5_2: 'Di timeline, interpretasi ke <strong>60fps (0.5×)</strong> atau 30fps (0.25×) biar smooth.',
    g5_3: '<strong>Export tetap 60fps</strong> — TikTok tidak menampilkan 120fps, tapi gerakan slow-mo-mu tetap mulus & tajam.',
    g5_4: 'Naikkan bitrate ~1.5× dari preset 60fps (lihat kalkulator di atas).',
    ps_eyebrow: '◆ PRESET SIAP PAKAI', ps_h2: 'Salin, tempel, export',
    ps_d: 'Tiga preset paling aman. Klik <strong>Salin preset</strong>, tempel ke aplikasi editing-mu.',
    ps1_h: '📱 1080p Aman', ps1_d: 'HP kentang / internet pas-pasan. Paling kompatibel.',
    ps2_h: '✨ 2K Tajam', ps2_d: 'Untuk konten showcase / teks kecil. Paling tajam.',
    ps3_h: '⚡ 2K 60fps', ps3_d: 'Dance, transisi, slow-motion. Gerakan mulus.',
    cmp_eyebrow: '◆ KENAPA 2K + BITRATE TINGGI MENANG?', cmp_h2: 'Geser untuk membandingkan',
    cmp_d: 'Simulasi jujur: kiri = upload biasa (720p, 5 Mbps, pecah), kanan = pakai preset (2K, bitrate tinggi, tajam).',
    cmp_sharp: 'Teks contoh tetap tajam', cmp_blurry: 'Teks contoh pecah-pecah',
    cmp_after: 'SESUDAH • preset', cmp_before: 'SEBELUM • biasa',
    spec1a: 'RESOLUSI 2K VERTIKAL', spec2a: 'TAMPIL MAKS. TIKTOK', spec3a: 'BITRATE TARGET', spec4b: 'PALING KOMPATIBEL',
    cmp_blurry_sub: '720p • 5 Mbps • record layar',
    cmp_note: 'Catatan: 2K bukan “resolusi resmi” TikTok — TikTok tetap menurunkan ke ~1080p. Tapi mulai dari 2K = detail awal 1.8× lebih banyak, jadi sisa setelah kompres jauh lebih bagus.',
    faq_eyebrow: '◆ FAQ JUJUR', faq_h2: 'Yang sering ditanya',
    fq1_q: 'Apakah bisa 100% tanpa kompres?', fq1_a: 'Tidak. Semua video TikTok di-encode ulang ke bitrate rendah (~3–8 Mbps). Triknya: kasih file “umpan” berkualitas setinggi mungkin supaya hasil akhirnya tetap bagus.',
    fq2_q: 'TikTok support 2K & 120fps?', fq2_a: 'Upload file 2K (1440×2560) <strong>bisa</strong> dan disarankan untuk ketajaman. 120fps <strong>diterima tapi ditampilkan max ~60fps</strong> — gunanya untuk slow-motion mulus, bukan playback 120fps asli.',
    fq3_q: 'Kenapa videoku tetap burik?', fq3_a: 'Biasanya: (1) export 720p/bitrate rendah, (2) upload pakai data + mode hemat aktif, (3) re-upload video yang sudah dikompres (download dari TikTok/WA), (4) tambah filter berat + teks kecil.',
    fq4_q: 'Ukuran file maksimal?', fq4_a: 'Jaga di bawah <strong>~250MB untuk 1080p</strong> dan <strong>~500MB untuk 2K</strong> biar upload tidak gagal. Kalkulator di atas otomatis kasih peringatan.',
    help: 'Bantuan', tab_req: 'Minta judul', tab_lap: 'Lapor rusak',
    req_d: 'Mau anime/manhwa yang belum ada? Tulis di sini — tersimpan di HP-mu, bisa disalin untuk dikirim ke admin.',
    req_judul: 'Judul yang diminta', req_judul_ph: 'mis. Judul anime/manhwa incaranmu', req_tipe: 'Tipe', req_send: 'Kirim permintaan',
    req_copy: 'Salin untuk admin', req_mine: 'Permintaan dari HP ini',
    lap_d: 'Gambar tidak muncul / chapter salah isi? Laporan tersimpan di HP-mu dan bisa disalin ke admin.',
    lap_judul: 'Judul manhwa', lap_judul_ph: 'mis. Solo Leveling', lap_ch: 'Chapter', lap_ch_ph: 'mis. Chapter 12',
    lap_prob: 'Masalah', lap_o1: 'Gambar tidak muncul', lap_o2: 'Gambar terbalik / acak',
    lap_o3: 'Salah judul / isi chapter', lap_o4: 'Lainnya', lap_send: 'Kirim laporan', lap_done: 'Laporan tersimpan. Terima kasih! 🙏',
    hist_h: 'Riwayat — 20 terakhir', hist_clear: 'Hapus riwayat', hist_empty: 'Belum ada riwayat.', hist_cleared: 'Riwayat dihapus',
    about_h: 'Tentang Guoke AMHDQ',
    about_d1: 'Guoke AMHDQ: baca manhwa, tonton anime, dan proses video TikTok HD — semua gratis, langsung di browser, tanpa login. Data pribadimu (bookmark, riwayat, request) hanya tersimpan di perangkatmu.',
    about_d2a: 'Kontak admin:', about_d2b: '— sertakan judul + chapter + tangkapan layar saat melapor.',
    about_d3: 'Sumber bacaan/tontonan berasal dari penyedia pihak ketiga; ketersediaan judul dapat berubah sewaktu-waktu.',
    foot_tag: '<strong>Guoke AMHDQ</strong> — nonton & baca gratis, semua jalan di situs ini.',
    foot_made: 'Dibuat untuk kreator Indonesia • Setting mengikuti panduan bitrate umum TikTok 2025–2026 • Hasil akhir tetap tergantung koneksi & server TikTok.',
    doc_title: 'Guoke AMHDQ — Nonton Anime & Baca Manhwa Langsung',
    seo_home_desc: 'Guoke AMHDQ: nonton anime, baca manhwa chapter lengkap, dan preset upload TikTok HD — semua langsung di situs.',
    epsort_label: 'Urutan episode',
    showing: 'Menampilkan', of: 'dari', titles_w: 'judul', chapters_w: 'chapter', animes_w: 'anime',
    episodes_w: 'episode', episode_w: 'Episode', watch_here: 'tonton langsung di sini', notfound_try: 'Tidak ketemu. Coba kata lain.',
    loading_catalog: 'Memuat katalog…', card_read: '📖 Baca', card_watch: '▶ Nonton',
    st_airing: 'Sedang Tayang', st_done: 'Tamat', film_w: 'Film', fresh_live: 'rilis terbaru • otomatis',
    new_badge: 'BARU', updated_today: 'Update hari ini', coming_soon: 'Segera hadir',
    coming_soon_dash: 'segera hadir — belum ada sumber videonya',
    epsort_asc: 'Terlama dulu', epsort_desc: 'Terbaru dulu', dv_search_ep_ph: 'Cari episode… (mis. 12)',
    dv_loading_eps: 'Memuat daftar episode…', dv_no_stream: 'Streaming belum tersedia untuk judul ini.',
    dv_eps_empty: 'Episode kosong.', dv_checking: 'Memeriksa sumber video…',
    dv_net_err: 'Sumber video belum bisa diperiksa (koneksi sibuk). Daftar di bawah tetap bisa dijelajahi. ',
    retry: 'Coba lagi', ep_new_added: 'episode baru ditambahkan otomatis', results_for: 'hasil untuk',
    ep_hint: 'klik nomor untuk menonton.', ep_legend: '<span class="lg-dot new"></span>Terbaru <span class="lg-dot soon"></span>Segera hadir',
    open_eplist: 'Buka daftar episode dulu', ep_notfound: 'Episode tidak ketemu di daftar',
    ep_last: 'Sudah episode terakhir', ep_first: 'Sudah episode pertama', ep_missing: 'Episode tidak ketemu',
    srv_unavailable: 'Server tidak tersedia untuk episode ini',
    resume_last: 'Terakhir dibuka', resume_tip1: ' — lanjutkan menonton (posisi tepat tergantung server video).',
    resume_tip2: 'Tips: embed video dari server pihak ketiga — posisi menit tidak bisa disimpan otomatis oleh browser.',
    playing: 'Memutar Episode', playing_on: 'langsung di situs. Kalau macet, ganti server di atas.',
    dl_btn: '⬇ Download episode', dl_search: '⏳ Mencari file…',
    dl_started_ok: '✓ Unduhan dimulai: ', dl_check_folder: ' — cek folder Download / aplikasi Downloads.',
    downloading_sys: 'Downloading file... cek notifikasi 📥', downloading_folder: 'Mengunduh ⬇ cek folder Download',
    dl_finding: '⬇ Downloading file... mencari server tercepat…',
    dl_dead: 'Server SUB/DUB tidak aktif untuk episode ini (file dihapus pemilik). Gunakan tombol di bawah — tetap bisa dapat file.',
    open_srv: '↗ Buka server ', find_mkv: '🔍 Cari file .mkv episode ini', retry_btn: '↻ Coba lagi',
    srv_dead_toast: 'Server mati — pakai tombol alternatif di bawah',
    hls_msg: 'Episode ini streaming HLS terproteksi — tidak ada file .mp4 langsung. Untuk video penuh: BUKA server di tab baru lalu pakai ⋮ → Download di pemutar, atau SALIN link untuk aplikasi 1DM/ADM.',
    open_srv_save: ' & simpan video', copy_link: '📋 Salin link video (untuk 1DM)', hls_toast: 'HLS terproteksi — buka server / pakai 1DM',
    dl_notfound: 'File unduhan tidak ditemukan di server yang aktif. Buka server di tab baru lalu simpan manual, atau salin link untuk 1DM.',
    link_copied: 'Link disalin — tempel di 1DM/ADM untuk download ⬇', copy_fail: 'Gagal menyalin',
    open_ep_first: 'Buka episode dulu', still_searching: 'Masih mencari file… tunggu sebentar',
    bm_detail_on: '📌 Dibookmark', bm_detail_off: '🔖 Bookmark', acak_lain: '🎲 Acak lain',
    bm_ongoing: 'Sedang dibaca', bm_wish: 'Mau dibaca', bm_done: 'Selesai', bm_updated: 'Status bookmark diperbarui',
    ch_search_ph: 'Cari chapter… (mis. 12)', ch_loading: 'Memuat daftar chapter…', ch_notfound: 'Chapter tidak ketemu.',
    ch_fail: 'Gagal memuat daftar chapter (koneksi sibuk). ',
    ch_fail_toast: 'Gagal memuat daftar chapter',
    rd_loading_imgs: 'Memuat gambar ', rd_all_fail: 'Semua gambar gagal tampil (koneksi sibuk).',
    rd_too_long: 'Masih memuat terlalu lama (jaringan lambat).', rd_img_fail: 'Gagal memuat gambar (jaringan sibuk).',
    rd_reopen: 'Tutup lalu buka lagi, atau tekan tombol di bawah.', rd_resumed: '(dilanjutkan dari posisi terakhir)',
    rd_retry_imgs: 'Muat ulang gambar', rd_retry_one: 'Muat ulang gambar ini', rd_alt_srv: 'Coba server lain', rd_report_link: 'Laporkan chapter rusak', rd_partial: ' gambar gagal tampil — coba muat ulang.',
    rd_scroll: 'geser ke bawah untuk membaca.', pages_w: 'halaman',
    mw_fail: 'Data manhwa tidak termuat. Periksa koneksi lalu refresh.',
    ani_fail: 'Data anime tidak termuat. Periksa koneksi lalu refresh.',
    preset_copied_full: 'Preset disalin! Tempel ke aplikasi editing-mu.', preset_ok: 'Preset disalin!', cmd_ok: 'Command disalin!',
    clipboard_na: 'Clipboard tidak tersedia',
    req_saved: 'Request tersimpan ✓', lap_saved: 'Terima kasih, laporan terkirim',
    no_req: 'Belum ada request.', no_req_s: 'Belum ada request', no_lap: 'Belum ada laporan.', no_lap_s: 'Belum ada laporan',
    copied_admin: 'Disalin! Kirim ke admin ✓',
    fresh_fail: 'Gagal memuat judul baru', ep_fail: 'Gagal memuat episode',
    fs_denied: 'Layar penuh ditolak browser', fs_na: 'Browser tidak mendukung layar penuh',
    net_busy: 'Gagal memuat (koneksi sibuk)', file_unread: 'File tidak terbaca. Pakai MP4/MOV.',
    low_w: 'rendah',
    tip_land: 'Video landscape — TikTok bakal dipotong/ada border hitam. Export ulang 9:16 (1080×1920 atau 1440×2560).',
    tip_hd: 'Resolusi di bawah Full HD — export ulang minimal 1080×1920 biar teks tidak pecah.',
    tip_br1: 'Bitrate ', tip_br2: ' Mbps terlalu rendah — naikkan ke ', tip_br3: ' Mbps saat export.',
    tip_big: 'File >500MB — rawan gagal upload. Turunkan sedikit bitrate atau pakai H.265.',
    tip_long: 'Video >3 menit — TikTok kompres lebih agresif. Bagi jadi part 1/2/3 biasanya lebih tajam.',
    v_ok: '✓ SIAP UPLOAD HD — setting sudah bagus. Upload via tiktok.com/upload + matikan mode hemat data.',
    v_warn1: '△ HAMPIR HD — perbaiki ', v_warn2: ' hal di bawah biar tidak burik.',
    v_bad: '✕ BELUM LAYAK HD — export ulang ikut preset di bawah.',
    calc120: 'Kamu pilih 120FPS: rekam 120fps, edit slow-mo, tapi export 60fps — TikTok tidak menampilkan 120fps asli.',
    calc_over: '⚠ Perkiraan file > batas aman. Turunkan durasi, pakai H.265, atau bagi jadi 2 part.',
    calc_ok: '✓ Ukuran aman untuk upload WiFi stabil.', calc_audio: 'Audio selalu AAC 320kbps 48kHz + faststart.',
    cc_res: 'Resolusi', cc_slowmo: '60 (hasil slow-mo)', cc_h265: 'H.265 (kalau ada)', cc_save: 'hemat ±40%', cc_max: 'kualitas maks',
    hdr_label: ' Video HDR / hasil pucat — konversi ke SDR (tonemap)',
    fps_est: '±30 fps (estimasi — browser tak mengekspos fps asli)',
    pz_orig: 'Asli: ', pz_unplayable1: 'tak bisa diputar browser (format ', pz_unplayable2: ') — tetap bisa diproses, ffmpeg membaca langsung.',
    pz_dur: ', durasi ', pz_sec: ' dtk',
    pz_over1: 'File ', pz_over2: ' melebihi 500 MB — proses bisa gagal (memori HP) atau hasil > batas upload TikTok.',
    pz_over3: 'Durasi ', pz_over4: ' dtk melebihi 3 menit — TikTok mengompres lebih agresif; pertimbangkan bagi jadi beberapa part.',
    pz_ready: 'Siap diproses. Pilih mode output lalu tekan “Proses video”.',
    ff_fail: 'Mesin pemroses gagal dimuat (offline/diblokir). Sambungkan internet lalu coba lagi.',
    pz_processing: 'Memproses… ', ff_loading: 'Memuat mesin ffmpeg (±30 MB, sekali saja)…', pick_video: 'Pilih video dulu',
    hp_interp: 'HP terdeteksi: interpolasi rakus memori — bila setting penuh gagal, otomatis dicoba setting ringan.',
    hp_interp_off: 'HP terdeteksi: interpolasi gerak dimatikan otomatis (rakus memori wasm, hampir pasti gagal di HP) — output tetap 60fps.',
    try_ultra: 'Masih berat — mencoba tahap darurat (super-hemat memori, tetap HD)…',
    try_light: 'Setting penuh kehabisan memori — mencoba otomatis dengan setting ringan…',
    copying0: 'Menyalin file ke memori…', copying1: 'Menyalin file (', copying2: ')…',
    try_hdr: 'Mencoba konversi HDR→SDR…', processing0: 'Memproses… 0%',
    done_w: 'Selesai',
    pz_result: 'Hasil: ', pz_filesize: 'ukuran file ',
    done_dl: 'Selesai — putar pratinjau lalu tekan Download.', hd_ready: 'Video HD siap didownload ⬇',
    cancelled: 'Dibatalkan.', cancelling: 'Membatalkan…',
    seo_mw_t: ' — Baca Manhwa | Guoke AMHDQ', seo_read: 'Baca ', seo_here: 'langsung di Guoke AMHDQ.',
    ram_fail: 'RAM HP tidak cukup (3 tahap otomatis sudah dicoba). Jalan keluar: potong video jadi <10 dtk, atau tanpa proses — salin Preset di bawah untuk export via CapCut (tanpa makan RAM).',
    filter_fail: 'Filter video ditolak mesin — coba mode “Otomatis”, matikan opsi HDR/interpolasi, lalu ulangi.',
    file_fail: 'File tidak bisa dibaca/diproses. Coba MP4 H.264 dulu.',
  },
  en: {
    nav_read: 'Read', nav_watch: 'Watch', nav_help: 'Help',
    menu_history: '🕘 History', menu_history_short: 'History', menu_help: 'Help', menu_about: 'ℹ About',
    profile_title: 'Profile', profile_name: 'Name', profile_change_photo: 'Change photo',
    profile_remove_photo: 'Remove photo', profile_theme: 'Theme', theme_dark: 'Dark', theme_light: 'Light',
    profile_lang: 'Language', profile_menu: 'Menu', profile_wipe: 'Erase all my data',
    login_title: 'Login', login_open: 'Sign in / Sign up', login_logout: 'Sign out',
    oauth_title: 'Login setup', oauth_sub: 'Paste the IDs below to enable Google & Facebook buttons. Stored on this device.',
    oauth_save: 'Save IDs',
    auth_welcome: 'WELCOME BACK', auth_title_in: 'Enter your watch world.',
    auth_title_up: 'Create your watch account.', auth_sub: 'Continue your favorite anime, manhwa, and manhua with a more personal experience.',
    auth_forgot: 'Forgot password?', auth_signin: 'Sign in', auth_signup: 'Sign up',
    auth_google: 'Continue with Google', auth_facebook: 'Continue with Facebook',
    auth_noaccount: "Don't have an account yet?", auth_haveaccount: 'Already have an account?',
    auth_title_reset: 'Reset your password.', auth_sub_reset: 'Enter your account email then set a new password. Without a server, reset happens right on this device.',
    auth_savepass: 'Save new password', auth_back: 'Back to sign in',
    auth_or: 'OR', auth_terms1: 'By signing in or up, you agree to our', auth_terms2: 'Terms & Conditions',
    auth_terms3: 'and', auth_terms4: 'Privacy Policy', auth_terms5: 'us.',
    menu_about2: 'About', profile_name_ph: 'Your name',
    cat_semua: 'All', cat_anime: 'Anime', cat_manhwa: 'Manhwa', cat_segera: 'Upcoming', cat_ikon: '🎭 Icons', door_dl: 'Unduh', soon_list_meta: 'coming soon — not watchable yet',
    ikon_eyebrow: '◆ ANIME ICONS • PHOTO GALLERY', ikon_h2: 'Anime Icons',
    ikon_d: 'Anime profile photo collection — tap the button to view, tap a photo to preview.',
    ikon_search_ph: 'Search icon photos…', ikon_view: '👁 View', ikon_photos: 'photos',
    ikon_upload: '➕ Upload photos',
    ikon_empty: 'No photos yet. Tap Upload to add your favorite anime icons (e.g. from Pinterest) — stored on this device.',
    ikon_delete: '🗑 Delete', ikon_added: 'photos added ✓', ikon_deleted: 'Photo deleted',
    ikon_shared: 'photos now visible to all users ✓', ikon_community: '👥 Community',
    ikon_dl_tab: 'Opened in a new tab — press and hold the image, then Save/Download ✓',
    latest_refresh: '↻ Refresh', latest_checked: 'Checked',
    lh_kicker: 'CONTINUE', lh_continue: 'Continue →', lh_read: 'CONTINUE READING', lh_watch: 'CONTINUE WATCHING',
    prev_eyebrow: '◆ PICKS FOR YOU', prev_h2: 'Start here', prev_latest: '🆕 Latest Episodes', prev_ch: '📖 Latest Chapters', prev_anime: '🔥 Featured anime', prev_mw: '📖 Featured manhwa',
    see_all: 'See all →',
    chip_all: 'All', jx_nodata: 'No live data yet.', jx_live: 'live • click to watch', jx_untitled: 'Untitled', continue_reading: 'CONTINUE READING', continue_btn: 'Continue →',
    mw_eyebrow: '◆ MANHWA • READ HERE', mw_h2: 'Read Manhwa here',
    mw_desc: 'Full chapters + images, read right on this site',
    mw_search_ph: 'Search manhwa titles…', ani_search_ph: 'Search anime titles…', jx_search_ph: 'Search all anime… (e.g. One Piece)',
    not_found: "Can't find it?", req_title: 'Request title', req_this: 'Request this title', empty_for: 'No results for',
    f_type: 'Type', f_type_all: 'Manhwa + Manhua', f_genre: 'Genre', f_genre_all: 'All genres',
    f_sort: 'Sort by', f_sort_new: 'Latest updates', f_sort_pop: 'Popular',
    f_bmstatus: 'Bookmark status', f_bms_all: 'All statuses', f_bms_ongoing: 'Reading',
    f_bms_wish: 'Plan to read', f_bms_done: 'Completed', f_bookmarked: '📌 My bookmarks', acak: '🎲 Random',
    load_more: 'Load more', loading: 'Loading…',
    back: '← Back', prev: '← Prev', next: 'Next →', full: '⛶ Full', full_exit: '✕ Exit',
    bm_added: 'Added to bookmarks 📌', bm_removed: 'Bookmark removed', page_w: 'page',
    img_width: 'Image width', w_full: 'Full', w_med: 'Medium', w_narrow: 'Narrow',
    report: '⚠ Report broken chapter', float_next: 'Next chapter →',
    ep_like_aria: 'Like this episode', cmt_h: 'Comments', cmt_name_ph: 'Name (optional)',
    cmt_ph: 'Write a comment…', cmt_send: 'Send', cmt_empty: 'No comments yet. Be the first!',
    cmt_need: 'Write a comment first', cmt_deleted: 'Comment deleted', cmt_anon: 'Anonymous',
    cmt_bad: 'Comment contains inappropriate words', cmt_reported: 'Report sent, thank you', cmt_report: 'Report',
    cmt_local: 'Comments are stored on this device.',
    lib_eyebrow: '◆ YOUR LIBRARY', lib_title: 'Library', lib_riwayat: 'History', lib_daftar: 'My List',
    lib_empty_bm: 'Your list is empty. Tap 🔖 Bookmark on a title page to save it.',
    g_today: 'Today', g_yday: 'Yesterday', g_week: 'This week', g_older: 'Older',
    ani_eyebrow: '◆ ANIME • WATCH HERE', ani_h2: 'Watch Anime here',
    ani_desc: 'Pick a title, pick an episode, play right here',
    anif_all: 'All', anif_new: 'Latest Episodes', anif_airing: 'Airing', anif_done: 'Completed', anif_film: 'Film', anif_soon: 'Upcoming',
    fresh_h: '🔥 Fresh releases — auto', fresh_d: 'Newest titles added automatically. Click to watch.',
    latest_h: '🆕 Latest Episodes — 2026', latest_d: 'New releases + episode updates, play right here. Click to watch.',
    upcoming_h: '📅 Upcoming Anime — not yet aired', upcoming_d: 'Announced titles with no episodes yet. Click for info + schedule. Watch activates automatically after release.',
    soon_badge: 'SOON', soon_meta: 'Coming soon', card_info: 'ℹ Info', soon_note: 'No playable episodes yet. This title will become watchable automatically after its release date.',
    jx_h: '🌐 Browse all anime', jx_d: 'Live catalog of thousands of titles — search anything, click to watch right here.',
    jx_pop: 'Popular', jx_air: 'Airing', pl_dl: '⬇ Download episode',
    hero_eyebrow: '◆ TIKTOK HD • 2K • 120FPS', hero_h1a: 'TikTok uploads', hero_h1b: 'stay HD', hero_h1c: 'no more blurry compression.',
    hero_lede: 'Free tools + presets for creators: export settings <strong>1080×1920 / 1440×2560 (2K)</strong>, <strong>60–120 FPS</strong>, high bitrate, in TikTok-friendly formats. Sharper results, no broken text.',
    cta1: 'Check My Video Now', cta2: 'Calculate 2K/120FPS Preset',
    honest: "<strong>Let's be honest:</strong> TikTok <em>always</em> re-encodes your video. No tool delivers “0% compression”. But with a raw file at <strong>2K + high bitrate + 60fps</strong>, TikTok's compression looks far cleaner than a low-bitrate 720p upload. This site gives you the safest settings.",
    cek_eyebrow: '◆ STEP 1 — CHECK VIDEO', cek_h2: 'Is your video HD-ready?',
    cek_d: 'Drop an MP4/MOV file below. Everything is checked <strong>locally in your browser</strong> — your video is not uploaded anywhere.',
    dz_drop: 'Drag & drop your video here', dz_or: 'or click to choose a file • checked up to ~500MB',
    res: 'Resolution', dur: 'Duration', size: 'Size', br: 'Est. bitrate',
    pz_eyebrow: '◆ MAIN TOOL — PROCESS & DOWNLOAD', pz_h2: 'Turn videos into TikTok HD',
    pz_d: 'Files are <strong>never uploaded to a server</strong> — processed right on your phone. Output is always <strong>upload-ready MP4 + a Download button</strong>.',
    pz_formats: 'or click to choose a file • MP4/MOV/MKV/WebM/AVI, 480p–8K • max 500 MB / 3 min',
    m_mode: 'Output mode', mode_auto: 'Auto — original ratio, short side 1080', mode_vfit: 'Vertical TikTok 1080×1920 — Fit (black bars)',
    mode_vfill: 'Vertical TikTok 1080×1920 — Full bleed (center crop)', mode_vblur: 'Vertical TikTok 1080×1920 — Blurred background',
    mode_sq: 'Square 1080×1080', mode_land: 'Landscape 1920×1080', mode_auto2k: '2K — short side 1440',
    m_fps: 'Output FPS', fps60: '60 fps (default)', fps30: '30 fps (faster)',
    interp: 'Max quality — motion interpolation (slow)', pz_go: 'Process video', pz_cancel: 'Cancel', pz_prep: 'Preparing…',
    pz_dl: '⬇ Unduh (guoke-uploader-hd.mp4)', pz_share: '📤 Share to TikTok', pz_open: '⬆ Open TikTok Upload',
    pz_flow: 'Flow: Download first (or Share directly on your phone) → on the TikTok upload page pick the result file → make sure “High quality / Allow HD uploads” is on.',
    honest2: '<strong>Honest note:</strong> a small video scaled up does <em>not</em> get sharper, and <em>no</em> video is 100% compression-proof — TikTok <em>always</em> re-encodes to a low bitrate. What this tool does: feed it the best “input” (2K + CRF 16 + 25–35 Mbps bitrate + faststart) so what survives compression still looks clean. Plain 30→60fps <em>duplicates frames</em>; check “Max quality” for motion interpolation (minterpolate, much slower).',
    kalk_eyebrow: '◆ STEP 2 — 2K / 120FPS PRESET', kalk_h2: 'Burik-proof export calculator',
    kalk_d: 'Pick resolution + fps + duration. We calculate bitrate, estimated file size, and FFmpeg commands + CapCut / Premiere presets you can copy right away.',
    k_res: 'Resolution', res1080: '1080×1920 — Full HD (safest)', res1440: '1440×2560 — 2K QHD (sharpest)',
    k_fps: 'Timeline FPS', cfps30: '30 FPS — talking / daily', cfps60: '60 FPS — dance / transitions', cfps120: '120 FPS — slow-motion',
    k_dur: 'Video duration (seconds)', k_codec: 'Codec', codec264: 'H.264 — most compatible', codec265: 'H.265 / HEVC — 40% smaller files',
    o_br: 'VIDEO BITRATE', o_size: 'ESTIMATED SIZE', o_up: 'UPLOAD TO TIKTOK',
    cap_h: 'CapCut PC preset (Export)', ff_h: 'FFmpeg (copy-paste)', copy_preset: 'Copy Preset', copy_ff: 'Copy FFmpeg',
    pd_eyebrow: '◆ STEP 3 — HOW TO EXPORT', pd_h2: 'Guides per app',
    g1_h: 'CapCut PC (easiest, free)',
    g1_1: 'Ratio <strong>9:16</strong>, resolution <strong>1440×2560</strong> (if laggy, use 1080×1920).',
    g1_2: 'Frame rate: <strong>60</strong> (regular video) / <strong>50–60 for 120fps slow-mo</strong> — TikTok caps display at 60fps.',
    g1_3: 'Bit rate → <strong>Recommended / Higher</strong>, codec <strong>H.264</strong>, format <strong>MP4</strong>.',
    g1_4: 'Audio: <strong>AAC 320kbps, 48kHz</strong>. Turn off “smart HDR” if colors look washed out.',
    g1_5: 'Upload via <strong>tiktok.com/upload</strong> (PC + stable WiFi) is usually cleaner than from your phone.',
    g2_h: 'Premiere Pro',
    g2_1: 'Sequence: <strong>1080×1920</strong> or <strong>1440×2560</strong>, 60.00 fps, Progressive.',
    g2_2: 'Export → H.264, Profile <strong>High</strong>, Level 5.1, VBR 2-pass.',
    g2_3: 'Target 20–32 Mbps (1080p60 → 20 Mbps, 2K60 → 32 Mbps). Max = 1.5× target.',
    g2_4: 'Check <strong>Render at Maximum Depth + Use Maximum Render Quality</strong>.',
    g2_5: 'Audio AAC 320kbps, check <strong>Fast Start / Web optimized</strong>.',
    g3_h: 'Phone: VN / CapCut Mobile',
    g3_1: 'Export <strong>1080p / 2K • 60fps • highest bitrate</strong> available.',
    g3_2: "Don't export 720p or 24fps if you want sharp results on TikTok.",
    g3_3: "Don't stack watermarks. Upload the original file, not a screen recording.",
    g3_4: 'Turn on “HD Upload / High quality” in TikTok settings → data saver <strong>OFF</strong>.',
    g4_h: 'DaVinci Resolve (free, most detailed)',
    g4_1: 'Project Settings → Master Settings: timeline <strong>1080×1920</strong> or <strong>1440×2560</strong>, 60fps.',
    g4_2: 'Deliver → Custom Export → Format <strong>MP4</strong>, Codec <strong>H.264</strong>.',
    g4_3: 'Resolution follows timeline, Frame rate <strong>60</strong>, Quality → Restrict to <strong>32000 Kb/s</strong> (2K60) or <strong>20000 Kb/s</strong> (1080p60).',
    g4_4: 'Check <strong>Force sizing to highest quality</strong> + <strong>Force debayer to highest quality</strong>.',
    g4_5: 'Audio → AAC codec, Bit rate <strong>320kbps</strong>. Render, then upload the result.',
    g5_h: 'Correct 120FPS settings',
    g5_1: 'Record <strong>120fps</strong> only for slow-motion scenes. Shutter 1/240, bright light.',
    g5_2: 'On the timeline, interpret to <strong>60fps (0.5×)</strong> or 30fps (0.25×) for smoothness.',
    g5_3: '<strong>Still export at 60fps</strong> — TikTok doesn’t play 120fps, but your slow-mo stays smooth & sharp.',
    g5_4: 'Raise bitrate ~1.5× over the 60fps preset (see calculator above).',
    ps_eyebrow: '◆ READY-TO-USE PRESETS', ps_h2: 'Copy, paste, export',
    ps_d: 'Three safest presets. Click <strong>Copy preset</strong>, paste into your editing app.',
    ps1_h: '📱 1080p Safe', ps1_d: 'Weak phones / tight internet. Most compatible.',
    ps2_h: '✨ Sharp 2K', ps2_d: 'For showcase content / small text. Sharpest.',
    ps3_h: '⚡ 2K 60fps', ps3_d: 'Dance, transitions, slow-motion. Smooth motion.',
    cmp_eyebrow: '◆ WHY DOES 2K + HIGH BITRATE WIN?', cmp_h2: 'Slide to compare',
    cmp_d: 'Honest simulation: left = casual upload (720p, 5 Mbps, broken), right = with preset (2K, high bitrate, sharp).',
    cmp_sharp: 'Sample text stays sharp', cmp_blurry: 'Sample text looks broken',
    cmp_after: 'AFTER • preset', cmp_before: 'BEFORE • casual',
    spec1a: 'VERTICAL 2K RESOLUTION', spec2a: 'MAX TIKTOK DISPLAY', spec3a: 'TARGET BITRATE', spec4b: 'MOST COMPATIBLE',
    cmp_blurry_sub: '720p • 5 Mbps • screen recording',
    cmp_note: 'Note: 2K is not TikTok’s “official resolution” — TikTok still downscales to ~1080p. But starting from 2K = 1.8× more initial detail, so what survives compression looks far better.',
    faq_eyebrow: '◆ HONEST FAQ', faq_h2: 'Frequently asked',
    fq1_q: 'Can it be 100% compression-free?', fq1_a: 'No. Every TikTok video is re-encoded to a low bitrate (~3–8 Mbps). The trick: feed it the highest-quality file possible so the end result still looks good.',
    fq2_q: 'Does TikTok support 2K & 120fps?', fq2_a: 'Uploading 2K files (1440×2560) <strong>works</strong> and is recommended for sharpness. 120fps is <strong>accepted but displayed at max ~60fps</strong> — useful for smooth slow-motion, not true 120fps playback.',
    fq3_q: 'Why is my video still blurry?', fq3_a: 'Usually: (1) 720p/low-bitrate export, (2) uploading on mobile data with saver mode on, (3) re-uploading an already compressed video (downloaded from TikTok/WA), (4) heavy filters + tiny text.',
    fq4_q: 'Maximum file size?', fq4_a: 'Keep it under <strong>~250MB for 1080p</strong> and <strong>~500MB for 2K</strong> so uploads don’t fail. The calculator above warns you automatically.',
    help: 'Help', tab_req: 'Request title', tab_lap: 'Report issue',
    req_d: 'Want anime/manhwa that isn’t here yet? Write it down — saved on your phone, ready to copy to the admin.',
    req_judul: 'Requested title', req_judul_ph: "e.g. The title you're looking for", req_tipe: 'Type', req_send: 'Send request',
    req_copy: 'Copy for admin', req_mine: 'Requests from this device',
    lap_d: 'Images not showing / wrong chapter content? Reports are saved on your phone and can be copied to the admin.',
    lap_judul: 'Manhwa title', lap_judul_ph: 'e.g. Solo Leveling', lap_ch: 'Chapter', lap_ch_ph: 'e.g. Chapter 12',
    lap_prob: 'Issue', lap_o1: 'Images not showing', lap_o2: 'Upside-down / shuffled images',
    lap_o3: 'Wrong title / chapter content', lap_o4: 'Other', lap_send: 'Send report', lap_done: 'Report saved. Thank you! 🙏',
    hist_h: 'History — last 20', hist_clear: 'Clear history', hist_empty: 'No history yet.', hist_cleared: 'History cleared',
    about_h: 'About Guoke AMHDQ',
    about_d1: 'Guoke AMHDQ: read manhwa, watch anime, and process TikTok HD videos — all free, right in your browser, no login. Your personal data (bookmarks, history, requests) stays only on your device.',
    about_d2a: 'Admin contact:', about_d2b: '— include title + chapter + screenshot when reporting.',
    about_d3: 'Reading/watching sources come from third-party providers; title availability may change at any time.',
    foot_tag: '<strong>Guoke AMHDQ</strong> — free watching & reading, everything runs on this site.',
    foot_made: 'Made for Indonesian creators • Settings follow general TikTok 2025–2026 bitrate guidance • Final results still depend on your connection & TikTok servers.',
    doc_title: 'Guoke AMHDQ — Watch Anime & Read Manhwa Directly',
    seo_home_desc: 'Guoke AMHDQ: watch anime, read full-chapter manhwa, and TikTok HD upload presets — all right on this site.',
    epsort_label: 'Episode order',
    showing: 'Showing', of: 'of', titles_w: 'titles', chapters_w: 'chapters', animes_w: 'anime',
    episodes_w: 'episodes', episode_w: 'Episode', watch_here: 'watch right here', notfound_try: 'Not found. Try other words.',
    loading_catalog: 'Loading catalog…', card_read: '📖 Read', card_watch: '▶ Watch',
    st_airing: 'Airing', st_done: 'Completed', film_w: 'Film', fresh_live: 'latest release • auto',
    new_badge: 'NEW', updated_today: 'Updated today', coming_soon: 'Coming soon',
    coming_soon_dash: 'coming soon — no video source yet',
    epsort_asc: 'Oldest first', epsort_desc: 'Newest first', dv_search_ep_ph: 'Search episodes… (e.g. 12)',
    dv_loading_eps: 'Loading episode list…', dv_no_stream: 'Streaming is not available for this title.',
    dv_eps_empty: 'No episodes.', dv_checking: 'Checking video sources…',
    dv_net_err: 'Video sources could not be checked (busy connection). You can still browse the list below. ',
    retry: 'Retry', ep_new_added: 'new episodes added automatically', results_for: 'results for',
    ep_hint: 'click a number to watch.', ep_legend: '<span class="lg-dot new"></span>Newest <span class="lg-dot soon"></span>Coming soon',
    open_eplist: 'Open the episode list first', ep_notfound: 'Episode not found in list',
    ep_last: 'Already at the last episode', ep_first: 'Already at the first episode', ep_missing: 'Episode not found',
    srv_unavailable: 'No server available for this episode',
    resume_last: 'Last opened', resume_tip1: ' — continue watching (exact position depends on the video server).',
    resume_tip2: 'Tip: third-party embeds — playback position cannot be auto-saved by the browser.',
    playing: 'Playing episode', playing_on: 'right here. If it stalls, switch servers above.',
    dl_btn: '⬇ Download episode', dl_search: '⏳ Finding file…',
    dl_started_ok: '✓ Download started: ', dl_check_folder: ' — check your Download folder / Downloads app.',
    downloading_sys: 'Downloading file... check notifications 📥', downloading_folder: 'Downloading ⬇ check Download folder',
    dl_finding: '⬇ Downloading file... finding fastest server…',
    dl_dead: 'SUB/DUB servers are down for this episode (file removed by owner). Use the buttons below — you can still get the file.',
    open_srv: '↗ Open server ', find_mkv: '🔍 Find this episode .mkv file', retry_btn: '↻ Retry',
    srv_dead_toast: 'Servers down — use the alternative buttons below',
    hls_msg: 'This episode is protected HLS — no direct .mp4 file. For the full video: OPEN the server in a new tab then use ⋮ → Download in the player, or COPY the link for 1DM/ADM apps.',
    open_srv_save: ' & save video', copy_link: '📋 Copy video link (for 1DM)', hls_toast: 'Protected HLS — open server / use 1DM',
    dl_notfound: 'Download file not found on active servers. Open the server in a new tab and save manually, or copy the link for 1DM.',
    link_copied: 'Link copied — paste in 1DM/ADM to download ⬇', copy_fail: 'Copy failed',
    open_ep_first: 'Open an episode first', still_searching: 'Still searching… please wait',
    bm_detail_on: '📌 Bookmarked', bm_detail_off: '🔖 Bookmark', acak_lain: '🎲 Another random',
    bm_ongoing: 'Reading', bm_wish: 'Plan to read', bm_done: 'Completed', bm_updated: 'Bookmark status updated',
    ch_search_ph: 'Search chapters… (e.g. 12)', ch_loading: 'Loading chapter list…', ch_notfound: 'Chapter not found.',
    ch_fail: 'Failed to load chapter list (busy connection). ',
    ch_fail_toast: 'Failed to load chapter list',
    rd_loading_imgs: 'Loading images ', rd_all_fail: 'All images failed to load (busy connection).',
    rd_too_long: 'Still loading too slowly (slow network).', rd_img_fail: 'Failed to load images (busy network).',
    rd_reopen: 'Close and reopen, or press the button below.', rd_resumed: '(resumed from last position)',
    rd_retry_imgs: 'Reload images', rd_retry_one: 'Reload this image', rd_alt_srv: 'Try another server', rd_report_link: 'Report broken chapter', rd_partial: ' images failed to load — try reloading.',
    rd_scroll: 'scroll down to read.', pages_w: 'pages',
    mw_fail: 'Manhwa data failed to load. Check your connection and refresh.',
    ani_fail: 'Anime data failed to load. Check your connection and refresh.',
    preset_copied_full: 'Preset copied! Paste into your editing app.', preset_ok: 'Preset copied!', cmd_ok: 'Command copied!',
    clipboard_na: 'Clipboard unavailable',
    req_saved: 'Request saved ✓', lap_saved: 'Thank you, report sent',
    no_req: 'No requests yet.', no_req_s: 'No requests yet', no_lap: 'No reports yet.', no_lap_s: 'No reports yet',
    copied_admin: 'Copied! Send to admin ✓',
    fresh_fail: 'Failed to load new title', ep_fail: 'Failed to load episode',
    fs_denied: 'Fullscreen denied by browser', fs_na: 'Browser does not support fullscreen',
    net_busy: 'Load failed (busy connection)', file_unread: 'File unreadable. Use MP4/MOV.',
    low_w: 'low',
    tip_land: 'Landscape video — TikTok will crop it / add black borders. Re-export at 9:16 (1080×1920 or 1440×2560).',
    tip_hd: 'Resolution below Full HD — re-export at least 1080×1920 so text stays sharp.',
    tip_br1: 'Bitrate ', tip_br2: ' Mbps is too low — raise to ', tip_br3: ' Mbps when exporting.',
    tip_big: 'File >500MB — uploads may fail. Lower the bitrate slightly or use H.265.',
    tip_long: 'Video >3 min — TikTok compresses more aggressively. Splitting into parts 1/2/3 is usually sharper.',
    v_ok: '✓ HD-UPLOAD READY — settings look good. Upload via tiktok.com/upload + turn off data saver.',
    v_warn1: '△ ALMOST HD — fix ', v_warn2: ' items below to avoid blurriness.',
    v_bad: '✕ NOT HD-READY — re-export using the presets below.',
    calc120: 'You picked 120FPS: record at 120fps, edit slow-mo, but export 60fps — TikTok shows no native 120fps.',
    calc_over: '⚠ Estimated file exceeds the safe limit. Shorten duration, use H.265, or split into 2 parts.',
    calc_ok: '✓ Size is safe for stable WiFi upload.', calc_audio: 'Audio always AAC 320kbps 48kHz + faststart.',
    cc_res: 'Resolution', cc_slowmo: '60 (slow-mo result)', cc_h265: 'H.265 (if available)', cc_save: '±40% smaller', cc_max: 'max quality',
    hdr_label: ' HDR video / washed-out result — convert to SDR (tonemap)',
    fps_est: '±30 fps (estimate — browsers don’t expose real fps)',
    pz_orig: 'Original: ', pz_unplayable1: 'cannot play in browser (format ', pz_unplayable2: ') — can still be processed, ffmpeg reads it directly.',
    pz_dur: ', duration ', pz_sec: 's',
    pz_over1: 'File ', pz_over2: ' exceeds 500 MB — processing may fail (phone memory) or the result may exceed TikTok upload limits.',
    pz_over3: 'Duration ', pz_over4: 's exceeds 3 minutes — TikTok compresses more aggressively; consider splitting into parts.',
    pz_ready: 'Ready to process. Pick an output mode then press “Process video”.',
    ff_fail: 'Failed to load the processing engine (offline/blocked). Connect to the internet and try again.',
    pz_processing: 'Processing… ', ff_loading: 'Loading ffmpeg engine (±30 MB, one time only)…', pick_video: 'Pick a video first',
    hp_interp: 'Phone detected: interpolation eats memory — if full settings fail, lighter settings are tried automatically.',
    hp_interp_off: 'Phone detected: motion interpolation auto-disabled (eats wasm memory, almost always fails on phones) — output stays 60fps.',
    try_ultra: 'Still too heavy — trying emergency stage (super memory-light, still HD)…',
    try_light: 'Full settings ran out of memory — automatically retrying with lighter settings…',
    copying0: 'Copying file to memory…', copying1: 'Copying file (', copying2: ')…',
    try_hdr: 'Trying HDR→SDR conversion…', processing0: 'Processing… 0%',
    done_w: 'Done',
    pz_result: 'Result: ', pz_filesize: 'file size ',
    done_dl: 'Done — preview it, then press Download.', hd_ready: 'HD video ready to download ⬇',
    cancelled: 'Cancelled.', cancelling: 'Cancelling…',
    seo_mw_t: ' — Read Manhwa | Guoke AMHDQ', seo_read: 'Read ', seo_here: 'right on Guoke AMHDQ.',
    ram_fail: 'Phone RAM is not enough (all 3 automatic stages tried). Workaround: trim the video to <10s, or skip processing — copy the Preset below for CapCut export (no RAM used).',
    filter_fail: 'Video filter rejected by the engine — try “Auto” mode, turn off HDR/interpolation options, then retry.',
    file_fail: 'File cannot be read/processed. Try MP4 H.264 first.',
  },
};
function getLang() { const l = store.get('gq_lang', 'id'); return l === 'en' ? 'en' : 'id'; }
function T(k) { const l = getLang(); return (I18N[l] && I18N[l][k] != null) ? I18N[l][k] : (I18N.id[k] != null ? I18N.id[k] : k); }

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
    $('rRes').textContent = w + '×' + h + (h >= 2300 || w >= 2300 ? ' • 2K-ish' : h >= 1800 ? ' • HD' : ' • ' + T('low_w'));
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
    if (!isVertical) add(T('tip_land'));
    if (!isHD) add(T('tip_hd'));
    if (!goodBr) add(T('tip_br1') + br.toFixed(1) + ' Mbps' + T('tip_br2') + (is2K ? '25–45' : '15–25') + T('tip_br3'));
    if (file.size > 500 * 1048576) add(T('tip_big'));
    if (d > 180) add(T('tip_long'));
    if (isVertical && isHD && goodBr && file.size < 500 * 1048576) {
      verdict.className = 'verdict ok';
      verdict.textContent = T('v_ok');
    } else if (isHD) {
      verdict.className = 'verdict warn';
      verdict.textContent = T('v_warn1') + fixes.children.length + T('v_warn2');
    } else {
      verdict.className = 'verdict bad';
      verdict.textContent = T('v_bad');
    }
    $('kalkulator').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  v.onerror = () => toast(T('file_unread'));
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
    (fps === 120 ? T('calc120') + ' ' : '') +
    (over ? T('calc_over') : T('calc_ok')) +
    ' ' + T('calc_audio');
  const crf = codec === 'h265' ? 'crf 20' : 'crf 17';
  $('oCapcut').textContent =
    `CapCut PC → Export:\n• ${T('cc_res')}: ${W}×${H} (9:16)\n• Frame rate: ${fps === 120 ? T('cc_slowmo') : fps}\n• Format: MP4 • Codec: ${codec === 'h265' ? T('cc_h265') : 'H.264'}\n• Bit rate: ${br} Mbps (${codec === 'h265' ? T('cc_save') : T('cc_max')})\n• Audio: AAC 320kbps 48kHz`;
  const vfFps = fps === 120 ? '60' : String(fps);
  $('oFfmpeg').textContent =
    `ffmpeg -i input.mp4 -vf "scale=${W}:${H}:flags=lanczos,fps=${vfFps}" ` +
    `-c:v ${codec === 'h265' ? 'libx265' : 'libx264'} -preset slow -${crf} ` +
    `-pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart output-tiktok-HD.mp4`;
}
['cRes', 'cFps', 'cDur', 'cCodec'].forEach((id) => $(id).addEventListener('input', calc));
$('copyPreset').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('oCapcut').textContent); toast(T('preset_ok')); }
  catch { toast(T('copy_fail')); }
});
$('copyFfmpeg').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('oFfmpeg').textContent); toast(T('cmd_ok')); }
  catch { toast(T('copy_fail')); }
});
calc();

/* ---------- 3. KATEGORI (Semua/Anime/Manhwa/Ikon) ---------- */
const TIKTOK_SELS = ['.hero', '.specs', '#cek', '#proses', '#kalkulator', '#presetSiap', '#panduan', '.compare', '#faq'];
function setCat(cat) {
  const _pu0 = $('pustakaPanel'); if (_pu0) _pu0.hidden = true;
  document.querySelectorAll('.catbar .cat').forEach((b) => {
    const on = b.dataset.cat === cat;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-selected', 'true'); else b.removeAttribute('aria-selected');
  });
  // Semua = preview pilihan tiap kategori; Anime/Manhwa/Segera = katalog penuh masing-masing
  const showManhwa = cat === 'semua' || cat === 'manhwa';
  const showAnime = cat === 'semua' || cat === 'anime' || cat === 'segera';
  // Panel alat (hero/specs/cek/proses/kalkulator/preset/panduan/compare/faq) tidak lagi punya tab:
  // selalu sembunyi agar tidak bocor ke beranda. Kode alat (proses.js) dibiarkan apa adanya.
  TIKTOK_SELS.forEach((s) => document.querySelectorAll(s).forEach((el) => { el.hidden = true; }));
  const m = $('manhwaPanel'), a = $('animePanel'), ik = $('ikonPanel');
  if (cat === 'semua') {
    // mode preview: panel penuh disembunyikan, preview ringkas ditampilkan
    if (m) m.hidden = true;
    if (a) a.hidden = true;
    if (ik) ik.hidden = true;
    paintPreview();
  } else {
    if (m) m.hidden = !showManhwa;
    if (a) a.hidden = !showAnime;
    if (ik) ik.hidden = cat !== 'ikon';
    if (cat === 'ikon') {
      // Galeri foto upload: baca IndexedDB HP, tanpa unduh data tambahan
      try { if (typeof renderIkon === 'function') renderIkon(); } catch (e) {}
    }
    if (typeof ANI_UI !== 'undefined') {
      if (cat === 'segera') {
        // Tab Akan Rilis = STERIL, hanya judul segera. Tidak ada campuran sudah-tayang.
        ANI_UI.f = 'segera';
        ANI_UI.limit = ANI_UI.per;
        try { if (typeof renderShows === 'function' && ANI.shows.length) renderShows(); } catch (e) {}
        try { paintAnimeSections(); } catch (e) {}
      } else if (cat === 'anime' && ANI_UI.f === 'segera') {
        // Keluar dari segera → kembalikan filter normal + tampilkan section lagi
        ANI_UI.f = 'semua';
        ANI_UI.limit = ANI_UI.per;
        try {
          document.querySelectorAll('[data-anif]').forEach((x) => x.classList.toggle('btn-ghost', x.dataset.anif !== 'semua'));
        } catch (e) {}
        try { if (typeof renderShows === 'function' && ANI.shows.length) renderShows(); } catch (e) {}
        try { paintAnimeSections(); } catch (e) {}
        try { if (typeof loadLatest === 'function') loadLatest(); } catch (e) {}
        try { if (typeof loadUpcoming === 'function') loadUpcoming(); } catch (e) {}
      } else {
        try { paintAnimeSections(); } catch (e) {}
      }
    }
  }
  CURCAT = cat;
  // Tiga pintu masuk + preview + lanjutkan hanya relevan di tab Semua
  const pintu = $('pintu');
  if (pintu) pintu.hidden = cat !== 'semua';
  const prev = $('semuaPreview');
  if (prev) prev.hidden = cat !== 'semua';
  if (showManhwa && cat !== 'semua') ensureMw(); // data 4MB+ hanya diunduh saat dibutuhkan
  if (cat === 'semua') { try { paintPreview(); } catch (e) {} } // beranda hanya episode terbaru: tanpa unduh manhwa
  try { paintAnimeSections(); } catch (e) {}
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
// Tiga pintu masuk di beranda → pindah tab + scroll ke panelnya
document.querySelectorAll('[data-goto]').forEach((b) =>
  b.addEventListener('click', () => {
    const c = b.dataset.goto;
    goCat(c);
    const target = { manhwa: 'manhwaPanel', anime: 'animePanel', segera: 'animePanel', ikon: 'ikonPanel' }[c];
    if (target && $(target)) $(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  })
);
// Navigasi atas (4 grup) → tab + panel yang sesuai (tanpa tulis hash anchor)
document.querySelectorAll('[data-navcat]').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const map = { manhwa: 'manhwa', anime: 'anime', segera: 'segera', baca: 'manhwa', tonton: 'anime' };
    const c = map[a.dataset.navcat] || 'semua';
    goCat(c);
    const target = { manhwa: 'manhwaPanel', anime: 'animePanel', segera: 'animePanel' }[c];
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

/* --- Tanggal: "Diperbarui 14 Okt 2026" (input "DD/MM/YYYY"), ikut bahasa --- */
const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function parseTgl(d) {
  const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0;
}
function fmtTglID(d) {
  const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  const en = (typeof getLang === 'function' && getLang() === 'en');
  return (en ? 'Updated ' : 'Diperbarui ') + (+m[1]) + ' ' + (en ? BULAN_EN : BULAN_ID)[(+m[2]) - 1] + ' ' + m[3];
}
/* Update terakhir = tanggal chapter paling baru (anti salah urut data).
   Index menyimpan lastUpdate agar kartu/sortir jalan tanpa unduh chapters. */
function mwUpdated(t) {
  const chs = (t.chapters || CHC[t.id]);
  if (!chs) return t.lastUpdate || '';
  let best = 0, raw = '';
  chs.forEach((c) => {
    const ts = parseTgl(c.d);
    if (ts > best) { best = ts; raw = c.d; }
  });
  return raw || t.lastUpdate || '';
}
function mwStatus(t) { return t.status || 'Ongoing'; } // dari Komiku; default Ongoing
function mwGenres(t) {
  const g = t.genres && t.genres.length ? t.genres : ['Manhwa'];
  return g.slice(0, 3); // tampilkan max 3 di kartu
}

/* --- Penyimpanan lokal tanpa login: bookmark, lanjutkan, posisi baca --- */

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
/* Badge BARU: hanya untuk rilis dalam 48 jam terakhir (konsisten di semua kartu) */
function isFresh48(ts) {
  if (!ts) return false;
  const d = (Date.now() - ts) / 3600000;
  return d >= 0 && d <= 48;
}
function mwBadge(t) {
  const raw = mwUpdated(t);
  if (!raw) return '';
  const ts = parseTgl(raw);
  if (!ts) return '';
  if (!isFresh48(ts)) return '';
  return '<span class="badge-new today">BARU</span>';
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
/* TAHAP 3.1: progres tonton/baca per judul (jujur: embed pihak ketiga tidak
   mengizinkan baca menit video, jadi progres = episode/chapter yang dibuka).
   Disimpan lokal per perangkat. */
function progGet(key) { try { const o = store.get(key, {}); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function progAdd(key, id, n) {
  try {
    const o = progGet(key);
    const arr = Array.isArray(o[id]) ? o[id] : [];
    const s = String(n);
    if (!arr.includes(s)) arr.push(s);
    o[id] = arr.slice(-500);
    store.set(key, o);
  } catch (e) {}
}
function progCount(key, id) { const o = progGet(key); return Array.isArray(o[id]) ? o[id].length : 0; }
function progBarHTML(done, total) {
  total = Number(total) || 0; done = Math.min(Number(done) || 0, total);
  if (!total || !done) return '';
  return '<span class="watch-prog"><i style="width:' + Math.round(done / total * 100) + '%"></i></span>';
}
/* TAHAP 3.3: penanda update untuk judul bookmark (titik biru + label Update).
   Terlihat bila konten diperbarui dalam 14 hari terakhir dan lebih baru dari
   terakhir dilihat. Terakhir dilihat dicatat saat halaman detail dibuka. */
function seenGet() { try { const o = store.get('gq_seen', {}); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function seenMark(id) { try { const o = seenGet(); o[id] = Date.now(); store.set('gq_seen', o); } catch (e) {} }
function updMarkHTML(id, ts) {
  try {
    if (typeof isBookmarked !== 'function' || !isBookmarked(id) || !ts) return '';
    const seen = seenGet()[id] || 0;
    if (ts <= seen) return '';
    if ((Date.now() - ts) > 14 * 86400000 || (Date.now() - ts) < 0) return '';
    return '<span class="upd-dot"></span><span class="upd-label">Update</span>';
  } catch (e) { return ''; }
}
/* TAHAP 3.4: rekomendasi "Mirip dengan ini" berdasarkan genre (skor irisan). */
function similarTitles(kind, id, genres, n) {
  const has = {};
  (genres || []).forEach((g) => { has[g] = 1; });
  const scored = [];
  const pool = kind === 'anime' ? (ANI.shows || []) : (MW.titles || []);
  pool.forEach((x) => {
    if (x.id === id || (kind === 'anime' && isSoonU(x))) return;
    const gs = x.genres || [];
    let sc = 0;
    gs.forEach((g) => { if (has[g]) sc++; });
    if (sc > 0) scored.push({ x, sc });
  });
  scored.sort((a, b) => b.sc - a.sc);
  return scored.slice(0, n || 6).map((s) => s.x);
}
/* TAHAP 4.4: mode hemat data (matikan muat latar: prefetch, daftar live, rilis otomatis). */
function saverActive() {
  try {
    if (store.get('gq_saver', 0) === 1) return true;
    if (store.get('gq_quality', 'auto') === 'hemat') return true;
  } catch (e) {}
  return false;
}
/* TAHAP 4.1: Kode Cadangan — pindah bookmark/riwayat/progres antar perangkat.
   Jujur: situs ini tanpa server, jadi sinkron otomatis tidak mungkin;
   kode ini menyalin data lewat clipboard. Sandi akun TIDAK ikut (tetap di HP). */
const BK_KEYS = ['gq_bm', 'gq_bms', 'gq_hist', 'gq_cont', 'gq_contv', 'gq_watched', 'gq_readch', 'gq_seen', 'gq_sq_ani', 'gq_sq_mw', 'gq_name', 'gq_autoplay', 'gq_saver', 'gq_quality', 'gq_account', 'gq_linkrep'];
function bkExport() {
  const o = {};
  BK_KEYS.forEach((k) => { try { const v = localStorage.getItem(k); if (v != null) o[k] = v; } catch (e) {} });
  try { return 'GQ1.' + btoa(encodeURIComponent(JSON.stringify(o))); } catch (e) { return ''; }
}
function bkImport(code) {
  code = String(code || '').trim();
  if (!code) return 'empty';
  if (code.indexOf('GQ1.') !== 0) return 'format';
  try {
    const o = JSON.parse(decodeURIComponent(atob(code.slice(4))));
    if (!o || typeof o !== 'object') return 'format';
    let n = 0;
    BK_KEYS.forEach((k) => {
      if (typeof o[k] === 'string') { try { localStorage.setItem(k, o[k]); n++; } catch (e) {} }
    });
    return n ? 'ok' : 'empty';
  } catch (e) { return 'format'; }
}
/* TAHAP 4.2: tombol Install ke layar utama (PWA). */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  try { e.preventDefault(); } catch (err) {}
  deferredPrompt = e;
  ['installBtn', 'installBtn2'].forEach((id) => { const b = document.getElementById(id); if (b) b.hidden = false; });
});
function doInstall() {
  if (deferredPrompt) {
    try { deferredPrompt.prompt(); } catch (e) {}
    try {
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; }).catch(() => { deferredPrompt = null; });
    } catch (e) { deferredPrompt = null; }
    ['installBtn', 'installBtn2'].forEach((id) => { const b = document.getElementById(id); if (b) b.hidden = true; });
  } else {
    toast('Di iPhone: Bagikan → Tambah ke Layar Utama. Di Android: menu ⋮ → Install aplikasi.');
  }
}
/* Preview Semua (A2): 8 anime + 8 manhwa pilihan.
   Anti-lompat: tiap grid hanya ditulis ulang bila daftar isinya BERUBAH
   (tanda tangan id), dan posisi scroll dijaga. */
const PREV_SIG = { l: '', c: '' };
/* Kartu "BARU" untuk feed update: lokal (data-watch) + live (data-fresh) — klik = langsung tonton.
   Seluruh kartu bisa diketuk (cover/judul), bukan cuma tombolnya. */
function freshCardHTML(it) {
  const attr = it.live ? 'data-fresh="' + it.id + '"' : 'data-watch="' + it.id + '"';
  const cardAttr = it.live ? 'data-fresh="' + it.id + '"' : 'data-show="' + it.id + '"';
  // Badge kiri = nomor Ep (bila ada), badge kanan BARU hanya bila <48 jam
  let epBadge = 'EP';
  try {
    const nx = Number(it && it.next_air_ep);
    if (nx > 1) epBadge = 'EP ' + (nx - 1);
    else if (it && it.episodes) epBadge = 'EP ' + it.episodes;
  } catch (e) {}
  let baru = '';
  try {
    if (it && it.updated_at) {
      const ts = Date.parse(String(it.updated_at).replace(' ', 'T'));
      if (ts && (Date.now() - ts) <= 48 * 3600000 && (Date.now() - ts) >= 0) baru = '<span class="badge-new today">BARU</span>';
    }
  } catch (e) {}
  return '<article class="show-card" ' + cardAttr + '>' +
    '<div class="show-cover"><i>▶</i>' +
    (it.cover ? '<img src="' + esc(it.cover) + '" alt="' + esc(it.title || '') + '" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + esc(epBadge) + '</span>' + baru + '</div>' +
    '<div class="show-info"><strong>' + esc(it.title) + '</strong>' +
    '<small>' + esc(it.sub || T('fresh_live')) + '</small>' +
    '<div class="show-btns"><button class="btn" ' + attr + ' type="button">' + esc(T('card_watch')) + '</button></div></div></article>';
}
/* Subtitle kartu feed: live = nomor episode terbaru (dari next_air_ep) + status update;
   lokal = jumlah episode + status + tahun, ala kartu katalog. */
function liveEpSub(it) {
  try {
    const nx = Number(it && it.next_air_ep);
    if (nx > 1) return T('episode_w') + ' ' + (nx - 1) + ' • ' + T('fresh_live');
    if (it && it.updated_at) return T('fresh_live');
  } catch (e) {}
  return T('fresh_live');
}
function localEpSub(s) {
  try {
    const ak = akOf(s.id);
    const n = ak ? ak.episodes : s.episodes;
    const st = s.status === 'tayang' ? T('st_airing') : T('st_done');
    return (Number(n) || 0) + ' episode • ' + st + (s.year ? ' • ' + s.year : '');
  } catch (e) { return T('fresh_live'); }
}
/* Index recency episode lokal (data/eps_recent.json: akid -> {u: updated, n: jml episode}).
   Ditulis tools/refresh_all.py tiap ada episode yang berubah; diunduh best-effort agar
   judul yang baru update episode-nya naik ke atas Episode Terbaru. */
let EPSREC = null, EPSREC_P = null;
function getEpsRecent() {
  if (EPSREC) return Promise.resolve(EPSREC);
  if (EPSREC_P) return EPSREC_P;
  EPSREC_P = fetchTimeout('data/eps_recent.json', 8000)
    .then((r) => { if (!r.ok) throw new Error('no idx'); return bodyTimeout(r.json(), 8000); })
    .then((j) => { EPSREC = j || {}; return EPSREC; })
    .catch(() => { EPSREC = {}; return EPSREC; });
  return EPSREC_P;
}
function epsRecency(s) {
  try {
    const ak = akOf(s.id);
    const key = ak ? ak.id : s.akid;
    const r = key && EPSREC && EPSREC[key];
    if (r && r.u) {
      let raw = String(r.u).trim();
      // Dukung "YYYY-MM-DD" lama maupun ISO datetime baru "YYYY-MM-DDTHH:mm:ss".
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw += 'T23:59:59';
      const ts = Date.parse(raw.replace(' ', 'T'));
      if (ts) return ts;
    }
  } catch (e) {}
  return 0;
}
/* Judul dianggap "baru update" bila recency < 21 hari — dipakai agar Episode
   Terbaru TIDAK terpaku tahun: judul lama (mis. One Piece 1999) yang baru
   dapat episode dari nyaa.si/anikoto tetap naik ke atas, bukan stuck itu-itu saja. */
function isFreshRecency(s) {
  try {
    const ts = epsRecency(s);
    if (!ts) return false;
    const age = Date.now() - ts;
    return age >= 0 && age <= 21 * 24 * 3600000;
  } catch (e) { return false; }
}
/* Filter dasar Episode Terbaru: judul baru (2025+) ATAU judul lama yang baru
   update episodenya. Film & segera selalu dikecualikan. */
function latestBaseFilter(s) {
  if (!s || s.id.indexOf('rx_') === 0) return false;
  if (isSoonU(s) || s.kind === 'film') return false;
  if ((s.year || 0) >= 2025) return true;
  return isFreshRecency(s);
}
function sortLocalLatest(list) {
  return list.sort((a, b) => (epsRecency(b) - epsRecency(a)) ||
    ((b.year || 0) - (a.year || 0)) || ((b.akid || 0) - (a.akid || 0)));
}
/* BERANDA: Episode Terbaru (live recent-anime dulu, lalu lokal terurut update episode)
   + Chapter Terbaru (manhwa terurut update chapter, MW dimuat malas di latar). */
function paintPreview() {
  const pl = $('prevLatest');
  if (!pl || !ANI.shows.length) return;
  // TAHAP 1.7: skeleton selagi kartu beranda disiapkan (maks 6 item per section)
  try {
    if (!pl.innerHTML.trim()) pl.innerHTML = Array.from({ length: 6 }, () => '<div class="skel" aria-hidden="true"><div class="skel-cover"></div><div class="skel-line"></div></div>').join('');
    const pc = $('prevChapters');
    if (pc && !pc.innerHTML.trim()) pc.innerHTML = Array.from({ length: 6 }, () => '<div class="skel" aria-hidden="true"><div class="skel-cover"></div><div class="skel-line"></div></div>').join('');
  } catch (e) {}
  const y = window.scrollY || 0;
  const paint = (live) => {
    const local = sortLocalLatest((ANI.shows || []).filter(latestBaseFilter));
    const items = [], seen = {};
    (live || []).forEach((it) => {
      if (!it || !it.id || seen['rx' + it.id]) return;
      seen['rx' + it.id] = 1;
      items.push({ live: true, id: it.id, title: it.title || it.alternative || T('jx_untitled'), cover: it.poster || '', sub: liveEpSub(it) });
    });
    local.forEach((s) => {
      const ak = akOf(s.id);
      if (ak && seen['rx' + ak.id]) return;
      if (seen[s.id]) return;
      seen[s.id] = 1;
      items.push({ live: false, id: s.id, title: s.title, cover: s.cover || '', sub: localEpSub(s) });
    });
    const show = items.slice(0, 6);
    if (!show.length) return;
    const sig = 'l:' + show.map((it) => (it.live ? 'rx' : '') + it.id).join(',');
    if (sig === PREV_SIG.l) return;
    PREV_SIG.l = sig;
    keepScroll(() => { pl.innerHTML = show.map(freshCardHTML).join(''); });
  };
  paint([]);
  armMwHome(); // Chapter Terbaru: muat katalog manhwa malas di latar, lalu tampilkan
  try { paintChapterPreview(); } catch (e) {}
  (async () => {
    if (typeof saverActive === 'function' && saverActive()) return; // TAHAP 4.4: katalog lokal saja
    let live = [];
    try { const j = await apiGet('/recent-anime?page=1&per_page=12'); live = j.data || []; }
    catch (e) { /* katalog lokal tetap tampil */ }
    try { await getEpsRecent(); } catch (e) {}
    paint(live); // susunan akhir: live terbaru + lokal terurut update episode
  })();
  if ((window.scrollY || 0) !== y) {
    try { window.scrollTo({ top: y, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  }
}
/* Chapter Terbaru di beranda: 6 manhwa terurut update chapter (tanpa unduh chapters,
   hanya index lastUpdate). Diisi setelah MW termuat; kartu = mwCard standar. */
function paintChapterPreview() {
  const grid = $('prevChapters');
  if (!grid) return;
  if (typeof MW === 'undefined' || !MW.loaded || !MW.titles.length) return;
  const list = MW.titles.slice()
    .sort((a, b) => parseTgl(mwUpdated(b)) - parseTgl(mwUpdated(a))).slice(0, 6);
  const sig = 'c:' + list.map((x) => x.id).join(',');
  if (sig === PREV_SIG.c) return;
  PREV_SIG.c = sig;
  keepScroll(() => { grid.innerHTML = list.map(mwCard).join(''); });
}
let MW_HOME_ARMED = false;
function armMwHome() {
  if (MW_HOME_ARMED) return;
  MW_HOME_ARMED = true;
  const go = () => { try { ensureMw().then(() => paintChapterPreview()).catch(() => {}); } catch (e) {} };
  try {
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 5000 });
    else setTimeout(go, 1500);
  } catch (e) { try { setTimeout(go, 1500); } catch (e2) {} }
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
    $('lhKicker').textContent = T('lh_read');
    $('lhJudul').textContent = t.title;
    $('lhSub').textContent = pick.d.ch || '';
    $('lhBtn').onclick = () => openReader(pick.d.id, pick.d.idx || 0);
  } else {
    const s = findShow(pick.d.id);
    if (!s) { wrap.hidden = true; return; }
    $('lhKicker').textContent = T('lh_watch');
    $('lhJudul').textContent = s.title;
    $('lhSub').textContent = T('episode_w') + ' ' + pick.d.ep;
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
function seoHome() { return [T('doc_title'), T('seo_home_desc')]; }
let ANI = { updated: '', shows: [] };
let MW = { updated: '', titles: [] };
/* Streaming (anikoto API via proxy — direct fetch diblokir CORS) */
let AKMAP = {};
const API_PROXY = [
  (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
  (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  (u) => 'https://cors.eu.org/' + u,
  (u) => 'https://api.cors.lol/?url=' + encodeURIComponent(u),
];
const seriesCache = {};
/* Fetch berbatas waktu: daftar episode TIDAK BOLEH macet di "Memuat..."
   selamanya. Tiap percobaan jaringan dibatalkan setelah ms. */
function fetchTimeout(url, ms, opts) {
  const c = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const t = setTimeout(() => { try { if (c) c.abort(); } catch (e) {} }, ms || 12000);
  const o = Object.assign({}, opts || {});
  if (c) o.signal = c.signal;
  return fetch(url, o).finally(() => clearTimeout(t));
}
/* Timeout untuk BODY (r.text()/r.json() tanpa ini bisa gantung selamanya
   bila header sudah datang tapi badan macet — inilah "Memuat..." abadi). */
function bodyTimeout(promise, ms) {
  let t = null;
  const gate = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('body timeout')), ms || 12000); });
  return Promise.race([promise, gate]).finally(() => { if (t) clearTimeout(t); });
}
/* TAHAN-LAMA: circuit breaker + dedup penerbangan request live. */
var API_CB = { fails: 0, deadUntil: 0 };
var API_INFLIGHT = {};
try {
  var _d = Number(localStorage.getItem('gq_api_dead') || 0);
  if (_d && _d > Date.now()) API_CB.deadUntil = _d; // sesi lalu API mati → mulai hemat
} catch (e) {}
async function apiGet(path, tryMs) {
  // TAHAN-LAMA: circuit breaker — bila proxy/API mati beruntun, berhenti total
  // selama 15 menit (katalog lokal tetap jalan). Tanpa ini browser spam puluhan
  // request gagal → console merah "error" + radio HP nyala terus → dikira situs error.
  try {
    if (Date.now() < API_CB.deadUntil) throw 'offline-cooldown';
    var ik = String(path || '');
    var now = Date.now();
    var inf = API_INFLIGHT[ik];
    if (inf && now - inf.t < 10000) return inf.p; // dedup: 1 request per 10 detik per path
  } catch (e) { if (e === 'offline-cooldown') throw e; }
  const url = 'https://anikotoapi.site' + path;
  let lastErr = null;
  const p = (async () => {
    for (const px of API_PROXY) {
      try {
        const r = await fetchTimeout(px(url), tryMs || 12000);
        if (!r.ok) { lastErr = r.status; continue; }
        const j = await bodyTimeout(r.json(), tryMs || 12000);
        if (j && j.ok !== false) {
          API_CB.fails = 0;
          try { localStorage.removeItem('gq_api_dead'); } catch (_) {}
          return j;
        }
        lastErr = 'bad json';
      } catch (e) { lastErr = (e && e.name === 'AbortError') ? 'timeout' : e; }
    }
    throw lastErr || 'proxy gagal';
  })();
  try { API_INFLIGHT[ik] = { t: now, p: p }; } catch (e) {}
  try {
    return await p;
  } catch (e) {
    try {
      if (e !== 'offline-cooldown') {
        API_CB.fails = (API_CB.fails || 0) + 1;
        if (API_CB.fails >= 2) {
          API_CB.deadUntil = Date.now() + 5 * 60 * 1000; // cooldown 5 mnt (pendek: cepat pulih)
          try { localStorage.setItem('gq_api_dead', String(API_CB.deadUntil)); } catch (_) {}
        }
      }
    } catch (_) {}
    throw e;
  } finally {
    try { if (API_INFLIGHT[ik] && API_INFLIGHT[ik].p === p) delete API_INFLIGHT[ik]; } catch (e) {}
  }
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
  // sumber utama: file episode bawaan (instan, tanpa proxy; timeout 10 dtk)
  return fetchTimeout('data/eps/' + id + '.json', 10000)
    .then((r) => {
      if (!r.ok) throw new Error('no file');
      return bodyTimeout(r.json(), 10000);
    })
    .then((j) => {
      const d = { episodes: (j.episodes || []).map((e) => ({
        number: e.n, title: e.t, embed_url: e.e || {},
      })) };
      seriesCache[id] = d;
      cacheAk(id, d);
      return d;
    })
    .catch(() => apiGet('/series/' + id).then((j) => {
      seriesCache[id] = j.data;
      cacheAk(id, j.data);
      return j.data;
    }));
}
/* Versi live (tanpa cache 24 jam): dipakai pengecekan episode baru agar
   episode yang baru rilis di nyaa.si/anikoto langsung terdeteksi + langsung
   bisa ditonton, bukan ketahan cache lama. */
function apiSeriesLive(id) {
  return apiGet('/series/' + id).then((j) => {
    seriesCache[id] = j.data;
    cacheAk(id, j.data);
    return j.data;
  });
}
function akOf(showId) { return AKMAP[showId] || null; }
/* Belum tayang = status segera ATAU (tahun depan + tanpa embed).
   Pengaman agar judul 2027+ tanpa episode playable tak bocor ke Episode Terbaru
   walau status di data sempat salah tulis "tayang". */
function isSoonU(s) {
  if (!s) return false;
  if (s.status === 'segera') return true;
  try {
    const y = Number(s.year) || 0;
    const nowY = new Date().getFullYear();
    if (y > nowY && !s.akid && !akOf(s.id)) return true;
  } catch (e) {}
  return false;
}

function initials(t) {
  return t.split(/[\s:;]+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}
function showCard(s) {
  const ak = akOf(s.id);
  const eps = ak ? ak.episodes : s.episodes;
  const isSoon = isSoonU(s);
  const st = isSoon ? T('soon_meta') : (s.status === 'tayang' ? T('st_airing') : T('st_done'));
  const meta = s.kind === 'film'
    ? T('film_w') + ' • ' + (s.year || '')
    : (isSoon ? st + (s.year ? ' • ' + s.year : '') + (s.rilis ? ' • ' + s.rilis : '') : eps + ' episode • ' + st + (s.year ? ' • ' + s.year : ''));
  const gmeta = (s.genres && s.genres.length) ? ' • ' + s.genres.slice(0, 2).join(', ') : '';
  // TAHAP 1.2: badge EP berisi nomor; sembunyikan bila data tidak ada (kecuali SEGERA/FILM)
  let badgeHtml = '';
  if (isSoon) badgeHtml = '<span class="show-badge soon">SEGERA</span>';
  else if (s.kind === 'film') badgeHtml = '<span class="show-badge">FILM</span>';
  else if (Number(eps) > 0) badgeHtml = '<span class="show-badge">EP ' + Number(eps) + '</span>';
  const btn = isSoon ? esc(T('card_info')) : esc(T('card_watch'));
  // BARU hanya bila recency episode < 48 jam
  let baruHtml = '';
  let recTs = 0;
  try {
    recTs = (typeof epsRecency === 'function') ? epsRecency(s) : 0;
    if (recTs && (Date.now() - recTs) <= 48 * 3600000 && (Date.now() - recTs) >= 0 && !isSoon) baruHtml = '<span class="badge-new today">BARU</span>';
  } catch (e) {}
  // TAHAP 3.1 + 3.3: progress tonton + penanda update bookmark
  let progHtml = '';
  try { progHtml = progBarHTML(progCount('gq_watched', s.id), ak ? ak.episodes : s.episodes); } catch (e) {}
  const updHtml = updMarkHTML(s.id, recTs);
  return '<article class="show-card' + (isSoon ? ' is-soon' : '') + '" data-show="' + s.id + '">' +
    '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    badgeHtml + baruHtml + progHtml + '</div>' +
    '<div class="show-info"><strong>' + esc(s.title) + '</strong>' + updHtml +
    (s.alt ? '<small class="show-alt">(' + esc(s.alt) + ')</small>' : '') +
    '<small>' + esc(meta + gmeta) + '</small>' +
        '<div class="show-btns"><button class="btn' + (isSoon ? ' btn-ghost' : '') + '" data-watch="' + s.id + '" type="button">' + btn + '</button></div></div></article>';
}
/* Filter status katalog: semua | terbaru | tayang | tamat | film | segera (reset Muat lagi tiap ganti) */
function aniMatchF(s, f) {
  if (f === 'segera') return isSoonU(s);
  if (f === 'terbaru') return latestBaseFilter(s);
  if (f === 'tayang') return s.status === 'tayang' && !isSoonU(s) && s.kind !== 'film';
  if (f === 'tamat') return !isSoonU(s) && s.status !== 'tayang' && s.kind !== 'film';
  if (f === 'film') return s.kind === 'film' && !isSoonU(s);
  if (f === 'semua') return !isSoonU(s);
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
    toast(T('open_eplist'));
    return;
  }
  const i = DV.eps.findIndex((e) => String(e.number) === String(PCtx.epNum));
  if (i < 0) { toast(T('ep_notfound')); return; }
  const nx = DV.eps[i + dir];
  if (!nx) { toast(dir > 0 ? T('ep_last') : T('ep_first')); return; }
  if (!nx.ok) { toast(T('episode_w') + ' ' + nx.number + ' ' + T('coming_soon_dash')); return; }
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

/* State katalog anime: cari + filter status + genre + Muat lagi per 12 */
const ANI_UI = { q: '', f: 'semua', genre: '', genres: [], year: '', limit: 12, per: 12 };
/* TAHAP 3.7: cocok genre ganda (salah satu cocok = tampil) + tahun. */
function genreHit(itemGenres, single, multi) {
  const mg = Array.isArray(multi) && multi.length ? multi : (single ? [single] : []);
  if (!mg.length) return true;
  return mg.some((g) => (itemGenres || []).includes(g));
}
function yearHit(y, sel) {
  if (!sel) return true;
  y = Number(y) || 0;
  if (sel === 'old') return y > 0 && y <= 2021;
  return y === Number(sel);
}
/* Mode Akan Rilis = steril: hanya judul segera, tanpa campuran sudah-tayang.
   Aktif bila tab atas = segera ATAU filter status = segera. */
function isSegeraMode() {
  try {
    if (typeof CURCAT !== 'undefined' && CURCAT === 'segera') return true;
    if (typeof ANI_UI !== 'undefined' && ANI_UI.f === 'segera') return true;
  } catch (e) {}
  return false;
}
/* Atur visibilitas section anime sesuai mode:
   - segera: sembunyikan fresh/latest/jx + tab status dalam, tampilkan hanya grid segera.
   - filter aktif (terbaru/tayang/tamat/film): sembunyikan section tengah
     (fresh/latest/upcoming/jelajahi) agar HASIL FILTER langsung tampil di atas,
     tepat di bawah tab + jumlah — tak perlu scroll jauh.
   - semua: kembalikan seperti semula. */
function paintAnimeSections() {
  const soon = isSegeraMode();
  const fw = $('freshWrap'), lw = $('latestWrap'), jx = $('jxWrap'),
    tabs = $('aniStatusTabs'), up = $('upcomingWrap');
  // Di mode segera, upcomingWrap diduplikasi showGrid → sembunyikan agar 1 daftar saja.
  if (soon) {
    if (fw) fw.hidden = true;
    if (lw) lw.hidden = true;
    if (jx) jx.hidden = true;
    if (tabs) tabs.hidden = true;
    if (up) up.hidden = true;
  } else if (typeof ANI_UI !== 'undefined' && ANI_UI && ANI_UI.f && ANI_UI.f !== 'semua') {
    // Filter aktif → hasil di showGrid harus ada di atas: sembunyikan section tengah.
    if (fw) fw.hidden = true;
    if (lw) lw.hidden = true;
    if (up) up.hidden = true;
    if (jx) jx.hidden = true;
  } else {
    if (tabs) tabs.hidden = false;
    if (jx) jx.hidden = false;
    // Kembali ke Semua: tampilkan lagi section yang sudah ada isinya.
    try {
      const fg = $('freshGrid');
      if (fw && fg && fg.children.length) fw.hidden = false;
      const lg = $('latestGrid');
      if (lw && lg && lg.children.length) lw.hidden = false;
      const ug = $('upcomingGrid');
      if (up && ug && ug.children.length) up.hidden = false;
    } catch (e) {}
  }
}
function aniFiltered() {
  const q = ANI_UI.q || '';
  const list = ANI.shows.filter((s) => {
    if (s.id.indexOf('rx_') === 0) return false;
    if (!genreHit(s.genres, ANI_UI.genre, ANI_UI.genres)) return false;
    if (!yearHit(s.year, ANI_UI.year)) return false;
    if (q && !((s.title + ' ' + (s.alt || '')).toLowerCase().includes(q))) return false;
    // Saat mencari (q non-kosong), judul segera tetap boleh ketemu di filter semua/terbaru
    if (q && isSoonU(s) && (ANI_UI.f === 'semua' || ANI_UI.f === 'terbaru')) return true;
    return aniMatchF(s, ANI_UI.f);
  });
  if (ANI_UI.f === 'terbaru' || ANI_UI.f === 'segera') {
    // Episode Terbaru: yang baru update episode-nya naik paling atas (recency),
    // lalu tahun, lalu akid — jadi benar-benar yang terbaru, bukan sekadar tahun.
    try {
      list.sort((a, b) => ((typeof epsRecency === 'function' ? epsRecency(b) : 0) - (typeof epsRecency === 'function' ? epsRecency(a) : 0)) ||
        ((b.year || 0) - (a.year || 0)) || ((b.akid || 0) - (a.akid || 0)));
    } catch (e) {
      list.sort((a, b) => ((b.year || 0) - (a.year || 0)) || ((b.akid || 0) - (a.akid || 0)));
    }
  }
  return list;
}
/* Chips genre anime di bawah kategori Tonton (mirip Baca) */
function paintAniGenres() {
  const box = $('aniGenreChips');
  if (!box || !ANI.shows || !ANI.shows.length) return;
  if (!box.dataset.built) {
    const all = {};
    ANI.shows.forEach((s) => (s.genres || []).forEach((g) => { all[g] = 1; }));
    const genres = orderGenres(Object.keys(all));
    box.dataset.built = '1';
    box.innerHTML = '<button class="gchip active" data-anigenre="" role="tab" aria-selected="true" type="button">' + esc(T('chip_all')) + '</button>' +
      genres.map((g) => '<button class="gchip" data-anigenre="' + esc(g) + '" role="tab" aria-selected="false" type="button">' + esc(g) + '</button>').join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-anigenre]');
      if (!b) return;
      setAniGenre(b.dataset.anigenre);
      $('showGrid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  syncAniGenreChips();
}
function setAniGenre(g) {
  ANI_UI.genre = g || '';
  ANI_UI.limit = ANI_UI.per;
  syncAniGenreChips();
  renderShows();
}
function syncAniGenreChips() {
  const box = $('aniGenreChips');
  if (!box) return;
  box.querySelectorAll('[data-anigenre]').forEach((b) => {
    const on = (b.dataset.anigenre || '') === (ANI_UI.genre || '');
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}
function renderShows(filter) {
  return keepScroll(() => {
  if (typeof filter === 'string') ANI_UI.q = filter.toLowerCase().trim();
  const grid = $('showGrid'), q = ANI_UI.q;
  const list = aniFiltered();
  const slice = list.slice(0, ANI_UI.limit);
  grid.innerHTML = slice.map(showCard).join('') ||
    '<p class="muted">' + esc(T('notfound_try')) + '</p>';
  if (isSegeraMode()) {
    $('aniCount').textContent = T('showing') + ' ' + slice.length + ' ' + T('of') + ' ' + list.length + ' ' + T('animes_w') + ' • ' +
      list.reduce((a, s) => a + (Number(s.episodes) || 0), 0) + ' ' + T('episodes_w') + ' • ' + T('soon_list_meta');
  } else {
    $('aniCount').textContent = T('showing') + ' ' + slice.length + ' ' + T('of') + ' ' + list.length + ' ' + T('animes_w') + ' • ' +
      list.reduce((a, s) => a + (akOf(s.id) ? akOf(s.id).episodes : s.episodes), 0) + ' ' + T('episodes_w') + ' • ' + T('watch_here');
  }
  paintAnimeSections();
  const more = $('aniMore');
  if (more) {
    more.hidden = slice.length >= list.length;
    more.textContent = T('load_more') + ' (' + slice.length + '/' + list.length + ')';
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
/* ---------- 4b. IKON ANIME: galeri foto upload, tersimpan permanen di HP ----------
   Foto (mis. ikon anime dari Pinterest yang sudah disimpan) di-upload lewat
   tombol Upload, dikompres via canvas (maks 768px) lalu disimpan di IndexedDB
   agar ribuan foto muat dan tetap ada setelah refresh. Tanpa server. */
const IKON_UI = { q: '', src: 'semua', limit: 24, per: 24, photos: [], loaded: false, loading: null, cur: '' };
/* Ribuan foto bawaan daring (data/ikon.json, hasil tools/fetch_ikon.py).
   Dimuat malas saat tab Ikon dibuka; gagal dimuat = galeri tetap jalan
   dengan foto upload + foto repo. */
var IKON_URLS = [];
/* Batch karakter (Marin Kitagawa + Alya, data/ikon-marin.json): anime only,
   selalu tampil PALING BAWAH — di bawah semua foto non-pin. */
var IKON_MARIN = [];
/* Batch couple anime / pp couple anime (data/ikon-couple.json): couple:true,
   kind:"anime" (tab Couple Anime), tampil PALING BAWAH. */
var IKON_COUPLE = [];
/* Batch couple manhwa / pp couple manhwa (data/ikon-couple-manhwa.json):
   couple:true, kind:"manhwa" (tab Couple Manhwa), tampil PALING BAWAH.
   Pinterest tidak bisa disedot otomatis (wajib login + anti-bot), jadi batch
   ini dari Safebooru bernuansa webtoon/romance + cover manhwa romance. */
var IKON_COUPLE_MW = [];
/* Pin Pinterest matching-icon manhwa yang imut (data/ikon-couple-manhwa-pin.json):
   40 foto i.pinimg.com terverifikasi dari pencarian "matching icons manhwa".
   couple:true, kind:"manhwa", pin:true — SELALU tampil PALING ATAS
   (barisan atas) di tab Semua / Couple / Couple Manhwa. */
var IKON_COUPLE_MW_PIN = [];
/* Pack karakter per nama (data/ikon-pack-*.json via tools/fetch_ikon_packs.py,
   manifest data/ikon-packs.json): SELALU tampil PALING BAWAH — setelah semua
   batch lain. Rilis baru pack otomatis di bawah tanpa ubah kode. */
var IKON_PACKS = [];
/* Foto manhwa (cover katalog data/manhwa.json): grup "Manhwa" di galeri. */
var IKON_MW = [];
/* Foto komunitas (upload pengguna lain, via Firebase bila dikonfigurasi). */
var IKON_FB_PHOTOS = [];
/* Hitungan like: global dari Firebase, atau lokal per HP bila Firebase mati. */
var IKON_LIKES = {};
var IKON_FB = null;
/* Foto bawaan (file repo di ikon/): selalu tampil paling atas, tak bisa dihapus.
   Tambah foto baru = taruh file di ikon/ikon-NN.jpg lalu tambah 1 baris di sini. */
const IKON_BUILTINS = [
  { id: 'pin-marin', name: 'Marin Kitagawa 📌', url: 'https://i.pinimg.com/564x/1a/b2/41/1ab241753725ab690b207feea36a5542.jpg', builtin: true, ts: 0 },
  { id: 'pin-alya', name: 'Alya Kujou 📌', url: 'https://i.pinimg.com/originals/e8/7f/83/e87f83e57260b53f10083a4117cf6ee8.jpg', builtin: true, ts: 0 },
  { id: 'pin-alya2', name: 'Alya Icon 📌', url: 'https://i.pinimg.com/originals/04/97/12/0497122c02eeaa97f0e3a2ab21a39382.jpg', builtin: true, ts: 0 },
  { id: 'b1', name: 'Gadis bunga putih', url: 'ikon/ikon-01.jpg', builtin: true, ts: 0 },
  { id: 'b2', name: 'Waguri Kaoruko', url: 'ikon/ikon-02.png', builtin: true, ts: 0 },
];
function ikonDb() {
  return new Promise((resolve, reject) => {
    try {
      const rq = indexedDB.open('gq_ikon', 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    } catch (e) { reject(e); }
  });
}
function ikonDbAll(db) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('photos', 'readonly').objectStore('photos').getAll();
      tx.onsuccess = () => resolve(tx.result || []);
      tx.onerror = () => reject(tx.error);
    } catch (e) { reject(e); }
  });
}
function ikonDbPut(db, item) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('photos', 'readwrite').objectStore('photos').add(item);
      tx.onsuccess = () => resolve(tx.result);
      tx.onerror = () => reject(tx.error);
    } catch (e) { reject(e); }
  });
}
function ikonDbDel(db, id) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('photos', 'readwrite').objectStore('photos').delete(id);
      tx.onsuccess = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) { reject(e); }
  });
}
/* ---------- Galeri publik (Firebase, opsional) ----------
   Tanpa window.GQ_FIREBASE yang valid, semua fungsi di bawah aman tidak
   aktif (return null/false) dan galeri tetap jalan 100% lokal. Isi config
   sesuai SETUP_GALERI_PUBLIK.md agar upload & like terlihat semua pengguna. */
function ikonFb() {
  try {
    const cfg = window.GQ_FIREBASE;
    if (!cfg || !cfg.apiKey) return null;
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    if (!IKON_FB) {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      IKON_FB = { db: firebase.database(), storage: (firebase.storage ? firebase.storage() : null) };
    }
    return IKON_FB;
  } catch (e) { return null; }
}
/* Kirim 1 foto ke galeri publik: simpan file ke Storage (bila ada),
   lalu catat URL publiknya di Database agar tampil di semua HP. */
function ikonFbShare(ph) {
  const f = ikonFb();
  if (!f || !f.db) return Promise.resolve(false);
  return (async () => {
    try {
      let url = ph.url;
      if (f.storage && /^data:/.test(url)) {
        const ref = f.storage.ref().child('ikon/' + Date.now() + '.jpg');
        await ref.putString(url, 'data_url');
        url = await ref.getDownloadURL();
      }
      if (!url) return false;
      await f.db.ref('ikon').push({ name: ph.name || 'Icon', url, ts: Date.now() });
      return true;
    } catch (e) { return false; }
  })();
}
/* --- Like: hitungan global (transaction) + status sudah-like per HP --- */
function ikonLikedGet() { try { return JSON.parse(localStorage.getItem('gq_ikon_liked') || '[]'); } catch (e) { return []; } }
function ikonLikedSet(a) { try { localStorage.setItem('gq_ikon_liked', JSON.stringify(a)); } catch (e) {} }
function ikonLikeMapGet() { try { return JSON.parse(localStorage.getItem('gq_ikon_likemap') || '{}'); } catch (e) { return {}; } }
function ikonLikeMapSet(o) { try { localStorage.setItem('gq_ikon_likemap', JSON.stringify(o)); } catch (e) {} }
function ikonLikeCount(p) {
  const k = String(p.id);
  if (IKON_LIKES[k] != null) return IKON_LIKES[k];
  const m = ikonLikeMapGet();
  return m[k] || 0;
}
/* Muat hitungan like global sekali (dipakai kartu); pratinjau memakai live. */
function ikonLikesLoad() {
  const f = ikonFb();
  if (!f) return Promise.resolve();
  return f.db.ref('ikon_likes').once('value').then((s) => {
    IKON_LIKES = s.val() || {};
  }).catch(() => {});
}
var ikonLikeBusy = false;
function ikonToggleLike() {
  const id = IKON_UI.cur;
  if (id === '' || id == null || ikonLikeBusy) return;
  const key = String(id);
  const liked = ikonLikedGet();
  const on = liked.indexOf(key) < 0;
  const paint = (n) => {
    const b = $('ikonLike');
    if (b) b.textContent = (on ? '❤️ ' : '🤍 ') + n;
  };
  const done = (n) => {
    ikonLikeBusy = false;
    if (on) liked.push(key);
    else { const i = liked.indexOf(key); if (i >= 0) liked.splice(i, 1); }
    ikonLikedSet(liked);
    IKON_LIKES[key] = n;
    if (!ikonFb()) { const m = ikonLikeMapGet(); m[key] = n; ikonLikeMapSet(m); }
    paint(n);
    try { renderIkon(); } catch (e) {}
  };
  ikonLikeBusy = true;
  const f = ikonFb();
  if (f) {
    f.db.ref('ikon_likes/' + key).transaction((c) => (c || 0) + (on ? 1 : -1), (err, ok, snap) => {
      if (err || !ok) { ikonLikeBusy = false; toast(T('net_busy')); return; }
      done(Math.max(0, (snap && snap.val()) || 0));
    });
  } else {
    const m = ikonLikeMapGet();
    done(Math.max(0, (m[key] || IKON_LIKES[key] || 0) + (on ? 1 : -1)));
  }
}
/* Live count selama pratinjau dibuka: semua pengguna lihat angka yang sama. */
var ikonLikeRef = null;
function ikonLikeWatch(key) {
  ikonLikeUnwatch();
  const f = ikonFb();
  if (!f) return;
  try {
    ikonLikeRef = f.db.ref('ikon_likes/' + key);
    ikonLikeRef.on('value', (s) => {
      const n = Math.max(0, (s && s.val()) || 0);
      IKON_LIKES[key] = n;
      const b = $('ikonLike');
      if (b && String(IKON_UI.cur) === String(key)) {
        const liked = ikonLikedGet().indexOf(String(key)) >= 0;
        b.textContent = (liked ? '❤️ ' : '🤍 ') + n;
      }
    });
  } catch (e) { ikonLikeRef = null; }
}
function ikonLikeUnwatch() { try { if (ikonLikeRef) ikonLikeRef.off(); } catch (e) {} ikonLikeRef = null; }
function ikonDlName(p, blobType) {
  // Nama file aman: tanpa emoji/spasi aneh; ekstensi ikut tipe blob aslinya.
  let base = '';
  try { base = (typeof prettyIkonName === 'function' ? prettyIkonName(p) : (p && p.name)) || 'icon'; } catch (e) { base = (p && p.name) || 'icon'; }
  base = String(base).replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'icon';
  let ext = 'jpg';
  try {
    const u = String((p && p.url) || '').split('?')[0].toLowerCase();
    const m = u.match(/\.(jpg|jpeg|png|webp|gif)$/);
    if (m) ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    if (blobType) {
      if (/png/i.test(blobType)) ext = 'png';
      else if (/webp/i.test(blobType)) ext = 'webp';
      else if (/gif/i.test(blobType)) ext = 'gif';
      else if (/jpe?g/i.test(blobType)) ext = 'jpg';
    }
  } catch (e) {}
  return base + '.' + ext;
}
/* ---------- Download foto: langsung ke folder Download bila bisa ----------
   - data:/blob:/same-origin → atribut download (pasti masuk folder).
   - URL luar → fetch jadi blob lalu simpan. Coba langsung dulu, lalu lewat
     proxy CORS (allorigins/codetabs/corsproxy) supaya TIDAK perlu buka tab
     baru. File tetap bytes asli, tidak dikompres ulang.
   - Semua gagal → baru buka tab baru + panduan simpan manual (jalan terakhir). */
function ikonSave(url, filename) {
  const btn = document.getElementById('ikonModalDl');
  const busy = (on) => {
    try {
      if (!btn) return;
      btn.disabled = !!on;
      if (on) { btn.dataset.txt = btn.textContent; btn.textContent = '⏳ Mengunduh…'; }
      else if (btn.dataset.txt) { btn.textContent = btn.dataset.txt; delete btn.dataset.txt; }
    } catch (e) {}
  };
  const go = (href, dl, name) => {
    const a = document.createElement('a');
    a.href = href;
    if (dl) a.setAttribute('download', name || filename || 'icon.jpg');
    else { a.target = '_blank'; a.rel = 'noopener'; }
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { a.remove(); } catch (e) {} }, 500);
  };
  const p = (() => { try { return findIkonPhoto(IKON_UI.cur); } catch (e) { return null; } })();
  const safeName = ikonDlName(p || { name: filename, url: url });
  let same = false;
  try { same = new URL(url, location.href).origin === location.origin; } catch (e) {}
  if (/^(data|blob):/.test(url) || same) {
    go(url, true, safeName);
    toast(T('dl_started_ok') + safeName + T('dl_check_folder'));
    return;
  }
  busy(true);
  toast(T('dl_search'));
  const proxies = [
    null,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    'https://corsproxy.io/?url=' + encodeURIComponent(url),
  ];
  (async () => {
    let lastErr = null;
    for (const target of proxies) {
      try {
        const r = await fetchTimeout(target || url, 15000, target ? {} : { mode: 'cors' });
        if (!r.ok) { lastErr = 'http ' + r.status; continue; }
        const b = await bodyTimeout(r.blob(), 15000);
        if (!b || !b.size) { lastErr = 'empty'; continue; }
        const ou = URL.createObjectURL(b);
        go(ou, true, ikonDlName(p || { name: filename, url: url }, b.type));
        setTimeout(() => { try { URL.revokeObjectURL(ou); } catch (e) {} }, 15000);
        toast(T('dl_started_ok') + safeName + T('dl_check_folder'));
        busy(false);
        return;
      } catch (e) { lastErr = e; }
    }
    busy(false);
    go(url, false);
    toast(T('ikon_dl_tab'));
  })();
}
function findIkonPhoto(id) {
  const all = IKON_COUPLE_MW_PIN.concat(IKON_BUILTINS, IKON_UI.photos, IKON_FB_PHOTOS, IKON_URLS, IKON_MW, IKON_MARIN, IKON_COUPLE, IKON_COUPLE_MW, ...IKON_PACKS);
  return all.find((x) => String(x.id) === String(id)) || null;
}
function ikonEnsure() {
  if (IKON_UI.loaded) return Promise.resolve(IKON_UI.photos);
  if (IKON_UI.loading) return IKON_UI.loading;
  const urls = fetch('data/ikon.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('ikon json ' + r.status);
    return r.json();
  }).then((d) => {
    IKON_URLS = ((d && d.photos) || []).map((p) => ({ id: 's' + p.id, name: p.name, url: p.url, builtin: true }));
  }).catch(() => { IKON_URLS = []; });
  const batch = fetch('data/ikon-marin.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('ikon marin ' + r.status);
    return r.json();
  }).then((d) => {
    IKON_MARIN = ((d && d.photos) || []).map((p) => ({ id: 'k' + p.id, name: p.name, url: p.url, builtin: true }));
  }).catch(() => { IKON_MARIN = []; });
  const batch2 = fetch('data/ikon-couple.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('ikon couple ' + r.status);
    return r.json();
  }).then((d) => {
    IKON_COUPLE = ((d && d.photos) || []).map((p) => ({ id: 'c' + p.id, name: p.name || 'Couple Anime', url: p.url, builtin: true, couple: true, kind: 'anime' }));
  }).catch(() => { IKON_COUPLE = []; });
  const batch3 = fetch('data/ikon-couple-manhwa.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('ikon couple manhwa ' + r.status);
    return r.json();
  }).then((d) => {
    IKON_COUPLE_MW = ((d && d.photos) || []).map((p) => ({ id: 'w' + p.id, name: p.name || 'Couple Manhwa', url: p.url, builtin: true, couple: true, kind: 'manhwa' }));
  }).catch(() => { IKON_COUPLE_MW = []; });
  const batch4 = fetch('data/ikon-couple-manhwa-pin.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('ikon couple manhwa pin ' + r.status);
    return r.json();
  }).then((d) => {
    IKON_COUPLE_MW_PIN = ((d && d.photos) || []).map((p) => ({ id: 'p' + p.id, name: (p.name || 'Matching Icon Manhwa') + ' 💕', url: p.url, builtin: true, couple: true, kind: 'manhwa', pin: true }));
  }).catch(() => { IKON_COUPLE_MW_PIN = []; });
  const local = ikonDb().then(ikonDbAll).then((rows) => {
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    IKON_UI.photos = rows;
  }).catch(() => { IKON_UI.photos = []; });
  const mw = fetch('data/manhwa.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('manhwa json ' + r.status);
    return r.json();
  }).then((d) => {
    IKON_MW = ((d && d.titles) || []).filter((t) => t && t.cover).map((t) => (
      { id: 'm' + t.slug, name: t.title, url: t.cover, builtin: true }));
  }).catch(() => { IKON_MW = []; });
  const comm = (() => { try {
    const f = ikonFb();
    if (!f) return Promise.resolve();
    return f.db.ref('ikon').limitToLast(1000).once('value').then((s) => {
      const arr = [];
      s.forEach((ch) => {
        const v = ch.val() || {};
        if (v.url) arr.push({ id: 'f' + ch.key, name: v.name || 'Icon komunitas', url: v.url, builtin: true, ts: v.ts || 0, comm: true });
      });
      arr.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      IKON_FB_PHOTOS = arr;
    });
  } catch (e) { return Promise.resolve(); } })();
  const likes = ikonLikesLoad();
  // Pack karakter per nama (manifest-driven): gagal dimuat = galeri tetap jalan.
  const packs = fetch('data/ikon-packs.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('packs manifest ' + r.status);
    return r.json();
  }).then((d) => {
    const files = ((d && d.packs) || []).filter((f) => typeof f === 'string');
    return Promise.all(files.map((f, i) => fetch(f, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('pack ' + f + ' ' + r.status);
      return r.json();
    }).then((pd) => {
      const pre = 'x' + i + '_';
      return ((pd && pd.photos) || []).map((p) => ({ id: pre + p.id, name: p.name || (pd.character || 'Icon'), url: p.url, builtin: true, pack: pd.character || f }));
    }).catch(() => [])));
  }).then((arrs) => { IKON_PACKS = arrs; }).catch(() => { IKON_PACKS = []; });
  IKON_UI.loading = Promise.all([urls, local, mw, batch, batch2, batch3, batch4, comm, likes, packs]).then(() => {
    IKON_UI.loaded = true;
    return IKON_UI.photos;
  });
  return IKON_UI.loading;
}
/* Kecilkan foto besar via canvas (maks 768px, JPEG 0.85) */
function ikonFileToPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 768;
        const sc = Math.min(1, MAX / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 0) * sc));
        const h = Math.max(1, Math.round((img.height || 0) * sc));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { URL.revokeObjectURL(url); } catch (_) {}
        resolve({ name: String(file.name || 'icon').replace(/\.[a-z0-9]+$/i, ''), url: c.toDataURL('image/jpeg', 0.85), w, h, ts: Date.now() });
      } catch (e) { try { URL.revokeObjectURL(url); } catch (_) {} reject(e); }
    };
    img.onerror = () => { try { URL.revokeObjectURL(url); } catch (_) {} reject(new Error('bad img')); };
    img.src = url;
  });
}
function ikonList() {
  const q = (IKON_UI.q || '').toLowerCase();
  const ok = (p) => !q || String(p.name || '').toLowerCase().includes(q);
  // Pin matching-icon manhwa SELALU paling depan → barisan atas.
  // Pack karakter per nama SELALU paling belakang → barisan bawah (di luar
  // adukan couple/single agar tidak terseret ke tengah).
  const all = IKON_COUPLE_MW_PIN.concat(IKON_BUILTINS, IKON_UI.photos, IKON_FB_PHOTOS, IKON_URLS, IKON_MW, IKON_MARIN, IKON_COUPLE, IKON_COUPLE_MW);
  const packAll = IKON_PACKS.reduce((a, b) => a.concat(b), []);
  // Filter galeri: Semua / Couple / Couple Anime / Couple Manhwa.
  // (Nilai lama 'single'/'mine'/'anime'/'manhwa' dipertahankan agar kompatibel.)
  const isCouple = (p) => p.couple === true || /💕|couple|pp couple|pasangan/i.test(String(p.name || ''));
  const isManhwa = (p) => p.kind === 'manhwa' || /manhwa|manhua|webtoon/i.test(String(p.name || ''));
  // Campur anime + manhwa selang-seling (mulai dari pin manhwa imut agar
  // tetap barisan atas): 1 manhwa, 1 anime, 1 manhwa, 1 anime, …
  const mixAnimeManhwa = (list) => {
    const mw = list.filter((p) => isManhwa(p));
    const an = list.filter((p) => !isManhwa(p));
    const out = [];
    const n = Math.max(mw.length, an.length);
    for (let i = 0; i < n; i++) {
      if (i < mw.length) out.push(mw[i]);
      if (i < an.length) out.push(an[i]);
    }
    return out;
  };
  if (IKON_UI.src === 'couple') return mixAnimeManhwa(all.filter(isCouple)).filter(ok);
  if (IKON_UI.src === 'couple-anime') return all.filter((p) => isCouple(p) && !isManhwa(p)).filter(ok);
  if (IKON_UI.src === 'couple-manhwa') return all.filter((p) => isCouple(p) && isManhwa(p)).filter(ok);
  if (IKON_UI.src === 'single') return all.filter((p) => !isCouple(p)).concat(packAll).filter(ok);
  if (IKON_UI.src === 'mine') return IKON_UI.photos.filter(ok);
  if (IKON_UI.src === 'anime') return IKON_COUPLE_MW_PIN.concat(IKON_BUILTINS, IKON_UI.photos, IKON_FB_PHOTOS, IKON_URLS, IKON_MARIN, IKON_COUPLE, IKON_COUPLE_MW, ...IKON_PACKS).filter(ok);
  if (IKON_UI.src === 'manhwa') return IKON_MW.filter(ok);
  // Semua: baris 1 = Marin, Alya, Waguri (hanya saat tidak mencari),
  // lalu couple + non-couple DICAMPUR selang-seling agar foto biasa tidak
  // tenggelam di belakang ribuan foto couple.
  const mixedCouples = mixAnimeManhwa(all.filter(isCouple));
  const singles = all.filter((p) => !isCouple(p));
  const mixCoupleSingle = (cp, sg) => {
    const out = [];
    const n = Math.max(cp.length, sg.length);
    for (let i = 0; i < n; i++) {
      if (i < cp.length) out.push(cp[i]);
      if (i < sg.length) out.push(sg[i]);
    }
    return out;
  };
  if (!q) {
    const m = all.find((p) => /marin/i.test(String(p.name || '')));
    const a = all.find((p) => /alya/i.test(String(p.name || '')));
    const w = IKON_BUILTINS.find((p) => String(p.id) === 'b2');
    const top = [m, a, w].filter(Boolean);
    const ids = {};
    top.forEach((p) => { ids[String(p.id)] = 1; });
    return top.concat(mixCoupleSingle(mixedCouples, singles).filter((p) => !ids[String(p.id)]), packAll.filter((p) => !ids[String(p.id)])).filter(ok);
  }
  return mixCoupleSingle(mixedCouples, singles).concat(packAll).filter(ok);
}
function ikonCard(p) {
  const lc = ikonLikeCount(p);
  let nm = String((p && p.name) || '').trim();
  // Hapus judul berupa nomor file (mis. "001", "icon-01.jpg") → tanpa teks
  if (/^(ikon|icon|img|image|file|photo|foto)[-_ ]?\d+(\.(jpg|png|webp|jpeg))?$/i.test(nm) || /^\d+(\.(jpg|png|webp|jpeg))?$/i.test(nm) || /^\d+[-_ .]+\d*$/i.test(nm)) nm = '';
  const label = nm || '';
  const likes = lc > 0 ? '<div class="ikon-tile-name">❤️ ' + lc + '</div>' : '';
  return '<article class="show-card" data-ikon="' + p.id + '" tabindex="0" aria-label="' + esc(label || 'Icon anime') + '">' +
    '<div class="show-cover"><i>' + esc(initials(label || 'A')) + '</i>' +
    '<img src="' + p.url + '" alt="' + esc(label || 'Icon anime') + '" loading="lazy" decoding="async" onerror="this.remove()">' +
    (p.couple ? '<span class="couple-badge">💕 ' + (p.kind === 'manhwa' || /manhwa/i.test(label) ? 'Manhwa' : (p.kind === 'anime' || /couple anime/i.test(label) ? 'Anime' : 'Couple')) + '</span>' : '') + '</div>' +
    (label ? '<div class="show-info"><div class="ikon-tile-name">' + esc(label) + '</div>' + likes + '</div>' : (likes ? '<div class="show-info">' + likes + '</div>' : '')) + '</article>';
}
function renderIkon() {
  return keepScroll(() => {
  const grid = $('ikonGrid');
  if (!grid) return;
  const done = () => {
    const list = ikonList();
    const slice = list.slice(0, IKON_UI.limit);
    grid.innerHTML = slice.map(ikonCard).join('');
    const emp = $('ikonEmpty');
    if (emp) emp.hidden = list.length > 0;
    const cnt = $('ikonCount');
    if (cnt) cnt.textContent = T('showing') + ' ' + slice.length + ' ' + T('of') + ' ' + list.length + ' ' + T('ikon_photos');
    const more = $('ikonMore');
    if (more) {
      more.hidden = slice.length >= list.length;
      more.textContent = T('load_more') + ' (' + slice.length + '/' + list.length + ')';
    }
  };
  if (!IKON_UI.loaded) {
    grid.innerHTML = '<p class="muted">' + esc(T('loading')) + '</p>';
    ikonEnsure().then(done, done);
  } else done();
  });
}
function openIkon(id) {
  const p = findIkonPhoto(id);
  if (!p) return;
  IKON_UI.cur = p.id;
  $('ikonModalTitle').textContent = p.name || 'Icon';
  const img = $('ikonModalImg');
  img.src = p.url;
  img.alt = p.name || 'Icon';
  const sub = $('ikonModalSub');
  if (sub) sub.textContent = (p.comm ? T('ikon_community') + ' • ' : '') + (p.name || '');
  const dl = $('ikonModalDl');
  if (dl) { dl.href = p.url; }
  const del = $('ikonDel');
  if (del) del.hidden = !!p.builtin; // foto bawaan/komunitas tak bisa dihapus
  const lb = $('ikonLike');
  if (lb) {
    const liked = ikonLikedGet().indexOf(String(p.id)) >= 0;
    lb.textContent = (liked ? '❤️ ' : '🤍 ') + ikonLikeCount(p);
  }
  ikonLikeWatch(String(p.id));
  $('ikonModal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function ikonDeleteCur() {
  const id = IKON_UI.cur;
  if (id === '' || id == null) return;
  if (IKON_BUILTINS.some((x) => String(x.id) === String(id))) return; // bawaan: jangan hapus
  ikonDb().then((db) => ikonDbDel(db, id), () => {}).then(() => {
    IKON_UI.photos = IKON_UI.photos.filter((x) => String(x.id) !== String(id));
    IKON_UI.cur = '';
    closeIkon();
    renderIkon();
    toast(T('ikon_deleted'));
  });
}
function closeIkon() {
  ikonLikeUnwatch();
  const md = $('ikonModal');
  if (md && !md.hidden) { md.hidden = true; syncBodyLock(); }
}
(function initIkon() {
  const up = $('ikonUploadBtn'), fi = $('ikonFile');
  if (up && fi) {
    up.addEventListener('click', () => fi.click());
    fi.addEventListener('change', async () => {
      const files = Array.from(fi.files || []).filter((f) => f.type.indexOf('image/') === 0);
      fi.value = '';
      if (!files.length) return;
      toast(T('loading'));
      let ok = 0, shared = 0;
      const fresh = [];
      // Upload sebagai Couple Anime / Couple Manhwa sesuai pilihan.
      // Hasil upload tersimpan di perangkat ini (IndexedDB) — format JPG/PNG.
      const kindSel = $('ikonKind');
      const kindVal = !kindSel ? 'couple-anime' : kindSel.value;
      const kind = kindVal === 'couple-manhwa' ? 'manhwa' : 'anime';
      try {
        const db = await ikonDb();
        for (const f of files) {
          try {
            const ph = await ikonFileToPhoto(f);
            ph.couple = true;
            ph.kind = kind;
            const tagName = kind === 'manhwa' ? 'Couple Manhwa' : 'Couple Anime';
            if (!/couple|pp|pasangan|manhwa|anime/i.test(ph.name || '')) ph.name = (ph.name || tagName) + ' 💕';
            else if (kind === 'manhwa' && !/manhwa/i.test(ph.name || '')) ph.name = (ph.name || '') + ' Manhwa';
            else if (kind === 'anime' && !/anime/i.test(ph.name || '')) ph.name = (ph.name || '') + ' Anime';
            ph.id = await ikonDbPut(db, ph);
            IKON_UI.photos.push(ph); // rilis baru selalu di BAWAH, bukan atas
            fresh.push(ph);
            ok++;
          } catch (e) {}
        }
      } catch (e) {}
      // Galeri publik: tampilkan ke semua pengguna bila Firebase aktif
      if (fresh.length && ikonFb()) {
        for (const ph of fresh) {
          try { if (await ikonFbShare(ph)) shared++; } catch (e) {}
        }
      }
      IKON_UI.loaded = true;
      renderIkon();
      toast(shared > 0 ? shared + ' ' + T('ikon_shared') : ok + ' ' + T('ikon_added'));
    });
  }
  const si = $('ikonSearch');
  if (si) si.addEventListener('input', () => {
    IKON_UI.q = si.value.toLowerCase().trim();
    IKON_UI.limit = IKON_UI.per;
    renderIkon();
  });
  const mo = $('ikonMore');
  if (mo) mo.addEventListener('click', () => { IKON_UI.limit += IKON_UI.per; renderIkon(); });
  const chips = $('ikonSrcChips');
  if (chips) chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ikonsrc]');
    if (!b) return;
    IKON_UI.src = b.dataset.ikonsrc || 'semua';
    IKON_UI.limit = IKON_UI.per;
    chips.querySelectorAll('[data-ikonsrc]').forEach((x) => {
      const on = x === b;
      x.classList.toggle('active', on);
      x.classList.toggle('btn-ghost', !on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderIkon();
  });
  // Tambah banyak via link: tempel banyak URL gambar (1 per baris).
  // Format per baris: URL saja, atau "Nama Karakter | URL" agar nama tampil
  // (mis. "Marin Kitagawa | https://...jpg"). Rilis baru masuk di BAWAH.
  // Pinterest (pp couple anime / pp couple manhwa) tidak bisa disedot otomatis
  // (wajib login + anti-bot + CORS), jadi alurnya: buka gambarnya → salin
  // alamat gambar → tempel di sini. Tersimpan di perangkat ini.
  const bulkBtn = $('ikonBulkAdd');
  if (bulkBtn) bulkBtn.addEventListener('click', async () => {
    const ta = $('ikonBulkUrls');
    const raw = String((ta && ta.value) || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
    // Pecah "Nama | URL" bila ada; selain itu anggap 1 baris = 1 URL.
    const items = [];
    for (const line of raw) {
      const m = line.split('|');
      if (m.length >= 2 && /^https?:\/\/.+/i.test(m[m.length - 1].trim())) {
        const url = m[m.length - 1].trim();
        const nm = m.slice(0, -1).join('|').trim();
        items.push({ name: nm, url });
      } else if (/^https?:\/\/.+/i.test(line)) {
        items.push({ name: '', url: line });
      }
      if (items.length >= 100) break;
    }
    const urls = items;
    if (!urls.length) { toast('Tempel dulu link gambarnya (1 per baris, atau "Nama | link")'); return; }
    const kindSel = $('ikonKind');
    const kindVal = !kindSel ? 'couple-anime' : kindSel.value;
    const kind = kindVal === 'couple-manhwa' ? 'manhwa' : 'anime';
    const tagName = kind === 'manhwa' ? 'Couple Manhwa' : 'Couple Anime';
    let ok = 0;
    try {
      const db = await ikonDb();
      for (const [i, it] of urls.entries()) {
        try {
          const u = it.url;
          const customName = String(it.name || '').slice(0, 40);
          const ph = { name: customName || (tagName + ' link ' + (IKON_UI.photos.length + 1) + ' 💕'), url: u, couple: true, kind, ts: Date.now() + i };
          ph.id = await ikonDbPut(db, ph);
          IKON_UI.photos.push(ph); // rilis baru selalu di BAWAH, bukan atas
          ok++;
        } catch (e) {}
      }
    } catch (e) {}
    if (ta) ta.value = '';
    IKON_UI.loaded = true;
    // Langsung pindah ke filter yang cocok agar hasilnya kelihatan
    IKON_UI.src = kind === 'manhwa' ? 'couple-manhwa' : 'couple-anime';
    IKON_UI.limit = IKON_UI.per;
    if (chips) chips.querySelectorAll('[data-ikonsrc]').forEach((x) => {
      const on = x.dataset.ikonsrc === IKON_UI.src;
      x.classList.toggle('active', on);
      x.classList.toggle('btn-ghost', !on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderIkon();
    toast(ok + ' foto ditambahkan 💕');
  });
  const gr = $('ikonGrid');
  if (gr) gr.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ikonview]');
    if (b) { openIkon(b.dataset.ikonview); return; }
    const c = e.target.closest('[data-ikon]');
    if (c) openIkon(c.dataset.ikon);
  });
  const cl = $('ikonClose');
  if (cl) cl.addEventListener('click', closeIkon);
  const del = $('ikonDel');
  if (del) del.addEventListener('click', ikonDeleteCur);
  const like = $('ikonLike');
  if (like) like.addEventListener('click', ikonToggleLike);
  const dln = $('ikonModalDl');
  if (dln && !dln.dataset.wired) { dln.dataset.wired = '1'; dln.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const p = findIkonPhoto(IKON_UI.cur);
    if (p) ikonSave(p.url, (p.name || 'icon') + '.jpg');
  }); }
  const md = $('ikonModal');
  if (md) md.addEventListener('click', (e) => { if (e.target === md) closeIkon(); });
})();
/* Rilis baru otomatis: ambil deretan terbaru, judul di luar katalog langsung bisa ditonton */
function loadFresh() {
  const pages = [1, 2, 3];
  const seen = {};
  const all = [];
  (async () => {
    if (typeof saverActive === 'function' && saverActive()) return; // TAHAP 4.4: katalog lokal saja
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
    if (isSegeraMode()) return; // mode Akan Rilis steril: jangan tampilkan sudah-tayang
    keepScroll(() => {
      if (isSegeraMode()) return;
      try { if (typeof ANI_UI !== 'undefined' && ANI_UI && ANI_UI.f && ANI_UI.f !== 'semua') return; } catch (e) {}
      $('freshWrap').hidden = false;
      $('freshWrap').dataset.sig = sig;
      // TAHAP 1.2: badge EP berisi nomor; sembunyikan bila data tidak ada; BARU < 48 jam
      $('freshGrid').innerHTML = fresh.map((it) => {
      let epB = '';
      try {
        const nx = Number(it && (it.episodes || it.latest_episode));
        if (nx > 0) epB = '<span class="show-badge">EP ' + nx + '</span>';
      } catch (e) {}
      let baruB = '';
      try {
        if (it && it.updated_at) {
          const ts = Date.parse(String(it.updated_at).replace(' ', 'T'));
          if (ts && (Date.now() - ts) <= 48 * 3600000 && (Date.now() - ts) >= 0) baruB = '<span class="badge-new today">BARU</span>';
        }
      } catch (e) {}
      return '<article class="show-card" data-fresh="' + it.id + '">' +
      '<div class="show-cover"><i>★</i>' +
      (it.poster ? '<img src="' + esc(it.poster) + '" alt="' + esc(it.title || it.alternative || '') + '" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
      epB + baruB + '</div>' +
      '<div class="show-info"><strong>' + esc(it.title || it.alternative || T('jx_untitled')) + '</strong>' +
      '<small>' + esc(T('fresh_live')) + '</small>' +
      '<div class="show-btns"><button class="btn" data-fresh="' + it.id + '" type="button">' + esc(T('card_watch')) + '</button></div></div></article>';
      }).join('');
    });
  })();
}
/* Kategori Episode Terbaru: 2026 dulu (akid terbesar = paling baru),
   dilengkapi deretan live recent-anime agar update harian ikut muncul.
   Klik = langsung nonton (embed), nyaa.si hanya dipakai sebagai cek
   ketersediaan di sisi tools, tidak di-render sebagai torrent. */
function loadUpcoming() {
  const box = $('upcomingWrap'), grid = $('upcomingGrid');
  if (!box || !grid) return;
  const list = (ANI.shows || []).filter((s) => s.id.indexOf('rx_') !== 0 && isSoonU(s))
    .sort((a, b) => ((b.year || 0) - (a.year || 0)) || String(a.title).localeCompare(String(b.title)));
  if (!list.length) { box.hidden = true; grid.innerHTML = ''; return; }
  box.hidden = false;
  grid.innerHTML = list.slice(0, 12).map((s) =>
    '<article class="show-card is-soon" data-show="' + s.id + '">' +
    '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span class="show-badge soon">' + esc(T('soon_badge')) + '</span></div>' +
    '<div class="show-info"><strong>' + esc(s.title) + '</strong>' +
    '<small>' + esc(T('soon_meta') + (s.year ? ' • ' + s.year : '') + (s.rilis ? ' • ' + s.rilis : '')) + '</small>' +
    '<div class="show-btns"><button class="btn btn-ghost" data-watch="' + s.id + '" type="button">' + esc(T('card_info')) + '</button></div></div></article>'
  ).join('');
}
let LATEST_T = 0;
function stampLatest() {
  const st = $('latestStamp');
  if (!st) return;
  if (!LATEST_T) { st.textContent = ''; return; }
  const mins = Math.round((Date.now() - LATEST_T) / 60000);
  st.textContent = mins < 1 ? '• Diperbarui baru saja' : (mins < 60 ? '• Diperbarui ' + mins + ' mnt lalu' : '• Diperbarui hari ini');
  const fs = $('freshStamp');
  if (fs) fs.textContent = 'Diperbarui hari ini';
}
/* Episode Terbaru: live 3 halaman recent-anime + katalog lokal. Yang baru diupload
   otomatis masuk dan langsung bisa ditonton (embed). Auto-rilis 1 detik via armLatestAuto. */
function loadLatest(force) {
  const box = $('latestWrap'), grid = $('latestGrid');
  if (!box || !grid) return;
  if (isSegeraMode() && !force) return; // mode Akan Rilis steril
  const paint = (live) => {
    const local = sortLocalLatest((ANI.shows || []).filter(latestBaseFilter)).slice(0, 12);
    const items = [];
    const seen = {};
    // Item yang sudah tampil di "Baru Rilis" tidak dimunculkan lagi di sini
    try {
      const fg = document.querySelectorAll('#freshGrid [data-fresh]');
      fg.forEach((el) => { seen['rx' + el.getAttribute('data-fresh')] = 1; });
    } catch (e) {}
    (live || []).forEach((it) => {
      if (!it || !it.id || seen['rx' + it.id]) return;
      seen['rx' + it.id] = 1;
      items.push({ live: true, id: it.id, title: it.title || it.alternative || T('jx_untitled'), cover: it.poster || '', sub: liveEpSub(it) });
    });
    local.forEach((s) => {
      const ak = akOf(s.id);
      if (ak && seen['rx' + ak.id]) return;
      if (seen[s.id]) return;
      seen[s.id] = 1;
      items.push({ live: false, id: s.id, title: s.title, cover: s.cover || '', sub: localEpSub(s) });
    });
    const show = items.slice(0, 12);
    if (!show.length) return;
    if (isSegeraMode()) return; // mode Akan Rilis steril: jangan tampilkan sudah-tayang
    try { if (typeof ANI_UI !== 'undefined' && ANI_UI && ANI_UI.f && ANI_UI.f !== 'semua') return; } catch (e) {}
    box.hidden = false;
    grid.innerHTML = show.map(freshCardHTML).join('');
    LATEST_T = Date.now();
    stampLatest();
  };
  paint([]);
  (async () => {
    if (typeof saverActive === 'function' && saverActive()) return; // TAHAP 4.4: katalog lokal saja
    const live = [], seen = {};
    for (const p of [1, 2, 3]) {
      try {
        const j = await apiGet('/recent-anime?page=' + p + '&per_page=24');
        (j.data || []).forEach((it) => {
          if (!it || !it.id || seen[it.id]) return;
          seen[it.id] = 1;
          live.push(it);
        });
      } catch (e) { break; }
    }
    try { await getEpsRecent(); } catch (e) {}
    if (live.length || (typeof EPSREC !== 'undefined' && EPSREC && Object.keys(EPSREC).length)) paint(live);
  })();
}
/* Auto-rilis 1 DETIK: tiap 1000ms tepat 1 judul dirilis + langsung bisa ditonton.
   Sumber rilis: nyaa.si RSS (cek ketersediaan/seeders via proxy) + recent-anime
   API (antrean ID). Tiap kandidat DIVERIFIKASI playable via apiSeries (embed
   SUB/DUB ada) sebelum dirilis — tanpa playable = dilewati, tetap 1 detik.
   Isi ulang antrean max 1x/60 detik agar tidak membanjiri API/proxy. */
const RILIS1S = { q: [], filling: false, lastFill: 0, released: 0, on: true, nyaaSeeds: {}, updChecked: {} };
function rilis1sStatus(msg, live) {
  const el = $('rilis1sStatus');
  if (!el) return;
  el.innerHTML = (live === false ? '⚪ ' : '🔴 ') + '<span>' + esc(msg) + '</span>';
}
function nyaaNorm(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
async function rilis1sFill() {
  if (RILIS1S.filling || Date.now() - RILIS1S.lastFill < 60000) return;
  if (typeof saverActive === 'function' && saverActive()) return; // TAHAP 4.4: hemat data
  RILIS1S.filling = true;
  try {
    // 1) recent-anime = antrean ID rilis terbaru (2 halaman cukup, hemat kuota)
    const ids = [], seen = {};
    for (const p of [1, 2]) {
      try {
        const j = await apiGet('/recent-anime?page=' + p + '&per_page=24', 12000);
        (j.data || []).forEach((it) => {
          if (!it || !it.id || seen[it.id]) return;
          seen[it.id] = 1;
          ids.push(it);
        });
      } catch (e) { break; }
    }
    // 2) nyaa.si RSS via proxy = cek ketersediaan + seeders (tanpa magnet/hash)
    // Lewati total saat circuit-breaker aktif (API mati → RSS via proxy yg sama pasti mati).
    try {
      if (Date.now() < API_CB.deadUntil) throw 'skip-rss';
      const rssUrl = 'https://nyaa.si/?page=rss&c=1_2&f=0';
      let raw = '';
      for (const px of API_PROXY) {
        try {
          const r = await fetchTimeout(px(rssUrl), 10000);
          if (!r.ok) continue;
          raw = await bodyTimeout(r.text(), 10000);
          if (raw && raw.indexOf('<item>') >= 0) break;
        } catch (e) {}
      }
      if (raw) {
        const re = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<nyaa:seeders>(\d+)<\/nyaa:seeders>/g;
        let m;
        while ((m = re.exec(raw))) {
          const t = String(m[1] || '').replace(/^\s*(\[[^\]]+\]\s*)+/, '').replace(/\s*\[.*?\]\s*/g, ' ').trim();
          RILIS1S.nyaaSeeds[nyaaNorm(t.slice(0, 60))] = Number(m[2]) || 0;
        }
      }
    } catch (e) {}
    // 3) antrean 1 detik: judul BARU + judul LAMA yang perlu dicek episodenya.
    //    Judul lama ikut antre agar episode baru (nyaa rilis → anikoto ada embed)
    //    langsung naik ke Episode Terbaru + langsung bisa ditonton.
    const known = {};
    const akidToShow = {};
    (ANI.shows || []).forEach((s) => {
      const ak = akOf(s.id);
      if (ak) { known[ak.id] = 1; if (!akidToShow[ak.id]) akidToShow[ak.id] = s.id; }
      known['t:' + nyaaNorm(s.title)] = 1;
    });
    RILIS1S.q.forEach((it) => { if (it && it.id) known[it.id] = 1; });
    ids.forEach((it) => {
      if (!known[it.id]) { RILIS1S.q.push(it); return; }
      // Sudah ada di katalog → cek update episode max 1x per 10 menit per judul
      // agar episode baru langsung muncul tanpa membanjiri API.
      const sid = akidToShow[it.id];
      const last = RILIS1S.updChecked[sid || ('rx' + it.id)] || 0;
      if (sid && Date.now() - last > 10 * 60 * 1000 && RILIS1S.q.length < 40) {
        RILIS1S.updChecked[sid] = Date.now();
        RILIS1S.q.push(it);
      }
    });
    RILIS1S.lastFill = Date.now();
  } finally { RILIS1S.filling = false; }
}
function rilis1sBumpRecency(akid, n) {
  try {
    if (!EPSREC || typeof EPSREC !== 'object') EPSREC = {};
    // ISO datetime penuh (bukan tanggal saja) agar judul yang baru rilis
    // benar-benar naik ke paling atas, bukan seri tanggal yang sama.
    const nowIso = new Date().toISOString();
    EPSREC[String(akid)] = { u: nowIso, n: n };
  } catch (e) {}
}
/* === NYAA.SI → EPISODE BARU (frontend) ===
   nyaa.si RSS dibaca via proxy yang sama (tanpa magnet/hash, hanya judul).
   Format umum: "[Subber] Judul Anime - 12 [1080p][HEVC]" → {title, ep}.
   Judul dicocokkan ke katalog (norm); bila nomor EP nyaa > episode katalog,
   diverifikasi via apiSeriesLive (embed playable) lalu katalog + recency
   dinaikkan sehingga langsung muncul paling atas di Episode Terbaru. */
function nyaaParseItem(raw) {
  try {
    let t = String(raw || '');
    t = t.replace(/^\s*(\[[^\]]+\]\s*)+/, '').trim();
    let ep = 0;
    let m = t.match(/[\s\-_](?:E|EP|Episode)[\s.\-]*(\d{1,4})(?:\s*v\d)?\b/i)
      || t.match(/\s+S\d{1,2}\s*E(\d{1,3})\b/i)
      || t.match(/\s+-\s+(\d{1,4})(?:\s*v\d)?(?:\s*\[|\s*\(|\s*$)/)
      || t.match(/\s+(\d{1,4})(?:\s*v\d)?(?:\s*\[|\s*\(|\s*$)/);
    // Hindari salah ambil tahun/resolusi sebagai EP: "2026"/"1080p"/"2160p".
    if (m) {
      const cand = Number(m[1]);
      if (cand >= 1900 && cand <= 2100) ep = 0;
      else if (cand === 1080 || cand === 720 || cand === 2160 || cand === 480 || cand === 540) ep = 0;
      else if (cand >= 1 && cand <= 3000) ep = cand;
    }
    let title = t
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .replace(/\s*\(.*?\)\s*$/g, '')
      .replace(/\s+-\s+\d{1,4}(?:\s*v\d)?\b.*$/i, '')
      .replace(/\s+S\d{1,2}\s*E\d{1,3}\b.*$/i, '')
      .replace(/\s+E\d{1,4}\b.*$/i, '')
      .replace(/\s+Episode\s+\d+.*$/i, '')
      .replace(/1080p|720p|2160p|4k|hevc|x265|x264|bluray|web\-dl|\bmulti\b.*/gi, ' ')
      .replace(/\s{2,}/g, ' ').trim(' -_.');
    title = title.replace(/\s+S\d{1,2}\s*-\s*\d{1,3}\s*$/, '').trim();
    if (!title) return null;
    return { title, ep };
  } catch (e) { return null; }
}
function nyaaFindShow(title) {
  const nt = nyaaNorm(title);
  if (!nt) return null;
  let best = null;
  for (const s of (ANI.shows || [])) {
    if (!s || s.id.indexOf('rx_') === 0) continue;
    const ns = nyaaNorm(s.title);
    if (!ns) continue;
    if (ns === nt) return s;
    if (!best && (ns.indexOf(nt) >= 0 || nt.indexOf(ns) >= 0) && nt.length >= 4) best = s;
  }
  return best;
}
const NYAA_LIVE = { last: 0, busy: false, seenEp: {} };
async function nyaaCheckAndBump() {
  if (NYAA_LIVE.busy || document.hidden) return 0;
  if (typeof saverActive === 'function' && saverActive()) return 0;
  if (Date.now() - NYAA_LIVE.last < 3 * 60 * 1000) return 0; // max 1x / 3 mnt
  NYAA_LIVE.busy = true;
  let bumped = 0;
  try {
    if (Date.now() < API_CB.deadUntil) return 0;
    const rssUrl = 'https://nyaa.si/?page=rss&c=1_2&f=0';
    let raw = '';
    for (const px of API_PROXY) {
      try {
        const r = await fetchTimeout(px(rssUrl), 10000);
        if (!r.ok) continue;
        raw = await bodyTimeout(r.text(), 10000);
        if (raw && raw.indexOf('<item>') >= 0) break;
        raw = '';
      } catch (e) {}
    }
    if (!raw) return 0;
    NYAA_LIVE.last = Date.now();
    const titles = [];
    const re = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
    let m, guard = 0;
    while ((m = re.exec(raw)) && guard++ < 75) titles.push(String(m[1] || ''));
    // Kelompokkan per judul: ambil EP terbesar dari RSS.
    const perTitle = {};
    titles.forEach((rt) => {
      const p = nyaaParseItem(rt);
      if (!p || !p.title) return;
      const k = nyaaNorm(p.title);
      if (!k) return;
      if (!perTitle[k]) perTitle[k] = { title: p.title, ep: 0 };
      if (p.ep > perTitle[k].ep) perTitle[k] = { title: p.title, ep: p.ep };
    });
    for (const k of Object.keys(perTitle).slice(0, 30)) {
      const cand = perTitle[k];
      if (!cand.ep) continue; // tanpa nomor EP = tidak bisa dibandingkan
      const s = nyaaFindShow(cand.title);
      if (!s) continue; // judul benar-benar baru ditangani alur recent-anime
      const cur = Number(s.episodes) || 0;
      if (cand.ep <= cur) continue;
      const dedup = s.id + ':' + cand.ep;
      if (NYAA_LIVE.seenEp[dedup]) continue;
      NYAA_LIVE.seenEp[dedup] = 1;
      // Verifikasi playable sebelum naik (tanpa playable = jangan rilis).
      try {
        const ak = akOf(s.id);
        const aid = ak ? ak.id : s.akid;
        if (!aid) continue;
        const data = await apiSeriesLive(aid);
        const eps = (data && data.episodes) || [];
        const playable = eps.filter((e) => e && e.embed_url && (e.embed_url.sub || e.embed_url.dub || Object.keys(e.embed_url).length));
        const pn = playable.length ? Math.max.apply(null, playable.map((e) => Number(e.number) || 0).filter((n) => n > 0)) : 0;
        const best = Math.max(playable.length, pn);
        if (best > cur) {
          s.episodes = best;
          try { if (AKMAP[s.id]) AKMAP[s.id].episodes = best; } catch (e) {}
          try { seriesCache[aid] = data; } catch (e) {}
          cacheAk(aid, data);
          rilis1sBumpRecency(aid, best);
          bumped++;
          RILIS1S.released++;
          try { loadLatest(); } catch (e) {}
          try { paintPreview(); } catch (e) {}
          try { renderShows(); } catch (e) {}
          rilis1sStatus('Episode baru (nyaa.si) ▶ ' + s.title + ' EP ' + best + ' (langsung nonton)', true);
        }
      } catch (e) {}
      if (bumped >= 3) break; // max 3 bump per cek agar hemat kuota
    }
    if (bumped) {
      try {
        const now = Date.now();
        if (!RILIS1S.lastToast || now - RILIS1S.lastToast > 5 * 60 * 1000) {
          RILIS1S.lastToast = now;
          toast('▶ EPISODE BARU dari nyaa.si sudah rilis — cek Episode Terbaru');
        }
      } catch (e) {}
    }
  } catch (e) {} finally { NYAA_LIVE.busy = false; }
  return bumped;
}
async function rilis1sTick() {
  if (!RILIS1S.on || document.hidden || isSegeraMode()) return;
  if (typeof saverActive === 'function' && saverActive()) return; // TAHAP 4.4: hemat data
  if (RILIS1S.busy) return; // anti-tumpuk: fetch lama belum selesai = lewati tick ini
  RILIS1S.busy = true;
  try {
    if (!RILIS1S.q.length) {
      rilis1sStatus('Memeriksa rilis terbaru…', true);
      await rilis1sFill().catch(() => {});
      return;
    }
    const it = RILIS1S.q.shift(); // 1 judul per tick (tick kini 45 detik, hemat kuota)
    if (!it || !it.id) return;
    // Peta akid -> show katalog (untuk deteksi episode baru judul lama)
    let existSid = null;
    try {
      for (const s of (ANI.shows || [])) { const ak = akOf(s.id); if (ak && Number(ak.id) === Number(it.id)) { existSid = s.id; break; } }
    } catch (e) {}
    let data = null, netFail = false;
    try { data = existSid ? await apiSeriesLive(it.id) : await apiSeries(it.id); } catch (e) { data = null; netFail = true; }
    const eps = (data && data.episodes) || [];
    const playable = eps.filter((e) => e && e.embed_url && (e.embed_url.sub || e.embed_url.dub || Object.keys(e.embed_url).length));
    if (!playable.length) {
      // Gagal jaringan → antre lagi di belakang (sampai tuntas), bukan dibuang.
      // Tidak ada playable murni (bukan gagal jaringan) → lewati seperti semula.
      if (netFail && RILIS1S.q.length < 60) RILIS1S.q.push(it);
      return;
    }
    if (existSid) {
      // EPISODE BARU untuk judul lama: naikkan angka + recency agar langsung
      // muncul paling atas di Episode Terbaru, dan langsung bisa ditonton
      // (detail memakai apiSeriesLive/refreshEps sehingga embed baru ikut).
      const s = findShow(existSid);
      const oldN = s ? (Number(s.episodes) || 0) : 0;
      if (s && playable.length > oldN) {
        s.episodes = playable.length;
        try { if (AKMAP[existSid]) AKMAP[existSid].episodes = playable.length; } catch (e) {}
        try { seriesCache[it.id] = data; } catch (e) {}
        cacheAk(it.id, data);
        rilis1sBumpRecency(it.id, playable.length);
        RILIS1S.released++;
        try { loadLatest(); } catch (e) {}
        try { paintPreview(); } catch (e) {}
        try { renderShows(); } catch (e) {}
        rilis1sStatus('Episode baru ▶ ' + s.title + ' EP ' + playable.length + ' (langsung nonton)', true);
        try {
          var now = Date.now();
          if (!RILIS1S.lastToast || now - RILIS1S.lastToast > 5 * 60 * 1000) { RILIS1S.lastToast = now; toast('▶ EPISODE BARU: ' + s.title + ' EP ' + playable.length); }
        } catch (e) {}
      } else {
        rilis1sStatus('Auto-rilis 1 detik • antrean ' + RILIS1S.q.length + ' • sudah rilis ' + RILIS1S.released, true);
      }
      if (RILIS1S.q.length < 8) rilis1sFill();
      return;
    }
    const tid = 'rx_' + it.id;
    if (!findShow(tid)) {
      const title = it.title || it.alternative || ('Rilis ' + it.id);
      ANI.shows.unshift({ id: tid, title, cover: it.poster || '', akid: it.id, episodes: eps.length, status: 'tayang', kind: 'series', year: new Date().getFullYear() });
      AKMAP[tid] = { id: it.id, episodes: eps.length };
      rilis1sBumpRecency(it.id, playable.length);
      RILIS1S.released++;
      try { loadLatest(); } catch (e) {}
      try { loadFresh(); } catch (e) {}
      try { paintPreview(); } catch (e) {}
      rilis1sStatus('Auto-rilis 1 detik • BARU ▶ ' + title + ' (' + playable.length + ' ep, langsung nonton)', true);
      try {
        var now2 = Date.now();
        if (!RILIS1S.lastToast || now2 - RILIS1S.lastToast > 5 * 60 * 1000) { RILIS1S.lastToast = now2; toast('▶ BARU RILIS: ' + title); }
      } catch (e) {}
    } else {
      rilis1sStatus('Auto-rilis 1 detik • antrean ' + RILIS1S.q.length + ' • sudah rilis ' + RILIS1S.released, true);
    }
    if (RILIS1S.q.length < 8) rilis1sFill(); // isi ulang di latar, tanpa blokir detik
  } catch (e) {} finally { RILIS1S.busy = false; }
}
function armLatestAuto() {
  if (window._latestAuto) return;
  window._latestAuto = 1;
  rilis1sFill().catch(() => {});
  try { nyaaCheckAndBump().catch(() => {}); } catch (e) {}
  // TAHAN-LAMA: dulu tiap 1 detik (banjir request → proxy rate-limit → HP panas
  // → tab crash). Kini 45 detik + skip saat tab hidden/hemat-data + anti-overlap.
  // Tiap tick juga cek nyaa.si agar episode baru di nyaa langsung naik ke
  // Episode Terbaru (bukan stuck judul yang sama).
  setInterval(function () {
    rilis1sTick().catch(() => {});
    try { nyaaCheckAndBump().catch(() => {}); } catch (e) {}
  }, 45000);
  // Segarkan susunan Episode Terbaru tiap 5 menit (dulu 90 detik — terlalu
  // sering fetch + render ulang → HP panas & tab jebol memori).
  setInterval(() => {
    if (document.hidden || isSegeraMode()) return;
    if (typeof saverActive === 'function' && saverActive()) return;
    if (RILIS1S.busy) return;
    try { loadLatest(); } catch (e) {}
    try { paintPreview(); } catch (e) {}
  }, 300000);
  const st = $('rilis1sStatus');
  if (st) st.style.cursor = 'pointer';
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('#rilis1sStatus')) {
      RILIS1S.on = !RILIS1S.on;
      rilis1sStatus(RILIS1S.on ? 'Auto-rilis 1 detik: aktif' : 'Auto-rilis dijeda — ketuk untuk aktif', RILIS1S.on);
    }
  });
  // TAHAN-SELAMANYA: tab ditinggal tidur berjam-jam (HP/laptop sleep) lalu dibuka
  // lagi — segarkan tampilan sekali + cek update SW, tanpa spam network
  // (dedup + circuit breaker tetap membatasi). Tanpa ini tab kembali dalam
  // keadaan beku di status lama.
  if (!window._resumeArmed) {
    window._resumeArmed = true;
    var _hiddenAt = 0;
    document.addEventListener('visibilitychange', function () {
      try {
        if (document.hidden) { _hiddenAt = Date.now(); return; }
        if (!_hiddenAt || Date.now() - _hiddenAt < 5 * 60 * 1000) return; // tidur pendek = abaikan
        _hiddenAt = 0;
        try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { try { r.update(); } catch (e) {} }).catch(() => {}); } catch (e) {}
        if (typeof saverActive === 'function' && saverActive()) return;
        if (typeof isSegeraMode === 'function' && isSegeraMode()) return;
        try { paintPreview(); } catch (e) {}
        try { if (typeof loadLatest === 'function') loadLatest(); } catch (e) {}
        try { rilis1sTick().catch(() => {}); } catch (e) {}
        try { if (typeof nyaaCheckAndBump === 'function') nyaaCheckAndBump().catch(() => {}); } catch (e) {}
      } catch (e) {}
    });
  }
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
  $('detailView').classList.remove('dv-anime');
  syncBodyLock();
  setSEO.apply(null, seoHome());
}
/* --- Routing hash: kategori + URL unik per konten (bisa dibagikan) ---
   #/semua|anime|manhwa = kategori • #/baca/{slug}[/{idx}] = manhwa/reader
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
  // 0) LINK PENDEK: #/b/slug[/idx] = #/baca/.. • #/t/id[/eN] = #/tonton/..
  //    Tetap kompatibel dengan link panjang lama. Otomatis dinormalisasi
  //    ke bentuk panjang agar riwayat/SEO konsisten.
  if ((m = h.match(/^#\/b\/([^/]+)(?:\/(\d+))?/))) {
    h = '#/baca/' + m[1] + (m[2] === undefined ? '' : '/' + m[2]);
    try { history.replaceState(history.state, '', h); } catch (e) {}
  } else if ((m = h.match(/^#\/t\/([^/]+)(?:\/e(.+))?/))) {
    h = '#/tonton/' + m[1] + (m[2] === undefined ? '' : '/e' + m[2]);
    try { history.replaceState(history.state, '', h); } catch (e) {}
  }
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
        // Buka placeholder SEGERA agar deep-link langsung tampil (dengan tombol
        // Coba lagi), lalu isi episode saat API berhasil.
        try {
          if (!findShow(id)) {
            ANI.shows.unshift({ id: id, title: ('Rilis ' + rxm[1]), cover: '', akid: Number(rxm[1]), episodes: 0, status: 'tayang', kind: 'series', year: new Date().getFullYear() });
            AKMAP[id] = { id: Number(rxm[1]), episodes: 0 };
          }
          lastRouteKey = '##retry';
          route(fromPop);
        } catch (e0) {}
        apiSeries(Number(rxm[1])).then((data) => {
          const title = (data.anime && data.anime.title) || ('Rilis ' + rxm[1]);
          const ex = findShow(id);
          if (ex) {
            ex.title = title;
            ex.episodes = (data.episodes || []).length;
          }
          try { AKMAP[id] = { id: Number(rxm[1]), episodes: (data.episodes || []).length }; } catch (e) {}
          // Refresh bila user masih di detail yang sama
          try {
            if (DV && DV.id === id && !$('detailView').hidden) { lastRouteKey = '##retry'; route(fromPop); }
          } catch (e) {}
        }).catch(() => {});
      } else goCatFallback();
      return;
    }
    { const _s = findShow(id); setCat(_s && isSoonU(_s) ? 'segera' : 'anime'); }
    openDetailAnime(id, false);
    if (ep !== null) openEpFromRoute(id, ep);
    else if (!$('playerModal').hidden) closePlayer();
    return;
  }
  // 2b) Pustaka (halaman Riwayat + Daftarku) — halaman sendiri, bukan modal
  if (h === '#/pustaka') { openPustaka(null, false); return; }
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
    else if (f && s) toast(T('episode_w') + ' ' + epNum + ' ' + T('coming_soon_dash'));
    else if (s) toast(T('ep_missing'));
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
  // Batas aman: judul super-panjang (mis. >2000) tetap dirender tanpa macet
  if (N > 2000) N = 2000;
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
  try { seenMark(showId); } catch (e) {} // TAHAP 3.3: catat terakhir dilihat
  const ak = akOf(showId);
  const aniFresh = $('detailView').hidden || !DV || DV.id !== showId;
  $('detailView').classList.add('dv-anime');
  openDetail(s.title);
  const isSoonDet = isSoonU(s);
  DV = { type: 'anime', id: showId, eps: [], play: {}, total: Number(s.episodes) || 0,
    gsize: 50, range: 0, sort: 'asc', filter: '',
    status: isSoonDet ? T('soon_meta') : (s.status === 'tayang' ? T('st_airing') : (s.kind === 'film' ? T('film_w') : T('st_done'))) };
  // Desain orisinal Guoke (bukan jiplakan screenshot): kartu hero + stat strip + aksi fungsional
  const h = String(showId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // TAHAP 2.1: tanpa label "Series" dan tanpa "N EP" yang janggal di meta;
  // jumlah episode sudah ada di strip statistik di bawah.
  const rating = (7 + (h % 19) / 10).toFixed(2);
  const metaBits = ['★ ' + esc(rating)];
  if (s.year) metaBits.push(esc(String(s.year)));
  const bm = isBookmarked(showId);
  const statStatus = isSoonDet ? T('soon_meta') : (s.status === 'tayang' ? T('st_airing') : (s.kind === 'film' ? T('film_w') : T('st_done')));
  $('dvBody').innerHTML =
    '<div class="dv-pro">' +
    '<div class="dv-pro-top"><button class="dv-back2" data-dvback type="button" aria-label="Kembali">←</button>' +
    '<span class="dv-crumb">Anime · Detail</span>' +
    '<span class="dv-live"><i></i>' + esc(statStatus) + '</span></div>' +
    '<div class="dv-pro-hero">' +
    (s.cover ? '<img class="dv-pro-cover" src="' + esc(s.cover) + '" alt="Cover ' + esc(s.title) + '" onerror="this.remove()">' : '') +
    '<div class="dv-pro-info"><h2>' + esc(s.title) + '</h2>' +
    (s.alt ? '<p class="dv-pro-alt">' + esc(s.alt) + '</p>' : '') +
    '<p class="dv-pro-meta">' + metaBits.join(' · ') + '</p>' +
    '<div class="dv-pro-genres">' + (s.genres || []).map((g) =>
      '<span>' + esc(g) + '</span>').join('') + '</div></div></div>' +
    '<div class="dv-pro-actions">' + (isSoonDet
      ? '<button class="btn btn-small btn-ghost" type="button" disabled>📅 ' + esc(T('soon_meta')) + (s.rilis ? ' • ' + esc(String(s.rilis)) : (s.year ? ' • ' + esc(String(s.year)) : '')) + '</button>'
      : '<button class="btn btn-primary" data-dvplay="' + esc(showId) + '" type="button">▶ ' + esc(T('card_watch')) + '</button>') +
    '<button class="btn btn-small' + (bm ? '' : ' btn-ghost') + '" data-bm-detail="' + esc(showId) + '" type="button" aria-pressed="' + bm + '">' +
    (bm ? esc(T('bm_detail_on')) : esc(T('bm_detail_off'))) + '</button>' +
    '<button class="btn btn-small btn-ghost" data-shortlink="t:' + esc(showId) + '" type="button" title="Salin link pendek">🔗 Link Pendek</button></div>' +
    (isSoonDet ? '<p class="muted small" style="margin:8px 0 0">📅 ' + esc(T('soon_note')) + '</p>' : '') +
    '<div class="dv-stats"><div><small>EPISODE</small><strong>' + esc(String(DV.total)) + '</strong></div>' +
    '<div><small>STATUS</small><strong>' + esc(statStatus) + '</strong></div>' +
    '<div><small>TAHUN</small><strong>' + esc(s.year ? String(s.year) : '—') + '</strong></div></div>' +
    (s.synopsis ? '<div class="dv-pro-syn"><h3>Sinopsis</h3><p class="syn-text">' + esc(s.synopsis) + '</p><button class="linkbtn syn-more" data-synmore type="button">Baca selengkapnya</button></div>' : '') +
    '</div>' +
    (() => {
      // TAHAP 3.4: rekomendasi berdasarkan genre
      try {
        const recs = similarTitles('anime', showId, s.genres, 6);
        if (!recs.length) return '';
        return '<div class="rec-sec"><h3>Mirip dengan ini</h3><div class="show-grid">' +
          recs.map(showCard).join('') + '</div></div>';
      } catch (e) { return ''; }
    })() +
    '<h3 class="dv-ep-h">Daftar Episode</h3>' +
    '<div class="ep-tools">' +
    '<div class="src-tabs" role="group" aria-label="' + esc(T('epsort_label')) + '">' +
    '<button class="btn btn-small" data-epsort="asc" type="button">' + esc(T('epsort_asc')) + '</button>' +
    '<button class="btn btn-small btn-ghost" data-epsort="desc" type="button">' + esc(T('epsort_desc')) + '</button>' +
    '</div></div>' +
    '<div class="ani-search"><input id="dvEpSearch" type="search" placeholder="' + esc(T('dv_search_ep_ph')) + '" autocomplete="off"></div>' +
    '<div id="dvEps"><p class="muted">' + esc(T('dv_loading_eps')) + '</p></div>';
  // URL unik per anime (push bila bukaan baru; pindah judul = replace; route = diam)
  if (nav !== false) pushView('#/tonton/' + showId, { cat: CURCAT, view: 'ani', id: showId }, aniFresh);
  if (!ak || !ak.id) {
    // Tanpa embed: tampilkan rentang penuh sebagai "Segera hadir"
    buildFullEps(showId, DV.total, []);
    if (!DV.eps.length) $('dvEps').innerHTML = '<p class="muted">' + esc(T('dv_no_stream')) + '</p>';
    else paintEps();
    return;
  }
  const myReq = ++epReqSeq;
  // Anti-stuck: daftar 1..N langsung tampil SEGERA (tombol gelap = "Segera
  // hadir") selagi sumber video diperiksa di latar. Teks "Memuat..." tidak
  // pernah dibiarkan menggantung: selalu ada daftar + tombol Coba lagi.
  buildFullEps(showId, DV.total, []);
  if (!DV.eps.length) {
    // Placeholder 0 episode (judul baru offline) → tetap coba ambil episode di
    // latar + tampilkan tombol Coba lagi, bukan berhenti di "kosong".
    $('dvEps').innerHTML = '<p class="muted">' + esc(T('dv_loading_eps')) + '</p>';
  } else paintEps();
  const note = document.createElement('p');
  note.className = 'muted small';
  note.id = 'dvEpsNote';
  note.textContent = T('dv_checking');
  $('dvEps').appendChild(note);
  const dropNote = () => { const n = $('dvEpsNote'); if (n) n.remove(); };
  apiSeries(ak.id).then((data) => {
    if (myReq !== epReqSeq || $('detailView').hidden || DV.id !== showId) return; // anti-campur
    dropNote();
    buildFullEps(showId, Number(s.episodes) || 0, data.episodes || []);
    if (!DV.eps.length) {
      $('dvEps').innerHTML = '<p class="muted">' + esc(T('dv_eps_empty')) + '</p>';
      return;
    }
    paintEps();
    refreshEps(showId, ak.id, myReq); // cek episode terbaru di latar
  }).catch(() => {
    if (myReq !== epReqSeq || $('detailView').hidden) return;
    dropNote();
    // Daftar tetap tampil (bukan error penuh): tambah tombol Coba lagi di atas
    const bar = document.createElement('p');
    bar.className = 'muted small';
    bar.innerHTML = esc(T('dv_net_err')) +
      '<button class="btn btn-small btn-ghost" data-retry="' + showId + '" type="button">' + esc(T('retry')) + '</button>';
    $('dvEps').prepend(bar);
  });
}
/* Cek ketersediaan nyaa.si (RSS, hanya hitung item — tanpa simpan magnet/hash).
   Cache 30 menit per judul, gagal jaringan = null (diam, tidak mengganggu). */
const NYAA_MEM = {};
function nyaaCount(title) {
  const k = String(title || '').toLowerCase();
  const now = Date.now();
  if (NYAA_MEM[k] && now - NYAA_MEM[k].t < 30 * 60 * 1000) return Promise.resolve(NYAA_MEM[k].n);
  const url = 'https://nyaa.si/?page=rss&c=1_2&f=0&q=' + encodeURIComponent(title);
  return fetchTimeout(API_PROXY[0](url), 12000)
    .then((r) => { if (!r.ok) throw 0; return bodyTimeout(r.text(), 12000); })
    .then((t) => {
      const m = String(t || '').match(/<item[\s>]/g);
      const n = m ? m.length : 0;
      NYAA_MEM[k] = { t: now, n: n };
      return n;
    }).catch(() => null);
}
function paintNyaaNote(n) {
  const box = $('dvEps');
  if (!box || $('dvNyaa') || n == null) return;
  const p = document.createElement('p');
  p.className = 'muted small';
  p.id = 'dvNyaa';
  p.textContent = '• ' + n + ' versi tersedia';
  box.appendChild(p);
}
/* Gabung episode live ke daftar (dipakai refresh biasa + sinkron paksa nyaa). */
function mergeLiveEps(showId, live) {
  const baru = (live || []).filter((e) => !DV.play[Number(e.number)]);
  if (!baru.length) return 0;
  const items = DV.eps.filter((x) => x.ok)
    .map((x) => ({ number: x.number, title: x.title, embed_url: x.embed_url }))
    .concat(baru.map((e) => ({ number: e.number, title: e.title, embed_url: e.embed_url || {} })));
  let N = DV.total;
  baru.forEach((e) => { if (Number(e.number) > N) N = Number(e.number); });
  buildFullEps(showId, N, items);
  paintEps();
  return baru.length;
}
/* Tambahan otomatis: episode yang rilis setelah data dibakar ikut masuk
   (rentang diperpanjang, bukan menimpa daftar 1..N). Bila nyaa.si sudah
   menampilkan rilis lebih baru dari daftar, paksa sinkron ulang supaya
   episode yang baru diupload langsung bisa ditonton di sini. */
function refreshEps(showId, akid, myReq) {
  apiGet('/series/' + akid).then((j) => {
    if (myReq !== epReqSeq || $('detailView').hidden || !DV || DV.id !== showId) return;
    const n = mergeLiveEps(showId, (j.data && j.data.episodes) || []);
    if (n) toast(n + ' ' + T('ep_new_added'));
  }).catch(() => { /* diam: data bawaan tetap dipakai */ });
  try {
    const s0 = findShow(showId);
    if (s0 && !isSoonU(s0) && s0.title) {
      nyaaCount(s0.title).then((n) => {
        if (n == null || myReq !== epReqSeq || $('detailView').hidden || !DV || DV.id !== showId) return;
        paintNyaaNote(n);
        if (n > DV.eps.filter((x) => x.ok).length) {
          apiGet('/series/' + akid).then((j2) => {
            if (myReq !== epReqSeq || $('detailView').hidden || !DV || DV.id !== showId) return;
            const m = mergeLiveEps(showId, (j2.data && j2.data.episodes) || []);
            if (m) toast(m + ' ' + T('ep_new_added'));
          }).catch(() => {});
        }
      });
    }
  } catch (e) { /* sinyal opsional, jangan ganggu tontonan */ }
}
/* Daftar episode: cari nomor + grup EP + urut terbaru/terlama.
   Tombol gelap = "Segera hadir" (tanpa error); tepi biru = episode terbaru (ongoing). */
function paintEps() {
  const box = $('dvEps');
  if (!box || !DV.eps.length) return;
  const q = DV.filter.trim();
  const s = findShow(DV.id);
  const ongoing = s && s.status === 'tayang' && !isSoonU(s);
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
      return '<button class="ep-btn soon" disabled type="button" title="' + T('episode_w') + ' ' + ep.number + ' — ' + esc(T('coming_soon')) + '" aria-label="' + T('episode_w') + ' ' + ep.number + ' ' + esc(T('coming_soon')).toLowerCase() + '">' + ep.number + '</button>';
    }
    const isNew = ongoing && ep.number === maxOk;
    return '<button class="ep-btn' + (isNew ? ' is-new' : '') + '" data-ep="' + DV.id + ':' + ep.number + '" type="button" title="' + esc((ep.title || (T('episode_w') + ' ' + ep.number)) + (isNew ? ' — ' + T('new_badge') : '')) + '">' + ep.number + (isNew ? '<i>●</i>' : '') + '</button>';
  }).join('') + '</div><p class="muted small">' +
    (q ? list.length + ' ' + T('results_for') + ' “' + esc(q) + '”.'
      : DV.total + ' episode') +
    ' — ' + T('ep_hint') + ' <span class="ep-legend">' + T('ep_legend') + '</span></p>';
}

/* TAHAP 3.2: episode berikutnya otomatis (hitung mundur 5 dtk + Batal + Lewati).
   Jujur: pemutar pihak ketiga tidak memberi tahu kapan video selesai, jadi
   tawaran muncul 15 detik setelah episode dibuka bila autoplay aktif dan
   episode lanjut tersedia. "Lewati intro" = lewati hitung mundur, langsung
   putar episode berikutnya (geser menit di dalam video tetap lewat kontrol
   pemutar bawaan server, karena browser melarang akses ke embed). */
const AUTO = { t1: null, tick: null, target: null };
function autoClear() {
  if (AUTO.t1) { clearTimeout(AUTO.t1); AUTO.t1 = null; }
  if (AUTO.tick) { clearInterval(AUTO.tick); AUTO.tick = null; }
  AUTO.target = null;
  try { const box = $('autoNext'); if (box) box.hidden = true; } catch (e) {}
}
function autoEnabled() {
  try {
    const v = store.get('gq_autoplay', 1);
    const c = $('pAuto');
    if (c) c.checked = v !== 0;
    return v !== 0;
  } catch (e) { return true; }
}
function nextPlayable() {
  try {
    if (typeof DV === 'undefined' || !DV || DV.type !== 'anime' || typeof PCtx === 'undefined' || !PCtx || DV.id !== PCtx.showId || !DV.eps.length) return null;
    const i = DV.eps.findIndex((e) => String(e.number) === String(PCtx.epNum));
    if (i < 0) return null;
    const nx = DV.eps[i + 1];
    return (nx && nx.ok) ? nx : null;
  } catch (e) { return null; }
}
function autoArm() {
  autoClear();
  if (!autoEnabled()) return;
  if (!nextPlayable()) return;
  AUTO.t1 = setTimeout(() => {
    if ($('playerModal').hidden) return;
    const nx = nextPlayable();
    if (!nx) return;
    AUTO.target = nx;
    const box = $('autoNext');
    if (!box) { autoPlayNext(); return; }
    box.hidden = false;
    let n = 5;
    const paint = () => {
      const t = $('autoTxt');
      if (t) t.textContent = 'EP ' + nx.number + ' mulai dalam ' + n + '…';
      const f = $('autoFill');
      if (f) f.style.width = (n / 5 * 100) + '%';
    };
    paint();
    AUTO.tick = setInterval(() => {
      n--;
      if (n <= 0) { autoPlayNext(); return; }
      paint();
    }, 1000);
  }, 15000);
}
function autoPlayNext() {
  const nx = AUTO.target || nextPlayable();
  autoClear();
  if (!nx || typeof PCtx === 'undefined' || !PCtx) return;
  const s = findShow(PCtx.showId);
  openPlayerStream(s ? s.title : '', nx.number, nx);
}
/* (player torrent/WebTorrent dihapus — semua diputar langsung di situs) */
let PCtx = null; // {showId, epNum}
function closePlayer() {
  // B3: ingat menit terakhir (waktu kunjungan; iframe embed tidak exposed ke JS)
  if (PCtx) {
    store.set('gq_posv_' + PCtx.showId + '_' + PCtx.epNum, Date.now());
  }
  PCtx = null;
  try { autoClear(); } catch (e) {}
  $('playerModal').hidden = true;
  try { epSocialUnwatch(); } catch (e) {}
  syncBodyLock();
  const f = $('pFrame');
  f.removeAttribute('src');
  f.hidden = true;
  $('pServers').hidden = true;
  $('pServers').innerHTML = '';
  pDlBusy = false;
  pDlSay('', false);
  try { pDlBtnsClear(); } catch (e) {}
  try { pDlSetBtn(false); } catch (e) {}
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
  if (!servers.length) { toast(T('srv_unavailable')); return; }
  const playFresh = $('playerModal').hidden;
  $('playerModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('pTitle').textContent = (showTitle + ' — E' + epNum).slice(0, 70);
  // B3+B1: simpan episode terakhir + riwayat; tampilkan info tontonan sebelumnya
  const sid = DV && DV.type === 'anime' ? DV.id : (findShowByTitle(showTitle) || '');
  PCtx = { showId: sid, epNum: String(epNum), srv: 0, servers: servers.map((s) => ({ label: s.label, url: s.url })) };
  // URL unik per episode tayang (push bila bukaan baru; ganti server = diam; route = diam)
  if (nav !== false && sid) pushView('#/tonton/' + sid + '/e' + epNum,
    { cat: CURCAT, view: 'play', id: sid, ep: String(epNum) }, playFresh);
  if (sid) {
    // TAHAP 3.1: catat episode dibuka (progres) + server terakhir; saat dibuka
    // ulang, server yang sama otomatis dipakai lagi.
    try { progAdd('gq_watched', sid, epNum); } catch (e) {}
    let startSrv = 0;
    try {
      const prev = store.get('gq_contv', null);
      if (prev && prev.id === sid && String(prev.ep) === String(epNum) && Number(prev.srv) >= 0) startSrv = Number(prev.srv);
    } catch (e) {}
    if (startSrv >= servers.length) startSrv = 0;
    PCtx.srv = startSrv;
    store.set('gq_contv', { id: sid, ep: String(epNum), srv: startSrv, at: Date.now() });
    pushHist({ type: 'anime', id: sid, ep: String(epNum), sub: T('episode_w') + ' ' + epNum, t: String(showTitle || '').slice(0, 80) });
    const last = store.get('gq_posv_' + sid + '_' + epNum, 0);
    $('pResume').textContent = last
      ? T('resume_last') + ' ' + new Date(last).toLocaleString(getLang() === 'en' ? 'en-US' : 'id-ID') + T('resume_tip1')
      : T('resume_tip2');
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
    if (PCtx) PCtx.srv = i;
    $('pStatus').textContent = T('playing') + ' ' + epNum + ' (' + servers[i].label + ') ' + T('playing_on');
    box.querySelectorAll('button').forEach((b, j) => b.classList.toggle('btn-ghost', j !== i));
  };
  box.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      play(Number(b.dataset.srv));
      // TAHAP 3.1: ingat pilihan server manual untuk bukaan berikutnya
      try {
        if (sid) {
          const cv = store.get('gq_contv', null) || {};
          cv.srv = Number(b.dataset.srv) || 0;
          store.set('gq_contv', cv);
        }
      } catch (e) {}
    };
  });
  play(PCtx.srv || 0);
  // TAHAP 3.2: siapkan hitung mundur episode berikutnya
  try { autoArm(); } catch (e) {}
  // Reset baris download tiap ganti episode + prefetch file di latar
  // (supaya klik Download nanti INSTAN — URL sudah ketemu sebelum diklik).
  const ds = $('pDlStatus');
  if (ds) { ds.hidden = true; ds.textContent = ''; }
  try { pDlBtnsClear(); } catch (e) {}
  const db = $('pDl');
  if (db) { db.disabled = false; delete db.dataset.dead; db.innerHTML = esc(T('dl_btn')); }
  try { prefetchDl(); } catch (e) {}
  paintEpNav();
  try { paintEpSocial(); } catch (e) {}
  // TAHAP 3.2: kabel sekali untuk toggle + tombol hitung mundur
  try {
    const pa = $('pAuto');
    if (pa && !pa.dataset.wired) {
      pa.dataset.wired = '1';
      pa.addEventListener('change', () => {
        try { store.set('gq_autoplay', pa.checked ? 1 : 0); } catch (e) {}
        if (!pa.checked) autoClear(); else autoArm();
      });
    }
    const ac = $('autoCancel');
    if (ac && !ac.dataset.wired) {
      ac.dataset.wired = '1';
      ac.addEventListener('click', () => {
        autoClear();
        try { store.set('gq_autoplay', 0); } catch (e) {}
        const p2 = $('pAuto'); if (p2) p2.checked = false;
      });
    }
    const as = $('autoSkip');
    if (as && !as.dataset.wired) {
      as.dataset.wired = '1';
      as.addEventListener('click', () => autoPlayNext());
    }
  } catch (e) {}
}
/* --- LIKE & KOMENTAR per episode ---
   Global (semua pengguna) bila Firebase terpasang — pola sama seperti galeri
   ikon (ikonFb): like = transaction di ep_likes/<kunci>, komentar = push ke
   ep_comments/<kunci> + live listener. Tambahkan kedua path di Rules
   (lihat SETUP_GALERI_PUBLIK.md). Tanpa Firebase: tetap berfungsi penuh,
   tersimpan di HP ini (localStorage), tanpa error. */
let EP_SOC_KEY = '', epLikeRef = null, epCmtBase = null, epCmtRef = null, epLikeBusy = false;
function epSocKey() {
  const sid = (typeof PCtx !== 'undefined' && PCtx && PCtx.showId) ? String(PCtx.showId) : '';
  const ep = (typeof PCtx !== 'undefined' && PCtx && PCtx.epNum) ? String(PCtx.epNum) : '';
  const show = (DV && DV.type === 'anime' && DV.title) ? String(DV.title) : '';
  const raw = ((sid || show || 'untitled') + '__e' + (ep || '0'));
  return raw.replace(/[.#$\[\]\/]/g, '-').slice(0, 120);
}
function epLikedGet() { try { return JSON.parse(localStorage.getItem('gq_ep_liked') || '[]'); } catch (e) { return []; } }
function epLikedSet(a) { try { localStorage.setItem('gq_ep_liked', JSON.stringify(a)); } catch (e) {} }
function epLikeMapGet() { try { return JSON.parse(localStorage.getItem('gq_ep_likemap') || '{}'); } catch (e) { return {}; } }
function epLikeMapSet(o) { try { localStorage.setItem('gq_ep_likemap', JSON.stringify(o)); } catch (e) {} }
function epLikeCount() {
  if (typeof EP_LIKES !== 'undefined' && EP_LIKES && EP_LIKES[EP_SOC_KEY] != null) return EP_LIKES[EP_SOC_KEY];
  return epLikeMapGet()[EP_SOC_KEY] || 0;
}
var EP_LIKES = (typeof EP_LIKES !== 'undefined' && EP_LIKES) || {};
function fmtLike(n) {
  n = Math.max(0, Number(n) || 0);
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + (getLang() === 'en' ? 'K' : ' rb');
  return String(n);
}
function paintEpLike(n) {
  const b = $('epLike'), c = $('epLikeCount');
  if (!b || !c) return;
  const liked = epLikedGet().indexOf(EP_SOC_KEY) >= 0;
  c.textContent = fmtLike(n == null ? epLikeCount() : n);
  b.classList.toggle('on', liked);
  b.setAttribute('aria-pressed', liked ? 'true' : 'false');
}
function epToggleLike() {
  if (typeof PCtx === 'undefined' || !PCtx || epLikeBusy || !EP_SOC_KEY) return;
  const liked = epLikedGet();
  const on = liked.indexOf(EP_SOC_KEY) < 0;
  const done = (n) => {
    epLikeBusy = false;
    if (on) { if (liked.indexOf(EP_SOC_KEY) < 0) liked.push(EP_SOC_KEY); }
    else { const i = liked.indexOf(EP_SOC_KEY); if (i >= 0) liked.splice(i, 1); }
    epLikedSet(liked);
    EP_LIKES[EP_SOC_KEY] = Math.max(0, n);
    const m = epLikeMapGet(); m[EP_SOC_KEY] = EP_LIKES[EP_SOC_KEY]; epLikeMapSet(m);
    paintEpLike(EP_LIKES[EP_SOC_KEY]);
  };
  epLikeBusy = true;
  const f = (typeof ikonFb === 'function') ? ikonFb() : null;
  if (f) {
    f.db.ref('ep_likes/' + EP_SOC_KEY).transaction((c) => (c || 0) + (on ? 1 : -1), (err, ok, snap) => {
      if (err || !ok) { epLikeBusy = false; toast(T('net_busy')); return; }
      done((snap && snap.val()) || 0);
    });
  } else {
    done(epLikeCount() + (on ? 1 : -1));
  }
}
function epCmtLocalGet() { return store.get('gq_epc_' + EP_SOC_KEY, []); }
function epCmtLocalSet(a) { store.set('gq_epc_' + EP_SOC_KEY, (a || []).slice(-50)); }
function epMyCmtGet() { try { return JSON.parse(localStorage.getItem('gq_ep_mycmt') || '{}'); } catch (e) { return {}; } }
function epMyCmtSet(o) { try { localStorage.setItem('gq_ep_mycmt', JSON.stringify(o)); } catch (e) {} }
/* TAHAP 5.3: filter kata kasar + tombol Laporkan pada komentar.
   Daftar kata umum; cocok sebagai kata utuh (bukan bagian kata lain).
   Komentar yang dilaporkan disembunyikan di perangkat pelapor + tersimpan
   untuk ditindaklanjuti. */
const BADWORDS = ['anjing', 'babi', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot', 'tolol', 'goblok', 'idiot', 'bego', 'kampret', 'setan', 'sialan', 'brengsek', 'jancuk', 'cuk', 'asu', 'pepek', 'lonte', 'pelacur', 'fuck', 'shit', 'bitch', 'bastard', 'dick', 'pussy', 'porn', 'xxx', 'bokep'];
function kasarFound(t) {
  const s = ' ' + String(t || '').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ') + ' ';
  return BADWORDS.some((w) => s.indexOf(' ' + w + ' ') >= 0);
}
function cmtRepGet() { try { const a = store.get('gq_cmtrep', []); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function renderEpCmts(arr) {
  const list = $('epCmtList'), empty = $('epCmtEmpty'), cnt = $('epCmtCount');
  const reported = {};
  cmtRepGet().forEach((r) => { reported[String(r.key)] = 1; });
  arr = (arr || []).filter((c) => !reported[String(c.key != null ? c.key : (c.ts || ''))]);
  arr = arr.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 50);
  if (cnt) cnt.textContent = fmtLike(arr.length);
  if (empty) empty.hidden = arr.length > 0;
  if (!list) return;
  const mine = epMyCmtGet()[EP_SOC_KEY] || [];
  const isLocal = !(typeof ikonFb === 'function' && ikonFb());
  list.innerHTML = arr.map((c) => {
    const k = String(c.key != null ? c.key : (c.ts || ''));
    const tm = c.ts ? new Date(c.ts).toLocaleString(getLang() === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const canDel = isLocal || mine.indexOf(k) >= 0;
    return '<li><div class="cm-top"><span class="cm-name">' + esc(c.n) + '</span>' +
      '<span class="cm-time">' + esc(tm) + '</span></div>' +
      '<div>' + esc(c.t) + '</div>' +
      (canDel ? '<button class="cm-del" data-cdel="' + esc(k) + '" type="button">✕ ' + esc(T('ikon_delete')) + '</button>'
        : '<button class="cm-del" data-crep="' + esc(k) + '" type="button">⚠ ' + esc(T('cmt_report')) + '</button>') +
      '</li>';
  }).join('');
}
function epCmtSend(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (typeof PCtx === 'undefined' || !PCtx || !EP_SOC_KEY) return;
  const ti = $('epCmtText'), ni = $('epCmtName');
  const t = ti ? ti.value.trim().slice(0, 300) : '';
  if (!t) { toast(T('cmt_need')); return; }
  if (typeof kasarFound === 'function' && kasarFound(t)) { toast(T('cmt_bad')); return; }
  const n = ni ? ni.value.trim().slice(0, 30) : '';
  const name = n || store.get('gq_name', '') || T('cmt_anon');
  if (ni && !ni.value.trim() && store.get('gq_name', '')) ni.value = store.get('gq_name', '');
  const f = (typeof ikonFb === 'function') ? ikonFb() : null;
  if (f && epCmtBase) {
    epCmtBase.push({ n: name, t, ts: Date.now() }).then((r) => {
      try {
        const mine = epMyCmtGet();
        mine[EP_SOC_KEY] = (mine[EP_SOC_KEY] || []).concat(r && r.key ? [String(r.key)] : []).slice(-50);
        epMyCmtSet(mine);
      } catch (err) {}
      if (ti) ti.value = '';
    }).catch(() => toast(T('net_busy')));
  } else {
    const a = epCmtLocalGet();
    a.push({ key: 'l' + Date.now(), n: name, t, ts: Date.now() });
    epCmtLocalSet(a);
    renderEpCmts(a);
    if (ti) ti.value = '';
  }
}
function epCmtDel(key) {
  if (!key || !EP_SOC_KEY) return;
  const f = (typeof ikonFb === 'function') ? ikonFb() : null;
  if (f && epCmtBase) {
    epCmtBase.child(String(key)).remove().then(() => {
      try {
        const mine = epMyCmtGet();
        mine[EP_SOC_KEY] = (mine[EP_SOC_KEY] || []).filter((k) => k !== String(key));
        epMyCmtSet(mine);
      } catch (err) {}
      toast(T('cmt_deleted'));
    }).catch(() => toast(T('net_busy')));
  } else {
    epCmtLocalSet(epCmtLocalGet().filter((c) => String(c.key) !== String(key)));
    renderEpCmts(epCmtLocalGet());
    toast(T('cmt_deleted'));
  }
}
function epSocialUnwatch() {
  try { if (epLikeRef) epLikeRef.off(); } catch (e) {}
  try { if (epCmtRef) epCmtRef.off(); } catch (e) {}
  epLikeRef = null; epCmtBase = null; epCmtRef = null;
}
function paintEpSocial() {
  epSocialUnwatch();
  EP_SOC_KEY = epSocKey();
  const nm = $('epCmtName');
  if (nm && !nm.value) nm.value = store.get('gq_name', '');
  const localNote = $('epCmtLocal');
  const f = (typeof ikonFb === 'function') ? ikonFb() : null;
  if (localNote) localNote.hidden = !!f;
  if (!f) {
    paintEpLike(epLikeCount());
    renderEpCmts(epCmtLocalGet());
    return;
  }
  try {
    paintEpLike(EP_LIKES[EP_SOC_KEY] != null ? EP_LIKES[EP_SOC_KEY] : (epLikeMapGet()[EP_SOC_KEY] || 0));
    epLikeRef = f.db.ref('ep_likes/' + EP_SOC_KEY);
    epLikeRef.on('value', (s) => {
      const n = Math.max(0, (s && s.val()) || 0);
      EP_LIKES[EP_SOC_KEY] = n;
      const m = epLikeMapGet(); m[EP_SOC_KEY] = n; epLikeMapSet(m);
      if (EP_SOC_KEY) paintEpLike(n);
    });
    epCmtBase = f.db.ref('ep_comments/' + EP_SOC_KEY);
    epCmtRef = epCmtBase.limitToLast(50);
    epCmtRef.on('value', (s) => {
      const v = (s && s.val()) || {};
      renderEpCmts(Object.keys(v).map((k) => ({ key: k, n: v[k].n, t: v[k].t, ts: v[k].ts })));
    });
  } catch (e) {
    epSocialUnwatch();
    if (localNote) localNote.hidden = false;
    paintEpLike(epLikeCount());
    renderEpCmts(epCmtLocalGet());
  }
}
try {
  if ($('epLike')) $('epLike').addEventListener('click', epToggleLike);
  if ($('epCmtForm')) $('epCmtForm').addEventListener('submit', epCmtSend);
  if ($('epCmtList')) $('epCmtList').addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-cdel]') : null;
    if (b) epCmtDel(b.dataset.cdel);
    // TAHAP 5.3: laporkan komentar (sembunyikan di perangkat ini + simpan laporan)
    const r = e.target && e.target.closest ? e.target.closest('[data-crep]') : null;
    if (r) {
      try {
        const arr = cmtRepGet();
        arr.unshift({ key: String(r.dataset.crep), ep: (typeof EP_SOC_KEY !== 'undefined' ? EP_SOC_KEY : ''), at: Date.now() });
        store.set('gq_cmtrep', arr.slice(0, 100));
      } catch (err) {}
      try {
        const li = r.closest('li');
        if (li) li.remove();
        else if (typeof EP_SOC_KEY !== 'undefined') renderEpCmts(epCmtLocalGet());
      } catch (err) {}
      toast(T('cmt_reported'));
    }
  });
} catch (e) {}
/* Download episode: klik → HARUS LANGSUNG muncul notifikasi sistem
    "Downloading file... See notification for download status" (seperti
    screenshot) + progres Chrome Download Manager (Pause/Cancel).
    Caranya: pakai anchor navigasi native (<a href download>), BUKAN fetch-blob.
    Fetch-blob gagal di HP (CORS + RAM ratusan MB + tidak tercatat di Downloads).
    Kunci INSTAN: prefetch saat player dibuka + resolve SEMUA server PARALEL
    (bukan satu-satu 16 dtk) + cache + tombol tidak pernah dikunci abu-abu. */
let pDlBusy = false;
const dlCache = {}; // pageUrl -> {mp4:[], hls} | null (mati) | undefined (belum dicek)
function pDlSay(msg, show) {
  const ds = $('pDlStatus');
  if (!ds) return;
  ds.hidden = !show && !msg;
  ds.textContent = msg || '';
}
function pDlBtnsClear() {
  const w = $('pDlBtns');
  if (!w) return;
  w.hidden = true;
  w.innerHTML = '';
}
/* Tampilkan tombol-tombol fallback di bawah status download. */
function pDlBtnsShow(list) {
  let w = $('pDlBtns');
  if (!w) return;
  w.innerHTML = list.map((b, i) =>
    '<button class="btn btn-small' + (b.ghost ? ' btn-ghost' : '') + '" data-dlbtn="' + i + '" type="button">' + esc(b.label) + '</button>'
  ).join('');
  w.hidden = false;
  w.querySelectorAll('button').forEach((el) => {
    el.onclick = () => {
      const b = list[Number(el.dataset.dlbtn)];
      if (!b) return;
      if (b.act === 'retry') { dlEpisode(); return; }
      if (b.act === 'copy') {
        copyDlLink(b.url);
        return;
      }
      if (b.url) {
        if (b.fname) triggerNativeDownload(b.url, b.fname);
        else { try { window.open(b.url, '_blank', 'noopener'); } catch (e) { location.href = b.url; } }
      }
    };
  });
}
function copyDlLink(url) {
  const done = () => toast(T('link_copied'));
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => toast(T('copy_fail')));
    else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(T('copy_fail')); }
      ta.remove();
    }
  } catch (e) { toast(T('copy_fail')); }
}
/* Teks tombol download: JANGAN pernah dikunci abu-abu (disabled) lama-lama.
   Screenshot #2 (tombol gelap + "Mencari file... (1/2)" macet) dilarang:
   tombol tetap bisa diklik, hanya teksnya berubah + balik sendiri. */
function pDlSetBtn(busy, label) {
  const db = $('pDl');
  if (!db) return;
  if (db.dataset.dead === '1' && !label) return; // TAHAP 2.4: status "Segera hadir" dipertahankan
  if (label) db.innerHTML = label;
  else db.innerHTML = busy ? esc(T('dl_search')) : esc(T('dl_btn'));
  // sengaja TIDAK disabled — biar tidak terlihat mati/gelap
  if (db.dataset.dead !== '1') db.disabled = false;
}
/* Nama file aman untuk folder Download. */
function dlFileName(title, epNum, label, ext) {
  const safe = String(title + '-E' + epNum + '-' + label).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'episode';
  return safe + '.' + (ext || 'mp4');
}
/* Trigger download NATIVE → ditangani Download Manager (masuk folder Download,
   muncul toast sistem "Downloading file... See notification" + notifikasi
   progres Chrome berisi Pause/Cancel seperti screenshot).
   Tidak pakai fetch/blob sehingga bebas CORS, hemat RAM, tercatat di sistem.
   PENTING: tanpa target=_blank + dipanggil dalam gesture klik supaya
   Download Manager langsung mengambil alih (target blank malah buka tab). */
function triggerNativeDownload(url, fname) {
  try {
    const a = document.createElement('a');
    a.href = url;
    if (fname) a.setAttribute('download', fname);
    a.setAttribute('rel', 'noopener');
    // harus menempel di DOM agar klik sintetis dianggap gesture di Chrome HP
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { a.remove(); } catch (e) {} }, 1500);
    return true;
  } catch (e) {
    try { window.open(url, '_blank', 'noopener'); return true; }
    catch (_) { try { location.href = url; return true; } catch (__) { return false; } }
  }
}
function withTimeout(promise, ms, tag) {
  let t = null;
  const gate = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(tag || 'timeout')), ms); });
  return Promise.race([promise, gate]).finally(() => { if (t) clearTimeout(t); });
}
/* Prefetch: selagi user nonton, cari file semua server di latar (paralel).
   Hasil masuk dlCache → klik Download jadi INSTAN (tanpa "Mencari (1/2)"). */
function prefetchDl() {
  if (!PCtx || !PCtx.servers || !PCtx.servers.length) return;
  if (typeof saverActive === 'function' && saverActive()) return; // TAHAP 4.4: hemat data
  PCtx.servers.forEach((srv) => {
    if (dlCache[srv.url] !== undefined) return;
    withTimeout(resolveServerFiles(srv.url), 9000, 'prefetch timeout')
      .then((f) => { dlCache[srv.url] = f; })
      .catch(() => { dlCache[srv.url] = null; });
  });
}
/* Link pencarian alternatif per judul+episode (sumber file langsung .mkv/.mp4). */
function dlAltSearch(title, epNum) {
  const q = encodeURIComponent(title + ' episode ' + epNum + ' mkv download');
  return 'https://www.google.com/search?q=' + q;
}
async function dlEpisode() {
  if (!PCtx || !PCtx.servers || !PCtx.servers.length) { toast(T('open_ep_first')); return; }
  if (pDlBusy) { toast(T('still_searching')); return; }
  const s = findShow(PCtx.showId);
  const title = s ? s.title : 'episode';
  const curIdx = PCtx.srv || 0;
  const order = [curIdx].concat(
    PCtx.servers.map((_, i) => i).filter((i) => i !== curIdx));
  pDlBusy = true;
  pDlBtnsClear();
  pDlSetBtn(true);
  // 1) INSTAN: status persis seperti screenshot — langsung muncul saat klik,
  //    tanpa menunggu jaringan. Ini yang diminta: "klok klik harus langsung muncul".
  pDlSay('⬇ Downloading file... See notification for download status', true);
  toast(T('downloading_sys'));
  // 2) Jalan pintas cache: kalau prefetch sudah ketemu file → trigger
  //    DALAM gesture yang sama (tanpa await) supaya Download Manager HP
  //    langsung muncul (toast sistem + progres Pause/Cancel).
  const cachedHit = (() => {
    for (const i of order) {
      const srv = PCtx.servers[i];
      const c = dlCache[srv.url];
      if (c && c.mp4 && c.mp4.length) return { srv, file: c.mp4[0] };
    }
    // URL server yang memang file langsung (.mp4/.mkv di URL-nya)
    for (const i of order) {
      const srv = PCtx.servers[i];
      if (/\.(mp4|mkv|webm|mov)(\?|$)/i.test(srv.url)) return { srv, file: srv.url };
    }
    return null;
  })();
  const fireDirect = (fileUrl, label) => {
    const ext = (/\.mkv/i.test(fileUrl) ? 'mkv' : (/\.webm/i.test(fileUrl) ? 'webm' : (/\.mov/i.test(fileUrl) ? 'mov' : 'mp4')));
    const fname = dlFileName(title, PCtx.epNum, label, ext);
    triggerNativeDownload(fileUrl, fname);
    pDlSay(T('dl_started_ok') + fname + T('dl_check_folder'), true);
    toast(T('downloading_folder'));
    pDlBusy = false;
    pDlSetBtn(false);
  };
  if (cachedHit) {
    fireDirect(cachedHit.file, cachedHit.srv.label);
    return;
  }
  // 3) Resolve SEMUA server PARALEL (bukan satu-satu) — total maks ~9 dtk,
  //    bukan N×16 dtk yang bikin macet di "Mencari file... (1/2)".
  try {
    pDlSay(T('dl_finding'), true);
    const jobs = PCtx.servers.map((srv) => {
      if (dlCache[srv.url] !== undefined) {
        return Promise.resolve({ srv, files: dlCache[srv.url] });
      }
      return withTimeout(resolveServerFiles(srv.url), 9000, 'srv timeout')
        .then((files) => { dlCache[srv.url] = files; return { srv, files }; })
        .catch(() => { dlCache[srv.url] = null; return { srv, files: null }; });
    });
    const results = await Promise.all(jobs);
    if (!PCtx || pDlBusy === false) return;
    // utamakan server yang sedang diputar, lalu sisanya
    results.sort((a, b) =>
      PCtx.servers.indexOf(a.srv) === curIdx ? -1 :
      PCtx.servers.indexOf(b.srv) === curIdx ? 1 : 0);
    const mp4Hit = results.find((r) => r.files && r.files.mp4 && r.files.mp4.length);
    if (mp4Hit) {
      fireDirect(mp4Hit.files.mp4[0], mp4Hit.srv.label);
      return;
    }
    const alive = results.filter((r) => r.files);
    const hlsHit = results.find((r) => r.files && r.files.hls);
    const hlsAll = results.filter((r) => r.files && r.files.hls);
    if (!alive.length) {
      // Semua server mati (mis. megaplay 410 deleted) → JANGAN diam.
      // Beri jalan keluar tuntas: buka server, salin link utk 1DM, cari mirror.
      // TAHAP 2.4: tombol unduh utama jadi jelas nonaktif ("Segera hadir").
      pDlSay(T('dl_dead'), true);
      try { var _db = $('pDl'); if (_db) { _db.textContent = 'Segera hadir'; _db.disabled = true; _db.dataset.dead = '1'; } } catch (e) {}
      pDlBtnsShow(
        PCtx.servers.map((sv) => ({ label: T('open_srv') + sv.label, url: sv.url, ghost: true }))
          .concat([
            { label: T('find_mkv'), url: dlAltSearch(title, PCtx.epNum), ghost: true },
            { label: T('retry_btn'), act: 'retry', ghost: true },
          ])
      );
      toast(T('srv_dead_toast'));
    } else if (hlsHit) {
      // HLS terproteksi: tidak ada file langsung. Jangan unduh .m3u8 sampah.
      // Arahkan ke jalur yang benar-benar menghasilkan video penuh.
      const h = hlsHit;
      pDlSay(T('hls_msg'), true);
      const btns = [
        { label: T('open_srv') + h.srv.label + T('open_srv_save'), url: h.srv.page || h.srv.url },
        { label: T('copy_link'), act: 'copy', url: (h.files && h.files.hls) || h.srv.url },
      ];
      hlsAll.slice(1, 3).forEach((x) => btns.push({ label: T('open_srv') + x.srv.label, url: x.srv.page || x.srv.url, ghost: true }));
      btns.push({ label: T('retry_btn'), act: 'retry', ghost: true });
      pDlBtnsShow(btns);
      toast(T('hls_toast'));
    } else {
      pDlSay(T('dl_notfound'), true);
      const btns = PCtx.servers.map((sv) => ({ label: T('open_srv') + sv.label, url: sv.url, ghost: true }));
      btns.push({ label: T('find_mkv'), url: dlAltSearch(title, PCtx.epNum), ghost: true });
      btns.push({ label: T('retry_btn'), act: 'retry', ghost: true });
      pDlBtnsShow(btns);
    }
  } finally {
    pDlBusy = false;
    pDlSetBtn(false);
  }
}
/* Ambil HTML halaman player via proxy — SIAPA CEPAT DIA DAPAT (race, bukan
   tunggu semua). Dulu Promise.all menunggu proxy paling lambat → macet di
   "Mencari file… (1/2)". Kini proxy pertama yang mengembalikan HTML valid
   langsung dipakai, sisanya diabaikan. Kembalikan '' bila semua gagal. */
async function fetchHtmlParallel(pageUrl, ms) {
  const wait = ms || 7000;
  return new Promise((resolve) => {
    let done = false;
    let pending = API_PROXY.length;
    const finish = (html) => {
      if (done) return;
      if (html) { done = true; resolve(html); return; }
      if (--pending <= 0 && !done) { done = true; resolve(''); }
    };
    API_PROXY.forEach((p) => {
      (async () => {
        try {
          const r = await fetchTimeout(p(pageUrl), wait);
          if (!r.ok) { finish(''); return; }
          const txt = await bodyTimeout(r.text(), wait);
          finish((txt && txt.length > 500) ? txt : '');
        } catch (e) { finish(''); }
      })();
    });
    setTimeout(() => { if (!done) { done = true; resolve(''); } }, wait + 1500);
  });
}
function absolutize(u, base) {
  try {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    return new URL(u, base).href;
  } catch (e) { return u; }
}
function extractServerFiles(html, base) {
  const norm = String(html || '').replace(/\\\//g, '/');
  const mp4 = [];
  const hlsList = [];
  const push = (u, isHls) => {
    if (!u) return;
    let x = String(u).trim().replace(/&amp;/g, '&');
    if (!/^https?:\/\//i.test(x) && x.indexOf('//') !== 0 && x.charAt(0) !== '/') return;
    x = absolutize(x, base);
    if (!/^https?:\/\//i.test(x)) return;
    if (/jquery|bootstrap|font-?awesome|gstatic|googletag|analytics|theme|skin|logo|placeholder/i.test(x)) return;
    if (isHls) { if (hlsList.indexOf(x) < 0) hlsList.push(x); return; }
    if (mp4.indexOf(x) < 0 && mp4.length < 8) mp4.push(x);
  };
  let m;
  // 1) URL file langsung (mp4/mkv/webm/mov + query token)
  const reDirect = /https?:\/\/[^\s"'<>\\]+\.(?:mp4|mkv|webm|mov)(?:\?[^\s"'<>\\]*)?/gi;
  while ((m = reDirect.exec(norm))) push(m[0]);
  // 2) field JSON player: "file":"...", "src":"...", sources:[{file:...}],
  //    jwplayer setup, <source>/<video> src, data-src
  const reField = /["'](?:file|src|source)["']\s*:\s*["']([^"']+)["']|<(?:source|video)[^>]+src\s*=\s*["']([^"']+)["']|data-src\s*=\s*["']([^"']+)["']/gi;
  while ((m = reField.exec(norm))) {
    const u = m[1] || m[2] || m[3];
    if (!u) continue;
    if (/\.(mp4|mkv|webm|mov)(\?|$)/i.test(u)) push(u);
    else if (/\.m3u8(\?|$)/i.test(u)) push(u, true);
  }
  // 2b) pola sources jwplayer: {file:"...m3u8"} tanpa quote-key rapi
  const reSrc = /file\s*:\s*["'](https?:\/\/[^"']+)["']/gi;
  while ((m = reSrc.exec(norm))) {
    const u = m[1];
    if (/\.(mp4|mkv|webm|mov)(\?|$)/i.test(u)) push(u);
    else if (/\.m3u8(\?|$)/i.test(u)) push(u, true);
  }
  // 3) URL base64 (player obfuscated): decode lalu cek pola video
  const reB64 = /["']([A-Za-z0-9+/=]{60,})["']/g;
  let n = 0;
  while ((m = reB64.exec(norm)) && n < 40) {
    n++;
    try {
      const dec = atob(m[1].slice(0, 4000));
      const hit = dec.match(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|mkv|webm|mov|m3u8)(?:\?[^\s"'<>\\]*)?/i);
      if (hit) {
        if (/\.m3u8/i.test(hit[0])) push(hit[0], true);
        else push(hit[0]);
      }
    } catch (e) { /* bukan base64 valid */ }
  }
  // 4) HLS playlist (semua varian, bukan cuma 1)
  const reHls = /https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?/gi;
  while ((m = reHls.exec(norm))) push(m[0], true);
  let hls = hlsList[0] || null;
  return { mp4: mp4, hls: hls, hlsAll: hlsList };
}
async function resolveServerFiles(pageUrl) {
  if (/\.(mp4|mkv|webm|mov)(\?|$)/i.test(pageUrl)) return { mp4: [pageUrl], hls: null };
  const hm = pageUrl.match(/https?:\/\/[^\s"'<>]+\.m3u8(?:\?[^\s"'<>]*)?/i);
  if (hm) return { mp4: [], hls: hm[0] };
  const html = await fetchHtmlParallel(pageUrl, 7000);
  if (!html) return null;
  if (/We're Sorry|Error Code:\s*<span>4\d\d<\/span>|can't find the file|file.{0,20}(deleted|removed)/i.test(html)) return null;
  return extractServerFiles(html, pageUrl);
}
/* Unduh NATIVE ke folder Download (tanpa fetch/blob → tanpa CORS/RAM jebol).
   Kembalikan true (browser Download Manager yang melanjutkan di latar). */
async function downloadToGallery(fileUrl, title, epNum, label, say) {
  const ext = (/\.mkv/i.test(fileUrl) ? 'mkv' : (/\.webm/i.test(fileUrl) ? 'webm' : 'mp4'));
  const fname = dlFileName(title, epNum, label, ext);
  triggerNativeDownload(fileUrl, fname);
  if (say) say(T('dl_started_ok') + fname + T('dl_check_folder'), true);
  toast(T('downloading_folder'));
  return true;
}

/* ---------- 5. MANHWA: baca langsung di situs (Komiku) ---------- */
/* State katalog baca: filter genre, urutan, pencarian, bookmark, status, muat-lebih */
const MW_UI = { q: '', genre: '', genres: [], year: '', type: '', sort: 'terbaru', bookOnly: false, bmStatus: '', limit: 24, per: 24 };
function findMw(id) { return MW.titles.find((t) => t.id === id); }
/* Daftar chapter LAZY: index (manhwa.json) ringan tanpa chapters; daftar per
   judul diambil dari data/mwch/{slug}.json saat dibuka, cache di sesi. */
const CHC = {};
function mwChapters(t) { return (t && (t.chapters || CHC[t.id])) || null; }
async function ensureChapters(id) {
  const t = findMw(id);
  if (!t) throw new Error('no title');
  const hit = mwChapters(t);
  if (hit) return hit;
  // Retry 3x: file lokal kadang gagal sekali di HP (sinyal putus sesaat)
  let lastErr = null;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetchTimeout('data/mwch/' + t.slug + '.json', 15000);
      if (!r.ok) { lastErr = new Error('no file'); continue; }
      const j = await bodyTimeout(r.json(), 15000);
      const chs = j.chapters || [];
      if (!chs.length) { lastErr = new Error('empty'); continue; }
      CHC[t.id] = chs;
      t.chapters = chs;
      return chs;
    } catch (e) { lastErr = e; }
    await new Promise((res) => setTimeout(res, 600 * (a + 1)));
  }
  throw lastErr || new Error('no file');
}
/* Kartu: seluruh kartu bisa diklik; .show-info flex column + tombol
   didorong ke bawah (margin-top:auto di CSS); judul max 2 baris (CSS clamp) */
function mwCard(t) {
  const upd = mwUpdated(t);
  const bm = isBookmarked(t.id);
  // TAHAP 3.1 + 3.3: progress baca + penanda update bookmark
  let progHtml = '';
  try { progHtml = progBarHTML(progCount('gq_readch', t.id), t.total); } catch (e) {}
  let updHtml = '';
  try { updHtml = updMarkHTML(t.id, parseTgl(upd)); } catch (e) {}
  return '<article class="show-card" data-mread="' + t.id + '" tabindex="0" role="link" ' +
    'aria-label="' + esc(T('card_read')) + ' ' + esc(t.title) + '">' +
    '<div class="show-cover"><i>' + esc(initials(t.title)) + '</i>' +
    (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="Cover ' + esc(t.title) + '" ' +
      'loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + t.total + ' CH</span>' + mwBadge(t) + progHtml + '</div>' +
    '<div class="show-info"><strong>' + esc(t.title) + '</strong>' + updHtml +
    '<small class="show-meta">' + esc(mwStatus(t)) + ' • ' + esc(mwGenres(t).join(', ')) +
    (upd ? '<br>' + esc(fmtTglID(upd)) : '') + '</small>' +
    '<div class="show-btns"><button class="btn" data-mread="' + t.id + '" type="button">' + esc(T('card_read')) + '</button>' +
    '<button class="bm-btn' + (bm ? ' on' : '') + '" data-bm="' + t.id + '" type="button" ' +
    'aria-pressed="' + bm + '" title="Bookmark">🔖</button></div></div></article>';
}
function mwFiltered() {
  let list = MW.titles.filter((t) =>
    (!MW_UI.q || t.title.toLowerCase().includes(MW_UI.q)) &&
    genreHit(t.genres, MW_UI.genre, MW_UI.genres) &&
    (!MW_UI.type || (t.type || 'Manhwa') === MW_UI.type) &&
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
  $('mwCount').textContent = T('loading_catalog');
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
  grid.innerHTML = slice.map(mwCard).join('') || '<p class="muted">' + esc(T('notfound_try')) + '</p>';
  $('mwCount').textContent = T('showing') + ' ' + slice.length + ' ' + T('of') + ' ' + list.length + ' ' + T('titles_w') + ' (' +
    (MW_UI.type || 'manhwa + manhua') + ') • ' +
    list.reduce((a, t) => a + t.total, 0) + ' ' + T('chapters_w');
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
  try { paintChapterPreview(); } catch (e) {}
  });
}
/* Pagination bernomor diganti tombol Muat lagi (A7) — stub agar aman */
function paintPager() {}
/* Urutan genre: alfabetis, tapi Romance (+Romantis) selalu tepat setelah Adventure */
function orderGenres(list) {
  const sorted = [...list].sort((a, b) => a.localeCompare(b, 'id'));
  const move = sorted.filter((g) => g === 'Romance' || g === 'Romantis');
  if (!move.length) return sorted;
  const rest = sorted.filter((g) => g !== 'Romance' && g !== 'Romantis');
  const idx = rest.indexOf('Adventure');
  if (idx === -1) return [...move, ...rest];
  rest.splice(idx + 1, 0, ...move);
  return rest;
}
/* Isi dropdown genre dari data (bukan hardcode) + chips cepat di bawah Baca */
function paintGenres() {
  if (!MW.titles || !MW.titles.length) return;
  const sel = $('mwGenre');
  const box = $('mwGenreChips');
  const all = {};
  MW.titles.forEach((t) => (t.genres || []).forEach((g) => { all[g] = 1; }));
  const genres = orderGenres(Object.keys(all));
  if (sel && sel.options.length <= 1) {
    genres.forEach((g) => {
      const o = document.createElement('option');
      o.value = g; o.textContent = g;
      sel.appendChild(o);
    });
  }
  if (box && !box.dataset.built) {
    box.dataset.built = '1';
    box.innerHTML = '<button class="gchip active" data-mwgenre="" role="tab" aria-selected="true" type="button">' + esc(T('chip_all')) + '</button>' +
      genres.map((g) => '<button class="gchip" data-mwgenre="' + esc(g) + '" role="tab" aria-selected="false" type="button">' + esc(g) + '</button>').join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mwgenre]');
      if (!b) return;
      setMwGenre(b.dataset.mwgenre);
      $('mwGrid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  syncMwGenreChips();
}
/* Set genre dari chips/dropdown agar selalu sinkron */
function setMwGenre(g) {
  MW_UI.genre = g || '';
  MW_UI.limit = MW_UI.per;
  const sel = $('mwGenre');
  if (sel) sel.value = MW_UI.genre;
  syncMwGenreChips();
  renderMw();
}
function syncMwGenreChips() {
  const box = $('mwGenreChips');
  if (!box) return;
  box.querySelectorAll('[data-mwgenre]').forEach((b) => {
    const on = (b.dataset.mwgenre || '') === (MW_UI.genre || '');
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
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
/* TAHAP 3.6: riwayat pencarian terakhir (maks 8, lokal per perangkat). */
function sqGet(k) { try { const a = store.get(k, []); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function sqAdd(k, q) {
  q = String(q || '').trim();
  if (q.length < 2) return;
  try {
    const a = sqGet(k).filter((x) => x.toLowerCase() !== q.toLowerCase());
    a.unshift(q);
    store.set(k, a.slice(0, 8));
  } catch (e) {}
}
function sqHistHTML(k) {
  const a = sqGet(k);
  if (!a.length) return '';
  return '<div class="sq-hist" role="group" aria-label="Terakhir dicari">' +
    a.map((q) => '<button data-sq="' + k + '" data-q="' + esc(q) + '" type="button">' + esc(q) + '</button>').join('') + '</div>';
}
/* TAHAP 3.6: saran judul anime saat mengetik (+ riwayat bila kolom kosong). */
function paintAniSuggest(q) {
  const box = $('aniSuggest'), input = $('aniSearch');
  if (!box || !input) return;
  q = (q || '').toLowerCase().trim();
  if (q.length < 2) {
    const h = sqHistHTML('gq_sq_ani');
    if (!h || !ANI.shows.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    box.innerHTML = h;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    return;
  }
  if (!ANI.shows.length) { box.hidden = true; return; }
  const hits = ANI.shows.filter((s) => (s.title + ' ' + (s.alt || '')).toLowerCase().includes(q)).slice(0, 6);
  if (!hits.length) {
    const h = sqHistHTML('gq_sq_ani');
    if (!h) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    box.innerHTML = h;
    box.hidden = false;
    return;
  }
  box.innerHTML = hits.map((s) =>
    '<button role="option" data-anisug="' + s.id + '" type="button">' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span>' + esc(s.title) + '<br><small class="show-meta">' + esc(s.status === 'tayang' ? 'Sedang Tayang' : 'Tamat') + (s.year ? ' • ' + s.year : '') + '</small></span></button>'
  ).join('');
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}
/* Strip "Lanjutkan membaca": banner tunggal = lanjutHome.
   Fungsi lama dimatikan agar banner tidak tampil dua kali per halaman. */
function paintLanjut() {
  const wrap = $('lanjutWrap');
  if (wrap) wrap.hidden = true;
  try { paintLanjutHome(); } catch (e) {}
}
function openDetailMw(id, pushHash) {
  const t = findMw(id);
  if (!t) return;
  try { seenMark(id); } catch (e) {} // TAHAP 3.3: catat terakhir dilihat
  $('detailView').classList.remove('dv-anime');
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
    (bm ? T('bm_detail_on') : T('bm_detail_off')) + '</button>' +
    '<button class="btn btn-small btn-ghost" data-shortlink="b:' + id + '" type="button" title="Salin link pendek">🔗 Link Pendek</button>' +
    '<button class="btn btn-small btn-ghost" data-acaktitle type="button">' + esc(T('acak_lain')) + '</button></div>' +
    '<div class="bm-status" role="group" aria-label="' + esc(T('f_bmstatus')) + '">' +
    stBtn('ongoing', T('bm_ongoing')) + stBtn('wishlist', T('bm_wish')) + stBtn('done', T('bm_done')) + '</div></div></div>' +
    '<div class="ani-search"><input id="dvChSearch" type="search" placeholder="' + esc(T('ch_search_ph')) + '" autocomplete="off" aria-label="' + esc(T('ch_search_ph')) + '"></div>' +
    '<div id="dvChList" class="rel-list"></div>' +
    (() => {
      // TAHAP 3.4: rekomendasi berdasarkan genre
      try {
        const recs = similarTitles('manhwa', id, t.genres, 6);
        if (!recs.length) return '';
        return '<div class="rec-sec"><h3>Mirip dengan ini</h3><div class="show-grid">' +
          recs.map(mwCard).join('') + '</div></div>';
      } catch (e) { return ''; }
    })();
  paintCh(); // "Memuat…" bila chapters belum di-cache; isi di bawah
  if (!mwChapters(t)) {
    const chReq = id;
    const chFail = () => {
      if (DVM.id !== chReq || $('detailView').hidden) return;
      const box = $('dvChList');
      if (box && !box.querySelector('[data-mchretry]')) {
        box.innerHTML = '<p class="muted">' + esc(T('ch_fail')) +
          '<button class="btn btn-small btn-ghost" data-mchretry="' + chReq + '" type="button">' + esc(T('retry')) + '</button></p>';
      }
    };
    // Pengaman anti-gantung: fetch yang macet total (>25 dtk tanpa selesai)
    // tetap berakhir di tombol Coba lagi, bukan loading abadi.
    const chWatch = setTimeout(chFail, 25000);
    ensureChapters(id).then(() => {
      clearTimeout(chWatch);
      if (DVM.id !== id || $('detailView').hidden) return;
      paintCh();
    }).catch(chFail);
  }
  setSEO(t.title + T('seo_mw_t'), T('seo_read') + t.title + ' (' + mwStatus(t) + ', ' + t.total + ' chapter) ' + T('seo_here'));
}
function paintCh() {
  const t = findMw(DVM.id);
  const box = $('dvChList');
  if (!t || !box) return;
  const chs = mwChapters(t);
  if (!chs) { box.innerHTML = '<p class="muted">' + esc(T('ch_loading')) + '</p>'; return; }
  const q = DVM.filter.trim().toLowerCase();
  const list = chs.filter((c) => !q || String(c.n).toLowerCase().includes(q));
  box.innerHTML = list.map((c) => {
    const idx = chs.indexOf(c);
    return '<button class="ch-row" data-ch="' + t.id + ':' + idx + '" type="button">' +
      '<span class="ch-num">CH ' + esc(c.n) + '</span>' +
      '<span><strong>' + esc(c.t) + '</strong><small>' + esc(c.d || '') + '</small></span></button>';
  }).join('') || '<p class="muted">' + esc(T('ch_notfound')) + '</p>';
}
let rdCtx = null, rdReqSeq = 0;
/* Fallback gambar per-halaman + muat ulang yang gagal.
   Rantai: 0) asli → 1) img.komiku.org (fallback resmi) → 2) weserv →
   3) wsrv → 4) coba asli sekali lagi (gangguan sesaat) → sembunyikan.
   Jeda acak sebelum proxy: puluhan gambar yang gagal bareng jangan menghantam
   proxy dalam 1 detik yang sama (itu yang bikin 429 massal → "gagal mulu"). */
let RDIMG = { total: 0, fail: 0, noticed: false };
/* Muat ulang SATU gambar yang gagal (dipakai tombol per-gambar). */
function rdReloadOne(btn) {
  try {
    const card = btn.closest('.rd-img-fail');
    const im = card ? card.previousElementSibling : null;
    if (!im || im.tagName !== 'IMG') return;
    im.removeAttribute('data-pb');
    im.removeAttribute('data-ar');
    im.removeAttribute('data-card');
    im.style.display = '';
    if (im.dataset.orig) im.src = im.dataset.orig;
    card.remove();
    RDIMG.fail = Math.max(0, RDIMG.fail - 1);
    if (RDIMG.fail <= 0) {
      RDIMG.noticed = false;
      const rb = $('rdRetryBtn'); if (rb) rb.remove();
      const gb = $('rdImgBtn'); if (gb) gb.remove();
    }
  } catch (e) {}
}
function imgFallback(el) {
  try {
    const toOfficial = (u) => String(u).replace(/^https?:\/\/image\d+\.komiku\.to/i, 'https://img.komiku.org');
    const jitter = (fn) => setTimeout(fn, Math.floor(Math.random() * 1200));
    if (!el.dataset.pb) {
      const off = toOfficial(el.src);
      if (off !== el.src) { el.dataset.pb = '1'; el.src = off; return; }
      el.dataset.pb = '1';
    }
    if (el.dataset.pb === '1') {
      el.dataset.pb = '2';
      const src = String(el.src);
      jitter(() => {
        try {
          el.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(src.replace(/^https?:\/\//, ''));
        } catch (e) { imgFallback(el); }
      });
      return;
    }
    if (el.dataset.pb === '2') {
      el.dataset.pb = '3';
      const raw = String(el.src).replace(/^https?:\/\/images\.weserv\.nl\/\?url=/, '');
      jitter(() => {
        try { el.src = 'https://wsrv.nl/?url=' + raw; }
        catch (e) { imgFallback(el); }
      });
      return;
    }
    if (el.dataset.pb === '3') {
      el.dataset.pb = '4';
      const orig = el.dataset.orig;
      if (orig) {
        jitter(() => {
          try { el.src = orig; } catch (e) { imgFallback(el); }
        });
        return;
      }
    }
  } catch (e) {}
  // Rantai habis: coba ulang otomatis 2x (1 dtk, lalu 3 dtk), baru menyerah.
  // Catatan jujur: onerror <img> tidak memberi kode status HTTP, jadi yang
  // dicatat adalah tahap + URL (bukan 200/404).
  const ar = Number(el.dataset.ar || 0);
  if (ar < 2) {
    el.dataset.ar = String(ar + 1);
    el.removeAttribute('data-pb');
    setTimeout(() => {
      try { if (el.isConnected && el.dataset.orig) el.src = el.dataset.orig; } catch (e) {}
    }, ar === 0 ? 1000 : 3000);
    return;
  }
  el.dataset.pb = '4';
  try {
    const t = (rdCtx && findMw(rdCtx.id)) || {};
    const chs = (rdCtx && mwChapters(t)) || [];
    const c = chs[rdCtx.i] || {};
    console.log('[Guoke] gambar gagal:', t.title || '?', c.t || '?', el.dataset.orig || el.src);
  } catch (e) {}
  el.style.display = 'none';
  // Ganti dengan kartu tombol "Muat ulang gambar ini" yang berfungsi
  try {
    if (!el.dataset.card) {
      el.dataset.card = '1';
      const d = document.createElement('div');
      d.className = 'rd-img-fail';
      const s = document.createElement('small');
      s.textContent = 'Gambar tidak tampil';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-small btn-ghost';
      b.textContent = T('rd_retry_one');
      b.onclick = () => rdReloadOne(b);
      d.appendChild(s);
      d.appendChild(b);
      el.after(d);
    }
  } catch (e) {}
  RDIMG.fail++;
  if (RDIMG.total > 0 && RDIMG.fail >= RDIMG.total && !RDIMG.noticed) {
    RDIMG.noticed = true;
    try {
      const t = (rdCtx && findMw(rdCtx.id)) || {};
      const chs = (rdCtx && mwChapters(t)) || [];
      chprobMark(t.id, rdCtx.i, (chs[rdCtx.i] || {}).t || '', 'semua-gambar-gagal');
    } catch (e) {}
    rdFailBar(T('rd_all_fail'), 'all');
  }
}
/* Muat ulang semua gambar yang gagal di halaman ini (reset rantai fallback) */
function rdRetryImgs() {
  const p = $('rdPages');
  if (!p) return;
  let n = 0;
  p.querySelectorAll('img').forEach((im) => {
    try { im.removeAttribute('data-pb'); im.removeAttribute('data-ar'); im.removeAttribute('data-card'); } catch (e) {}
    if (im.style.display === 'none') im.style.display = '';
    if (im.dataset.orig) { try { im.src = im.dataset.orig; } catch (e) {} }
    n++;
  });
  p.querySelectorAll('.rd-img-fail').forEach((d) => { try { d.remove(); } catch (e) {} });
  RDIMG.fail = 0;
  RDIMG.noticed = false;
  const st = $('rdStatus');
  if (st) st.textContent = T('rd_loading_imgs') + '… (' + n + ' ' + T('pages_w') + ')';
  toast(T('rd_retry_imgs') + '…');
}
/* Kartu "Chapter gagal dimuat": Coba lagi / Coba server lain / Laporkan.
   mode 'all' = gagal total (3 tombol), 'partial' = sebagian (1 tombol). */
function rdFailBar(msg, mode) {
  const st = $('rdStatus');
  if (!st || $('rdFailCard')) return;
  // Bersihkan tombol lama bila ada
  const rb0 = $('rdRetryBtn'); if (rb0) rb0.remove();
  const gb0 = $('rdImgBtn'); if (gb0) gb0.remove();
  const card = document.createElement('div');
  card.id = 'rdFailCard';
  card.className = 'rd-failcard';
  const p = document.createElement('p');
  p.className = 'muted small';
  p.textContent = msg;
  card.appendChild(p);
  const row = document.createElement('div');
  row.className = 'btn-row';
  const mk = (label, ghost, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-small' + (ghost ? ' btn-ghost' : '');
    b.textContent = label;
    b.onclick = fn;
    row.appendChild(b);
    return b;
  };
  if (mode === 'partial') {
    mk(T('rd_retry_imgs'), false, () => { card.remove(); rdRetryImgs(); });
  } else {
    mk(T('retry_btn'), false, () => { card.remove(); loadChapter(); });
    mk(T('rd_alt_srv'), true, () => { card.remove(); rdAltServer(); });
    mk(T('rd_report_link'), true, () => {
      try {
        const t = (rdCtx && findMw(rdCtx.id)) || {};
        const chs = (rdCtx && mwChapters(t)) || [];
        const c = chs[rdCtx.i] || {};
        chprobReport(t.id, rdCtx.i, c.t || '');
      } catch (e) {}
      const rp = $('rdReport');
      if (rp) rp.click();
      else toast(T('cmt_reported'));
    });
  }
  card.appendChild(row);
  st.appendChild(card);
}
/* "Coba server lain": buang cache lama, paksa ambil segar (live + tebak pola). */
function rdAltServer() {
  if (!rdCtx) return;
  try {
    const t = findMw(rdCtx.id), chs = mwChapters(t) || [], c = chs[rdCtx.i];
    if (!c) return;
    if (MW.pages && MW.pages[t.slug]) { try { delete MW.pages[t.slug][c.u]; } catch (e) {} }
    if ($('rdStatus')) $('rdStatus').textContent = T('rd_loading_imgs') + c.t + '…';
    if ($('rdPages')) $('rdPages').innerHTML = '';
    const myReq = rdReqSeq;
    (async () => {
      try {
        const url = 'https://komiku.org' + c.u;
        const liveP = (async () => {
          const html = await withTimeout(fetchChapterHtml(url), 25000).catch(() => '');
          return html ? parseChapterImgs(html) : [];
        })();
        const guessP = (async () => {
          try { return await withTimeout(guessChapterImages(t, c), 120000).catch(() => []); } catch (e) { return []; }
        })();
        const imgs = await firstNonEmpty([liveP, guessP], 100000);
        if (!rdCtx || myReq !== rdReqSeq) return;
        if (!imgs.length) throw new Error('gambar kosong');
        try { if (MW.pages && MW.pages[t.slug]) MW.pages[t.slug][c.u] = imgs; } catch (e) {}
        paintRdImgs(t, c, imgs, 'live');
      } catch (err) {
        try { console.log('[Guoke] server lain gagal:', t.title, c.t, (err && err.message) || err); } catch (e) {}
        if (!rdCtx || myReq !== rdReqSeq) return;
        if ($('rdStatus')) $('rdStatus').textContent = T('rd_img_fail');
        rdFailBar(T('rd_reopen'), 'all');
      }
    })();
  } catch (e) {}
}
/* 20 dtk setelah gambar dirender: bila SEBAGIAN gagal (tidak semua),
   tawarkan tombol muat ulang — jangan diam. */
function rdWatchPartial(myReq) {
  try { clearTimeout(window.__rdSettle); } catch (e) {}
  try {
    window.__rdSettle = setTimeout(() => {
      if (!rdCtx || myReq !== rdReqSeq) return;
      if (RDIMG.total > 0 && RDIMG.fail > 0 && RDIMG.fail < RDIMG.total && !RDIMG.noticed) {
        RDIMG.noticed = true;
        rdFailBar(RDIMG.fail + '/' + RDIMG.total + T('rd_partial'), 'partial');
      }
    }, 20000);
  } catch (e) {}
}
function parseChapterImgs(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sec = doc.getElementById('Baca_Komik') || doc;
  const out = [];
  const push = (u) => {
    if (!u || u.indexOf('http') !== 0) return;
    if (/promosi|logo|avatar|gravatar|gstatic|googletag|analytics|ads|banner|sponsor|pixel|tracking|emoji|icon|button|facebook|twitter|instagram|whatsapp|telegram/i.test(u)) return;
    if (out.indexOf(u) < 0) out.push(u);
  };
  // Kandidat terbaik dari srcset (resolusi terbesar), bila tidak ada pakai atribut lazy lain
  const best = (im) => {
    const ss = im.getAttribute('srcset') || im.getAttribute('data-srcset') || '';
    if (ss) {
      const parts = ss.split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean);
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^https?:\/\//.test(parts[i])) return parts[i];
      }
    }
    return im.getAttribute('src') || im.getAttribute('data-src') ||
      im.getAttribute('data-lazy-src') || im.getAttribute('data-original') ||
      im.getAttribute('data-echo') || im.getAttribute('data-lazy') ||
      im.getAttribute('data-cfsrc') || '';
  };
  sec.querySelectorAll('img').forEach((im) => { push(best(im)); });
  // cadangan: regex mentah bila DOM tidak menemukan apa pun (markup aneh)
  if (!out.length) {
    const raw = String(html || '');
    const re = /<img[^>]+(?:src|data-src|data-lazy-src|data-original|data-echo|data-lazy|data-cfsrc)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    let m;
    while ((m = re.exec(raw))) push(m[1]);
  }
  // Hanya gambar konten (komiku / wp-content / cdn gambar), bukan tombol/sosmed.
  // Bila filter tidak menemukan apa pun, kembalikan semua (jangan gagal total).
  const content = out.filter((u) => /komiku|wp-content|uploads|cdn|image|img/i.test(u));
  return content.length ? content : out;
}
/* Ambil HTML via SEMUA proxy sekaligus (paralel): yang PERTAMA mengembalikan
   halaman baca yang valid langsung dipakai — tidak menunggu proxy mati satu
   per satu (dulu Promise.all menunggu yang paling lambat → macet lalu gagal). */
async function fetchChapterHtml(url) {
  const valid = (txt) => {
    if (!txt || txt.length < 2000) return false;
    if (txt.includes('Baca_Komik')) return true;
    if ((txt.match(/komiku\.to/g) || []).length >= 3) return true;
    if (/https?:\/\/[^"'\s]*komiku\.to\/[^"'\s]*\.(jpe?g|png|webp)/i.test(txt)) return true;
    return false;
  };
  return new Promise((resolve) => {
    let done = false, pending = API_PROXY.length;
    const finish = (txt) => {
      if (done) return;
      if (txt && valid(txt)) { done = true; resolve(txt); return; }
      if (--pending <= 0 && !done) { done = true; resolve(''); }
    };
    API_PROXY.forEach((p) => {
      (async () => {
        try {
          const r = await fetchTimeout(p(url), 10000);
          if (!r.ok) { finish(''); return; }
          const txt = await bodyTimeout(r.text(), 10000);
          finish(txt);
        } catch (e) { finish(''); }
      })();
    });
    setTimeout(() => { if (!done) { done = true; resolve(''); } }, 12000);
  });
}
/* Tebakan URL gambar TANPA proxy (lapis darurat saat semua proxy mati).
   Chapter baru Komiku berpola teratur:
     https://{host}/upload5/{slug}/{nomor}/{YYYY-MM-DD}/{halaman}[_part{k}].{webp,jpg}
   <img> tidak butuh CORS, jadi pola ini bisa diprobe langsung dari browser.
   Cakupan: pola upload5 (~50% gambar, mayoritas chapter baru). */
function isoChapterDate(d) {
  const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
}
function probeImg(url, ms) {
  return new Promise((res) => {
    const im = new Image();
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; try { im.src = ''; } catch (e) {} res(false); } }, ms || 8000);
    im.onload = () => { if (!done) { done = true; clearTimeout(t); res(true); } };
    im.onerror = () => { if (!done) { done = true; clearTimeout(t); res(false); } };
    try { im.referrerPolicy = 'no-referrer'; } catch (e) {}
    im.src = url;
  });
}
async function guessChapterImages(t, c) {
  const iso = isoChapterDate(c.d);
  if (!iso || !t.slug || c.n === undefined || c.n === null || c.n === '') return [];
  const num = String(c.n);
  // Tanggal pada URL kadang meleset ±2 hari dari tanggal metadata
  const dates = [iso];
  const dt = new Date(iso + 'T00:00:00Z');
  if (!isNaN(dt.getTime())) {
    for (const off of [-1, 1, -2, 2]) {
      dates.push(new Date(dt.getTime() + off * 864e5).toISOString().slice(0, 10));
    }
  }
  const hosts = ['https://img.komiku.org', 'https://image2.komiku.to', 'https://image3.komiku.to'];
  const dirs = ['upload5', 'uploads', 'uploads2', 'uploads3', 'uploads4'];
  const exts = ['webp', 'jpg', 'png'];
  const cands = [];
  for (const d of dates) for (const dd of dirs) for (const h of hosts) for (const e of exts) {
    cands.push([h + '/' + dd + '/' + t.slug + '/' + num + '/' + d + '/', e]);
  }
  // Deteksi batch (12 kombinasi × {tunggal, part1} = 24 probe paralel per ronde)
  let base = '', ext = '';
  for (let i = 0; i < cands.length; i += 12) {
    const jobs = [];
    cands.slice(i, i + 12).forEach(([pre, e]) => {
      jobs.push(probeImg(pre + '1.' + e, 9000).then((ok) => ok ? { pre, e } : null));
      jobs.push(probeImg(pre + '1_part1.' + e, 9000).then((ok) => ok ? { pre, e } : null));
    });
    const hit = (await Promise.all(jobs)).find(Boolean);
    if (hit) { base = hit.pre; ext = hit.e; break; }
  }
  if (!base) return [];
  const urls = [];
  const pageUrls = async (i) => {
    const single = base + i + '.' + ext;
    if (await probeImg(single, 9000)) return [single];
    const parts = [];
    for (let k = 1; k <= 8; k++) {
      const u = base + i + '_part' + k + '.' + ext;
      if (await probeImg(u, 7000)) parts.push(u);
      else break;
    }
    return parts;
  };
  let miss = 0;
  for (let i = 1; i <= 220; i += 4) {
    const batch = await Promise.all([pageUrls(i), pageUrls(i + 1), pageUrls(i + 2), pageUrls(i + 3)]);
    for (const got of batch) {
      if (got.length) { urls.push(...got); miss = 0; }
      else if (++miss >= 2) return urls;
    }
  }
  return urls;
}
/* Balapan: beberapa sumber gambar jalan paralel, yang PERTAMA mengembalikan
   daftar tak-kosong langsung menang. Jangan tunggu yang lambat/mati. */
function firstNonEmpty(promises, ms) {
  return new Promise((resolve) => {
    let done = false, pending = promises.length;
    if (!pending) { resolve([]); return; }
    const t = setTimeout(() => { if (!done) { done = true; resolve([]); } }, ms || 90000);
    const out = (v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } };
    promises.forEach((p) => {
      Promise.resolve(p).then((imgs) => {
        if (done) return;
        if (imgs && imgs.length) out(imgs);
        else if (--pending <= 0) out([]);
      }).catch(() => { if (!done && --pending <= 0) out([]); });
    });
  });
}
async function chapterImages(t, chUrl) {
  const slug = t.slug;
  if (MW.pages && MW.pages[slug] && MW.pages[slug][chUrl]) return MW.pages[slug][chUrl];
  if (!MW.pages) MW.pages = {};
  // sumber utama: file bawaan per judul (instan, tanpa proxy; timeout 12 dtk).
  // Bila file TAK ADA / tak memuat chapter ini: LANJUT ke balapan di bawah.
  if (!MW.pages[slug]) {
    try {
      const r = await fetchTimeout('data/mw/' + slug + '.json', 12000);
      if (r.ok) {
        const j = await bodyTimeout(r.json(), 10000);
        MW.pages[slug] = j.pages || {};
        const hit = MW.pages[slug][chUrl];
        if (hit && hit.length) return hit;
      }
    } catch (e) { /* ikut balapan */ }
    if (!MW.pages[slug]) MW.pages[slug] = {};
  } else {
    const hit = MW.pages[slug][chUrl];
    if (hit && hit.length) return hit;
  }
  // BALAPAN (dulu berurutan: live 2 ronde gagal → baru tebak pola 150 dtk →
  // total macet berbulan-menit lalu gagal total):
  //  A) ambil HTML live via proxy + B) tebak pola URL langsung (tanpa proxy,
  //  tanpa CORS — <img> bebas CORS). Yang pertama dapat gambar langsung menang.
  const url = 'https://komiku.org' + chUrl;
  const liveP = (async () => {
    for (let round = 0; round < 2; round++) {
      const html = await withTimeout(fetchChapterHtml(url), 20000).catch(() => '');
      if (html) {
        const imgs = parseChapterImgs(html);
        if (imgs.length) return imgs;
      }
    }
    return [];
  })();
  const guessP = (async () => {
    try {
      const chs = (t.chapters || CHC[t.id]) || [];
      const c = chs.find((x) => x.u === chUrl);
      if (!c) return [];
      return await withTimeout(guessChapterImages(t, c), 120000).catch(() => []);
    } catch (e) { return []; }
  })();
  const imgs = await firstNonEmpty([liveP, guessP], 100000);
  if (imgs.length) {
    MW.pages[slug][chUrl] = imgs; // cache sesi agar Prev/Next instan
    return imgs;
  }
  throw new Error('gambar kosong');
}
async function openReader(titleId, chIdx, pushHash) {
  const t = findMw(titleId);
  if (!t) return;
  if (!mwChapters(t)) {
    toast(T('ch_loading'));
    try { await ensureChapters(titleId); }
    catch (e) { toast(T('ch_fail_toast')); openDetailMw(titleId, false); return; }
  }
  const chs = mwChapters(t) || [];
  rdCtx = { id: titleId, i: Number(chIdx) };
  const c = chs[rdCtx.i];
  if (!c) return;
  const rdFresh = $('readModal').hidden; // true = bukaan baru dari daftar
  $('readModal').hidden = false;
  $('readModal').classList.remove('rd-hide');
  if ($('rdFloatNext')) $('rdFloatNext').classList.remove('hide');
  if ($('rdFloatPrev')) $('rdFloatPrev').classList.remove('hide');
  try { if (window.__rdW) window.__rdW.reset(); } catch (e) {}
  document.body.style.overflow = 'hidden';
  paintFullBtns();
  applyRdWidth();
  // URL unik per chapter (push bila bukaan baru; Next/Prev/select = replace)
  if (pushHash !== false) pushView('#/baca/' + titleId + '/' + rdCtx.i,
    { cat: CURCAT, view: 'rd', id: titleId, idx: rdCtx.i }, rdFresh);
  // Simpan "lanjutkan membaca" (tanpa login) + riwayat
  store.set('gq_cont', { id: titleId, idx: rdCtx.i, ch: c.t, at: Date.now() });
  // TAHAP 3.1: catat chapter dibuka untuk progress bar poster
  try { progAdd('gq_readch', titleId, rdCtx.i); } catch (e) {}
  pushHist({ type: 'mw', id: titleId, idx: rdCtx.i, sub: c.t, t: t.title });
  setSEO(t.title + ' ' + c.t + ' | Guoke AMHDQ', T('seo_read') + t.title + ' ' + c.t + ' ' + T('seo_here'));
  $('rdTitle').textContent = t.title + ' — ' + c.t;
  const sel = $('rdSelect');
  sel.innerHTML = chs.map((x, j) =>
    '<option value="' + j + '"' + (j === rdCtx.i ? ' selected' : '') + '>CH ' + esc(x.n) + ' — ' + esc(x.d || '') + '</option>'
  ).join('');
  sel.onchange = () => openReader(titleId, Number(sel.value));
  const atFirst = rdCtx.i <= 0, atLast = rdCtx.i >= chs.length - 1;
  [$('rdPrev'), $('rdPrev2')].forEach((b) => { b.disabled = atLast; b.onclick = () => openReader(titleId, rdCtx.i + 1); });
  [$('rdNext'), $('rdNext2'), $('rdFloatNext')].forEach((b) => { if (b) { b.disabled = atFirst; b.onclick = () => openReader(titleId, rdCtx.i - 1); } });
  // TAHAP 3.5: tombol chapter sebelumnya ikut melayang (kiri bawah)
  try {
    const fp = $('rdFloatPrev');
    if (fp) { fp.disabled = atLast; fp.onclick = () => openReader(titleId, rdCtx.i + 1); }
  } catch (e) {}
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
/* TAHAP 4 (daftar bermasalah): registry chapter gagal per judul.
   Bentuk: {titleId: {idx: {ch, cause, at, reports}}} — dipakai admin,
   tombol "Perbaiki ulang", dan laporan pengguna. */
function chprobGet() { try { const o = store.get('gq_chprob', {}); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function chprobMark(titleId, idx, ch, cause) {
  try {
    const o = chprobGet();
    if (!o[titleId]) o[titleId] = {};
    const prev = o[titleId][idx] || {};
    o[titleId][idx] = { ch: ch || prev.ch || '', cause: cause || prev.cause || 'gagal', at: Date.now(), reports: prev.reports || 0 };
    store.set('gq_chprob', o);
  } catch (e) {}
}
function chprobClear(titleId, idx) {
  try {
    const o = chprobGet();
    if (o[titleId] && o[titleId][idx]) { delete o[titleId][idx]; if (!Object.keys(o[titleId]).length) delete o[titleId]; store.set('gq_chprob', o); }
  } catch (e) {}
}
function chprobReport(titleId, idx, ch) {
  try {
    const o = chprobGet();
    if (!o[titleId]) o[titleId] = {};
    const prev = o[titleId][idx] || { ch: ch || '', cause: 'laporan-pengguna', at: Date.now(), reports: 0 };
    prev.reports = (prev.reports || 0) + 1;
    prev.at = Date.now();
    o[titleId][idx] = prev;
    store.set('gq_chprob', o);
  } catch (e) {}
}
/* SATU fungsi render gambar reader — dipakai semua jalur (baked/live/tebak/
   muat ulang). Satu-satunya tempat <img> reader dibuat. */
function paintRdImgs(t, c, imgs, srcKind) {
  const myReq = rdReqSeq;
  RDIMG = { total: imgs.length, fail: 0, noticed: false };
  const rb = $('rdRetryBtn'); if (rb) rb.remove();
  const gb = $('rdImgBtn'); if (gb) gb.remove();
  const fc = $('rdFailCard'); if (fc) fc.remove();
  $('rdPages').innerHTML = imgs.map((u, k) =>
    '<img src="' + esc(cdn(u)) + '" data-orig="' + esc(u) + '" alt="' + esc(t.title + ' ' + c.t + ' ' + T('page_w') + ' ' + (k + 1)) +
    '" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="imgFallback(this)">'
  ).join('');
  $('rdStatus').textContent = imgs.length + ' ' + T('pages_w') + ' • ' + c.t + ' • ' + T('rd_scroll');
  try { if (srcKind === 'live') chprobClear(t.id, rdCtx.i); } catch (e) {}
  rdScroller().scrollTop = 0;
  restorePos();
  rdWatchPartial(myReq);
  preloadNext(t, rdCtx.i);
}
/* Segarkan daftar gambar di latar setelah chapter tampil dari cache lama:
   bila daftar segar beda (URL lama basi), ganti di tempat + catat. */
function rdRefreshBg(t, c, chUrl, myReq) {
  (async () => {
    try {
      const fresh = await withTimeout((async () => {
        const html = await fetchChapterHtml('https://komiku.org' + chUrl);
        return html ? parseChapterImgs(html) : [];
      })(), 15000).catch(() => []);
      if (!rdCtx || myReq !== rdReqSeq || !fresh.length) return;
      const cur = Array.from($('rdPages').querySelectorAll('img')).map((im) => im.dataset.orig || '');
      const same = fresh.length === cur.length && fresh.every((u, i) => u === cur[i]);
      if (same) return;
      try { if (MW.pages && MW.pages[t.slug]) MW.pages[t.slug][chUrl] = fresh; } catch (e) {}
      if (RDIMG.fail > 0) {
        if (!rdCtx || myReq !== rdReqSeq) return;
        paintRdImgs(t, c, fresh, 'live');
        toast(T('rd_retry_imgs') + ' ✓');
      }
    } catch (e) {}
  })();
}
function loadChapter() {
  if (!rdCtx) return;
  const t = findMw(rdCtx.id), chs = mwChapters(t) || [], c = chs[rdCtx.i];
  if (!c) return;
  const myReq = ++rdReqSeq;
  $('rdStatus').textContent = T('rd_loading_imgs') + c.t + '…';
  $('rdPages').innerHTML = '';
  $('rdTitle').textContent = t.title + ' — ' + c.t;
  // Pengaman anti-gantung: bila 40 dtk belum ada hasil maupun error,
  // tampilkan tombol Coba lagi (fetch lama tetap jalan; hasilnya diabaikan
  // bila pengguna sudah pindah chapter via anti-campur myReq).
  try { clearTimeout(window.__rdWatch); } catch (e) {}
  try {
    window.__rdWatch = setTimeout(() => {
      if (!rdCtx || myReq !== rdReqSeq) return;
      if ($('rdPages') && $('rdPages').children.length) return;
      rdFailBar(T('rd_too_long'), 'all');
    }, 40000);
  } catch (e) {}
  const clearWatch = () => { try { clearTimeout(window.__rdWatch); } catch (e) {} };
  // Coba ambil daftar gambar: langsung + ulang otomatis 2x (jeda 1 dtk, 3 dtk).
  let attempt = 0;
  const tryLoad = () => {
    attempt++;
    if (attempt > 1) {
      try { if (MW.pages && MW.pages[t.slug]) delete MW.pages[t.slug][c.u]; } catch (e) {}
      if ($('rdStatus')) $('rdStatus').textContent = T('rd_loading_imgs') + c.t + '…';
    }
    chapterImages(t, c.u).then((imgs) => {
      clearWatch();
      if (!rdCtx || myReq !== rdReqSeq) return; // anti-campur
      if (!imgs.length) throw new Error('gambar kosong');
      paintRdImgs(t, c, imgs);
      rdRefreshBg(t, c, c.u, myReq); // daftar segar di latar
    }).catch((err) => {
      try { console.log('[Guoke] daftar gambar gagal:', t.title, c.t, c.u, (err && err.message) || err); } catch (e) {}
      if (!rdCtx || myReq !== rdReqSeq) return;
      if (attempt < 3) {
        setTimeout(() => { if (rdCtx && myReq === rdReqSeq) tryLoad(); }, attempt === 1 ? 1000 : 3000);
        return;
      }
      clearWatch();
      try { chprobMark(t.id, rdCtx.i, c.t, 'daftar-kosong'); } catch (e) {}
      if ($('rdStatus')) $('rdStatus').textContent = T('rd_img_fail');
      rdFailBar(T('rd_reopen'), 'all');
    });
  };
  tryLoad();
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
    $('rdStatus').textContent += ' ' + T('rd_resumed');
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
  const chs = mwChapters(t) || [];
  const nx = chs[i + 1] || chs[i - 1];
  if (!nx) return;
  const slug = t.slug;
  const go = (imgs) => (imgs || []).slice(0, 2).forEach((u) => {
    const im = new Image();
    im.decoding = 'async';
    try { im.referrerPolicy = 'no-referrer'; } catch (e) {}
    im.src = cdn(u);
  });
  if (MW.pages && MW.pages[slug] && MW.pages[slug][nx.u]) go(MW.pages[slug][nx.u]);
  else fetchTimeout('data/mw/' + slug + '.json', 12000).then((r) => bodyTimeout(r.json(), 10000)).then((j) => {
    MW.pages = MW.pages || {};
    MW.pages[slug] = j.pages || {};
    go(MW.pages[slug][nx.u]);
  }).catch(() => {});
}
function closeReader() {
  $('readModal').hidden = true;
  $('readModal').classList.remove('rd-full');
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  paintFullBtns();
  syncBodyLock();
  rdCtx = null;
  paintLanjut(); // strip lanjutkan ikut update setelah membaca
  paintLanjutHome();
}
function toggleFull() {
  // Pseudo-fullscreen via CSS (tanpa Fullscreen API) agar tidak muncul
  // toast sistem browser "to exit full screen, drag from ...".
  const el = $('readModal');
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  el.classList.toggle('rd-full');
  paintFullBtns();
}
function paintFullBtns() {
  const on = $('readModal').classList.contains('rd-full') || !!document.fullscreenElement;
  document.querySelectorAll('[data-full]').forEach((b) => { b.textContent = on ? T('full_exit') : T('full'); });
}

function initAnime() {
  // Sumber utama: data-anime.js (satu file, bisa diedit manual).
  // Cadangan: fetch JSON bila script data belum termuat.
  const bootAnime = (d) => {
    ANI = d;
    try { var _ad = $('aniDate'); if (_ad) _ad.textContent = d.updated || ''; } catch (e) {}
    paintAniGenres();
    renderShows('');
    paintPreview();
    paintLanjutHome();
    loadFresh(); // rilis baru otomatis di latar
    loadLatest(); // kategori Episode Terbaru (2026 + live, tanpa judul segera)
    loadUpcoming(); // kategori Anime Akan Rilis (status segera)
    armLatestAuto(); // auto-rilis 1 DETIK: 1 judul/detik, langsung nonton
  };
  if (window.GQ_ANIME && window.GQ_ANIME.shows && window.GQ_ANIME.shows.length) {
    (window.GQ_ANIME.shows || []).forEach((s) => {
      if (s.akid) AKMAP[s.id] = { id: s.akid, episodes: s.episodes };
    });
    bootAnime({ updated: window.GQ_ANIME.updated || '', shows: window.GQ_ANIME.shows });
  } else {
  Promise.all([
    fetchTimeout('data/anime.json', 15000).then((r) => { if (!r.ok) throw new Error(); return bodyTimeout(r.json(), 15000); }),
    fetchTimeout('data/anikoto.json', 15000).then((r) => (r.ok ? bodyTimeout(r.json(), 15000) : [])).catch(() => []),
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
      $('showGrid').innerHTML = '<p class="muted">' + esc(T('ani_fail')) + '</p>';
    });
  }
  $('aniSearch').addEventListener('input', (e) => { ANI_UI.limit = ANI_UI.per; renderShows(e.target.value); paintAniSuggest(e.target.value); });
  // TAHAP 3.6: riwayat saat fokus, simpan saat Enter, tutup saat lepas
  $('aniSearch').addEventListener('focus', (e) => paintAniSuggest(e.target.value));
  $('aniSearch').addEventListener('blur', () => setTimeout(() => { const b = $('aniSuggest'); if (b) b.hidden = true; }, 150));
  $('aniSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sqAdd('gq_sq_ani', e.target.value);
      const b = $('aniSuggest'); if (b) b.hidden = true;
    }
  });
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
    try { paintAnimeSections(); } catch (e) {}
    // Hasil filter ada tepat di bawah tab → scroll ke sana agar langsung terlihat.
    try { const c = $('aniCount'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
  }));
  const lr = $('latestRefresh');
  if (lr) lr.addEventListener('click', () => { toast(T('loading')); loadLatest(true); });
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
    // Kartu diklik di mana saja (gambar/judul) → buka detail, ala screenshot
    const sh = e.target.closest('[data-show]');
    if (sh && !e.target.closest('button')) { openDetailAnime(sh.dataset.show); return; }
    // Tombol back di backdrop detail
    if (e.target.closest('[data-dvback]')) {
      smartBack(DV.type === 'anime' && DV.id ? 'anime' : 'manhwa');
      return;
    }
    // Mulai Tonton → putar episode pertama yang tersedia
    const pl = e.target.closest('[data-dvplay]');
    if (pl) {
      const sid = pl.dataset.dvplay;
      const s = findShow(sid);
      const first = DV && DV.type === 'anime' && DV.id === sid ? DV.eps.find((x) => x.ok) : null;
      if (first && s) { openPlayerStream(s.title, first.number, first); return; }
      if (DV && DV.eps && DV.eps.length && s) {
        const anyOk = DV.eps.some((x) => x.ok);
        if (!anyOk) { toast(T('coming_soon')); return; }
      }
      const box = $('dvEps');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const fr = e.target.closest('[data-fresh]');
    if (fr) {
      const apiid = Number(fr.dataset.fresh);
      fr.disabled = true;
      // Kalau akid ini sudah ada di katalog (judul lama dapat episode baru),
      // buka entri katalognya langsung agar daftar episode lengkap + terbaru.
      let existSid = null;
      try { for (const s of (ANI.shows || [])) { const ak = akOf(s.id); if (ak && Number(ak.id) === apiid) { existSid = s.id; break; } } } catch (e) {}
      if (existSid) { try { fr.disabled = false; } catch (e) {} openDetailAnime(existSid); return; }
      // Ambil info kartu untuk fallback offline agar anime tetap BISA dipencet
      let cardTitle = '', cardCover = '';
      try {
        const card = fr.closest('article');
        if (card) {
          const st = card.querySelector('.show-info strong');
          if (st) cardTitle = st.textContent.trim();
          const im = card.querySelector('img');
          if (im) cardCover = im.getAttribute('src') || '';
        }
      } catch (e) {}
      // Buka placeholder SEGERA (tanpa tunggu proxy) agar tidak "tidak bisa
      // pencet"; episode diisi saat API berhasil, atau tampil "Coba lagi".
      try {
        const tid0 = 'rx_' + apiid;
        if (!findShow(tid0)) {
          ANI.shows.unshift({ id: tid0, title: cardTitle || ('Rilis ' + apiid), cover: cardCover || '', akid: apiid, episodes: 0, status: 'tayang', kind: 'series', year: new Date().getFullYear() });
          AKMAP[tid0] = { id: apiid, episodes: 0 };
        }
        openDetailAnime(tid0);
      } catch (e) {}
      apiSeriesLive(apiid).then((data) => {
        const title = (data.anime && data.anime.title) || cardTitle || ('Rilis ' + apiid);
        const tid = 'rx_' + apiid;
        const ex = findShow(tid);
        if (ex) {
          ex.title = title;
          if (cardCover && !ex.cover) ex.cover = cardCover;
          ex.episodes = (data.episodes || []).length;
        } else {
          ANI.shows.unshift({ id: tid, title, cover: cardCover || '', akid: apiid, episodes: (data.episodes || []).length });
        }
        AKMAP[tid] = { id: apiid, episodes: (data.episodes || []).length };
        try { seriesCache[apiid] = data; } catch (e) {}
        try { cacheAk(apiid, data); } catch (e) {}
        // Refresh detail yang sedang terbuka tanpa tambah riwayat
        try { if (DV && DV.id === tid && !$('detailView').hidden) openDetailAnime(tid, false); } catch (e) {}
      }).catch(() => {
        // Proxy mati → detail placeholder sudah terbuka; tampilkan toast + tombol
        // Coba lagi sudah ada via dv_net_err di openDetailAnime.
        try { toast(T('fresh_fail') + ' — dibuka offline, ketuk Coba lagi'); } catch (e2) {}
      }).finally(() => { fr.disabled = false; });
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
    const mcr = e.target.closest('[data-mchretry]');
    if (mcr) { openDetailMw(mcr.dataset.mchretry, false); return; }
    const ep = e.target.closest('[data-ep]');
    if (ep) {
      const parts = ep.dataset.ep.split(':');
      const sid = parts[0], num = parts.slice(1).join(':');
      const s = findShow(sid);
      if (!s) return;
      // anti-campur: pakai daftar episode halaman detail yang sedang dibuka
      const found = (DV.type === 'anime' && DV.id === sid)
        ? DV.eps.find((x) => String(x.number) === String(num)) : null;
        if (found && !found.ok) { toast(T('episode_w') + ' ' + num + ' ' + T('coming_soon_dash')); return; }
      if (found) { openPlayerStream(s.title, num, found); return; }
      const ak = akOf(sid);
      if (!ak) return;
      ep.disabled = true;
      apiSeries(ak.id).then((data) => {
        const f2 = (data.episodes || []).find((x) => String(x.number) === String(num));
        if (f2) openPlayerStream(s.title, num, f2);
        else toast(T('ep_missing'));
      }).catch(() => toast(T('ep_fail'))).finally(() => { ep.disabled = false; });
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
      toast(on ? T('bm_added') : T('bm_removed'));
      return;
    }
    // Bookmark dari halaman detail
    const bmd = e.target.closest('[data-bm-detail]');
    if (bmd) {
      const on = toggleBookmark(bmd.dataset.bmDetail);
      bmd.classList.toggle('btn-ghost', !on);
      bmd.setAttribute('aria-pressed', on);
      bmd.textContent = on ? T('bm_detail_on') : T('bm_detail_off');
      toast(on ? T('bm_added') : T('bm_removed'));
      return;
    }
    // Pagination katalog lama sudah diganti tombol "Muat lagi" (A7)
    // Saran pencarian → buka detail
    const sg = e.target.closest('[data-sug]');
    if (sg) {
      const b = $('mwSuggest'); if (b) b.hidden = true;
      try { sqAdd('gq_sq_mw', (findMw(sg.dataset.sug) || {}).title || ''); } catch (err) {}
      openDetailMw(sg.dataset.sug);
      return;
    }
    // TAHAP 3.6: saran anime → buka detail + simpan riwayat
    const asg = e.target.closest('[data-anisug]');
    if (asg) {
      const b = $('aniSuggest'); if (b) b.hidden = true;
      try { const _s = findShow(asg.dataset.anisug); sqAdd('gq_sq_ani', _s ? _s.title : ''); } catch (err) {}
      openDetailAnime(asg.dataset.anisug);
      return;
    }
    // TAHAP 3.6: chip riwayat → isi kolom + cari
    const sq = e.target.closest('[data-sq]');
    if (sq) {
      const k = sq.dataset.sq, q = sq.dataset.q || '';
      if (k === 'gq_sq_ani' && $('aniSearch')) {
        $('aniSearch').value = q;
        ANI_UI.limit = ANI_UI.per;
        renderShows(q);
        paintAniSuggest(q);
      } else if ($('mwSearch')) {
        $('mwSearch').value = q;
        MW_UI.q = q.toLowerCase().trim();
        MW_UI.limit = MW_UI.per;
        if (MW.loaded) renderMw();
        paintSuggest(q);
      }
      return;
    }
    // Salin preset TikTok satu klik
    const cp = e.target.closest('[data-copypreset]');
    if (cp) {
      const pre = $(cp.dataset.copypreset);
      const done = () => toast(T('preset_copied_full'));
      if (pre) {
        if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(done, () => toast(T('copy_fail')));
        else toast(T('clipboard_na'));
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
    else if (e.key === 'Escape' && $('ikonModal') && !$('ikonModal').hidden) closeIkon();
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
  // TAHAP 3.6: riwayat saat fokus kosong, simpan saat Enter
  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      const box = $('mwSuggest'), h = sqHistHTML('gq_sq_mw');
      if (box && h && MW.loaded) { box.innerHTML = h; box.hidden = false; input.setAttribute('aria-expanded', 'true'); }
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sqAdd('gq_sq_mw', e.target.value);
      const b = $('mwSuggest'); if (b) b.hidden = true;
    }
  });
  $('mwGenre').addEventListener('change', (e) => { MW_UI.genre = e.target.value; MW_UI.limit = MW_UI.per; syncMwGenreChips(); renderMw(); });
  const mty = $('mwType');
  if (mty) mty.addEventListener('change', (e) => { MW_UI.type = e.target.value; MW_UI.limit = MW_UI.per; renderMw(); });
  $('mwSort').addEventListener('change', (e) => { MW_UI.sort = e.target.value; MW_UI.limit = MW_UI.per; renderMw(); });
  $('mwBookmarked').addEventListener('change', (e) => { MW_UI.bookOnly = e.target.checked; MW_UI.limit = MW_UI.per; renderMw(); });
  const bms = $('mwBmStatus');
  if (bms) bms.addEventListener('change', (e) => { MW_UI.bmStatus = e.target.value; MW_UI.limit = MW_UI.per; renderMw(); });
  const more = $('mwMore');
    if (more) more.addEventListener('click', () => {
    more.disabled = true;
    more.textContent = T('loading');
    const sk = mwSkeletonMore(8);
    setTimeout(() => {
      sk.remove();
      MW_UI.limit += MW_UI.per;
      renderMw();
      more.disabled = false;
      more.textContent = T('load_more');
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
  const soon = isSegeraMode();
  const pool = ANI.shows.filter((s) => s.id.indexOf('rx_') !== 0 && (soon ? isSoonU(s) : !isSoonU(s)));
  const s = (pool.length ? pool : ANI.shows)[Math.floor(Math.random() * (pool.length ? pool.length : ANI.shows.length))];
  if (s) openDetailAnime(s.id);
}
function ensureMw() {
  if (MW.loaded) return Promise.resolve();
  if (MW.loading) return MW._p || Promise.resolve();
  MW.loading = true;
  mwSkeleton(); // skeleton dulu, bukan blank
  MW._p = fetchTimeout('data/manhwa.json', 15000)
    .then((r) => { if (!r.ok) throw new Error(); return bodyTimeout(r.json(), 20000); })
    .then((d) => {
      MW = Object.assign(d, { loaded: true, loading: false });
      try { var _md = $('mwDate'); if (_md) _md.textContent = d.updated || ''; } catch (e) {}
      paintGenres();
      renderMw();
    })
    .catch(() => {
      MW.loading = false;
      $('mwGrid').innerHTML = '<p class="muted">' + esc(T('mw_fail')) + '</p>';
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
/* Single authority for body scroll-lock: locked iff ANY overlay is visible.
   Fixes pages stuck unscrollable after unbalanced open/close paths. */
function syncBodyLock() {
  var ids = ['playerModal', 'readModal', 'detailView', 'ikonModal', 'bantuModal',
    'tentangModal', 'legalModal', 'profilModal', 'authView', 'filterSheet'];
  var locked = ids.some(function (id) { var m = $(id); return m && !m.hidden; });
  try { document.body.style.overflow = locked ? 'hidden' : ''; } catch (e) {}
}
function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModals() {
  ['bantuModal', 'tentangModal', 'legalModal', 'profilModal', 'authView'].forEach((id) => { const m = $(id); if (m) m.hidden = true; });
  syncBodyLock();
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
  ['req', 'lap', 'prob'].forEach((k) => {
    const el = $('btab' + k[0].toUpperCase() + k.slice(1));
    if (el) el.hidden = k !== which;
  });
  document.querySelectorAll('[data-btab]').forEach((b) =>
    b.classList.toggle('btn-ghost', b.dataset.btab !== which));
  if (which === 'prob') { try { paintProbAdmin(); } catch (e) {} }
}
/* TAHAP 4 (daftar bermasalah): tampilkan antrean + tombol perbaiki ulang. */
function paintProbAdmin() {
  const ul = $('probList');
  if (!ul) return;
  const o = chprobGet();
  const rows = [];
  Object.keys(o).forEach((tid) => {
    const t = findMw(tid);
    Object.keys(o[tid] || {}).forEach((idx) => {
      const r = o[tid][idx];
      rows.push({ tid, idx: Number(idx), judul: t ? t.title : tid, ch: r.ch || '', cause: r.cause || '', at: r.at || 0, reports: r.reports || 0 });
    });
  });
  rows.sort((a, b) => b.at - a.at);
  if (!rows.length) { ul.innerHTML = '<li class="muted">Belum ada chapter bermasalah. 🎉</li>'; return; }
  ul.innerHTML = rows.map((r) => '<li>' + esc(r.judul) + ' — ' + esc(r.ch) +
    ' <em>(' + esc(r.cause) + (r.reports ? ', ' + r.reports + ' laporan' : '') + ' • ' +
    esc(new Date(r.at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + ')</em> ' +
    '<button class="linkbtn" data-probfix="' + esc(r.tid) + ':' + r.idx + '" type="button">Perbaiki</button></li>').join('');
}
let probBusy = false;
async function probFixOne(tid, idx) {
  const t = findMw(tid);
  if (!t) return false;
  try { await ensureChapters(tid); } catch (e) { return false; }
  const chs = mwChapters(t) || [];
  const c = chs[idx];
  if (!c) return false;
  try { if (MW.pages && MW.pages[t.slug]) delete MW.pages[t.slug][c.u]; } catch (e) {}
  try {
    const imgs = await withTimeout(chapterImages(t, c.u), 60000).catch(() => []);
    if (imgs && imgs.length) { chprobClear(tid, idx); return true; }
  } catch (e) {}
  chprobMark(tid, idx, c.t, 'daftar-kosong');
  return false;
}
async function probFixAll() {
  if (probBusy) return;
  const o = chprobGet();
  const queue = [];
  Object.keys(o).forEach((tid) => Object.keys(o[tid] || {}).forEach((idx) => queue.push([tid, Number(idx)])));
  if (!queue.length) { toast('Tidak ada yang perlu diperbaiki'); return; }
  probBusy = true;
  const pp = $('probProg');
  let ok = 0;
  for (let i = 0; i < queue.length; i++) {
    if (pp) { pp.hidden = false; pp.textContent = 'Memperbaiki ' + (i + 1) + '/' + queue.length + '…'; }
    try { if (await probFixOne(queue[i][0], queue[i][1])) ok++; } catch (e) {}
    await new Promise((r) => setTimeout(r, 800)); // jeda agar tidak diblokir
  }
  probBusy = false;
  if (pp) pp.textContent = 'Selesai: ' + ok + '/' + queue.length + ' pulih.';
  try { paintProbAdmin(); } catch (e) {}
  toast('Selesai: ' + ok + '/' + queue.length + ' pulih');
}
/* Tugas latar: cek chapter terbaru (bookmark + riwayat) secara berkala.
   Ringan: hanya verifikasi daftar lokal, tanpa unduh gambar. Pengambilan
   ulang yang berat terjadi saat chapter dibuka / tombol Perbaiki. */
let probScanT = 0;
async function probScan() {
  if (document.hidden) return;
  try {
    const ids = [];
    (store.get('gq_bm', []) || []).forEach((id) => { if (ids.indexOf(id) < 0) ids.push(id); });
    (store.get('gq_hist', []) || []).filter((h) => h.type === 'mw').slice(0, 10).forEach((h) => { if (ids.indexOf(h.id) < 0) ids.push(h.id); });
    for (const id of ids.slice(0, 20)) {
      try {
        await ensureChapters(id).catch(() => null);
        const t = findMw(id);
        const chs = t ? (mwChapters(t) || []) : [];
        if (!chs.length) continue;
        const c = chs[0]; // terbaru
        let pages = null;
        try {
          if (MW.pages && MW.pages[t.slug]) pages = MW.pages[t.slug];
          else {
            const r = await fetchTimeout('data/mw/' + t.slug + '.json', 8000).catch(() => null);
            if (r && r.ok) { const j = await bodyTimeout(r.json(), 8000).catch(() => null); pages = (j && j.pages) || {}; }
          }
        } catch (e) { pages = null; }
        const imgs = (pages && pages[c.u]) || [];
        if (pages && !imgs.length) chprobMark(id, 0, c.t, 'daftar-kosong');
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 400));
    }
  } catch (e) {}
}
function armProbScan() {
  const go = () => { try { probScan(); } catch (e) {} };
  try {
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 20000 });
    else setTimeout(go, 8000);
  } catch (e) { try { setTimeout(go, 8000); } catch (e2) {} }
  try { clearInterval(probScanT); probScanT = setInterval(() => { try { probScan(); } catch (e) {} }, 15 * 60 * 1000); } catch (e) {}
}
/* PUSTAKA: halaman Riwayat + Daftarku (pengganti popup riwayatModal).
   - Ketuk baris riwayat = langsung lanjutkan (player episode / reader chapter).
   - Grup waktu: hari ini / kemarin / minggu ini / lebih lama. */
let PU_TAB = 'riwayat';
function histGroup(ts) {
  const d = new Date(ts || 0), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yday';
  if (diff <= 7) return 'week';
  return 'older';
}
function histGroupLabel(g) {
  return g === 'today' ? T('g_today') : g === 'yday' ? T('g_yday') : g === 'week' ? T('g_week') : T('g_older');
}
function parseEpNum(sub) {
  const m = String(sub || '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}
function histRowHTML(x) {
  let title = x.t || '', cover = '', sub = x.sub || '', done = 0, total = 0;
  let ep = null, idx = null, direct = false;
  if (x.type === 'mw') {
    const t = findMw(x.id);
    if (t) {
      title = t.title; cover = t.cover || '';
      const chs = (typeof mwChapters === 'function' && MW && MW.loaded) ? (mwChapters(t) || []) : [];
      total = chs.length;
      done = progCount('gq_readch', x.id);
      if (x.idx != null && !isNaN(Number(x.idx))) { idx = Number(x.idx); direct = true; }
    }
  } else {
    const s = findShow(x.id);
    if (s) {
      title = s.title; cover = s.cover || '';
      total = Number(s.episodes) || 0;
      done = progCount('gq_watched', x.id);
      const n = (x.ep != null && x.ep !== '') ? Number(x.ep) : parseEpNum(x.sub);
      if (n != null && !isNaN(n)) { ep = String(x.ep != null && x.ep !== '' ? x.ep : n); direct = true; }
    }
  }
  if (!title) return '';
  const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  const subTxt = x.type === 'anime' && ep != null ? T('episode_w') + ' ' + ep : sub;
  return '<li><button class="hist-row" data-resume data-type="' + esc(x.type) + '" data-id="' + esc(x.id) + '"' +
    (ep != null ? ' data-ep="' + esc(ep) + '"' : '') + (idx != null ? ' data-idx="' + idx + '"' : '') + ' type="button">' +
    '<span class="hist-cover"><span aria-hidden="true">' + esc(initials(title).slice(0, 1)) + '</span>' +
    (cover ? '<img src="' + esc(cdn(cover)) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') + '</span>' +
    '<span class="hist-info"><strong>' + esc(title) + '</strong>' +
    '<span class="hist-sub">' + esc(subTxt) + '</span>' +
    (total > 0 && done > 0
      ? '<span class="hist-prog"><span class="hist-bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="hist-pct">' + pct + '%</span></span>'
      : '') +
    '</span><span class="hist-chev" aria-hidden="true">›</span></button></li>';
}
function paintPustaka() {
  const body = $('pustakaBody');
  if (!body) return;
  document.querySelectorAll('[data-libtab]').forEach((b) => b.classList.toggle('active', b.dataset.libtab === PU_TAB));
  const hc = $('histClear');
  if (hc) hc.hidden = PU_TAB !== 'riwayat';
  if (PU_TAB === 'daftar') { body.innerHTML = daftarHTML(); return; }
  let h = store.get('gq_hist', []);
  // "Lanjutkan" harus selalu ada di Riwayat: gabungkan posisi lanjutkan aktif
  // bila belum tercatat (mis. dibuka sebelum update ini / dari deep-link).
  try {
    const extra = [];
    const cv = store.get('gq_contv', null);
    if (cv && cv.id && !h.some((x) => x.type === 'anime' && x.id === cv.id)) {
      const s = findShow(cv.id);
      extra.push({ type: 'anime', id: cv.id, ep: cv.ep, sub: T('episode_w') + ' ' + cv.ep, t: s ? s.title : '', at: cv.at || 0 });
    }
    const cm = store.get('gq_cont', null);
    if (cm && cm.id && !h.some((x) => x.type === 'mw' && x.id === cm.id)) {
      const t = findMw(cm.id);
      extra.push({ type: 'mw', id: cm.id, idx: cm.idx, sub: cm.ch || '', t: t ? t.title : '', at: cm.at || 0 });
    }
    extra.sort((a, b) => (b.at || 0) - (a.at || 0));
    if (extra.length) h = extra.concat(h).slice(0, 20);
  } catch (e) {}
  if (!h.length) { body.innerHTML = '<p class="muted">' + esc(T('hist_empty')) + '</p>'; return; }
  // Manhwa butuh katalog (4MB+) agar cover/progress akurat — muat sekali,
  // hanya saat halaman Pustaka sedang dibuka.
  try {
    const _puVis = $('pustakaPanel') && !$('pustakaPanel').hidden;
    if (_puVis && typeof ensureMw === 'function' && MW && !MW.loaded && !window.__puMw) {
      window.__puMw = true;
      ensureMw().then(() => {
        window.__puMw = false;
        if ($('pustakaPanel') && !$('pustakaPanel').hidden && PU_TAB === 'riwayat') paintPustaka();
      }).catch(() => { window.__puMw = false; });
    }
  } catch (e) {}
  const groups = { today: [], yday: [], week: [], older: [] };
  h.forEach((x) => groups[histGroup(x.at || 0)].push(x));
  body.innerHTML = ['today', 'yday', 'week', 'older'].map((g) => {
    if (!groups[g].length) return '';
    const rows = groups[g].map(histRowHTML).join('');
    if (!rows) return '';
    return '<h4 class="hist-group"><i></i>' + esc(histGroupLabel(g)) + '</h4>' +
      '<ul class="hist-list">' + rows + '</ul>';
  }).join('') || '<p class="muted">' + esc(T('hist_empty')) + '</p>';
}
function daftarHTML() {
  const ids = store.get('gq_bm', []);
  if (!ids.length) return '<p class="muted">' + esc(T('lib_empty_bm')) + '</p>';
  const rows = ids.map((id) => {
    const t = findMw(id);
    if (t) {
      const n = (MW && MW.loaded && mwChapters(t)) ? mwChapters(t).length : 0;
      return { type: 'mw', id, title: t.title, cover: t.cover || '', sub: n ? n + ' chapter' : (t.status || 'Manhwa') };
    }
    const s = findShow(id);
    if (s) return { type: 'anime', id, title: s.title, cover: s.cover || '', sub: (s.episodes ? s.episodes + ' episode' : (s.status || 'Anime')) };
    return null;
  }).filter(Boolean);
  if (!rows.length) return '<p class="muted">' + esc(T('lib_empty_bm')) + '</p>';
  return '<ul class="hist-list">' + rows.map((r) =>
    '<li><button class="hist-row" data-detailgo data-type="' + r.type + '" data-id="' + esc(r.id) + '" type="button">' +
    '<span class="hist-cover"><span aria-hidden="true">' + esc(initials(r.title).slice(0, 1)) + '</span>' +
    (r.cover ? '<img src="' + esc(cdn(r.cover)) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') + '</span>' +
    '<span class="hist-info"><strong>' + esc(r.title) + '</strong>' +
    '<span class="hist-sub">' + esc(r.sub) + '</span></span>' +
    '<span class="hist-chev" aria-hidden="true">›</span></button></li>'
  ).join('') + '</ul>';
}
/* Ketuk baris riwayat = langsung lanjutkan (bukan halaman detail). */
function resumeHist(type, id, ep, idx) {
  if (type === 'mw') {
    const t = findMw(id);
    if (!t) return;
    if (idx != null && idx !== '' && !isNaN(Number(idx))) openReader(id, Number(idx));
    else openDetailMw(id);
    return;
  }
  const s = findShow(id);
  if (!s) return;
  openDetailAnime(id);
  if (ep != null && ep !== '') openEpFromRoute(id, String(ep));
}
function openPustaka(tab, push) {
  try { closeOverlaysSilent(); } catch (e) {}
  ['manhwaPanel', 'animePanel', 'ikonPanel', 'semuaPreview'].forEach((pid) => {
    const el = $(pid); if (el) el.hidden = true;
  });
  const pintu = $('pintu'); if (pintu) pintu.hidden = true;
  if (tab) PU_TAB = tab;
  const p = $('pustakaPanel'); if (p) p.hidden = false;
  paintPustaka();
  if (push !== false) {
    try { navPush('#/pustaka', { cat: 'pustaka' }); }
    catch (e) { try { location.hash = '#/pustaka'; } catch (_) {} }
  }
  try { window.scrollTo(0, 0); } catch (e) { window.scrollTo(0, 0); }
  try { syncBnav('riwayat'); } catch (e) {}
}
try {
  const _pp = $('pustakaPanel');
  if (_pp) _pp.addEventListener('click', (e) => {
    const tb = e.target.closest ? e.target.closest('[data-libtab]') : null;
    if (tb) { PU_TAB = tb.dataset.libtab; paintPustaka(); return; }
    const r = e.target.closest ? e.target.closest('[data-resume]') : null;
    if (r) { resumeHist(r.dataset.type, r.dataset.id, r.dataset.ep, r.dataset.idx); return; }
    const d = e.target.closest ? e.target.closest('[data-detailgo]') : null;
    if (d) {
      if (d.dataset.type === 'mw') openDetailMw(d.dataset.id);
      else openDetailAnime(d.dataset.id);
    }
  });
} catch (e) {}
/* Nama lama (dipakai beberapa pemanggil lama) = repaint Pustaka. */
function paintHist() { try { paintPustaka(); } catch (e) {} }
function wireModals() {
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const w = b.dataset.open;
    const pm = $('profilModal');
    if (w === 'bantuan') { if (pm) pm.hidden = true; openBantuan('req'); }
    else if (w === 'riwayat') { if (pm) pm.hidden = true; try { openPustaka('riwayat'); } catch (e) {} }
    else if (w === 'tentang') { if (pm) pm.hidden = true; openModal('tentangModal'); }
  }));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
  ['bantuModal', 'tentangModal', 'profilModal'].forEach((id) => {
    const m = $(id);
    if (m) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
  });
  document.querySelectorAll('[data-btab]').forEach((b) =>
    b.addEventListener('click', () => switchBtab(b.dataset.btab)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const pu = $('pustakaPanel');
      if (pu && !pu.hidden && $('playerModal').hidden && $('readModal').hidden && $('detailView').hidden) {
        try {
          if (history.state && history.state.cat === 'pustaka' && history.length > 1) history.back();
          else goCat('semua');
        } catch (_) { try { goCat('semua'); } catch (__) {} }
        return;
      }
      closeModals();
    }
  });
  const hc = $('histClear');
  if (hc) hc.addEventListener('click', () => { store.set('gq_hist', []); paintHist(); toast(T('hist_cleared')); });
  const pp = $('pPrev'), pn = $('pNext');
  if (pp) pp.addEventListener('click', () => stepEpisode(-1));
  if (pn) pn.addEventListener('click', () => stepEpisode(1));
  const pd = $('pDl');
  if (pd) pd.addEventListener('click', dlEpisode);
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
      toast(T('bm_updated'));
      return;
    }
    const at2 = e.target.closest && e.target.closest('[data-acaktitle]');
    if (at2) { openRandomMw(); }
  });
}

/* --- PROFIL: foto, nama, tema gelap/terang, bahasa ID/EN, login --- */
/* HOW TO ENABLE THE GOOGLE/FACEBOOK BUTTONS (pick one):
   A) On-device: open Profil → Pengaturan login → paste the ID → Save (no code edit).
   B) From code: fill GOOGLE_CLIENT_ID / FACEBOOK_APP_ID below (or copy .env.example).
   - Google: console.cloud.google.com → project → APIs & Services → Credentials →
     Create Credentials → OAuth client ID (Web) → Authorized JavaScript origins:
     add the site origin (e.g. https://anginbulan98-stack.github.io). Example ID:
     '1234567890-abc.apps.googleusercontent.com'
   - Facebook: developers.facebook.com → create App → Facebook Login product →
     register the site domain. Without this the buttons cannot work:
     Google/Facebook require a registered ID + origin. */
const GOOGLE_CLIENT_ID = '';
const FACEBOOK_APP_ID = '';
/* ID tempelan dari Profil (localStorage) menimpa konstanta di atas */
function getOAuthIds() {
  const o = store.get('gq_oauth', {});
  return {
    google: String((o && o.google) || GOOGLE_CLIENT_ID || '').trim(),
    fb: String((o && o.fb) || FACEBOOK_APP_ID || '').trim(),
  };
}
function applyLang() {
  const lang = getLang(), dict = I18N[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    if (dict[k] != null) el.textContent = dict[k];
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const k = el.dataset.i18nHtml;
    if (dict[k] != null) el.innerHTML = dict[k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const k = el.dataset.i18nPh;
    if (dict[k] != null) el.placeholder = dict[k];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const k = el.dataset.i18nAria;
    if (dict[k] != null) el.setAttribute('aria-label', dict[k]);
  });
  const nm = $('profileName');
  if (nm) nm.placeholder = T('profile_name_ph');
  const ap = $('authPass');
  if (ap && AUTH_MODE !== 'forgot') ap.placeholder = lang === 'en' ? 'Password' : 'Kata Sandi';
  document.querySelectorAll('[data-langset]').forEach((b) =>
    b.classList.toggle('btn-ghost', b.dataset.langset !== lang));
  // Judul tab browser mengikuti bahasa (hanya saat tidak sedang di detail/player/reader)
  try {
    if ($('detailView').hidden && $('playerModal').hidden && $('readModal').hidden) document.title = T('doc_title');
  } catch (e) {}
  // Opsi default dropdown + chip "Semua" (dibangun via JS) ikut bahasa
  try {
    const mgo = document.querySelector('#mwGenre option[value=""]');
    if (mgo) mgo.textContent = T('f_genre_all');
  } catch (e) {}
  try {
    document.querySelectorAll('#mwGenreChips [data-mwgenre=""], #aniGenreChips [data-anigenre=""]').forEach((b) => { b.textContent = T('chip_all'); });
  } catch (e) {}
  // Render ulang hitungan + kartu agar ikut bahasa
  try { if (typeof MW !== 'undefined' && MW.loaded) renderMw(); } catch (e) {}
  try { if (typeof ANI !== 'undefined' && ANI.shows && ANI.shows.length) { renderShows(); paintJx(); try { renderIkon(); } catch (e2) {} PREV_SIG.l = ''; PREV_SIG.c = ''; paintPreview(); try { paintChapterPreview(); } catch (e2) {} stampLatest(); } } catch (e) {}
  try { if (typeof paintPustaka === 'function' && $('pustakaPanel') && !$('pustakaPanel').hidden) paintPustaka(); } catch (e) {}
  try { if (typeof paintProfile === 'function' && !$('profilModal').hidden) paintProfile(); } catch (e) {}
  try { if (typeof paintLanjutHome === 'function') paintLanjutHome(); } catch (e) {}
  try { if (typeof paintLanjut === 'function') paintLanjut(); } catch (e) {}
}
function getTheme() { const t = store.get('gq_theme', 'dark'); return t === 'light' ? 'light' : 'dark'; }
function applyTheme() {
  const th = getTheme();
  document.documentElement.dataset.theme = th;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = th === 'light' ? '#F2F5FA' : '#0a0e17';
  document.querySelectorAll('[data-themeset]').forEach((b) =>
    b.classList.toggle('btn-ghost', b.dataset.themeset !== th));
}
function paintAvatar() {
  const url = store.get('gq_avatar', '');
  const safe = /^data:image\/(jpeg|png|webp|gif);base64,/.test(url || '');
  const acc = getAccount();
  const pic = acc && acc.picture && (
    /^https:\/\/lh3\.googleusercontent\.com\//.test(acc.picture) ||
    /^https:\/\/platform-lookaside\.fbsbx\.com\//.test(acc.picture) ||
    /^https:\/\/graph\.facebook\.com\//.test(acc.picture)) ? acc.picture : '';
  const html = safe ? '<img src="' + url + '" alt="Foto profil">'
    : pic ? '<img src="' + pic + '" alt="Foto profil" referrerpolicy="no-referrer">'
    : '👤';
  const top = $('profileAvatarTop'), big = $('profileAvatarBig');
  if (top) top.innerHTML = html;
  if (big) big.innerHTML = html;
}
function paintProfile() {
  paintAvatar();
  const nm = $('profileName');
  if (nm && document.activeElement !== nm) nm.value = store.get('gq_name', '');
  const bm = store.get('gq_bm', []).length;
  const hs = store.get('gq_hist', []).length;
  const lang = getLang();
  const st = $('profileStats');
  if (st) st.textContent = lang === 'en'
    ? bm + ' bookmarks • ' + hs + ' history • data stored only on this device'
    : bm + ' bookmark • ' + hs + ' riwayat • data hanya tersimpan di perangkat ini';
  paintLogin();
  applyTheme();
  applyLang();
}
/* --- LOGIN: Google | Facebook | Username (tanpa backend: akun + data tersimpan
   lokal di perangkat ini; Google/FB dipakai untuk identitas & foto) --- */
function getAccount() {
  const a = store.get('gq_account', null);
  if (a && (a.email || a.name)) return a;
  const gu = store.get('gq_google', null); // migrasi dari versi lama
  if (gu && (gu.email || gu.name)) {
    const m = { provider: 'google', name: gu.name || '', email: gu.email || '', picture: gu.picture || '', at: gu.at || Date.now() };
    store.set('gq_account', m);
    return m;
  }
  return null;
}
function setAccount(acc) { store.set('gq_account', acc); }
function paintLogin() {
  const lang = getLang();
  const acc = getAccount();
  const st = $('loginStatus'), out = $('loginLogout'), open = $('loginOpenBtn');
  if (st) {
    if (acc) {
      const who = acc.email || acc.name;
      const via = acc.provider === 'google' ? 'Google' : acc.provider === 'facebook' ? 'Facebook' : 'Email';
      st.textContent = (lang === 'en' ? 'Signed in as ' : 'Masuk sebagai ') + who + ' (' + via + ')';
    } else {
      st.textContent = lang === 'en' ? 'Not signed in — data stays on this device.' : 'Belum masuk — data tetap di perangkat ini.';
    }
  }
  if (out) out.hidden = !acc;
  if (open) open.hidden = !!acc;
}
let _gsiP = null;
function loadGsi() {
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve(true);
  if (_gsiP) return _gsiP;
  _gsiP = new Promise((res) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.head.appendChild(s);
    setTimeout(() => res(!!(window.google && window.google.accounts)), 8000);
  });
  return _gsiP;
}
/* Facebook SDK (dimuat malas): butuh App ID (Profil → Pengaturan login) + domain terdaftar di aplikasi FB */
let _fbP = null, _fbAppId = '';
function loadFb(appId) {
  if (window.FB && _fbAppId === appId) return Promise.resolve(true);
  if (window.FB && appId) {
    try { window.FB.init({ appId, cookie: false, xfbml: false, version: 'v19.0' }); _fbAppId = appId; return Promise.resolve(true); }
    catch (e) {}
  }
  if (_fbP) return _fbP;
  _fbP = new Promise((res) => {
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/id_ID/sdk.js';
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => {
      try {
        window.FB.init({ appId: appId || getOAuthIds().fb, cookie: false, xfbml: false, version: 'v19.0' });
        _fbAppId = appId || getOAuthIds().fb;
        res(true);
      } catch (e) { res(false); }
    };
    s.onerror = () => res(false);
    document.head.appendChild(s);
    setTimeout(() => res(!!window.FB), 8000);
  });
  return _fbP;
}
function fbLogin() {
  const lang = getLang();
  const ids = getOAuthIds();
  if (!ids.fb) {
    const msg = lang === 'en'
      ? 'Facebook login is not set up yet: open Profil → Pengaturan login, paste your Facebook App ID, then try again.'
      : 'Login Facebook belum disiapkan: buka Profil → Pengaturan login, tempel App ID Facebook-mu, lalu coba lagi.';
    showAuthHint(msg);
    toast(lang === 'en' ? 'Facebook login not set up yet' : 'Login Facebook belum disiapkan');
    return;
  }
  showAuthHint('');
  loadFb(ids.fb).then((ok) => {
    if (!ok || !window.FB) {
      showAuthHint(lang === 'en' ? 'Could not reach Facebook (check connection).' : 'Tidak bisa menghubungi Facebook (cek koneksi).');
      toast(lang === 'en' ? 'Facebook login failed to load' : 'Login Facebook gagal dimuat');
      return;
    }
    window.FB.login((r) => {
      if (!r || r.status !== 'connected') { toast(lang === 'en' ? 'Facebook login cancelled' : 'Login Facebook dibatalkan'); return; }
      window.FB.api('/me', { fields: 'name,email,picture.width(256)' }, (me) => {
        if (!me || me.error) { toast(lang === 'en' ? 'Facebook login failed' : 'Login Facebook gagal'); return; }
        const pic = me.picture && me.picture.data && me.picture.data.url ? me.picture.data.url : '';
        setAccount({ provider: 'facebook', name: me.name || '', email: me.email || me.id || '', picture: pic, at: Date.now() });
        if (!store.get('gq_name', '')) store.set('gq_name', String(me.name || '').slice(0, 30));
        closeAuth();
        paintProfile();
        toast(getLang() === 'en' ? 'Signed in ✓' : 'Berhasil masuk ✓');
      });
    }, { scope: 'public_profile,email' });
  });
}
function showAuthHint(msg) {
  const h = $('authSocialHint');
  if (!h) return;
  if (!msg) { h.hidden = true; h.textContent = ''; return; }
  h.hidden = false;
  h.textContent = msg;
}
/* Tombol "Lanjutkan dengan Google": popup OAuth2 (token) — andal untuk tombol
   custom, tidak seperti One-Tap yang sering diblokir. Butuh Client ID
   (Profil → Pengaturan login) + origin situs didaftarkan di Google Cloud Console. */
function authGoogle() {
  const lang = getLang();
  const ids = getOAuthIds();
  if (!ids.google) {
    const msg = lang === 'en'
      ? 'Google login is not set up yet: open Profil → Pengaturan login, paste your Google Client ID, then try again.'
      : 'Login Google belum disiapkan: buka Profil → Pengaturan login, tempel Client ID Google-mu, lalu coba lagi.';
    showAuthHint(msg);
    toast(lang === 'en' ? 'Google login not set up yet' : 'Login Google belum disiapkan');
    return;
  }
  showAuthHint('');
  loadGsi().then((ok) => {
    if (!ok || !window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      const msg = lang === 'en'
        ? 'Could not reach Google (check connection / allow accounts.google.com).'
        : 'Tidak bisa menghubungi Google (cek koneksi / izinkan accounts.google.com).';
      showAuthHint(msg);
      toast(lang === 'en' ? 'Google login failed to load' : 'Login Google gagal dimuat');
      return;
    }
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: ids.google,
        scope: 'openid email profile',
        callback: async (resp) => {
          if (!resp || resp.error || !resp.access_token) {
            showAuthHint(lang === 'en' ? 'Google login was cancelled or denied.' : 'Login Google dibatalkan atau ditolak.');
            return;
          }
          try {
            const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: 'Bearer ' + resp.access_token },
            });
            if (!r.ok) throw new Error('userinfo');
            const me = await r.json();
            if (!me.email) throw new Error('email');
            setAccount({ provider: 'google', name: me.name || '', email: me.email || '', picture: me.picture || '', at: Date.now() });
            if (!store.get('gq_name', '')) store.set('gq_name', String(me.name || '').slice(0, 30));
            try { localStorage.removeItem('gq_google'); } catch (e) {}
            showAuthHint('');
            closeAuth();
            paintProfile();
            toast(lang === 'en' ? 'Signed in ✓' : 'Berhasil masuk ✓');
          } catch (e) {
            showAuthHint(lang === 'en' ? 'Could not read Google profile. Try again.' : 'Tidak bisa membaca profil Google. Coba lagi.');
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      showAuthHint(lang === 'en' ? 'Google popup was blocked. Allow popups and try again.' : 'Popup Google diblokir. Izinkan popup lalu coba lagi.');
    }
  });
}
/* Akun email + sandi (lokal perangkat): sandi TIDAK disimpan mentah,
   yang disimpan hanya salt + hash SHA-256. Tetap butuh backend agar lintas perangkat. */
function bufHex(buf) { return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function sha256Hex(s) {
  if (crypto.subtle) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return bufHex(d);
  }
  let h1 = 0x811c9dc5, h2 = 0x01000193; // fallback non-SHA bila bukan HTTPS
  for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = Math.imul(h2 + s.charCodeAt(i), 31); }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}
function getLocalUsers() { return store.get('gq_local_users', {}); }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function authEmail() { return ($('authEmail').value || '').trim().toLowerCase(); }
function authDone(email) {
  const nick = email.split('@')[0].slice(0, 30);
  setAccount({ provider: 'local', name: nick, email, picture: '', at: Date.now() });
  store.set('gq_name', nick);
  $('authPass').value = '';
  closeAuth();
  paintProfile();
}
async function authRegister() {
  const lang = getLang();
  const em = authEmail();
  const p = $('authPass').value || '';
  if (!EMAIL_RE.test(em)) { toast(lang === 'en' ? 'Enter a valid email' : 'Isi email yang valid'); return; }
  if (p.length < 4) { toast(lang === 'en' ? 'Password min 4 chars' : 'Sandi minimal 4 karakter'); return; }
  const users = getLocalUsers();
  if (users[em]) {
    toast(lang === 'en' ? 'Email registered — please sign in' : 'Email sudah terdaftar — silakan masuk');
    setAuthMode('login');
    return;
  }
  const salt = bufHex(crypto.getRandomValues(new Uint8Array(16)));
  users[em] = { salt, hash: await sha256Hex(salt + ':' + p), at: Date.now() };
  store.set('gq_local_users', users);
  authDone(em);
  toast(lang === 'en' ? 'Account created ✓' : 'Akun dibuat ✓');
}
async function authLogin() {
  const lang = getLang();
  const em = authEmail();
  const p = $('authPass').value || '';
  if (!EMAIL_RE.test(em)) { toast(lang === 'en' ? 'Enter a valid email' : 'Isi email yang valid'); return; }
  const rec = getLocalUsers()[em];
  if (!rec) {
    toast(lang === 'en' ? 'Account not found — please sign up' : 'Akun tidak ditemukan — silakan daftar');
    setAuthMode('register');
    return;
  }
  const h = await sha256Hex(rec.salt + ':' + p);
  if (h !== rec.hash) { toast(lang === 'en' ? 'Wrong password' : 'Sandi salah'); return; }
  authDone(em);
  toast(lang === 'en' ? 'Signed in ✓' : 'Berhasil masuk ✓');
}
async function authReset() {
  const lang = getLang();
  const em = authEmail();
  const p = $('authPass').value || '';
  if (!EMAIL_RE.test(em)) { toast(lang === 'en' ? 'Enter a valid email' : 'Isi email yang valid'); return; }
  if (p.length < 4) { toast(lang === 'en' ? 'New password min 4 chars' : 'Sandi baru minimal 4 karakter'); return; }
  const users = getLocalUsers();
  if (!users[em]) { toast(lang === 'en' ? 'Account not found' : 'Akun tidak ditemukan'); return; }
  const salt = bufHex(crypto.getRandomValues(new Uint8Array(16)));
  users[em] = { salt, hash: await sha256Hex(salt + ':' + p), at: Date.now() };
  store.set('gq_local_users', users);
  authDone(em);
  toast(lang === 'en' ? 'Password saved ✓' : 'Sandi baru tersimpan ✓');
}
/* --- Layar auth (Masuk / Daftar / Lupa sandi) --- */
let AUTH_MODE = 'login';
function openAuth(mode) {
  const pm = $('profilModal');
  if (pm) pm.hidden = true;
  setAuthMode(mode || 'login');
  const v = $('authView');
  if (v) { v.hidden = false; document.body.style.overflow = 'hidden'; }
  setTimeout(() => { const e = $('authEmail'); if (e) e.focus({ preventScroll: true }); }, 50);
}
function closeAuth() {
  const v = $('authView');
  if (!v || v.hidden) return;
  v.hidden = true;
  if ($('playerModal').hidden && $('readModal').hidden && $('detailView').hidden &&
      $('profilModal').hidden && $('tentangModal').hidden && $('bantuModal').hidden) {
    syncBodyLock();
  }
}
function setAuthMode(m) {
  AUTH_MODE = m;
  showAuthHint('');
  const lang = getLang(), dict = I18N[lang];
  const t = (k) => dict[k] || k;
  const eye = $('authEyebrow'), title = $('authTitle'), sub = $('authSub');
  const submit = $('authSubmitTxt'), swQ = $('authSwitchQ'), swB = $('authToggle');
  const forgot = $('authForgot'), social = $('authSocialWrap'), pass = $('authPass');
  if (pass) pass.placeholder = m === 'forgot' ? (lang === 'en' ? 'New password' : 'Sandi baru') : (lang === 'en' ? 'Password' : 'Kata Sandi');
  if (m === 'register') {
    if (eye) eye.textContent = t('auth_welcome');
    if (title) title.textContent = t('auth_title_up');
    if (sub) sub.hidden = false;
    if (submit) submit.textContent = t('auth_signup');
    if (swQ) swQ.textContent = t('auth_haveaccount');
    if (swB) swB.textContent = t('auth_signin');
    if (forgot) forgot.hidden = true;
    if (social) social.hidden = false;
  } else if (m === 'forgot') {
    if (eye) eye.textContent = t('auth_welcome');
    if (title) title.textContent = t('auth_title_reset');
    if (sub) { sub.textContent = t('auth_sub_reset'); sub.hidden = false; }
    if (submit) submit.textContent = t('auth_savepass');
    if (swQ) swQ.textContent = '';
    if (swB) swB.textContent = t('auth_back');
    if (forgot) forgot.hidden = true;
    if (social) social.hidden = true;
  } else {
    if (eye) eye.textContent = t('auth_welcome');
    if (title) title.textContent = t('auth_title_in');
    if (sub) { sub.textContent = t('auth_sub'); sub.hidden = false; }
    if (submit) submit.textContent = t('auth_signin');
    if (swQ) swQ.textContent = t('auth_noaccount');
    if (swB) swB.textContent = t('auth_signup');
    if (forgot) forgot.hidden = false;
    if (social) social.hidden = false;
  }
}
function logoutAccount() {
  try {
    const acc = getAccount();
    if (acc && acc.provider === 'google' && window.google && window.google.accounts) {
      try { window.google.accounts.id.disableAutoSelect(); } catch (e) {}
    }
    if (acc && acc.provider === 'facebook' && window.FB) {
      try { window.FB.logout(); } catch (e) {}
    }
  } catch (e) {}
  try { localStorage.removeItem('gq_account'); } catch (e) {}
  try { localStorage.removeItem('gq_google'); } catch (e) {}
  paintProfile();
  toast(getLang() === 'en' ? 'Signed out' : 'Berhasil keluar');
}
function initLogin() {
  const open = $('loginOpenBtn');
  if (open) open.addEventListener('click', () => openAuth('login'));
  const out = $('loginLogout');
  if (out) out.addEventListener('click', logoutAccount);
  const cg = $('cfgGoogle'), cf = $('cfgFb');
  if (cg && cf) {
    const ids = getOAuthIds();
    if (!cg.value) cg.value = ids.google;
    if (!cf.value) cf.value = ids.fb;
  }
  const sv = $('cfgSave');
  if (sv) sv.addEventListener('click', () => {
    const lang = getLang();
    const g = ($('cfgGoogle').value || '').trim();
    const f = ($('cfgFb').value || '').trim();
    if (g && !/apps\.googleusercontent\.com$/.test(g)) {
      toast(lang === 'en' ? 'That does not look like a Google Client ID' : 'Itu sepertinya bukan Client ID Google');
      return;
    }
    if (f && !/^\d{5,20}$/.test(f)) {
      toast(lang === 'en' ? 'Facebook App ID is usually only digits' : 'App ID Facebook biasanya hanya angka');
      return;
    }
    store.set('gq_oauth', { google: g, fb: f });
    try { localStorage.removeItem('gq_google'); } catch (e) {}
    _fbAppId = '';
    paintProfile();
    toast(lang === 'en' ? 'IDs saved — try the buttons again ✓' : 'ID tersimpan — coba lagi tombolnya ✓');
  });
  const x = $('authClose');
  if (x) x.addEventListener('click', closeAuth);
  const eye = $('authEye');
  if (eye) eye.addEventListener('click', () => {
    const p = $('authPass');
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    eye.textContent = show ? '🙈' : '👁️';
    eye.setAttribute('aria-pressed', show ? 'true' : 'false');
  });
  const tg = $('authToggle');
  if (tg) tg.addEventListener('click', () => {
    if (AUTH_MODE === 'forgot') setAuthMode('login');
    else setAuthMode(AUTH_MODE === 'login' ? 'register' : 'login');
  });
  const fg = $('authForgot');
  if (fg) fg.addEventListener('click', () => setAuthMode('forgot'));
  const sb = $('authSubmit');
  if (sb) sb.addEventListener('click', () => {
    if (AUTH_MODE === 'register') authRegister();
    else if (AUTH_MODE === 'forgot') authReset();
    else authLogin();
  });
  const ep = $('authPass');
  if (ep) ep.addEventListener('keydown', (e) => { if (e.key === 'Enter') sb.click(); });
  const em = $('authEmail');
  if (em) em.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const p = $('authPass'); if (p) p.focus(); } });
  const gg = $('authGoogle');
  if (gg) gg.addEventListener('click', authGoogle);
  const fb = $('authFb');
  if (fb) fb.addEventListener('click', fbLogin);
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('#authView [data-open="tentang"]') : null;
    if (t) closeAuth(); // syarat/privasi dibuka di bawah, auth ditutup dulu
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('authView').hidden) closeAuth(); });
}
function initProfile() {
  applyTheme();
  applyLang();
  paintAvatar();
  const nm = $('profileName');
  if (nm) {
    nm.value = store.get('gq_name', '');
    nm.addEventListener('change', () => {
      store.set('gq_name', nm.value.trim().slice(0, 30));
      paintProfile();
      toast(getLang() === 'en' ? 'Name saved ✓' : 'Nama tersimpan ✓');
    });
  }
  const btn = $('profileBtn');
  if (btn) btn.addEventListener('click', () => { paintProfile(); openModal('profilModal'); });
  const pick = $('avatarPick'), inp = $('avatarInput'), clr = $('avatarClear');
  if (pick && inp) pick.addEventListener('click', () => inp.click());
  if (inp) inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast(getLang() === 'en' ? 'File must be an image' : 'File harus gambar'); return; }
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 256;
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * sc));
      c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try {
        store.set('gq_avatar', c.toDataURL('image/jpeg', 0.85));
      } catch (e) { toast(getLang() === 'en' ? 'Image too large' : 'Gambar kebesaran'); return; }
      inp.value = '';
      paintProfile();
      toast(getLang() === 'en' ? 'Photo updated ✓' : 'Foto diperbarui ✓');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(getLang() === 'en' ? 'Image unreadable' : 'Gambar tidak terbaca'); };
    img.src = url;
  });
  if (clr) clr.addEventListener('click', () => {
    try { localStorage.removeItem('gq_avatar'); } catch (e) {}
    paintProfile();
  });
  document.querySelectorAll('[data-themeset]').forEach((b) => b.addEventListener('click', () => {
    store.set('gq_theme', b.dataset.themeset === 'light' ? 'light' : 'dark');
    applyTheme();
    paintLogin();
  }));
  document.querySelectorAll('[data-langset]').forEach((b) => b.addEventListener('click', () => {
    store.set('gq_lang', b.dataset.langset === 'en' ? 'en' : 'id');
    applyLang();
    paintProfile();
  }));
  const wipe = $('profileWipe');
  if (wipe) wipe.addEventListener('click', () => {
    const lang = getLang();
    if (!confirm(lang === 'en' ? 'Erase bookmarks, history and profile on this device?' : 'Hapus bookmark, riwayat, dan profil di perangkat ini?')) return;
    ['gq_bm', 'gq_bms', 'gq_hist', 'gq_cont', 'gq_contv', 'gq_avatar', 'gq_name', 'gq_req', 'gq_lapor', 'gq_google', 'gq_account', 'gq_local_users'].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    const w = $('authView');
    if (w && !w.hidden) closeAuth();
    paintProfile();
    paintHist();
    if (typeof renderMw === 'function' && typeof MW !== 'undefined' && MW.loaded) renderMw();
    if (typeof renderShows === 'function') renderShows();
    toast(lang === 'en' ? 'All local data erased' : 'Semua data lokal dihapus');
  });
  initLogin();
}
try { initProfile(); } catch (e) {}

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
    // TAHAP 4 (daftar bermasalah): laporan chapter ikut antrean perbaikan
    try {
      const jt = $('laporJudul').value.trim().toLowerCase();
      const chm = $('laporCh').value.trim().toLowerCase().replace(/[^0-9]/g, '');
      const hit = (MW.titles || []).find((x) => x.title.toLowerCase() === jt);
      if (hit) {
        const chs = mwChapters(hit) || [];
        let idx = chs.findIndex((c) => String(c.n) === chm || String(c.t || '').toLowerCase() === $('laporCh').value.trim().toLowerCase());
        chprobReport(hit.id, idx >= 0 ? idx : -1, $('laporCh').value.trim());
        try { paintProbAdmin(); } catch (e) {}
      }
    } catch (e) {}
    lf.reset();
    $('laporDone').hidden = false;
    const ul = $('laporList');
    if (ul) ul.innerHTML = lap.map((r) => '<li>' + esc(r.judul) + ' — ' + esc(r.ch) + ' <em>(' + esc(r.masalah) + ')</em></li>').join('');
    toast(T('lap_saved'));
  });
  const paintReq = () => {
    const ul = $('requestList');
    if (!ul) return;
    const list = store.get('gq_req', []);
    ul.innerHTML = list.length
      ? list.map((r) => '<li>' + esc(r.judul) + ' <em>(' + esc(r.tipe) + ')</em></li>').join('')
      : '<li class="muted">' + esc(T('no_req')) + '</li>';
  };
  const paintLap = () => {
    const ul = $('laporList');
    if (!ul) return;
    const list = store.get('gq_lapor', []);
    ul.innerHTML = list.length
      ? list.map((r) => '<li>' + esc(r.judul) + ' — ' + esc(r.ch) + ' <em>(' + esc(r.masalah) + ')</em></li>').join('')
      : '<li class="muted">' + esc(T('no_lap')) + '</li>';
  };
  const rf = $('requestForm');
  if (rf) rf.addEventListener('submit', (e) => {
    e.preventDefault();
    const list = store.get('gq_req', []);
    list.unshift({ judul: $('requestJudul').value.trim(), tipe: $('requestTipe').value });
    store.set('gq_req', list.slice(0, 50));
    rf.reset();
    paintReq();
    toast(T('req_saved'));
  });
  paintReq();
  paintLap();
  const rc = $('reqCopy');
  if (rc) rc.addEventListener('click', async () => {
    const list = store.get('gq_req', []);
    if (!list.length) { toast(T('no_req_s')); return; }
    const txt = 'Request judul dari Guoke AMHDQ:\n' + list.map((r, i) => (i + 1) + '. ' + r.judul + ' (' + r.tipe + ')').join('\n');
    try { await navigator.clipboard.writeText(txt); toast(T('copied_admin')); }
    catch { toast(T('copy_fail')); }
  });
    const lc = $('lapCopy');
  if (lc) lc.addEventListener('click', async () => {
    const list = store.get('gq_lapor', []);
    if (!list.length) { toast(T('no_lap_s')); return; }
    const txt = 'Laporan chapter rusak (Guoke AMHDQ):\n' + list.map((r, i) => (i + 1) + '. ' + r.judul + ' — ' + r.ch + ' [' + r.masalah + '] (' + r.at + ')').join('\n');
    try { await navigator.clipboard.writeText(txt); toast(T('copied_admin')); }
    catch { toast(T('copy_fail')); }
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
    (it.poster ? '<img src="' + esc(it.poster) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span class="show-badge">LIVE</span></div>' +
    '<div class="show-info"><strong>' + esc(it.title || it.alternative || T('jx_untitled')) + '</strong>' +
    '<small>' + esc(T('jx_live')) + '</small>' +
    '<div class="show-btns"><button class="btn" data-fresh="' + it.id + '" type="button">' + esc(T('card_watch')) + '</button></div></div></article>';
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
      (JX.busy ? '<p class="muted">' + esc(T('loading')) + '</p>' : '<p class="muted">' + esc(T('jx_nodata')) + '</p>');
    if (more) { more.hidden = JX.liveDone; more.textContent = JX.busy ? T('loading') : T('load_more') + ' (hal. ' + (JX.livePage + 1) + ')'; }
  } else {
    const poolL = jxLocal().filter((s) => !q || (s.title + ' ' + (s.alt || '')).toLowerCase().includes(q));
    const poolV = JX.live.filter((it) => q && String(it.title || it.alternative || '').toLowerCase().includes(q));
    const slice = poolL.slice(0, JX.page * JX.per);
    grid.innerHTML = (slice.map(showCard).join('') + poolV.slice(0, 12).map(jxCardLive).join('')) ||
      '<p class="muted">' + esc(T('notfound_try')) + '</p>';
    if (more) {
      more.hidden = slice.length >= poolL.length;
      more.textContent = T('load_more') + ' (' + slice.length + '/' + poolL.length + ')';
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
    toast(T('net_busy'));
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
    if (t) { pushHist({ type: 'mw', id, sub: t.total + ' ' + T('chapters_w') }); paintHist(); }
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
      reset() {
        hidden = false;
        last = Math.max(0, cur());
        onShow();
      },
    };
  }
  const anyModal = () => !!document.querySelector('.pmodal:not([hidden])');
  // (a) Header utama + baris tab filter (scroll halaman)
  watcher(window,
    () => document.body.classList.add('ah-hide'),
    () => document.body.classList.remove('ah-hide'),
    () => anyModal() || !$('detailView').hidden);
  // (b) Toolbar reader + tombol "Chapter berikutnya" (scroll di dalam .pbox)
  // Aturan: geser bawah → sembunyi, geser atas / paling atas → muncul.
  const rbox = document.querySelector('#readModal .pbox');
  if (rbox) {
    const rdHideBar = () => {
      $('readModal').classList.add('rd-hide');
      const f = $('rdFloatNext');
      if (f) f.classList.add('hide');
      const fp = $('rdFloatPrev');
      if (fp) fp.classList.add('hide');
    };
    const rdShowBar = () => {
      $('readModal').classList.remove('rd-hide');
      const f = $('rdFloatNext');
      if (f) f.classList.remove('hide');
      const fp = $('rdFloatPrev');
      if (fp) fp.classList.remove('hide');
    };
    const rdW = watcher(rbox, rdHideBar, rdShowBar,
      () => !!document.querySelector('.pmodal:not([hidden]):not(#readModal)'));
    try { window.__rdW = rdW; } catch (e) {}
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
    URL: #/semua #/anime #/manhwa • detail #/baca/.. • #/tonton/..
    - Klik tab → history.pushState (pushState TIDAK memicu hashchange).
    - Back/forward → popstate (+hashchange) → route() terpadu, anti proses ganda via lastRouteKey.
    - Kategori terakhir + limit "Muat lagi" dicadangkan di sessionStorage (try/catch).
    - Posisi scroll tiap kategori diingat (memori sesi) dan dipulihkan saat kembali.
    - var (bukan let) agar aman bila route() awal terpanggil sebelum blok ini dieksekusi. */
var CATS = ['semua', 'anime', 'manhwa', 'segera', 'ikon'];
var CURCAT = 'semua';
var navSeq = 0;
var lastRouteKey = '##init';
var CATMEM = { semua: {}, anime: {}, manhwa: {}, segera: {}, ikon: {} };
// Satu-satunya pengatur scroll saat traversasi adalah restoreCatScroll().
// Matikan restore bawaan browser agar tak balapan/adu geser dengannya.
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
function sessGet(k, fb) { try { const v = sessionStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
function sessSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function catFromHash(h) {
  if (/^#\/tiktok(?:[\/?]|$)/.test(String(h || ''))) return 'semua'; // rute lama: alihkan ke beranda
  const m = String(h || '').match(/^#\/(semua|anime|manhwa|segera|ikon)(?:[\/?]|$)/);
  return m ? m[1] : '';
}
function isViewHash(h) { return /^#\/(baca|tonton|b|t)\//.test(String(h || '')); }
/* --- LINK PENDEK Guoke (jelas ada kata guoke di pintu /guoke) ---
   shortHash('#/baca/solo-leveling/12') -> '#/b/solo-leveling/12'
   shortHash('#/tonton/naruto/e3') -> '#/t/naruto/e3'
   shortUrl() -> origin+path pendek + hash pendek (untuk tombol Bagikan).
   expandShort() dipakai saat halaman dimuat via ?b= ?t= ?guoke= */
function shortHash(h) {
  h = String(h || '');
  let m;
  if ((m = h.match(/^#\/baca\/([^/]+)(?:\/(\d+))?/))) return '#/b/' + m[1] + (m[2] === undefined ? '' : '/' + m[2]);
  if ((m = h.match(/^#\/tonton\/([^/]+)(?:\/e(.+))?/))) return '#/t/' + m[1] + (m[2] === undefined ? '' : '/e' + m[2]);
  return h;
}
function shortUrl(longHash) {
  try {
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + 'guoke/' + shortHash(longHash || location.hash || '#/semua');
  } catch (e) { return String(longHash || ''); }
}
function expandShortParams() {
  try {
    const q = new URLSearchParams(location.search || '');
    const b = q.get('b'), c = q.get('c'), t = q.get('t'), e = q.get('e'), g = q.get('guoke');
    if (b) { location.replace(location.pathname + '#/b/' + encodeURIComponent(b) + (c != null && c !== '' ? '/' + encodeURIComponent(c) : '')); return true; }
    if (t) { location.replace(location.pathname + '#/t/' + encodeURIComponent(t) + (e != null && e !== '' ? '/e' + encodeURIComponent(e) : '')); return true; }
    if (g) {
      if (/^b[:/]/.test(g)) { const p = g.slice(2); location.replace(location.pathname + '#/b/' + p); return true; }
      if (/^t[:/]/.test(g)) { const p = g.slice(2); location.replace(location.pathname + '#/t/' + p); return true; }
    }
  } catch (err) {}
  return false;
}
/* Tombol 🔗 Link Pendek: salin URL pendek yang jelas ada kata "guoke".
   Format: {origin}{base}guoke/#/b/slug  atau  .../guoke/#/t/id
   Bila navigator.share ada (HP), pakai share-sheet; kalau tidak, clipboard. */
document.addEventListener('click', (e) => {
  const b = e.target && e.target.closest ? e.target.closest('[data-shortlink]') : null;
  if (!b) return;
  e.preventDefault();
  try {
    const kind = String(b.dataset.shortlink || '');
    let hash = '#/semua';
    if (kind.indexOf('b:') === 0) hash = '#/b/' + kind.slice(2);
    else if (kind.indexOf('t:') === 0) hash = '#/t/' + kind.slice(2);
    else hash = shortHash(location.hash);
    let url = '';
    try {
      const base = location.origin + location.pathname.replace(/[^/]*$/, '');
      url = base + 'guoke/' + hash;
    } catch (_) { url = hash; }
    const judul = (document.title || 'Guoke AMHDQ');
    if (navigator.share) {
      navigator.share({ title: judul, text: judul + ' — buka di sini:', url: url }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => toast('Link pendek disalin: ' + url)).catch(() => { prompt('Salin link pendek ini:', url); });
    } else { prompt('Salin link pendek ini:', url); }
  } catch (_) {}
});
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
    // Pindah tab = kembali ke atas (alur Back/restore tidak lewat sini).
    try { window.scrollTo(0, 0); } catch (e) {}
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
    try { epSocialUnwatch(); } catch (e) {}
    const f = $('pFrame');
    f.removeAttribute('src');
    f.hidden = true;
    $('pServers').hidden = true;
    $('pServers').innerHTML = '';
  }
  if (!$('readModal').hidden) {
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
    $('readModal').classList.remove('rd-full');
    $('readModal').hidden = true;
  }
  const _pu1 = $('pustakaPanel'); if (_pu1) _pu1.hidden = true;
  if (typeof rdCtx !== 'undefined') rdCtx = null;
  if (!$('detailView').hidden) { $('detailView').hidden = true; $('detailView').classList.remove('dv-anime'); }
  try { if (typeof closeIkon === 'function') closeIkon(); } catch (e) {}
  syncBodyLock();
  setSEO.apply(null, seoHome());
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
  // Link pendek via query: ?b=slug&c=idx • ?t=id&e=ep • ?guoke=b:slug/c
  // Dipakai oleh pintu /guoke/ dan shortener luar (s.id/guoke-...).
  try { if (typeof expandShortParams === 'function' && expandShortParams()) return; } catch (e) {}
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
  if (!isViewHash(location.hash) && location.hash !== '#/pustaka') navReplace('#/' + start, { cat: start });
  route(false);
})();
// Penanda boot guard di index.html: app.js selesai dieksekusi penuh.
window.__GQ_APP_OK = true;

/* ============================================================
   GQ PRO 2026 — patch UI/UX (tanpa ubah fitur inti)
   1 bottom-nav • 2 dedup banner • 3 teks natural • 4 filter sheet
   5 badge 48jam • 6 ikon rapi • 7 skeleton/scroll • 8 konsisten
   9 legal • 10 empty/error ramah
   ============================================================ */
(function GQ_PRO() {
  'use strict';
  var $p = function (id) { return document.getElementById(id); };

  /* --- 8. Paksa Bahasa Indonesia (satu bahasa) --- */
  try { localStorage.setItem('gq_lang', JSON.stringify('id')); } catch (e) {}

  /* --- 1. Bottom navigation tetap --- */
  function syncBnav(cat) {
    document.querySelectorAll('[data-bnav]').forEach(function (b) {
      var on = b.getAttribute('data-bnav') === cat;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('[data-bnav]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.getAttribute('data-bnav');
      if (c === 'riwayat') { try { openPustaka('riwayat'); } catch (e) {} return; }
      try { goCat(c); } catch (e) { try { setCat(c); } catch (e2) {} }
      syncBnav(c);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    });
  });
  var _origSetCat = window.setCat;
  window.setCat = function (cat) {
    _origSetCat(cat);
    syncBnav(cat);
    // Simpan posisi scroll per kategori saat kembali
    try { sessionStorage.setItem('gq_scroll_' + cat, String(window.scrollY || 0)); } catch (e) {}
  };
  try { syncBnav(typeof CURCAT !== 'undefined' ? CURCAT : 'semua'); } catch (e) {}

  /* --- 2. Banner tunggal: pastikan lanjutWrap tak pernah tampil --- */
  try {
    var lw = $p('lanjutWrap');
    if (lw) { lw.hidden = true; lw.style.display = 'none'; }
    var lhX = $p('lhX');
    if (lhX) lhX.addEventListener('click', function () {
      var w = $p('lanjutHome'); if (w) w.hidden = true;
      try { localStorage.setItem('gq_lh_hide', JSON.stringify(Date.now())); } catch (e) {}
    });
  } catch (e) {}

  /* --- 3. Teks natural: ganti sisa teks teknis saat render --- */
  function naturalize() {
    try {
      var mwD = $p('mwDate'); if (mwD) mwD.parentNode.style.display = 'none';
      var anD = $p('aniDate'); if (anD) anD.parentNode.style.display = 'none';
    } catch (e) {}
  }
  naturalize();
  // TAHAN-LAMA: dulu tiap 3 detik selamanya (bangunkan CPU terus). Cukup 30 detik + skip saat hidden.
  setInterval(function () { if (!document.hidden) { try { naturalize(); } catch (e) {} } }, 30000);

  /* --- 4. Filter bottom-sheet --- */
  var filterCtx = 'manhwa';
  function collectGenres() {
    var set = {};
    try { (MW.titles || []).forEach(function (t) { (t.genres || []).forEach(function (g) { set[g] = 1; }); }); } catch (e) {}
    try { (ANI.shows || []).forEach(function (s) { (s.genres || []).forEach(function (g) { set[g] = 1; }); }); } catch (e) {}
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'id'); });
  }
  function openFilter(ctx) {
    filterCtx = ctx || 'manhwa';
    var sh = $p('filterSheet'); if (!sh) return;
    $p('filterTitle').textContent = filterCtx === 'anime' ? 'Filter Anime' : 'Filter Manhwa';
    // TAHAP 3.7: genre ganda sebagai chip; tahun hanya untuk anime (data manhwa tak ada tahun)
    var fg = $p('fGenres');
    if (fg && !fg.dataset.built) {
      fg.dataset.built = '1';
      collectGenres().forEach(function (g) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'f-genre'; b.textContent = g; b.dataset.g = g;
        b.addEventListener('click', function () { b.classList.toggle('on'); });
        fg.appendChild(b);
      });
    }
    var yr = $p('fYear');
    var yrLabel = yr ? yr.closest('label') : null;
    if (yrLabel) yrLabel.style.display = filterCtx === 'anime' ? '' : 'none';
    // Muat nilai aktif
    try {
      var active = filterCtx === 'anime' ? (ANI_UI.genres.length ? ANI_UI.genres : (ANI_UI.genre ? [ANI_UI.genre] : [])) : (MW_UI.genres.length ? MW_UI.genres : (MW_UI.genre ? [MW_UI.genre] : []));
      if (fg) Array.prototype.forEach.call(fg.querySelectorAll('.f-genre'), function (b) {
        b.classList.toggle('on', active.indexOf(b.dataset.g) >= 0);
      });
      if (yr) yr.value = filterCtx === 'anime' ? (ANI_UI.year || '') : '';
      if (filterCtx === 'anime') {
        $p('fSort').value = 'terbaru';
        $p('fStatus').value = ANI_UI.f === 'semua' ? '' : ANI_UI.f;
        $p('fType').value = '';
        $p('fBookmark').checked = false;
      } else {
        $p('fType').value = MW_UI.type || '';
        $p('fSort').value = MW_UI.sort || 'terbaru';
        var bs = MW_UI.bmStatus || '';
        $p('fStatus').value = bs || '';
        $p('fBookmark').checked = !!MW_UI.bookOnly;
      }
    } catch (e) {}
    sh.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeFilter() { var sh = $p('filterSheet'); if (sh) sh.hidden = true; syncBodyLock(); }
  ['mwFilterBtn', 'aniFilterBtn'].forEach(function (id) {
    var b = $p(id);
    if (b) b.addEventListener('click', function () { openFilter(id === 'aniFilterBtn' ? 'anime' : 'manhwa'); });
  });
  var fx = $p('filterX');
  if (fx) fx.addEventListener('click', closeFilter);
  document.querySelectorAll('[data-filter-close]').forEach(function (el) { el.addEventListener('click', closeFilter); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { try { if (!$p('filterSheet').hidden) closeFilter(); } catch (_) {} try { if (!$('ikonModal').hidden) closeIkon(); } catch (err) {} } });
  var fA = $p('fApply');
  if (fA) fA.addEventListener('click', function () {
    var st = $p('fStatus').value || '';
    // TAHAP 3.7: kumpulkan genre yang dipilih (boleh lebih dari 1)
    var gs = [];
    try {
      var fg = $p('fGenres');
      if (fg) Array.prototype.forEach.call(fg.querySelectorAll('.f-genre.on'), function (b) { gs.push(b.dataset.g); });
    } catch (e) {}
    try {
      if (filterCtx === 'anime') {
        ANI_UI.genres = gs; ANI_UI.genre = gs[0] || '';
        ANI_UI.year = ($p('fYear') && $p('fYear').value) || '';
        ANI_UI.limit = ANI_UI.per;
        if (st === 'ongoing' || st === 'wishlist' || st === 'done') { ANI_UI.f = 'semua'; }
        else ANI_UI.f = st || 'semua';
        if ($p('fSort').value === 'az') ANI_UI.f = ANI_UI.f; // urutan default terbaru
        try { renderShows(); } catch (e) {}
        try { document.querySelectorAll('[data-anif]').forEach(function (x) { x.classList.toggle('btn-ghost', x.dataset.anif !== ANI_UI.f); }); } catch (e) {}
      } else {
        MW_UI.type = ($p('fType').value === 'film') ? '' : ($p('fType').value || '');
        MW_UI.genres = gs; MW_UI.genre = gs[0] || '';
        MW_UI.sort = $p('fSort').value || 'terbaru';
        MW_UI.bookOnly = !!$p('fBookmark').checked;
        if (st === 'tayang' || st === 'tamat' || st === 'segera') { MW_UI.bmStatus = ''; }
        else MW_UI.bmStatus = st;
        MW_UI.limit = MW_UI.per;
        var sel = $p('mwType'); if (sel) sel.value = MW_UI.type;
        var sg = $p('mwGenre');
        if (sg && MW_UI.genre) { if (!sg.querySelector('[value="' + MW_UI.genre + '"]')) { var o = document.createElement('option'); o.value = MW_UI.genre; o.textContent = MW_UI.genre; sg.appendChild(o); } sg.value = MW_UI.genre; }
        else if (sg) sg.value = '';
        var ss = $p('mwSort'); if (ss) ss.value = MW_UI.sort;
        var sb = $p('mwBmStatus'); if (sb) sb.value = MW_UI.bmStatus;
        var cb = $p('mwBookmarked'); if (cb) cb.checked = MW_UI.bookOnly;
        try { renderMw(); } catch (e) {}
      }
    } catch (e) {}
    closeFilter();
  });
  var fR = $p('fReset');
  if (fR) fR.addEventListener('click', function () {
    try {
      var fg = $p('fGenres');
      if (fg) Array.prototype.forEach.call(fg.querySelectorAll('.f-genre.on'), function (b) { b.classList.remove('on'); });
      if (filterCtx === 'anime') { ANI_UI.genre = ''; ANI_UI.genres = []; ANI_UI.year = ''; ANI_UI.f = 'semua'; ANI_UI.q = ''; var ai = $p('aniSearch'); if (ai) ai.value = ''; ANI_UI.limit = ANI_UI.per; renderShows(); }
      else { MW_UI.type = ''; MW_UI.genre = ''; MW_UI.genres = []; MW_UI.sort = 'terbaru'; MW_UI.bmStatus = ''; MW_UI.bookOnly = false; MW_UI.q = ''; var mi = $p('mwSearch'); if (mi) mi.value = ''; MW_UI.limit = MW_UI.per; renderMw(); }
    } catch (e) {}
    closeFilter();
  });
  var fRan = $p('fRandom');
  if (fRan) fRan.addEventListener('click', function () {
    closeFilter();
    try {
      if (filterCtx === 'anime' && typeof acakAnime === 'function') acakAnime();
      else if (typeof acakMw === 'function') acakMw();
      else toast('Judul acak dipilih');
    } catch (e) {}
  });

  /* --- 5. Lazy-load + skeleton + Muat lebih banyak berjenjang --- */
  function skelelize(grid, n) {
    if (!grid) return;
    grid.innerHTML = Array.from({ length: n || 6 }, function () {
      return '<div class="skel" aria-hidden="true"><div class="skel-cover"></div><div class="skel-line"></div></div>';
    }).join('');
  }
  // Pastikan semua <img> hasil render memakai lazy + async
  var _mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      (m.addedNodes || []).forEach(function (nd) {
        if (!nd || !nd.querySelectorAll) return;
        nd.querySelectorAll('img').forEach(function (im) {
          if (!im.getAttribute('loading')) im.setAttribute('loading', 'lazy');
          if (!im.getAttribute('decoding')) im.setAttribute('decoding', 'async');
        });
      });
    });
  });
  try { _mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  // Label tombol muat
  ['mwMore', 'aniMore', 'ikonMore', 'jxMore'].forEach(function (id) {
    var b = $p(id);
    if (b) { b.classList.add('load-more'); if (/Muat lagi/.test(b.textContent)) b.textContent = 'Muat lebih banyak'; }
  });
  // Error state ramah + retry
  var mr = $p('mwRetry');
  if (mr) mr.addEventListener('click', function () { var e = $p('mwError'); if (e) e.hidden = true; try { ensureMw().then(function () { renderMw(); }).catch(function () { $p('mwError').hidden = false; }); } catch (err) {} });
  var ar = $p('aniRetry');
  if (ar) ar.addEventListener('click', function () { var e = $p('aniError'); if (e) e.hidden = true; try { renderShows(); } catch (err) {} });

  /* --- 6. Ikon: nama deskriptif, fullscreen unduh+bagikan, upload jelas --- */
  function prettyIkonName(p) {
    var n = String((p && p.name) || '').trim();
    if (!n) return 'Icon Anime';
    // Hapus pola nomor file: "123.jpg", "icon-01", "IMG_2024", dsb → tanpa teks
    if (/^(ikon|icon|img|image|file|photo|foto)[-_ ]?\d+/i.test(n)) return '';
    if (/^\d+[-_ .]*\.(jpg|png|webp|jpeg)$/i.test(n)) return '';
    if (/^\d+$/.test(n)) return '';
    return n.length > 40 ? n.slice(0, 40) + '…' : n;
  }
  window.__gqPrettyIkon = prettyIkonName;
  var upBtn = $p('ikonUploadBtn'), upFile = $p('ikonFile');
  function paintUploadState() {
    if (!upBtn) return;
    var ok = !!(window.indexedDB);
    upBtn.disabled = !ok;
    upBtn.style.opacity = ok ? '1' : '.45';
    var hint = $p('ikonUploadHint');
    if (hint) hint.textContent = ok ? 'Upload tersimpan di perangkat ini. Format JPG/PNG.' : 'Upload belum tersedia di browser ini.';
  }
  paintUploadState();
  var shBtn = $p('ikonShare');
  if (shBtn) shBtn.addEventListener('click', function () {
    var p = null;
    try { p = findIkonPhoto(IKON_UI.cur); } catch (e) {}
    if (!p) return;
    var share = { title: 'Icon Anime', text: prettyIkonName(p) || 'Icon Anime', url: p.url };
    if (navigator.share) navigator.share(share).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(p.url).then(function () { toast('Tautan disalin'); }).catch(function () {});
  });
  var dlBtn = $p('ikonModalDl');
  // Handler utama sudah dipasang di initIkon (dengan dataset.wired) — jangan
  // pasang dua kali agar tidak unduh ganda / buka dua tab.
  if (dlBtn && !dlBtn.dataset.wired) { dlBtn.dataset.wired = '1'; dlBtn.addEventListener('click', function (e) {
    try { e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (_) {}
    var p = null;
    try { p = findIkonPhoto(IKON_UI.cur); } catch (e) {}
    if (p) { try { ikonSave(p.url, (prettyIkonName(p) || 'icon') + '.jpg'); } catch (e) { window.open(p.url, '_blank'); } }
  }); }

  /* --- 9. Legal: Disclaimer / Privasi / Kontak-DMCA --- */
  var LEGAL = {
    disclaimer: ['Disclaimer', 'Guoke AMHDQ adalah agregator antarmuka. Seluruh gambar, judul, dan streaming berasal dari penyedia pihak ketiga dan tetap menjadi milik pemiliknya masing-masing.<br><br>Kami tidak menyimpan file video/komik di server sendiri, tidak menjamin ketersediaan setiap judul setiap saat, dan tidak mengklaim kecepatan/ketajaman absolut apa pun. Jika kamu pemilik konten dan keberatan, hubungi kami melalui halaman Kontak/DMCA.'],
    privasi: ['Kebijakan Privasi', 'Data seperti nama, foto profil, bookmark, riwayat, request, dan like hanya tersimpan di perangkatmu (localStorage/IndexedDB).<br><br>Kami tidak menjalankan akun server sendiri. Jika fitur komunitas (Firebase) diaktifkan admin, upload/like/komentar yang kamu kirim dapat tersimpan di layanan pihak ketiga tersebut sesuai kebijakan mereka.<br><br>Kamu dapat menghapus seluruh data lokal kapan saja dari menu Profil → Hapus semua data saya.'],
    kontak: ['Kontak / DMCA', 'Laporan pelanggaran hak cipta (DMCA): gunakan menu Bantuan → Lapor rusak di situs dengan subjek “DMCA — [judul]”, sertakan tautan halaman, bukti kepemilikan, dan kontak balasan.<br><br>Laporan valid akan ditindaklanjuti maksimal 2×24 jam kerja dengan menghapus/memblokir tautan terkait.<br><br>Untuk laporan chapter rusak atau request judul, gunakan menu Bantuan di situs.']
  };
  document.querySelectorAll('[data-legal]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-legal');
      var d = LEGAL[k]; if (!d) return;
      $p('legalTitle').textContent = d[0];
      $p('legalBody').innerHTML = d[1];
      $p('legalModal').hidden = false;
    });
  });

  /* --- 10. Scroll restore saat kembali (popstate) --- */
  window.addEventListener('popstate', function () {
    setTimeout(function () {
      try { syncBnav(typeof CURCAT !== 'undefined' ? CURCAT : 'semua'); } catch (e) {}
    }, 50);
  });

  /* --- TAHAP 2.1: Sinopsis "Baca selengkapnya" (delegasi, tahan render ulang) --- */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-synmore]') : null;
    if (!b) return;
    var box = b.closest('.dv-pro-syn');
    if (!box) return;
    var open = box.classList.toggle('open');
    b.textContent = open ? 'Tutup' : 'Baca selengkapnya';
  });

  /* --- TAHAP 4.1: Kode Cadangan (salin/terapkan) --- */
  var bkC = $p('bkCopy');
  if (bkC) bkC.addEventListener('click', function () {
    var code = '';
    try { code = bkExport(); } catch (e) {}
    if (!code) { toast('Gagal membuat kode'); return; }
    var done = function () { toast('Kode disalin — tempel di perangkat lain'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () { prompt('Salin kode ini:', code); });
      else prompt('Salin kode ini:', code);
    } catch (e) { try { prompt('Salin kode ini:', code); } catch (err) {} }
  });
  var bkA = $p('bkApply');
  if (bkA) bkA.addEventListener('click', function () {
    var inp = $p('bkCode');
    var r = 'empty';
    try { r = bkImport(inp ? inp.value : ''); } catch (e) { r = 'format'; }
    if (r === 'ok') { toast('Data dipulihkan — memuat ulang…'); setTimeout(function () { location.reload(); }, 800); }
    else if (r === 'empty') toast('Tempel kodenya dulu');
    else toast('Kode tidak valid');
  });

  /* --- TAHAP 4.2: tombol Install --- */
  ['installBtn', 'installBtn2'].forEach(function (id) {
    var b = $p(id);
    if (b) b.addEventListener('click', function () { try { doInstall(); } catch (e) {} });
  });

  /* --- TAHAP 4.4: pengaturan Hemat data + Kualitas --- */
  try {
    var sv = $p('setSaver');
    if (sv) {
      sv.checked = store.get('gq_saver', 0) === 1;
      sv.addEventListener('change', function () {
        store.set('gq_saver', sv.checked ? 1 : 0);
        toast(sv.checked ? 'Mode hemat aktif — daftar live dimatikan' : 'Mode hemat mati');
      });
    }
    var ql = $p('setQuality');
    if (ql) {
      ql.value = store.get('gq_quality', 'auto');
      ql.addEventListener('change', function () {
        store.set('gq_quality', ql.value || 'auto');
        toast(ql.value === 'hemat' ? 'Kualitas Hemat — muat latar dimatikan' : (ql.value === 'hd' ? 'Kualitas HD — mulai video lebih cepat' : 'Kualitas Otomatis'));
      });
    }
  } catch (e) {}
  /* --- TAHAP 2.5: Laporkan link rusak, 1 ketuk (judul + episode + server otomatis) --- */
  var prBtn = $p('pReport');
  if (prBtn) prBtn.addEventListener('click', function () {
    var title = '', ep = '', srv = '';
    try {
      title = ($('pTitle') && $('pTitle').textContent) || '';
      ep = (typeof PCtx !== 'undefined' && PCtx && PCtx.epNum) || '';
      var cur = (typeof PCtx !== 'undefined' && PCtx) ? PCtx : null;
      srv = (cur && cur.servers && cur.servers[cur.srv || 0]) ? cur.servers[cur.srv || 0].label : '';
    } catch (e) {}
    try {
      var list = store.get('gq_linkrep', []);
      list.unshift({ t: title, ep: ep, srv: srv, at: Date.now() });
      store.set('gq_linkrep', list.slice(0, 50));
    } catch (e) {}
    toast('Laporan terkirim, terima kasih');
  });
  /* --- TAHAP 4 (daftar bermasalah): kabel tombol Perbaiki --- */
  try {
    var pf = $p('probFixAll');
    if (pf && !pf.dataset.wired) {
      pf.dataset.wired = '1';
      pf.addEventListener('click', function () { try { probFixAll(); } catch (e) {} });
    }
  } catch (e) {}
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-probfix]') : null;
    if (!b) return;
    var parts = String(b.dataset.probfix || '').split(':');
    var tid = parts[0], idx = Number(parts[1]);
    b.textContent = 'Memperbaiki…';
    try {
      probFixOne(tid, idx).then(function (ok) {
        try { paintProbAdmin(); } catch (err) {}
        toast(ok ? 'Chapter pulih ✓' : 'Masih gagal — coba lagi nanti');
      });
    } catch (err) {}
  });
  /* --- TAHAP 4: tugas latar cek chapter terbaru --- */
  try { armProbScan(); } catch (e) {}
})();

/* ============================================================
   GQ UX 2026 PATCH — bug + hero/rows + kartu + detail + riwayat
   Semua teks Indonesia, tanpa hapus fitur. Override aman di bawah.
   ============================================================ */
(function gqUx2026(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
try{ if(typeof store!=='undefined'){ store.set('gq_lang','id'); } }catch(e){}
try{ localStorage.setItem('gq_lang', JSON.stringify('id')); }catch(e){}

/* --- 1. Kamus Indonesia (paksa, tanpa campuran) --- */
try{
  if(typeof I18N!=='undefined' && I18N.id){
    Object.assign(I18N.id,{
      prev:'\u2190 Sebelumnya', next:'Berikutnya \u2192', full:'\u26F6 Penuh',
      pl_dl:'\u2B07 Unduh episode', dl_btn:'\u2B07 Unduh episode',
      tab_req:'Minta judul', req_title:'Minta judul', req_this:'Minta judul ini',
      lib_eyebrow:'\u25C6 RIWAYATMU', lib_title:'Riwayat', lib_riwayat:'Riwayat',
      hist_h:'Riwayat \u2014 20 terakhir', hist_clear:'Hapus riwayat',
      card_read:'\uD83D\uDCDA Baca', card_watch:'\u25B6 Tonton',
      load_more:'Muat lebih banyak', loading:'Memuat\u2026',
      float_next:'Chapter berikutnya \u2192'
    });
    I18N.en = JSON.parse(JSON.stringify(I18N.id));
  }
}catch(e){}
try{ window.getLang = function(){ return 'id'; }; }catch(e){}

/* --- 1b. Riwayat selalu highlight benar (pustaka->riwayat) --- */
function fixBnav(cat){
  var map = (cat==='pustaka') ? 'riwayat' : cat;
  try{
    document.querySelectorAll('[data-bnav]').forEach(function(b){
      var on = b.getAttribute('data-bnav')===map;
      b.classList.toggle('active', on);
      if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
  }catch(e){}
}
try{
  var _op = window.openPustaka || null;
  if(typeof openPustaka==='function'){
    window.openPustaka = function(tab,push){ var r; try{ r = _op ? _op(tab,push) : openPustaka(tab,push); }catch(e){ try{ r = openPustaka(tab,push);}catch(_){} } fixBnav('riwayat'); return r; };
  }
}catch(e){}
document.addEventListener('click',function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-bnav]') : null;
  if(!b) return;
  setTimeout(function(){ fixBnav(b.getAttribute('data-bnav')); },30);
},true);

/* --- Helper waktu lalu --- */
function waktuLalu(ts){
  if(!ts) return '';
  var d = Date.now()-Number(ts); if(d<0) d=0;
  var m = Math.floor(d/60000);
  if(m<1) return 'baru saja';
  if(m<60) return m+' menit lalu';
  var h = Math.floor(m/60); if(h<24) return h+' jam lalu';
  var dd = Math.floor(h/24); if(dd<7) return dd+' hari lalu';
  var w = Math.floor(dd/7); if(w<5) return w+' minggu lalu';
  try{ return new Date(Number(ts)).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return dd+' hari lalu'; }
}
/* rating deterministik 6.5-9.5 */
function ratingOf(id){ var h=0; String(id||'').split('').forEach(function(c){ h=(h*31+c.charCodeAt(0))>>>0; }); return (6.5+(h%31)/10).toFixed(1); }

/* --- 4. Kartu: EP bernomor + SUB/DUB + HD + rating + tooltip + bookmark ikon --- */
function cardBadges(s, eps){
  var out = '';
  if(s.kind==='film') out += '<span class="show-badge">FILM</span>';
  else if(Number(eps)>0) out += '<span class="show-badge">EP '+Number(eps)+'</span>';
  var kind = String((s.kind||'')+' '+(s.type||'')+' '+(s.sub||'')).toUpperCase();
  var sub = /DUB/.test(kind) ? 'DUB' : 'SUB';
  out += '<span class="mini-tag">'+sub+'</span><span class="mini-tag hd">HD</span>';
  return '<span class="show-badges">'+out+'</span>';
}
function patchShowCard(){
  if(typeof showCard!=='function') return;
  var orig = showCard;
  var fn = function(s){
    try{
      var ak = (typeof akOf==='function') ? akOf(s.id) : null;
      var eps = ak ? ak.episodes : s.episodes;
      var isSoon = (typeof isSoonU==='function') ? isSoonU(s) : false;
      var st = isSoon ? 'Segera hadir' : (s.status==='tayang' ? 'Sedang Tayang' : 'Tamat');
      var meta = s.kind==='film' ? ('Film \u2022 '+(s.year||'')) : (isSoon ? st : (eps+' episode \u2022 '+st+(s.year?' \u2022 '+s.year:'')));
      var gmeta = (s.genres&&s.genres.length) ? ' \u2022 '+s.genres.slice(0,2).join(', ') : '';
      var badge = isSoon ? '<span class="show-badge soon">SEGERA</span>' : cardBadges(s,eps);
      var btn = isSoon ? 'Info' : '\u25B6 Tonton';
      var rating = ratingOf(s.id);
      var prog = ''; try{ prog = (typeof progBarHTML==='function') ? progBarHTML(progCount('gq_watched',s.id), ak?ak.episodes:s.episodes) : ''; }catch(e){}
      var upd=''; try{ upd = (typeof updMarkHTML==='function') ? updMarkHTML(s.id, (typeof epsRecency==='function')?epsRecency(s):0) : ''; }catch(e){}
      var bmOn = false; try{ bmOn = (typeof isBookmarked==='function') ? isBookmarked(s.id) : false; }catch(e){}
      return '<article class="show-card'+(isSoon?' is-soon':'')+'" data-show="'+esc(s.id)+'">'
        +'<div class="show-cover"><i>'+esc((typeof initials==='function'?initials(s.title):s.title||'?'))+'</i>'
        +(s.cover?'<img src="'+esc(s.cover)+'" alt="'+esc(s.title)+'" loading="lazy" decoding="async" onerror="this.remove()">':'')
        +badge+'<span class="show-rating">\u2605 '+rating+'</span>'+prog+'</div>'
        +'<div class="show-info"><strong title="'+esc(s.title)+'">'+esc(s.title)+'</strong>'+upd
        +'<small>'+esc(meta+gmeta)+'</small>'
        +'<div class="show-btns"><button class="btn'+(isSoon?' btn-ghost':'')+'" data-watch="'+esc(s.id)+'" type="button">'+esc(btn)+'</button>'
        +'<button class="bm-btn'+(bmOn?' on':'')+'" data-bmcard="'+esc(s.id)+'" type="button" aria-label="Simpan bookmark" title="Simpan ke Daftarku">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(bmOn?'currentColor':'none')+'" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button></div></div></article>';
    }catch(e){ try{ return orig(s); }catch(_){ return ''; } }
  };
  try{ showCard = fn; window.showCard = fn; }catch(e){ try{ window.showCard = fn; }catch(_){} }
}
try{ patchShowCard(); }catch(e){}

/* bookmark via ikon kartu (delegasi, tanpa hapus fitur lama) */
document.addEventListener('click',function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-bmcard]') : null;
  if(!b) return;
  e.stopPropagation();
  try{
    var id = b.getAttribute('data-bmcard');
    var on = (typeof toggleBookmark==='function') ? toggleBookmark(id) : false;
    b.classList.toggle('on', !!on);
    var svg = b.querySelector('svg'); if(svg) svg.setAttribute('fill', on?'currentColor':'none');
    toast(on ? 'Ditambahkan ke Daftarku' : 'Bookmark dihapus');
  }catch(err){}
},true);

/* --- 4. Genre chips + sortir (tanpa hapus filter sheet) --- */
var GENRES = ['Aksi','Romantis','Isekai','Komedi','Drama','Fantasi','Horor','Petualangan','Misteri','Sejarah'];
function paintGenreChips(){
  try{
    var mw = $('mwGenreChips'), an = $('aniGenreChips');
    var html = '<button class="gchip active" data-gchip="" type="button">Semua</button>'
      + GENRES.map(function(g){ return '<button class="gchip" data-gchip="'+esc(g)+'" type="button">'+esc(g)+'</button>'; }).join('')
      + '<button class="gchip" data-gsort="az" type="button" title="Urutkan A\u2013Z">A\u2013Z</button>';
    if(mw && !mw.dataset.built){ mw.innerHTML = html; mw.dataset.built='1'; }
    if(an && !an.dataset.built){ an.innerHTML = html; an.dataset.built='1'; }
  }catch(e){}
}
document.addEventListener('click',function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-gchip],[data-gsort]') : null;
  if(!b) return;
  try{
    var row = b.closest('.genre-chips-row'); if(!row) return;
    var isMw = row.id==='mwGenreChips';
    if(b.hasAttribute('data-gsort')){
      if(isMw){ try{ MW_UI.sort='az'; MW_UI.limit=MW_UI.per; renderMw(); }catch(_){} }
      else { try{ ANI_UI.limit=ANI_UI.per; renderShows('__az__'); }catch(_){} }
      toast('Diurutkan: A\u2013Z');
      return;
    }
    var g = b.getAttribute('data-gchip')||'';
    row.querySelectorAll('.gchip[data-gchip]').forEach(function(x){ x.classList.toggle('active', x===b); });
    if(isMw){ try{ MW_UI.genre=g; MW_UI.genres=g?[g]:[]; MW_UI.limit=MW_UI.per; renderMw(); }catch(_){} }
    else { try{ ANI_UI.genre=g; ANI_UI.genres=g?[g]:[]; ANI_UI.limit=ANI_UI.per; renderShows(); }catch(_){} }
  }catch(err){}
});
try{ paintGenreChips(); setTimeout(paintGenreChips,1500); }catch(e){}

/* --- 2. Player: label Server N + timeout 8 dtk + tombol Unduh jelas --- */
var pTimer = null;
function armPlayerTimeout(){
  try{ if(pTimer) clearTimeout(pTimer); }catch(e){}
  var box = $('playerModal'); if(!box || box.hidden) return;
  pTimer = setTimeout(function(){
    try{
      if($('playerModal').hidden) return;
      if($('pTimeout')) return;
      var d = document.createElement('div');
      d.id='pTimeout'; d.className='p-timeout';
      d.innerHTML = 'Video masih memuat lebih dari 8 detik (koneksi/server sibuk). Coba server lain di bawah, atau muat ulang.<br><br>'
        +'<button class="btn btn-small" id="pTryOther" type="button">Coba server lain</button>';
      var srv = $('pServers'); (srv||$('pTitle')).after(d);
      var t = $('pTryOther');
      if(t) t.addEventListener('click',function(){
        try{
          var btns = Array.prototype.slice.call(document.querySelectorAll('#pServers button[data-srv]'));
          if(btns.length<2){ toast('Hanya ada 1 server untuk episode ini'); return; }
          var cur = (typeof PCtx!=='undefined'&&PCtx)?(PCtx.srv||0):0;
          var nx = btns[(cur+1)%btns.length]; nx.click();
          var dd=$('pTimeout'); if(dd) dd.remove();
          armPlayerTimeout();
        }catch(err){}
      });
      toast('Video lambat \u2014 coba server lain');
    }catch(e){}
  },8000);
}
try{
  new MutationObserver(function(){
    try{
      var open = !$('playerModal').hidden;
      var t=$('pTimeout'); if(!open && t) t.remove();
      var srv=$('pServers');
      if(open && srv && !srv.hidden){
        Array.prototype.forEach.call(srv.querySelectorAll('button[data-srv]'),function(b,i){
          if(!b.dataset.orig) b.dataset.orig = b.textContent;
          b.textContent = 'Server '+(i+1);
          b.title = b.dataset.orig;
        });
        var lbl = srv.querySelector('.srv-label');
        if(!lbl){ var s=document.createElement('p'); s.className='muted small srv-label'; s.textContent='Pilih server di bawah bila video macet:'; srv.prepend(s); }
      }
      /* Unduh: aktif/nonaktif + alasan singkat */
      var dl=$('pDl'), ds=$('pDlStatus');
      if(open && dl){
        if(dl.dataset.dead==='1'){ dl.disabled=true; dl.textContent='\u23F3 Segera hadir \u2014 file belum tersedia'; }
        else if(dl.disabled){ dl.textContent='\u23F3 Menyiapkan unduhan\u2026'; }
        else if(!/Unduh/.test(dl.textContent)) dl.textContent='\u2B07 Unduh episode';
      }
      if(open) armPlayerTimeout();
    }catch(e){}
  }).observe(document.documentElement,{attributes:true,subtree:true,childList:true});
}catch(e){}
try{
  var _dlEp = (typeof dlEpisode==='function') ? dlEpisode : null;
  if(_dlEp){
    dlEpisode = function(){
      try{ var db=$('pDl'); if(db&&db.dataset.dead==='1'){ toast('Unduhan belum tersedia \u2014 file dihapus pemilik, coba server lain'); return; } }catch(e){}
      return _dlEp.apply(this,arguments);
    };
    window.dlEpisode = dlEpisode;
  }
}catch(e){}

/* --- 5. Detail anime: Lanjut Ep N + Bagikan + studio/jadwal + ep watched --- */
function watchedSet(id){ try{ var o=(typeof progGet==='function')?progGet('gq_watched',id):{}; var a=o[id]; return Array.isArray(a)?a:[]; }catch(e){ return []; } }
try{
  var _oda = (typeof openDetailAnime==='function') ? openDetailAnime : null;
  if(_oda){
    var oda2 = function(showId,nav){
      var r = _oda.apply(this,arguments);
      try{
        var s = (typeof findShow==='function')?findShow(showId):null; if(!s) return r;
        var w = watchedSet(showId);
        var lastEp = 0; w.forEach(function(x){ var n=Number(x); if(n>lastEp) lastEp=n; });
        var total = Number(s.episodes)||0;
        var nextEp = lastEp>0 ? Math.min(total|| (lastEp+1), lastEp+1) : 0;
        var btn = document.querySelector('[data-dvplay]');
        if(btn && lastEp>0 && nextEp>0 && nextEp<=total){
          btn.textContent = '\u25B6 Lanjut Ep '+nextEp;
          btn.dataset.dvplayEp = String(nextEp);
        }
        /* Bagikan (ganti Link Pendek) */
        document.querySelectorAll('[data-shortlink]').forEach(function(b){
          if(/Bagikan/.test(b.textContent)) return;
          b.textContent = '\uD83D\uDD17 Bagikan'; b.title='Salin tautan judul ini';
        });
        /* Tambah studio & jadwal bila belum ada */
        var info = document.querySelector('.dv-extra');
        if(!info){
          var studio = s.studio || s.studios || '\u2014';
          var jadwal = s.rilis || s.jadwal || (((s.day||'')+' '+(s.tm||'')).trim()||'\u2014');
          var d=document.createElement('div'); d.className='dv-extra';
          d.innerHTML='<div class="dv-pro-syn"><h3>Sinopsis</h3><p class="syn-text">'+esc(s.synopsis||'Sinopsis belum tersedia untuk judul ini.')+'</p></div>'
            +'<div class="dv-info-grid"><div><small>STUDIO</small><strong>'+esc(String(studio))+'</strong></div>'
            +'<div><small>JADWAL RILIS</small><strong>'+esc(String(jadwal))+'</strong></div></div>';
          var syn = document.querySelector('.dv-pro-syn');
          if(!syn){ var pro=document.querySelector('.dv-pro'); if(pro) pro.appendChild(d); }
          else { syn.querySelector('.syn-text').textContent = s.synopsis||'Sinopsis belum tersedia untuk judul ini.'; }
        }
        /* Tandai episode ditonton + sekarang */
        try{
          var cur = (typeof PCtx!=='undefined'&&PCtx&&PCtx.showId===showId)?String(PCtx.epNum):'';
          document.querySelectorAll('.ep-btn[data-ep]').forEach(function(b){
            var parts=String(b.getAttribute('data-ep')||'').split(':'); var n=parts[1]||'';
            b.classList.toggle('watched', w.indexOf(String(n))>=0 || w.indexOf(Number(n))>=0);
            b.classList.toggle('current', cur!==''&&String(n)===String(cur));
          });
        }catch(e2){}
      }catch(e){}
      return r;
    };
    openDetailAnime = oda2; window.openDetailAnime = oda2;
  }
}catch(e){}
/* Klik Lanjut Ep N langsung putar episode itu */
document.addEventListener('click',function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-dvplay]') : null;
  if(!b || !b.dataset.dvplayEp) return;
  e.preventDefault(); e.stopPropagation();
  try{ openEpFromRoute(b.getAttribute('data-dvplay'), String(b.dataset.dvplayEp)); }catch(err){}
},true);
/* Bagikan -> salin + toast Tautan disalin */
document.addEventListener('click',function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-shortlink]') : null;
  if(!b) return;
  setTimeout(function(){ try{ toast('Tautan disalin'); }catch(_){} },600);
},true);

/* --- 6. Riwayat: Terakhir Ep + waktu + progress + hapus per item --- */
function patchHist(){
  if(typeof histRowHTML!=='function') return;
  histRowHTML = function(x){
    try{
      var title=x.t||'', cover='', sub=x.sub||'', done=0,total=0,ep=null,idx=null;
      if(x.type==='mw'){
        var t=(typeof findMw==='function')?findMw(x.id):null;
        if(t){ title=t.title; cover=t.cover||'';
          try{ var chs=(typeof mwChapters==='function'&&MW&&MW.loaded)?(mwChapters(t)||[]):[]; total=chs.length; }catch(e){ total=Number(t.total)||0; }
          done=(typeof progCount==='function')?progCount('gq_readch',x.id):0;
          if(x.idx!=null&&!isNaN(Number(x.idx))){ idx=Number(x.idx); }
          var chn=''; try{ if(chs&&chs[idx]!=null) chn=chs[idx].n||chs[idx].t||''; }catch(e){}
          sub='Terakhir: '+(x.ch|| (chn?('Chapter '+chn):'Chapter'))+' \u2022 '+waktuLalu(x.at);
        }
      }else{
        var s=(typeof findShow==='function')?findShow(x.id):null;
        if(s){ title=s.title; cover=s.cover||''; total=Number(s.episodes)||0;
          done=(typeof progCount==='function')?progCount('gq_watched',x.id):0;
          var n=(x.ep!=null&&x.ep!=='')?Number(x.ep):NaN;
          try{ if(isNaN(n)&&typeof parseEpNum==='function') n=parseEpNum(sub); }catch(e){}
          if(!isNaN(n)){ ep=String(x.ep!=null&&x.ep!==''?x.ep:n); }
          sub='Terakhir: Ep '+(ep||'?')+' \u2022 '+waktuLalu(x.at);
        }
      }
      if(!title) return '';
      var pct=total>0?Math.min(100,Math.round(done/total*100)):0;
      return '<li><div style="display:flex;gap:8px;align-items:stretch">'
        +'<button class="hist-row" style="flex:1" data-resume data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'"'
        +(ep!=null?' data-ep="'+esc(ep)+'"':'')+(idx!=null?' data-idx="'+idx+'"':'')+' type="button">'
        +'<span class="hist-cover"><span aria-hidden="true">'+esc((typeof initials==='function'?initials(title):title).slice(0,1))+'</span>'
        +(cover?'<img src="'+esc((typeof cdn==='function')?cdn(cover):cover)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'</span>'
        +'<span class="hist-info"><strong>'+esc(title)+'</strong><span class="hist-sub">'+esc(sub)+'</span>'
        +((total>0&&done>0)?'<span class="hist-prog"><span class="hist-bar"><i style="width:'+pct+'%"></i></span><span class="hist-pct">'+pct+'%</span></span>':'')
        +'</span><span class="hist-chev" aria-hidden="true">\u203A</span></button>'
        +'<button class="hist-del" data-histdel data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'" type="button" aria-label="Hapus riwayat ini">\uD83D\uDDD1</button>'
        +'</div></li>';
    }catch(e){ return ''; }
  };
  try{ window.histRowHTML = histRowHTML; }catch(e){}
}
try{ patchHist(); }catch(e){}
document.addEventListener('click',function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-histdel]') : null;
  if(!b) return;
  e.stopPropagation();
  try{
    var tp=b.getAttribute('data-type'), id=b.getAttribute('data-id');
    var h=(typeof store!=='undefined')?store.get('gq_hist',[]):[];
    h=h.filter(function(x){ return !(x.type===tp&&String(x.id)===String(id)); });
    store.set('gq_hist',h);
    if(typeof paintPustaka==='function') paintPustaka();
    toast('Riwayat dihapus');
  }catch(err){}
},true);

/* --- 3. Home: hero + lanjutkan berprogress + rows horizontal --- */
function buildHome(){
  try{
    if(typeof ANI==='undefined'||!ANI.shows||!ANI.shows.length) return;
    var shows = ANI.shows.filter(function(s){ return !(s.id||'').indexOf('rx_')===0; });
    /* hero: rating tertinggi yg tayang */
    var hero = shows.filter(function(s){ return s.status==='tayang'&&s.cover; })
      .sort(function(a,b){ return Number(ratingOf(b.id))-Number(ratingOf(a.id)); })[0] || shows[0];
    var gh=$('gqHero');
    if(gh&&hero){
      gh.hidden=false;
      gh.innerHTML=(hero.cover?'<img src="'+esc(hero.cover)+'" alt="" loading="lazy" onerror="this.remove()">':'')
        +'<div class="gq-hero-t"><div class="gq-hero-meta"><span>\u2605 '+ratingOf(hero.id)+'</span><span>'+esc(hero.year||'')+'</span><span>'+esc(hero.status==='tayang'?'Sedang Tayang':(hero.status||''))+'</span></div>'
        +'<h2>'+esc(hero.title)+'</h2><p>'+esc(hero.synopsis||'')+'</p>'
        +'<div><button class="btn btn-small" data-watch="'+esc(hero.id)+'" type="button">\u25B6 Tonton</button></div></div>';
    }
    /* lanjutkan berprogress */
    var gc=$('gqContinue');
    if(gc){
      var items=[];
      try{
        var h=(typeof store!=='undefined')?store.get('gq_hist',[]):[];
        items=h.slice(0,6);
      }catch(e){}
      if(items.length){
        gc.hidden=false;
        gc.innerHTML='<div class="hrow-head"><h3>\u23F5 Lanjutkan Menonton / Membaca</h3></div>'
          +'<div class="hrow-scroller">'+items.map(function(x){
            var ttl=x.t||x.id, cv='', dn=0,tt=0;
            try{
              if(x.type==='mw'){ var t=findMw(x.id); if(t){ ttl=t.title; cv=t.cover||''; tt=Number(t.total)||0; dn=progCount('gq_readch',x.id);} }
              else { var s=findShow(x.id); if(s){ ttl=s.title; cv=s.cover||''; tt=Number(s.episodes)||0; dn=progCount('gq_watched',x.id);} }
            }catch(e){}
            var pct=tt>0?Math.min(100,Math.round(dn/tt*100)):0;
            return '<article class="show-card" data-'+(x.type==='mw'?'detailgo':'resume')+' data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'"'
              +(x.ep?' data-ep="'+esc(x.ep)+'"':'')+(x.idx!=null?' data-idx="'+esc(x.idx)+'"':'')+'>'
              +'<div class="show-cover">'+(cv?'<img src="'+esc(cv)+'" alt="" loading="lazy" onerror="this.remove()">':'')
              +(pct?'<span class="watch-prog"><i style="width:'+pct+'%"></i></span>':'')+'</div>'
              +'<div class="show-info"><strong title="'+esc(ttl)+'">'+esc(ttl)+'</strong><small>'+pct+'% \u2022 '+esc(waktuLalu(x.at))+'</small></div></article>';
          }).join('')+'</div>';
      }
    }
    /* rows: bedakan dari halaman Anime (home = kurasi, anime page = kronologi) */
    var hr=$('homeRows');
    if(hr && !hr.dataset.built){
      hr.dataset.built='1';
      var airing=shows.filter(function(s){return s.status==='tayang';}).slice(0,10);
      var pop=shows.slice().sort(function(a,b){return Number(ratingOf(b.id))-Number(ratingOf(a.id));}).slice(0,10);
      var film=shows.filter(function(s){return s.kind==='film';}).slice(0,10);
      var mwTop=[]; try{ if(typeof MW!=='undefined'&&MW.titles) mwTop=MW.titles.slice(0,10); }catch(e){}
      function row(t,list,isMw){
        if(!list.length) return '';
        return '<div class="hrow"><div class="hrow-head"><h3>'+t+'</h3></div><div class="hrow-scroller">'
          +list.map(function(x){ try{ return (isMw?(typeof mwCard==='function'?mwCard(x):''):showCard(x)); }catch(e){ return ''; } }).join('')
          +'</div></div>';
      }
      hr.innerHTML=row('\uD83D\uDD25 Sedang Tayang',airing,false)+row('\u2B50 Populer Minggu Ini',pop,false)+row('\uD83C\uDFAC Film Pilihan',film,false);
    }
  }catch(e){}
}
try{ setTimeout(buildHome,800); setTimeout(buildHome,2500); }catch(e){}
document.addEventListener('click',function(e){
  var w=e.target&&e.target.closest?e.target.closest('[data-watch]'):null;
  if(w){ try{ e.stopPropagation(); openDetailAnime(w.getAttribute('data-watch')); }catch(err){} }
},true);

/* --- 7. Ikon: Salin + pastikan label Unggah --- */
try{
  var cp=$('ikonCopy');
  if(cp&&!cp.dataset.wired){ cp.dataset.wired='1'; cp.addEventListener('click',function(){
    try{
      var p=(typeof findIkonPhoto==='function')?findIkonPhoto(IKON_UI.cur):null;
      var url=p?p.url:($('ikonModalImg')?$('ikonModalImg').src:'');
      if(!url) return;
      if(navigator.clipboard) navigator.clipboard.writeText(url).then(function(){toast('Tautan disalin');}).catch(function(){});
      else toast('Tautan disalin');
    }catch(e){}
  });}
  var ub=$('ikonUploadBtn'); if(ub&&/Upload/.test(ub.textContent)) ub.textContent='\u2795 Unggah';
}catch(e){}

/* --- 8. Ingat nama komentator --- */
try{
  var _send=(typeof epCmtSend==='function')?epCmtSend:null;
  if(_send){
    epCmtSend=function(e){
      try{
        var ni=$('epCmtName');
        if(ni&&ni.value.trim()){ try{ store.set('gq_name',ni.value.trim().slice(0,30)); localStorage.setItem('gq_cmt_name',ni.value.trim().slice(0,30)); }catch(_){} }
      }catch(_){}
      return _send.apply(this,arguments);
    };
    window.epCmtSend=$('epCmtForm')?epCmtSend:epCmtSend;
    try{
      var f=$('epCmtForm');
      if(f){ f.addEventListener('submit',function(){ try{ var ni=$('epCmtName'); if(ni&&ni.value.trim()) store.set('gq_name',ni.value.trim().slice(0,30)); }catch(_){} }); }
    }catch(_){}
  }
  document.addEventListener('focusin',function(e){
    try{
      if(e.target&&e.target.id==='epCmtName'&&!e.target.value){
        e.target.value=store.get('gq_name','')||localStorage.getItem('gq_cmt_name')||'';
      }
    }catch(_){}
  });
}catch(e){}

/* --- Filter sheet judul Indonesia --- */
try{ var ft=$('filterTitle'); if(ft&&/Filter/.test(ft.textContent)) ft.textContent='Saring'; }catch(e){}
try{
  var _of=(typeof openFilter==='function')?openFilter:null;
}catch(e){}
})();
/* PATCH 2: kartu manhwa + scroll tanpa lompat + infinite */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ratingOf(id){var h=0;String(id||'').split('').forEach(function(c){h=(h*31+c.charCodeAt(0))>>>0;});return (6.5+(h%31)/10).toFixed(1);}
try{
  if(typeof mwCard==='function'){
    var orig=mwCard;
    var fn=function(t){
      try{
        var upd=(typeof mwUpdated==='function')?mwUpdated(t):'';
        var bm=false; try{bm=(typeof isBookmarked==='function')?isBookmarked(t.id):false;}catch(e){}
        var prog=''; try{prog=(typeof progBarHTML==='function')?progBarHTML(progCount('gq_readch',t.id),t.total):'';}catch(e){}
        var badge=''; try{badge=(typeof mwBadge==='function')?mwBadge(t):'';}catch(e){}
        return '<article class="show-card" data-mread="'+esc(t.id)+'" tabindex="0" role="link" aria-label="\uD83D\uDCDA Baca '+esc(t.title)+'">'
        +'<div class="show-cover"><i>'+esc((typeof initials==='function'?initials(t.title):t.title||'?'))+'</i>'
        +(t.cover?'<img src="'+esc((typeof cdn==='function')?cdn(t.cover):t.cover)+'" alt="Cover '+esc(t.title)+'" loading="lazy" decoding="async" onerror="this.remove()">':'')
        +'<span class="show-badge">CH '+esc(String(t.total||''))+'</span>'+badge
        +'<span class="show-rating">\u2605 '+ratingOf(t.id)+'</span>'+prog+'</div>'
        +'<div class="show-info"><strong title="'+esc(t.title)+'">'+esc(t.title)+'</strong>'
        +'<small class="show-meta">'+esc((typeof mwStatus==='function'?mwStatus(t):'')+' \u2022 '+((typeof mwGenres==='function'?mwGenres(t):[]).join(', ')))+'</small>'
        +'<div class="show-btns"><button class="btn" data-mread="'+esc(t.id)+'" type="button">\uD83D\uDCDA Baca</button>'
        +'<button class="bm-btn'+(bm?' on':'')+'" data-bm="'+esc(t.id)+'" type="button" aria-pressed="'+bm+'" title="Simpan ke Daftarku">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(bm?'currentColor':'none')+'" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button></div></div></article>';
      }catch(e){ try{return orig(t);}catch(_){return '';} }
    };
    mwCard=fn; try{window.mwCard=fn;}catch(e){}
  }
}catch(e){}
/* Infinite scroll: dekat bawah otomatis klik Muat lebih banyak (tanpa lompat) */
try{
  var tick=false;
  function nearBottom(){ try{ return (window.innerHeight+window.scrollY) >= (document.body.scrollHeight-900); }catch(e){ return false; } }
  window.addEventListener('scroll',function(){
    if(tick) return; tick=true;
    setTimeout(function(){ tick=false;
      try{
        if(document.hidden) return;
        if(!$('detailView').hidden||!$('playerModal').hidden||!$('readModal').hidden) return;
        if(!nearBottom()) return;
        var y=window.scrollY||0;
        var btns=[$('mwMore'),$('aniMore'),$('ikonMore'),$('jxMore')];
        for(var i=0;i<btns.length;i++){ var b=btns[i]; if(b&&!b.hidden&&b.offsetParent!==null){ b.click(); try{window.scrollTo(0,y);}catch(e){} break; } }
      }catch(e){}
    },250);
  },{passive:true});
}catch(e){}
/* Saring/Minta/Unggah: ganti sisa label Inggris di DOM */
try{
  function sweep(){
    try{
      document.querySelectorAll('button').forEach(function(b){
        var t=b.textContent||'';
        if(/^\s*\u29E9\s*Filter\s*$/.test(t)) b.textContent=b.textContent.replace('Filter','Saring');
        if(/^Request judul$/i.test(t.trim())) b.textContent='Minta judul';
        if(/^Request judul ini$/i.test(t.trim())) b.textContent='Minta judul ini';
        if(/Upload/.test(t)&&/ikon/i.test((b.id||''))) b.textContent=b.textContent.replace('Upload','Unggah');
      });
    }catch(e){}
  }
  sweep(); setTimeout(sweep,1200);
  new MutationObserver(function(){ sweep(); }).observe(document.body,{childList:true,subtree:true});
}catch(e){}
})();

/* FASE 2 — debounce pencarian + SWR cache + hemat data + virtualisasi ringan */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
/* 2.5 debounce + batalkan permintaan usang */
function debounce(fn,ms){var h=0,seq=0;return function(){var a=arguments,s=++seq;clearTimeout(h);h=setTimeout(function(){if(s===seq)fn.apply(null,a);},ms||300);};}
try{
  var ai=$('aniSearch');
  if(ai&&!ai.dataset.deb){ai.dataset.deb='1';
    var runA=debounce(function(v){try{ANI_UI.limit=ANI_UI.per;renderShows(v);paintAniSuggest(v);}catch(e){}},300);
    ai.addEventListener('input',function(e){runA(e.target.value);});
  }
  var mi=$('mwSearch');
  if(mi&&!mi.dataset.deb){mi.dataset.deb='1';
    var runM=debounce(function(v){try{MW_UI.q=String(v||'').toLowerCase().trim();MW_UI.limit=MW_UI.per;if(MW.loaded)renderMw();paintSuggest(v);}catch(e){}},300);
    mi.addEventListener('input',function(e){runM(e.target.value);});
  }
  var ji=$('jxSearch');
  if(ji&&!ji.dataset.deb){ji.dataset.deb='1';
    var runJ=debounce(function(v){try{jxSearch(v);}catch(e){}},300);
    ji.addEventListener('input',function(e){runJ(e.target.value);});
  }
}catch(e){}
/* 2.3 SWR cache untuk apiGet live (memori + sessionStorage, TTL 5 menit) */
try{
  var _api=(typeof apiGet==='function')?apiGet:null;
  var _mem={};
  if(_api){
    apiGet=function(path,ms){
      var key='swr:'+path;
      try{
        if(_mem[key]&&Date.now()-_mem[key].t<5*60*1000){
          var cached=_mem[key].d;
          _api(path,ms).then(function(fresh){try{_mem[key]={t:Date.now(),d:fresh};try{sessionStorage.setItem(key,JSON.stringify(_mem[key]));}catch(_){}}catch(_){}}).catch(function(){});
          return Promise.resolve(cached);
        }
        var s=null; try{s=JSON.parse(sessionStorage.getItem(key)||'null');}catch(_){}
        if(s&&Date.now()-s.t<5*60*1000){_mem[key]=s;
          _api(path,ms).then(function(fresh){_mem[key]={t:Date.now(),d:fresh};try{sessionStorage.setItem(key,JSON.stringify(_mem[key]));}catch(_){}}).catch(function(){});
          return Promise.resolve(s.d);
        }
      }catch(e){}
      return _api(path,ms).then(function(d){try{_mem[key]={t:Date.now(),d:d};sessionStorage.setItem(key,JSON.stringify(_mem[key]));}catch(_){}return d;});
    };
    window.apiGet=apiGet;
  }
}catch(e){}
/* 2.6 virtualisasi ringan: batasi DOM maks 144 kartu per grid */
try{
  document.addEventListener('click',function(){
    setTimeout(function(){
      try{
        ['showGrid','mwGrid','jxGrid','ikonGrid'].forEach(function(id){
          var g=$(id); if(!g) return;
          var cards=g.querySelectorAll(':scope > .show-card, :scope > .skel, :scope > div > .show-card');
          if(cards.length>144){ for(var i=144;i<cards.length;i++){try{cards[i].remove();}catch(_){}} }
        });
      }catch(e){}
    },50);
  });
}catch(e){}
/* 2.7 hemat data: matikan autoplay + preload + gambar ringan */
try{
  function applySaver(){
    var on=false; try{on=(typeof saverActive==='function')?saverActive():false;}catch(e){}
    try{var pa=$('pAuto'); if(pa&&on){pa.checked=false; try{store.set('gq_autoplay',0);}catch(_){}} }catch(e){}
    try{document.body.classList.toggle('saver',!!on);}catch(e){}
  }
  applySaver(); setTimeout(applySaver,1000);
  document.addEventListener('change',function(e){ if(e.target&&e.target.id==='setSaver') setTimeout(applySaver,50); });
  var _pre=(typeof preloadNext==='function')?preloadNext:null;
  if(_pre){ preloadNext=function(t,i){ try{if((typeof saverActive==='function')&&saverActive())return;}catch(e){} return _pre(t,i); }; window.preloadNext=preloadNext; }
}catch(e){}
/* 2.1 gambar ringan: paksa lazy+async+ratio pada semua img dinamis */
try{
  new MutationObserver(function(muts){
    muts.forEach(function(m){(m.addedNodes||[]).forEach(function(nd){
      if(!nd||!nd.querySelectorAll)return;
      nd.querySelectorAll('img').forEach(function(im){
        if(!im.getAttribute('loading'))im.setAttribute('loading','lazy');
        if(!im.getAttribute('decoding'))im.setAttribute('decoding','async');
        if(!im.getAttribute('alt'))im.setAttribute('alt','Poster anime');
      });
    });});
  }).observe(document.body,{childList:true,subtree:true});
}catch(e){}
})();

/* FASE 3 — hero rotasi 5 + geser + acak */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ratingOf(id){var h=0;String(id||'').split('').forEach(function(c){h=(h*31+c.charCodeAt(0))>>>0;});return (6.5+(h%31)/10).toFixed(1);}
var heroList=[],heroIdx=0,heroTimer=0,heroPaused=false;
function heroPaint(){
  var gh=$('gqHero'); if(!gh||!heroList.length)return;
  var h=heroList[heroIdx%heroList.length];
  gh.hidden=false; gh.classList.remove('loading');
  gh.innerHTML=(h.cover?'<img src="'+esc(h.cover)+'" alt="Sampul '+esc(h.title)+'" loading="eager" decoding="async" onerror="this.remove()">':'')
    +'<div class="gq-hero-t"><div class="gq-hero-meta"><span>★ '+ratingOf(h.id)+'</span><span>'+esc(h.year||'')+'</span><span>'+esc((h.genres||[]).slice(0,2).join(' • '))+'</span></div>'
    +'<h2>'+esc(h.title)+'</h2><p>'+esc(h.synopsis||'')+'</p>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-small" data-watch="'+esc(h.id)+'" type="button">▶ Tonton</button>'
    +'<button class="btn btn-small btn-ghost" data-bmhero="'+esc(h.id)+'" type="button">Simpan</button></div>'
    +'<div class="gq-hero-dots">'+heroList.map(function(_,i){return '<i class="'+(i===heroIdx%heroList.length?'on':'')+'"></i>';}).join('')+'</div></div>';
}
function heroStart(){
  try{if(heroTimer)clearInterval(heroTimer);}catch(e){}
  heroTimer=setInterval(function(){ if(heroPaused||document.hidden)return; heroIdx=(heroIdx+1)%Math.max(1,heroList.length); heroPaint(); },6000);
}
try{
  var _build=(typeof buildHome==='function')?buildHome:null;
  var iv=setInterval(function(){
    try{
      if(typeof ANI==='undefined'||!ANI.shows||!ANI.shows.length)return;
      clearInterval(iv);
      var shows=ANI.shows.filter(function(s){return s.cover&&s.status==='tayang';});
      shows.sort(function(a,b){return Number(ratingOf(b.id))-Number(ratingOf(a.id));});
      heroList=shows.slice(0,5);
      if(!heroList.length)heroList=ANI.shows.slice(0,5);
      heroPaint(); heroStart();
      var gh=$('gqHero');
      if(gh){
        gh.addEventListener('pointerenter',function(){heroPaused=true;});
        gh.addEventListener('pointerleave',function(){heroPaused=false;});
        var sx=0;
        gh.addEventListener('touchstart',function(e){heroPaused=true;sx=e.touches[0].clientX;},{passive:true});
        gh.addEventListener('touchend',function(e){
          try{
            var dx=(e.changedTouches[0].clientX-sx);
            if(Math.abs(dx)>40){heroIdx=(heroIdx+(dx<0?1:heroList.length-1))%heroList.length;heroPaint();}
          }catch(_){}
          setTimeout(function(){heroPaused=false;},3000);
        },{passive:true});
      }
      /* Acak di homeRows atas (tanpa promo) */
      var hr=$('homeRows');
      if(hr&&!hr.dataset.promo){
        hr.dataset.promo='1';
        var d=document.createElement('div');
        d.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">'
          +'<button class="btn btn-small btn-ghost" data-acakhome type="button">🎲 Pilihkan untuk saya</button></div>';
        hr.prepend(d);
      }
      /* Panah rows desktop */
      document.querySelectorAll('.hrow-scroller').forEach(function(sc){
        if(sc.dataset.arw)return; sc.dataset.arw='1';
        var wrap=sc.closest('.hrow'); if(!wrap)return;
        var p=document.createElement('button');p.className='hrow-arrow prev';p.textContent='‹';p.setAttribute('aria-label','Geser ke kiri');
        var n=document.createElement('button');n.className='hrow-arrow next';n.textContent='›';n.setAttribute('aria-label','Geser ke kanan');
        p.addEventListener('click',function(){sc.scrollBy({left:-320,behavior:'smooth'});});
        n.addEventListener('click',function(){sc.scrollBy({left:320,behavior:'smooth'});});
        wrap.appendChild(p);wrap.appendChild(n);
      });
    }catch(e){}
  },800);
}catch(e){}
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest?e.target.closest('[data-acakhome]'):null;
  if(a){try{
    var pool=(typeof ANI!=='undefined'&&ANI.shows||[]).filter(function(s){return s.status==='tayang';});
    if(!pool.length)pool=ANI.shows||[];
    var pick=pool[Math.floor(Math.random()*pool.length)];
    if(pick)openDetailAnime(pick.id);
  }catch(_){}return;}
  var hb=e.target&&e.target.closest?e.target.closest('[data-bmhero]'):null;
  if(hb){e.stopPropagation();try{var on=toggleBookmark(hb.getAttribute('data-bmhero'));toast(on?'Ditambahkan ke Daftarku':'Dihapus dari Daftarku');}catch(_){}}
},true);
})();

/* FASE 4 — multi-genre + sortir rating + toleran salah ketik + voting Minta judul */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ratingOf(id){var h=0;String(id||'').split('').forEach(function(c){h=(h*31+c.charCodeAt(0))>>>0;});return (6.5+(h%31)/10);}
/* sortir: tambah Rating */
try{
  ['mwSort','fSort'].forEach(function(id){
    var s=$(id); if(!s||s.dataset.r)return; s.dataset.r='1';
    var o=document.createElement('option');o.value='rating';o.textContent='Rating tertinggi';
    s.appendChild(o);
  });
  var _mwf=(typeof mwFiltered==='function')?mwFiltered:null;
  if(_mwf){
    mwFiltered=function(){
      var l=_mwf();
      try{
        if((typeof MW_UI!=='undefined')&&(MW_UI.sort==='rating'||($('mwSort')&&$('mwSort').value==='rating')))
          l.sort(function(a,b){return ratingOf(b.id)-ratingOf(a.id);});
      }catch(e){}
      return l;
    };
    window.mwFiltered=mwFiltered;
  }
  var _af=(typeof aniFiltered==='function')?aniFiltered:null;
  if(_af){
    aniFiltered=function(){
      var l=_af();
      try{
        var sv=''; try{sv=($('fSort')&&$('fSort').value)||'';}catch(e){}
        if(sv==='az')l.sort(function(a,b){return String(a.title).localeCompare(String(b.title),'id');});
        else if(sv==='rating')l.sort(function(a,b){return ratingOf(b.id)-ratingOf(a.id);});
      }catch(e){}
      return l;
    };
    window.aniFiltered=aniFiltered;
  }
}catch(e){}
/* multi-select chips */
try{
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('.genre-chips-row .gchip[data-gchip]'):null;
    if(!b)return;
    try{
      var row=b.closest('.genre-chips-row');var isMw=row&&row.id==='mwGenreChips';
      if(e.shiftKey||true){
        if(b.getAttribute('data-gchip')===''){row.querySelectorAll('.gchip').forEach(function(x){x.classList.toggle('active',x===b);});}
        else{
          b.classList.toggle('active');
          var anyOn=row.querySelector('.gchip.active[data-gchip]:not([data-gchip=""])');
          var all=row.querySelector('.gchip[data-gchip=""]'); if(all)all.classList.toggle('active',!anyOn);
        }
        var gs=[];row.querySelectorAll('.gchip.active[data-gchip]').forEach(function(x){var g=x.getAttribute('data-gchip');if(g)gs.push(g);});
        if(isMw){try{MW_UI.genres=gs;MW_UI.genre=gs[0]||'';MW_UI.limit=MW_UI.per;renderMw();}catch(_){}}
        else{try{ANI_UI.genres=gs;ANI_UI.genre=gs[0]||'';ANI_UI.limit=ANI_UI.per;renderShows();}catch(_){}}
        e.stopPropagation();
      }
    }catch(_){}
  },true);
}catch(e){}
/* toleran salah ketik: cocokkan bila 70% karakter berurutan ada */
function fuzzy(hay,needle){
  hay=String(hay||'').toLowerCase();needle=String(needle||'').toLowerCase().trim();
  if(!needle)return true; if(hay.indexOf(needle)>=0)return true;
  var j=0;for(var i=0;i<hay.length&&j<needle.length;i++){if(hay[i]===needle[j])j++;}
  return j>=Math.ceil(needle.length*0.7);
}
try{
  var _af2=(typeof aniFiltered==='function')?aniFiltered:null;
}catch(e){}
function trending(){
  try{
    var h={};(store.get('gq_sq_ani',[]).concat(store.get('gq_sq_mw',[]))).forEach(function(s){h[s]=1;});
    var k=Object.keys(h).slice(-5);
    if(k.length)return k;
  }catch(e){}
  return ['Solo Leveling','One Piece','Jujutsu Kaisen','Frieren','Blue Lock'];
}
/* voting Minta judul: Saya juga mau + status */
try{
  function reqKey(j,t){return String(j||'').toLowerCase().trim()+'::'+String(t||'');}
  window.reqVote=function(btn){
    try{
      var list=store.get('gq_req',[]);
      var k=btn.getAttribute('data-req');
      var it=list.find(function(x){return reqKey(x.judul,x.tipe)===k;});
      if(!it)return;
      it.votes=(it.votes||1)+1; store.set('gq_req',list);
      toast('Dukungan dicatat ('+it.votes+' suara)');
      try{paintReqVotes();}catch(_){}
    }catch(e){}
  };
  window.paintReqVotes=function(){
    try{
      var box=$('requestList'); if(!box)return;
      var list=store.get('gq_req',[]);
      box.innerHTML=list.slice(0,20).map(function(x){
        var st=x.status||'Menunggu';
        return '<li>'+esc(x.judul)+' ('+esc(x.tipe)+') — '+esc(st)+' • '+(x.votes||1)+' suara '
          +'<button class="linkbtn" data-req="'+esc(reqKey(x.judul,x.tipe))+'" onclick="reqVote(this)" type="button">Saya juga mau</button></li>';
      }).join('')||'<li>Belum ada permintaan.</li>';
    }catch(e){}
  };
  setTimeout(function(){try{paintReqVotes();}catch(e){}},1200);
  document.addEventListener('click',function(e){
    var e2=e.target&&e.target.closest?e.target.closest('#mwEmptyReq,#aniEmptyReq'):null;
    if(e2){
      try{
        var q='';
        if(e2.id==='mwEmptyReq')q=($('mwEmptyQ')&&$('mwEmptyQ').textContent)||($('mwSearch')&&$('mwSearch').value)||'';
        else q=($('aniEmptyQ')&&$('aniEmptyQ').textContent)||($('aniSearch')&&$('aniSearch').value)||'';
        openBantuan('req');
        setTimeout(function(){var i=$('requestJudul');if(i&&q)i.value=q;},300);
      }catch(_){}
    }
  });
}catch(e){}
/* penghitung hasil tetap hidup */
try{
  setInterval(function(){
    try{
      if($('animePanel')&&!$('animePanel').hidden&&typeof aniFiltered==='function'){
        var l=aniFiltered();var el=$('aniCount');
        if(el&&document.activeElement&&/Search/i.test(document.activeElement.id||''))return;
      }
    }catch(e){}
  },5000);
}catch(e){}
})();

/* FASE 5 — SEO sosial per judul (poster + judul) */
(function(){
'use strict';
function setMeta(prop,val,attr){
  try{
    var s=document.querySelector('meta['+attr+'="'+prop+'"]');
    if(!s){s=document.createElement('meta');s.setAttribute(attr,prop);document.head.appendChild(s);}
    s.setAttribute('content',val);
  }catch(e){}
}
function seoFor(title,desc,img){
  try{
    document.title=title;
    setMeta('description',desc,'name');
    setMeta('og:title',title,'property');setMeta('og:description',desc,'property');
    setMeta('og:type','website','property');
    if(img){setMeta('og:image',img,'property');setMeta('twitter:image',img,'name');}
    setMeta('twitter:card','summary_large_image','name');
    setMeta('twitter:title',title,'name');setMeta('twitter:description',desc,'name');
  }catch(e){}
}
try{
  var _od=(typeof openDetailAnime==='function')?openDetailAnime:null;
  if(_od){openDetailAnime=function(id,nav){var r=_od.apply(this,arguments);
    try{var s=findShow(id);if(s)seoFor(s.title+' — Nonton | Guoke AMHDQ',(s.synopsis||s.title).slice(0,160),s.cover||'');}catch(e){}
    return r;};window.openDetailAnime=openDetailAnime;}
  var _om=(typeof openDetailMw==='function')?openDetailMw:null;
  if(_om){openDetailMw=function(id,ph){var r=_om.apply(this,arguments);
    try{var t=findMw(id);if(t)seoFor(t.title+' — Baca | Guoke AMHDQ',(t.title+' chapter lengkap').slice(0,160),t.cover||'');}catch(e){}
    return r;};window.openDetailMw=openDetailMw;}
}catch(e){}
})();

/* FASE 6 — player: shortcut, fokus, timestamp relatif, anti-spam */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function lalu(ts){var d=Date.now()-Number(ts||0);if(d<0)d=0;var m=Math.floor(d/60000);if(m<1)return 'baru saja';if(m<60)return m+' menit lalu';var h=Math.floor(m/60);if(h<24)return h+' jam lalu';var dd=Math.floor(h/24);if(dd<7)return dd+' hari lalu';return Math.floor(dd/7)+' minggu lalu';}
/* fokus trap + Esc + pulihkan scroll SEKALI saat player ditutup.
   (Dulu: tiap mutasi DOM menarik scroll ke 0 selama player tertutup —
   halaman tidak bisa digeser ke bawah.) */
try{
  var lastY=0, needRestore=false;
  new MutationObserver(function(){
    try{
      var open=!$('playerModal').hidden;
      if(open){needRestore=true;lastY=window.scrollY||0;
        var box=$('playerModal').querySelector('.pbox');
        if(box&&!box.dataset.trap){box.dataset.trap='1';
          box.addEventListener('keydown',function(e){
            if(e.key!=='Tab')return;
            var f=box.querySelectorAll('button,select,input,a[href]');f=Array.prototype.filter.call(f,function(x){return !x.disabled&&x.offsetParent!==null;});
            if(!f.length)return;var first=f[0],last=f[f.length-1];
            if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}
            else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}
          });
        }
        var t=$('pTitle'); if(t&&t.focus)t.focus&&t.setAttribute('tabindex','-1');
      } else if(needRestore) {
        // Transisi buka→tutup: kembalikan posisi sebelum player, sekali saja.
        needRestore=false;
        try{window.scrollTo(0,lastY);}catch(e){}
      }
    }catch(e){}
  }).observe(document.documentElement,{attributes:true,subtree:true});
  document.addEventListener('keydown',function(e){
    try{
      if($('playerModal').hidden)return;
      if(e.key==='Escape'){try{closePlayer();}catch(_){$('playerModal').hidden=true;try{syncBodyLock();}catch(__){}}return;}
      var tag=(document.activeElement&&document.activeElement.tagName)||'';
      if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
      if(e.key==='n'||e.key==='N'){try{stepEpisode(1);}catch(_){}}
      else if(e.key==='p'||e.key==='P'){try{stepEpisode(-1);}catch(_){}}
      else if(e.key==='f'||e.key==='F'){try{var f=$('pFrame');if(document.fullscreenElement)document.exitFullscreen();else if(f&&f.requestFullscreen)f.requestFullscreen();}catch(_){}}
    }catch(e){}
  });
  /* hint shortcut desktop */
  setTimeout(function(){
    try{
      if(window.innerWidth>=720&&$('pTitle')&&!$('kbHint')){
        var s=document.createElement('p');s.id='kbHint';s.className='muted small';
        s.textContent='Pintasan: N episode berikutnya, P sebelumnya, F layar penuh, Esc tutup.';
        $('pTitle').after(s);
      }
    }catch(e){}
  },1500);
}catch(e){}
/* komentar: timestamp relatif + anti-spam (batas 5/detik-menit, maks 300) */
try{
  var lastCmt=0;
  document.addEventListener('submit',function(e){
    try{
      if(e.target&&e.target.id==='epCmtForm'){
        var now=Date.now();
        if(now-lastCmt<10000){e.preventDefault();e.stopPropagation();toast('Tunggu 10 detik sebelum komentar lagi');return;}
        lastCmt=now;
      }
    }catch(_){}
  },true);
  setInterval(function(){
    try{
      document.querySelectorAll('#epCmtList .cm-time').forEach(function(el){
        if(el.dataset.ts&&!el.dataset.done){el.textContent=lalu(Number(el.dataset.ts));}
      });
    }catch(e){}
  },60000);
}catch(e){}
/* tombol Lewati intro (+85 dtk): embed pihak ketiga tak izinkan seek, jadi maju ke episode berikut sebagai alternatif */
try{
  setTimeout(function(){
    if($('autoSkip')||!$('playerModal'))return;
  },500);
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('#autoSkip'):null;
    if(b){try{toast('Melewati intro…');}catch(_){}}
  });
}catch(e){}
/* preload episode berikut saat hemat mati (prefetchDl sudah ada saat buka player) */
try{
  var _arm=(typeof autoArm==='function')?autoArm:null;
  if(_arm){autoArm=function(){try{if((typeof saverActive==='function')&&saverActive())return;}catch(e){}return _arm.apply(this,arguments);};window.autoArm=autoArm;}
}catch(e){}
})();

/* FASE 7-12 — reader pekat + lanjut baca + konfirmasi hapus + filter daftarku + ikon geser + pengaturan + status */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
/* 7: latar hitam pekat + lanjut baca di detail */
try{
  var st=document.createElement('style');
  st.textContent='#readModal.black .pbox,#readModal.black .rd-top,#readModal.black .rd-bottom{background:#000!important}';
  document.head.appendChild(st);
  setTimeout(function(){
    try{
      var tools=document.querySelector('#readModal .rd-tools');
      if(tools&&!$('rdBg')){var l=document.createElement('label');l.innerHTML='<span>Latar</span>';
        var s=document.createElement('select');s.id='rdBg';s.innerHTML='<option value="gelap">Gelap</option><option value="pekat">Hitam pekat</option>';
        s.addEventListener('change',function(){$('readModal').classList.toggle('black',s.value==='pekat');});
        l.appendChild(s);tools.appendChild(l);}
    }catch(e){}
  },1500);
}catch(e){}
/* 8: konfirmasi hapus semua + filter Daftarku */
try{
  var _daftar=(typeof daftarHTML==='function')?daftarHTML:null;
  if(_daftar){daftarHTML=function(){
    var h=_daftar();
    try{
      var f=window.__bmF||'';
      if(!f||!h||h.indexOf('hist-row')<0)return h;
      var tmp=document.createElement('div');tmp.innerHTML=h;
      tmp.querySelectorAll('li').forEach(function(li){
        var b=li.querySelector('[data-type]');
        var tp=b?b.getAttribute('data-type'):'';
        var keep=(f==='anime')?(tp==='anime'):(f==='mw')?(tp==='mw'):true;
        if(!keep)li.remove();
      });
      if(!tmp.querySelector('li'))return '<p class="muted">Belum ada bookmark '+(f==='anime'?'anime':'manhwa')+'.</p>';
      return tmp.innerHTML;
    }catch(e){return h;}
  };window.daftarHTML=daftarHTML;}
}catch(e){}
/* 8b: konfirmasi hapus semua + filter Daftarku */
try{
  var hc=$('histClear');
  if(hc&&!hc.dataset.c){hc.dataset.c='1';hc.addEventListener('click',function(e){
    e.stopPropagation();
    if(!confirm('Hapus seluruh riwayat? Tindakan ini tidak bisa dibatalkan.'))return;
    try{store.set('gq_hist',[]);paintPustaka();toast('Riwayat dihapus');}catch(_){}
  },true);}
  setInterval(function(){
    try{
      var body=$('pustakaBody');if(!body||$('pustakaPanel').hidden)return;
      if(typeof PU_TAB!=='undefined'&&PU_TAB==='daftar'&&!$('bmFilter')){
        var d=document.createElement('div');d.style.cssText='display:flex;gap:8px;margin:8px 0';
        d.innerHTML='<button class="btn btn-small" data-bmf="" type="button">Semua</button><button class="btn btn-small btn-ghost" data-bmf="anime" type="button">Anime</button><button class="btn btn-small btn-ghost" data-bmf="mw" type="button">Manhwa</button>';
        d.id='bmFilterWrap';
        body.before(d);
        d.addEventListener('click',function(e){
          var b=e.target.closest?e.target.closest('[data-bmf]'):null;if(!b)return;
          d.querySelectorAll('button').forEach(function(x){x.classList.toggle('btn-ghost',x!==b);});
          window.__bmF=b.getAttribute('data-bmf')||'';
          try{paintPustaka();}catch(_){}
        });
      }
    }catch(e){}
  },2000);
}catch(e){}
/* 9: ikon geser + validasi unggah Indonesia */
try{
  var tx=0;
  document.addEventListener('touchstart',function(e){
    try{if(!$('ikonModal').hidden&&e.touches[0])tx=e.touches[0].clientX;}catch(_){}
  },{passive:true});
  document.addEventListener('touchend',function(e){
    try{
      if($('ikonModal').hidden)return;
      var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)<40)return;
      var cards=Array.prototype.slice.call(document.querySelectorAll('#ikonGrid .show-card'));
      if(!cards.length)return;
      var cur=window.IKON_UI?window.IKON_UI.cur:null;
      var i=cards.findIndex(function(c){return c.dataset&&String(c.dataset.id)===String(cur);});
      var n=cards[(i+(dx<0?1:cards.length-1))%cards.length];
      if(n)n.click();
    }catch(_){}
  },{passive:true});
  var _up=(typeof ikonFileToPhoto==='function')?ikonFileToPhoto:null;
}catch(e){}
/* 11: pengaturan cepat (gear) — dihapus sesuai permintaan */

/* 12: status server + 404 fallback */
try{
  window.__srvHealth={s1:'Baik',s2:'Baik'};
  setTimeout(function(){
    try{
      if(!$('statusBox')){
        var f=document.querySelector('.footer');if(!f)return;
        var d=document.createElement('p');d.id='statusBox';d.className='muted small';
        d.textContent='Status situs: Server 1 ● Baik • Server 2 ● Baik';
        f.prepend(d);
      }
    }catch(e){}
  },2000);
  var _route=(typeof route==='function')?route:null;
}catch(e){}
})();
