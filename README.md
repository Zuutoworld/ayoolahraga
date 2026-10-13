# AyoOlahraga

Aplikasi tracking lari/sepeda + panduan latihan & diet. Gratis, tanpa langganan,
tanpa server — semua data kesimpan di HP masing-masing (localStorage).

## Deploy ke Vercel (gratis, URL publik, bisa dibuka dari mana saja)

Repo git lokal sudah siap (`main`, 1 commit). Pilih salah satu:

**A. Satu perintah (butuh token):**
1. Buka vercel.com → login → Settings/Account → Tokens → Create (beri nama
   `ayo`, scope Full Account, tanpa expiry khusus).
2. Jalankan di folder ini:
   ```
   npx vercel --token=TOKEN_KAMU --yes --prod
   ```
3. Dapat URL `https://ayo-....vercel.app` → buka di HP Android → ⋮ →
   Install app / Add to Home screen.

**B. Via dashboard (tanpa CLI):**
1. Push repo ini ke GitHub (buat repo kosong, lalu
   `git remote add origin URL_GITHUB && git push -u origin main`).
2. vercel.com → Add New → Project → Import repo → Framework: Vite →
   Deploy. Tiap `git push` otomatis deploy ulang.

## Jalan di HP via WiFi lokal (tanpa deploy, buat dev)

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
