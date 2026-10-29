// ui-billreminder.js — Bills Payment Reminder module
// Enumerates bill occurrences from Monthly/Yearly/Installments/Planned,
// tracks paid status in D.bill_payments, flags auto-pay vs manual,
// and surfaces due/upcoming bills on the Dashboard.

var _billFilter='unpaid'; // all | due | today | upcoming | overdue | paid | manual | unpaid  (default: show everything still to pay)
// Bills table sort. 'urgency' (default) orders overdue -> due today -> due soon -> upcoming -> future -> paid,
// then by due date within each band. Header clicks switch to column sorts (name/type/amount/due/deadline/status).
var _brSort='urgency';var _brAsc=true;
// Urgency rank for a bill's DISPLAY status (lower = more urgent). Uses _billDisp so 'due today' ranks above 'due soon'.
function _brUrgencyRank(o,today){var d=_billDisp(o,today);return d==='overdue'?0:d==='due_today'?1:d==='due'?2:d==='upcoming'?3:d==='future'?4:5;/*paid/auto_paid last*/}
// Display status: same as billStatus, but splits diff===0 out of 'due' into a derived 'due_today'
// WITHOUT changing the internal billStatus value (paid-ledger/filters still rely on 'due').
function _billDisp(o,today){var st=billStatus(o,today);if(st==='due'){var diff=Math.round(((o.orig_due||o.due)-today)/86400000);if(diff===0)return'due_today';}return st;}
// When true, credit-card charges are collapsed into one "statement" line per card per month
// (effective amount = manual override if set, else the auto sum). Default: show individual charges.
var _billCardMode=false;
// Date-range filter (independent of status filter). '' = any.
var _billYear='';   // e.g. 2026
var _billMonth='';  // 1-12
var _billDay='';    // 1-31
// Payment History: sort + month-picker filter
var _histSort='paid_date'; // 'paid_date' | 'name' | 'amount' | 'due'
var _histAsc=false;        // false = descending (newest/largest first)
var _histFYear='';         // filter year (e.g. 2026) — '' = all
var _histFMonth='';        // filter month 1-12 — '' = all
var _histFilterBy='due';  // which date the year/month filter targets: 'due' | 'paid'
var _histSectionOpen=false; // whether the Payment History section is expanded (persists across re-renders)
var _histFType='';   // filter by kind (Monthly/Yearly/Installment/Planned/Card Statement) — '' = all
var _histFCat='';    // filter by category (type field, e.g. Insurance/Utilities) — '' = all
var _histFMethod=''; // filter by method: 'auto' | 'manual' — '' = all
var _histFCard='';  // filter by payment method / card name (or 'Cash/Direct') — '' = all
// v289: when true (default), charges tied to a PDF-managed card statement are folded under that
// statement's expandable row instead of showing as separate top-level rows in Payment History.
var _histFoldCard=true;
function _perBadge(ym){return (ym&&/^\d{4}-\d{2}$/.test(ym))?(' <span style="font-size:8px;color:var(--text3);font-family:var(--mono)">'+ym+'</span>'):'';}
function _cardStmtPer(o){try{if(o&&o.kind==='Card Statement'&&typeof o.key==='string'&&o.key.indexOf('CB|')===0){var seg=(o.key.split('|')[2]||'').split('::')[0];return /^\d{4}-\d{2}$/.test(seg)?seg:'';}}catch(e){}return '';}
// v323 (user Oct 13 2026): show a period badge on EVERY recurring/charge row (not just card
// statements) so you can see which billing period the row belongs to. Card statements use their
// statement period (card_period); utilities use their usage period (service_period); everything
// else uses service_period, falling back to card_period then the due month.
function _cardDisp(x){ if(!x||x==='Cash/Direct')return x||''; try{ if(typeof window.cardDisplayName==='function'){ var n=window.cardDisplayName(x); if(n) return n; } }catch(e){} return x; }
function _rowPer(o){try{
  if(!o) return '';
  var cp=_cardStmtPer(o); if(cp) return cp;
  // utility rows: show the USAGE month. Actual bills carry _utilPeriod; forecasts carry a
  // service_period already computed as the usage month (period_rule). Prefer _utilPeriod, then
  // service_period, so neither an actual nor a forecast utility row shows the landing month.
  if(/^\d{4}-\d{2}$/.test(o._utilPeriod||'')) return o._utilPeriod;
  if(/^\d{4}-\d{2}$/.test(o.service_period||'')) return o.service_period;
  if(/^\d{4}-\d{2}$/.test(o.card_period||'')) return o.card_period;
  if(o.due&&o.due.getMonth){ return o.due.getFullYear()+'-'+((o.due.getMonth()+1)<10?'0':'')+(o.due.getMonth()+1); }
  return '';
}catch(e){return '';}}
function _svcPer(ch){try{
// For a utility bill the service period is the USAGE month (_utilPeriod), NOT the month the bill
// landed/was paid. Electric bills arrive early next month (usage 2026-09 lands 02/10) so the
// landing-date month would mislabel it 2026-10; _utilPeriod carries the correct usage month.
if(ch&&ch._utilPeriod&&/^\d{4}-\d{2}$/.test(ch._utilPeriod))return ch._utilPeriod;
// v324 (user Oct 14 2026): for an ADVANCE bill (pay-before-use, e.g. Netflix/iCloud) the SERVICE
// period = the card statement cycle it folds under (card_period) + 1. Mirrors the Card Bills badge
// so Bill Reminder + Payment History agree. billing_mode isn't on the occurrence, so detect advance
// from the bill definition by name. Non-advance rows keep the orig_due-month behavior below.
if(ch&&ch.card_period&&/^\d{4}-\d{2}$/.test(ch.card_period)){var _bd=((D.monthly||[]).concat(D.yearly||[])).filter(function(b){return b&&b.name===ch.name;})[0];if(_bd&&_bd.billing_mode==='advance'){var _p=ch.card_period.split('-'),_y=+_p[0],_m=+_p[1];_m++;if(_m>12){_m=1;_y++;}return _y+'-'+(_m<10?'0':'')+_m;}}
var d=(ch&&(ch.orig_due||ch.due))||'';var s=(typeof d==='string')?d:_billISO(d);return /^\d{4}-\d{2}/.test(s)?s.slice(0,7):'';}catch(e){return '';}}
function toggleHistSection(){_histSectionOpen=!_histSectionOpen;renderBillReminder();}
function setHistSort(field){_histSectionOpen=true;if(_histSort===field){_histAsc=!_histAsc;}else{_histSort=field;_histAsc=(field==='name');}renderBillReminder();}
function setHistFilter(){_histSectionOpen=true;var y=document.getElementById('hist-f-year'),m=document.getElementById('hist-f-month');_histFYear=y?y.value:'';_histFMonth=m?m.value:'';renderBillReminder();}
function clearHistFilter(){_histSectionOpen=true;_histFYear='';_histFMonth='';_histFType='';_histFCat='';_histFMethod='';_histFCard='';renderBillReminder();}
function setHistFilterBy(v){_histSectionOpen=true;_histFilterBy=v;renderBillReminder();}
function setHistFoldCard(on){_histSectionOpen=true;_histFoldCard=!!on;renderBillReminder();}
function setHistTCM(){_histSectionOpen=true;var t=document.getElementById('hist-f-type'),c=document.getElementById('hist-f-cat'),m=document.getElementById('hist-f-method'),cd=document.getElementById('hist-f-card');_histFType=t?t.value:'';_histFCat=c?c.value:'';_histFMethod=m?m.value:'';_histFCard=cd?cd.value:'';renderBillReminder();}
// Bulk selection for Payment History rows (checkbox data-hkey holds the ledger key).
function histSelected(){var out=[];document.querySelectorAll('.hist-chk:checked').forEach(function(cb){out.push(cb.dataset.hkey);});return out;}
function histUpdateSelCount(){var n=document.querySelectorAll('.hist-chk:checked').length;var bar=document.getElementById('hist-bulk');if(bar)bar.style.display=n>0?'flex':'none';var c=document.getElementById('hist-sel-count');if(c)c.textContent=n;}
function histToggleAll(on){document.querySelectorAll('.hist-chk').forEach(function(cb){cb.checked=on;});histUpdateSelCount();}



