// ui-otherincome.js — Other Income (non-salary, e.g. Lazada 50 Tawi) → feeds Tax Calculator (PND 90/91)
// Data: D.other_income = [{id,date,payer,payer_tax_id,income_code,desc,cert_no,amount,wht,exp_mode,exp_pct,exp_amt,source,file}]
//   exp_mode: 'none' | 'pct' (lump % of amount) | 'actual' (exp_amt)
// Import source: window.WHT_INCOME from data/wht_income.js (written by scripts/parse_wht.py)

var OI_CODES=['40(1)','40(2)','40(3)','40(4)','40(5)','40(6)','40(7)','40(8)'];

function _oiArr(){if(!D.other_income)D.other_income=[];return D.other_income}
function _oiExp(r){if(r.exp_mode==='pct')return Math.round((r.amount||0)*(r.exp_pct||0))/100;if(r.exp_mode==='actual')return Math.min(r.exp_amt||0,r.amount||0);return 0}
function _oiInYear(r){var ty=D.tax_year||new Date().getFullYear();return String(r.date||'').slice(0,4)===String(ty)}

// used by simulation.js getAnnualTaxableIncome()/getAnnualTaxWithheld()
function oiYearTotals(){var t={amount:0,wht:0,expense:0,rows:[]};
// 40(1) salary certs = reference only (payroll already counts salary + withheld) → never added to tax, avoids double count
_oiArr().forEach(function(r){if(!_oiInYear(r)||r.excluded||r.income_code==='40(1)')return;
t.amount+=r.amount||0;t.wht+=r.wht||0;t.expense+=_oiExp(r);t.rows.push(r)});
t.amount=Math.round(t.amount*100)/100;t.wht=Math.round(t.wht*100)/100;t.expense=Math.round(t.expense*100)/100;return t}

