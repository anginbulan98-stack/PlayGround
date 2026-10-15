#!/usr/bin/env python3
"""Guoke Method - server lokal: menyajikan file statis + proxy /api TikTok.

Jalankan:  python3 server.py [port, default 8000]

Kenapa perlu proxy? Browser diblokir CORS oleh TikTok, jadi halaman video
harus diambil dari sisi server dengan User-Agent browser biasa.

Endpoint:
  GET /api/health            -> {"ok":true,...}
  GET /api/resolve?url=...   -> ikuti redirect (vt/vm/t) sampai URL final,
                                kembalikan {finalUrl, username, videoId}
  GET /api/oembed?url=...    -> data oEmbed resmi TikTok (judul & author)
  GET /api/video?url=...     -> resolve + halaman video + oEmbed,
                                dikembalikan sebagai JSON ternormalisasi.
                                Cache 5 menit, retry 2x, error bertipe.

Semua field berasal dari sumber nyata (lihat `_normalize`). Tidak ada
tebakan/random. Field yang tidak tersedia -> null -> UI tampil
"Data tidak tersedia".
"""
import http.server
import functools
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
CACHE_TTL = 300  # detik
_cache = {}  # key -> (timestamp, payload)

VIDEO_RE = re.compile(r"tiktok\.com/@([^/?#]+)/video/(\d+)")
SCRIPT_RE = re.compile(
    r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>',
    re.S)
BLOCK_MARKERS = ("captcha", "verify-page", "challenge", "SliderCaptcha",
                 "secsdk", "Please verify")


