#!/usr/bin/env python3
"""Perbaiki pemetaan akid sampai TUNTAS (satu sumber kebenaran).

Masalah yang diselesaikan:
1. data-anime.js vs data/anime.json menunjuk akid BERBEDA untuk judul sama
   (kolom manual warisan, mis. MHA S3 -> aid film Violet Evergarden).
2. akid menunjuk aid yang isinya judul lain (salah season / salah total).
3. Angka episode > playable (tombol mati) — diselaraskan ke playable max.

Aturan per judul:
- Kandidat = aid yang norm(show/apiTitle)-nya SAMA PERSIS dengan norm judul
  + akid lama (kecuali jelas salah).
- Validasi season-aware (titles_match dari rilis_tersisa_nyaa).
- Pilih playable terbanyak. Tanpa kandidat valid + akid lama tak playable
  -> akid=null (jujur: belum ada stream) + masuk antrean search-remap.
- Grandfather: akid lama yang playable>0 dan tak ada kandidat valid yang
  mengalahkannya -> dipertahankan (jangan putus stream yang jalan,
  mis. alias resmi 'Oshi no Ko' <-> 'My Star').

Tulis ke data/anime.json + data/anikoto.json + data-anime.js SEKALIGUS
agar ketiganya konsisten. Search-remap (jaringan) hanya untuk judul yang
kehilangan akid dan ber-episode >= 12 (arus utama), dibatasi --search-limit.
"""
import json
import os
import re
import sys
import time
import importlib.util

TODAY = time.strftime("%Y-%m-%d")


def norm(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())


STOPW = {"season", "cour", "part", "movie", "ova", "special", "specials",
         "the", "a", "an"}


def alias_key(t):
    """Kunci alias season: ('My Hero Academia Season 3') ==
    ('My Hero Academia 3') == ('My Hero Academia 3rd Season').
    -> ((core words...), (numbers...))."""
    w = re.sub(r"[^a-z0-9 ]+", " ", str(t or "").lower())
    w = re.sub(r"(\d+)(st|nd|rd|th)\s+season", r"season \1", w)
    w = re.sub(r"\bseason\s*(\d+)", r"season \1", w)
    w = re.sub(r"\bcour\s*(\d+)", r"cour \1", w)
    w = re.sub(r"\bpart\s*(\d+)", r"part \1", w)
    w = re.sub(r"\bs(\d+)\b", r"season \1", w)
    toks = w.split()
    nums = tuple(x for x in toks if x.isdigit())
    core = tuple(x for x in toks if not x.isdigit() and x not in STOPW)
    return (core, nums)


