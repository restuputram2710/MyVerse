/* =========================================================
   MyVerse — Dashboard Admin (admin.js)
   Login, ringkasan, kelola isi (CRUD generik), profil & kontak,
   editor blog, pesan masuk, pengaturan, cadangan & impor.
   ========================================================= */
(function () {
  const MV = window.MV, $ = MV.$, $$ = MV.$$, esc = MV.esc, I = MV.icon;
  const app = $('#app');
  if (!MV.ready) { MV.configBanner(app); return; }
  const fmtN = function (n) { return Number(n || 0).toLocaleString('id-ID'); };
  const tglID = function (iso) { return MV.fmtDate(iso, 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };

  // ============ Sesi ============
  const Sesi = {
    load: function () {
      const s = MV.store.get('mv_admin');
      if (s && s.token && s.exp > Date.now()) { MV._token = s.token; return s; }
      MV.store.del('mv_admin');
      return null;
    },
    save: function (token, exp, nama) { MV.store.set('mv_admin', { token: token, exp: exp, nama: nama || 'Admin' }); MV._token = token; },
    clear: function () { MV.store.del('mv_admin'); MV._token = ''; Cache.clear(); }
  };
  MV.onAuthFail = function () { if (!MV._token) return; clearInterval(A.poll); Sesi.clear(); showLogin('Sesi Anda berakhir. Silakan masuk lagi.'); };

  // ============ Cache memori (SWR singkat) ============
  const Cache = {
    m: {},
    clear: function () { this.m = {}; },
    drop: function () { const pre = Array.from(arguments); Object.keys(this.m).forEach(function (k) { if (pre.some(function (p) { return k.indexOf(p) === 0; })) delete Cache.m[k]; }); }
  };
  async function load(action, data, opts) {
    opts = opts || {};
    const key = action + '|' + JSON.stringify(data || {});
    const hit = Cache.m[key];
    if (hit && !opts.fresh && Date.now() - hit.at < (opts.maxAge || 30000)) return hit.res;
    const res = opts.fresh ? await MV.api(action, Object.assign({}, data, { _fresh: true }), { fresh: true }) : await MV.apiQ(action, data || {});
    if (res.ok) Cache.m[key] = { at: Date.now(), res: res };
    return res;
  }
  async function write(action, data, drops) {
    const r = await MV.api(action, data);
    if (r.ok) Cache.drop.apply(Cache, ['stats.dashboard'].concat(drops || []));
    return r;
  }

  // ============ Komponen umum ============
  function confirmDialog(o) {
    return new Promise(function (resolve) {
      const m = document.createElement('div');
      m.className = 'modal confirm is-open';
      m.setAttribute('role', 'alertdialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'cf-title');
      m.innerHTML = '<div class="modal-backdrop" data-no></div><div class="modal-panel"><span class="icon-tile ' + (o.danger ? 'danger' : '') + '">' + I(o.icon || (o.danger ? 'alert' : 'info')) + '</span>' +
        '<h2 id="cf-title">' + esc(o.title) + '</h2><p>' + esc(o.text || '') + '</p><div class="acts"><button class="btn btn-secondary" data-no>Batal</button>' +
        '<button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + esc(o.ok || 'Lanjutkan') + '</button></div></div>';
      document.body.appendChild(m);
      const done = function (v) { m.remove(); document.removeEventListener('keydown', esc_); resolve(v); };
      const esc_ = function (e) { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', esc_);
      m.addEventListener('click', function (e) { if (e.target.closest('[data-yes]')) done(true); else if (e.target.closest('[data-no]')) done(false); });
      setTimeout(function () { $('[data-yes]', m).focus(); }, 20);
    });
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(label || 'Menyimpan…'); }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  }
  const pill = function (t, cls) { return '<span class="badge ' + (cls || '') + '">' + esc(t) + '</span>'; };
  const stPill = function (s) { return '<span class="st st-' + String(s || 'baru').toLowerCase() + '">' + esc(s || 'Baru') + '</span>'; };
  const thumb = function (id, title, seed) { return '<span class="thumb">' + (id ? MV.imgTag(id, '', 200) : MV.coverPh(title, seed)) + '</span>'; };
  const failMsg = function (r) { return (r && r.error && r.error.message) || 'Terjadi kesalahan. Coba lagi.'; };

  // ============ Unggah berkas (kompres di browser) ============
  function toDataUrl(blob) { return new Promise(function (res, rej) { const fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(blob); }); }
  function canvasBlob(c, type, q) { return new Promise(function (res) { c.toBlob(res, type, q); }); }
  async function compress(file, keepAlpha) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise(function (res, rej) { const im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('Gambar tidak bisa dibaca.')); }; im.src = url; });
      const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const ctx = c.getContext('2d');
      if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      let type = 'image/webp', q = 0.86, b = await canvasBlob(c, type, q);
      if (!b || b.type !== 'image/webp') { type = keepAlpha ? 'image/png' : 'image/jpeg'; b = await canvasBlob(c, type, q); }
      while (b && b.size > 1e6 && q > 0.45 && type !== 'image/png') { q -= 0.1; b = await canvasBlob(c, type, q); }
      if (!b) throw new Error('Gagal memproses gambar.');
      return { blob: b, mime: b.type };
    } finally { URL.revokeObjectURL(url); }
  }
  async function uploadFile(file, folder, opts) {
    opts = opts || {};
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (ok.indexOf(file.type) === -1) throw new Error('Jenis berkas tidak didukung. Gunakan JPG, PNG, WebP' + (opts.pdf ? ', atau PDF.' : '.'));
    if (file.type === 'application/pdf' && !opts.pdf) throw new Error('Bagian ini hanya menerima gambar.');
    if (opts.pdfOnly && file.type !== 'application/pdf') throw new Error('Bagian ini hanya menerima PDF.');
    let blob = file, mime = file.type;
    if (mime === 'application/pdf') { if (file.size > 5e6) throw new Error('PDF maksimal 5 MB (berkas ini ' + (file.size / 1e6).toFixed(1) + ' MB).'); }
    else { const c = await compress(file, folder === 'ikon' || file.type === 'image/png'); blob = c.blob; mime = c.mime; }   // PNG transparan (mis. foto tanpa latar) tetap transparan
    const data = await toDataUrl(blob);
    const r = await MV.api('file.upload', { folder: folder, name: file.name, mime: mime, base64: data.split(',')[1] }, { timeout: 120000 });
    if (!r.ok) throw new Error(failMsg(r));
    if (r.data.peringatan) MV.toast(r.data.peringatan, 'info', 8000);
    return r.data;
  }

  // ============ Login ============
  function showLogin(msg) {
    document.body.classList.add('admin');
    app.innerHTML = '<div class="adm-login"><svg class="rings" viewBox="0 0 400 400" fill="none" stroke="var(--primary-300)" aria-hidden="true"><circle cx="200" cy="200" r="198" stroke-dasharray="2 7"/><circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="100" stroke-dasharray="1 5"/></svg>' +
      '<form class="card login-card" id="login-form" novalidate><a class="brand" href="index.html"><span class="brand-mark">MV</span><span class="brand-text"><span class="brand-name" style="text-transform:none">MyVerse Admin</span><span class="brand-sub">Konsol Manajemen</span></span></a>' +
      '<h1>Masuk Admin</h1><p class="sub">Kelola seluruh isi portofolio Anda.</p>' +
      (msg ? '<div class="alert alert-info">' + I('info', 'icon-sm') + '<span>' + esc(msg) + '</span></div>' : '') +
      '<div class="field"><label for="pw">Kata Sandi</label><div class="pw-wrap"><input class="input" id="pw" type="password" autocomplete="current-password" required>' +
      '<button type="button" class="icon-btn" id="pw-eye" aria-label="Tampilkan sandi">' + I('eye') + '</button></div></div>' +
      '<div id="login-err" role="alert"></div><button class="btn btn-primary btn-block" id="login-btn" type="submit">Masuk ' + I('arrow-right', 'icon-sm') + '</button>' +
      '<a class="back-link" href="index.html" style="justify-content:center">' + I('arrow-left', 'icon-sm') + 'Kembali ke situs</a></form>' +
      '<button class="icon-btn" data-theme-toggle style="position:fixed;top:16px;right:16px"></button></div>';
    MV.theme.apply(MV.theme.mode() === 'dark');
    MV.warm('admin');
    const pw = $('#pw');
    setTimeout(function () { pw.focus(); }, 30);
    $('#pw-eye').addEventListener('click', function () {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      this.innerHTML = I(show ? 'eye-off' : 'eye');
      this.setAttribute('aria-label', show ? 'Sembunyikan sandi' : 'Tampilkan sandi');
    });
    $('#login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const err = $('#login-err'), btn = $('#login-btn');
      if (!pw.value) { err.innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>Masukkan kata sandi.</span></div>'; return; }
      busy(btn, true, 'Memeriksa…');
      const r = await MV.api('auth.login', { password: pw.value });
      busy(btn, false);
      if (!r.ok) { err.innerHTML = '<div class="alert alert-err">' + I(r.error.code === 'LOCKED' ? 'lock' : 'alert', 'icon-sm') + '<span>' + esc(failMsg(r)) + '</span></div>'; pw.select(); return; }
      Sesi.save(r.data.token, r.data.exp, r.data.nama);
      pw.value = '';
      boot();
    });
  }

  // ============ Kerangka & router ============
  const MENU = [
    ['ringkasan', 'Ringkasan', 'dashboard'], ['profil', 'Profil', 'user'], ['pengalaman', 'Pengalaman', 'briefcase'],
    ['pendidikan', 'Pendidikan', 'graduation-cap'], ['keterampilan', 'Keterampilan', 'wand'], ['prestasi', 'Prestasi', 'trophy'],
    ['proyek', 'Proyek', 'folder'], ['kategori', 'Kategori', 'shapes'], ['layanan', 'Layanan', 'layers'], ['proses', 'Proses', 'trending-up'],
    ['testimoni', 'Testimoni', 'quote'], ['mitra', 'Mitra & Logo', 'users'], ['blog', 'Blog & Karya Ilmiah', 'file-text'], ['kontak', 'Kontak & Sosial', 'mail'],
    ['pesan', 'Pesan Masuk', 'inbox'], ['pengaturan', 'Pengaturan', 'settings']
  ];
  const A = { dirty: false, stats: null };

  function boot() {
    document.body.classList.add('admin');
    const s = Sesi.load() || {};
    app.innerHTML = '<div class="adm" id="adm">' +
      '<aside class="side" id="side" aria-label="Menu admin"><a class="brand" href="#/ringkasan"><span class="brand-mark">MV</span><span class="brand-text"><span class="brand-name">MyVerse Admin</span><span class="brand-sub">Konsol Manajemen</span></span></a>' +
      '<div class="side-new"><button class="btn btn-primary btn-block" id="btn-new" aria-haspopup="true" aria-expanded="false">' + I('plus', 'icon-sm') + 'Buat Baru</button></div>' +
      '<nav><ul class="side-nav">' + MENU.map(function (m) {
        return (m[0] === 'pesan' ? '<li class="side-sep" role="separator"></li>' : '') +
          '<li><a href="#/' + m[0] + '" data-menu="' + m[0] + '">' + I(m[2]) + '<span>' + m[1] + '</span>' +
          (m[0] === 'proyek' || m[0] === 'pesan' ? '<span class="nbadge" data-badge="' + m[0] + '" hidden></span>' : '') + '</a></li>';
      }).join('') + '</ul></nav>' +
      '<div class="side-foot"><a href="index.html" target="_blank" rel="noopener">' + I('external-link') + 'Lihat Situs</a><button type="button" class="logout" id="btn-logout">' + I('log-out') + 'Keluar</button></div></aside>' +
      '<div class="side-scrim" data-close-nav></div>' +
      '<div class="main-col" style="min-width:0;display:flex;flex-direction:column">' +
      '<header class="top"><button class="icon-btn menu-btn" id="btn-menu" aria-label="Buka menu" aria-controls="side">' + I('menu') + '</button>' +
      '<div><div class="crumb">Admin ' + I('chevron-right', 'icon-sm') + '<b id="crumb">Ringkasan</b></div><h1 id="page-title">Ringkasan</h1></div>' +
      '<div class="top-actions"><button class="icon-btn" data-theme-toggle></button>' +
      '<a class="icon-btn bell" href="#/pesan" aria-label="Pesan masuk">' + I('bell') + '<span class="ping" id="bell-ping" hidden></span></a>' +
      '<div class="me"><span class="avatar" id="me-av">' + esc(MV.initials(s.nama || 'Admin')) + '</span><div><b id="me-name">' + esc(s.nama || 'Admin') + '</b><small><i></i>Administrator · Online</small></div></div></div></header>' +
      '<main class="content" id="view" tabindex="-1"></main>' +
      '<footer class="adm-foot"><span>© ' + new Date().getFullYear() + ' MyVerse · v' + MV.VERSION + '</span><span>Data di Google Sheets · Berkas di Google Drive</span></footer></div></div>';
    MV.theme.apply(MV.theme.mode() === 'dark');
    bindShell();
    window.removeEventListener('hashchange', route);
    window.addEventListener('hashchange', route);
    route();
    // Muat menu inti dalam satu batch saat senggang (gas-scale-turbo §4.4)
    const idle = window.requestIdleCallback || function (f) { setTimeout(f, 600); };
    idle(function () { ['stats.dashboard', 'message.list', 'proyek.list'].forEach(function (a) { load(a, {}); }); });
    refreshBadges();
    clearInterval(A.poll);
    A.poll = setInterval(function () { if (MV.Activity.due('stats', 60000, 300000)) refreshBadges(true); }, 15000);
  }

  function bindShell() {
    const adm = $('#adm');
    $('#btn-menu').addEventListener('click', function () { adm.classList.add('nav-open'); });
    adm.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-nav]') || (e.target.closest('.side-nav a') && innerWidth <= 960)) adm.classList.remove('nav-open');
    });
    $('#btn-logout').addEventListener('click', async function () {
      if (A.dirty && !(await confirmDialog({ title: 'Keluar tanpa menyimpan?', text: 'Perubahan yang belum disimpan akan hilang.', ok: 'Keluar', danger: true }))) return;
      MV.api('auth.logout', {});
      clearInterval(A.poll);
      Sesi.clear(); A.dirty = false;
      location.hash = '';
      showLogin('Anda telah keluar.');
    });
    const nb = $('#btn-new');
    nb.addEventListener('click', function (e) {
      e.stopPropagation();
      let pop = $('.popover', nb.parentElement);
      if (pop) { pop.remove(); nb.setAttribute('aria-expanded', 'false'); return; }
      pop = document.createElement('div');
      pop.className = 'popover'; pop.setAttribute('role', 'menu');
      pop.innerHTML = [['proyek/baru', 'Proyek', 'folder'], ['blog/baru', 'Artikel', 'pen-tool'], ['blog/karya', 'Karya Ilmiah', 'file-badge'], ['prestasi/baru', 'Prestasi', 'trophy'], ['pengalaman/baru', 'Pengalaman', 'briefcase'], ['testimoni/baru', 'Testimoni', 'quote'], ['mitra/baru', 'Mitra', 'users']]
        .map(function (x) { return '<a role="menuitem" href="#/' + x[0] + '">' + I(x[2], 'icon-sm') + x[1] + '</a>'; }).join('');
      nb.parentElement.appendChild(pop);
      nb.setAttribute('aria-expanded', 'true');
      setTimeout(function () { document.addEventListener('click', function close() { pop.remove(); nb.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', close); }); });
    });
  }

  async function refreshBadges(fresh) {
    const r = await load('stats.dashboard', {}, { maxAge: fresh ? 55000 : 30000 });
    if (!r.ok) return;
    A.stats = r.data;
    const set = function (k, n, hot) { const b = $('[data-badge="' + k + '"]'); if (b) { b.hidden = !n; b.textContent = n; b.classList.toggle('hot', !!hot); } };
    set('proyek', r.data.proyek_total, false);
    set('pesan', r.data.pesan_baru, true);
    const ping = $('#bell-ping'); if (ping) ping.hidden = !r.data.pesan_baru;
    const nm = $('#me-name'), av = $('#me-av');
    if (r.data.nama && nm && av) { nm.textContent = r.data.nama; av.textContent = MV.initials(r.data.nama); }
  }

  let lastHash = '';
  async function route() {
    if (!$('#adm')) return;                                 // belum login / sudah keluar
    const h = location.hash.replace(/^#\/?/, '') || 'ringkasan';
    if (A.dirty && h !== lastHash) {
      const ok = await confirmDialog({ title: 'Tinggalkan halaman?', text: 'Ada perubahan yang belum disimpan.', ok: 'Tinggalkan', danger: true });
      if (!ok) { history.replaceState(null, '', '#/' + lastHash); return; }
      A.dirty = false;
    }
    lastHash = h;
    const parts = h.split('/'), name = parts[0], sub = parts[1];
    const menuKey = name === 'kontak' ? 'kontak' : name;
    $$('[data-menu]').forEach(function (a) { const on = a.dataset.menu === menuKey; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const m = MENU.find(function (x) { return x[0] === name; });
    const title = m ? m[1] : 'Ringkasan';
    $('#crumb').textContent = title; $('#page-title').textContent = title;
    document.title = title + ' — MyVerse Admin';
    const host = $('#view');
    host.innerHTML = '';
    const view = document.createElement('div');            // wadah baru per halaman → listener lama ikut terbuang
    host.appendChild(view);
    view.innerHTML = '<div class="sk" style="height:120px;border-radius:16px"></div><div class="sk" style="height:320px;border-radius:16px;margin-top:18px"></div>';
    try {
      if (name === 'ringkasan') await pageDashboard(view);
      else if (name === 'profil' || name === 'kontak') await pageProfil(view, name);
      else if (name === 'blog' && sub) await pageEditor(view, sub === 'baru' || sub === 'karya' ? null : sub, sub === 'karya' ? 'Karya Ilmiah' : 'Artikel');
      else if (name === 'blog') await pageBlogList(view);
      else if (name === 'pesan') await pageInbox(view);
      else if (name === 'pengaturan') await pagePengaturan(view);
      else if (ENT[name]) await pageList(view, name, sub === 'baru');
      else location.hash = '#/ringkasan';
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>Halaman gagal dimuat: ' + esc(e.message) + '</span></div>';
    }
    host.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  window.addEventListener('beforeunload', function (e) { if (A.dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ============ Ringkasan (AD-02) ============
  async function pageDashboard(view) {
    const r = await load('stats.dashboard', {});
    if (!r.ok) throw new Error(failMsg(r));
    const d = r.data; A.stats = d;
    const bulan = d.pesan_bulanan || [];
    const total6 = bulan.reduce(function (s, b) { return s + b.jumlah; }, 0);
    const puncak = bulan.reduce(function (m, b) { return b.jumlah > m.jumlah ? b : m; }, { label: '-', jumlah: 0 });
    const kat = (d.per_kategori || []).filter(function (k) { return k.jumlah > 0; });
    view.innerHTML =
      '<section class="card welcome"><div style="position:relative;z-index:1"><span class="status-chip"><span class="dot" aria-hidden="true"></span>Situs aktif · data tersinkron</span>' +
      '<h2>' + I('sparkles') + 'Selamat datang kembali, ' + esc((d.nama || 'Admin').split(' ')[0]) + '!</h2>' +
      '<p>Ringkasan aktivitas portofolio MyVerse Anda. ' + (d.pesan_baru ? 'Ada <b>' + d.pesan_baru + ' pesan baru</b> menunggu balasan.' : 'Tidak ada pesan baru.') + '</p></div>' +
      '<div class="actions"><a class="btn btn-primary" href="#/proyek/baru">' + I('plus', 'icon-sm') + 'Tambah Proyek</a><a class="btn btn-secondary" href="#/blog/baru">' + I('pen-tool', 'icon-sm') + 'Tulis Artikel</a></div></section>' +
      '<div class="stat-grid">' +
      statCard('Pesan Baru', d.pesan_baru, 'mail', d.pesan_total + ' pesan total', !!d.pesan_baru) +
      statCard('Total Proyek', d.proyek_total, 'folder', d.proyek_unggulan + ' unggulan · ' + d.proyek_publik + ' tampil', false) +
      statCard('Artikel Blog', d.artikel_terbit + d.artikel_draf, 'file-text', d.artikel_terbit + ' terbit · ' + d.artikel_draf + ' draf', false) +
      statCard('Total Suka', d.suka_total, 'heart', '+' + d.suka_minggu + ' dalam 7 hari', d.suka_minggu > 0) + '</div>' +
      '<div class="dash-grid"><section class="card card-pad"><div class="panel-head"><div><h3>Pesan Masuk per Bulan</h3><p>Statistik formulir kontak 6 bulan terakhir</p></div></div>' +
      MV.charts.bars(bulan.map(function (b) { return { label: b.label, value: b.jumlah }; }), { aria: 'Pesan masuk per bulan' }) +
      '<div class="mini-stats"><div><small>Rata-rata / bulan</small><b class="tnum">' + (total6 / Math.max(1, bulan.length)).toFixed(1).replace('.', ',') + '</b></div>' +
      '<div><small>Bulan tersibuk</small><b>' + esc(puncak.label) + ' (' + puncak.jumlah + ')</b></div><div><small>Total 6 bulan</small><b class="tnum">' + total6 + '</b></div></div></section>' +
      '<section class="card card-pad"><div class="panel-head"><div><h3>Proyek per Kategori</h3><p>Distribusi ' + d.proyek_total + ' proyek portofolio</p></div><a class="btn btn-ghost btn-sm" href="#/kategori">Kelola</a></div>' +
      (kat.length ? '<div class="chart-box" style="max-width:220px;margin:0 auto 18px">' + MV.charts.donut(kat.map(function (k) { return { label: k.nama, value: k.jumlah }; }), { label: 'Total proyek', aria: 'Proyek per kategori' }) + '</div>' +
        MV.charts.legend(kat.map(function (k) { return { label: k.nama, value: k.jumlah }; })) : '<p class="muted">Belum ada proyek.</p>') + '</section></div>' +
      '<div class="dash-grid two"><section class="card card-pad"><div class="panel-head"><div><h3>' + I('heart', 'icon-sm') + ' 5 Item Paling Disukai</h3><p>Proyek dan artikel favorit pengunjung</p></div></div><div class="list-rows">' +
      ((d.top_suka || []).length ? d.top_suka.map(function (t, i) {
        return '<div class="list-row"><span class="rank">' + (i + 1) + '</span><div class="grow"><b>' + esc(t.judul) + '</b><small>' + esc(t.tipe) + (t.kategori ? ' · ' + esc(t.kategori) : '') + '</small></div><span class="heart-n">' + I('heart', 'icon-sm') + t.suka + '</span></div>';
      }).join('') : '<p class="muted">Belum ada suka dari pengunjung.</p>') + '</div></section>' +
      '<section class="card card-pad"><div class="panel-head"><div><h3>' + I('message', 'icon-sm') + ' Pesan Terbaru</h3><p>Formulir kontak dari pengunjung</p></div><a class="btn btn-ghost btn-sm" href="#/pesan">Buka kotak masuk ' + I('arrow-right', 'icon-sm') + '</a></div><div class="list-rows">' +
      ((d.pesan_terbaru || []).length ? d.pesan_terbaru.map(function (m) {
        return '<a class="list-row" href="#/pesan" data-open-msg="' + esc(m.id) + '" style="color:inherit;text-decoration:none"><span class="avatar">' + esc(MV.initials(m.nama)) + '</span><div class="grow"><b>' + esc(m.nama) + '</b><small>' + esc(m.subjek) + '</small></div>' +
          '<div style="text-align:right;display:grid;gap:4px;justify-items:end">' + stPill(m.status) + '<small class="muted" style="font-size:12px">' + esc(MV.relTime(m.waktu)) + '</small></div></a>';
      }).join('') : '<p class="muted">Belum ada pesan masuk.</p>') + '</div></section></div>';
    view.addEventListener('click', function (e) { const a = e.target.closest('[data-open-msg]'); if (a) A.openMsg = a.dataset.openMsg; });
  }
  function statCard(label, n, ic, sub, up) {
    return '<div class="card stat"><div class="stat-top"><span>' + esc(label) + '</span><span class="icon-tile">' + I(ic) + '</span></div><b>' + fmtN(n) + '</b>' +
      '<span class="trend ' + (up ? '' : 'neutral') + '">' + I(up ? 'trending-up' : 'info', 'icon-sm') + esc(sub) + '</span></div>';
  }

  // ============ Definisi entitas (CRUD generik, AD-03) ============
  const JENIS_EXP = ['Kerja', 'Mengajar', 'Organisasi', 'Profesional'];
  const periode = function (r) { return [r.mulai, bool(r.masih_aktif) ? 'Sekarang' : r.selesai].filter(Boolean).join(' — '); };
  const bool = function (v) { return v === true || String(v).toUpperCase() === 'TRUE'; };
  const ENT = {
    pengalaman: {
      title: 'Pengalaman', sing: 'Pengalaman', icon: 'briefcase', desc: 'Pengalaman kerja, mengajar, organisasi, dan aktivitas profesional. Urutan teratas tampil paling atas.',
      filter: { k: 'jenis', label: 'Semua jenis', opts: JENIS_EXP },
      main: function (r) { return [r.posisi, r.instansi + (r.lokasi ? ' · ' + r.lokasi : '')]; },
      cols: [{ label: 'Jenis', html: function (r) { return pill(r.jenis); } }, { label: 'Periode', html: function (r) { return '<span class="tnum">' + esc(periode(r)) + '</span>'; } }],
      form: [
        { sec: 'Informasi', f: [{ k: 'jenis', label: 'Jenis', type: 'select', opts: JENIS_EXP, req: 1 }, { k: 'posisi', label: 'Posisi / jabatan', req: 1, max: 120 }, { k: 'instansi', label: 'Instansi / organisasi', req: 1, max: 120 }, { k: 'lokasi', label: 'Lokasi', max: 80 }] },
        { sec: 'Periode', f: [{ row: [{ k: 'mulai', label: 'Mulai', ph: '2023 atau 2023-07', max: 20 }, { k: 'selesai', label: 'Selesai', ph: 'Kosongkan bila masih aktif', max: 20 }] }, { k: 'masih_aktif', label: 'Masih berlangsung (tampil "Present")', type: 'toggle' }] },
        { sec: 'Detail', f: [{ k: 'deskripsi', label: 'Deskripsi', type: 'textarea', max: 1500 }, { k: 'tag', label: 'Keterampilan terkait', type: 'tags', help: 'Tekan Enter atau koma setelah tiap kata.' }] }
      ]
    },
    pendidikan: {
      title: 'Pendidikan', sing: 'Pendidikan', icon: 'graduation-cap', desc: 'Riwayat pendidikan formal dan pendidikan tambahan (kursus, pelatihan, sertifikasi).',
      filter: { k: 'jenis', label: 'Semua jenis', opts: ['Formal', 'Tambahan'] },
      main: function (r) { return [r.jenjang_program, r.institusi + (r.jurusan ? ' · ' + r.jurusan : '')]; },
      cols: [{ label: 'Jenis', html: function (r) { return pill(r.jenis); } }, { label: 'Tahun', html: function (r) { return '<span class="tnum">' + esc([r.tahun_mulai, r.tahun_selesai].filter(Boolean).join(' — ')) + '</span>'; } }],
      form: [
        { sec: 'Informasi', f: [{ k: 'jenis', label: 'Jenis', type: 'select', opts: ['Formal', 'Tambahan'], req: 1 }, { k: 'jenjang_program', label: 'Jenjang / program', req: 1, max: 120, ph: 'S1 Pendidikan, Kursus UI/UX, …' }, { k: 'institusi', label: 'Institusi', req: 1, max: 120 }, { k: 'jurusan', label: 'Jurusan / bidang', max: 120 }] },
        { sec: 'Tahun', f: [{ row: [{ k: 'tahun_mulai', label: 'Tahun mulai', max: 10 }, { k: 'tahun_selesai', label: 'Tahun selesai', max: 10 }] }, { k: 'deskripsi', label: 'Keterangan', type: 'textarea', max: 1000 }] }
      ]
    },
    keterampilan: {
      title: 'Keterampilan', sing: 'Keterampilan', icon: 'wand', desc: 'Keterampilan dikelompokkan per kategori. Aktifkan "Grid alat" agar tampil sebagai ikon di bagian Tools.',
      filter: { k: 'kategori', label: 'Semua kategori', opts: ['Technical', 'Professional', 'Educational'] },
      main: function (r) { return [r.nama, r.kategori]; },
      thumbIcon: 'ikon_id',
      cols: [{ label: 'Tingkat', html: function (r) { return '<div style="display:flex;align-items:center;gap:10px;min-width:140px"><div class="bar" style="flex:1"><i style="width:' + Number(r.tingkat || 0) + '%"></i></div><b class="tnum" style="font-size:13px">' + Number(r.tingkat || 0) + '%</b></div>'; } },
        { label: 'Grid alat', html: function (r) { return bool(r.tampil_grid) ? '<span class="st st-dibalas">' + I('check', 'icon-sm') + 'Ya</span>' : '<span class="muted">—</span>'; } }],
      form: [
        { sec: 'Keterampilan', f: [{ k: 'nama', label: 'Nama keterampilan', req: 1, max: 60 }, { k: 'kategori', label: 'Kategori', type: 'select', opts: ['Technical', 'Professional', 'Educational'], req: 1 }, { k: 'tingkat', label: 'Tingkat penguasaan', type: 'range' }] },
        { sec: 'Grid alat', f: [{ k: 'tampil_grid', label: 'Tampilkan sebagai ikon di grid "Tools I use"', type: 'toggle' }, { k: 'ikon_id', label: 'Logo / ikon (opsional)', type: 'image', folder: 'ikon', help: 'PNG transparan terlihat paling rapi. Tanpa logo, inisial yang tampil.' }] }
      ]
    },
    prestasi: {
      title: 'Prestasi', sing: 'Prestasi', icon: 'trophy', desc: 'Prestasi, penghargaan, dan sertifikat. Berkas hanya bisa dilihat pengunjung, tidak bisa diunduh.',
      filter: { k: 'jenis', label: 'Semua jenis', opts: ['Prestasi', 'Penghargaan', 'Sertifikat'] },
      thumb: 'file_id',
      main: function (r) { return [r.judul, [r.penerbit, r.tanggal].filter(Boolean).join(' · ')]; },
      cols: [{ label: 'Jenis', html: function (r) { return pill(r.jenis); } }],
      form: [
        { sec: 'Informasi', f: [{ k: 'jenis', label: 'Jenis', type: 'select', opts: ['Prestasi', 'Penghargaan', 'Sertifikat'], req: 1 }, { k: 'judul', label: 'Judul', req: 1, max: 150 }, { row: [{ k: 'penerbit', label: 'Penerbit / penyelenggara', max: 120 }, { k: 'tanggal', label: 'Tanggal / tahun', ph: '2024 atau 2024-05', max: 20 }] }, { k: 'deskripsi', label: 'Keterangan', type: 'textarea', max: 1000 }] },
        { sec: 'Bukti', f: [{ k: 'file_id', label: 'Berkas sertifikat (gambar atau PDF)', type: 'file', folder: 'prestasi' }, { k: 'tautan_verifikasi', label: 'Tautan verifikasi (opsional)', type: 'url', ph: 'https://…' }] }
      ]
    },
    proyek: {
      title: 'Proyek', sing: 'Proyek', icon: 'folder', desc: 'Kelola karya, studi kasus, urutan tampil, dan status publikasi portofolio Anda.',
      filter: { k: 'kategori_id', label: 'Semua kategori', dyn: true },
      thumb: 'gambar_id',
      main: function (r) { return [r.judul, '/proyek/' + r.slug]; },
      mono: true,
      cols: [
        { label: 'Kategori', html: function (r, x) { const k = (x.kategori || []).find(function (k) { return k.id === r.kategori_id; }); return k ? pill(k.nama) : '<span class="muted">—</span>'; } },
        { label: 'Tahun', html: function (r) { return '<span class="tnum">' + esc(r.tahun || '—') + '</span>'; } },
        { label: 'Unggulan', html: function (r) { return '<button type="button" class="star-btn" data-star="' + esc(r.id) + '" aria-pressed="' + bool(r.unggulan) + '" aria-label="Tandai unggulan">' + I('star') + '</button>'; } },
        { label: 'Suka', html: function (r) { return '<span class="heart-n">' + I('heart', 'icon-sm') + (r.suka || 0) + '</span>'; } }
      ],
      form: [
        { sec: 'Informasi Utama', f: [{ k: 'judul', label: 'Judul proyek', req: 1, max: 150 }, { k: 'slug', label: 'Slug (alamat halaman)', type: 'slug', help: 'Terisi otomatis dari judul. Huruf kecil dan tanda hubung.' },
          { row: [{ k: 'kategori_id', label: 'Kategori', type: 'kategori' }, { k: 'tahun', label: 'Tahun', ph: '2025', max: 10 }] }, { k: 'ringkasan', label: 'Ringkasan (tampil di kartu)', type: 'textarea', rows: 2, max: 300 }] },
        { sec: 'Detail', f: [{ k: 'deskripsi', label: 'Deskripsi / overview', type: 'textarea', max: 6000 }, { k: 'tujuan', label: 'Tujuan', type: 'textarea', help: 'Satu baris per poin.', max: 3000 }, { k: 'hasil', label: 'Hasil', type: 'textarea', max: 3000 },
          { k: 'teknologi', label: 'Teknologi', type: 'tags' }, { k: 'tautan_demo', label: 'Tautan demo (opsional)', type: 'url', ph: 'https://…' }] },
        { sec: 'Media', f: [{ k: 'gambar_id', label: 'Gambar utama (16:10 disarankan)', type: 'image', folder: 'proyek' }, { k: 'galeri_ids', label: 'Galeri dokumentasi (maks. 10)', type: 'images', folder: 'proyek', max: 10 }] },
        { sec: 'Tampilan', f: [{ k: 'unggulan', label: 'Proyek unggulan (tampil paling depan)', type: 'toggle' }] }
      ]
    },
    kategori: {
      title: 'Kategori', sing: 'Kategori', icon: 'shapes', desc: 'Kategori dipakai sebagai filter di bagian Projects. Kategori yang masih dipakai proyek tidak bisa dihapus.',
      main: function (r, x) { const n = (x.proyek || []).filter(function (p) { return p.kategori_id === r.id; }).length; return [r.nama, n + ' proyek']; },
      cols: [],
      form: [{ sec: 'Kategori', f: [{ k: 'nama', label: 'Nama kategori', req: 1, max: 60 }] }]
    },
    layanan: {
      title: 'Layanan', sing: 'Layanan', icon: 'layers', desc: 'Bidang keahlian atau layanan profesional yang ditampilkan di bagian Services.',
      iconCol: 'ikon',
      main: function (r) { return [r.judul, r.deskripsi]; },
      cols: [],
      form: [{ sec: 'Layanan', f: [{ k: 'judul', label: 'Judul layanan', req: 1, max: 80 }, { k: 'deskripsi', label: 'Deskripsi singkat', type: 'textarea', rows: 3, max: 400 }, { k: 'ikon', label: 'Ikon', type: 'icon' }] }]
    },
    proses: {
      title: 'Proses', sing: 'Langkah proses', icon: 'trending-up', desc: 'Tahapan kerja yang tampil bernomor di bagian My Process. Atur urutan dengan tombol naik/turun.',
      numbered: true,
      main: function (r) { return [r.judul, r.deskripsi]; },
      cols: [],
      form: [{ sec: 'Langkah', f: [{ k: 'judul', label: 'Nama langkah', req: 1, max: 60, ph: 'Discover, Plan, Create, …' }, { k: 'deskripsi', label: 'Deskripsi', type: 'textarea', rows: 3, max: 300 }] }]
    },
    testimoni: {
      title: 'Testimoni', sing: 'Testimoni', icon: 'quote', desc: 'Ulasan dari rekan kerja, kolega, atau klien yang pernah bekerja sama.',
      avatar: 'foto_id',
      main: function (r) { return [r.nama, [r.jabatan, r.instansi].filter(Boolean).join(', ')]; },
      cols: [{ label: 'Kutipan', html: function (r) { return '<span class="muted" style="display:block;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">“' + esc(r.isi) + '”</span>'; } }],
      form: [{ sec: 'Pemberi testimoni', f: [{ k: 'nama', label: 'Nama', req: 1, max: 80 }, { row: [{ k: 'jabatan', label: 'Jabatan', max: 80 }, { k: 'instansi', label: 'Instansi', max: 120 }] }, { k: 'foto_id', label: 'Foto (opsional)', type: 'image', folder: 'testimoni' }] },
        { sec: 'Testimoni', f: [{ k: 'isi', label: 'Isi testimoni', type: 'textarea', req: 1, max: 800 }] }]
    },
    mitra: {
      title: 'Mitra & Logo', sing: 'Mitra', icon: 'users', desc: 'Logo instansi, sekolah, atau klien di baris "Trusted by" pada hero. Lima logo atau lebih bergulir otomatis. Tanpa mitra, hero menampilkan angka statistik.',
      thumbIcon: 'logo_id',
      main: function (r) { return [r.nama, r.tautan || 'Tanpa tautan']; },
      cols: [],
      form: [{ sec: 'Mitra', f: [{ k: 'nama', label: 'Nama instansi / klien', req: 1, max: 80 }, { k: 'logo_id', label: 'Logo', type: 'image', folder: 'ikon', help: 'PNG transparan terlihat paling rapi. Logo tampil abu-abu dan berwarna saat disorot. Tanpa logo, nama yang tampil.' },
        { k: 'tautan', label: 'Tautan (opsional)', type: 'url', ph: 'https://…' }] }]
    }
  };

  // ============ Halaman daftar generik ============
  async function pageList(view, name, openNew) {
    const def = ENT[name];
    const calls = [load(name + '.list', {})];
    if (name === 'kategori') calls.push(load('proyek.list', {}));
    const res = await Promise.all(calls);
    if (!res[0].ok) throw new Error(failMsg(res[0]));
    const st = { items: res[0].data.items, x: { kategori: res[0].data.kategori || [], proyek: res[1] && res[1].ok ? res[1].data.items : [] }, q: '', f: '', vis: '', page: 1 };
    if (name === 'proyek') A.kategori = st.x.kategori;
    const PER = 15;
    const filterOpts = def.filter ? (def.filter.dyn ? st.x.kategori.map(function (k) { return [k.id, k.nama]; }) : def.filter.opts.map(function (o) { return [o, o]; })) : [];
    view.innerHTML = '<div class="page-head"><div><h2>' + esc(name === 'proyek' ? 'Manajemen Proyek Portofolio' : def.title) + '</h2><p>' + esc(def.desc) + '</p></div>' +
      '<div class="actions"><button class="btn btn-secondary" id="btn-refresh" title="Muat ulang dari Google Sheets">' + I('refresh', 'icon-sm') + 'Segarkan</button>' +
      '<button class="btn btn-primary" id="btn-add">' + I('plus', 'icon-sm') + 'Tambah ' + esc(def.sing) + '</button></div></div>' +
      '<div class="card filters"><div class="search-box">' + I('search') + '<label class="sr-only" for="f-q">Cari</label><input class="input" id="f-q" type="search" placeholder="Cari ' + esc(def.title.toLowerCase()) + '…"></div>' +
      (def.filter ? '<select class="select" id="f-f" aria-label="Filter"><option value="">' + esc(def.filter.label) + '</option>' + filterOpts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>' : '<span></span>') +
      '<select class="select" id="f-vis" aria-label="Status tampil"><option value="">Semua status</option><option value="TRUE">Tampil</option><option value="FALSE">Disembunyikan</option></select>' +
      '<span class="count-note" id="f-count"></span></div>' +
      '<div class="card" style="overflow:hidden"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:70px">Urutan</th>' +
      (def.thumb || def.avatar || def.iconCol || def.thumbIcon ? '<th style="width:80px"></th>' : '') + '<th>' + (name === 'proyek' ? 'Judul &amp; Slug' : 'Nama') + '</th>' +
      def.cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') + '<th>Tampil</th><th style="text-align:right">Aksi</th></tr></thead><tbody id="rows"></tbody></table></div>' +
      '<div class="tbl-foot"><span id="pg-note"></span><div class="pagination" id="pg"></div></div></div>';

    const draw = function () {
      if (!view.isConnected) return;                       // halaman sudah ditinggalkan (muat ulang selesai belakangan)
      const q = st.q.toLowerCase().trim();
      const list = st.items.filter(function (r) {
        if (st.f && String(r[def.filter.k]) !== st.f) return false;
        if (st.vis && (bool(r.tampil) ? 'TRUE' : 'FALSE') !== st.vis) return false;
        return !q || JSON.stringify(r).toLowerCase().indexOf(q) > -1;
      });
      const filtering = !!(q || st.f || st.vis);
      const pages = Math.max(1, Math.ceil(list.length / PER));
      if (st.page > pages) st.page = pages;
      const shown = list.slice((st.page - 1) * PER, st.page * PER);
      $('#f-count').textContent = 'Menampilkan ' + list.length + ' dari ' + st.items.length;
      $('#rows').innerHTML = shown.length ? shown.map(function (r) {
        const idx = st.items.indexOf(r), m = def.main(r, st.x);
        const lead = def.thumb ? '<td>' + thumb(r[def.thumb], m[0], r.id) + '</td>' :
          def.avatar ? '<td><span class="avatar" style="width:40px;height:40px">' + (r[def.avatar] ? MV.imgTag(r[def.avatar], '', 120) : esc(MV.initials(r.nama))) + '</span></td>' :
            def.iconCol ? '<td><span class="icon-tile">' + I(r[def.iconCol] || 'sparkles') + '</span></td>' :
              def.thumbIcon ? '<td><span class="tool-ico">' + (r[def.thumbIcon] ? MV.imgTag(r[def.thumbIcon], '', 100) : esc(MV.initials(r.nama))) + '</span></td>' : '';
        return '<tr data-id="' + esc(r.id) + '"><td data-label="Urutan"><div style="display:flex;align-items:center;gap:8px">' + (def.numbered ? '<b class="tnum">' + String(idx + 1).padStart(2, '0') + '</b>' : '<span class="tnum muted">' + String(idx + 1).padStart(2, '0') + '</span>') +
          '<span class="order-btns"><button type="button" data-move="naik" aria-label="Naikkan"' + (idx === 0 || filtering ? ' disabled' : '') + '>' + I('chevron-up') + '</button><button type="button" data-move="turun" aria-label="Turunkan"' + (idx === st.items.length - 1 || filtering ? ' disabled' : '') + '>' + I('chevron-down') + '</button></span></div></td>' +
          lead + '<td class="title-cell cell-main"><b>' + esc(m[0]) + '</b><small class="' + (def.mono ? 'mono' : '') + '">' + esc(m[1] || '') + '</small></td>' +
          def.cols.map(function (c) { return '<td data-label="' + esc(c.label) + '">' + c.html(r, st.x) + '</td>'; }).join('') +
          '<td data-label="Tampil"><label class="switch"><input type="checkbox" data-vis ' + (bool(r.tampil) || r.tampil === '' ? 'checked' : '') + ' aria-label="Tampilkan di situs"><span class="track"></span></label></td>' +
          '<td class="cell-actions"><div class="row-actions">' + (name === 'proyek' && r.slug ? '<a class="icon-btn" href="proyek.html?slug=' + encodeURIComponent(r.slug) + '" target="_blank" rel="noopener" aria-label="Lihat di situs" title="Lihat di situs">' + I('eye') + '</a>' : '') +
          '<button type="button" class="icon-btn" data-edit aria-label="Ubah" title="Ubah">' + I('pencil') + '</button><button type="button" class="icon-btn danger" data-del aria-label="Hapus" title="Hapus">' + I('trash') + '</button></div></td></tr>';
      }).join('') : '<tr><td colspan="9"><div class="empty" style="border:0">' + I(def.icon) + '<p><strong>' + (st.items.length ? 'Tidak ada data yang cocok.' : 'Belum ada ' + def.sing.toLowerCase() + '.') + '</strong></p>' +
        (st.items.length ? '' : '<p style="font-size:14px">Klik "Tambah ' + esc(def.sing) + '" untuk memulai.</p>') + '</div></td></tr>';
      $('#pg-note').textContent = filtering ? 'Urutan tidak bisa diubah saat filter aktif.' : st.items.length + ' item · urutan teratas tampil pertama di situs';
      $('#pg').innerHTML = pages > 1 ? Array.from({ length: pages }, function (_, i) { return '<button type="button" data-pg="' + (i + 1) + '"' + (i + 1 === st.page ? ' aria-current="page"' : '') + '>' + (i + 1) + '</button>'; }).join('') : '';
    };
    const reload = async function (fresh) {
      const r = await load(name + '.list', {}, { fresh: fresh });
      if (!view.isConnected) return;
      if (r.ok) { st.items = r.data.items; if (r.data.kategori) { st.x.kategori = r.data.kategori; A.kategori = r.data.kategori; } draw(); }
      else MV.toast(failMsg(r), 'err');
    };
    const after = function () { Cache.drop(name + '.list', 'stats.dashboard', 'proyek.list'); };
    draw();

    $('#f-q').addEventListener('input', MV.debounce(function (e) { st.q = e.target.value; st.page = 1; draw(); }, 150));
    if ($('#f-f')) $('#f-f').addEventListener('change', function (e) { st.f = e.target.value; st.page = 1; draw(); });
    $('#f-vis').addEventListener('change', function (e) { st.vis = e.target.value; st.page = 1; draw(); });
    $('#btn-add').addEventListener('click', function () { openForm(name, null, onSaved); });
    $('#btn-refresh').addEventListener('click', async function () { busy(this, true, 'Memuat…'); await reload(true); busy(this, false); MV.toast('Data dimuat ulang dari Google Sheets.', 'ok'); });
    function onSaved(item, isNew) {
      if (isNew) st.items.unshift(item); else st.items = st.items.map(function (r) { return r.id === item.id ? Object.assign({}, r, item) : r; });
      after(); draw();
      reload(true);
    }
    view.addEventListener('click', async function (e) {
      const tr = e.target.closest('tr[data-id]');
      const pg = e.target.closest('[data-pg]');
      if (pg) { st.page = Number(pg.dataset.pg); draw(); return; }
      if (!tr) return;
      const id = tr.dataset.id, item = st.items.find(function (r) { return r.id === id; });
      let b;
      if (e.target.closest('[data-edit]')) openForm(name, item, onSaved);
      else if (e.target.closest('[data-del]')) {
        const ok = await confirmDialog({ title: 'Hapus "' + def.main(item, st.x)[0] + '"?', text: 'Data dihapus dari Google Sheets. Berkas terkait dipindahkan ke Sampah Drive dan masih bisa dipulihkan dari sana.', ok: 'Hapus', danger: true, icon: 'trash' });
        if (!ok) return;
        const r = await write(name + '.delete', { id: id }, [name + '.list']);
        if (r.ok) { st.items = st.items.filter(function (x) { return x.id !== id; }); draw(); MV.toast('Data dihapus.' + (r.data.berkas_dibuang ? ' ' + r.data.berkas_dibuang + ' berkas dipindah ke Sampah.' : ''), 'ok'); refreshBadges(); }
        else MV.toast(failMsg(r), 'err');
      } else if ((b = e.target.closest('[data-move]')) && !b.disabled) {
        const i = st.items.indexOf(item), j = i + (b.dataset.move === 'naik' ? -1 : 1);
        const copy = st.items.slice(); copy[i] = copy[j]; copy[j] = item; st.items = copy; draw();
        const r = await write(name + '.reorder', { id: id, arah: b.dataset.move }, [name + '.list']);
        if (!r.ok) { MV.toast(failMsg(r), 'err'); reload(true); }
      } else if ((b = e.target.closest('[data-star]'))) {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        const r = await write(name + '.save', { item: { id: id, unggulan: on } }, [name + '.list']);
        if (r.ok) { item.unggulan = on ? 'TRUE' : 'FALSE'; MV.toast(on ? 'Ditandai sebagai unggulan.' : 'Tanda unggulan dilepas.', 'ok'); }
        else { b.setAttribute('aria-pressed', String(!on)); MV.toast(failMsg(r), 'err'); }
      }
    });
    view.addEventListener('change', async function (e) {
      const inp = e.target.closest('[data-vis]');
      if (!inp) return;
      const id = inp.closest('tr').dataset.id, on = inp.checked;
      const r = await write(name + '.save', { item: { id: id, tampil: on } }, [name + '.list']);
      if (r.ok) { const it = st.items.find(function (x) { return x.id === id; }); it.tampil = on ? 'TRUE' : 'FALSE'; MV.toast(on ? 'Ditampilkan di situs.' : 'Disembunyikan dari situs.', 'ok'); }
      else { inp.checked = !on; MV.toast(failMsg(r), 'err'); }
    });
    if (openNew) { history.replaceState(null, '', '#/' + name); lastHash = name; openForm(name, null, onSaved); }
  }

  // ============ Formulir drawer generik ============
  function fieldHtml(f, v) {
    const id = 'fld-' + f.k, req = f.req ? '<span class="req" aria-hidden="true">*</span>' : '';
    const lab = '<label for="' + id + '">' + esc(f.label) + req + '</label>';
    const help = f.help ? '<span class="help">' + esc(f.help) + '</span>' : '';
    v = v === undefined || v === null ? '' : v;
    switch (f.type) {
      case 'textarea': return '<div class="field">' + lab + '<textarea class="textarea" id="' + id + '" data-k="' + f.k + '" rows="' + (f.rows || 5) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.req ? ' required' : '') + '>' + esc(v) + '</textarea>' + help + '</div>';
      case 'select': return '<div class="field">' + lab + '<select class="select" id="' + id + '" data-k="' + f.k + '"' + (f.req ? ' required' : '') + '><option value="">— Pilih —</option>' + f.opts.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + help + '</div>';
      case 'kategori': return '<div class="field">' + lab + '<select class="select" id="' + id + '" data-k="' + f.k + '"><option value="">— Tanpa kategori —</option>' + (A.kategori || []).map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === v ? ' selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select><span class="help">Kategori baru dibuat di menu Kategori.</span></div>';
      case 'toggle': return '<label class="switch"><input type="checkbox" data-k="' + f.k + '" ' + (bool(v) ? 'checked' : '') + '><span class="track"></span><span class="lbl">' + esc(f.label) + '</span></label>';
      case 'range': { const n = v === '' ? 80 : Number(v); return '<div class="field">' + lab + '<div style="display:flex;gap:12px;align-items:center"><input type="range" min="0" max="100" step="1" value="' + n + '" data-range style="flex:1;accent-color:var(--primary)" aria-label="' + esc(f.label) + '"><input class="input tnum" id="' + id + '" data-k="' + f.k + '" type="number" min="0" max="100" value="' + n + '" style="width:88px"><span>%</span></div></div>'; }
      case 'tags': return '<div class="field">' + lab + '<div class="tags-input" data-tags="' + f.k + '">' + String(v).split(',').map(function (t) { return t.trim(); }).filter(Boolean).map(tagChip).join('') +
        '<input id="' + id + '" type="text" placeholder="Ketik lalu Enter" autocomplete="off"></div>' + help + '</div>';
      case 'icon': return '<div class="field"><span class="label">' + esc(f.label) + '</span><input type="hidden" data-k="' + f.k + '" value="' + esc(v || 'sparkles') + '"><div class="icon-pick" role="radiogroup" aria-label="Pilih ikon">' + MV.ICON_CHOICES.map(function (n) {
        return '<button type="button" role="radio" data-icon="' + n + '" aria-pressed="' + (n === (v || 'sparkles')) + '" aria-checked="' + (n === (v || 'sparkles')) + '" aria-label="' + n + '" title="' + n + '">' + I(n) + '</button>';
      }).join('') + '</div></div>';
      case 'image': case 'file': return '<div class="field"><span class="label">' + esc(f.label) + '</span><div data-upload="' + f.k + '" data-folder="' + f.folder + '" data-kind="' + f.type + '"><input type="hidden" data-k="' + f.k + '" value="' + esc(v) + '"><div class="up-slot"></div></div>' + help + '</div>';
      case 'images': return '<div class="field"><span class="label">' + esc(f.label) + '</span><div data-gallery="' + f.k + '" data-folder="' + f.folder + '" data-max="' + (f.max || 10) + '"><input type="hidden" data-k="' + f.k + '" value="' + esc(v) + '"><div class="gal-grid"></div>' +
        '<label class="drop" style="margin-top:10px">' + I('upload') + '<span>Tambah gambar ke galeri</span><small>JPG, PNG, atau WebP — dikompres otomatis ±1 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-gal-input></label></div>' + help + '</div>';
      case 'slug': return '<div class="field">' + lab + '<input class="input mono" id="' + id + '" data-k="' + f.k + '" value="' + esc(v) + '" style="font-family:var(--font-mono);font-size:14px" placeholder="otomatis-dari-judul">' + help + '</div>';
      default: return '<div class="field">' + lab + '<input class="input" id="' + id + '" data-k="' + f.k + '" type="' + (f.type === 'url' ? 'url' : 'text') + '" value="' + esc(v) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.req ? ' required' : '') + '>' + help + '</div>';
    }
  }
  function tagChip(t) { return '<span class="tag-chip" data-tag-val="' + esc(t) + '">' + esc(t) + '<button type="button" aria-label="Hapus ' + esc(t) + '">' + I('x') + '</button></span>'; }

  function renderUploadSlot(box) {
    const v = $('input[data-k]', box).value, kind = box.dataset.kind, slot = $('.up-slot', box);
    if (v) {
      slot.innerHTML = '<div class="up-preview"><span class="ph">' + MV.imgTag(v, '', 300) + (kind === 'file' ? I('file-text') : '') + '</span><div class="meta"><b>Berkas tersimpan di Drive</b><span class="mono" style="font-size:11.5px">' + esc(v.slice(0, 18)) + '…</span></div>' +
        '<div class="up-actions"><button type="button" class="btn btn-ghost btn-sm" data-preview>' + I('eye', 'icon-sm') + 'Lihat</button><label class="btn btn-secondary btn-sm" style="position:relative;overflow:hidden">' + I('refresh', 'icon-sm') + 'Ganti<input type="file" data-file accept="' + (kind === 'file' ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp') + '" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
        '<button type="button" class="btn btn-sm up-del" data-clear>' + I('trash', 'icon-sm') + 'Hapus</button></div></div>';
    } else {
      slot.innerHTML = '<label class="drop">' + I(kind === 'file' ? 'file-text' : 'image') + '<span>Seret berkas ke sini atau klik untuk memilih</span><small>' + (kind === 'file' ? 'Gambar (dikompres otomatis) atau PDF maks. 5 MB' : 'JPG, PNG, atau WebP — dikompres otomatis ±1 MB') + '</small>' +
        '<input type="file" data-file accept="' + (kind === 'file' ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp') + '"></label>';
    }
  }
  function renderGallery(box) {
    const ids = $('input[data-k]', box).value.split(',').filter(Boolean);
    $('.gal-grid', box).innerHTML = ids.map(function (id) { return '<div class="gal-item" data-gid="' + esc(id) + '">' + MV.imgTag(id, '', 300) + '<button type="button" data-gdel aria-label="Hapus gambar">' + I('x') + '</button></div>'; }).join('');
  }
  async function handleUpload(box, file, onDone) {
    const slot = $('.up-slot', box);
    slot.innerHTML = '<div class="up-preview"><span class="ph">' + I('upload') + '</span><div class="meta"><b>' + esc(file.name) + '</b>Mengunggah ke Google Drive…<div class="progress"><i></i></div></div></div>';
    try {
      const r = await uploadFile(file, box.dataset.folder, { pdf: box.dataset.kind === 'file', pdfOnly: box.dataset.pdfonly === '1' });
      $('input[data-k]', box).value = r.id;
      MV.toast('Berkas terunggah.', 'ok');
      if (onDone) await onDone(r);
    } catch (err) { MV.toast(err.message, 'err', 6000); }
    renderUploadSlot(box);
  }
  function bindUploads(root, onFileSaved) {
    $$('[data-upload]', root).forEach(renderUploadSlot);
    $$('[data-gallery]', root).forEach(renderGallery);
    root.addEventListener('change', async function (e) {
      const fi = e.target.closest('input[data-file]');
      if (fi && fi.files[0]) { const box = fi.closest('[data-upload]'); A.dirty = true; await handleUpload(box, fi.files[0], onFileSaved ? function (r) { return onFileSaved(box, r); } : null); return; }
      const gi = e.target.closest('input[data-gal-input]');
      if (gi && gi.files.length) {
        const box = gi.closest('[data-gallery]'), hid = $('input[data-k]', box), max = Number(box.dataset.max);
        const files = Array.from(gi.files);
        gi.value = '';
        for (const file of files) {
          const ids = hid.value.split(',').filter(Boolean);
          if (ids.length >= max) { MV.toast('Galeri maksimal ' + max + ' gambar.', 'err'); break; }
          const ph = document.createElement('div'); ph.className = 'gal-item uploading'; ph.innerHTML = '<div style="width:70%"><div class="progress"><i></i></div></div>';
          $('.gal-grid', box).appendChild(ph);
          try { const r = await uploadFile(file, box.dataset.folder); hid.value = ids.concat([r.id]).join(','); A.dirty = true; }
          catch (err) { MV.toast(err.message, 'err', 6000); }
          renderGallery(box);
        }
      }
    });
    root.addEventListener('click', async function (e) {
      const box = e.target.closest('[data-upload]');
      if (box && e.target.closest('[data-clear]')) {
        const nama = (($('.label', box.closest('.field')) || {}).textContent || 'berkas ini').trim();
        const ok = await confirmDialog({ title: 'Hapus ' + nama.toLowerCase() + '?', text: 'Berkas dilepas dari isian ini' + (onFileSaved ? ' dan langsung tersimpan.' : '. Klik Simpan / Perbarui Terbitan agar perubahan tampil di situs.') + ' Berkas aslinya tetap ada di Google Drive.', ok: 'Hapus', danger: true, icon: 'trash' });
        if (!ok) return;
        $('input[data-k]', box).value = ''; A.dirty = true; renderUploadSlot(box);
        if (onFileSaved) onFileSaved(box, { id: '' });
        else MV.toast('Dilepas. Jangan lupa klik Simpan / Perbarui Terbitan.', 'info', 5000);
        return;
      }
      if (box && e.target.closest('[data-preview]')) { MV.viewer.open({ type: 'pdf', id: $('input[data-k]', box).value, title: 'Pratinjau berkas', note: 'Pratinjau seperti yang dilihat pengunjung.' }); return; }
      const gd = e.target.closest('[data-gdel]');
      if (gd) { const g = gd.closest('[data-gallery]'), hid = $('input[data-k]', g), id = gd.closest('[data-gid]').dataset.gid; hid.value = hid.value.split(',').filter(function (x) { return x && x !== id; }).join(','); A.dirty = true; renderGallery(g); }
    });
    ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
      root.addEventListener(ev, function (e) {
        const d = e.target.closest('.drop');
        if (!d) return;
        if (ev === 'dragover') { e.preventDefault(); d.classList.add('is-over'); }
        else d.classList.remove('is-over');
        if (ev === 'drop') {
          e.preventDefault();
          const inp = $('input[type=file]', d);
          if (inp && e.dataTransfer.files.length) { try { inp.files = e.dataTransfer.files; } catch (x) { /* abaikan */ } inp.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      });
    });
  }
  function bindTags(root) {
    root.addEventListener('keydown', function (e) {
      const inp = e.target.closest('.tags-input input');
      if (!inp) return;
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inp); }
      else if (e.key === 'Backspace' && !inp.value) { const chips = $$('.tag-chip', inp.parentElement); if (chips.length) { chips[chips.length - 1].remove(); A.dirty = true; } }
    });
    root.addEventListener('focusout', function (e) { const inp = e.target.closest('.tags-input input'); if (inp && inp.value.trim()) addTag(inp); });
    root.addEventListener('paste', function (e) {
      const inp = e.target.closest('.tags-input input');
      if (!inp) return;
      const t = (e.clipboardData || window.clipboardData).getData('text');
      if (t.indexOf(',') > -1) { e.preventDefault(); t.split(',').forEach(function (x) { inp.value = x; addTag(inp); }); }
    });
    root.addEventListener('click', function (e) {
      const x = e.target.closest('.tag-chip button');
      if (x) { x.closest('.tag-chip').remove(); A.dirty = true; return; }
      const box = e.target.closest('.tags-input');
      if (box && e.target === box) $('input', box).focus();
    });
  }
  function addTag(inp) {
    const v = inp.value.replace(/,/g, '').trim();
    inp.value = '';
    if (!v) return;
    const box = inp.parentElement;
    if ($$('.tag-chip', box).some(function (c) { return c.dataset.tagVal.toLowerCase() === v.toLowerCase(); })) return;
    inp.insertAdjacentHTML('beforebegin', tagChip(v.slice(0, 40)));
    A.dirty = true;
  }
  function collect(root) {
    const out = {};
    $$('[data-k]', root).forEach(function (el) {
      const k = el.dataset.k;
      out[k] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    $$('[data-tags]', root).forEach(function (box) {
      out[box.dataset.tags] = $$('.tag-chip', box).map(function (c) { return c.dataset.tagVal; }).join(', ');
    });
    return out;
  }

  function openForm(name, item, onSaved) {
    const def = ENT[name], isNew = !item;
    item = item || { tampil: 'TRUE' };
    let sheet = $('#sheet');
    if (sheet) sheet.remove();
    sheet = document.createElement('div');
    sheet.id = 'sheet'; sheet.className = 'sheet is-open';
    sheet.innerHTML = '<div class="modal-backdrop" data-sheet-close></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
      '<div class="sheet-head"><div><h2 id="sheet-title">' + (isNew ? 'Tambah ' : 'Ubah ') + esc(def.sing) + '</h2><small>' + (isNew ? 'Data baru tampil paling atas di daftar.' : 'Perubahan langsung tampil di situs setelah disimpan.') + '</small></div>' +
      '<button type="button" class="icon-btn" data-sheet-close aria-label="Tutup">' + I('x') + '</button></div>' +
      '<form class="sheet-body" id="sheet-form" novalidate>' + def.form.map(function (s) {
        return '<section class="fsec"><div class="fsec-title">' + esc(s.sec) + '</div>' + s.f.map(function (f) {
          return f.row ? '<div class="frow">' + f.row.map(function (g) { return fieldHtml(g, item[g.k]); }).join('') + '</div>' : fieldHtml(f, item[f.k]);
        }).join('') + '</section>';
      }).join('') +
      '<section class="fsec"><div class="fsec-title">Tampilan</div>' + fieldHtml({ k: 'tampil', label: 'Tampilkan di situs publik', type: 'toggle' }, item.tampil === '' ? 'TRUE' : item.tampil) + '</section>' +
      '<div id="sheet-err" role="alert"></div></form>' +
      '<div class="sheet-foot"><button type="button" class="btn btn-secondary" data-sheet-close>Batal</button><button type="submit" form="sheet-form" class="btn btn-primary" id="sheet-save">' + I('check', 'icon-sm') + 'Simpan</button></div></div>';
    document.body.appendChild(sheet);
    document.body.style.overflow = 'hidden';
    A.dirty = false;
    const form = $('#sheet-form', sheet);
    bindUploads(form);
    bindTags(form);
    form.addEventListener('input', function (e) {
      A.dirty = true;
      if (e.target.matches('[data-range]')) $('[data-k="tingkat"]', form).value = e.target.value;
      if (e.target.matches('[data-k="tingkat"]')) { const r = $('[data-range]', form); if (r) r.value = e.target.value; }
      if (e.target.matches('[data-k="judul"]') && isNew) {
        const s = $('[data-k="slug"]', form);
        if (s && !s.dataset.touched) s.value = e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
      }
      if (e.target.matches('[data-k="slug"]')) e.target.dataset.touched = '1';
    });
    form.addEventListener('click', function (e) {
      const ib = e.target.closest('[data-icon]');
      if (!ib) return;
      $$('[data-icon]', form).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-checked', 'false'); });
      ib.setAttribute('aria-pressed', 'true'); ib.setAttribute('aria-checked', 'true');
      $('[data-k="ikon"]', form).value = ib.dataset.icon;
      A.dirty = true;
    });
    const close = async function () {
      if (A.dirty && !(await confirmDialog({ title: 'Tutup tanpa menyimpan?', text: 'Perubahan pada formulir ini akan hilang.', ok: 'Tutup', danger: true }))) return;
      A.dirty = false; sheet.remove(); document.body.style.overflow = '';
    };
    sheet.addEventListener('click', function (e) { if (e.target.closest('[data-sheet-close]')) close(); });
    sheet.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('.confirm')) close(); });
    setTimeout(function () { const first = $('input:not([type=hidden]):not([type=checkbox]),select,textarea', form); if (first) first.focus(); }, 60);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = collect(form), err = $('#sheet-err', sheet);
      const missing = [];
      def.form.forEach(function (s) { s.f.forEach(function (f) { (f.row || [f]).forEach(function (g) { if (g.req && !String(data[g.k] || '').trim()) missing.push(g); }); }); });
      $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
      if (missing.length) {
        missing.forEach(function (g) { const el = $('#fld-' + g.k, form); if (el) el.setAttribute('aria-invalid', 'true'); });
        err.innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>Lengkapi: ' + missing.map(function (g) { return esc(g.label); }).join(', ') + '.</span></div>';
        const el = $('#fld-' + missing[0].k, form); if (el) el.focus();
        return;
      }
      $$('input[type=url][data-k]', form).forEach(function (u) { if (u.value && !/^https?:\/\//i.test(u.value)) u.value = 'https://' + u.value; data[u.dataset.k] = u.value; });
      if (!isNew) data.id = item.id;
      const btn = $('#sheet-save', sheet);
      busy(btn, true);
      const r = await write(name + '.save', { item: data }, [name + '.list']);
      busy(btn, false);
      if (!r.ok) { err.innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>' + esc(failMsg(r)) + '</span></div>'; return; }
      A.dirty = false;
      sheet.remove(); document.body.style.overflow = '';
      MV.toast(isNew ? def.sing + ' ditambahkan.' : 'Perubahan disimpan.', 'ok');
      if (onSaved) onSaved(r.data, isNew);
      refreshBadges();
    });
  }

  // ============ Profil & Kontak (AD-04) ============
  async function pageProfil(view, tab) {
    const res = await Promise.all([load('kv.get', { tab: 'Profil' }), load('kv.get', { tab: 'Kontak' })]);
    if (!res[0].ok) throw new Error(failMsg(res[0]));
    const p = res[0].data, k = res[1].ok ? res[1].data : {};
    let sos = [];
    try { sos = JSON.parse(k.sosial || '[]'); } catch (e) { sos = []; }
    view.innerHTML = '<div class="page-head"><div><h2>Profil &amp; Kontak</h2><p>Identitas yang tampil di Home, About, Contact, dan footer situs.</p></div>' +
      '<div class="actions"><a class="btn btn-secondary" href="index.html#home" target="_blank" rel="noopener">' + I('eye', 'icon-sm') + 'Lihat di situs</a></div></div>' +
      '<div class="tabs" role="tablist"><button role="tab" data-tab="profil" aria-selected="' + (tab === 'profil') + '">Profil</button><button role="tab" data-tab="kontak" aria-selected="' + (tab === 'kontak') + '">Kontak &amp; Sosial</button></div>' +
      '<div id="tab-profil"' + (tab === 'profil' ? '' : ' hidden') + '><form id="f-profil" class="set-grid" novalidate>' +
      '<div class="card card-pad" style="display:grid;gap:18px;align-content:start"><h3 class="h3">Foto &amp; dokumen</h3><p class="muted" style="font-size:14px;margin-top:-10px">Berkas langsung tersimpan setelah diunggah.</p>' +
      fieldHtml({ k: 'foto_id', label: 'Foto profil (hero)', type: 'image', folder: 'profil', help: 'Potret tegak (4:5). Agar menyatu dengan latar seperti contoh, pakai PNG tanpa latar belakang (transparan).' }, p.foto_id) +
      fieldHtml({ k: 'foto_tentang_id', label: 'Foto bagian About (opsional)', type: 'image', folder: 'profil', help: 'Kosongkan untuk memakai foto profil.' }, p.foto_tentang_id) +
      fieldHtml({ k: 'hero_bg_id', label: 'Foto latar hero (opsional)', type: 'image', folder: 'profil', help: 'Foto lanskap lebar (mis. pemandangan). Kosongkan untuk memakai ilustrasi pegunungan bawaan.' }, p.hero_bg_id) +
      '<div class="field"><span class="label">CV (PDF)</span><div data-upload="cv_file_id" data-folder="profil" data-kind="file" data-pdfonly="1"><input type="hidden" data-k="cv_file_id" value="' + esc(p.cv_file_id) + '"><div class="up-slot"></div></div><span class="help">Ditampilkan lewat tombol "View CV" tanpa tombol unduh.</span></div></div>' +
      '<div class="card card-pad" style="display:grid;gap:16px;align-content:start"><h3 class="h3">Identitas</h3>' +
      fieldHtml({ k: 'nama', label: 'Nama lengkap', req: 1, max: 80 }, p.nama) +
      fieldHtml({ k: 'profesi', label: 'Profesi', max: 140, help: 'Apit kata dengan *bintang* agar berwarna biru, contoh: Web Developer & *Digital Learning* Creator' }, p.profesi) +
      fieldHtml({ k: 'peran_bergilir', label: 'Peran bergantian di hero (opsional)', max: 300, ph: 'Web Developer, English Educator, E-Learning Designer', help: 'Isi 2 peran atau lebih, pisahkan dengan koma — tampil bergantian seperti diketik. Kosongkan untuk memakai Profesi.' }, p.peran_bergilir) +
      '<div class="frow">' + fieldHtml({ k: 'tagline', label: 'Keterangan di samping logo', max: 60 }, p.tagline) + fieldHtml({ k: 'status_saat_ini', label: 'Status (kartu melayang)', max: 80, ph: 'Open for collaboration' }, p.status_saat_ini) + '</div>' +
      '<div class="frow">' + fieldHtml({ k: 'lokasi', label: 'Lokasi', max: 80 }, p.lokasi) + fieldHtml({ k: 'tahun_mulai_karier', label: 'Tahun mulai berkarier', max: 4, ph: '2019', help: 'Untuk angka "Years Experience".' }, p.tahun_mulai_karier) + '</div>' +
      fieldHtml({ k: 'deskripsi_singkat', label: 'Perkenalan singkat (hero)', type: 'textarea', rows: 3, max: 320 }, p.deskripsi_singkat) +
      fieldHtml({ k: 'bahasa', label: 'Bahasa yang dikuasai (kartu info About)', max: 120, ph: 'Indonesia, English' }, p.bahasa) + '</div>' +
      '<div class="card card-pad full" style="display:grid;gap:16px"><h3 class="h3">About Me</h3>' +
      fieldHtml({ k: 'judul_tentang', label: 'Judul besar bagian About', max: 120, ph: 'Building Solutions That Make an Impact', help: 'Kosongkan untuk "Who I Am". Apit kata dengan *bintang* agar berwarna biru.' }, p.judul_tentang) + '<div class="frow">' +
      fieldHtml({ k: 'tentang', label: 'Latar belakang', type: 'textarea', rows: 6, max: 2500, help: 'Pisahkan paragraf dengan baris kosong.' }, p.tentang) +
      fieldHtml({ k: 'kepribadian_profesional', label: 'Kepribadian profesional', type: 'textarea', rows: 6, max: 2500 }, p.kepribadian_profesional) + '</div>' +
      fieldHtml({ k: 'perjalanan_karier', label: 'Perjalanan karier', type: 'textarea', rows: 4, max: 2500, help: 'Satu baris per tonggak: Tahun | Judul | Keterangan (maks. 5 baris).' }, p.perjalanan_karier) +
      '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" id="save-profil">' + I('check', 'icon-sm') + 'Simpan Perubahan</button></div></div></form></div>' +
      '<div id="tab-kontak"' + (tab === 'kontak' ? '' : ' hidden') + '><form id="f-kontak" class="set-grid" novalidate>' +
      '<div class="card card-pad" style="display:grid;gap:16px;align-content:start"><h3 class="h3">Informasi kontak</h3>' +
      fieldHtml({ k: 'email', label: 'Email (tampil di situs)', type: 'text', max: 120 }, k.email) + fieldHtml({ k: 'telepon', label: 'Telepon / WhatsApp', max: 30, ph: '0812…' }, k.telepon) + fieldHtml({ k: 'lokasi', label: 'Lokasi', max: 120 }, k.lokasi) +
      '<p class="help">Notifikasi pesan dikirim ke email di Pengaturan → Situs (bisa berbeda dari email publik).</p></div>' +
      '<div class="card card-pad" style="display:grid;gap:14px;align-content:start"><h3 class="h3">Media sosial</h3><div id="soc-rows" style="display:grid;gap:10px"></div>' +
      '<button type="button" class="btn btn-secondary" id="soc-add">' + I('plus', 'icon-sm') + 'Tambah Media Sosial</button>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn btn-primary" type="submit" id="save-kontak">' + I('check', 'icon-sm') + 'Simpan Perubahan</button></div></div></form></div>';

    const fp = $('#f-profil'), fk = $('#f-kontak');
    bindUploads(fp, async function (box, r) {
      const key = $('input[data-k]', box).dataset.k, values = {}; values[key] = r.id || '';
      const s = await write('kv.save', { tab: 'Profil', values: values }, ['kv.get']);
      if (s.ok) MV.toast(r.id ? 'Berkas profil diperbarui di situs.' : 'Berkas dilepas dari profil.', 'ok'); else MV.toast(failMsg(s), 'err');
      A.dirty = false;
    });
    const socRow = function (x) {
      return '<div class="soc-row"><select class="select" aria-label="Platform">' + MV.SOCIALS.map(function (pf) { return '<option value="' + pf + '"' + (pf === x.platform ? ' selected' : '') + '>' + pf.charAt(0).toUpperCase() + pf.slice(1) + '</option>'; }).join('') + '</select>' +
        '<input class="input" type="url" placeholder="https://…" value="' + esc(x.url || '') + '" aria-label="Tautan"><button type="button" class="icon-btn danger" data-soc-del aria-label="Hapus">' + I('trash') + '</button></div>';
    };
    const sr = $('#soc-rows');
    sr.innerHTML = (sos.length ? sos : [{ platform: 'linkedin', url: '' }]).map(socRow).join('');
    $('#soc-add').addEventListener('click', function () { sr.insertAdjacentHTML('beforeend', socRow({ platform: 'website', url: '' })); A.dirty = true; });
    sr.addEventListener('click', function (e) { const d = e.target.closest('[data-soc-del]'); if (d) { d.closest('.soc-row').remove(); A.dirty = true; } });
    [fp, fk].forEach(function (f) { f.addEventListener('input', function () { A.dirty = true; }); });
    view.querySelector('.tabs').addEventListener('click', function (e) {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      history.replaceState(null, '', '#/' + b.dataset.tab); lastHash = b.dataset.tab;
      $$('[data-tab]', view).forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      $('#tab-profil').hidden = b.dataset.tab !== 'profil'; $('#tab-kontak').hidden = b.dataset.tab !== 'kontak';
      $$('[data-menu]').forEach(function (a) { a.classList.toggle('is-active', a.dataset.menu === b.dataset.tab); });
    });
    fp.addEventListener('submit', async function (e) {
      e.preventDefault();
      const v = collect(fp);
      delete v.foto_id; delete v.foto_tentang_id; delete v.cv_file_id; delete v.hero_bg_id;
      if (!v.nama) { MV.toast('Nama wajib diisi.', 'err'); $('#fld-nama').focus(); return; }
      const btn = $('#save-profil'); busy(btn, true);
      const r = await write('kv.save', { tab: 'Profil', values: v }, ['kv.get']);
      busy(btn, false);
      if (r.ok) { A.dirty = false; MV.toast('Profil disimpan.', 'ok'); refreshBadges(true); } else MV.toast(failMsg(r), 'err');
    });
    fk.addEventListener('submit', async function (e) {
      e.preventDefault();
      const v = collect(fk);
      const rows = $$('.soc-row', sr).map(function (row) { return { platform: $('select', row).value, url: $('input', row).value.trim() }; })
        .filter(function (x) { return x.url; }).map(function (x) { if (!/^https?:\/\//i.test(x.url)) x.url = 'https://' + x.url; return x; });
      v.sosial = JSON.stringify(rows);
      const btn = $('#save-kontak'); busy(btn, true);
      const r = await write('kv.save', { tab: 'Kontak', values: v }, ['kv.get']);
      busy(btn, false);
      if (r.ok) { A.dirty = false; MV.toast('Kontak & media sosial disimpan.', 'ok'); } else MV.toast(failMsg(r), 'err');
    });
  }

  // ============ Blog & karya ilmiah: daftar (AD-06, v1.1) ============
  const DOC_MIME = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  const DOC_LABEL = { 'application/pdf': 'PDF', 'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX' };
  const fmtSize = function (b) { b = Number(b) || 0; return b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB'; };
  const isKarya = function (a) { return a.jenis === 'Karya Ilmiah'; };
  async function pageBlogList(view) {
    const r = await load('artikel.list', {});
    if (!r.ok) throw new Error(failMsg(r));
    let items = r.data.items, q = '', sf = '', jf = '';
    view.innerHTML = '<div class="page-head"><div><h2>Blog &amp; Karya Ilmiah</h2><p>Tulis artikel atau unggah penelitian/karya ilmiah (PDF/Word). Simpan sebagai draf, lalu terbitkan saat siap. Hanya yang berstatus Terbit yang tampil di situs.</p></div>' +
      '<div class="actions"><a class="btn btn-secondary" href="#/blog/karya">' + I('upload', 'icon-sm') + 'Unggah Karya Ilmiah</a><a class="btn btn-primary" href="#/blog/baru">' + I('pen-tool', 'icon-sm') + 'Tulis Artikel</a></div></div>' +
      '<div class="card filters"><div class="search-box">' + I('search') + '<input class="input" id="b-q" type="search" placeholder="Cari judul, penulis…" aria-label="Cari"></div>' +
      '<select class="select" id="b-j" aria-label="Jenis"><option value="">Semua jenis</option><option>Artikel</option><option>Karya Ilmiah</option></select>' +
      '<select class="select" id="b-s" aria-label="Status"><option value="">Semua status</option><option>Terbit</option><option>Draf</option></select><span class="count-note" id="b-count"></span></div>' +
      '<div class="card" style="overflow:hidden"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:80px"></th><th>Judul</th><th>Jenis</th><th>Status</th><th>Tanggal</th><th>Suka</th><th style="text-align:right">Aksi</th></tr></thead><tbody id="b-rows"></tbody></table></div></div>';
    const draw = function () {
      if (!view.isConnected) return;
      const list = items.filter(function (a) {
        return (!sf || a.status === sf) && (!jf || (isKarya(a) ? 'Karya Ilmiah' : 'Artikel') === jf) &&
          (!q || (a.judul + ' ' + (a.penulis || '')).toLowerCase().indexOf(q) > -1);
      });
      const nk = items.filter(isKarya).length;
      $('#b-count').textContent = list.length + ' item · ' + (items.length - nk) + ' artikel, ' + nk + ' karya ilmiah';
      $('#b-rows').innerHTML = list.length ? list.map(function (a) {
        const k = isKarya(a), lab = DOC_LABEL[a.berkas_mime] || '';
        const sub = k ? [lab && a.berkas_ukuran ? lab + ' · ' + fmtSize(a.berkas_ukuran) : (a.berkas_id ? lab : 'Belum ada berkas'), a.penulis].filter(Boolean).join(' · ') : '/artikel/' + a.slug + ' · ' + a.waktu_baca + ' mnt baca';
        return '<tr data-id="' + esc(a.id) + '"><td>' + (k && !a.sampul_id ? '<span class="thumb doc-thumb' + (lab === 'PDF' ? '' : ' word') + '">' + esc(lab || 'DOC') + '</span>' : thumb(a.sampul_id, a.judul, a.id)) + '</td>' +
          '<td class="title-cell cell-main"><b>' + esc(a.judul) + '</b><small class="' + (k ? '' : 'mono') + '">' + esc(sub) + '</small></td>' +
          '<td data-label="Jenis">' + (k ? '<span class="st st-karya">' + I('file-badge', 'icon-sm') + 'Karya Ilmiah</span>' : '<span class="st st-artikel">' + I('pen-tool', 'icon-sm') + 'Artikel</span>') + '</td>' +
          '<td data-label="Status">' + stPill(a.status) + (bool(a.tampil) || a.tampil === '' ? '' : ' <span class="st st-hidden">Disembunyikan</span>') + '</td>' +
          '<td data-label="Tanggal" class="tnum">' + esc(tglID(a.tanggal_terbit || a.dibuat)) + '</td><td data-label="Suka"><span class="heart-n">' + I('heart', 'icon-sm') + (a.suka || 0) + '</span></td>' +
          '<td class="cell-actions"><div class="row-actions">' + (a.status === 'Terbit' ? '<a class="icon-btn" href="artikel.html?slug=' + encodeURIComponent(a.slug) + '" target="_blank" rel="noopener" aria-label="Lihat di situs">' + I('eye') + '</a>' : '') +
          '<a class="icon-btn" href="#/blog/' + esc(a.id) + '" aria-label="Ubah">' + I('pencil') + '</a><button type="button" class="icon-btn danger" data-del aria-label="Hapus">' + I('trash') + '</button></div></td></tr>';
      }).join('') : '<tr><td colspan="7"><div class="empty" style="border:0">' + I('file-text') + '<p><strong>' + (items.length ? 'Tidak ada yang cocok.' : 'Belum ada artikel atau karya ilmiah.') + '</strong></p></div></td></tr>';
    };
    draw();
    $('#b-q').addEventListener('input', MV.debounce(function (e) { q = e.target.value.toLowerCase().trim(); draw(); }, 150));
    $('#b-s').addEventListener('change', function (e) { sf = e.target.value; draw(); });
    $('#b-j').addEventListener('change', function (e) { jf = e.target.value; draw(); });
    view.addEventListener('click', async function (e) {
      if (!e.target.closest('[data-del]')) return;
      const id = e.target.closest('tr').dataset.id, a = items.find(function (x) { return x.id === id; });
      if (!(await confirmDialog({ title: 'Hapus "' + a.judul + '"?', text: 'Data dihapus permanen dari Sheets. Gambar sampul' + (isKarya(a) ? ' dan berkas dokumen' : '') + ' dipindah ke Sampah Drive (masih bisa dipulihkan dari sana).', ok: 'Hapus', danger: true, icon: 'trash' }))) return;
      const r2 = await write('artikel.delete', { id: id }, ['artikel.list']);
      if (r2.ok) { items = items.filter(function (x) { return x.id !== id; }); draw(); MV.toast('Dihapus.', 'ok'); } else MV.toast(failMsg(r2), 'err');
    });
  }

  // ============ Blog: editor artikel & karya ilmiah (AD-06, v1.1) ============
  function loadQuill() {
    if (window.Quill) return Promise.resolve(true);
    return new Promise(function (resolve) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js';
      const t = setTimeout(function () { resolve(false); }, 8000);
      s.onload = function () { clearTimeout(t); resolve(!!window.Quill); };
      s.onerror = function () { clearTimeout(t); resolve(false); };
      document.head.appendChild(s);
    });
  }
  async function uploadDoc(file) {
    const ext = (String(file.name).split('.').pop() || '').toLowerCase();
    const mime = DOC_MIME[ext] || (DOC_LABEL[file.type] ? file.type : '');
    if (!mime) throw new Error('Gunakan berkas PDF, DOC, atau DOCX.');
    if (file.size > 10e6) throw new Error('Berkas maksimal 10 MB (berkas ini ' + (file.size / 1e6).toFixed(1).replace('.', ',') + ' MB). Kompres PDF-nya atau simpan ulang Word dengan gambar beresolusi lebih kecil.');
    const data = await toDataUrl(file);
    const r = await MV.api('file.upload', { folder: 'dokumen', name: file.name, mime: mime, base64: data.split(',')[1] }, { timeout: 240000 });
    if (!r.ok) throw new Error(failMsg(r));
    if (r.data.peringatan) MV.toast(r.data.peringatan, 'info', 8000);
    return { id: r.data.id, nama: String(file.name).slice(0, 140), mime: mime, ukuran: file.size };
  }
  async function pageEditor(view, id, jenisBaru) {
    let a = { judul: '', slug: '', ringkasan: '', isi_html: '', sampul_id: '', tag: '', status: 'Draf', tanggal_terbit: '', tampil: 'TRUE',
      jenis: jenisBaru || 'Artikel', berkas_id: '', berkas_nama: '', berkas_mime: '', berkas_ukuran: '', penulis: '', abstrak: '', penerbit: '', doi: '', boleh_unduh: 'FALSE' };
    if (id) {
      const r = await load('artikel.list', { id: id }, { maxAge: 5000 });
      if (!r.ok || !r.data.items.length) throw new Error(r.ok ? 'Artikel tidak ditemukan.' : failMsg(r));
      a = Object.assign(a, r.data.items[0]);
      if (a.jenis !== 'Karya Ilmiah') a.jenis = 'Artikel';
    }
    let jenis = a.jenis;
    const judulHalaman = function () { return (id ? 'Ubah ' : jenis === 'Karya Ilmiah' ? 'Unggah ' : 'Tulis ') + (jenis === 'Karya Ilmiah' ? 'Karya Ilmiah' : 'Artikel'); };
    view.innerHTML = '<div class="page-head"><div><a class="back-link" href="#/blog">' + I('arrow-left', 'icon-sm') + 'Kembali ke daftar</a><h2 style="margin-top:4px" id="ed-h">' + judulHalaman() + '</h2></div>' +
      '<div class="actions">' + stPill(a.status) + '</div></div>' +
      '<div class="kind-switch" role="radiogroup" aria-label="Jenis tulisan"><button type="button" role="radio" data-jenis="Artikel">' + I('pen-tool', 'icon-sm') + 'Artikel<small>Tulis langsung di editor</small></button>' +
      '<button type="button" role="radio" data-jenis="Karya Ilmiah">' + I('file-badge', 'icon-sm') + 'Karya Ilmiah<small>Unggah PDF / Word penelitian</small></button></div>' +
      '<div class="editor-grid"><div class="card card-pad"><label class="sr-only" for="ed-title">Judul</label><input class="title-input" id="ed-title" placeholder="Judul…" maxlength="180" value="' + esc(a.judul) + '">' +
      '<section id="doc-panel" class="doc-panel"><div class="fsec-title">Berkas dokumen</div><div id="doc-slot"></div>' +
      '<input type="hidden" data-k="berkas_id" value="' + esc(a.berkas_id) + '"><input type="hidden" data-k="berkas_nama" value="' + esc(a.berkas_nama) + '">' +
      '<input type="hidden" data-k="berkas_mime" value="' + esc(a.berkas_mime) + '"><input type="hidden" data-k="berkas_ukuran" value="' + esc(a.berkas_ukuran) + '">' +
      fieldHtml({ k: 'penulis', label: 'Penulis', type: 'textarea', rows: 2, max: 300, help: 'Pisahkan beberapa penulis dengan titik koma (;), contoh: Restu Putra Mulyana; Dr. Ani Lestari' }, a.penulis) +
      fieldHtml({ k: 'abstrak', label: 'Abstrak', type: 'textarea', rows: 7, max: 5000, help: 'Tampil di atas pratinjau dokumen dan dipakai sebagai ringkasan kartu bila Ringkasan kosong.' }, a.abstrak) +
      '<div class="frow">' + fieldHtml({ k: 'penerbit', label: 'Jurnal / konferensi / institusi', max: 200, ph: 'Jurnal Pendidikan Bahasa Inggris, Vol. 5 No. 2' }, a.penerbit) +
      fieldHtml({ k: 'doi', label: 'DOI atau tautan sumber (opsional)', max: 200, ph: '10.1234/abcd.2025.01 atau https://…' }, a.doi) + '</div></section>' +
      '<div class="ed-label" id="ed-label"></div><div id="editor-wrap"><div class="muted" style="padding:24px 0">Memuat editor…</div></div></div>' +
      '<aside class="side-panel"><div class="card card-pad" style="display:grid;gap:16px"><h3 class="h3">Pengaturan</h3>' +
      '<div id="doc-side">' + fieldHtml({ k: 'boleh_unduh', label: 'Izinkan pengunjung mengunduh berkas', type: 'toggle' }, a.boleh_unduh) +
      '<p class="help" style="margin-top:6px">Mati: pengunjung hanya bisa membaca (tombol unduh/cetak Drive dimatikan). Nyala: tombol Download tampil.</p></div>' +
      fieldHtml({ k: 'slug', label: 'Slug', type: 'slug', help: 'Kosongkan agar dibuat dari judul.' }, a.slug) +
      fieldHtml({ k: 'ringkasan', label: 'Ringkasan kartu', type: 'textarea', rows: 3, max: 400 }, a.ringkasan) +
      fieldHtml({ k: 'tag', label: 'Tag / kata kunci', type: 'tags' }, a.tag) +
      fieldHtml({ k: 'sampul_id', label: 'Gambar sampul (opsional)', type: 'image', folder: 'blog' }, a.sampul_id) +
      fieldHtml({ k: 'tanggal_terbit', label: 'Tanggal terbit', ph: 'Otomatis saat diterbitkan' }, a.tanggal_terbit) +
      fieldHtml({ k: 'tampil', label: 'Tampilkan di situs', type: 'toggle' }, a.tampil === '' ? 'TRUE' : a.tampil) + '</div>' +
      '<div class="card card-pad" style="display:grid;gap:10px"><button type="button" class="btn btn-secondary" id="ed-preview">' + I('eye', 'icon-sm') + 'Pratinjau</button>' +
      '<button type="button" class="btn btn-secondary" id="ed-draft">' + I('file-text', 'icon-sm') + 'Simpan Draf</button><button type="button" class="btn btn-primary" id="ed-publish">' + I('send', 'icon-sm') + (a.status === 'Terbit' ? 'Perbarui Terbitan' : 'Terbitkan') + '</button>' +
      '<p class="help" id="ed-note"></p></div></aside></div>';
    const side = $('.side-panel', view), docPanel = $('#doc-panel'), slot = $('#doc-slot');
    bindUploads(side); bindTags(side); bindUploads(docPanel);
    $('#fld-tanggal_terbit').type = 'date';
    const hv = function (k) { return $('[data-k="' + k + '"]', docPanel); };
    const terapkanJenis = function () {
      const k = jenis === 'Karya Ilmiah';
      $$('[data-jenis]', view).forEach(function (b) { const on = b.dataset.jenis === jenis; b.setAttribute('aria-checked', String(on)); b.classList.toggle('is-on', on); });
      docPanel.hidden = !k; $('#doc-side').hidden = !k;
      $('#ed-label').textContent = k ? 'Catatan tambahan (opsional) — mis. latar belakang, metode singkat, atau ucapan terima kasih' : '';
      $('#ed-label').hidden = !k;
      $('#ed-title').placeholder = k ? 'Judul penelitian / karya ilmiah…' : 'Judul artikel…';
      $('#ed-h').textContent = judulHalaman();
      const lbl = $('label[for="fld-ringkasan"]');
      if (lbl) lbl.textContent = k ? 'Ringkasan kartu (opsional — kosong = potongan abstrak)' : 'Ringkasan kartu';
    };
    const renderDoc = function (busyFile) {
      const did = hv('berkas_id').value, mime = hv('berkas_mime').value, lab = DOC_LABEL[mime] || 'DOK';
      if (busyFile) {
        slot.innerHTML = '<div class="up-preview"><span class="ph">' + I('upload') + '</span><div class="meta"><b>' + esc(busyFile.name) + '</b>Mengunggah ke Google Drive… (' + fmtSize(busyFile.size) + ')<div class="progress"><i></i></div></div></div>';
      } else if (did) {
        slot.innerHTML = '<div class="doc-file"><span class="doc-ico' + (lab === 'PDF' ? '' : ' word') + '">' + esc(lab) + '</span><div class="meta"><b>' + esc(hv('berkas_nama').value || 'Dokumen') + '</b><span>' + esc(lab) + (hv('berkas_ukuran').value ? ' · ' + fmtSize(hv('berkas_ukuran').value) : '') + ' · tersimpan di Google Drive</span></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-doc-prev>' + I('eye', 'icon-sm') + 'Pratinjau</button><label class="btn btn-secondary btn-sm" style="position:relative;overflow:hidden">Ganti<input type="file" data-doc-file accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
          '<button type="button" class="btn btn-sm up-del" data-doc-clear>' + I('trash', 'icon-sm') + 'Hapus</button></div>';
      } else {
        slot.innerHTML = '<label class="drop doc-drop">' + I('upload') + '<span><b>Seret berkas PDF atau Word ke sini</b> atau klik untuk memilih</span><small>PDF, DOC, atau DOCX — maksimal 10 MB · tersimpan di folder 07_Karya_Ilmiah Google Drive</small>' +
          '<input type="file" data-doc-file accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>';
      }
    };
    terapkanJenis(); renderDoc();
    $('.kind-switch', view).addEventListener('click', function (e) {
      const b = e.target.closest('[data-jenis]');
      if (!b || b.dataset.jenis === jenis) return;
      jenis = b.dataset.jenis; A.dirty = true; terapkanJenis();
    });
    docPanel.addEventListener('change', async function (e) {
      const fi = e.target.closest('input[data-doc-file]');
      if (!fi || !fi.files[0]) return;
      const file = fi.files[0];
      renderDoc(file);
      try {
        const up = await uploadDoc(file);
        hv('berkas_id').value = up.id; hv('berkas_nama').value = up.nama; hv('berkas_mime').value = up.mime; hv('berkas_ukuran').value = up.ukuran;
        if (!$('#ed-title').value.trim()) $('#ed-title').value = up.nama.replace(/\.(pdf|docx?)$/i, '').replace(/[_-]+/g, ' ').trim();
        A.dirty = true;
        MV.toast('Berkas terunggah. Jangan lupa Simpan Draf atau Terbitkan.', 'ok', 5000);
      } catch (err) { MV.toast(err.message, 'err', 7000); }
      renderDoc();
    });
    docPanel.addEventListener('click', async function (e) {
      if (e.target.closest('[data-doc-clear]')) {
        const ok = await confirmDialog({ title: 'Hapus berkas dokumen?', text: 'Berkas dilepas dari karya ilmiah ini. Klik Simpan Draf / Perbarui Terbitan agar tersimpan. Berkas aslinya tetap ada di Google Drive.', ok: 'Hapus', danger: true, icon: 'trash' });
        if (!ok) return;
        ['berkas_id', 'berkas_nama', 'berkas_mime', 'berkas_ukuran'].forEach(function (k) { hv(k).value = ''; }); A.dirty = true; renderDoc();
      }
      else if (e.target.closest('[data-doc-prev]')) MV.viewer.open({ type: 'pdf', id: hv('berkas_id').value, title: hv('berkas_nama').value || 'Pratinjau dokumen', note: 'Pratinjau seperti yang dilihat pengunjung.' });
    });
    side.addEventListener('input', function () { A.dirty = true; });
    side.addEventListener('change', function () { A.dirty = true; });
    docPanel.addEventListener('input', function () { A.dirty = true; });
    $('#ed-title').addEventListener('input', function () { A.dirty = true; });
    const wrap = $('#editor-wrap');
    const hasQuill = await loadQuill();
    let getHtml, setHtml;
    if (hasQuill) {
      wrap.innerHTML = '<div id="editor"></div>';
      const q = new Quill('#editor', {
        theme: 'snow', placeholder: 'Mulai menulis…',
        modules: { toolbar: { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image', 'blockquote', 'code-block'], ['clean']],
          handlers: { image: function () {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
            inp.onchange = async function () {
              if (!inp.files[0]) return;
              MV.toast('Mengunggah gambar…', 'info', 2500);
              try { const r = await uploadFile(inp.files[0], 'blog'); const range = q.getSelection(true); q.insertEmbed(range.index, 'image', MV.img(r.id, 1600), 'user'); }
              catch (e) { MV.toast(e.message, 'err'); }
            };
            inp.click();
          } } } }
      });
      if (a.isi_html) q.clipboard.dangerouslyPasteHTML(a.isi_html);
      q.on('text-change', function (d, o, src) { if (src === 'user') A.dirty = true; });
      getHtml = function () { return q.getText().trim() ? q.root.innerHTML : ''; };
      setHtml = function (h) { q.clipboard.dangerouslyPasteHTML(h); };
    } else {
      wrap.innerHTML = '<div class="alert alert-warn" style="margin-bottom:12px">' + I('alert', 'icon-sm') + '<span>Editor visual gagal dimuat (periksa koneksi). Anda tetap bisa menulis dengan HTML sederhana.</span></div><textarea class="textarea" id="ed-html" rows="18" style="font-family:var(--font-mono);font-size:14px">' + esc(a.isi_html) + '</textarea>';
      $('#ed-html').addEventListener('input', function () { A.dirty = true; });
      getHtml = function () { return $('#ed-html').value; };
      setHtml = function (h) { $('#ed-html').value = h; };
    }
    A.dirty = false;
    // Gambar tempelan (data:) diunggah ke Drive dulu agar artikel tetap ringan
    async function uploadInline(html) {
      const re = /src="(data:image\/(png|jpe?g|webp|gif);base64,[^"]+)"/g;
      let m, out = html;
      const found = [];
      while ((m = re.exec(html))) found.push(m[1]);
      for (const d of found) {
        const blob = await (await fetch(d)).blob();
        const file = new File([blob], 'gambar-artikel.' + (blob.type.split('/')[1] || 'png'), { type: blob.type === 'image/gif' ? 'image/png' : blob.type });
        const r = await uploadFile(file, 'blog');
        out = out.split(d).join(MV.img(r.id, 1600));
      }
      if (found.length) setHtml(out);
      return out;
    }
    async function save(status, btn) {
      const judul = $('#ed-title').value.trim();
      if (!judul) { MV.toast('Judul wajib diisi.', 'err'); $('#ed-title').focus(); return; }
      const karya = jenis === 'Karya Ilmiah';
      if (karya && status === 'Terbit' && !hv('berkas_id').value) { MV.toast('Unggah berkas PDF atau Word dulu sebelum menerbitkan karya ilmiah.', 'err', 6000); slot.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      busy(btn, true, status === 'Terbit' ? 'Menerbitkan…' : 'Menyimpan…');
      try {
        const html = await uploadInline(getHtml());
        const v = collect(side), dv = collect(docPanel);
        const item = { judul: judul, isi_html: html, ringkasan: v.ringkasan, tag: v.tag, sampul_id: v.sampul_id, slug: v.slug, tanggal_terbit: v.tanggal_terbit, tampil: v.tampil, status: status, jenis: jenis };
        if (karya) Object.assign(item, { berkas_id: dv.berkas_id, berkas_nama: dv.berkas_nama, berkas_mime: dv.berkas_mime, berkas_ukuran: dv.berkas_ukuran,
          penulis: dv.penulis, abstrak: dv.abstrak, penerbit: dv.penerbit, doi: dv.doi, boleh_unduh: v.boleh_unduh });
        if (a.id) item.id = a.id;
        const r = await write('artikel.save', { item: item }, ['artikel.list']);
        if (!r.ok) throw new Error(failMsg(r));
        A.dirty = false;
        const wasNew = !a.id;
        a = Object.assign(a, r.data);
        $('#fld-slug').value = r.data.slug; $('#fld-tanggal_terbit').value = r.data.tanggal_terbit || '';
        if (r.data.doi !== undefined && $('#fld-doi')) $('#fld-doi').value = r.data.doi || '';
        MV.toast(status === 'Terbit' ? (karya ? 'Karya ilmiah terbit di situs.' : 'Artikel terbit di situs.') : 'Draf disimpan.', 'ok');
        if (r.data.peringatan) MV.toast(r.data.peringatan, 'info', 8000);
        $('#ed-note').innerHTML = status === 'Terbit' ? 'Tayang di <a href="artikel.html?slug=' + encodeURIComponent(r.data.slug) + '" target="_blank" rel="noopener">artikel.html?slug=' + esc(r.data.slug) + '</a>' : 'Draf tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '.';
        if (wasNew) { history.replaceState(null, '', '#/blog/' + r.data.id); lastHash = 'blog/' + r.data.id; id = r.data.id; $('#ed-h').textContent = judulHalaman(); }
        $('.page-head .actions', view).innerHTML = stPill(r.data.status);
      } catch (e) { MV.toast(e.message, 'err', 6000); }
      busy(btn, false);
      $('#ed-publish').innerHTML = I('send', 'icon-sm') + (a.status === 'Terbit' ? 'Perbarui Terbitan' : 'Terbitkan');
    }
    $('#ed-draft').addEventListener('click', function () { save('Draf', this); });
    $('#ed-publish').addEventListener('click', function () { save('Terbit', this); });
    $('#ed-preview').addEventListener('click', function () {
      let m = $('#ed-prev'); if (m) m.remove();
      m = document.createElement('div'); m.id = 'ed-prev'; m.className = 'modal is-open';
      const html = window.DOMPurify ? DOMPurify.sanitize(getHtml()) : getHtml().replace(/<script[\s\S]*?<\/script>/gi, '');
      const karya = jenis === 'Karya Ilmiah', dv = collect(docPanel);
      const docPart = karya ? (dv.penulis ? '<p class="muted" style="margin-bottom:12px">' + esc(dv.penulis) + '</p>' : '') +
        (dv.abstrak ? '<div class="card abstract" style="margin-bottom:20px"><h2>Abstract</h2><p>' + esc(dv.abstrak) + '</p></div>' : '') +
        (dv.berkas_id ? '<div class="card doc-viewer" style="margin-bottom:24px"><div class="doc-frame" style="height:60vh"><iframe title="Pratinjau" src="' + MV.preview(dv.berkas_id) + '"></iframe></div></div>' : '<div class="alert alert-warn">' + I('alert', 'icon-sm') + '<span>Belum ada berkas dokumen.</span></div>') : '';
      m.innerHTML = '<div class="modal-backdrop" data-x></div><div class="modal-panel"><div class="modal-head"><h2>Pratinjau ' + (karya ? 'karya ilmiah' : 'artikel') + '</h2><button class="icon-btn" data-x aria-label="Tutup">' + I('x') + '</button></div>' +
        '<div style="overflow-y:auto;padding:32px 24px;background:var(--bg)"><article class="article' + (karya ? ' wide' : '') + '"><h1 style="font-size:34px;font-weight:800;letter-spacing:-.03em;margin-bottom:16px">' + esc($('#ed-title').value || 'Tanpa judul') + '</h1>' + docPart + '<div class="prose">' + html + '</div></article></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function (e) { if (e.target.closest('[data-x]')) m.remove(); });
    });
  }

  // ============ Pesan masuk (AD-07) ============
  async function pageInbox(view) {
    const r = await load('message.list', {}, { maxAge: 15000 });
    if (!r.ok) throw new Error(failMsg(r));
    let items = r.data.items, filt = 'Semua', q = '', cur = A.openMsg || null;
    A.openMsg = null;
    view.innerHTML = '<div class="page-head"><div><h2>Pesan Masuk</h2><p>Pesan dari formulir kontak. Membuka pesan menandainya sebagai Dibaca.</p></div>' +
      '<div class="actions"><button class="btn btn-secondary" id="m-refresh">' + I('refresh', 'icon-sm') + 'Segarkan</button></div></div>' +
      '<div class="card inbox" id="inbox"><div class="inbox-list"><div class="head"><div class="search-box">' + I('search') + '<input class="input" id="m-q" type="search" placeholder="Cari nama, email, subjek…" aria-label="Cari pesan"></div>' +
      '<div class="pill-row scroll-x" id="m-filter" role="group" aria-label="Filter status"></div></div><div class="inbox-items" id="m-items"></div></div><div class="reader" id="m-read"></div></div>';
    const counts = function () { const c = { Semua: 0 }; items.forEach(function (m) { c[m.status] = (c[m.status] || 0) + 1; if (m.status !== 'Arsip') c.Semua++; }); return c; };
    const drawList = function () {
      if (!view.isConnected) return;
      const c = counts();
      $('#m-filter').innerHTML = ['Semua', 'Baru', 'Dibaca', 'Dibalas', 'Arsip'].map(function (s) { return '<button type="button" class="pill" data-mf="' + s + '" aria-pressed="' + (filt === s) + '">' + s + ' <span class="count">' + (c[s] || 0) + '</span></button>'; }).join('');
      const ql = q.toLowerCase();
      const list = items.filter(function (m) { return (filt === 'Semua' ? m.status !== 'Arsip' : m.status === filt) && (!ql || (m.nama + ' ' + m.email + ' ' + m.subjek + ' ' + m.isi).toLowerCase().indexOf(ql) > -1); });
      $('#m-items').innerHTML = list.length ? list.map(function (m) {
        return '<button type="button" class="msg-item' + (m.status === 'Baru' ? ' unread' : '') + (m.id === cur ? ' is-active' : '') + '" data-mid="' + esc(m.id) + '"><span class="row1"><span class="from">' + esc(m.nama) + '</span><span class="time">' + esc(MV.relTime(m.waktu)) + '</span></span>' +
          '<span class="subj">' + esc(m.subjek) + '</span><span class="prev">' + esc(m.isi) + '</span></button>';
      }).join('') : '<div class="reader-empty">' + I('inbox', 'icon-lg') + '<span>Tidak ada pesan di sini.</span></div>';
      const ping = $('#bell-ping'); if (ping) ping.hidden = !c.Baru;
      const b = $('[data-badge="pesan"]'); if (b) { b.hidden = !c.Baru; b.textContent = c.Baru || ''; }
    };
    const drawReader = function () {
      if (!view.isConnected) return;
      const m = items.find(function (x) { return x.id === cur; });
      $('#inbox').classList.toggle('reading', !!m);
      if (!m) { $('#m-read').innerHTML = '<div class="reader-empty">' + I('mail', 'icon-lg') + '<span>Pilih pesan untuk membacanya.</span></div>'; return; }
      $('#m-read').innerHTML = '<button type="button" class="back-link" id="m-back" style="border:0;background:none;cursor:pointer;padding:0;align-self:flex-start">' + I('arrow-left', 'icon-sm') + 'Semua pesan</button>' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><h3>' + esc(m.subjek) + '</h3>' + stPill(m.status) + '</div>' +
        '<div class="from-line"><span class="avatar" style="width:40px;height:40px">' + esc(MV.initials(m.nama)) + '</span><div><b style="color:var(--text)">' + esc(m.nama) + '</b><br><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></div>' +
        '<span style="margin-left:auto">' + esc(new Date(m.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) + '</span></div>' +
        '<div class="body">' + esc(m.isi) + '</div><div class="acts"><a class="btn btn-primary" id="m-reply" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Re: ' + m.subjek) + '">' + I('reply', 'icon-sm') + 'Balas via Email</a>' +
        (m.status === 'Arsip' ? '<button type="button" class="btn btn-secondary" data-ms="Dibaca">' + I('inbox', 'icon-sm') + 'Kembalikan ke kotak masuk</button>' : '<button type="button" class="btn btn-secondary" data-ms="Arsip">' + I('archive', 'icon-sm') + 'Arsipkan</button>') +
        (m.status !== 'Baru' ? '<button type="button" class="btn btn-ghost" data-ms="Baru">Tandai belum dibaca</button>' : '') +
        '<button type="button" class="btn btn-ghost" id="m-del" style="color:var(--danger);margin-left:auto">' + I('trash', 'icon-sm') + 'Hapus</button></div>';
    };
    const setStatus = async function (m, s, silent) {
      const old = m.status; m.status = s; drawList(); drawReader();
      const res = await write('message.update', { id: m.id, status: s }, ['message.list']);
      if (!res.ok) { m.status = old; drawList(); drawReader(); MV.toast(failMsg(res), 'err'); }
      else if (!silent) MV.toast('Status pesan: ' + s + '.', 'ok');
    };
    drawList(); drawReader();
    if (cur) { const m = items.find(function (x) { return x.id === cur; }); if (m && m.status === 'Baru') setStatus(m, 'Dibaca', true); }
    view.addEventListener('click', async function (e) {
      let b;
      if ((b = e.target.closest('[data-mf]'))) { filt = b.dataset.mf; drawList(); }
      else if ((b = e.target.closest('[data-mid]'))) {
        cur = b.dataset.mid; drawList(); drawReader();
        const m = items.find(function (x) { return x.id === cur; });
        if (m.status === 'Baru') setStatus(m, 'Dibaca', true);
      }
      else if (e.target.closest('#m-back')) { cur = null; drawList(); drawReader(); }
      else if ((b = e.target.closest('[data-ms]'))) { setStatus(items.find(function (x) { return x.id === cur; }), b.dataset.ms); }
      else if (e.target.closest('#m-reply')) { const m = items.find(function (x) { return x.id === cur; }); if (m.status !== 'Dibalas') setTimeout(function () { setStatus(m, 'Dibalas', true); }, 300); }
      else if (e.target.closest('#m-del')) {
        const m = items.find(function (x) { return x.id === cur; });
        if (!(await confirmDialog({ title: 'Hapus pesan dari ' + m.nama + '?', text: 'Pesan dihapus permanen dari Google Sheets.', ok: 'Hapus', danger: true, icon: 'trash' }))) return;
        const res = await write('message.delete', { id: m.id }, ['message.list']);
        if (res.ok) { items = items.filter(function (x) { return x.id !== m.id; }); cur = null; drawList(); drawReader(); MV.toast('Pesan dihapus.', 'ok'); } else MV.toast(failMsg(res), 'err');
      }
      else if (e.target.closest('#m-refresh')) { const res = await load('message.list', {}, { fresh: true }); if (res.ok) { items = res.data.items; drawList(); drawReader(); MV.toast('Kotak masuk diperbarui.', 'ok'); } }
    });
    $('#m-q').addEventListener('input', MV.debounce(function (e) { q = e.target.value; drawList(); }, 150));
  }

  // ============ Pengaturan, sistem, cadangan & impor (AD-08) ============
  const IMPOR_TAB = ['Pengaturan', 'Profil', 'Kontak', 'Kategori', 'Pengalaman', 'Pendidikan', 'Keterampilan', 'Prestasi', 'Layanan', 'Proses', 'Testimoni', 'Mitra', 'Proyek', 'Artikel', 'Pesan', 'Suka'];
  async function pagePengaturan(view) {
    const res = await Promise.all([load('kv.get', { tab: 'Pengaturan' }), load('system.status', {}, { maxAge: 60000 })]);
    if (!res[0].ok) throw new Error(failMsg(res[0]));
    const s = res[0].data, sys = res[1].ok ? res[1].data : null;
    view.innerHTML = '<div class="page-head"><div><h2>Pengaturan</h2><p>Akun admin, pengaturan situs, status sistem, serta cadangan dan impor data.</p></div></div><div class="set-grid">' +
      '<form class="card card-pad" id="f-pass" style="display:grid;gap:14px;align-content:start" novalidate><h3 class="h3">' + I('key', 'icon-sm') + ' Ganti Kata Sandi</h3>' +
      '<div class="field"><label for="pw-old">Sandi lama</label><input class="input" id="pw-old" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label for="pw-new">Sandi baru</label><input class="input" id="pw-new" type="password" autocomplete="new-password"><span class="help">Minimal 10 karakter, berisi huruf dan angka.</span></div>' +
      '<div class="field"><label for="pw-new2">Ulangi sandi baru</label><input class="input" id="pw-new2" type="password" autocomplete="new-password"></div>' +
      '<div id="pw-msg" role="alert"></div><button class="btn btn-primary" type="submit" id="pw-save">' + I('check', 'icon-sm') + 'Simpan Sandi</button>' +
      '<p class="help">Setelah diganti, sesi di perangkat lain otomatis berakhir.</p></form>' +
      '<form class="card card-pad" id="f-site" style="display:grid;gap:14px;align-content:start" novalidate><h3 class="h3">' + I('globe', 'icon-sm') + ' Pengaturan Situs</h3>' +
      fieldHtml({ k: 'judul_situs', label: 'Judul situs (tab browser)', max: 80 }, s.judul_situs) +
      '<div class="field"><span class="label">Tema bawaan pengunjung baru</span><div class="radio-row">' + [['sistem', 'Ikuti Sistem'], ['terang', 'Terang'], ['gelap', 'Gelap']].map(function (t) {
        return '<label><input type="radio" name="tema" value="' + t[0] + '"' + ((s.tema_default || 'sistem') === t[0] ? ' checked' : '') + '>' + t[1] + '</label>';
      }).join('') + '</div></div>' +
      fieldHtml({ k: 'jumlah_proyek_awal', label: 'Jumlah kartu proyek yang tampil awal', max: 2, ph: '6' }, s.jumlah_proyek_awal) +
      fieldHtml({ k: 'deskripsi_footer', label: 'Kalimat di footer', type: 'textarea', rows: 2, max: 220 }, s.deskripsi_footer) +
      fieldHtml({ k: 'judul_mitra', label: 'Judul baris logo mitra (hero)', max: 80, ph: 'Trusted by' }, s.judul_mitra) +
      fieldHtml({ k: 'cta_judul', label: 'Judul ajakan di atas Contact', max: 80, ph: 'Let\'s Work Together' }, s.cta_judul) +
      fieldHtml({ k: 'cta_teks', label: 'Kalimat ajakan', type: 'textarea', rows: 2, max: 220, ph: 'Have a project in mind? I\'d love to hear about it.' }, s.cta_teks) +
      fieldHtml({ k: 'cta_bg_id', label: 'Foto latar ajakan (opsional)', type: 'image', folder: 'profil', help: 'Kosongkan untuk memakai ilustrasi siluet kota bawaan. Tersimpan otomatis setelah diunggah.' }, s.cta_bg_id) +
      fieldHtml({ k: 'email_notifikasi', label: 'Email penerima notifikasi pesan', max: 120, ph: s.email_notifikasi_bawaan || '', help: 'Tidak tampil di situs. Kosongkan untuk memakai email akun Google pemilik.' }, s.email_notifikasi) +
      '<button class="btn btn-primary" type="submit" id="site-save">' + I('check', 'icon-sm') + 'Simpan Pengaturan</button></form>' +
      '<section class="card card-pad full" id="sys-card"></section>' +
      '<section class="card card-pad full" style="display:grid;gap:16px"><h3 class="h3">' + I('database', 'icon-sm') + ' Cadangan &amp; Impor Data</h3>' +
      '<p class="muted" style="font-size:14.5px;margin-top:-8px">Cadangan = salinan spreadsheet di folder <b>00_Cadangan</b> Google Drive Anda. Impor membaca spreadsheet MyVerse lain (versi lama atau cadangan) <b>tanpa mengubah sumbernya</b>, aman diulang, dan tidak membuat data dobel.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-secondary" id="bk-create">' + I('copy', 'icon-sm') + 'Buat Cadangan Sekarang</button><button class="btn btn-ghost" id="bk-list">' + I('list', 'icon-sm') + 'Lihat daftar cadangan</button></div><div id="bk-out"></div>' +
      '<div class="fsec" style="border-top:1px solid var(--border);padding-top:18px;border-bottom:0"><div class="fsec-title">Impor dari spreadsheet lain</div>' +
      '<div class="field"><label for="im-src">URL atau ID spreadsheet sumber</label><input class="input" id="im-src" placeholder="https://docs.google.com/spreadsheets/d/…"><span class="help">Harus milik akun Google yang sama agar gambar & berkas Drive tetap tampil.</span></div>' +
      '<div class="field"><span class="label">Data yang diimpor</span><div class="check-grid">' + IMPOR_TAB.map(function (t) {
        return '<label><input type="checkbox" data-imtab value="' + t + '"' + (t === 'Pesan' || t === 'Suka' ? '' : ' checked') + '>' + t + '</label>';
      }).join('') + '</div><span class="help">Pesan &amp; Suka (riwayat) sengaja tidak dicentang secara bawaan.</span></div>' +
      '<label class="switch"><input type="checkbox" id="im-over"><span class="track"></span><span class="lbl">Timpa data yang sudah ada (bawaan: hanya menambah yang belum ada)</span></label>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-secondary" id="im-scan">' + I('search', 'icon-sm') + 'Pindai (Dry-run)</button><button class="btn btn-primary" id="im-run">' + I('download', 'icon-sm') + 'Jalankan Impor</button></div>' +
      '<div id="im-out"></div></div></section>' +
      '<section class="card card-pad full" style="display:grid;gap:12px"><h3 class="h3">' + I('zap', 'icon-sm') + ' Performa Panel</h3><p class="muted" style="font-size:14.5px">Waktu respons permintaan terakhir dari browser ini. Untuk detail, buka Console lalu ketik <code>Perf.table()</code>.</p>' +
      '<button class="btn btn-ghost" id="perf-show" style="justify-self:start">' + I('bar-chart', 'icon-sm') + 'Tampilkan ringkasan</button><div id="perf-out"></div></section></div>';

    const drawSys = function (x) {
      const card = $('#sys-card');
      if (!x) { card.innerHTML = '<div class="alert alert-warn">' + I('alert', 'icon-sm') + '<span>Status sistem tidak bisa dimuat.</span></div>'; return; }
      const dot = function (ok) { return '<span class="' + (ok ? 'ok-dot' : 'no-dot') + '"></span>'; };
      card.innerHTML = '<div class="panel-head"><div><h3 class="h3">' + I('shield', 'icon-sm') + ' Status Sistem</h3><p>Backend v' + esc(x.versi_app) + ' · zona waktu ' + esc(x.zona_waktu) + '</p></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary btn-sm" id="sys-refresh">' + I('refresh', 'icon-sm') + 'Periksa ulang</button><button class="btn btn-secondary btn-sm" id="sys-purge">' + I('zap', 'icon-sm') + 'Bersihkan cache situs</button></div></div>' +
        '<dl class="kv">' +
        '<dt>Cache data publik</dt><dd>' + dot(x.cache_publik_hangat) + (x.cache_publik_hangat ? 'Hangat (situs memuat cepat)' : 'Dingin — akan terisi pada kunjungan berikutnya') + '</dd>' +
        '<dt>Pemanas otomatis (keepWarm)</dt><dd>' + dot(x.keep_warm && x.trigger_keep_warm) + (x.keep_warm ? (x.trigger_keep_warm ? 'Aktif tiap 1 menit' : 'Aktif, tetapi trigger belum terpasang — jalankan setupAwal()') : 'Dimatikan (matikanKeepWarm)') + '</dd>' +
        '<dt>Edit langsung di Sheets</dt><dd>' + dot(x.trigger_edit_sheet) + (x.trigger_edit_sheet ? 'Terdeteksi otomatis — situs langsung diperbarui' : 'Trigger belum ada — tekan "Bersihkan cache situs" setelah mengedit Sheets') + '</dd>' +
        '<dt>Drive API (PDF lihat-saja)</dt><dd>' + dot(x.drive_api) + (x.drive_api ? 'Aktif' : 'Belum diaktifkan — tombol unduh PDF belum dimatikan. Lihat panduan langkah 4.') + '</dd>' +
        '<dt>Antrean email</dt><dd>' + x.antrean_notifikasi + ' menunggu · sisa kuota hari ini ' + x.kuota_email + '</dd>' +
        '<dt>Script Properties</dt><dd>' + fmtN(x.ukuran_properties) + ' / ' + fmtN(x.batas_properties) + ' byte</dd>' +
        '<dt>Login terakhir</dt><dd>' + (x.login_terakhir ? esc(new Date(x.login_terakhir).toLocaleString('id-ID')) : '—') + '</dd>' +
        '<dt>Pemanasan terakhir</dt><dd>' + (x.pemanasan_terakhir ? esc(MV.relTime(x.pemanasan_terakhir.at)) + ' (' + esc(x.pemanasan_terakhir.scope) + ')' : '—') + '</dd></dl>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">' + (x.spreadsheet_url ? '<a class="btn btn-ghost btn-sm" href="' + esc(x.spreadsheet_url) + '" target="_blank" rel="noopener">' + I('database', 'icon-sm') + 'Buka Spreadsheet</a>' : '') +
        (x.folder_url ? '<a class="btn btn-ghost btn-sm" href="' + esc(x.folder_url) + '" target="_blank" rel="noopener">' + I('folder', 'icon-sm') + 'Buka Folder Drive</a>' : '') + '</div>';
    };
    drawSys(sys);
    view.addEventListener('click', async function (e) {
      if (e.target.closest('#sys-refresh')) { const b = e.target.closest('button'); busy(b, true, 'Memeriksa…'); const r = await load('system.status', {}, { fresh: true }); busy(b, false); drawSys(r.ok ? r.data : null); }
      else if (e.target.closest('#sys-purge')) {
        const b = e.target.closest('button'); busy(b, true, 'Membersihkan…');
        const r = await write('cache.purge', {}); busy(b, false);
        if (r.ok) { Cache.clear(); MV.store.del('mv_boot'); MV.toast('Cache dibersihkan — situs akan memuat data terbaru dari Sheets.', 'ok'); } else MV.toast(failMsg(r), 'err');
      }
    });
    $('#f-pass').addEventListener('submit', async function (e) {
      e.preventDefault();
      const o = $('#pw-old').value, n = $('#pw-new').value, n2 = $('#pw-new2').value, msg = $('#pw-msg');
      const bad = function (t) { msg.innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>' + esc(t) + '</span></div>'; };
      if (!o || !n) return bad('Isi sandi lama dan sandi baru.');
      if (n.length < 10 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) return bad('Sandi baru minimal 10 karakter dan berisi huruf serta angka.');
      if (n !== n2) return bad('Ulangan sandi baru tidak sama.');
      const btn = $('#pw-save'); busy(btn, true);
      const r = await MV.api('auth.changePassword', { lama: o, baru: n });
      busy(btn, false);
      if (!r.ok) return bad(failMsg(r));
      Sesi.save(r.data.token, r.data.exp, (Sesi.load() || {}).nama);
      $('#f-pass').reset();
      msg.innerHTML = '<div class="alert alert-ok">' + I('check-circle', 'icon-sm') + '<span>' + esc(r.message) + '</span></div>';
    });
    bindUploads($('#f-site'), async function (box, r) {
      const sv = await write('settings.save', { values: { cta_bg_id: r.id || '' } }, ['kv.get']);
      if (sv.ok) { MV.store.del('mv_boot'); MV.toast(r.id ? 'Foto latar ajakan diperbarui.' : 'Foto latar ajakan dilepas.', 'ok'); } else MV.toast(failMsg(sv), 'err');
      A.dirty = false;
    });
    $('#f-site').addEventListener('submit', async function (e) {
      e.preventDefault();
      const v = collect(this);
      v.tema_default = ($('input[name=tema]:checked', this) || {}).value || 'sistem';
      if (v.email_notifikasi && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email_notifikasi)) { MV.toast('Email notifikasi tidak valid.', 'err'); return; }
      const btn = $('#site-save'); busy(btn, true);
      const r = await write('settings.save', { values: v }, ['kv.get']);
      busy(btn, false);
      if (r.ok) { MV.store.del('mv_boot'); MV.toast('Pengaturan situs disimpan.', 'ok'); } else MV.toast(failMsg(r), 'err');
    });
    // Cadangan
    const showBackups = async function (fresh) {
      const r = await load('backup.list', {}, { fresh: fresh, maxAge: 5000 });
      if (!r.ok) { $('#bk-out').innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>' + esc(failMsg(r)) + '</span></div>'; return; }
      $('#bk-out').innerHTML = r.data.items.length ? '<div class="tbl-wrap"><table class="tbl report"><thead><tr><th>Cadangan</th><th>Dibuat</th><th style="text-align:right">Aksi</th></tr></thead><tbody>' + r.data.items.map(function (b) {
        return '<tr><td class="title-cell cell-main"><b>' + esc(b.nama) + '</b></td><td data-label="Dibuat">' + esc(new Date(b.dibuat).toLocaleString('id-ID')) + '</td><td class="cell-actions"><div class="row-actions">' +
          '<a class="btn btn-ghost btn-sm" href="' + esc(b.url) + '" target="_blank" rel="noopener">Buka</a><button class="btn btn-secondary btn-sm" data-use-bk="' + esc(b.id) + '">Pakai sebagai sumber impor</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">Belum ada cadangan.</p>';
    };
    $('#bk-create').addEventListener('click', async function () {
      busy(this, true, 'Membuat salinan…');
      const r = await MV.api('backup.create', {});
      busy(this, false);
      if (r.ok) { MV.toast('Cadangan dibuat: ' + r.data.nama, 'ok'); showBackups(true); } else MV.toast(failMsg(r), 'err');
    });
    $('#bk-list').addEventListener('click', function () { showBackups(true); });
    $('#bk-out').addEventListener('click', function (e) { const b = e.target.closest('[data-use-bk]'); if (b) { $('#im-src').value = b.dataset.useBk; $('#im-src').focus(); MV.toast('Sumber impor diisi. Klik "Pindai" untuk melihat dampaknya.', 'info'); } });
    // Impor (gas-migrasi-database: dry-run dulu, lalu jalankan)
    const runImport = async function (dry, btn) {
      const src = $('#im-src').value.trim();
      if (!src) { MV.toast('Tempel URL atau ID spreadsheet sumber.', 'err'); $('#im-src').focus(); return; }
      const sheets = $$('[data-imtab]:checked').map(function (c) { return c.value; });
      if (!sheets.length) { MV.toast('Pilih minimal satu data untuk diimpor.', 'err'); return; }
      if (!dry && !(await confirmDialog({ title: 'Jalankan impor sekarang?', text: 'Data dari sumber akan ditulis ke database MyVerse aktif. Disarankan klik "Buat Cadangan Sekarang" dulu.', ok: 'Jalankan Impor', icon: 'download' }))) return;
      busy(btn, true, dry ? 'Memindai…' : 'Mengimpor…');
      const r = await MV.api('import.run', { source: src, sheets: sheets, dryRun: dry, overwrite: $('#im-over').checked }, { timeout: 330000 });
      busy(btn, false);
      const out = $('#im-out');
      if (!r.ok) { out.innerHTML = '<div class="alert alert-err">' + I('alert', 'icon-sm') + '<span>' + esc(failMsg(r)) + '</span></div>'; return; }
      const rep = r.data.report;
      out.innerHTML = '<div class="alert ' + (dry ? 'alert-info' : 'alert-ok') + '" style="margin-bottom:12px">' + I(dry ? 'info' : 'check-circle', 'icon-sm') + '<span><b>' + esc(r.message) + '</b> Sumber: ' + esc(r.data.source.name) + '</span></div>' +
        '<div class="tbl-wrap"><table class="tbl report"><thead><tr><th>Data</th><th>Di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' +
        Object.keys(rep).map(function (k) { const x = rep[k]; return '<tr><td class="cell-main"><b>' + esc(k) + '</b></td><td data-label="Di sumber" class="tnum">' + x.source + '</td><td data-label="Ditambah" class="tnum" style="color:var(--success);font-weight:700">' + x.inserted + '</td><td data-label="Diperbarui" class="tnum" style="color:var(--primary-text);font-weight:700">' + x.updated + '</td><td data-label="Dilewati" class="tnum">' + x.skipped + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (r.data.warnings.length ? '<div class="alert alert-warn" style="margin-top:12px;display:block">' + r.data.warnings.map(function (w) { return '<div style="display:flex;gap:8px">' + I('alert', 'icon-sm') + '<span>' + esc(w) + '</span></div>'; }).join('') + '</div>' : '');
      if (!dry) { Cache.clear(); MV.store.del('mv_boot'); refreshBadges(true); }
    };
    $('#im-scan').addEventListener('click', function () { runImport(true, this); });
    $('#im-run').addEventListener('click', function () { runImport(false, this); });
    $('#perf-show').addEventListener('click', function () {
      const log = MV.Perf.entries().slice(-12).reverse();
      $('#perf-out').innerHTML = log.length ? '<div class="tbl-wrap"><table class="tbl report"><thead><tr><th>Aksi</th><th>Total</th><th>Server</th><th>Cache server</th></tr></thead><tbody>' + log.map(function (x) {
        return '<tr><td class="cell-main mono">' + esc(x.action) + '</td><td data-label="Total" class="tnum">' + x.total + ' ms</td><td data-label="Server" class="tnum">' + (x.server === undefined ? '—' : x.server + ' ms') + '</td><td data-label="Cache server">' + (x.cached ? '<span class="st st-dibalas">' + I('check', 'icon-sm') + 'Ya</span>' : '<span class="muted">—</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">Belum ada data.</p>';
    });
  }

  // ============ Mulai ============
  MV.Activity.init();
  if (Sesi.load()) boot(); else showLogin();
})();
