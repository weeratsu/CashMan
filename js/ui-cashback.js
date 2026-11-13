/* ui-cashback.js (Nov 13 2026) — Cashback per card statement (Card Summary).
 * Separate file. Card settings (by card id): D.cards[i].cashback = {pct: 1, cap: 500}  (cap = max per statement, 0 = no cap)
 * Per-transaction exclusions:  D.cashback_off = {'<txn key>': true}     (unticked = not eligible)
 * Remembered merchants:        D.cashback_merchant_off = {'<normalised merchant>': true}  (auto-untick next periods)
 * Only purchase-type rows (positive amount, not payment/fee/interest) are eligible.
 * Works on the transaction table that Card Summary renders (table.cs-txn): adds a ✓ column + summary line.
 */
(function () {
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function F(n) { return (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function card(name) {
    var C = (window.D && D.cards) || [];
    var c = (typeof window.cardResolve === 'function' && window.cardResolve(name)) || null;
    return c || C.find(function (x) { return x.name === name; }) || null;
  }
  // merchant key: drop digits / branch codes / city words so "BANGCHAK-INFINITE SERV BANGKOK THA" ~ "BANGCHAK-INFINITE"
  function mkey(desc) { return String(desc || '').toUpperCase().replace(/\d+/g, ' ').replace(/\b(BANGKOK|THA|TH|THAILAND|CO|LTD|PCL)\b/g, ' ').replace(/[^A-Z\u0E00-\u0E7F]+/g, ' ').trim().split(' ').slice(0, 2).join(' '); }
  // v5: installment row = kind installment, or desc/row shows (003/006)
  function isInst(tr) { return /install/i.test(tr.getAttribute('data-kind') || '') || /\(\d{1,3}\/\d{1,3}\)/.test(tr.textContent || ''); }
  function mk2(tr) { return (isInst(tr) ? 'I:' : '') + mkey(tr.getAttribute('data-desc')); }
  function eligibleRow(tr) {
    var a = +tr.getAttribute('data-amt') || 0, k = String(tr.getAttribute('data-kind') || '').toLowerCase(), d = String(tr.getAttribute('data-desc') || '');
    if (!(a > 0)) return false;
    if (/payment|fee|interest|vat|adjust/.test(k)) return false;
    if (/ดอกเบี้ย|ค่าธรรมเนียม|INTEREST|FEE|VAT\b/i.test(d)) return false;
    return true;
  }
  // v7: purchase later converted to installment (statement shows 'Reversal to Installment' for the same amount) -> no cashback,
  // decided per row, never via merchant memory (other Lazada purchases stay eligible)
  function conv(tr) { return tr.getAttribute('data-conv') === '1'; }
  function markConv(tb) { var rev = []; tb.querySelectorAll('tbody tr[data-tk]').forEach(function (r) { var a = +r.getAttribute('data-amt') || 0;
      if (a < 0 && /reversal.*install|installment.*reversal|แปลง.*ผ่อน/i.test(r.getAttribute('data-desc') || '')) rev.push(Math.round(-a * 100)); });
    tb.querySelectorAll('tbody tr[data-tk]').forEach(function (r) { var a = Math.round((+r.getAttribute('data-amt') || 0) * 100), k = rev.indexOf(a);
      if (a > 0 && k >= 0 && !isInst(r)) { r.setAttribute('data-conv', '1'); rev.splice(k, 1); } }); }
  function isOn(tr, cb) {
    var tk = tr.getAttribute('data-tk'), off = (D.cashback_off = D.cashback_off || {}), mo = (D.cashback_merchant_off = D.cashback_merchant_off || {});
    if (Object.prototype.hasOwnProperty.call(off, tk)) return !off[tk];
    if (conv(tr)) return false;
    if (isInst(tr) && !(cb && cb.inst)) return false;   // installments: off by default unless card setting allows
    return !mo[mk2(tr)];
  }
  window.cbToggleTxn = function (el) {
    var tr = el.closest('tr'), tk = tr.getAttribute('data-tk');
    D.cashback_off = D.cashback_off || {}; D.cashback_merchant_off = D.cashback_merchant_off || {};
    D.cashback_off[tk] = !el.checked;
    var mk = conv(tr) ? '' : mk2(tr); if (mk && mk !== 'I:') { if (!el.checked) D.cashback_merchant_off[mk] = true; else delete D.cashback_merchant_off[mk]; }
    try { saveD(); } catch (e) { }
    var tb = el.closest('table'); if (tb) { tb._cb = 0; decorate(tb); }
  };
  window.cbSetup = function (cardName) {
    var c = card(cardName); if (!c) return;
    var cb = c.cashback || {}, o = document.getElementById('cb-ov'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'cb-ov';
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px';
    var dn = null; o.addEventListener('mousedown', function (e) { dn = e.target; }); o.addEventListener('mouseup', function (e) { if (dn === o && e.target === o) o.remove(); dn = null; });
    o.innerHTML = '<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(360px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<h3 style="margin:0 0 12px;font-size:14px"><i class="fa-solid fa-hand-holding-dollar"></i> Cashback · ' + E(c.name) + '</h3><div style="display:grid;gap:10px">' +
      '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">Cashback % ต่อรายการ (0 = ไม่มี)</label><input id="cb-pct" type="number" step="0.01" min="0" class="inp" value="' + E(cb.pct || '') + '" placeholder="1"></div>' +
      '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">เพดานต่อรอบบิล (฿, เว้นว่าง = ไม่จำกัด)</label><input id="cb-cap" type="number" step="1" min="0" class="inp" value="' + E(cb.cap || '') + '" placeholder="500"></div></div>' +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px"><button class="btn btn-ghost" id="cb-no">Cancel</button><button class="btn btn-primary" id="cb-yes">✓ Save</button></div>' +
      '<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save · Esc = Cancel</div></div>';
    document.body.appendChild(o);
    var ok = function () { var p = parseFloat(document.getElementById('cb-pct').value), cp = parseFloat(document.getElementById('cb-cap').value);
      c.cashback = { pct: p > 0 ? p : 0, cap: cp > 0 ? cp : 0 }; if (!(p > 0)) delete c.cashback;
      o.remove(); try { saveD(); } catch (e) { } document.querySelectorAll('table.cs-txn').forEach(function (t) { t._cb = 0; decorate(t); }); };
    document.getElementById('cb-no').onclick = function () { o.remove(); }; document.getElementById('cb-yes').onclick = ok;
    o.addEventListener('keydown', function (e) { if (e.key === 'Escape') o.remove(); if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    setTimeout(function () { var f = document.getElementById('cb-pct'); if (f) f.focus(); }, 30);
  };
  function decorate(tb) {
    if (!window.D) return;
    var name = tb.getAttribute('data-card'), c = card(name), cb = c && c.cashback, pct = cb ? +cb.pct || 0 : 0;
    // header column
    var hr = tb.querySelector('thead tr');
    if (hr && !hr.querySelector('.cb-h')) { var th = document.createElement('th'); th.className = 'cb-h'; th.title = 'Cashback eligible'; th.style.width = '24px'; th.innerHTML = pct ? '💰' : ''; hr.insertBefore(th, hr.firstChild); }
    else if (hr) hr.querySelector('.cb-h').innerHTML = pct ? '💰' : '';
    var base = 0, n = 0;
    markConv(tb);
    tb.querySelectorAll('tbody tr[data-tk]').forEach(function (tr) {
      var cell = tr.querySelector('.cb-c'); if (!cell) { cell = document.createElement('td'); cell.className = 'cb-c'; cell.style.textAlign = 'center'; tr.insertBefore(cell, tr.firstChild); }
      if (!pct || !eligibleRow(tr)) { cell.innerHTML = ''; tr.style.opacity = ''; return; }
      var on = isOn(tr, cb);
      cell.innerHTML = '<input type="checkbox" title="' + (conv(tr) ? 'แปลงเป็นผ่อนภายหลัง — ไม่ได้ cashback' : 'ได้ cashback') + '" ' + (on ? 'checked' : '') + ' onclick="event.stopPropagation()" onchange="cbToggleTxn(this)">' + (conv(tr) ? '<div style="font-size:8px;color:var(--warning)">→ผ่อน</div>' : '');
      tr.style.opacity = on ? '' : '.55';
      if (on) { base += +tr.getAttribute('data-amt') || 0; n++; }
    });
    var raw = base * pct / 100, cap = cb && +cb.cap > 0 ? +cb.cap : 0, got = cap ? Math.min(raw, cap) : raw;
    var sum = tb.nextElementSibling && tb.nextElementSibling.classList && tb.nextElementSibling.classList.contains('cb-sum') ? tb.nextElementSibling : null;
    if (!sum) { sum = document.createElement('div'); sum.className = 'cb-sum'; tb.parentNode.insertBefore(sum, tb.nextSibling); }
    sum.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;padding:6px 10px;margin:2px 0 8px;border-radius:8px;background:' + (pct ? 'color-mix(in srgb, var(--success,#16a34a) 9%, transparent)' : 'var(--bg3)');
    sum.innerHTML = (pct
      ? '💰 <b>Cashback งวดนี้ ฿' + F(got) + '</b> <span style="color:var(--text3)">(' + n + ' รายการ · ฿' + F(base) + ' × ' + pct + '%' + (cap ? ' · เพดาน ฿' + F(cap) + (raw > cap ? ' — ถึงเพดานแล้ว' : '') : '') + ')</span>'
      : '<span style="color:var(--text3)">บัตรนี้ยังไม่ได้ตั้ง cashback — ตั้งได้ที่ Credit Cards › Overview</span>');
    tb._cb = 1;
  }
  // Nov 13 2026: Cashback % + cap are card-level policy -> fields in Credit Cards › Overview card body (after Status)
  window.cbSetField = function (i, f, v) {
    var c = (D.cards || [])[i]; if (!c) return; var n = parseFloat(v);
    c.cashback = c.cashback || {}; c.cashback[f] = n > 0 ? n : 0; if (f === 'inst') c.cashback.inst = n > 0 ? 1 : 0;
    if (!(c.cashback.pct > 0)) delete c.cashback;
    try { saveD(); } catch (e) { }
    document.querySelectorAll('table.cs-txn').forEach(function (t) { t._cb = 0; });
  };
  function overview() {
    // v3: Edit card popup — add the field right after the Status select (popup copies the card body without our field)
    var pop = document.getElementById('cc-edit-body');
    if (pop && !pop.querySelector('.cb-fields') && window._ccEditIdxCB != null) {
      var i0 = window._ccEditIdxCB, c0 = (D.cards || [])[i0];
      var sts = pop.querySelectorAll('select'), stSel = null;
      for (var k = 0; k < sts.length; k++) { if (/active/i.test(sts[k].innerHTML) && /cancelled/i.test(sts[k].innerHTML)) { stSel = sts[k]; break; } }
      var anchor = stSel ? (stSel.closest('#cs-st-' + i0) || stSel.parentNode) : null;
      if (c0 && anchor) { var cb0 = c0.cashback || {}, d0 = document.createElement('div'); d0.className = 'cb-fields'; d0.style.cssText = 'display:flex;flex-direction:column;gap:2px';
        d0.innerHTML = '<label style="font-size:10px;color:var(--text3)">💰 Cashback % / เพดานต่อรอบ (฿)</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">' +
          '<input type="number" min="0" step="0.01" placeholder="%" value="' + (cb0.pct > 0 ? cb0.pct : '') + '" onchange="cbSetField(' + i0 + ',\'pct\',this.value)" class="inp">' +
          '<input type="number" min="0" step="1" placeholder="ไม่จำกัด" value="' + (cb0.cap > 0 ? cb0.cap : '') + '" onchange="cbSetField(' + i0 + ',\'cap\',this.value)" class="inp"></div>' +
          '<label style="display:flex;align-items:center;gap:5px;white-space:normal"><input type="checkbox"' + (cb0.inst ? ' checked' : '') + ' onchange="cbSetField(' + i0 + ',\'inst\',this.checked?1:0)"> รายการผ่อนได้ cashback ด้วย</label>';
        anchor.parentNode.insertBefore(d0, anchor.nextSibling); }
    }
    (D.cards || []).forEach(function (c, i) {
      // v4: read-only card view (no Status select) -> show the saved cashback as text
      var body = document.getElementById('ccbody_' + i);
      if (body && !body.closest('#cc-edit-ov') && !document.getElementById('cs-st-' + i)) {
        var cb1 = c.cashback || {}, txt = cb1.pct > 0 ? cb1.pct + '% · เพดาน ' + (cb1.cap > 0 ? '฿' + F(cb1.cap) + ' / รอบ' : 'ไม่จำกัด') + ' · ผ่อน: ' + (cb1.inst ? 'ได้' : 'ไม่ได้') : '—';
        var ro = body.querySelector('.cb-ro');
        if (!ro) { ro = document.createElement('div'); ro.className = 'cb-ro'; ro.style.fontSize = '10px';
          var secs = body.querySelectorAll('.ccs-sec'), tgt = null;
          for (var s = 0; s < secs.length; s++) if (/สิทธิประโยชน์/.test(secs[s].querySelector('.ccs-h').textContent)) { tgt = secs[s].querySelector('.ccs-grid'); break; }
          if (tgt) tgt.insertBefore(ro, tgt.firstChild); else body.appendChild(ro); }
        ro.innerHTML = '<label style="color:var(--text3)">💰 Cashback % / เพดานต่อรอบ (฿)</label><div style="font-size:11px">' + txt + '</div>';
      }
      var st = document.getElementById('cs-st-' + i); if (!st || st.closest('#cc-edit-ov') || document.getElementById('cb-f-' + i)) return;
      var cb = c.cashback || {}, inp = function (f, ph) { return '<input type="number" min="0" step="' + (f === 'pct' ? '0.01' : '1') + '" placeholder="' + ph + '" value="' + (cb[f] > 0 ? cb[f] : '') +
        '" onchange="cbSetField(' + i + ',\'' + f + '\',this.value)" style="width:100%;padding:3px 6px;font-size:10px">'; };
      var d = document.createElement('div'); d.id = 'cb-f-' + i; d.style.fontSize = '10px';
      d.innerHTML = '<label style="color:var(--text3)">💰 Cashback % / เพดานต่อรอบ (฿)</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">' + inp('pct', '%') + inp('cap', 'ไม่จำกัด') + '</div>';
      st.parentNode.insertBefore(d, st.nextSibling);
    });
  }
  function scan() { try { document.querySelectorAll('table.cs-txn').forEach(function (t) { if (!t._cb) decorate(t); }); if (window.D) overview(); } catch (e) { console.warn('cashback:', e); } }
  // remember which card the Edit popup is for
  function hookEdit() { if (typeof window.ccEditOpen !== 'function' || window.ccEditOpen._cb) return; var o = window.ccEditOpen;
    var w = function (i) { window._ccEditIdxCB = i; return o.apply(this, arguments); }; w._cb = 1; window.ccEditOpen = w; }
  setInterval(hookEdit, 500);
  setInterval(scan, 500);
})();
