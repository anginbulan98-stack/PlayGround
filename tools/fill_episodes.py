#!/usr/bin/env python3
"""Isi episode yang hilang untuk SEMUA serial.
- Ambil ulang /series/{akid}: bila API punya episode bernomor lebih banyak
  dari file, file diperbarui.
- Serial multi-part (S1+S2 dalam satu entri katalog): gabungkan part sequel
  dengan penomoran kontinu. Peta part disimpan di data/anikoto.json
  ("parts": [{"id": ..., "offset": ...}]) agar refresh harian ikut merawatnya.
Idempoten: tanpa perubahan = tanpa tulis ulang (kecuali updated).
"""
import json, os, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from refresh_all import get, api_series  # pakai helper + UA yang sama

# show-title (anikoto) -> [(sequel_akid, offset)]
MERGED_PARTS = {
    "Solo Leveling": [(7457, 12)],
    "Spy x Family": [(7165, 12)],
    "Kaiju No. 8": [(7983, 12)],
    "Sakamoto Days": [(7976, 11)],
    "Wind Breaker": [(7568, 13)],
    "Dan Da Dan": [(7920, 12)],
}

def fetch_retry(aid, tries=4):
    last = None
    for i in range(tries):
        try:
            return api_series(aid)
        except Exception as e:
            last = e
            time.sleep(4 + i * 4)  # backoff 4/8/12/16 dtk (batas API ketat)
    raise last

def norm_eps(d):
    return [{"n": ep.get("number"),
             "t": ep.get("title") or ("Episode %s" % ep.get("number")),
             "e": ep.get("embed_url") or {}}
            for ep in (d.get("data", {}).get("episodes") or [])]

def main():
    ak = json.load(open("data/anikoto.json"))
    anime = json.load(open("data/anime.json"))
    by_show = {s["title"]: s for s in anime["shows"]}
    changed_files = []
    for o in ak:
        if not o.get("id"):
            continue
        aid, title = o["id"], o["show"]
        try:
            eps = norm_eps(fetch_retry(aid))
        except Exception as e:
            print("  gagal fetch %s (%s): %s" % (title, aid, str(e)[:60]))
            continue
        # gabungkan part sequel dengan offset nomor
        parts = []
        for pid, off in MERGED_PARTS.get(title, []):
            try:
                peps = norm_eps(fetch_retry(pid))
            except Exception as e:
                print("  gagal part %s untuk %s: %s" % (pid, title, str(e)[:60]))
                continue
            shifted = []
            for e in peps:
                try:
                    n = int(e["n"])
                except (TypeError, ValueError):
                    continue
                shifted.append({"n": off + n, "t": e["t"], "e": e["e"]})
            if shifted:
                eps = eps + shifted
                parts.append({"id": pid, "offset": off})
            time.sleep(1.0)
        eps.sort(key=lambda e: (int(e["n"]) if str(e["n"]).isdigit() else 99999))
        # deduplicate nomor (part utama menang)
        seen, merged = set(), []
        for e in eps:
            k = str(e["n"])
            if k in seen:
                continue
            seen.add(k)
            merged.append(e)
        fp = "data/eps/%d.json" % aid
        old = json.load(open(fp))["episodes"] if os.path.exists(fp) else []
        if [e["n"] for e in merged] != [e["n"] for e in old]:
            json.dump({"id": aid, "updated": time.strftime("%Y-%m-%d"),
                       "episodes": merged}, open(fp, "w"), ensure_ascii=False)
            print("  update %s: %d -> %d eps" % (title, len(old), len(merged)))
            changed_files.append(fp)
        o["episodes"] = len(merged)
        if parts and o.get("parts") != parts:
            o["parts"] = parts
        hit = by_show.get(title)
        if hit and hit.get("episodes") != len(merged):
            hit["episodes"] = len(merged)
        time.sleep(1.2)

    # laporkan status per judul katalog
    print("\n== status playable vs total katalog ==")
    stale = []
    for s in anime["shows"]:
        fp = "data/eps/%d.json" % (s.get("akid") or -1)
        n = len(json.load(open(fp))["episodes"]) if s.get("akid") and os.path.exists(fp) else 0
        flag = "OK " if n >= s["episodes"] else "KURANG"
        if flag == "KURANG":
            stale.append((s["title"], n, s["episodes"]))
        print("  [%s] %-32s file:%d total:%d" % (flag, s["title"][:32], n, s["episodes"]))
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    try:
        from refresh_all import sync_anime_js
        sync_anime_js(anime, ak)
    except Exception as e:
        print("  sync anime-js gagal:", str(e)[:80])
    print("\nkurang:", stale if stale else "nihil — semua penuh")
    print("file berubah:", changed_files if changed_files else "tidak ada")

if __name__ == "__main__":
    main()