// v171: Per-record editing of a Payment History entry. Lets the user fix an old paid
// record (e.g. a card that was later renamed) so it re-groups under the right statement.
// The map key in D.bill_payments is NOT changed (keeps the ledger stable) — card/due/amount
// live inside the record and drive the fold/group, so editing them re-groups on re-render.
function histEditRecord(key){
if(!D||!D.bill_payments||!D.bill_payments[key]){alert('Record not found.');return;}
var r=D.bill_payments[key];
// Build a card datalist from known cards + Cash/Direct.
var nm=key.split('::')[0].split('|')[1]||key;
var dueD=(r.due&&/^\d{4}-\d{2}-\d{2}$/.test(r.due))?r.due:'';           // ISO for <input type=date>
var paidD=(r.paid_date&&/^\d{4}-\d{2}-\d{2}$/.test(r.paid_date))?r.paid_date:''; // ISO for <input type=date>
var amt=(r.paid_amount!=null?r.paid_amount:0);
var typ=r.type||'';var card=r.card||'';var ap=!!r.auto_pay;
var isStmt=(typeof key==='string'&&key.indexOf('CB|')===0);
var ov=document.createElement('div');
ov.id='hist-edit-ov';ov.setAttribute('data-editkey',key);
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
var rowsHtml=''+
'<div style="display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Name</label>'+
'<input id="he-name" value="'+esc(nm)+'"'+(isStmt?' disabled title="Statement name follows the card"':'')+' style="font-size:12px;padding:5px 8px"></div>'+
'<div style="display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Card</label>'+
'<select id="he-card" style="font-size:12px;padding:5px 8px">'+cOpts(card)+'</select></div>'+
'<div style="display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Type</label>'+
'<select id="he-type" style="font-size:12px;padding:5px 8px"><option value=""'+(typ?'':' selected')+'></option>'+tOpts(typ)+'</select></div>'+
'<div style="display:flex;gap:8px"><div style="flex:1;display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Amount (\u0e3f)</label>'+
'<input id="he-amt" type="number" step="0.01" value="'+amt+'" style="font-size:12px;padding:5px 8px"></div>'+
'<div style="flex:1;display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Method</label>'+
'<select id="he-auto" style="font-size:12px;padding:5px 8px"><option value="manual"'+(!ap?' selected':'')+'>\u270b Manual</option><option value="auto"'+(ap?' selected':'')+'>\ud83e\udd16 Auto</option></select></div></div>'+
'<div style="display:flex;gap:8px"><div style="flex:1;display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Due date</label>'+
'<input id="he-due" type="date" value="'+dueD+'" style="font-size:12px;padding:5px 8px"></div>'+
'<div style="flex:1;display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">Marked paid</label>'+
'<input id="he-paid" type="date" value="'+paidD+'" style="font-size:12px;padding:5px 8px"></div></div>';
ov.innerHTML='<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.3)">'+
'<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px"><i class="fa-solid fa-pen" style="color:var(--primary)"></i><span style="font-weight:700;font-size:13px">Edit payment record</span><span style="flex:1"></span><button class="del-btn" onclick="histCancelEdit()"><i class="fa-solid fa-xmark"></i></button></div>'+
'<div style="padding:16px;display:flex;flex-direction:column;gap:10px">'+rowsHtml+
(isStmt?'<div style="font-size:10px;color:var(--text3)">This is a card statement. Editing the card here only relabels this history record; the statement is auto-built from your cards.</div>':'<div style="font-size:10px;color:var(--text3)">Tip: change the Card or Due date to make this charge re-group under the right statement.</div>')+
'</div>'+
'<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-ghost" onclick="histCancelEdit()">Cancel</button><button class="btn btn-primary" id="he-save-btn" onclick="histSaveEdit()"><i class="fa-solid fa-check"></i> Save</button></div>'+
'</div>';
document.body.appendChild(ov);
ov.addEventListener('mousedown',function(e){if(e.target===ov)histCancelEdit();});
}
function histCancelEdit(){var ov=document.getElementById('hist-edit-ov');if(ov)ov.remove();}
function histSaveEdit(){
var ov=document.getElementById('hist-edit-ov');var key=ov?ov.getAttribute('data-editkey'):'';
if(!key||!D||!D.bill_payments||!D.bill_payments[key]){histCancelEdit();return;}
var r=D.bill_payments[key];
var gv=function(id){var el=document.getElementById(id);return el?el.value:'';};
var amt=parseFloat(gv('he-amt'));if(isNaN(amt))amt=0;
var card=gv('he-card').trim();
var typ=gv('he-type').trim();
var ap=(gv('he-auto')==='auto');
var dueRaw=gv('he-due').trim();var paidRaw=gv('he-paid').trim();
// Convert dd/mm/yyyy -> YYYY-MM-DD via parseDMY (returns a Date) then _billISO.
function toISO(s,fallback){if(!s)return fallback||'';var iso=parseDMY(s);if(!iso||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return fallback||'';return iso;}
var dueISO=toISO(dueRaw,r.due||'');
var paidISO=toISO(paidRaw,r.paid_date||'');
r.paid_amount=amt;r.card=card;r.type=typ;r.auto_pay=ap;r.due=dueISO;r.paid_date=paidISO;r._userEdited=true;
D.bill_payments[key]=r;
saveD();
histCancelEdit();
renderBillReminder();
if(typeof renderDash==='function'&&typeof SIM!=='undefined'&&SIM)try{renderDashBills()}catch(e){}
}

// v341 (user Oct 17 2026): PER-OCCURRENCE OVERRIDE editor. Edit card/amount/due/paid_date for ONE
// occurrence (this bill, this period) without touching the recurring/installment template. Stored in
// D.occ_overrides keyed '<billKey>::<period>'. The adapter applies it when building that occurrence.
function occEditOverride(billKey, period, fullKey, defCard, defAmt, defDue){
  if(!billKey){ alert('No bill key'); return; }
  if(!/^\d{4}-\d{2}$/.test(period||'')){ alert('No period'); return; }
  var okey=billKey+'::'+period;
  var ov=(D.occ_overrides&&D.occ_overrides[okey])||{};
  // current paid record (if any) for showing paid_date default
  var pr=(fullKey&&D.bill_payments&&D.bill_payments[fullKey])?D.bill_payments[fullKey]:null;
  // Defaults shown in the form = the occurrence's CURRENT effective values (override if set, else the
  // recurring/installment template value passed in from the row). So the popup opens pre-filled.
  var curCard=ov.card||defCard||'';
  var curAmt=(ov.amount!=null?ov.amount:(defAmt!=null&&defAmt!==''?defAmt:''));
  var curDue=ov.due||(/^\d{4}-\d{2}-\d{2}$/.test(defDue||'')?defDue:'');
  var curPaid=ov.paid_date||(pr&&pr.paid_date)||'';
  var ovv=document.createElement('div');
  ovv.id='occ-edit-ov'; ovv.setAttribute('data-okey',okey); ovv.setAttribute('data-fullkey',fullKey||'');
  ovv.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  var rows=''+
   '<div style="display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">\u0e1a\u0e31\u0e15\u0e23\u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22 (\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49)</label>'+
   '<select id="occ-card" style="font-size:12px;padding:5px 8px"><option value="">\u2014 \u0e43\u0e0a\u0e49\u0e04\u0e48\u0e32 default \u2014</option>'+cOpts(curCard)+'</select></div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1;display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">\u0e22\u0e2d\u0e14 (\u0e3f)</label>'+
   '<input id="occ-amt" type="number" step="0.01" value="'+curAmt+'" placeholder="default" style="font-size:12px;padding:5px 8px"></div>'+
   '<div style="flex:1;display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">\u0e27\u0e31\u0e19\u0e15\u0e31\u0e14/\u0e04\u0e23\u0e1a\u0e01\u0e33\u0e2b\u0e19\u0e14</label>'+
   '<input id="occ-due" type="date" value="'+curDue+'" style="font-size:12px;padding:5px 8px"></div></div>'+
   '<div style="display:flex;flex-direction:column;gap:2px"><label style="font-size:10px;color:var(--text2)">\u0e27\u0e31\u0e19\u0e08\u0e48\u0e32\u0e22\u0e08\u0e23\u0e34\u0e07 (\u0e16\u0e49\u0e32\u0e08\u0e48\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27)</label>'+
   '<input id="occ-paid" type="date" value="'+curPaid+'" style="font-size:12px;padding:5px 8px"></div>';
  ovv.innerHTML='<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.3)">'+
   '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px"><i class="fa-solid fa-pen" style="color:var(--primary)"></i><span style="font-weight:700;font-size:13px">\u0e41\u0e01\u0e49\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49 \u00b7 '+esc(period)+'</span><span style="flex:1"></span><button class="del-btn" onclick="occCancelEdit()"><i class="fa-solid fa-xmark"></i></button></div>'+
   '<div style="padding:16px;display:flex;flex-direction:column;gap:10px">'+rows+
   '<div style="font-size:10px;color:var(--text3)">\u0e01\u0e32\u0e23\u0e41\u0e01\u0e49\u0e19\u0e35\u0e49\u0e21\u0e35\u0e1c\u0e25\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e07\u0e27\u0e14 '+esc(period)+' \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 \u2014 \u0e07\u0e27\u0e14\u0e2d\u0e37\u0e48\u0e19\u0e44\u0e21\u0e48\u0e01\u0e23\u0e30\u0e17\u0e1a</div>'+
   '</div>'+
   '<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between"><button class="btn btn-ghost" onclick="occClearOverride()" style="color:var(--error)">\u0e25\u0e49\u0e32\u0e07 override</button><span style="flex:1"></span><button class="btn btn-ghost" onclick="occCancelEdit()">\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</button><button class="btn btn-primary" onclick="occSaveOverride()"><i class="fa-solid fa-check"></i> \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button></div>'+
   '</div>';
  document.body.appendChild(ovv);
  ovv.addEventListener('mousedown',function(e){if(e.target===ovv)occCancelEdit();});
}
function occCancelEdit(){var ov=document.getElementById('occ-edit-ov');if(ov)ov.remove();}
function occClearOverride(){
  var ov=document.getElementById('occ-edit-ov');var okey=ov?ov.getAttribute('data-okey'):'';
  if(okey&&D.occ_overrides&&D.occ_overrides[okey]){ delete D.occ_overrides[okey]; saveD(); }
  occCancelEdit(); _billRerenderAll();
}
function occSaveOverride(){
  var ov=document.getElementById('occ-edit-ov');if(!ov)return;
  var okey=ov.getAttribute('data-okey'), fullKey=ov.getAttribute('data-fullkey')||'';
  var gv=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  var card=gv('occ-card'), amt=gv('occ-amt'), due=gv('occ-due'), paid=gv('occ-paid');
  if(!D.occ_overrides)D.occ_overrides={};
  var o={};
  if(card)o.card=card;
  if(amt!==''&&!isNaN(parseFloat(amt)))o.amount=parseFloat(amt);
  if(/^\d{4}-\d{2}-\d{2}$/.test(due))o.due=due;
  if(/^\d{4}-\d{2}-\d{2}$/.test(paid))o.paid_date=paid;
  if(Object.keys(o).length) D.occ_overrides[okey]=o; else delete D.occ_overrides[okey];
  // v346: a paid_date in the override MARKS the occurrence PAID. The ledger key is '<billKey>::<period>'
  // (okey itself) — the same key the paid ledger uses. If a paid record exists, update its paid_date
  // (and card/amount/due if overridden). If NONE exists yet (e.g. AIS never paid), CREATE one so the
  // Reminder stops showing it as overdue and the fold-by-paid-date logic can place it. Clearing the
  // paid_date (left blank) UN-marks it: delete the record so it returns to actionable/overdue.
  if(!D.bill_payments)D.bill_payments={};
  var _lk=okey;                        // '<billKey>::<period>'
  var _per=(okey.indexOf('::')>=0)?okey.split('::')[1]:'';
  if(/^\d{4}-\d{2}-\d{2}$/.test(paid)){
    var _rec=D.bill_payments[_lk]||{};
    _rec.paid=true;
    _rec.paid_date=paid;
    if(o.amount!=null) _rec.paid_amount=o.amount; else if(_rec.paid_amount==null && amt!=='' && !isNaN(parseFloat(amt))) _rec.paid_amount=parseFloat(amt);
    if(o.card) _rec.card=o.card; else if(!_rec.card && card) _rec.card=card;
    if(o.due) _rec.due=o.due; if(o.due) _rec.orig_due=o.due;
    if(/^\d{4}-\d{2}$/.test(_per)) _rec.period=_per;
    _rec._userEdited=true;   // v346: a hand-edited record is never overwritten by a synced document
    D.bill_payments[_lk]=_rec;
  }
  // NOTE: leaving paid_date blank does NOT auto-delete an existing paid record (it may have been paid
  // via the normal Pay button / History). To un-mark a payment, use the Pay toggle or History ✕.
  saveD(); occCancelEdit(); _billRerenderAll();
}

function histBulkDelete(){var sel=histSelected();if(!sel.length){toast('Select entries first');return;}
if(!confirm('Delete '+sel.length+' payment record(s) from history? This un-marks those occurrences as paid (the bills themselves stay in your setup).'))return;
_histSectionOpen=true;
var n=0;sel.forEach(function(k){if(D.bill_payments&&D.bill_payments[k]){delete D.bill_payments[k];n++;}});
saveD();renderBillReminder();if(typeof renderDashBills==='function')try{renderDashBills()}catch(e){}
toast('\ud83d\uddd1\ufe0f Deleted '+n+' history record(s)');}
var BILL_WINDOW_DUE=7;      // days: due (or overdue)
var BILL_WINDOW_UPCOMING=30; // days: upcoming
var BILL_WINDOW_DEADLINE_SOON=3; // days: deadline approaching warning

// Local midnight "today"
function _billToday(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function _billISO(d){return d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate();}
function _billKeyId(kind,name,extra){return kind+'|'+(name||'')+(extra?'|'+extra:'');}
// Icon for a bill row — Card Statement gets a card icon; otherwise pick by type keyword.
function _billIcon(o){
if(o.kind==='Card Statement')return '<i class="fa-solid fa-credit-card" style="color:#7c3aed"></i>';
var t=((o.type||'')+'').toLowerCase();
function ic(n,col){return '<i class="fa-solid '+n+'" style="color:'+(col||'var(--text3)')+';width:14px;text-align:center"></i>';}
if(/util|electric|water|gas/.test(t))return ic('fa-bolt','#f59e0b');
if(/internet|phone|mobile|subscription|tv|stream/.test(t))return ic('fa-wifi','#3b82f6');
if(/insur/.test(t))return ic('fa-shield-heart','#16a34a');
if(/rent|home|house|property/.test(t))return ic('fa-house','#8b5cf6');
if(/car|vehicle|fuel|transport/.test(t))return ic('fa-car','#0ea5e9');
if(/health|medical|hospital/.test(t))return ic('fa-notes-medical','#ef4444');
if(/food|grocery|dining/.test(t))return ic('fa-utensils','#f97316');
if(/loan|debt|credit|receiv/.test(t))return ic('fa-money-bill-transfer','#dc2626');
if(/save|saving|invest|fund/.test(t))return ic('fa-piggy-bank','#16a34a');
if(/family|pet|entertain/.test(t))return ic('fa-star','#eab308');
if(/tax/.test(t))return ic('fa-receipt','#6b7280');
return ic('fa-file-invoice','var(--text3)');
}

// Deadline date for a bill occurrence whose payment date is d.
// mode 'card' -> the card's deadline day in d's month; 'custom' -> item.deadline_day in d's month.
// Returns null when no deadline is defined.
function _billDeadline(item,d){
// Explicit deadline DATE (e.g. a utility bill printed payment-due date from UtilityLog).
// Takes precedence over card/day-of-month logic.
if(item.deadline_date){var _p=(''+item.deadline_date).split('-');if(_p.length===3){return new Date(+_p[0],(+_p[1])-1,+_p[2]);}}
var mode=item.deadline_mode;
var day=null;
if(mode==='card'||(!mode&&item.card&&item.card!=='Cash/Direct')){
var c=(D.cards||[]).find(function(x){return x.name===item.card});
if(c&&c.deadline)day=c.deadline;
}
if(day===null){ // custom (or fallback)
if(item.deadline_day)day=parseInt(item.deadline_day)||null;
}
if(!day)return null;
var y=d.getFullYear(),m=d.getMonth();
// Deadline rolls to NEXT month when its day-of-month falls on/before the billing/payment day
// (e.g. billed on the 20th, deadline day 1 => deadline is the 1st of next month).
if(day<=d.getDate()){m++;if(m>11){m=0;y++;}}
return new Date(y,m,Math.min(day,dim(y,m)));
}

// Enumerate every bill occurrence (expense only) whose due date is within [from,to].
// Mirrors the date logic used by simulate(): card payment-day shift via effPayment / installment shift.
function billOccurrences(fromD,toD){
if(!D)return[];
// UNIFIED PATH (Step 2): delegate to the generator-backed adapter when available and enabled.
// window.CM_USE_UNIFIED defaults ON in this branch; set it false in console to A/B against legacy.
if(window.CM_USE_UNIFIED!==false && typeof window.billOccurrencesUnified==='function'){
  try{ return window.billOccurrencesUnified(fromD,toD); }catch(_eU){ console.error('[unified adapter failed, falling back to legacy]',_eU); }
}
var occ=[];
function within(d){return d>=fromD&&d<=toD;}
// Utility dedup (mirrors simulation.js): a real utility bill auto-synced from utility_log lives
// in D.planned (flag _fromUtility, _utilUtility='electric'|'water'). For any month a real bill
// LANDS (by its pay/plan date), skip the linked Monthly recurring forecast so Calendar / Payment
// History / Bills Reminder don't show BOTH the recurring and the actual bill.
var _utilActual={electric:{},water:{}};
(D.planned||[]).forEach(function(pp){
  if(pp&&pp._fromUtility&&pp._utilUtility){
    var _ds=(pp.date||'');var _lm=_ds.length>=7?_ds.slice(0,7):pp._utilPeriod;
    if(_lm)_utilActual[pp._utilUtility][_lm]=true;
  }
});
function _isUtilRec(item){
  if(item.util_link==='electric'||item.util_link==='water')return item.util_link;
  if(item.util_link==='')return null;
  var n=(item.name||'');
  if(/\u0e44\u0e1f|electric|\u0e01\u0e32\u0e23\u0e44\u0e1f\u0e1f\u0e49\u0e32|mea/i.test(n))return 'electric';
  if(/\u0e19\u0e49\u0e33|water|\u0e1b\u0e23\u0e30\u0e1b\u0e32|mwa/i.test(n))return 'water';
  return null;
}
// Credit-card statement dedup (mirrors simulation.js): a real statement auto-synced from
// card_bills.js lives in D.planned (flag _fromCard, _cardName). For any month a statement lands,
// skip that card's linked Monthly recurring forecast.
var _cardActual={};
(D.planned||[]).forEach(function(pp){
  if(pp&&pp._fromCard&&pp._cardName){
    var _ds=(pp.date||'');var _lm=_ds.length>=7?_ds.slice(0,7):pp._cardPeriod;
    if(_lm){(_cardActual[pp._cardName]=_cardActual[pp._cardName]||{})[_lm]=true;}
  }
});
function _cardRec(item){ return (item&&item.card_link)?item.card_link:null; }
// Monthly recurring
var cy=fromD.getFullYear(),cm=fromD.getMonth(),ey=toD.getFullYear(),em=toD.getMonth();
var months=[];var yy=cy,mm=cm;
while(yy<ey||(yy===ey&&mm<=em)){months.push([yy,mm]);mm++;if(mm>11){mm=0;yy++}}
(D.monthly||[]).forEach(function(item){
if(item.status&&item.status!=='Active')return;
// Income recurring (receivables) are surfaced too — tagged _income so they render green with a
// "Received" button and are excluded from expense KPIs/totals downstream.
var _mIncome=(item.direction==='income');
var _ur=_mIncome?null:_isUtilRec(item);
var _cl=_mIncome?null:_cardRec(item);
months.forEach(function(ym){
var ep=effPayment(item);
var pm=ym[1]+ep.monthShift,py=ym[0];if(pm>11){pm-=12;py++}
var d=new Date(py,pm,Math.min(ep.day,dim(py,pm)));
// skip this utility recurring if a real bill lands in the same month (by pay/landing month 'd')
if(_cl){var _cmk=d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1);if(_cardActual[_cl]&&_cardActual[_cl][_cmk])return;}
if(_ur){var _mk=d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1);if(_utilActual[_ur]&&_utilActual[_ur][_mk])return;}
// Original due = the item's own bill day in the UN-shifted month (card shift only moves the statement/pay date).
var _odDay=item.billing_day||ep.day;var _od=new Date(ym[0],ym[1],Math.min(_odDay,dim(ym[0],ym[1])));
if(item.end_mode==='date'&&item.end_date&&d>new Date(item.end_date+'T00:00:00'))return;
if(item.start_mode==='date'&&item.start_date&&d<new Date(item.start_date+'T00:00:00'))return;
if(!within(d))return;
occ.push({kind:'Monthly',key:_billKeyId('M',item.name),name:item.name,type:item.type||'',
amount:item.amount||0,card:_mIncome?'Cash/Direct':(item.card||'Cash/Direct'),auto_pay:!!item.auto_pay,due:d,orig_due:_od,deadline:_billDeadline(item,d),info:_mIncome?'receivable':'',_income:_mIncome});
});
});
// Yearly recurring (full payment only; installment-mode yearly flows via allInstallments)
(D.yearly||[]).forEach(function(item){
if(item.pay_mode!=='full')return;
if(item.status&&item.status!=='Active')return;
var _yIncome=(item.direction==='income');// income receivables surfaced too (tagged _income)
months.forEach(function(ym){
if(ym[1]!==(item.month-1))return;
var ep=effPayment(item);
var pm=ym[1]+ep.monthShift,py=ym[0];if(pm>11){pm-=12;py++}
var d=new Date(py,pm,Math.min(ep.day,dim(py,pm)));
var _odDayY=item.billing_day||ep.day;var _odY=new Date(ym[0],ym[1],Math.min(_odDayY,dim(ym[0],ym[1])));
if(item.start_mode==='date'&&item.start_from&&d<new Date(item.start_from+'T00:00:00'))return;
if(!within(d))return;
occ.push({kind:'Yearly',key:_billKeyId('Y',item.name),name:item.name,type:item.type||'',
amount:item.amount||0,card:_yIncome?'Cash/Direct':(item.card||'Cash/Direct'),auto_pay:!!item.auto_pay,due:d,orig_due:_odY,deadline:_billDeadline(item,d),info:_yIncome?'receivable':'',_income:_yIncome});
});
});
// Installments (manual + yearly-derived)
var allInst=allInstallments();
allInst.forEach(function(inst){
// v217: allow 'Finished' through too. Installment periods are date-bounded by within(d),
// so a finished installment only contributes its real (past) periods — this keeps past-month
// totals accurate (e.g. calendar/history) instead of dropping the charge entirely.
if(inst.status!=='Active'&&inst.status!=='Planned'&&inst.status!=='Finished')return;
var c=D.cards.find(function(x){return x.name===inst.card});
var dl=c?c.payment_day:15;
var shift=(c&&inst.billing_day&&inst.billing_day>c.statement_day)?1:0;
for(var i=0;i<inst.periods;i++){
var m=inst.start_month-1+i+shift,y=inst.start_year;while(m>11){m-=12;y++}
var d=new Date(y,m,Math.min(dl,dim(y,m)));
// Original due = un-shifted month + the installment's own billing_day (fallback to pay day).
var _mo=inst.start_month-1+i,_yo=inst.start_year;while(_mo>11){_mo-=12;_yo++}
var _odDayI=inst.billing_day||dl;var _odI=new Date(_yo,_mo,Math.min(_odDayI,dim(_yo,_mo)));
if(inst.hide_before&&d<new Date(inst.hide_before+'T00:00:00'))continue;
if(!within(d))continue;
var label='('+(i+1)+'/'+inst.periods+')'+(i===inst.periods-1?' \u2705 FINAL':'');
occ.push({kind:'Installment',key:_billKeyId('I',inst.name,(i+1)+'of'+inst.periods),name:inst.name,type:inst.type||'',
amount:inst.per_period||0,card:inst.card||'Cash/Direct',
auto_pay:(inst.auto_pay!==undefined?!!inst.auto_pay:(inst.card&&inst.card!=='Cash/Direct')),due:d,orig_due:_odI,deadline:_billDeadline({card:inst.card,deadline_mode:(inst.card&&inst.card!=='Cash/Direct')?'card':'custom'},d),info:label});
}
});
// Planned one-time (expense only)
(D.planned||[]).forEach(function(item){
if(!item.date)return;
// Income Planned rows (receivables) are now surfaced too — tagged _income so they render green
// with a "Received" button instead of Pay, and are excluded from expense KPIs/totals downstream.
var _isIncome=(item.direction==='income');
var parts=item.date.split('-'),py=parseInt(parts[0]),pm=parseInt(parts[1])-1,pd=parseInt(parts[2]);
var c=D.cards.find(function(x){return x.name===item.card});
var payDay=pd,mShift=0;
// Income never routes through a card statement — pay/receive on its own date.
if(!_isIncome&&!item._fromCard&&c&&item.card!=='Cash/Direct'){payDay=c.payment_day;if(pd>c.statement_day)mShift=1}
var adjM=pm+mShift,adjY=py;if(adjM>11){adjM-=12;adjY++}
var d=new Date(adjY,adjM,Math.min(payDay,dim(adjY,adjM)));
var _odP=new Date(py,pm,Math.min(pd,dim(py,pm)));// original planned date (un-shifted)
// Normally drop Planned items outside the window. EXCEPTION: an UNPAID auto-synced utility bill
// (_fromUtility) whose due date is BEFORE the window start still surfaces, so a stale unpaid
// electric/water bill shows up as Overdue instead of silently vanishing. (Paid ones are excluded —
// a paid-ledger entry exists for their 'P|name|date::' key.)
if(!within(d)){
  var _isUtilUnpaid=false;
  if(item._fromUtility&&d<fromD){
    var _pfx='P|'+(item.name||'')+'|'+(item.date||'')+'::';var _paidL=false;
    var _bk=Object.keys(D.bill_payments||{});for(var _bi=0;_bi<_bk.length;_bi++){if(_bk[_bi].indexOf(_pfx)===0&&D.bill_payments[_bk[_bi]]&&D.bill_payments[_bk[_bi]].paid){_paidL=true;break;}}
    if(!_paidL)_isUtilUnpaid=true;
  }
  if(!_isUtilUnpaid)return;
}
occ.push({kind:'Planned',key:_billKeyId('P',item.name,item.date),name:item.name,type:item.type||'',
amount:item.amount||0,card:_isIncome?'Cash/Direct':(item.card||'Cash/Direct'),auto_pay:!!item.auto_pay,due:d,orig_due:_odP,deadline:_billDeadline({card:(_isIncome?'Cash/Direct':item.card),deadline_mode:item.deadline_mode||((item.card&&item.card!=='Cash/Direct'&&!_isIncome)?'card':'custom'),deadline_day:item.deadline_day,deadline_date:item.deadline_date},d),info:_isIncome?'receivable':'one-time',_income:_isIncome,_fromUtility:!!item._fromUtility,_utilUtility:item._utilUtility||'',_utilPeriod:item._utilPeriod||'',_fromCard:!!item._fromCard,_cardName:item._cardName||'',_cardPeriod:item._cardPeriod||''});
});

// Card-statement mode: collapse all card-charged occurrences into one line per card per payment-month.
if(_billCardMode||(D&&D.consolidate_card_bills!==false)){
var cashOcc=occ.filter(function(o){return !o.card||o.card==='Cash/Direct';});
var cardOcc=occ.filter(function(o){return o.card&&o.card!=='Cash/Direct';});
// Set of card names that are PDF-managed (appear in CARD_BILLS). Used to tag forecast
// statements (a card-managed statement for a period that has no real PDF yet).
var _pdfCardSet={};try{((window.CARD_BILLS&&window.CARD_BILLS.bills)||[]).forEach(function(_b){if(_b&&_b.card){var _cid=(typeof window.cardResolve==='function'&&((window.cardResolve(_b.card,_b.last4)||{}).id))||_b.card;_pdfCardSet[_cid]=1;_pdfCardSet[_b.card]=1;}});}catch(_e){}
// PERIOD-BASED GROUPING (PDF-managed cards only — ANY bank present in CARD_BILLS, not bank-specific). CM normally groups card charges into a
// statement by the MONTH OF THE DUE DATE. For PDF cards that breaks: a statement's period (usage
// month) can differ from its due month (due may cross a month boundary, e.g. stmt day 30 + offset).
// So for PDF-managed cards we group by the statement PERIOD instead. Period rule (user-confirmed):
// let S = card.statement_day; a charge on day pd belongs to the cycle that CLOSES on statement_day
// of month M (M = chargeMonth if pd<=S else chargeMonth+1); period month = (S<=15 ? M-1 : M).
// _fromCard rows already carry _cardPeriod from the parser — use it verbatim.
function _ym(y,m){while(m<0){m+=12;y--;}while(m>11){m-=12;y++;}return y+'-'+(m+1<10?'0':'')+(m+1);}
// v332 (user rule Oct 17): a card-linked bill folds by its ACTUAL PAID DATE, not its cut date.
// _periodForDateOnCard(cardRef, iso): which statement period the card was in on date `iso`.
function _periodForDateOnCard(cardRef, iso){
  var c=(D.cards||[]).find(function(x){return x.id===cardRef||x.name===cardRef;});
  if(!c||!c.statement_day) return null;
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); if(!m) return null;
  var S=parseInt(c.statement_day)||1, cy=+m[1], cm=(+m[2])-1, pd=+m[3];
  // v336: honor the card's period_rule (same setting Bill Reminder/adapter use), not the S<=15 heuristic.
  var _pr=c.period_rule;
  var M=cm+(pd>S?1:0);                       // statement month that closes the cycle this date is in
  var shift=(_pr==='prev')?1:(_pr==='same')?0:((S<=15)?1:0);
  var per=M-shift, y=cy;
  while(per<0){per+=12;y--;} while(per>11){per-=12;y++;}
  return y+'-'+(per+1<10?'0':'')+(per+1);
}
// _chargePaidRec(o): the paid-ledger record for a card charge occurrence (keyed by its fullKey/key).
// Returns the record if paid, else null. Used to decide fold (paid) vs surface (unpaid).
function _chargePaidRec(o){
  if(!o||!D.bill_payments) return null;
  var k=o.fullKey||o.key; if(!k) return null;
  var r=D.bill_payments[k];
  if(r&&r.paid) return r;
  // v335 (Oct 17): match ONLY the paid record for THIS occurrence's own service period.
  // The occurrence key (e.g. 'M|AIS Fiber') has no period suffix, so compute the service
  // period from this occurrence's own charge date (orig_due, else due) and look up the exact
  // '<key>::<period>' record. The OLD prefix fallback matched ANY period sharing the key
  // prefix, so an UNPAID Oct/Nov occurrence wrongly adopted the PAID Sep record and folded
  // into the wrong statement. Per-period exact match fixes that.
  try{
    var base=(o.orig_due instanceof Date)?o.orig_due:(o.due instanceof Date?o.due:null);
    if(base){
      var per=base.getFullYear()+'-'+((base.getMonth()+1)<10?'0':'')+(base.getMonth()+1);
      var kk=(o.key||'')+'::'+per;
      var rr=D.bill_payments[kk];
      if(rr&&rr.paid) return rr;
    }
  }catch(e){}
  return null;
}
function _cardOccPeriod(o){
  if(o._fromCard&&/^\d{4}-\d{2}$/.test(o._cardPeriod||''))return o._cardPeriod;
  var c=(D.cards||[]).find(function(x){return x.id===o.card||x.name===o.card;});
  if(!c||!c.statement_day)return null;
  var S=parseInt(c.statement_day)||1;
  // use the occurrence's ORIGINAL (un-shifted) charge date if available, else its due date
  var base=(o.orig_due instanceof Date)?o.orig_due:o.due;
  var pd=base.getDate(), cm=base.getMonth(), cy=base.getFullYear();
  var M=cm+(pd>S?1:0);                 // month whose statement_day closes this charge's cycle
  var per=(S<=15)?(M-1):M;             // period rule
  return _ym(cy,per);
}
var groups={}; // key: card + '::' + YYYY-MM. PDF-managed -> period month; others -> due month (legacy).
cardOcc.forEach(function(o){
// v313 GROUP-ANCHOR FIX (unified-table approach, Path B): group EVERY card charge by its CARD
// STATEMENT PERIOD computed once from the charge's own orig_due + the card's statement_day
// (_cardOccPeriod). This is the SAME period logic the unified generator proved correct. The period
// is assigned HERE, at anchor time, and the group's y/m are derived FROM the period string — never
// from o.due and never re-keyed later. That removes the due-month-vs-period desync that caused the
// v312 class of bugs (JCB 2026-04 shown as 2026-05, BAY 2026-08 split into two rows, vanished months).
var mk, _foldCard=o.card;
if(o._fromCard){ mk=_cardOccPeriod(o); }           // PDF statement row: its own period
else {
  // v334 (user concept Oct 17): a linked charge folds ONLY by its ACTUAL PAID DATE.
  //  - UNPAID  -> do NOT fold into any statement group; it stays a standalone actionable row.
  //  - PAID    -> fold under the PAYING card, into the statement period whose date-range contains
  //               paid_date (computed from that card's statement_day/period_rule via _periodForDateOnCard).
  var _pr=_chargePaidRec(o);
  if(!(_pr&&_pr.paid&&_pr.paid_date)) return;        // unpaid linked charge -> skip grouping entirely
  _foldCard=_pr.card||o.card;
  mk=_periodForDateOnCard(_foldCard,_pr.paid_date);
  if(!mk) return;                                     // can't resolve a period -> don't fold
}
if(!mk){ mk=o.due.getFullYear()+'-'+(o.due.getMonth()+1<10?'0':'')+(o.due.getMonth()+1); }
var gk=_foldCard+'::'+mk;
// g.y/g.m ALWAYS reflect the period month (mk) when mk is a valid YYYY-MM, so downstream
// due/deadline/extra-key math is consistent with the bucket for every card (PDF or not).
var _gy,_gm;
if(/^(\d{4})-(\d{2})$/.test(mk)){ _gy=+mk.slice(0,4); _gm=(+mk.slice(5,7))-1; }
else { _gy=o.due.getFullYear(); _gm=o.due.getMonth(); }
if(!groups[gk])groups[gk]={card:_foldCard,y:_gy,m:_gm,items:[],sum:0,latest:o.due,deadline:o.deadline};
var g=groups[gk];g.items.push(o);
// PDF statement row (_fromCard, from card_bills) is the AUTHORITATIVE total for the whole period:
// keep it as a child (so installments/charges stay visible) but DO NOT add it to g.sum, and record
// its amount as g.pdfAmount so it OVERRIDES the computed sum below (priority: PDF > keyed/summed).
if(o._fromCard){ g.pdfAmount=(o.amount||0); g.pdfChild=o; }
else { g.sum+=(o.amount||0); }
if(o.due>g.latest)g.latest=o.due;
if(o.deadline&&(!g.deadline||o.deadline>g.deadline))g.deadline=o.deadline;
});
// Override-only months: a cardbill_override may exist for a card/month with NO charges
// (e.g. a manually-entered statement amount). Create an empty group so the statement still lists.
Object.keys(D.cardbill_extra||{}).forEach(function(ok){
var pp=ok.split('::');if(pp.length!==2)return;
if(!(parseFloat(D.cardbill_extra[ok])>0))return; // only positive extra-only months
var oc=pp[0],om=pp[1];
if(groups[oc+'::'+om])return; // already has charges
var oy=parseInt(om.split('-')[0]),omo=parseInt(om.split('-')[1])-1;
if(isNaN(oy)||isNaN(omo))return;
// Bound to the enumeration window using the statement's real DUE date. The extra key's month
// (om) is the PERIOD. For a PDF-managed card the due date follows the NEW model
// (due = statement_date + due_offset), where statement_date = statement_day in the month whose
// statement_day closes this period (period+1 when statement_day<=15, else the period month).
// For non-PDF cards keep the legacy payment_day-based due. g.y/g.m MUST stay the PERIOD so the
// later .map() computes due/deadline consistently with charge-backed buckets.
var cObj=(D.cards||[]).find(function(x){return x.id===oc||x.name===oc;});
var sdue;
if(_pdfCardSet[oc]){
  var _o2=(cObj&&typeof cObj.due_offset==='number')?cObj.due_offset:(cObj&&cObj.due_offset?parseInt(cObj.due_offset)||0:0);
  var _s2=cObj&&cObj.statement_day?parseInt(cObj.statement_day)||1:1;
  var _sm=(_s2<=15)?(omo+1):omo, _sy=oy; if(_sm>11){_sm-=12;_sy++;}
  var _sd=new Date(_sy,_sm,Math.min(_s2,dim(_sy,_sm)));
  sdue=new Date(_sd.getFullYear(),_sd.getMonth(),_sd.getDate()+_o2);
} else {
  var payd=cObj&&cObj.payment_day?cObj.payment_day:28;
  sdue=new Date(oy,omo,Math.min(payd,dim(oy,omo)));
}
if(sdue<fromD||sdue>toD)return;
groups[oc+'::'+om]={card:oc,y:oy,m:omo,items:[],sum:0,latest:sdue,deadline:null};
});
var stmts=Object.keys(groups).filter(function(gk){
// Card 'Statements from' cutoff: drop statement months before the card's start month.
var g=groups[gk];var mk=g.y+'-'+(g.m+1<10?'0':'')+(g.m+1);
var cObj=(D.cards||[]).find(function(x){return x.name===g.card;});
return !(cObj&&cObj.statement_start&&mk<cObj.statement_start);
}).map(function(gk){
var g=groups[gk];
var mk=g.y+'-'+(g.m+1<10?'0':'')+(g.m+1);
var extraRec=parseFloat((D.cardbill_extra||{})[g.card+'::'+mk])||0;
// Priority: a real PDF statement amount (amount_due) wins over the summed/keyed total for this period.
// When there's no PDF yet, fall back to the computed charges + manually-keyed extra (original behaviour).
var _hasPdf=(g.pdfAmount!=null);
var eff=_hasPdf?g.pdfAmount:((g.sum||0)+extraRec);
var cardObj=(D.cards||[]).find(function(x){return x.name===g.card;});
// Due date: for a PDF statement (_fromCard), use the REAL due date printed on the statement
// (carried on g.pdfChild.due) instead of re-deriving from payment_day — otherwise the statement
// jumps to payment_day of the wrong month (e.g. AIA due 10/10 shown on 26/10). For non-PDF
// (forecast) statements keep the Planned Pay day (payment_day) behaviour.
// Due = Planned Pay day (payment_day) in the statement month — ALWAYS, whether or not a PDF bill
// exists (user rule: due = the day you plan to pay; the PDF only affects the DEADLINE, below).
var dueDate, dlDate;
var _isPdfCard=!!_pdfCardSet[g.card];
if(_isPdfCard){
  // ===== PDF-managed model (ANY bank — scoped to cards present in CARD_BILLS, not bank-specific) =====
  // Due = statement_date + due_offset(days). Deadline = forecast: deadline_day / actual(PDF): PDF due_date.
  // g.y/g.m is the PERIOD month. The statement DATE for that period = statement_day in the month whose
  // statement_day closes the cycle: that month is period+1 when statement_day<=15, else the period month.
  var _off=(cardObj&&typeof cardObj.due_offset==='number')?cardObj.due_offset:(cardObj&&cardObj.due_offset?parseInt(cardObj.due_offset)||0:0);
  var _sday=cardObj&&cardObj.statement_day?parseInt(cardObj.statement_day)||1:1;
  if(_hasPdf && g.pdfChild && g.pdfChild.due instanceof Date){
    // ACTUAL bill: use the real statement date (already stmt_date+offset in g.pdfChild.due).
    dueDate=g.pdfChild.due;
    dlDate=(g.pdfChild.deadline instanceof Date)?g.pdfChild.deadline:null;
  } else {
    // FORECAST: reconstruct the statement date from the period + configured statement_day.
    var _stmtM=(_sday<=15)?(g.m+1):g.m, _stmtY=g.y;
    if(_stmtM>11){_stmtM-=12;_stmtY++;}
    var _stmtDate=new Date(_stmtY,_stmtM,Math.min(_sday,dim(_stmtY,_stmtM)));
    dueDate=new Date(_stmtDate.getFullYear(),_stmtDate.getMonth(),_stmtDate.getDate()+_off);
    // Forecast deadline = card's configured deadline day, in the statement month, rolling forward
    // only if the deadline day falls on/before the due day.
    var _dlDay=cardObj&&cardObj.deadline?parseInt(cardObj.deadline)||null:null;
    if(_dlDay){
      var _dlY=_stmtDate.getFullYear(),_dlM=_stmtDate.getMonth();
      if(_dlDay<=dueDate.getDate()&&_dlDay<=_sday){ _dlM++; if(_dlM>11){_dlM=0;_dlY++;} }
      dlDate=new Date(_dlY,_dlM,Math.min(_dlDay,dim(_dlY,_dlM)));
    } else { dlDate=dueDate; }
  }
} else {
  // ===== Legacy model (all non-PDF cards) — unchanged =====
  dueDate=cardObj&&cardObj.payment_day?new Date(g.y,g.m,Math.min(cardObj.payment_day,dim(g.y,g.m))):(g.deadline||g.latest);
  var _dlDay=cardObj&&cardObj.deadline?cardObj.deadline:null;
  var _payDay=cardObj&&cardObj.payment_day?cardObj.payment_day:null;
  var _dlY=g.y,_dlM=g.m;
  if(_dlDay&&_payDay&&_dlDay<=_payDay){_dlM=g.m+1;if(_dlM>11){_dlM=0;_dlY=g.y+1;}}
  dlDate=_dlDay?new Date(_dlY,_dlM,Math.min(_dlDay,dim(_dlY,_dlM))):(g.deadline||dueDate);
}
return {kind:'Card Statement',key:_billKeyId('CB',g.card,mk),_cardPeriod:mk,name:g.card+' statement',type:'Credit Card',
amount:eff,card:g.card,auto_pay:false,children:(_hasPdf?g.items.filter(function(_it){return !_it._fromCard;}):g.items),_pdfDriven:_hasPdf,due:dueDate,deadline:dlDate,
info:(_hasPdf?('\ud83d\udcc4 from statement'+(g.items.length>1?(' \u00b7 '+(g.items.length-1)+' charge'+((g.items.length-1)!==1?'s':'')):'')):((_pdfCardSet[g.card]?'\ud83d\udd2e forecast \u00b7 ':'')+g.items.length+' charge'+(g.items.length!==1?'s':'')+(extraRec>0?' \u00b7 +extra':''))),_isForecast:(!_hasPdf&&!!_pdfCardSet[g.card])};
});
// v181: Surface MANUAL card charges as their own top-level rows (in addition to the
// statement they roll up into) — you must tap to pay these yourself, so they shouldn't be
// hidden inside the collapsed statement. Auto charges stay hidden (no action needed).
// Each surfaced row is flagged _surfaced=true so KPI/visible-total sums skip it (no double count),
// and carries _inStmtCard so the row can note it's already included in that card's statement.
var manualSurfaced=[];
cardOcc.forEach(function(o){
// v186: surface BOTH auto and manual card charges as their own rows (auto guard removed),
// so the user sees every charge that will hit the card that day (auto-debits included).
// A _fromCard PDF statement row is the statement HEADER itself (its amount is the whole statement),
// not an individual charge — never surface it as its own line (would duplicate the statement).
if(o._fromCard)return;
// v310 (user rule 12 Oct): UNPAID charges surface as their own actionable row; a PAID charge must
// NOT surface — it folds under its statement instead (and shows its paid date there). Detect paid by
// the charge's OWN CC-period key (I|/M|name::period via _cardOccPeriod), NOT the due-month, because a
// shifted charge's due month differs from its statement period.
// v332 (user rule Oct 17): a PAID linked charge folds under the statement of its PAID DATE and must
// NOT surface. An UNPAID linked charge ALWAYS surfaces as its own actionable row (even if that card's
// statement for some period is already paid) and does not fold.
var _pr=_chargePaidRec(o);
if(_pr&&_pr.paid) return;                 // paid -> folded under paid-date statement, don't surface
// unpaid -> surface as its own actionable row (standalone; not folded into any statement)
var s=Object.assign({},o);s._surfaced=true;s._inStmtCard=o.card;s._unpaidStandalone=true;
// Keep s.due = the charge's own due (cardOcc items already carry due=charge due here,
// since consolidation groups by o.due). periodKey/paid-state stay consistent with the child.
// (orig_due is used by the display cell via o.orig_due||o.due, so no separate _dispDue needed.)
manualSurfaced.push(s);
});
occ=cashOcc.concat(stmts).concat(manualSurfaced);
}

