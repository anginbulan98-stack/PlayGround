#!/usr/bin/env python3
"""Isi gambar chapter manhwa yang HILANG (data/mw/*.json) sampai tuntas.

Latar: reader gagal total untuk 233/265 judul karena tak punya file pages
dan kode lama langsung menyerah tanpa coba jalur live (sudah diperbaiki di
app.js: chapterImages kini selalu fallback live + timeout + retry button).

Skrip ini menuntaskan sisi data: mengunduh daftar gambar tiap chapter yang
belum tercover langsung dari komiku.org (tanpa proxy, cepat ~0,5 dtk/ch).

- Idempoten + resume otomatis: hanya mengisi chapter yang belum ada di file.
- Urutan: nomor chapter terkecil dulu (CH 1, 2, ...) = tempat pembaca baru
  mulai; judul dengan chapter sedikit didahulukan (cepat tuntas per judul).
- Aman dijalankan ulang / via GitHub Actions harian.

Jalankan: python3 tools/ensure_mw.py [--budget 250] [--sleep 0.4]
Ulangi sampai laporan "sisa: 0".
"""
import json, os, re, time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeBulk/1.0"}


def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def chapter_imgs(ch_url):
    html = get("https://komiku.org" + ch_url)
    i = html.find('id="Baca_Komik"')
    seg = html[i:i + 150000] if i > 0 else html
    out = []
    for u in re.findall(r'<img[^>]+(?:src|data-src)="(https?://[^"]+)"', seg):
        if u.startswith("http") and not re.search(
                r"promosi|logo|avatar|gravatar|gstatic|googletag", u, re.I):
            if u not in out:
                out.append(u)
    return out


def ch_num(c):
    try:
        return float(str(c.get("n", "")).strip())
    except ValueError:
        return 1e9


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--budget", type=int, default=250)
    ap.add_argument("--sleep", type=float, default=0.4)
    ap.add_argument("--only", type=str, default="",
                    help="hanya isi slug ini sampai tuntas (abaikan budget global judul lain)")
    args = ap.parse_args()

    d = json.load(open("data/manhwa.json"))
    if args.only:
        d["titles"] = [t for t in d["titles"] if t["slug"] == args.only]
        if not d["titles"]:
            print("slug tidak dikenal: %s" % args.only)
            return
        args.budget = 10 ** 9
    # judul chapter-sedikit dulu; chapter diisi dari DUA UJUNG bergantian
    # (terlama + terbaru) karena pembaca membuka dari kedua ujung daftar.
    # Daftar chapter dibaca dari data/mwch/{slug}.json (lazy); index ringan.
    def get_chapters(t):
        fp = "data/mwch/%s.json" % t["slug"]
        if os.path.exists(fp):
            try:
                return json.load(open(fp)).get("chapters", [])
            except Exception:
                return []
        return t.get("chapters") or []
    for t in d["titles"]:
        t["_chs"] = get_chapters(t)
    titles = sorted(d["titles"], key=lambda t: len(t["_chs"]))

    total_missing = 0
    for t in titles:
        fp = "data/mw/%s.json" % t["slug"]
        pages = {}
        if os.path.exists(fp):
            try:
                pages = json.load(open(fp)).get("pages", {})
            except Exception:
                pages = {}
        total_missing += sum(1 for c in t["_chs"] if not pages.get(c["u"]))
    print("chapter hilang: %d (budget run ini: %d)" % (total_missing, args.budget), flush=True)

    done, fail, skipped = 0, [], 0
    for t in titles:
        if done >= args.budget:
            break
        fp = "data/mw/%s.json" % t["slug"]
        pages = {}
        if os.path.exists(fp):
            try:
                pages = json.load(open(fp)).get("pages", {})
            except Exception:
                pages = {}
        dirty = False
        ordered = sorted(t["_chs"], key=ch_num)
        queue = []
        li, hi = 0, len(ordered) - 1
        while li <= hi:
            queue.append(ordered[li])
            if hi != li:
                queue.append(ordered[hi])
            li += 1
            hi -= 1
        for c in queue:
            if done >= args.budget:
                break
            if pages.get(c["u"]):
                continue
            try:
                imgs = chapter_imgs(c["u"])
            except Exception as e:
                fail.append((t["slug"], c["u"], str(e)[:50]))
                time.sleep(args.sleep)
                continue
            if imgs:
                pages[c["u"]] = imgs
                dirty = True
            else:
                skipped += 1
            done += 1
            if done % 50 == 0:
                print("  ...%d chapter diproses" % done, flush=True)
            # simpan bertahap tiap 50 chapter agar progres tidak hilang bila
            # proses terbunuh di tengah jalan (file ditulis ulang utuh).
            if dirty and done % 50 == 0:
                try:
                    json.dump({"slug": t["slug"], "pages": pages}, open(fp, "w"), ensure_ascii=False)
                except Exception:
                    pass
                dirty = False
            time.sleep(args.sleep)
        if dirty:
            json.dump({"slug": t["slug"], "pages": pages}, open(fp, "w"), ensure_ascii=False)
            print("  tulis %s (+%d ch)" % (t["slug"], sum(1 for v in pages.values() if v)), flush=True)

    # sisa
    rest = 0
    for t in titles:
        fp = "data/mw/%s.json" % t["slug"]
        pages = json.load(open(fp)).get("pages", {}) if os.path.exists(fp) else {}
        rest += sum(1 for c in t["_chs"] if not pages.get(c["u"]))
    print("selesai: diproses=%d kosong=%d gagal=%d sisa=%d" % (done, skipped, len(fail), rest))
    for s, u, e in fail[:10]:
        print("  GAGAL: %s %s %s" % (s, u, e))
    if rest:
        print("Jalankan lagi: python3 tools/ensure_mw.py --budget %d" % args.budget)


if __name__ == "__main__":
    main()
