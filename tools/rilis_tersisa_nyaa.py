#!/usr/bin/env python3
"""Rilis serial anime yang TERSISA sampai langsung bisa ditonton.

Alur per judul (tanpa menyimpan magnet/hash torrent):
  1. Cari slug di website anikoto (https://anikototv.to/search?keyword=...)
     -> /watch/{slug}/ep-1 (hasil pertama / paling mirip).
  2. Buka halaman watch, ekstrak numeric API ID (angka 4-6 digit paling
     sering muncul di HTML yang valid via /series/{id}).
  3. Fetch detail API anikoto -> tulis data/eps/{id}.json (embed SUB/DUB).
  4. Cross-check nyaa.si RSS (hanya hitung rss_hits/seed_max, tanpa magnet).
  5. Update data/anime.json + data/anikoto.json + data/nyaa_availability.json.
Di akhir: sync data-anime.js via refresh_all.sync_anime_js.

Hanya memproses kind=series yang belum punya akid (film dilewati).
Idempoten + resume via data/rilis_tersisa_state.json.
"""
import json, os, re, sys, time, html as ihtml
import urllib.request, urllib.parse, urllib.error
from collections import Counter

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuokeRilis/1.0"}
TODAY = time.strftime("%Y-%m-%d")
STATE_FP = "data/rilis_tersisa_state.json"

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

def api_detail(aid):
    try:
        return get_json("https://anikotoapi.site/series/%d" % aid)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except Exception:
        raise

def search_slugs(title):
    """Kembalikan list slug watch-page untuk judul (terbaik dulu)."""
    q = urllib.parse.quote(title)
    try:
        html = get_text("https://anikototv.to/search?keyword=%s" % q)
    except Exception as e:
        return [], "search_fail:%s" % str(e)[:50]
    slugs = re.findall(r'/watch/([a-z0-9\-]+)/ep-1', html)
    # unik, pertahankan urutan
    seen, out = set(), []
    for s in slugs:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out, "ok:%d" % len(out)

def slug_base(slug):
    # 'horimiya-qv8ul' -> 'horimiya'
    return re.sub(r'-[a-z0-9]{4,6}$', '', slug)

SEASON_WORDS = {"season": "season", "cour": "cour", "part": "part", "arc": "arc"}

def wanted_markers(title):
    """Ekstrak penanda wajib dari judul katalog: season N, cour N, part N, arc."""
    t = title.lower()
    out = {}
    m = re.search(r'season\s*(\d+)', t)
    if m:
        out["season"] = m.group(1)
    m = re.search(r'(\d+)(?:st|nd|rd|th)\s*season', t)
    if m:
        out.setdefault("season", m.group(1))
    m = re.search(r'cour\s*(\d+)', t)
    if m:
        out["cour"] = m.group(1)
    m = re.search(r'part\s*(\d+)', t)
    if m:
        out["part"] = m.group(1)
    # angka romawi / kata: 'final season' dianggap season final
    if "final season" in t:
        out["final"] = True
    return out

def rank_slugs(slugs, title):
    nt = norm(title)
    base_title = re.sub(r'\s*\(?\d{4}\)?\s*$', '', title)
    nbt = norm(base_title)
    markers = wanted_markers(title)
    scored = []
    for s in slugs:
        sb = slug_base(s).lower()
        nsb = norm(sb)
        if nsb == nt or nsb == nbt:
            base = 0
        elif nsb and (nsb in nt or nt in nsb or nsb in nbt or nbt in nsb):
            base = 1
        else:
            base = 3
        # bonus/penalti penanda: slug harus memuat angka season/cour/part yang sama
        pen = 0
        for k, v in markers.items():
            if k == "final":
                if "final" not in sb:
                    pen += 2
            elif v not in sb and ("season" if k == "season" else k) not in sb:
                # mis. katalog Season 2 tapi slug tanpa '2'/'season-2'/'-2-'
                if not re.search(r'(?<![0-9])%s(?![0-9])' % re.escape(v), sb):
                    pen += 2
        scored.append((base + pen, s))
    scored.sort()
    return [s for _, s in scored]

AID_PATTERNS = [
    r'data-anime-id="(\d+)"',
    r'data-id="(\d+)"',
    r'/anime/getinfo/(\d+)',
    r'mangaId\s*=\s*(\d+)',
    r'name="show_id"\s+value="(\d+)"',
]

def extract_aid(slug):
    """Buka watch page, temukan numeric ID via pola spesifik (bukan angka umum)."""
    try:
        html = get_text("https://anikototv.to/watch/%s/ep-1" % slug)
    except Exception as e:
        return None, "watch_fail:%s" % str(e)[:50]
    cands = []
    for pat in AID_PATTERNS:
        cands += [int(n) for n in re.findall(pat, html)]
    cands = [c for c in cands if 10 <= c <= 999999 and not (1900 <= c <= 2035)]
    if not cands:
        return None, "no_candidate"
    freq = Counter(cands)
    tried = []
    for aid, _ in freq.most_common(6):
        tried.append(aid)
        try:
            d = api_detail(aid)
        except Exception:
            time.sleep(2)
            continue
        if d is None:
            continue
        anime = (d.get("data") or {}).get("anime") or {}
        if anime.get("title"):
            return aid, "ok"
        time.sleep(0.4)
    return None, "no_valid:%s" % tried[:4]