// attach paid status + full key.
// KEY IS PERIOD-MONTH (YYYY-MM), not exact day — so it survives day-of-month shifts
// (deadline rollover, Planned Pay day, card-shift). Exact due date lives in the record (rec.due).
occ.forEach(function(o){
// v311: card statements resolve period + paid-state through the CENTRAL helpers (single source of
// truth) so Bill Reminder, Card Bills, Payment History and Timeline all agree. period = parser's
// _cardPeriod first, else the CB-key segment, else §2 rule (window.cardStmtPeriodOf). fullKey = the
// canonical key window.cardStmtKey writes (so the Pay button and this reader never disagree), and
// paid-state is a suffix-agnostic prefix match (window.cardPaidRecFor). Non-card occurrences keep
// the legacy exact key (their key already carries the right ::period suffix).
var _isCB=(o.kind==='Card Statement'||(typeof o.key==='string'&&o.key.indexOf('CB|')===0));
if(_isCB&&typeof window.cardStmtPeriodOf==='function'&&typeof window.cardPaidRecFor==='function'){
  var _per=window.cardStmtPeriodOf(o)||'';
  o.statementPeriod=_per;
  o.fullKey=(_per&&typeof window.cardStmtKey==='function')?window.cardStmtKey(o.card,_per):(o.key+'::'+(o.due.getFullYear()+'-'+(o.due.getMonth()+1<10?'0':'')+(o.due.getMonth()+1)));
  o.periodKey=o.fullKey;
  var _r=_per?window.cardPaidRecFor(o.card,_per):null;
  o.paid=!!_r; o.paid_date=_r&&_r.paid_date; o.paid_amount=_r&&_r.paid_amount;
  return;
}
o.periodKey=o.key+'::'+(o.due.getFullYear()+'-'+(o.due.getMonth()+1<10?'0':'')+(o.due.getMonth()+1));
o.fullKey=o.periodKey; // fullKey now == periodKey (kept name for downstream use)
var rec=(D.bill_payments||{})[o.fullKey];
o.paid=!!(rec&&rec.paid);
o.paid_date=rec&&rec.paid_date;
o.paid_amount=rec&&rec.paid_amount;
});
occ.sort(function(a,b){return a.due-b.due});
return occ;
}

