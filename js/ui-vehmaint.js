/* ui-vehmaint.js v1 (Nov 19 2026) — Vehicles step 2: Maintenance. Separate file, does not edit ui-vehicles.js.
 * Data on each vehicle (linked by id):
 *   v.maint_items = [{id, name, km, months}]              — schedule; due = whichever comes first (km OR time)
 *   v.maint_log   = [{id, date, odo, shop, items:[item ids], cost, note, files:[paths]}]
 * Status per item from its latest log: next km = last odo + km, next date = last date + months.
 * Saving a log with a higher odo updates v.odo / v.odo_date. Receipts copy to Car Documents\<vehicle>\Maintenance.
 */
(function () {
  var DEF = [['น้ำมันเครื่อง + กรอง', 10000, 6], ['กรองอากาศ', 20000, 12], ['กรองแอร์', 20000, 12], ['น้ำมันเบรก', 40000, 24],
    ['ผ้าเบรก (ตรวจ)', 20000, 12], ['สลับยาง / ตั้งศูนย์', 10000, 6], ['ยาง (เปลี่ยน)', 50000, 48], ['แบตเตอรี่', 0, 24],
    ['น้ำมันเกียร์', 40000, 24], ['หัวเทียน', 100000, 60], ['น้ำยาหม้อน้ำ', 40000, 24]];
  var WARN_KM = 1000, WARN_D = 30, ROOT = 'G:\\My Drive\\Documents\\Car Documents';
  function id(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function N(n) { return (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function M(n) { return (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addM(iso, m) { var d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + (+m || 0)); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function days(iso) { return Math.round((new Date(iso + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5); }
  function DT(d) { return d ? ((typeof fmtDate === 'function') ? fmtDate(d) : d) : '—'; }
  function veh(vid) { return ((window.D && D.vehicles) || []).find(function (v) { return v.id === vid; }) || null; }
  function items(v) { if (!Array.isArray(v.maint_items)) v.maint_items = DEF.map(function (x) { return { id: id('mi'), name: x[0], km: x[1], months: x[2] }; }); return v.maint_items; }
  function logs(v) { if (!Array.isArray(v.maint_log)) v.maint_log = []; return v.maint_log; }
  function save() { try { saveD(); } catch (e) { } try { if (window.renderVehicles) renderVehicles(); } catch (e) { } }

  function status(v, it) {
    var last = logs(v).filter(function (l) { return (l.items || []).indexOf(it.id) >= 0; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || (+b.odo || 0) - (+a.odo || 0); })[0];
    if (!last) return { st: 'none' };
    var r = { last: last }, s = 'ok';
    if (+it.km > 0 && +last.odo > 0) { r.nextKm = +last.odo + +it.km; if (+v.odo > 0) { r.kmLeft = r.nextKm - +v.odo; if (r.kmLeft < 0) s = 'over'; else if (r.kmLeft <= WARN_KM) s = 'soon'; } }
    if (+it.months > 0 && last.date) { r.nextDate = addM(last.date, it.months); r.dLeft = days(r.nextDate); if (r.dLeft < 0) s = 'over'; else if (r.dLeft <= WARN_D && s !== 'over') s = 'soon'; }
    r.st = s; return r;
  }
  var ST = { ok: ['✓ ปกติ', 'var(--success)'], soon: ['🟠 ใกล้ถึง', 'var(--warning)'], over: ['🔴 เกินกำหนด', 'var(--error)'], none: ['— ยังไม่มีประวัติ', 'var(--text3)'] };
  function badge(s) { var x = ST[s]; return '<span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:999px;border:1px solid ' + x[1] + ';color:' + x[1] + ';white-space:nowrap">' + x[0] + '</span>'; }
  function every(it) { var a = []; if (+it.km > 0) a.push(N(it.km) + ' กม.'); if (+it.months > 0) a.push(it.months + ' เดือน'); return a.join(' หรือ ') || '—'; }
  function left(r) {
    var a = [];
    if (r.kmLeft != null) a.push(r.kmLeft < 0 ? 'เกิน ' + N(-r.kmLeft) + ' กม.' : 'อีก ' + N(r.kmLeft) + ' กม.');
    else if (r.nextKm) a.push('ที่ ' + N(r.nextKm) + ' กม.');
    if (r.dLeft != null) a.push(r.dLeft < 0 ? 'เกิน ' + (-r.dLeft) + ' วัน' : 'อีก ' + r.dLeft + ' วัน');
    return a.join(' หรือ ');
  }

  // ---------- render (appended under the vehicle detail) ----------
  function card(v) {
    var IT = items(v), order = { over: 0, soon: 1, ok: 2, none: 3 };
    var rows = IT.map(function (it) { return { it: it, r: status(v, it) }; }).sort(function (a, b) { return order[a.r.st] - order[b.r.st]; });
    var h = '<div class="card" id="vm-card" data-vid="' + v.id + '"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px"><h2 style="margin:0"><i class="fa-solid fa-screwdriver-wrench"></i> Maintenance</h2>' +
      (v.odo ? '<span style="font-size:10px;color:var(--text3)">เลขไมล์ปัจจุบัน ' + N(v.odo) + ' กม.</span>' : '<span style="font-size:10px;color:var(--warning)">⚠️ ยังไม่มีเลขไมล์ปัจจุบัน — คำนวณได้แค่ตามเวลา</span>') +
      '<span style="flex:1"></span><button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="vmItems(\'' + v.id + '\')"><i class="fa-solid fa-list-check"></i> ตั้งรายการ</button>' +
      '<button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="vmLog(\'' + v.id + '\',\'\')"><i class="fa-solid fa-plus"></i> บันทึกเช็คระยะ</button></div>' +
      '<table class="tbl"><thead><tr><th>รายการ</th><th>ทุก</th><th>ครั้งล่าสุด</th><th>ครั้งถัดไป</th><th>สถานะ</th></tr></thead><tbody>' +
      rows.map(function (x) { var r = x.r;
        return '<tr><td style="font-weight:600">' + E(x.it.name) + '</td><td style="font-size:10px">' + every(x.it) + '</td>' +
          '<td style="font-size:10px">' + (r.last ? DT(r.last.date) + (r.last.odo ? ' · ' + N(r.last.odo) + ' กม.' : '') : '—') + '</td>' +
          '<td style="font-size:10px">' + (r.last ? [r.nextKm ? N(r.nextKm) + ' กม.' : '', r.nextDate ? DT(r.nextDate) : ''].filter(Boolean).join(' / ') + '<div style="color:var(--text3);font-size:9px">' + left(r) + '</div>' : '—') + '</td>' +
          '<td>' + badge(r.st) + '</td></tr>'; }).join('') +
      '</tbody></table>';
    var LG = logs(v).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var tot = LG.reduce(function (s, l) { return s + (+l.cost || 0); }, 0);
    h += '<div style="display:flex;align-items:center;gap:8px;margin:12px 0 4px"><b style="font-size:12px"><i class="fa-solid fa-clock-rotate-left"></i> ประวัติ</b><span style="font-size:10px;color:var(--text3)">' + LG.length + ' ครั้ง · รวม ฿' + M(tot) + '</span></div>' +
      '<table class="tbl"><thead><tr><th>วันที่</th><th class="r">เลขไมล์</th><th>ร้าน/ศูนย์</th><th>รายการที่ทำ</th><th class="r">ค่าใช้จ่าย</th><th>ไฟล์</th><th></th></tr></thead><tbody>' +
      (LG.map(function (l) {
        var nm = (l.items || []).map(function (i) { var it = IT.find(function (x) { return x.id === i; }); return it ? it.name : null; }).filter(Boolean);
        return '<tr><td style="font-size:10px;white-space:nowrap">' + DT(l.date) + '</td><td class="r" style="font-size:10px">' + (l.odo ? N(l.odo) : '—') + '</td><td style="font-size:10px">' + E(l.shop || '') + '</td>' +
          '<td style="font-size:10px">' + E(nm.join(', ')) + (l.note ? '<div style="color:var(--text3);font-size:9px">' + E(l.note) + '</div>' : '') + '</td>' +
          '<td class="r" style="font-family:var(--mono);font-size:10px">' + (l.cost ? '฿' + M(l.cost) : '—') + '</td>' +
          '<td>' + (l.files || []).map(function (p, i) { return '<a href="#" title="' + E(p) + '" onclick="return vmOpen(event,\'' + v.id + '\',\'' + l.id + '\',' + i + ')"><i class="fa-solid fa-file-lines"></i></a> '; }).join('') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:4px" onclick="vmLog(\'' + v.id + '\',\'' + l.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="del-btn" onclick="vmLogDel(\'' + v.id + '\',\'' + l.id + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>';
      }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:12px">ยังไม่มีประวัติ — กด บันทึกเช็คระยะ</td></tr>') + '</tbody></table></div>';
    return h;
  }
  function mount() {
    var el = document.getElementById('vehicles-content'); if (!el || !window.D) return;
    var b = el.querySelector('button[onclick^="vhEdit(\'"]:not([onclick="vhEdit(\'\')"])'); if (!b) return;
    var m = /vhEdit\('([^']+)'\)/.exec(b.getAttribute('onclick')); var v = m && veh(m[1]); if (!v) return;
    var c = el.querySelector('#vm-card');
    if (c && c.getAttribute('data-vid') === v.id && c._sig === sig(v)) return;
    var d = document.createElement('div'); d.innerHTML = card(v); var n = d.firstChild; n._sig = sig(v);
    if (c) c.replaceWith(n); else el.appendChild(n);
  }
  function sig(v) { return JSON.stringify([v.odo, v.maint_items, v.maint_log]); }

  // ---------- popups (UI standard: Cancel left / ✓ Save right, Enter/Esc) ----------
  function pop(title, body, onSave, wide) {
    var o = document.getElementById('vm-ov'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'vm-ov'; o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10040;display:flex;align-items:center;justify-content:center;padding:16px';
    var dn = null; o.addEventListener('mousedown', function (e) { dn = e.target; }); o.addEventListener('mouseup', function (e) { if (dn === o && e.target === o) o.remove(); dn = null; });
    o.innerHTML = '<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(' + (wide || 520) + 'px,96vw);max-height:90vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<h3 style="margin:0 0 12px;font-size:14px">' + title + '</h3>' + body + '<div id="vm-err" style="color:var(--error);font-size:10px;min-height:14px"></div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:6px"><button class="btn btn-ghost" id="vm-no">Cancel</button><button class="btn btn-primary" id="vm-yes"><i class="fa-solid fa-check"></i> Save</button></div>' +
      '<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save · Esc = Cancel</div></div>';
    document.body.appendChild(o);
    var ok = function () { var e = onSave(); if (e) { document.getElementById('vm-err').textContent = e; return; } o.remove(); };
    document.getElementById('vm-no').onclick = function () { o.remove(); };
    document.getElementById('vm-yes').onclick = ok;
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') o.remove(); if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); ok(); } });
    setTimeout(function () { var f = o.querySelector('input,select'); if (f) f.focus(); }, 30);
  }
  function fld(lbl, html) { return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">' + lbl + '</label>' + html + '</div>'; }
  function g(i) { var e = document.getElementById(i); return e ? e.value : ''; }

  window.vmLog = function (vid, lid) {
    var v = veh(vid); if (!v) return; var IT = items(v), l = logs(v).find(function (x) { return x.id === lid; }) || { date: today(), odo: v.odo || '', items: [], files: [] };
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      fld('วันที่', '<input type="date" id="vm-date" class="inp" value="' + E(l.date) + '">') +
      fld('เลขไมล์ (กม.)', '<input id="vm-odo" class="inp" inputmode="numeric" value="' + E(l.odo) + '" placeholder="' + (v.odo ? 'ล่าสุด ' + N(v.odo) : '') + '">') +
      fld('ร้าน / ศูนย์', '<input id="vm-shop" class="inp" value="' + E(l.shop || '') + '" placeholder="เช่น Honda ศูนย์ ...">') +
      fld('ค่าใช้จ่าย (฿)', '<input id="vm-cost" class="inp" inputmode="decimal" value="' + (l.cost ? (+l.cost).toFixed(2) : '') + '">') + '</div>' +
      '<div style="margin-top:10px">' + fld('รายการที่ทำ (เลือกได้หลายข้อ)', '<div style="display:flex;flex-wrap:wrap;gap:6px 14px;padding:6px 0">' +
        IT.map(function (it) { return '<label style="font-size:11px;display:flex;align-items:center;gap:5px"><input type="checkbox" class="vm-it" value="' + it.id + '"' + ((l.items || []).indexOf(it.id) >= 0 ? ' checked' : '') + '> ' + E(it.name) + '</label>'; }).join('') + '</div>') + '</div>' +
      '<div style="margin-top:6px">' + fld('ไฟล์ใบเสร็จ', '<div style="display:flex;gap:8px;align-items:flex-start"><textarea id="vm-files" class="inp" rows="2" style="flex:1;font-size:10px" placeholder="กด Browse เลือกได้หลายไฟล์">' + E((l.files || []).join('\n')) + '</textarea>' +
        '<label class="btn btn-ghost" style="font-size:11px;cursor:pointer"><i class="fa-solid fa-folder-open"></i> Browse<input type="file" multiple style="display:none" onchange="vmPicked(this,\'' + v.id + '\')"></label></div>' +
        '<div id="vm-dir" style="font-size:9px;color:var(--text3)">📁 ' + ROOT + '\\' + E(v.folder || v.plate || v.name || '') + '\\Maintenance</div>') + '</div>' +
      '<div style="margin-top:10px">' + fld('หมายเหตุ', '<input id="vm-note" class="inp" value="' + E(l.note || '') + '">') + '</div>';
    pop('<i class="fa-solid fa-screwdriver-wrench"></i> ' + (lid ? 'แก้' : '') + 'บันทึกเช็คระยะ · ' + E(v.name || v.plate), body, function () {
      var d = g('vm-date'), odo = parseFloat(String(g('vm-odo')).replace(/,/g, '')) || 0, its = [].slice.call(document.querySelectorAll('.vm-it:checked')).map(function (x) { return x.value; });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 'เลือกวันที่';
      if (!its.length) return 'เลือกรายการที่ทำอย่างน้อย 1 ข้อ';
      var rec = lid ? l : { id: id('ml') };
      rec.date = d; rec.odo = odo || ''; rec.shop = g('vm-shop').trim(); rec.cost = parseFloat(String(g('vm-cost')).replace(/,/g, '')) || 0;
      rec.items = its; rec.note = g('vm-note').trim(); rec.files = g('vm-files').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!lid) logs(v).push(rec);
      if (odo > (+v.odo || 0)) { v.odo = odo; v.odo_date = d; }
      save(); if (typeof toast === 'function') toast('✅ บันทึกเช็คระยะแล้ว'); return '';
    }, 600);
  };
  window.vmLogDel = function (vid, lid) {
    var v = veh(vid); if (!v) return; var l = logs(v).find(function (x) { return x.id === lid; }); if (!l) return;
    cmConfirm('ลบประวัติเช็คระยะวันที่ ' + DT(l.date) + '?\n(ไฟล์ในเครื่องไม่ถูกลบ)', function () { v.maint_log = logs(v).filter(function (x) { return x.id !== lid; }); save(); }, { title: 'Delete maintenance record', danger: true });
  };
  window.vmItems = function (vid) {
    var v = veh(vid); if (!v) return; var tmp = JSON.parse(JSON.stringify(items(v)));
    function rowsH() { return tmp.map(function (it, i) { return '<tr><td><input class="inp vmi-n" data-i="' + i + '" value="' + E(it.name) + '" style="width:100%"></td>' +
      '<td><input class="inp vmi-k" data-i="' + i + '" inputmode="numeric" value="' + (it.km || '') + '" placeholder="—" style="width:90px"></td>' +
      '<td><input class="inp vmi-m" data-i="' + i + '" inputmode="numeric" value="' + (it.months || '') + '" placeholder="—" style="width:60px"></td>' +
      '<td><button class="del-btn" onclick="vmItemDel(' + i + ')"><i class="fa-solid fa-trash"></i></button></td></tr>'; }).join(''); }
    function read() { [].slice.call(document.querySelectorAll('.vmi-n')).forEach(function (e) { var i = +e.dataset.i; tmp[i].name = e.value; tmp[i].km = parseFloat(String(document.querySelector('.vmi-k[data-i="' + i + '"]').value).replace(/,/g, '')) || 0; tmp[i].months = parseFloat(document.querySelector('.vmi-m[data-i="' + i + '"]').value) || 0; }); }
    function redraw() { document.getElementById('vmi-body').innerHTML = rowsH(); }
    window.vmItemDel = function (i) { read(); var it = tmp[i]; var used = logs(v).some(function (l) { return (l.items || []).indexOf(it.id) >= 0; });
      if (used) { alert('"' + it.name + '" มีในประวัติแล้ว ลบไม่ได้ (ประวัติจะเสีย)\nแก้ชื่อหรือรอบได้'); return; } tmp.splice(i, 1); redraw(); };
    window.vmItemAdd = function () { read(); tmp.push({ id: id('mi'), name: '', km: 0, months: 0 }); redraw(); var n = document.querySelectorAll('.vmi-n'); if (n.length) n[n.length - 1].focus(); };
    pop('<i class="fa-solid fa-list-check"></i> รายการเช็คระยะ · ' + E(v.name || v.plate),
      '<div style="font-size:10px;color:var(--text3);margin-bottom:6px">ครบกำหนดเมื่อถึง กม. <b>หรือ</b> เวลา อย่างใดอย่างหนึ่งก่อน · เว้นว่าง = ไม่ใช้เงื่อนไขนั้น</div>' +
      '<table class="tbl"><thead><tr><th>รายการ</th><th>ทุก (กม.)</th><th>ทุก (เดือน)</th><th></th></tr></thead><tbody id="vmi-body">' + rowsH() + '</tbody></table>' +
      '<button class="btn btn-ghost" style="font-size:11px;margin-top:6px" onclick="vmItemAdd()"><i class="fa-solid fa-plus"></i> เพิ่มรายการ</button>',
      function () { read(); if (tmp.some(function (x) { return !String(x.name).trim(); })) return 'ใส่ชื่อรายการให้ครบ'; if (tmp.some(function (x) { return !(x.km > 0) && !(x.months > 0); })) return 'ทุกรายการต้องมี กม. หรือ เดือน อย่างน้อย 1 อย่าง';
        v.maint_items = tmp; save(); return ''; }, 560);
  };
  window.vmPicked = async function (el, vid) {
    var fs = el && el.files ? [].slice.call(el.files) : []; el.value = ''; if (!fs.length) return;
    var v = veh(vid), out = document.getElementById('vm-files'), info = document.getElementById('vm-dir'), fold = (v && (v.folder || v.plate || v.name)) || 'Vehicle';
    try {
      var root = await window.cmFolder('car_docs'), dir = await (await root.getDirectoryHandle(fold, { create: true })).getDirectoryHandle('Maintenance', { create: true });
      var cur = out.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      for (var k = 0; k < fs.length; k++) {
        info.textContent = '⏳ กำลัง copy ' + (k + 1) + '/' + fs.length + ' …';
        var nm = fs[k].name, dot = nm.lastIndexOf('.'), b = dot > 0 ? nm.slice(0, dot) : nm, x = dot > 0 ? nm.slice(dot) : '', n = nm, i = 2;
        while (true) { try { await dir.getFileHandle(n); n = b + ' (' + (i++) + ')' + x; } catch (e) { break; } }
        var w = await (await dir.getFileHandle(n, { create: true })).createWritable(); await w.write(fs[k]); await w.close();
        cur.push(ROOT + '\\' + fold + '\\Maintenance\\' + n);
      }
      out.value = cur.join('\n'); info.textContent = '✅ copy แล้ว ' + fs.length + ' ไฟล์ → 📁 ' + ROOT + '\\' + fold + '\\Maintenance';
    } catch (e) { info.textContent = '⚠️ copy ไม่สำเร็จ: ' + (e && e.message || e); }
  };
  window.vmOpen = function (ev, vid, lid, i) {
    ev.preventDefault(); var v = veh(vid), l = v && logs(v).find(function (x) { return x.id === lid; }), p = l && (l.files || [])[i]; if (!p) return false;
    if (typeof utilViewDoc === 'function') utilViewDoc(p); else window.open('file:///' + p.replace(/\\/g, '/'));
    return false;
  };
  window.vmStatus = status; // for calendar / alerts later
  setInterval(function () { try { mount(); } catch (e) { console.warn('vehmaint', e); } }, 600);
})();
