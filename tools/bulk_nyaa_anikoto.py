#!/usr/bin/env python3
"""Bulk impor ribuan anime sampai tuntas — discovery via anikoto API,
cross-check ketersediaan via nyaa.si RSS (tanpa menyimpan magnet/hash).

Kenapa begini (bukan scrape HTML nyaa.si + bukan simpan torrent):
- nyaa.si = indeks torrent (unduhan, bukan streaming). File 200MB-2GB/episode
  tidak bisa diputar langsung di situs statis (GitHub Pages) dan menyimpan
  magnet/infohash = fasilitasi pembajakan. Jadi repo TIDAK menyimpan magnet.
- nyaa.si dipakai hanya sebagai sinyal "judul ini ada peredarannya"
  (seeders>0 via RSS) + tautan search (tidak di-render di UI).
- Yang dirilis ke katalog = metadata legal (judul/cover/sinopsis/jumlah
  episode dari anikoto API) + streaming embed yang memang sudah dipakai
  app.js (data/eps/*.json on-demand, bukan pre-fetch semua).

Cara kerja:
  1. Enumerasi ID anikoto 1..MAX_ID (default 8000) secara concurrent.
     /series/{id} yang 404 = dilewati. Yang ok = 1 serial.
  2. Opsional --nyaa-check: query RSS nyaa.si per judul
     (https://nyaa.si/?page=rss&c=1_2&q=...) untuk seeders. Lambat
     (throttle), jadi default OFF untuk sprint ribuan; nyalakan belakangan.
  3. Gabung ke data/anime.json + data/anikoto.json (idempoten, resume via
     checkpoint file data/bulk_state.json), lalu sync ke data-anime.js
     via refresh_all.sync_anime_js (mempertahankan status/kind/year manual).

Contoh:
  python3 tools/bulk_nyaa_anikoto.py --max-id 8000 --workers 12
  python3 tools/bulk_nyaa_anikoto.py --max-id 8000 --workers 12 --nyaa-check --nyaa-limit 300

Idempoten: aman dijalankan ulang / via GitHub Actions tiap hari.
"""
import json, os, re, sys, time, html as ihtml
import urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeBulk/1.0"}
TODAY = time.strftime("%Y-%m-%d")
STATE_FP = "data/bulk_state.json"

