#!/usr/bin/env python3
"""Audit kesehatan gambar chapter manhwa/manhua Guoke AMHDQ (SEMUA judul).

Tahap A (lokal, cepat, 100%): cakupan daftar gambar per chapter.
Tahap B (HTTP, bertahap): probe gambar pertama tiap chapter sampel
    (default: 2 chapter terbaru per judul) dengan 20 worker + jeda,
    tanpa Referer (meniru referrerpolicy="no-referrer" di reader).

Contoh bertahap:
  python3 tools/audit_chapters.py --per-title 2                 # semua judul
  python3 tools/audit_chapters.py --per-title 2 --offset 2000   # lanjut dari judul ke-2000
  python3 tools/audit_chapters.py --only-slug the-investor-who-sees-the-future

Hasil digabung ke laporan-chapter.json (mendukung resume).
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import glob
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'}


def load_titles():
    with open(os.path.join(ROOT, 'data', 'manhwa.json')) as f:
        d = json.load(f)
    return d['titles'] if 'titles' in d else d


def load_pages(slug):
    p = os.path.join(ROOT, 'data', 'mw', slug + '.json')
    if not os.path.exists(p):
        return None
    try:
        with open(p) as f:
            return json.load(f).get('pages', {})
    except Exception:
        return {}


def load_chapters(slug):
    p = os.path.join(ROOT, 'data', 'mwch', slug + '.json')
    if not os.path.exists(p):
        return []
    try:
        with open(p) as f:
            return json.load(f).get('chapters', [])
    except Exception:
        return []


def probe(url, timeout=12):
    """Kembalikan (status, penyebab). Tanpa Referer seperti reader."""
    try:
        req = urllib.request.Request(url, method='HEAD', headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code = r.status
    except Exception as e:
        msg = str(e)
        if '403' in msg:
            return 403, 'ditolak-403'
        if '404' in msg:
            return 404, 'tidak-ada-404'
        if '429' in msg:
            return 429, 'dibatasi-429'
        if 'timed out' in msg or 'Timeout' in msg:
            return 0, 'timeout'
        if 'NameResolution' in msg or 'nodename' in msg or 'DNS' in msg:
            return 0, 'dns'
        return 0, 'jaringan'
    if code == 200:
        return 200, 'sehat'
    if code == 403:
        return 403, 'ditolak-403'
    if code == 404:
        return 404, 'tidak-ada-404'
    if code == 429:
        return 429, 'dibatasi-429'
    return code, 'http-%s' % code


def check_referrer_block(url):
    """Uji apakah host memblokir hotlink ber-Referer (bandingkan)."""
    try:
        req = urllib.request.Request(url, method='HEAD',
                                     headers=dict(UA, Referer='https://guoke-amhdq.example.com/'))
        with urllib.request.urlopen(req, timeout=12) as r:
            with_ref = r.status
    except Exception:
        with_ref = -1
    st, _ = probe(url)
    if st == 200 and with_ref != 200:
        return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--per-title', type=int, default=2)
    ap.add_argument('--offset', type=int, default=0)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--workers', type=int, default=20)
    ap.add_argument('--only-slug', default='')
    ap.add_argument('--skip-http', action='store_true')
    ap.add_argument('--out', default='laporan-chapter.json')
    a = ap.parse_args()

    titles = load_titles()
    if a.only_slug:
        titles = [t for t in titles if t.get('slug') == a.only_slug]
    if a.limit:
        titles = titles[a.offset:a.offset + a.limit]
    else:
        titles = titles[a.offset:]

    rep_path = os.path.join(ROOT, a.out)
    rep = {'titles': {}, 'http_done': []}
    if os.path.exists(rep_path):
        try:
            with open(rep_path) as f:
                rep = json.load(f)
        except Exception:
            pass
    rep.setdefault('titles', {})
    rep.setdefault('http_done', [])

    rep['ringkasan'] = None
    # normalisasi: 'kosong' jadi daftar unik (mendukung resume multi-tahap)
    for e in rep['titles'].values():
        if isinstance(e.get('kosong'), int):
            e['kosong'] = []
    # ---- Tahap A: cakupan lokal 100% ----
    for t in titles:
        slug = t.get('slug', '')
        chs = load_chapters(slug)
        pages = load_pages(slug)
        key = t.get('id', slug)
        e = rep['titles'].get(key, {})
        e.update({
            'judul': t.get('title', slug),
            'total_chapter': len(chs),
            'punya_daftar': 0 if pages is None else sum(1 for c in chs if (pages.get(c.get('u', '')) or [])),
        })
        rep['titles'][key] = e
    print('Tahap A selesai: %d judul dipetakan' % len(titles), flush=True)

    # ---- Tahap B: probe HTTP bertahap ----
    jobs = []
    for t in titles:
        slug = t.get('slug', '')
        key = t.get('id', slug)
        if key in rep['http_done']:
            continue
        chs = load_chapters(slug)
        pages = load_pages(slug) or {}
        # sampel: chs[-k:] (daftar situs tersusun terbaru-dulu, jadi ini
        # chapter terlama; untuk cakupan penuh pakai --per-title 9999)
        for c in chs[-a.per_title:] if a.per_title > 0 else []:
            if (key + '::' + str(c.get('t', ''))) in rep['http_done']:
                continue
            urls = pages.get(c.get('u', '')) or []
            if urls:
                jobs.append((key, t.get('title', slug), c.get('t', ''), urls[0], len(urls)))
            else:
                e = rep['titles'][key]
                kc = e.get('kosong', [])
                if c.get('t', '') not in kc:
                    kc.append(c.get('t', ''))
                    e['kosong'] = kc
                rep['http_done'].append(key + '::' + str(c.get('t', '')))

    def run_one(job):
        key, judul, ch, url, n = job
        st, cause = probe(url)
        time.sleep(0.15)
        return key, judul, ch, url, st, cause

    if not a.skip_http and jobs:
        print('Tahap B: probe %d gambar (%d worker)...' % (len(jobs), a.workers), flush=True)
        with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
            for i, res in enumerate(ex.map(run_one, jobs)):
                key, judul, ch, url, st, cause = res
                e = rep['titles'][key]
                e.setdefault('probe', []).append({'ch': ch, 'status': st, 'sebab': cause})
                if cause != 'sehat':
                    e.setdefault('gagal', []).append({'ch': ch, 'url': url, 'status': st, 'sebab': cause})
                rep['http_done'].append(key + '::' + ch)
                if (i + 1) % 200 == 0:
                    print('  ...%d/%d' % (i + 1, len(jobs)), flush=True)
                    with open(rep_path, 'w') as f:
                        json.dump(rep, f)
    elif a.skip_http:
        print('Tahap B dilewati (--skip-http)', flush=True)

    # ---- ringkasan ----
    tot_ch = sum(e.get('total_chapter', 0) for e in rep['titles'].values())
    tot_list = sum(e.get('punya_daftar', 0) for e in rep['titles'].values())
    tot_kosong = sum(len(e.get('kosong', []) or []) for e in rep['titles'].values())
    tot_probe = sum(len(e.get('probe', [])) for e in rep['titles'].values())
    tot_ok = sum(1 for e in rep['titles'].values() for p in e.get('probe', []) if p['sebab'] == 'sehat')
    causes = {}
    for e in rep['titles'].values():
        for p in e.get('probe', []):
            if p['sebab'] != 'sehat':
                causes[p['sebab']] = causes.get(p['sebab'], 0) + 1
    rep['ringkasan'] = {
        'waktu': dt.datetime.now().isoformat(timespec='seconds'),
        'total_judul': len(rep['titles']),
        'total_chapter': tot_ch,
        'chapter_berdaftar': tot_list,
        'chapter_tanpa_daftar': tot_ch - tot_list,
        'sampel_tanpa_daftar': tot_kosong,
        'gambar_diprobe': tot_probe,
        'gambar_sehat': tot_ok,
        'gambar_gagal': tot_probe - tot_ok,
        'per_penyebab': causes,
    }
    with open(rep_path, 'w') as f:
        json.dump(rep, f)
    print(json.dumps(rep['ringkasan'], indent=1, ensure_ascii=False))


if __name__ == '__main__':
    sys.exit(main())