// ===== LAYER B (v=309): auto-mark a statement's installment/monthly CHILDREN paid =====
// When a card STATEMENT is marked paid (cardMarkPaid), its underlying installment/monthly charges
// for that card+period should also become paid records — so Payment History can fold them and the
// per-charge paid-state is correct. We enumerate via the REAL billOccurrences (which already honours
// start_date/end_date/hide_before/within-window) and filter by _cardOccPeriod === period. We NEVER
// re-enumerate by hand (that was the Oct-12 bug that pulled AIS 28/08 into the wrong period).
// Records we create carry _autoChild:true so cardUnmarkChildren can cleanly reverse ONLY our own
// additions and never delete a hand-keyed record. Idempotent: skips any key that already exists.
function _cardChildOccs(card, period){
  if(!card||!/^\d{4}-\d{2}$/.test(period||''))return [];
  // Wide window: 1y back .. 1y forward covers any installment/monthly instance that could map to period.
  var f=new Date(); f=new Date(f.getFullYear()-1,f.getMonth(),1);
  var t=new Date(); t=new Date(t.getFullYear()+1,t.getMonth()+1,0);
  var occ=[]; try{occ=billOccurrences(f,t);}catch(e){return [];}
  return occ.filter(function(o){
    if(!o||o.card!==card)return false;
    if(o.kind!=='Installment'&&o.kind!=='Monthly'&&o.kind!=='Yearly')return false; // children only, not the statement
    if(o._income)return false;                 // receivables are not card charges
    if(o._surfaced||o._fromCard)return false;  // skip surfaced dupes / the statement header row
    return _cardOccPeriod(o)===period;
  });
}
function cardMarkChildren(card, period, paidDateISO){
  if(!D.bill_payments)D.bill_payments={};
  var pd=(typeof paidDateISO==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(paidDateISO))?paidDateISO:_billISO(_billToday());
  var kids=_cardChildOccs(card,period), n=0;
  kids.forEach(function(o){
    var key=o.key+'::'+period;                 // KIND|name|seq::period  (same shape billOccurrences reads)
    if(D.bill_payments[key])return;            // already paid (hand-keyed or earlier) -> never overwrite
    var seq=''; var m=/\((\d+)\/(\d+)\)/.exec(o.info||''); if(m)seq=m[1]+'/'+m[2];
    var _od=(o.orig_due instanceof Date)?_billISO(o.orig_due):(o.orig_due||'');
    D.bill_payments[key]={paid:true,paid_date:pd,paid_amount:(o.amount||0),
      due:(o.due instanceof Date)?_billISO(o.due):(o.due||''),
      type:o.type||'',card:card,auto_pay:!!o.auto_pay,period:period,orig_due:_od,
      _autoChild:true};
    if(seq)D.bill_payments[key].seq=seq;
    n++;
  });
  return n;
}
function cardUnmarkChildren(card, period){
  if(!D.bill_payments)return 0;
  var n=0;
  Object.keys(D.bill_payments).forEach(function(k){
    var r=D.bill_payments[k];
    // Only remove records WE auto-created (flagged) for this exact card+period. Hand-keyed records
    // (no _autoChild) are left untouched — unpaying a statement must not erase a manual entry.
    if(r&&r._autoChild===true&&r.card===card&&r.period===period){ delete D.bill_payments[k]; n++; }
  });
  return n;
}
if(typeof window!=='undefined'){ window.cardMarkChildren=cardMarkChildren; window.cardUnmarkChildren=cardUnmarkChildren; }


// Classify an occurrence relative to today.
function billStatus(o,today){
if(o.paid)return'paid';
// Use the charge's REAL due (orig_due) when present so a card charge's status/urgency reflects
// its own due date, not the statement's pay date. Statements have no orig_due, so unaffected.
var diff=Math.round(((o.orig_due||o.due)-today)/86400000);
// Auto-pay bills need no action — once their date has passed they are assumed paid automatically.
// EXCEPT when the user explicitly cancelled this payment (v321): the cancel override forces the
// charge to stay actionable (overdue/due) so it can be seen and re-paid, instead of silently
// re-assuming the auto-charge happened.
var _apCancelled=(o&&o.fullKey&&D&&D.autopay_cancelled&&D.autopay_cancelled[o.fullKey]);
if(o.auto_pay&&diff<0&&!_apCancelled)return'auto_paid';
if(diff<0)return'overdue';
if(diff<=((D&&parseInt(D.due_soon_days))||BILL_WINDOW_DUE))return'due';
if(diff<=BILL_WINDOW_UPCOMING)return'upcoming';
return'future';
}

// Deadline-aware flag (independent of due/pay date). Returns null when no deadline,
// paid, or deadline is comfortably far off.
// 'past'  = deadline already passed and still unpaid (penalty risk)
// 'soon'  = deadline within BILL_WINDOW_DEADLINE_SOON days and unpaid
function deadlineFlag(o,today){
// Auto-pay bills need no action, so no deadline penalty risk applies to them.
if(o.paid||o.auto_pay||!o.deadline)return null;
var dd=Math.round((o.deadline-today)/86400000);
if(dd<0)return{state:'past',days:-dd};
if(dd<=BILL_WINDOW_DEADLINE_SOON)return{state:'soon',days:dd};
return null;
}

// Toggle paid status for one occurrence.
// Central re-render after any pay/unpay action. Covers EVERY surface that reflects paid-state:
// Bill Reminder (list+KPI), Planned (Status column + filter), Dashboard bills panel, and the
// Timeline simulation. Each guarded so a missing module never throws. One call = all surfaces fresh.
function _billRerenderAll(){
  try{renderBillReminder();}catch(e){}
  try{if(typeof renderPlanned==='function'){renderPlanned();if(typeof filterPlanned==='function')filterPlanned();}}catch(e){}
  try{if(typeof renderDashBills==='function')renderDashBills();}catch(e){}
  try{if(typeof simulate==='function')simulate();}catch(e){}
}

function toggleBillPaid(fullKey,amount,checked,dueISO,typ,card,autoPay,utilUtility,utilPeriod){
if(!D.bill_payments)D.bill_payments={};
if(checked){
D.bill_payments[fullKey]={paid:true,paid_date:_billISO(_billToday()),paid_amount:amount,due:dueISO||'',type:typ||'',card:card||'',auto_pay:!!autoPay};
if(D.autopay_cancelled)delete D.autopay_cancelled[fullKey];
if(utilUtility&&utilPeriod){ if(!D.util_manual_paid)D.util_manual_paid={}; D.util_manual_paid[utilUtility+'|'+utilPeriod]={paid_date:_billISO(_billToday())}; }
}else{
delete D.bill_payments[fullKey];
if(utilUtility&&utilPeriod&&D.util_manual_paid){ delete D.util_manual_paid[utilUtility+'|'+utilPeriod]; }
// v321: cancelling a payment is an explicit "this is NOT paid" override. For an AUTO-PAY charge whose
// due date has passed, billStatus would otherwise re-label it 'auto_paid' (assumed auto-charged) and
// hide it — so a cancelled auto-pay bill would vanish with no way to re-pay. Record the override so
// billStatus keeps it actionable (overdue/due) until it is paid again.
if(!D.autopay_cancelled)D.autopay_cancelled={};
D.autopay_cancelled[fullKey]=true;
}
saveD();
_billRerenderAll();
}

// Mark ONE bill paid using the per-row date picker (default today, editable before marking).
// v323 (user Oct 13 2026): build a paid-record that LOCKS the statement period + unshifted bill
// date, so Payment History can fold the charge under the right card statement and show its period
// badge. Previously these were omitted -> record.period was undefined -> no fold, blank badge
// (confirmed via live Console: iCloud/Netflix M|...::2026-09 had period:undefined). `period` prefers
// the occurrence's card_period (the statement cycle it belongs to); orig_due is the charge's own date.
function _mkPaidRec(o,pd,extra){
  var rec={paid:true,paid_date:pd,paid_amount:(o.amount||0),due:_billISO(o.due),type:o.type||'',card:o.card||'',auto_pay:!!o.auto_pay};
  var per=(o.card_period&&/^\d{4}-\d{2}$/.test(o.card_period))?o.card_period:(o.service_period&&/^\d{4}-\d{2}$/.test(o.service_period)?o.service_period:'');
  if(per)rec.period=per;
  var od=o.orig_due||o.due; if(od)rec.orig_due=_billISO(od);
  if(extra){for(var k in extra)rec[k]=extra[k];}
  return rec;
}
function markRowPaid(fullKey,amount,dueISO,typ,card,autoPay,utilUtility,utilPeriod,period){
if(!D.bill_payments)D.bill_payments={};
var di=document.getElementById('brpd_'+fullKey.replace(/[^a-zA-Z0-9]/g,'_'));
// v327 (user Oct 16 2026): REQUIRE a chosen payment date — never silently default to today
// (that was overwriting real paid dates with 16/10 when the user clicked Pay without picking a day).
var pd=(di&&di.value)?di.value:'';
if(!/^\d{4}-\d{2}-\d{2}$/.test(pd)){ alert('\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22\u0e01\u0e48\u0e2d\u0e19 (Pick the payment date first)'); if(di)try{di.focus();}catch(e){} return; }
D.bill_payments[fullKey]={paid:true,paid_date:pd,paid_amount:amount,due:dueISO||'',type:typ||'',card:card||'',auto_pay:!!autoPay};
// v323: lock period (statement cycle) + orig_due (bill's own date) so History can fold + badge it.
if(/^\d{4}-\d{2}$/.test(period||''))D.bill_payments[fullKey].period=period;
if(dueISO)D.bill_payments[fullKey].orig_due=dueISO;
if(D.autopay_cancelled)delete D.autopay_cancelled[fullKey];
// Cross-page sync: a utility bill paid here must also show paid on the Utilities page
// (which reads D.util_manual_paid keyed by utility|period). Write both stores.
if(utilUtility&&utilPeriod){
  if(!D.util_manual_paid)D.util_manual_paid={};
  D.util_manual_paid[utilUtility+'|'+utilPeriod]={paid_date:pd};
}
saveD();_billRerenderAll();
toast('\u2705 Marked paid on '+fmtDate(pd));
}

// Mark all currently-visible DUE/OVERDUE manual bills as paid.
function markAllDuePaid(){
var today=_billToday();
var horizon=new Date(today.getTime()+BILL_WINDOW_UPCOMING*86400000);
var back=new Date(today.getTime()-365*86400000);
var occ=billOccurrences(back,horizon);
var n=0;
occ.forEach(function(o){var st=billStatus(o,today);if((st==='due'||st==='overdue')&&!o.paid){
D.bill_payments[o.fullKey]=_mkPaidRec(o,_billISO(today));n++;}});
if(n){saveD();_billRerenderAll();toast('\u2705 Marked '+n+' bill(s) as paid');}
else toast('No due/overdue bills to mark');
}

// Mark every currently-VISIBLE (filtered) bill as paid. Uses the exact set of
// rows shown by the last render (captured in _billVisible), so it always
// matches what the user sees — including the active date-range filter.
function markFilteredPaid(){
var vis=window._billVisible||[];
var unpaid=vis.filter(function(o){return !o.paid;});
if(!unpaid.length){toast('No unpaid bills in the current view');return;}
var today=_billToday();
unpaid.forEach(function(o){D.bill_payments[o.fullKey]=_mkPaidRec(o,_billISO(today));});
saveD();_billRerenderAll();
toast('\u2705 Marked '+unpaid.length+' bill(s) as paid');
}

function setBillFilter(f){_billFilter=f;renderBillReminder();}
// Header-click sort. Clicking the active column toggles asc/desc; a new column selects it (asc),
// except 'urgency' which is the default grouped order. Clicking the active non-urgency column
// header a second time when already desc returns to 'urgency'.
function setBillSort(col){
if(col==='urgency'){_brSort='urgency';_brAsc=true;}
else if(_brSort===col){if(_brAsc){_brAsc=false;}else{_brSort='urgency';_brAsc=true;}}
else{_brSort=col;_brAsc=true;}
renderBillReminder();}
function setBillCardMode(on){_billCardMode=!!on;renderBillReminder();}

// ===== Selection + bulk actions on the bill list =====
// Return the checked row checkboxes as [{key,amount,paid}]
function brSelected(){
var out=[];
document.querySelectorAll('.br-chk:checked').forEach(function(cb){
out.push({key:cb.dataset.key,amount:parseFloat(cb.dataset.amt)||0,paid:cb.dataset.paid==='1',due:cb.dataset.due||'',type:cb.dataset.type||'',card:cb.dataset.card||'',auto_pay:cb.dataset.auto==='1'});
});
return out;
}
function brUpdateSelCount(){
var n=document.querySelectorAll('.br-chk:checked').length;
var bar=document.getElementById('br-bulk');if(bar)bar.style.display=n>0?'flex':'none';
var c=document.getElementById('br-sel-count');if(c)c.textContent=n;
}
function brToggleAll(on){
document.querySelectorAll('.br-chk').forEach(function(cb){cb.checked=on;});
brUpdateSelCount();
}
function brBulkPaid(){
var sel=brSelected();if(!sel.length){toast('Select bills first');return;}
if(!D.bill_payments)D.bill_payments={};
var di=document.getElementById('br-paid-date');
var pd=(di&&di.value)?di.value:_billISO(_billToday()); // YYYY-MM-DD from picker, default today
var n=0;
sel.forEach(function(s){if(!s.paid){D.bill_payments[s.key]={paid:true,paid_date:pd,paid_amount:s.amount,due:s.due||'',type:s.type||'',card:s.card||'',auto_pay:!!s.auto_pay};n++;}});
saveD();_billRerenderAll();
toast('\u2705 Marked '+n+' bill(s) paid on '+fmtDate(pd));
}
function brBulkUnpaid(){
var sel=brSelected();if(!sel.length){toast('Select bills first');return;}
var n=0;sel.forEach(function(s){if(D.bill_payments&&D.bill_payments[s.key]){delete D.bill_payments[s.key];n++;}});
saveD();_billRerenderAll();
toast('\u21a9\ufe0f Marked '+n+' bill(s) unpaid');
}
function brBulkDelete(){
var sel=brSelected();if(!sel.length){toast('Select bills first');return;}
if(!confirm('Clear payment status for '+sel.length+' selected bill(s)? This removes their paid record (the bills themselves stay in your setup).'))return;
var n=0;sel.forEach(function(s){if(D.bill_payments&&D.bill_payments[s.key]){delete D.bill_payments[s.key];n++;}});
saveD();renderBillReminder();if(typeof renderDashBills==='function')try{renderDashBills()}catch(e){}
toast('\ud83d\uddd1\ufe0f Cleared payment status on '+sel.length+' bill(s)');
}

// Delete a bill AT ITS SOURCE (Monthly/Yearly/Planned/Installment setup) from the Bills Reminder.
// Finds the item by name in the matching list and removes it after confirmation. This is for
// bills the user no longer recognises and wants gone entirely (not just clearing paid status).
function brDeleteSource(ri){
var o=(window._billVisible||[])[ri];if(!o){toast('Row not found');return;}
var kind=o.kind,name=o.name;
if(!D||!name)return;
readAll&&readAll();
var lists={Monthly:'monthly',Yearly:'yearly',Planned:'planned'};
var found=[];
// direct lists
if(lists[kind]){
var arr=D[lists[kind]]||[];
arr.forEach(function(it,idx){if((it.name||'')===name)found.push({list:lists[kind],idx:idx,label:kind});});
}
// installments: manual list + yearly installment-mode sources
if(kind==='Installment'){
(D.installments||[]).forEach(function(it,idx){if((it.name||'')===name)found.push({list:'installments',idx:idx,label:'Installment (manual)'});});
(D.yearly||[]).forEach(function(it,idx){if((it.name||'')===name&&it.pay_mode==='installment')found.push({list:'yearly',idx:idx,label:'Yearly (installment mode)'});});
}
// If not found under the stated kind, search everywhere as a fallback
if(!found.length){
['monthly','yearly','planned','installments'].forEach(function(L){(D[L]||[]).forEach(function(it,idx){if((it.name||'')===name)found.push({list:L,idx:idx,label:L});});});
}
if(!found.length){toast('Could not find "'+name+'" in your setup');return;}
var where=found.map(function(f){return f.label;}).join(', ');
if(!confirm('Delete "'+name+'" from your setup?\n\nFound in: '+where+'\n\nThis removes the bill itself (and all its occurrences) permanently. This cannot be undone.'))return;
// delete from highest index first per list
var byList={};found.forEach(function(f){(byList[f.list]=byList[f.list]||[]).push(f.idx);});
Object.keys(byList).forEach(function(L){byList[L].sort(function(a,b){return b-a;}).forEach(function(idx){D[L].splice(idx,1);});});
saveD();
if(typeof simulate==='function')try{simulate()}catch(e){}
renderBillReminder();
if(typeof renderAllTabs==='function')try{renderAllTabs()}catch(e){}
if(typeof renderDashBills==='function')try{renderDashBills()}catch(e){}
toast('\ud83d\uddd1\ufe0f Deleted "'+name+'" from setup');
}

