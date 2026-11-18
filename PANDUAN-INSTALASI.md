# Panduan Instalasi MyVerse v1.1.0

> Sudah memakai MyVerse v1.0.x? Ikuti **PANDUAN-UPDATE-v1.1.md**, bukan panduan ini.

MyVerse terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Berkas | Dipasang di |
|---|---|---|
| **Backend** (otak & database) | `Kode.gs`, `appsscript.json` | Google Apps Script, di akun Google Anda |
| **Frontend** (tampilan situs + dashboard admin) | Isi ZIP `MyVerse-frontend.zip` (folder `myverse/`) | GitHub Pages |

Urutan wajib: **backend dulu**, karena frontend butuh alamat (URL) backend.

Perkiraan waktu: 30–45 menit untuk pemasangan pertama.

---

## Tahap A — Backend di Google Apps Script

### A1. Buat proyek Apps Script
1. Buka **https://script.google.com** dengan akun Google yang akan menyimpan data portofolio.
2. Klik **Proyek baru**. Ganti nama proyek (kiri atas) menjadi `MyVerse Backend`.
3. Hapus semua isi berkas `Kode.gs` bawaan, lalu **tempel seluruh isi `Kode.gs`** dari paket ini.
4. Klik ikon **Simpan** (atau Ctrl+S).

### A2. Aktifkan Drive API (agar PDF tidak bisa diunduh pengunjung)
Pilih **salah satu** cara:

- **Cara mudah:** di panel kiri, klik **+** di samping **Layanan** → pilih **Drive API** → **Tambahkan**.
- **Cara manifest:** ⚙️ **Setelan Proyek** → centang **"Tampilkan file manifes appsscript.json di editor"** → buka `appsscript.json` di editor → ganti isinya dengan `appsscript.json` dari paket ini → Simpan. Cara ini sekaligus mengatur zona waktu ke Asia/Jakarta.

> Tanpa langkah ini aplikasi tetap jalan, tetapi tombol unduh/cetak pada pratinjau PDF (CV, sertifikat) dan karya ilmiah "lihat saja" belum dimatikan.

### A3. Jalankan `setupAwal()` — sekali
1. Di bilah atas editor, pilih fungsi **`setupAwal`** dari menu tarik-turun, lalu klik **▶ Jalankan**.
2. Google meminta izin: klik **Tinjau izin** → pilih akun Anda → **Lanjutan** → **Buka MyVerse Backend (tidak aman)** → **Izinkan**.
   Peringatan "tidak aman" muncul karena skrip ini buatan Anda sendiri, bukan aplikasi terverifikasi Google. Itu normal.
3. Buka **Log eksekusi** (muncul di bawah). Anda akan melihat:

```
🚀 Menyiapkan MyVerse v1.1.0...
📁 Folder MyVerse_Files dibuat.
🗃️ Spreadsheet MyVerse_DB dibuat.
📝 Data contoh diisi: Profil, Kontak, Pengaturan, Kategori, ...

🔐 SANDI ADMIN AWAL — catat sekarang, hanya tampil sekali:
   Ab3dEf...........
   Segera ganti di Dashboard → Pengaturan → Ganti Kata Sandi setelah login pertama.
⏱️ Trigger terpasang: keepWarm, saatSheetDiubah
✅ Setup selesai.
```

4. **Catat sandi admin awal** di tempat aman. Sandi ini tidak disimpan di mana pun dalam bentuk terbaca.

Hasil di Google Drive Anda:
- Folder **MyVerse_Files** berisi `01_Profil` sampai `07_Karya_Ilmiah`.
- Spreadsheet **MyVerse_DB** berisi 16 tab data (termasuk `Mitra`) dan 1 tab catatan `AppConfig`. Semuanya sudah terisi data contoh, sehingga situs langsung tampil.

> `setupAwal()` aman dijalankan ulang. Fungsi ini tidak menimpa data, tidak mengganti sandi, dan tidak membuat folder dobel. Jalankan lagi bila suatu saat ada tab yang terhapus.

