# AyoOlahraga

Aplikasi tracking lari/sepeda + panduan latihan & diet. Gratis, tanpa langganan,
tanpa server — semua data kesimpan di HP masing-masing (localStorage).

## Jalan di HP (satu WiFi, tanpa akun/hosting apa pun)

GPS dan install-app di HP **wajib HTTPS**, jadi server lokal sudah diset HTTPS.

1. Di Mac ini jalankan:
   ```
   npm run hp
   ```
   (build + serve produksi di `https://192.168.1.157:4173`)
2. HP sambung ke **WiFi yang sama**, buka Chrome/Safari:
   ```
   https://192.168.1.157:4173
   ```
3. HP akan protes "sertifikat tidak aman" → pilih **Advanced / Lanjutkan**
   (sertifikat dibuat lokal otomatis, aman karena servernya Mac sendiri).
4. Izinkan **Location**, lalu pasang sebagai app:
   - Android Chrome: ⋮ → Add to Home screen
   - iPhone Safari: Share → Add to Home Screen

Catatan: kalau IP WiFi Mac berubah, cek dengan `ipconfig getifaddr en0`
lalu buka `https://IP-BARU:4173` di HP.

## Script lain

- `npm run dev` — mode dev (HTTPS, bisa diakses HP juga)
- `npm run dev:http` — mode dev HTTP biasa (GPS di HP mati, cuma buat coding)
- `npm run build` — build produksi ke `dist/`
- `npm run preview` — serve hasil build (HTTPS)

## Akun

- Admin bawaan: `admin` / `admin123` — ganti password setelah masuk.
- User biasa daftar sendiri di layar Masuk. Beda akses: admin punya tab
  Admin (kelola user + lihat semua aktivitas) dan bisa tambah/edit/hapus
  panduan di tab Panduan.
