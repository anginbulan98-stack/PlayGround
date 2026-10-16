#!/usr/bin/env python3
"""Refresh harian data Guoke AMHDQ (dipakai GitHub Actions maupun manual).

- Anime: daftar episode per show + temukan serial baru via recent-anime.
- Manhwa: daftar chapter per judul + gambar chapter BARU saja + temukan judul baru.
Hanya menulis ke data/. Idempoten: tanpa perubahan = tanpa commit.
"""
import json, re, time, urllib.request, urllib.parse, os, sys

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HDPlus/1.0"}
TODAY = time.strftime("%Y-%m-%d")
try:
    import datetime as _dt
    NOW_ISO = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
except Exception:
    NOW_ISO = TODAY
CAP_NEW_ANIME, CAP_NEW_MW = 8, 3

# Daily rotation for the per-show episode check (thousands of shows cannot be
# checked in one short run). 0 = check all (legacy manual behavior).
ANIME_CURSOR = "data/anime_refresh_cursor.txt"
ANIME_BUDGET = int(os.environ.get("ANIME_BUDGET", "0"))


def get(url, timeout=30, data=None):
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", **UA} if data else UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def api_series(aid):
    return json.loads(get("https://anikotoapi.site/series/%d" % aid))


def anilist_cover(title):
    try:
        payload = json.dumps(
            {"query": "query($s:String){Media(search:$s,type:ANIME){coverImage{large}}}",
             "variables": {"s": title}}).encode()
        d = json.loads(get("https://graphql.anilist.co", data=payload, timeout=20))
        m = (d.get("data") or {}).get("Media")
        return (m or {}).get("coverImage", {}).get("large", "") if m else ""
    except Exception:
        return ""


