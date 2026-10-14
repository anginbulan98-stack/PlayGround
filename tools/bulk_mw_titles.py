#!/usr/bin/env python3
"""Impor TUNTAS semua manhwa (1.847) + manhua (1.832) dari komiku.org.

Sumber enumeration: https://komiku.org/daftar-komik/?tipe={manhwa,manhua}
&halaman=N (50/halaman, total ~37+37 halaman) — lengkap, tidak ada yang
terlewat (tak lagi mengandalkan cuplikan beranda).

Untuk tiap slug yang belum ada di index:
  detail /manga/{slug}/ -> chapters + genres + status (satu fetch),
  tulis data/mwch/{slug}.json + tambah entri index (tanpa chapters).

Idempoten + resume: slug yang sudah di index dilewati.
Sopan: sequential + jeda (hormati server komiku).

Jalankan: python3 tools/bulk_mw_titles.py [--budget 400] [--sleep 0.5]
Ulangi sampai "baru: 0".
"""
import json, os, re, time, html as ihtml
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeBulk/1.0"}
IDX = "data/manhwa.json"
MWCH = "data/mwch"
STATE = "data/bulk_mw_state.json"


def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def enum_pages(tipe):
    out, page = {}, 1
    while True:
        h = get("https://komiku.org/daftar-komik/?tipe=%s&halaman=%d" % (tipe, page))
        cards = re.findall(
            r'<article class="manga-card">.*?<a href="/manga/([a-z0-9-]+)/".*?'
            r'data-src="([^"]+)".*?alt="\s*(.*?)\s*".*?'
            r'<p class="meta">\s*([^<•]+?)\s*(?:•\s*([^<]+?))?\s*<br', h, re.S)
        if not cards:
            alt = re.findall(r'<a href="/manga/([a-z0-9-]+)/"', h)
            for slug in dict.fromkeys(alt):
                out.setdefault(slug, {"title": "", "cover": "", "genre1": "", "type": tipe})
            if not alt:
                break
        else:
            for slug, cover, title, typ, genre1 in cards:
                title = ihtml.unescape(re.sub(r"\s+", " ", title)).strip()
                out.setdefault(slug, {"title": title, "cover": cover,
                                      "genre1": (genre1 or "").strip(), "type": tipe})
        if len(cards) < 50 and page > 1:
            # halaman terakhir parsial — pastikan tak ada halaman berikut
            try:
                h2 = get("https://komiku.org/daftar-komik/?tipe=%s&halaman=%d" % (tipe, page + 1))
                if "/manga/" not in h2:
                    break
                page += 1
                continue
            except Exception:
                break
        page += 1
        if page > 60:
            break
        time.sleep(0.4)
    return out


def komiku_detail(slug):
    html = get("https://komiku.org/manga/%s/" % slug)
    if "Daftar_Chapter" not in html:
        return None
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    title = re.sub(r"^Komik\s+", "", re.sub(r"<[^>]+>", "", m.group(1)).strip()) if m else slug
    og = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html)
    gm = re.search(r'<ul class="genre">(.*?)</ul>', html, re.S)
    genres = [g.strip() for g in re.findall(r"<span>([^<]+)</span>", gm.group(1))] if gm else []
    genres = [g for g in dict.fromkeys(genres) if g]
    sm = re.search(r"<td>Status:</td>\s*<td>([^<]+)</td>", html)
    st = sm.group(1).strip() if sm else "Ongoing"
    status = "Ongoing" if st.lower().startswith("ongo") else ("Tamat" if re.search(r"tamat|completed|end", st, re.I) else st)
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
    return {"title": title, "cover": og.group(1) if og else "", "genres": genres,
            "status": status, "chapters": chapters}


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--budget", type=int, default=400)
    ap.add_argument("--sleep", type=float, default=0.5)
    ap.add_argument("--enum-only", action="store_true")
    args = ap.parse_args()

    enum = {}
    for tipe in ("manhwa", "manhua"):
        print("enumerasi %s..." % tipe, flush=True)
        enum.update(enum_pages(tipe))
        print("  terkumpul: %d" % len(enum), flush=True)
    json.dump({"updated": time.strftime("%Y-%m-%d"), "slugs": enum},
              open(STATE, "w"), ensure_ascii=False)
    print("total slug unik: %d" % len(enum))
    if args.enum_only:
        return

    d = json.load(open(IDX))
    have = {t["slug"] for t in d["titles"]}
    # koreksi tipe 265 lama (migrasi default Manhwa) dari hasil enumerasi
    patched = 0
    for t in d["titles"]:
        want = enum.get(t["slug"], {}).get("type", "").capitalize()
        if want and t.get("type") != want:
            t["type"] = want
            patched += 1
    if patched:
        print("tipe dikoreksi: %d" % patched)
    todo = [s for s in enum if s not in have]
    print("di index: %d | perlu detail: %d (budget %d)" % (len(have), len(todo), args.budget))
    os.makedirs(MWCH, exist_ok=True)

    added, fail, done = 0, [], 0
    for slug in todo:
        if done >= args.budget:
            break
        card = enum[slug]
        try:
            det = komiku_detail(slug)
        except Exception as e:
            fail.append((slug, str(e)[:50]))
            time.sleep(args.sleep)
            continue
        if not det or not det["chapters"]:
            fail.append((slug, "nodata"))
            time.sleep(args.sleep)
            continue
        fp = os.path.join(MWCH, slug + ".json")
        if not os.path.exists(fp):
            json.dump({"slug": slug, "chapters": det["chapters"]}, open(fp, "w"), ensure_ascii=False)
        title = det["title"] or card["title"] or slug
        cover = det["cover"] or card["cover"]
        genres = det["genres"] or ([card["genre1"]] if card["genre1"] else []) or [card["type"].capitalize()]
        last = ""
        for c in det["chapters"]:
            if (c.get("d") or "") > last:
                last = c["d"] or last
        d["titles"].append({"id": slug, "title": title, "slug": slug, "cover": cover,
                            "total": len(det["chapters"]),
                            "type": card["type"].capitalize(),
                            "genres": genres, "status": det["status"], "lastUpdate": last})
        have.add(slug)
        added += 1
        done += 1
        if done % 50 == 0:
            json.dump(d, open(IDX, "w"), ensure_ascii=False)
            print("  ...%d ditambahkan" % added, flush=True)
        time.sleep(args.sleep)
    d["updated"] = time.strftime("%Y-%m-%d")
    json.dump(d, open(IDX, "w"), ensure_ascii=False)
    print("baru: %d | gagal: %d | total index: %d" % (added, len(fail), len(d["titles"])))
    for s, e in fail[:10]:
        print("  GAGAL: %s %s" % (s, e))
    if len([s for s in enum if s not in have]):
        print("Jalankan lagi: python3 tools/bulk_mw_titles.py --budget %d" % args.budget)


if __name__ == "__main__":
    main()
