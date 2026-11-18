# Panduan Update MyVerse v1.0.1 → v1.1.0

Update ini mengubah **tampilan dan fitur** situs. **Data Anda tidak diubah.**

| Yang berubah | Yang TIDAK berubah |
|---|---|
| Tampilan baru "Midnight Blue" (navy + biru, mengikuti referensi) | Semua data di Google Sheets: profil, 6 proyek, pengalaman, pendidikan, keterampilan, prestasi, testimoni, pesan, suka |
| Fitur **Karya Ilmiah**: unggah PDF/Word penelitian di menu Blog | Semua foto & berkas di Google Drive |
| Menu baru **Mitra & Logo** (baris "Trusted by" di hero) | URL `/exec` dan isi `js/config.js` Anda |
| Animasi & interaksi baru | Sandi admin & sesi login |

---

## Apa yang baru

**Tampilan (mengikuti gambar referensi)**
- **Hero**: latar pemandangan (bisa diganti foto sendiri), sapaan "Hello, I'm", nama besar, tombol *View My Work* dan *Contact Me*, foto profil menyatu dengan latar, serta baris logo "Trusted by" atau angka statistik.
- **Urutan bagian**: Hero → About → Services → Projects → Experience → Skills → Honors → Articles & Research → Process → Testimonials → *Let's Work Together* → Contact. Navigasi punya tombol biru **Hire Me**.
- **About**: judul besar, poin sorotan (tahun pengalaman, jumlah proyek, status, prestasi, karya ilmiah), serta kartu info (foto, lokasi, email dengan tombol salin, telepon dengan tombol WhatsApp, bahasa).
- **Services** 4 kartu bernomor. **Projects** dengan gambar, kategori, dan baris teknologi berwarna biru.
- **Footer** ringkas berisi ikon media sosial dan tombol *Back to top*.

**Interaksi & animasi**
- **Kartu proyek**:
  - Miring 3D mengikuti kursor, dengan kilau cahaya.
  - Gambar membesar saat disorot. Tangkapan layar yang tinggi digulir pelan dari atas ke bawah.
  - Muncul tombol *View Project*.
  - Saat filter atau pencarian diganti, kartu keluar lalu masuk satu per satu.
- **Hero**:
  - Peran yang berganti seperti diketik.
  - Cahaya yang mengikuti kursor dan foto yang bergerak halus.
  - Bintang berkelip di latar, dan latar bergerak lebih lambat saat digulir.
  - Logo mitra bergulir otomatis bila ada 5 logo atau lebih.
- **Elemen lain**:
  - Bilah progres gulir di atas halaman dan tombol kembali ke atas.
  - Garis timeline pengalaman terisi saat digulir; garis Career Journey dan My Process tergambar saat terlihat.
  - Sorotan cahaya di kartu mengikuti kursor, dan tombol utama bersifat "magnetik".
- **Aksesibilitas**: pengunjung yang mengaktifkan "kurangi gerakan" di perangkatnya otomatis mendapat versi tanpa animasi.

**Karya ilmiah (menu Blog & Karya Ilmiah)**
- Tombol **Unggah Karya Ilmiah** menerima **PDF, DOC, atau DOCX** hingga **10 MB**. Berkas disimpan di folder Drive `07_Karya_Ilmiah`.
- Isian yang tersedia: penulis (pisahkan dengan titik koma `;`), abstrak, jurnal atau konferensi, DOI atau tautan, tag, dan sampul (opsional).
- Saklar **Izinkan pengunjung mengunduh berkas**:
  - **Mati** (bawaan): pengunjung hanya bisa membaca.
  - **Nyala**: tombol *Download* tampil.
- Halaman publik karya ilmiah menampilkan penulis, tanggal, jurnal, DOI, abstrak, dan **pratinjau dokumen langsung di halaman** dengan tombol layar penuh. Ada juga tombol **Cite** yang menyalin sitasi gaya APA.
- Halaman Blog punya tab **All / Articles / Research**. Beranda menampilkan 3 tulisan terbaru di bagian **Articles & Research**.