def refresh_anime():
    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    by_show = {s["title"]: s for s in anime["shows"]}
    changed = False
    # Rotate daily: check ANIME_BUDGET shows per run, cursor wraps around.
    orig_len = len(ak)
    if ANIME_BUDGET > 0 and orig_len > ANIME_BUDGET:
        try:
            cursor = int(open(ANIME_CURSOR).read().strip() or 0)
        except Exception:
            cursor = 0
        if cursor >= orig_len:
            cursor = 0
        batch = (ak[cursor:] + ak[:cursor])[:ANIME_BUDGET]
        print("  refresh anime: %d judul (kursor %d/%d)" % (len(batch), cursor, orig_len))
    else:
        cursor, batch = 0, ak
    for o in batch:
        if not o.get("id"):
            continue
        try:
            d = api_series(o["id"])
        except Exception as e:
            print("  anime gagal:", o["show"], str(e)[:60])
            continue
        eps = [{"n": ep.get("number"),
                "t": ep.get("title") or ("Episode %s" % ep.get("number")),
                "e": ep.get("embed_url") or {}}
               for ep in (d.get("data", {}).get("episodes") or [])]
        # Serial multi-part (S1+S2 satu entri katalog): gabung part sequel
        # dengan offset nomor (peta "parts" ditulis tools/fill_episodes.py).
        for p in o.get("parts") or []:
            try:
                pd = api_series(p["id"])
            except Exception as e:
                print("  part gagal:", o["show"], p["id"], str(e)[:40])
                continue
            for ep in (pd.get("data", {}).get("episodes") or []):
                try:
                    n = int(ep.get("number"))
                except (TypeError, ValueError):
                    continue
                eps.append({"n": p["offset"] + n,
                            "t": ep.get("title") or ("Episode %s" % (p["offset"] + n)),
                            "e": ep.get("embed_url") or {}})
            time.sleep(1.0)
        eps.sort(key=lambda e: (e["n"] if isinstance(e["n"], int) else 99999))
        # Angka katalog = episode yang benar-benar bisa diputar (ada embed).
        play_nums = []
        for ep in eps:
            eu = ep.get("e") or {}
            if eu.get("sub") or eu.get("dub") or len(eu.keys()) > 0:
                try:
                    play_nums.append(int(ep.get("n")))
                except (TypeError, ValueError):
                    pass
        watch_n = max(play_nums) if play_nums else 0
        # Angka katalog = episode yang benar-benar bisa diputar (ada embed),
        # bukan total deklarasi — supaya semua tombol episode bisa dipencet.
        play_nums = []
        for ep in eps:
            eu = ep.get("e") or {}
            if eu.get("sub") or eu.get("dub") or len(eu.keys()) > 0:
                try:
                    play_nums.append(int(ep.get("n")))
                except (TypeError, ValueError):
                    pass
        watch_n = max(play_nums) if play_nums else 0
        fp = "data/eps/%d.json" % o["id"]
        old = json.load(open(fp))["episodes"] if os.path.exists(fp) else []
        if len(eps) < len(old):
            # Part sequel gagal diambil hari ini → jangan susutkan file gabungan.
            print("  anime skip (part tak lengkap): %s tetap %d eps" % (o["show"], len(old)))
            time.sleep(1.2)
            continue
        if [e["n"] for e in eps] != [e["n"] for e in old]:
            json.dump({"id": o["id"], "updated": NOW_ISO, "episodes": eps},
                      open(fp, "w"), ensure_ascii=False)
            print("  anime update: %s %d -> %d eps" % (o["show"], len(old), len(eps)))
            changed = True
        if watch_n > 0:
            o["episodes"] = watch_n
            hit = by_show.get(o["show"])
            if hit and hit.get("episodes") != watch_n:
                hit["episodes"] = watch_n
                changed = True
        time.sleep(1.2)
    if ANIME_BUDGET > 0 and orig_len > ANIME_BUDGET:
        try:
            open(ANIME_CURSOR, "w").write(str((cursor + len(batch)) % max(orig_len, 1)))
        except Exception:
            pass
    # --- temukan serial baru ---
    try:
        seen_ids = {o["id"] for o in ak if o.get("id")}
        new = []
        for p in range(1, 5):
            d = json.loads(get(
                "https://anikotoapi.site/recent-anime?page=%d&per_page=30" % p))
            for it in d.get("data") or []:
                if it.get("id") and it["id"] not in seen_ids:
                    seen_ids.add(it["id"])
                    new.append(it)
            time.sleep(1.0)
        for it in new[:CAP_NEW_ANIME]:
            try:
                d = api_series(it["id"])
            except Exception:
                continue
            eps = d.get("data", {}).get("episodes") or []
            title = (d.get("data", {}).get("anime", {}) or {}).get("title") or it.get("title", "")
            sid = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or ("rx-%d" % it["id"])
            play_n = []
            for e in eps:
                eu = e.get("embed_url") or {}
                if eu.get("sub") or eu.get("dub") or len(eu.keys()) > 0:
                    try:
                        play_n.append(int(e.get("number")))
                    except (TypeError, ValueError):
                        pass
            watch_n = max(play_n) if play_n else 0
            if not watch_n:
                continue  # belum ada yang bisa diputar -> jangan rilis
            ak.append({"show": title, "id": it["id"], "slug": "", "apiTitle": title,
                       "episodes": watch_n, "match": True, "auto": True})
            anime["shows"].append({"id": sid, "title": title,
                                   "cover": it.get("poster") or anilist_cover(title),
                                   "akid": it["id"], "episodes": watch_n})
            json.dump({"id": it["id"], "updated": NOW_ISO, "episodes":
                       [{"n": e.get("number"), "t": e.get("title"), "e": e.get("embed_url") or {}}
                        for e in eps]}, open("data/eps/%d.json" % it["id"], "w"), ensure_ascii=False)
            print("  anime BARU: %s (%d eps)" % (title, len(eps)))
            changed = True
            time.sleep(1.2)
    except Exception as e:
        print("  discovery anime gagal:", str(e)[:80])
    anime["updated"] = TODAY
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    sync_anime_js(anime, ak)
    build_eps_recent()
    return changed


def build_eps_recent():
    """Index recency episode untuk beranda (data/eps_recent.json: akid -> {u, n}).
    u = tanggal file episode terakhir berubah (= ada episode baru); dipakai
    app.js mengurutkan Episode Terbaru agar judul yang baru update naik ke atas."""
    import glob as _g
    out = {}
    for fp in _g.glob("data/eps/*.json"):
        try:
            d = json.load(open(fp, encoding="utf-8"))
            if d.get("id") is None:
                continue
            out[str(d["id"])] = {"u": d.get("updated", ""), "n": len(d.get("episodes", []))}
        except Exception:
            pass
    json.dump(out, open("data/eps_recent.json", "w"), ensure_ascii=False)
    print("  eps-recent: %d entri" % len(out))


STOPW_ALIAS = {"season", "cour", "part", "movie", "ova", "special", "specials",
                "the", "a", "an"}


