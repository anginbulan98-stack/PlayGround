#!/usr/bin/env python3
"""Auto-rilis anime per 1 DETIK — dari nyaa.si, langsung bisa ditonton.

Prinsip (tanpa menyimpan magnet/hash torrent):
  1. Sumber rilis: nyaa.si RSS anime (https://nyaa.si/?page=rss&c=1_2&f=0)
     → judul rilis terbaru per detik.
  2. Watchable: tiap judul dicocokkan ke anikoto API (/series/{id} via
     search slug → watch page → numeric ID → detail API).
     Hanya yang punya embed playable (SUB/DUB) yang DIRILIS ke katalog.
     Tanpa playable = dilewati (tidak dirilis).
  3. Irama 1 detik: TEPAT 1 judul diproses per 1 detik (time.sleep menjaga
     jeda minimal 1.0 dtk antar judul). Ini ritme tercepat yang aman untuk
     nyaa.si tanpa di-ban (jangan turunkan di bawah 1.0).

Output: data/anime.json + data/anikoto.json + data/eps/{id}.json
        + data/nyaa_availability.json + data/rilis_1detik_state.json
        + sync data-anime.js (kolom manual dipertahankan).

Contoh:
  python3 tools/rilis_1detik_nyaa.py --limit 60            # 60 judul, 1/detik
  python3 tools/rilis_1detik_nyaa.py --loop --loop-secs 600  # jalan 10 mnt, 1/detik
  python3 tools/rilis_1detik_nyaa.py --rss-pages 3 --limit 100

Idempoten: judul sudah dirilis (akid dikenal / norm judul dikenal) dilewati
tetap dengan jeda 1 detik agar irama stabil (tidak ngebut).
"""
import json
import os
import re
import sys
import time
import html as ihtml
import urllib.request
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET
from collections import Counter

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeRilis1s/1.0"}
TODAY = time.strftime("%Y-%m-%d")
STATE_FP = "data/rilis_1detik_state.json"
TICK_SECS = 1.0  # WAJIB: rilis per 1 detik, jangan < 1.0 (anti-ban nyaa.si)