### A4. Deploy sebagai Web App
1. Klik **Deploy** (kanan atas) → **Deployment baru**.
2. Klik ikon ⚙️ di samping "Pilih jenis" → pilih **Aplikasi web**.
3. Isi:
   - Deskripsi: `MyVerse v1.1.0`
   - **Jalankan sebagai: Saya**
   - **Yang memiliki akses: Siapa saja**
4. Klik **Deploy** → **salin URL Aplikasi web** (berakhiran `/exec`).
5. Uji di browser: buka `URL_ANDA?action=public.bootstrap`. Bila muncul teks JSON yang diawali `{"ok":true,...`, backend sudah siap.

---

## Tahap B — Frontend di GitHub Pages

### B1. Siapkan folder
1. Ekstrak `MyVerse-frontend.zip`. Hasilnya folder **`myverse`**.
2. Buka folder itu. Di baris paling atas harus terlihat `index.html`, lalu folder `css`, `js`, `assets`.

```
myverse/              ← INI folder yang nanti di-"git init"
├── index.html        ← landing page
├── proyek.html       ← detail proyek
├── blog.html         ← daftar artikel
├── artikel.html      ← isi artikel
├── admin.html        ← dashboard admin (tidak ditautkan dari menu publik)
├── robots.txt        ← melarang mesin pencari
├── README.md
├── PANDUAN-INSTALASI.md
├── assets/favicon.svg
├── css/style.css, css/admin.css
└── js/config.js, icons.js, core.js, site.js, home.js, pages.js, admin.js
```

> Berkas backend (`Kode.gs`) sengaja **tidak** ada di dalam ZIP, sehingga repository publik Anda bersih.

### B2. Isi alamat backend
Buka `js/config.js` dengan Notepad atau VS Code. Ganti teks `GANTI_DENGAN_ID_DEPLOYMENT` sehingga seluruh baris berisi URL `/exec` dari langkah A4:

```js
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfy.....panjang...../exec'
};
```

Simpan. URL ini **bukan rahasia** dan memang boleh ada di frontend. Keamanan dijaga oleh sandi admin dan token sesi di server.

### B3. Unggah ke GitHub (lewat terminal, bukan "Upload files")
Unggah lewat terminal, bukan lewat menu "Upload files" di web GitHub. Menu itu meratakan semua berkas ke satu folder, sehingga CSS dan JS gagal dimuat (error 404).

1. **Pasang Git** bila belum ada: https://git-scm.com/download/win (Windows, setelan bawaan). Cek dengan `git --version`.
2. **Identitas Git** (sekali seumur komputer):
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```
3. **Buat repository** di github.com: tombol **+** → **New repository** → nama misalnya `myverse` → pilih **Public** → **jangan** centang README / .gitignore / license → **Create repository**.
4. **Buka terminal di folder `myverse`.** Di Windows: buka folder `myverse` di File Explorer, klik address bar, ketik `powershell`, lalu Enter.
   Cek dulu dengan `dir`. **`index.html` harus terlihat.** Kalau yang terlihat justru folder `myverse`, masuk dulu dengan `cd myverse`.
5. Jalankan **satu per satu**:
   ```bash
   git init
   git add .
   git commit -m "Upload pertama MyVerse"
   git branch -M main
   git remote add origin https://github.com/USERNAME/myverse.git
   git push -u origin main
   ```
   Saat diminta **Password**, tempel **Personal Access Token**, bukan sandi GitHub. Layar memang terlihat kosong saat Anda menempel; itu normal, langsung tekan Enter.
   Cara membuat token: https://github.com/settings/tokens → **Generate new token (classic)** → centang **repo** → **Generate** → salin token `ghp_…` (hanya tampil sekali).
6. **Aktifkan Pages:** di repository → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main** / **(root)** → **Save**. Centang **Enforce HTTPS**.
7. Tunggu 1–2 menit. Situs tampil di `https://USERNAME.github.io/NAMA-REPO/`.
   **Huruf besar/kecil harus sama persis dengan nama repository.** Repository `MyVerse` beralamat `/MyVerse/`; alamat `/myverse/` akan menampilkan 404 "There isn't a GitHub Pages site here". Cara paling aman: salin alamat dari **Settings → Pages** ("Your site is live at …").

