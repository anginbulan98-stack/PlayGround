#!/usr/bin/env python3
"""Scan TUNTAS anikoto 1..MAX_ID -> 5000 judul watchable + episode lengkap.

Perbaikan dari bulk_nyaa_anikoto.py:
- Bedakan 404 asli vs transient (429/timeout). Hanya 404 yang ditandai mati.
  Transient di-retry 4x dengan backoff, TIDAK masuk checked_404.
- Concurrency kecil (default 4) + jeda agar tidak kena rate-limit massal.
- Setiap judul OK langsung: append anime.json + anikoto.json + tulis
  data/eps/{id}.json (episode lengkap + embed) + save incremental tiap 25.
- Resume penuh via data/scan_state.json (done_ok, dead404).
- Idempoten, aman dijalankan berulang sampai "tuntas".

Contoh:
  python3 tools/scan_anikoto_tuntas.py --max-id 15000 --workers 4 --limit 500
  Ulangi tanpa --limit sampai sisa=0.
"""
import json, os, re, sys, time, html as ihtml
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeScan/2.0"}
TODAY = time.strftime("%Y-%m-%d")
STATE_FP = "data/scan_state.json"

def fetch_one(aid, timeout=25):
    """Return (kind, data). kind: ok | dead404 | transient."""
    url = "https://anikotoapi.site/series/%d" % aid
    last = ""
    for att in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                d = json.loads(r.read())
            return ("ok", d)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return ("dead404", "")
            last = "HTTP%d" % e.code
            time.sleep(4 + att * 5)
        except Exception as e:
            last = str(e)[:80]
            time.sleep(4 + att * 5)
    return ("transient", last)

def norm(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())

def slugify(title, aid):
    s = re.sub(r"[^a-z0-9]+", "-", str(title).lower()).strip("-") or ("rx-%d" % aid)
    return s[:80]