def get_text(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def get_json(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def norm(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())


# ---------- 1. RSS nyaa.si: daftar rilis terbaru ----------

def fetch_nyaa_rss(pages=2):
    """Ambil item RSS nyaa.si (kategori anime eng). Kembalikan list dict.

    Tanpa menyimpan magnet/hash — hanya judul + seeders + waktu.
    """
    out = []
    for _p in range(max(1, pages)):
        # nyaa RSS tidak punya param page nomor; ambil 1 feed (75 item terbaru).
        # pages>1 = ambil ulang dengan jeda (feed selalu terbaru).
        try:
            raw = get_text("https://nyaa.si/?page=rss&c=1_2&f=0")
        except Exception as e:
            print("  nyaa RSS gagal: %s" % str(e)[:80], flush=True)
            break
        try:
            root = ET.fromstring(raw)
        except Exception:
            # fallback: regex kasar
            for m in re.finditer(
                r"<item>.*?<title>(.*?)</title>.*?<nyaa:seeders>(\d+)</nyaa:seeders>",
                raw, re.S,
            ):
                out.append({
                    "raw": ihtml.unescape(m.group(1)).strip(),
                    "seeds": int(m.group(2)),
                })
            break
        ns = {"nyaa": "https://nyaa.si/xmlns/nyaa"}
        for it in root.iter("item"):
            title_el = it.find("title")
            seed_el = it.find("nyaa:seeders", ns)
            title = (title_el.text or "").strip() if title_el is not None else ""
            try:
                seeds = int((seed_el.text or "0").strip())
            except Exception:
                seeds = 0
            if title:
                out.append({"raw": ihtml.unescape(title), "seeds": seeds})
        if pages > 1:
            time.sleep(TICK_SECS)
        else:
            break
    # unik berdasarkan judul mentah
    seen, uniq = set(), []
    for o in out:
        if o["raw"] not in seen:
            seen.add(o["raw"])
            uniq.append(o)
    return uniq


SUBBER_PAT = re.compile(
    r"^\s*(?:\[[^\]]+\]\s*)+", re.UNICODE,
)
EP_PAT = re.compile(
    r"(?:S\d{1,2}E| - |EP?\.?\s*|Episode\s*)(\d{1,4})(?:\s*(?:v\d|END|\[|\())?",
    re.I,
)
RES_PAT = re.compile(r"1080p|720p|2160p|4k|hevc|x265|x264", re.I)


def clean_title(raw):
    """'[Subber] One Piece - 1143 [1080p]' -> 'One Piece'."""
    t = SUBBER_PAT.sub("", raw or "").strip()
    t = re.sub(r"\s*\[.*?\]\s*", " ", t)  # sisa tag [1080p] dsb
    t = re.sub(r"\s*\(.*?\)\s*$", "", t).strip()  # '(2026)' buntut file
    # potong penanda episode: 'One Piece - 1143' / 'Title S02E03' -> 'Title'
    t = re.split(
        r"\s+-\s+\d{1,4}(?:v\d)?\b|\s+E\d{1,4}\b|\s+Episode\s+\d+"
        r"|\s+S\d{1,2}\s*E\d{1,3}\b|\s+S\d{1,2}\s*-\s*\d{1,3}\b",
        t, maxsplit=1, flags=re.I,
    )[0].strip(" -–—")
    t = RES_PAT.sub("", t).strip(" -_.")
    return re.sub(r"\s{2,}", " ", t).strip() or raw.strip()


# ---------- 2. Mapping ke anikoto (watchable) ----------

AID_PATTERNS = [
    r'data-anime-id="(\d+)"',
    r'data-id="(\d+)"',
    r'/anime/getinfo/(\d+)',
    r'mangaId\s*=\s*(\d+)',
    r'name="show_id"\s+value="(\d+)"',
]


def api_detail(aid):
    try:
        return get_json("https://anikotoapi.site/series/%d" % aid)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except Exception:
        raise


def search_slugs(title):
    q = urllib.parse.quote(title)
    try:
        html = get_text("https://anikototv.to/search?keyword=%s" % q)
    except Exception as e:
        return [], "search_fail:%s" % str(e)[:50]
    slugs = re.findall(r"/watch/([a-z0-9\-]+)/ep-1", html)
    seen, out = set(), []
    for s in slugs:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out, "ok:%d" % len(out)


def slug_base(slug):
    return re.sub(r"-[a-z0-9]{4,6}$", "", slug)


def rank_slugs(slugs, title):
    nt = norm(title)
    scored = []
    for s in slugs:
        nsb = norm(slug_base(s))
        if nsb == nt:
            base = 0
        elif nsb and (nsb in nt or nt in nsb):
            base = 1
        else:
            base = 3
        scored.append((base, s))
    scored.sort()
    return [s for _, s in scored]


def extract_aid(slug):
    try:
        html = get_text("https://anikototv.to/watch/%s/ep-1" % slug)
    except Exception as e:
        return None, "watch_fail:%s" % str(e)[:50]
    cands = []
    for pat in AID_PATTERNS:
        cands += [int(n) for n in re.findall(pat, html)]
    cands = [c for c in cands if 10 <= c <= 999999 and not (1900 <= c <= 2035)]
    if not cands:
        return None, "no_candidate"
    for aid, _ in Counter(cands).most_common(4):
        try:
            d = api_detail(aid)
        except Exception:
            time.sleep(1)
            continue
        if d and ((d.get("data") or {}).get("anime") or {}).get("title"):
            return aid, "ok"
        time.sleep(0.4)
    return None, "no_valid"


def titles_match(katalog_title, api_title):
    nt, na = norm(katalog_title), norm(api_title)
    if not na:
        return False
    return na == nt or na in nt or nt in na


def map_to_watchable(title):
    """Kembalikan (aid, api_title, eps_playable) atau (None, why, [])."""
    slugs, _info = search_slugs(title)
    if not slugs:
        return None, "no_search_result", []
    for slug in rank_slugs(slugs, title)[:3]:
        aid, _why = extract_aid(slug)
        if not aid:
            time.sleep(0.4)
            continue
        try:
            d = api_detail(aid)
        except Exception:
            time.sleep(1)
            continue
        if not d:
            continue
        adata = d.get("data") or {}
        api_title = ihtml.unescape(
            str(((adata.get("anime")) or {}).get("title") or "")).strip()
        if not titles_match(title, api_title):
            continue
        eps_raw = adata.get("episodes") or []
        eps = [{
            "n": e.get("number"),
            "t": e.get("title") or ("Episode %s" % e.get("number")),
            "e": e.get("embed_url") or {},
        } for e in eps_raw]
        playable = [e for e in eps if e.get("e")]
        if not playable:
            return None, "no_playable_eps:%s" % api_title, []
        try:
            eps.sort(key=lambda e: (
                int(e["n"]) if str(e["n"]).isdigit() else 99999))
        except Exception:
            pass
        return aid, api_title, eps
    return None, "no_match", []


# ---------- 3. Loop 1 detik ----------

def load_state():
    try:
        return json.load(open(STATE_FP))
    except Exception:
        return {"updated": TODAY, "done": {}}


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=60,
                    help="maks judul diproses per run (1 judul/detik)")
    ap.add_argument("--rss-pages", type=int, default=2)
    ap.add_argument("--min-seed", type=int, default=0,
                    help="lewati rilis nyaa dengan seed < N (default 0=rillis semua)")
    ap.add_argument("--loop", action="store_true",
                    help="jalan terus sampai --loop-secs")
    ap.add_argument("--loop-secs", type=int, default=600)
    ap.add_argument("--tick", type=float, default=TICK_SECS)
    args = ap.parse_args()
    tick = max(1.0, float(args.tick))  # jangan pernah < 1.0

    anime = json.load(open("data/anime.json"))
    ak = json.load(open("data/anikoto.json"))
    try:
        nyaa_info = json.load(open("data/nyaa_availability.json"))
    except Exception:
        nyaa_info = {}
    have_ids = {o["id"] for o in ak if o.get("id")}
    have_norm = {norm(s["title"]) for s in anime["shows"]}
    have_slugs = {s["id"] for s in anime["shows"]}
    state = load_state()
    done = state.get("done", {})

    t_end = time.time() + args.loop_secs if args.loop else None
    released = skipped = 0
    processed = 0

    def one_cycle():
        nonlocal released, skipped, processed
        items = fetch_nyaa_rss(pages=args.rss_pages)
        print("nyaa RSS: %d item terbaru" % len(items), flush=True)
        for it in items:
            if not args.loop and processed >= args.limit:
                return False  # selesai
            if args.loop and time.time() >= t_end:
                return False
            t0 = time.time()
            processed += 1
            title = clean_title(it["raw"])
            key = norm(title)
            # sudah dirilis → lewati TAPI tetap 1 detik (irama stabil)
            if key in have_norm or key in done:
                skipped += 1
                print("[%d] SKIP (sudah rilis) %s" % (processed, title),
                      flush=True)
            elif it["seeds"] < args.min_seed:
                skipped += 1
                done[key] = {"status": "skip_seed", "seeds": it["seeds"],
                             "at": TODAY}
                print("[%d] SKIP (seed %d) %s"
                      % (processed, it["seeds"], title), flush=True)
            else:
                aid, api_title, eps = map_to_watchable(title)
                if not aid:
                    skipped += 1
                    done[key] = {"status": "no_watchable",
                                 "why": str(api_title)[:80], "at": TODAY}
                    print("[%d] LEWAT (belum bisa ditonton: %s) %s"
                          % (processed, api_title, title), flush=True)
                else:
                    # cegah duplikat: aid sudah dipakai judul lain = varian
                    # penamaan file yang sama kontennya → lewati
                    if aid in have_ids:
                        skipped += 1
                        done[key] = {"status": "dup_aid", "aid": aid,
                                     "at": TODAY}
                        print("[%d] SKIP (varian duplikat aid %d) %s"
                              % (processed, aid, title), flush=True)
                    else:
                        # RILIS: tulis eps + katalog (langsung bisa ditonton)
                        json.dump(
                            {"id": aid, "updated": TODAY, "episodes": eps},
                            open("data/eps/%d.json" % aid, "w"),
                            ensure_ascii=False)
                        import re as _re
                        sid = _re.sub(r"[^a-z0-9]+", "-",
                                              title.lower()).strip("-") or (
                            "rx-%d" % aid)
                        sid = sid[:80]
                        base, k = sid, 2
                        while sid in have_slugs:
                            sid = "%s-%d" % (base, k)
                            k += 1
                        cover = ""
                        try:
                            dd = api_detail(aid)
                            cover = ((dd.get("data") or {}).get("anime")
                                     or {}).get("poster") or ""
                        except Exception:
                            cover = ""
                        ak.append({"show": title, "id": aid, "slug": "",
                                   "apiTitle": api_title,
                                   "episodes": len(eps), "match": True,
                                   "auto": True, "via_nyaa_1s": True,
                                   "bulk": TODAY,
                                   "nyaa_hits": 1,
                                   "nyaa_seed": it["seeds"]})
                        have_ids.add(aid)
                        anime["shows"].append({"id": sid, "title": title,
                                               "cover": cover, "akid": aid,
                                               "episodes": len(eps)})
                        have_slugs.add(sid)
                        have_norm.add(key)
                        nyaa_info[title] = {"rss_hits": 1,
                                            "seed_max": it["seeds"],
                                            "checked": TODAY, "akid": aid}
                        done[key] = {"status": "released", "aid": aid,
                                     "at": TODAY}
                        released += 1
                        print("[%d] RILIS ▶ %s (%d eps playable, seed %d) "
                              "— langsung bisa ditonton"
                              % (processed, title, len(eps), it["seeds"]),
                              flush=True)
                        if released % 10 == 0:
                            anime["updated"] = TODAY
                            json.dump(anime, open("data/anime.json", "w"),
                                      ensure_ascii=False)
                            json.dump(ak, open("data/anikoto.json", "w"),
                                      ensure_ascii=False, indent=1)
                            json.dump(nyaa_info,
                                      open("data/nyaa_availability.json", "w"),
                                      ensure_ascii=False, indent=1)
                            json.dump({"updated": TODAY, "done": done},
                                      open(STATE_FP, "w"), ensure_ascii=False)
                            print("  checkpoint: rilis=%d lewati=%d" % (
                                released, skipped), flush=True)
            # JEDA 1 DETIK — inti permintaan: rilis per 1 detik
            dt = time.time() - t0
            if dt < tick:
                time.sleep(tick - dt)
        return True if args.loop else False

    if args.loop:
        while time.time() < t_end:
            cont = one_cycle()
            if not cont:
                break
            time.sleep(tick)
    else:
        one_cycle()

    anime["updated"] = TODAY
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    json.dump(nyaa_info, open("data/nyaa_availability.json", "w"),
              ensure_ascii=False, indent=1)
    json.dump({"updated": TODAY, "done": done}, open(STATE_FP, "w"),
              ensure_ascii=False)
    print("SELESAI 1-DETIK: rilis=%d lewati=%d total_katalog=%d" % (
        released, skipped, len(anime["shows"])), flush=True)

    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "refresh_all", "tools/refresh_all.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.sync_anime_js(anime, ak)
    print("data-anime.js synced", flush=True)


if __name__ == "__main__":
    main()
