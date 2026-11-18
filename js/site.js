/* =========================================================
   MyVerse — site.js (bersama untuk semua halaman publik)
   Navigasi, drawer HP, footer, tombol suka, meta situs.
   ========================================================= */
(function () {
  const MV = window.MV;
  const page = document.body.dataset.page || 'home';
  const home = page === 'home';
  const pre = home ? '' : 'index.html';
  const LINKS = [
    ['home', 'Home'], ['about', 'About'], ['services', 'Services'], ['projects', 'Projects'],
    ['process', 'Process'], ['blog', 'Blog'], ['contact', 'Contact']
  ];
  const SOCIAL_LABEL = { linkedin: 'LinkedIn', github: 'GitHub', instagram: 'Instagram', youtube: 'YouTube', twitter: 'X / Twitter',
    facebook: 'Facebook', tiktok: 'TikTok', whatsapp: 'WhatsApp', dribbble: 'Dribbble', behance: 'Behance', medium: 'Medium', website: 'Website' };

  const activeNav = page === 'article' ? 'blog' : page === 'project' ? 'projects' : page;
  function href(id) { return id === 'blog' ? 'blog.html' : pre + '#' + id; }

  MV.site = {
    page: page,
    meta: null,

    // Meta situs dari cache bootstrap (agar nama tampil instan di semua halaman)
    cachedMeta: function () {
      const b = MV.store.get('mv_boot');
      if (!b || !b.data) return null;
      return { profil: b.data.profil || {}, kontak: b.data.kontak || {}, pengaturan: b.data.pengaturan || {} };
    },

    renderChrome: function () {
      const navHtml =
        '<a class="skip-link" href="#main">Skip to content</a>' +
        '<header class="nav" id="nav"><div class="container nav-inner">' +
        '<a class="brand" href="' + (home ? '#home' : 'index.html') + '" aria-label="Home"><span class="brand-mark" data-brand-mark>MV</span>' +
        '<span class="brand-text"><span class="brand-name" data-brand-name>MyVerse</span><span class="brand-sub" data-brand-sub>Portfolio</span></span></a>' +
        '<nav aria-label="Main"><ul class="nav-links">' + LINKS.map(function (l) {
          return '<li><a href="' + href(l[0]) + '" data-nav="' + l[0] + '"' + (l[0] === activeNav ? ' class="is-active" aria-current="page"' : '') + '>' + l[1] + '</a></li>';
        }).join('') + '</ul></nav>' +
        '<div class="nav-actions"><button class="icon-btn" type="button" data-theme-toggle></button>' +
        '<a class="btn btn-primary btn-sm btn-talk" href="' + href('contact') + '" data-magnetic>Hire Me</a>' +
        '<button class="icon-btn nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">' + MV.icon('menu') + '</button></div>' +
        '</div></header>' +
        '<div class="drawer" id="drawer" aria-hidden="true"><div class="drawer-backdrop" data-drawer-close></div>' +
        '<div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<span class="brand-name" data-brand-name>MyVerse</span><button class="icon-btn" type="button" data-drawer-close aria-label="Close menu">' + MV.icon('x') + '</button></div>' +
        LINKS.map(function (l) { return '<a class="drawer-link" href="' + href(l[0]) + '" data-nav="' + l[0] + '">' + l[1] + '</a>'; }).join('') +
        '<a class="btn btn-primary" style="margin-top:12px" href="' + href('contact') + '" data-drawer-close>Hire Me ' + MV.icon('arrow-right', 'icon-sm') + '</a></div></div>' +
        '<div class="scroll-progress" aria-hidden="true"><i></i></div>' +
        '<button type="button" class="to-top" id="to-top" aria-label="Back to top" title="Back to top">' + MV.icon('arrow-up') + '</button>';
      const slot = MV.$('#chrome-top');
      if (slot) slot.outerHTML = navHtml;
      const foot = MV.$('#chrome-foot');
      if (foot) foot.outerHTML = '<footer class="footer" id="site-footer"><div class="container"><div class="footer-grid">' +
        '<div><a class="brand" href="' + (home ? '#home' : 'index.html') + '"><span class="brand-mark" data-brand-mark>MV</span><span class="brand-text"><span class="brand-name" data-brand-name>MyVerse</span><span class="brand-sub" data-brand-sub>Portfolio</span></span></a>' +
        '<p data-footer-desc>Personal portfolio.</p></div>' +
        '<div><h4>Quick Links</h4><ul>' + LINKS.filter(function (l) { return l[0] !== 'home'; }).map(function (l) { return '<li><a href="' + href(l[0]) + '">' + l[1] + '</a></li>'; }).join('') + '</ul></div>' +
        '<div><h4>Follow Me</h4><div class="footer-social" data-footer-social></div></div>' +
        '</div><div class="footer-bottom"><span data-copyright>© ' + new Date().getFullYear() + ' MyVerse. All rights reserved.</span>' +
        '<a class="link-arrow" href="#" data-to-top>Back to top ' + MV.icon('arrow-up', 'icon-sm') + '</a></div></div></footer>';
      MV.theme.apply(MV.theme.mode() === 'dark');
      this.bindNav();
      const cm = this.cachedMeta();
      if (cm) this.setMeta(cm);
    },

    setMeta: function (m) {
      if (!m) return;
      this.meta = m;
      const p = m.profil || {}, k = m.kontak || {}, s = m.pengaturan || {};
      const nama = p.nama || 'MyVerse';
      const kata = nama.trim().split(/\s+/);
      const namaHtml = kata.length > 1 ? MV.esc(kata.slice(0, -1).join(' ')) + ' <b>' + MV.esc(kata[kata.length - 1]) + '</b>' : MV.esc(nama);
      MV.$$('[data-brand-name]').forEach(function (el) { el.innerHTML = namaHtml; });
      MV.$$('[data-brand-sub]').forEach(function (el) { el.textContent = p.tagline || 'Portfolio'; });
      MV.$$('[data-brand-mark]').forEach(function (el) { el.textContent = MV.initials(nama).slice(0, 2); });
      MV.$$('[data-footer-desc]').forEach(function (el) { el.textContent = s.deskripsi_footer || p.deskripsi_singkat || ''; });
      MV.$$('[data-copyright]').forEach(function (el) { el.textContent = '© ' + new Date().getFullYear() + ' ' + nama + '. All rights reserved.'; });
      const sos = MV.site.socialList(k.sosial);
      MV.$$('[data-footer-social]').forEach(function (el) {
        el.innerHTML = sos.length ? sos.map(function (x) {
          return '<a class="icon-btn" href="' + MV.esc(x.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + MV.esc(x.label) + '" title="' + MV.esc(x.label) + '">' + MV.icon(x.platform) + '</a>';
        }).join('') : '<span class="muted" style="font-size:14px">—</span>';
      });
      if (s.tema_default) MV.theme.setDefault(s.tema_default);
    },

    // Kartu tulisan bersama (beranda + blog). cls boleh hasil rv() (diakhiri tanpa tanda kutip)
    docCover: function (tipe) {
      const t = String(tipe || '').toUpperCase();
      return '<div class="doc-cover" aria-hidden="true"><div class="doc-sheet"><i></i><i></i><i></i><i></i><i></i><i></i>' +
        (t ? '<span class="doc-type' + (t === 'PDF' ? '' : ' word') + '">' + MV.esc(t) + '</span>' : '') + '</div></div>';
    },
    postCard: function (m, likes, cls) {
      const esc = MV.esc, I = MV.icon, karya = m.jenis === 'Karya Ilmiah';
      const n = m.suka !== undefined ? m.suka : (likes || {})['artikel:' + m.id] || 0;
      const penulis = String(m.penulis || '').split(/[;\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
      return '<article class="card card-hover post-card spot ' + (cls || '') + '">' +
        '<div class="post-cover">' + (m.sampul_id ? MV.imgTag(m.sampul_id, m.judul, 900) : karya ? this.docCover(m.berkas_tipe) : MV.coverPh(m.judul, m.id)) +
        (karya ? '<span class="kind-badge">' + I('file-badge', 'icon-sm') + 'Research' + (m.berkas_tipe ? ' · ' + esc(m.berkas_tipe) : '') + '</span>'
          : m.tag && m.tag[0] ? '<span class="badge badge-solid">' + esc(m.tag[0]) + '</span>' : '') + '</div>' +
        '<div class="post-body"><h3><a class="stretched" href="artikel.html?slug=' + encodeURIComponent(m.slug) + '">' + esc(m.judul) + '</a></h3>' +
        (karya && penulis.length ? '<div class="post-authors">' + I('users', 'icon-sm') + '<span>' + esc(penulis.slice(0, 3).join(', ')) + (penulis.length > 3 ? ' et al.' : '') + '</span></div>' : '') +
        (m.ringkasan ? '<p>' + esc(m.ringkasan) + '</p>' : '') +
        '<div class="post-meta"><span>' + esc(MV.fmtDate(m.tanggal_terbit)) + '</span><span class="sep"></span><span>' +
        (karya ? esc(m.penerbit || 'Research paper') : (m.waktu_baca || 1) + ' min read') + '</span>' +
        '<span class="likes">' + I('heart', 'icon-sm') + '<span class="tnum">' + n + '</span></span></div></div></article>';
    },

    socialList: function (arr) {
      return (Array.isArray(arr) ? arr : []).filter(function (x) { return x && /^https?:\/\//i.test(x.url || ''); }).map(function (x) {
        const pf = MV.ICONS[x.platform] ? x.platform : 'website';
        return { platform: pf, url: x.url, label: x.label || SOCIAL_LABEL[pf] || 'Link' };
      });
    },

    bindNav: function () {
      const nav = MV.$('#nav'), drawer = MV.$('#drawer'), toggle = MV.$('.nav-toggle');
      const bar = MV.$('.scroll-progress i'), up = MV.$('#to-top');
      let ticking = false;
      const onScroll = function () {
        ticking = false;
        const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
        if (nav) { nav.classList.toggle('is-scrolled', y > 24); nav.classList.toggle('on-hero', home && y <= 24); }
        if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
        if (up) up.classList.toggle('is-on', y > 700);
        if (MV.onScrollFx) MV.onScrollFx(y);
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      onScroll();
      document.addEventListener('click', function (e) {
        if (e.target.closest('#to-top') || e.target.closest('[data-to-top]')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: MV.reduceMotion ? 'auto' : 'smooth' }); }
      });
      MV.fx.bind();
      const open = function () {
        drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        setTimeout(function () { const a = MV.$('.drawer-link', drawer); if (a) a.focus(); }, 50);
      };
      MV.closeDrawer = function () {
        if (!drawer || !drawer.classList.contains('is-open')) return;
        drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        toggle.focus();
      };
      if (toggle) toggle.addEventListener('click', open);
      if (drawer) drawer.addEventListener('click', function (e) {
        if (e.target.closest('[data-drawer-close]') || e.target.closest('.drawer-link')) MV.closeDrawer();
      });
    },

    // Sorot menu sesuai bagian yang terlihat (landing page)
    spy: function () {
      if (!home || !('IntersectionObserver' in window)) return;
      const map = { home: 'home', about: 'about', services: 'services', projects: 'projects', experience: 'about', skills: 'about',
        achievements: 'about', writing: 'blog', process: 'process', testimonials: 'process', cta: 'contact', contact: 'contact' };
      const setActive = function (id) {
        MV.$$('[data-nav]').forEach(function (a) {
          const on = a.dataset.nav === id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      };
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting && map[en.target.id]) setActive(map[en.target.id]); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { const el = document.getElementById(id); if (el) io.observe(el); });
    }
  };

  // ---------- Suka (US-11): optimis + sinkron server ----------
  MV.likes = {
    key: function (t, id) { return t + ':' + id; },
    set: function () { return new Set(MV.store.get('mv_likes', [])); },
    has: function (t, id) { return this.set().has(this.key(t, id)); },
    save: function (s) { MV.store.set('mv_likes', Array.from(s).slice(-500)); },
    button: function (tipe, id, count, extraCls) {
      const on = this.has(tipe, id);
      return '<button type="button" class="like-btn ' + (extraCls || '') + '" data-like="' + tipe + '" data-id="' + MV.esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Unlike' : 'Like') + '">' +
        MV.icon('heart', 'icon-sm') + '<span class="n">' + (Number(count) || 0) + '</span></button>';
    },
    busy: {},
    toggle: async function (btn) {
      const tipe = btn.dataset.like, id = btn.dataset.id, k = this.key(tipe, id);
      if (this.busy[k]) return;
      this.busy[k] = true;
      const s = this.set(), was = s.has(k);
      const all = MV.$$('[data-like="' + tipe + '"][data-id="' + CSS.escape(id) + '"]');
      const n0 = Number((btn.querySelector('.n') || {}).textContent || 0);
      const paint = function (on, n) {
        all.forEach(function (b) {
          b.setAttribute('aria-pressed', String(on));
          b.setAttribute('aria-label', on ? 'Unlike' : 'Like');
          const el = b.querySelector('.n'); if (el) el.textContent = Math.max(0, n);
          if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
        });
      };
      paint(!was, n0 + (was ? -1 : 1));
      if (was) s.delete(k); else s.add(k);
      this.save(s);
      const r = await MV.api('like.toggle', { tipe: tipe, item_id: id, pengunjung_id: MV.vid() });
      const s2 = this.set();
      if (r.ok) {
        if (r.data.liked) s2.add(k); else s2.delete(k);
        this.save(s2);
        paint(r.data.liked, r.data.count);
        const b = MV.store.get('mv_boot');
        if (b && b.data && b.data.likes) { b.data.likes[k] = r.data.count; MV.store.set('mv_boot', b); }
      } else {
        if (was) s2.add(k); else s2.delete(k);
        this.save(s2);
        paint(was, n0);
        MV.toast(r.error && r.error.code === 'RATE_LIMIT' ? r.error.message : 'Could not save your like. Please try again.', 'err');
      }
      this.busy[k] = false;
    }
  };
  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-like]');
    if (b) { e.preventDefault(); e.stopPropagation(); MV.likes.toggle(b); }
  });

  MV.site.renderChrome();
})();
