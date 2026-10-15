#!/usr/bin/env python3
"""Batch couple manhwa (pp couple manhwa) untuk tab Couple Manhwa galeri Ikon.

- Sumber: safebooru.org (SFW, API terbuka) dengan tag bernuansa
  webtoon/manhwa/manhua + romance, + cover manhwa romance dari
  data/manhwa.json sebagai pelengkap.
- Output: data/ikon-couple-manhwa.json {updated, photos:[{id,name,url}]}
  TANPA tags, TANPA mengunduh file gambar (hotlink sample ~850px).
- Dedupe terhadap data/ikon.json + data/ikon-marin.json +
  data/ikon-couple.json agar tidak dobel dengan batch couple anime.
- Di aplikasi batch ini bertanda couple:true + kind:"manhwa"
  (tab Couple Manhwa).

Catatan: Pinterest tidak bisa disedot otomatis (wajib login + anti-bot
+ hotlink diproteksi). Alur resmi: simpan gambar Pinterest → Upload /
tempel link via fitur "Tambah banyak via link" di galeri.

Contoh: python3 tools/fetch_couple_manhwa.py --target 600
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeIkon/1.0"}
TODAY = time.strftime("%Y-%m-%d")
OUT_FP = "data/ikon-couple-manhwa.json"
OLD_FPS = ["data/ikon.json", "data/ikon-marin.json", "data/ikon-couple.json"]
MW_FP = "data/manhwa.json"
PER_PAGE = 100

BASE_EXCL = ("-cosplay -photo -photorealistic -realistic -furry -3d "
             "-comic -comic_panel -animated -ai_generated -solo")
# Tag berpasangan + bernuansa manhwa/webtoon/romance.
# Safebooru minim tag "manhwa", jadi pakai webtoon/manhua/romance/hetero
# sebagai jangkar gaya, lalu verifikasi pasangan betulan.
TAGS = [
    "1boy 1girl webtoon",
    "couple webtoon",
    "1boy 1girl romance",
    "couple romance",
    "1boy 1girl manhua",
    "2girls romance",
    "2boys romance",
]


def fetch_page(pid, tags):
    q = urllib.parse.urlencode({
        "page": "dapi", "s": "post", "q": "index", "json": "1",
        "limit": PER_PAGE, "pid": pid, "tags": tags,
    })
    req = urllib.request.Request("https://safebooru.org/index.php?" + q, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    try:
        out = json.loads(data)
        return out if isinstance(out, list) else []
    except Exception:
        return []


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=600)
    args = ap.parse_args()

    old_ids = set()
    for fp in OLD_FPS:
        if os.path.exists(fp):
            try:
                for p in json.load(open(fp)).get("photos", []):
                    old_ids.add(p.get("id"))
            except Exception:
                pass

    photos, seen = [], set()
    for tag in TAGS:
        if len(photos) >= args.target:
            break
        query = (tag + " " + BASE_EXCL).strip()
        pid, empty_run = 0, 0
        while len(photos) < args.target:
            try:
                batch = fetch_page(pid, query)
            except Exception as e:
                print("  [%s] page %d error: %s — jeda lalu lanjut" % (tag, pid, e))
                time.sleep(3)
                pid += 1
                if pid > 40:
                    break
                continue
            if not batch:
                print("  [%s] page %d kosong, ganti tag" % (tag, pid))
                break
            added = 0
            for p in batch:
                pid_post = p.get("id")
                if pid_post in seen or pid_post in old_ids:
                    continue
                tg = " " + str(p.get("tags") or "") + " "
                pair = ((" 1boy " in tg and " 1girl " in tg) or " 2girls " in tg
                        or " 2boys " in tg or " multiple_girls " in tg
                        or " multiple_boys " in tg)
                if not pair:
                    continue
                url = p.get("sample_url") or ""
                if not url.startswith("http"):
                    continue
                img = str(p.get("image") or "")
                if not re.search(r"\.(jpe?g|png)$", img, re.I):
                    continue
                seen.add(pid_post)
                photos.append({"id": pid_post, "name": "Couple Manhwa", "url": url})
                added += 1
            print("  [%s] page %d: +%d (total %d)" % (tag, pid, added, len(photos)), flush=True)
            pid += 1
            empty_run = empty_run + 1 if added == 0 else 0
            if empty_run >= 8:
                print("  [%s] 8 halaman tanpa foto baru, ganti tag" % tag)
                break
            time.sleep(0.6)

    # Pelengkap: cover manhwa bergenre romance (tetap couple-friendly).
    try:
        if os.path.exists(MW_FP) and len(photos) < args.target:
            mw = json.load(open(MW_FP)).get("titles", [])
            rom = [t for t in mw if t and t.get("cover") and any(
                "roman" in str(g).lower() or "shoujo" in str(g).lower()
                or "drama" in str(g).lower() for g in (t.get("genres") or []))]
            for t in rom[:200]:
                if len(photos) >= args.target:
                    break
                key = "mw-" + str(t.get("slug") or t.get("id"))
                if key in seen:
                    continue
                seen.add(key)
                photos.append({"id": key, "name": str(t.get("title") or "Couple Manhwa"), "url": t["cover"]})
            print("  [manhwa-covers] romance covers: %d (total %d)" % (min(len(rom), 200), len(photos)))
    except Exception as e:
        print("  [manhwa-covers] skip: %s" % e)

    json.dump({"updated": TODAY, "photos": photos[:args.target]},
              open(OUT_FP, "w"), ensure_ascii=False)
    print("%s: %d foto" % (OUT_FP, min(len(photos), args.target)))


if __name__ == "__main__":
    main()
