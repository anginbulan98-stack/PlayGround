#!/usr/bin/env python3
"""Rilis semua anime 2026 sampai tuntas + langsung bisa ditonton.
Sumber watchable: anikoto API (embed streaming, dipakai player situs).
Sumber cross-check: nyaa.si RSS (hanya hitung seeders, TANPA menyimpan magnet/hash).
Output: data/anime.json + data/anikoto.json + data/eps/{id}.json + data/nyaa_availability.json + sync data-anime.js
"""
import json, os, re, sys, time, html as ihtml
import urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Guoke2026/1.0"}
TODAY = time.strftime("%Y-%m-%d")

def get_json(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def get_bytes(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def slugify(title, aid):
    s = re.sub(r"[^a-z0-9]+", "-", str(title).lower()).strip("-") or ("rx-%d" % aid)
    return s[:80]

def norm(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())

def fetch_series_detail(aid):
    for att in range(3):
        try:
            return get_json("https://anikotoapi.site/series/%d" % aid)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(3+att*3)
        except Exception:
            time.sleep(3+att*3)
    return None

def parse_detail(aid, d):
    try:
        anime = (d.get("data") or {}).get("anime") or {}
        eps = (d.get("data") or {}).get("episodes") or []
        title = anime.get("title") or anime.get("alternative") or ""
        title = ihtml.unescape(str(title)).strip()
        if not title: return None
        n = len(eps)
        try: declared = int(str(anime.get("episodes") or n or 0))
        except: declared = n
        total = max(n, declared)
        # katalog = yang bisa diputar saja (ada embed), bukan total deklarasi
        try:
            _pn = [int(e.get("number")) for e in eps
                   if ((e.get("embed_url") or {}).get("sub")
                       or (e.get("embed_url") or {}).get("dub")
                       or len((e.get("embed_url") or {}).keys()) > 0)
                   and str(e.get("number")).isdigit()]
            if _pn:
                total = max(_pn)
        except Exception:
            pass
        terms = anime.get("terms_by_type") or {}
        genres = terms.get("genre") or []
        if isinstance(genres, str): genres = [genres]
        year = anime.get("year") or ""
        try: year = int(str(year)[:4])
        except: year = 2026
        status_raw = str(anime.get("status") or "")
        if "Upcoming" in status_raw or "Not Yet" in status_raw:
            status = "segera"
        elif "Continu" in status_raw or "Airing" in status_raw:
            status = "tayang"
        else:
            status = "tamat"
        ttype = str(terms.get("type",""))
        if total == 1: kind = "film" if "mov" in ttype.lower() else "series"
        else: kind = "film" if "movie" in ttype.lower() and total<=2 else "series"
        desc = ihtml.unescape(re.sub(r"<[^>]+>","",str(anime.get("description") or ""))).strip()[:300]
        return {"aid":aid,"title":title,"cover":anime.get("poster") or "","episodes":total,
                "eps_raw":eps,"year":year,"genres":genres[:3],"synopsis":desc,
                "status_guess":status,"kind_guess":kind}
    except Exception:
        return None

def nyaa_check(title):
    try:
        q = urllib.parse.quote(title)
        raw = get_bytes("https://nyaa.si/?page=rss&c=1_2&f=0&q=%s" % q).decode("utf-8","replace")
        items = re.findall(r"<item>(.*?)</item>", raw, re.S)
        seeds = [int(x) for x in re.findall(r"<nyaa:seeders>(\d+)</nyaa:seeders>", raw)]
        return len(items), (max(seeds) if seeds else 0)
    except Exception:
        return 0, 0

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--recent-pages", type=int, default=20)
    ap.add_argument("--scan-min", type=int, default=8500)
    ap.add_argument("--scan-max", type=int, default=9500)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--nyaa-throttle", type=float, default=1.2)
    args = ap.parse_args()

    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    have_ids = {o["id"] for o in ak if o.get("id")}
    have_norm = {norm(s["title"]) for s in anime["shows"]}
    have_slugs = {s["id"] for s in anime["shows"]}
    print(f"katalog awal: {len(anime['shows'])} judul, ak={len(ak)}", flush=True)

    # 1. kumpulkan kandidat ID dari recent-anime
    cand_ids = {}
    for p in range(1, args.recent_pages+1):
        try:
            d = get_json(f"https://anikotoapi.site/recent-anime?page={p}&per_page=30")
            for it in d.get("data") or []:
                aid = it.get("id")
                if aid and aid not in cand_ids:
                    cand_ids[aid] = it
            time.sleep(0.8)
        except Exception as e:
            print(f"  recent p{p} gagal: {str(e)[:60]}", flush=True)
    print(f"recent: {len(cand_ids)} kandidat dari {args.recent_pages} halaman", flush=True)

    # 2. tambah range scan untuk tuntas (ID baru 2026)
    for aid in range(args.scan_min, args.scan_max+1):
        if aid not in cand_ids and aid not in have_ids:
            cand_ids[aid] = {"id": aid}
    todo = [aid for aid in cand_ids if aid not in have_ids]
    print(f"todo setelah skip have_ids: {len(todo)} (scan {args.scan_min}..{args.scan_max})", flush=True)

    # 3. fetch detail concurrent, saring year==2026
    found2026 = []
    other_year = 0
    dead = 0
    def job(aid):
        d = fetch_series_detail(aid)
        if not d: return (aid, None, "dead")
        r = parse_detail(aid, d)
        if not r: return (aid, None, "dead")
        return (aid, r, "ok")
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        fut = {ex.submit(job, aid): aid for aid in todo}
        done = 0
        for f in as_completed(fut):
            aid = fut[f]
            done += 1
            try: _aid, r, kind = f.result()
            except Exception: r, kind = None, "dead"
            if kind == "dead" or not r:
                dead += 1
            elif r["year"] == 2026:
                found2026.append(r)
            else:
                other_year += 1
            if done % 100 == 0 or done == len(todo):
                print(f"  ...{done}/{len(todo)} found2026={len(found2026)} other={other_year} dead={dead}", flush=True)
            time.sleep(0.05)
    print(f"hasil scan: 2026={len(found2026)} non-2026={other_year} dead={dead}", flush=True)
    # dedup judul sudah ada (norm)
    baru = [r for r in found2026 if norm(r["title"]) not in have_norm]
    print(f"judul 2026 benar-benar baru: {len(baru)}", flush=True)

    # 4. cross-check nyaa.si RSS (tanpa simpan magnet) + tulis eps + katalog
    nyaa_info = {}
    try:
        if os.path.exists("data/nyaa_availability.json"):
            nyaa_info = json.load(open("data/nyaa_availability.json"))
    except: nyaa_info = {}
    added = 0
    for r in sorted(baru, key=lambda x: x["aid"]):
        c, s = nyaa_check(r["title"])
        nyaa_info[r["title"]] = {"rss_hits": c, "seed_max": s, "checked": TODAY, "akid": r["aid"]}
        print(f"  nyaa [{c} rilis/seeds {s}] {r['title']} ({r['episodes']} eps)", flush=True)
        time.sleep(args.nyaa_throttle)
        # tulis eps
        eps = [{"n": e.get("number"), "t": e.get("title") or ("Episode %s" % e.get("number")),
                "e": e.get("embed_url") or {}} for e in r["eps_raw"]]
        try: eps.sort(key=lambda e: (int(e["n"]) if str(e["n"]).isdigit() else 99999))
        except: pass
        json.dump({"id": r["aid"], "updated": TODAY, "episodes": eps},
                  open("data/eps/%d.json" % r["aid"], "w"), ensure_ascii=False)
        # tambah katalog
        sid = slugify(r["title"], r["aid"])
        base, k = sid, 2
        while sid in have_slugs:
            sid = "%s-%d" % (base, k); k += 1
        have_slugs.add(sid); have_norm.add(norm(r["title"]))
        ak.append({"show": r["title"], "id": r["aid"], "slug": "", "apiTitle": r["title"],
                   "episodes": r["episodes"], "match": True, "auto": True, "bulk": TODAY, "year2026": True,
                   "nyaa_hits": c, "nyaa_seed": s})
        anime["shows"].append({"id": sid, "title": r["title"], "cover": r["cover"],
                               "akid": r["aid"], "episodes": r["episodes"]})
        added += 1
        if added % 25 == 0:
            anime["updated"] = TODAY
            json.dump(ak, open("data/anikoto.json","w"), ensure_ascii=False, indent=1)
            json.dump(anime, open("data/anime.json","w"), ensure_ascii=False)
            json.dump(nyaa_info, open("data/nyaa_availability.json","w"), ensure_ascii=False, indent=1)
            print(f"    checkpoint {added} tersimpan", flush=True)

    anime["updated"] = TODAY
    json.dump(ak, open("data/anikoto.json","w"), ensure_ascii=False, indent=1)
    json.dump(anime, open("data/anime.json","w"), ensure_ascii=False)
    json.dump(nyaa_info, open("data/nyaa_availability.json","w"), ensure_ascii=False, indent=1)
    print(f"DITAMBAHKAN: {added} | total katalog: {len(anime['shows'])}", flush=True)

    # 5. sync data-anime.js (pertahankan manual, isi meta 2026)
    import importlib.util
    spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    guess = {r["title"]: r for r in baru}
    try:
        raw = open("data-anime.js", encoding="utf-8").read()
        m = re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, re.S)
        old = {s["id"]: s for s in (json.loads(m.group(1)).get("shows", []) if m else [])}
    except: old = {}
    mod.sync_anime_js(anime, ak)
    raw2 = open("data-anime.js", encoding="utf-8").read()
    m2 = re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw2, re.S)
    payload = json.loads(m2.group(1))
    for s in payload["shows"]:
        g = guess.get(s["title"])
        if not g: continue
        o = old.get(s["id"], {})
        if not o.get("status"): s["status"] = g["status_guess"]
        if not o.get("kind"): s["kind"] = g["kind_guess"]
        if not o.get("year"): s["year"] = 2026
        if not o.get("genres"): s["genres"] = g["genres"]
        if not o.get("synopsis"): s["synopsis"] = g["synopsis"]
        # paksa year 2026 untuk judul baru ini
        if g["year"] == 2026: s["year"] = 2026
    open("data-anime.js","w",encoding="utf-8").write(
        "/* Guoke AMHDQ — KATALOG ANIME (rilis 2026 tuntas; kolom manual dipertahankan. */\nwindow.GQ_ANIME = "+
        json.dumps(payload, ensure_ascii=False, indent=1)+";\n")
    print(f"data-anime.js: {len(payload['shows'])} judul", flush=True)

if __name__ == "__main__":
    main()
