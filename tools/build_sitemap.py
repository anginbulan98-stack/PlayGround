#!/usr/bin/env python3
"""Bangun sitemap.xml: 1 URL unik per judul + halaman utama.

URL memakai hash (mis. index.html#/baca/slug/3) karena hosting statis
tanpa URL-rewrite server — lihat komentar routing di app.js.

Chapter TIDAK dimasukkan satu per satu: 3.679 judul x ratusan chapter akan
melewati batas 50.000 URL/sitemap dan membuat file puluhan MB. Daftar chapter
diambil lazy dari data/mwch/{slug}.json saat judul dibuka.
Jalankan:  BASE_URL=https://domain-asli/ python3 tools/build_sitemap.py
Ganti BASE_URL dengan domain deploy sebelum rilis.
"""
import json, os, html
from datetime import date

BASE = os.environ.get("BASE_URL", "https://guoke-amhdq.example.com/").rstrip("/") + "/"

def url(loc):
    return "  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (
        html.escape(loc, quote=True), date.today().isoformat())

def main():
    d = json.load(open("data/manhwa.json"))
    urls = [url(BASE),
            url(BASE + "index.html#/baca"),
            url(BASE + "index.html#kalkulator")]
    for t in d["titles"]:
        urls.append(url(BASE + "index.html#/baca/" + t["slug"]))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(urls) + "\n</urlset>\n")
    open("sitemap.xml", "w").write(xml)
    print("sitemap.xml:", len(urls), "URL (%d judul)" % len(d["titles"]))

if __name__ == "__main__":
    main()
