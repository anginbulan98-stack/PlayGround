# Cara pasang "Upload TikTok Quality" di website Guoke

Target: tab ke-4 **persis di pinggir Manhwa** → `Semua / Anime / Manhwa / Upload TikTok Quality`
Repo Guoke: `anginbulan98-stack/guoke2.0`

## Langkah 1 — tambah 1 file

Upload file `tiktok-quality.js` (satu folder dengan isi ini) ke:

```
guoke2.0 / public / tiktok-quality.js
```

## Langkah 2 — tambah 1 baris

Buka `guoke2.0 / components / GuokeApp.tsx`, cari baris:

```tsx
<Script src="/guoke.js?v=20261013d" strategy="afterInteractive" />
```

Tambahkan TEPAT di bawahnya:

```tsx
<Script src="/tiktok-quality.js?v=20261014a" strategy="afterInteractive" />
```

## Selesai — tidak ada langkah 3

- `public/guoke.js` (bundle 1,8 MB) **tidak diubah sama sekali**.
- Setelah deploy, buka Guoke → Beranda / Jelajahi → tab ke-4 muncul sendiri.
- Klik tab → halaman tool terbuka (cek video, kalkulator 2K/120FPS, panduan, FAQ),
  tampil pakai gaya bawaan Guoke (hitam-putih-biru, ikut light/dark mode).
- Tab Pustaka (`Riwayat/Daftarku/Unduhan`) tidak ikut ditempeli tab baru.
- Klik nav bawah (Beranda/Jadwal/…) otomatis menutup halaman tool.

## Verifikasi cepat

- `node --check public/tiktok-quality.js` → `SYNTAX OK`
- Tab tersisip sebagai anak ke-4 setelah Manhwa (teruji).
