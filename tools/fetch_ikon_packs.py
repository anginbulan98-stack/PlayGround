#!/usr/bin/env python3
"""Pack ikon per karakter untuk galeri Ikon (rilis BAWAH, bernama).

Kenapa bukan Pinterest: Pinterest wajib login + anti-bot + blokir CORS sehingga
tidak bisa disedot otomatis (lihat komentar galeri di app.js). Sumber di sini
Safebooru (API terbuka, pola sama seperti tools/fetch_marin.py yang sudah
menghasilkan 1252 foto Marin) — pool gambarnya tumpang tindih besar dengan
yang beredar di Pinterest (kebanyakan repost art booru).

- Per karakter: hingga --per-char foto (default 500), diurutkan score
  tertinggi dulu (proxy objektif terdekat untuk "imut/ganteng").
- Output: data/ikon-pack-<slug>.json {updated, character, tag, photos:
  [{id,name,url}]} + manifest data/ikon-packs.json. Hanya metadata URL
  (hotlink sample), TANPA mengunduh file gambar.
- Dedupe terhadap data/ikon.json, data/ikon-marin.json, dan antar-pack.
- Di aplikasi, SEMUA pack tampil PALING BAWAH (setelah batch lain).

Contoh:
  python3 tools/fetch_ikon_packs.py --probe-only        # cek tag saja
  python3 tools/fetch_ikon_packs.py --chars marin,alya --per-char 50
  python3 tools/fetch_ikon_packs.py --per-char 500      # semua karakter
"""
import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeIkon/1.0"}
TODAY = time.strftime("%Y-%m-%d")
PER_PAGE = 100
MANIFEST_FP = os.path.join(ROOT, "data", "ikon-packs.json")

BASE_EXCL = ("-cosplay -photo -photorealistic -realistic -furry -3d "
             "-comic -comic_panel -animated -ai_generated")

# (slug, nama tampil, [tag safebooru dicoba berurutan])
CHARACTERS = [
    ("marin", "Marin Kitagawa", ["kitagawa_marin"]),
    ("alya", "Alya Kujou", ["kujou"]),
    ("waguri", "Waguri Kaoruko", ["waguri_kaoruko"]),
    ("yuta", "Yuta Okkotsu", ["okkotsu_yuuta"]),
    ("gojo", "Gojo Satoru", ["gojou_satoru"]),
    ("toji", "Toji Fushiguro", ["fushiguro_touji"]),
    ("sukuna", "Sukuna", ["ryoumen_sukuna"]),
    ("miku", "Miku Hatsune", ["hatsune_miku"]),
    ("horimiya", "Horimiya Kyouko", ["hori_kyouko"]),
    ("shikimori", "Shikimori", ["shikimori_miyako", "shikimori"]),
    ("mahiru", "Mahiru Shiina", ["shiina_mahiru"]),
    ("haimiya", "Haimiya", ["haimiya"]),
    ("lehan", "Le Han Yoill", ["le_han_yoill"]),
    ("nanako", "Nanako", ["nanako"]),
    ("nino", "Nino Nakano", ["nakano_nino"]),
    ("itsuki", "Nakano Itsuki", ["nakano_itsuki"]),
    ("masha", "Masha", ["masha"]),
    ("yuki", "Yuki Suou", ["suou_yuki"]),
    ("masachika", "Masachika Kuze", ["kuze_masachika"]),
    ("kurumi", "Kurumi Tokisaki", ["tokisaki_kurumi"]),
    ("ai", "Hoshino Ai", ["hoshino_ai"]),
    ("ruby", "Ruby Hoshino", ["hoshino_ruby"]),
    ("shinobu", "Shinobu Oshino", ["oshino_shinobu"]),
    ("uzuki", "Uzuki Shimamura", ["shimamura_uzuki"]),
]
# 'kujou' (nama keluarga Alya) sudah tercakup pack alya — tidak diduplikat.


