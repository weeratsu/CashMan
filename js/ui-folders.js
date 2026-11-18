// ui-folders.js v1 (Nov 18 2026) — Setup › File Locations: one place to pick & remember folders the app writes to.
// Handles are stored in IndexedDB (cm_folders) so they survive refresh. Browser still asks "Allow" once per session (file:// rule).
// API: await cmFolder(id) → FileSystemDirectoryHandle with readwrite permission (asks/picks only if needed).
(function () {
  var LOCS = [ // add new locations here — id is the link key, never the name
    { id: 'car_docs', name: 'Car Documents', icon: 'fa-car', hint: 'G:\\My Drive\\Documents\\Car Documents', use: 'Vehicles › เอกสารรถ (Browse จะ copy ไฟล์เข้าโฟลเดอร์นี้)' }
  ];
  window.CM_FOLDER_LOCS = LOCS;
  function db() { return new Promise(function (res, rej) { var r = indexedDB.open('cm_folders', 1); r.onupgradeneeded = function () { r.result.createObjectStore('h'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function get(id) { return db().then(function (d) { return new Promise(function (res) { var q = d.transaction('h').objectStore('h').get(id); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }); }
  function put(id, h) { return db().then(function (d) { return new Promise(function (res) { var t = d.transaction('h', 'readwrite'); h ? t.objectStore('h').put(h, id) : t.objectStore('h').delete(id); t.oncomplete = res; t.onerror = res; }); }); }
  async function perm(h, ask) { try { var m = { mode: 'readwrite' }; if ((await h.queryPermission(m)) === 'granted') return true; return ask ? (await h.requestPermission(m)) === 'granted' : false; } catch (e) { return false; } }
  async function pick(id) {
    var L = LOCS.find(function (x) { return x.id === id; }) || { name: id };
    if (!window.showDirectoryPicker) throw new Error('browser นี้ไม่รองรับการเลือกโฟลเดอร์ (ใช้ Chrome/Edge)');
    var h = await window.showDirectoryPicker({ id: 'cm-' + id, mode: 'readwrite' });
    if (L.name && h.name !== L.name && !(await window.cmAsk('โฟลเดอร์ที่เลือกชื่อ "' + h.name + '" ไม่ใช่ "' + L.name + '"\nใช้โฟลเดอร์นี้?', { title: 'โฟลเดอร์ไม่ตรง', icon: 'fa-triangle-exclamation', ok: '✓ ใช้โฟลเดอร์นี้' }))) throw new Error('cancelled');
    await put(id, h); render(); return h;
  }
  window.cmFolder = async function (id) {
    var h = await get(id);
    if (h && await perm(h, true)) { render(); return h; }
    if (h) throw new Error('ไม่ได้รับอนุญาตให้แก้ไฟล์ในโฟลเดอร์ ' + h.name);
    var L = LOCS.find(function (x) { return x.id === id; }) || { name: id, hint: '' };
    if (!(await window.cmAsk('ยังไม่ได้ตั้งโฟลเดอร์ "' + L.name + '"\n\n📁 ' + (L.hint || '') + '\n\nเลือกครั้งเดียว แอปจะจำไว้ (ตั้ง/เปลี่ยนได้ที่ Setup › File Locations)', { title: 'ตั้งโฟลเดอร์ ' + L.name, icon: 'fa-folder-open', ok: '<i class="fa-solid fa-folder-open"></i> เลือกโฟลเดอร์' }))) throw new Error('cancelled');
    return pick(id);
  };
  window.cmFolderPick = function (id) { pick(id).catch(function (e) { if (e && e.name !== 'AbortError' && e.message !== 'cancelled') alert(e.message || e); }); };
  window.cmFolderAllow = function (id) { get(id).then(function (h) { if (h) perm(h, true).then(render); }); };
  window.cmFolderClear = function (id) { cmConfirm('ลบโฟลเดอร์ที่จำไว้ของ ' + id + '?\n(ไฟล์ในเครื่องไม่ถูกลบ)', function () { put(id, null).then(render); }, { title: 'Remove folder', danger: true }); };
  async function render() {
    var host = document.getElementById('setup-folders'); if (!host) return;
    var rows = '';
    for (var i = 0; i < LOCS.length; i++) {
      var L = LOCS[i], h = await get(L.id), ok = h ? await perm(h, false) : false;
      var st = !h ? '<span style="color:var(--warning,#d97706)">⚠️ ยังไม่ได้ตั้ง</span>' : ok ? '<span style="color:var(--success,#10b981)">✓ พร้อมใช้</span>' : '<span style="color:var(--text3)">🔒 ต้องกด Allow (ครั้งแรกหลังเปิดแอป)</span>';
      rows += '<tr><td style="padding:6px 8px;white-space:nowrap"><i class="fa-solid ' + L.icon + '"></i> <b>' + L.name + '</b><div style="font-size:9px;color:var(--text3)">' + L.use + '</div></td>' +
        '<td style="padding:6px 8px;font-size:11px">' + (h ? '📁 <b>' + h.name + '</b>' : '—') + '<div style="font-size:9px;color:var(--text3)">แนะนำ: ' + L.hint + '</div></td>' +
        '<td style="padding:6px 8px;font-size:10px">' + st + '</td>' +
        '<td style="padding:6px 8px;text-align:right;white-space:nowrap">' +
        (h && !ok ? '<button class="btn btn-ghost" style="font-size:10px;padding:3px 9px" onclick="cmFolderAllow(\'' + L.id + '\')"><i class="fa-solid fa-unlock"></i> Allow</button> ' : '') +
        '<button class="btn btn-primary" style="font-size:10px;padding:3px 9px" onclick="cmFolderPick(\'' + L.id + '\')"><i class="fa-solid fa-folder-open"></i> ' + (h ? 'เปลี่ยน' : 'เลือกโฟลเดอร์') + '</button>' +
        (h ? ' <button class="btn btn-ghost" style="font-size:10px;padding:3px 7px" onclick="cmFolderClear(\'' + L.id + '\')" title="Remove"><i class="fa-solid fa-trash"></i></button>' : '') + '</td></tr>';
    }
    host.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr style="font-size:10px;color:var(--text3);text-align:left"><th style="padding:4px 8px">ที่เก็บ</th><th style="padding:4px 8px">โฟลเดอร์</th><th style="padding:4px 8px">สถานะ</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function mount() {
    if (document.getElementById('setup-folders')) return;
    var anchor = [].slice.call(document.querySelectorAll('#tab-setup .card h2')).find(function (h) { return /Calendar Style/.test(h.textContent); });
    if (!anchor) return;
    var c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<h2><i class="fa-solid fa-folder-tree"></i> File Locations</h2><p class="text-muted" style="font-size:10px;margin-bottom:8px">โฟลเดอร์ที่แอปบันทึกไฟล์ให้ เลือกครั้งเดียวแล้วแอปจำไว้ Browser จะถาม Allow ครั้งแรกหลังเปิดแอปเท่านั้น</p><div id="setup-folders"></div>';
    anchor.closest('.card').parentNode.insertBefore(c, anchor.closest('.card'));
    render();
  }
  setInterval(function () { try { mount(); } catch (e) { console.warn('folders', e); } }, 800);
})();
