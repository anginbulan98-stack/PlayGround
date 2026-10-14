#!/usr/bin/env python3
"""Ikon PWA Guoke AMHDQ (PNG 180/192/512) — murni stdlib (zlib+struct).

Desain: latar biru #2f7bff + lingkaran putih + huruf "G" dari blok piksel.
Jalankan: python3 tools/make_icons.py  →  icons/icon-{180,192,512}.png
"""
import os, struct, zlib

BLUE = (47, 123, 255)   # aksen tema, dipertahankan
WHITE = (255, 255, 255)
DARK = (6, 9, 15)

# Huruf "G" 7x9 sebagai bitmap (1 = putih)
G = [
    "0111110",
    "1100011",
    "1100000",
    "1100000",
    "1100111",
    "1100011",
    "1100011",
    "0111110",
    "0000000",
];

def png(w, h, px):
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"".join(struct.pack("BBB", *p) for p in row) for row in px)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

def draw(size):
    px = [[BLUE for _ in range(size)] for _ in range(size)]
    # lingkaran putih lembut di tengah
    cx = cy = size / 2
    r = size * 0.36
    for y in range(size):
        for x in range(size):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                px[y][x] = WHITE
    # huruf G di dalam lingkaran
    gw, gh = 7, 9
    s = max(1, int(size * 0.028))          # skala piksel huruf
    ox = int(cx - gw * s / 2)
    oy = int(cy - gh * s / 2)
    for j, row in enumerate(G):
        for i, ch in enumerate(row):
            if ch == "1":
                for dy in range(s):
                    for dx in range(s):
                        px[oy + j * s + dy][ox + i * s + dx] = BLUE
    return px

def main():
    os.makedirs("icons", exist_ok=True)
    for size in (180, 192, 512):
        with open("icons/icon-%d.png" % size, "wb") as f:
            f.write(png(size, size, draw(size)))
        print("icons/icon-%d.png ok" % size)

if __name__ == "__main__":
    main()