**Isian baru di admin**

| Lokasi | Isian | Kegunaan |
|---|---|---|
| Profil | Foto latar hero | Ganti ilustrasi pegunungan dengan foto lanskap sendiri |
| Profil | Peran bergantian di hero | Isi 2 peran atau lebih dipisah koma, misalnya `Web Developer, English Educator, E-Learning Designer` |
| Profil | Bahasa yang dikuasai | Tampil di kartu info About |
| Profil | Judul besar bagian About | Misalnya `Building *Digital* Experiences` (kata berbintang berwarna biru) |
| Pengaturan | Judul baris logo mitra, judul & kalimat ajakan, foto latar ajakan | Bagian "Trusted by" dan "Let's Work Together" |
| Mitra & Logo | Nama, logo, tautan | Logo instansi atau klien di hero |

---

## Urutan update: backend dulu, baru frontend

### A. Backend (Apps Script) — sekitar 5 menit

1. Buka proyek Apps Script MyVerse Anda.
2. **Cadangkan kode lama**: salin seluruh isi `Kode.gs` ke Notepad (untuk jaga-jaga).
3. Hapus isi `Kode.gs`, tempel **`Kode.gs` v1.1.0** dari paket ini, lalu **Simpan**.
4. Pilih fungsi **`setupAwal`** → **▶ Jalankan**. Log yang benar kira-kira berbunyi:
   ```
   🚀 Menyiapkan MyVerse v1.1.0...
   ➕ Kolom baru di tab Artikel: jenis, berkas_id, berkas_nama, ... boleh_unduh
   🔒 Data Anda tidak diubah (data contoh hanya diisi saat pemasangan pertama).
   🔐 Sandi admin sudah ada — tidak diubah. ...
   ✅ Setup selesai.
   ```
   Hasilnya:
   - Kolom baru ditambahkan **di ujung kanan** tab Artikel, sehingga kolom lama tidak bergeser.
   - Tab **Mitra** dan folder **07_Karya_Ilmiah** dibuat.
   - Sandi admin dan data Anda **tidak diubah**.
   - Bila langkah ini terlewat, semua itu tetap dibuat otomatis saat pertama kali dibutuhkan.
5. **Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.**
   **Jangan** pilih "Deployment baru", karena URL `/exec` akan berubah.
6. Cek: buka `URL_EXEC_ANDA?action=public.bootstrap`. Bila teksnya memuat `"v":"1.1.0"`, backend sudah aktif.

### B. Frontend (GitHub Pages) — sekitar 5 menit

ZIP **`MyVerse-update-1.1.0.zip`** berisi semua berkas tampilan yang berubah, **tanpa `js/config.js`**, sehingga URL `/exec` Anda aman.

1. Buka PowerShell di folder MyVerse lokal Anda (folder yang berisi `index.html`).
2. Ambil perubahan terakhir dari GitHub:
   ```
   git pull
   ```
3. Ekstrak ZIP, salin **seluruh isinya** ke folder itu, lalu pilih **Replace / Ganti** bila ditanya.
4. Kirim ke GitHub:
   ```
   git add .
   git commit -m "Update MyVerse v1.1.0 - tampilan baru & karya ilmiah"
   git push
   ```
5. Tunggu 1–2 menit, buka `https://restuputram2710.github.io/MyVerse/`, lalu tekan **Ctrl+Shift+R**.

> Folder lokal sudah hilang? Jalankan `git clone https://github.com/restuputram2710/MyVerse.git`, masuk ke folder `MyVerse`, lalu lanjut dari langkah 3.

**Kompatibilitas** (kalau salah satu belum di-update):

