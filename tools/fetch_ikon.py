#!/usr/bin/env python3
"""Ambil ribuan ikon anime (SFW) dari Safebooru untuk galeri Ikon.

- Sumber: safebooru.org (khusus aman/SFW), API terbuka, filter
  `1girl solo portrait` (cocok untuk foto profil).
- Hanya menyimpan daftar URL (sample ~850px, hotlink) ke data/ikon.json,
  TANPA mengunduh file gambar (repo tetap ringan).
- Idempoten: dedupe per id SISI; aman dijalankan ulang.
- Nama Indonesia dibuat dari tag (warna rambut/mata/aksesori).

Contoh: python3 tools/fetch_ikon.py --target 2500
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeIkon/1.0"}
TODAY = time.strftime("%Y-%m-%d")
OUT_FP = "data/ikon.json"
PER_PAGE = 100

HAIR = [
    ("black_hair", "rambut hitam"), ("white_hair", "rambut putih"),
    ("blonde_hair", "rambut pirang"), ("blonde", "rambut pirang"),
    ("brown_hair", "rambut cokelat"), ("red_hair", "rambut merah"),
    ("pink_hair", "rambut pink"), ("blue_hair", "rambut biru"),
    ("purple_hair", "rambut ungu"), ("green_hair", "rambut hijau"),
    ("silver_hair", "rambut perak"), ("grey_hair", "rambut abu"),
    ("orange_hair", "rambut oranye"),
]
EYES = [
    ("red_eyes", "mata merah"), ("blue_eyes", "mata biru"),
    ("green_eyes", "mata hijau"), ("brown_eyes", "mata cokelat"),
    ("purple_eyes", "mata ungu"), ("pink_eyes", "mata pink"),
    ("yellow_eyes", "mata kuning"), ("aqua_eyes", "mata aqua"),
]
STYLE = [
    ("twintails", "twintail"), ("ponytail", "ponytail"),
    ("blush", "tersipu"), ("smile", "tersenyum"),
    ("hat", "bertopi"), ("flower", "bunga"), ("rose", "mawar"),
    ("kimono", "kimono"), ("school_uniform", "seragam"),
    ("maid", "maid"), ("ribbons", "berpita"), ("bow", "berpita"),
    ("watercolor_(medium)", "watercolor"),
]


def tag_name(tags):
    t = set(tags.split())
    hair = next((label for tag, label in HAIR if tag in t), "")
    chunks = []
    if "long_hair" in t:
        chunks.append(((hair + " ") if hair else "") + "berambut panjang")
    elif "short_hair" in t:
        chunks.append(((hair + " ") if hair else "") + "berambut pendek")
    elif hair:
        chunks.append(hair)
    eyes = next((label for tag, label in EYES if tag in t), "")
    if eyes:
        chunks.append("ber" + eyes)
    chunks += [label for tag, label in STYLE if tag in t][:2]
    if not chunks:
        return ""
    return ("Gadis " + " ".join(chunks)).strip()


def fetch_page(pid, tags):
    q = urllib.parse.urlencode({
        "page": "dapi", "s": "post", "q": "index", "json": "1",
        "limit": PER_PAGE, "pid": pid, "tags": tags,
    })
    req = urllib.request.Request("https://safebooru.org/index.php?" + q, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    try:
        return json.loads(data)
    except Exception:
        return []


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=2500)
    ap.add_argument("--tags", default="1girl solo portrait -cosplay -photo -photorealistic -realistic -furry -3d -painting_(medium) -traditional_media -dark-skinned_female -painterly -photo_inset -sketch")
    args = ap.parse_args()

    old = {}
    if os.path.exists(OUT_FP):
        try:
            old = {p["id"]: p for p in json.load(open(OUT_FP)).get("photos", [])}
        except Exception:
            pass

    photos, seen = [], set(old)
    pid, empty_run = 0, 0
    while len(seen) < args.target:
        batch = fetch_page(pid, args.tags)
        if not batch:
            print("  page %d kosong, berhenti" % pid)
            break
        added = 0
        for p in batch:
            pid_post = p.get("id")
            if pid_post in seen:
                continue
            url = p.get("sample_url") or p.get("preview_url") or ""
            if not url or not url.startswith("http"):
                continue
            # Lewati file non-gambar; jangan pakai file_url (original bisa puluhan MB)
            img = str(p.get("image") or "")
            if not re.search(r"\.(jpe?g|png)$", img, re.I) and "sample" not in url:
                continue
            seen.add(pid_post)
            name = tag_name(p.get("tags") or "") or ("Ikon anime #%s" % pid_post)
            photos.append({"id": pid_post, "name": name, "url": url, "tags": p.get("tags") or ""})
            added += 1
        print("  page %d: +%d (total %d)" % (pid, added, len(seen)), flush=True)
        pid += 1
        empty_run = empty_run + 1 if added == 0 else 0
        if empty_run >= 8:
            print("  8 halaman berturut-turut tanpa foto baru, berhenti")
            break
        time.sleep(0.6)

    merged = list(old.values()) + photos
    # dedupe akhir + potong sesuai target (lama dipertahankan dulu)
    uniq, seen2 = [], set()
    for p in merged:
        if p["id"] in seen2:
            continue
        seen2.add(p["id"])
        uniq.append(p)
    uniq = uniq[:args.target]
    json.dump({"updated": TODAY, "photos": uniq},
              open(OUT_FP, "w"), ensure_ascii=False)
    print("data/ikon.json: %d foto (target %d)" % (len(uniq), args.target))


if __name__ == "__main__":
    main()
