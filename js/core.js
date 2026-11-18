/* =========================================================
   MyVerse — core.js
   Klien API (fetch ke Apps Script), cache lokal SWR, tema,
   toast, modal, grafik SVG, dan utilitas bersama.
   ========================================================= */
(function () {
  const MV = (window.MV = window.MV || {});
  const cfg = (MV.cfg = window.APP_CONFIG || {});
  MV.ready = !!cfg.GAS_URL && !/GANTI|XXXX/i.test(cfg.GAS_URL);
  MV.VERSION = '1.1.0';

  // ---------- Utilitas ----------
  MV.esc = function (s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  MV.$ = function (sel, root) { return (root || document).querySelector(sel); };
  MV.$$ = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };
  MV.debounce = function (fn, ms) { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  MV.initials = function (name) {
    const p = String(name || '?').trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  MV.hash = function (s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  // Teks profil: *kata* → sorotan ungu; baris baru dipertahankan
  MV.richText = function (s) {
    return MV.esc(s).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>').replace(/\n/g, '<br>');
  };
  MV.paragraphs = function (s) {
    return String(s || '').split(/\n{2,}|\r\n\r\n/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return '<p>' + MV.esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  };
  MV.lines = function (s) { return String(s || '').split(/\n/).map(function (x) { return x.replace(/^[-•*]\s*/, '').trim(); }).filter(Boolean); };
  MV.fmtDate = function (iso, locale, opts) {
    if (!iso) return '';
    const s = String(iso);
    if (/^\d{4}$/.test(s)) return s;
    const d = new Date(/^\d{4}-\d{2}$/.test(s) ? s + '-01' : s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString(locale || 'en-US', opts || { year: 'numeric', month: 'short', day: 'numeric' });
  };
  MV.relTime = function (iso) {
    const d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000;
    if (isNaN(diff)) return '';
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return Math.floor(diff / 60) + ' mnt lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' hari lalu';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ---------- Penyimpanan lokal aman ----------
  MV.store = {
    get: function (k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };

  // ---------- Kode perangkat (untuk suka & batas kirim pesan) ----------
  MV.vid = function () {
    let v = MV.store.get('mv_vid');
    if (!v || !/^[A-Za-z0-9-]{16,64}$/.test(v)) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
        'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
      MV.store.set('mv_vid', v);
    }
    return v;
  };

  // ---------- Pengukur performa (gas-scale-turbo §4.1) ----------
  const perfLog = [];
  MV.Perf = {
    add: function (e) { perfLog.push(e); if (perfLog.length > 200) perfLog.shift(); },
    entries: function () { return perfLog.slice(); },
    table: function () { console.table(perfLog.map(function (e) { return { aksi: e.action, total_ms: e.total, server_ms: e.server, jaringan_ms: e.total - (e.server || 0), cache: e.cached ? '✓' : '' }; })); },
    summary: function () {
      const g = {};
      perfLog.forEach(function (e) { (g[e.action] = g[e.action] || []).push(e.total); });
      console.table(Object.keys(g).map(function (k) { const a = g[k]; return { aksi: k, panggilan: a.length, rata_ms: Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) }; }));
    }
  };
  window.Perf = MV.Perf;

  // ---------- Klien API ----------
  const PUBLIC_GET = /^(public\.bootstrap|project\.get|blog\.list|blog\.get|likes\.summary)$/;
  const READ = /(\.list|\.get|^stats\.|^system\.status|^auth\.check|^public\.|^likes\.|^backup\.list|^batch$)/;
  const inflight = {};
  let writeEpoch = 0;
  MV.token = function () { return MV._token || ''; };
  MV.onAuthFail = null;

  async function apiRun(action, data, opts) {
    opts = opts || {};
    const t0 = performance.now();
    if (!MV.ready) return { ok: false, error: { code: 'CONFIG', message: 'GAS_URL belum diisi di js/config.js' } };
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, opts.timeout || 30000);
    let res;
    try {
      let r;
      if (PUBLIC_GET.test(action) && !opts.post) {
        const q = '?action=' + encodeURIComponent(action) + (data && Object.keys(data).length ? '&d=' + encodeURIComponent(JSON.stringify(data)) : '');
        r = await fetch(cfg.GAS_URL + q, { method: 'GET', redirect: 'follow', signal: ctrl ? ctrl.signal : undefined });
      } else {
        // text/plain = simple request → tidak memicu preflight CORS yang diblok Apps Script
        r = await fetch(cfg.GAS_URL, {
          method: 'POST', redirect: 'follow', signal: ctrl ? ctrl.signal : undefined,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: action, data: data || {}, token: MV.token() })
        });
      }
      const text = await r.text();
      try { res = JSON.parse(text); }
      catch (e) { res = { ok: false, error: { code: 'BAD_RESPONSE', message: 'Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".' } }; }
    } catch (e) {
      res = { ok: false, error: { code: 'NETWORK', message: e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak bisa terhubung ke server. Periksa koneksi internet.' } };
    } finally { clearTimeout(timer); }
    MV.Perf.add({ action: action, total: Math.round(performance.now() - t0), server: res.ms, cached: !!res.cached });
    if (res.nq > 0) MV.scheduleDrain();
    if (!res.ok && res.error && res.error.code === 'AUTH' && typeof MV.onAuthFail === 'function') MV.onAuthFail(res);
    return res;
  }

  // Dedupe baca in-flight + epoch tulis (gas-scale-turbo §4.2)
  MV.api = function (action, data, opts) {
    if (!READ.test(action) || (opts && opts.fresh)) {
      if (!READ.test(action)) writeEpoch++;
      return apiRun(action, data, opts);
    }
    const k = writeEpoch + '|' + action + '|' + MV.token().slice(-12) + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = apiRun(action, data, opts);
    inflight[k] = p;
    p.then(function () { delete inflight[k]; }, function () { delete inflight[k]; });
    return p;
  };

  // Penggabung batch otomatis (gas-scale-turbo §4.3) — dipakai panel admin
  MV.Batcher = {
    q: null,
    add: function (action, data) {
      const self = this;
      return new Promise(function (resolve) {
        if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); }
        self.q.push({ action: action, data: data || {}, resolve: resolve });
      });
    },
    flush: function () {
      const q = this.q || []; this.q = null;
      const uniq = [], map = {};
      q.forEach(function (c) {
        const k = c.action + '|' + JSON.stringify(c.data);
        if (!map[k]) { map[k] = { action: c.action, data: c.data, waiters: [] }; uniq.push(map[k]); }
        map[k].waiters.push(c.resolve);
      });
      for (let i = 0; i < uniq.length; i += 10) {
        const part = uniq.slice(i, i + 10);
        if (part.length === 1) {
          MV.api(part[0].action, part[0].data).then(function (r) { part[0].waiters.forEach(function (w) { w(r); }); });
        } else {
          MV.api('batch', { calls: part.map(function (c) { return { action: c.action, data: c.data }; }) }).then(function (r) {
            part.forEach(function (c, j) {
              const one = r.ok ? r.data.results[j] : r;
              c.waiters.forEach(function (w) { w(one); });
            });
          });
        }
      }
    }
  };
  MV.apiQ = function (action, data) { return MV.Batcher.add(action, data); };

  // Kuras antrean email setelah aksi yang menambah notifikasi (gas-scale-turbo §4.6)
  let drainTimer = null, drainTries = 0;
  MV.scheduleDrain = function () {
    clearTimeout(drainTimer);
    drainTimer = setTimeout(async function run() {
      const r = await apiRun('drain', {});
      if (r.ok && r.data && r.data.left > 0 && ++drainTries < 3) drainTimer = setTimeout(run, 1500);
      else drainTries = 0;
    }, 400);
  };

  // Pemanas server dari browser (gas-scale-turbo §4.7): maks. 1×/4 menit per lingkup
  MV.warm = function (scope) {
    if (!MV.ready) return;
    try {
      const k = 'mv_warm_' + scope, last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
    } catch (e) { /* abaikan */ }
    fetch(cfg.GAS_URL + '?w=' + encodeURIComponent(scope), { mode: 'no-cors' }).catch(function () {});
  };

  // ---------- Gambar dari Google Drive ----------
  MV.img = function (id, w) { return id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 1200) : ''; };
  MV.imgAlt = function (id, w) { return 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + (w || 1200); };
  MV.preview = function (id) { return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview'; };
  MV.download = function (id) { return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id); };
  MV.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      t.remove(); return ok;
    }
  };
  MV.imgTag = function (id, alt, w, extra) {
    if (!id) return '';
    return '<img src="' + MV.img(id, w) + '" alt="' + MV.esc(alt || '') + '" loading="lazy" decoding="async" ' +
      'data-alt-src="' + MV.imgAlt(id, w) + '" onerror="MV.imgFallback(this)" ' + (extra || '') + '>';
  };
  MV.imgFallback = function (el) {
    if (el.dataset.altSrc && el.src !== el.dataset.altSrc) { el.src = el.dataset.altSrc; return; }
    el.onerror = null;
    el.style.visibility = 'hidden';
  };
  const PALET = [['#1A6AE5', '#5AA2FF'], ['#0E4BAA', '#3D86F5'], ['#1D72F2', '#7CC0FF'], ['#123E85', '#4C8DFF'], ['#0B5CD6', '#6FB1FF']];
  MV.coverPh = function (title, seed) {
    const p = PALET[MV.hash(seed || title) % PALET.length];
    return '<div class="cover-ph" style="--c1:' + p[0] + ';--c2:' + p[1] + '" aria-hidden="true"><span>' + MV.esc(MV.initials(title)) + '</span></div>';
  };

  // ---------- Tema terang/gelap ----------
  MV.theme = {
    mode: function () { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; },
    apply: function (dark) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      MV.$$('[data-theme-toggle]').forEach(function (b) {
        b.innerHTML = MV.icon(dark ? 'sun' : 'moon');
        b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        b.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
      });
      document.dispatchEvent(new CustomEvent('mv:theme'));
    },
    toggle: function () { const dark = MV.theme.mode() !== 'dark'; MV.store.set('mv_theme', dark ? 'gelap' : 'terang'); MV.theme.apply(dark); },
    resolve: function (pref) {
      const p = pref || 'sistem';
      return p === 'gelap' || (p === 'sistem' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    },
    setDefault: function (def) {           // tema bawaan dari pengaturan situs
      MV.store.set('mv_theme_default', def || 'sistem');
      if (!MV.store.get('mv_theme')) MV.theme.apply(MV.theme.resolve(def));
    },
    init: function () {
      const pref = MV.store.get('mv_theme') || MV.store.get('mv_theme_default') || 'sistem';
      MV.theme.apply(MV.theme.resolve(pref));
      if (window.matchMedia) {
        const mq = matchMedia('(prefers-color-scheme: dark)');
        const onChange = function () { if (!MV.store.get('mv_theme') && (MV.store.get('mv_theme_default') || 'sistem') === 'sistem') MV.theme.apply(mq.matches); };
        if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
      }
      document.addEventListener('click', function (e) {
        const b = e.target.closest('[data-theme-toggle]');
        if (b) MV.theme.toggle();
      });
    }
  };

  // ---------- Toast ----------
  MV.toast = function (msg, type, ms) {
    let wrap = MV.$('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = MV.icon(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check-circle') + '<p>' + MV.esc(msg) + '</p>';
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 320); }, ms || 4000);
  };

  // ---------- Modal penampil (PDF / gambar), tanpa tombol unduh ----------
  let lastFocus = null;
  MV.viewer = {
    open: function (o) {
      let m = MV.$('#mv-viewer');
      if (!m) {
        m = document.createElement('div');
        m.id = 'mv-viewer'; m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'mv-viewer-title');
        m.innerHTML = '<div class="modal-backdrop" data-close></div><div class="modal-panel"><div class="modal-head"><h2 id="mv-viewer-title"></h2>' +
          '<button class="icon-btn" data-close aria-label="Close">' + MV.icon('x') + '</button></div><div class="modal-body"></div><div class="modal-note"></div></div>';
        document.body.appendChild(m);
        m.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) MV.viewer.close(); });
        m.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
      }
      lastFocus = document.activeElement;
      MV.$('#mv-viewer-title', m).textContent = o.title || '';
      const body = MV.$('.modal-body', m);
      const note = MV.$('.modal-note', m);
      if (o.type === 'pdf') {
        body.innerHTML = '<div class="loading-note">Loading document…</div><iframe title="' + MV.esc(o.title || 'Document') + '" src="' + MV.preview(o.id) + '" allow="autoplay" referrerpolicy="no-referrer"></iframe>';
        note.textContent = o.note || 'View only — downloading is disabled.';
      } else {
        body.innerHTML = '<img src="' + (o.src || MV.img(o.id, 2000)) + '" alt="' + MV.esc(o.title || '') + '" draggable="false" data-alt-src="' + (o.id ? MV.imgAlt(o.id, 2000) : '') + '" onerror="MV.imgFallback(this)">';
        note.textContent = o.note || '';
      }
      note.style.display = note.textContent ? '' : 'none';
      m.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { const b = MV.$('[data-close].icon-btn', m); if (b) b.focus(); }, 30);
    },
    close: function () {
      const m = MV.$('#mv-viewer');
      if (!m) return;
      m.classList.remove('is-open');
      MV.$('.modal-body', m).innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { MV.viewer.close(); if (MV.closeDrawer) MV.closeDrawer(); } });

  // ---------- Animasi masuk & hitung naik ----------
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  MV.reduceMotion = reduce;
  let io = null;
  // Setelah animasi masuk selesai, kelas .reveal dilepas agar transisi/efek milik elemen (hover, miring 3D) tidak tertunda
  function lepas(el) {
    const d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
    setTimeout(function () { el.classList.remove('reveal', 'from-left', 'from-right', 'zoom'); }, d + 760);
  }
  MV.reveal = function (root) {
    MV.$$('.reveal.is-in', root).forEach(lepas);
    const els = MV.$$('.reveal:not(.is-in)', root);
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); onIn(el); }); return; }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); onIn(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  };
  function onIn(el) {
    lepas(el);
    MV.$$('[data-count]', el).forEach(MV.countUp);
    MV.$$('.bar > i[data-w]', el).forEach(function (b) { b.style.width = b.dataset.w + '%'; });
  }
  MV.countUp = function (el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = Number(el.dataset.count) || 0, suffix = el.dataset.suffix || '';
    if (reduce || target === 0) { el.textContent = target + suffix; return; }
    const t0 = performance.now(), dur = 1100;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };

  // ---------- Efek interaktif: sorotan kursor, kemiringan 3D, tombol magnetik ----------
  MV.fx = {
    fine: function () { return !reduce && window.matchMedia && matchMedia('(pointer: fine)').matches; },
    bind: function () {
      if (MV.fx.bound || !MV.fx.fine()) return;
      MV.fx.bound = true;
      let raf = 0, last = null;
      document.addEventListener('pointermove', function (e) {
        last = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          const t = last.target;
          const spot = t.closest && t.closest('.spot');
          if (spot) { const r = spot.getBoundingClientRect(); spot.style.setProperty('--mx', (last.clientX - r.left) + 'px'); spot.style.setProperty('--my', (last.clientY - r.top) + 'px'); }
          const tilt = t.closest && t.closest('[data-tilt]');
          if (tilt) {
            const r = tilt.getBoundingClientRect(), x = (last.clientX - r.left) / r.width, y = (last.clientY - r.top) / r.height;
            tilt.classList.add('tilting');
            tilt.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
            tilt.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
            tilt.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
            tilt.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
          }
          const mag = t.closest && t.closest('[data-magnetic]');
          if (mag) { const r = mag.getBoundingClientRect(); mag.style.transform = 'translate(' + ((last.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((last.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px)'; }
        });
      }, { passive: true });
      document.addEventListener('pointerout', function (e) {
        const tilt = e.target.closest && e.target.closest('[data-tilt]');
        if (tilt && !tilt.contains(e.relatedTarget)) { tilt.classList.remove('tilting'); tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); }
        const mag = e.target.closest && e.target.closest('[data-magnetic]');
        if (mag && !mag.contains(e.relatedTarget)) mag.style.transform = '';
      });
    }
  };

  // ---------- Grafik SVG ringan (tanpa pustaka) ----------
  MV.colors = function () {
    const cs = getComputedStyle(document.documentElement);
    return [1, 2, 3, 4, 5, 6].map(function (i) { return cs.getPropertyValue('--chart-' + i).trim() || '#1A6AE5'; });
  };
  MV.charts = {
    donut: function (items, o) {
      o = o || {};
      const total = items.reduce(function (s, x) { return s + (Number(x.value) || 0); }, 0);
      const C = MV.colors(), R = 70, SW = o.stroke || 22, L = 2 * Math.PI * R;
      let off = 0;
      const segs = total ? items.map(function (x, i) {
        const len = (Number(x.value) || 0) / total * L;
        const gap = items.filter(function (y) { return y.value > 0; }).length > 1 ? 3 : 0;
        const s = '<circle r="' + R + '" cx="100" cy="100" fill="none" stroke="' + C[i % C.length] + '" stroke-width="' + SW +
          '" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (L - Math.max(0, len - gap)) + '" stroke-dashoffset="' + (-off) +
          '" transform="rotate(-90 100 100)" stroke-linecap="butt"><title>' + MV.esc(x.label) + ': ' + x.value + '</title></circle>';
        off += len;
        return s;
      }).join('') : '';
      return '<svg viewBox="0 0 200 200" role="img" aria-label="' + MV.esc(o.aria || 'Chart') + '">' +
        '<circle r="' + R + '" cx="100" cy="100" fill="none" stroke="var(--primary-100)" stroke-width="' + SW + '"/>' + segs +
        '<text x="100" y="98" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="34" fill="var(--text)">' + total + '</text>' +
        '<text x="100" y="122" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="11" letter-spacing="1.5" fill="var(--text-3)">' + MV.esc((o.label || 'TOTAL').toUpperCase()) + '</text></svg>';
    },
    legend: function (items) {
      const C = MV.colors(), total = items.reduce(function (s, x) { return s + (Number(x.value) || 0); }, 0) || 1;
      return '<ul class="chart-legend">' + items.map(function (x, i) {
        return '<li><span class="swatch" style="background:' + C[i % C.length] + '"></span>' + MV.esc(x.label) +
          '<b>' + x.value + ' <span class="muted" style="font-weight:500">(' + Math.round(x.value / total * 100) + '%)</span></b></li>';
      }).join('') + '</ul>';
    },
    radar: function (labels, values, o) {
      o = o || {};
      const n = labels.length;
      if (n < 3) return '';
      const cx = 170, cy = 145, R = 86;
      const pt = function (i, r) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
      let grid = '';
      [0.25, 0.5, 0.75, 1].forEach(function (f) {
        grid += '<polygon points="' + labels.map(function (_, i) { return pt(i, R * f).join(','); }).join(' ') + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
      });
      labels.forEach(function (_, i) { const p = pt(i, R); grid += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="var(--border)"/>'; });
      const v = function (x) { return Math.max(0, Math.min(100, x)); };
      const poly = values.map(function (x, i) { return pt(i, R * v(x) / 100).join(','); }).join(' ');
      const dots = values.map(function (x, i) { const p = pt(i, R * v(x) / 100); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="var(--primary)"><title>' + MV.esc(labels[i]) + ': ' + x + '%</title></circle>'; }).join('');
      const txt = labels.map(function (l, i) {
        const p = pt(i, R + 16), dx = p[0] - cx;
        const anchor = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end';
        const short = l.length > 14 ? l.slice(0, 13) + '…' : l;
        const y = p[1] + (p[1] < cy - 10 ? -10 : p[1] > cy + 10 ? 10 : -4);
        return '<text x="' + p[0] + '" y="' + y + '" text-anchor="' + anchor + '" font-size="12" font-weight="600" font-family="Inter, sans-serif" fill="var(--text-2)">' +
          MV.esc(short) + '<tspan x="' + p[0] + '" dy="15" fill="var(--primary-text)" font-weight="700">' + values[i] + '%</tspan></text>';
      }).join('');
      return '<svg viewBox="-20 -6 380 310" role="img" aria-label="' + MV.esc(o.aria || 'Radar chart') + '">' + grid +
        '<polygon points="' + poly + '" fill="var(--primary)" fill-opacity=".18" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round"/>' + dots + txt + '</svg>';
    },
    bars: function (items, o) {
      o = o || {};
      const max = Math.max.apply(null, items.map(function (x) { return x.value; }).concat([1]));
      const W = 520, H = 220, pad = 28, bw = (W - pad * 2) / items.length;
      const bars = items.map(function (x, i) {
        const h = Math.round((x.value / max) * (H - 70)), last = i === items.length - 1;
        const X = pad + i * bw + bw * 0.22, w = bw * 0.56, Y = H - 30 - h;
        return '<rect x="' + X + '" y="' + Y + '" width="' + w + '" height="' + Math.max(h, 2) + '" rx="8" fill="' + (last ? 'var(--primary)' : 'var(--primary-300)') + '"><title>' + MV.esc(x.label) + ': ' + x.value + '</title></rect>' +
          '<text x="' + (X + w / 2) + '" y="' + (Y - 8) + '" text-anchor="middle" font-size="12" font-weight="700" font-family="Inter, sans-serif" fill="' + (last ? 'var(--primary-text)' : 'var(--text-2)') + '">' + x.value + '</text>' +
          '<text x="' + (X + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" font-family="Inter, sans-serif" fill="' + (last ? 'var(--primary-text)' : 'var(--text-3)') + '" font-weight="' + (last ? 700 : 500) + '">' + MV.esc(x.label) + '</text>';
      }).join('');
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + MV.esc(o.aria || 'Bar chart') + '" style="width:100%;height:auto">' +
        '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - 30) + '" y2="' + (H - 30) + '" stroke="var(--border)"/>' + bars + '</svg>';
    }
  };

  // ---------- Aktivitas pengguna untuk polling adaptif (gas-scale-turbo §4.8) ----------
  MV.Activity = {
    at: Date.now(), last: {},
    init: function () {
      const self = this;
      ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) { window.addEventListener(ev, function () { self.at = Date.now(); }, { passive: true }); });
    },
    idle: function () { return Date.now() - this.at > 120000; },
    due: function (key, activeMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : activeMs) - 500) return false;
      this.last[key] = Date.now();
      return true;
    }
  };

  // ---------- Banner konfigurasi belum lengkap ----------
  MV.configBanner = function (target) {
    (target || document.body).innerHTML = '<div class="container"><div class="card config-banner"><div class="icon-tile" style="margin:0 auto 16px">' + MV.icon('settings') +
      '</div><h1 class="h3">Configuration incomplete</h1><p class="muted" style="margin-top:10px">Open <code>js/config.js</code> and paste your Apps Script Web App URL (ending in <code>/exec</code>) into <code>GAS_URL</code>.</p></div></div>';
  };

  MV.theme.init();
})();
