// ui-partialpay.js v2 (Nov 18 2026) — partial payments on EVERY pay action:
//   Bills Reminder row "Pay" (markRowPaid) · Dashboard calendar popup "Pay" (billPayFromCal) · Card Bills "Mark statement paid" (cbMarkPaid)
// Each Pay opens one standard popup: amount (default = remaining) + date + ☑ close this bill.
// Ledger D.bill_payments[key]: {paid:true|false, partial:true, parts:[{date,amount}], paid_amount:<sum>, paid_date:<last>, remaining:<left>}
//   paid:false = still open with `remaining`; paid:true = closed (fully paid, or closed by choice).
(function () {
  function F(n) { return (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function rerender() {
    ['_billRerenderAll', 'renderDashCalendar', 'renderCardBills', 'renderBillReminder', 'renderDashBills', 'simulate'].forEach(function (f) { try { if (typeof window[f] === 'function') window[f](); } catch (e) { } });
  }
  // apply a part to the record that the original function just wrote under `key`
  function applyPart(key, total, date, amt, close, prevParts) {
    var r = (D.bill_payments || {})[key]; if (!r) return;
    var parts = (prevParts || []).concat([{ date: date, amount: Math.round(amt * 100) / 100 }]);
    var sum = Math.round(parts.reduce(function (s, p) { return s + (+p.amount || 0); }, 0) * 100) / 100;
    close = close || sum >= (+total || 0) - 0.005;
    r.parts = parts; r.partial = parts.length > 1 || sum < (+total || 0) - 0.005; r.paid_amount = sum; r.paid_date = date; r.paid = close;
    if (!close) r.remaining = Math.round(((+total || 0) - sum) * 100) / 100; else delete r.remaining;
    try { saveD(); } catch (e) { }
    rerender();
    if (typeof toast === 'function') toast(close ? '✅ จ่ายแล้ว ฿' + F(sum) + (r.partial ? ' · ปิดงวดนี้' : '') : '🟠 จ่ายบางส่วน ฿' + F(amt) + ' · เหลือ ฿' + F(r.remaining));
  }
  function prevOf(key) { var r = (D.bill_payments || {})[key]; return (r && Array.isArray(r.parts) && !r.paid) ? r.parts.slice() : (r && r.partial && Array.isArray(r.parts) ? r.parts.slice() : []); }
  // standard popup (Cancel left / ✓ Pay right, Enter/Esc)
  function ask(title, total, prevParts, dateDefault, cb) {
    var paid = prevParts.reduce(function (s, p) { return s + (+p.amount || 0); }, 0), left = Math.max(0, Math.round((total - paid) * 100) / 100);
    var o = document.getElementById('pp-ov'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'pp-ov';
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10070;display:flex;align-items:center;justify-content:center;padding:16px';
    var dn = null; o.addEventListener('mousedown', function (e) { dn = e.target; }); o.addEventListener('mouseup', function (e) { if (dn === o && e.target === o) o.remove(); dn = null; });
    o.innerHTML = '<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(380px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<h3 style="margin:0 0 4px;font-size:14px"><i class="fa-solid fa-check"></i> ' + title + '</h3>' +
      '<div style="font-size:10px;color:var(--text3);margin-bottom:10px">ยอดบิล ฿' + F(total) + (paid > 0 ? ' · จ่ายแล้ว ฿' + F(paid) + ' (' + prevParts.length + ' ครั้ง) · เหลือ ฿' + F(left) : '') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">ยอดที่จ่าย</label><input id="pp-amt" class="inp" inputmode="decimal" value="' + left.toFixed(2) + '"></div>' +
      '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">วันที่จ่าย</label><input id="pp-date" type="date" class="inp" value="' + (dateDefault || today()) + '"></div></div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;margin-top:10px"><input type="checkbox" id="pp-close" checked> ปิดงวดนี้ <span style="color:var(--text3);font-size:10px">(ไม่ติ๊ก = บิลยังค้างยอดที่เหลือ จ่ายต่อได้)</span></label>' +
      '<div id="pp-err" style="color:var(--error);font-size:10px;min-height:14px;margin-top:4px"></div>' +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><button class="btn btn-ghost" id="pp-no">Cancel</button><button class="btn btn-primary" id="pp-yes"><i class="fa-solid fa-check"></i> Pay</button></div>' +
      '<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Pay · Esc = Cancel</div></div>';
    document.body.appendChild(o);
    var A = document.getElementById('pp-amt'), C = document.getElementById('pp-close'), Dt = document.getElementById('pp-date');
    A.addEventListener('input', function () { var v = parseFloat(String(A.value).replace(/,/g, '')); C.checked = !(v < left - 0.005); });
    var ok = function () {
      var v = parseFloat(String(A.value).replace(/,/g, '')), d = Dt.value;
      if (!(v > 0)) { document.getElementById('pp-err').textContent = 'ใส่ยอดที่จ่าย'; A.focus(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) { document.getElementById('pp-err').textContent = 'เลือกวันที่จ่าย'; Dt.focus(); return; }
      o.remove(); cb(v, d, C.checked);
    };
    document.getElementById('pp-no').onclick = function () { o.remove(); };
    document.getElementById('pp-yes').onclick = ok;
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') o.remove(); if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    setTimeout(function () { A.focus(); A.select(); }, 30);
  }
  function wrap(name, fn) { var o = window[name]; if (typeof o !== 'function' || o._pp2) return; var w = fn(o); w._pp2 = 1; window[name] = w; }
  function hookAll() {
    // Bills Reminder row: markRowPaid(fullKey,amount,dueISO,typ,card,autoPay,uu,up,per) — reads date from #brpd_<key>
    wrap('markRowPaid', function (o) { return function (key, amount) {
      var self = this, args = arguments, id = 'brpd_' + String(key).replace(/[^a-zA-Z0-9]/g, '_'), di = document.getElementById(id), prev = prevOf(key);
      ask('Pay', +amount || 0, prev, di && di.value, function (v, d, close) {
        // Nov 19 2026 fix: the calendar's temp date input is gone by now → always use one that is IN the page
        di = document.getElementById(id);
        var tmp = null; if (!di) { tmp = document.createElement('input'); tmp.type = 'hidden'; tmp.id = id; document.body.appendChild(tmp); di = tmp; }
        var bak = di.value; di.value = d;
        try { window._ppSkip = 1; o.apply(self, args); } finally { window._ppSkip = 0; di.value = bak; if (tmp) tmp.remove(); }
        applyPart(key, amount, d, v, close, prev);
        try { if (typeof dashCalClosePop === 'function') dashCalClosePop(); } catch (e) { }
      });
    }; });
    // Calendar popup Pay: billPayFromCal → calls markRowPaid internally; let the markRowPaid wrapper handle the popup
    wrap('billPayFromCal', function (o) { return function (key, amount, due, typ, card, ap, uu, up, per) {
      var di = document.getElementById('calpd'), dflt = di && di.value;
      var hold = document.createElement('input'); hold.type = 'hidden'; hold.id = 'brpd_' + String(key).replace(/[^a-zA-Z0-9]/g, '_'); hold.value = dflt || '';
      var old = document.getElementById(hold.id); if (old) old.id = hold.id + '_x'; document.body.appendChild(hold);
      try { window.markRowPaid(key, amount, due, typ, card, ap, uu, up, per); } finally { setTimeout(function () { hold.remove(); if (old) old.id = hold.id; }, 0); }
    }; });
    // Card Bills: cbMarkPaid(card,y,m,amt,per) → writes CB|<card>|<per>::... record
    wrap('cbMarkPaid', function (o) { return function (card, y, m, amt, per) {
      var self = this, args = arguments, beforeKeys = Object.keys(D.bill_payments || {});
      var cid = (typeof window.cardResolve === 'function') ? ((window.cardResolve(card) || {}).id || card) : card;
      var p = /^\d{4}-\d{2}$/.test(per || '') ? per : (typeof _cbPeriodForView === 'function' ? _cbPeriodForView(card, y, m) : per);
      var ex = Object.keys(D.bill_payments || {}).find(function (k) { return k.indexOf('CB|' + cid + '|' + p + '::') === 0 || k.indexOf('CB|' + card + '|' + p + '::') === 0; });
      var prev = ex ? prevOf(ex) : [];
      ask('Pay statement · ' + card, +amt || 0, prev, '', function (v, d, close) {
        o.apply(self, args);
        var key = Object.keys(D.bill_payments || {}).find(function (k) { return (k.indexOf('CB|' + cid + '|' + p + '::') === 0 || k.indexOf('CB|' + card + '|' + p + '::') === 0); });
        if (key) applyPart(key, amt, d, v, close, prev);
      });
    }; });
  }
  // ===== v3 (Nov 19 2026): show REMAINING for open partial bills everywhere =====
  // Open partial record = {partial:true, paid:false, remaining}. Readers treat it as unpaid and use `remaining` as the amount.
  function openPart(r) { return r && r.paid === false && r.remaining > 0.005 ? r : null; }
  function findCB(card, per) {
    var bp = D.bill_payments || {}, cid = (typeof window.cardResolve === 'function') ? ((window.cardResolve(card) || {}).id || card) : card;
    var k = Object.keys(bp).find(function (k) { return k.indexOf('CB|' + cid + '|' + per + '::') === 0 || k.indexOf('CB|' + card + '|' + per + '::') === 0; });
    return k ? bp[k] : null;
  }
  window.cmPartialFor = function (key) { return openPart((D.bill_payments || {})[key]); };
  function hookReaders() {
    // Nov 19 2026: Payment History ✕ (unmark paid) asks first — standard popup
    wrap('toggleBillPaid', function (o) { return function (key, amount, checked) {
      var self = this, args = arguments;
      if (checked || window._ppDelOk) return o.apply(self, args);
      var r = (D.bill_payments || {})[key] || {}, nm = String(key).split('|')[1] || key;
      window.cmConfirm('ลบรายการจ่ายนี้ออกจากประวัติ?\n\n' + nm + (r.paid_amount ? '\n฿' + F(r.paid_amount) : '') + (r.paid_date ? ' · ' + r.paid_date : '') + '\n\nบิลจะกลับเป็น "ยังไม่จ่าย"',
        function () { window._ppDelOk = 1; try { o.apply(self, args); } finally { window._ppDelOk = 0; } },
        { title: 'Remove payment', danger: true });
    }; });
    // Bills Reminder / Dashboard / Calendar: occurrences
    wrap('billOccurrences', function (o) { return function () {
      var occ = o.apply(this, arguments);
      (occ || []).forEach(function (x) {
        var r = openPart((D.bill_payments || {})[x.fullKey]) || (x.statementPeriod ? openPart(findCB(x.card, x.statementPeriod)) : null);
        if (!r) return;
        x.paid = false; x.partial = true; x.amount_full = x.amount; x.paid_amount = r.paid_amount; x.amount = r.remaining;
        x.info = (x.info ? x.info + ' ' : '') + '· จ่ายแล้ว ฿' + F(r.paid_amount) + ' เหลือ ฿' + F(r.remaining);
      });
      return occ;
    }; });
    // Card statement readers: an open partial is NOT paid
    wrap('cardPaidRecFor', function (o) { return function (card, per) { var r = o.apply(this, arguments); return (r && r.paid === false) ? null : r; }; });
    wrap('cbPaidRec', function (o) { return function (card, y, m, per) { var r = o.apply(this, arguments); if (r && r.paid && per) { var p = findCB(card, per); if (openPart(p)) return Object.assign({}, r, { paid: false, partial: p }); } return r; }; });
  }
  // Card Bills page: rewrite "Effective" to the remaining amount (bank transfer summary reads this number)
  function cardBillsDom() {
    var el = document.getElementById('cardbills-content'); if (!el) return;
    [].slice.call(el.querySelectorAll('[onclick^="cbToggle("]')).forEach(function (h) {
      if (h.querySelector('.pp-rem')) return;
      var m = /cbToggle\('(.*)'\)/.exec(h.getAttribute('onclick') || ''), pm = /\u0e07\u0e27\u0e14\s*(\d{4}-\d{2})/.exec(h.textContent || '');
      if (!m || !pm) return;
      var r = openPart(findCB(m[1].replace(/\\'/g, "'"), pm[1])); if (!r) return;
      var w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) { if (/Effective:/.test(n.nodeValue)) break; }
      if (!n) return;
      var amtNode = n.nextSibling && n.nextSibling.nodeType === 1 ? n.nextSibling : n.parentNode.nextElementSibling;
      if (amtNode) amtNode.textContent = '\u0e3f' + F(r.remaining);
      var s = document.createElement('span'); s.className = 'pp-rem';
      s.style.cssText = 'font-size:9px;padding:1px 6px;border-radius:999px;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;margin-left:6px';
      s.textContent = '🟠 จ่ายแล้วบางส่วน ฿' + F(r.paid_amount) + ' / ฿' + F(r.paid_amount + r.remaining);
      (amtNode || n.parentNode).after(s);
    });
  }
  // v1 inline field in the calendar popup is no longer used
  setInterval(function () { try { hookAll(); hookReaders(); cardBillsDom(); var w = document.getElementById('calpa-w'); if (w) w.remove(); } catch (e) { console.warn('partialpay', e); } }, 300);
})();
