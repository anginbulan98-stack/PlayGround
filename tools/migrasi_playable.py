#!/usr/bin/env python3
"""Migrasi satu-kali: selaraskan angka episode katalog = yang bisa diputar.

Untuk tiap show ber-akid: baca data/eps/{akid}.json, hitung N = nomor
episode playable terbesar (embed SUB/DUB/non-kosong ada). Tulis N ke:
  - data/anime.json (shows[].episodes)
  - data/anikoto.json (entri episodes)
  - data-anime.js (kolom manual episodes, supaya sync max() tidak menggelembung lagi)
Tanpa file eps / tanpa playable: biarkan apa adanya.
Lapor: berapa diubah + daftar 20 perubahan terbesar.
"""
import json
import os
import re

TODAY = open("data/anime.json").read()  # pastikan cwd = repo root
import time as _t
TODAY = _t.strftime("%Y-%m-%d")


def playable_max(aid):
    fp = "data/eps/%d.json" % aid
    if not os.path.exists(fp):
        return None
    try:
        eps = json.load(open(fp)).get("episodes", [])
    except Exception:
        return None
    nums = []
    for e in eps:
        eu = e.get("e") or {}
        if eu.get("sub") or eu.get("dub") or len(eu.keys()) > 0:
            try:
                nums.append(int(e["n"]))
            except (TypeError, ValueError, KeyError):
                pass
    return max(nums) if nums else 0


def main():
    anime = json.load(open("data/anime.json"))
    ak = json.load(open("data/anikoto.json"))
    ak_ep = {}
    for o in ak:
        if o.get("id"):
            ak_ep[o["id"]] = o

    changed = []
    for s in anime["shows"]:
        aid = s.get("akid")
        if not aid:
            continue
        n = playable_max(aid)
        if n is None or n <= 0:
            continue
        if (s.get("episodes") or 0) != n:
            changed.append((s["title"], s.get("episodes"), n))
            s["episodes"] = n
        o = ak_ep.get(aid)
        if o is not None and (o.get("episodes") or 0) != n:
            o["episodes"] = n

    anime["updated"] = TODAY
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)

    # samakan kolom manual di data-anime.js
    raw = open("data-anime.js", encoding="utf-8").read()
    m = re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, re.S)
    payload = json.loads(m.group(1))
    by_id = {s["id"]: s.get("episodes") for s in anime["shows"]}
    n_js = 0
    for s in payload["shows"]:
        if s["id"] in by_id and s.get("episodes") != by_id[s["id"]]:
            s["episodes"] = by_id[s["id"]]
            n_js += 1
    payload["updated"] = TODAY
    head = ("/* Guoke AMHDQ — KATALOG ANIME (migrasi playable: angka episode = "
            "yang bisa diputar. Kolom manual dipertahankan.) */\nwindow.GQ_ANIME = ")
    open("data-anime.js", "w", encoding="utf-8").write(
        head + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n")

    print("diubah: %d judul (anime.json) | %d sel (data-anime.js)" % (len(changed), n_js))
    for t, old, new in sorted(changed, key=lambda x: (x[1] or 0) - x[2], reverse=True)[:20]:
        print("  %s: %s -> %s" % (t[:60], old, new))


if __name__ == "__main__":
    main()
