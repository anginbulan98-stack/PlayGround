/* Guoke — "Upload TikTok Quality" (tab di pinggir kategori Manhwa).
 * Sengaja TIDAK mengubah public/guoke.js (bundle). Script ini menempel
 * lewat DOM: menyisipkan tab ke-4 di setiap bar kategori
 * Semua / Anime / Manhwa, lalu membuka halaman tool sebagai overlay
 * gaya bawaan Guoke (.ovl/.pad/.card/.btn). Semua proses lokal.
 */
(function () {
  if (window.__ttq) return;
  window.__ttq = true;

  var LABEL = "Upload TikTok Quality";
  var TABLE = {
    "1080x1920": { 30: 12, 60: 20, 120: 30 },
    "1440x2560": { 30: 20, 60: 32, 120: 45 }
  };

  /* ---------- gaya tambahan (terisolasi di #ttq) ---------- */
  function ensureCss() {
    if (document.getElementById("ttq-style")) return;
    var s = document.createElement("style");
    s.id = "ttq-style";
    s.textContent =
      ".tabs b[data-ttq]{color:var(--ac);font-weight:700;white-space:nowrap}" +
      "#ttq .ttq-drop{border:1.5px dashed var(--bd);border-radius:12px;padding:22px 14px;" +
      "text-align:center;color:var(--mu);cursor:pointer;background:var(--sf)}" +
      "#ttq .ttq-drop.on{border-color:var(--ac);color:var(--tx)}" +
      "#ttq select,#ttq input[type=number]{width:100%;background:var(--sf);color:var(--tx);" +
      "border:1px solid var(--bd);border-radius:10px;padding:10px 12px;font-size:13px;outline:0}" +
      "#ttq label{display:grid;gap:6px;font-size:11px;font-weight:600;color:var(--mu);margin-bottom:10px}" +
      "#ttq pre{white-space:pre-wrap;word-break:break-word;background:var(--sf2);" +
      "border:1px solid var(--bd);border-radius:10px;padding:10px;font-size:11px;" +
      "line-height:1.6;color:var(--tx);font-family:ui-monospace,Menlo,monospace}" +
      "#ttq .ttq-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}" +
      "#ttq .ttq-out{background:var(--sf);border:1px solid var(--bd);border-radius:12px;" +
      "padding:10px;text-align:center}" +
      "#ttq .ttq-out small{display:block;color:var(--mu);font-size:10px}" +
      "#ttq .ttq-out b{display:block;margin-top:4px;font-size:14px}" +
      "#ttq .ttq-note{font-size:12px;color:var(--mu);line-height:1.6}" +
      "#ttq .ttq-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}" +
      "#ttq .ttq-h{font-size:15px;margin:0}" +
      "#ttq .ttq-p{font-size:12px;color:var(--mu);line-height:1.6;margin:6px 0 0}" +
      "#ttq .ttq-li{font-size:12px;color:var(--mu);line-height:1.65;margin:6px 0 0;padding-left:18px}";
    document.head.appendChild(s);
  }

  /* ---------- kerangka halaman tool ---------- */
  function ensureOverlay() {
    var o = document.getElementById("ttq");
    if (o) return o;
    o = document.createElement("div");
    o.className = "ovl";
    o.id = "ttq";
    o.innerHTML =
      '<div class="top" style="position:sticky;top:0;background:var(--bg);align-items:center">' +
      '<button class="rb" style="background:var(--sf2);color:var(--tx)" data-ttq-close>←</button>' +
      "<b>Upload TikTok Quality</b><span style='width:36px'></span></div>" +
      '<div class="pad">' +
      '<div class="pro"><b>Upload HD • 2K • 60/120FPS</b>' +
      "<p style='font-size:12px;opacity:.92;margin-top:4px'>Jujur dulu: TikTok selalu me-re-encode video. " +
      "Tapi file 2K + bitrate tinggi + 60fps hasilnya jauh lebih bersih. Semua dicek lokal, tanpa upload server.</p></div>" +
      '<div class="sh">CEK VIDEO</div>' +
      '<div class="sg"><div style="padding:14px">' +
      '<div class="ttq-drop" id="ttq-drop">Tarik & letakkan video di sini<br>' +
      '<small>atau klik untuk pilih file MP4/MOV</small></div>' +
      '<input id="ttq-file" type="file" accept="video/mp4,video/quicktime,video/*" hidden>' +
      '<div id="ttq-result" style="margin-top:10px"></div>' +
      "</div></div>" +
      '<div class="sh">KALKULATOR EXPORT 2K / 120FPS</div>' +
      '<div class="sg"><div style="padding:14px">' +
      "<label>Resolusi<select id='ttq-res'>" +
      "<option value='1080x1920'>1080×1920 — Full HD (paling aman)</option>" +
      "<option value='1440x2560' selected>1440×2560 — 2K QHD (paling tajam)</option>" +
      "</select></label>" +
      "<label>FPS timeline<select id='ttq-fpsin'>" +
      "<option value='30'>30 FPS — ngomong / daily</option>" +
      "<option value='60' selected>60 FPS — dance / transisi</option>" +
      "<option value='120'>120 FPS — slow-motion</option>" +
      "</select></label>" +
      "<label>Durasi video (detik)<input id='ttq-dur' type='number' min='1' max='600' value='30'></label>" +
      "<label>Codec<select id='ttq-codec'>" +
      "<option value='h264' selected>H.264 — paling kompatibel</option>" +
      "<option value='h265'>H.265 / HEVC — file ±40% lebih kecil</option>" +
      "</select></label>" +
      '<div class="ttq-grid">' +
      '<div class="ttq-out"><small>BITRATE</small><b id="ttq-br">–</b></div>' +
      '<div class="ttq-out"><small>PERKIRAAN FILE</small><b id="ttq-size">–</b></div>' +
      '<div class="ttq-out"><small>UPLOAD</small><b id="ttq-fps">–</b></div>' +
      "</div>" +
      '<p class="ttq-note" id="ttq-note"></p>' +
      "<h2 class='ttq-h' style='margin-top:12px'>Preset CapCut PC</h2><pre id='ttq-preset'></pre>" +
      "<h2 class='ttq-h' style='margin-top:12px'>FFmpeg</h2><pre id='ttq-ff'></pre>" +
      '<div class="ttq-row"><button class="btn" id="ttq-cp1">Salin Preset</button>' +
      '<button class="btn g" id="ttq-cp2">Salin FFmpeg</button></div>' +
      "</div></div>" +
      '<div class="sh">PANDUAN SINGKAT</div>' +
      '<div class="card" style="display:block;cursor:default"><b>CapCut PC (gratis)</b>' +
      "<ol class='ttq-li'><li>Rasio 9:16 — 1440×2560 (lag? pakai 1080×1920).</li>" +
      "<li>60fps (biasa) / 60fps hasil slow-mo 120fps. TikTok mentok tampil 60fps.</li>" +
      "<li>Bitrate Recommended/Higher, H.264, MP4, AAC 320kbps.</li>" +
      "<li>Upload via tiktok.com/upload + matikan mode hemat data.</li></ol></div>" +
      '<div class="card" style="display:block;cursor:default;margin-top:10px"><b>Setting 120FPS yang benar</b>' +
      "<ol class='ttq-li'><li>Rekam 120fps hanya untuk slow-motion (shutter 1/240).</li>" +
      "<li>Edit jadi 0.5× di timeline 60fps, export tetap 60fps.</li>" +
      "<li>Naikkan bitrate ±1.5× dari preset 60fps.</li></ol></div>" +
      '<div class="sh">FAQ</div>' +
      '<div class="card" style="display:block;cursor:default"><b>Bisa 0% kompres?</b>' +
      "<p class='ttq-p'>Tidak. TikTok selalu encode ulang (~3–8 Mbps). File umpan berkualitas tinggi = hasil akhir tetap bagus.</p></div>" +
      '<div class="card" style="display:block;cursor:default;margin-top:10px"><b>2K & 120fps didukung?</b>' +
      "<p class='ttq-p'>Upload 2K (1440×2560) bisa & disarankan. 120fps diterima tapi ditampilkan maks ±60fps — gunanya untuk slow-motion mulus.</p></div>" +
      '<div style="height:20px"></div>' +
      "</div>";
    (document.getElementById("app") || document.body).appendChild(o);
    bindTool(o);
    return o;
  }

  function copyText(t, ok) {
    function done() {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(t).then(ok, ok);
          return;
        }
      } catch (e) {}
      var ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      try { ta.select(); document.execCommand("copy"); } catch (e) {}
      try { document.body.removeChild(ta); } catch (e) {}
      ok();
    }
    done();
  }

  /* ---------- logika tool ---------- */
  function bindTool(o) {
    var q = function (id) { return o.querySelector("#" + id); };
    var drop = q("ttq-drop"), file = q("ttq-file"), res = q("ttq-result");

    drop.addEventListener("click", function () { file.click(); });
    ["dragover", "dragenter"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("on"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("on"); });
    });
    drop.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) analyze(f);
    });
    file.addEventListener("change", function () { if (file.files[0]) analyze(file.files[0]); });

    function analyze(f) {
      var url = URL.createObjectURL(f);
      var v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = function () {
        var w = v.videoWidth, h = v.videoHeight, d = v.duration || 0;
        var br = d > 0 ? (f.size * 8) / d / 1e6 : 0;
        var isVertical = h >= w;
        var isHD = Math.min(w, h) >= 1070 && Math.max(w, h) >= 1900;
        var is2K = Math.min(w, h) >= 1430;
        var goodBr = is2K ? br >= 18 : br >= 12;
        var tips = [];
        if (!isVertical) tips.push("Landscape — export ulang 9:16 (1080×1920 / 1440×2560).");
        if (!isHD) tips.push("Di bawah Full HD — export ulang minimal 1080×1920.");
        if (!goodBr) tips.push("Bitrate " + br.toFixed(1) + " Mbps kerendahan — naikkan ke " + (is2K ? "25–45" : "15–25") + " Mbps.");
        if (f.size > 500 * 1048576) tips.push("File >500MB — rawan gagal upload, pakai H.265 / bagi part.");
        var verdict = (isVertical && isHD && goodBr)
          ? "✓ SIAP UPLOAD HD — upload via tiktok.com/upload."
          : (isHD ? "△ HAMPIR HD — perbaiki " + tips.length + " hal di bawah." : "✕ BELUM LAYAK HD — export ulang ikut preset.");
        res.innerHTML =
          '<div class="ttq-grid">' +
          '<div class="ttq-out"><small>RESOLUSI</small><b>' + w + "×" + h + "</b></div>" +
          '<div class="ttq-out"><small>DURASI</small><b>' + d.toFixed(1) + "s</b></div>" +
          '<div class="ttq-out"><small>BITRATE EST.</small><b>' + br.toFixed(1) + " Mbps</b></div>" +
          "</div><p class='ttq-note'><b style='color:var(--tx)'>" + verdict + "</b>" +
          (tips.length ? "<br>• " + tips.join("<br>• ") : "") + "</p>";
        try { URL.revokeObjectURL(url); } catch (e) {}
      };
      v.onerror = function () { res.innerHTML = "<p class='ttq-note'>File tidak terbaca. Pakai MP4/MOV.</p>"; };
      v.src = url;
    }

    function calc() {
      var r = q("ttq-res").value, fps = Number(q("ttq-fpsin").value);
      var dur = Math.min(600, Math.max(1, Number(q("ttq-dur").value) || 30));
      var codec = q("ttq-codec").value;
      var br = TABLE[r][fps];
      if (codec === "h265") br = Math.round(br * 0.6);
      var sizeMB = ((br * 1e6 * dur) / 8) / 1048576;
      q("ttq-br").textContent = br + " Mbps";
      q("ttq-size").textContent = "≈" + sizeMB.toFixed(0) + " MB";
      q("ttq-fps").textContent = fps === 120 ? "60 (slow-mo)" : fps + " FPS";
      var WH = r.split("x"), W = WH[0], H = WH[1];
      var over = sizeMB > (r.indexOf("1440") === 0 ? 500 : 250);
      q("ttq-note").textContent =
        (fps === 120 ? "120FPS: rekam 120fps, edit slow-mo, export 60fps (TikTok maks ±60fps). " : "") +
        (over ? "⚠ Melebihi batas aman — bagi jadi 2 part / pakai H.265." : "✓ Ukuran aman untuk WiFi stabil.") +
        " Audio AAC 320kbps + faststart.";
      var vfFps = fps === 120 ? "60" : String(fps);
      q("ttq-preset").textContent =
        "CapCut PC → Export:\n• " + W + "×" + H + " (9:16)\n• " + (fps === 120 ? "60fps (hasil slow-mo)" : fps + "fps") +
        "\n• MP4 • " + (codec === "h265" ? "H.265" : "H.264") + " • " + br + " Mbps\n• AAC 320kbps 48kHz";
      q("ttq-ff").textContent =
        'ffmpeg -i input.mp4 -vf "scale=' + W + ":" + H + ":flags=lanczos,fps=" + vfFps + '" ' +
        "-c:v " + (codec === "h265" ? "libx265" : "libx264") + " -preset slow " +
        (codec === "h265" ? "-crf 20 " : "-crf 17 ") +
        "-pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart output-tiktok-HD.mp4";
    }
    ["ttq-res", "ttq-fpsin", "ttq-dur", "ttq-codec"].forEach(function (id) {
      q(id).addEventListener("input", calc);
      q(id).addEventListener("change", calc);
    });
    q("ttq-cp1").addEventListener("click", function () {
      copyText(q("ttq-preset").textContent, function () { q("ttq-cp1").textContent = "Disalin ✓"; });
    });
    q("ttq-cp2").addEventListener("click", function () {
      copyText(q("ttq-ff").textContent, function () { q("ttq-cp2").textContent = "Disalin ✓"; });
    });
    calc();
  }

  /* ---------- buka / tutup ---------- */
  function open() {
    ensureCss();
    var o = ensureOverlay();
    o.classList.add("on");
    o.scrollTop = 0;
  }
  function close() {
    var o = document.getElementById("ttq");
    if (o) o.classList.remove("on");
    document.querySelectorAll(".tabs b[data-ttq]").forEach(function (b) { b.classList.remove("on"); });
  }

  /* ---------- sisip tab di pinggir Manhwa ---------- */
  function patchTabs(bar) {
    var bs = bar.querySelectorAll("b");
    if (!bs.length || bar.querySelector("[data-ttq]")) return;
    var hasSemua = false, hasAnime = false, manhwa = null;
    bs.forEach(function (b) {
      var t = (b.textContent || "").trim();
      if (t === "Semua") hasSemua = true;
      else if (t === "Anime") hasAnime = true;
      else if (t === "Manhwa") manhwa = b;
    });
    if (!(hasSemua && hasAnime && manhwa)) return; // bukan bar kategori (mis. Pustaka)
    var b = document.createElement("b");
    b.setAttribute("data-ttq", "1");
    b.textContent = LABEL;
    if (manhwa.after) manhwa.after(b);
    else if (manhwa.parentNode) manhwa.parentNode.insertBefore(b, manhwa.nextSibling);
  }
  function injectAll() {
    document.querySelectorAll(".tabs").forEach(patchTabs);
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-ttq]") : null;
    if (t) {
      e.stopPropagation();
      var bar = t.closest(".tabs");
      if (bar) bar.querySelectorAll("b").forEach(function (b) { b.classList.remove("on"); });
      t.classList.add("on");
      open();
      return;
    }
    if (e.target && e.target.closest && e.target.closest("[data-ttq-close]")) {
      close();
      return;
    }
    // klik tab kategori lain saat tool terbuka → tutup tool, biarkan Guoke jalan
    var other = e.target && e.target.closest ? e.target.closest(".tabs b:not([data-ttq])") : null;
    if (other && document.getElementById("ttq")) close();
  }, true);

  function init() {
    ensureCss();
    injectAll();
    var root = document.getElementById("app") || document.body;
    if (window.MutationObserver) {
      var deb = null;
      new MutationObserver(function () {
        if (deb) return;
        deb = setTimeout(function () { deb = null; injectAll(); }, 60);
      }).observe(root, { childList: true, subtree: true });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
