/* Guoke AMHDQ — Prosesor TikTok HD (C): ffmpeg.wasm 100% di browser.
   - Input: MP4/MOV/MKV/WebM/AVI apa pun (480p–8K, portrait/landscape/persegi).
   - Output: MP4 H.264 + AAC, 60/30fps, HD (sisi pendek 1080, opsi 2K) + tombol Download.
   - Privat: file tidak diunggah ke server mana pun.
   - Rotasi metadata HP ditangani otomatis oleh ffmpeg (autorotate bawaan).
   - VFR dinormalkan oleh filter fps=... ; dimensi genap via skala -2.
   - HDR→SDR: opsional via checkbox (tonemap/zscale bila tersedia di core). */
(function () {
  if (window.__pz) return;
  window.__pz = true;

  const $ = (id) => document.getElementById(id);
  const say = (msg) => { const s = $('pzProgTxt'); if (s) s.textContent = msg; };
  const toast = (m) => {
    if (typeof window.toast === 'function') { window.toast(m); return; }
    const t = $('toast'); if (!t) return;
    t.textContent = m; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
  };
  // toast() di app.js didefinisikan sebagai const di scope global script (var-like via const → bukan
  // di window). Panggil langsung bila ada:
  const appToast = (m) => { try { toast(m); } catch (e) {} };
  // Kamus bahasa dari app.js (T); fallback identitas bila app.js belum termuat.
  const _T = (typeof T === 'function') ? T : (k) => k;

  const drop = $('pzDrop'), fileEl = $('pzFile');
  if (!drop || !fileEl) return; // panel belum ada → diam

  // Opsi HDR disuntik dari sini (tanpa mengubah HTML statis):
  // "zscale/tonemap bila tersedia" — bila filter tidak ada di core, otomatis fallback.
  (function injectHdr() {
    const box = drop.parentElement && drop.parentElement.querySelector('.calc-controls');
    if (!box || $('pzHdr')) return;
    const lb = document.createElement('label');
    lb.className = 'checkline';
    lb.innerHTML = '<input id="pzHdr" type="checkbox" />' + _T('hdr_label');
    box.appendChild(lb);
  })();

  let file = null, meta = null, ff = null, ffLoading = null, cancelled = false, outUrl = null;

  const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
  const baseName = (n) => (n || 'video').split(/[\\/]/).pop();

  drop.addEventListener('click', () => fileEl.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.click(); }
  });
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.remove('over');
  }));
  drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  });
  fileEl.addEventListener('change', () => { if (fileEl.files[0]) onFile(fileEl.files[0]); });

  function onFile(f) {
    file = f; meta = null;
    $('pzDone').hidden = true;
    if (outUrl) { try { URL.revokeObjectURL(outUrl); } catch (e) {} outUrl = null; }
    const url = URL.createObjectURL(f);
    const pv = $('pzPrev');
    pv.hidden = false; pv.src = url;
    pv.onloadedmetadata = () => {
      const w = pv.videoWidth, h = pv.videoHeight, d = pv.duration || 0;
      estimateFps(pv).then((fps) => {
        meta = { w, h, dur: d, fps };
        paintMeta(f);
      }).catch(() => {
        meta = { w, h, dur: d, fps: 0 };
        paintMeta(f);
      });
    };
    pv.onerror = () => {
      // Format tak bisa diputar browser (mis. sebagian MKV/AVI) — ffmpeg tetap bisa membacanya.
      meta = { w: 0, h: 0, dur: f.size > 0 ? 0 : 0, fps: 0, unplayable: true };
      paintMeta(f);
    };
  }

  // Browser tidak mengekspos fps via <video>; estimasi lewat requestVideoFrameCallback
  // (hitung frame selama ±1,5 dtk pemutaran bisu). Gagal → 0 (ditampilkan sebagai estimasi).
  function estimateFps(v) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (fps) => { if (!done) { done = true; try { v.pause(); } catch (e) {} resolve(fps); } };
      setTimeout(() => finish(0), 4000);
      try {
        if (!('requestVideoFrameCallback' in v)) return finish(0);
        let n = 0; const t0 = performance.now();
        v.muted = true;
        const tick = () => {
          n++;
          if (performance.now() - t0 >= 1500) {
            finish(Math.round((n / (performance.now() - t0)) * 1000));
            return;
          }
          v.requestVideoFrameCallback(tick);
        };
        v.requestVideoFrameCallback(tick);
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => finish(0));
      } catch (e) { finish(0); }
    });
  }

  function paintMeta(f) {
    const info = $('pzInfo'), warn = $('pzWarn'), go = $('pzGo');
    const w = meta.w, h = meta.h, d = meta.dur || 0;
    const fpsTxt = meta.fps ? meta.fps + ' fps' : _T('fps_est');
    info.textContent = meta.unplayable
      ? _T('pz_orig') + _T('pz_unplayable1') + (baseName(f.name).split('.').pop() || '?') +
        _T('pz_unplayable2')
      : _T('pz_orig') + w + '×' + h + ', ' + fpsTxt +
        (d ? _T('pz_dur') + d.toFixed(1) + _T('pz_sec') : '') + ', ' + fmtMB(f.size) + '.';
    const over = [];
    if (f.size > 500 * 1048576) over.push(_T('pz_over1') + fmtMB(f.size) + _T('pz_over2'));
    if (d > 180) over.push(_T('pz_over3') + d.toFixed(0) + _T('pz_over4'));
    if (over.length) { warn.hidden = false; warn.textContent = '⚠ ' + over.join(' '); }
    else warn.hidden = true;
    go.disabled = false;
    say(_T('pz_ready'));
  }

  /* Filter -vf per mode (S = sisi pendek target: 1080 / 1440). Pola sesuai spesifikasi. */
  function buildFilter(mode, w, h, fpsOut, interp, S) {
    const W9 = S, H9 = Math.round((S * 16) / 9 / 2) * 2; // 1080→1920, 1440→2560
    const fpsF = (interp && fpsOut === 60) ? 'minterpolate=fps=60:mi_mode=mci' : 'fps=' + fpsOut;
    let vf = '';
    if (mode === 'auto') {
      vf = (w === 0 || w <= h)
        ? 'scale=' + S + ':-2:flags=lanczos'
        : 'scale=-2:' + S + ':flags=lanczos';
    } else if (mode === 'auto2k') {
      const K = 1440;
      vf = (w === 0 || w <= h) ? 'scale=' + K + ':-2:flags=lanczos' : 'scale=-2:' + K + ':flags=lanczos';
    } else if (mode === 'vfit') {
      vf = 'scale=' + W9 + ':' + H9 + ':force_original_aspect_ratio=decrease:flags=lanczos' +
        ',pad=' + W9 + ':' + H9 + ':(ow-iw)/2:(oh-ih)/2:black';
    } else if (mode === 'vfill') {
      vf = 'scale=' + W9 + ':' + H9 + ':force_original_aspect_ratio=increase:flags=lanczos' +
        ',crop=' + W9 + ':' + H9;
    } else if (mode === 'vblur') {
      vf = '[0:v]split=2[bg][fg];' +
        '[bg]scale=' + W9 + ':' + H9 + ':force_original_aspect_ratio=increase,crop=' + W9 + ':' + H9 + ',boxblur=30:5[b];' +
        '[fg]scale=' + W9 + ':' + H9 + ':force_original_aspect_ratio=decrease:flags=lanczos[f];' +
        '[b][f]overlay=(W-w)/2:(H-h)/2';
    } else if (mode === 'sq') {
      vf = 'scale=' + S + ':' + S + ':force_original_aspect_ratio=decrease:flags=lanczos' +
        ',pad=' + S + ':' + S + ':(ow-iw)/2:(oh-ih)/2:black';
    } else if (mode === 'land') {
      const LW = Math.round((S * 16) / 9 / 2) * 2, LH = S; // 1920×1080 / 2560×1440
      vf = 'scale=' + LW + ':' + LH + ':force_original_aspect_ratio=decrease:flags=lanczos' +
        ',pad=' + LW + ':' + LH + ':(ow-iw)/2:(oh-ih)/2:black';
    }
    return vf + ',' + fpsF + ',format=yuv420p';
  }

  function ffArgs(inName, filter, S, preset, xparams, useWm) {
    // Umpan bitrate tertinggi yang masih aman diupload (best-effort lawan
    // kompres TikTok; 2K dapat jatah lebih besar). 100% anti-kompres tidak
    // mungkin — TikTok selalu re-encode ke ~3–8 Mbps.
    const maxr = S >= 1440 ? '35M' : '25M';
    const buf = S >= 1440 ? '70M' : '50M';
    const base = ['-c:v', 'libx264', '-preset', preset || 'slow', '-crf', '16'];
    if (xparams) base.push('-x264-params', xparams); // darurat: matikan lookahead (hemat RAM)
    const tail = ['-maxrate', maxr, '-bufsize', buf, '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out.mp4'];
    if (useWm) {
      // Watermark ON: overlay PNG dari canvas (tanpa butuh font di ffmpeg).
      const core = String(filter).replace(/,format=yuv420p$/, '');
      let fc;
      if (core.indexOf('[0:v]') === 0) {
        fc = core + ',format=yuv420p[base];[base][1:v]overlay=W-w-24:H-h-24:format=auto,format=yuv420p';
      } else {
        fc = '[0:v]' + core + ',format=yuv420p[base];[base][1:v]overlay=W-w-24:H-h-24:format=auto,format=yuv420p';
      }
      return ['-i', inName, '-i', 'wm.png', '-filter_complex', fc].concat(base, tail);
    }
    const a = ['-i', inName, '-vf', filter].concat(base);
    return a.concat(tail);
  }

  // Watermark PNG 440x90 transparan bertuliskan "GUOKE HD" — dibuat via canvas
  // browser sehingga ffmpeg tinggal overlay, tanpa font freetype.
  async function makeWatermarkBytes(fetchFile) {
    const c = document.createElement('canvas');
    c.width = 440; c.height = 90;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 440, 90);
    x.font = '900 44px system-ui,sans-serif';
    x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 8;
    x.fillStyle = 'rgba(255,255,255,.92)';
    x.fillText('GUOKE HD', 18, 48);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const buf = new Uint8Array(await blob.arrayBuffer());
    // fetchFile hanya untuk file input; untuk bytes langsung kembalikan Uint8Array
    return buf;
  }

  /* Klasifikasi error memori: instance wasm yang abort/OOM hukumnya MATI dan
     wajib dibuat ulang sebelum percobaan berikutnya. */
  const isMemErr = (e) => /memory|alloc|abort|OOM|out of memory|enlarge memory|Maximum call stack/i
    .test(String((e && e.message) || e || ''));
  /* Error file rusak (bukan memori/filter): setting apa pun pasti gagal,
     jadi langsung berhenti tanpa buang waktu. */
  const isInputErr = (e) => /invalid data|moov atom|could not find.*stream|unsupported codec|failed to decode|Invalid data found/i
    .test(String((e && e.message) || e || ''));
  const freshFF = async () => {
    try { if (ff) ff.exit(); } catch (e) {}
    ff = null; ffLoading = null;
    return loadFF();
  };

  // Daftar core wasm + lib JS cadangan (unpkg ↔ jsdelivr). Kalau CDN pertama
  // diblokir provider/browser, otomatis coba berikutnya — bukan langsung gagal.
  const CORE_URLS = [
    'https://unpkg.com/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js',
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js',
    'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
  ];
  const LIB_URLS = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
    'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
  ];
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      let done = false;
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { if (!done) { done = true; resolve(); } };
      s.onerror = () => { if (!done) { done = true; try { s.remove(); } catch (e) {} reject(new Error('cdn ' + src)); } };
      document.head.appendChild(s);
      setTimeout(() => { if (!done) { done = true; try { s.remove(); } catch (e) {} reject(new Error('timeout ' + src)); } }, 20000);
    });
  }
  async function ensureLib() {
    if (window.FFmpeg && window.FFmpeg.createFFmpeg) return window.FFmpeg;
    let lastErr = null;
    for (const u of LIB_URLS) {
      try { await loadScriptOnce(u); } catch (e) { lastErr = e; continue; }
      if (window.FFmpeg && window.FFmpeg.createFFmpeg) return window.FFmpeg;
    }
    throw lastErr || new Error(_T('ff_fail'));
  }

  // Timer progres: biar kelihatan jalan (tidak dikira macet) + tampil di kartu Guoke.
  let t0 = 0;
  const fmtEl = (ms) => {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  function bindProgress(inst) {
    inst.setProgress(({ ratio }) => {
      if (cancelled) return;
      const p = Math.max(0, Math.min(1, ratio || 0));
      const pct = Math.round(p * 100);
      const el = t0 ? ' • ' + fmtEl(Date.now() - t0) : '';
      $('pzProg').style.width = (p * 100).toFixed(1) + '%';
      say(_T('pz_processing') + pct + '%' + el);
      // Cerminkan progres ke kartu Guoke Uploader+
      try {
        const rf = document.getElementById('reinProgFill');
        if (rf) rf.style.width = (p * 100).toFixed(1) + '%';
        const rt = document.getElementById('reinStatusTitle');
        if (rt) rt.textContent = 'Memproses ' + pct + '%';
        const rd = document.getElementById('reinStatusDesc');
        if (rd) rd.textContent = 'Mohon tunggu, video sedang dioptimasi…' + el;
      } catch (e) {}
    });
  }

  function loadFF() {
    if (ff) return Promise.resolve(ff);
    if (ffLoading) return ffLoading;
    ffLoading = (async () => {
      const lib = await ensureLib();
      const { createFFmpeg, fetchFile } = lib;
      // Build SINGLE-THREAD (core-st): tidak butuh SharedArrayBuffer, jadi
      // jalan di hosting statis/GitHub Pages tanpa header COOP/COEP.
      // (Build multithread lama melempar "SharedArrayBuffer is not defined".)
      let lastErr = null;
      for (const corePath of CORE_URLS) {
        if (cancelled) throw { cancelled: true };
        try {
          const inst = createFFmpeg({ corePath, log: false });
          bindProgress(inst);
          say(_T('ff_loading'));
          await inst.load();
          inst._fetchFile = fetchFile;
          ff = inst;
          return ff;
        } catch (e) {
          if (e && (e.cancelled || e === cancelled)) throw e;
          lastErr = e;
        }
      }
      throw lastErr || new Error(_T('ff_fail'));
    })().catch((e) => { ffLoading = null; throw e; });
    return ffLoading;
  }

  $('pzGo').addEventListener('click', async () => {
    if (!file || !file.size) { appToast(_T('file_fail')); return; }
    if (!$('pzGo') || $('pzGo').disabled) return;
    cancelled = false;
    t0 = Date.now();
    $('pzCancel').hidden = false;
    $('pzGo').disabled = true;
    $('pzProgWrap').hidden = false;
    $('pzDone').hidden = true;
    $('pzProg').style.width = '0%';
    try {
      const mode = ($('pzMode') && $('pzMode').value) || 'auto';
      const fpsWant = ($('pzFps') && $('pzFps').value) || '60';
      const hdr = !!($('pzHdr') && $('pzHdr').checked);
      const S = (mode === 'auto2k') ? 1440 : 1080;
      const w = meta && meta.w ? meta.w : 0, h = meta && meta.h ? meta.h : 0;
      const isHP = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
      // PENTING: memori wasm terbatas (±256–512MB) — RAM 12GB tidak menambahnya.
      // minterpolate di HP hampir pasti meledak, jadi dimatikan paksa (bukan
      // sekadar peringatan). Output tetap 60fps mulus via duplikasi frame.
      let interpWant = !!($('pzInterp') && $('pzInterp').checked);
      if (isHP && interpWant) {
        interpWant = false;
        if ($('pzInterp')) $('pzInterp').checked = false;
        toast(_T('hp_interp_off'));
      }
      const baseFull = buildFilter(mode, w, h, fpsWant, interpWant, S);
      // Varian filter: HDR→SDR dulu bila diminta, lalu versi polos. "Bila tersedia":
      // bila core tak punya tonemap/zscale, run gagal dan otomatis fallback.
      const variantsFull = hdr
        ? ['tonemap=hable:desat=0,' + baseFull, 'tonemap=clip,' + baseFull, baseFull]
        : [baseFull];
      const baseLight = buildFilter(mode, w, h, '30', false, S);
      // Tahap darurat: resolusi 2K diturunkan ke 1080 (tetap HD), preset
      // tercepat + lookahead encoder dimatikan → RAM minimal. Input resolusi
      // APAPUN (8K/vertikal/persegi/HDR) tetap diterima; yang menyesuaikan
      // adalah tangga usaha, bukan menolak file.
      const S3 = S >= 1440 ? 1080 : S;
      const baseUltra = buildFilter(mode, w, h, '30', false, S3);
      // Tangga 3 tahap: penuh → ringan → darurat. Lanjut ke tahap berikut
      // untuk SEMUA error kecuali file rusak (input error). Instance wasm
      // yang OOM/abort wajib dibuat ulang tiap tahap.
      // HP mulai dari veryfast (bukan slow): jauh lebih hemat memori wasm +
      // 3–5× lebih cepat, kualitas tetap tinggi (CRF 16). Desktop mulai slow.
      const LV = ['', '[Ringan] ', '[Darurat] '];
      const tries = isHP ? [
        { preset: 'veryfast', vfList: variantsFull, fps: fpsWant, xp: '', S: S },
        { preset: 'ultrafast', vfList: [baseLight], fps: '30', xp: '', S: S },
        { preset: 'ultrafast', vfList: [baseUltra], fps: '30', xp: 'rc-lookahead=0:sync-lookahead=0', S: S3 },
      ] : [
        { preset: 'slow', vfList: variantsFull, fps: fpsWant, xp: '', S: S },
        { preset: 'veryfast', vfList: [baseLight], fps: '30', xp: '', S: S },
        { preset: 'ultrafast', vfList: [baseUltra], fps: '30', xp: 'rc-lookahead=0:sync-lookahead=0', S: S3 },
      ];
      const inName = 'in_' + Date.now() + '_' + baseName(file.name).replace(/[^a-zA-Z0-9.]/g, '_');
      let inst = await loadFF();
      if (cancelled) throw { cancelled: true };
      // Toggle Watermark dari kartu Guoke (window.__gqWatermark; dukung nama lama)
      const useWm = !!(window.__gqWatermark || window.__reinWatermark);
      let wmBytes = null;
      if (useWm) {
        try { wmBytes = await makeWatermarkBytes(); } catch (e) { wmBytes = null; }
      }
      let lastErr = null, ok = false, fpsOut = fpsWant, outS = S;
      for (let ti = 0; ti < tries.length && !ok; ti++) {
        const tr = tries[ti];
        if (ti > 0) {
          if (cancelled) throw { cancelled: true };
          say(tr.preset === 'ultrafast'
            ? _T('try_ultra')
            : _T('try_light'));
          $('pzProg').style.width = '0%';
          inst = await freshFF();
          if (cancelled) throw { cancelled: true };
        }
        try { inst.FS('unlink', inName); } catch (e) {}
        try { inst.FS('unlink', 'out.mp4'); } catch (e) {}
        try { if (useWm) inst.FS('unlink', 'wm.png'); } catch (e) {}
        say(ti > 0 ? _T('copying1') + tr.preset + _T('copying2') : _T('copying0'));
        inst.FS('writeFile', inName, await inst._fetchFile(file));
        if (useWm && wmBytes) {
          try { inst.FS('writeFile', 'wm.png', wmBytes); } catch (e) {}
        }
        for (const vf of tr.vfList) {
          if (cancelled) throw { cancelled: true };
          try {
            const isBase = vf === tr.vfList[tr.vfList.length - 1];
            say(LV[ti] + (!isBase ? _T('try_hdr') : _T('processing0')));
            await inst.run(...ffArgs(inName, vf, tr.S, tr.preset, tr.xp, useWm && wmBytes));
            ok = true;
            fpsOut = tr.fps;
            outS = tr.S;
            say(_T('done_w') + (ti > 0 ? ' (' + tr.preset + (tr.S !== S ? ', 1080p' : '') + ').' : '.'));
            break;
          } catch (e) {
            if (cancelled) throw { cancelled: true };
            lastErr = e;
          }
        }
        // File rusak → tahap apa pun pasti gagal; langsung tampilkan error.
        if (!ok && isInputErr(lastErr)) break;
      }
      if (!ok) {
        const e2 = lastErr || new Error('ffmpeg gagal');
        e2._lightTried = true;
        throw e2;
      }
      const data = inst.FS('readFile', 'out.mp4');
      const bytes = data.buffer ? data.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
      const blob = new Blob([bytes], { type: 'video/mp4' });
      if (outUrl) { try { URL.revokeObjectURL(outUrl); } catch (e) {} }
      outUrl = URL.createObjectURL(blob);
      const out = $('pzOut');
      out.src = outUrl;
      out.onloadedmetadata = () => {
        $('pzMeta').textContent = _T('pz_result') + out.videoWidth + '×' + out.videoHeight +
          ', ' + fpsOut + ' fps, ' + _T('pz_filesize') + fmtMB(blob.size) + '.';
      };
      $('pzMeta').textContent = _T('pz_result') + fpsOut + ' fps, ' + _T('pz_filesize') + fmtMB(blob.size) + '.';
      const dl = $('pzDl');
      dl.href = outUrl;
      const fname = 'guoke-uploader-hd-' + outS + 'p-' + fpsOut + 'fps.mp4';
      dl.setAttribute('download', fname);
      dl.textContent = '⬇ Download (' + fname + ')';
      // Bagikan langsung ke aplikasi TikTok (Android/HP modern): buka
      // share-sheet sistem, pilih TikTok → masuk layar upload dengan
      // video sudah terlampir. Sembunyi bila browser tak mendukung.
      const sh = $('pzShare');
      if (sh) {
        try {
          const f = new File([blob], fname, { type: 'video/mp4' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) {
            sh.hidden = false;
            sh.onclick = async () => {
              try { await navigator.share({ files: [f], title: fname }); }
              catch (e) { /* pengguna batal */ }
            };
          } else sh.hidden = true;
        } catch (e) { sh.hidden = true; }
      }
      $('pzDone').hidden = false;
      say(_T('done_dl'));
      appToast(_T('hd_ready'));
      try { inst.FS('unlink', inName); } catch (e) {}
      try { inst.FS('unlink', 'out.mp4'); } catch (e) {}
      $('pzDone').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      if (e && e.cancelled) { say(_T('cancelled')); }
      else {
        const msg = String((e && e.message) || e || '');
        let shown;
        if (/memory|alloc|abort|OOM|out of memory|enlarge memory/i.test(msg)) {
          shown = _T('ram_fail');
        } else if (/^(cdn|timeout) |Failed to fetch|NetworkError|network|ERR_/i.test(msg)) {
          shown = _T('ff_fail');
        } else if (/filter|vf|tonemap|zscale|Invalid argument|EINVAL/i.test(msg)) {
          shown = _T('filter_fail');
        } else {
          shown = msg.length < 200 ? (msg || _T('file_fail')) : _T('file_fail');
        }
        // Tampilkan penyebabnya di layar (jangan kosong) + toast + kartu Guoke
        say(shown);
        toast(shown.length < 160 ? shown : _T('file_fail'));
        try {
          const rt = document.getElementById('reinStatusTitle');
          if (rt) rt.textContent = 'Gagal ✕';
          const rd = document.getElementById('reinStatusDesc');
          if (rd) rd.textContent = shown;
          const pw = document.getElementById('reinProgWrap');
          if (pw) pw.hidden = true;
        } catch (_) {}
      }
    } finally {
      $('pzCancel').hidden = true;
      $('pzGo').disabled = false;
    }
  });

  $('pzCancel').addEventListener('click', () => {
    cancelled = true;
    try { if (ff) ff.exit(); } catch (e) {}
    ff = null; ffLoading = null;
    say(_T('cancelling'));
  });
})();
