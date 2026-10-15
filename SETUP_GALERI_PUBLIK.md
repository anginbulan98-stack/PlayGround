# Galeri Publik: upload & like terlihat semua pengguna

Tanpa setup ini, upload foto dan like **hanya tersimpan di HP masing-masing**
(IndexedDB + localStorage). Agar foto upload tampil di semua HP dan hitungan
love terlihat semua orang, sambungkan Firebase gratis (±10 menit, sekali saja).

## Langkah 1 — buat project Firebase (gratis)

1. Buka <https://console.firebase.google.com> → **Add project** → nama mis.
   `guoke-ikon` → matikan Google Analytics → **Create project**.
2. Di project tersebut: **Build → Realtime Database → Create Database** →
   pilih region bebas → mulai dengan **locked mode**.
3. Tab **Rules**, ganti isinya dengan ini lalu **Publish**:
   ```json
   {
     "rules": {
       "ikon": { ".read": true, ".write": true },
       "ikon_likes": { ".read": true, ".write": true },
       "ep_likes": { ".read": true, ".write": true },
       "ep_comments": { ".read": true, ".write": true }
     }
   }
   ```
   Catatan jujur: tulis-terbuka = siapa pun bisa menambah (sesuai konsep
   galeri publik). Bila spam, ketatkan ke mode terkunci dan tambah manual.
4. **Build → Storage → Get started** → mode production → **Rules** → ganti:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /ikon/{file} {
         allow read: if true;
         allow write: if request.resource.size < 3 * 1024 * 1024
                      && request.resource.contentType.matches('image/.*');
       }
     }
   }
   ```
5. Agar tombol Download foto komunitas langsung masuk folder Download
   (bukan buka tab), aktifkan CORS sekali via `gsutil`:
   ```bash
   echo '[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
   gsutil cors set cors.json gs://NAMA-PROJECT.appspot.com
   ```

## Langkah 2 — tempel config ke web

1. Di Firebase console: **Project Overview (⚙) → Project settings** →
   **Your apps → Web (`</>`)** → daftarkan app → salin `firebaseConfig`.
2. Buka `index.html`, cari `window.GQ_FIREBASE = null;`, ganti menjadi:
   ```html
   <script>
   window.GQ_FIREBASE = {
     apiKey: "…",
     authDomain: "….firebaseapp.com",
     databaseURL: "https://….firebaseio.com",
     projectId: "…",
     storageBucket: "….appspot.com",
     appId: "…"
   };
   </script>
   ```
3. Deploy ulang. Selesai — tombol Upload otomatis berbagi ke semua HP,
   tombol love menghitung global dan live di semua layar.

## Tanpa Firebase tetap jalan

* Upload → tersimpan di HP sendiri, pratinjau + hapus + download normal.
* Like → menghitung lokal di HP sendiri.
* Tidak ada error, tidak ada yang rusak — hanya tidak sinkron antar-HP.