def get_json(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def get_bytes(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def slugify(title, aid):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or ("rx-%d" % aid)
    return s[:80]

def fetch_series(aid):
    try:
        d = get_json("https://anikotoapi.site/series/%d" % aid)
    except Exception:
        return None
    try:
        anime = (d.get("data") or {}).get("anime") or {}
        eps = (d.get("data") or {}).get("episodes") or []
        title = anime.get("title") or anime.get("alternative") or ""
        if not title:
            return None
        n = len(eps)
        try:
            declared = int(str(anime.get("episodes") or n or 0))
        except ValueError:
            declared = n
        total = max(n, declared)
        genres = ((anime.get("terms_by_type") or {}).get("genre")) or []
        year = anime.get("year") or ""
        try:
            year = int(str(year)[:4])
        except ValueError:
            year = int(TODAY[:4])
        status_raw = str(anime.get("status") or "")
        if "Upcoming" in status_raw or "Not Yet" in status_raw:
            status = "segera"
        else:
            status = "tayang" if ("Continu" in status_raw or "Airing" in status_raw) else "tamat"
        kind = "film" if (total <= 1 and str(anime.get("duration") or "").strip() == "") else ("film" if total == 1 and "movie" in str((anime.get("terms_by_type") or {}).get("type", "")).lower() else "series")
        # film: total==1 + type Movie; sederhanakan: total==1 -> film bila kata Movie ada, else series 1ep
        ttypes = str((anime.get("terms_by_type") or {}).get("type", ""))
        if total == 1:
            kind = "film" if "mov" in ttypes.lower() else "series"
        return {
            "aid": aid, "title": ihtml.unescape(title).strip(),
            "cover": anime.get("poster") or "", "episodes": total,
            "year": year, "genres": genres[:3],
            "synopsis": ihtml.unescape(re.sub(r"<[^>]+>", "", str(anime.get("description") or "")))[:300],
            "status_guess": status, "kind_guess": kind,
        }
    except Exception:
        return None

def nyaa_seeders(title):
    """RSS nyaa.si kategori anime eng-translated; kembalikan (count, seeders_max).
    Tanpa menyimpan magnet/link torrent ke repo."""
    try:
        q = urllib.parse.quote(title)
        raw = get_bytes("https://nyaa.si/?page=rss&c=1_2&f=0&q=%s" % q, timeout=20).decode("utf-8", "replace")
        items = re.findall(r"<item>(.*?)</item>", raw, re.S)
        seeds = [int(x) for x in re.findall(r"<nyaa:seeders>(\d+)</nyaa:seeders>", raw)]
        return len(items), (max(seeds) if seeds else 0)
    except Exception:
        return 0, 0

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-id", type=int, default=8000)
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--nyaa-check", action="store_true")
    ap.add_argument("--nyaa-limit", type=int, default=300)
    ap.add_argument("--nyaa-min-seed", type=int, default=1)
    args = ap.parse_args()

    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    have_ids = {o["id"] for o in ak if o.get("id")}
    have_titles = {o["show"] for o in ak}
    by_show = {s["title"]: s for s in anime["shows"]}

    # resume: lewati ID yang sudah dicek dan 404
    checked = set()
    if os.path.exists(STATE_FP):
        try:
            checked = set(json.load(open(STATE_FP)).get("checked_404", []))
        except Exception:
            pass

    todo = [i for i in range(1, args.max_id + 1) if i not in have_ids and i not in checked]
    print("have=%d checked404=%d todo=%d (1..%d)" % (len(have_ids), len(checked), len(todo), args.max_id))

    found, miss = [], []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        fut = {ex.submit(fetch_series, aid): aid for aid in todo}
        done = 0
        for f in as_completed(fut):
            aid = fut[f]
            done += 1
            try:
                r = f.result()
            except Exception:
                r = None
            if r:
                found.append(r)
            else:
                miss.append(aid)
            if done % 200 == 0:
                print("  ...%d/%d ok=%d" % (done, len(todo), len(found)), flush=True)
            time.sleep(0.02)
    print("enum selesai: ok=%d miss=%d" % (len(found), len(miss)))
    checked |= set(miss)
    try:
        json.dump({"updated": TODAY, "max_id": args.max_id, "checked_404": sorted(checked)},
                  open(STATE_FP, "w"), ensure_ascii=False)
    except Exception as e:
        print("state gagal:", str(e)[:60])

    # filter nyaa (opsional, hanya N pertama biar sprint tetap cepat)
    nyaa_info = {}
    if args.nyaa_check and found:
        cand = sorted(found, key=lambda x: x["aid"])[:args.nyaa_limit]
        print("nyaa-check %d judul (throttle 1.5s)..." % len(cand))
        kept = []
        for r in cand:
            c, s = nyaa_seeders(r["title"])
            nyaa_info[r["title"]] = {"rss_hits": c, "seed_max": s}
            if c > 0 and s >= args.nyaa_min_seed:
                kept.append(r)
            time.sleep(1.5)
        print("nyaa lolos: %d/%d (sisanya tetap bisa dirilis via anikoto)" % (len(kept), len(cand)))
        # default: tetap rilis semua anikoto (lengkap), nyaa hanya anotasi
    if nyaa_info:
        try:
            extra = {}
            if os.path.exists("data/nyaa_availability.json"):
                extra = json.load(open("data/nyaa_availability.json"))
            extra.update(nyaa_info)
            json.dump(extra, open("data/nyaa_availability.json", "w"), ensure_ascii=False, indent=1)
            print("nyaa_availability.json: %d entri" % len(extra))
        except Exception as e:
            print("nyaa json gagal:", str(e)[:60])

    # gabung ke katalog (tanpa magnet, tanpa link torrent)
    added = 0
    for r in sorted(found, key=lambda x: x["aid"]):
        if r["title"] in have_titles:
            continue
        sid = slugify(r["title"], r["aid"])
        # hindari tabrakan slug
        base, k = sid, 2
        while sid in {s["id"] for s in anime["shows"]}:
            sid = "%s-%d" % (base, k); k += 1
        ak.append({"show": r["title"], "id": r["aid"], "slug": "", "apiTitle": r["title"],
                   "episodes": r["episodes"], "match": True, "auto": True, "bulk": TODAY})
        anime["shows"].append({"id": sid, "title": r["title"], "cover": r["cover"],
                               "akid": r["aid"], "episodes": r["episodes"]})
        have_titles.add(r["title"])
        added += 1
    anime["updated"] = TODAY
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    print("ditambahkan: %d | total katalog: %d judul" % (added, len(anime["shows"])))

    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else "tools"))
    try:
        from refresh_all import sync_anime_js
    except ImportError:
        import importlib.util
        spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        sync_anime_js = mod.sync_anime_js
    # perkaya entri baru dengan tebakan status/kind/year/genre/sinopsis agar kartu rapi
    guess = {r["title"]: r for r in found}
    try:
        import re as _re
        raw = open("data-anime.js", encoding="utf-8").read()
        m = _re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, _re.S)
        old = {s["id"]: s for s in (json.loads(m.group(1)).get("shows", []) if m else [])}
    except Exception:
        old = {}
    sync_anime_js(anime, ak)
    # patch kedua: isi default kosong dari tebakan API (sync mempertahankan manual)
    try:
        import re as _re2
        raw2 = open("data-anime.js", encoding="utf-8").read()
        m2 = _re2.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw2, _re2.S)
        payload = json.loads(m2.group(1))
        for s in payload["shows"]:
            g = guess.get(s["title"])
            if not g:
                continue
            o = old.get(s["id"], {})
            if not o.get("status"):
                s["status"] = g["status_guess"]
            if not o.get("kind"):
                s["kind"] = g["kind_guess"]
            if not o.get("year"):
                s["year"] = g["year"]
            if not o.get("genres"):
                s["genres"] = g["genres"]
            if not o.get("synopsis"):
                s["synopsis"] = g["synopsis"]
        open("data-anime.js", "w", encoding="utf-8").write(
            "/* Guoke AMHDQ — KATALOG ANIME (bulk impor; kolom manual dipertahankan. */\nwindow.GQ_ANIME = " +
            json.dumps(payload, ensure_ascii=False, indent=1) + ";\n")
        print("data-anime.js: %d judul (dengan tebakan meta untuk entri baru)" % len(payload["shows"]))
    except Exception as e:
        print("patch meta gagal:", str(e)[:100])

if __name__ == "__main__":
    main()
