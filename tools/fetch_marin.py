#!/usr/bin/env python3
"""Batch karakter (Marin Kitagawa, cadangan Alya) untuk galeri Ikon.

- Sumber: safebooru.org (SFW, API terbuka) — anime only.
- Output: data/ikon-marin.json {updated, photos:[{id,name,url}]} TANPA tags
  (ramping) dan TANPA mengunduh file gambar (hotlink sample ~850px).
- Dedupe terhadap data/ikon.json agar tidak dobel dengan 5123 ikon lama.
- Di aplikasi, batch ini tampil PALING BAWAH (setelah semua non-pin);
  gambar dari pin Pinterest tetap PALING ATAS (lihat IKON_BUILTINS).

Contoh: python3 tools/fetch_marin.py --target 2000
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeIkon/1.0"}
TODAY = time.strftime("%Y-%m-%d")
OUT_FP = "data/ikon-marin.json"
OLD_FP = "data/ikon.json"
PER_PAGE = 100

BASE_EXCL = ("-cosplay -photo -photorealistic -realistic -furry -3d "
             "-comic -comic_panel -animated -ai_generated")

CANDIDATES = [
    # (tag safebooru, nama tampil). Alya dicoba bila Marin kurang.
    ("kitagawa_marin", "Marin Kitagawa"),
    ("kujou", "Alya Kujou"),
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
    ap.add_argument("--target", type=int, default=2000)
    args = ap.parse_args()

    old_ids = set()
    if os.path.exists(OLD_FP):
        try:
            old_ids = {p.get("id") for p in json.load(open(OLD_FP)).get("photos", [])}
        except Exception:
            pass
    if os.path.exists(OUT_FP):
        try:
            for p in json.load(open(OUT_FP)).get("photos", []):
                old_ids.add(p.get("id"))
        except Exception:
            pass

    photos, seen = [], set()
    for tag, name in CANDIDATES:
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
                if pid > 60:
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
                url = p.get("sample_url") or ""
                if not url.startswith("http"):
                    continue
                img = str(p.get("image") or "")
                if not re.search(r"\.(jpe?g|png)$", img, re.I):
                    continue
                seen.add(pid_post)
                photos.append({"id": pid_post, "name": name, "url": url})
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
    print("data/ikon-marin.json: %d foto" % min(len(photos), args.target))


if __name__ == "__main__":
    main()
