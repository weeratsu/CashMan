// ui-recurtabs.js v1 (Nov 20 2026) — Bills & Plans › Recurring split into tabs: Monthly | Yearly | Summary | All.
// Only shows/hides existing cards inside #bp-recurring (matched by heading). No data/logic change.
(function () {
  var TABS = [['monthly', 'Monthly', 'fa-rotate', /Daily Living|Monthly Recurring/], ['yearly', 'Yearly', 'fa-calendar', /Yearly Recurring/],
    ['summary', 'Summary', 'fa-chart-pie', /Recurring Summary/], ['all', 'ทั้งหมด', 'fa-layer-group', null]];
  var KEY = 'cm_recur_tab';
  function cur() { try { return localStorage.getItem(KEY) || 'monthly'; } catch (e) { return 'monthly'; } }
  function pill(t, on) {
    return '<button data-rt="' + t[0] + '" onclick="recurTab(\'' + t[0] + '\')" style="font-size:11px;padding:4px 14px;border-radius:999px;cursor:pointer;border:1px solid ' + (on ? 'var(--primary)' : 'var(--border)') +
      ';background:' + (on ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'transparent') + ';color:' + (on ? 'var(--primary)' : 'var(--text)') + ';font-weight:' + (on ? 700 : 500) + '"><i class="fa-solid ' + t[2] + '" style="font-size:10px;margin-right:5px"></i>' + t[1] + '</button>';
  }
  function apply() {
    var p = document.getElementById('bp-recurring'); if (!p) return;
    var id = cur(), T = TABS.find(function (t) { return t[0] === id; }) || TABS[0];
    var bar = document.getElementById('recur-tabs');
    if (!bar) { bar = document.createElement('div'); bar.id = 'recur-tabs'; bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px'; p.insertBefore(bar, p.firstChild); }
    var html = TABS.map(function (t) { return pill(t, t[0] === id); }).join('');
    if (bar._h !== html) { bar.innerHTML = html; bar._h = html; }
    // every direct child: cards by heading; the "Export/Import Recurring" button row goes with Summary
    [].slice.call(p.children).forEach(function (c) {
      if (c === bar) return;
      var h = c.querySelector && c.querySelector('h2'), txt = h ? h.textContent : '', tab = null;
      TABS.forEach(function (t) { if (t[3] && t[3].test(txt)) tab = t[0]; });
      if (!tab && /Export Recurring|Import Recurring/.test(c.textContent || '')) tab = 'summary';
      var show = id === 'all' || !tab || tab === id;
      var want = show ? '' : 'none';
      if (c.style.display !== want) c.style.display = want;
    });
  }
  window.recurTab = function (id) { try { localStorage.setItem(KEY, id); } catch (e) { } apply(); try { window.scrollTo(0, 0); } catch (e) { } };
  setInterval(function () { try { apply(); } catch (e) { console.warn('recurtabs', e); } }, 500);
})();