**Memperbarui situs nanti:** dari folder `myverse` yang sama, jalankan `git add .`, lalu `git commit -m "keterangan"`, lalu `git push`. Bila browser masih menampilkan versi lama, tekan **Ctrl+Shift+R**.

---

## Tahap C — Login pertama & mengisi isi

1. Buka `https://USERNAME.github.io/myverse/admin.html` lalu masuk dengan sandi admin awal.
2. **Segera ganti sandi:** **Pengaturan → Ganti Kata Sandi**. Minimal 10 karakter dengan huruf dan angka. Sesi di perangkat lain otomatis berakhir.
3. **Pengaturan → Email penerima notifikasi:** isi email untuk menerima pesan dari formulir kontak. Bila dikosongkan, email akun Google pemilik yang dipakai.
4. Ganti data contoh dengan data Anda:
   - **Profil**: nama, profesi, foto, CV, peran bergantian di hero, bahasa, judul About, foto latar hero. Apit kata dengan `*bintang*` agar berwarna biru.
   - **Kontak & Sosial**: email publik, telepon, media sosial.
   - **Pengalaman, Pendidikan, Keterampilan, Prestasi, Proyek, Layanan, Proses, Testimoni, Mitra & Logo, Blog & Karya Ilmiah**: ubah atau hapus data contoh lewat tombol ✏️ dan 🗑️.
   - **Karya ilmiah**: Blog & Karya Ilmiah → **Unggah Karya Ilmiah** → seret PDF/DOC/DOCX (maks. 10 MB) → isi penulis & abstrak → Terbitkan. Saklar "Izinkan pengunjung mengunduh berkas" menentukan apakah tombol Download tampil.
5. Klik **Lihat Situs** untuk memeriksa hasilnya. Perubahan tampil pada muatan halaman berikutnya.

Tips mengisi:
- Urutan baris di tabel = urutan tampil di situs. Atur dengan tombol ▲▼.
- Saklar **Tampil** menyembunyikan data tanpa menghapusnya.
- Foto dikompres otomatis di browser sampai sekitar 1 MB (PNG transparan tetap transparan). PDF CV/sertifikat maksimal 5 MB; dokumen karya ilmiah maksimal 10 MB.
- Mengedit langsung di spreadsheet juga boleh. Trigger `saatSheetDiubah` membuat situs langsung memakai data terbaru.

---

## Keamanan & penyimpanan rahasia

Semua rahasia disimpan di **Script Properties**, bukan di kode, spreadsheet, atau frontend. Script Properties hanya bisa dibaca server dan editor proyek Apps Script.

| Nilai | Diisi oleh | Keterangan |
|---|---|---|
| `SESSION_SECRET` | Otomatis oleh `setupAwal()` | Kunci tanda tangan token sesi admin |
| `ADMIN_PASS_HASH`, `ADMIN_SALT` | Otomatis, lalu diganti lewat dashboard | Sandi disimpan sebagai hash bergaram, tidak bisa dibaca ulang |
| `SPREADSHEET_ID`, `ROOT_FOLDER_ID`, `FOLDER_*` | Otomatis | ID database & folder (tercatat juga di tab `AppConfig`) |
| `CONTENT_VERSION`, `REV_admin`, `RVT_LIST`, `ADMIN_KUNCI_SAMPAI` | Otomatis | Versi cache, pencabutan sesi, penguncian login |

Lokasi untuk melihat atau mengubah secara manual: Apps Script → ⚙️ **Setelan Proyek** → **Properti skrip**.

Perlindungan yang aktif:
- Login dikunci **15 menit** setelah **5 kali** sandi salah. Sesi admin berlaku **8 jam**.
- Token dikirim di badan permintaan (bukan di URL), dan semua aksi admin wajib token yang valid.
- Isi artikel dibersihkan dari skrip berbahaya di server dan di browser.
- Formulir kontak memakai isian jebakan bot dan batas **3 pesan per perangkat per jam**.
- Semua halaman memuat `noindex`, dan `robots.txt` melarang mesin pencari. Ini permintaan yang dipatuhi mesin pencari besar, **bukan kunci**: siapa pun yang punya tautan tetap bisa membuka situs.

