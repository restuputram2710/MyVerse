# MyVerse — Portofolio Pribadi (v1.1.0)

Situs portofolio satu halaman + blog & karya ilmiah + dashboard admin, bertema **"Midnight Blue"** (navy + biru) dengan animasi interaktif.

- **Frontend:** HTML/CSS/JS murni (tanpa framework), di-host di GitHub Pages.
- **Backend:** Google Apps Script sebagai REST API JSON, dengan Google Sheets sebagai database dan Google Drive sebagai penyimpanan berkas.

Kode backend **tidak** disimpan di repository ini. Ia hidup di proyek Apps Script milik pemilik situs.

## Halaman

| Berkas | Isi |
|---|---|
| `index.html` | Landing page: Hero, About, Services, Projects, Experience & Education, Skills, Honors, Articles & Research, Process, Testimonials, Let's Work Together, Contact |
| `proyek.html?slug=…` | Detail proyek |
| `blog.html` | Artikel & karya ilmiah (tab All / Articles / Research, cari, filter topik) |
| `artikel.html?slug=…` | Isi artikel, atau karya ilmiah dengan abstrak, pratinjau PDF/Word, Download (opsional), dan Cite |
| `admin.html` | Dashboard pemilik (login sandi). Sengaja tidak ditautkan dari menu publik |

## Struktur

```
index.html  proyek.html  blog.html  artikel.html  admin.html  robots.txt
assets/favicon.svg  assets/hero-bg.svg  assets/cta-bg.svg   ← ilustrasi latar bawaan
css/style.css      ← token desain "Midnight Blue" (gelap & terang) + halaman publik
css/admin.css      ← dashboard admin
js/config.js       ← SATU-SATUNYA yang perlu diisi: URL /exec Apps Script
js/icons.js        ← ikon SVG garis
js/core.js         ← API client (batch, dedupe, cache SWR), tema, efek interaktif, grafik SVG
js/site.js         ← navigasi, footer, progres gulir, kartu tulisan, suka
js/home.js         ← landing page (animasi hero, kartu proyek 3D, timeline)
js/pages.js        ← detail proyek, blog, artikel & karya ilmiah
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
git pull
git add .
git commit -m "keterangan perubahan"
git push
```

Setelah mengubah CSS/JS, naikkan angka `?v=` pada tag `<link>`/`<script>` di berkas HTML agar browser pengunjung memuat versi baru.

## Catatan

- Situs memuat `noindex` dan `robots.txt` melarang mesin pencari (sesuai PRD).
- Animasi otomatis dimatikan bagi pengunjung yang mengaktifkan "kurangi gerakan" di perangkatnya.
- Langkah pemasangan baru: `PANDUAN-INSTALASI.md`. Update dari v1.0.x: `PANDUAN-UPDATE-v1.1.md`.