def alias_key(t):
    """('MHA Season 3') == ('MHA 3') == ('MHA 3rd Season')."""
    w = re.sub(r"[^a-z0-9 ]+", " ", str(t or "").lower())
    w = re.sub(r"(\d+)(st|nd|rd|th)\s+season", r"season \1", w)
    w = re.sub(r"\bseason\s*(\d+)", r"season \1", w)
    w = re.sub(r"\bcour\s*(\d+)", r"cour \1", w)
    w = re.sub(r"\bpart\s*(\d+)", r"part \1", w)
    w = re.sub(r"\bs(\d+)\b", r"season \1", w)
    toks = w.split()
    return (tuple(x for x in toks if not x.isdigit() and x not in STOPW_ALIAS),
            tuple(x for x in toks if x.isdigit()))


def playable_max(aid):
    """Nomor episode playable terbesar (embed SUB/DUB/non-kosong) dari
    data/eps/{aid}.json. 0 = tak ada file / tak ada yang bisa diputar."""
    import os as _os
    fp = "data/eps/%s.json" % aid
    if not _os.path.exists(fp):
        return 0
    try:
        eps = json.load(open(fp)).get("episodes", [])
    except Exception:
        return 0
    nums = []
    for e in eps:
        eu = e.get("e") or {}
        if eu.get("sub") or eu.get("dub") or len(eu.keys()) > 0:
            try:
                nums.append(int(e["n"]))
            except (TypeError, ValueError, KeyError):
                pass
    return max(nums) if nums else 0


def sync_anime_js(anime, ak):
    """Tulis ulang data-anime.js (sumber runtime) dari anime.json + anikoto.json.
    Kolom manual (status/kind/year/genres/synopsis) dipertahankan.
    SATU KEBENARAN: anime.json adalah sumber akid + angka episode.
    - akid diambil dari anime.json; fallback pencocokan judul hanya dipakai
      bila aid-nya playable (>0) — jangan pasang aid mati ke kartu.
    - episodes = angka playable (bukan deklarasi), supaya semua tombol
      episode yang tampil BISA dipencet."""
    import re as _re
    fp = "data-anime.js"
    old_shows = []
    if os.path.exists(fp):
        try:
            raw = open(fp, encoding="utf-8").read()
            m = _re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, _re.S)
            if m:
                old_shows = json.loads(m.group(1)).get("shows", [])
        except Exception as e:
            print("  anime-js baca gagal:", str(e)[:60])
    old = {s["id"]: s for s in old_shows}
    akid = {o["show"]: o["id"] for o in ak if o.get("id")}
    year_now = int(TODAY[:4])
    out = []
    aid_api = {}
    for oo in ak:
        if oo.get("id"):
            aid_api.setdefault(oo["id"], oo.get("apiTitle") or oo.get("show"))

    def _alias_ok(title, aid):
        at = aid_api.get(aid) or ""
        if not at:
            return False
        if alias_key(title) == alias_key(at):
            return True
        # fallback substring HANYA bila tak ada penanda season di kedua sisi
        # (mencegah S1 terpasang ke kartu Cour 2 / Season N).
        mk = re.search(r"(season|cour|part)\s*\d+", str(title).lower())
        ma = re.search(r"(season|cour|part)\s*\d+", str(at).lower())
        if mk or ma:
            return False
        nt = re.sub(r"[^a-z0-9]+", "", str(title).lower())
        na = re.sub(r"[^a-z0-9]+", "", str(at).lower())
        return bool(na) and (na == nt or na in nt or nt in na)

    for s in anime["shows"]:
        o = old.get(s["id"], {})
        # akid: anime.json dulu; judul-cocok hanya bila playable + alias cocok
        # (anti salah-season); warisan js (o) hanya bila cocok + playable.
        _ak = s.get("akid") or None
        if not _ak:
            cand = akid.get(s["title"])
            if cand and playable_max(cand) > 0 and _alias_ok(s["title"], cand):
                _ak = cand
        if not _ak and o.get("akid"):
            cand = o.get("akid")
            if playable_max(cand) > 0 and _alias_ok(s["title"], cand):
                _ak = cand
        # episodes: playable bila ada file; kalau tidak, max(manual, live)
        # agar tak ada tombol mati.
        pn = playable_max(_ak) if _ak else 0
        if pn > 0:
            _ep = pn
        else:
            live_n = s.get("episodes", 0) or 0
            manual_n = o.get("episodes", 0) or 0
            _ep = max(manual_n, live_n)
        _yr = o.get("year", s.get("year", year_now)) or year_now
        _st = o.get("status", s.get("status", ""))
        if not _st:
            # Judul baru tanpa status manual: tahun depan + tanpa embed = belum tayang.
            _st = "segera" if (int(_yr) > year_now and not _ak) else "tayang"
        e = {
            "id": s["id"], "title": s["title"], "cover": s.get("cover", ""),
            "akid": _ak,
            "alt": o.get("alt", "") or s.get("alt", ""),
            "episodes": _ep,
            "status": _st, "kind": o.get("kind", s.get("kind", "series")),
            "year": _yr,
            "genres": o.get("genres", s.get("genres", [])), "synopsis": o.get("synopsis", s.get("synopsis", "")),
        }
        _ril = o.get("rilis", s.get("rilis", ""))
        if _ril:
            e["rilis"] = _ril
        out.append(e)
    head = ("/* Guoke AMHDQ — KATALOG ANIME (satu-satunya file yang perlu diedit\n"
            "   untuk menambah/mengubah judul).\n"
            "   - episodes = TOTAL episode sebenarnya. Kalau file embed di data/eps/\n"
            "     belum selengkap itu, sisanya otomatis berlabel \"Segera hadir\".\n"
            "   - status: \"tayang\" | \"tamat\" | \"segera\" (akan rilis) • kind: \"series\" | \"film\"\n"
            "   - akid: id API anikoto (embed). Kosongkan (null) bila belum ada / belum rilis.\n"
            "   Dibuat otomatis oleh tools/gen_anime_js.py; refresh harian via\n"
            "   tools/refresh_all.py (sync_anime_js) mempertahankan kolom manual. */\n"
            "window.GQ_ANIME = ")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(head)
        json.dump({"updated": TODAY, "shows": out}, f, ensure_ascii=False, indent=1)
        f.write(";\n")
    print("  anime-js sync: %d judul" % len(out))


