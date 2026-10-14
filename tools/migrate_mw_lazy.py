#!/usr/bin/env python3
"""Migrasi sekali jalan: data/manhwa.json (chapters inline, 4.2MB+)
-> index ringan (tanpa chapters) + data/mwch/{slug}.json per judul.

Alasan: 3.679 judul x ratusan ribu chapter tidak muat dimuat sekaligus di HP.
Setelah migrasi, app.js mengambil daftar chapter per judul saat dibuka saja.
Idempoten: mwch yang sudah ada tidak ditulis ulang.
"""
import json, os

SRC = "data/manhwa.json"
DST_DIR = "data/mwch"


def main():
    d = json.load(open(SRC))
    os.makedirs(DST_DIR, exist_ok=True)
    index = []
    moved, skipped = 0, 0
    for t in d["titles"]:
        chs = t.get("chapters") or []
        fp = os.path.join(DST_DIR, t["slug"] + ".json")
        if not os.path.exists(fp):
            json.dump({"slug": t["slug"], "chapters": chs}, open(fp, "w"), ensure_ascii=False)
            moved += 1
        else:
            skipped += 1
        last = ""
        for c in chs:
            dd = c.get("d") or ""
            if dd > last:
                last = dd
        index.append({k: t.get(k, "") for k in ("id", "title", "slug", "cover")}
                     | {"total": t.get("total", len(chs)),
                        "type": t.get("type", "Manhwa"),
                        "genres": t.get("genres", ["Manhwa"]),
                        "status": t.get("status", "Ongoing"),
                        "lastUpdate": last})
    # backup sekali
    if not os.path.exists(SRC + ".bak-inline"):
        os.rename(SRC, SRC + ".bak-inline")
    json.dump({"updated": d.get("updated", ""), "titles": index},
              open(SRC, "w"), ensure_ascii=False)
    print("judul: %d | mwch ditulis: %d (lewati: %d)" % (len(index), moved, skipped))
    import subprocess
    sz = os.path.getsize(SRC)
    print("manhwa.json kini: %.1f KB" % (sz / 1024))


if __name__ == "__main__":
    main()
