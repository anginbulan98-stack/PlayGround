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

  const drop = $('pzDrop'), fileEl = $('pzFile');
  if (!drop || !fileEl) return; // panel belum ada → diam

  // Opsi HDR disuntik dari sini (tanpa mengubah HTML statis):
  // "zscale/tonemap bila tersedia" — bila filter tidak ada di core, otomatis fallback.
  (function injectHdr() {
    const box = drop.parentElement && drop.parentElement.querySelector('.calc-controls');
    if (!box || $('pzHdr')) return;
    const lb = document.createElement('label');
    lb.className = 'checkline';
    lb.innerHTML = '<input id="pzHdr" type="checkbox" /> Video HDR / hasil pucat — konversi ke SDR (tonemap)';
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
    const fpsTxt = meta.fps ? meta.fps + ' fps' : '±30 fps (estimasi — browser tak mengekspos fps asli)';
    info.textContent = meta.unplayable
      ? 'Asli: tak bisa diputar browser (format ' + (baseName(f.name).split('.').pop() || '?') +
        ') — tetap bisa diproses, ffmpeg membaca langsung.'
      : 'Asli: ' + w + '×' + h + ', ' + fpsTxt +
        (d ? ', durasi ' + d.toFixed(1) + ' dtk' : '') + ', ' + fmtMB(f.size) + '.';
    const over = [];
    if (f.size > 500 * 1048576) over.push('File ' + fmtMB(f.size) + ' melebihi 500 MB — proses bisa gagal (memori HP) atau hasil > batas upload TikTok.');
    if (d > 180) over.push('Durasi ' + d.toFixed(0) + ' dtk melebihi 3 menit — TikTok mengompres lebih agresif; pertimbangkan bagi jadi beberapa part.');
    if (over.length) { warn.hidden = false; warn.textContent = '⚠ ' + over.join(' '); }
    else warn.hidden = true;
    go.disabled = false;
    say('Siap diproses. Pilih mode output lalu tekan “Proses video”.');
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

  function ffArgs(inName, filter, S, preset, xparams) {
    // Umpan bitrate tertinggi yang masih aman diupload (best-effort lawan
    // kompres TikTok; 2K dapat jatah lebih besar). 100% anti-kompres tidak
    // mungkin — TikTok selalu re-encode ke ~3–8 Mbps.
    const maxr = S >= 1440 ? '35M' : '25M';
    const buf = S >= 1440 ? '70M' : '50M';
    const a = ['-i', inName, '-vf', filter,
      '-c:v', 'libx264', '-preset', preset || 'slow', '-crf', '16'];
    if (xparams) a.push('-x264-params', xparams); // darurat: matikan lookahead (hemat RAM)
    return a.concat(['-maxrate', maxr, '-bufsize', buf, '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out.mp4']);
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

  function loadFF() {
    if (ff) return Promise.resolve(ff);
    if (ffLoading) return ffLoading;
    ffLoading = (async () => {
      if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) {
        throw new Error('Pustaka ffmpeg gagal dimuat (CDN unpkg diblokir/offline). Sambungkan internet lalu coba lagi.');
      }
      const { createFFmpeg, fetchFile } = window.FFmpeg;
      // Build SINGLE-THREAD (core-st): tidak butuh SharedArrayBuffer, jadi
      // jalan di hosting statis/GitHub Pages tanpa header COOP/COEP.
      // (Build multithread lama melempar "SharedArrayBuffer is not defined".)
      const inst = createFFmpeg({
        corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
        log: false,
      });
      inst.setProgress(({ ratio }) => {
        if (cancelled) return;
        const p = Math.max(0, Math.min(1, ratio || 0));
        $('pzProg').style.width = (p * 100).toFixed(1) + '%';
        say('Memproses… ' + Math.round(p * 100) + '%');
      });
      say('Memuat mesin ffmpeg (±30 MB, sekali saja)…');
      await inst.load();
      inst._fetchFile = fetchFile;
      ff = inst;
      return ff;
    })().catch((e) => { ffLoading = null; throw e; });
    return ffLoading;
  }

  $('pzGo').addEventListener('click', async () => {
    if (!file) { appToast('Pilih video dulu'); return; }
    if (!$('pzGo') || $('pzGo').disabled) return;
    cancelled = false;
    $('pzCancel').hidden = false;
    $('pzGo').disabled = true;
    $('pzProgWrap').hidden = false;
    $('pzDone').hidden = true;
    $('pzProg').style.width = '0%';
    try {
      const mode = ($('pzMode') && $('pzMode').value) || 'auto';
      const fpsWant = ($('pzFps') && $('pzFps').value) || '60';
      const interpWant = !!($('pzInterp') && $('pzInterp').checked);
      const hdr = !!($('pzHdr') && $('pzHdr').checked);
      const S = (mode === 'auto2k') ? 1440 : 1080;
      const w = meta && meta.w ? meta.w : 0, h = meta && meta.h ? meta.h : 0;
      const isHP = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
      if (isHP && interpWant) {
        toast('HP terdeteksi: interpolasi rakus memori — bila setting penuh gagal, otomatis dicoba setting ringan.');
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
      const LV = ['', '[Ringan] ', '[Darurat] '];
      const tries = [
        { preset: 'slow', vfList: variantsFull, fps: fpsWant, xp: '', S: S },
        { preset: 'veryfast', vfList: [baseLight], fps: '30', xp: '', S: S },
        { preset: 'ultrafast', vfList: [baseUltra], fps: '30', xp: 'rc-lookahead=0:sync-lookahead=0', S: S3 },
      ];
      const inName = 'in_' + Date.now() + '_' + baseName(file.name).replace(/[^a-zA-Z0-9.]/g, '_');
      let inst = await loadFF();
      if (cancelled) throw { cancelled: true };
      let lastErr = null, ok = false, fpsOut = fpsWant, outS = S;
      for (let ti = 0; ti < tries.length && !ok; ti++) {
        const tr = tries[ti];
        if (ti > 0) {
          if (cancelled) throw { cancelled: true };
          say(tr.preset === 'ultrafast'
            ? 'Masih berat — mencoba tahap darurat (super-hemat memori, tetap HD)…'
            : 'Setting penuh kehabisan memori — mencoba otomatis dengan setting ringan…');
          $('pzProg').style.width = '0%';
          inst = await freshFF();
          if (cancelled) throw { cancelled: true };
        }
        try { inst.FS('unlink', inName); } catch (e) {}
        try { inst.FS('unlink', 'out.mp4'); } catch (e) {}
        say(ti > 0 ? 'Menyalin file (' + tr.preset + ')…' : 'Menyalin file ke memori…');
        inst.FS('writeFile', inName, await inst._fetchFile(file));
        for (const vf of tr.vfList) {
          if (cancelled) throw { cancelled: true };
          try {
            const isBase = vf === tr.vfList[tr.vfList.length - 1];
            say(LV[ti] + (!isBase ? 'Mencoba konversi HDR→SDR…' : 'Memproses… 0%'));
            await inst.run(...ffArgs(inName, vf, tr.S, tr.preset, tr.xp));
            ok = true;
            fpsOut = tr.fps;
            outS = tr.S;
            say('Selesai' + (ti > 0 ? ' (' + tr.preset + (tr.S !== S ? ', 1080p' : '') + ').' : '.'));
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
        $('pzMeta').textContent = 'Hasil: ' + out.videoWidth + '×' + out.videoHeight +
          ', ' + fpsOut + ' fps, ukuran file ' + fmtMB(blob.size) + '.';
      };
      $('pzMeta').textContent = 'Hasil: ' + fpsOut + ' fps, ukuran file ' + fmtMB(blob.size) + '.';
      const dl = $('pzDl');
      dl.href = outUrl;
      const fname = 'guoke-tiktok-hd-' + outS + 'p-' + fpsOut + 'fps.mp4';
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
      say('Selesai — putar pratinjau lalu tekan Download.');
      appToast('Video HD siap didownload ⬇');
      try { inst.FS('unlink', inName); } catch (e) {}
      try { inst.FS('unlink', 'out.mp4'); } catch (e) {}
      $('pzDone').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      if (e && e.cancelled) { say('Dibatalkan.'); }
      else {
        const msg = String((e && e.message) || e || '');
        if (/memory|alloc|abort|OOM|out of memory|enlarge memory/i.test(msg)) {
          say('');
          toast('RAM HP tidak cukup (3 tahap otomatis sudah dicoba). Jalan keluar: potong video jadi <10 dtk, atau tanpa proses — salin Preset di bawah untuk export via CapCut (tanpa makan RAM).');
        } else if (/filter|vf|tonemap|zscale|Invalid argument|EINVAL/i.test(msg)) {
          say('');
          toast('Filter video ditolak mesin — coba mode “Otomatis”, matikan opsi HDR/interpolasi, lalu ulangi.');
        } else {
          say('');
          toast(msg.length < 200 ? msg : 'File tidak bisa dibaca/diproses. Coba MP4 H.264 dulu.');
        }
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
    say('Membatalkan…');
  });
})();
