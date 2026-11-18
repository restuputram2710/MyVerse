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

  // ---------- Daftar blog + karya ilmiah (US-10, v1.1) ----------
  const KIND = { articles: 'Artikel', research: 'Karya Ilmiah' };
  function blog() {
    const PER = 9;
    const st = { items: [], tags: [], tag: params.get('tag') || '', q: params.get('q') || '', page: Number(params.get('page')) || 1,
      kind: KIND[params.get('type')] ? params.get('type') : '' };
    const grid = $('#posts'), input = $('#q');
    input.value = st.q;
    const syncUrl = function () {
      const u = new URLSearchParams();
      if (st.kind) u.set('type', st.kind);
      if (st.tag) u.set('tag', st.tag);
      if (st.q) u.set('q', st.q);
      if (st.page > 1) u.set('page', st.page);
      history.replaceState(null, '', 'blog.html' + (u.toString() ? '?' + u : ''));
    };
    const jenis = function (m) { return m.jenis === 'Karya Ilmiah' ? 'Karya Ilmiah' : 'Artikel'; };
    const draw = function (anim) {
      const q = st.q.toLowerCase().trim();
      const byKind = st.items.filter(function (m) { return !st.kind || jenis(m) === KIND[st.kind]; });
      const list = byKind.filter(function (m) {
        if (st.tag && !m.tag.some(function (t) { return t.toLowerCase() === st.tag.toLowerCase(); })) return false;
        return !q || (m.judul + ' ' + m.ringkasan + ' ' + (m.penulis || '') + ' ' + (m.penerbit || '') + ' ' + m.tag.join(' ')).toLowerCase().indexOf(q) > -1;
      });
      const n = { '': st.items.length, articles: 0, research: 0 };
      st.items.forEach(function (m) { n[jenis(m) === 'Karya Ilmiah' ? 'research' : 'articles']++; });
      $('#kinds').innerHTML = [['', 'All', 'layers'], ['articles', 'Articles', 'pen-tool'], ['research', 'Research', 'file-badge']].map(function (k) {
        return '<button type="button" data-kind="' + k[0] + '" aria-pressed="' + (st.kind === k[0]) + '">' + I(k[2], 'icon-sm') + k[1] + ' <span class="count">' + n[k[0]] + '</span></button>';
      }).join('');
      $('#kinds').hidden = !n.research;                   // tab jenis hanya tampil bila ada karya ilmiah
      const tags = {};
      byKind.forEach(function (m) { m.tag.forEach(function (t) { tags[t] = 1; }); });
      const tagList = Object.keys(tags).sort();
      $('#tags').innerHTML = tagList.length ? [''].concat(tagList).map(function (t) {
        return '<button type="button" class="pill" data-tag="' + esc(t) + '" aria-pressed="' + (st.tag.toLowerCase() === t.toLowerCase()) + '">' + (t ? esc(t) : 'All topics') + '</button>';
      }).join('') : '';
      const pages = Math.max(1, Math.ceil(list.length / PER));
      if (st.page > pages) st.page = pages;
      const shown = list.slice((st.page - 1) * PER, st.page * PER);
      grid.innerHTML = shown.map(function (m, i) { return MV.site.postCard(m, null, 'reveal' + (anim ? ' zoom' : '') + '" style="--d:' + (i % 3) * 70 + 'ms'); }).join('');
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
      if ((b = e.target.closest('[data-kind]'))) { st.kind = b.dataset.kind; st.tag = ''; st.page = 1; draw(true); }
      else if ((b = e.target.closest('[data-tag]'))) { st.tag = b.dataset.tag; st.page = 1; draw(true); }
      else if ((b = e.target.closest('[data-page]')) && !b.disabled) { st.page = Number(b.dataset.page); draw(true); window.scrollTo({ top: $('#posts').offsetTop - 120, behavior: MV.reduceMotion ? 'auto' : 'smooth' }); }
    });
    input.addEventListener('input', MV.debounce(function () { st.q = input.value; st.page = 1; draw(false); }, 160));
    swr('mv_blog', 'blog.list', {}, function (d) {
      st.items = d.items || []; st.tags = d.tags || [];
      draw(false);
    }, function (err) {
      grid.innerHTML = '';
      $('#posts-empty').hidden = false;
      $('#posts-empty').innerHTML = I('alert') + '<p><strong>Couldn\'t load articles.</strong></p><p style="font-size:14px">' + esc(err.message || '') + '</p>';
    });
  }

  // ---------- Artikel / karya ilmiah ----------
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
  const authorsOf = function (s) { return String(s || '').split(/[;\n]/).map(function (x) { return x.trim(); }).filter(Boolean); };
  const doiUrl = function (doi) { return !doi ? '' : /^https?:\/\//i.test(doi) ? doi : 'https://doi.org/' + doi; };
  const fmtSize = function (b) { b = Number(b) || 0; return b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b ? Math.max(1, Math.round(b / 1e3)) + ' KB' : ''; };
  function citation(a) {
    const au = authorsOf(a.penulis);
    const names = au.length > 1 ? au.slice(0, -1).join(', ') + ', & ' + au[au.length - 1] : (au[0] || siteName());
    const year = String(a.tanggal_terbit || '').slice(0, 4) || 'n.d.';
    return names + ' (' + year + '). ' + a.judul + '.' + (a.penerbit ? ' ' + a.penerbit + '.' : '') + (a.doi ? ' ' + doiUrl(a.doi) : ' ' + location.href.split('#')[0]);
  }
  function readProgress(target) {
    let bar = $('.read-progress');
    if (!bar) { bar = document.createElement('div'); bar.className = 'read-progress'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>'; document.body.appendChild(bar); }
    const upd = function () {
      const r = target.getBoundingClientRect(), total = Math.max(1, r.height - innerHeight * 0.6);
      bar.firstChild.style.setProperty('--p', Math.max(0, Math.min(1, -r.top / total)).toFixed(4));
    };
    if (!readProgress.bound) { readProgress.bound = true; window.addEventListener('scroll', upd, { passive: true }); }
    upd();
  }
  function researchHtml(a, d) {
    const au = authorsOf(a.penulis);
    const tipe = a.berkas_tipe || '';
    const facts = [];
    if (a.tanggal_terbit) facts.push('<span>' + I('calendar', 'icon-sm') + esc(MV.fmtDate(a.tanggal_terbit, 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })) + '</span>');
    if (a.penerbit) facts.push('<span>' + I('book-open', 'icon-sm') + esc(a.penerbit) + '</span>');
    if (a.doi) facts.push('<span>' + I('hash', 'icon-sm') + '<a href="' + esc(doiUrl(a.doi)) + '" target="_blank" rel="noopener noreferrer">' + esc(/^10\./.test(a.doi) ? 'doi:' + a.doi : 'Source link') + '</a></span>');
    if (a.berkas_ukuran) facts.push('<span>' + I('file-text', 'icon-sm') + esc(tipe) + ' · ' + esc(fmtSize(a.berkas_ukuran)) + '</span>');
    return '<a class="back-link" href="blog.html?type=research">' + I('arrow-left', 'icon-sm') + 'Back to Research</a>' +
      '<header class="doc-head"><div style="display:grid;gap:16px">' +
      '<div class="pill-row"><span class="kind-badge">' + I('file-badge', 'icon-sm') + 'Research Paper' + (tipe ? ' · ' + esc(tipe) : '') + '</span>' +
      a.tag.map(function (t) { return '<a class="pill" href="blog.html?type=research&tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>'; }).join('') + '</div>' +
      '<h1 style="font-size:clamp(28px,4.2vw,42px);font-weight:800;letter-spacing:-.03em;line-height:1.15">' + esc(a.judul) + '</h1>' +
      (au.length ? '<div class="doc-authors">' + au.map(function (x) { return '<span class="author-chip"><span>' + esc(MV.initials(x)) + '</span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
      (facts.length ? '<div class="doc-facts">' + facts.join('') + '</div>' : '') +
      '<div class="doc-actions">' + (a.berkas_id ? '<a class="btn btn-primary" href="#doc-viewer">' + I('eye', 'icon-sm') + 'Read Document</a>' : '') +
      (a.berkas_id && a.boleh_unduh ? '<a class="btn btn-secondary" href="' + esc(MV.download(a.berkas_id)) + '" target="_blank" rel="noopener" data-dl>' + I('download', 'icon-sm') + 'Download' + (tipe ? ' ' + esc(tipe) : '') + '</a>' : '') +
      '<button type="button" class="btn btn-secondary" data-cite>' + I('quote', 'icon-sm') + 'Cite</button>' + MV.likes.button('artikel', a.id, d.suka) + '</div>' +
      '<div id="cite-out"></div></div>' +
      '<div class="doc-hero">' + (a.sampul_id ? MV.imgTag(a.sampul_id, a.judul, 900, 'style="width:100%;height:100%;object-fit:cover"') : MV.site.docCover(tipe)) + '</div></header>' +
      (a.abstrak ? '<section class="card abstract"><h2>Abstract</h2><p>' + esc(a.abstrak) + '</p></section>' : '') +
      (a.berkas_id ? '<section class="card doc-viewer" id="doc-viewer" aria-label="Document preview"><div class="doc-viewer-head"><b>' + I('file-text', 'icon-sm') + esc(a.berkas_nama || a.judul) + '</b>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-full>' + I('maximize', 'icon-sm') + 'Full screen</button></div>' +
        '<div class="doc-frame"><div class="loading-note"><span class="spinner" style="width:22px;height:22px;border:2px solid var(--primary);border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span>Loading document…</div>' +
        '<iframe title="' + esc(a.judul) + '" src="' + MV.preview(a.berkas_id) + '" loading="lazy" allow="autoplay" referrerpolicy="no-referrer"></iframe></div>' +
        '<div class="modal-note">' + (a.boleh_unduh ? 'Use the Download button to save a copy.' : 'View only — downloading is disabled by the author.') + '</div></section>' : '') +
      (a.isi_html ? '<div class="prose" style="margin-top:40px">' + clean(a.isi_html) + '</div>' : '') +
      '<div class="card article-like"><div><b style="font-family:var(--font-head)">Found this research useful?</b><p class="muted" style="font-size:14.5px">Leave a like — or cite it in your own work.</p></div>' + MV.likes.button('artikel', a.id, d.suka) + '</div>';
  }
  function article() {
    const slug = (params.get('slug') || '').trim();
    const box = $('#art');
    if (!slug) return notFound(box, 'Article not found', 'This link is missing an article name.', 'blog.html', 'Back to Blog');
    let cur = null;
    box.addEventListener('click', async function (e) {
      if (!cur) return;
      if (e.target.closest('[data-cite]')) {
        const text = citation(cur);
        $('#cite-out').innerHTML = '<div class="cite-box">' + I('quote', 'icon-sm') + '<p>' + esc(text) + '</p><button type="button" class="copy-btn" data-copy-cite aria-label="Copy citation" title="Copy citation">' + I('copy', 'icon-sm') + '</button></div>';
      } else if (e.target.closest('[data-copy-cite]')) {
        const b = e.target.closest('[data-copy-cite]'), ok = await MV.copy(citation(cur));
        b.classList.toggle('ok', ok); b.innerHTML = I(ok ? 'check' : 'copy', 'icon-sm');
        MV.toast(ok ? 'Citation copied (APA style).' : 'Could not copy — select the text manually.', ok ? 'ok' : 'err', 2500);
      } else if (e.target.closest('[data-full]')) {
        MV.viewer.open({ type: 'pdf', id: cur.berkas_id, title: cur.judul, note: cur.boleh_unduh ? 'Use the Download button on the page to save a copy.' : 'View only — downloading is disabled by the author.' });
      }
    });
    swr('mv_art_' + slug.toLowerCase(), 'blog.get', { slug: slug }, function (d) {
      const a = d.artikel;
      cur = a;
      const karya = a.jenis === 'Karya Ilmiah';
      document.title = a.judul + ' — ' + siteName();
      box.classList.toggle('wide', karya);
      if (karya) box.innerHTML = researchHtml(a, d);
      else box.innerHTML = '<a class="back-link" href="blog.html">' + I('arrow-left', 'icon-sm') + 'Back to Blog</a>' +
        '<header class="article-head"><div class="pill-row">' + a.tag.map(function (t) { return '<a class="pill" href="blog.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>'; }).join('') + '</div>' +
        '<h1>' + esc(a.judul) + '</h1><div class="post-meta" style="margin:0;font-size:14px"><span>' + esc(MV.fmtDate(a.tanggal_terbit, 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })) + '</span><span class="sep"></span><span>' + a.waktu_baca + ' min read</span></div></header>' +
        (a.sampul_id ? '<div class="detail-cover" style="margin-bottom:36px">' + MV.imgTag(a.sampul_id, a.judul, 1600, 'fetchpriority="high"') + '</div>' : '') +
        '<div class="prose">' + clean(a.isi_html || '') + '</div>' +
        '<div class="card article-like"><div><b style="font-family:var(--font-head)">Enjoyed this article?</b><p class="muted" style="font-size:14.5px">Leave a like — it helps me know what to write next.</p></div>' + MV.likes.button('artikel', a.id, d.suka) + '</div>';
      $('#more').hidden = !d.lainnya.length;
      $('#more-grid').innerHTML = d.lainnya.map(function (m, i) { return MV.site.postCard(m, null, 'reveal" style="--d:' + i * 70 + 'ms'); }).join('');
      MV.reveal($('#more-grid'));
      if (!karya) readProgress(box);
    }, function (err) {
      if (err.code === 'NOT_FOUND') notFound(box, 'Article not found', 'It may have been unpublished or moved.', 'blog.html', 'Back to Blog');
      else notFound(box, 'Couldn\'t load this article', err.message || 'Please check your connection.', 'blog.html', 'Back to Blog');
    });
  }

  if (page === 'project') project();
  else if (page === 'blog') blog();
  else if (page === 'article') article();
})();
