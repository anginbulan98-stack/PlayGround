#!/usr/bin/env python3
"""Bulk impor RIBUAN anime dari AniList (sumber metadata legal, lengkap).

- Ambil SEMUA anime (Page 1..N, 50/page, sort POPULARITY_DESC) via AniList GraphQL.
  Total ~5000 entri (cap API) — jauh melampaui 59 judul bawaan.
- Pertahankan akid/embed yang sudah ada (cocok judul case-insensitive).
  Entri tanpa akid => akid=null => UI otomatis "Segera hadir" + tombol Request
  (arsitektur existing di app.js: buildFullEps tanpa embed).
- nyaa.si TIDAK dijadikan host file (torrent 200MB-2GB/eps tak bisa streaming
  di situs statis + menyimpan magnet = pembajakan). File
  data/nyaa_availability.json dari tools/bulk_nyaa_anikoto.py tetap bisa
  dipakai sebagai anotasi ketersediaan, bukan link unduhan.
- Idempoten + resume (checkpoint data/bulk_anilist_state.json).

Jalankan: python3 tools/bulk_anilist.py [--pages 100] [--per-page 50]
"""
import json, os, re, time, html as ihtml
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 GuokeBulk/1.0", "Content-Type": "application/json"}
TODAY = time.strftime("%Y-%m-%d")
STATE_FP = "data/bulk_anilist_state.json"
Q = ("query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){"
     "pageInfo{hasNextPage total}media(type:ANIME,sort:POPULARITY_DESC){"
     "id title{romaji english native}coverImage{large}episodes startDate{year}"
     "genres description status format}}}")

def norm(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())

def slugify(title, aid):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or ("anilist-%d" % aid)
    return s[:80]

def fetch_page(p, pp):
    payload = json.dumps({"query": Q, "variables": {"p": p, "pp": pp}}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request("https://graphql.anilist.co", data=payload, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            print("  page %d retry %d: %s" % (p, attempt, str(e)[:70]))
            time.sleep(3 + attempt * 3)
    return None

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=100)
    ap.add_argument("--per-page", type=int, default=50)
    args = ap.parse_args()

    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    # peta judul->akid dari yg sudah ada (show + apiTitle)
    akmap = {}
    for o in ak:
        if o.get("id"):
            for k in (o.get("show"), o.get("apiTitle")):
                if k and norm(k) not in akmap:
                    akmap[norm(k)] = o["id"]

    have_ids = {s["id"] for s in anime["shows"]}
    have_norm = {norm(s["title"]) for s in anime["shows"]}
    # state resume
    done_pages = set()
    cache = {}
    if os.path.exists(STATE_FP):
        try:
            st = json.load(open(STATE_FP))
            done_pages = set(st.get("done_pages", []))
            cache = st.get("media", {})
        except Exception:
            pass
    all_media = dict(cache)
    total = None
    for p in range(1, args.pages + 1):
        if p in done_pages and str(p) in all_media or p in done_pages:
            continue
        d = fetch_page(p, args.per_page)
        if not d:
            print("page %d GAGAL total, berhenti" % p)
            break
        pg = d["data"]["Page"]
        total = pg["pageInfo"]["total"]
        all_media[str(p)] = pg["media"]
        done_pages.add(p)
        print("page %d/%s: +%d (total cache %d)" % (p, total, len(pg["media"]), sum(len(v) for v in all_media.values())))
        try:
            json.dump({"updated": TODAY, "done_pages": sorted(done_pages), "media": all_media},
                      open(STATE_FP, "w"), ensure_ascii=False)
        except Exception:
            pass
        if not pg["pageInfo"]["hasNextPage"]:
            print("habis di page", p)
            break
        time.sleep(1.1)  # hormati rate limit AniList 90/mnt

    media = []
    for p in sorted(all_media, key=int):
        media.extend(all_media[p])
    print("terkumpul: %d media" % len(media))

    added = 0
    for m in media:
        t = m["title"] or {}
        title = t.get("english") or t.get("romaji") or t.get("native") or ("AniList %d" % m["id"])
        title = ihtml.unescape(re.sub(r"<[^>]+>", "", str(title))).strip()
        if not title or norm(title) in have_norm:
            continue
        eps = m.get("episodes") or 1
        year = (m.get("startDate") or {}).get("year") or int(TODAY[:4])
        genres = (m.get("genres") or [])[:3]
        desc = ihtml.unescape(re.sub(r"<[^>]+>", "", str(m.get("description") or ""))).strip()[:300]
        status = "segera" if str(m.get("status")) == "NOT_YET_RELEASED" else ("tayang" if str(m.get("status")) == "RELEASING" else "tamat")
        kind = "film" if str(m.get("format")) in ("MOVIE",) else "series"
        akid = akmap.get(norm(title))
        # cocokkan juga romaji bila english tak cocok
        if not akid:
            akid = akmap.get(norm(t.get("romaji") or ""))
        sid = slugify(title, m["id"])
        base, k = sid, 2
        while sid in have_ids:
            sid = "%s-%d" % (base, k); k += 1
        anime["shows"].append({"id": sid, "title": title,
                               "cover": (m.get("coverImage") or {}).get("large") or "",
                               "akid": akid, "episodes": eps})
        have_ids.add(sid); have_norm.add(norm(title))
        added += 1
        # simpan meta ke data-anime.js nanti via patch (di bawah)
    anime["updated"] = TODAY
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    print("baru: %d | total katalog: %d" % (added, len(anime["shows"])))

    import importlib.util
    spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    mod.sync_anime_js(anime, ak)
    # patch meta untuk entri baru dari cache AniList
    meta = {}
    for m in media:
        t = m["title"] or {}
        for cand in (t.get("english"), t.get("romaji")):
            if cand:
                meta[norm(ihtml.unescape(str(cand)))] = m
    import re as _re
    raw = open("data-anime.js", encoding="utf-8").read()
    mch = _re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, _re.S)
    payload = json.loads(mch.group(1))
    n_patch = 0
    for s in payload["shows"]:
        if s.get("status") and s.get("year") and s.get("genres") and s.get("synopsis"):
            continue
        g = meta.get(norm(s["title"]))
        if not g:
            continue
        if not s.get("year"):
            s["year"] = (g.get("startDate") or {}).get("year") or int(TODAY[:4])
        if not s.get("genres"):
            s["genres"] = (g.get("genres") or [])[:3]
        if not s.get("synopsis"):
            s["synopsis"] = ihtml.unescape(re.sub(r"<[^>]+>", "", str(g.get("description") or "")))[:300]
        if not s.get("status"):
            s["status"] = "segera" if str(g.get("status")) == "NOT_YET_RELEASED" else ("tayang" if str(g.get("status")) == "RELEASING" else "tamat")
        if not s.get("kind"):
            s["kind"] = "film" if str(g.get("format")) in ("MOVIE",) else "series"
        n_patch += 1
    open("data-anime.js", "w", encoding="utf-8").write(
        "/* Guoke AMHDQ — KATALOG ANIME (bulk AniList; kolom manual dipertahankan. */\nwindow.GQ_ANIME = " +
        json.dumps(payload, ensure_ascii=False, indent=1) + ";\n")
    print("data-anime.js: %d judul (meta dipatch %d)" % (len(payload["shows"]), n_patch))

if __name__ == "__main__":
    main()
