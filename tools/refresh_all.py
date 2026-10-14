#!/usr/bin/env python3
"""Refresh harian data Guoke AMHDQ (dipakai GitHub Actions maupun manual).

- Anime: daftar episode per show + temukan serial baru via recent-anime.
- Manhwa: daftar chapter per judul + gambar chapter BARU saja + temukan judul baru.
Hanya menulis ke data/. Idempoten: tanpa perubahan = tanpa commit.
"""
import json, re, time, urllib.request, urllib.parse, os, sys

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HDPlus/1.0"}
TODAY = time.strftime("%Y-%m-%d")
CAP_NEW_ANIME, CAP_NEW_MW = 8, 3


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
    for o in ak:
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
        fp = "data/eps/%d.json" % o["id"]
        old = json.load(open(fp))["episodes"] if os.path.exists(fp) else []
        if [e["n"] for e in eps] != [e["n"] for e in old]:
            json.dump({"id": o["id"], "updated": TODAY, "episodes": eps},
                      open(fp, "w"), ensure_ascii=False)
            print("  anime update: %s %d -> %d eps" % (o["show"], len(old), len(eps)))
            changed = True
        o["episodes"] = len(eps)
        hit = by_show.get(o["show"])
        if hit and hit.get("episodes") != len(eps):
            hit["episodes"] = len(eps)
            changed = True
        time.sleep(1.2)
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
            ak.append({"show": title, "id": it["id"], "slug": "", "apiTitle": title,
                       "episodes": len(eps), "match": True, "auto": True})
            anime["shows"].append({"id": sid, "title": title,
                                   "cover": it.get("poster") or anilist_cover(title),
                                   "akid": it["id"], "episodes": len(eps)})
            json.dump({"id": it["id"], "updated": TODAY, "episodes":
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
    return changed


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


def refresh_manhwa():
    from concurrent.futures import ThreadPoolExecutor
    d = json.load(open("data/manhwa.json"))
    changed = False
    for t in d["titles"]:
        try:
            det = komiku_detail(t["slug"])
        except Exception as e:
            print("  manhwa gagal:", t["slug"], str(e)[:60])
            continue
        if not det or not det["chapters"]:
            continue
        old_urls = {c["u"] for c in t["chapters"]}
        new_ch = [c for c in det["chapters"] if c["u"] not in old_urls]
        if new_ch or len(det["chapters"]) != len(t["chapters"]):
            t["chapters"] = det["chapters"]
            t["total"] = len(det["chapters"])
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
    # --- temukan judul baru dari beranda ---
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
                 "total": len(det["chapters"]), "chapters": det["chapters"]}
            d["titles"].append(t)
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
    print("== refresh anime ==")
    c1 = refresh_anime()
    print("== refresh manhwa ==")
    c2 = refresh_manhwa()
    print("berubah:", bool(c1 or c2))


if __name__ == "__main__":
    main()