def fetch_page(pid, tags):
    q = urllib.parse.urlencode({
        "page": "dapi", "s": "post", "q": "index", "json": "1",
        "limit": PER_PAGE, "pid": pid, "tags": tags,
    })
    req = urllib.request.Request("https://safebooru.org/index.php?" + q,
                                 headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    try:
        out = json.loads(data)
        return out if isinstance(out, list) else []
    except Exception:
        return []


def load_existing_ids():
    ids, urls = set(), set()
    for fp in [os.path.join(ROOT, "data", "ikon.json"),
               os.path.join(ROOT, "data", "ikon-marin.json")]:
        try:
            for p in json.load(open(fp)).get("photos", []):
                ids.add(p.get("id"))
                if p.get("url"):
                    urls.add(p.get("url"))
        except Exception:
            pass
    return ids, urls


def fetch_char(slug, name, tags, per_char, old_ids, old_urls, seen_urls):
    got = []
    for tag in tags:
        if len(got) >= per_char:
            break
        query = (tag + " " + BASE_EXCL).strip()
        pid, empty_run = 0, 0
        while len(got) < per_char:
            try:
                batch = fetch_page(pid, query)
            except Exception as e:
                print("  [%s] page %d error: %s" % (slug, pid, str(e)[:80]),
                      flush=True)
                time.sleep(3)
                pid += 1
                if pid > 60:
                    break
                continue
            if not batch:
                print("  [%s] tag '%s' page %d kosong" % (slug, tag, pid),
                      flush=True)
                break
            cand = []
            for p in batch:
                pid_post = p.get("id")
                url = p.get("sample_url") or ""
                if not url.startswith("http"):
                    continue
                img = str(p.get("image") or "")
                if not re.search(r"\.(jpe?g|png)$", img, re.I):
                    continue
                if pid_post in old_ids or url in old_urls or url in seen_urls:
                    continue
                try:
                    score = int(p.get("score") or 0)
                except Exception:
                    score = 0
                cand.append((score, pid_post, url))
            cand.sort(key=lambda c: -c[0])
            for score, pid_post, url in cand:
                if len(got) >= per_char:
                    break
                seen_urls.add(url)
                got.append({"id": pid_post, "name": name, "url": url,
                            "score": score})
            print("  [%s] '%s' page %d: +%d (total %d)" %
                  (slug, tag, pid, len(cand), len(got)), flush=True)
            pid += 1
            empty_run = empty_run + 1 if not cand else 0
            if empty_run >= 8:
                break
            if pid > 40:
                break
            time.sleep(0.6)
        if got:
            return got, tag
    return got, (tags[0] if tags else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-char", type=int, default=500)
    ap.add_argument("--chars", default="all",
                    help="slug dipisah koma, atau 'all'")
    ap.add_argument("--force", action="store_true",
                    help="ambil ulang pack yang sudah lengkap")
    ap.add_argument("--probe-only", action="store_true",
                    help="cek tag saja, tanpa menulis file")
    args = ap.parse_args()

    wanted = [c for c in CHARACTERS
              if args.chars == "all" or c[0] in args.chars.split(",")]
    old_ids, old_urls = load_existing_ids()
    try:
        for f in json.load(open(MANIFEST_FP)).get("packs", []):
            try:
                for p in json.load(open(os.path.join(ROOT, f))).get("photos", []):
                    if p.get("url"):
                        old_urls.add(p["url"])
            except Exception:
                pass
    except Exception:
        pass

    if args.probe_only:
        for slug, name, tags in wanted:
            ok = False
            for tag in tags:
                try:
                    b = fetch_page(0, tag)
                except Exception:
                    b = []
                print("%-10s tag '%s' => %d" % (slug, tag, len(b)), flush=True)
                if b:
                    ok = True
                    break
                time.sleep(0.4)
            if not ok:
                print("%-10s TIDAK ADA HASIL (dilewati saat fetch)" % slug)
        return

    seen_urls = set()
    manifest_files = []
    try:
        manifest_files = json.load(open(MANIFEST_FP)).get("packs", [])
    except Exception:
        manifest_files = []

    for slug, name, tags in wanted:
        fp = os.path.join(ROOT, "data", "ikon-pack-%s.json" % slug)
        if os.path.exists(fp) and not args.force:
            try:
                n = len(json.load(open(fp)).get("photos", []))
            except Exception:
                n = 0
            if n >= args.per_char:
                print("[%s] sudah %d, dilewati (pakai --force untuk ulang)"
                      % (slug, n), flush=True)
                rel = "data/ikon-pack-%s.json" % slug
                if rel not in manifest_files:
                    manifest_files.append(rel)
                continue
        print("[%s] %s: target %d" % (slug, name, args.per_char), flush=True)
        got, used_tag = fetch_char(slug, name, tags, args.per_char,
                                   old_ids, old_urls, seen_urls)
        for p in got:
            p.pop("score", None)
        if not got:
            print("[%s] NOL hasil — pack dilewati" % slug, flush=True)
            continue
        json.dump({"updated": TODAY, "character": name, "tag": used_tag,
                   "photos": got[:args.per_char]}, open(fp, "w"),
                  ensure_ascii=False)
        print("[%s] tersimpan %d foto -> %s" % (slug, len(got), fp),
              flush=True)
        rel = "data/ikon-pack-%s.json" % slug
        if rel not in manifest_files:
            manifest_files.append(rel)

    json.dump({"updated": TODAY, "packs": manifest_files},
              open(MANIFEST_FP, "w"), ensure_ascii=False)
    print("manifest %s: %d pack" % (MANIFEST_FP, len(manifest_files)))


if __name__ == "__main__":
    main()
