/* =========================================================
   MyVerse — pages.js
   Halaman detail proyek, daftar blog, dan artikel.
   ========================================================= */
(function () {
  const MV = window.MV, $ = MV.$, esc = MV.esc, I = MV.icon;
  const page = document.body.dataset.page;
  const root = $('#main');
  if (!MV.ready) { MV.configBanner(root); return; }
  const params = new URLSearchParams(location.search);
  const siteName = function () { return (MV.site.meta && MV.site.meta.profil && MV.site.meta.profil.nama) || 'MyVerse'; };

  function notFound(target, title, msg, back, backLabel) {
    target.innerHTML = '<div class="card config-banner"><div class="icon-tile" style="margin:0 auto 16px">' + I('compass') + '</div>' +
      '<h1 class="h3">' + esc(title) + '</h1><p class="muted" style="margin:10px 0 20px">' + esc(msg) + '</p>' +
      '<a class="btn btn-primary" href="' + back + '">' + I('arrow-left', 'icon-sm') + esc(backLabel) + '</a></div>';
  }

  // SWR per halaman: tampil dari cache dulu, lalu segarkan dari server
  async function swr(key, action, data, render, onFail) {
    const cache = MV.store.get(key);
    if (cache && cache.data) render(cache.data, false);
    const r = await MV.api(action, data);
    if (r.ok) {
      MV.store.set(key, { version: r.version, at: Date.now(), data: r.data });
      if (!cache || cache.version !== r.version || JSON.stringify(cache.data.suka) !== JSON.stringify(r.data.suka)) render(r.data, !!cache);
      if (r.data.situs) MV.site.setMeta(r.data.situs);
    } else {
      if (cache) MV.store.del(key);
      onFail(r.error || {});
    }
  }

  // ---------- Detail proyek (US-07) ----------
  function project() {
    const slug = (params.get('slug') || '').trim();
    const box = $('#detail');
    if (!slug) return notFound(box, 'Project not found', 'This link is missing a project name.', 'index.html#projects', 'Back to Projects');
    box.addEventListener('click', function (e) {
      const g = e.target.closest('[data-gal]');
      if (g) MV.viewer.open({ type: 'image', id: g.dataset.gal, title: (MV.$('h1', box) || {}).textContent || '' });
    });
    swr('mv_proj_' + slug.toLowerCase(), 'project.get', { slug: slug }, function (d) {
      const p = d.proyek;
      document.title = p.judul + ' — ' + siteName();
      const objectives = MV.lines(p.tujuan);
      const meta = [];
      if (p.kategori) meta.push('<span class="badge">' + esc(p.kategori) + '</span>');
      if (p.tahun) meta.push('<span class="chip tnum">' + I('calendar', 'icon-sm') + '&nbsp;' + esc(p.tahun) + '</span>');
      if (p.unggulan) meta.push('<span class="badge badge-solid">' + I('star', 'icon-sm') + 'Featured</span>');
      box.innerHTML =
        '<a class="back-link" href="index.html#projects">' + I('arrow-left', 'icon-sm') + 'Back to Projects</a>' +
        '<header class="detail-head"><div class="detail-meta">' + meta.join('') + '</div><h1>' + esc(p.judul) + '</h1>' +
        (p.ringkasan ? '<p class="summary">' + esc(p.ringkasan) + '</p>' : '') +
        '<div class="detail-actions">' + MV.likes.button('proyek', p.id, d.suka) +
        (p.tautan_demo ? '<a class="btn btn-secondary btn-sm" href="' + esc(p.tautan_demo) + '" target="_blank" rel="noopener noreferrer">Live Demo ' + I('external-link', 'icon-sm') + '</a>' : '') + '</div></header>' +
        '<div class="detail-cover">' + (p.gambar_id ? MV.imgTag(p.gambar_id, p.judul, 1600, 'fetchpriority="high"') : MV.coverPh(p.judul, p.id)) + '</div>' +
        '<div class="detail-grid"><div>' +
        (p.deskripsi ? '<section class="detail-section"><h2>Overview</h2>' + MV.paragraphs(p.deskripsi) + '</section>' : '') +
        (objectives.length ? '<section class="detail-section"><h2>Objectives</h2><ul class="checklist">' + objectives.map(function (o) { return '<li>' + I('check-circle', 'icon-sm') + '<span>' + esc(o) + '</span></li>'; }).join('') + '</ul></section>' : '') +
        (p.hasil ? '<section class="detail-section"><h2>Results</h2>' + MV.paragraphs(p.hasil) + '</section>' : '') +
        (p.galeri_ids.length ? '<section class="detail-section"><h2>Documentation</h2><div class="gallery">' + p.galeri_ids.map(function (id, i) {
          return '<button type="button" data-gal="' + esc(id) + '" aria-label="Open image ' + (i + 1) + ' of ' + p.galeri_ids.length + '">' + MV.imgTag(id, p.judul + ' — image ' + (i + 1), 700) + '</button>';
        }).join('') + '</div></section>' : '') +
        '</div><aside><dl class="card card-pad info-card">' +
        (p.kategori ? '<div><dt>Category</dt><dd>' + esc(p.kategori) + '</dd></div>' : '') +
        (p.tahun ? '<div><dt>Year</dt><dd class="tnum">' + esc(p.tahun) + '</dd></div>' : '') +
        (p.teknologi.length ? '<div><dt>Technologies</dt><dd><div class="tech-chips" style="margin-top:6px">' + p.teknologi.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div></dd></div>' : '') +
        (p.tautan_demo ? '<div><dt>Live Demo</dt><dd><a href="' + esc(p.tautan_demo) + '" target="_blank" rel="noopener noreferrer" style="word-break:break-all">' + esc(p.tautan_demo.replace(/^https?:\/\//, '')) + '</a></dd></div>' : '') +
        '<div><dt>Appreciation</dt><dd>' + MV.likes.button('proyek', p.id, d.suka) + '</dd></div>' +
        '</dl></aside></div>' +
        (d.sebelum || d.sesudah ? '<nav class="pager" aria-label="More projects">' +
          (d.sebelum ? '<a class="card card-hover" href="proyek.html?slug=' + encodeURIComponent(d.sebelum.slug) + '"><small>' + I('arrow-left', 'icon-sm') + 'Previous project</small><b>' + esc(d.sebelum.judul) + '</b></a>' : '<span></span>') +
          (d.sesudah ? '<a class="card card-hover next" href="proyek.html?slug=' + encodeURIComponent(d.sesudah.slug) + '"><small>Next project' + I('arrow-right', 'icon-sm') + '</small><b>' + esc(d.sesudah.judul) + '</b></a>' : '<span></span>') +
          '</nav>' : '');
    }, function (err) {
      if (err.code === 'NOT_FOUND') notFound(box, 'Project not found', 'It may have been moved or hidden.', 'index.html#projects', 'Back to Projects');
      else notFound(box, 'Couldn\'t load this project', err.message || 'Please check your connection.', 'index.html#projects', 'Back to Projects');
    });
  }

  // ---------- Daftar blog (US-10) ----------
  function blog() {
    const PER = 9;
    const st = { items: [], tags: [], tag: params.get('tag') || '', q: params.get('q') || '', page: Number(params.get('page')) || 1 };
    const grid = $('#posts'), input = $('#q');
    input.value = st.q;
    const syncUrl = function () {
      const u = new URLSearchParams();
      if (st.tag) u.set('tag', st.tag);
      if (st.q) u.set('q', st.q);
      if (st.page > 1) u.set('page', st.page);
      history.replaceState(null, '', 'blog.html' + (u.toString() ? '?' + u : ''));
    };
    const draw = function () {
      const q = st.q.toLowerCase().trim();
      const list = st.items.filter(function (m) {
        if (st.tag && !m.tag.some(function (t) { return t.toLowerCase() === st.tag.toLowerCase(); })) return false;
        return !q || (m.judul + ' ' + m.ringkasan).toLowerCase().indexOf(q) > -1;
      });
      const pages = Math.max(1, Math.ceil(list.length / PER));
      if (st.page > pages) st.page = pages;
      const shown = list.slice((st.page - 1) * PER, st.page * PER);
      $('#tags').innerHTML = st.tags.length ? [''].concat(st.tags).map(function (t) {
        return '<button type="button" class="pill" data-tag="' + esc(t) + '" aria-pressed="' + (st.tag.toLowerCase() === t.toLowerCase()) + '">' + (t ? esc(t) : 'All') + '</button>';
      }).join('') : '';
      grid.innerHTML = shown.map(function (m, i) {
        return '<article class="card card-hover post-card reveal" style="position:relative;--d:' + (i % 3) * 60 + 'ms">' +
          '<div class="post-cover">' + (m.sampul_id ? MV.imgTag(m.sampul_id, m.judul, 900) : MV.coverPh(m.judul, m.id)) + '</div>' +
          '<div class="post-body">' + (m.tag[0] ? '<span class="badge" style="align-self:flex-start">' + esc(m.tag[0]) + '</span>' : '') +
          '<h3><a class="stretched" href="artikel.html?slug=' + encodeURIComponent(m.slug) + '">' + esc(m.judul) + '</a></h3>' +
          (m.ringkasan ? '<p>' + esc(m.ringkasan) + '</p>' : '') +
          '<div class="post-meta"><span>' + esc(MV.fmtDate(m.tanggal_terbit)) + '</span><span class="sep"></span><span>' + m.waktu_baca + ' min read</span>' +
          '<span class="likes">' + I('heart', 'icon-sm') + '<span class="tnum">' + (m.suka || 0) + '</span></span></div></div></article>';
      }).join('');
      $('#posts-empty').hidden = !!shown.length;
      const pager = $('#pager');
      pager.innerHTML = pages > 1 ? '<button type="button" data-page="' + (st.page - 1) + '" aria-label="Previous page"' + (st.page === 1 ? ' disabled' : '') + '>' + I('chevron-left', 'icon-sm') + '</button>' +
        Array.from({ length: pages }, function (_, i) { return '<button type="button" data-page="' + (i + 1) + '"' + (i + 1 === st.page ? ' aria-current="page"' : '') + '>' + (i + 1) + '</button>'; }).join('') +
        '<button type="button" data-page="' + (st.page + 1) + '" aria-label="Next page"' + (st.page === pages ? ' disabled' : '') + '>' + I('chevron-right', 'icon-sm') + '</button>' : '';
      MV.reveal(grid);
      syncUrl();
    };
    root.addEventListener('click', function (e) {
      let b;
      if ((b = e.target.closest('[data-tag]'))) { st.tag = b.dataset.tag; st.page = 1; draw(); }
      else if ((b = e.target.closest('[data-page]')) && !b.disabled) { st.page = Number(b.dataset.page); draw(); window.scrollTo({ top: $('#posts').offsetTop - 120, behavior: MV.reduceMotion ? 'auto' : 'smooth' }); }
    });
    input.addEventListener('input', MV.debounce(function () { st.q = input.value; st.page = 1; draw(); }, 160));
    swr('mv_blog', 'blog.list', {}, function (d) {
      st.items = d.items || []; st.tags = d.tags || [];
      draw();
    }, function (err) {
      grid.innerHTML = '';
      $('#posts-empty').hidden = false;
      $('#posts-empty').innerHTML = I('alert') + '<p><strong>Couldn\'t load articles.</strong></p><p style="font-size:14px">' + esc(err.message || '') + '</p>';
    });
  }

  // ---------- Artikel ----------
  function clean(html) {
    const safe = window.DOMPurify ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input'], FORBID_ATTR: ['style'] }) : html;
    const tmp = document.createElement('div');
    tmp.innerHTML = safe;
    MV.$$('a[href]', tmp).forEach(function (a) {
      if (/^https?:\/\//i.test(a.getAttribute('href')) && a.hostname !== location.hostname) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    });
    MV.$$('img', tmp).forEach(function (img) { img.loading = 'lazy'; img.decoding = 'async'; if (!img.alt) img.alt = ''; });
    return tmp.innerHTML;
  }
  function article() {
    const slug = (params.get('slug') || '').trim();
    const box = $('#art');
    if (!slug) return notFound(box, 'Article not found', 'This link is missing an article name.', 'blog.html', 'Back to Blog');
    swr('mv_art_' + slug.toLowerCase(), 'blog.get', { slug: slug }, function (d) {
      const a = d.artikel;
      document.title = a.judul + ' — ' + siteName();
      box.innerHTML = '<a class="back-link" href="blog.html">' + I('arrow-left', 'icon-sm') + 'Back to Blog</a>' +
        '<header class="article-head"><div class="pill-row">' + a.tag.map(function (t) { return '<a class="pill" href="blog.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>'; }).join('') + '</div>' +
        '<h1>' + esc(a.judul) + '</h1><div class="post-meta" style="margin:0;font-size:14px"><span>' + esc(MV.fmtDate(a.tanggal_terbit, 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })) + '</span><span class="sep"></span><span>' + a.waktu_baca + ' min read</span></div></header>' +
        (a.sampul_id ? '<div class="detail-cover" style="margin-bottom:36px">' + MV.imgTag(a.sampul_id, a.judul, 1600, 'fetchpriority="high"') + '</div>' : '') +
        '<div class="prose">' + clean(a.isi_html || '') + '</div>' +
        '<div class="card article-like"><div><b style="font-family:var(--font-head)">Enjoyed this article?</b><p class="muted" style="font-size:14.5px">Leave a like — it helps me know what to write next.</p></div>' + MV.likes.button('artikel', a.id, d.suka) + '</div>';
      $('#more').hidden = !d.lainnya.length;
      $('#more-grid').innerHTML = d.lainnya.map(function (m) {
        return '<article class="card card-hover post-card" style="position:relative"><div class="post-cover">' + (m.sampul_id ? MV.imgTag(m.sampul_id, m.judul, 700) : MV.coverPh(m.judul, m.id)) + '</div>' +
          '<div class="post-body"><h3><a class="stretched" href="artikel.html?slug=' + encodeURIComponent(m.slug) + '">' + esc(m.judul) + '</a></h3><div class="post-meta"><span>' + esc(MV.fmtDate(m.tanggal_terbit)) + '</span><span class="sep"></span><span>' + m.waktu_baca + ' min read</span></div></div></article>';
      }).join('');
    }, function (err) {
      if (err.code === 'NOT_FOUND') notFound(box, 'Article not found', 'It may have been unpublished or moved.', 'blog.html', 'Back to Blog');
      else notFound(box, 'Couldn\'t load this article', err.message || 'Please check your connection.', 'blog.html', 'Back to Blog');
    });
  }

  if (page === 'project') project();
  else if (page === 'blog') blog();
  else if (page === 'article') article();
})();