def parse_detail(aid, d):
    try:
        anime = (d.get("data") or {}).get("anime") or {}
        eps = (d.get("data") or {}).get("episodes") or []
        title = anime.get("title") or anime.get("alternative") or ""
        title = ihtml.unescape(str(title)).strip()
        if not title:
            return None
        n = len(eps)
        try:
            declared = int(str(anime.get("episodes") or n or 0))
        except ValueError:
            declared = n
        total = max(n, declared)
        terms = anime.get("terms_by_type") or {}
        genres = (terms.get("genre")) or []
        if isinstance(genres, str):
            genres = [genres]
        year = anime.get("year") or TODAY[:4]
        try:
            year = int(str(year)[:4])
        except ValueError:
            year = int(TODAY[:4])
        status_raw = str(anime.get("status") or "")
        status = "tayang" if ("Continu" in status_raw or "Airing" in status_raw or "Upcoming" in status_raw) else "tamat"
        ttype = str(terms.get("type", ""))
        if total == 1:
            kind = "film" if "mov" in ttype.lower() else "series"
        else:
            kind = "film" if "movie" in ttype.lower() and total <= 2 else "series"
        desc = ihtml.unescape(re.sub(r"<[^>]+>", "", str(anime.get("description") or ""))).strip()[:300]
        return {"aid": aid, "title": title, "cover": anime.get("poster") or "",
                "episodes": total, "eps_raw": eps, "year": year,
                "genres": genres[:3], "synopsis": desc,
                "status_guess": status, "kind_guess": kind}
    except Exception:
        return None

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-id", type=int, default=15000)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=0.4)
    args = ap.parse_args()

    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    have_ids = {o["id"] for o in ak if o.get("id")}
    have_titles_norm = {norm(s["title"]) for s in anime["shows"]}
    have_slugs = {s["id"] for s in anime["shows"]}
    by_title = {s["title"]: s for s in anime["shows"]}

    st = {"dead404": [], "transient_skip": []}
    if os.path.exists(STATE_FP):
        try:
            st = json.load(open(STATE_FP))
        except Exception:
            pass
    dead = set(st.get("dead404", []))
    # jangan ulangi yang sudah punya file + yang sudah dead
    todo = [i for i in range(1, args.max_id + 1) if i not in have_ids and i not in dead]
    print("katalog=%d have_ak=%d dead=%d todo=%d (1..%d)" % (
        len(anime["shows"]), len(have_ids), len(dead), len(todo), args.max_id), flush=True)
    if args.limit:
        todo = todo[:args.limit]
        print("dibatasi --limit %d" % len(todo), flush=True)
    if not todo:
        print("TUNTAS: tidak ada sisa ID.", flush=True)
        return

    ok_n = dead_n = trans_n = 0
    since_save = 0
    def save():
        json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
        json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
        json.dump({"updated": TODAY, "max_id": args.max_id,
                   "dead404": sorted(dead)}, open(STATE_FP, "w"), ensure_ascii=False)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        fut = {ex.submit(fetch_one, aid): aid for aid in todo}
        done = 0
        for f in as_completed(fut):
            aid = fut[f]
            done += 1
            try:
                kind, payload = f.result()
            except Exception as e:
                kind, payload = "transient", str(e)[:60]
            if kind == "dead404":
                dead.add(aid); dead_n += 1
            elif kind == "transient":
                trans_n += 1
            else:
                r = parse_detail(aid, payload)
                if not r:
                    dead.add(aid); dead_n += 1
                elif norm(r["title"]) in have_titles_norm:
                    # judul sudah ada (dari AniList) -> tambahkan akid + eps, jangan duplikat
                    have_ids.add(aid)
                    ak.append({"show": r["title"], "id": aid, "slug": "", "apiTitle": r["title"],
                               "episodes": r["episodes"], "match": True, "auto": True, "bulk": TODAY})
                    hit = None
                    for s in anime["shows"]:
                        if norm(s["title"]) == norm(r["title"]):
                            hit = s; break
                    if hit is not None:
                        hit["akid"] = aid
                        if (hit.get("episodes") or 0) < r["episodes"]:
                            hit["episodes"] = r["episodes"]
                    eps = [{"n": e.get("number"), "t": e.get("title") or ("Episode %s" % e.get("number")),
                            "e": e.get("embed_url") or {}} for e in r["eps_raw"]]
                    eps.sort(key=lambda e: (int(e["n"]) if str(e["n"]).isdigit() else 99999))
                    json.dump({"id": aid, "updated": TODAY, "episodes": eps},
                              open("data/eps/%d.json" % aid, "w"), ensure_ascii=False)
                    ok_n += 1
                else:
                    sid = slugify(r["title"], aid)
                    base, k = sid, 2
                    while sid in have_slugs:
                        sid = "%s-%d" % (base, k); k += 1
                    have_slugs.add(sid); have_titles_norm.add(norm(r["title"])); have_ids.add(aid)
                    ak.append({"show": r["title"], "id": aid, "slug": "", "apiTitle": r["title"],
                               "episodes": r["episodes"], "match": True, "auto": True, "bulk": TODAY})
                    anime["shows"].append({"id": sid, "title": r["title"], "cover": r["cover"],
                                           "akid": aid, "episodes": r["episodes"]})
                    eps = [{"n": e.get("number"), "t": e.get("title") or ("Episode %s" % e.get("number")),
                            "e": e.get("embed_url") or {}} for e in r["eps_raw"]]
                    eps.sort(key=lambda e: (int(e["n"]) if str(e["n"]).isdigit() else 99999))
                    json.dump({"id": aid, "updated": TODAY, "episodes": eps},
                              open("data/eps/%d.json" % aid, "w"), ensure_ascii=False)
                    ok_n += 1
                    # simpan meta kaya untuk sync (status/kind/year/genre/sinopsis)
                    # -> tulis ke cache patch agar sync_anime_js tidak menull-kan
                    by_title[r["title"]] = {"status": r["status_guess"], "kind": r["kind_guess"],
                                            "year": r["year"], "genres": r["genres"], "synopsis": r["synopsis"]}
            since_save += 1
            if since_save >= 25:
                anime["updated"] = TODAY
                save(); since_save = 0
            if done % 50 == 0 or done == len(todo):
                print("  ...%d/%d ok=%d dead=%d transient=%d katalog=%d" % (
                    done, len(todo), ok_n, dead_n, trans_n, len(anime["shows"])), flush=True)
            time.sleep(args.sleep)

    anime["updated"] = TODAY
    save()
    print("SELESAI batch: ok=%d dead=%d transient=%d katalog=%d ak=%d" % (
        ok_n, dead_n, trans_n, len(anime["shows"]), len(ak)), flush=True)
    # sync + patch meta
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        mod.sync_anime_js(anime, ak)
        import re as _re
        raw = open("data-anime.js", encoding="utf-8").read()
        m = _re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, _re.S)
        payload = json.loads(m.group(1))
        # patch meta dari by_title untuk entri yang masih kosong
        n_patch = 0
        for s in payload["shows"]:
            g = by_title.get(s["title"])
            if isinstance(g, dict) and g.get("status"):
                ch = False
                if not s.get("status") or s.get("status") == "tayang" and not s.get("year"):
                    pass
                # hanya isi yang kosong
                if not s.get("genres"):
                    s["genres"] = g.get("genres", []); ch = True
                if not s.get("synopsis"):
                    s["synopsis"] = g.get("synopsis", ""); ch = True
                if not s.get("year"):
                    s["year"] = g.get("year", int(TODAY[:4])); ch = True
                # status/kind default sync adalah tayang/series; timpa bila tebakan tamat/film
                # dan entri belum pernah diedit manual (deteksi: genres kosong sebelumnya)
                if ch:
                    s["status"] = g.get("status", s.get("status"))
                    s["kind"] = g.get("kind", s.get("kind"))
                    n_patch += 1
        open("data-anime.js", "w", encoding="utf-8").write(
            "/* Guoke AMHDQ — KATALOG ANIME (scan tuntas; kolom manual dipertahankan. */\nwindow.GQ_ANIME = " +
            json.dumps(payload, ensure_ascii=False, indent=1) + ";\n")
        print("data-anime.js: %d judul (meta dipatch %d)" % (len(payload["shows"]), n_patch), flush=True)
    except Exception as e:
        print("sync gagal:", str(e)[:120], flush=True)
    print("SISA (perkiraan): jalankan ulang tanpa --limit sampai todo=0. Transient akan dicoba lagi.", flush=True)

if __name__ == "__main__":
    main()