| Backend | Frontend | Hasil |
|---|---|---|
| v1.1 | v1.1 | ✅ Semua fitur |
| v1.1 | v1.0.1 | ✅ Situs lama tetap jalan normal |
| v1.0.1 | v1.1 | ⚠️ Tampilan baru tampil, tetapi unggah karya ilmiah & Mitra gagal — update backend dulu |

---

## Setelah update — 4 langkah agar persis seperti referensi

1. **Pengaturan → Tema bawaan pengunjung baru → Gelap → Simpan.** Referensi bernuansa gelap; saat ini situs Anda mengikuti tema perangkat pengunjung.
2. **Profil → Peran bergantian di hero**: isi misalnya `Web Developer, English Educator, E-Learning Designer`.
3. **Profil → Foto profil (hero)**: agar foto menyatu dengan pemandangan seperti contoh, unggah **PNG tanpa latar belakang** (hapus latar lewat situs penghapus latar gratis, lalu simpan sebagai PNG). Foto biasa tetap bisa dipakai; tepinya otomatis dibuat memudar.
4. **Mitra & Logo**: tambahkan logo sekolah atau instansi tempat Anda mengajar atau bekerja. Tanpa mitra, hero menampilkan angka statistik.

**Mengunggah karya ilmiah pertama**: Admin → **Blog & Karya Ilmiah** → **Unggah Karya Ilmiah**. Lalu:
1. Seret berkas PDF/Word ke kotak unggah.
2. Isi penulis dan abstrak.
3. Pilih apakah pengunjung boleh mengunduh.
4. Klik **Terbitkan**.

---

## Kendala umum

| Gejala | Solusi |
|---|---|
| Tampilan masih lama | Tekan **Ctrl+Shift+R**, atau buka jendela Incognito. GitHub Pages menyimpan versi lama hingga sekitar 10 menit |
| "Folder tujuan tidak dikenal" saat unggah dokumen | Backend belum v1.1 — ulangi Tahap A langkah 3–5 |
| `git push` ditolak ("rejected … fetch first") | Jalankan `git pull` dulu, lalu ulangi `git push` |
| Pratinjau dokumen kosong atau "tidak bisa dibuka" | Pastikan izin berbagi berkas di folder `07_Karya_Ilmiah` adalah "Siapa saja yang memiliki link". Akun Workspace sekolah kadang memblokir ini |
| Tombol Download tetap ada walau saklar mati | Aktifkan layanan **Drive API** di Apps Script (+ di samping Layanan → Drive API), lalu simpan ulang karya ilmiah itu |
| Berkas Word > 10 MB | Simpan ulang dengan gambar beresolusi lebih kecil, atau ekspor ke PDF lalu kompres |
| Ingin kembali ke v1.0.1 | Tempel kode lama yang Anda cadangkan → Deploy versi baru. Data v1.1 (kolom baru, tab Mitra) tetap tersimpan dan tidak mengganggu |

---

## Ringkasan hasil uji

- **Uji backend (simulator Apps Script): 47/47 lulus**, termasuk uji migrasi nyata:
  - Memasang v1.0, menghapus artikel contoh, lalu mengganti kode ke v1.1.
  - Situs tetap jalan bahkan sebelum `setupAwal()` dijalankan.
  - Kolom lama tidak bergeser dan data proyek identik byte per byte.
  - Artikel contoh **tidak** muncul lagi.
  - Unggah PDF/DOC/DOCX diperiksa jenis aslinya (bukan hanya nama berkas) dan batas 10 MB.
  - Saklar unduh benar-benar mengubah izin berkas di Drive.
  - Menghapus mitra ikut membuang logonya.
- **Uji browser (Chrome): 79/79 lulus**:
  - Seluruh alur unggah karya ilmiah sampai tampil di blog & halaman detail.
  - Tombol Cite, layar penuh, Mitra di hero, peran bergantian, kartu miring 3D, dan tombol ke atas.
  - Tampilan HP 390 px tanpa geser horizontal.
  - Tanpa error JavaScript dan tanpa permintaan CORS preflight.
