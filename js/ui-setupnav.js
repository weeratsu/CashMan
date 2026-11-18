// ui-setupnav.js v1 (Nov 18 2026) — Setup split into sub-pages. Moves existing cards (by heading) into new panels.
// No data/logic change. Remove this script tag → Setup returns to the original 3 sub-pages.
(function () {
  var PAGES = [ // id, label, icon, card heading matchers (regex on h2 text)
    { id: 'profile', label: 'Profile', icon: 'fa-user', cards: [/Profile & Income/, /^\s*Owners/] },
    { id: 'data', label: 'Data & Backup', icon: 'fa-cloud-arrow-up', cards: [/Backup & Restore/, /Google Sheet Sync/] },
    { id: 'cats', label: 'Categories', icon: 'fa-tags', cards: [/Transaction Types/, /Asset Types/, /To-Do Categories/, /Wishlist Categories/] },
    { id: 'bank', label: 'Bank & Account', icon: 'fa-building-columns', cards: [/Shared Limit Groups/] },
    { id: 'cal', label: 'Dashboard & Calendar', icon: 'fa-calendar-days', cards: [/Dashboard Layout/, /Calendar Style/], panels: ['holiday'] },
    { id: 'veh', label: 'Vehicles', icon: 'fa-car', cards: [/File Locations/] },
    { id: 'leave', label: 'Leave', icon: 'fa-umbrella-beach', cards: [/Leave/] }
  ];
  var KEY = 'cm_setup_sub', ORIG = ['profile', 'bank', 'holiday'];
  function panel(id) { return document.getElementById('setup-' + id) || document.getElementById('setup-x-' + id); }
  function ensurePanels() {
    var base = document.getElementById('setup-profile'); if (!base) return false;
    PAGES.forEach(function (p) {
      if (panel(p.id)) return;
      var d = document.createElement('div'); d.id = 'setup-x-' + p.id; d.className = base.className.replace(/\bactive\b/, ''); d.style.display = 'none';
      base.parentNode.appendChild(d);
    });
    // move cards (re-checked every tick: late-mounted cards like File Locations / Leave)
    var heads = [].slice.call(document.querySelectorAll('#tab-setup .card h2'));
    PAGES.forEach(function (p) {
      var dst = panel(p.id);
      p.cards.forEach(function (rx) {
        heads.forEach(function (h) {
          if (!rx.test(h.textContent)) return;
          var c = h.closest('.card'); if (!c || c.parentNode === dst) return;
          if (p.id === 'leave' && dst.contains(c)) return;
          if (p.id === 'leave' && !/leave|ลา/i.test(h.textContent)) return;
          dst.appendChild(c);
        });
      });
      (p.panels || []).forEach(function (pid) { var src = document.getElementById('setup-' + pid); if (src && src.parentNode !== dst) { src.style.display = ''; src.classList.add('active'); dst.appendChild(src); } });
    });
    return true;
  }
  function show(id) {
    localStorage.setItem(KEY, id);
    PAGES.forEach(function (p) { var e = panel(p.id); if (e) { var on = p.id === id; e.style.display = on ? '' : 'none'; e.classList.toggle('active', on); } });
    // holiday panel lives inside 'cal' now; keep it visible there
    var ho = document.getElementById('setup-holiday'); if (ho) { ho.style.display = ''; ho.classList.add('active'); }
    [].slice.call(document.querySelectorAll('.cmsn-tab')).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sn') === id); });
    try { window.scrollTo(0, 0); } catch (e) { }
  }
  window.setupGo = function (id) {
    var setupTab = document.getElementById('tab-setup');
    // Nov 18 2026 fix: open Setup through the ORIGINAL (hidden) Profile sub-button so app.js shows #tab-setup
    var orig = document.querySelector('.nav-sub[data-tab="setup"][data-sub="profile"]:not(.cmsn-tab)');
    if (setupTab && getComputedStyle(setupTab).display === 'none' && orig) { window._snBusy = 1; orig.click(); window._snBusy = 0; }
    setTimeout(function () { ensurePanels(); leaveCard(); show(id); [].slice.call(document.querySelectorAll('.nav-sub.cmsn-tab')).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sn') === id); }); }, 30);
  };
  // Leave settings live in a popup (lvSettings in ui-leave.js) — give the Leave page a card that opens it
  function leaveCard() {
    var dst = panel('leave'); if (!dst || dst.querySelector('#sn-leave-card')) return;
    var c = document.createElement('div'); c.className = 'card'; c.id = 'sn-leave-card';
    var T = (window.D && D.leave_types) || [];
    c.innerHTML = '<h2><i class="fa-solid fa-umbrella-beach"></i> Leave Settings</h2>' +
      '<p class="text-muted" style="font-size:10px;margin-bottom:8px">ชั่วโมงทำงาน/วัน · ประเภทการลา (ชื่อ, ไอคอน) · โควตาต่อปี — ใช้ใน To-Do › Leave และปุ่ม + Leave บนปฏิทิน</p>' +
      (T.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + T.map(function (t) { return '<span class="pill" style="font-size:11px;padding:3px 10px;border:1px solid var(--border);border-radius:999px">' + (t.icon || '') + ' ' + (t.name || t.id) + '</span>'; }).join('') + '</div>' : '') +
      '<button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="if(typeof lvSettings===\'function\')lvSettings()"><i class="fa-solid fa-gear"></i> แก้ Leave setup</button>';
    dst.appendChild(c);
  }
  function buildNav() {
    var wrap = document.querySelector('.nav-subwrap[data-parent="setup"]');
    if (wrap && !wrap.querySelector('.cmsn-tab')) {
      [].slice.call(wrap.children).forEach(function (b) { b.style.display = 'none'; });
      PAGES.forEach(function (p) {
        var b = document.createElement('button'); b.className = 'nav-sub cmsn-tab'; b.setAttribute('data-sn', p.id);
        b.innerHTML = '<span>' + p.label + '</span>';
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setupGo(p.id); }, true);
        wrap.appendChild(b);
      });
    }
    var st = document.querySelector('#tab-setup .sub-tabs');
    if (st && !st.querySelector('.cmsn-tab')) {
      st.innerHTML = PAGES.map(function (p) { return '<span class="sub-tab cmsn-tab" data-sn="' + p.id + '" onclick="setupGo(\'' + p.id + '\')"><i class="fa-solid ' + p.icon + '" style="font-size:10px;margin-right:4px"></i>' + p.label + '</span>'; }).join('');
      show(localStorage.getItem(KEY) || 'profile');
    }
  }
  setInterval(function () {
    try { if (ensurePanels()) { buildNav(); var cur = localStorage.getItem(KEY) || 'profile'; var e = panel(cur); if (e && e.style.display === 'none' && document.querySelector('.cmsn-tab.active') == null) show(cur); } } catch (e) { console.warn('setupnav', e); }
  }, 700);
})();