def komiku_detail(slug):
    html = get("https://komiku.org/manga/%s/" % slug).decode("utf-8", "replace")
    if "Daftar_Chapter" not in html:
        return None
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    title = re.sub(r"^Komik\s+", "", re.sub(r"<[^>]+>", "", m.group(1)).strip()) if m else slug
    og = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html)
    chapters, seen = [], set()
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        if "judulseries" not in row:
            continue
        a = re.search(r'<a href="(/[^"]+)"[^>]*>(.*?)</a>', row, re.S)
        if not a:
            continue
        href, name = a.group(1), re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", a.group(2))).strip()
        if "/profil/" in href or not name or href in seen:
            continue
        seen.add(href)
        dm = re.search(r'<td class="tanggalseries">([^<]*)</td>', row)
        num = re.search(r"(\d+(?:\.\d+)?)", name)
        chapters.append({"n": num.group(1) if num else name, "t": name,
                         "d": dm.group(1).strip() if dm else "", "u": href})
    return {"title": title, "cover": og.group(1) if og else "", "chapters": chapters}


def chapter_imgs(ch_url):
    for _ in range(2):
        try:
            html = get("https://komiku.org" + ch_url).decode("utf-8", "replace")
            break
        except Exception:
            time.sleep(1.5)
    else:
        return []
    i = html.find('id="Baca_Komik"')
    seg = html[i:i + 150000] if i > 0 else html
    return [u for u in re.findall(r'<img[^>]+(?:src|data-src)="(https?://[^"]+)"', seg)
            if u.startswith("http") and not re.search(
                r"promosi|logo|avatar|gravatar|gstatic|googletag", u, re.I)]


MWCH_DIR = "data/mwch"
MW_CURSOR = "data/mw_refresh_cursor.txt"
MW_BUDGET = int(os.environ.get("MW_BUDGET", "300"))


def mwch_load(slug):
    fp = os.path.join(MWCH_DIR, slug + ".json")
    if os.path.exists(fp):
        try:
            return json.load(open(fp)).get("chapters", [])
        except Exception:
            return []
    return []


def mwch_save(slug, chapters):
    os.makedirs(MWCH_DIR, exist_ok=True)
    json.dump({"slug": slug, "chapters": chapters},
              open(os.path.join(MWCH_DIR, slug + ".json"), "w"), ensure_ascii=False)