function setBillDatePart(part,val){
if(part==='year'){_billYear=val;if(!val){_billMonth='';_billDay=''}}
else if(part==='month'){_billMonth=val;if(!val)_billDay=''}
else if(part==='day')_billDay=val;
renderBillReminder();
}
function clearBillDate(){_billYear='';_billMonth='';_billDay='';renderBillReminder();}
// Step the Year+Month filter by delta months (used by Prev/Next buttons).
// Initializes to the current month if no month is set yet, and rolls year boundaries.
function billStepMonth(delta){
var t=_billToday();
var y=_billYear!==''?parseInt(_billYear):t.getFullYear();
var m=_billMonth!==''?parseInt(_billMonth):(t.getMonth()+1); // 1-12
m+=delta;
while(m>12){m-=12;y++;}
while(m<1){m+=12;y--;}
_billYear=String(y);
_billMonth=String(m);
_billDay=''; // stepping months clears any day selection
renderBillReminder();
}
function _billDateActive(){return _billYear!==''||_billMonth!==''||_billDay!=='';}

// ===== Main tab render =====
// Reconstruct the child charges of a paid Card Statement history record by re-deriving
// that card's charges for the statement month via billOccurrences. History stores only the
// statement total (not children), so this is a current-data reconstruction (may drift if the
// underlying bills were edited/deleted after payment). Cached per render in _histKidsCache.
var _histKidsCache=null;
var _histPdfCache=null;
function _histStmtChildren(r){
try{
if(!r)return null;
var isStmt=(r.kind==='Card Statement')||(typeof r.key==='string'&&r.key.indexOf('CB|')===0);
if(!isStmt)return null;
// key form: CB|<card>|<YYYY-MM>
var parts=(r.key||'').split('|');if(parts.length<3)return null;
var card=parts[1],mk=(parts[2]||'').split('::')[0];if(!/^\d{4}-\d{2}$/.test(mk))return null;
if(!_histKidsCache)_histKidsCache={};
var ck=card+'::'+mk;if(_histKidsCache[ck]!==undefined)return _histKidsCache[ck];
var y=parseInt(mk.split('-')[0]),mo=parseInt(mk.split('-')[1])-1;
// Enumerate a window covering that whole month (statement due = payment_day that month).
var f=new Date(y,mo-1,1),t=new Date(y,mo+2,0);
var occ=billOccurrences(f,t);
var _wantKey='CB|'+card+'|'+mk;var stmt=occ.find(function(o){if(o.kind!=='Card Statement'||o.card!==card)return false;var ok=(typeof o.key==='string')?o.key.split('::')[0]:'';return ok===_wantKey||(o._cardPeriod===mk);});
var kids=(stmt&&stmt.children)?stmt.children:null;
if(!_histPdfCache)_histPdfCache={};
_histPdfCache[ck]=!!(stmt&&stmt._pdfDriven);
_histKidsCache[ck]=kids;return kids;
}catch(e){return null;}
}
function _histStmtIsPdf(r){
try{
if(!r)return false;
var isStmt=(r.kind==='Card Statement')||(typeof r.key==='string'&&r.key.indexOf('CB|')===0);
if(!isStmt)return false;
var parts=(r.key||'').split('|');if(parts.length<3)return false;
var card=parts[1],mk=(parts[2]||'').split('::')[0];
if(_histKidsCache===undefined||!_histKidsCache[card+'::'+mk]){ _histStmtChildren(r); } // populate cache
return !!(_histPdfCache&&_histPdfCache[card+'::'+mk]);
}catch(e){return false;}
}
function renderBillReminder(){
var el=document.getElementById('billreminder-content');if(!el)return;
if(!D){el.innerHTML='<p class="text-muted">No data.</p>';return;}
// v322 one-time migration (user-locked Oct 13 2026): stamp per-bill period_rule for utility bills so
// usage-period is a STORED setting (water bill lands in its OWN usage month -> 'same'; electricity lands
// the month AFTER usage -> 'prev'). Fixes the water forecast being wrongly dropped by usage-period dedup.
// Idempotent; only fills utility bills that have no period_rule yet. Non-utility bills default 'same'
// (bill month = period month) which matches their prior behavior.
if(D && !D._period_rule_bills_migrated){
  var _f=function(arr){ (D[arr]||[]).forEach(function(b){ if(b && (b.period_rule!=='prev'&&b.period_rule!=='same')){ b.period_rule=(b.util_link==='electric')?'prev':'same'; } }); };
  _f('monthly'); _f('yearly');
  D._period_rule_bills_migrated=true;
  try{if(typeof saveD==='function')saveD();}catch(_e){}
}
var today=_billToday();
var back=new Date(today.getTime()-365*86400000); // 1y back for overdue+history
var horizon=new Date(today.getTime()+BILL_WINDOW_UPCOMING*86400000);
// Standard today-relative window drives the KPI cards.
var occStd=billOccurrences(back,horizon);
// The list uses a wider window when a Year/Month/Day filter is active so
// future (or older) periods outside the 30-day horizon are still listed.
var occ=occStd;
if(_billDateActive()){
var loY,hiY;
if(_billYear!==''){loY=hiY=parseInt(_billYear);}
else{loY=today.getFullYear()-2;hiY=today.getFullYear()+3;}
var rangeFrom=new Date(loY,0,1);
var rangeTo=new Date(hiY,11,31);
// keep at least the overdue lookback so paid/overdue items still show
if(rangeFrom>back)rangeFrom=back;
occ=billOccurrences(rangeFrom,rangeTo);
}

// KPI counts (exclude far-future beyond upcoming window; count from today back for overdue)
var cDue=0,cToday=0,cUpcoming=0,cOverdue=0,cPaid=0,amtDue=0,amtToday=0,amtUpcoming=0,amtOverdue=0;
var cRecv=0,amtRecv=0;// income receivables not yet received
occStd.forEach(function(o){if(o._surfaced)return;
// Income receivables are counted separately (not mixed into expense KPIs/amounts).
if(o._income){var ist=billStatus(o,today);if(ist!=='paid'&&ist!=='auto_paid'){cRecv++;amtRecv+=o.amount;}return;}
var st=billStatus(o,today);var disp=_billDisp(o,today);
if(disp==='due_today'){cToday++;amtToday+=o.amount}
else if(st==='due'){cDue++;amtDue+=o.amount}
else if(st==='upcoming'){cUpcoming++;amtUpcoming+=o.amount}
else if(st==='overdue'){cOverdue++;amtOverdue+=o.amount}
else if(st==='paid'&&o.due>=today){cPaid++}
else if(st==='auto_paid'){cPaid++}});

var h='';
h+='<div id="billreminder-period" style="margin-bottom:10px"></div>';
h+='<div class="kpi-grid" style="margin-bottom:12px">';
h+='<div class="kpi" style="border-left:3px solid var(--error)"><div class="kpi-label">\u26a0\ufe0f Overdue</div><div class="kpi-val text-error">'+cOverdue+'</div><div class="kpi-note">\u0e3f'+fmt(amtOverdue)+'</div></div>';
h+='<div class="kpi" style="border-left:3px solid #dc2626"><div class="kpi-label">\ud83d\udccc Due today</div><div class="kpi-val" style="color:#dc2626">'+cToday+'</div><div class="kpi-note">\u0e3f'+fmt(amtToday)+'</div></div>';
h+='<div class="kpi" style="border-left:3px solid var(--warning)"><div class="kpi-label">\ud83d\udd14 Due soon (\u2264'+((D&&parseInt(D.due_soon_days))||BILL_WINDOW_DUE)+'d)</div><div class="kpi-val text-warning">'+cDue+'</div><div class="kpi-note">\u0e3f'+fmt(amtDue)+'</div></div>';
h+='<div class="kpi" style="border-left:3px solid var(--primary)"><div class="kpi-label">\ud83d\udcc5 Upcoming (\u2264'+BILL_WINDOW_UPCOMING+'d)</div><div class="kpi-val text-primary">'+cUpcoming+'</div><div class="kpi-note">\u0e3f'+fmt(amtUpcoming)+'</div></div>';
h+='<div class="kpi" style="border-left:3px solid var(--success)"><div class="kpi-label">\u2705 Paid (upcoming window)</div><div class="kpi-val text-success">'+cPaid+'</div></div>';
if(cRecv>0)h+='<div class="kpi" style="border-left:3px solid #10b981"><div class="kpi-label">\ud83d\udcb0 To receive</div><div class="kpi-val" style="color:#10b981">'+cRecv+'</div><div class="kpi-note" style="color:#10b981">+\u0e3f'+fmt(amtRecv)+'</div></div>';
h+='</div>';

// Filter chips + actions
var chips=[['overdue','\u26a0\ufe0f Overdue'],['today','\ud83d\udccc Due today'],['due','\ud83d\udd14 Due soon'],['upcoming','\ud83d\udcc5 Upcoming'],['manual','\u270b Manual only'],['unpaid','\ud83e\uddfe All unpaid'],['paid','\u2705 Paid'],['all','All']];
if(cRecv>0)chips.splice(7,0,['receivable','\ud83d\udcb0 To receive']);
h+='<div class="card"><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px">';
chips.forEach(function(c){var on=_billFilter===c[0];
h+='<button class="btn '+(on?'btn-primary':'btn-ghost')+'" style="font-size:10px;padding:3px 10px" onclick="setBillFilter(\''+c[0]+'\')">'+c[1]+'</button>';});
h+='<span style="flex:1"></span>';
// (removed) dead 'Group card charges' checkbox — consolidation is always-on via D.consolidate_card_bills (v169)

h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="markAllDuePaid()"><i class="fa-solid fa-check-double"></i> Mark all due paid</button>';
h+='</div>';

// Date-range filter bar (Year / Month / Day)
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Years available across occurrences (plus current year), sorted
var yrSet={};occ.forEach(function(o){yrSet[o.due.getFullYear()]=1});yrSet[today.getFullYear()]=1;
var yrs=Object.keys(yrSet).map(Number).sort(function(a,b){return a-b});
h+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;padding-top:2px;border-top:1px solid var(--border2)">';
h+='<span style="font-size:10px;color:var(--text3)"><i class="fa-solid fa-calendar-days" style="margin-right:3px"></i>Date:</span>';
// Prev month
h+='<button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" title="Previous month" onclick="billStepMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>';
// Year
h+='<select class="sel" style="font-size:10px;padding:2px 6px" onchange="setBillDatePart(\'year\',this.value)"><option value="">Any year</option>';
yrs.forEach(function(y){h+='<option value="'+y+'"'+(String(_billYear)===String(y)?' selected':'')+'>'+y+'</option>'});
h+='</select>';
// Month (enabled once a year chosen OR always allow; disabled only affects nothing)
h+='<select class="sel" style="font-size:10px;padding:2px 6px"'+(_billYear===''?'':'')+' onchange="setBillDatePart(\'month\',this.value)"><option value="">Any month</option>';
MON.forEach(function(mn,mi){h+='<option value="'+(mi+1)+'"'+(String(_billMonth)===String(mi+1)?' selected':'')+'>'+mn+'</option>'});
h+='</select>';
// Day
h+='<select class="sel" style="font-size:10px;padding:2px 6px" onchange="setBillDatePart(\'day\',this.value)"><option value="">Any day</option>';
for(var _d=1;_d<=31;_d++){h+='<option value="'+_d+'"'+(String(_billDay)===String(_d)?' selected':'')+'>'+_d+'</option>'}
h+='</select>';
// Next month
h+='<button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" title="Next month" onclick="billStepMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>';
if(_billDateActive())h+='<button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="clearBillDate()"><i class="fa-solid fa-xmark"></i> Clear date</button>';
h+='</div>';

// Build filtered list
var dateOn=_billDateActive();
var rows=occ.filter(function(o){var st=billStatus(o,today);
// Status filter — ALWAYS applied so it combines with the date-period filter below.
// (When a date range is active, 'all' still shows every occurrence in that period, incl future.)
if(_billFilter==='receivable'){if(!o._income)return false;if(o.paid||st==='auto_paid')return false;}
else if(o._income&&(_billFilter==='manual'||_billFilter==='paid')){return false;}// income not an expense-manual/paid row
else if(_billFilter==='all'){if(!dateOn&&st==='future')return false;}
else if(_billFilter==='today'){if(_billDisp(o,today)!=='due_today')return false;}
else if(_billFilter==='due'){if(!(st==='due'||st==='overdue'))return false;}
else if(_billFilter==='overdue'){if(st!=='overdue')return false;}
else if(_billFilter==='upcoming'){if(st!=='upcoming')return false;}
else if(_billFilter==='paid'){if(!(o.paid||st==='auto_paid'))return false;}
else if(_billFilter==='manual'){if(o.auto_pay)return false;if(!dateOn&&!(st==='due'||st==='overdue'||st==='upcoming'))return false;}
else if(_billFilter==='unpaid'){if(o.paid||st==='auto_paid')return false;if(!dateOn&&st==='future')return false;}
// Date-range filter (Year / Month / Day)
if(_billYear!==''&&o.due.getFullYear()!==parseInt(_billYear))return false;
if(_billMonth!==''&&(o.due.getMonth()+1)!==parseInt(_billMonth))return false;
if(_billDay!==''&&o.due.getDate()!==parseInt(_billDay))return false;
return true;});

// Sort rows. Default 'urgency' groups by status band then due date; header clicks sort by column.
var _eDueOf=function(o){return o.orig_due||o.due;};var _cmpDue=function(a,b){return (_eDueOf(a)-_eDueOf(b))||0;};
rows.sort(function(a,b){
var r=0;
if(_brSort==='urgency'){r=_brUrgencyRank(a,today)-_brUrgencyRank(b,today);if(r===0)r=_cmpDue(a,b);if(r===0)r=(a.auto_pay?1:0)-(b.auto_pay?1:0);return r;}
if(_brSort==='name')r=(a.name||'').localeCompare(b.name||'');
else if(_brSort==='type')r=(a.type||'').localeCompare(b.type||'');
else if(_brSort==='amount')r=(a.amount||0)-(b.amount||0);
else if(_brSort==='due')r=_cmpDue(a,b);
else if(_brSort==='deadline')r=((a.deadline?a.deadline.getTime():Infinity)-(b.deadline?b.deadline.getTime():Infinity));
else if(_brSort==='status')r=_brUrgencyRank(a,today)-_brUrgencyRank(b,today);
else if(_brSort==='method')r=((a.auto_pay?1:0)-(b.auto_pay?1:0));
if(r===0)r=_cmpDue(a,b);
return _brAsc?r:-r;
});
// Capture the exact visible set so "Mark filtered period paid" matches what's shown.
window._billVisible=rows;

// Active date-filter summary + visible total
if(dateOn){
var MON2=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var lblParts=[];
if(_billDay!=='')lblParts.push('Day '+_billDay);
if(_billMonth!=='')lblParts.push(MON2[parseInt(_billMonth)-1]);
if(_billYear!=='')lblParts.push(_billYear);
var visTotal=rows.reduce(function(s,o){return s+((o._surfaced||o._income)?0:o.amount)},0);
var unpaidCount=rows.filter(function(o){return !o.paid;}).length;
h+='<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px">';
h+='<span style="font-size:10px;color:var(--text2)"><i class="fa-solid fa-filter" style="margin-right:3px"></i>Showing <b>'+rows.length+'</b> bill(s) for <b>'+esc(lblParts.join(' '))+'</b> \u2014 total \u0e3f'+fmt(visTotal)+'</span>';
if(unpaidCount)h+='<button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="markFilteredPaid()"><i class="fa-solid fa-check-double"></i> Mark this period paid ('+unpaidCount+')</button>';
h+='</div>';
}
if(!rows.length){
h+='<p class="text-muted" style="font-size:11px;padding:10px 0">No bills match this filter'+(dateOn?' for the selected date':'')+'. \ud83c\udf89</p>';
}else{
// Bulk action bar
h+='<div id="br-bulk" style="display:none;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap">';
h+='<span style="font-size:10px;color:var(--text2)"><b id="br-sel-count">0</b> selected</span>';
h+='<span style="font-size:10px;color:var(--text2);margin-left:4px">Paid on:</span><input type="date" id="br-paid-date" value="'+_billISO(today)+'" style="font-size:10px;padding:2px 6px" title="Payment date applied when you click Mark Paid">';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="brBulkPaid()"><i class="fa-solid fa-check" style="color:var(--success)"></i> Mark Paid</button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="brBulkUnpaid()"><i class="fa-solid fa-rotate-left" style="color:var(--warning)"></i> Mark Unpaid</button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px;color:var(--error)" onclick="brBulkDelete()"><i class="fa-solid fa-trash"></i> Clear payment status</button>';
h+='</div>';
var _brArrow=function(col){return _brSort===col?(_brAsc?' \u25b2':' \u25bc'):'';};
h+='<table class="tbl" style="font-size:11px"><thead><tr><th style="width:28px"><input type="checkbox" id="br-sel-all" onchange="brToggleAll(this.checked)"></th>'+
'<th style="cursor:pointer" onclick="setBillSort(\'name\')" title="Sort by bill name">Bill'+_brArrow('name')+'</th>'+
'<th style="cursor:pointer" onclick="setBillSort(\'type\')">Type'+_brArrow('type')+'</th>'+
'<th style="cursor:pointer" onclick="setBillSort(\'method\')">Pay Method'+_brArrow('method')+'</th>'+
'<th class="r" style="cursor:pointer" onclick="setBillSort(\'amount\')">Amount'+_brArrow('amount')+'</th>'+
'<th style="cursor:pointer" onclick="setBillSort(\'due\')">Due'+_brArrow('due')+'</th>'+
'<th style="cursor:pointer" onclick="setBillSort(\'deadline\')" title="Payment deadline (last day before penalty)">Deadline'+_brArrow('deadline')+'</th>'+
'<th style="cursor:pointer" onclick="setBillSort(\'status\')">Status'+_brArrow('status')+'</th></tr></thead><tbody>';
rows.forEach(function(o,_ri){
var st=billStatus(o,today);
var _disp=_billDisp(o,today);
var stBadge=st==='overdue'?'<span style="color:var(--error);font-weight:600">\u26a0\ufe0f Overdue</span>':
_disp==='due_today'?(o.auto_pay?'<span style="color:var(--text3)" title="Auto-charged today \u2014 no action needed"><i class="fa-solid fa-robot"></i> Auto today</span>':'<span style="color:#dc2626;font-weight:700">\ud83d\udccc Due today</span>'):
st==='due'?'<span style="color:var(--warning);font-weight:600">\ud83d\udd14 Due soon</span>':
st==='upcoming'?'<span style="color:var(--primary)">\ud83d\udcc5 Upcoming</span>':
st==='auto_paid'?'<span style="color:var(--success)" title="Auto-charged \u2014 assumed paid automatically on its date">\u2705 Auto-paid</span>':
st==='paid'?'<span style="color:var(--success)">\u2705 Paid</span>':'';
// Deadline-aware second badge (penalty risk), shown under the primary status
var _dfl=deadlineFlag(o,today);
if(_dfl)stBadge+='<br><span style="font-size:9px;font-weight:700;color:'+(_dfl.state==='past'?'var(--error)':'var(--warning)')+'" title="Payment deadline '+(_dfl.state==='past'?'passed '+_dfl.days+' day(s) ago':'in '+_dfl.days+' day(s)')+'">'+(_dfl.state==='past'?'\u26d4 Past deadline':'\u23f0 Deadline '+(_dfl.days===0?'today':_dfl.days+'d'))+'</span>';
var diff=Math.round(((o.orig_due||o.due)-today)/86400000);
var dueRel=o.paid?'':(diff===0?' (today)':diff>0?' (in '+diff+'d)':' ('+(-diff)+'d ago)');
var method=o.auto_pay?
'<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:var(--primary);color:#fff" title="Auto-charged to '+esc(_cardDisp(o.card))+'"><i class="fa-solid fa-robot"></i> Auto</span>':
'<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:var(--warning);color:#fff" title="You must pay this manually">\u270b Manual</span>';
var cardTxt=o.card&&o.card!=='Cash/Direct'?' <span style="font-size:9px;color:var(--text3)">'+esc(_cardDisp(o.card))+'</span>':'';
// Highlight rows needing attention with a subtle tint + left accent bar (inset box-shadow keeps table layout intact).
// Overdue = red; Manual Due today = amber. Auto due-today is intentionally NOT highlighted (no action needed).
var rowStyle=st==='overdue'?'background:rgba(220,38,38,0.06);box-shadow:inset 3px 0 0 var(--error)':((_disp==='due_today'&&!o.auto_pay)?'background:rgba(245,158,11,0.08);box-shadow:inset 3px 0 0 var(--warning)':((o.paid||st==='auto_paid')?'opacity:.6':''));
var _hasKids=o.children&&o.children.length;
var _gid=_hasKids?('brk_'+o.fullKey.replace(/[^a-zA-Z0-9]/g,'_')):'';
h+='<tr data-bkey="'+esc(o.fullKey)+'" style="'+rowStyle+'">'+
'<td class="r"><input type="checkbox" class="br-chk" data-key="'+esc(o.fullKey)+'" data-amt="'+o.amount+'" data-due="'+_billISO(o.due)+'" data-type="'+esc(o.type||'')+'" data-card="'+esc(o.card||'')+'" data-auto="'+(o.auto_pay?'1':'0')+'" data-paid="'+(o.paid?'1':'0')+'" onchange="brUpdateSelCount()"></td>'+
'<td>'+(_hasKids?'<span style="cursor:pointer;user-select:none;color:var(--text3);margin-right:4px" onclick="var r=document.querySelectorAll(\'.'+_gid+'\');var open=r.length&&r[0].style.display!==\'none\';for(var _i=0;_i<r.length;_i++)r[_i].style.display=open?\'none\':\'\';this.textContent=open?\'\u25b6\':\'\u25bc\'">\u25b6</span>':'')+_billIcon(o)+' '+esc(o.name)+_perBadge(_rowPer(o))+(o.info?' <span style="font-size:8px;color:var(--text3)">'+esc(o.info)+'</span>':'')+(o._surfaced?' <span style="font-size:8px;color:var(--primary);background:var(--primary-bg,rgba(59,130,246,0.1));padding:1px 5px;border-radius:4px" title="This charge is already included in the '+esc(_cardDisp(o._inStmtCard))+' statement total below — surfaced here because you pay it manually">↳ in '+esc(_cardDisp(o._inStmtCard))+' statement</span>':'')+((!o.children||!o.children.length)&&o.kind&&o.kind!=='Card Statement'&&!o._surfaced?' <button title="Delete this bill from your setup" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:9px;padding:0 3px" onclick="event.stopPropagation();brDeleteSource('+_ri+')"><i class="fa-solid fa-trash"></i></button>':'')+'</td>'+
'<td>'+esc(typeof typeName==='function'?typeName(o.type):o.type)+'</td>'+
'<td>'+method+cardTxt+'</td>'+
'<td class="r" style="font-family:var(--mono)'+(o._income?';color:#10b981;font-weight:600':'')+'">'+(o._income?'+':'')+'\u0e3f'+fmt(o.amount)+'</td>'+
'<td style="white-space:nowrap">'+fmtDate(_billISO((o._surfaced&&o.orig_due)?o.orig_due:o.due))+'<span style="font-size:8px;color:var(--text3)">'+dueRel+'</span></td>'+
'<td style="white-space:nowrap">'+(o.deadline?('<span style="'+(_dfl?(_dfl.state==='past'?'color:var(--error);font-weight:600':'color:var(--warning);font-weight:600'):'')+'">'+fmtDate(_billISO(o.deadline))+'</span>'):'<span style="color:var(--text3)">\u2014</span>')+'</td>'+
'<td>'+stBadge+
(o.paid?'<div style="margin-top:3px"><span style="font-size:8px;color:var(--text3)">'+(o._income?'received ':'paid ')+(D.bill_payments&&D.bill_payments[o.fullKey]&&D.bill_payments[o.fullKey].paid_date?fmtDate(D.bill_payments[o.fullKey].paid_date):'')+'</span> <button class="btn btn-ghost" style="font-size:8px;padding:1px 6px" onclick="toggleBillPaid(\''+o.fullKey.replace(/'/g,"\\'")+'\',0,false,\'\',\''+((o._utilUtility||'')).replace(/'/g,"\\'")+'\',\''+(o._utilPeriod||'')+'\')"><i class="fa-solid fa-rotate-left"></i> Unmark</button></div>'
:((o.auto_pay||st==='auto_paid')&&!(D&&D.autopay_cancelled&&D.autopay_cancelled[o.fullKey]))?'<div style="margin-top:3px"><span style="font-size:8px;color:var(--text3)">'+(st==='auto_paid'?'charged automatically \u00b7 no action needed':'will be auto-charged \u00b7 no action needed')+'</span></div>'
:'<div style="margin-top:3px;display:flex;gap:3px;align-items:center"><input type="date" id="brpd_'+o.fullKey.replace(/[^a-zA-Z0-9]/g,'_')+'" value="" style="font-size:8px;padding:1px 3px;width:104px" title="'+(o._income?'Received date':'Payment date')+'"><button class="btn '+(o._income?'btn-ghost" style="font-size:8px;padding:2px 7px;background:#10b981;color:#fff"':'btn-primary" style="font-size:8px;padding:2px 7px"')+' onclick="markRowPaid(\''+o.fullKey.replace(/'/g,"\\'")+'\','+o.amount+',\''+_billISO(o.orig_due||o.due)+'\',\''+(o.type||'').replace(/'/g,"\\'")+'\',\''+(o.card||'').replace(/'/g,"\\'")+'\','+(o.auto_pay?'true':'false')+',\''+((o._utilUtility||'')).replace(/'/g,"\\'")+'\',\''+(o._utilPeriod||'')+'\',\''+(o.card_period||'')+'\')"><i class="fa-solid fa-'+(o._income?'hand-holding-dollar':'check')+'"></i> '+(o._income?'Received':'Pay')+'</button></div>')+
(( o.kind && o.kind!=='Card Statement' && !o._income )?('<div style="margin-top:3px"><button title="\u0e41\u0e01\u0e49\u0e44\u0e02\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49 (card/amount/due/paid)" style="background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text3);font-size:9px;padding:1px 6px" onclick="occEditOverride(\''+(o.key||'').replace(/'/g,"\\'")+'\',\''+_rowPer(o)+'\',\''+(o.fullKey||'').replace(/'/g,"\\'")+'\',\''+(o.card||'').replace(/'/g,"\\'")+'\','+(o.amount||0)+',\''+_billISO(o.orig_due||o.due)+'\')"><i class=\"fa-solid fa-pen\"></i> \u0e41\u0e01\u0e49\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49'+((D.occ_overrides&&D.occ_overrides[o.key+'::'+_rowPer(o)])?' \u2022':'')+'</button></div>'):'')+
'</td></tr>';
// Statement detail: list the underlying charges as greyed, non-actionable rows
if(o.children&&o.children.length){
o.children.slice().sort(function(a,b){return a.due-b.due}).forEach(function(ch){
// v310: show the child's PAID DATE when paid. Paid record keyed by child CC period (I|/M|name::period).
var _chcp=(typeof _cardOccPeriod==='function')?_cardOccPeriod(ch):null;
var _chrec=_chcp?((D.bill_payments||{})[ch.key+'::'+_chcp]):null;
var _chpaid=!!(_chrec&&_chrec.paid); var _chpd=_chpaid&&_chrec.paid_date?_chrec.paid_date:'';
h+='<tr class="'+_gid+'" style="opacity:.5;font-size:10px;display:none"><td></td>'+
'<td style="padding-left:16px">↳ '+esc(ch.name)+(ch.info?' <span style="font-size:8px;color:var(--text3)">'+esc(ch.info)+'</span>':'')+_perBadge(_svcPer(ch))+'</td>'+
'<td>'+esc(ch.type||'')+'</td><td>'+(_chpaid?'<span style="font-size:8px;color:var(--success)">✓ paid</span>':'<span style="font-size:8px;color:var(--text3)">on statement</span>')+'</td>'+
'<td class="r" style="font-family:var(--mono);color:var(--text3)">฿'+fmt(ch.amount)+'</td>'+
'<td style="white-space:nowrap;color:var(--text3)">'+fmtDate(_billISO(ch.orig_due||ch.due))+'</td><td style="white-space:nowrap;font-size:9px;color:var(--success)">'+(_chpd?'✓ '+fmtDate(_chpd):'')+'</td><td></td></tr>';});
// Show the keyed-in EXTRA spend as its own detail line (statement.amount = children sum + extra).
var _chSum=o.children.reduce(function(s,ch){return s+(ch.amount||0);},0);
var _exAmt=Math.round(((o.amount||0)-_chSum)*100)/100;
if(_exAmt>0&&!o._pdfDriven){h+='<tr class="'+_gid+'" style="opacity:.6;font-size:10px;display:none"><td></td>'+
'<td style="padding-left:16px">\u21b3 <i class="fa-solid fa-plus" style="font-size:8px;color:var(--primary)"></i> Extra spend (keyed in)</td>'+
'<td><span style="font-size:8px;color:var(--text3)">Manual</span></td><td><span style="font-size:8px;color:var(--primary)">added to statement</span></td>'+
'<td class="r" style="font-family:var(--mono);color:var(--primary)">\u0e3f'+fmt(_exAmt)+'</td>'+
'<td></td><td></td><td></td></tr>';}
// BREAKDOWN (real PDF statement): the gap between the PDF total and the auto-detected charges
// (installment + recurring) is "other spend" the bank billed that we don't itemise. Show it so the
// PDF total reconciles: amount_due = installment/recurring children + other spend.
else if(_exAmt>0.009&&o._pdfDriven&&_chSum>0.01){h+='<tr class="'+_gid+'" style="opacity:.7;font-size:10px;display:none"><td></td>'+
'<td style="padding-left:16px">\u21b3 <i class="fa-solid fa-receipt" style="font-size:8px;color:var(--text3)"></i> \u0e2a\u0e48\u0e27\u0e19\u0e17\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e37\u0e2d (other spend)</td>'+
'<td><span style="font-size:8px;color:var(--text3)">from statement</span></td><td><span style="font-size:8px;color:var(--text3)">\u0e22\u0e2d\u0e14\u0e1a\u0e34\u0e25 \u2212 \u0e1c\u0e48\u0e2d\u0e19/recurring</span></td>'+
'<td class="r" style="font-family:var(--mono);color:var(--text2)">\u0e3f'+fmt(_exAmt)+'</td>'+
'<td></td><td></td><td></td></tr>';}}
});
h+='</tbody></table>';
}
h+='</div>';

// ===== Payment history =====
var hist=Object.keys(D.bill_payments||{}).map(function(k){var r=D.bill_payments[k];
var nm=k.split('::')[0].split('|')[1]||k;
// Due date comes from the record (r.due, full YYYY-MM-DD). Fall back to the key's period
// component (now YYYY-MM, or legacy YYYY-MM-DD) for entries saved before r.due existed.
// Type / card / auto_pay come from the record when present (saved from v110); older
// entries have none — fall back to deriving kind from the key prefix.
var _pfx=(k.split('::')[0].split('|')[0]||'');
var _kindMap={M:'Monthly',Y:'Yearly',I:'Installment',P:'Planned',CB:'Card Statement'};
// v291: installment sequence "(x/y)" is encoded in the ledger key's 3rd segment as "<x>of<y>"
// (e.g. I|Sony Bravia|2of10::2026-09). Derive it straight from the key so Payment History rows
// AND folded statement children always show the period — independent of recon name-matching
// (the paid record itself never stored `info`).
var _ex=(k.split('::')[0].split('|')[2]||'');var _sm=/^(\d+)of(\d+)$/.exec(_ex);
var _seq=(_pfx==='I'&&_sm)?('('+_sm[1]+'/'+_sm[2]+')'):'';
// v324: period for the hist row = stored period field, else the ledger KEY suffix (which already
// encodes the filed period, e.g. M|iCloud::2026-09). This makes the period badge show for older
// records that never stored a `period` field, and feeds the fold match a correct period.
var _ksuf2=(k.indexOf('::')>=0)?k.split('::')[1]:'';
var _recPeriod=r.period||((_pfx==='CB')?(k.split('::')[0].split('|')[2]||''):((/^\d{4}-\d{2}$/.test(_ksuf2))?_ksuf2:''));
var _dispNm=nm; if(_pfx==='CB'){var _cnm=_cardDisp(nm); _dispNm=(_cnm&&_cnm!==nm?_cnm:nm)+(_recPeriod?(' '+_recPeriod):'');} return{key:k,name:_dispNm,paid_date:r.paid_date||'',amount:r.paid_amount||0,due:r.due||k.split('::')[1]||'',type:r.type||'',card:r.card||'',auto_pay:r.auto_pay,kind:_kindMap[_pfx]||'',info:_seq,period:_recPeriod,orig_due:r.orig_due||''};})
;
// Utility dedup for Payment History: a util-linked Monthly recurring (Electricity/Water) may have
// its OWN stale paid-ledger entry for a month that ALSO has a real utility bill (auto-synced Planned
// 'ค่าไฟ/ค่าน้ำ YYYY-MM'). Both come from D.bill_payments, so both show. Drop the recurring's ledger
// row for any month where the real utility bill lands (keep the real one). Mirrors the billOccurrences skip.
(function(){
  // landing months per utility, from the auto-synced Planned rows
  var ua={electric:{},water:{}};
  (D.planned||[]).forEach(function(pp){if(pp&&pp._fromUtility&&pp._utilUtility){var ds=(pp.date||'');var lm=ds.length>=7?ds.slice(0,7):pp._utilPeriod;if(lm)ua[pp._utilUtility][lm]=true;}});
  // which Monthly recurring names are util-linked (by util_link, else name regex)
  function urType(nm){
    var m=(D.monthly||[]).filter(function(x){return (x.name||'')===nm;})[0];
    if(m){if(m.util_link==='electric'||m.util_link==='water')return m.util_link;if(m.util_link==='')return null;}
    if(/\u0e44\u0e1f|electric|\u0e01\u0e32\u0e23\u0e44\u0e1f\u0e1f\u0e49\u0e32|mea/i.test(nm))return 'electric';
    if(/\u0e19\u0e49\u0e33|water|\u0e1b\u0e23\u0e30\u0e1b\u0e32|mwa/i.test(nm))return 'water';
    return null;
  }
  hist=hist.filter(function(r){
    if(r.kind!=='Monthly')return true;              // only recurring ledger rows are at risk
    var ut=urType(r.name);if(!ut)return true;        // not a utility recurring
    var mk=(r.due||r.paid_date||'').slice(0,7);       // the month this recurring entry represents
    if(mk&&ua[ut]&&ua[ut][mk])return false;           // real bill exists that month -> drop recurring
    return true;
  });
})();
// v169: Fold paid card-charge records under their paid statement (same card + same paid-month).
// The individual charges then render as expandable children of the statement instead of as
// separate top-level rows. Statements keep their own row; a charge with no matching paid
// statement stays top-level (unchanged).
(function(){
var stmts={};// key: cardTrimmed::YYYY-MM(statement period mk) -> statement record
function _ncard(s){return (s||'').trim().toLowerCase();}
hist.forEach(function(r){
if(r.kind==='Card Statement'&&typeof r.key==='string'&&r.key.indexOf('CB|')===0){
var pp=r.key.split('|');if(pp.length<3)return;var mk=(pp[2]||'').split('::')[0];if(!/^\d{4}-\d{2}$/.test(mk))return;
stmts[_ncard(pp[1])+'::'+mk]=r;r._paidKids=[];
}});
if(Object.keys(stmts).length){
var keep=[];
hist.forEach(function(r){
if(r.kind==='Card Statement'){keep.push(r);return;}
// candidate charge: has a card, matches a paid statement whose PERIOD (mk) equals the
// charge's DUE month. Statement key CB|card|YYYY-MM uses the charges' due month as mk,
// so we match on r.due's month (NOT paid_date, which is when it was marked paid).
var cd=r.card||'';if(cd&&cd!=='Cash/Direct'&&r.kind!=='Card Statement'&&!r._fromCard){
var ncd=_ncard(cd);
var dm=(r.due||'').slice(0,7);// charge due month (shifted pay month — fallback only)
var pmo=(r.paid_date||'').slice(0,7);// charge paid month (fallback)
var rnm=(''+(r.name||'')).trim().toLowerCase();
// v298: fold by the REAL statement PERIOD from card config (user-confirmed, Oct 11 2026).
// For PDF-managed cards, _recCardPeriod(r) derives the statement period from the card's
// statement_day and the charge's own due date — the same rule the forecast/grouping uses
// (_cardOccPeriod) — so a shifted due/paid month no longer folds the charge under the wrong
// statement. We match that period FIRST, then fall back to the charge's due month and paid
// month (which still covers non-PDF cards and any record missing a parseable due date). This
// keeps v297's "always show the folded charge" guarantee while fixing the wrong-period folding.
// v324 (user Oct 13 2026): period source priority = stored period field, THEN the ledger key's
// suffix (M|name::YYYY-MM / CB|card|p::YYYY-MM — the period the record was filed under), THEN
// due/paid month. Older paid records (e.g. iCloud/Netflix) never stored a `period` field but their
// KEY suffix already carries the correct statement period, so reading it folds them under the right
// card statement without guessing. Master config stays the single source for the live occurrence.
var _ksuf=(typeof r.key==='string'&&r.key.indexOf('::')>=0)?r.key.split('::')[1]:'';
// v336 (user-locked fold rule Oct 17 2026): a card-linked PAID charge folds into the statement
// period whose date-range CONTAINS its real paid_date, on the card it was paid with — NOT the
// stored period field / key suffix (which reflect the bill's own cut month, so a late payment
// landed under the wrong, already-closed statement). Compute that period from the paying card's
// statement_day/period_rule via _periodForDateOnCard. Fall back to the stored period / key suffix
// / due / paid month only when paid_date or the card period can't be resolved (legacy records).
var _payCard=r.card||cd;
// v337: compute the fold period from paid_date INLINE (the _periodForDateOnCard helper lives in a
// different closure and isn't in scope here). Same rule: statement period on the paying card whose
// cutoff range contains paid_date, honoring the card's period_rule (fallback S<=15 heuristic).
var _foldPer='';
(function(){
  var _pc=(D.cards||[]).find(function(x){return x.id===_payCard||x.name===_payCard;});
  if(!_pc||!_pc.statement_day)return;
  // v340 (user-locked Oct 17 2026): fold period source date.
  //  - INSTALLMENT (kind 'Installment', key 'I|...'): ALWAYS the CUT date (orig_due) — the day the
  //    purchase was swiped. Each installment period posts on its own swipe date into whatever card
  //    statement period contains that date. NEVER paid_date, and NEVER trust auto_pay (that field is
  //    unreliable in the data — some installments are stored auto_pay:false).
  //  - Other card charges: auto-debit (auto_pay) posts on its charge date (orig_due); a manually-paid
  //    charge (e.g. AIS paid by hand) folds by its paid_date.
  var _isInst=(typeof r.key==='string' && r.key.indexOf('I|')===0) || r.kind==='Installment';
  var _srcDate=(_isInst? (r.orig_due||r.due)
               : (r.auto_pay? (r.orig_due||r.due) : (r.paid_date||r.orig_due||r.due)))||'';
  var _mm=/^(\d{4})-(\d{2})-(\d{2})/.exec(_srcDate); if(!_mm)return;
  var _S=parseInt(_pc.statement_day,10)||1, _cy=+_mm[1], _cm=(+_mm[2])-1, _pd=+_mm[3];
  var _prr=_pc.period_rule;
  var _M=_cm+(_pd>_S?1:0);
  var _shift=(_prr==='prev')?1:(_prr==='same')?0:((_S<=15)?1:0);
  var _per=_M-_shift, _yy=_cy;
  while(_per<0){_per+=12;_yy--;} while(_per>11){_per-=12;_yy++;}
  _foldPer=_yy+'-'+((_per+1)<10?'0':'')+(_per+1);
})();
var rper=(_foldPer&&/^\d{4}-\d{2}$/.test(_foldPer))?_foldPer
        :((r.period&&/^\d{4}-\d{2}$/.test(r.period))?r.period:((/^\d{4}-\d{2}$/.test(_ksuf))?_ksuf:''));
// statements map is keyed by the statement's card token (the id, e.g. 'c8') + period. _payCard is
// that same id, so match on _ncard(_payCard). Keep the original-card key as a fallback.
var ncd2=_ncard(_payCard);
var st=rper?(stmts[ncd2+'::'+rper]||stmts[ncd+'::'+rper]||null):((dm&&stmts[ncd+'::'+dm])||(pmo&&stmts[ncd+'::'+pmo])||null);
if(st){
// v289 (user-reversed v238): charges tied to a PDF-managed card statement are FOLDED under that
// statement's expandable row (not shown flat) so Payment History isn't cluttered
// ("pay/trx ที่ผูกอยู่กับบัตร ให้กรุ๊ปอยู่ในบัตรที่แตกลงมาดูได้ก็พอ"). Toggle _histFoldCard
// (default ON) switches back to the flat '↳ in [card] statement' view. Folding is scoped to
// ALL cards that have a matching paid statement (v289b: user chose to fold every card, not just
// PDF-managed ones — non-PDF statement total = auto-sum of its charges, so no double-count).
r._inStmtCard=r.card;r._surfacedInHist=true;
// Reconstruct the REAL bill due (orig_due) by name-matching the statement's rebuilt children —
// paid records saved before v240 stored the statement-shifted due, so display would show the pay
// date (e.g. 23/10) instead of the bill's own due (e.g. 28/09). New records already store orig_due.
try{if(!/^\d{4}-\d{2}-\d{2}$/.test(r.due)||true){var _rc=_histStmtChildren(st)||[];for(var _i=0;_i<_rc.length;_i++){if(_rc[_i]&&_rc[_i].name===r.name&&_rc[_i].orig_due){r._origDueDisp=(typeof _rc[_i].orig_due==='string')?_rc[_i].orig_due:_billISO(_rc[_i].orig_due);break;}}}}catch(e){}
// keep the statement aware of the paid child too (for its own expand breakdown paid-date).
st._paidKids.push(r);
// Fold (default): toggle ON -> do NOT keep top-level; the charge appears only as an expandable
// child of the statement row. Toggle OFF -> keep it flat with the '↳ in [card] statement' note.
if(_histFoldCard){return;}
keep.push(r);return;
}
// v293 (option A): the charge IS tied to a card but NO paid statement for that card+period exists
// in history yet. With fold ON, HIDE the separate row (a card-linked charge belongs under its
// statement; without one we don't surface it as its own line) — BUT keep it in `hist` flagged
// _hiddenRow so the Grand Total / month subtotal still count the money (its amount is represented
// nowhere else). The render loop skips _hiddenRow rows. Fold OFF keeps the legacy flat row.
// v317: a card-linked charge with NO paid statement for its period is STILL a real paid record
// the user made (e.g. AIS paid individually via ttb while the ttb statement isn't settled yet).
// Hiding it (old option A) made it invisible in History -> user couldn't see it was paid or
// cancel/edit it. Keep it as its own top-level row, flagged so the UI can note it's a standalone
// card charge not yet folded into a statement.
if(_histFoldCard){r._soloCardCharge=true;r._targetPeriod=rper||'';r._targetCard=_payCard||'';keep.push(r);return;}
}
keep.push(r);
});
hist=keep;
}})();
var _histTotalCount=hist.length;
// Month-picker filter — targets paid_date or due date per _histFilterBy
if(_histFYear!==''||_histFMonth!==''){
hist=hist.filter(function(r){var dstr=(_histFilterBy==='due'?r.due:r.paid_date)||'';if(!dstr)return false;var pp=dstr.split('-');var yy=pp[0],mm=parseInt(pp[1]);if(_histFYear!==''&&yy!==String(_histFYear))return false;if(_histFMonth!==''&&mm!==parseInt(_histFMonth))return false;return true;});}
// Type (kind) / Category / Method filters
if(_histFType!=='')hist=hist.filter(function(r){return (r.kind||'')===_histFType;});
if(_histFCat!=='')hist=hist.filter(function(r){return (r.type||'')===_histFCat;});
if(_histFMethod!=='')hist=hist.filter(function(r){return (r.auto_pay?'auto':'manual')===_histFMethod;});
if(_histFCard!=='')hist=hist.filter(function(r){var cd=(r.card&&r.card!=='Cash/Direct')?_cardDisp(r.card):'Cash/Direct';return _histFCard==='Cash/Direct'?(cd==='Cash/Direct'):(cd===_histFCard);});
// Sort comparator per _histSort / _histAsc
var _hcmp=function(a,b){var r;if(_histSort==='name')r=(a.name||'').localeCompare(b.name||'');else if(_histSort==='amount')r=(a.amount||0)-(b.amount||0);else if(_histSort==='due')r=(a.due||'').localeCompare(b.due||'');else if(_histSort==='type')r=(((a.kind||'')+' '+(a.type||'')).trim()).localeCompare(((b.kind||'')+' '+(b.type||'')).trim());else if(_histSort==='method')r=(((a.auto_pay?'0 Auto':'1 Manual')+' '+_cardDisp(a.card||''))).localeCompare(((b.auto_pay?'0 Auto':'1 Manual')+' '+_cardDisp(b.card||'')));else r=(a.paid_date||'').localeCompare(b.paid_date||'');return _histAsc?r:-r;};
hist.sort(_hcmp);
// Section stays open whenever it was open before OR a filter is active (persists across re-renders).
var _histOpen=_histSectionOpen||(_histFYear!==''||_histFMonth!=='');
h+='<div class="card"><h2 style="font-size:12px;cursor:pointer;user-select:none" onclick="toggleHistSection()"><span id="brhist-caret" style="display:inline-block;width:14px">'+(_histOpen?'\u25bc':'\u25b6')+'</span><i class="fa-solid fa-clock-rotate-left"></i> Payment History <span style="font-size:9px;color:var(--text3);font-weight:400">('+hist.length+(hist.length!==_histTotalCount?' of '+_histTotalCount:'')+')</span></h2>';
h+='<div id="brhist-body" style="display:'+(_histOpen?'':'none')+'">';
// Month-picker filter row
var _hMon=['','January','February','March','April','May','June','July','August','September','October','November','December'];
// Year list built from whichever date the filter targets (paid or due).
var _hYears={};Object.keys(D.bill_payments||{}).forEach(function(k){var rr=D.bill_payments[k]||{};var dstr=(_histFilterBy==='due'?rr.due:rr.paid_date)||'';if(dstr)_hYears[dstr.split('-')[0]]=1;});
var _hYrs=Object.keys(_hYears).sort(function(a,b){return parseInt(b)-parseInt(a);}); // newest year first
h+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;font-size:10px">';
h+='<i class="fa-solid fa-filter" style="color:var(--text3)"></i><span style="color:var(--text2)">Filter:</span>';
h+='<select id="hist-f-by" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistFilterBy(this.value)"><option value="due"'+(_histFilterBy==='due'?' selected':'')+'>by Due date</option><option value="paid"'+(_histFilterBy==='paid'?' selected':'')+'>by Paid date</option></select>';
h+='<select id="hist-f-year" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistFilter()"><option value="">All years</option>'+_hYrs.map(function(y){return '<option value="'+y+'"'+(String(_histFYear)===y?' selected':'')+'>'+y+'</option>';}).join('')+'</select>';
h+='<select id="hist-f-month" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistFilter()"><option value="">All months</option>'+_hMon.slice(1).map(function(nm,idx){var mv=idx+1;return '<option value="'+mv+'"'+(String(_histFMonth)===String(mv)?' selected':'')+'>'+nm+'</option>';}).join('')+'</select>';
// Distinct kind / category / method values across ALL paid records (for the dropdowns)
var _kMap={M:'Monthly',Y:'Yearly',I:'Installment',P:'Planned',CB:'Card Statement'};
var _kSet={},_cSet={};
Object.keys(D.bill_payments||{}).forEach(function(k){var rr=D.bill_payments[k]||{};
var kd=_kMap[(k.split('::')[0].split('|')[0]||'')]||'';if(kd)_kSet[kd]=1;
if(rr.type)_cSet[rr.type]=1;});
var _kList=Object.keys(_kSet).sort(),_cList=Object.keys(_cSet).sort();
h+='<select id="hist-f-type" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistTCM()"><option value="">All types</option>'+_kList.map(function(t){return '<option value="'+esc(t)+'"'+(_histFType===t?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select>';
h+='<select id="hist-f-cat" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistTCM()"><option value="">All categories</option>'+_cList.map(function(t){return '<option value="'+esc(t)+'"'+(_histFCat===t?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select>';
h+='<select id="hist-f-method" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistTCM()"><option value="">All methods</option><option value="auto"'+(_histFMethod==='auto'?' selected':'')+'>\ud83e\udd16 Auto</option><option value="manual"'+(_histFMethod==='manual'?' selected':'')+'>\u270b Manual</option></select>';
// Payment-method (card) filter — distinct cards across all paid records + Cash/Direct.
var _cardSet={};Object.keys(D.bill_payments||{}).forEach(function(k){var rr=D.bill_payments[k]||{};var cn=(rr.card&&rr.card!=='')?_cardDisp(rr.card):'Cash/Direct';_cardSet[cn]=1;});
var _cardList=Object.keys(_cardSet).sort(function(a,b){if(a==='Cash/Direct')return 1;if(b==='Cash/Direct')return -1;return a.localeCompare(b);});
h+='<select id="hist-f-card" class="sel" style="font-size:10px;padding:2px 6px" onchange="setHistTCM()"><option value="">All cards</option>'+_cardList.map(function(cn){return '<option value="'+esc(cn)+'"'+(_histFCard===cn?' selected':'')+'>'+esc(cn)+'</option>';}).join('')+'</select>';
if(_histFiltered)h+='<button class="btn btn-ghost" style="font-size:9px;padding:2px 8px" onclick="clearHistFilter()"><i class="fa-solid fa-xmark"></i> Clear</button>';
// v289: fold-under-statement toggle. ON (default) = card charges nest inside their statement row.
h+='<label style="font-size:10px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;margin-left:auto" title="Group charges that belong to a card statement under that statement (expandable) instead of listing them separately"><input type="checkbox" id="hist-fold-card"'+(_histFoldCard?' checked':'')+' onchange="setHistFoldCard(this.checked)"> \u0e23\u0e27\u0e21 trx \u0e44\u0e27\u0e49\u0e43\u0e19\u0e1a\u0e34\u0e25\u0e1a\u0e31\u0e15\u0e23</label>';
h+='</div>';
if(!hist.length){h+='<p class="text-muted" style="font-size:11px">'+(_histTotalCount?'No payments match this filter.':'No payments recorded yet. Mark a bill paid to log it here.')+'</p>';}
else{
// Grand total across all visible (filtered) months
var _histGrand=hist.reduce(function(s,r){return s+(r._surfacedInHist?0:(r.amount||0));},0);
var _histFiltered=(_histFYear!==''||_histFMonth!==''||_histFType!==''||_histFCat!==''||_histFMethod!==''||_histFCard!=='');
h+='<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--primary-bg,rgba(59,130,246,0.08));border:1px solid var(--primary);border-radius:6px;padding:6px 12px;margin-bottom:8px;font-size:12px">';
h+='<i class="fa-solid fa-coins" style="color:var(--primary)"></i><span style="font-weight:700">'+(_histFiltered?'Total (filtered)':'Grand total paid')+'</span>';
h+='<span style="font-size:9px;color:var(--text3)">'+hist.length+' payment'+(hist.length!==1?'s':'')+'</span>';
h+='<span style="flex:1"></span><span style="font-family:var(--mono);font-weight:700;color:var(--error);font-size:14px">\u0e3f'+fmt(_histGrand)+'</span></div>';
// Bulk action bar (shown when rows are selected)
h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><label style="font-size:10px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="hist-sel-all" onchange="histToggleAll(this.checked)"> Select all</label>';
h+='<div id="hist-bulk" style="display:none;gap:6px;align-items:center;flex-wrap:wrap"><span style="font-size:10px;color:var(--text2)"><b id="hist-sel-count">0</b> selected</span><button class="btn btn-ghost" style="font-size:10px;padding:3px 10px;color:var(--error)" onclick="histBulkDelete()"><i class="fa-solid fa-trash"></i> Delete Selected</button></div></div>';
// Sortable header
var _harrow=function(f){return _histSort===f?(_histAsc?' \u25b2':' \u25bc'):'';};
var _hth='<thead><tr>'+
'<th style="width:26px"></th>'+
'<th style="cursor:pointer" onclick="setHistSort(\'name\')">Bill'+_harrow('name')+'</th>'+
'<th style="cursor:pointer" onclick="setHistSort(\'type\')">Type'+_harrow('type')+'</th>'+
'<th style="cursor:pointer" onclick="setHistSort(\'method\')">Method'+_harrow('method')+'</th>'+
'<th class="r" style="cursor:pointer" onclick="setHistSort(\'amount\')">Amount'+_harrow('amount')+'</th>'+
'<th style="cursor:pointer" onclick="setHistSort(\'due\')">Due Date'+_harrow('due')+'</th>'+
'<th style="cursor:pointer" onclick="setHistSort(\'paid_date\')">Marked Paid'+_harrow('paid_date')+'</th>'+
'<th style="width:30px"></th></tr></thead>';
// Group by month of paid_date (preserve current sort order of first appearance)
_histKidsCache=null;
_histPdfCache=null;
var _groups={},_gorder=[];
hist.forEach(function(r){var mk=(r.paid_date||'').slice(0,7)||'unknown';if(!_groups[mk]){_groups[mk]=[];_gorder.push(mk);}_groups[mk].push(r);});
// Month groups sorted newest-first by key (independent of row sort), newest expanded
var _gkeys=_gorder.slice().sort(function(a,b){return b.localeCompare(a);});
_gkeys.forEach(function(mk,gi){
var rows=_groups[mk];var tot=rows.reduce(function(s,r){return s+(r._surfacedInHist?0:(r.amount||0));},0);
var lbl=mk==='unknown'?'No date':(_hMon[parseInt(mk.split('-')[1])]+' '+mk.split('-')[0]);
var gid='hgrp_'+mk.replace(/[^0-9]/g,'_');
// Expand: all groups when a filter is active (so filtered results stay open),
// otherwise only the newest month.
var openDefault=(_histFYear!==''||_histFMonth!=='')?true:(gi===0);
h+='<div style="margin-bottom:6px;border:1px solid var(--border);border-radius:6px;overflow:hidden">';
h+='<div style="background:var(--bg3);padding:5px 10px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700" onclick="var b=document.getElementById(\''+gid+'\'),c=this.querySelector(\'.hgc\');var open=b.style.display===\'none\';b.style.display=open?\'\':\'none\';c.textContent=open?\'\u25bc\':\'\u25b6\'">';
h+='<span class="hgc" style="display:inline-block;width:12px;color:var(--text3)">'+(openDefault?'\u25bc':'\u25b6')+'</span>';
h+='<span>'+lbl+'</span><span style="font-weight:400;color:var(--text3);font-size:9px">('+rows.filter(function(x){return !x._hiddenRow;}).length+')</span>';
h+='<span style="flex:1"></span><span style="font-family:var(--mono);color:var(--error)">\u0e3f'+fmt(tot)+'</span></div>';
h+='<div id="'+gid+'" style="display:'+(openDefault?'':'none')+'"><table class="tbl" style="font-size:11px;margin:0">'+_hth+'<tbody>';
rows.forEach(function(r){
// v293: card-linked charge with no statement in history — counted in the subtotal/grand total
// above, but its own row is hidden (option A). Skip rendering it.
if(r._hiddenRow)return;
// Type = kind (+ category); Method = auto/manual badge (+ card)
var _tCell=(r.kind||'')+(r.kind&&r.type?' \u00b7 ':'')+(r.type?'<span style="font-size:9px;color:var(--text3)">'+esc(typeof typeName==='function'?typeName(r.type):r.type)+'</span>':'');
if(!_tCell)_tCell='<span style="color:var(--text3)">\u2014</span>';
var _mBadge=(r.auto_pay===true)?'<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:var(--primary);color:#fff"><i class="fa-solid fa-robot"></i> Auto</span>':(r.auto_pay===false?'<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:var(--warning);color:#fff">\u270b Manual</span>':'<span style="color:var(--text3)">\u2014</span>');
var _mCell=_mBadge+((r.card&&r.card!=='Cash/Direct')?' <span style="font-size:9px;color:var(--text3)">'+esc(_cardDisp(r.card))+'</span>':'');
// Reconstruct statement children (credit-card statements only) for an expandable breakdown.
// Prefer the actually-paid child records; enrich each with orig_due (real bill due) by
// matching against the reconstructed statement children by name — paid records only store
// r.due (the statement-shifted date), so without this the child would show the pay date.
var _kids;
if(r._paidKids&&r._paidKids.length){
var _recon=_histStmtChildren(r)||[];
var _reconByName={};_recon.forEach(function(rc){if(rc&&rc.name!=null)_reconByName[rc.name]=rc;});
_kids=r._paidKids.map(function(pk){
var m=_reconByName[pk.name];
// Backfill display-only fields the stored paid-kid may lack (orig_due for the bill date, and
// info = the installment "(x/y)" sequence + kind, so Payment History shows the same seq label
// that Bills Reminder does). Never overwrite a value the paid-kid already has.
if(pk.orig_due && pk.info)return pk;
if(!m)return pk;
var pk2=Object.assign({},pk);
if(!pk2.orig_due && m.orig_due) pk2.orig_due=(typeof m.orig_due==='string')?m.orig_due:_billISO(m.orig_due);
if(!pk2.info && m.info) pk2.info=m.info;
if(!pk2.kind && m.kind) pk2.kind=m.kind;
return pk2;
});
}else{_kids=_histStmtChildren(r);}
var _hasK=_kids&&_kids.length;
var _hgid=_hasK?('hbrk_'+(r.key||'').replace(/[^a-zA-Z0-9]/g,'_')):'';
var _caret=_hasK?'<span style="cursor:pointer;user-select:none;color:var(--text3);margin-right:4px" onclick="var rr=document.querySelectorAll(\'.'+_hgid+'\');var op=rr.length&&rr[0].style.display!==\'none\';for(var _i=0;_i<rr.length;_i++)rr[_i].style.display=op?\'none\':\'\';this.textContent=op?\'\u25b6\':\'\u25bc\'">\u25b6</span>':'';
var _inStmtNote=r._surfacedInHist?' <span style="font-size:8px;color:var(--primary);background:var(--primary-bg,rgba(59,130,246,0.1));padding:1px 5px;border-radius:4px" title="already included in the '+esc(_cardDisp(r._inStmtCard||''))+' statement total — shown here so you can see it was paid individually">\u21b3 in '+esc(_cardDisp(r._inStmtCard||''))+' statement</span>':'';
// v338: a PAID card charge whose target statement isn't settled yet (e.g. AIS paid via ttb, but the
// ttb statement for the paid-date period isn't in history yet) shows a badge pointing at the period
// it WILL fold into once that statement is paid. Grouped by its own paid_date month meanwhile.
var _soloNote=(r._soloCardCharge&&r._targetPeriod)?' <span style="font-size:8px;color:var(--text3);background:rgba(128,128,128,.08);padding:1px 5px;border-radius:4px" title="paid individually; will fold under the '+esc(_cardDisp(r._targetCard||''))+' '+esc(r._targetPeriod)+' statement once that statement is marked paid">\u21b3 '+esc(_cardDisp(r._targetCard||''))+' '+esc(r._targetPeriod)+'</span>':'';
h+='<tr'+(r._surfacedInHist?' style="background:rgba(128,128,128,.03)"':'')+'><td class="r"><input type="checkbox" class="hist-chk" data-hkey="'+esc(r.key)+'" onchange="histUpdateSelCount()"></td><td>'+_caret+_billIcon(r)+' '+esc(r.name)+((r.kind==='Installment'&&r.info)?' <span style="color:var(--text3);font-size:9px">'+esc(r.info)+'</span>':'')+_perBadge(r.period)+_inStmtNote+_soloNote+(_hasK?' <span style="font-size:8px;color:var(--text3)">('+_kids.length+' charge'+(_kids.length!==1?'s':'')+')</span>':'')+'</td>'+
'<td style="font-size:10px">'+_tCell+'</td><td>'+_mCell+'</td>'+
'<td class="r" style="font-family:var(--mono)'+(r._surfacedInHist?';color:var(--text3)':'')+'">\u0e3f'+fmt(r.amount)+'</td>'+
'<td>'+((r._origDueDisp||r.due)?fmtDate(r._origDueDisp||r.due):'\u2014')+'</td><td>'+(r.paid_date?fmtDate(r.paid_date):'\u2014')+'</td>'+
'<td style="white-space:nowrap"><button class="del-btn" title="Edit this record" style="color:var(--text3)" data-hkey="'+esc(r.key)+'" onclick="histEditRecord(this.getAttribute(\'data-hkey\'))"><i class="fa-solid fa-pen"></i></button>'+'<button class="del-btn" title="Remove from history / unmark paid" data-hkey="'+esc(r.key)+'" onclick="toggleBillPaid(this.getAttribute(\'data-hkey\'),0,false)"><i class="fa-solid fa-xmark"></i></button></td></tr>';
// Hidden child rows (charges that composed this statement) — reconstructed, collapsed by default.
if(_hasK){
var _kidSum=0;
_kids.forEach(function(ch){_kidSum+=(ch.amount||0);
h+='<tr class="'+_hgid+'" style="display:none;background:var(--bg2)"><td></td>'+
'<td style="padding-left:22px;color:var(--text2);font-size:10px">'+_billIcon(ch)+' '+esc(ch.name)+((ch.kind==='Installment'&&ch.info)?(' <span style="color:var(--text3);font-size:9px">'+esc(ch.info)+'</span>'):'')+_perBadge(_svcPer(ch))+'</td>'+
'<td style="font-size:9px;color:var(--text3)">'+esc(ch.kind||'')+(ch.type?' \u00b7 '+esc(typeof typeName==='function'?typeName(ch.type):ch.type):'')+'</td>'+
'<td>'+((ch.auto_pay)?'<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--primary);color:#fff"><i class="fa-solid fa-robot"></i> Auto</span>':'<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--warning);color:#fff">\u270b Manual</span>')+((ch.card&&ch.card!=='Cash/Direct')?' <span style="font-size:8px;color:var(--text3)">'+esc(_cardDisp(ch.card))+'</span>':'')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--text2)">\u0e3f'+fmt(ch.amount)+'</td>'+
'<td style="font-size:9px;color:var(--text3)">'+((ch.orig_due||ch.due)?fmtDate((typeof (ch.orig_due||ch.due)==='string')?(ch.orig_due||ch.due):_billISO(ch.orig_due||ch.due)):'\u2014')+'</td>'+'<td style="font-size:9px;color:var(--success)">'+(ch.paid_date?'\u2713 '+fmtDate(ch.paid_date):'')+'</td><td></td>'+'<td style="white-space:nowrap">'+(ch.key?('<button class="del-btn" title="Edit this record" style="color:var(--text3)" data-hkey="'+esc(ch.key)+'" onclick="histEditRecord(this.getAttribute(\'data-hkey\'))"><i class="fa-solid fa-pen"></i></button>'+'<button class="del-btn" title="Unmark paid / cancel this payment" data-hkey="'+esc(ch.key)+'" onclick="toggleBillPaid(this.getAttribute(\'data-hkey\'),0,false)"><i class="fa-solid fa-xmark"></i></button>'):'')+'</td></tr>';
});
// Extra spend (keyed in) = statement total \u2212 sum(children), if positive.
var _extra=(r.amount||0)-_kidSum;
if(_extra>0.005&&!_histStmtIsPdf(r)){h+='<tr class="'+_hgid+'" style="display:none;background:var(--bg2)"><td></td>'+
'<td style="padding-left:22px;color:#2563eb;font-size:10px"><i class="fa-solid fa-plus" style="font-size:8px;margin-right:3px"></i>Extra spend (keyed in)</td>'+
'<td style="font-size:9px;color:var(--text3)">Adjustment</td><td></td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:#2563eb">\u0e3f'+fmt(_extra)+'</td><td></td><td></td><td></td></tr>';}
// BREAKDOWN (real PDF statement in history): show the "other spend" gap so the PDF total reconciles.
else if(_extra>0.009&&_histStmtIsPdf(r)&&_kidSum>0.01){h+='<tr class="'+_hgid+'" style="display:none;background:var(--bg2)"><td></td>'+
'<td style="padding-left:22px;color:var(--text2);font-size:10px"><i class="fa-solid fa-receipt" style="font-size:8px;margin-right:3px;color:var(--text3)"></i>\u0e2a\u0e48\u0e27\u0e19\u0e17\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e37\u0e2d (other spend)</td>'+
'<td style="font-size:9px;color:var(--text3)">\u0e22\u0e2d\u0e14\u0e1a\u0e34\u0e25 \u2212 \u0e1c\u0e48\u0e2d\u0e19/recurring</td><td></td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--text2)">\u0e3f'+fmt(_extra)+'</td><td></td><td></td><td></td></tr>';}
}
});
h+='</tbody></table></div></div>';
});
h+='<div style="font-size:9px;color:var(--text3);margin-top:6px"><i class="fa-solid fa-info-circle" style="margin-right:3px"></i> Grouped by payment month, newest first. Filter by paid or due date, sort by any column, select rows to bulk-delete. Deleting a record un-marks that occurrence (the bill stays in your setup).</div>';
}
h+='</div>';
h+='</div>';

// Info note
h+='<div style="font-size:9px;color:var(--text3);margin-top:4px"><i class="fa-solid fa-lightbulb" style="margin-right:3px"></i> <b><i class="fa-solid fa-robot"></i> Auto</b> = charged automatically (credit card / auto-deduct). <b>\u270b Manual</b> = you pay it yourself. Set the method per bill in the Bills &amp; Plans tab (Auto-pay column). Bills come from your Monthly, Yearly, Installment and Planned setups.</div>';

el.innerHTML=h;
try{if(typeof renderPeriodBanner==='function')renderPeriodBanner('billreminder-period','Bills');}catch(e){}
}

// ===== Dashboard section: Bills Due & Upcoming =====
function renderDashBills(){
var el=document.getElementById('dash-bills');if(!el)return;
if(!D){el.innerHTML='';return;}
var today=_billToday();
var back=new Date(today.getTime()-365*86400000);
var horizon=new Date(today.getTime()+BILL_WINDOW_UPCOMING*86400000);
var occ=billOccurrences(back,horizon).filter(function(o){var st=billStatus(o,today);return st==='due'||st==='overdue'||st==='upcoming';});
// Sort by the charge's REAL due date (orig_due for card charges surfaced from a statement).
occ.sort(function(a,b){var ad=(a.orig_due||a.due),bd=(b.orig_due||b.due);var r=ad-bd;if(r)return r;return (a.auto_pay?1:0)-(b.auto_pay?1:0);});
var h='<div class="card"><h2><i class="fa-solid fa-bell"></i> Bills Due &amp; Upcoming</h2>';
if(!occ.length){h+='<p class="text-muted" style="font-size:11px">Nothing due in the next '+BILL_WINDOW_UPCOMING+' days. \ud83c\udf89</p></div>';el.innerHTML=h;return;}
h+='<table class="tbl" style="font-size:11px"><thead><tr><th>Bill</th><th>Method</th><th class="r">Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>';
occ.slice(0,12).forEach(function(o){
var st=billStatus(o,today);var _eDue=o.orig_due||o.due;var diff=Math.round((_eDue-today)/86400000);
var _dispD=_billDisp(o,today);var stTxt=st==='overdue'?'<span style="color:var(--error);font-weight:600">Overdue</span>':_dispD==='due_today'?(o.auto_pay?'<span style="color:var(--text3)" title="Auto-charged today \u2014 no action needed"><i class="fa-solid fa-robot"></i> Auto today</span>':'<span style="color:#dc2626;font-weight:700">\ud83d\udccc Due today</span>'):st==='due'?'<span style="color:var(--warning);font-weight:600">Due soon</span>':'<span style="color:var(--primary)">Upcoming</span>';
var rel=diff===0?'today':diff>0?'in '+diff+'d':(-diff)+'d ago';
var method=o.auto_pay?'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:var(--primary);color:#fff"><i class="fa-solid fa-robot"></i> Auto</span>':'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:var(--warning);color:#fff">\u270b Manual</span>';
h+='<tr style="'+(st==='overdue'?'background:rgba(220,38,38,0.06);box-shadow:inset 3px 0 0 var(--error)':((_dispD==='due_today'&&!o.auto_pay)?'background:rgba(245,158,11,0.08);box-shadow:inset 3px 0 0 var(--warning)':''))+'"><td>'+_billIcon(o)+' '+esc(o.name)+(o.info?' <span style="font-size:8px;color:var(--text3)">'+esc(o.info)+'</span>':'')+'</td><td>'+method+'</td>'+
'<td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(o.amount)+'</td><td style="white-space:nowrap">'+fmtDate(_billISO(o.orig_due||o.due))+' <span style="font-size:8px;color:var(--text3)">'+rel+'</span></td><td>'+stTxt+'</td></tr>';
});
h+='</tbody></table>';
// Exclude _surfaced rows from totals — their amount is already represented by the parent statement
// (surfaced rows are display-only duplicates so the user sees each charge; counting them double-counts).
var totManual=occ.filter(function(o){return !o.auto_pay&&!o._surfaced&&!o._income}).reduce(function(s,o){return s+o.amount},0);
var totAuto=occ.filter(function(o){return o.auto_pay&&!o._surfaced&&!o._income}).reduce(function(s,o){return s+o.amount},0);
h+='<div style="display:flex;gap:8px;margin-top:8px;font-size:10px">';
h+='<div style="flex:1;background:var(--bg3);border-radius:6px;padding:6px 10px"><span style="color:var(--warning);font-weight:600">\u270b Manual to pay</span> \u0e3f'+fmt(totManual)+'</div>';
h+='<div style="flex:1;background:var(--bg3);border-radius:6px;padding:6px 10px"><span style="color:var(--primary);font-weight:600"><i class="fa-solid fa-robot"></i> Auto-charged</span> \u0e3f'+fmt(totAuto)+'</div>';
h+='</div>';
h+='<div style="margin-top:8px"><button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="document.querySelector(\'.nav-tab[data-tab=&quot;billreminder&quot;]\').click()"><i class="fa-solid fa-arrow-right"></i> Open Bills Reminder</button></div>';
h+='</div>';
el.innerHTML=h;
}

// v349: jump from the Dashboard calendar popup to a bill row (same concept as To-Do jump).
function billJumpTo(fullKey){
var b=document.querySelector('.nav-tab[data-tab="billreminder"]');if(b)b.click();
var rec=(D.bill_payments||{})[fullKey];
_billFilter=(rec&&rec.paid)?'all':'unpaid';_billYear='';_billMonth='';_billDay='';
try{var s=document.querySelector('#billreminder-content input[type=search],#billreminder-content .tbl-search');if(s){s.value='';s.dispatchEvent(new Event('input'));}}catch(e){}
try{renderBillReminder();}catch(e){}
setTimeout(function(){
var rows=document.querySelectorAll('[data-bkey]'),r=null;
for(var i=0;i<rows.length;i++){if(rows[i].getAttribute('data-bkey')===fullKey){r=rows[i];break;}}
if(!r){toast('\u0e1a\u0e34\u0e25\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e43\u0e19\u0e0a\u0e48\u0e27\u0e07\u0e17\u0e35\u0e48\u0e41\u0e2a\u0e14\u0e07');return;}
try{r.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){r.scrollIntoView();}
var bg=r.style.background,bs=r.style.boxShadow;r.style.transition='background .4s';r.style.background='rgba(59,130,246,0.18)';r.style.boxShadow='inset 3px 0 0 var(--primary)';
setTimeout(function(){r.style.background=bg;r.style.boxShadow=bs;},2200);
},150);
}
window.billJumpTo=billJumpTo;
// Pay from the calendar popup (uses its own date input id).
function billPayFromCal(fullKey,amount,dueISO,typ,card,autoPay,uu,up,per){
var di=document.getElementById('calpd');var pd=di&&di.value;
if(!/^\d{4}-\d{2}-\d{2}$/.test(pd||'')){alert('\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22\u0e01\u0e48\u0e2d\u0e19 (Pick the payment date first)');return;}
var tmp=document.createElement('input');tmp.type='hidden';tmp.id='brpd_'+fullKey.replace(/[^a-zA-Z0-9]/g,'_');tmp.value=pd;
var old=document.getElementById(tmp.id);if(old)old.id=tmp.id+'_x';
document.body.appendChild(tmp);
try{markRowPaid(fullKey,amount,dueISO,typ,card,autoPay,uu,up,per);}finally{tmp.remove();if(old)old.id=tmp.id;}
if(typeof dashCalClosePop==='function')dashCalClosePop();
try{if(typeof renderDashCalendar==='function')renderDashCalendar();}catch(e){}
}
window.billPayFromCal=billPayFromCal;
