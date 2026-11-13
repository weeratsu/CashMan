/* ui-vehicles.js (Nov 13 2026) — Vehicles module, step 1: vehicles + documents.
 * Separate file; injects its own menu button + tab. Data (linked by id):
 *   D.vehicles = [{id, plate, name, year, vin, odo, odo_date, owner, email, status:'active'|'sold'|'inactive', note,
 *                  docs:[{id, type, expiry, amount, file, note}]}]
 * Later steps: maintenance, fuel, calendar/bills, email, import (see VEHICLES_REQUIREMENTS.md).
 */
(function () {
  var DOC_TYPES = [['insurance', 'ประกันภัย', '🛡️'], ['prb', 'พ.ร.บ.', '📄'], ['tax', 'ภาษีรถ', '🧾'], ['inspect', 'ตรอ.', '🔧'], ['book', 'เล่มทะเบียน', '📘'], ['other', 'อื่น ๆ', '📎']];
  var _sel = '', _stF = 'active';
  function vid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function E(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function F(n) { return (typeof fmt === 'function') ? fmt(+n || 0) : (+n || 0).toFixed(2); }
  function DT(d) { return d ? ((typeof fmtDate === 'function') ? fmtDate(d) : d) : '\u2013'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function days(iso) { if (!iso) return null; return Math.round((new Date(iso + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5); }
  function V() { if (!window.D) return []; if (!Array.isArray(D.vehicles)) D.vehicles = []; return D.vehicles; }
  function byId(id) { return V().find(function (v) { return v.id === id; }) || null; }
  function dt(t) { return DOC_TYPES.find(function (x) { return x[0] === t; }) || DOC_TYPES[DOC_TYPES.length - 1]; }
  function save() { try { saveD(); } catch (e) { } render(); try { if (typeof renderDashCalendar === 'function') renderDashCalendar(); } catch (e) { } }
  function pill(on, txt, js) {
    return '<button onclick="' + js + '" style="font-size:11px;padding:3px 12px;border-radius:999px;cursor:pointer;border:1px solid ' + (on ? 'var(--primary)' : 'var(--border)') +
      ';background:' + (on ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'transparent') + ';color:' + (on ? 'var(--primary)' : 'var(--text)') + ';font-weight:' + (on ? 700 : 500) + '">' + txt + '</button>';
  }
  function dueBadge(d) {
    if (d == null) return '';
    var c = d < 0 ? 'var(--error)' : d <= 30 ? 'var(--warning)' : 'var(--success)';
    return '<span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:999px;border:1px solid ' + c + ';color:' + c + '">' + (d < 0 ? 'หมดอายุ ' + (-d) + ' วัน' : d === 0 ? 'วันนี้' : 'อีก ' + d + ' วัน') + '</span>';
  }

  // ---------- render ----------
  function render() {
    var el = document.getElementById('vehicles-content'); if (!el || !window.D) return;
    var L = V(), list = L.filter(function (v) { return _stF === 'all' || (v.status || 'active') === _stF; });
    if (!byId(_sel) || list.indexOf(byId(_sel)) < 0) _sel = (list[0] || {}).id || '';
    var h = '<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><h2 style="margin:0"><i class="fa-solid fa-car"></i> Vehicles</h2>' +
      '<span style="display:inline-flex;gap:5px;margin-left:8px">' + [['active', 'Active'], ['sold', 'Sold'], ['inactive', 'Inactive'], ['all', 'All']].map(function (o) { return pill(_stF === o[0], o[1], "vhF('" + o[0] + "')"); }).join('') + '</span>' +
      '<span style="flex:1"></span><button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="vhEdit(\'\')"><i class="fa-solid fa-plus"></i> Add vehicle</button></div>';
    if (!list.length) h += '<p class="text-muted" style="font-size:11px;padding:10px 0">' + (L.length ? 'ไม่มีรถในสถานะนี้' : 'ยังไม่มีรถ — กด Add vehicle') + '</p>';
    else h += '<div style="display:flex;gap:8px;flex-wrap:wrap">' + list.map(function (v) {
      var on = v.id === _sel, near = (v.docs || []).map(function (d) { return days(d.expiry); }).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; })[0];
      return '<div onclick="vhSel(\'' + v.id + '\')" style="cursor:pointer;min-width:180px;padding:8px 12px;border-radius:10px;border:' + (on ? '2px solid var(--primary)' : '1px solid var(--border)') + ';background:var(--bg2)">' +
        '<div style="font-weight:700;font-size:12px">🚗 ' + E(v.name || v.plate) + '</div><div style="font-size:10px;color:var(--text3)">' + E(v.plate || '') + (v.owner ? ' · ' + E(v.owner) : '') + '</div>' +
        '<div style="font-size:10px;margin-top:3px">' + (v.odo ? F(v.odo).replace(/\.00$/, '') + ' กม.' : '') + ' ' + dueBadge(near) + '</div></div>';
    }).join('') + '</div>';
    h += '</div>';
    var v = byId(_sel);
    if (v) {
      var st = v.status || 'active';
      h += '<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0">🚗 ' + E(v.name || v.plate) + '</h2>' +
        (st !== 'active' ? '<span class="type-chip" style="font-size:9px">' + E(st) + '</span>' : '') + '<span style="flex:1"></span>' +
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="vhEdit(\'' + v.id + '\')"><i class="fa-solid fa-pen"></i> Edit</button>' +
        '<button class="del-btn" onclick="vhDel(\'' + v.id + '\')"><i class="fa-solid fa-trash"></i></button></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px 14px;font-size:11px;margin:8px 0">' +
        [['ทะเบียน', v.plate], ['รุ่น', v.name], ['ปี', v.year], ['เลขตัวถัง', v.vin], ['เลขไมล์', v.odo ? F(v.odo).replace(/\.00$/, '') + ' กม. (' + DT(v.odo_date) + ')' : ''], ['เจ้าของ/ผู้จ่าย', v.owner], ['อีเมลเจ้าของ', v.email], ['หมายเหตุ', v.note]]
          .map(function (x) { return '<div><div style="font-size:9px;color:var(--text3)">' + x[0] + '</div>' + (x[1] ? E(x[1]) : '<span style="color:var(--text3)">\u2014</span>') + '</div>'; }).join('') + '</div></div>';
      var docs = (v.docs || []).slice().sort(function (a, b) { return String(a.expiry || '9').localeCompare(String(b.expiry || '9')); });
      h += '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><h2 style="margin:0"><i class="fa-solid fa-folder-open"></i> Documents</h2><span style="flex:1"></span>' +
        '<button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="vhDoc(\'' + v.id + '\',\'\')"><i class="fa-solid fa-plus"></i> Add document</button></div>' +
        '<table class="tbl"><thead><tr><th>ประเภท</th><th>หมดอายุ</th><th></th><th class="r">ค่าใช้จ่าย/ปี</th><th>ไฟล์</th><th>หมายเหตุ</th><th></th></tr></thead><tbody>' +
        (docs.map(function (d) { var t = dt(d.type);
          return '<tr><td style="white-space:nowrap">' + t[2] + ' ' + E(t[1]) + '</td><td style="font-size:10px">' + DT(d.expiry) + '</td><td>' + dueBadge(days(d.expiry)) + '</td>' +
            '<td class="r" style="font-family:var(--mono);font-size:10px">' + (d.amount ? '\u0e3f' + F(d.amount) : '\u2014') + '</td>' +
            '<td style="white-space:nowrap">' + vhFiles(d).map(function (p, i) { return '<a href="#" title="' + E(p) + '" style="margin-right:4px" onclick="return vhOpen(event,\'' + v.id + '\',\'' + d.id + '\',' + i + ')"><i class="fa-solid ' + (/\.pdf$/i.test(p) ? 'fa-file-pdf' : 'fa-file-image') + '" style="color:var(--error)"></i></a>'; }).join('') +
            (vhFiles(d).length > 1 ? '<span style="font-size:9px;color:var(--text3)">' + vhFiles(d).length + '</span>' : '') + '</td>' +
            '<td style="font-size:10px">' + E(d.note || '') + '</td><td style="white-space:nowrap"><button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:4px" onclick="vhDoc(\'' + v.id + '\',\'' + d.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="del-btn" onclick="vhDocDel(\'' + v.id + '\',\'' + d.id + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>'; }).join('') ||
          '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:12px">ยังไม่มีเอกสาร</td></tr>') + '</tbody></table></div>';
    }
    el.innerHTML = h;
  }

  // ---------- popup (UI standard) ----------
  function pop(id, title, body, onSave) {
    var o = document.getElementById(id); if (o) o.remove();
    o = document.createElement('div'); o.id = id;
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    var dn = null; o.addEventListener('mousedown', function (e) { dn = e.target; }); o.addEventListener('mouseup', function (e) { if (dn === o && e.target === o) o.remove(); dn = null; });
    o.innerHTML = '<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(460px,96vw);max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<h3 style="margin:0 0 12px;font-size:14px">' + title + '</h3><div style="display:grid;gap:10px">' + body + '</div>' +
      '<div id="' + id + '-err" style="color:var(--error);font-size:10px;min-height:14px;margin-top:6px"></div>' +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><button class="btn btn-ghost" data-x="1">Cancel</button><button class="btn btn-primary" data-s="1"><i class="fa-solid fa-floppy-disk"></i> Save</button></div>' +
      '<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save \u00b7 Esc = Cancel</div></div>';
    document.body.appendChild(o);
    o.querySelector('[data-x]').onclick = function () { o.remove(); };
    o.querySelector('[data-s]').onclick = function () { onSave(o); };
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') o.remove(); if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); onSave(o); } });
    setTimeout(function () { var f = o.querySelector('input,select'); if (f) f.focus(); }, 30);
    return o;
  }
  function row(l, h) { return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">' + l + '</label>' + h + '</div>'; }
  function inp(id, v, ph, t) { return '<input id="' + id + '" class="inp" ' + (t ? 'type="' + t + '" ' : '') + 'value="' + E(v == null ? '' : v) + '" placeholder="' + E(ph || '') + '" style="width:100%">'; }
  function gv(id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
  function owners() { var s = {}; V().forEach(function (v) { if (v.owner) s[v.owner] = 1; }); (D.planned || []).forEach(function (p) { if (p.owner) s[p.owner] = 1; }); s.Me = 1; return Object.keys(s).sort(); }

  window.vhEdit = function (id) {
    var v = byId(id) || {}, isNew = !v.id;
    pop('vh-ov', (isNew ? '<i class="fa-solid fa-plus"></i> Add vehicle' : '<i class="fa-solid fa-pen"></i> Edit vehicle'),
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('ทะเบียน *', inp('vh-plate', v.plate, 'กข 1234 กทม')) + row('ชื่อ/รุ่น', inp('vh-name', v.name, 'เช่น Honda City')) + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">' + row('ปี', inp('vh-year', v.year, '2020')) + row('เลขตัวถัง', inp('vh-vin', v.vin, '')) + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('เลขไมล์ (กม.)', inp('vh-odo', v.odo, '0')) + row('ณ วันที่', inp('vh-odod', v.odo_date || today(), '', 'date')) + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('เจ้าของ/ผู้จ่าย', '<input id="vh-owner" class="inp" list="vh-owner-dl" value="' + E(v.owner || 'Me') + '" style="width:100%"><datalist id="vh-owner-dl">' + owners().map(function (o) { return '<option value="' + E(o) + '">'; }).join('') + '</datalist>') +
      row('อีเมลเจ้าของ (แจ้งเตือน)', inp('vh-email', v.email, 'name@mail.com', 'email')) + '</div>' +
      row('สถานะ', '<select id="vh-st" class="sel">' + [['active', 'Active'], ['sold', 'Sold'], ['inactive', 'Inactive']].map(function (o) { return '<option value="' + o[0] + '"' + ((v.status || 'active') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>') +
      row('หมายเหตุ', inp('vh-note', v.note, 'เช่น เล่มเก็บที่ตู้เซฟ')) +
      row('ชื่อโฟลเดอร์ใน Car Documents', inp('vh-folder', v.folder || v.name || '', 'เช่น Honda Civic 2019')),
      function (o) {
        var plate = gv('vh-plate'); if (!plate) { document.getElementById('vh-ov-err').textContent = 'กรุณาใส่ทะเบียน'; return; }
        var t = isNew ? { id: vid('vh'), docs: [] } : v;
        t.plate = plate; t.name = gv('vh-name'); t.year = gv('vh-year'); t.vin = gv('vh-vin');
        var od = parseFloat(gv('vh-odo').replace(/,/g, '')); if (!isNaN(od) && od !== +t.odo) { t.odo = od; t.odo_date = gv('vh-odod') || today(); } else if (gv('vh-odod')) t.odo_date = t.odo_date || gv('vh-odod');
        t.owner = gv('vh-owner'); t.email = gv('vh-email'); t.status = gv('vh-st') || 'active'; t.note = gv('vh-note'); t.folder = gv('vh-folder');
        if (isNew) V().push(t); _sel = t.id; o.remove(); save();
      });
  };
  window.vhDel = function (id) {
    var v = byId(id); if (!v) return;
    if (!confirm('ลบรถ "' + (v.name || v.plate) + '" ? (ถ้าขาย/เลิกใช้ ให้เปลี่ยนสถานะเป็น Sold/Inactive แทน เพื่อเก็บประวัติ)')) return;
    D.vehicles = V().filter(function (x) { return x.id !== id; }); _sel = ''; save();
  };
  window.vhDoc = function (vid_, did) {
    var v = byId(vid_); if (!v) return; var d = (v.docs || []).find(function (x) { return x.id === did; }) || {}, isNew = !d.id;
    pop('vh-doc-ov', (isNew ? '<i class="fa-solid fa-plus"></i> Add document' : '<i class="fa-solid fa-pen"></i> Edit document') + ' \u00b7 ' + E(v.name || v.plate),
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('ประเภท', '<select id="vd-type" class="sel">' + DOC_TYPES.map(function (t) { return '<option value="' + t[0] + '"' + ((d.type || 'insurance') === t[0] ? ' selected' : '') + '>' + t[2] + ' ' + t[1] + '</option>'; }).join('') + '</select>') +
      row('วันหมดอายุ', inp('vd-exp', d.expiry, '', 'date')) + '</div>' +
      row('ค่าใช้จ่ายต่อปี (\u0e3f)', inp('vd-amt', d.amount, '0.00')) +
      // Nov 13 2026 v4: folder is derived automatically: Car Documents\<vehicle folder>\<doc-type subfolder>
      row('ไฟล์ (1 บรรทัด = 1 ไฟล์)', '<div style="display:flex;gap:6px;align-items:flex-start"><textarea id="vd-file" class="inp" rows="3" placeholder="กด Browse เลือกได้หลายไฟล์พร้อมกัน" style="flex:1;font-size:11px;resize:vertical">' + E(vhFiles(d).join('\n')) + '</textarea>' +
        '<button type="button" class="btn btn-ghost" style="font-size:11px;white-space:nowrap" onclick="document.getElementById(\'vd-pick\').click()"><i class="fa-solid fa-folder-open"></i> Browse</button>' +
        '<input id="vd-pick" type="file" accept=".pdf,image/*" multiple style="display:none" onchange="vhPicked(this,\'' + v.id + '\')"></div>' +
        '<div id="vd-dir" style="font-size:9px;color:var(--text3);margin-top:2px">📁 ' + E(vhDir(v, d.type || 'insurance')) + '</div>') +
      row('หมายเหตุ', inp('vd-note', d.note, 'เช่น บริษัทประกัน, เลขกรมธรรม์, ที่เก็บตัวจริง')),
      function (o) {
        var t = isNew ? { id: vid('vd') } : d;
        t.type = gv('vd-type'); t.expiry = gv('vd-exp'); var a = parseFloat(gv('vd-amt').replace(/,/g, '')); t.amount = isNaN(a) ? '' : a;
        t.files = gv('vd-file').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); delete t.file;
        t.note = gv('vd-note');
        if (isNew) (v.docs = v.docs || []).push(t); o.remove(); save();
      });
  };
  window.vhDocDel = function (vid_, did) {
    var v = byId(vid_); if (!v) return; var d = (v.docs || []).find(function (x) { return x.id === did; }); if (!d) return;
    if (!confirm('ลบเอกสาร "' + dt(d.type)[1] + '" ?')) return;
    v.docs = v.docs.filter(function (x) { return x.id !== did; }); save();
  };
  window.vhOpen = function (ev, vid_, did, i) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    var v = byId(vid_), d = v && (v.docs || []).find(function (x) { return x.id === did; }), p = d && vhFiles(d)[i || 0]; if (!p) return false;
    if (typeof window.utilViewDoc === 'function') return window.utilViewDoc(p, ev);
    window.open('file:///' + String(p).replace(/\\/g, '/'), '_blank'); return false;
  };
  window.vhSel = function (id) { _sel = id; render(); };
  // Folder layout (user's Drive): G:\My Drive\Documents\Car Documents\<vehicle folder>\<doc-type subfolder>
  var ROOT = 'G:\\My Drive\\Documents\\Car Documents';
  var SUB = { insurance: 'Insurance', prb: 'Insurance', tax: 'Car Tax', inspect: 'Check Up', book: 'Registration Documents', other: '' };
  function vhDir(v, type) { var f = (v && (v.folder || v.name || v.plate)) || ''; var s = SUB[type] || ''; return ROOT + (f ? '\\' + f : '') + (s ? '\\' + s : ''); }
  window.vhDir = vhDir;
  // update the shown folder when the doc type changes
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'vd-type') { var o = document.getElementById('vd-dir'), v = byId(_sel);
    if (o) o.textContent = '📁 ' + vhDir(v, e.target.value); } });
  // Nov 13 2026: a document can hold several files (e.g. registration book pages); old single d.file still read
  function vhFiles(d) { return Array.isArray(d && d.files) ? d.files : ((d && d.file) ? [d.file] : []); }
  window.vhPicked = function (el, vid_) {
    var fs = el && el.files; if (!fs || !fs.length) return;
    var root = vhDir(byId(vid_), gv('vd-type')), out = document.getElementById('vd-file');
    if (out) { var cur = out.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      [].forEach.call(fs, function (f) { var p = root + '\\' + f.name; if (cur.indexOf(p) < 0) cur.push(p); }); out.value = cur.join('\n'); }
    el.value = '';
  };
  window.vhF = function (f) { _stF = f; render(); };
  window.renderVehicles = render;

  // ---------- inject menu + tab ----------
  function inj() {
    try {
      var w = document.querySelector('.nav-tab[data-tab="wishlist"]');
      if (w && !document.querySelector('.nav-tab[data-tab="vehicles"]')) {
        var b = w.cloneNode(true); b.dataset.tab = 'vehicles'; b.title = 'Vehicles'; b.classList.remove('active');
        b.innerHTML = '<i class="fa-solid fa-car"></i><span>Vehicles</span>'; w.parentNode.insertBefore(b, w.nextSibling);
      }
      var t = document.getElementById('tab-wishlist');
      if (t && !document.getElementById('tab-vehicles')) {
        var d = document.createElement('div'); d.id = 'tab-vehicles'; d.className = 'tab-content'; d.innerHTML = '<div id="vehicles-content"></div>';
        t.parentNode.insertBefore(d, t.nextSibling);
      }
    } catch (e) { console.error('vehicles inj', e); }
  }
  // generic nav handler switches tabs by id; render when Vehicles opens
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.nav-tab[data-tab="vehicles"]'); if (!b) return;
    setTimeout(function () {
      var t = document.getElementById('tab-vehicles');
      if (t && !t.classList.contains('active')) {   // fallback if the app router doesn't know this tab
        document.querySelectorAll('.tab-content').forEach(function (x) { x.classList.remove('active'); });
        document.querySelectorAll('.nav-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        t.classList.add('active');
      }
      try { render(); } catch (err) { console.error('renderVehicles:', err); }
    }, 0);
  });
  inj(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inj);
})();