def titles_match(katalog_title, api_title):
    """Validasi ketat: basis judul harus saling mengandung + penanda season/cour/part cocok."""
    nt = norm(katalog_title)
    na = norm(api_title)
    if not na:
        return False
    base_k = norm(re.sub(r'\s*\(?\d{4}\)?\s*$', '', katalog_title))
    base_a = norm(re.sub(r'\s*\(?\d{4}\)?\s*$', '', api_title))
    if not (na == nt or na in nt or nt in na or base_a == base_k
            or base_a in base_k or base_k in base_a):
        return False
    mk, ma = wanted_markers(katalog_title), wanted_markers(api_title)
    for k in ("season", "cour", "part"):
        if k in mk and k in ma and mk[k] != ma[k]:
            return False
        if k in mk and k not in ma:
            # katalog minta Season 2 tapi API tanpa penanda season:
            # terima HANYA bila API adalah entri gabungan yang jelas?
            # tolak agar tak salah map part -> full season.
            return False
    if mk.get("final") and not ma.get("final") and "final" not in api_title.lower():
        return False
    return True

def nyaa_check(title):
    try:
        q = urllib.parse.quote(title)
        req = urllib.request.Request(
            "https://nyaa.si/?page=rss&c=1_2&f=0&q=%s" % q, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode("utf-8", "replace")
        items = re.findall(r"<item>(.*?)</item>", raw, re.S)
        seeds = [int(x) for x in re.findall(r"<nyaa:seeders>(\d+)</nyaa:seeders>", raw)]
        return len(items), (max(seeds) if seeds else 0)
    except Exception:
        return 0, 0

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=1.0)
    ap.add_argument("--nyaa-throttle", type=float, default=0.8)
    args = ap.parse_args()

    anime = json.load(open("data/anime.json"))
    ak = json.load(open("data/anikoto.json"))
    try:
        nyaa_info = json.load(open("data/nyaa_availability.json"))
    except Exception:
        nyaa_info = {}
    have_ids = {o["id"] for o in ak if o.get("id")}

    raw = open("data-anime.js", encoding="utf-8").read()
    payload = json.loads(re.search(r"window\.GQ_ANIME\s*=\s*(\{.*\})", raw, re.S).group(1))
    meta = {s["id"]: s for s in payload["shows"]}

    # kandidat: series tanpa akid, kecuali status segera / tahun depan
    cands = []
    for s in anime["shows"]:
        if s.get("akid"):
            continue
        m = meta.get(s["id"], {})
        kind = m.get("kind", "series")
        if kind != "series":
            continue
        if (m.get("status") == "segera"):
            continue
        try:
            if int(m.get("year") or 0) > int(TODAY[:4]):
                continue
        except Exception:
            pass
        cands.append(s)
    print("kandidat series tersisa: %d (offset %d, limit %d)" % (len(cands), args.offset, args.limit), flush=True)
    batch = cands[args.offset:args.offset + args.limit]

    # resume: lewati yang sudah dicoba gagal permanen
    done = {}
    if os.path.exists(STATE_FP):
        try:
            done = json.load(open(STATE_FP)).get("tried", {})
        except Exception:
            done = {}

    ok_n = 0
    for i, s in enumerate(batch, 1):
        title = s["title"]
        if done.get(s["id"], {}).get("status") in ("mapped", "no_result"):
            print("[%d/%d] SKIP %s (%s)" % (i, len(batch), title, done[s["id"]]["status"]), flush=True)
            continue
        print("[%d/%d] %s ..." % (i, len(batch), title), flush=True)
        slugs, info = search_slugs(title)
        if not slugs:
            done[s["id"]] = {"status": "no_result", "why": info, "at": TODAY}
            print("   search kosong (%s)" % info, flush=True)
            time.sleep(args.sleep)
            continue
        ranked = rank_slugs(slugs, title)
        aid = None
        for slug in ranked[:3]:
            aid, why = extract_aid(slug)
            if aid:
                print("   slug %s -> aid %d" % (slug, aid), flush=True)
                break
            time.sleep(0.6)
        if not aid:
            done[s["id"]] = {"status": "no_result", "why": "aid_not_found:" + "|".join(ranked[:3]), "at": TODAY}
            print("   aid tak ketemu", flush=True)
            time.sleep(args.sleep)
            continue
        if aid in have_ids:
            # ID sudah dipakai judul lain -> map ulang (varian judul sama konten)
            pass
        try:
            d = api_detail(aid)
        except Exception as e:
            done[s["id"]] = {"status": "retry", "why": str(e)[:60], "at": TODAY}
            print("   api gagal %s" % str(e)[:60], flush=True)
            time.sleep(3)
            continue
        if not d:
            done[s["id"]] = {"status": "retry", "why": "404", "at": TODAY}
            time.sleep(args.sleep)
            continue
        adata = (d.get("data") or {})
        ainfo = adata.get("anime") or {}
        eps_raw = adata.get("episodes") or []
        api_title = ihtml.unescape(str(ainfo.get("title") or "")).strip()
        # validasi KETAT: tolak bila judul/penanda tak cocok (coba slug berikutnya)
        if not titles_match(title, api_title):
            print("   TOLAK mismatch: katalog=%r api=%r (coba slug lain)" % (title, api_title), flush=True)
            tried_slugs = True
            aid = None
            for slug2 in ranked[1:4]:
                a2, _ = extract_aid(slug2)
                if not a2 or a2 == aid:
                    time.sleep(0.6)
                    continue
                try:
                    d2 = api_detail(a2)
                except Exception:
                    time.sleep(0.6)
                    continue
                if not d2:
                    time.sleep(0.6)
                    continue
                t2 = ihtml.unescape(str(((d2.get("data") or {}).get("anime") or {}).get("title") or "")).strip()
                if titles_match(title, t2):
                    aid, d, api_title = a2, d2, t2
                    adata = (d.get("data") or {})
                    eps_raw = adata.get("episodes") or []
                    print("   slug %s -> aid %d (%r) COCOK" % (slug2, a2, t2), flush=True)
                    break
                else:
                    print("   TOLAK juga: %r" % t2, flush=True)
                time.sleep(0.6)
            else:
                done[s["id"]] = {"status": "no_result", "why": "title_mismatch:%s" % api_title, "at": TODAY}
                print("   tak ada slug yang cocok", flush=True)
                time.sleep(args.sleep)
                continue
        eps = [{"n": e.get("number"), "t": e.get("title") or ("Episode %s" % e.get("number")),
                "e": e.get("embed_url") or {}} for e in eps_raw]
        try:
            eps.sort(key=lambda e: (int(e["n"]) if str(e["n"]).isdigit() else 99999))
        except Exception:
            pass
        playable = [e for e in eps if e.get("e") and (
            e["e"].get("sub") or e["e"].get("dub") or len(e["e"].keys()) > 0)]
        if not eps or not playable:
            done[s["id"]] = {"status": "no_result", "why": "no_playable_eps:%s" % api_title, "at": TODAY}
            print("   tanpa episode playable", flush=True)
            time.sleep(args.sleep)
            continue
        try:
            watch_n = max(int(e["n"]) for e in playable if str(e.get("n")).isdigit())
        except ValueError:
            watch_n = len(playable)
        # nyaa cross-check (hitung saja)
        c, sd = nyaa_check(title)
        nyaa_info[title] = {"rss_hits": c, "seed_max": sd, "checked": TODAY, "akid": aid}
        print("   nyaa [%d rilis / seed %d]" % (c, sd), flush=True)
        time.sleep(args.nyaa_throttle)
        json.dump({"id": aid, "updated": TODAY, "episodes": eps},
                  open("data/eps/%d.json" % aid, "w"), ensure_ascii=False)
        s["akid"] = aid
        if (s.get("episodes") or 0) < watch_n:
            s["episodes"] = watch_n
        # catat ke anikoto.json bila ID baru
        if aid not in have_ids:
            ak.append({"show": title, "id": aid, "slug": "", "apiTitle": api_title,
                       "episodes": watch_n, "match": True, "auto": True,
                       "via_search": True, "bulk": TODAY, "nyaa_hits": c, "nyaa_seed": sd})
            have_ids.add(aid)
        else:
            for o in ak:
                if o.get("id") == aid:
                    o["episodes"] = max(o.get("episodes", 0), watch_n)
                    break
        done[s["id"]] = {"status": "mapped", "aid": aid, "apiTitle": api_title, "at": TODAY}
        ok_n += 1
        if ok_n % 10 == 0:
            anime["updated"] = TODAY
            json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
            json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
            json.dump(nyaa_info, open("data/nyaa_availability.json", "w"), ensure_ascii=False, indent=1)
            json.dump({"updated": TODAY, "tried": done}, open(STATE_FP, "w"), ensure_ascii=False)
            print("   checkpoint mapped=%d" % ok_n, flush=True)
        time.sleep(args.sleep)

    anime["updated"] = TODAY
    json.dump(anime, open("data/anime.json", "w"), ensure_ascii=False)
    json.dump(ak, open("data/anikoto.json", "w"), ensure_ascii=False, indent=1)
    json.dump(nyaa_info, open("data/nyaa_availability.json", "w"), ensure_ascii=False, indent=1)
    json.dump({"updated": TODAY, "tried": done}, open(STATE_FP, "w"), ensure_ascii=False)
    print("BATCH SELESAI: mapped=%d" % ok_n, flush=True)
    # sync data-anime.js (pertahankan kolom manual)
    import importlib.util
    spec = importlib.util.spec_from_file_location("refresh_all", "tools/refresh_all.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.sync_anime_js(anime, ak)
    print("data-anime.js synced", flush=True)

if __name__ == "__main__":
    main()
