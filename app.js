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
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

const I18N = {
  id: {
    nav_read: 'Baca', nav_watch: 'Tonton', nav_tiktok: 'Alat TikTok', nav_help: 'Bantuan',
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
    cat_semua: 'Semua', cat_anime: 'Anime', cat_manhwa: 'Manhwa', cat_segera: 'Akan Rilis', cat_tiktok: 'Upload TikTok Quality', soon_list_meta: 'segera hadir — belum bisa ditonton',
    latest_refresh: '↻ Perbarui', latest_checked: 'Dicek',
    lh_kicker: 'LANJUTKAN', lh_continue: 'Lanjut →', lh_read: 'LANJUTKAN MEMBACA', lh_watch: 'LANJUTKAN MENONTON',
    prev_eyebrow: '◆ PILIHAN UNTUKMU', prev_h2: 'Mulai dari sini', prev_latest: '🆕 Episode Terbaru', prev_ch: '📖 Chapter Terbaru', prev_anime: '🔥 Anime pilihan', prev_mw: '📖 Manhwa pilihan',
    prev_tool: '🛠 Alat TikTok HD', see_all: 'Lihat semua →', open_tool: 'Buka alat →',
    prev_tool_desc: 'Ubah video apa pun jadi MP4 H.264 + AAC 60fps siap upload, lengkap dengan tombol Download.',
    chip_all: 'Semua', jx_nodata: 'Belum ada data live.', jx_live: 'live • klik untuk menonton', jx_untitled: 'Tanpa judul', continue_reading: 'LANJUTKAN MEMBACA', continue_btn: 'Lanjutkan →',
    mw_eyebrow: '◆ MANHWA • BACA LANGSUNG', mw_h2: 'Baca Manhwa di sini',
    mw_desc: 'Chapter lengkap + gambar, dibaca langsung di situs ini',
    mw_search_ph: 'Cari judul manhwa…', ani_search_ph: 'Cari judul anime…', jx_search_ph: 'Cari semua anime… (mis. One Piece)',
    not_found: 'Tidak ketemu?', req_title: 'Request judul', req_this: 'Request judul ini', empty_for: 'Tidak ada hasil untuk',
    f_type: 'Tipe', f_type_all: 'Manhwa + Manhua', f_genre: 'Genre', f_genre_all: 'Semua genre',
    f_sort: 'Urutkan', f_sort_new: 'Terbaru update', f_sort_pop: 'Populer',
    f_bmstatus: 'Status bookmark', f_bms_all: 'Semua status', f_bms_ongoing: 'Sedang dibaca',
    f_bms_wish: 'Mau dibaca', f_bms_done: 'Selesai', f_bookmarked: '📌 Bookmark saya', acak: '🎲 Acak',
    load_more: 'Muat lagi', loading: 'Memuat…',
    back: '← Kembali', prev: '← Prev', next: 'Next →', full: '⛶ Penuh', full_exit: '✕ Keluar',
    bm_added: 'Ditambahkan ke bookmark 📌', bm_removed: 'Bookmark dihapus', page_w: 'halaman',
    img_width: 'Lebar gambar', w_full: 'Penuh', w_med: 'Sedang', w_narrow: 'Sempit',
    report: '⚠ Lapor chapter rusak', float_next: 'Chapter berikutnya →',
    ani_eyebrow: '◆ ANIME • NONTON LANGSUNG', ani_h2: 'Nonton Anime di sini',
    ani_desc: 'Pilih judul, pilih episode, langsung putar di sini',
    anif_all: 'Semua', anif_new: 'Episode Terbaru', anif_airing: 'Sedang Tayang', anif_done: 'Tamat', anif_film: 'Film', anif_soon: 'Akan Rilis',
    fresh_h: '🔥 Baru Rilis — otomatis', fresh_d: 'Judul terbaru yang langsung ditambahkan otomatis. Klik untuk menonton.',
    latest_h: '🆕 Episode Terbaru — 2026', latest_d: 'Rilisan 2026 + update episode terbaru (data nyaa.si sebagai cek ketersediaan, putar langsung di situs). Klik untuk menonton.',
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
    pz_d: 'File <strong>tidak diunggah ke server</strong> — diproses lokal di HP-mu via ffmpeg.wasm. Output selalu <strong>MP4 H.264 + AAC, 60fps</strong> + tombol <strong>Download</strong>.',
    pz_formats: 'atau klik untuk pilih file • MP4/MOV/MKV/WebM/AVI, 480p–8K • maks 500 MB / 3 menit',
    m_mode: 'Mode output', mode_auto: 'Otomatis — rasio asli, sisi pendek 1080', mode_vfit: 'TikTok vertikal 1080×1920 — Pas (bar hitam)',
    mode_vfill: 'TikTok vertikal 1080×1920 — Isi penuh (crop tengah)', mode_vblur: 'TikTok vertikal 1080×1920 — Latar blur',
    mode_sq: 'Persegi 1080×1080', mode_land: 'Landscape 1920×1080', mode_auto2k: '2K — sisi pendek 1440',
    m_fps: 'FPS output', fps60: '60 fps (default)', fps30: '30 fps (lebih cepat)',
    interp: 'Kualitas maksimal — interpolasi gerak (lama)', pz_go: 'Proses video', pz_cancel: 'Batal', pz_prep: 'Menyiapkan…',
    pz_dl: '⬇ Download (guoke-uploader-hd.mp4)', pz_share: '📤 Bagikan ke TikTok', pz_open: '⬆ Buka Upload TikTok',
    pz_flow: 'Alur: Download dulu (atau Bagikan langsung di HP) → di halaman upload TikTok pilih file hasilnya → pastikan “Kualitas tinggi / Izinkan unggahan HD” aktif.',
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
    help: 'Bantuan', tab_req: 'Request judul', tab_lap: 'Lapor rusak',
    req_d: 'Mau anime/manhwa yang belum ada? Tulis di sini — tersimpan di HP-mu, bisa disalin untuk dikirim ke admin.',
    req_judul: 'Judul yang diminta', req_judul_ph: 'mis. Frieren Season 2', req_tipe: 'Tipe', req_send: 'Kirim request',
    req_copy: 'Salin untuk admin', req_mine: 'Request dari HP ini',
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
    dv_net_err: 'Sumber video belum bisa diperiksa (jaringan/API sibuk). Daftar di bawah tetap bisa dijelajahi. ',
    retry: 'Coba lagi', ep_new_added: 'episode baru ditambahkan otomatis', results_for: 'hasil untuk',
    ep_hint: 'klik nomor untuk menonton.', ep_legend: '<b class="lg-new">tepi biru</b>=terbaru, <b class="lg-soon">gelap</b>=segera hadir.',
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
    ch_fail: 'Gagal memuat daftar chapter (jaringan sibuk / file belum ikut ter-deploy). ',
    ch_fail_toast: 'Gagal memuat daftar chapter',
    rd_loading_imgs: 'Memuat gambar ', rd_all_fail: 'Semua gambar gagal tampil (CDN menolak / jaringan sibuk).',
    rd_too_long: 'Masih memuat terlalu lama (jaringan lambat).', rd_img_fail: 'Gagal memuat gambar (jaringan sibuk).',
    rd_reopen: 'Tutup lalu buka lagi, atau tekan tombol di bawah.', rd_resumed: '(dilanjutkan dari posisi terakhir)',
    rd_retry_imgs: 'Muat ulang gambar', rd_partial: ' gambar gagal tampil — coba muat ulang.',
    rd_scroll: 'geser ke bawah untuk membaca.', pages_w: 'halaman',
    mw_fail: 'Data manhwa tidak termuat. Periksa koneksi lalu refresh.',
    ani_fail: 'Data anime tidak termuat. Periksa koneksi lalu refresh.',
    preset_copied_full: 'Preset disalin! Tempel ke aplikasi editing-mu.', preset_ok: 'Preset disalin!', cmd_ok: 'Command disalin!',
    clipboard_na: 'Clipboard tidak tersedia',
    req_saved: 'Request tersimpan ✓', lap_saved: 'Laporan tersimpan 🙏',
    no_req: 'Belum ada request.', no_req_s: 'Belum ada request', no_lap: 'Belum ada laporan.', no_lap_s: 'Belum ada laporan',
    copied_admin: 'Disalin! Kirim ke admin ✓',
    fresh_fail: 'Gagal memuat judul baru', ep_fail: 'Gagal memuat episode',
    fs_denied: 'Layar penuh ditolak browser', fs_na: 'Browser tidak mendukung layar penuh',
    net_busy: 'Gagal memuat (jaringan/API sibuk)', file_unread: 'File tidak terbaca. Pakai MP4/MOV.',
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
    ff_fail: 'Pustaka ffmpeg gagal dimuat (CDN unpkg diblokir/offline). Sambungkan internet lalu coba lagi.',
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
    nav_read: 'Read', nav_watch: 'Watch', nav_tiktok: 'TikTok Tools', nav_help: 'Help',
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
    cat_semua: 'All', cat_anime: 'Anime', cat_manhwa: 'Manhwa', cat_segera: 'Upcoming', cat_tiktok: 'Upload TikTok Quality', soon_list_meta: 'coming soon — not watchable yet',
    latest_refresh: '↻ Refresh', latest_checked: 'Checked',
    lh_kicker: 'CONTINUE', lh_continue: 'Continue →', lh_read: 'CONTINUE READING', lh_watch: 'CONTINUE WATCHING',
    prev_eyebrow: '◆ PICKS FOR YOU', prev_h2: 'Start here', prev_latest: '🆕 Latest Episodes', prev_ch: '📖 Latest Chapters', prev_anime: '🔥 Featured anime', prev_mw: '📖 Featured manhwa',
    prev_tool: '🛠 TikTok HD tool', see_all: 'See all →', open_tool: 'Open tool →',
    prev_tool_desc: 'Turn any video into upload-ready MP4 H.264 + AAC 60fps, complete with a Download button.',
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
    ani_eyebrow: '◆ ANIME • WATCH HERE', ani_h2: 'Watch Anime here',
    ani_desc: 'Pick a title, pick an episode, play right here',
    anif_all: 'All', anif_new: 'Latest Episodes', anif_airing: 'Airing', anif_done: 'Completed', anif_film: 'Film', anif_soon: 'Upcoming',
    fresh_h: '🔥 Fresh releases — auto', fresh_d: 'Newest titles added automatically. Click to watch.',
    latest_h: '🆕 Latest Episodes — 2026', latest_d: '2026 releases + latest episode updates (nyaa.si as availability check, play right here). Click to watch.',
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
    pz_d: 'Files are <strong>never uploaded to a server</strong> — processed locally on your phone via ffmpeg.wasm. Output is always <strong>MP4 H.264 + AAC, 60fps</strong> + a <strong>Download</button>.',
    pz_formats: 'or click to choose a file • MP4/MOV/MKV/WebM/AVI, 480p–8K • max 500 MB / 3 min',
    m_mode: 'Output mode', mode_auto: 'Auto — original ratio, short side 1080', mode_vfit: 'Vertical TikTok 1080×1920 — Fit (black bars)',
    mode_vfill: 'Vertical TikTok 1080×1920 — Full bleed (center crop)', mode_vblur: 'Vertical TikTok 1080×1920 — Blurred background',
    mode_sq: 'Square 1080×1080', mode_land: 'Landscape 1920×1080', mode_auto2k: '2K — short side 1440',
    m_fps: 'Output FPS', fps60: '60 fps (default)', fps30: '30 fps (faster)',
    interp: 'Max quality — motion interpolation (slow)', pz_go: 'Process video', pz_cancel: 'Cancel', pz_prep: 'Preparing…',
    pz_dl: '⬇ Download (guoke-uploader-hd.mp4)', pz_share: '📤 Share to TikTok', pz_open: '⬆ Open TikTok Upload',
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
    req_judul: 'Requested title', req_judul_ph: 'e.g. Frieren Season 2', req_tipe: 'Type', req_send: 'Send request',
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
    dv_net_err: 'Video sources could not be checked (network/API busy). You can still browse the list below. ',
    retry: 'Retry', ep_new_added: 'new episodes added automatically', results_for: 'results for',
    ep_hint: 'click a number to watch.', ep_legend: '<b class="lg-new">blue edge</b>=newest, <b class="lg-soon">dim</b>=coming soon.',
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
    ch_fail: 'Failed to load chapter list (busy network / file not deployed yet). ',
    ch_fail_toast: 'Failed to load chapter list',
    rd_loading_imgs: 'Loading images ', rd_all_fail: 'All images failed to load (CDN refused / busy network).',
    rd_too_long: 'Still loading too slowly (slow network).', rd_img_fail: 'Failed to load images (busy network).',
    rd_reopen: 'Close and reopen, or press the button below.', rd_resumed: '(resumed from last position)',
    rd_retry_imgs: 'Reload images', rd_partial: ' images failed to load — try reloading.',
    rd_scroll: 'scroll down to read.', pages_w: 'pages',
    mw_fail: 'Manhwa data failed to load. Check your connection and refresh.',
    ani_fail: 'Anime data failed to load. Check your connection and refresh.',
    preset_copied_full: 'Preset copied! Paste into your editing app.', preset_ok: 'Preset copied!', cmd_ok: 'Command copied!',
    clipboard_na: 'Clipboard unavailable',
    req_saved: 'Request saved ✓', lap_saved: 'Report saved 🙏',
    no_req: 'No requests yet.', no_req_s: 'No requests yet', no_lap: 'No reports yet.', no_lap_s: 'No reports yet',
    copied_admin: 'Copied! Send to admin ✓',
    fresh_fail: 'Failed to load new title', ep_fail: 'Failed to load episode',
    fs_denied: 'Fullscreen denied by browser', fs_na: 'Browser does not support fullscreen',
    net_busy: 'Load failed (network/API busy)', file_unread: 'File unreadable. Use MP4/MOV.',
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
    ff_fail: 'Failed to load the ffmpeg library (unpkg CDN blocked/offline). Connect to the internet and try again.',
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

/* ---------- 3. KATEGORI (Semua/Anime/Manhwa/Upload TikTok Quality) ---------- */
const TIKTOK_SELS = ['.hero', '.specs', '#cek', '#proses', '#kalkulator', '#presetSiap', '#panduan', '.compare', '#faq'];
function setCat(cat) {
  document.querySelectorAll('.catbar .cat').forEach((b) => {
    const on = b.dataset.cat === cat;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-selected', 'true'); else b.removeAttribute('aria-selected');
  });
  // Semua = preview pilihan tiap kategori; Anime/Manhwa = katalog penuh masing-masing;
  // tiktok = alat TikTok. (Status data "segera"/belum-tayang tetap didukung di dalam
  // katalog Anime, tapi bukan lagi chip kategori atas.)
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
    try { paintAnimeSections(); } catch (e) {}
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
// Navigasi atas (4 grup) + CTA header → tab yang sesuai lalu scroll ke target.
// Bila link punya hash tujuan sendiri (mis. #kalkulator), pakai itu;
// kalau tidak, pakai panel atas kategorinya.
document.querySelectorAll('[data-navcat]').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const map = { manhwa: 'manhwa', anime: 'anime', tiktok: 'tiktok', baca: 'manhwa', tonton: 'anime' };
    const c = map[a.dataset.navcat] || 'semua';
    goCat(c);
    const href = a.getAttribute('href') || '';
    const el = (href.charAt(0) === '#' && href.length > 1) ? $(href.slice(1)) : null;
    const target = el ? href.slice(1)
      : { manhwa: 'manhwaPanel', anime: 'animePanel', tiktok: 'alatTiktok' }[c];
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
/* Badge BARU / Update hari ini (B5): berdasarkan tanggal chapter terbaru */
function mwBadge(t) {
  const raw = mwUpdated(t);
  if (!raw) return '';
  const ts = parseTgl(raw);
  if (!ts) return '';
  const now = Date.now();
  const days = (now - ts) / 86400000;
  if (days < 0) return '';
  if (days < 1) return '<span class="badge-new today">' + esc(T('updated_today')) + '</span>';
  if (days < 7) return '<span class="badge-new">' + esc(T('new_badge')) + '</span>';
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
const PREV_SIG = { l: '', c: '' };
/* Kartu "BARU" untuk feed update: lokal (data-watch) + live (data-fresh) — klik = langsung tonton */
function freshCardHTML(it) {
  const attr = it.live ? 'data-fresh="' + it.id + '"' : 'data-watch="' + it.id + '"';
  return '<article class="show-card">' +
    '<div class="show-cover"><i>▶</i>' +
    (it.cover ? '<img src="' + esc(it.cover) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + esc(T('new_badge')) + '</span></div>' +
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
    if (r && r.u) { const ts = Date.parse(String(r.u).replace(' ', 'T')); if (ts) return ts; }
  } catch (e) {}
  return 0;
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
  const y = window.scrollY || 0;
  const paint = (live) => {
    const local = sortLocalLatest((ANI.shows || []).filter((s) => s.id.indexOf('rx_') !== 0 && !isSoonU(s) && (s.year || 0) >= 2025 && s.kind !== 'film'));
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
async function apiGet(path, tryMs) {
  const url = 'https://anikotoapi.site' + path;
  let lastErr = null;
  for (const p of API_PROXY) {
    try {
      const r = await fetchTimeout(p(url), tryMs || 12000);
      if (!r.ok) { lastErr = r.status; continue; }
      const j = await bodyTimeout(r.json(), tryMs || 12000);
      if (j && j.ok !== false) return j;
      lastErr = 'bad json';
    } catch (e) { lastErr = (e && e.name === 'AbortError') ? 'timeout' : e; }
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
  const badge = isSoon ? esc(T('soon_badge')) : (s.kind === 'film' ? 'FILM' : eps + ' EP');
  const btn = isSoon ? esc(T('card_info')) : esc(T('card_watch'));
  return '<article class="show-card' + (isSoon ? ' is-soon' : '') + '" data-show="' + s.id + '">' +
    '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="show-badge' + (isSoon ? ' soon' : '') + '">' + badge + '</span></div>' +
    '<div class="show-info"><strong>' + esc(s.title) + '</strong>' +
    (s.alt ? '<small class="show-alt">(' + esc(s.alt) + ')</small>' : '') +
    '<small>' + esc(meta + gmeta) + '</small>' +
        '<div class="show-btns"><button class="btn' + (isSoon ? ' btn-ghost' : '') + '" data-watch="' + s.id + '" type="button">' + btn + '</button></div></div></article>';
}
/* Filter status katalog: semua | terbaru | tayang | tamat | film | segera (reset Muat lagi tiap ganti) */
function aniMatchF(s, f) {
  if (f === 'segera') return isSoonU(s);
  if (f === 'terbaru') return !isSoonU(s) && (s.year || 0) >= 2025 && s.kind !== 'film';
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
const ANI_UI = { q: '', f: 'semua', genre: '', limit: 12, per: 12 };
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
   - normal: kembalikan seperti semula (upcoming tetap tampil sebagai preview). */
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
  } else {
    if (tabs) tabs.hidden = false;
    if (jx) jx.hidden = false;
    // fresh/latest dikembalikan ke state semula (biarkan loader yang mengisi);
    // jangan paksa tampil di sini agar tidak muncul kosong.
    if (up) { /* preview upcoming tetap boleh tampil di tab anime */ }
  }
}
function aniFiltered() {
  const q = ANI_UI.q || '';
  const list = ANI.shows.filter((s) => {
    if (s.id.indexOf('rx_') === 0) return false;
    if (ANI_UI.genre && !((s.genres || []).includes(ANI_UI.genre))) return false;
    if (q && !((s.title + ' ' + (s.alt || '')).toLowerCase().includes(q))) return false;
    // Saat mencari (q non-kosong), judul segera tetap boleh ketemu di filter semua/terbaru
    if (q && isSoonU(s) && (ANI_UI.f === 'semua' || ANI_UI.f === 'terbaru')) return true;
    return aniMatchF(s, ANI_UI.f);
  });
  if (ANI_UI.f === 'terbaru' || ANI_UI.f === 'segera') {
    list.sort((a, b) => ((b.year || 0) - (a.year || 0)) || ((b.akid || 0) - (a.akid || 0)));
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
    if (isSegeraMode()) return; // mode Akan Rilis steril: jangan tampilkan sudah-tayang
    keepScroll(() => {
      if (isSegeraMode()) return;
      $('freshWrap').hidden = false;
      $('freshWrap').dataset.sig = sig;
      $('freshGrid').innerHTML = fresh.map((it) =>
      '<article class="show-card">' +
      '<div class="show-cover"><i>★</i>' +
      (it.poster ? '<img src="' + esc(it.poster) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
      '<span class="show-badge">' + esc(T('new_badge')) + '</span></div>' +
      '<div class="show-info"><strong>' + esc(it.title || it.alternative || T('jx_untitled')) + '</strong>' +
      '<small>' + esc(T('fresh_live')) + '</small>' +
      '<div class="show-btns"><button class="btn" data-fresh="' + it.id + '" type="button">' + esc(T('card_watch')) + '</button></div></div></article>'
    ).join('');
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
    (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy" onerror="this.remove()">' : '') +
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
  const d = new Date(LATEST_T);
  st.textContent = '• ' + T('latest_checked') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
/* Episode Terbaru: live 3 halaman recent-anime + katalog lokal. Yang baru diupload
   otomatis masuk dan langsung bisa ditonton (embed). Auto-refresh tiap 10 menit. */
function loadLatest(force) {
  const box = $('latestWrap'), grid = $('latestGrid');
  if (!box || !grid) return;
  if (isSegeraMode() && !force) return; // mode Akan Rilis steril
  const paint = (live) => {
    const local = sortLocalLatest((ANI.shows || []).filter((s) => s.id.indexOf('rx_') !== 0 && !isSoonU(s) && (s.year || 0) >= 2025 && s.kind !== 'film')).slice(0, 12);
    const items = [];
    const seen = {};
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
    box.hidden = false;
    grid.innerHTML = show.map(freshCardHTML).join('');
    LATEST_T = Date.now();
    stampLatest();
  };
  paint([]);
  (async () => {
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
function armLatestAuto() {
  if (window._latestAuto) return;
  window._latestAuto = 1;
  setInterval(() => {
    try { if (!document.hidden && !isSegeraMode()) loadLatest(); } catch (e) {}
  }, 10 * 60 * 1000);
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
  if ($('playerModal').hidden && $('readModal').hidden) document.body.style.overflow = '';
  setSEO.apply(null, seoHome());
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
  // 3) Kategori eksplisit ('segera' lawas dialihkan ke anime)
  const cat0 = catFromHash(h) || st.cat;
  const cat = cat0 === 'segera' ? 'anime' : cat0;
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
    const sc0 = sessGet('gq_cat', 'semua');
    const sc = sc0 === 'segera' ? 'anime' : sc0; // alias simpanan lawas
    setCat(CATS.indexOf(sc) >= 0 ? sc : 'semua');
  }
}
function goCatFallback() {
  closeOverlaysSilent();
  const sc0 = sessGet('gq_cat', 'semua');
  const sc = sc0 === 'segera' ? 'anime' : sc0; // alias simpanan lawas
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
  const rating = (7 + (h % 19) / 10).toFixed(2);
  const kindLabel = s.kind === 'film' ? 'Film' : 'Series';
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
    '<p class="dv-pro-meta">★ ' + esc(rating) + ' · ' + esc(kindLabel) +
    (s.year ? ' · ' + esc(String(s.year)) : '') + ' · ' + esc(DV.total + ' EP') + '</p>' +
    '<div class="dv-pro-genres">' + (s.genres || []).slice(0, 3).map((g) =>
      '<span>' + esc(g) + '</span>').join('') + '</div></div></div>' +
    '<div class="dv-pro-actions">' + (isSoonDet
      ? '<button class="btn btn-small btn-ghost" type="button" disabled>📅 ' + esc(T('soon_meta')) + (s.rilis ? ' • ' + esc(String(s.rilis)) : (s.year ? ' • ' + esc(String(s.year)) : '')) + '</button>'
      : '<button class="btn btn-primary" data-dvplay="' + esc(showId) + '" type="button">▶ ' + esc(T('card_watch')) + '</button>') +
    '<button class="btn btn-small' + (bm ? '' : ' btn-ghost') + '" data-bm-detail="' + esc(showId) + '" type="button" aria-pressed="' + bm + '">' +
    (bm ? esc(T('bm_detail_on')) : esc(T('bm_detail_off'))) + '</button></div>' +
    (isSoonDet ? '<p class="muted small" style="margin:8px 0 0">📅 ' + esc(T('soon_note')) + '</p>' : '') +
    '<div class="dv-stats"><div><small>EPISODE</small><strong>' + esc(String(DV.total)) + '</strong></div>' +
    '<div><small>STATUS</small><strong>' + esc(statStatus) + '</strong></div>' +
    '<div><small>TAHUN</small><strong>' + esc(s.year ? String(s.year) : '—') + '</strong></div></div>' +
    (s.synopsis ? '<div class="dv-pro-syn"><h3>Sinopsis</h3><p>' + esc(s.synopsis) + '</p></div>' : '') +
    '</div>' +
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
    $('dvEps').innerHTML = '<p class="muted">' + esc(T('dv_eps_empty')) + '</p>';
    return;
  }
  paintEps();
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
  p.textContent = 'Nyaa: ' + n + ' rilis';
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
    store.set('gq_contv', { id: sid, ep: String(epNum), at: Date.now() });
    pushHist({ type: 'anime', id: sid, sub: T('episode_w') + ' ' + epNum });
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
    b.onclick = () => play(Number(b.dataset.srv));
  });
  play(0);
  // Reset baris download tiap ganti episode + prefetch file di latar
  // (supaya klik Download nanti INSTAN — URL sudah ketemu sebelum diklik).
  const ds = $('pDlStatus');
  if (ds) { ds.hidden = true; ds.textContent = ''; }
  try { pDlBtnsClear(); } catch (e) {}
  const db = $('pDl');
  if (db) { db.disabled = false; db.innerHTML = esc(T('dl_btn')); }
  try { prefetchDl(); } catch (e) {}
  paintEpNav();
}
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
  if (label) db.innerHTML = label;
  else db.innerHTML = busy ? esc(T('dl_search')) : esc(T('dl_btn'));
  // sengaja TIDAK disabled — biar tidak terlihat mati/gelap
  db.disabled = false;
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
      pDlSay(T('dl_dead'), true);
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
const MW_UI = { q: '', genre: '', type: '', sort: 'terbaru', bookOnly: false, bmStatus: '', limit: 24, per: 24 };
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
  return '<article class="show-card" data-mread="' + t.id + '" tabindex="0" role="link" ' +
    'aria-label="' + esc(T('card_read')) + ' ' + esc(t.title) + '">' +
    '<div class="show-cover"><i>' + esc(initials(t.title)) + '</i>' +
    (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="Cover ' + esc(t.title) + '" ' +
      'loading="lazy" decoding="async" onerror="this.remove()">' : '') +
    '<span class="show-badge">' + t.total + ' CH</span>' + mwBadge(t) + '</div>' +
    '<div class="show-info"><strong>' + esc(t.title) + '</strong>' +
    '<small class="show-meta">' + esc(mwStatus(t)) + ' • ' + esc(mwGenres(t).join(', ')) +
    (upd ? '<br>' + esc(fmtTglID(upd)) : '') + '</small>' +
    '<div class="show-btns"><button class="btn" data-mread="' + t.id + '" type="button">' + esc(T('card_read')) + '</button>' +
    '<button class="bm-btn' + (bm ? ' on' : '') + '" data-bm="' + t.id + '" type="button" ' +
    'aria-pressed="' + bm + '" title="Bookmark">🔖</button></div></div></article>';
}
function mwFiltered() {
  let list = MW.titles.filter((t) =>
    (!MW_UI.q || t.title.toLowerCase().includes(MW_UI.q)) &&
    (!MW_UI.genre || (t.genres || []).includes(MW_UI.genre)) &&
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
    '<button class="btn btn-small btn-ghost" data-acaktitle type="button">' + esc(T('acak_lain')) + '</button></div>' +
    '<div class="bm-status" role="group" aria-label="' + esc(T('f_bmstatus')) + '">' +
    stBtn('ongoing', T('bm_ongoing')) + stBtn('wishlist', T('bm_wish')) + stBtn('done', T('bm_done')) + '</div></div></div>' +
    '<div class="ani-search"><input id="dvChSearch" type="search" placeholder="' + esc(T('ch_search_ph')) + '" autocomplete="off" aria-label="' + esc(T('ch_search_ph')) + '"></div>' +
    '<div id="dvChList" class="rel-list"></div>';
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
  el.dataset.pb = '4';
  el.style.display = 'none';
  RDIMG.fail++;
  if (RDIMG.total > 0 && RDIMG.fail >= RDIMG.total && !RDIMG.noticed) {
    RDIMG.noticed = true;
    rdFailBar(T('rd_all_fail'), true);
  }
}
/* Muat ulang semua gambar yang gagal di halaman ini (reset rantai fallback) */
function rdRetryImgs() {
  const p = $('rdPages');
  if (!p) return;
  let n = 0;
  p.querySelectorAll('img').forEach((im) => {
    try { im.removeAttribute('data-pb'); } catch (e) {}
    if (im.style.display === 'none') im.style.display = '';
    if (im.dataset.orig) { try { im.src = im.dataset.orig; } catch (e) {} }
    n++;
  });
  RDIMG.fail = 0;
  RDIMG.noticed = false;
  const st = $('rdStatus');
  if (st) st.textContent = T('rd_loading_imgs') + '… (' + n + ' ' + T('pages_w') + ')';
  toast(T('rd_retry_imgs') + '…');
}
/* Bar error di bawah status reader: pesan + tombol Coba lagi / Muat ulang gambar */
function rdFailBar(msg, imgBtn) {
  const st = $('rdStatus');
  if (!st || $('rdRetryBtn')) return;
  const b = document.createElement('button');
  b.id = 'rdRetryBtn';
  b.className = 'btn btn-small';
  b.type = 'button';
  b.style.marginTop = '8px';
  b.textContent = T('retry_btn');
  b.onclick = () => { const r = $('rdRetryBtn'); if (r) r.remove(); const g = $('rdImgBtn'); if (g) g.remove(); loadChapter(); };
  st.appendChild(document.createElement('br'));
  st.appendChild(document.createTextNode(msg + ' '));
  st.appendChild(b);
  if (imgBtn && $('rdPages') && $('rdPages').querySelector('img')) {
    const g = document.createElement('button');
    g.id = 'rdImgBtn';
    g.className = 'btn btn-small btn-ghost';
    g.type = 'button';
    g.style.marginTop = '8px';
    g.style.marginLeft = '6px';
    g.textContent = T('rd_retry_imgs');
    g.onclick = () => { rdRetryImgs(); };
    st.appendChild(g);
  }
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
        rdFailBar(RDIMG.fail + '/' + RDIMG.total + T('rd_partial'), true);
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
  document.body.style.overflow = 'hidden';
  paintFullBtns();
  applyRdWidth();
  // URL unik per chapter (push bila bukaan baru; Next/Prev/select = replace)
  if (pushHash !== false) pushView('#/baca/' + titleId + '/' + rdCtx.i,
    { cat: CURCAT, view: 'rd', id: titleId, idx: rdCtx.i }, rdFresh);
  // Simpan "lanjutkan membaca" (tanpa login) + riwayat
  store.set('gq_cont', { id: titleId, idx: rdCtx.i, ch: c.t, at: Date.now() });
  pushHist({ type: 'mw', id: titleId, sub: c.t });
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
  const t = findMw(rdCtx.id), chs = mwChapters(t) || [], c = chs[rdCtx.i];
  if (!c) return;
  const myReq = ++rdReqSeq;
  let retried = false;
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
      rdFailBar(T('rd_too_long'));
    }, 40000);
  } catch (e) {}
  const clearWatch = () => { try { clearTimeout(window.__rdWatch); } catch (e) {} };
  chapterImages(t, c.u).then((imgs) => {
    clearWatch();
    if (!rdCtx || myReq !== rdReqSeq) return; // anti-campur
    RDIMG = { total: imgs.length, fail: 0, noticed: false };
    const rb = $('rdRetryBtn'); if (rb) rb.remove();
    const gb = $('rdImgBtn'); if (gb) gb.remove();
    $('rdPages').innerHTML = imgs.map((u, k) =>
       '<img src="' + esc(cdn(u)) + '" data-orig="' + esc(u) + '" alt="' + esc(t.title + ' ' + c.t + ' ' + T('page_w') + ' ' + (k + 1)) +
      '" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="imgFallback(this)">'
    ).join('');
    $('rdStatus').textContent = imgs.length + ' ' + T('pages_w') + ' • ' + c.t + ' • ' + T('rd_scroll');
    rdScroller().scrollTop = 0;
    restorePos(); // kembali ke posisi terakhir bila ada
    rdWatchPartial(myReq); // bila sebagian gagal → tawarkan muat ulang
    preloadNext(t, rdCtx.i); // siapkan gambar chapter berikut
  }).catch(() => {
    clearWatch();
    if (!rdCtx || myReq !== rdReqSeq) return;
    // Auto-retry 1x dengan cache sesi dibuang (kadang proxy mengembalikan
    // halaman rusak yang ter-cache) sebelum menyerah ke tombol Coba lagi.
    if (!retried) {
      retried = true;
      try { if (MW.pages && MW.pages[t.slug]) delete MW.pages[t.slug][c.u]; } catch (e) {}
      $('rdStatus').textContent = T('rd_loading_imgs') + c.t + '… (coba lagi)';
      chapterImages(t, c.u).then((imgs2) => {
        clearWatch();
        if (!rdCtx || myReq !== rdReqSeq) return;
        RDIMG = { total: imgs2.length, fail: 0, noticed: false };
        const rb = $('rdRetryBtn'); if (rb) rb.remove();
        const gb = $('rdImgBtn'); if (gb) gb.remove();
        $('rdPages').innerHTML = imgs2.map((u, k) =>
          '<img src="' + esc(cdn(u)) + '" data-orig="' + esc(u) + '" alt="' + esc(t.title + ' ' + c.t + ' ' + T('page_w') + ' ' + (k + 1)) +
          '" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="imgFallback(this)">'
        ).join('');
        $('rdStatus').textContent = imgs2.length + ' ' + T('pages_w') + ' • ' + c.t + ' • ' + T('rd_scroll');
        rdScroller().scrollTop = 0;
        restorePos();
        rdWatchPartial(myReq);
        preloadNext(t, rdCtx.i);
      }).catch(() => {
        if (!rdCtx || myReq !== rdReqSeq) return;
        $('rdStatus').textContent = T('rd_img_fail');
        rdFailBar(T('rd_reopen'));
      });
      return;
    }
    $('rdStatus').textContent = T('rd_img_fail');
    rdFailBar(T('rd_reopen'));
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
  if (el.requestFullscreen) el.requestFullscreen().catch(() => toast(T('fs_denied')));
  else toast(T('fs_na'));
}
function paintFullBtns() {
  const on = !!document.fullscreenElement;
  document.querySelectorAll('[data-full]').forEach((b) => { b.textContent = on ? T('full_exit') : T('full'); });
}

function initAnime() {
  // Sumber utama: data-anime.js (satu file, bisa diedit manual).
  // Cadangan: fetch JSON bila script data belum termuat.
  const bootAnime = (d) => {
    ANI = d;
    $('aniDate').textContent = d.updated || '';
    paintAniGenres();
    renderShows('');
    paintPreview();
    paintLanjutHome();
    loadFresh(); // rilis baru otomatis di latar
    loadLatest(); // kategori Episode Terbaru (2026 + live, tanpa judul segera)
    loadUpcoming(); // kategori Anime Akan Rilis (status segera)
    armLatestAuto(); // cek update tiap 10 menit — upload baru otomatis rilis di sini
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
    try { paintAnimeSections(); } catch (e) {}
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
      }).catch(() => toast(T('fresh_fail'))).finally(() => { fr.disabled = false; });
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
      openDetailMw(sg.dataset.sug);
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
      $('mwDate').textContent = d.updated || '';
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
function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModals() {
  ['bantuModal', 'riwayatModal', 'tentangModal', 'profilModal', 'authView'].forEach((id) => { const m = $(id); if (m) m.hidden = true; });
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
  if (!h.length) { g.innerHTML = '<p class="muted">' + esc(T('hist_empty')) + '</p>'; return; }
  g.innerHTML = h.map((x) => {
    if (x.type === 'mw') {
      const t = findMw(x.id);
      if (!t) return '';
      return '<article class="show-card" data-mread="' + t.id + '">' +
        '<div class="show-cover"><i>' + esc(initials(t.title)) + '</i>' +
        (t.cover ? '<img src="' + esc(cdn(t.cover)) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
        '<div class="show-info"><strong>' + esc(t.title) + '</strong><small>' + esc(x.sub || '') + '</small>' +
        '<div class="show-btns"><button class="btn" data-mread="' + t.id + '" type="button">' + esc(T('card_read')) + '</button></div></div></article>';
    }
    const s = findShow(x.id);
    if (!s) return '';
    return '<article class="show-card">' +
      '<div class="show-cover"><i>' + esc(initials(s.title)) + '</i>' +
      (s.cover ? '<img src="' + esc(s.cover) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
      '<div class="show-info"><strong>' + esc(s.title) + '</strong><small>' + esc(x.sub || '') + '</small>' +
    '<div class="show-btns"><button class="btn" data-watch="' + s.id + '" type="button">' + esc(T('card_watch')) + '</button></div></div></article>';
  }).join('');
}
function wireModals() {
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const w = b.dataset.open;
    const pm = $('profilModal');
    if (w === 'bantuan') { if (pm) pm.hidden = true; openBantuan('req'); }
    else if (w === 'riwayat') { if (pm) pm.hidden = true; paintHist(); openModal('riwayatModal'); }
    else if (w === 'tentang') { if (pm) pm.hidden = true; openModal('tentangModal'); }
  }));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
  ['bantuModal', 'riwayatModal', 'tentangModal', 'profilModal'].forEach((id) => {
    const m = $(id);
    if (m) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
  });
  document.querySelectorAll('[data-btab]').forEach((b) =>
    b.addEventListener('click', () => switchBtab(b.dataset.btab)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
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
      toast(T('bm_updated'));
      return;
    }
    const at2 = e.target.closest && e.target.closest('[data-acaktitle]');
    if (at2) { openRandomMw(); }
  });
}

/* --- PROFIL: foto, nama, tema gelap/terang, bahasa ID/EN, login --- */
/* CARA AKTIFKAN TOMBOL GOOGLE/FACEBOOK (pilih salah satu):
   A) Dari HP: buka Profil → Pengaturan login → tempel ID → Simpan (tanpa edit kode).
   B) Dari kode: isi GOOGLE_CLIENT_ID / FACEBOOK_APP_ID di bawah.
   - Google: console.cloud.google.com → project → APIs & Services → Credentials →
     Create Credentials → OAuth client ID (Web) → Authorized JavaScript origins
     tambahkan origin situs ini (mis. https://xxx.trycloudflare.com). Contoh ID:
     '1234567890-abc.apps.googleusercontent.com'
   - Facebook: developers.facebook.com → buat App → produk Facebook Login →
     daftarkan domain situs. Tanpa langkah ini tombolnya tidak bisa jalan:
     Google/Facebook yang mewajibkan ID + origin terdaftar. */
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
  try { if (typeof ANI !== 'undefined' && ANI.shows && ANI.shows.length) { renderShows(); paintJx(); PREV_SIG.l = ''; PREV_SIG.c = ''; paintPreview(); try { paintChapterPreview(); } catch (e2) {} stampLatest(); } } catch (e) {}
  try { if (typeof paintHist === 'function' && !$('riwayatModal').hidden) paintHist(); } catch (e) {}
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
      $('profilModal').hidden && $('riwayatModal').hidden && $('tentangModal').hidden && $('bantuModal').hidden) {
    document.body.style.overflow = '';
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
    (it.poster ? '<img src="' + esc(it.poster) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
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
  if (cat === 'segera') cat = 'anime'; // alias lawas: chip Akan Rilis sudah digabung ke Anime
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
  if (!$('detailView').hidden) { $('detailView').hidden = true; $('detailView').classList.remove('dv-anime'); }
  if ($('playerModal').hidden && $('readModal').hidden && $('detailView').hidden) document.body.style.overflow = '';
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
  const lim = sessGet('gq_lim', null);
  if (lim) {
    if (lim.mw && typeof MW_UI !== 'undefined' && MW_UI.limit < lim.mw) MW_UI.limit = lim.mw;
    if (lim.ani && typeof ANI_UI !== 'undefined' && ANI_UI.limit < lim.ani) ANI_UI.limit = lim.ani;
  }
  const hc = catFromHash(location.hash);
  const sc0 = sessGet('gq_cat', 'semua');
  const sc = sc0 === 'segera' ? 'anime' : sc0; // alias simpanan lawas
  const start = hc || (CATS.indexOf(sc) >= 0 ? sc : 'semua');
  setCat(start);
  // Normalisasi URL+state tanpa menambah entri (kecuali URL view bagikan)
  if (!isViewHash(location.hash)) navReplace('#/' + start, { cat: start });
  route(false);
})();