function _oiPwFor(r){var W=_oiPw();return W[r.payer_tax_id]||((W._pool&&W._pool.length===1)?W._pool[0]:'')}
function oiCopyPw(id){var W=_oiPw(),pw=W[id]||((W._pool&&W._pool.length===1)?W._pool[0]:'');
if(!pw){toast('No PDF password set for this payer');return}
(navigator.clipboard?navigator.clipboard.writeText(pw):Promise.reject()).then(function(){toast('\ud83d\udd11 PDF password copied')}).catch(function(){prompt('Copy password:',pw)})}
window.oiCopyPw=oiCopyPw;
function oiView(i,ev){var r=_oiArr()[i];if(!r||!r.file){toast('No file');return false}
if(ev&&ev.preventDefault)ev.preventDefault();
// Browser PDF viewer can't be given a password → copy it to clipboard so user just presses Ctrl+V
try{var _W=_oiPw(),_pw=_W[r.payer_tax_id]||((_W._pool&&_W._pool.length===1)?_W._pool[0]:'');
if(!_pw&&_W._pool&&_W._pool.length>1)toast('\ud83d\udd11 Locked PDF? Password pool has '+_W._pool.length+' \u2014 set it on the payer row to auto-copy');
if(_pw&&navigator.clipboard)navigator.clipboard.writeText(_pw).then(function(){toast('\ud83d\udd11 PDF password copied \u2014 press Ctrl+V if asked')}).catch(function(){})}catch(e){}
if(typeof utilViewDoc==='function')return utilViewDoc(r.file,ev);
var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center';
o.onclick=function(e){if(e.target===o)o.remove()};
o.innerHTML='<iframe src="'+esc('file:///'+String(r.file).replace(/\\/g,'/'))+'" style="width:88vw;height:88vh;border:0;background:#fff;border-radius:8px"></iframe>';
document.body.appendChild(o);return false}
function oiToggle(i){var r=_oiArr()[i];if(!r)return;r.excluded=!r.excluded;saveD();renderOtherIncome();try{simulate()}catch(e){}}
// Refresh: re-load data/wht_income.js (no page reload, no cache) then re-sync + re-render
function oiRefresh(){
var old=document.getElementById('oi-wht-reload');if(old)old.remove();
var s=document.createElement('script');s.id='oi-wht-reload';s.src='data/wht_income.js?t='+Date.now();
s.onload=function(){renderOtherIncome();try{simulate()}catch(e){}toast('Refreshed \u2014 '+(window.WHT_INCOME||[]).length+' cert(s) in file')};
s.onerror=function(){toast('data/wht_income.js not found \u2014 run run_wht.bat first')};
document.body.appendChild(s)}
window.oiRefresh=oiRefresh;
// ---- Payer mapping (Tax ID -> display name / folder / default income type) ----
function _oiPayers(){if(!D.wht_payers)D.wht_payers={};return D.wht_payers}
// PDF passwords kept OUT of D (D syncs to Google Sheet) — this browser's localStorage only, merged into export
function _oiPw(){try{return JSON.parse(localStorage.getItem('cashman_wht_pw')||'{}')}catch(e){return {}}}
function _oiPwSave(m){try{localStorage.setItem('cashman_wht_pw',JSON.stringify(m))}catch(e){}}
function _oiPayerName(r){var m=_oiPayers()[r.payer_tax_id];return (m&&m.name)||r.payer||''}
function renderOiPayers(){
var card=document.querySelector('#pt-other-income .card');if(!card)return;
var h=document.getElementById('oi-payers');if(!h){h=document.createElement('div');h.id='oi-payers';h.style.marginTop='14px';card.appendChild(h)}
var P=_oiPayers(),seen={},W=_oiPw();
_oiArr().forEach(function(r){if(r.payer_tax_id&&!(r.payer_tax_id in seen))seen[r.payer_tax_id]=r.payer||''});
Object.keys(P).forEach(function(k){if(!(k in seen))seen[k]=''});
var inp='class="inp" style="width:100%;font-size:10px;padding:2px 4px"';
var rows=Object.keys(seen).map(function(id){var m=P[id]||{};
return '<tr><td style="font-family:var(--mono);font-size:10px">'+esc(id)+'</td><td style="font-size:10px;color:var(--text3)">'+esc(seen[id])+'</td>'+
'<td><input '+inp+' data-pid="'+esc(id)+'" data-pf="name" value="'+esc(m.name||'')+'" placeholder="'+esc(seen[id]||'Display name')+'"></td>'+
'<td><input '+inp+' data-pid="'+esc(id)+'" data-pf="folder" value="'+esc(m.folder||'')+'" placeholder="'+esc(seen[id]||'Folder name')+' (default)"></td>'+
'<td><select '+inp+' data-pid="'+esc(id)+'" data-pf="income_code"><option value="">(auto)</option>'+OI_CODES.map(function(c){return '<option'+(m.income_code===c?' selected':'')+'>'+c+'</option>'}).join('')+'</select></td>'+
'<td><input type="password" autocomplete="off" '+inp+' data-pid="'+esc(id)+'" data-pf="pdf_password" value="'+esc(W[id]||'')+'" placeholder="(none)" onfocus="this.type=\'text\'" onblur="this.type=\'password\'">'+(W[id]?' <i class="fa-solid fa-copy" style="cursor:pointer;color:var(--primary);margin-left:4px" title="Copy password" onclick="oiCopyPw(\''+esc(id)+'\')"></i>':'')+'</td>'+
'<td><button class="del-btn" onclick="oiPayerDel(\''+esc(id)+'\')"><i class="fa-solid fa-trash"></i></button></td></tr>'}).join('');
h.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><b style="font-size:12px">\ud83c\udfe2 Payer mapping</b><span style="flex:1"></span>'+
'<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="oiPayerAdd()"><i class="fa-solid fa-plus"></i> Add payer</button>'+
'<button class="btn btn-primary" style="font-size:11px;padding:4px 10px" onclick="oiPayersSave()"><i class="fa-solid fa-floppy-disk"></i> Save &amp; export</button></div>'+
'<p class="text-muted" style="font-size:10px;margin:0 0 6px">Matched by payer Tax ID. <b>Save &amp; export</b> \u2192 <code>wht_payers.json</code> in Downloads; run_wht.bat picks it up next run (folder <code>&lt;YYYY&gt;\\50 Tawi\\&lt;Folder&gt;</code>, PDF password).</p>'+
'<table class="tbl"><thead><tr><th>Tax ID</th><th>Name in document</th><th>Display name</th><th>Folder</th><th>Default type</th><th title="PDF password (if the payer locks its 50 Tawi)">PDF password</th><th></th></tr></thead><tbody>'+
(rows||'<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:10px">No payers yet</td></tr>')+'</tbody></table>'+
'<div style="margin-top:10px;padding:8px 10px;border:1px dashed var(--border2);border-radius:var(--radius-sm)"><b style="font-size:11px">\ud83d\udd11 Password pool</b> <span style="font-size:10px;color:var(--text3)">\u2014 don\u2019t know the payer Tax ID yet? Add the PDF password here. run_wht.bat tries each one, then the payer appears in the table automatically.</span>'+
'<div style="display:flex;gap:6px;margin-top:6px"><input id="oi-pool-in" type="password" autocomplete="off" class="inp" style="flex:1;font-size:10px;padding:3px 6px" placeholder="PDF password" onkeydown="if(event.key===\'Enter\')oiPoolAdd()"><button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="oiPoolAdd()"><i class="fa-solid fa-plus"></i> Add</button></div>'+
'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+((W._pool||[]).map(function(x,i){return '<span class="badge" style="font-family:var(--mono)">'+'\u2022'.repeat(Math.min(8,x.length))+' <i class="fa-solid fa-xmark" style="cursor:pointer;margin-left:4px" title="Remove" onclick="oiPoolDel('+i+')"></i></span>'}).join('')||'<span style="font-size:10px;color:var(--text3)">(empty)</span>')+'</div>'+
'<div style="font-size:9px;color:var(--text3);margin-top:4px">Click <b>Save &amp; export</b> after adding. Stays in this browser + wht_payers.json on this PC only.</div></div>'}
function oiPoolAdd(){var e=document.getElementById('oi-pool-in');var v=e&&e.value;if(!v)return;_oiPayersRead();var W=_oiPw();W._pool=W._pool||[];if(W._pool.indexOf(v)<0)W._pool.push(v);_oiPwSave(W);renderOiPayers();toast('Password added \u2014 click Save & export')}
function oiPoolDel(i){_oiPayersRead();var W=_oiPw();(W._pool||[]).splice(i,1);_oiPwSave(W);renderOiPayers()}
window.oiPoolAdd=oiPoolAdd;window.oiPoolDel=oiPoolDel;
function _oiPayersRead(){var P=_oiPayers(),W=_oiPw();document.querySelectorAll('#oi-payers [data-pid]').forEach(function(e){var id=e.dataset.pid;
if(e.dataset.pf==='pdf_password'){if(id==='_pool')return;if(e.value)W[id]=e.value;else delete W[id];return}P[id]=P[id]||{};P[id][e.dataset.pf]=e.value.trim()});_oiPwSave(W)}
// Add payer popup (UI standard: Cancel left / ✓ Save right · Enter=Save · Esc=Cancel · drag-out doesn't close)
function oiPayerAdd(){_oiPayersRead();
var old=document.getElementById('oi-pa-ov');if(old)old.remove();
var inp='class="inp" style="width:100%;font-size:11px;padding:5px 7px;box-sizing:border-box"';
function f(lbl,h,req){return '<label style="display:block;font-size:10px;color:var(--text3);margin:8px 0 3px">'+lbl+(req?' <span style="color:var(--error)">*</span>':'')+'</label>'+h}
var ov=document.createElement('div');ov.id='oi-pa-ov';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
var _down=null;ov.addEventListener('mousedown',function(e){_down=e.target});
ov.addEventListener('click',function(e){if(e.target===ov&&_down===ov)ov.remove()});
ov.innerHTML='<div style="background:var(--bg2);border-radius:var(--radius);padding:16px 18px;width:400px;max-width:100%;box-shadow:0 10px 30px rgba(0,0,0,.3)">'+
'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><i class="fa-solid fa-building" style="color:var(--primary)"></i><b style="font-size:13px">Add Payer</b></div>'+
f('Payer Tax ID (13 digits)','<input id="oi-pa-id" '+inp+' inputmode="numeric" maxlength="17" placeholder="0105555040244" style="width:100%;font-size:11px;padding:5px 7px;box-sizing:border-box;font-family:var(--mono)">',1)+
'<div id="oi-pa-err" style="font-size:10px;color:var(--error);min-height:12px;margin-top:2px"></div>'+
f('Display name','<input id="oi-pa-name" '+inp+' placeholder="e.g. Lazada">')+
f('Folder','<input id="oi-pa-folder" '+inp+' placeholder="blank = name in document">')+
f('Default type','<select id="oi-pa-code" '+inp+'><option value="">(auto)</option>'+OI_CODES.map(function(c){return '<option>'+c+'</option>'}).join('')+'</select>')+
f('PDF password','<input id="oi-pa-pw" type="password" autocomplete="off" '+inp+' placeholder="(none)">')+
'<div style="font-size:9px;color:var(--text3);margin-top:4px">Password stays in this browser + wht_payers.json on this PC only.</div>'+
'<div style="display:flex;justify-content:space-between;gap:6px;margin-top:14px">'+
'<button class="btn btn-ghost" style="font-size:11px" onclick="document.getElementById(\'oi-pa-ov\').remove()">Cancel</button>'+
'<button class="btn btn-primary" style="font-size:11px" onclick="oiPayerAddSave()"><i class="fa-solid fa-check"></i> Save</button></div></div>';
document.body.appendChild(ov);
ov.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();oiPayerAddSave()}else if(e.key==='Escape'){e.preventDefault();ov.remove()}});
var _i=document.getElementById('oi-pa-id');_i.addEventListener('input',function(){document.getElementById('oi-pa-err').textContent=''});
setTimeout(function(){_i.focus()},30)}
function oiPayerAddSave(){
function v(id){var e=document.getElementById(id);return e?e.value.trim():''}
var id=v('oi-pa-id').replace(/\D/g,''),err=document.getElementById('oi-pa-err');
if(id.length!==13){err.textContent='Tax ID must be 13 digits';document.getElementById('oi-pa-id').focus();return}
var P=_oiPayers();if(P[id]&&!confirm('Payer '+id+' already exists. Update it?'))return;
P[id]=P[id]||{};
if(v('oi-pa-name'))P[id].name=v('oi-pa-name');if(v('oi-pa-folder'))P[id].folder=v('oi-pa-folder');if(v('oi-pa-code'))P[id].income_code=v('oi-pa-code');
var pw=document.getElementById('oi-pa-pw').value;if(pw){var W=_oiPw();W[id]=pw;_oiPwSave(W)}
saveD();document.getElementById('oi-pa-ov').remove();renderOiPayers();
// highlight + scroll to the new row
var row=document.querySelector('#oi-payers [data-pid="'+id+'"]');row=row&&row.closest('tr');
if(row){row.style.boxShadow='inset 3px 0 0 var(--primary)';row.style.background='rgba(59,130,246,.08)';row.scrollIntoView({behavior:'smooth',block:'center'});
setTimeout(function(){row.style.background='';row.style.boxShadow=''},2500)}
toast('Payer added \u2014 click Save & export to apply to run_wht.bat')}
window.oiPayerAddSave=oiPayerAddSave;
function oiPayerDel(id){if(!confirm('Remove mapping for '+id+'?'))return;_oiPayersRead();delete _oiPayers()[id];saveD();renderOiPayers()}
// Save & export: write wht_payers.json straight into CashMan\scripts (folder handle remembered in IndexedDB)
function _oiIdb(mode,fn){return new Promise(function(res,rej){var q=indexedDB.open('cashman_fs',1);
q.onupgradeneeded=function(){q.result.createObjectStore('h')};
q.onsuccess=function(){var tx=q.result.transaction('h',mode),st=tx.objectStore('h'),r=fn(st);tx.oncomplete=function(){res(r&&r.result)};tx.onerror=function(){rej(tx.error)}};q.onerror=function(){rej(q.error)}})}
function _oiDownload(txt){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download='wht_payers.json';document.body.appendChild(a);a.click();a.remove()}
async function oiPayersSave(pick){_oiPayersRead();saveD();renderOtherIncome();
var _ex=JSON.parse(JSON.stringify(_oiPayers())),_W=_oiPw();
Object.keys(_W).forEach(function(id){if(id==='_pool')return;_ex[id]=_ex[id]||{};_ex[id].pdf_password=_W[id]});
if(_W._pool&&_W._pool.length)_ex._passwords=_W._pool.slice();
var txt=JSON.stringify(_ex,null,1);
// Folder handle is not remembered on file:// pages -> always download; run_wht.bat picks newest wht_payers*.json from Downloads
_oiDownload(txt);toast('Saved \u2014 wht_payers.json in Downloads (run_wht.bat picks it up next run)');return;
try{var dir=pick?null:await _oiIdb('readonly',function(s){return s.get('wht_scripts')});
if(dir&&(await dir.queryPermission({mode:'readwrite'}))!=='granted'&&(await dir.requestPermission({mode:'readwrite'}))!=='granted')dir=null;
if(!dir){alert('Select folder:\nG:\\My Drive\\Develop\\CashMan\\scripts\n\n(asked once \u2014 remembered for next time)');
dir=await window.showDirectoryPicker({id:'cashman-scripts',mode:'readwrite',startIn:'documents'});
if(!/^scripts$/i.test(dir.name)&&!confirm('Selected folder is "'+dir.name+'", not "scripts".\nUse it anyway?'))return;
await _oiIdb('readwrite',function(s){return s.put(dir,'wht_scripts')})}
var fh=await dir.getFileHandle('wht_payers.json',{create:true}),w=await fh.createWritable();await w.write(txt);await w.close();
_oiSaveInfo(dir.name)}
catch(e){if(e&&e.name==='AbortError')return;console.warn(e);_oiDownload(txt);toast('Could not write to folder \u2014 downloaded to Downloads instead')}}
function _oiSaveInfo(dn){var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
o.onclick=function(e){if(e.target===o)o.remove()};
o.innerHTML='<div style="background:var(--bg2);border-radius:var(--radius);padding:14px 18px;max-width:420px;font-size:11px">'+
'<b style="font-size:13px">\u2705 Saved wht_payers.json</b><div style="margin:8px 0;color:var(--text2)">Folder: <code>'+esc(dn)+'</code> (expected <code>CashMan\\scripts</code>)<br>Time: '+new Date().toLocaleString()+'<br>Next run of <code>run_wht.bat</code> uses this mapping.</div>'+
'<div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn btn-ghost" style="font-size:11px" onclick="this.closest(\'div[style*=fixed]\').remove();oiPayersSave(true)">Change folder</button>'+
'<button class="btn btn-primary" style="font-size:11px" onclick="this.closest(\'div[style*=fixed]\').remove()">OK</button></div></div>';
document.body.appendChild(o)}
// auto-sync from data/wht_income.js: add new certs, refresh file path; never overwrite user edits
function _oiAutoSync(){var src=window.WHT_INCOME||[];if(!src.length)return 0;
var A=_oiArr(),have={},n=0;A.forEach(function(r){if(r.cert_no)have[r.cert_no+'|'+r.date]=r});
src.forEach(function(w){var ex=have[w.uid||(w.cert_no+'|'+w.date)];
if(w.payer_tax_id&&!_oiPayers()[w.payer_tax_id]){_oiPayers()[w.payer_tax_id]={};n++}
if(ex){if(ex.file!==w.file){ex.file=w.file;n++}if((ex.dup_count||0)!==(w.dup_count||0)){ex.dup_count=w.dup_count||0;n++}if(w.superseded&&!ex.superseded){ex.superseded=true;ex.excluded=true;n++}return}
var _pm=_oiPayers()[w.payer_tax_id]||{};A.push({id:'oi'+Date.now().toString(36)+n,date:w.date,payer:w.payer,payer_tax_id:w.payer_tax_id,desc:w.desc,cert_no:w.cert_no,amount:w.amount,wht:w.wht,source:'wht',file:w.file,pnd:w.pnd,income_code:_pm.income_code||w.income_code||'40(8)',exp_mode:'none',dup_count:w.dup_count||0,superseded:!!w.superseded,excluded:!!w.superseded});n++});
if(n)saveD();return n}

