#!/usr/bin/env python3
"""Isi file episode yang HILANG (data/eps/{akid}.json) sampai tuntas.

Latar: halaman detail macet di "Memuat daftar episode..." bila file lokal
tidak ada DAN API sedang sibuk/rate-limit. Setelah skrip ini tuntas, setiap
judul ber-akid punya file lokal -> daftar episode terbuka instan.

- Hanya mengunduh yang belum ada (resume otomatis tiap dijalankan).
- Sequential + jeda (hormati rate-limit API) + retry/backoff khusus 429.
- Di akhir: sinkronkan hitungan episode + data-anime.js.

Jalankan: python3 tools/ensure_eps.py [--limit 100] [--sleep 1.5]
Ulangi sampai laporan "hilang: 0".
"""
import json, os, sys, time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeBulk/1.0"}
TODAY = time.strftime("%Y-%m-%d")


def api_series(aid, timeout=30):
    req = urllib.request.Request("https://anikotoapi.site/series/%d" % aid, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def fetch_with_retry(aid):
    delay = 5
    for attempt in range(5):
        try:
            return api_series(aid), None
        except Exception as e:
            msg = str(e)
            if "429" in msg:
                wait = 60 if attempt >= 2 else 20
                print("  [%d] 429 rate-limit -> tidur %ds" % (aid, wait), flush=True)
                time.sleep(wait)
            elif attempt < 4:
                print("  [%d] gagal (%s), retry %d" % (aid, msg[:60], attempt + 1), flush=True)
                time.sleep(delay)
                delay *= 2
            else:
                return None, msg
    return None, "retry habis"


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=1.5)
    args = ap.parse_args()

    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    by_show = {s["title"]: s for s in anime["shows"]}

    missing = [o for o in ak if o.get("id") and not os.path.exists("data/eps/%d.json" % o["id"])]
    if args.limit:
        missing = missing[:args.limit]
    print("hilang: %d (diproses: %d)" % (
        len([o for o in ak if o.get("id") and not os.path.exists("data/eps/%d.json" % o["id"])]),
        len(missing)), flush=True)

    ok, fail = 0, []
    for i, o in enumerate(missing, 1):
        aid, title = o["id"], o["show"]
        d, err = fetch_with_retry(aid)
        if d is None:
            # 404 = ID mati di API: catat agar tak diulang tiap hari
            if err and "404" in err:
                o["dead"] = True
                print("[%d/%d] %s (%d): 404 mati -> ditandai dead" % (i, len(missing), title, aid), flush=True)
            else:
                fail.append((title, aid, (err or "")[:60]))
                print("[%d/%d] %s (%d): GAGAL %s" % (i, len(missing), title, aid, (err or "")[:60]), flush=True)
            time.sleep(args.sleep)
            continue
        eps = [{"n": ep.get("number"),
                "t": ep.get("title") or ("Episode %s" % ep.get("number")),
                "e": ep.get("embed_url") or {}}
               for ep in ((d.get("data") or {}).get("episodes") or [])]
        eps.sort(key=lambda e: (int(e["n"]) if str(e["n"]).isdigit() else 99999))
        json.dump({"id": aid, "updated": TODAY, "episodes": eps},
                  open("data/eps/%d.json" % aid, "w"), ensure_ascii=False)
        o["episodes"] = len(eps)
        o.pop("dead", None)
        hit = by_show.get(title)
        if hit and (hit.get("episodes") or 0) < len(eps):
            hit["episodes"] = len(eps)
        ok += 1
        print("[%d/%d] %s (%d): %d eps OK" % (i, len(missing), title, aid, len(eps)), flush=True)
        time.sleep(args.sleep)

    anime["updated"] = TODAY
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.sync_anime_js(anime, ak)
    except Exception as e:
        print("sync anime-js gagal:", str(e)[:80])

    rest = [o for o in ak if o.get("id") and not o.get("dead") and not os.path.exists("data/eps/%d.json" % o["id"])]
    print("selesai: ok=%d gagal=%d sisa_hilang=%d" % (ok, len(fail), len(rest)))
    for t, a, e in fail[:15]:
        print("  GAGAL: %s (%d) %s" % (t, a, e))
    if rest:
        print("Jalankan lagi: python3 tools/ensure_eps.py")


if __name__ == "__main__":
    main()
