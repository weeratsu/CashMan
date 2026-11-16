// ui-paymode.js (Nov 16 2026) — Pay mode ↔ Periods live toggle (Yearly row + Edit yearly popup).
// Full → Periods locked at 1 · Installment → Periods editable (min 2). Works without reopening the popup.
(function () {
  function sync(sel) {
    var yi = sel.getAttribute('data-yi'), box = sel.closest('#yr-edit-ov, .modal, [id$="-ov"], tr') || document;
    var inp = box.querySelector('input[data-f="inst_periods"]' + (yi != null ? '[data-yi="' + yi + '"]' : ''));
    if (!inp) return;
    if (sel.value === 'installment') {
      inp.disabled = false; inp.removeAttribute('disabled'); inp.style.opacity = '';
      inp.max = 60; inp.min = 1;
      if (!(+inp.value > 1)) inp.value = 2;
      setTimeout(function () { inp.focus(); inp.select(); }, 0);
    } else {
      inp.value = 1; inp.disabled = true; inp.style.opacity = '.5';
    }
    try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
  }
  // capture phase: runs before the row's own onchange re-render, and inside popups that copied the row markup
  document.addEventListener('change', function (e) {
    var t = e.target; if (t && t.matches && t.matches('select[data-f="pay_mode"]')) sync(t);
  }, true);
  // popup opened with installment already selected but the copied input still disabled -> unlock on open
  setInterval(function () {
    document.querySelectorAll('select[data-f="pay_mode"]').forEach(function (s) {
      var box = s.closest('[id$="-ov"]'); if (!box) return;
      var yi = s.getAttribute('data-yi'), inp = box.querySelector('input[data-f="inst_periods"]' + (yi != null ? '[data-yi="' + yi + '"]' : ''));
      if (inp && s.value === 'installment' && inp.disabled) { inp.disabled = false; inp.style.opacity = ''; inp.max = 60; }
    });
  }, 400);
})();