// header-click sort (Date paid / Payer / Type / Cert / Amount / Expense / WHT)
var _oiS=window._oiS=window._oiS||{col:0,asc:false};
function _oiSortFn(a,b){var c=_oiS.col,d=_oiS.asc?1:-1;
var k=[function(r){return r.date||''},function(r){return _oiPayerName(r).toLowerCase()},function(r){return r.income_code||''},function(r){return r.cert_no||''},function(r){return r.amount||0},function(r){return _oiExp(r)},function(r){return r.wht||0}][c]||function(r){return r.date||''};
var x=k(a),y=k(b);var v=(typeof x==='number')?x-y:String(x).localeCompare(String(y));return (v||String(a.date).localeCompare(String(b.date)))*d}
function _oiSortHdr(){var tb=document.getElementById('oi-body');if(!tb)return;var ths=tb.closest('table').querySelectorAll('thead th');
ths.forEach(function(th,i){if(i>6)return;if(!th.dataset.lbl)th.dataset.lbl=th.textContent;th.style.cursor='pointer';th.style.userSelect='none';
th.innerHTML=th.dataset.lbl+(_oiS.col===i?(_oiS.asc?' \u25b2':' \u25bc'):' <span style="opacity:.3">\u21c5</span>');
th.onclick=function(){if(_oiS.col===i)_oiS.asc=!_oiS.asc;else{_oiS.col=i;_oiS.asc=(i===1||i===2||i===3)}renderOtherIncome()}})}
function renderOtherIncome(){
try{var _ib=document.querySelector('#pt-other-income button[onclick="oiImportWHT()"]');
if(_ib&&!document.getElementById('oi-refresh-btn')){var _rb=document.createElement('button');_rb.id='oi-refresh-btn';_rb.className=_ib.className;_rb.style.cssText=_ib.style.cssText;_rb.title='Reload latest 50 Tawi data';_rb.innerHTML='<i class="fa-solid fa-rotate"></i> Refresh';_rb.onclick=oiRefresh;_ib.parentNode.insertBefore(_rb,_ib)}
var _h2=document.querySelector('#pt-other-income h2');if(_h2&&/non-salary/.test(_h2.textContent))_h2.innerHTML='<i class="fa-solid fa-hand-holding-dollar"></i> 50 Tawi';
var _p=document.querySelector('#pt-other-income .card > p.text-muted');if(_p)_p.textContent='50 Tawi certificates (salary 40(1) and other income) + manual income. Included in Tax Calculator for the selected tax year (PND 90/91).';
var _pm=document.querySelector('#oi-payers p.text-muted');if(_pm)_pm.innerHTML='Matched by payer Tax ID. <b>Save &amp; export</b> \u2192 <code>wht_payers.json</code> in Downloads; run_wht.bat picks it up next run (folder <code>&lt;YYYY&gt;\\50 Tawi\\&lt;Folder&gt;</code>, PDF password).';
}catch(e){}
try{if(_oiAutoSync())try{simulate()}catch(e){}}catch(e){}
var body=document.getElementById('oi-body');if(!body)return;
// ---- Filter bar: Year (default = tax year) + Payer (by Tax ID) ----
var F=window._oiF=window._oiF||{year:'tax',payer:''};
var _all=_oiArr(),_yOf=function(r){return String(r.date||'').slice(0,4)};
var _fy=F.year==='tax'?String(D.tax_year||new Date().getFullYear()):F.year;
// cascade: years shown = years of selected payer; payers shown = payers in selected year (linked by Tax ID)
var _ys={},_ps={};
_all.forEach(function(r){var y=_yOf(r);if(y&&(!F.payer||r.payer_tax_id===F.payer))_ys[y]=1});
_all.forEach(function(r){if(r.payer_tax_id&&(!_fy||_yOf(r)===_fy))_ps[r.payer_tax_id]=_oiPayerName(r)});
if(F.payer&&!(F.payer in _ps)){F.payer='';_all.forEach(function(r){var y=_yOf(r);if(y)_ys[y]=1})}
var _pIds=Object.keys(_ps).sort(function(a,b){return String(_ps[a]||a).localeCompare(String(_ps[b]||b))});
var fb=document.getElementById('oi-filter');
if(!fb){fb=document.createElement('div');fb.id='oi-filter';fb.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 8px;font-size:10px';var tb=body.closest('table');tb.parentNode.insertBefore(fb,tb)}
var ss='class="sel" style="font-size:10px;padding:2px 6px"';
fb.innerHTML='<span style="color:var(--text3)">Year:</span><select '+ss+' onchange="_oiF.year=this.value;renderOtherIncome()">'+
'<option value="tax"'+(F.year==='tax'?' selected':'')+'>Tax year ('+(D.tax_year||new Date().getFullYear())+')</option><option value=""'+(F.year===''?' selected':'')+'>All years</option>'+
Object.keys(_ys).sort().reverse().map(function(y){return '<option'+(F.year===y?' selected':'')+'>'+y+'</option>'}).join('')+'</select>'+
'<span style="color:var(--text3)">Payer:</span><select '+ss+' onchange="_oiF.payer=this.value;renderOtherIncome()"><option value="">All payers</option>'+
_pIds.map(function(id){return '<option value="'+esc(id)+'"'+(F.payer===id?' selected':'')+'>'+esc(_ps[id]||id)+'</option>'}).join('')+'</select>';
var L=_all.map(function(r,i){r._i=i;return r}).filter(function(r){return (!_fy||String(r.date||'').slice(0,4)===_fy)&&(!F.payer||r.payer_tax_id===F.payer)})
.sort(_oiSortFn);
var _sumA=0,_sumW=0;L.forEach(function(r){if(!r.excluded){_sumA+=r.amount||0;_sumW+=r.wht||0}});
fb.innerHTML+='<span style="flex:1"></span><span style="color:var(--text3)">'+L.length+' item(s) \u00b7 shown total \u0e3f'+fmt(_sumA)+' \u00b7 WHT \u0e3f'+fmt(_sumW)+'</span>';
var B='\u0e3f',M='font-family:var(--mono);font-size:10px';
body.innerHTML=L.length?L.map(function(r){var inY=_oiInYear(r);
return '<tr'+(r.excluded?' style="opacity:.45;text-decoration:line-through" title="Excluded from tax"':'')+'><td><input type="checkbox" '+(r.excluded?'':'checked')+' title="Include in tax" onchange="oiToggle('+r._i+')" style="margin:0 6px 0 0">'+fmtDate(r.date)+'</td><td>'+esc(_oiPayerName(r))+'</td>'+
'<td><span class="badge">'+esc(r.income_code||'')+'</span> <span style="font-size:9px;color:var(--text3)">'+esc(r.desc||'')+'</span></td>'+
'<td style="font-size:10px">'+(r.file?'<a href="#" onclick="return oiView('+r._i+',event)" title="'+esc(r.file)+'"><i class="fa-solid fa-file-pdf" style="color:var(--error)"></i> '+esc(r.cert_no||'view')+'</a>':esc(r.cert_no||''))+(r.file&&_oiPwFor(r)?' <i class="fa-solid fa-key" style="cursor:pointer;color:var(--warning);margin-left:4px" title="Copy PDF password" onclick="event.stopPropagation();oiCopyPw(\''+esc(r.payer_tax_id||'')+'\')"></i>':'')+(r.dup_count>1?' <span class="badge" style="background:var(--warning-bg);color:var(--warning)" title="Same cert no. in '+r.dup_count+' files \u2014 '+(r.superseded?'older copy (auto-excluded)':'latest copy (used)')+'">\u26a0\ufe0f dup '+(r.superseded?'old':'latest')+'</span>':'')+'</td>'+
'<td class="r" style="'+M+';color:var(--success)">'+B+fmt(r.amount||0)+'</td>'+
'<td class="r" style="'+M+'">'+(_oiExp(r)?'\u2212'+B+fmt(_oiExp(r)):'\u2013')+'</td>'+
'<td class="r" style="'+M+'">'+B+fmt(r.wht||0)+'</td>'+
'<td style="white-space:nowrap"><button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:4px" onclick="oiEdit('+r._i+')"><i class="fa-solid fa-pen"></i></button>'+
'<button class="del-btn" onclick="oiDel('+r._i+')"><i class="fa-solid fa-trash"></i></button></td></tr>'}).join('')
:'<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:14px">No other income yet \u2014 click <b>Import 50 Tawi</b> or <b>Add</b>.</td></tr>';
try{_oiSortHdr()}catch(e){}
try{renderOiPayers()}catch(e){console.warn('oi payers',e)}
var t=oiYearTotals(),ty=D.tax_year||new Date().getFullYear();
var k=document.getElementById('oi-kpis');if(k)k.innerHTML=
'<div class="kpi"><div class="kpi-label">Income '+ty+'</div><div class="kpi-val text-success">'+B+fmt(t.amount)+'</div><div class="kpi-note">'+t.rows.length+' item(s)</div></div>'+
'<div class="kpi"><div class="kpi-label">Expense deduction</div><div class="kpi-val">\u2212'+B+fmt(t.expense)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Tax withheld</div><div class="kpi-val">'+B+fmt(t.wht)+'</div><div class="kpi-note">Credit in PND 90/91</div></div>'}

function oiImportWHT(){
var src=window.WHT_INCOME||[];
if(!src.length){alert('No data in data/wht_income.js \u2014 run scripts/parse_wht.py first.');return}
var A=_oiArr(),have={},add=0,upd=0;A.forEach(function(r){if(r.cert_no)have[r.cert_no]=r});
src.forEach(function(w){var ex=have[w.cert_no];
var base={date:w.date,payer:w.payer,payer_tax_id:w.payer_tax_id,desc:w.desc,cert_no:w.cert_no,amount:w.amount,wht:w.wht,source:'wht',file:w.file,pnd:w.pnd};
if(ex){Object.keys(base).forEach(function(k){ex[k]=base[k]});upd++}   // keep user's income_code/expense choice
else{base.id='oi'+Date.now().toString(36)+add;base.income_code=w.income_code||'40(8)';base.exp_mode='none';A.push(base);add++}});
saveD();renderOtherIncome();try{simulate()}catch(e){}
toast('Imported '+add+' new, updated '+upd)}

function oiDel(i){if(!confirm('Delete this item?'))return;_oiArr().splice(i,1);saveD();renderOtherIncome()}

function oiEdit(i){
var r=i>=0?_oiArr()[i]:{date:new Date().toISOString().slice(0,10),payer:'',income_code:'40(8)',desc:'',cert_no:'',amount:0,wht:0,exp_mode:'none',exp_pct:60,exp_amt:0};
var inp='class="inp" style="width:100%;font-size:11px;padding:4px 6px"';
function f(lbl,h){return '<label style="display:block;font-size:10px;color:var(--text3);margin:6px 0 2px">'+lbl+'</label>'+h}
var codeSel='<select id="oi-f-code" '+inp+'>'+OI_CODES.map(function(c){return '<option'+(r.income_code===c?' selected':'')+'>'+c+'</option>'}).join('')+'</select>';
var expSel='<select id="oi-f-expm" '+inp+' onchange="document.getElementById(\'oi-f-exppct-w\').style.display=this.value===\'pct\'?\'\':\'none\';document.getElementById(\'oi-f-expamt-w\').style.display=this.value===\'actual\'?\'\':\'none\'">'+
[['none','None'],['pct','Lump-sum %'],['actual','Actual expense']].map(function(o){return '<option value="'+o[0]+'"'+(r.exp_mode===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>';
var ov=document.createElement('div');ov.id='oi-ov';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
ov.onclick=function(e){if(e.target===ov)ov.remove()};
ov.innerHTML='<div style="background:var(--bg2);border-radius:var(--radius);padding:14px 16px;width:380px;max-height:85vh;overflow:auto">'+
'<b style="font-size:13px">'+(i>=0?'Edit':'Add')+' other income</b>'+
f('Date paid','<input type="date" id="oi-f-date" '+inp+' value="'+(r.date||'')+'">')+
f('Payer','<input id="oi-f-payer" '+inp+' value="'+esc(r.payer||'')+'">')+
f('Income type (Section)',codeSel)+
f('Description','<input id="oi-f-desc" '+inp+' value="'+esc(r.desc||'')+'">')+
f('Cert no.','<input id="oi-f-cert" '+inp+' value="'+esc(r.cert_no||'')+'">')+
f('Amount paid (\u0e3f)','<input type="number" step="0.01" id="oi-f-amt" '+inp+' value="'+(r.amount||0)+'">')+
f('Tax withheld (\u0e3f)','<input type="number" step="0.01" id="oi-f-wht" '+inp+' value="'+(r.wht||0)+'">')+
f('Expense deduction',expSel)+
'<div id="oi-f-exppct-w" style="'+(r.exp_mode==='pct'?'':'display:none')+'">'+f('Lump-sum %','<input type="number" id="oi-f-exppct" '+inp+' value="'+(r.exp_pct!=null?r.exp_pct:60)+'">')+'</div>'+
'<div id="oi-f-expamt-w" style="'+(r.exp_mode==='actual'?'':'display:none')+'">'+f('Actual expense (\u0e3f)','<input type="number" step="0.01" id="oi-f-expamt" '+inp+' value="'+(r.exp_amt||0)+'">')+'</div>'+
'<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:12px"><button class="btn btn-ghost" style="font-size:11px" onclick="document.getElementById(\'oi-ov\').remove()">Cancel</button>'+
'<button class="btn btn-primary" style="font-size:11px" onclick="oiSave('+i+')">Save</button></div></div>';
document.body.appendChild(ov)}

function oiSave(i){
function v(id){var e=document.getElementById(id);return e?e.value:''}
var A=_oiArr(),r=i>=0?A[i]:{id:'oi'+Date.now().toString(36),source:'manual'};
r.date=v('oi-f-date');r.payer=v('oi-f-payer').trim();r.income_code=v('oi-f-code');r.desc=v('oi-f-desc').trim();r.cert_no=v('oi-f-cert').trim();
r.amount=parseFloat(v('oi-f-amt'))||0;r.wht=parseFloat(v('oi-f-wht'))||0;
r.exp_mode=v('oi-f-expm')||'none';r.exp_pct=parseFloat(v('oi-f-exppct'))||0;r.exp_amt=parseFloat(v('oi-f-expamt'))||0;
if(i<0)A.push(r);
saveD();document.getElementById('oi-ov').remove();renderOtherIncome();try{simulate()}catch(e){}}

// Inject sidebar sub-item + top sub-tab (Payroll & Tax → Other Income)
(function(){function inj(){
try{var ex=document.querySelector('.nav-sub[data-sub="tax-exempt"]');
if(ex&&!document.querySelector('.nav-sub[data-sub="other-income"]')){var b=ex.cloneNode(true);b.dataset.sub='other-income';b.classList.remove('active');b.querySelector('span').textContent='50 Tawi';ex.parentNode.insertBefore(b,ex.nextSibling)}
var tt=document.querySelector('#tab-paytax .sub-tab[onclick*="tax-exempt"]');
if(tt&&!document.querySelector('#tab-paytax .sub-tab[onclick*="other-income"]')){var s=document.createElement('span');s.className='sub-tab';s.setAttribute('onclick',"swPayTax(this,'other-income')");s.textContent='50 Tawi';tt.parentNode.insertBefore(s,tt.nextSibling)}}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inj);else inj()})();

window.oiPayerAdd=oiPayerAdd;window.oiPayerDel=oiPayerDel;window.oiPayersSave=oiPayersSave;window.oiView=oiView;window.oiToggle=oiToggle;window.renderOtherIncome=renderOtherIncome;window.oiImportWHT=oiImportWHT;window.oiEdit=oiEdit;window.oiSave=oiSave;window.oiDel=oiDel;window.oiYearTotals=oiYearTotals;
