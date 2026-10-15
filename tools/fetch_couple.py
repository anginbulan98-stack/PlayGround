#!/usr/bin/env python3
"""Batch couple anime (pp couple) untuk tab Couple galeri Ikon.

- Sumber: safebooru.org (SFW, API terbuka) — anime only.
- Output: data/ikon-couple.json {updated, photos:[{id,name,url}]} TANPA tags.
- Dedupe terhadap data/ikon.json + data/ikon-marin.json.
- Di aplikasi, batch ini bertanda couple:true (tab Couple) dan tampil
  PALING BAWAH (setelah semua foto non-pin).

Contoh: python3 tools/fetch_couple.py --target 2000
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeIkon/1.0"}
TODAY = time.strftime("%Y-%m-%d")
OUT_FP = "data/ikon-couple.json"
OLD_FPS = ["data/ikon.json", "data/ikon-marin.json"]
PER_PAGE = 100

BASE_EXCL = ("-cosplay -photo -photorealistic -realistic -furry -3d "
             "-comic -comic_panel -animated -ai_generated -solo")
# WAJIB berpasangan betulan (tag solo bocor kalau cuma 'couple'):
# boy+girl dulu, lalu pasangan sejenis. Bukan solo.
TAGS = ["couple 1boy 1girl", "1boy 1girl", "2girls", "2boys"]


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
    ap.add_argument("--target", type=int, default=2000)
    args = ap.parse_args()

    old_ids = set()
    # Catatan: file output sendiri SENGAJA tidak dikecualikan agar rebuild
    # menyaring ulang (yang lolos verifikasi pasangan akan masuk lagi).
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
                if pid > 80:
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
                # Verifikasi tag: harus berpasangan betulan, bukan solo nyasar.
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
                photos.append({"id": pid_post, "name": "Couple Anime", "url": url})
                added += 1
            print("  [%s] page %d: +%d (total %d)" % (tag, pid, added, len(photos)), flush=True)
            pid += 1
            empty_run = empty_run + 1 if added == 0 else 0
            if empty_run >= 8:
                print("  [%s] 8 halaman tanpa foto baru, ganti tag" % tag)
                break
            time.sleep(0.6)

    json.dump({"updated": TODAY, "photos": photos[:args.target]},
              open(OUT_FP, "w"), ensure_ascii=False)
    print("data/ikon-couple.json: %d foto" % min(len(photos), args.target))


if __name__ == "__main__":
    main()