def load_tersisa():
    spec = importlib.util.spec_from_file_location(
        "rilis_tersisa_nyaa", "tools/rilis_tersisa_nyaa.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # map_to_watchable (search -> aid playable) ada di tool 1-detik
    spec2 = importlib.util.spec_from_file_location(
        "rilis_1detik_nyaa", "tools/rilis_1detik_nyaa.py")
    mod2 = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(mod2)
    mod.map_to_watchable = mod2.map_to_watchable
    return mod


def playable_max(aid):
    fp = "data/eps/%d.json" % aid
    if not os.path.exists(fp):
        return 0
    try:
        eps = json.load(open(fp)).get("episodes", [])
    except Exception:
        return 0
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
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--search-limit", type=int, default=60)
    ap.add_argument("--no-search", action="store_true")
    args = ap.parse_args()
    TT = load_tersisa()

    anime = json.load(open("data/anime.json"))
    ak = json.load(open("data/anikoto.json"))
    raw = open("data-anime.js", encoding="utf-8").read()
    payload = json.loads(re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\});?\s*$", raw, re.S).group(1))
    js_by_id = {s["id"]: s for s in payload["shows"]}

    # apiTitle per aid (offline, dari anikoto.json)
    aid_title = {}
    for o in ak:
        if o.get("id"):
            aid_title.setdefault(o["id"], o.get("apiTitle") or o.get("show"))

    # kandidat exact-norm per judul
    exact = {}
    for o in ak:
        if not o.get("id"):
            continue
        for key in (o.get("show"), o.get("apiTitle")):
            if key:
                exact.setdefault(norm(key), []).append(o["id"])

    # kandidat alias-season per judul (Boku no Hero 3 == MHA Season 3 == MHA 3)
    alias = {}
    for o in ak:
        if not o.get("id"):
            continue
        for key in (o.get("show"), o.get("apiTitle")):
            if key:
                alias.setdefault(alias_key(key), []).append(o["id"])

    changed = 0
    nulled = []
    for s in anime["shows"]:
        title = s["title"]
        nt = norm(title)
        old_aid = s.get("akid") or (js_by_id.get(s["id"]) or {}).get("akid")
        cands = list(dict.fromkeys(
            (exact.get(nt) or [])
            + [a for a in (alias.get(alias_key(title)) or [])
               if a not in (exact.get(nt) or [])]
            + ([old_aid] if old_aid else [])))
        best, best_n = None, 0
        for aid in cands:
            t = aid_title.get(aid)
            if not t:
                continue
            if not TT.titles_match(title, t) and alias_key(title) != alias_key(t):
                continue
            n = playable_max(aid)
            if n > best_n:
                best, best_n = aid, n
        if best:
            if s.get("akid") != best or (s.get("episodes") or 0) != best_n:
                s["akid"], s["episodes"] = best, best_n
                changed += 1
            # pastikan entri anikoto ada untuk best
            if not any(o.get("id") == best for o in ak):
                ak.append({"show": title, "id": best, "slug": "",
                           "apiTitle": aid_title.get(best, title),
                           "episodes": best_n, "match": True, "auto": True,
                           "fixed": TODAY})
        else:
            # tak ada kandidat valid: pertahankan akid lama HANYA bila ia
            # menutupi PENUH angka katalog (playable_max >= episodes).
            # Kalau tidak (mis. katalog 25 tapi aid cuma punya 1 ep film
            # lain), mapping warisan itu SALAH -> null-kan.
            # Ini tetap melindungi alias resmi yang working
            # (mis. 'Oshi no Ko' <-> 'My Star': 11/11 penuh -> keep).
            keep = False
            need = s.get("episodes") or 0
            have = playable_max(old_aid) if old_aid else 0
            if old_aid and have > 0 and have >= need:
                keep = True
                if s.get("akid") != old_aid:
                    s["akid"] = old_aid
                    changed += 1
                if (s.get("episodes") or 0) > playable_max(old_aid):
                    s["episodes"] = playable_max(old_aid)
                    changed += 1
            if not keep and old_aid:
                s["akid"] = None
                changed += 1
                if (s.get("episodes") or 0) >= 12:
                    nulled.append(s)

    print("remap: %d diubah, %d kehilangan akid (calon search)" % (changed, len(nulled)), flush=True)

    # search-remap untuk judul arus utama yang kehilangan akid
    done_n = 0
    if not args.no_search:
        for s in nulled[:args.search_limit]:
            aid, api_title, eps = TT.map_to_watchable(s["title"])
            if not aid:
                print("  search GAGAL: %s (%s)" % (s["title"][:50], api_title), flush=True)
                time.sleep(1.5)
                continue
            play = [e for e in eps if e.get("e") and (
                e["e"].get("sub") or e["e"].get("dub") or len(e["e"].keys()) > 0)]
            try:
                watch_n = max(int(e["n"]) for e in play if str(e.get("n")).isdigit())
            except ValueError:
                watch_n = len(play)
            json.dump({"id": aid, "updated": TODAY, "episodes": eps},
                      open("data/eps/%d.json" % aid, "w"), ensure_ascii=False)
            s["akid"], s["episodes"] = aid, watch_n
            if not any(o.get("id") == aid for o in ak):
                ak.append({"show": s["title"], "id": aid, "slug": "",
                           "apiTitle": api_title, "episodes": watch_n,
                           "match": True, "auto": True, "via_search": True,
                           "bulk": TODAY})
            print("  search OK: %s -> aid %d (%d playable)" % (
                s["title"][:50], aid, watch_n), flush=True)
            done_n += 1
            time.sleep(1.5)

    anime["updated"] = TODAY
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)

    # tulis ulang data-anime.js dari anime.json (satu kebenaran)
    spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.sync_anime_js(anime, ak)
    print("search-remap OK: %d | data-anime.js synced" % done_n, flush=True)


if __name__ == "__main__":
    main()