class ApiError(Exception):
    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def _get(url, timeout=20, headers=None, max_bytes=3_000_000):
    req = urllib.request.Request(url, headers=headers or {
        "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(max_bytes + 1)
            return r.status, r.geturl(), body[:max_bytes + 1]
    except urllib.error.HTTPError as e:
        raise ApiError("UPSTREAM", f"TikTok menjawab HTTP {e.code}", 502)
    except Exception as e:
        raise ApiError("NETWORK", f"Gagal menghubungi TikTok: {e}", 502)


def _cached(key, fn):
    now = time.time()
    if key in _cache and now - _cache[key][0] < CACHE_TTL:
        ts, data = _cache[key]
        data = dict(data)
        data["cached"] = True
        return data
    data = fn()
    _cache[key] = (now, data)
    data = dict(data)
    data["cached"] = False
    return data


def api_resolve(url):
    """Ikuti redirect sampai URL final. Mengembalikan finalUrl/username/videoId."""
    if not re.search(r"tiktok\.com|tiktok\.org|tiktokv\.com", url or ""):
        raise ApiError("BAD_URL", "URL harus link TikTok.", 400)

    def fetch():
        last = url
        for _ in range(2):  # coba HEAD dulu, fallback GET
            try:
                req = urllib.request.Request(
                    last, method="HEAD",
                    headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=15) as r:
                    last = r.geturl()
                break
            except Exception:
                status, last, _ = _get(last, timeout=20, max_bytes=5000)
                break
        m = VIDEO_RE.search(last or "")
        return {
            "ok": True,
            "finalUrl": last,
            "username": m.group(1) if m else None,
            "videoId": m.group(2) if m else None,
            "fetchedAt": int(time.time()),
        }
    return _cached("resolve:" + url, fetch)


def api_oembed(canonical_url):
    def fetch():
        for attempt in range(2):
            try:
                status, _, body = _get(
                    "https://www.tiktok.com/oembed?url=" +
                    urllib.parse.quote(canonical_url, safe=""),
                    timeout=15)
                return {"ok": True, "oembed": json.loads(body),
                        "fetchedAt": int(time.time())}
            except ApiError:
                if attempt == 1:
                    raise
                time.sleep(1)
    return _cached("oembed:" + canonical_url, fetch)


def _find_item_struct(scope):
    node = scope.get("webapp.video-detail", {})
    item = node.get("itemInfo", {}).get("itemStruct")
    if item:
        return item
    stack = [scope]
    while stack:
        o = stack.pop()
        if isinstance(o, dict):
            if isinstance(o.get("itemStruct"), dict):
                return o["itemStruct"]
            stack.extend(o.values())
    return None


def _to_int(v):
    try:
        return int(str(v).replace(",", ""))
    except (ValueError, TypeError):
        return None


def _normalize(item):
    """Petakan field halaman -> respons API. None = tidak tersedia."""
    author = item.get("author") or {}
    stats = item.get("stats") or {}
    video = item.get("video") or {}
    music = item.get("music") or {}
    gears = []
    for g in video.get("bitrateInfo") or []:
        pa = g.get("PlayAddr") or {}
        gears.append({
            "gear": g.get("GearName"),
            "codec": g.get("CodecType"),
            "format": g.get("Format"),
            "width": _to_int((pa.get("Width"))),
            "height": _to_int((pa.get("Height"))),
            "fps": _to_int(g.get("BitrateFPS")),
            "bitrateBps": _to_int(g.get("Bitrate")),
            "sizeBytes": _to_int(pa.get("DataSize")),
            "playUrl": (pa.get("UrlList") or [None])[0],
        })
    return {
        "videoId": str(item.get("id") or ""),
        "username": author.get("uniqueId"),
        "nickname": author.get("nickname"),
        "verified": bool(author.get("verified")),
        "privateAccount": bool(author.get("privateAccount")),
        "avatar": author.get("avatarLarger") or author.get("avatarMedium"),
        "caption": item.get("desc"),
        "createTime": _to_int(item.get("createTime")),
        "durationSec": _to_int(video.get("duration")),
        "stats": {
            "views": _to_int(stats.get("playCount")),
            "likes": _to_int(stats.get("diggCount")),
            "comments": _to_int(stats.get("commentCount")),
            "shares": _to_int(stats.get("shareCount")),
            "collects": _to_int(stats.get("collectCount")),
        },
        "tech": {
            "width": _to_int(video.get("width")),
            "height": _to_int(video.get("height")),
            "ratio": video.get("ratio"),
            "definition": video.get("definition"),
            "format": video.get("format"),
            "cover": video.get("cover"),
            "gears": gears,
        },
        "music": {"title": music.get("title"), "author": music.get("authorName")},
    }


def api_video(url):
    resolved = api_resolve(url)
    if not resolved.get("videoId"):
        raise ApiError("BAD_URL",
                       "URL final bukan halaman video (/.../@user/video/ID). "
                       f"URL final: {resolved.get('finalUrl')}", 400)
    canonical = (f"https://www.tiktok.com/@{resolved['username']}"
                 f"/video/{resolved['videoId']}")

    def fetch():
        body = None
        for attempt in range(2):
            try:
                status, final, raw = _get(canonical, timeout=25)
                body = raw.decode("utf-8", errors="replace")
                break
            except ApiError:
                if attempt == 1:
                    raise
                time.sleep(2)
        low = body.lower()
        if any(m.lower() in low for m in BLOCK_MARKERS) and len(body) < 200000:
            raise ApiError("TIKTOK_BLOCKED",
                           "TikTok menampilkan verifikasi/bot-check ke server. "
                           "Tunggu beberapa menit lalu coba lagi.", 503)
        m = SCRIPT_RE.search(body)
        if not m:
            raise ApiError("PARSE_CHANGED",
                           "Struktur halaman TikTok berubah (data JSON tidak "
                           "ditemukan). Laporkan agar parser diperbarui.", 502)
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            raise ApiError("PARSE_CHANGED",
                           "Data JSON TikTok tidak bisa dibaca.", 502)
        item = _find_item_struct(data.get("__DEFAULT_SCOPE__", {}))
        if not item:
            if "privateItem" in body or "login" in low[:5000]:
                raise ApiError("NOT_FOUND",
                               "Video tidak ditemukan, privat, atau dihapus.",
                               404)
            raise ApiError("PARSE_CHANGED",
                           "Blok data video tidak ditemukan di halaman.", 502)
        try:
            oembed = api_oembed(canonical).get("oembed", {})
        except ApiError:
            oembed = {}
        return {"ok": True, "resolved": resolved, "data": _normalize(item),
                "oembed": {"title": oembed.get("title"),
                           "author": oembed.get("author_name"),
                           "thumbnail": oembed.get("thumbnail_url")},
                "fetchedAt": int(time.time())}
    return _cached("video:" + canonical, fetch)


class Handler(http.server.SimpleHTTPRequestHandler):
    # MIME dijamin benar apa pun versi Python (terutama .wasm untuk engine),
    # + cache immutable untuk /vendor agar unduhan engine sekali saja.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json; charset=utf-8",
    }

    def log_message(self, *a):
        pass

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        p = urllib.parse.urlparse(self.path).path
        if p.startswith("/vendor/"):
            self.send_header("Cache-Control",
                             "public, max-age=31536000, immutable")
        elif p in ("/", "/index.html", "/sw.js"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            return self._json({"ok": True, "service": "guoke-proxy",
                               "time": int(time.time())})
        if parsed.path in ("/api/resolve", "/api/oembed", "/api/video"):
            q = urllib.parse.parse_qs(parsed.query)
            url = (q.get("url") or [""])[0].strip()
            if not url:
                return self._json({"ok": False, "code": "BAD_URL",
                                   "message": "Parameter ?url= wajib."}, 400)
            try:
                if parsed.path == "/api/resolve":
                    return self._json(api_resolve(url))
                if parsed.path == "/api/oembed":
                    return self._json(api_oembed(url))
                return self._json(api_video(url))
            except ApiError as e:
                return self._json({"ok": False, "code": e.code,
                                   "message": e.message}, e.status)
            except Exception as e:  # pragma: no cover
                return self._json({"ok": False, "code": "INTERNAL",
                                   "message": str(e)}, 500)
        return super().do_GET()


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Guoke server: http://localhost:{port}  (API: /api/health)")
    srv.serve_forever()