Fungsi darurat di editor Apps Script:
- **Lupa sandi:** jalankan `aturSandiAdmin()`. Sandi baru tampil sekali di log, dan semua sesi lama berakhir.
- **Curiga token bocor:** jalankan `rotasiSecretSesi()`. Semua sesi admin berakhir.

Penting:
- **Jangan menambah editor** proyek Apps Script sembarangan, karena editor bisa melihat Script Properties.
- **Jangan membagikan** spreadsheet `MyVerse_DB`, karena tab `Pesan` berisi data pengunjung.

---

## Performa

| Skenario (diukur di simulator) | Panggilan ke Apps Script |
|---|---|
| Kunjungan pertama landing page | 1 |
| Kunjungan ulang (tampil instan dari cache perangkat, diperbarui diam-diam) | 1 |
| Login + Ringkasan + memuat menu inti sekaligus | 3 |
| Pindah ke menu Proyek / Pesan Masuk setelah itu | 0 |

Cara kerjanya:
- **Cache berlapis:** data publik disimpan di cache server (CacheService, berversi) dan di perangkat pengunjung (localStorage). Setiap perubahan dari dashboard menaikkan versi, sehingga cache lama otomatis tidak dipakai.
- **Pemanas 3 lapis:** (1) browser "mengetuk" server saat halaman login dibuka; (2) trigger `keepWarm` tiap 1 menit menjaga cache tetap terisi dan mengirim antrean email cadangan; (3) setiap panggilan data ikut memanaskan cache. Pemanas ini menjamin **cache** terisi, tetapi tidak menjamin mesin Google selalu langsung merespons. Respons pertama setelah lama tidak dipakai tetap bisa 1–3 detik.
- **Email tidak membuat pengunjung menunggu:** pesan kontak disimpan dulu, lalu emailnya dikirim beberapa detik kemudian lewat antrean.
- **Kuota trigger:** `keepWarm` memakai sekitar 10–20 menit per hari dari jatah sekitar 90 menit per hari (akun Gmail biasa). Untuk menghemat, jalankan `matikanKeepWarm()`; untuk mengaktifkan lagi, `nyalakanKeepWarm()`.
- Cek kesehatan sistem: Dashboard → **Pengaturan → Status Sistem**, atau jalankan `cekPerforma()` di editor.

---

## Cadangan & impor data

Lokasi: Dashboard → **Pengaturan → Cadangan & Impor Data**.

- **Buat Cadangan Sekarang** menyalin spreadsheet ke folder `MyVerse_Files/00_Cadangan`. Lakukan ini sebelum perubahan besar.
- **Impor** membaca spreadsheet MyVerse lain (versi lama, cadangan, atau salinan yang Anda isi sendiri) **tanpa mengubah sumbernya**:
  1. Tempel URL/ID sumber, atau klik **Pakai sebagai sumber impor** pada daftar cadangan.
  2. Pilih data yang diimpor. Pesan & Suka tidak dicentang secara bawaan.
  3. Klik **Pindai (Dry-run)** untuk melihat berapa yang akan ditambah, diperbarui, atau dilewati. Belum ada yang ditulis.
  4. Klik **Jalankan Impor**.
- Impor **aman diulang** dan tidak membuat data dobel. Proyek & artikel dicocokkan berdasarkan slug, kategori berdasarkan nama, data lain berdasarkan ID.
- Data yang sudah Anda isi **tidak ditimpa**, kecuali opsi **Timpa data yang sudah ada** dinyalakan.
- **Memulihkan data yang terhapus:** impor dari cadangan. Hanya baris yang hilang yang ditambahkan kembali.
- **Pindah ke versi MyVerse baru (kelak):** pasang versi baru di proyek Apps Script baru dengan **akun Google yang sama**, impor dari spreadsheet lama, cek hasilnya, lalu impor sekali lagi tepat sebelum pindah (delta) untuk menangkap data yang masuk selama transisi.

Batasan:
- Gambar dan berkas Drive hanya tampil bila sumbernya milik akun Google yang sama.
- Sesi login tidak ikut pindah; cukup login ulang.
- Untuk data sangat besar (puluhan ribu baris), impor per kelompok data, karena batas waktu Apps Script adalah 6 menit per jalan.