def refresh_manhwa():
    from concurrent.futures import ThreadPoolExecutor
    d = json.load(open("data/manhwa.json"))
    # Rotasi harian: 3.679 judul tak mungkin dicek semua tiap hari
    # (MW_BUDGET judul/run, kursor berputar; siklus penuh ~12 hari).
    try:
        cursor = int(open(MW_CURSOR).read().strip() or 0)
    except Exception:
        cursor = 0
    titles = d["titles"]
    if cursor >= len(titles):
        cursor = 0
    batch = (titles[cursor:] + titles[:cursor])[:MW_BUDGET]
    print("  refresh manhwa: %d judul (kursor %d/%d)" % (len(batch), cursor, len(titles)))
    changed = False
    for t in batch:
        try:
            det = komiku_detail(t["slug"])
        except Exception as e:
            print("  manhwa gagal:", t["slug"], str(e)[:60])
            continue
        if not det or not det["chapters"]:
            continue
        old = mwch_load(t["slug"])
        old_urls = {c["u"] for c in old}
        new_ch = [c for c in det["chapters"] if c["u"] not in old_urls]
        if new_ch or len(det["chapters"]) != len(old):
            mwch_save(t["slug"], det["chapters"])
            t["total"] = len(det["chapters"])
            last = ""
            for c in det["chapters"]:
                if (c.get("d") or "") > last:
                    last = c["d"] or last
            t["lastUpdate"] = last
            if det["cover"]:
                t["cover"] = det["cover"]
            changed = True
            print("  manhwa update: %s +%d ch (total %d)" % (t["title"], len(new_ch), len(det["chapters"])))
        if new_ch:
            fp = "data/mw/%s.json" % t["slug"]
            pages = json.load(open(fp))["pages"] if os.path.exists(fp) else {}
            def work(c):
                time.sleep(0.3)
                return c["u"], chapter_imgs(c["u"])
            with ThreadPoolExecutor(max_workers=4) as ex:
                for u, imgs in ex.map(work, new_ch):
                    if imgs:
                        pages[u] = imgs
            json.dump({"slug": t["slug"], "pages": pages}, open(fp, "w"), ensure_ascii=False)
            print("    gambar baru: %d ch" % sum(1 for c in new_ch if c["u"] in pages))
        time.sleep(0.6)
    try:
        open(MW_CURSOR, "w").write(str((cursor + len(batch)) % max(len(titles), 1)))
    except Exception:
        pass
    # --- temukan judul baru dari beranda (impor massal via bulk_mw_titles.py) ---
    try:
        home = get("https://komiku.org/").decode("utf-8", "replace")
        slugs = sorted(set(re.findall(r"/manga/([a-z0-9-]+)/", home)))
        have = {t["slug"] for t in d["titles"]}
        added = 0
        for slug in slugs:
            if slug in have or added >= CAP_NEW_MW:
                continue
            try:
                det = komiku_detail(slug)
            except Exception:
                continue
            if not det or len(det["chapters"]) < 5:
                continue
            t = {"id": slug, "title": det["title"], "slug": slug, "cover": det["cover"],
                 "total": len(det["chapters"]), "type": "Manhwa",
                 "genres": ["Manhwa"], "status": "Ongoing",
                 "lastUpdate": (det["chapters"][0].get("d") or "")}
            d["titles"].append(t)
            mwch_save(slug, det["chapters"])
            pages = {}
            for c in det["chapters"]:
                imgs = chapter_imgs(c["u"])
                if imgs:
                    pages[c["u"]] = imgs
                time.sleep(0.4)
            json.dump({"slug": slug, "pages": pages}, open("data/mw/%s.json" % slug, "w"), ensure_ascii=False)
            print("  manhwa BARU: %s (%d ch)" % (t["title"], len(det["chapters"])))
            added += 1
            changed = True
            time.sleep(0.6)
    except Exception as e:
        print("  discovery manhwa gagal:", str(e)[:80])
    d["updated"] = TODAY
    json.dump(d, open("data/manhwa.json", "w"), ensure_ascii=False)
    return changed


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--only-anime", action="store_true",
                    help="hanya refresh anime (dipakai cron 10-menit agar tak gebuk komiku)")
    ap.add_argument("--only-manhwa", action="store_true",
                    help="hanya refresh manhwa (dipakai cron manhwa tersendiri)")
    args = ap.parse_args()
    do_anime = not args.only_manhwa
    do_mw = not args.only_anime
    c1 = c2 = False
    if do_anime:
        print("== refresh anime ==")
        c1 = refresh_anime()
    if do_mw:
        print("== refresh manhwa ==")
        c2 = refresh_manhwa()
    # Sitemap selalu diregenerasi agar URL chapter baru ikut terdata
    try:
        import subprocess
        subprocess.run(["python3", "tools/build_sitemap.py"], check=True)
    except Exception as e:
        print("  sitemap gagal:", str(e)[:80])
    print("berubah:", bool(c1 or c2))


if __name__ == "__main__":
    main()
