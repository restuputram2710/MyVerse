# MyVerse — Portofolio Pribadi

Situs portofolio satu halaman (landing page) + blog + dashboard admin.

- **Frontend:** HTML/CSS/JS murni (tanpa framework), di-host di GitHub Pages.
- **Backend:** Google Apps Script sebagai REST API JSON, dengan Google Sheets sebagai database dan Google Drive sebagai penyimpanan berkas.

Kode backend **tidak** disimpan di repository ini. Ia hidup di proyek Apps Script milik pemilik situs.

## Halaman

| Berkas | Isi |
|---|---|
| `index.html` | Landing page dengan 12 bagian: Home, About, Experience & Education, Skills, Achievements, Projects, Services, Process, Testimonials, Contact, Footer |
| `proyek.html?slug=…` | Detail proyek |
| `blog.html` | Daftar artikel (cari, filter tag, halaman) |
| `artikel.html?slug=…` | Isi artikel |
| `admin.html` | Dashboard pemilik (login sandi). Sengaja tidak ditautkan dari menu publik |

## Struktur

```
index.html  proyek.html  blog.html  artikel.html  admin.html  robots.txt
assets/favicon.svg
css/style.css      ← token desain "Aether Violet" (terang & gelap) + halaman publik
css/admin.css      ← dashboard admin
js/config.js       ← SATU-SATUNYA yang perlu diisi: URL /exec Apps Script
js/icons.js        ← ikon SVG garis (gaya Lucide)
js/core.js         ← API client (batch, dedupe, cache SWR), tema, util, grafik SVG
js/site.js         ← navigasi, footer, suka (like)
js/home.js         ← landing page
js/pages.js        ← detail proyek, blog, artikel
js/admin.js        ← dashboard admin
```

## Konfigurasi

Isi `js/config.js` dengan URL Web App dari Apps Script:

```js
window.APP_CONFIG = { GAS_URL: 'https://script.google.com/macros/s/ID_DEPLOYMENT_ANDA/exec' };
```

URL ini bukan rahasia. Tidak ada token, kunci, atau sandi apa pun di repository ini. Semua rahasia tersimpan di Script Properties proyek Apps Script.

## Memperbarui

```bash
git add .
git commit -m "keterangan perubahan"
git push
```

Setelah mengubah CSS/JS, naikkan angka `?v=` pada tag `<link>`/`<script>` di berkas HTML agar browser pengunjung memuat versi baru.

## Catatan

- Situs memuat `noindex` dan `robots.txt` melarang mesin pencari (sesuai PRD: tidak muncul di hasil pencarian).
- Langkah pemasangan lengkap ada di `PANDUAN-INSTALASI.md`.
- Font: Plus Jakarta Sans (judul) dan Inter (isi) dari Google Fonts, dengan cadangan font sistem.
