/* =========================================================
   MyVerse — home.js (landing page)
   Tampil instan dari cache lokal, lalu diperbarui diam-diam
   bila versi isi di server berubah (SWR).
   v1.1: tampilan "Midnight Blue" + animasi interaktif.
   ========================================================= */
(function () {
  const MV = window.MV, $ = MV.$, esc = MV.esc, I = MV.icon;
  const main = $('#main');
  if (!MV.ready) { MV.configBanner(main); return; }

  const LABEL = { Kerja: 'Work', Mengajar: 'Teaching', Organisasi: 'Organization', Profesional: 'Professional',
    Prestasi: 'Achievement', Penghargaan: 'Award', Sertifikat: 'Certificate' };
  const SKILL_CATS = ['Technical', 'Professional', 'Educational'];
  const st = { d: null, instant: false, expType: 'all', achType: 'all', skillCat: null, projCat: 'all', projQ: '', projShown: 6, projAnim: false, testi: 0, timer: null, typeT: null };

  // Kelas reveal + SATU atribut style (jangan tambah style="…" kedua di tag yang sama — browser membuangnya)
  const rv = function (delay, css) { return 'reveal' + (st.instant ? ' is-in' : '') + '" style="--d:' + (delay || 0) + 'ms' + (css ? ';' + css : ''); };
  const fmtYM = function (s) { s = String(s || ''); return /^\d{4}-\d{2}$/.test(s) ? MV.fmtDate(s, 'en-US', { month: 'short', year: 'numeric' }) : s; };
  const count = function (n, suf) {
    return '<span class="tnum" data-count="' + n + '" data-suffix="' + (suf || '') + '"' + (st.instant ? ' data-done="1">' + n + (suf || '') : '>0' + (suf || '')) + '</span>';
  };
  const show = function (id, on) {
    const el = document.getElementById(id);
    if (el) el.hidden = !on;
  };

  // ---------- Hero ----------
  function hero(d) {
    const p = d.profil || {}, s = d.stats || {}, set = d.pengaturan || {};
    const nama = p.nama || 'Your Name';
    const roles = String(p.peran_bergilir || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    const bg = p.hero_bg_id ? MV.imgTag(p.hero_bg_id, '', 2000, 'fetchpriority="high" loading="eager"') : '<img src="assets/hero-bg.svg" alt="">';
    const foto = p.foto_id ? MV.imgTag(p.foto_id, 'Portrait of ' + nama, 1000, 'fetchpriority="high" loading="eager"') : '<div class="initials">' + esc(MV.initials(nama)) + '</div>';
    const role = roles.length > 1
      ? '<span class="sr-only">' + esc(roles.join(', ')) + '</span><span aria-hidden="true"><span class="typed" id="typed">' + esc(roles[0]) + '</span><span class="caret"></span></span>'
      : MV.richText(roles[0] || p.profesi || '');
    const mitra = d.mitra || [];
    const logo = function (m, dup) {
      const inner = (m.logo_id ? MV.imgTag(m.logo_id, dup ? '' : m.nama, 300) : '') + (m.logo_id ? '' : esc(m.nama));
      const attrs = ' class="logo-item"' + (dup ? ' aria-hidden="true" tabindex="-1"' : '') + ' title="' + esc(m.nama) + '"';
      return m.tautan ? '<a href="' + esc(m.tautan) + '" target="_blank" rel="noopener noreferrer"' + attrs + '>' + inner + '</a>' : '<span' + attrs + '>' + inner + '</span>';
    };
    const moving = mitra.length >= 5 && !MV.reduceMotion;
    const below = mitra.length
      ? '<div class="trusted ' + rv(360) + '"><p class="trusted-label">' + esc(set.judul_mitra || 'Trusted by') + '</p><div class="marquee' + (moving ? ' is-moving' : '') + '"><div class="marquee-track" style="--dur:' + Math.max(20, mitra.length * 5) + 's">' +
        mitra.map(function (m) { return logo(m); }).join('') + (moving ? mitra.map(function (m) { return logo(m, true); }).join('') : '') + '</div></div></div>'
      : '<div class="hero-mini ' + rv(360) + '">' +
        (s.tahun ? '<div class="mini-stat">' + I('briefcase') + '<div><b>' + count(s.tahun, '+') + '</b><span>Years Experience</span></div></div>' : '') +
        '<div class="mini-stat">' + I('folder') + '<div><b>' + count(s.proyek || 0) + '</b><span>Projects Completed</span></div></div>' +
        (s.prestasi ? '<div class="mini-stat">' + I('award') + '<div><b>' + count(s.prestasi) + '</b><span>Achievements</span></div></div>' : '') +
        (d.karya ? '<div class="mini-stat">' + I('book-open') + '<div><b>' + count(d.karya) + '</b><span>Research Papers</span></div></div>' : '') + '</div>';
    $('#home').innerHTML =
      '<div class="hero-bg" aria-hidden="true">' + bg + '</div><div class="hero-shade" aria-hidden="true"></div><div class="hero-light" aria-hidden="true"></div>' +
      '<div class="container hero-grid"><div class="hero-copy">' +
      '<p class="hello ' + rv(0) + '">Hello, I\'m</p>' +
      '<h1 class="' + rv(70) + '">' + esc(nama) + '</h1>' +
      '<p class="role ' + rv(140) + '">' + role + '</p>' +
      (p.deskripsi_singkat ? '<p class="intro ' + rv(210) + '">' + esc(p.deskripsi_singkat) + '</p>' : '<div style="height:28px"></div>') +
      '<div class="hero-cta ' + rv(280) + '"><a class="btn btn-primary" href="#projects" data-magnetic>View My Work ' + I('arrow-right', 'icon-sm') + '</a>' +
      '<a class="btn btn-outline-light" href="#contact" data-magnetic>' + I('mail', 'icon-sm') + 'Contact Me</a>' +
      (p.cv_file_id ? '<button type="button" class="btn btn-ghost" data-cv>' + I('eye', 'icon-sm') + 'View CV</button>' : '') + '</div>' +
      below + '</div>' +
      '<div class="hero-visual from-right ' + rv(160) + '" id="hero-visual"><div class="hero-glow" aria-hidden="true"></div><div class="hero-ring" aria-hidden="true"></div>' +
      '<div class="hero-photo">' + foto + '</div>' +
      (p.status_saat_ini ? '<div class="float-card fc-1"><span class="dot" aria-hidden="true"></span>' + esc(p.status_saat_ini) + '</div>' : '') +
      (s.tahun || s.proyek ? '<div class="float-card fc-2" aria-hidden="true"><span class="icon-tile">' + I(s.tahun ? 'briefcase' : 'folder', 'icon-sm') + '</span><div><b class="tnum">' + (s.tahun ? s.tahun + '+' : s.proyek) + '</b><small>' + (s.tahun ? 'Years Experience' : 'Projects') + '</small></div></div>' : '') +
      '</div></div>' +
      '<a class="scroll-cue" href="#about" aria-label="Scroll to About"></a>';
    const cv = $('[data-cv]');
    if (cv) cv.addEventListener('click', function () { MV.viewer.open({ type: 'pdf', id: p.cv_file_id, title: 'Curriculum Vitae' }); });
    if (roles.length > 1) typewriter(roles);
    heroPointer();
  }

  function typewriter(roles) {
    clearTimeout(st.typeT);
    const el = $('#typed');
    if (!el) return;
    if (MV.reduceMotion) { el.textContent = roles.join(' · '); const c = el.nextElementSibling; if (c) c.remove(); return; }
    let i = 0, n = roles[0].length, del = true;
    const step = function () {
      if (!el.isConnected) return;
      if (del) { n--; if (n <= 0) { n = 0; del = false; i = (i + 1) % roles.length; } }
      else { n++; if (n >= roles[i].length) { el.textContent = roles[i]; del = true; st.typeT = setTimeout(step, 2200); return; } }
      el.textContent = roles[i].slice(0, n) || '​';
      st.typeT = setTimeout(step, del ? 36 : 72);
    };
    st.typeT = setTimeout(step, 2600);
  }

  function heroPointer() {
    const home = $('#home'), photo = $('.hero-photo', home), light = $('.hero-light', home);
    if (!MV.fx.fine() || home.dataset.bound) return;
    home.dataset.bound = '1';
    let raf = 0;
    home.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        const r = home.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const l = $('.hero-light', home), ph = $('.hero-photo', home);
        if (l) { l.style.setProperty('--hx', (x * 100).toFixed(1) + '%'); l.style.setProperty('--hy', (y * 100).toFixed(1) + '%'); }
        if (ph) { ph.style.setProperty('--px', ((x - 0.5) * -18).toFixed(1) + 'px'); ph.style.setProperty('--py', ((y - 0.5) * -12).toFixed(1) + 'px'); }
      });
    });
    return photo && light;
  }

  // Parallax ringan + garis timeline yang terisi saat digulir
  MV.onScrollFx = function (y) {
    if (MV.reduceMotion) return;
    const bg = $('.hero-bg');
    if (bg && y < innerHeight * 1.2) bg.style.transform = 'translate3d(0,' + (y * 0.32).toFixed(1) + 'px,0)';
    const tl = $('#exp-list');
    if (tl && tl.offsetParent) {
      const r = tl.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (innerHeight * 0.65 - r.top) / Math.max(r.height, 1)));
      tl.style.setProperty('--fill', f.toFixed(3));
    }
    const cta = $('.cta-bg');
    if (cta) {
      const r = cta.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) cta.style.transform = 'translate3d(0,' + ((r.top - innerHeight / 2) * -0.12).toFixed(1) + 'px,0)';
    }
  };

  // ---------- About ----------
  function about(d) {
    const p = d.profil || {}, k = d.kontak || {}, s = d.stats || {};
    const fid = p.foto_tentang_id || p.foto_id;
    const hl = [];
    if (s.tahun) hl.push(['briefcase', '<b>' + count(s.tahun, '+') + '</b> Years of Experience']);
    hl.push(['folder', '<b>' + count(s.proyek || 0) + '</b> Projects Completed']);
    if (p.status_saat_ini) hl.push(['check-circle', esc(p.status_saat_ini)]);
    if (s.prestasi) hl.push(['award', '<b>' + count(s.prestasi) + '</b> Achievements &amp; Certificates']);
    if (d.karya) hl.push(['book-open', '<b>' + count(d.karya) + '</b> Research Papers']);
    const telp = String(k.telepon || '').replace(/[^\d+]/g, '');
    const wa = telp ? telp.replace(/^\+/, '').replace(/^0/, '62') : '';
    const rows = [];
    const lokasi = k.lokasi || p.lokasi;
    if (lokasi) rows.push('<li class="info-row">' + I('map-pin') + '<div><small>Location</small><span>' + esc(lokasi) + '</span></div></li>');
    if (k.email) rows.push('<li class="info-row">' + I('mail') + '<div><small>Email</small><a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a></div><button type="button" class="copy-btn" data-copy="' + esc(k.email) + '" aria-label="Copy email" title="Copy email">' + I('copy', 'icon-sm') + '</button></li>');
    if (k.telepon) rows.push('<li class="info-row">' + I('phone') + '<div><small>Phone</small><a href="tel:' + esc(telp) + '">' + esc(k.telepon) + '</a></div>' +
      (/^62\d{8,}$/.test(wa) ? '<a class="copy-btn" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">' + I('whatsapp', 'icon-sm') + '</a>' : '') + '</li>');
    if (p.bahasa) rows.push('<li class="info-row">' + I('globe') + '<div><small>Languages</small><span>' + esc(p.bahasa) + '</span></div></li>');
    $('#about-body').innerHTML =
      '<div class="about-text"><span class="eyebrow ' + rv(0) + '">About Me</span><h2 class="h2 ' + rv(60) + '" id="about-title">' + (p.judul_tentang ? MV.richText(p.judul_tentang) : 'Who I Am') + '</h2>' +
      '<div class="' + rv(120) + '">' + MV.paragraphs(p.tentang) + MV.paragraphs(p.kepribadian_profesional) + '</div>' +
      '<ul class="highlights ' + rv(180) + '">' + hl.map(function (x) { return '<li>' + I(x[0]) + '<span>' + x[1] + '</span></li>'; }).join('') + '</ul>' +
      '<div class="about-actions ' + rv(240) + '">' + (p.cv_file_id ? '<button type="button" class="btn btn-primary" data-cv2>' + I('file-text', 'icon-sm') + 'View CV</button>' : '') +
      '<a class="btn btn-secondary" href="#contact">Let\'s Talk ' + I('arrow-right', 'icon-sm') + '</a></div></div>' +
      '<aside class="card info-panel spot from-right ' + rv(120) + '"><div class="info-photo">' + (fid ? MV.imgTag(fid, 'Photo of ' + (p.nama || ''), 900) : '<div class="initials">' + esc(MV.initials(p.nama)) + '</div>') +
      (p.status_saat_ini ? '<span class="badge"><span class="dot" aria-hidden="true"></span>' + esc(p.status_saat_ini) + '</span>' : '') + '</div>' +
      (rows.length ? '<ul class="info-list">' + rows.join('') + '</ul>' : '') + '</aside>';
    const cv = $('[data-cv2]');
    if (cv) cv.addEventListener('click', function () { MV.viewer.open({ type: 'pdf', id: p.cv_file_id, title: 'Curriculum Vitae' }); });
    const journey = MV.lines(p.perjalanan_karier).map(function (l) {
      const x = l.split('|').map(function (t) { return t.trim(); });
      return { tahun: x[0] || '', judul: x[1] || '', ket: x[2] || '' };
    }).slice(0, 5);
    const jb = $('#journey');
    jb.hidden = !journey.length;
    jb.innerHTML = journey.length ? '<div class="journey-title">Career Journey</div><div class="journey-track" style="--n:' + journey.length + '">' +
      journey.map(function (j) { return '<div class="milestone"><b class="tnum">' + esc(j.tahun) + '</b><strong>' + esc(j.judul) + '</strong>' + (j.ket ? '<span>' + esc(j.ket) + '</span>' : '') + '</div>'; }).join('') + '</div>' : '';
    if (st.instant) jb.classList.add('is-in');
  }

  // ---------- Services ----------
  function services(d) {
    const all = d.layanan || [];
    show('services', all.length);
    $('#svc-grid').innerHTML = all.map(function (s, i) {
      return '<article class="card card-hover svc-card spot ' + rv(i * 80) + '"><span class="svc-num" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="svc-ico">' + I(s.ikon || 'sparkles') + '</span><h3>' + esc(s.judul) + '</h3><p>' + esc(s.deskripsi) + '</p></article>';
    }).join('');
  }

  // ---------- Experience & Education ----------
  function experience(d) {
    const items = d.pengalaman || [], edu = d.pendidikan || [];
    show('experience', items.length || edu.length);
    const types = ['Kerja', 'Mengajar', 'Organisasi', 'Profesional'].filter(function (t) { return items.some(function (x) { return x.jenis === t; }); });
    if (st.expType !== 'all' && types.indexOf(st.expType) === -1) st.expType = 'all';
    $('#exp-filter').innerHTML = items.length > 1 && types.length > 1 ? ['all'].concat(types).map(function (t) {
      const n = t === 'all' ? items.length : items.filter(function (x) { return x.jenis === t; }).length;
      return '<button type="button" class="pill" data-exp="' + t + '" aria-pressed="' + (st.expType === t) + '">' + (t === 'all' ? 'All' : LABEL[t]) + ' <span class="count">' + n + '</span></button>';
    }).join('') : '';
    const list = items.filter(function (x) { return st.expType === 'all' || x.jenis === st.expType; });
    $('#exp-list').innerHTML = list.length ? list.map(function (x, i) {
      const range = [fmtYM(x.mulai), x.masih_aktif ? 'Present' : fmtYM(x.selesai)].filter(Boolean).join(' — ');
      return '<article class="card card-hover tl-item from-left ' + rv(i * 60) + '"><div class="tl-head"><div><h3>' + esc(x.posisi) + '</h3><div class="tl-org">' + esc(x.instansi) + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + '</div></div>' +
        (range ? '<span class="badge tnum">' + esc(range) + '</span>' : '') + '</div>' +
        (x.deskripsi ? '<p>' + esc(x.deskripsi) + '</p>' : '') +
        (x.tag.length ? '<div class="tl-tags">' + x.tag.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '') + '</article>';
    }).join('') : '<div class="empty">No experience added yet.</div>';
    const group = function (jenis, title, ic) {
      const g = edu.filter(function (x) { return x.jenis === jenis; });
      if (!g.length) return '';
      return '<div class="edu-group from-right ' + rv(0) + '"><h3><span class="icon-tile" style="width:36px;height:36px;border-radius:10px">' + I(ic, 'icon-sm') + '</span>' + title + '</h3><div class="edu-list">' +
        g.map(function (x) {
          const yr = [x.tahun_mulai, x.tahun_selesai].filter(Boolean).join(' — ');
          return '<div class="card card-hover edu-item spot"><div><h4>' + esc(x.jenjang_program) + '</h4><div class="meta">' + esc(x.institusi) + (x.jurusan ? ' · ' + esc(x.jurusan) : '') + '</div>' +
            (x.deskripsi ? '<div class="meta" style="margin-top:6px">' + esc(x.deskripsi) + '</div>' : '') + '</div>' + (yr ? '<span class="year">' + esc(yr) + '</span>' : '') + '</div>';
        }).join('') + '</div></div>';
    };
    $('#education').innerHTML = group('Formal', 'Formal Education', 'graduation-cap') + group('Tambahan', 'Additional Education', 'award');
  }

  // ---------- Skills ----------
  function skills(d) {
    const all = d.keterampilan || [];
    show('skills', all.length);
    if (!all.length) return;
    const cats = SKILL_CATS.filter(function (c) { return all.some(function (s) { return s.kategori === c; }); });
    if (!st.skillCat || cats.indexOf(st.skillCat) === -1) st.skillCat = cats[0];
    $('#skill-tabs').innerHTML = cats.map(function (c) {
      return '<button type="button" role="tab" id="tab-' + c + '" aria-controls="skill-panel" aria-selected="' + (c === st.skillCat) + '" data-skill="' + c + '">' + c + ' Skills</button>';
    }).join('');
    const list = all.filter(function (s) { return s.kategori === st.skillCat; });
    $('#skill-bars').innerHTML = list.map(function (s) {
      const v = Math.max(0, Math.min(100, s.tingkat));
      return '<div class="skill-row"><div class="skill-top"><span>' + esc(s.nama) + '</span><span>' + v + '%</span></div>' +
        '<div class="bar" role="progressbar" aria-label="' + esc(s.nama) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '"><i data-w="' + v + '"' + (st.instant ? ' style="width:' + v + '%"' : '') + '></i></div></div>';
    }).join('') || '<p class="muted">No skills in this category yet.</p>';
    $('#skill-panel-title').textContent = st.skillCat + ' proficiency';
    const top = list.slice().sort(function (a, b) { return b.tingkat - a.tingkat; }).slice(0, 6);
    const radar = $('#skill-radar-card');
    if (top.length >= 3) {
      radar.hidden = false;
      $('#skill-radar').innerHTML = MV.charts.radar(top.map(function (s) { return s.nama; }), top.map(function (s) { return s.tingkat; }), { aria: st.skillCat + ' skills radar chart' });
      $('#skill-radar-title').textContent = st.skillCat + ' skills at a glance';
    } else radar.hidden = true;
    const tools = all.filter(function (s) { return s.tampil_grid; });
    $('#tools-card').hidden = !tools.length;
    $('#tools').innerHTML = tools.map(function (s) {
      return '<div class="tool"><span class="tool-ico">' + (s.ikon_id ? MV.imgTag(s.ikon_id, '', 120) : esc(MV.initials(s.nama))) + '</span>' + esc(s.nama) + '</div>';
    }).join('');
  }

  // ---------- Achievements ----------
  function achievements(d) {
    const all = d.prestasi || [];
    show('achievements', all.length);
    if (!all.length) return;
    const types = ['Prestasi', 'Penghargaan', 'Sertifikat'].filter(function (t) { return all.some(function (x) { return x.jenis === t; }); });
    if (st.achType !== 'all' && types.indexOf(st.achType) === -1) st.achType = 'all';
    $('#ach-filter').innerHTML = types.length > 1 ? ['all'].concat(types).map(function (t) {
      return '<button type="button" class="pill" data-ach="' + t + '" aria-pressed="' + (st.achType === t) + '">' + (t === 'all' ? 'All' : LABEL[t]) + '</button>';
    }).join('') : '';
    const list = all.filter(function (x) { return st.achType === 'all' || x.jenis === st.achType; });
    $('#ach-list').innerHTML = list.map(function (x, i) {
      const ic = x.jenis === 'Sertifikat' ? 'file-text' : x.jenis === 'Penghargaan' ? 'trophy' : 'award';
      return '<article class="card card-hover ach-card spot ' + rv((i % 3) * 70) + '">' +
        '<div class="ach-thumb" style="position:relative">' + I(ic) + (x.file_id ? MV.imgTag(x.file_id, x.judul, 800, 'style="position:absolute;inset:0"') : '') + '</div>' +
        '<div class="ach-body"><span class="badge" style="align-self:flex-start">' + esc(LABEL[x.jenis] || x.jenis) + '</span><h3>' + esc(x.judul) + '</h3>' +
        '<div class="meta">' + [esc(x.penerbit), esc(fmtYM(x.tanggal))].filter(Boolean).join(' · ') + '</div>' +
        (x.deskripsi ? '<p class="meta">' + esc(x.deskripsi) + '</p>' : '') +
        '<div class="ach-actions">' + (x.file_id ? '<button type="button" class="btn btn-ghost btn-sm" data-view="' + esc(x.file_id) + '" data-title="' + esc(x.judul) + '">' + I('eye', 'icon-sm') + 'View</button>' : '') +
        (x.tautan_verifikasi ? '<a class="btn btn-ghost btn-sm" href="' + esc(x.tautan_verifikasi) + '" target="_blank" rel="noopener noreferrer">Verify ' + I('arrow-up-right', 'icon-sm') + '</a>' : '') + '</div></div></article>';
    }).join('');
  }

  // ---------- Projects ----------
  MV.tallImg = function (img) {                // tangkapan layar tinggi → digulir pelan saat disorot
    const card = img.closest('.proj-card');
    if (card && img.naturalWidth && img.naturalHeight / img.naturalWidth > 0.8) card.classList.add('tall');
  };
  function projectsSection(d) {
    const kat = d.kategori || [], all = d.proyek || [];
    const used = kat.filter(function (k) { return all.some(function (p) { return p.kategori_id === k.id; }); });
    if (st.projCat !== 'all' && !used.some(function (k) { return k.id === st.projCat; })) st.projCat = 'all';
    $('#proj-filter').innerHTML = used.length > 1 ? [{ id: 'all', nama: 'All' }].concat(used).map(function (k) {
      const n = k.id === 'all' ? all.length : all.filter(function (p) { return p.kategori_id === k.id; }).length;
      return '<button type="button" class="pill" data-cat="' + esc(k.id) + '" aria-pressed="' + (st.projCat === k.id) + '">' + esc(k.nama) + ' <span class="count">' + n + '</span></button>';
    }).join('') : '';
    projectsGrid();
    const counts = used.map(function (k) { return { label: k.nama, value: all.filter(function (p) { return p.kategori_id === k.id; }).length }; });
    const box = $('#proj-breakdown');
    box.hidden = counts.length < 2;
    if (counts.length >= 2) {
      box.innerHTML = '<div class="chart-box">' + MV.charts.donut(counts, { label: 'Projects', aria: 'Projects by category' }) + '</div>' +
        '<div><h3>Projects by category</h3><p class="muted" style="margin-bottom:16px">' + all.length + ' projects across ' + counts.length + ' categories.</p>' + MV.charts.legend(counts) + '</div>';
    }
  }

  function projectsList() {
    const d = st.d, kat = {};
    (d.kategori || []).forEach(function (k) { kat[k.id] = k.nama; });
    const q = st.projQ.toLowerCase().trim();
    return { kat: kat, list: (d.proyek || []).filter(function (p) {
      if (st.projCat !== 'all' && p.kategori_id !== st.projCat) return false;
      if (!q) return true;
      return (p.judul + ' ' + p.ringkasan + ' ' + p.teknologi.join(' ') + ' ' + (kat[p.kategori_id] || '')).toLowerCase().indexOf(q) > -1;
    }) };
  }

  function projectsGrid() {
    const d = st.d, x = projectsList(), kat = x.kat, list = x.list;
    const shown = list.slice(0, st.projShown);
    const anim = st.projAnim && !MV.reduceMotion;
    $('#proj-grid').innerHTML = shown.length ? shown.map(function (p, i) {
      const tech = p.teknologi.slice(0, 4).map(esc).join(' <i>/</i> ') + (p.teknologi.length > 4 ? ' <i>+' + (p.teknologi.length - 4) + '</i>' : '');
      return '<article class="card proj-card spot ' + (anim ? 'enter" style="--i:' + i + '"' : rv((i % 3) * 80) + '"') + ' data-tilt>' +
        '<div class="glare" aria-hidden="true"></div>' +
        '<div class="proj-cover">' + (p.gambar_id ? MV.imgTag(p.gambar_id, p.judul, 1000, 'onload="MV.tallImg(this)"') : MV.coverPh(p.judul, p.id)) +
        (p.unggulan ? '<span class="badge badge-solid">' + I('star', 'icon-sm') + 'Featured</span>' : '') +
        '<div class="proj-overlay" aria-hidden="true"><span class="btn btn-primary btn-sm">View Project ' + I('arrow-right', 'icon-sm') + '</span>' + (p.tahun ? '<span class="yr">' + esc(p.tahun) + '</span>' : '') + '</div></div>' +
        '<div class="proj-body">' + (kat[p.kategori_id] ? '<span class="proj-cat">' + esc(kat[p.kategori_id]) + '</span>' : '') +
        '<h3><a class="stretched" href="proyek.html?slug=' + encodeURIComponent(p.slug) + '">' + esc(p.judul) + '</a></h3>' +
        (p.ringkasan ? '<p>' + esc(p.ringkasan) + '</p>' : '') +
        '<div class="proj-foot"><div class="tech-line" title="' + esc(p.teknologi.join(', ')) + '">' + (tech || '&nbsp;') + '</div>' +
        MV.likes.button('proyek', p.id, (d.likes || {})['proyek:' + p.id] || 0, 'on-top') + '</div></div></article>';
    }).join('') : '';
    $('#proj-empty').hidden = !!shown.length;
    $('#proj-more').hidden = list.length <= st.projShown;
    $('#proj-all').hidden = list.length <= st.projShown;
    $('#proj-count').textContent = list.length ? 'Showing ' + shown.length + ' of ' + list.length : '';
    st.projAnim = false;
    if (!st.instant && !anim) MV.reveal($('#proj-grid'));
  }

  // Ganti isi grid dengan animasi keluar → masuk bertahap
  function swapProjects(mutate) {
    const grid = $('#proj-grid');
    mutate();
    st.instant = false;
    if (MV.reduceMotion) { projectsGrid(); return; }
    grid.classList.add('is-swapping');
    setTimeout(function () { grid.classList.remove('is-swapping'); st.projAnim = true; projectsGrid(); }, 170);
  }

  // ---------- Articles & Research (3 terbaru) ----------
  function writing(d) {
    const all = d.tulisan || [];
    show('writing', all.length);
    $('#writing-grid').innerHTML = all.map(function (m, i) { return MV.site.postCard(m, d.likes || {}, rv((i % 3) * 80)); }).join('');
  }

  // ---------- Process ----------
  function process(d) {
    const all = d.proses || [];
    show('process', all.length);
    const ol = $('#proc-list');
    ol.style.setProperty('--n', Math.min(all.length, 6));
    ol.innerHTML = all.map(function (s, i) {
      return '<li class="step ' + rv(i * 120) + '"><span class="step-num tnum" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span><div><h3>' + esc(s.judul) + '</h3><p>' + esc(s.deskripsi) + '</p></div></li>';
    }).join('');
  }

  // ---------- Testimonials (slider 6 detik, geser, jeda saat disorot) ----------
  function testimonials(d) {
    const all = d.testimoni || [];
    show('testimonials', all.length);
    if (!all.length) return;
    if (st.testi >= all.length) st.testi = 0;
    $('#testi-slides').innerHTML = all.map(function (t, i) {
      return '<div class="testi-slide' + (i === st.testi ? ' is-active' : '') + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + all.length + '">' +
        '<blockquote>“' + esc(t.isi) + '”</blockquote><div class="testi-person"><span class="avatar">' + (t.foto_id ? MV.imgTag(t.foto_id, '', 160) : esc(MV.initials(t.nama))) + '</span>' +
        '<div><b>' + esc(t.nama) + '</b><span>' + [esc(t.jabatan), esc(t.instansi)].filter(Boolean).join(', ') + '</span></div></div></div>';
    }).join('');
    $('#testi-nav').hidden = all.length < 2;
    $('#testi-dots').innerHTML = all.map(function (t, i) { return '<button type="button" aria-label="Show testimonial ' + (i + 1) + '"' + (i === st.testi ? ' aria-current="true"' : '') + ' data-testi="' + i + '"></button>'; }).join('');
    autoplay();
  }
  function goTesti(i) {
    const slides = MV.$$('.testi-slide'), dots = MV.$$('#testi-dots button');
    if (!slides.length) return;
    st.testi = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle('is-active', k === st.testi); });
    dots.forEach(function (b, k) { if (k === st.testi) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function autoplay() {
    clearInterval(st.timer);
    if (MV.reduceMotion || MV.$$('.testi-slide').length < 2) return;
    st.timer = setInterval(function () { if (!st.paused && document.visibilityState === 'visible') goTesti(st.testi + 1); }, 6000);
  }

  // ---------- Ajakan & kontak ----------
  function cta(d) {
    const s = d.pengaturan || {};
    if (s.cta_judul) $('#cta-title').textContent = s.cta_judul;
    if (s.cta_teks) $('#cta-body p').textContent = s.cta_teks;
    const img = $('.cta-bg img');
    if (img && s.cta_bg_id) { img.src = MV.img(s.cta_bg_id, 2000); img.dataset.altSrc = MV.imgAlt(s.cta_bg_id, 2000); img.onerror = function () { MV.imgFallback(this); }; }
  }
  function contact(d) {
    const k = d.kontak || {};
    const rows = [];
    if (k.email) rows.push('<a class="contact-row" href="mailto:' + esc(k.email) + '"><span class="icon-tile">' + I('mail') + '</span><div><small>Email</small><span>' + esc(k.email) + '</span></div></a>');
    if (k.telepon) rows.push('<a class="contact-row" href="tel:' + esc(String(k.telepon).replace(/[^\d+]/g, '')) + '"><span class="icon-tile">' + I('phone') + '</span><div><small>Phone</small><span>' + esc(k.telepon) + '</span></div></a>');
    if (k.lokasi) rows.push('<div class="contact-row"><span class="icon-tile">' + I('map-pin') + '</span><div><small>Location</small><span>' + esc(k.lokasi) + '</span></div></div>');
    const sos = MV.site.socialList(k.sosial);
    $('#contact-rows').innerHTML = rows.join('') + (sos.length ? '<div class="socials">' + sos.map(function (x) {
      return '<a class="icon-btn" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(x.label) + '" title="' + esc(x.label) + '">' + I(x.platform) + '</a>';
    }).join('') + '</div>' : '');
  }

  // ---------- Render penuh ----------
  function render(d, instant) {
    st.d = d;
    st.instant = !!instant;
    st.projShown = Math.max(3, Number((d.pengaturan || {}).jumlah_proyek_awal) || 6);
    const p = d.profil || {};
    document.title = (p.nama ? p.nama + ' — ' : '') + ((d.pengaturan || {}).judul_situs || 'MyVerse');
    MV.site.setMeta({ profil: p, kontak: d.kontak, pengaturan: d.pengaturan });
    [hero, about, services, projectsSection, experience, skills, achievements, writing, process, testimonials, cta, contact].forEach(function (fn) {
      try { fn(d); } catch (e) { console.error(fn.name, e); }
    });
    MV.reveal(main);
    if (MV.onScrollFx) MV.onScrollFx(window.scrollY);
  }

  function updateLikes(likes) {
    st.d.likes = likes;
    MV.$$('[data-like]').forEach(function (b) {
      const n = likes[b.dataset.like + ':' + b.dataset.id];
      const el = b.querySelector('.n');
      if (el && n !== undefined) el.textContent = n;
    });
  }

  function errorState(err) {
    $('#home').innerHTML = '<div class="hero-bg" aria-hidden="true"><img src="assets/hero-bg.svg" alt=""></div><div class="hero-shade" aria-hidden="true"></div>' +
      '<div class="container"><div class="card config-banner"><div class="icon-tile" style="margin:0 auto 16px">' + I('alert') + '</div>' +
      '<h1 class="h3">We couldn\'t load this portfolio</h1><p class="muted" style="margin:10px 0 20px">' + esc((err && err.message) || 'Please check your connection.') + '</p>' +
      '<button class="btn btn-primary" type="button" onclick="location.reload()">' + I('refresh', 'icon-sm') + 'Try again</button></div></div>';
  }

  async function load() {
    const cache = MV.store.get('mv_boot');
    if (cache && cache.data) render(cache.data, false);
    const r = await MV.api('public.bootstrap');
    if (r.ok) {
      MV.store.set('mv_boot', { version: r.version, at: Date.now(), data: r.data });
      if (!cache || !cache.data) render(r.data, false);
      else if (cache.version !== r.version) render(r.data, true);
      else updateLikes(r.data.likes || {});
    } else if (!cache || !cache.data) {
      errorState(r.error);
    }
  }

  // ---------- Interaksi (delegasi event) ----------
  main.addEventListener('click', async function (e) {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-exp]'))) { st.expType = b.dataset.exp; st.instant = false; experience(st.d); MV.reveal($('#experience')); MV.onScrollFx(window.scrollY); }
    else if ((b = t.closest('[data-ach]'))) { st.achType = b.dataset.ach; st.instant = false; achievements(st.d); MV.reveal($('#achievements')); }
    else if ((b = t.closest('[data-skill]'))) {
      st.skillCat = b.dataset.skill; st.instant = false; skills(st.d);
      requestAnimationFrame(function () { MV.$$('#skill-bars .bar > i').forEach(function (i) { i.style.width = i.dataset.w + '%'; }); });
    }
    else if ((b = t.closest('[data-cat]'))) {
      const cat = b.dataset.cat;
      MV.$$('#proj-filter .pill').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      swapProjects(function () { st.projCat = cat; st.projShown = Math.max(3, Number(st.d.pengaturan.jumlah_proyek_awal) || 6); });
    }
    else if ((b = t.closest('[data-view]'))) { MV.viewer.open({ type: 'pdf', id: b.dataset.view, title: b.dataset.title }); }
    else if ((b = t.closest('[data-testi]'))) { goTesti(Number(b.dataset.testi)); autoplay(); }
    else if ((b = t.closest('[data-copy]'))) {
      const ok = await MV.copy(b.dataset.copy);
      b.classList.toggle('ok', ok); b.innerHTML = I(ok ? 'check' : 'copy', 'icon-sm');
      MV.toast(ok ? 'Email copied to clipboard.' : 'Could not copy — please copy it manually.', ok ? 'ok' : 'err', 2500);
      setTimeout(function () { b.classList.remove('ok'); b.innerHTML = I('copy', 'icon-sm'); }, 1800);
    }
    else if (t.closest('#proj-more')) { st.projAnim = true; st.projShown += 6; st.instant = false; projectsGrid(); }
    else if (t.closest('#proj-all')) { st.projAnim = true; st.projShown = projectsList().list.length; st.instant = false; projectsGrid(); }
    else if (t.closest('#testi-prev')) { goTesti(st.testi - 1); autoplay(); }
    else if (t.closest('#testi-next')) { goTesti(st.testi + 1); autoplay(); }
  });
  $('#skill-tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = MV.$$('#skill-tabs [role="tab"]'), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); n.click();
  });
  $('#proj-search').addEventListener('input', MV.debounce(function (e) {
    const v = e.target.value;
    swapProjects(function () { st.projQ = v; st.projShown = Math.max(3, Number(st.d.pengaturan.jumlah_proyek_awal) || 6); });
  }, 180));
  const testiBox = $('#testi-box');
  testiBox.addEventListener('mouseenter', function () { st.paused = true; });
  testiBox.addEventListener('mouseleave', function () { st.paused = false; });
  testiBox.addEventListener('focusin', function () { st.paused = true; });
  testiBox.addEventListener('focusout', function () { st.paused = false; });
  let sx = null;
  testiBox.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  testiBox.addEventListener('touchend', function (e) {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { goTesti(st.testi + (dx < 0 ? 1 : -1)); autoplay(); }
    sx = null;
  });

  // Formulir kontak (US-12)
  const form = $('#contact-form');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const f = form.elements, status = $('#form-status');
    const data = { nama: f.nama.value.trim(), email: f.email.value.trim(), subjek: f.subjek.value.trim(), isi: f.isi.value.trim(), website: f.website.value, pengunjung_id: MV.vid() };
    const errs = {};
    if (!data.nama) errs.nama = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errs.email = 'Please enter a valid email.';
    if (!data.subjek) errs.subjek = 'Please add a subject.';
    if (data.isi.length < 10) errs.isi = 'Message must be at least 10 characters.';
    if (data.isi.length > 2000) errs.isi = 'Message must be 2000 characters or fewer.';
    ['nama', 'email', 'subjek', 'isi'].forEach(function (k) {
      f[k].setAttribute('aria-invalid', errs[k] ? 'true' : 'false');
      const m = $('#err-' + k); if (m) m.textContent = errs[k] || '';
    });
    const first = Object.keys(errs)[0];
    if (first) { f[first].focus(); status.className = 'form-status err'; status.textContent = 'Please fix the highlighted fields.'; return; }
    const btn = $('#contact-submit');
    btn.disabled = true; btn.classList.add('is-loading');
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Sending…';
    status.className = 'form-status'; status.textContent = '';
    const r = await MV.api('contact.send', data);
    btn.disabled = false; btn.classList.remove('is-loading');
    btn.innerHTML = 'Send Message ' + I('send', 'icon-sm');
    if (r.ok) {
      form.reset();
      status.className = 'form-status ok'; status.textContent = 'Message sent — thank you! I\'ll get back to you soon.';
      MV.toast('Message sent — thank you!', 'ok');
    } else {
      status.className = 'form-status err'; status.textContent = (r.error && r.error.message) || 'Something went wrong. Please try again.';
    }
  });
  $('#isi-count') && form.elements.isi.addEventListener('input', function () { $('#isi-count').textContent = form.elements.isi.value.length + ' / 2000'; });

  MV.Activity.init();
  MV.site.spy();
  load();
})();
