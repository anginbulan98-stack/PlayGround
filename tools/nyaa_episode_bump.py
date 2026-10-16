#!/usr/bin/env python3
"""Nyaa.si -> Episode bump (jalan tiap 15 menit via GitHub Actions).

Tujuan (permintaan user): kalau ada episode baru rilis di nyaa.si,
harus rilis juga di situs + muncul di Episode Terbaru (jangan stuck itu-itu saja).

Cara kerja (tanpa menyimpan magnet/hash torrent):
  1. Ambil RSS nyaa.si anime eng (https://nyaa.si/?page=rss&c=1_2&f=0) -> 75 rilis terbaru.
  2. Parse tiap judul file: "[Subber] Judul - 12 [1080p]" -> {title, ep}.
     Ambil EP terbesar per judul.
  3. Cocokkan norm(title) ke data/anime.json. Bila EP nyaa > episodes katalog:
     verifikasi via anikoto API /series/{akid} (harus ada embed playable SUB/DUB).
     Kalau terverifikasi -> update data/eps/{akid}.json (updated=ISO datetime),
     naikkan episodes di anime.json + anikoto.json, catat di nyaa_availability.json.
  4. Rebuild data/eps_recent.json (pakai ISO datetime agar urutan Episode Terbaru
     benar-benar yang terbaru di atas) + sync data-anime.js.

Idempoten: tanpa episode baru terverifikasi = tanpa perubahan file (kecuali
eps_recent yang memang direbuild).
"""
import json
import os
import re
import sys
import time
import html as ihtml
import urllib.request
import urllib.parse
import urllib.error
import datetime

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeNyaaBump/1.0"}
TODAY = time.strftime("%Y-%m-%d")
NOW_ISO = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_text(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def get_json(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def norm(t):
    return re.sub(r"[^a-z0-9]+", "", str(t or "").lower())


def parse_item(raw):
    """'[Subber] One Piece - 1143 [1080p]' -> ('One Piece', 1143)."""
    t = re.sub(r"^\s*(?:\[[^\]]+\]\s*)+", "", str(raw or "")).strip()
    ep = 0
    m = (re.search(r"[\s\-_](?:E|EP|Episode)[\s.\-]*(\d{1,4})(?:\s*v\d)?\b", t, re.I)
         or re.search(r"\s+S\d{1,2}\s*E(\d{1,3})\b", t, re.I)
         or re.search(r"\s+-\s+(\d{1,4})(?:\s*v\d)?(?:\s*\[|\s*\(|\s*$)", t)
         or re.search(r"\s+(\d{1,4})(?:\s*v\d)?(?:\s*\[|\s*\(|\s*$)", t))
    if m:
        cand = int(m.group(1))
        if 1900 <= cand <= 2100:
            ep = 0
        elif cand in (480, 540, 720, 1080, 2160):
            ep = 0
        elif 1 <= cand <= 3000:
            ep = cand
    title = t
    title = re.sub(r"\s*\[.*?\]\s*", " ", title)
    title = re.sub(r"\s*\(.*?\)\s*$", "", title)
    title = re.sub(r"\s+-\s+\d{1,4}(?:\s*v\d)?\b.*$", "", title, flags=re.I)
    title = re.sub(r"\s+S\d{1,2}\s*E\d{1,3}\b.*$", "", title, flags=re.I)
    title = re.sub(r"\s+E\d{1,4}\b.*$", "", title, flags=re.I)
    title = re.sub(r"\s+Episode\s+\d+.*$", "", title, flags=re.I)
    title = re.sub(r"1080p|720p|2160p|4k|hevc|x265|x264|bluray|web-dl|\bmulti\b.*",
                   " ", title, flags=re.I)
    title = re.sub(r"\s{2,}", " ", title).strip(" -_.")
    title = re.sub(r"\s+S\d{1,2}\s*-\s*\d{1,3}\s*$", "", title).strip()
    if not title:
        return None
    return ihtml.unescape(title).strip(), ep


def fetch_nyaa():
    try:
        raw = get_text("https://nyaa.si/?page=rss&c=1_2&f=0")
    except Exception as e:
        print("nyaa RSS gagal: %s" % str(e)[:100], flush=True)
        return []
    items = re.findall(r"<item>[\s\S]*?<title>([\s\S]*?)</title>", raw)
    return [ihtml.unescape(x).strip() for x in items if x.strip()]


def playable_count(aid):
    """Verifikasi via anikoto API. Kembalikan (playable_max, eps_list) atau (0, [])."""
    for att in range(3):
        try:
            d = get_json("https://anikotoapi.site/series/%d" % aid)
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 0, []
            time.sleep(2 + att * 2)
        except Exception:
            time.sleep(2 + att * 2)
    else:
        return 0, []
    try:
        eps_raw = (d.get("data") or {}).get("episodes") or []
    except Exception:
        return 0, []
    eps = [{"n": e.get("number"),
            "t": e.get("title") or ("Episode %s" % e.get("number")),
            "e": e.get("embed_url") or {}} for e in eps_raw]
    nums = []
    for e in eps:
        eu = e.get("e") or {}
        if eu.get("sub") or eu.get("dub") or len(eu.keys()) > 0:
            try:
                nums.append(int(e["n"]))
            except (TypeError, ValueError):
                pass
    return (max(nums) if nums else 0), eps


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-verify", type=int, default=15,
                    help="maks judul diverifikasi ke anikoto per run (hemat kuota)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    anime = json.load(open("data/anime.json"))
    ak = json.load(open("data/anikoto.json"))
    try:
        nyaa_info = json.load(open("data/nyaa_availability.json"))
    except Exception:
        nyaa_info = {}

    # peta norm judul -> show + akid
    by_norm = {}
    for s in anime["shows"]:
        by_norm.setdefault(norm(s["title"]), s)
    ak_ep = {o["show"]: o.get("episodes", 0) for o in ak}

    rss = fetch_nyaa()
    print("nyaa RSS: %d item" % len(rss), flush=True)
    per_title = {}
    for rt in rss:
        r = parse_item(rt)
        if not r:
            continue
        title, ep = r
        if not ep:
            continue
        k = norm(title)
        if not k:
            continue
        if k not in per_title or ep > per_title[k][1]:
            per_title[k] = (title, ep)

    cands = []
    for k, (title, ep) in per_title.items():
        s = by_norm.get(k)
        if not s:
            # cocok substring longgar (varian penamaan file)
            for kk, ss in by_norm.items():
                if kk and len(k) >= 5 and (kk in k or k in kk):
                    s = ss
                    break
        if not s:
            continue
        cur = int(s.get("episodes") or 0)
        if ep > cur:
            cands.append((s, ep, title))
    # verifikasi yang selisihnya paling besar dulu
    cands.sort(key=lambda x: (x[1] - int(x[0].get("episodes") or 0)), reverse=True)
    cands = cands[: max(1, args.max_verify)]
    print("kandidat bump: %d" % len(cands), flush=True)

    bumped = 0
    for s, nyaa_ep, nyaa_title in cands:
        aid = s.get("akid")
        if not aid:
            # cari akid via anikoto.json judul sama
            for o in ak:
                if norm(o.get("show")) == norm(s["title"]) and o.get("id"):
                    aid = o["id"]
                    break
        if not aid:
            print("  SKIP (tanpa akid): %s nyaa EP%d" % (s["title"], nyaa_ep), flush=True)
            continue
        best, eps = playable_count(aid)
        cur = int(s.get("episodes") or 0)
        print("  cek %s: katalog EP%d / nyaa EP%d / playable EP%d"
              % (s["title"], cur, nyaa_ep, best), flush=True)
        time.sleep(1.2)
        if best > cur:
            bumped += 1
            if args.dry_run:
                continue
            eps_sorted = sorted(eps, key=lambda e: (int(e["n"]) if str(e.get("n")).isdigit() else 99999))
            os.makedirs("data/eps", exist_ok=True)
            json.dump({"id": aid, "updated": NOW_ISO, "episodes": eps_sorted},
                      open("data/eps/%d.json" % aid, "w"), ensure_ascii=False)
            s["episodes"] = best
            for o in ak:
                if o.get("id") == aid:
                    o["episodes"] = best
                    break
            nyaa_info[s["title"]] = {"rss_hits": 1, "seed_max": 0,
                                     "checked": TODAY, "akid": aid,
                                     "bump_ep": best, "via": "nyaa_bump_15m"}
    if bumped and not args.dry_run:
        anime["updated"] = TODAY
        json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
        json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
        json.dump(nyaa_info, open("data/nyaa_availability.json", "w"),
                  ensure_ascii=False, indent=1)
    print("BUMPED: %d judul" % bumped, flush=True)

    # rebuild eps_recent pakai ISO datetime (baru = paling atas)
    import glob as _g
    out = {}
    for fp in _g.glob("data/eps/*.json"):
        try:
            d = json.load(open(fp, encoding="utf-8"))
            if d.get("id") is None:
                continue
            out[str(d["id"])] = {"u": d.get("updated", TODAY),
                                  "n": len(d.get("episodes", []))}
        except Exception:
            pass
    if not args.dry_run:
        json.dump(out, open("data/eps_recent.json", "w"), ensure_ascii=False)
        print("eps-recent: %d entri" % len(out), flush=True)
        import importlib.util
        spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.sync_anime_js(anime, ak)
        print("data-anime.js synced", flush=True)


if __name__ == "__main__":
    main()
