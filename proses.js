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

  function ffArgs(inName, filter) {
    return ['-i', inName, '-vf', filter,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
      '-maxrate', '25M', '-bufsize', '50M', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out.mp4'];
  }

  function loadFF() {
    if (ff) return Promise.resolve(ff);
    if (ffLoading) return ffLoading;
    ffLoading = (async () => {
      if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) {
        throw new Error('Pustaka ffmpeg.wasm gagal dimuat (CDN unpkg diblokir/offline). Sambungkan internet lalu coba lagi.');
      }
      const { createFFmpeg, fetchFile } = window.FFmpeg;
      const inst = createFFmpeg({
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
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
      const inst = await loadFF();
      if (cancelled) throw { cancelled: true };
      const mode = ($('pzMode') && $('pzMode').value) || 'auto';
      const fpsOut = ($('pzFps') && $('pzFps').value) || '60';
      const interp = !!($('pzInterp') && $('pzInterp').checked);
      const hdr = !!($('pzHdr') && $('pzHdr').checked);
      const S = (mode === 'auto2k') ? 1440 : 1080;
      const w = meta && meta.w ? meta.w : 0, h = meta && meta.h ? meta.h : 0;
      const base = buildFilter(mode, w, h, fpsOut, interp, S);
      // Varian filter: HDR→SDR dulu bila diminta, lalu versi polos. "Bila tersedia":
      // bila core tak punya tonemap/zscale, run gagal dan otomatis fallback.
      const variants = hdr
        ? ['tonemap=hable:desat=0,' + base, 'tonemap=clip,' + base, base]
        : [base];
      const inName = 'in_' + Date.now() + '_' + baseName(file.name).replace(/[^a-zA-Z0-9.]/g, '_');
      try { inst.FS('unlink', inName); } catch (e) {}
      try { inst.FS('unlink', 'out.mp4'); } catch (e) {}
      say('Menyalin file ke memori…');
      inst.FS('writeFile', inName, await inst._fetchFile(file));
      let lastErr = null, ok = false;
      for (const vf of variants) {
        if (cancelled) throw { cancelled: true };
        try {
          say(hdr && vf !== base ? 'Mencoba konversi HDR→SDR…' : 'Memproses… 0%');
          await inst.run(...ffArgs(inName, vf));
          ok = true;
          say(hdr && vf !== base ? 'Selesai dengan konversi HDR→SDR.' : 'Selesai.');
          break;
        } catch (e) {
          if (cancelled) throw { cancelled: true };
          lastErr = e;
        }
      }
      if (!ok) throw lastErr || new Error('ffmpeg gagal');
      const data = inst.FS('readFile', 'out.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
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
      dl.setAttribute('download', 'guoke-tiktok-hd.mp4');
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
        if (/memory|alloc|abort|OOM/i.test(msg)) {
          say('');
          toast('Memori habis — tutup tab/aplikasi lain, pakai video lebih pendek, atau pilih 30fps lalu coba lagi.');
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
