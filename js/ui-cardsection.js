/* ui-cardsection.js (Nov 13 2026) — Credit Cards › Overview: group each card's detail body into framed sections.
 * Separate file, does NOT change ui-creditcards.js. Works on the rendered body (#ccbody_<i>) and the Edit popup (#cc-edit-body):
 * finds each field by its label text and moves it into a section box. Unknown fields stay in "Other".
 */
(function () {
  var SECTIONS = [
    { t: '🪪 ข้อมูลบัตร', k: ['Card name', 'Bank', 'Last 4 digits', 'Expiry', 'Status', 'Card details URL'] },
    { t: '📅 รอบบิล', k: ['Statement day', 'Period', 'Due offset', 'Deadline day', 'Statements from', 'Credit term'] },
    { t: '💳 วงเงิน', k: ['Credit limit', 'Current balance', 'Shared limit group', 'Available'] },
    { t: '🎁 สิทธิประโยชน์', k: ['Benefits', 'Cashback'] },
    { t: '🧾 ค่าธรรมเนียม', k: ['Fee-waiver', 'Target', 'Add un-recorded spend'] },
    { t: '⭐ คะแนนสะสม', k: ['Reward points log'] },
    { t: '📝 หมายเหตุ', k: ['Personal remarks'] }
  ];
  var CSS = '.ccs-sec{border:1px solid var(--border);border-radius:10px;padding:8px 12px 10px;margin:8px 0;background:var(--bg2)}' +
    '.ccs-sec>.ccs-h{font-size:11px;font-weight:700;color:var(--text2,var(--text));margin:0 0 6px;display:flex;align-items:center;gap:6px}' +
    '.ccs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px 14px}' +
    '.ccs-full{grid-column:1/-1}' +
    // v2: uniform fields — same label size/height, inputs full width, top-aligned, no overflow
    '.ccs-grid{align-items:start}' +
    '.ccs-grid>*{min-width:0;margin:0!important;display:flex;flex-direction:column;gap:3px;font-size:10px}' +
    '.ccs-grid label{font-size:10px!important;color:var(--text3)!important;line-height:1.3;min-height:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400!important}' +
    '.ccs-grid input:not([type=checkbox]),.ccs-grid select{width:100%!important;box-sizing:border-box;height:28px;font-size:11px!important;padding:3px 7px!important;margin:0!important}' +
    '.ccs-grid textarea{width:100%!important;box-sizing:border-box;font-size:11px!important}' +
    '.ccs-grid>* > div[style*="grid-template-columns"]{display:grid;grid-template-columns:1fr 1fr!important;gap:4px}' +
    '.ccs-grid a{font-size:9px}' +
    '.ccs-grid>*>div[style*="font-size:8px"],.ccs-grid>*>div[style*="font-size:9px"]{font-size:9px!important;line-height:1.3}';
  function css() { if (document.getElementById('ccs-css')) return; var s = document.createElement('style'); s.id = 'ccs-css'; s.textContent = CSS; document.head.appendChild(s); }
  function which(txt) {
    txt = String(txt || '').trim();
    for (var i = 0; i < SECTIONS.length; i++) for (var j = 0; j < SECTIONS[i].k.length; j++) if (txt.indexOf(SECTIONS[i].k[j]) === 0 || txt.indexOf(SECTIONS[i].k[j]) >= 0 && SECTIONS[i].k[j].length > 6 && txt.indexOf(SECTIONS[i].k[j]) < 4) return i;
    return -1;
  }
  // the movable "field block" = the nearest ancestor of the label that is a direct child of a grid or of the body
  function block(lbl, body) {
    var n = lbl; while (n && n.parentNode && n.parentNode !== body) {
      var p = n.parentNode, d = getComputedStyle(p).display;
      if (d === 'grid' || /grid/.test(p.style.cssText || '')) return n;
      n = p;
    }
    return n;
  }
  function apply(body) {
    if (!body || body._ccs || !body.querySelector('label')) return;
    css();
    var secs = SECTIONS.map(function (s) { var b = document.createElement('div'); b.className = 'ccs-sec'; b.innerHTML = '<div class="ccs-h">' + s.t + '</div><div class="ccs-grid"></div>'; return b; });
    var other = document.createElement('div'); other.className = 'ccs-sec'; other.innerHTML = '<div class="ccs-h">📦 อื่น ๆ</div><div class="ccs-grid"></div>';
    var moved = 0, seen = [];
    body.querySelectorAll('label').forEach(function (l) {
      var i = which(l.textContent); var b = block(l, body); if (!b || seen.indexOf(b) >= 0) return;
      if (i < 0) return; seen.push(b);
      var wide = /Benefits|Fee-waiver conditions|Personal remarks|Reward points log/.test(l.textContent) || b.querySelector('textarea,table');
      if (wide) b.classList.add('ccs-full');
      secs[i].querySelector('.ccs-grid').appendChild(b); moved++;
    });
    if (moved < 4) return;   // layout not recognised — leave untouched
    // anything left directly in body (except action buttons) goes to "Other"
    var keep = [];
    Array.prototype.slice.call(body.children).forEach(function (ch) {
      if (ch.querySelector && ch.querySelector('label') && !/ccsave_|ccdirty_/.test(ch.id || '')) { var g = ch; if (getComputedStyle(g).display === 'grid' && !g.querySelector('label')) return; other.querySelector('.ccs-grid').appendChild(ch); ch.classList.add('ccs-full'); }
      else keep.push(ch);
    });
    var frag = document.createDocumentFragment();
    secs.forEach(function (s) { if (s.querySelector('.ccs-grid').children.length) frag.appendChild(s); });
    if (other.querySelector('.ccs-grid').children.length && other.querySelector('label')) frag.appendChild(other);
    // drop emptied wrappers
    Array.prototype.slice.call(body.children).forEach(function (ch) { if (ch.nodeType === 1 && !ch.textContent.trim() && !ch.querySelector('input,select,textarea,button,table')) ch.remove(); });
    body.insertBefore(frag, body.firstChild);
    body._ccs = 1;
  }
  function scan() {
    try {
      document.querySelectorAll('[id^="ccbody_"]').forEach(function (b) { if (b.offsetParent !== null || b.style.display !== 'none') apply(b); });
      var p = document.getElementById('cc-edit-body'); if (p) apply(p);
    } catch (e) { console.warn('cardsection:', e); }
  }
  setInterval(scan, 400);
})();