---

## Memperbarui kode backend

1. Tempel `Kode.gs` versi baru lalu **Simpan**.
2. **Deploy → Kelola deployment** → klik ✏️ **Edit** pada deployment yang ada → Versi: **Versi baru** → **Deploy**.
   **Jangan** membuat "Deployment baru", karena URL `/exec` akan berubah dan `config.js` harus diisi ulang.
3. Bila ada perubahan frontend, naikkan angka `?v=1.1.0` di berkas HTML lalu `git push`.

---

## Kendala umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Situs menampilkan "Configuration incomplete" | `js/config.js` belum diisi | Isi URL `/exec`, lalu `git push` |
| "Tidak bisa terhubung ke server" | URL salah atau Web App belum di-deploy untuk "Siapa saja" | Cek langkah A4; buka `URL?action=public.bootstrap` di browser |
| "Respons server tidak valid" | Akses deploy bukan "Siapa saja", atau perlu login Google | Edit deployment → Yang memiliki akses: **Siapa saja** |
| 404 "There isn't a GitHub Pages site here" | Huruf besar/kecil di alamat beda dengan nama repository, atau Pages belum diaktifkan | Salin alamat persis dari Settings → Pages (mis. `/MyVerse/`, bukan `/myverse/`) |
| Halaman 404 "File not found" di GitHub Pages | `git init` dijalankan di folder yang salah | Repository harus berisi `index.html` di root. Push ulang dari folder `myverse` |
| Tampilan tanpa warna/layout | Berkas diunggah lewat "Upload files" | Unggah ulang lewat terminal agar folder `css/` & `js/` utuh |
| Perubahan di Sheets tidak tampil | Trigger edit belum terpasang | Pengaturan → **Bersihkan cache situs**, atau jalankan `setupAwal()` lagi |
| Gambar tidak tampil | Izin berbagi berkas diblokir kebijakan akun Workspace | Set berkas di `MyVerse_Files` menjadi "Siapa saja yang memiliki link — Pelihat" |
| Email notifikasi tidak masuk | Kuota harian habis, atau email penerima salah | Cek Pengaturan → Status Sistem (antrean & kuota). Cek folder Spam |
| "Login dikunci sementara" | 5 kali sandi salah | Tunggu 15 menit, atau jalankan `aturSandiAdmin()` |
| "Sesi berakhir" | Token kedaluwarsa (8 jam) atau sandi diganti | Masuk lagi |

---

## Daftar fungsi editor Apps Script

| Fungsi | Kegunaan |
|---|---|
| `setupAwal()` | Menyiapkan atau memperbaiki Sheets, Drive, rahasia, dan trigger (aman diulang) |
| `aturSandiAdmin()` | Membuat sandi admin baru (tampil sekali di log) |
| `rotasiSecretSesi()` | Mengakhiri semua sesi admin |
| `bersihkanCache()` | Memaksa situs memuat ulang data dari Sheets |
| `cekPerforma()` | Ringkasan status cache, trigger, antrean, dan kuota |
| `matikanKeepWarm()` / `nyalakanKeepWarm()` | Menghentikan atau mengaktifkan trigger pemanas |

---

## Ringkasan hasil uji sebelum diserahkan

- **47/47 uji backend** di simulator Apps Script: migrasi v1.0 → v1.1 tanpa mengubah data; unggah & izin unduh karya ilmiah; setup aman diulang; penguncian login; token kedaluwarsa & dicabut; validasi & sanitasi; injeksi rumus Sheets dicegah; unggah berkas & proteksi PDF; suka 1 per perangkat; email tidak dikirim saat lock dipegang; cache >100 KB dipecah; impor dry-run/idempoten/pemetaan kategori; rahasia tidak pernah muncul di Sheets, log, maupun respons.
- **79/79 uji browser** (Chrome) dengan frontend di port berbeda dari backend: semua halaman publik & menu admin, unggah gambar & karya ilmiah, animasi & interaksi, mode gelap, tampilan HP 390 px tanpa geser horizontal, **tanpa permintaan preflight CORS** (penyebab umum gagal di Apps Script), dan tanpa error JavaScript.
