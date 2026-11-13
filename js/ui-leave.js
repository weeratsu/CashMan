/* ui-leave.js (Nov 13 2026) — Leave days on the Dashboard calendar (shown like holidays).
 * Separate file: wraps holidayOn() (calendar cell style + name) and dashCalDay() (day popup: list + "+ Leave").
 * Data: D.leaves = [{id, date, to, type, kind:'full'|'am'|'pm'|'hours', start, hours, note}]
 */
(function () {
  // Nov 13 2026: leave types are user-managed (Leave settings) — D.leave_types = [{id, name, icon}], records link by id
  var DEF_TYPES = [['vacation', 'ลาพักร้อน', '🏖️'], ['sick', 'ลาป่วย', '🤒'], ['personal', 'ลากิจ', '📋'], ['other', 'ลาอื่น ๆ', '📝']];
  function types() { if (!window.D) return DEF_TYPES; if (!Array.isArray(D.leave_types) || !D.leave_types.length) D.leave_types = DEF_TYPES.map(function (t) { return { id: t[0], name: t[1], icon: t[2] }; });
    return D.leave_types.map(function (t) { return [t.id, t.name, t.icon || '📝']; }); }
  var TYPES = DEF_TYPES;  // replaced by types() at use time
  var KINDS = [['full', 'เต็มวัน'], ['am', 'ครึ่งวันเช้า'], ['pm', 'ครึ่งวันบ่าย'], ['hours', 'รายชั่วโมง']];
  function L() { if (!window.D) return []; if (!Array.isArray(D.leaves)) D.leaves = []; return D.leaves; }
  function E(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function T(t) { return types().find(function (x) { return x[0] === t; }) || [t, '(ลบประเภทแล้ว)', '❔']; }
  function K(k) { return (KINDS.find(function (x) { return x[0] === k; }) || KINDS[0])[1]; }
  function label(l) {
    var t = T(l.type), s = t[2] + ' ' + t[1];
    if (l.kind === 'hours') s += ' ' + (l.start ? l.start + ' ' : '') + (l.hours || '?') + ' ชม.';
    else if (l.kind !== 'full') s += ' (' + K(l.kind) + ')';
    return s + (l.note ? ' · ' + l.note : '');
  }
  function on(iso) { return L().filter(function (l) { return l.date && iso >= l.date && iso <= (l.kind === 'full' && l.to ? l.to : l.date); }); }
  window.leaveOn = function (iso) { var r = on(iso); return r.length ? r : null; };
  function save() { try { saveD(); } catch (e) { } try { if (typeof renderDashCalendar === 'function') renderDashCalendar(); } catch (e) { } }

  // ---- calendar: leave days use the holiday look (name = leave label)
  function hookHol() {
    if (typeof window.holidayOn !== 'function' || window.holidayOn._lv) return !!(window.holidayOn && window.holidayOn._lv);
    var o = window.holidayOn;
    var w = function (iso) { var h = o.apply(this, arguments) || [], lv = on(iso).map(function (l) { return { date: iso, name: label(l), _leave: l.id }; });
      var r = h.concat(lv); return r.length ? r : null; };
    w._lv = 1; window.holidayOn = w; return true;
  }

  // ---- day popup: list leaves + "+ Leave" button
  function hookDay() {
    if (typeof window.dashCalDay !== 'function' || window.dashCalDay._lv) return !!(window.dashCalDay && window.dashCalDay._lv);
    var o = window.dashCalDay;
    var w = function () { var r = o.apply(this, arguments); setTimeout(addToPopup, 0); return r; };
    w._lv = 1; window.dashCalDay = w; return true;
  }
  function addToPopup() {
    var b = document.querySelector('button[onclick^="dashCalAddBill("]'); if (!b || b.parentNode.querySelector('.lv-add')) return;
    var m = /dashCalAddBill\('([\d-]+)'\)/.exec(b.getAttribute('onclick') || ''); if (!m) return; var iso = m[1];
    var nb = document.createElement('button'); nb.className = 'btn btn-ghost lv-add'; nb.style.fontSize = '12px';
    nb.innerHTML = '<i class="fa-solid fa-plus"></i> Leave'; nb.onclick = function () { leaveEdit('', iso); };
    b.parentNode.insertBefore(nb, b.nextSibling);
    var mine = on(iso); if (!mine.length) return;
    var box = document.createElement('div'); box.style.cssText = 'margin:4px 0 10px';
    box.innerHTML = '<div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px">LEAVE (' + mine.length + ')</div>' +
      mine.map(function (l) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:color-mix(in srgb, #d97706 10%, transparent);margin-bottom:4px;font-size:12px">' +
          '<span style="flex:1;color:#b45309;font-weight:600">' + E(label(l)) + (l.kind === 'full' && l.to && l.to !== l.date ? ' <span style="font-weight:400;font-size:10px">(' + E(l.date) + ' → ' + E(l.to) + ')</span>' : '') + '</span>' +
          '<button class="btn btn-ghost" style="font-size:10px;padding:2px 7px" onclick="leaveEdit(\'' + l.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="del-btn" onclick="leaveDel(\'' + l.id + '\')"><i class="fa-solid fa-trash"></i></button></div>';
      }).join('');
    b.parentNode.parentNode.insertBefore(box, b.parentNode);
  }

  // ---- add / edit popup (UI standard)
  window.leaveEdit = function (id, iso) {
    var l = L().find(function (x) { return x.id === id; }) || { date: iso, type: (types()[0] || [])[0], kind: 'full', start: '09:00', hours: 1 }, isNew = !l.id;
    var o = document.getElementById('lv-ov'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'lv-ov';
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px';
    var dn = null; o.addEventListener('mousedown', function (e) { dn = e.target; }); o.addEventListener('mouseup', function (e) { if (dn === o && e.target === o) o.remove(); dn = null; });
    var row = function (lb, h, id2) { return '<div' + (id2 ? ' id="' + id2 + '"' : '') + ' style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">' + lb + '</label>' + h + '</div>'; };
    o.innerHTML = '<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(420px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<h3 style="margin:0 0 12px;font-size:14px">' + (isNew ? '<i class="fa-solid fa-plus"></i> Add leave' : '<i class="fa-solid fa-pen"></i> Edit leave') + '</h3><div style="display:grid;gap:10px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('ประเภทการลา', '<select id="lv-type" class="sel">' + types().map(function (t) { return '<option value="' + t[0] + '"' + (l.type === t[0] ? ' selected' : '') + '>' + t[2] + ' ' + t[1] + '</option>'; }).join('') + '</select>') +
      row('รูปแบบ', '<select id="lv-kind" class="sel">' + KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (l.kind === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('วันที่', '<input id="lv-date" type="date" class="inp" value="' + E(l.date || '') + '">') +
      row('ถึงวันที่ (ลาหลายวัน)', '<input id="lv-to" type="date" class="inp" value="' + E(l.to || '') + '">', 'lv-to-w') + '</div>' +
      '<div id="lv-hr-w" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + row('เวลาเริ่ม', '<input id="lv-start" type="time" class="inp" value="' + E(l.start || '') + '">') +
      row('จำนวนชั่วโมง', '<input id="lv-hours" type="number" min="0.5" step="0.5" class="inp" value="' + E(l.hours || 1) + '">') + '</div>' +
      row('หมายเหตุ', '<input id="lv-note" class="inp" value="' + E(l.note || '') + '" placeholder="เช่น ไปหาหมอ">') + '</div>' +
      '<div id="lv-err" style="color:var(--error);font-size:10px;min-height:14px;margin-top:6px"></div>' +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><button class="btn btn-ghost" id="lv-no">Cancel</button><button class="btn btn-primary" id="lv-yes"><i class="fa-solid fa-floppy-disk"></i> Save</button></div>' +
      '<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save · Esc = Cancel</div></div>';
    document.body.appendChild(o);
    var g = function (k) { var e = document.getElementById(k); return e ? String(e.value).trim() : ''; };
    var ui = function () { var k = g('lv-kind'); document.getElementById('lv-hr-w').style.display = k === 'hours' ? 'grid' : 'none'; document.getElementById('lv-to-w').style.visibility = k === 'full' ? 'visible' : 'hidden'; };
    document.getElementById('lv-kind').onchange = ui; ui();
    var ok = function () {
      var d = g('lv-date'); if (!d) { document.getElementById('lv-err').textContent = 'กรุณาเลือกวันที่'; return; }
      var k = g('lv-kind'), to = k === 'full' ? g('lv-to') : '';
      if (to && to < d) { document.getElementById('lv-err').textContent = '"ถึงวันที่" ต้องไม่ก่อนวันที่เริ่ม'; return; }
      var t = isNew ? { id: 'lv' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36) } : l;
      t.date = d; t.to = (to && to !== d) ? to : ''; t.type = g('lv-type'); t.kind = k;
      t.start = k === 'hours' ? g('lv-start') : ''; t.hours = k === 'hours' ? (parseFloat(g('lv-hours')) || 1) : ''; t.note = g('lv-note');
      if (isNew) L().push(t); o.remove(); save(); reopen(d);
    };
    document.getElementById('lv-no').onclick = function () { o.remove(); };
    document.getElementById('lv-yes').onclick = ok;
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') o.remove(); if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    setTimeout(function () { var f = document.getElementById('lv-type'); if (f) f.focus(); }, 30);
  };
  window.leaveDel = function (id) {
    var l = L().find(function (x) { return x.id === id; }); if (!l) return;
    if (!confirm('ลบวันลา "' + label(l) + '" วันที่ ' + l.date + ' ?')) return;
    D.leaves = L().filter(function (x) { return x.id !== id; }); save(); reopen(l.date);
  };
  // refresh the open day popup so the change shows immediately
  function reopen(iso) {
    var b = document.querySelector('button[onclick^="dashCalAddBill(\'' + iso + '\'"]'); if (!b) return;
    var close = Array.prototype.find.call(b.parentNode.querySelectorAll('button'), function (x) { return /close/i.test(x.textContent); });
    if (close) close.click();
    var cell = document.querySelector('[onclick^="dashCalDay("]'); // re-open via the calendar if the day cell exists
    var cells = document.querySelectorAll('#dash-calendar [onclick^="dashCalDay("]');
    for (var i = 0; i < cells.length; i++) { var t = cells[i].textContent || ''; if (cells[i].getAttribute('data-iso') === iso) { cells[i].click(); return; } }
  }

  function hookAll() { var a = hookHol(), b = hookDay(); if (a && b) { try { if (typeof renderDashCalendar === 'function') renderDashCalendar(); } catch (e) { } } return a && b; }
  if (!hookAll()) { var n = 0, t = setInterval(function () { if (hookAll() || ++n > 50) clearInterval(t); }, 100); }

  // ================= Leave Summary page (To-Do › Leave) — Nov 13 2026 =================
  // Settings: D.leave_cfg = {hours_per_day: 8, quota: {vacation: 10, sick: 30, ...}}
  function cfg() { if (!window.D) return { hours_per_day: 8, quota: {} }; D.leave_cfg = D.leave_cfg || {}; if (!(+D.leave_cfg.hours_per_day > 0)) D.leave_cfg.hours_per_day = 8; D.leave_cfg.quota = D.leave_cfg.quota || {}; return D.leave_cfg; }
  function isWork(iso) { var d = new Date(iso + 'T00:00:00').getDay(); if (d === 0 || d === 6) return false; try { var h = window.holidayOn && window.holidayOn._lv ? null : null; var hs = (D.holidays || []).some(function (x) { return x.date === iso; }); return !hs; } catch (e) { return true; } }
  function addDay(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  // days counted: full = working days in range (skip weekends + holidays); half = 0.5; hours = hours / hours_per_day
  function daysOf(l) {
    if (l.kind === 'am' || l.kind === 'pm') return 0.5;
    if (l.kind === 'hours') return Math.round((+l.hours || 0) / cfg().hours_per_day * 1000) / 1000;
    var n = 0, d = l.date, end = l.to || l.date; for (var i = 0; d <= end && i < 400; i++) { if (isWork(d)) n++; d = addDay(d, 1); } return n;
  }
  window.leaveDays = daysOf;
  var _lyr = String(new Date().getFullYear()), _lty = '';
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }
  function renderLeave() {
    var el = document.getElementById('leave-content'); if (!el || !window.D) return;
    var c = cfg(), all = L().slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var years = {}; all.forEach(function (l) { years[String(l.date).slice(0, 4)] = 1; }); years[_lyr] = 1;
    var inY = all.filter(function (l) { return String(l.date).slice(0, 4) === _lyr; }), rows = inY.filter(function (l) { return !_lty || l.type === _lty; });
    var used = {}; inY.forEach(function (l) { used[l.type] = (used[l.type] || 0) + daysOf(l); });
    var pill = function (on, txt, js) { return '<button onclick="' + js + '" style="font-size:11px;padding:3px 12px;border-radius:999px;cursor:pointer;border:1px solid ' + (on ? 'var(--primary)' : 'var(--border)') + ';background:' + (on ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'transparent') + ';color:' + (on ? 'var(--primary)' : 'var(--text)') + ';font-weight:' + (on ? 700 : 500) + '">' + txt + '</button>'; };
    var h = '<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><h2 style="margin:0"><i class="fa-solid fa-umbrella-beach"></i> Leave Summary</h2>' +
      '<select class="sel" style="font-size:11px" onchange="lvYear(this.value)">' + Object.keys(years).sort().reverse().map(function (y) { return '<option' + (y === _lyr ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>' +
      '<span style="flex:1"></span><button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="lvSettings()"><i class="fa-solid fa-gear"></i> Leave setup</button>' +
      '<button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="leaveEdit(\'\',\'' + new Date().toISOString().slice(0, 10) + '\')"><i class="fa-solid fa-plus"></i> Add leave</button></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px">' + types().map(function (t) {
        var u = used[t[0]] || 0, q = +c.quota[t[0]] || 0, left = q - u, pc = q ? Math.min(100, u / q * 100) : 0, col = q && left < 0 ? 'var(--error)' : pc >= 80 ? 'var(--warning)' : 'var(--primary)';
        return '<div style="padding:8px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg2)"><div style="font-size:11px;font-weight:700">' + t[2] + ' ' + t[1] + '</div>' +
          '<div style="font-family:var(--mono);font-size:16px;font-weight:700">' + f2(u) + ' <span style="font-size:10px;font-weight:400;color:var(--text3)">' + (q ? '/ ' + f2(q) + ' วัน' : 'วัน') + '</span></div>' +
          (q ? '<div style="height:5px;border-radius:3px;background:var(--bg3);overflow:hidden;margin:3px 0"><div style="width:' + pc.toFixed(0) + '%;height:100%;background:' + col + '"></div></div><div style="font-size:10px;color:' + col + '">' + (left < 0 ? 'เกินสิทธิ์ ' + f2(-left) + ' วัน' : 'คงเหลือ ' + f2(left) + ' วัน') + '</div>' : '<div style="font-size:9px;color:var(--text3)">ยังไม่ตั้งโควตา</div>') + '</div>';
      }).join('') + '</div></div>';
    h += '<div class="card"><div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;align-items:center"><span style="font-size:9px;font-weight:700;color:var(--text3)">TYPE</span>' + pill(!_lty, 'All', "lvType('')") +
      types().map(function (t) { return pill(_lty === t[0], t[2] + ' ' + t[1], "lvType('" + t[0] + "')"); }).join('') + '</div>' +
      '<table class="tbl"><thead><tr><th>วันที่</th><th>ประเภท</th><th>รูปแบบ</th><th class="r">วัน</th><th>หมายเหตุ</th><th></th></tr></thead><tbody>' +
      (rows.map(function (l) { var t = T(l.type);
        return '<tr><td style="font-size:10px;white-space:nowrap">' + E(l.date) + (l.to ? ' → ' + E(l.to) : '') + '</td><td>' + t[2] + ' ' + E(t[1]) + '</td><td style="font-size:10px">' + E(K(l.kind)) + (l.kind === 'hours' ? ' · ' + E(l.start || '') + ' ' + E(l.hours) + ' ชม.' : '') + '</td>' +
          '<td class="r" style="font-family:var(--mono)">' + f2(daysOf(l)) + '</td><td style="font-size:10px">' + E(l.note || '') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:4px" onclick="leaveEdit(\'' + l.id + '\')"><i class="fa-solid fa-pen"></i></button><button class="del-btn" onclick="leaveDel(\'' + l.id + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>'; }).join('') ||
        '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:12px">ไม่มีวันลาในปี ' + E(_lyr) + '</td></tr>') +
      (rows.length ? '<tr style="font-weight:700;background:var(--bg3)"><td colspan="3">รวม ' + rows.length + ' รายการ</td><td class="r" style="font-family:var(--mono)">' + f2(rows.reduce(function (s, l) { return s + daysOf(l); }, 0)) + '</td><td colspan="2"></td></tr>' : '') +
      '</tbody></table><div style="font-size:9px;color:var(--text3);margin-top:4px">เต็มวัน = นับเฉพาะวันทำงาน (ไม่นับเสาร์-อาทิตย์และวันหยุดในปฏิทิน) · ครึ่งวัน = 0.5 · รายชั่วโมง = ชั่วโมง ÷ ' + c.hours_per_day + '</div></div>';
    el.innerHTML = h;
  }
  window.renderLeave = renderLeave;
  window.lvYear = function (y) { _lyr = y; renderLeave(); };
  window.lvType = function (t) { _lty = t; renderLeave(); };
  window.lvSettings = function () {
    var c = cfg(), o = document.getElementById('lvs-ov'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'lvs-ov'; o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px';
    var dn = null; o.addEventListener('mousedown', function (e) { dn = e.target; }); o.addEventListener('mouseup', function (e) { if (dn === o && e.target === o) o.remove(); dn = null; });
    o.innerHTML = '<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(440px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)"><h3 style="margin:0 0 12px;font-size:14px"><i class="fa-solid fa-gear"></i> Leave setup</h3>' +
      '<div style="display:grid;gap:10px"><div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">ชั่วโมงทำงานต่อวัน</label><input id="lvs-h" type="number" min="1" step="0.5" class="inp" value="' + c.hours_per_day + '"></div>' +
      '<div style="font-size:10px;font-weight:700;color:var(--text3)">ประเภทการลา · ไอคอน · ชื่อ · โควตาต่อปี (วัน, เว้นว่าง = ไม่จำกัด)</div><div id="lvs-types" style="display:grid;gap:6px">' +
      types().map(function (t) { return tRow(t[0], t[2], t[1], c.quota[t[0]]); }).join('') + '</div>' +
      '<button type="button" class="btn btn-ghost" style="font-size:11px;justify-self:start" onclick="lvAddType()"><i class="fa-solid fa-plus"></i> เพิ่มประเภท</button>' +
      '</div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px"><button class="btn btn-ghost" id="lvs-no">Cancel</button><button class="btn btn-primary" id="lvs-yes">✓ Save</button></div></div>';
    document.body.appendChild(o);
    var ok = function () { var hv = parseFloat(document.getElementById('lvs-h').value); c.hours_per_day = hv > 0 ? hv : 8;
      var nt = [], q = {}; document.querySelectorAll('#lvs-types [data-lt]').forEach(function (r) { var id = r.getAttribute('data-lt'), nm = r.querySelector('.lt-n').value.trim(); if (!nm) return;
        nt.push({ id: id, name: nm, icon: r.querySelector('.lt-i').value.trim() || '📝' }); var v = String(r.querySelector('.lt-q').value).trim(); if (v !== '') q[id] = parseFloat(v) || 0; });
      if (!nt.length) { var er = document.getElementById('lvs-h'); if (er) er.focus(); return; } D.leave_types = nt; c.quota = q;
      o.remove(); try { saveD(); } catch (e) { } renderLeave(); };
    document.getElementById('lvs-no').onclick = function () { o.remove(); }; document.getElementById('lvs-yes').onclick = ok;
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') o.remove(); if (e.key === 'Enter') { e.preventDefault(); ok(); } });
  };
  function tRow(id, icon, name, q) { return '<div data-lt="' + E(id) + '" style="display:grid;grid-template-columns:44px 1fr 80px 28px;gap:6px;align-items:center">' +
    '<input class="inp lt-i" value="' + E(icon || '') + '" style="text-align:center"><input class="inp lt-n" value="' + E(name || '') + '" placeholder="ชื่อประเภท">' +
    '<input class="inp lt-q" type="number" min="0" step="0.5" value="' + (q != null && q !== '' ? q : '') + '" placeholder="∞">' +
    '<button type="button" class="del-btn" title="ลบประเภท" onclick="lvDelType(this)"><i class="fa-solid fa-trash"></i></button></div>'; }
  window.lvAddType = function () { var b = document.getElementById('lvs-types'); if (!b) return; b.insertAdjacentHTML('beforeend', tRow('lt' + Date.now().toString(36), '📝', '', '')); var n = b.lastElementChild.querySelector('.lt-n'); if (n) n.focus(); };
  window.lvDelType = function (btn) { var r = btn.closest('[data-lt]'), id = r.getAttribute('data-lt'), n = L().filter(function (l) { return l.type === id; }).length;
    if (n && typeof cmConfirm === 'function') cmConfirm('ประเภทนี้มีวันลาอยู่ ' + n + ' รายการ — ลบประเภทแล้วรายการเดิมยังอยู่ แต่จะแสดงเป็น (ลบประเภทแล้ว)', function () { r.remove(); }); else r.remove(); };
  // re-render summary after add/edit/delete
  var _sv = save; save = function () { _sv(); try { renderLeave(); } catch (e) { } };

  // ---- inject To-Do sub-menu: Tasks | Leave
  function injLeave() {
    try {
      var nt = document.querySelector('.nav-tab[data-tab="todos"]'), tab = document.getElementById('tab-todos'); if (!nt || !tab) return;
      if (!document.getElementById('leave-content')) {
        var tc = document.getElementById('todos-content'); var lc = document.createElement('div'); lc.id = 'leave-content'; lc.style.display = 'none'; tc.parentNode.insertBefore(lc, tc.nextSibling);
      }
      if (!document.querySelector('.nav-subwrap[data-parent="todos"]')) {
        var w = document.createElement('div'); w.className = 'nav-subwrap'; w.setAttribute('data-parent', 'todos');
        w.innerHTML = '<button class="nav-sub" data-tab="todos" data-sub="tasks"><span>Tasks</span></button><button class="nav-sub" data-tab="todos" data-sub="leave"><span>Leave</span></button>';
        nt.parentNode.insertBefore(w, nt.nextSibling);
      }
    } catch (e) { console.error('leave inj', e); }
  }
  function showSub(sub) {
    var tc = document.getElementById('todos-content'), lc = document.getElementById('leave-content'); if (!tc || !lc) return;
    tc.style.display = sub === 'leave' ? 'none' : ''; lc.style.display = sub === 'leave' ? '' : 'none';
    document.querySelectorAll('.nav-sub[data-tab="todos"]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sub') === sub); });
    if (sub === 'leave') renderLeave();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.nav-sub[data-tab="todos"]'); if (!b) return;
    var sub = b.getAttribute('data-sub'); setTimeout(function () { showSub(sub); }, 0);
  });
  injLeave(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injLeave);
})();
