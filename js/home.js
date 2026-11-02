/* =========================================================
   MyVerse — home.js (landing page, 12 bagian)
   Tampil instan dari cache lokal, lalu diperbarui diam-diam
   bila versi isi di server berubah (SWR).
   ========================================================= */
(function () {
  const MV = window.MV, $ = MV.$, esc = MV.esc, I = MV.icon;
  const main = $('#main');
  if (!MV.ready) { MV.configBanner(main); return; }

  const LABEL = { Kerja: 'Work', Mengajar: 'Teaching', Organisasi: 'Organization', Profesional: 'Professional',
    Prestasi: 'Achievement', Penghargaan: 'Award', Sertifikat: 'Certificate' };
  const SKILL_CATS = ['Technical', 'Professional', 'Educational'];
  const st = { d: null, instant: false, expType: 'all', achType: 'all', skillCat: null, projCat: 'all', projQ: '', projShown: 6, testi: 0, timer: null };

  const rv = function (delay) { return 'reveal' + (st.instant ? ' is-in' : '') + '" style="--d:' + (delay || 0) + 'ms'; };
  const fmtYM = function (s) { s = String(s || ''); return /^\d{4}-\d{2}$/.test(s) ? MV.fmtDate(s, 'en-US', { month: 'short', year: 'numeric' }) : s; };
  const show = function (id, on) {
    const el = document.getElementById(id);
    if (el) el.hidden = !on;
    MV.$$('[data-nav="' + id + '"]').forEach(function (a) { a.parentElement && (a.parentElement.tagName === 'LI' ? a.parentElement : a).toggleAttribute('hidden', !on); });
  };

  // ---------- Hero ----------
  function hero(d) {
    const p = d.profil || {}, s = d.stats || {};
    const top = d.keterampilan.slice().sort(function (a, b) { return b.tingkat - a.tingkat; }).slice(0, 4);
    const stat = function (ic, n, suf, label) {
      const shown = st.instant ? n + suf : '0' + suf;
      return '<div class="hero-stat"><span class="icon-tile">' + I(ic) + '</span><div><b class="tnum" data-count="' + n + '" data-suffix="' + suf + '"' + (st.instant ? ' data-done="1"' : '') + '>' + shown + '</b><span>' + label + '</span></div></div>';
    };
    const foto = p.foto_id ? MV.imgTag(p.foto_id, 'Portrait of ' + (p.nama || ''), 900, 'fetchpriority="high"') : '<div class="initials">' + esc(MV.initials(p.nama)) + '</div>';
    $('#home').innerHTML = '<div class="container hero-grid">' +
      '<div class="hero-copy">' +
      '<span class="eyebrow-pill ' + rv(0) + '">' + I('sparkles', 'icon-sm') + 'Hello, I\'m</span>' +
      '<h1 class="' + rv(60) + '">' + esc(p.nama || 'Your Name') + '</h1>' +
      '<p class="role ' + rv(120) + '">' + MV.richText(p.profesi || '') + '</p>' +
      (p.deskripsi_singkat ? '<p class="intro ' + rv(180) + '">' + esc(p.deskripsi_singkat) + '</p>' : '<div style="height:28px"></div>') +
      '<div class="hero-cta ' + rv(240) + '"><a class="btn btn-primary" href="#projects">View My Work ' + I('arrow-right', 'icon-sm') + '</a>' +
      (p.cv_file_id ? '<button type="button" class="btn btn-secondary" data-cv>' + I('eye', 'icon-sm') + 'View CV</button>' : '') + '</div>' +
      '<div class="hero-stats ' + rv(300) + '">' +
      (s.tahun ? stat('briefcase', s.tahun, '+', 'Years Experience') : '') +
      stat('folder', s.proyek || 0, '', 'Projects Completed') +
      stat('award', s.prestasi || 0, '', 'Achievements & Certificates') + '</div>' +
      '</div>' +
      '<div class="hero-visual ' + rv(120) + '" id="hero-visual">' +
      '<svg class="rings" viewBox="0 0 400 400" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="200" cy="200" r="198" stroke-dasharray="2 7"/><circle cx="200" cy="200" r="165"/><circle cx="200" cy="200" r="128" stroke-dasharray="1 5"/></svg>' +
      '<div class="portrait">' + foto + '</div>' +
      (p.status_saat_ini ? '<div class="float-card glass fc-1"><div class="fc-label">Status</div><div class="fc-value"><span class="dot" aria-hidden="true"></span>' + esc(p.status_saat_ini) + '</div></div>' : '') +
      (top.length ? '<div class="float-card glass fc-2" aria-hidden="true"><div class="fc-label">Top skills</div>' + top.map(function (k) {
        return '<div class="fc-skill"><span>' + esc(k.nama) + '</span><span class="toggle-mini"></span></div>';
      }).join('') + '</div>' : '') +
      (top[0] ? '<div class="float-card glass fc-3" aria-hidden="true"><div class="fc-big tnum">' + top[0].tingkat + '%</div><div class="fc-label" style="margin-top:6px">' + esc(top[0].nama) + '</div></div>' : '') +
      '</div></div>';
    const cv = $('[data-cv]');
    if (cv) cv.addEventListener('click', function () { MV.viewer.open({ type: 'pdf', id: p.cv_file_id, title: 'Curriculum Vitae' }); });
    parallax();
  }

  function parallax() {
    const box = $('#hero-visual');
    if (!box || MV.reduceMotion || !matchMedia('(pointer: fine)').matches) return;
    const cards = MV.$$('.float-card', box);
    $('#home').addEventListener('pointermove', function (e) {
      const r = box.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
      cards.forEach(function (c, i) { const f = (i + 1) * 6; c.style.setProperty('--px', (x * f).toFixed(1) + 'px'); c.style.setProperty('--py', (y * f).toFixed(1) + 'px'); });
    });
  }

  // ---------- About ----------
  function about(d) {
    const p = d.profil || {};
    const fid = p.foto_tentang_id || p.foto_id;
    const journey = MV.lines(p.perjalanan_karier).map(function (l) {
      const x = l.split('|').map(function (s) { return s.trim(); });
      return { tahun: x[0] || '', judul: x[1] || '', ket: x[2] || '' };
    }).slice(0, 5);
    $('#about-body').innerHTML =
      '<div class="about-photo ' + rv(0) + '">' + (fid ? MV.imgTag(fid, 'Photo of ' + (p.nama || ''), 900) : '<div class="portrait" style="inset:0;border:0;box-shadow:none;border-radius:0"><div class="initials">' + esc(MV.initials(p.nama)) + '</div></div>') +
      (p.lokasi ? '<div class="tag glass" style="display:flex;align-items:center;gap:8px">' + I('map-pin', 'icon-sm') + esc(p.lokasi) + '</div>' : '') + '</div>' +
      '<div class="about-text"><span class="eyebrow ' + rv(0) + '">About Me</span><h2 class="h2 ' + rv(60) + '">Who I Am</h2>' +
      '<div class="' + rv(120) + '" style="margin-top:20px">' + MV.paragraphs(p.tentang) + MV.paragraphs(p.kepribadian_profesional) + '</div>' +
      (journey.length ? '<div class="journey ' + rv(180) + '"><div class="journey-title">Career Journey</div><div class="journey-track" style="--n:' + journey.length + '">' +
        journey.map(function (j) { return '<div class="milestone"><b class="tnum">' + esc(j.tahun) + '</b><strong>' + esc(j.judul) + '</strong>' + (j.ket ? '<span>' + esc(j.ket) + '</span>' : '') + '</div>'; }).join('') + '</div></div>' : '') +
      '</div>';
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
      return '<article class="card tl-item ' + rv(i * 50) + '"><div class="tl-head"><div><h3>' + esc(x.posisi) + '</h3><div class="tl-org">' + esc(x.instansi) + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + '</div></div>' +
        (range ? '<span class="badge tnum">' + esc(range) + '</span>' : '') + '</div>' +
        (x.deskripsi ? '<p>' + esc(x.deskripsi) + '</p>' : '') +
        (x.tag.length ? '<div class="tl-tags">' + x.tag.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '') + '</article>';
    }).join('') : '<div class="empty">No experience added yet.</div>';
    const group = function (jenis, title, ic) {
      const g = edu.filter(function (x) { return x.jenis === jenis; });
      if (!g.length) return '';
      return '<div class="edu-group ' + rv(0) + '"><h3><span class="icon-tile" style="width:36px;height:36px;border-radius:10px">' + I(ic, 'icon-sm') + '</span>' + title + '</h3><div class="edu-list">' +
        g.map(function (x) {
          const yr = [x.tahun_mulai, x.tahun_selesai].filter(Boolean).join(' — ');
          return '<div class="card edu-item"><div><h4>' + esc(x.jenjang_program) + '</h4><div class="meta">' + esc(x.institusi) + (x.jurusan ? ' · ' + esc(x.jurusan) : '') + '</div>' +
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
      return '<article class="card card-hover ach-card ' + rv((i % 3) * 60) + '">' +
        '<div class="ach-thumb" style="position:relative">' + I(ic) + (x.file_id ? MV.imgTag(x.file_id, x.judul, 800, 'style="position:absolute;inset:0"') : '') + '</div>' +
        '<div class="ach-body"><span class="badge" style="align-self:flex-start">' + esc(LABEL[x.jenis] || x.jenis) + '</span><h3>' + esc(x.judul) + '</h3>' +
        '<div class="meta">' + [esc(x.penerbit), esc(fmtYM(x.tanggal))].filter(Boolean).join(' · ') + '</div>' +
        (x.deskripsi ? '<p class="meta">' + esc(x.deskripsi) + '</p>' : '') +
        '<div class="ach-actions">' + (x.file_id ? '<button type="button" class="btn btn-ghost btn-sm" data-view="' + esc(x.file_id) + '" data-title="' + esc(x.judul) + '">' + I('eye', 'icon-sm') + 'View</button>' : '') +
        (x.tautan_verifikasi ? '<a class="btn btn-ghost btn-sm" href="' + esc(x.tautan_verifikasi) + '" target="_blank" rel="noopener noreferrer">Verify ' + I('arrow-up-right', 'icon-sm') + '</a>' : '') + '</div></div></article>';
    }).join('');
  }

  // ---------- Projects ----------
  function projectsSection(d) {
    const kat = d.kategori || [], all = d.proyek || [];
    const used = kat.filter(function (k) { return all.some(function (p) { return p.kategori_id === k.id; }); });
    if (st.projCat !== 'all' && !used.some(function (k) { return k.id === st.projCat; })) st.projCat = 'all';
    $('#proj-filter').innerHTML = used.length > 1 ? [{ id: 'all', nama: 'All' }].concat(used).map(function (k) {
      return '<button type="button" class="pill" data-cat="' + esc(k.id) + '" aria-pressed="' + (st.projCat === k.id) + '">' + esc(k.nama) + '</button>';
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

  function projectsGrid() {
    const d = st.d, kat = {};
    (d.kategori || []).forEach(function (k) { kat[k.id] = k.nama; });
    const q = st.projQ.toLowerCase().trim();
    const list = (d.proyek || []).filter(function (p) {
      if (st.projCat !== 'all' && p.kategori_id !== st.projCat) return false;
      if (!q) return true;
      return (p.judul + ' ' + p.ringkasan + ' ' + p.teknologi.join(' ') + ' ' + (kat[p.kategori_id] || '')).toLowerCase().indexOf(q) > -1;
    });
    const shown = list.slice(0, st.projShown);
    $('#proj-grid').innerHTML = shown.length ? shown.map(function (p, i) {
      return '<article class="card card-hover proj-card ' + rv((i % 3) * 60) + '" style="position:relative">' +
        '<div class="proj-cover">' + (p.gambar_id ? MV.imgTag(p.gambar_id, p.judul, 900) : MV.coverPh(p.judul, p.id)) +
        (p.unggulan ? '<span class="badge badge-solid">' + I('star', 'icon-sm') + 'Featured</span>' : '') + '</div>' +
        '<div class="proj-body">' + (kat[p.kategori_id] ? '<span class="badge" style="align-self:flex-start">' + esc(kat[p.kategori_id]) + '</span>' : '') +
        '<h3><a class="stretched" href="proyek.html?slug=' + encodeURIComponent(p.slug) + '">' + esc(p.judul) + '</a></h3>' +
        (p.ringkasan ? '<p>' + esc(p.ringkasan) + '</p>' : '') +
        '<div class="proj-foot"><div class="tech-chips">' + p.teknologi.slice(0, 3).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
        MV.likes.button('proyek', p.id, (d.likes || {})['proyek:' + p.id] || 0, 'on-top') + '</div></div></article>';
    }).join('') : '';
    $('#proj-empty').hidden = !!shown.length;
    $('#proj-more').hidden = list.length <= st.projShown;
    $('#proj-count').textContent = list.length ? 'Showing ' + shown.length + ' of ' + list.length : '';
    if (!st.instant) MV.reveal($('#proj-grid'));
  }

  // ---------- Services & Process ----------
  function services(d) {
    const all = d.layanan || [];
    show('services', all.length);
    $('#svc-grid').innerHTML = all.map(function (s, i) {
      return '<article class="card card-hover svc-card ' + rv(i * 60) + '"><span class="icon-tile">' + I(s.ikon || 'sparkles') + '</span><h3>' + esc(s.judul) + '</h3><p>' + esc(s.deskripsi) + '</p></article>';
    }).join('');
  }
  function process(d) {
    const all = d.proses || [];
    show('process', all.length);
    const ol = $('#proc-list');
    ol.style.setProperty('--n', Math.min(all.length, 6));
    ol.innerHTML = all.map(function (s, i) {
      return '<li class="step ' + rv(i * 80) + '"><span class="step-num tnum" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span><div><h3>' + esc(s.judul) + '</h3><p>' + esc(s.deskripsi) + '</p></div></li>';
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

  // ---------- Contact ----------
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
    [hero, about, experience, skills, achievements, projectsSection, services, process, testimonials, contact].forEach(function (fn) {
      try { fn(d); } catch (e) { console.error(fn.name, e); }
    });
    MV.reveal(main);
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
    $('#home').innerHTML = '<div class="container"><div class="card config-banner"><div class="icon-tile" style="margin:0 auto 16px">' + I('alert') + '</div>' +
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
  main.addEventListener('click', function (e) {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-exp]'))) { st.expType = b.dataset.exp; st.instant = false; experience(st.d); MV.reveal($('#experience')); }
    else if ((b = t.closest('[data-ach]'))) { st.achType = b.dataset.ach; st.instant = false; achievements(st.d); MV.reveal($('#achievements')); }
    else if ((b = t.closest('[data-skill]'))) {
      st.skillCat = b.dataset.skill; st.instant = false; skills(st.d);
      requestAnimationFrame(function () { MV.$$('#skill-bars .bar > i').forEach(function (i) { i.style.width = i.dataset.w + '%'; }); });
    }
    else if ((b = t.closest('[data-cat]'))) { st.projCat = b.dataset.cat; st.projShown = Math.max(3, Number(st.d.pengaturan.jumlah_proyek_awal) || 6); st.instant = false; projectsSection(st.d); }
    else if ((b = t.closest('[data-view]'))) { MV.viewer.open({ type: 'pdf', id: b.dataset.view, title: b.dataset.title }); }
    else if ((b = t.closest('[data-testi]'))) { goTesti(Number(b.dataset.testi)); autoplay(); }
    else if (t.closest('#proj-more')) { st.projShown += 6; st.instant = false; projectsGrid(); }
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
    st.projQ = e.target.value; st.projShown = Math.max(3, Number(st.d.pengaturan.jumlah_proyek_awal) || 6); st.instant = false; projectsGrid();
  }, 160));
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
