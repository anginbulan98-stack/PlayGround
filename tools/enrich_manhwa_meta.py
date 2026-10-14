#!/usr/bin/env python3
"""Enrich data/manhwa.json dengan genre + status dari halaman detail Komiku.

Pola yang diparsing (stabil di komiku.org):
  Genre : <ul class="genre"> ... <span>Action</span> ...
  Status: <tr><td>Status:</td><td>Ongoing</td></tr>
Hanya menambah field "genres" (list) dan "status" ("Ongoing"/"Tamat").
Idempoten: judul yang sudah punya genres+status dilewati.
"""
import json, re, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HDPlus/1.0"}

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")

def parse_meta(html):
    genres = []
    m = re.search(r'<ul class="genre">(.*?)</ul>', html, re.S)
    if m:
        genres = [g.strip() for g in re.findall(r"<span>([^<]+)</span>", m.group(1))]
        genres = [g for g in dict.fromkeys(genres) if g]
    s = re.search(r"<td>Status:</td>\s*<td>([^<]+)</td>", html)
    status = s.group(1).strip() if s else ""
    if status.lower().startswith("ongo"):
        status = "Ongoing"
    elif "tamat" in status.lower() or "completed" in status.lower() or "end" in status.lower():
        status = "Tamat"
    return genres, status

def main():
    d = json.load(open("data/manhwa.json"))
    todo = [t for t in d["titles"] if not t.get("genres") or not t.get("status")]
    print("perlu enrich:", len(todo), "/", len(d["titles"]))
    ok = 0
    def work(t):
        try:
            html = get("https://komiku.org/manga/%s/" % t["slug"])
        except Exception as e:
            return (t["slug"], None, None, str(e)[:50])
        if "Daftar_Chapter" not in html:
            return (t["slug"], None, None, "nodata")
        g, s = parse_meta(html)
        time.sleep(0.2)
        return (t["slug"], g, s, "")
    with ThreadPoolExecutor(max_workers=8) as ex:
        for slug, g, s, err in ex.map(work, todo):
            t = next(x for x in d["titles"] if x["slug"] == slug)
            if g is None:
                print("MISS", slug, err)
                continue
            t["genres"] = g or ["Manhwa"]
            t["status"] = s or "Ongoing"
            ok += 1
    json.dump(d, open("data/manhwa.json", "w"), ensure_ascii=False)
    from collections import Counter
    c = Counter()
    for t in d["titles"]:
        for g in t.get("genres", []):
            c[g] += 1
    print("OK:", ok, "| status:", Counter(t.get("status") for t in d["titles"]))
    print("top genre:", c.most_common(12))

if __name__ == "__main__":
    main()
