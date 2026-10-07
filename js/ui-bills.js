// ui-bills.js — Recurring, Installments, Planned

function swBills(el,tab){document.querySelectorAll('#tab-bills .sub-panel').forEach(function(p){p.classList.remove('active')});document.querySelectorAll('#tab-bills .sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('bp-'+tab).classList.add('active');
if(tab==='installments'){try{renderInstMatrix()}catch(e){}}
if(tab==='cardbills'){try{renderCardBills()}catch(e){console.error('renderCardBills:',e)}}
if(tab==='utilities'){try{renderUtilities()}catch(e){console.error('renderUtilities:',e)}}}

// Bulk-apply a single start date to all bills.
// Monthly -> start_mode/start_date; Yearly -> start_mode/start_from;
// Installments -> hide_before (manual items) + inst_hide_before on installment-mode Yearly items.
// Empty date clears the start (back to "always"/no cutoff).
function applyBulkStartDate(){
readAll();
var el=document.getElementById('bulk-start-date');
var val=el?el.value:'';
// Which bill types to apply to (checkboxes; default all checked)
var doM=document.getElementById('bulk-apply-monthly'),doY=document.getElementById('bulk-apply-yearly'),doI=document.getElementById('bulk-apply-inst');
var applyM=doM?doM.checked:true, applyY=doY?doY.checked:true, applyI=doI?doI.checked:true;
if(!applyM&&!applyY&&!applyI){toast('Select at least one bill type');return;}
var mCount=applyM?(D.monthly||[]).length:0;
var yCount=applyY?(D.yearly||[]).length:0;
var iCount=applyI?(D.installments||[]).length:0;
var yInstCount=applyI?(D.yearly||[]).filter(function(y){return y.pay_mode==='installment'}).length:0;
if(!(mCount+yCount+iCount+yInstCount)){toast('No bills to update for the selected types');return;}
var verb=val?('set start date to '+fmtDate(val)+' on'):'clear the start date on';
var partsMsg=[];
if(applyM)partsMsg.push('\u2022 '+mCount+' monthly');
if(applyY)partsMsg.push('\u2022 '+yCount+' yearly');
if(applyI)partsMsg.push('\u2022 '+iCount+' installment(s) + '+yInstCount+' auto installment(s) (Hide Before)');
if(!confirm('This will '+verb+':\n'+partsMsg.join('\n')+'\n\nExisting per-bill start dates will be overwritten. Continue?'))return;
if(applyM)(D.monthly||[]).forEach(function(m){if(val){m.start_mode='date';m.start_date=val;}else{m.start_mode='forever';m.start_date='';}});
if(applyY)(D.yearly||[]).forEach(function(y){if(val){y.start_mode='date';y.start_from=val;}else{y.start_mode='forever';y.start_from='';}});
if(applyI){
(D.installments||[]).forEach(function(x){x.hide_before=val||'';});
// installment-mode yearly items get the Hide Before cutoff
(D.yearly||[]).forEach(function(y){if(y.pay_mode==='installment')y.inst_hide_before=val||'';});
var spEl=document.getElementById('flt-p-showpaid');_planShowPaid=spEl?spEl.checked:false;
var _paidN=0;
// Hide paid Planned items by default (they live in Payment History); 'Show paid' reveals them.
var _paid=_planIsPaid(D.planned[pi]);
if(_paid){var isD0=tr.classList.contains('pl-detail');if(!isD0)_paidN++;if(!_planShowPaid)show=false;}
;var _pc=document.getElementById('planned-paid-count');if(_pc)_pc.textContent=_paidN>0?('\u00b7 '+_paidN+' paid'+(_planShowPaid?' shown':' hidden')):'';}
saveD();simulate();renderAllTabs();
var tParts=[];if(applyM)tParts.push('monthly');if(applyY)tParts.push('yearly');if(applyI)tParts.push('installments');
toast((val?'\u2705 Start date set to '+fmtDate(val):'\u2705 Cleared start date')+' on '+tParts.join(', '));
}

// ===== Credit Card Bills (auto-calc per card per month + manual override) =====
var _cbYear=null,_cbMonth=null; // selected period; null => current month
var _cbSort='due'; // card bills sort: 'name' | 'due' | 'amount' (default: due date)
function setCbSort(v){_cbSort=v;renderCardBills();}
// Apply the manual override typed for a card (explicit button so user sees it saved)
function applyCardExtra(card,y,m){
var el=document.getElementById('cbex_'+card.replace(/[^a-zA-Z0-9]/g,'_'));
var val=el?el.value:'';
setCardBillExtra(card,y,m,val);
toast(val===''||parseFloat(String(val).replace(/,/g,''))===0?'\u2705 Extra cleared for '+card:'\u2705 Saved extra spend for '+card);
}
// Back-compat alias (older markup / muscle memory)
function applyCardOverride(card,y,m){return applyCardExtra(card,y,m);}
function _cbToday(){var d=new Date();return {y:d.getFullYear(),m:d.getMonth()};}
function _cbPeriod(){if(_cbYear===null||_cbMonth===null){var t=_cbToday();return {y:t.y,m:t.m};}return {y:_cbYear,m:_cbMonth};}
function _cbKey(card,y,m){return card+'::'+y+'-'+(m+1<10?'0':'')+(m+1);}
// Paid-status for a card statement in Card Bills, kept IN SYNC with Bills Reminder's ledger.
// The statement occurrence key (see ui-billreminder billOccurrences) is:
//   'CB|'+cardName+'|'+mk  then period-suffixed with '::'+mk   (mk = 'YYYY-MM').
function _cbStmtKey(card,y,m){var mk=y+'-'+(m+1<10?'0':'')+(m+1);return 'CB|'+card+'|'+mk+'::'+mk;}
function cbPaidRec(card,y,m){return (D.bill_payments||{})[_cbStmtKey(card,y,m)];}
function cbMarkPaid(card,y,m,amt){
if(!D.bill_payments)D.bill_payments={};
var mk=y+'-'+(m+1<10?'0':'')+(m+1);
var dd=new Date(y,m,15);var cardObj=(D.cards||[]).find(function(x){return x.name===card;});
if(cardObj&&cardObj.payment_day)dd=new Date(y,m,Math.min(cardObj.payment_day,dim(y,m)));
var iso=dd.getFullYear()+'-'+(dd.getMonth()+1<10?'0':'')+(dd.getMonth()+1)+'-'+(dd.getDate()<10?'0':'')+dd.getDate();
D.bill_payments[_cbStmtKey(card,y,m)]={paid:true,paid_date:(new Date()).toISOString().slice(0,10),paid_amount:amt||0,due:iso,type:'Card Statement',card:card,auto_pay:false};
saveD();renderCardBills();if(typeof renderBillReminder==='function')try{renderBillReminder()}catch(e){}if(typeof renderDashBills==='function')try{renderDashBills()}catch(e){}
toast('\u2705 Marked '+card+' statement paid');
}
function cbUnpaid(card,y,m){
if(D.bill_payments)delete D.bill_payments[_cbStmtKey(card,y,m)];
saveD();renderCardBills();if(typeof renderBillReminder==='function')try{renderBillReminder()}catch(e){}if(typeof renderDashBills==='function')try{renderDashBills()}catch(e){}
toast('Marked '+card+' statement unpaid');
}
function cbStepMonth(delta){var p=_cbPeriod();var m=p.m+delta,y=p.y;while(m>11){m-=12;y++}while(m<0){m+=12;y--}_cbYear=y;_cbMonth=m;renderCardBills();}
function cbThisMonth(){var t=_cbToday();_cbYear=t.y;_cbMonth=t.m;renderCardBills();}
// Extra-spend setter (empty or 0 clears). Effective statement = auto (Known) + extra.
function setCardBillExtra(card,y,m,val){
if(!D.cardbill_extra)D.cardbill_extra={};
var k=_cbKey(card,y,m);
var num=parseFloat(String(val).replace(/,/g,''));
if(val===''||isNaN(num)||num===0){delete D.cardbill_extra[k];}else{D.cardbill_extra[k]=num;}
saveD();renderCardBills();if(typeof renderBillReminder==='function')try{renderBillReminder()}catch(e){}if(typeof simulate==='function')try{simulate()}catch(e){}if(typeof renderDashBills==='function')try{renderDashBills()}catch(e){}
}
// Back-compat alias
function setCardBillOverride(card,y,m,val){return setCardBillExtra(card,y,m,val);}
// Sum charges per card for the given month using billOccurrences (payment-date based).
function cardBillData(y,m){
var from=new Date(y,m,1), to=new Date(y,m,dim(y,m));
var occ=(typeof billOccurrences==='function')?billOccurrences(from,to):[];
var byCard={};
occ.forEach(function(o){var c=o.card;if(!c||c==='Cash/Direct')return;
// v215: _surfaced rows are display-only duplicates of a charge already inside its card statement
// (billOccurrences returns BOTH the consolidated statement AND the surfaced charge). Counting
// them here double-counts the card total, so skip them entirely.
if(o._surfaced)return;
if(!byCard[c])byCard[c]={items:[],total:0};
byCard[c].items.push(o);
// KNOWN (auto) = actual charges only. A consolidated 'Card Statement' bakes extra spend into
// its amount, so use the sum of its underlying children instead (extra is added separately in the UI).
var known;
if(o.kind==='Card Statement'&&o.children&&o.children.length){known=o.children.reduce(function(s,ch){return s+(ch.amount||0);},0);}
else if(o.kind==='Card Statement'){known=0;}
else{known=(o.amount||0);}
byCard[c].total+=known;});
return byCard;
}
var _cbOpen={};// per-card collapse state in Card Bills, keyed by card name
function _cbId(name){return 'cbbody_'+String(name).replace(/[^a-zA-Z0-9]/g,'_');}
function cbToggle(name){_cbOpen[name]=!(_cbOpen[name]===undefined?_cbDefaultOpen(name):_cbOpen[name]);var b=document.getElementById(_cbId(name));var cx=document.getElementById('cbcx_'+String(name).replace(/[^a-zA-Z0-9]/g,'_'));if(b)b.style.display=_cbOpen[name]?'':'none';if(cx)cx.textContent=_cbOpen[name]?'\u25bc':'\u25b6';}
// Default: expand cards that still need paying (eff>0 & not paid), collapse paid / nothing-to-pay.
var _cbDefaultOpenMap={};
function _cbDefaultOpen(name){return !!_cbDefaultOpenMap[name];}
function cbExpandAll(open){var _p=_cbPeriod();(D.cards||[]).forEach(function(c){_cbOpen[c.name]=open;});renderCardBills();}
// v178: pay-method badge for a Card Bills charge row — Auto (system pays) vs Manual (you tap to pay).
// A charge is 'manual' when it's planned on a card but auto_pay is false (you tap to pay it).
// Card statements themselves are neither — they carry no auto_pay meaning here, so no badge.
function _cbPayBadge(o){
if(!o||o.kind==='Card Statement')return'';
if(o.auto_pay===true)return ' <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--primary);color:#fff">\u26a1 Auto</span>';
return ' <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:#f59e0b;color:#fff" title="Planned on this card but you tap to pay">\u270b Manual</span>';
}
function renderCardBills(){
var el=document.getElementById('cardbills-content');if(!el)return;
if(!D){el.innerHTML='<p class="text-muted">No data.</p>';return;}
var p=_cbPeriod(),y=p.y,m=p.m;
var MONF=['January','February','March','April','May','June','July','August','September','October','November','December'];
var data=cardBillData(y,m);
var cards=(D.cards||[]).slice();
// Sort card blocks per _cbSort
function _cbEff(cd){var dd=data[cd.name];var au=dd?dd.total:0;var ex=parseFloat((D.cardbill_extra||{})[_cbKey(cd.name,y,m)])||0;return au+ex;}
function _cbDue(cd){return cd.payment_day||cd.deadline||99;}
if(_cbSort==='due')cards.sort(function(a,b){return _cbDue(a)-_cbDue(b)||a.name.localeCompare(b.name)});
else if(_cbSort==='amount')cards.sort(function(a,b){return _cbEff(b)-_cbEff(a)||a.name.localeCompare(b.name)});
else cards.sort(function(a,b){return a.name.localeCompare(b.name)});
var h='';
// Period navigator
h+='<div class="card" style="margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">';
h+='<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="cbStepMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>';
h+='<span style="font-size:14px;font-weight:700;min-width:150px;text-align:center">'+MONF[m]+' '+y+'</span>';
h+='<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="cbStepMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="cbThisMonth()"><i class="fa-solid fa-calendar-day"></i> This month</button>';
h+='<span style="font-size:10px;color:var(--text3);margin-left:6px">Sort:</span><select class="sel" style="font-size:10px;padding:2px 6px" onchange="setCbSort(this.value)"><option value="name"'+(_cbSort==='name'?' selected':'')+'>Card name</option><option value="due"'+(_cbSort==='due'?' selected':'')+'>Due date</option><option value="amount"'+(_cbSort==='amount'?' selected':'')+'>Amount (high\u2192low)</option></select>';
h+='<button class="btn btn-ghost" style="font-size:9px;padding:3px 8px;margin-left:4px" onclick="cbExpandAll(true)" title="Expand all cards"><i class="fa-solid fa-angles-down"></i> Expand all</button>';
h+='<button class="btn btn-ghost" style="font-size:9px;padding:3px 8px" onclick="cbExpandAll(false)" title="Collapse all cards"><i class="fa-solid fa-angles-up"></i> Collapse all</button>';
h+='<span style="flex:1"></span>';
var grand=0;cards.forEach(function(c){var d=data[c.name];var auto=d?d.total:0;var ex=parseFloat((D.cardbill_extra||{})[_cbKey(c.name,y,m)])||0;grand+=(auto+ex);});
h+='<span style="font-size:12px;font-weight:700">Total due: <span style="font-family:var(--mono);color:var(--error)">\u0e3f'+fmt(grand)+'</span></span>';
h+='</div>';
// Period paid/unpaid summary — how many cards are settled vs still owing this month
var _sumPaidN=0,_sumPaidAmt=0,_sumDueN=0,_sumDueAmt=0;
cards.forEach(function(c){var dd=data[c.name];var au=dd?dd.total:0;var ex=parseFloat((D.cardbill_extra||{})[_cbKey(c.name,y,m)])||0;var eff=au+ex;if(eff<=0)return;var pr=(typeof cbPaidRec==='function')?cbPaidRec(c.name,y,m):null;if(pr&&pr.paid){_sumPaidN++;_sumPaidAmt+=eff;}else{_sumDueN++;_sumDueAmt+=eff;}});
h+='<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px">';
h+='<div style="flex:1;min-width:150px;padding:6px 10px;border-radius:6px;background:var(--success-bg);border:1px solid var(--success)"><div style="font-size:9px;color:var(--success);font-weight:700"><i class="fa-solid fa-circle-check"></i> PAID</div><div style="font-size:13px;font-weight:700">'+_sumPaidN+' card'+(_sumPaidN!==1?'s':'')+' · <span style="font-family:var(--mono);color:var(--success)">\u0e3f'+fmt(_sumPaidAmt)+'</span></div></div>';
h+='<div style="flex:1;min-width:150px;padding:6px 10px;border-radius:6px;background:var(--warning-bg);border:1px solid var(--warning)"><div style="font-size:9px;color:var(--warning);font-weight:700"><i class="fa-solid fa-hourglass-half"></i> STILL TO PAY</div><div style="font-size:13px;font-weight:700">'+_sumDueN+' card'+(_sumDueN!==1?'s':'')+' · <span style="font-family:var(--mono);color:var(--warning)">\u0e3f'+fmt(_sumDueAmt)+'</span></div></div>';
h+='</div>';
h+='</div>';
if(!cards.length){h+='<p class="text-muted" style="font-size:11px">No credit cards set up yet. Add cards in Setup \u2192 Credit Cards.</p>';el.innerHTML=h;return;}
// One card block each
cards.forEach(function(c){
var d=data[c.name];var auto=d?d.total:0;var items=d?d.items:[];
var k=_cbKey(c.name,y,m);
var extra=parseFloat((D.cardbill_extra||{})[k])||0;
var eff=auto+extra;
var _cbPaidNow=(typeof cbPaidRec==='function')?cbPaidRec(c.name,y,m):null;
_cbDefaultOpenMap[c.name]=(eff>0&&!(_cbPaidNow&&_cbPaidNow.paid));
var _cbIsOpen=(_cbOpen[c.name]===undefined)?_cbDefaultOpenMap[c.name]:_cbOpen[c.name];
var payDay=c.payment_day||c.deadline||null;
var payTxt=payDay?(ord(Math.min(payDay,dim(y,m)))+' '+MONF[m].slice(0,3)):'\u2014';
var dlDay=c.deadline||null;
// Deadline rolls to NEXT month when its day falls on/before the planned-pay day
var dlY=y,dlM=m;
if(dlDay&&payDay&&dlDay<=payDay){dlM=m+1;if(dlM>11){dlM=0;dlY=y+1;}}
var dlTxt=dlDay?(ord(Math.min(dlDay,dim(dlY,dlM)))+' '+MONF[dlM].slice(0,3)+(dlY!==y?' '+dlY:'')):'\u2014';
h+='<div class="card" style="margin-bottom:8px">';
h+='<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px;cursor:pointer" onclick="cbToggle(\''+c.name.replace(/'/g,"\\'")+'\')">';
h+='<span id="cbcx_'+c.name.replace(/[^a-zA-Z0-9]/g,'_')+'" style="color:var(--text3);width:12px">'+(_cbIsOpen?'\u25bc':'\u25b6')+'</span>';
h+='<i class="fa-solid fa-credit-card" style="color:var(--primary)"></i><span style="font-weight:700;font-size:13px">'+esc(c.name)+'</span>';
// Status badge for this card+period: PAID (settled) / TO PAY (has amount, unpaid) / NO CHARGES (nothing this month)
var _cbPr=(typeof cbPaidRec==='function')?cbPaidRec(c.name,y,m):null;
if(eff>0&&_cbPr&&_cbPr.paid){h+='<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;background:var(--success-bg);color:var(--success);border:1px solid var(--success)"><i class="fa-solid fa-circle-check"></i> PAID</span>';}
else if(eff>0){h+='<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning)"><i class="fa-solid fa-hourglass-half"></i> TO PAY</span>';}
else{h+='<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;background:var(--bg3);color:var(--text3);border:1px solid var(--border)"><i class="fa-solid fa-minus"></i> NO CHARGES</span>';}
h+='<span style="font-size:9px;color:var(--text3)">Planned pay '+payTxt+' &middot; <b style="color:var(--warning)">deadline '+dlTxt+'</b></span>';
h+='<span style="flex:1"></span>';
h+='<span style="font-size:11px">Effective: <span style="font-family:var(--mono);font-weight:700;color:var(--error)">\u0e3f'+fmt(eff)+'</span></span>';
h+='</div>';
h+='<div id="'+_cbId(c.name)+'" style="display:'+(_cbIsOpen?'':'none')+'">';
// breakdown
if(items.length){
h+='<table class="tbl" style="font-size:10px"><thead><tr><th>Charge</th><th>Kind</th><th>Due</th><th class="r">Amount</th></tr></thead><tbody>';
// Expand each occurrence. Consolidated card statements carry their real underlying charges in
// `children` — list those individually so the auto total's composition is explicit.
items.sort(function(a,b){return a.due-b.due}).forEach(function(o){
var kids=(o.children&&o.children.length)?o.children.slice():null;
if(kids){
kids.sort(function(a,b){return a.due-b.due}).forEach(function(ch){
h+='<tr><td>'+esc(ch.name)+(ch.info?' <span style="font-size:8px;color:var(--text3)">'+esc(ch.info)+'</span>':'')+_cbPayBadge(ch)+'</td><td style="font-size:9px;color:var(--text3)">'+esc(ch.kind||'')+'</td><td style="font-size:9px">'+fmtDate(_billISO(ch.orig_due||ch.due))+'</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(ch.amount)+'</td></tr>';
});
}else{
h+='<tr><td>'+esc(o.name)+(o.info?' <span style="font-size:8px;color:var(--text3)">'+esc(o.info)+'</span>':'')+_cbPayBadge(o)+'</td><td style="font-size:9px;color:var(--text3)">'+esc(o.kind)+'</td><td style="font-size:9px">'+fmtDate(_billISO(o.orig_due||o.due))+'</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(o.amount)+'</td></tr>';
}
});
h+='<tr style="font-weight:700;background:var(--bg3)"><td colspan="3">Auto-calculated total</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(auto)+'</td></tr>';
h+='</tbody></table>';
}else{
h+='<p class="text-muted" style="font-size:10px;margin:4px 0">No charges auto-detected on this card for '+MONF[m]+' '+y+'.</p>';
}
// Known (auto) + Extra spend = Total. Extra is added on top of the auto-detected total.
h+='<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-top:6px;font-size:10px">';
h+='<div><div style="color:var(--text3)">Known (auto)</div><div style="font-family:var(--mono);font-weight:600;padding:3px 0">\u0e3f'+fmt(auto)+'</div></div>';
h+='<div style="font-size:14px;color:var(--text3);padding-bottom:2px">+</div>';
h+='<div><div style="color:var(--text3)">Extra spend this period</div><input type="text" class="inp inp-num" id="cbex_'+c.name.replace(/[^a-zA-Z0-9]/g,'_')+'" value="'+(extra?extra.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'')+'" placeholder="0.00" style="width:110px;padding:2px 6px;font-size:10px" onkeydown="if(event.key===\'Enter\')applyCardExtra(\''+c.name.replace(/'/g,"\\'")+'\','+y+','+m+')"></div>';
h+='<button class="btn btn-primary" style="font-size:9px;padding:3px 10px" onclick="applyCardExtra(\''+c.name.replace(/'/g,"\\'")+'\','+y+','+m+')"><i class="fa-solid fa-check"></i> Save</button>';
h+='<div style="font-size:14px;color:var(--text3);padding-bottom:2px">=</div>';
h+='<div><div style="color:var(--text3)">Total to pay</div><div style="font-family:var(--mono);font-weight:700;color:var(--error);padding:3px 0">\u0e3f'+fmt(eff)+'</div></div>';
if(extra>0)h+='<span style="font-size:9px;color:var(--primary)">+\u0e3f'+fmt(extra)+' extra added</span><button class="btn btn-ghost" style="font-size:9px;padding:2px 8px" onclick="setCardBillExtra(\''+c.name.replace(/'/g,"\\'")+'\','+y+','+m+',\'\')"><i class="fa-solid fa-xmark"></i> Clear extra</button>';
else h+='<span style="font-size:9px;color:var(--text3)">Add un-recorded spend for this period (leave blank for none)</span>';
h+='</div>';
// Paid-status row (synced with Bills Reminder)
var _pr=cbPaidRec(c.name,y,m);
h+='<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);font-size:10px">';
if(_pr&&_pr.paid){
h+='<span style="font-size:10px;color:var(--success);font-weight:600"><i class="fa-solid fa-circle-check"></i> Statement paid</span>';
h+='<span style="font-size:9px;color:var(--text3)">on '+(_pr.paid_date?fmtDate(_pr.paid_date):'—')+(_pr.paid_amount?' · ฿'+fmt(_pr.paid_amount):'')+'</span>';
h+='<button class="btn btn-ghost" style="font-size:9px;padding:2px 8px" onclick="cbUnpaid(\''+c.name.replace(/'/g,"\\'")+'\','+y+','+m+')"><i class="fa-solid fa-rotate-left"></i> Mark unpaid</button>';
}else if(eff>0){
h+='<span style="font-size:10px;color:var(--warning);font-weight:600"><i class="fa-solid fa-hourglass-half"></i> Not paid yet</span>';
h+='<button class="btn btn-primary" style="font-size:9px;padding:3px 10px" onclick="cbMarkPaid(\''+c.name.replace(/'/g,"\\'")+'\','+y+','+m+','+eff+')"><i class="fa-solid fa-check"></i> Mark statement paid</button>';
}else{
h+='<span style="font-size:9px;color:var(--text3)">Nothing to pay this month</span>';
}
h+='</div>';
h+='</div>';
h+='</div>';
});
h+='<div style="font-size:9px;color:var(--text3);margin-top:4px"><i class="fa-solid fa-info-circle" style="margin-right:3px"></i> Auto total = sum of everything charged to the card that posts in the selected month (monthly, yearly, installments, planned). Set a manual override to use a statement figure instead.</div>';
el.innerHTML=h;
}

var _mExpanded={};
function mToggle(i){_mExpanded[i]=!_mExpanded[i];renderMonthly();if(typeof filterMonthly==='function')try{filterMonthly()}catch(e){}}
function renderMonthly(){
document.getElementById('monthly-hdr').innerHTML='<th style="width:24px"><input type="checkbox" onchange="toggleAllMonthly(this.checked)"></th><th style="width:20px"></th>'+sHdr('monthly','name','Name')+'<th>I/E</th>'+sHdr('monthly','type','Type')+sHdr('monthly','amount','Amount')+sHdr('monthly','billing_day','Bill Day')+'<th>Pay By</th><th title="Auto-pay / auto-deduct vs manual">Auto</th><th>Status</th><th></th>';
document.getElementById('monthly-body').innerHTML=D.monthly.map(function(m,i){var ep2=effPayment(m),ed=ep2.day,sh=m.card!=='Cash/Direct'&&(ed!==m.billing_day||ep2.monthShift>0),ms=ep2.monthShift;
var dirCls=m.direction==='income'?'color:var(--success);font-weight:600':'';
var st=m.status||'Active';var stStyle=st==='Hold'?'color:var(--warning)':st==='Cancelled'?'color:var(--error);text-decoration:line-through':'color:var(--success)';
var rowOpac=st!=='Active'?'opacity:.5;':'';
var open=!!_mExpanded[i];
var em=m.end_mode||'forever';var endHtml='<select class="sel" style="font-size:9px;width:80px" data-mi="'+i+'" data-f="end_mode" onchange="var dr=this.closest(\'.m-detail\').querySelector(\'.m-enddt\');if(dr)dr.style.display=this.value===\'date\'?\'\':\'none\'"><option value="forever"'+(em==='forever'?' selected':'')+'>∞ Forever</option><option value="date"'+(em==='date'?' selected':'')+'>📅 Until</option></select>';
endHtml+='<input type="date" class="inp m-enddt" value="'+(em==='date'?(m.end_date||''):'')+'" style="width:120px;font-size:9px;margin-left:4px;display:'+(em==='date'?'':'none')+'" data-mi="'+i+'" data-f="end_date">';
var sm2=m.start_mode||'forever';var startHtml='<select class="sel" style="font-size:9px;width:80px" data-mi="'+i+'" data-f="start_mode" onchange="var dr=this.closest(\'.m-detail\').querySelector(\'.m-startdt\');if(dr)dr.style.display=this.value===\'date\'?\'\':\'none\'"><option value="forever"'+(sm2==='forever'?' selected':'')+'>∞ Always</option><option value="date"'+(sm2==='date'?' selected':'')+'>📅 From</option></select>';
startHtml+='<input type="date" class="inp m-startdt" value="'+(sm2==='date'?(m.start_date||''):'')+'" style="width:120px;font-size:9px;margin-left:4px;display:'+(sm2==='date'?'':'none')+'" data-mi="'+i+'" data-f="start_date">';
var dmode=m.deadline_mode||(m.card&&m.card!=='Cash/Direct'?'card':'custom');
var dlHtml='<select class="sel" style="font-size:9px;width:70px" data-mi="'+i+'" data-f="deadline_mode" onchange="var dr=this.closest(\'.m-detail\').querySelector(\'.m-dldd\');if(dr)dr.style.display=this.value===\'custom\'?\'\':\'none\'">'+(m.card&&m.card!=='Cash/Direct'?'<option value="card"'+(dmode==='card'?' selected':'')+'>Card</option>':'')+'<option value="custom"'+(dmode==='custom'?' selected':'')+'>Day</option></select>';
dlHtml+='<input type="number" class="inp inp-num m-dldd" min="1" max="31" value="'+(m.deadline_day||'')+'" placeholder="dd" style="width:46px;font-size:9px;margin-left:4px;display:'+(dmode==='custom'?'':'none')+'" data-mi="'+i+'" data-f="deadline_day">';
var effTxt=(sh?'<span class="shifted">'+ord(ed)+(ms>0?' +1mo':'')+'</span>':'<span class="orig">'+ord(ed)+'</span>');
// main row
var mainRow='<tr class="m-main" data-mrow="'+i+'" style="'+(m.direction==='income'?'background:rgba(16,185,129,0.05)':'')+rowOpac+'"><td><input type="checkbox" class="m-chk" data-idx="'+i+'" onchange="updateMonthlyBulk()"></td>'+
'<td><span style="cursor:pointer;user-select:none;color:var(--text3)" onclick="mToggle('+i+')" title="Show timing / period settings">'+(open?'▼':'▶')+'</span></td>'+
'<td><input class="inp-inline" value="'+esc(m.name)+'" data-mi="'+i+'" data-f="name"></td>'+
'<td><select class="sel" style="'+dirCls+'" data-mi="'+i+'" data-f="direction">'+dirOpts(m.direction)+'</select></td>'+
'<td><span style="display:inline-flex;align-items:center;gap:4px">'+typeIcon(m.type)+'<select class="sel" data-mi="'+i+'" data-f="type">'+tOpts(m.type)+'</select></span></td>'+
'<td class="r"><input class="inp inp-num" type="text" value="'+fmt(m.amount)+'" style="width:90px;padding:2px 4px;font-size:11px" data-mi="'+i+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"></td>'+'<td class="r"><input type="number" class="inp inp-num" value="'+m.billing_day+'" min="1" max="31" style="width:46px;font-size:11px" data-mi="'+i+'" data-f="billing_day"></td>'+
'<td><select class="sel" data-mi="'+i+'" data-f="card">'+cOpts(m.card)+'</select></td>'+'<td class="r"><input type="checkbox" '+(m.auto_pay?'checked':'')+' title="'+(m.auto_pay?'Auto-charged':'Manual payment')+'" onchange="D.monthly['+i+'].auto_pay=this.checked;saveD();if(typeof renderBillReminder===\'function\')try{renderBillReminder()}catch(e){}"></td>'+
'<td><select class="sel" style="font-size:9px;'+stStyle+'" data-mi="'+i+'" data-f="status"><option value="Active"'+(st==='Active'?' selected':'')+' style="color:var(--success)">Active</option><option value="Hold"'+(st==='Hold'?' selected':'')+' style="color:var(--warning)">Hold</option><option value="Cancelled"'+(st==='Cancelled'?' selected':'')+' style="color:var(--error)">Cancelled</option></select></td>'+
'<td><button class="del-btn" onclick="readAll();D.monthly.splice('+i+',1);renderMonthly()"><i class="fa-solid fa-trash"></i></button></td></tr>';
// detail row (timing/period settings) — spans all columns, hidden unless expanded
var detail='<tr class="m-detail" data-mrow="'+i+'" style="'+(open?'':'display:none;')+(m.direction==='income'?'background:rgba(16,185,129,0.03)':'background:var(--bg3)')+rowOpac+'"><td></td><td></td><td colspan="9" style="padding:8px 10px">'+
'<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;font-size:10px">'+

'<div><div style="color:var(--text3);margin-bottom:2px">Effective pay</div><div style="padding:3px 0">'+effTxt+'</div></div>'+
'<div><div style="color:var(--text3);margin-bottom:2px">Deadline</div><div style="display:flex;align-items:center">'+dlHtml+'</div></div>'+
'<div><div style="color:var(--text3);margin-bottom:2px">Starts</div><div style="display:flex;align-items:center">'+startHtml+'</div></div>'+
'<div><div style="color:var(--text3);margin-bottom:2px">Ends</div><div style="display:flex;align-items:center">'+endHtml+'</div></div>'+
'<div><div style="color:var(--text3);margin-bottom:2px" title="Link this recurring bill to a utility so months with a real UtilityLog bill skip this forecast (no double-count). Saves automatically.">Utility link</div><div style="display:flex;align-items:center"><select class="sel" style="font-size:9px;width:110px" data-mi="'+i+'" data-f="util_link" onchange="D.monthly['+i+'].util_link=this.value;saveD();if(typeof simulate===\'function\')simulate();if(typeof toast===\'function\')toast(\'\\u2705 Saved\')"><option value=""'+(!m.util_link?' selected':'')+'>\u2014 None</option><option value="electric"'+(m.util_link==='electric'?' selected':'')+'>\u26a1 Electricity</option><option value="water"'+(m.util_link==='water'?' selected':'')+'>\ud83d\udca7 Water</option></select></div></div>'+

'</div></td></tr>';
return mainRow+detail}).join('')}

/* Add Monthly / Add Yearly open a popup form (same pattern as To-Do / Planned): the item is added
   only on Save, then the page scrolls to the new row and outlines it. Advanced timing (start/end,
   deadline, utility link, installment periods) is still set in the row's ▶ detail after saving. */
function _recAddOpen(kind){
readAll();
var Y=kind==='yearly';
var ov=document.getElementById('rec-add-ov');
if(!ov){ov=document.createElement('div');ov.id='rec-add-ov';
 ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
 ov.addEventListener('mousedown',function(e){if(e.target===ov)recAddClose();});
 document.body.appendChild(ov);}
var row=function(lbl,html){return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">'+lbl+'</label>'+html+'</div>';};
var monthSel='<select id="ra-month" class="sel">'+MO.map(function(mn,mi){return '<option value="'+(mi+1)+'"'+(mi===new Date().getMonth()?' selected':'')+'>'+mn+'</option>';}).join('')+'</select>';
ov.innerHTML='<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(480px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)" onkeydown="if(event.key===\'Escape\')recAddClose();if(event.key===\'Enter\'){event.preventDefault();recAddSave(\''+kind+'\');}">'
 +'<h3 style="margin:0 0 12px;font-size:14px"><i class="fa-solid fa-plus"></i> New '+(Y?'yearly':'monthly')+' recurring</h3>'
 +'<div style="display:grid;gap:10px">'
 +row('Name *','<input id="ra-name" class="inp" placeholder="'+(Y?'e.g. Car insurance':'e.g. Netflix')+'" style="width:100%">')
 +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
 +row('Income / Expense','<select id="ra-dir" class="sel">'+dirOpts('expense')+'</select>')
 +row('Type','<select id="ra-type" class="sel">'+tOpts(D.types[0]||'Other')+'</select>')
 +'</div>'
 +'<div style="display:grid;grid-template-columns:'+(Y?'1fr 1fr 1fr':'1fr 1fr')+';gap:10px">'
 +row('Amount *','<input id="ra-amt" class="inp inp-num" inputmode="decimal" placeholder="0.00">')
 +row('Billing day *','<input id="ra-day" type="number" min="1" max="31" class="inp inp-num" value="1">')
 +(Y?row('Month','<span>'+monthSel+'</span>'):'')
 +'</div>'
 +row('Card','<select id="ra-card" class="sel">'+cOpts('Cash/Direct')+'</select>')
 +(Y?row('Pay mode','<div style="display:flex;gap:8px;align-items:center"><select id="ra-pay" class="sel" onchange="document.getElementById(\'ra-perwrap\').style.visibility=this.value===\'installment\'?\'visible\':\'hidden\'"><option value="full">Full</option><option value="installment">Installment</option></select><span id="ra-perwrap" style="visibility:hidden;font-size:10px;color:var(--text3)"><input id="ra-per" type="number" min="1" max="60" value="10" class="inp inp-num" style="width:56px"> periods</span></div>'):'')
 +'<label style="display:inline-flex;align-items:center;gap:6px;font-size:10px;color:var(--text2)"><input type="checkbox" id="ra-auto"> Auto-charged (auto-pay)</label>'
 +'</div>'
 +'<div id="ra-err" style="color:var(--error);font-size:10px;min-height:14px;margin-top:6px"></div>'
 +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button class="btn btn-ghost" onclick="recAddClose()">Cancel</button><button class="btn btn-primary" onclick="recAddSave(\''+kind+'\')"><i class="fa-solid fa-floppy-disk"></i> Save</button></div>'
 +'<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save \u00b7 Esc = Cancel \u00b7 start/end date, deadline'+(Y?'':', utility link')+' can be set in the row (\u25b6) after saving</div>'
 +'</div>';
ov.style.display='flex';
setTimeout(function(){var e=document.getElementById('ra-name');if(e)e.focus();},30);
}
function recAddClose(){var ov=document.getElementById('rec-add-ov');if(ov){ov.style.display='none';ov.innerHTML='';}}
function recAddSave(kind){
var Y=kind==='yearly';
var g=function(id){var e=document.getElementById(id);return e?String(e.value).trim():'';};
var err=function(m,f){var e=document.getElementById('ra-err');if(e)e.textContent=m;var fe=document.getElementById(f);if(fe&&fe.focus)fe.focus();};
var name=g('ra-name'); if(!name){err('Please enter a name','ra-name');return;}
var amt=parseFloat(g('ra-amt').replace(/,/g,'')); if(!(amt>0)){err('Enter an amount greater than 0','ra-amt');return;}
var day=parseInt(g('ra-day'),10); if(!(day>=1&&day<=31)){err('Billing day must be 1-31','ra-day');return;}
var ae=document.getElementById('ra-auto'), auto=!!(ae&&ae.checked);
var base={name:name,type:g('ra-type')||D.types[0]||'Other',amount:amt,billing_day:day,card:g('ra-card')||'Cash/Direct',
 direction:g('ra-dir')||'expense',status:'Active',start_mode:'forever',deadline_mode:'custom',deadline_day:'',auto_pay:auto};
var list,idx,sel;
if(Y){
 var pm=g('ra-pay')||'full', per=pm==='installment'?Math.max(1,Math.min(60,parseInt(g('ra-per'),10)||1)):1;
 base.month=parseInt(g('ra-month'),10)||1; base.pay_mode=pm; base.inst_periods=per; base.own_by='Me'; base.start_from='';
 D.yearly.push(base); idx=D.yearly.length-1; sel='#yearly-body tr.y-main[data-yrow="'+idx+'"]';
}else{
 base.start_date=''; base.end_mode='forever'; base.end_date='';
 D.monthly.push(base); idx=D.monthly.length-1; sel='#monthly-body tr.m-main[data-mrow="'+idx+'"]';
}
saveD();recAddClose();
simulate();renderAllTabs();
try{Y?filterYearly():filterMonthly();}catch(e){}
var r=document.querySelector(sel);
if(r){r.style.outline='2px solid var(--primary)';r.style.outlineOffset='-2px';if(r.scrollIntoView){try{r.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}}}
if(typeof toast==='function')toast('\u2705 '+(Y?'Yearly':'Monthly')+' item added');
}
function addMonthly(){_recAddOpen('monthly');}

function toggleAllMonthly(c){document.querySelectorAll('.m-chk').forEach(function(cb){var tr=cb.closest('tr');if(tr&&tr.style.display!=='none')cb.checked=c});updateMonthlyBulk()}
function updateMonthlyBulk(){var n=document.querySelectorAll('.m-chk:checked').length;var el=document.getElementById('monthly-bulk');if(el)el.style.display=n>0?'':'none';var c=document.getElementById('m-sel-count');if(c)c.textContent=n}
function deleteSelectedMonthly(){var idxs=[];document.querySelectorAll('.m-chk:checked').forEach(function(cb){idxs.push(parseInt(cb.dataset.idx))});if(!idxs.length)return;if(!confirm('Delete '+idxs.length+' monthly item(s)?'))return;readAll();idxs.sort(function(a,b){return b-a});idxs.forEach(function(i){D.monthly.splice(i,1)});saveD();renderMonthly();filterMonthly();toast('\ud83d\uddd1\ufe0f Deleted '+idxs.length+' item(s)')}

// YEARLY

var _yExpanded={};
function yToggle(i){_yExpanded[i]=!_yExpanded[i];renderYearly();if(typeof filterYearly==='function')try{filterYearly()}catch(e){}}
function renderYearly(){
document.getElementById('yearly-hdr').innerHTML='<th style="width:24px"><input type="checkbox" onchange="toggleAllYearly(this.checked)"></th><th style="width:20px"></th>'+sHdr('yearly','name','Name')+sHdr('yearly','direction','I/E')+sHdr('yearly','type','Type')+sHdr('yearly','amount','Amount')+sHdr('yearly','billing_day','Day')+sHdr('yearly','month','Month')+sHdr('yearly','card','Card')+'<th title="Auto-pay / auto-deduct vs manual">Auto</th><th>Status</th><th></th>';
document.getElementById('yearly-body').innerHTML=D.yearly.map(function(y,i){
var yDirCls=y.direction==='income'?'color:var(--success);font-weight:600':'';
var yst=y.status||'Active';var ystStyle=yst==='Hold'?'color:var(--warning)':yst==='Cancelled'?'color:var(--error);text-decoration:line-through':'color:var(--success)';
var yRowOpac=yst!=='Active'?'opacity:.5;':'';
var open=!!_yExpanded[i];
var dmode=(y.deadline_mode||(y.card&&y.card!=='Cash/Direct'?'card':'custom'));
var dlHtml='<select class="sel" style="font-size:9px;width:70px" data-yi="'+i+'" data-f="deadline_mode" onchange="var dr=this.closest(\'.y-detail\').querySelector(\'.y-dldd\');if(dr)dr.style.display=this.value===\'custom\'?\'\':\'none\'">'+((y.card&&y.card!=='Cash/Direct')?'<option value="card"'+(dmode==='card'?' selected':'')+'>Card</option>':'')+'<option value="custom"'+(dmode==='custom'?' selected':'')+'>Day</option></select><input type="number" class="inp inp-num y-dldd" min="1" max="31" value="'+(y.deadline_day||'')+'" placeholder="dd" style="width:46px;font-size:9px;margin-left:4px;display:'+(dmode==='custom'?'':'none')+'" data-yi="'+i+'" data-f="deadline_day">';
var smode=(y.start_mode||'forever');
var startHtml='<select class="sel" style="font-size:9px;width:80px" data-yi="'+i+'" data-f="start_mode" onchange="var dr=this.closest(\'.y-detail\').querySelector(\'.y-startdt\');if(dr)dr.style.display=this.value===\'date\'?\'\':\'none\'"><option value="forever"'+(smode==='forever'?' selected':'')+'>∞ Always</option><option value="date"'+(smode==='date'?' selected':'')+'>📅 From</option></select><input type="date" class="inp y-startdt" value="'+(smode==='date'?(y.start_from||''):'')+'" style="width:120px;font-size:9px;margin-left:4px;display:'+(smode==='date'?'':'none')+'" data-yi="'+i+'" data-f="start_from">';
var periodsHtml=(y.pay_mode==='installment'?'<input type="number" class="inp inp-num" value="'+y.inst_periods+'" min="1" max="60" style="width:46px;font-size:10px" data-yi="'+i+'" data-f="inst_periods">':'<input type="number" class="inp inp-num" value="1" min="1" max="1" disabled style="width:46px;font-size:10px;opacity:.5" data-yi="'+i+'" data-f="inst_periods">');
var payModeHtml='<select class="sel" data-yi="'+i+'" data-f="pay_mode" onchange="readAll();if(this.value===\'full\')D.yearly['+i+'].inst_periods=1;saveD();renderYearly();filterYearly()"><option value="full"'+(y.pay_mode==='full'?' selected':'')+'>Full</option><option value="installment"'+(y.pay_mode==='installment'?' selected':'')+'>Installment</option></select>';
// main row
var mainRow='<tr class="y-main" data-yrow="'+i+'" style="'+(y.direction==='income'?'background:rgba(16,185,129,0.05)':'')+yRowOpac+'"><td><input type="checkbox" class="y-chk" data-idx="'+i+'" onchange="updateYearlyBulk()"></td>'+
'<td><span style="cursor:pointer;user-select:none;color:var(--text3)" onclick="yToggle('+i+')" title="Show pay mode / periods / deadline / start settings">'+(open?'▼':'▶')+'</span></td>'+
'<td><input class="inp-inline" value="'+esc(y.name)+'" data-yi="'+i+'" data-f="name"></td>'+
'<td><select class="sel" style="'+yDirCls+'" data-yi="'+i+'" data-f="direction">'+dirOpts(y.direction)+'</select></td>'+
'<td><span style="display:inline-flex;align-items:center;gap:4px">'+typeIcon(y.type)+'<select class="sel" data-yi="'+i+'" data-f="type">'+tOpts(y.type)+'</select></span></td>'+
'<td class="r"><input class="inp inp-num" type="text" value="'+fmt(y.amount)+'" style="width:90px;padding:2px 4px;font-size:11px" data-yi="'+i+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+y.billing_day+'" min="1" max="31" style="width:46px;font-size:11px" data-yi="'+i+'" data-f="billing_day"></td>'+
'<td><select class="sel" style="width:56px;font-size:10px" data-yi="'+i+'" data-f="month">'+MO.map(function(mn,mi){return '<option value="'+(mi+1)+'"'+(y.month===mi+1?' selected':'')+'>'+mn+'</option>'}).join('')+'</select></td>'+
'<td><select class="sel" data-yi="'+i+'" data-f="card">'+cOpts(y.card)+'</select></td>'+
'<td class="r"><input type="checkbox" '+(y.auto_pay?'checked':'')+' title="'+(y.auto_pay?'Auto-charged':'Manual payment')+'" onchange="D.yearly['+i+'].auto_pay=this.checked;saveD();if(typeof renderBillReminder===\'function\')try{renderBillReminder()}catch(e){}"></td>'+
'<td><select class="sel" style="font-size:9px;'+ystStyle+'" data-yi="'+i+'" data-f="status"><option value="Active"'+(yst==='Active'?' selected':'')+' style="color:var(--success)">Active</option><option value="Hold"'+(yst==='Hold'?' selected':'')+' style="color:var(--warning)">Hold</option><option value="Cancelled"'+(yst==='Cancelled'?' selected':'')+' style="color:var(--error)">Cancelled</option></select></td>'+
'<td><button class="del-btn" onclick="readAll();D.yearly.splice('+i+',1);renderYearly()"><i class="fa-solid fa-trash"></i></button></td></tr>';
// detail row
var detail='<tr class="y-detail" data-yrow="'+i+'" style="'+(open?'':'display:none;')+(y.direction==='income'?'background:rgba(16,185,129,0.03)':'background:var(--bg3)')+yRowOpac+'"><td></td><td></td><td colspan="9" style="padding:8px 10px">'+
'<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;font-size:10px">'+
'<div><div style="color:var(--text3);margin-bottom:2px">Pay Mode</div>'+payModeHtml+'</div>'+
'<div><div style="color:var(--text3);margin-bottom:2px">Periods</div>'+periodsHtml+'</div>'+
'<div><div style="color:var(--text3);margin-bottom:2px">Deadline</div><div style="display:flex;align-items:center">'+dlHtml+'</div></div>'+
'<div><div style="color:var(--text3);margin-bottom:2px">Starts</div><div style="display:flex;align-items:center">'+startHtml+'</div></div>'+
'</div></td></tr>';
return mainRow+detail}).join('')}

function addYearly(){_recAddOpen('yearly');}

function toggleAllYearly(c){document.querySelectorAll('.y-chk').forEach(function(cb){var tr=cb.closest('tr');if(tr&&tr.style.display!=='none')cb.checked=c});updateYearlyBulk()}
function updateYearlyBulk(){var n=document.querySelectorAll('.y-chk:checked').length;var el=document.getElementById('yearly-bulk');if(el)el.style.display=n>0?'':'none';var c=document.getElementById('y-sel-count');if(c)c.textContent=n}
function deleteSelectedYearly(){var idxs=[];document.querySelectorAll('.y-chk:checked').forEach(function(cb){idxs.push(parseInt(cb.dataset.idx))});if(!idxs.length)return;if(!confirm('Delete '+idxs.length+' yearly item(s)?'))return;readAll();idxs.sort(function(a,b){return b-a});idxs.forEach(function(i){D.yearly.splice(i,1)});saveD();renderYearly();filterYearly();toast('\ud83d\uddd1\ufe0f Deleted '+idxs.length+' item(s)')}

// INSTALLMENTS


function togInstMonth(el){el.nextElementSibling.classList.toggle('open');el.querySelector('.arr').classList.toggle('open')}

function renderInstMonthly(){
var _mNow=new Date();var _mTodayMs=Date.UTC(_mNow.getFullYear(),_mNow.getMonth(),_mNow.getDate());
var _mRecentMs=_mTodayMs-40*86400000;
function _instLastDueMs(inst){var cc=D.cards.find(function(x){return x.name===inst.card});var dl=cc?(cc.payment_day||15):15;var sh=(cc&&inst.billing_day&&inst.billing_day>cc.statement_day)?1:0;var per=inst.periods||0;if(per<=0)return null;var lm=(inst.start_month-1)+(per-1)+sh,ly=inst.start_year;while(lm>11){lm-=12;ly++;}return Date.UTC(ly,lm,Math.min(dl,dim(ly,lm)));}
var all=allInstallments().filter(function(x){
if(x.status==='Cancelled'||x.status==='Hold')return false;
if(x.status==='Active'||x.status==='Planned')return true;
// Finished: keep only if its last period ended within the recent window (~40 days)
var _ld=_instLastDueMs(x);return _ld!=null&&_ld>=_mRecentMs&&_ld<=_mTodayMs;
});
if(!all.length){
document.getElementById('inst-monthly-kpis').innerHTML='<div class="kpi"><div class="kpi-label">No active installments</div></div>';
document.getElementById('inst-monthly-table').innerHTML='';return}
var sd=new Date(D.profile.start_date+'T00:00:00'),ed=new Date(D.profile.end_date+'T00:00:00');
var months={},monthKeys=[];
var cur=new Date(sd.getFullYear(),sd.getMonth(),1);
while(cur<=ed){var mk=cur.getFullYear()+'-'+(cur.getMonth()+1<10?'0':'')+(cur.getMonth()+1);
months[mk]={label:MO[cur.getMonth()]+' '+cur.getFullYear(),items:[],total:0};
monthKeys.push(mk);cur.setMonth(cur.getMonth()+1)}
all.forEach(function(inst){
var sy=inst.start_year||parseInt(D.profile.start_date.slice(0,4)),sm=inst.start_month||1;
for(var p=0;p<inst.periods;p++){
var m=sm+p-1,y=sy+Math.floor(m/12);m=m%12+1;
var mk=y+'-'+(m<10?'0':'')+m;
if(months[mk]){months[mk].items.push({name:inst.name,amount:inst.per_period,card:inst.card,info:'('+(p+1)+'/'+inst.periods+')'});
months[mk].total+=inst.per_period}}});
var now=new Date();var nowMk=now.getFullYear()+'-'+(now.getMonth()+1<10?'0':'')+(now.getMonth()+1);
var thisMonth=months[nowMk]||{total:0,items:[]};
var nextMk=now.getFullYear()+'-'+(now.getMonth()+2<10?'0':'')+(now.getMonth()+2);
if(now.getMonth()===11)nextMk=(now.getFullYear()+1)+'-01';
var nextMonth=months[nextMk]||{total:0,items:[]};
var peakMonth={label:'-',total:0};var activeMonths=0;
monthKeys.forEach(function(mk){var m=months[mk];if(m.total>0){activeMonths++;if(m.total>peakMonth.total)peakMonth={label:m.label,total:m.total}}});
var payNet=computePayroll(1).net;
document.getElementById('inst-monthly-kpis').innerHTML=
'<div class="kpi"><div class="kpi-label">This Month</div><div class="kpi-val text-error">\u0e3f'+fmt(thisMonth.total)+'</div><div class="kpi-note">'+thisMonth.items.length+' items'+(payNet>0?' \u2022 '+(thisMonth.total/payNet*100).toFixed(1)+'% of pay':'')+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Next Month</div><div class="kpi-val text-warning">\u0e3f'+fmt(nextMonth.total)+'</div><div class="kpi-note">'+nextMonth.items.length+' items</div></div>'+
'<div class="kpi"><div class="kpi-label">Peak Month</div><div class="kpi-val text-primary">\u0e3f'+fmt(peakMonth.total)+'</div><div class="kpi-note">'+esc(peakMonth.label)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Active Months</div><div class="kpi-val">'+activeMonths+'</div><div class="kpi-note">with payments</div></div>';
var h='<table class="tbl" style="margin-top:8px"><thead><tr><th style="width:28px"></th><th>Month</th><th class="r">Items</th><th class="r">Total</th><th class="r">% of Pay</th></tr></thead><tbody>';
monthKeys.forEach(function(mk){var m=months[mk];if(m.total===0)return;
var isNow=mk===nowMk;
var rowStyle=isNow?'background:var(--primary-bg);font-weight:600':'';
h+='<tr style="cursor:pointer;'+rowStyle+'" onclick="togInstMonth(this)">';
h+='<td><span class="arr" style="font-size:8px;color:var(--text3)">\u25b6</span></td>';
h+='<td style="font-size:11px">'+(isNow?'\u{1f4cd} ':'')+esc(m.label)+'</td>';
h+='<td class="r" style="font-size:10px;color:var(--text3)">'+m.items.length+'</td>';
h+='<td class="r" style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--error)">\u0e3f'+fmt(m.total)+'</td>';
h+='<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--text3)">'+(payNet>0?(m.total/payNet*100).toFixed(1)+'%':'-')+'</td></tr>';
h+='<tr class="acc-body"><td colspan="5" style="padding:0">';
h+='<div style="padding:4px 8px 4px 32px;background:var(--bg3)">';
m.items.forEach(function(it){
h+='<div style="display:flex;gap:6px;padding:2px 0;font-size:10px">';
h+='<span style="flex:1">'+esc(it.name)+'</span>';
if(it.card)h+='<span class="day-card">'+esc(it.card)+'</span>';
h+='<span style="font-size:8px;padding:0 4px;border-radius:4px;background:var(--bg3);color:var(--text3);font-family:var(--mono)">'+esc(it.info)+'</span>';
h+='<span style="font-family:var(--mono);min-width:70px;text-align:right">\u0e3f'+fmt(it.amount)+'</span>';
h+='</div>'});
h+='</div></td></tr>'});
h+='</tbody></table>';
document.getElementById('inst-monthly-table').innerHTML=h}


// Auto-finish: a MANUAL installment whose LAST period has already passed (fully paid) and is
// still marked 'Active' is switched to 'Finished'. Runs before render; saves only if changed.
function autoFinishInstallments(){
if(!D||!Array.isArray(D.installments))return false;
var today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());
var changed=false;
D.installments.forEach(function(inst){
if((inst.status||'Active')!=='Active')return;
var per=inst.periods||0;if(per<=0)return;
var cardObj=(D.cards||[]).find(function(x){return x.name===inst.card;});
var dl=cardObj?(cardObj.payment_day||15):15;
var shift=(cardObj&&inst.billing_day&&inst.billing_day>cardObj.statement_day)?1:0;
var lastM=(inst.start_month-1)+(per-1)+shift,lastY=inst.start_year;while(lastM>11){lastM-=12;lastY++;}
var lastD=new Date(lastY,lastM,Math.min(dl,dim(lastY,lastM)));
if(lastD<today){inst.status='Finished';changed=true;}
});
if(changed){saveD&&saveD();}
return changed;
}
function renderInst(){autoFinishInstallments();var all=allInstallments();
all.forEach(function(x,i){x._oi=i});
if(instSortState.col){var sc=instSortState.col,sa=instSortState.asc;
all.sort(function(a,b){var va,vb;
if(sc==='start_month'){va=(a.start_year||0)*10000+(a.start_month||0)*100+(a.start_day||0);vb=(b.start_year||0)*10000+(b.start_month||0)*100+(b.start_day||0);return sa?va-vb:vb-va}
va=a[sc];vb=b[sc];
if(typeof va==='number'&&typeof vb==='number')return sa?va-vb:vb-va;
va=String(va||'').toLowerCase();vb=String(vb||'').toLowerCase();
return sa?va.localeCompare(vb):vb.localeCompare(va)})}
var normalPay2=computePayroll(1);var annualIncome2=normalPay2.net*12+(computePayroll(12).net-normalPay2.net);
var activeInst=all.filter(function(x){return x.status==='Active'||x.status==='Planned'});
var instMonthly=activeInst.reduce(function(s,x){return s+x.per_period},0);
var instTotal=activeInst.reduce(function(s,x){return s+x.total},0);
document.getElementById('inst-kpis').innerHTML=
'<div class="kpi"><div class="kpi-label">Active Items</div><div class="kpi-val">'+activeInst.length+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Peak Monthly</div><div class="kpi-val text-error">\u0e3f'+fmt(instMonthly)+'</div><div class="kpi-note">'+(normalPay2.net>0?(instMonthly/normalPay2.net*100).toFixed(1)+'% of net pay':'')+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Total Committed</div><div class="kpi-val">\u0e3f'+fmt(instTotal)+'</div><div class="kpi-note">'+(annualIncome2>0?(instTotal/annualIncome2*100).toFixed(1)+'% of annual income':'')+'</div></div>';
var instByType={};activeInst.forEach(function(x){var t=x.type||'Other';if(!instByType[t])instByType[t]={items:[],total:0};instByType[t].items.push(x);instByType[t].total+=x.total});
var igH='';Object.keys(instByType).sort().forEach(function(t){var g=instByType[t];
igH+='<div class="acc-header" onclick="this.querySelector(\'.arr\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')">'+
'<span class="arr">\u25b6</span><span style="flex:1;font-weight:600;font-size:12px">'+esc(t)+'</span>'+
'<span style="font-size:9px;color:var(--text3);margin-right:8px">'+(annualIncome2>0?(g.total/annualIncome2*100).toFixed(1)+'%':'')+'</span>'+
'<span style="font-family:var(--mono);font-size:11px;font-weight:600;min-width:90px;text-align:right">\u0e3f'+fmt(g.total)+'</span></div>'+
'<div class="acc-body">';
g.items.forEach(function(it){
igH+='<div class="day-row" style="padding-left:32px"><span class="day-name" style="font-size:11px">'+esc(it.name)+'</span>'+
'<span style="font-size:9px;color:var(--text3);margin:0 6px">'+esc(it.card)+'</span>'+
'<span class="day-amt" style="font-size:10px">\u0e3f'+fmt(it.per_period)+'/mo</span>'+
'<span style="font-size:9px;color:var(--text3);min-width:35px;text-align:right;margin-right:4px">'+(annualIncome2>0?(it.total/annualIncome2*100).toFixed(1)+'%':'')+'</span>'+
'<span class="day-bal" style="font-size:10px;min-width:80px">\u0e3f'+fmt(it.total)+'</span></div>'});
igH+='</div>'});
document.getElementById('inst-summary-groups').innerHTML=igH;

// Sortable headers for manual installments
var iHdr='<th style="width:24px"><input type="checkbox" id="inst-select-all" onchange="toggleAllInst(this.checked)"></th>'+iSH('name','Item')+iSH('type','Type')+iSH('card','Card')+iSH('own_by','Own By')+
iSH('total','Total')+iSH('per_period','Per Period')+iSH('periods','Periods')+
iSH('start_month','Start Date')+'<th title="Hide periods before this date on Timeline & Bills Reminder (does not change the installment)">Hide Before</th><th>Status</th><th>Source</th><th></th>';
document.getElementById('inst-hdr').innerHTML=iHdr;

// Render rows - manual items are editable, auto items are read-only
var rows='';
var manualCount=D.installments.length;
all.forEach(function(inst,i){
var isAuto=inst.source==='Yearly';
var st=inst.status||'Active';
var stTag='<span class="tag tag-'+st.toLowerCase()+'">'+st+'</span>';
var srcTag=isAuto?'<span class="tag tag-auto">Auto</span>':'<span class="tag" style="background:var(--bg3);color:var(--text3)">Manual</span>';
var opac=st==='Finished'||st==='Cancelled'?'opacity:.4;':'';

if(isAuto){
var ai=inst._oi-manualCount;
rows+='<tr data-idx="'+inst._oi+'" style="'+opac+'"><td style="width:24px"><input type="checkbox" class="inst-chk" data-auto="'+ai+'" value="'+inst._oi+'" onchange="updateInstBulkActions()"></td><td>'+esc(inst.name)+'</td><td><span style="display:inline-flex;align-items:center;gap:4px">'+typeIcon(inst.type)+esc(inst.type)+'</span></td><td><span class="tag tag-auto" style="font-size:9px">'+esc(inst.card)+'</span></td>'+
'<td>'+esc(inst.own_by)+'</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(inst.total)+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(inst.per_period)+'</td>'+
'<td class="r" style="font-family:var(--mono)">'+inst.periods+'</td>'+
'<td style="font-size:10px">'+((inst.start_day||1)<10?'0':'')+(inst.start_day||1)+'/'+(inst.start_month<10?'0':'')+inst.start_month+'/'+inst.start_year+'</td>'+
'<td><input type="date" class="inp" value="'+(inst.hide_before||'')+'" title="Hide periods before this date (Timeline & Bills Reminder). Saved on the source Yearly item." style="width:115px;padding:2px 4px;font-size:10px" onchange="setAutoInstHideBefore('+ai+',this.value)"></td>'+
'<td>'+stTag+'</td><td>'+srcTag+'</td>'+
'<td><button class="del-btn" title="Convert to editable" onclick="convertAutoInst('+ai+')" style="font-size:9px;padding:2px 5px">\u270f\ufe0f</button></td></tr>'}
else{
rows+='<tr data-idx="'+inst._oi+'" style="'+opac+'"><td style="width:24px"><input type="checkbox" class="inst-chk" value="'+inst._oi+'" onchange="updateInstBulkActions()"></td><td><input class="inp-inline" value="'+esc(inst.name)+'" data-ii="'+inst._oi+'" data-f="name"></td>'+
'<td><span style="display:inline-flex;align-items:center;gap:4px">'+typeIcon(inst.type)+'<select class="sel" data-ii="'+inst._oi+'" data-f="type">'+tOpts(inst.type)+'</select></span></td>'+
'<td><select class="sel" data-ii="'+inst._oi+'" data-f="card">'+cOnlyOpts(inst.card)+'</select></td>'+
'<td><select class="sel" data-ii="'+inst._oi+'" data-f="own_by">'+oOpts(inst.own_by)+'</select></td>'+
'<td class="r"><input class="inp inp-num" type="text" value="'+fmt(inst.total)+'" style="width:80px;padding:2px 4px;font-size:10px" data-ii="'+inst._oi+'" data-f="total" onchange="calcPP('+i+')" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"></td>'+
'<td class="r"><input class="inp inp-num" type="text" value="'+fmt(inst.per_period)+'" style="width:80px;padding:2px 4px;font-size:10px" data-ii="'+inst._oi+'" data-f="per_period" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+inst.periods+'" min="1" max="60" style="width:40px;padding:2px 4px;font-size:10px" data-ii="'+inst._oi+'" data-f="periods" onchange="calcPP('+i+')"></td>'+
'<td><input type="date" class="inp" value="'+inst.start_year+'-'+(inst.start_month<10?'0':'')+inst.start_month+'-'+((inst.start_day||1)<10?'0':'')+(inst.start_day||1)+'" style="width:115px;padding:2px 4px;font-size:10px" data-ii="'+inst._oi+'" data-f="start_date"></td>'+
'<td><input type="date" class="inp" value="'+(inst.hide_before||'')+'" title="Hide periods before this date (Timeline & Bills Reminder)" style="width:115px;padding:2px 4px;font-size:10px" data-ii="'+inst._oi+'" data-f="hide_before"></td>'+
'<td><select class="sel" data-ii="'+inst._oi+'" data-f="status">'+STATUSES.map(function(s){return '<option'+(st===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select></td>'+
'<td>'+srcTag+'</td>'+
'<td><button class="del-btn" onclick="if(confirm(\'Delete?\')){{readAll();D.installments.splice('+inst._oi+',1);renderInst()}}"><i class="fa-solid fa-trash"></i></button></td></tr>'}});
document.getElementById('inst-body').innerHTML=rows;
populateInstDropdown()}

var instSortState={col:null,asc:true};

function iSH(col,label){
var arrow=instSortState.col===col?(instSortState.asc?' \u25b2':' \u25bc'):'';
var isNum=col==='total'||col==='per_period'||col==='periods'||col==='start_month';
return '<th style="cursor:pointer" onclick="readAll();sortInst(\''+col+'\')" '+(isNum?'class="r"':'')+'>'+label+arrow+'</th>'}


function calcPP(idx){
var inst=D.installments[idx];if(!inst)return;
readAll();
if(inst.total>0&&inst.periods>0){
inst.per_period=Math.round(inst.total/inst.periods*100)/100;
renderInst()}}



function sortInst(col){
if(instSortState.col===col)instSortState.asc=!instSortState.asc;else{instSortState.col=col;instSortState.asc=true}
renderInst();renderInstMonthly();filterInst()}


function toggleAllInst(checked){
document.querySelectorAll('.inst-chk').forEach(function(cb){
var tr=cb.closest('tr');
if(tr&&tr.style.display==='none')return;
cb.checked=checked});
updateInstBulkActions()}


function updateInstBulkActions(){
var count=0;
document.querySelectorAll('.inst-chk:checked').forEach(function(cb){
var tr=cb.closest('tr');
if(tr&&tr.style.display!=='none')count++});
var el=document.getElementById('inst-bulk-actions');
var countEl=document.getElementById('inst-sel-count');
if(el)el.style.display=count>0?'':'none';
if(countEl)countEl.textContent=count}


function deleteSelectedInst(){
var manualIndices=[],autoIndices=[];
document.querySelectorAll('.inst-chk:checked').forEach(function(cb){
var tr=cb.closest('tr');if(tr&&tr.style.display==='none')return;
if(cb.dataset.auto!=null){autoIndices.push(parseInt(cb.dataset.auto))}
else{manualIndices.push(parseInt(cb.value))}});
var total=manualIndices.length+autoIndices.length;
if(total===0)return;
if(!confirm('Delete '+total+' selected installment(s)?'))return;
readAll();
manualIndices.sort(function(a,b){return b-a});
manualIndices.forEach(function(idx){D.installments.splice(idx,1)});
if(autoIndices.length>0){
var autoItems=[];
D.yearly.forEach(function(y,yi){if(y.pay_mode==='installment'){autoItems.push(yi)}});
autoIndices.sort(function(a,b){return b-a});
autoIndices.forEach(function(ai){
if(ai>=0&&ai<autoItems.length){D.yearly[autoItems[ai]].pay_mode='full';D.yearly[autoItems[ai]].inst_periods=1}})}
saveD();simulate();renderAllTabs();
toast('\ud83d\uddd1\ufe0f Deleted '+total+' item(s)')}

var plannedSortState={col:null,asc:true};

function pSH(col,label){var st=plannedSortState;var arrow=st.col===col?(st.asc?' \u25b2':' \u25bc'):'';
var isNum=['amount'].indexOf(col)>=0;
return '<th style="cursor:pointer" onclick="readAll();sortPlanned(\''+col+'\')" '+(isNum?'class="r"':'')+'>'+label+arrow+'</th>'}


function renderInstMatrix(){
var el=document.getElementById('inst-matrix');if(!el)return;
// Include Active/Planned, PLUS recently-finished installments whose last period ended within ~40 days
// (same principle as the Installment Timeline gantt). Exclude Cancelled/Hold.
var _mNow=new Date();var _mTodayMs=Date.UTC(_mNow.getFullYear(),_mNow.getMonth(),_mNow.getDate());
var _mRecentMs=_mTodayMs-40*86400000;
function _instLastDueMs(inst){var cc=D.cards.find(function(x){return x.name===inst.card});var dl=cc?(cc.payment_day||15):15;var sh=(cc&&inst.billing_day&&inst.billing_day>cc.statement_day)?1:0;var per=inst.periods||0;if(per<=0)return null;var lm=(inst.start_month-1)+(per-1)+sh,ly=inst.start_year;while(lm>11){lm-=12;ly++;}return Date.UTC(ly,lm,Math.min(dl,dim(ly,lm)));}
var all=allInstallments().filter(function(x){
if(x.status==='Cancelled'||x.status==='Hold')return false;
if(x.status==='Active'||x.status==='Planned')return true;
var _ld=_instLastDueMs(x);return _ld!=null&&_ld>=_mRecentMs&&_ld<=_mTodayMs;
});
if(!all.length){el.innerHTML='<div class="text-muted" style="font-size:10px;padding:8px">No active installments.</div>';return}

// Build month range from profile — but extend the START backward to cover any recently-finished
// installment whose periods fall before the simulation start (so they aren't zero-column-filtered out).
var sd=new Date(D.profile.start_date+'T00:00:00'),ed=new Date(D.profile.end_date+'T00:00:00');
var _rangeStart=new Date(sd.getFullYear(),sd.getMonth(),1);
all.forEach(function(inst){
var cc=D.cards.find(function(x){return x.name===inst.card});var _sh=(cc&&inst.billing_day&&inst.billing_day>cc.statement_day)?1:0;
var _m0=(inst.start_month-1)+_sh,_y0=inst.start_year;while(_m0>11){_m0-=12;_y0++;}while(_m0<0){_m0+=12;_y0--;}
var _d0=new Date(_y0,_m0,1);
// only extend for recently-FINISHED items, and cap at 2 months before sim start
var _cap=new Date(sd.getFullYear(),sd.getMonth()-2,1);
if((inst.status!=='Active'&&inst.status!=='Planned')&&_d0<_rangeStart&&_d0>=_cap)_rangeStart=_d0;
});
var months=[],cur=new Date(_rangeStart.getFullYear(),_rangeStart.getMonth(),1);
while(cur<=ed){months.push({y:cur.getFullYear(),m:cur.getMonth()});cur.setMonth(cur.getMonth()+1)}

// Build matrix: for each installment, determine which months have payments
var matrix={};// key: instIdx, value: {monthKey: amount}
var instNames=[];
all.forEach(function(inst,idx){
instNames.push({name:inst.name,card:inst.card||'',total:inst.total||0,perPeriod:inst.per_period||0,periods:inst.periods||1});
matrix[idx]={};
var sy=inst.start_year||parseInt(D.profile.start_date.slice(0,4)),sm=inst.start_month||1;
// Apply card month shift
var c=D.cards.find(function(x){return x.name===inst.card});
var monthShift=(c&&inst.billing_day&&inst.billing_day>c.statement_day)?1:0;
for(var p=0;p<inst.periods;p++){
var m=sm-1+p+monthShift,y=sy;
while(m>11){m-=12;y++}
var mk=y+'-'+(m<10?'0':'')+m;
matrix[idx][mk]=inst.per_period}});

// Sort by last payment date > start payment date > name
var lastMonth={},firstMonth={};
for(var li=0;li<instNames.length;li++){
var mks=Object.keys(matrix[li]);mks.sort();
lastMonth[li]=mks.length?mks[mks.length-1]:'9999-99';
firstMonth[li]=mks.length?mks[0]:'9999-99'}
var order=[];for(var i=0;i<instNames.length;i++)order.push(i);
order.sort(function(a,b){var d1=lastMonth[a].localeCompare(lastMonth[b]);if(d1!==0)return d1;var d2=firstMonth[a].localeCompare(firstMonth[b]);if(d2!==0)return d2;return instNames[a].name.localeCompare(instNames[b].name)});
// Hide zero-total columns: drop any installment with no payments inside the visible month range.
var _monthKeys=months.map(function(mo){return mo.y+'-'+(mo.m<10?'0':'')+mo.m;});
order=order.filter(function(idx){var t=0;_monthKeys.forEach(function(mk){t+=matrix[idx][mk]||0;});return t>0;});
if(!order.length){el.innerHTML='<div class="text-muted" style="font-size:10px;padding:8px">No installment payments fall within the simulation period.</div>';return;}

// Render table
var h='<table class="tbl" style="font-size:10px;white-space:nowrap">';
// Header: Month | inst1 | inst2 | ... | Total
h+='<thead><tr><th style="position:sticky;left:0;background:var(--bg3);z-index:1;min-width:70px">Month</th>';
order.forEach(function(idx){
var inf=instNames[idx];
h+='<th class="r" style="min-width:75px;font-size:8px" title="'+esc(inf.name)+'">'+esc(inf.name.length>12?inf.name.slice(0,11)+'\u2026':inf.name)+'</th>'});
h+='<th class="r" style="min-width:80px;font-weight:700;background:var(--primary-bg)">Total</th></tr></thead><tbody>';

// Read threshold
var threshEl=document.getElementById('inst-threshold');
var threshold=threshEl?pn(threshEl.value):10000;
var grandTotal=0;
var colTotals={};order.forEach(function(idx){colTotals[idx]=0});

months.forEach(function(mo){
var mk=mo.y+'-'+(mo.m<10?'0':'')+mo.m;
var rowTotal=0;var hasAny=false;
order.forEach(function(idx){var v=matrix[idx][mk]||0;rowTotal+=v;if(v>0)hasAny=true;colTotals[idx]+=v});
if(!hasAny)return;// skip months with no payments
grandTotal+=rowTotal;
var overThreshold=threshold>0&&rowTotal>threshold;
var isNow=(mo.y===new Date().getFullYear()&&mo.m===new Date().getMonth());
var rowStyle='';var stickyBg='var(--bg2)';
if(isNow&&overThreshold){rowStyle='background:linear-gradient(90deg,rgba(74,122,237,.18),rgba(220,38,38,.12));font-weight:700;border-top:2px solid var(--primary);border-bottom:2px solid var(--primary)';stickyBg='rgba(74,122,237,.18)'}
else if(isNow){rowStyle='background:var(--primary-bg);font-weight:700;border-top:2px solid var(--primary);border-bottom:2px solid var(--primary)';stickyBg='var(--primary-bg)'}
else if(overThreshold){rowStyle='background:var(--error-bg)';stickyBg='var(--error-bg)'}
var nowLabel=isNow?'<span style="display:inline-block;background:var(--primary);color:#fff;font-size:7px;padding:1px 5px;border-radius:8px;margin-right:4px;font-weight:700;letter-spacing:.5px;vertical-align:middle">NOW</span>':'';
h+='<tr style="'+rowStyle+'"><td style="position:sticky;left:0;background:'+stickyBg+';z-index:1;font-weight:600">'+nowLabel+(overThreshold?'\u26a0\ufe0f ':'')+ MO[mo.m]+' '+String(mo.y).slice(2)+'</td>';
order.forEach(function(idx){
var v=matrix[idx][mk]||0;
var cellStyle='font-family:var(--mono);color:'+(v>0?'var(--text)':'var(--border)');
if(isNow&&v>0)cellStyle+=';font-weight:600;color:var(--primary)';
h+='<td class="r" style="'+cellStyle+'">'+
(v>0?'\u0e3f'+fmt(v):'\u2014')+'</td>'});
h+='<td class="r" style="font-family:var(--mono);font-weight:700;color:'+(overThreshold?'#fff':'var(--error)')+';background:'+(overThreshold?'var(--error)':'var(--error-bg)')+';border-radius:'+(overThreshold?'4px':'0')+'">\u0e3f'+fmt(rowTotal)+(overThreshold?' \u26a0\ufe0f':'')+'</td></tr>'});

// Footer: column totals
h+='<tr style="font-weight:700;background:var(--bg3)"><td style="position:sticky;left:0;background:var(--bg3);z-index:1">TOTAL</td>';
order.forEach(function(idx){
h+='<td class="r" style="font-family:var(--mono);font-size:9px">\u0e3f'+fmt(colTotals[idx])+'</td>'});
h+='<td class="r" style="font-family:var(--mono);color:var(--error);font-size:11px">\u0e3f'+fmt(grandTotal)+'</td></tr>';

h+='</tbody></table>';
el.innerHTML=h;

// Highcharts areaspline — render into inst-matrix-chart
var chartDiv=document.getElementById('inst-matrix-chart');
if(!chartDiv||typeof Highcharts==='undefined')return;
// Build chart data from variables already in scope (months, order, matrix, instNames)
var cLabels=[],cTotals=[];
months.forEach(function(mo2){
var mk2=mo2.y+'-'+(mo2.m<10?'0':'')+mo2.m;
var rt2=0;order.forEach(function(idx2){rt2+=matrix[idx2][mk2]||0});
if(rt2>0){cLabels.push(MO[mo2.m]+' '+String(mo2.y).slice(2));cTotals.push(Math.round(rt2*100)/100)}});
if(!cLabels.length){chartDiv.innerHTML='';return}
try{
var dk=document.documentElement.classList.contains('dark');
var tc=dk?'#e8eaed':'#1a1d27',tc2=dk?'#6b7185':'#7a8098',gc=dk?'#353849':'#d4d7e0',bg2=dk?'#1a1d27':'#fff';
var sc=dk?'#f87171':'#dc2626';
Highcharts.chart(chartDiv,{
chart:{type:'areaspline',backgroundColor:'transparent',height:280},
title:{text:'Monthly Installment Payments',style:{color:tc,fontWeight:'600',fontSize:'13px'}},
xAxis:{categories:cLabels,labels:{style:{color:tc2,fontSize:'9px'},rotation:-45},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'},formatter:function(){return'\u0e3f'+Highcharts.numberFormat(this.value/1000,0)+'K'}},gridLineColor:gc,min:0,
plotLines:threshold>0?[{color:dk?'#fbbf24':'#d97706',width:2,value:threshold,dashStyle:'ShortDash',label:{text:'Threshold \u0e3f'+fmt(threshold),style:{color:dk?'#fbbf24':'#d97706',fontSize:'9px',fontWeight:'600'},align:'right'},zIndex:4}]:[]},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},
pointFormat:'\u0e3f{point.y:,.2f}'},
plotOptions:{areaspline:{marker:{enabled:false,states:{hover:{enabled:true,radius:3}}}}},
series:[{name:'Installment Total',data:cTotals,color:sc,
fillColor:{linearGradient:{x1:0,y1:0,x2:0,y2:1},stops:[[0,sc+'40'],[1,sc+'05']]},
lineWidth:2}],
legend:{enabled:false},credits:{enabled:false}});
}catch(ce){console.error('InstChart:',ce)}
}


var _plExpanded={};
function plToggle(i){_plExpanded[i]=!_plExpanded[i];renderPlanned();if(typeof filterPlanned==='function')try{filterPlanned()}catch(e){}}
// A Planned row is "paid" if any paid-ledger entry exists for its occurrence. The ledger key is
// 'P|'+name+'|'+date+'::'+YYYY-MM (the period month may be card-shifted), so match by the stable
// 'P|name|date::' prefix rather than reconstructing the shifted month.
var _planShowPaid=false;
function _planIsPaid(p){
  if(!p||!D.bill_payments)return false;
  var pfx='P|'+(p.name||'')+'|'+(p.date||'')+'::';
  var keys=Object.keys(D.bill_payments);
  for(var i=0;i<keys.length;i++){var k=keys[i];if(k.indexOf(pfx)===0){var r=D.bill_payments[k];if(r&&r.paid)return true;}}
  return false;
}
function renderPlanned(){
if(!D||!D.planned)return;
document.getElementById('planned-hdr').innerHTML='<th style="width:24px"><input type="checkbox" onchange="toggleAllPlanned(this.checked)"></th><th style="width:20px"></th>'+pSH('name','Name')+'<th>I/E</th>'+pSH('type','Type')+pSH('amount','Amount')+'<th>Date</th><th>Card</th><th title="Auto-pay / auto-deduct vs manual">Auto</th><th></th>';
document.getElementById('planned-body').innerHTML=D.planned.map(function(p,i){
var dirCls=p.direction==='income'?'color:var(--success);font-weight:600':'';
var open=!!_plExpanded[i];
var mainRow='<tr class="pl-main" data-plrow="'+i+'" style="'+(p.direction==='income'?'background:rgba(16,185,129,0.05)':'')+'"><td><input type="checkbox" class="pl-chk" data-idx="'+i+'" onchange="updatePlannedBulk()"></td>'+
'<td><span style="cursor:pointer;user-select:none;color:var(--text3)" onclick="plToggle('+i+')" title="Show owner / notes">'+(open?'▼':'▶')+'</span></td>'+
'<td><input class="inp-inline" value="'+esc(p.name)+'" data-pli="'+i+'" data-f="name" onchange="readAll();saveD()"></td>'+
'<td><select class="sel" style="'+dirCls+'" data-pli="'+i+'" data-f="direction" onchange="readAll();saveD();simulate();renderAllTabs()">'+dirOpts(p.direction)+'</select></td>'+
'<td><span style="display:inline-flex;align-items:center;gap:4px">'+typeIcon(p.type)+'<select class="sel" data-pli="'+i+'" data-f="type" onchange="readAll();saveD()">'+tOpts(p.type)+'</select></span></td>'+
'<td class="r"><input class="inp inp-num" type="text" value="'+fmt(p.amount)+'" style="width:90px;padding:2px 4px;font-size:11px" data-pli="'+i+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2});readAll();saveD();simulate();renderAllTabs()"></td>'+
'<td><input type="date" class="inp" value="'+(p.date||'')+'" style="width:120px;font-size:10px" data-pli="'+i+'" data-f="date" onchange="readAll();saveD();simulate();renderAllTabs()"></td>'+
'<td><select class="sel" data-pli="'+i+'" data-f="card" onchange="readAll();saveD();simulate();renderAllTabs()">'+cOpts(p.card)+'</select></td>'+
'<td class="r"><input type="checkbox" '+(p.auto_pay?'checked':'')+' title="'+(p.auto_pay?'Auto-charged':'Manual payment')+'" onchange="D.planned['+i+'].auto_pay=this.checked;saveD();if(typeof renderBillReminder===\'function\')try{renderBillReminder()}catch(e){}"></td>'+
'<td><button class="del-btn" onclick="readAll();D.planned.splice('+i+',1);renderPlanned();filterPlanned()"><i class="fa-solid fa-trash"></i></button></td></tr>';
var detail='<tr class="pl-detail" data-plrow="'+i+'" style="'+(open?'':'display:none;')+(p.direction==='income'?'background:rgba(16,185,129,0.03)':'background:var(--bg3)')+'"><td></td><td></td><td colspan="8" style="padding:8px 10px">'+
'<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;font-size:10px">'+
'<div><div style="color:var(--text3);margin-bottom:2px">Own By</div><select class="sel" data-pli="'+i+'" data-f="own_by" onchange="readAll();saveD()">'+oOpts(p.own_by)+'</select></div>'+
'<div style="flex:1;min-width:200px"><div style="color:var(--text3);margin-bottom:2px">Notes</div><input class="inp" value="'+esc(p.notes||'')+'" data-pli="'+i+'" data-f="notes" style="font-size:10px;width:100%" onchange="readAll();saveD()"></div>'+
'</div></td></tr>';
return mainRow+detail}).join('');
// Warn about planned items whose date falls outside the simulation window (they won't appear on the Timeline)
var _pw=document.getElementById('planned-window-warn');
if(_pw){
var sd=D.profile&&D.profile.start_date?new Date(D.profile.start_date+'T00:00:00'):null;
var ed=D.profile&&D.profile.end_date?new Date(D.profile.end_date+'T00:00:00'):null;
var outside=[];
D.planned.forEach(function(p){if(!p.date)return;var d=new Date(p.date+'T00:00:00');if(sd&&ed&&(d<sd||d>ed))outside.push(p)});
var noDate=D.planned.filter(function(p){return !p.date}).length;
var msgs=[];
if(outside.length)msgs.push('<b>'+outside.length+'</b> planned item(s) fall <b>outside the simulation window</b> ('+(sd?sd.toLocaleDateString('en-GB'):'?')+' \u2192 '+(ed?ed.toLocaleDateString('en-GB'):'?')+') and won\'t show on the Timeline: '+outside.map(function(p){return esc(p.name)+' ('+p.date+')'}).join(', ')+'. Extend the End date on the Timeline tab.');
if(noDate)msgs.push('<b>'+noDate+'</b> planned item(s) have <b>no date</b> set and are skipped.');
_pw.innerHTML=msgs.length?'<div style="background:rgba(217,119,6,0.12);border:1px solid var(--warning);border-radius:6px;padding:8px 10px;font-size:10px;color:var(--warning);margin-top:8px"><i class="fa-solid fa-triangle-exclamation" style="margin-right:4px"></i>'+msgs.join('<br>')+'</div>':'';
}
populatePlannedFilters()}


/* Add Planned opens a popup form (same pattern as To-Do): the item is added only on Save,
   then the page scrolls to the new row and outlines it so it's easy to find. */
var _plNewIdx=-1;
function addPlanned(){
readAll();
var ov=document.getElementById('pl-add-ov');
if(!ov){ov=document.createElement('div');ov.id='pl-add-ov';
 ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
 ov.addEventListener('mousedown',function(e){if(e.target===ov)plAddClose();});
 document.body.appendChild(ov);}
var row=function(lbl,html){return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">'+lbl+'</label>'+html+'</div>';};
ov.innerHTML='<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(480px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)" onkeydown="if(event.key===\'Escape\')plAddClose();if(event.key===\'Enter\'){event.preventDefault();plAddSave();}">'
 +'<h3 style="margin:0 0 12px;font-size:14px"><i class="fa-solid fa-plus"></i> New planned item</h3>'
 +'<div style="display:grid;gap:10px">'
 +row('Name *','<input id="pa-name" class="inp" placeholder="e.g. Car insurance renewal" style="width:100%">')
 +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
 +row('Income / Expense','<select id="pa-dir" class="sel">'+dirOpts('expense')+'</select>')
 +row('Type','<select id="pa-type" class="sel">'+tOpts(D.types[0]||'Other')+'</select>')
 +'</div>'
 +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
 +row('Amount *','<input id="pa-amt" class="inp inp-num" inputmode="decimal" placeholder="0.00">')
 +row('Date *','<input id="pa-date" type="date" class="inp">')
 +'</div>'
 +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
 +row('Card','<select id="pa-card" class="sel">'+cOpts('Cash/Direct')+'</select>')
 +row('Own By','<select id="pa-own" class="sel">'+oOpts('Me')+'</select>')
 +'</div>'
 +row('Notes','<input id="pa-notes" class="inp" style="width:100%">')
 +'<label style="display:inline-flex;align-items:center;gap:6px;font-size:10px;color:var(--text2)"><input type="checkbox" id="pa-auto"> Auto-charged (auto-pay)</label>'
 +'</div>'
 +'<div id="pa-err" style="color:var(--error);font-size:10px;min-height:14px;margin-top:6px"></div>'
 +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button class="btn btn-ghost" onclick="plAddClose()">Cancel</button><button class="btn btn-primary" onclick="plAddSave()"><i class="fa-solid fa-floppy-disk"></i> Save</button></div>'
 +'<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save \u00b7 Esc = Cancel</div>'
 +'</div>';
ov.style.display='flex';
setTimeout(function(){var e=document.getElementById('pa-name');if(e)e.focus();},30);
}
function plAddClose(){var ov=document.getElementById('pl-add-ov');if(ov){ov.style.display='none';ov.innerHTML='';}}
function plAddSave(){
var g=function(id){var e=document.getElementById(id);return e?String(e.value).trim():'';};
var err=function(m,f){var e=document.getElementById('pa-err');if(e)e.textContent=m;var fe=document.getElementById(f);if(fe&&fe.focus)fe.focus();};
var name=g('pa-name'); if(!name){err('Please enter a name','pa-name');return;}
var amt=parseFloat(g('pa-amt').replace(/,/g,'')); if(!(amt>0)){err('Enter an amount greater than 0','pa-amt');return;}
var date=g('pa-date'); if(!date){err('Pick a date (items without a date are skipped by the Timeline)','pa-date');return;}
var ae=document.getElementById('pa-auto');
D.planned.push({name:name,type:g('pa-type')||D.types[0]||'Other',amount:amt,date:date,card:g('pa-card')||'Cash/Direct',
 direction:g('pa-dir')||'expense',own_by:g('pa-own')||'Me',notes:g('pa-notes'),auto_pay:!!(ae&&ae.checked)});
_plNewIdx=D.planned.length-1;
saveD();plAddClose();
simulate();renderAllTabs();
try{filterPlanned();}catch(e){}
var r=document.querySelector('#planned-body tr.pl-main[data-plrow="'+_plNewIdx+'"]');
if(r){r.style.outline='2px solid var(--primary)';r.style.outlineOffset='-2px';if(r.scrollIntoView){try{r.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}}}
if(typeof toast==='function')toast('\u2705 Planned item added');
}

function toggleAllPlanned(c){document.querySelectorAll('.pl-chk').forEach(function(cb){var tr=cb.closest('tr');if(tr&&tr.style.display!=='none')cb.checked=c});updatePlannedBulk()}
function updatePlannedBulk(){var n=document.querySelectorAll('.pl-chk:checked').length;var el=document.getElementById('planned-bulk');if(el)el.style.display=n>0?'':'none';var c=document.getElementById('pl-sel-count');if(c)c.textContent=n}
function deleteSelectedPlanned(){var idxs=[];document.querySelectorAll('.pl-chk:checked').forEach(function(cb){idxs.push(parseInt(cb.dataset.idx))});if(!idxs.length)return;if(!confirm('Delete '+idxs.length+' planned item(s)?'))return;readAll();idxs.sort(function(a,b){return b-a});idxs.forEach(function(i){D.planned.splice(i,1)});saveD();renderPlanned();filterPlanned();toast('\ud83d\uddd1\ufe0f Deleted '+idxs.length+' item(s)')}


function sortPlanned(col){
var st=plannedSortState;if(st.col===col)st.asc=!st.asc;else{st.col=col;st.asc=true}
D.planned.sort(function(a,b){
var va=a[col],vb=b[col];
if(typeof va==='number'&&typeof vb==='number')return st.asc?va-vb:vb-va;
va=String(va||'').toLowerCase();vb=String(vb||'').toLowerCase();
return st.asc?va.localeCompare(vb):vb.localeCompare(va)});
renderPlanned();filterPlanned()}


function populatePlannedFilters(){
var types={},cards={};
D.planned.forEach(function(p){types[p.type]=1;if(p.card)cards[p.card]=1});
var ft=document.getElementById('flt-p-type'),fc=document.getElementById('flt-p-card');
if(ft){var cv=ft.value;ft.innerHTML='<option value="">All Types</option>'+Object.keys(types).sort().map(function(t){return '<option'+(cv===t?' selected':'')+'>'+esc(t)+'</option>'}).join('')}
if(fc){var cv2=fc.value;fc.innerHTML='<option value="">All Cards</option>'+Object.keys(cards).sort().map(function(c){return '<option'+(cv2===c?' selected':'')+'>'+esc(c)+'</option>'}).join('')}}


function filterPlanned(){var ft=document.getElementById('flt-p-type').value,fc=document.getElementById('flt-p-card').value;
var spEl=document.getElementById('flt-p-showpaid');_planShowPaid=spEl?spEl.checked:false;
var _paidN=0;
document.querySelectorAll('#planned-body tr').forEach(function(tr){
var pi=tr.getAttribute('data-plrow');if(pi===null){tr.style.display='';return}
pi=+pi;if(!D.planned[pi]){tr.style.display='';return}
var show=true;if(ft&&D.planned[pi].type!==ft)show=false;if(fc&&D.planned[pi].card!==fc)show=false;
var _paid=_planIsPaid(D.planned[pi]);
var _isD=tr.classList.contains('pl-detail');
if(_paid){if(!_isD)_paidN++;if(!_planShowPaid)show=false;}
var isDetail=tr.classList.contains('pl-detail');
tr.style.display=(show&&(!isDetail||_plExpanded[pi]))?'':'none';})
;var _pc=document.getElementById('planned-paid-count');if(_pc)_pc.textContent=_paidN>0?('\u00b7 '+_paidN+' paid '+(_planShowPaid?'shown':'hidden')):'';
}


function populateInstDropdown(){
var sel=document.getElementById('inst-from-recurring');if(!sel)return;
var items=[];
D.yearly.forEach(function(y,yi){
if(y.pay_mode==='installment'){
items.push({idx:yi,name:y.name,type:y.type||'Other',amount:y.amount,month:y.month||1,day:y.billing_day||1,periods:y.inst_periods||1,card:y.card||''})}});
items.sort(function(a,b){
var tc=a.type.localeCompare(b.type);if(tc!==0)return tc;
if(a.month!==b.month)return a.month-b.month;
if(a.day!==b.day)return a.day-b.day;
return a.name.localeCompare(b.name)});
var h='<option value="">\u2014 Select from Recurring (installment only) \u2014</option>';
var lastType='';
items.forEach(function(it){
var pp=it.periods>0?Math.round(it.amount/it.periods*100)/100:it.amount;
if(it.type!==lastType){if(lastType)h+='</optgroup>';h+='<optgroup label="'+esc(it.type)+'">';lastType=it.type}
h+='<option value="'+it.idx+'">'+esc(it.name)+' ('+MO[it.month-1]+', '+it.periods+'x \u0e3f'+fmt(pp)+'/mo, total \u0e3f'+fmt(it.amount)+')</option>'});
if(lastType)h+='</optgroup>';
sel.innerHTML=h}


function addInstFromRecurring(){
readAll();
var sel=document.getElementById('inst-from-recurring');
var yi=sel?parseInt(sel.value):NaN;
if(isNaN(yi)){toast('\u26a0\ufe0f Select a recurring item first');return}
var y=D.yearly[yi];if(!y){toast('\u26a0\ufe0f Item not found');return}
D.installments.push({
name:y.name,
type:y.type||'Other',
card:y.card||'',
own_by:y.own_by||'Me',
total:y.amount,
per_period:y.inst_periods>0?Math.round(y.amount/y.inst_periods*100)/100:y.amount,
periods:y.inst_periods||1,
start_year:parseInt(D.profile.start_date.slice(0,4)),
start_month:y.month||1,
status:'Active'});
instSortState.col=null;
saveAll();
toast('\u2705 Added '+y.name)}


// Set hide_before on the yearly source of an auto (yearly-derived) installment.
// autoIdx is the N-th yearly item with pay_mode==='installment'.
function setAutoInstHideBefore(autoIdx,val){
readAll();
var autoItems=[];D.yearly.forEach(function(y,yi){if(y.pay_mode==='installment')autoItems.push(yi)});
if(autoIdx<0||autoIdx>=autoItems.length)return;
D.yearly[autoItems[autoIdx]].inst_hide_before=val;
saveD();simulate();renderInst();if(typeof renderBillReminder==='function')try{renderBillReminder()}catch(e){}
}
function convertAutoInst(yearlyIdx){
readAll();
var autoItems=[];
D.yearly.forEach(function(y,yi){if(y.pay_mode==='installment'){autoItems.push({yi:yi,y:y})}});
if(yearlyIdx<0||yearlyIdx>=autoItems.length)return;
var item=autoItems[yearlyIdx];
var y=item.y;
var pp=y.inst_periods>0?Math.round(y.amount/y.inst_periods*100)/100:y.amount;
D.installments.push({
name:y.name,type:y.type||'Other',card:y.card||'',own_by:y.own_by||'Me',
total:y.amount,per_period:pp,periods:y.inst_periods||1,
start_year:y.month>=new Date().getMonth()+1?parseInt(D.profile.start_date.slice(0,4)):parseInt(D.profile.start_date.slice(0,4))+1,
start_month:y.month||1,status:'Planned'});
D.yearly[item.yi].pay_mode='full';
D.yearly[item.yi].inst_periods=1;
saveD();simulate();renderAllTabs();
toast('\u2705 Converted to editable installment')}


/* Add Manual opens a popup form (same pattern as the other pages); added only on Save, then the
   page scrolls to the new row and outlines it. Per-period is auto-calculated from total / periods. */
function addInst(){
readAll();
var ov=document.getElementById('inst-add-ov');
if(!ov){ov=document.createElement('div');ov.id='inst-add-ov';
 ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
 ov.addEventListener('mousedown',function(e){if(e.target===ov)instAddClose();});
 document.body.appendChild(ov);}
var row=function(lbl,html){return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text3)">'+lbl+'</label>'+html+'</div>';};
var now=new Date(), iso=now.getFullYear()+'-'+('0'+(now.getMonth()+1)).slice(-2)+'-01';
ov.innerHTML='<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(480px,96vw);box-shadow:0 10px 40px rgba(0,0,0,.3)" onkeydown="if(event.key===\'Escape\')instAddClose();if(event.key===\'Enter\'){event.preventDefault();instAddSave();}">'
 +'<h3 style="margin:0 0 12px;font-size:14px"><i class="fa-solid fa-plus"></i> New installment</h3>'
 +'<div style="display:grid;gap:10px">'
 +row('Name *','<input id="ia-name" class="inp" placeholder="e.g. iPhone 0% 10 months" style="width:100%">')
 +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
 +row('Type','<select id="ia-type" class="sel">'+tOpts(D.types[0]||'Other')+'</select>')
 +row('Card *','<select id="ia-card" class="sel">'+cOnlyOpts(D.cards[0]?D.cards[0].name:'')+'</select>')
 +'</div>'
 +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
 +row('Total *','<input id="ia-total" class="inp inp-num" inputmode="decimal" placeholder="0.00" oninput="instAddPP()">')
 +row('Periods *','<input id="ia-per" type="number" min="1" max="60" class="inp inp-num" value="10" oninput="instAddPP()">')
 +row('Per period','<div id="ia-pp" style="font-family:var(--mono);font-size:12px;padding:5px 0">\u2014</div>')
 +'</div>'
 +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
 +row('First payment *','<input id="ia-start" type="date" class="inp" value="'+iso+'">')
 +row('Own By','<select id="ia-own" class="sel">'+oOpts('Me')+'</select>')
 +row('Status','<select id="ia-st" class="sel">'+STATUSES.map(function(s){return '<option'+(s==='Active'?' selected':'')+'>'+s+'</option>';}).join('')+'</select>')
 +'</div>'
 +'</div>'
 +'<div id="ia-err" style="color:var(--error);font-size:10px;min-height:14px;margin-top:6px"></div>'
 +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button class="btn btn-ghost" onclick="instAddClose()">Cancel</button><button class="btn btn-primary" onclick="instAddSave()"><i class="fa-solid fa-floppy-disk"></i> Save</button></div>'
 +'<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save \u00b7 Esc = Cancel \u00b7 Hide-before date can be set in the row after saving</div>'
 +'</div>';
ov.style.display='flex';
setTimeout(function(){var e=document.getElementById('ia-name');if(e)e.focus();},30);
}
function instAddPP(){
var t=parseFloat(String((document.getElementById('ia-total')||{}).value||'').replace(/,/g,''))||0;
var n=parseInt((document.getElementById('ia-per')||{}).value,10)||0;
var el=document.getElementById('ia-pp'); if(el) el.textContent=(t>0&&n>0)?'\u0e3f'+fmt(Math.round(t/n*100)/100):'\u2014';
}
function instAddClose(){var ov=document.getElementById('inst-add-ov');if(ov){ov.style.display='none';ov.innerHTML='';}}
function instAddSave(){
var g=function(id){var e=document.getElementById(id);return e?String(e.value).trim():'';};
var err=function(m,f){var e=document.getElementById('ia-err');if(e)e.textContent=m;var fe=document.getElementById(f);if(fe&&fe.focus)fe.focus();};
var name=g('ia-name'); if(!name){err('Please enter a name','ia-name');return;}
var card=g('ia-card'); if(!card){err('Add a credit card first (installments are charged to a card)','ia-card');return;}
var total=parseFloat(g('ia-total').replace(/,/g,'')); if(!(total>0)){err('Enter a total greater than 0','ia-total');return;}
var per=parseInt(g('ia-per'),10); if(!(per>=1&&per<=60)){err('Periods must be 1-60','ia-per');return;}
var sd=g('ia-start'); var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(sd); if(!m){err('Pick the first payment date','ia-start');return;}
var day=parseInt(m[3],10);
D.installments.push({name:name,type:g('ia-type')||D.types[0]||'Other',card:card,own_by:g('ia-own')||'Me',
 total:total,per_period:Math.round(total/per*100)/100,periods:per,
 start_year:parseInt(m[1],10),start_month:parseInt(m[2],10),start_day:day,billing_day:day,hide_before:'',status:g('ia-st')||'Active'});
var idx=D.installments.length-1;
instSortState.col=null;
saveD();instAddClose();
simulate();renderAllTabs();
try{filterInst();}catch(e){}
var r=document.querySelector('#inst-body tr[data-idx="'+idx+'"]');
if(r){r.style.outline='2px solid var(--primary)';r.style.outlineOffset='-2px';if(r.scrollIntoView){try{r.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}}}
if(typeof toast==='function')toast('\u2705 Installment added');
}


// === SIMULATION ===

function renderCardDetail(){
var el=document.getElementById('card-detail');
if(!el||!D||!D.cards||!D.monthly||!D.installments||!D.yearly)return;
var instItems=[];
D.installments.forEach(function(inst){if(inst&&(inst.status==='Active'||inst.status==='Planned'))instItems.push(inst)});
D.yearly.forEach(function(y){if(y&&y.pay_mode==='installment'){
var pp=(y.inst_periods&&y.inst_periods>0)?Math.round(y.amount/y.inst_periods*100)/100:(y.amount||0);
instItems.push({name:y.name||'',card:y.card||'',per_period:pp,source:'Yearly'})}});
var h='<h3 style="font-size:12px;font-weight:600;margin:8px 0 6px;color:var(--text2)">Card Load Breakdown</h3>';
D.cards.forEach(function(c){
var mItems=D.monthly.filter(function(m){return m.card===c.name});
var iItems=instItems.filter(function(x){return x.card===c.name});
var mLoad=mItems.reduce(function(s,x){return s+(x.amount||0)},0);
var iLoad=iItems.reduce(function(s,x){return s+(x.per_period||0)},0);
var total=mLoad+iLoad;
if(total===0)return;
h+='<div class="acc-header" onclick="this.querySelector(\'.arr\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')">'+
'<span class="arr">\u25b6</span><span style="flex:1;font-weight:600;font-size:11px">'+esc(c.name)+'</span>'+
'<span style="font-size:9px;color:var(--text3)">Pay: '+ord(c.payment_day||1)+' | Due: '+ord(c.deadline||1)+'</span>'+
'<span style="font-family:var(--mono);font-size:11px;font-weight:600;min-width:80px;text-align:right">\u0e3f'+fmt(total)+'/mo</span></div>'+
'<div class="acc-body">';
mItems.forEach(function(m){h+='<div class="day-row" style="padding-left:28px"><span class="day-icon">\ud83d\udccb</span><span class="day-name" style="font-size:10px">'+esc(m.name)+'</span><span style="font-size:9px;color:var(--text3)">Monthly</span><span class="day-amt" style="font-size:10px">\u0e3f'+fmt(m.amount)+'</span></div>'});
iItems.forEach(function(x){h+='<div class="day-row" style="padding-left:28px"><span class="day-icon">\ud83d\udcb3</span><span class="day-name" style="font-size:10px">'+esc(x.name)+'</span><span style="font-size:9px;color:var(--text3)">'+(x.source||'')+'</span><span class="day-amt" style="font-size:10px">\u0e3f'+fmt(x.per_period)+'</span></div>'});
h+='</div>'});
el.innerHTML=h}


function renderRecurringSummary(){
if(!D||!D.monthly||!D.yearly)return;
var mExp=D.monthly.filter(function(m){return m.direction!=='income'}).reduce(function(s,m){return s+m.amount},0);
var mInc=D.monthly.filter(function(m){return m.direction==='income'}).reduce(function(s,m){return s+m.amount},0);
var yExp=D.yearly.filter(function(y){return y.direction!=='income'}).reduce(function(s,y){return s+y.amount},0);
var yInc=D.yearly.filter(function(y){return y.direction==='income'}).reduce(function(s,y){return s+y.amount},0);
var mTotal=mExp+mInc;var yTotal=yExp+yInc;
var normalPay=computePayroll(1);var annualIncome=normalPay.net*12;
var bonusPay=computePayroll(12);annualIncome+=(bonusPay.net-normalPay.net);
var annExp=mExp*12+yExp;var annInc=mInc*12+yInc;
document.getElementById('recurring-kpis').innerHTML=
'<div class="kpi"><div class="kpi-label">Monthly Items</div><div class="kpi-val">'+D.monthly.length+'</div><div class="kpi-note">\u0e3f'+fmt(mTotal)+'/mo</div></div>'+
'<div class="kpi"><div class="kpi-label">Yearly Items</div><div class="kpi-val">'+D.yearly.length+'</div><div class="kpi-note">\u0e3f'+fmt(yTotal)+'/yr</div></div>'+
'<div class="kpi"><div class="kpi-label">Annual Expenses</div><div class="kpi-val text-error">\u0e3f'+fmt(annExp)+'</div><div class="kpi-note">'+(annualIncome>0?((annExp)/annualIncome*100).toFixed(1)+'% of income':'')+'</div></div>'+
(annInc>0?'<div class="kpi"><div class="kpi-label">Annual Recurring Income</div><div class="kpi-val text-success">\u0e3f'+fmt(annInc)+'</div></div>':'')+
'<div class="kpi"><div class="kpi-label">Net Eff. Monthly</div><div class="kpi-val text-primary">\u0e3f'+fmt(mExp-mInc+(yExp-yInc)/12)+'</div><div class="kpi-note">'+(normalPay.net>0?((mExp-mInc+(yExp-yInc)/12)/normalPay.net*100).toFixed(1)+'% of net pay':'')+'</div></div>';

var groupBy=(document.getElementById('summary-group')||{}).value||'type';

// ===== Group by Month view =====
if(groupBy==='month'){
var mh='';
for(var _mo=0;_mo<12;_mo++){
var monthItems=[];
// Monthly items occur every month (respect end_date if set)
D.monthly.forEach(function(m){
if(m.status&&m.status!=='Active')return;
monthItems.push({name:m.name,type:m.type,card:m.card,amount:m.amount,freq:'Monthly',direction:m.direction||'expense'})});
// Yearly items only in their month
D.yearly.forEach(function(y){
if(y.status&&y.status!=='Active')return;
if((y.month-1)===_mo)monthItems.push({name:y.name,type:y.type,card:y.card,amount:y.amount,freq:'Yearly',direction:y.direction||'expense'})});
var moExp=monthItems.filter(function(it){return it.direction!=='income'}).reduce(function(s,it){return s+it.amount},0);
var moInc=monthItems.filter(function(it){return it.direction==='income'}).reduce(function(s,it){return s+it.amount},0);
var moNet=moExp-moInc;
var isOpen=_mo===new Date().getMonth();
mh+='<div class="acc-header'+(isOpen?'':'')+'" onclick="this.querySelector(\'.arr\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')">'+
'<span class="arr'+(isOpen?' open':'')+'">\u25b6</span><span style="flex:1;font-weight:600;font-size:12px">'+MO[_mo]+'</span>'+
'<span style="font-size:10px;color:var(--text3)">'+monthItems.length+' items</span>'+
(moInc>0?'<span style="font-size:9px;color:var(--success);margin-right:8px">+\u0e3f'+fmt(moInc)+'</span>':'')+
'<span style="font-family:var(--mono);font-size:11px;font-weight:600;min-width:90px;text-align:right;color:var(--error)">\u0e3f'+fmt(moExp)+'</span></div>'+
'<div class="acc-body'+(isOpen?' open':'')+'">';
monthItems.sort(function(a,b){return b.amount-a.amount}).forEach(function(it){
var dirBadge=it.direction==='income'?'<span style="font-size:8px;padding:1px 4px;border-radius:6px;background:var(--success);color:#fff;margin-right:4px">Income</span>':'';
mh+='<div class="day-row" style="padding-left:32px">'+dirBadge+'<span class="day-name" style="font-size:11px">'+esc(it.name)+'</span>'+
'<span style="font-size:9px;color:var(--text3);margin:0 6px">'+esc(it.freq)+'</span>'+
'<span style="font-size:9px;color:var(--text3);margin-right:6px">'+esc(it.type||'')+'</span>'+
'<span class="day-bal" style="font-size:10px;min-width:80px;color:'+(it.direction==='income'?'var(--success)':'')+'">\u0e3f'+fmt(it.amount)+'</span></div>'});
if(!monthItems.length)mh+='<div class="day-row" style="padding-left:32px;color:var(--text3);font-size:10px">No recurring items</div>';
mh+='</div>'}
document.getElementById('recurring-groups').innerHTML=mh;
return}

var allItems=[];
D.monthly.forEach(function(m){allItems.push({name:m.name,type:m.type,card:m.card,amount:m.amount,freq:'Monthly',annual:m.amount*12,direction:m.direction||'expense'})});
D.yearly.forEach(function(y){allItems.push({name:y.name,type:y.type,card:y.card,amount:y.amount,freq:'Yearly',annual:y.amount,direction:y.direction||'expense'})});

var groups={};
allItems.forEach(function(it){
var key=groupBy==='type'?it.type:groupBy==='card'?it.card:it.freq;
if(!groups[key])groups[key]={items:[],total:0};
groups[key].items.push(it);groups[key].total+=it.annual});

var gKeys=Object.keys(groups).sort();
var h='';
gKeys.forEach(function(gk,gi){var g=groups[gk];
h+='<div class="acc-header" onclick="this.querySelector(\'.arr\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')">'+
'<span class="arr">\u25b6</span><span style="flex:1;font-weight:600;font-size:12px">'+esc(gk)+'</span>'+
'<span style="font-size:10px;color:var(--text3)">'+g.items.length+' items</span>'+
'<span style="font-size:9px;color:var(--text3);margin-right:8px">'+(annualIncome>0?(g.total/annualIncome*100).toFixed(1)+'%':'')+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;color:var(--text3);min-width:90px;text-align:right;margin-right:8px">\u0e3f'+fmt(g.total/12)+'/mo</span>'+
'<span style="font-family:var(--mono);font-size:11px;font-weight:600;min-width:90px;text-align:right">\u0e3f'+fmt(g.total)+'/yr</span></div>'+
'<div class="acc-body">';
g.items.sort(function(a,b){return b.annual-a.annual}).forEach(function(it){
var dirBadge=it.direction==='income'?'<span style="font-size:8px;padding:1px 4px;border-radius:6px;background:var(--success);color:#fff;margin-right:4px">Income</span>':'';
h+='<div class="day-row" style="padding-left:32px">'+dirBadge+'<span class="day-name" style="font-size:11px">'+esc(it.name)+'</span>'+
'<span style="font-size:9px;color:var(--text3);margin:0 6px">'+esc(it.freq)+'</span>'+
'<span class="day-amt" style="font-size:10px">\u0e3f'+fmt(it.amount)+(it.freq==='Monthly'?'/mo':'/yr')+'</span>'+
'<span style="font-size:9px;color:var(--text3);min-width:35px;text-align:right;margin-right:4px">'+(annualIncome>0?(it.annual/annualIncome*100).toFixed(1)+'%':'')+'</span>'+
'<span class="day-bal" style="font-size:10px;min-width:80px">\u0e3f'+fmt(it.annual)+'/yr</span></div>'});
h+='</div>'});
document.getElementById('recurring-groups').innerHTML=h}


var sortState={monthly:{col:null,asc:true},yearly:{col:null,asc:true},payroll:{col:null,asc:true}};

function sortTable(table,col){
var st=sortState[table];
if(st.col===col)st.asc=!st.asc;else{st.col=col;st.asc=true}
var arr=table==='monthly'?D.monthly:table==='yearly'?D.yearly:D.payroll;
arr.sort(function(a,b){var va,vb;
if(table==='yearly'&&(col==='billing_day'||col==='month')){va=(a.month||0)*100+(a.billing_day||0);vb=(b.month||0)*100+(b.billing_day||0);return st.asc?va-vb:vb-va}
va=a[col];vb=b[col];
if(typeof va==='number'&&typeof vb==='number')return st.asc?va-vb:vb-va;
va=String(va||'').toLowerCase();vb=String(vb||'').toLowerCase();
return st.asc?va.localeCompare(vb):vb.localeCompare(va)});
if(table==='monthly'){renderMonthly();filterMonthly()}
else if(table==='yearly'){renderYearly();filterYearly()}
else renderPayroll()}


function sHdr(table,col,label){
var st=sortState[table];
var arrow=st.col===col?(st.asc?' \u25b2':' \u25bc'):'';
return '<th style="cursor:pointer" onclick="readAll();sortTable(\''+table+'\',\''+col+'\')" '+(col==='amount'||col==='billing_day'||col==='inst_periods'||col==='month'?'class="r"':'')+'>'+label+arrow+'</th>'}



function populateFilters(){
var tOpts=sTypes().map(function(t){return '<option>'+esc(t)+'</option>'}).join('');
var cOpts2=sCards().map(function(c){return '<option>'+esc(c.name)+'</option>'}).join('');
['flt-m-type','flt-y-type','flt-i-type'].forEach(function(id){var el=document.getElementById(id);if(el){var v=el.value;el.innerHTML='<option value="">All Types</option>'+tOpts;el.value=v}});
['flt-m-card','flt-y-card','flt-i-card'].forEach(function(id){var el=document.getElementById(id);if(el){var v=el.value;el.innerHTML='<option value="">All Cards</option><option value="Cash/Direct">Cash/Direct</option>'+cOpts2;el.value=v}});
var sOpts=STATUSES.map(function(s){return '<option>'+s+'</option>'}).join('');
var el=document.getElementById('flt-i-status');if(el){var v=el.value;el.innerHTML='<option value="">All Status</option>'+sOpts;el.value=v}
var el2=document.getElementById('flt-i-source');if(el2){var v=el2.value;el2.innerHTML='<option value="">All Sources</option><option>Manual</option><option>Yearly</option>';el2.value=v}
var el3=document.getElementById('flt-i-owner');if(el3){var v=el3.value;el3.innerHTML='<option value="">All Owners</option>'+(D.owners||[]).slice().sort().map(function(o){return '<option>'+o+'</option>'}).join('');el3.value=v}}


function filterMonthly(){var ft=document.getElementById('flt-m-type').value,fc=document.getElementById('flt-m-card').value;
document.querySelectorAll('#monthly-body tr').forEach(function(tr){
var mi=tr.getAttribute('data-mrow');if(mi===null){tr.style.display='';return}
mi=+mi;if(!D.monthly[mi]){tr.style.display='';return}
var show=true;if(ft&&D.monthly[mi].type!==ft)show=false;if(fc&&D.monthly[mi].card!==fc)show=false;
var isDetail=tr.classList.contains('m-detail');
// main row shows when filter passes; detail row shows only when filter passes AND it is expanded
tr.style.display=(show&&(!isDetail||_mExpanded[mi]))?'':'none';})}


function filterYearly(){var ft=document.getElementById('flt-y-type').value,fm=document.getElementById('flt-y-mode').value,fc=document.getElementById('flt-y-card').value;
document.querySelectorAll('#yearly-body tr').forEach(function(tr){
var yi=tr.getAttribute('data-yrow');if(yi===null){tr.style.display='';return}
yi=+yi;if(!D.yearly[yi]){tr.style.display='';return}
var show=true;if(ft&&D.yearly[yi].type!==ft)show=false;if(fm&&D.yearly[yi].pay_mode!==fm)show=false;if(fc&&D.yearly[yi].card!==fc)show=false;
var isDetail=tr.classList.contains('y-detail');
tr.style.display=(show&&(!isDetail||_yExpanded[yi]))?'':'none';})}


function filterInst(){var ft=document.getElementById('flt-i-type').value,fc=document.getElementById('flt-i-card').value,
fs=document.getElementById('flt-i-status').value,fsr=document.getElementById('flt-i-source').value,fo=document.getElementById('flt-i-owner').value;
var all=allInstallments();
document.querySelectorAll('#inst-body tr').forEach(function(tr){
var idx=parseInt(tr.dataset.idx);if(isNaN(idx)||!all[idx]){tr.style.display='';return}var it=all[idx];var show=true;
if(ft&&it.type!==ft)show=false;if(fc&&it.card!==fc)show=false;
if(fs&&it.status!==fs)show=false;if(fsr&&it.source!==fsr)show=false;if(fo&&it.own_by!==fo)show=false;
tr.style.display=show?'':'none';
if(!show){var cb=tr.querySelector('.inst-chk');if(cb)cb.checked=false}});
var sa=document.getElementById('inst-select-all');if(sa)sa.checked=false;
updateInstBulkActions()}

var HELP_LANG='en';
var HELP_DATA={
en:{
title:'Help & Reference',
sso_title:'Thai Social Security (SSO) — Contribution Rules',
legal:'<strong>Legal Basis:</strong> Social Security Act B.E. 2533 (1990), Section 33<br><strong>Governing Body:</strong> Social Security Office (SSO), Ministry of Labour<br><strong>Applies to:</strong> All private-sector employees aged 15\u201360, including foreign workers with work permits',
rate_title:'Contribution Rate',
rate_tbl:'<tr><td>Employee</td><td class="r" style="font-family:var(--mono)">5%</td><td>Deducted from salary each month</td></tr><tr><td>Employer</td><td class="r" style="font-family:var(--mono)">5%</td><td>Matching contribution, paid separately</td></tr><tr><td>Government</td><td class="r" style="font-family:var(--mono)">2.75%</td><td>Paid by the state</td></tr>',
rate_hdr:'<tr><th>Party</th><th class="r">Rate</th><th>Notes</th></tr>',
ceil_title:'Wage Ceiling (Multi-Year Reform)',
ceil_hdr:'<tr><th>Phase</th><th>Period</th><th class="r">Wage Ceiling</th><th class="r">Max/party</th><th class="r">Total Max</th></tr>',
ceil_tbl:'<tr><td><span class="tag tag-finished">Old</span></td><td>Before 2026</td><td class="r" style="font-family:var(--mono)">\u0e3f15,000</td><td class="r" style="font-family:var(--mono)">\u0e3f750</td><td class="r" style="font-family:var(--mono)">\u0e3f1,500</td></tr><tr style="background:var(--success-bg)"><td><span class="tag tag-active">Phase 1</span></td><td>Jan 2026 \u2013 Dec 2028</td><td class="r" style="font-family:var(--mono)">\u0e3f17,500</td><td class="r" style="font-family:var(--mono)">\u0e3f875</td><td class="r" style="font-family:var(--mono)">\u0e3f1,750</td></tr><tr><td><span class="tag tag-planned">Phase 2</span></td><td>Jan 2029 \u2013 Dec 2031</td><td class="r" style="font-family:var(--mono)">\u0e3f20,000</td><td class="r" style="font-family:var(--mono)">\u0e3f1,000</td><td class="r" style="font-family:var(--mono)">\u0e3f2,000</td></tr><tr><td><span class="tag tag-planned">Phase 3</span></td><td>From Jan 2032</td><td class="r" style="font-family:var(--mono)">\u0e3f23,000</td><td class="r" style="font-family:var(--mono)">\u0e3f1,150</td><td class="r" style="font-family:var(--mono)">\u0e3f2,300</td></tr>',
ceil_note:'Minimum wage floor: \u0e3f1,650/month. Published in Royal Gazette: 12 Dec 2025.',
calc_title:'Calculation Formula',
calc_body:'<strong>Contribution Base</strong> = min(Monthly Salary, Wage Ceiling)<br><strong>Employee SSO</strong> = Contribution Base \u00d7 5%<br><strong>Cap Rule:</strong> If salary \u2265 \u0e3f17,500 \u2192 contribution = \u0e3f875 (max)<br><strong>Cap Rule:</strong> If salary &lt; \u0e3f1,650 \u2192 uses \u0e3f1,650 floor<br><br><strong>Examples (2026):</strong><br>Salary \u0e3f10,000 \u2192 10,000 \u00d7 5% = <strong>\u0e3f500</strong><br>Salary \u0e3f15,000 \u2192 15,000 \u00d7 5% = <strong>\u0e3f750</strong><br>Salary \u0e3f17,500 \u2192 17,500 \u00d7 5% = <strong>\u0e3f875</strong> (at ceiling)<br>Salary \u0e3f62,566 \u2192 17,500 \u00d7 5% = <strong>\u0e3f875</strong> (capped)',
setup_title:'How to Set Up in This App',
setup_body:'<ol style="padding-left:18px;margin-bottom:8px"><li>Go to <strong>Payroll</strong> tab</li><li>For <strong>Income items</strong>: check the <strong>SSO</strong> checkbox on items included in SSO wage base</li><li>For <strong>Social Security deduction</strong>: set Calc Mode to <strong>"% of SSO Base"</strong>, Rate = <strong>5%</strong>, Cap = <strong>\u0e3f875</strong></li><li>The app calculates: min(SSO Base \u00d7 5%, \u0e3f875) each month</li></ol><p style="font-size:10px;color:var(--text3)">Note: Bonus/OT may or may not be in SSO base. Consult HR.</p>',
benefit_title:'SSO Benefits (2026 rates)',
benefit_hdr:'<tr><th>Benefit</th><th class="r">Before 2026</th><th class="r">From Jan 2026</th></tr>',
benefit_tbl:'<tr><td>Sickness/Disability/Unemployment (mo.)</td><td class="r" style="font-family:var(--mono)">\u0e3f7,500</td><td class="r" style="font-family:var(--mono)">\u0e3f8,750</td></tr><tr><td>Maternity/Childbirth (per birth)</td><td class="r" style="font-family:var(--mono)">\u0e3f22,500</td><td class="r" style="font-family:var(--mono)">\u0e3f26,250</td></tr><tr><td>Death Lump-sum</td><td class="r" style="font-family:var(--mono)">\u0e3f90,000</td><td class="r" style="font-family:var(--mono)">\u0e3f105,000</td></tr><tr><td>Pension (15 yrs)</td><td class="r" style="font-family:var(--mono)">\u0e3f3,000/mo</td><td class="r" style="font-family:var(--mono)">\u0e3f3,500/mo</td></tr><tr><td>Pension (25+ yrs)</td><td class="r" style="font-family:var(--mono)">\u0e3f5,250/mo</td><td class="r" style="font-family:var(--mono)">\u0e3f6,125/mo</td></tr>',
compliance_title:'Key Compliance Points',
compliance:'<li>Contributions due by <strong>15th of the following month</strong></li><li>Late penalty: <strong>2% per month</strong> surcharge</li><li>Employee must be registered within <strong>30 days</strong> of start date</li><li>Coverage starts from <strong>first day of employment</strong></li><li>Foreign employees with work permits are <strong>not exempt</strong></li>',
tax_title:'Thai Personal Income Tax',
tax_rates:'<table class="tbl" style="margin-bottom:10px"><thead><tr><th>Net Taxable Income (THB)</th><th class="r">Rate</th><th class="r">Max Tax</th></tr></thead><tbody>'+
'<tr><td>0 - 150,000</td><td class="r">Exempt</td><td class="r">0</td></tr>'+
'<tr><td>150,001 - 300,000</td><td class="r">5%</td><td class="r">7,500</td></tr>'+
'<tr><td>300,001 - 500,000</td><td class="r">10%</td><td class="r">20,000</td></tr>'+
'<tr><td>500,001 - 750,000</td><td class="r">15%</td><td class="r">37,500</td></tr>'+
'<tr><td>750,001 - 1,000,000</td><td class="r">20%</td><td class="r">50,000</td></tr>'+
'<tr><td>1,000,001 - 2,000,000</td><td class="r">25%</td><td class="r">250,000</td></tr>'+
'<tr><td>2,000,001 - 5,000,000</td><td class="r">30%</td><td class="r">900,000</td></tr>'+
'<tr><td>5,000,001+</td><td class="r">35%</td><td class="r">-</td></tr></tbody></table>',
tax_formula:'<strong>Taxable Income</strong> = Assessable Income - Expenses (50%, max \u0e3f100K) - Exemptions<br><strong>Tax</strong> = Apply progressive rates to Taxable Income',
tax_exemptions_title:'Tax Exemptions & Deductions Reference',
tax_exemptions_detail:'<table class="tbl" style="margin-bottom:10px;font-size:10px"><thead><tr><th>Exemption</th><th class="r">Max (\u0e3f)</th><th>Details & Conditions</th></tr></thead><tbody>'+
'<tr><td><strong>Personal Allowance</strong></td><td class="r">60,000</td><td>Every taxpayer. No conditions.</td></tr>'+
'<tr><td><strong>Spouse Allowance</strong></td><td class="r">60,000</td><td>Spouse with no income or files jointly.</td></tr>'+
'<tr><td><strong>Child Allowance</strong></td><td class="r">30,000/child</td><td>Legitimate children. 2nd child born 2018+ gets \u0e3f60,000. Max unlimited children.</td></tr>'+
'<tr><td><strong>Parental Care</strong></td><td class="r">30,000/person</td><td>Parents aged 60+ with income under \u0e3f30,000/yr. Max 4 persons (yours + spouse\'s).</td></tr>'+
'<tr><td><strong>Disability Care</strong></td><td class="r">60,000</td><td>Caring for a disabled family member.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Employment Deductions \u2014</strong></td></tr>'+
'<tr><td><strong>Expense Deduction</strong></td><td class="r">100,000</td><td>50% of employment income, max \u0e3f100,000. Auto-calculated.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Insurance & Savings \u2014</strong></td></tr>'+
'<tr><td><strong>Life Insurance Premium</strong></td><td class="r">100,000</td><td>Premiums paid to Thai-licensed insurer. Policy must be 10+ years. Combined with health insurance max \u0e3f100,000.</td></tr>'+
'<tr><td><strong>Health Insurance</strong></td><td class="r">25,000</td><td>Self only. Combined with life insurance cannot exceed \u0e3f100,000 total.</td></tr>'+
'<tr><td><strong>Spouse Life Insurance</strong></td><td class="r">10,000</td><td>Premiums for spouse\'s life insurance if spouse has no income.</td></tr>'+
'<tr><td><strong>Parents\' Health Insurance</strong></td><td class="r">15,000</td><td>Per parent. Health insurance premiums for parents (yours or spouse\'s). Parent income under \u0e3f30,000/yr.</td></tr>'+
'<tr><td><strong>Social Security (SSO)</strong></td><td class="r">10,500</td><td>Section 33: 5% of wages, ceiling \u0e3f17,500 (2026\u20132028). Max \u0e3f875/month = \u0e3f10,500/year. Auto-calculated from payroll.</td></tr>'+
'<tr><td><strong>Provident Fund (PVD)</strong></td><td class="r">500,000</td><td>Employee contribution, max 15% of salary. Amount exceeding \u0e3f10,000 is deductible up to \u0e3f490,000.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Investment Funds (combined max \u0e3f500,000) \u2014</strong></td></tr>'+
'<tr><td><strong>RMF (Retirement Mutual Fund)</strong></td><td class="r">500,000</td><td>Max 30% of assessable income. Must invest continuously until age 55. Combined with PVD, SSF, Thai ESG, PVD cannot exceed \u0e3f500,000.</td></tr>'+
'<tr><td><strong>SSF (Super Savings Fund)</strong></td><td class="r">200,000</td><td>Max 30% of assessable income, max \u0e3f200,000. Hold 10+ years. Combined with RMF, PVD, Thai ESG cannot exceed \u0e3f500,000.</td></tr>'+
'<tr><td><strong>Thai ESG Fund</strong></td><td class="r">300,000</td><td>Max 30% of assessable income, max \u0e3f300,000. Hold 8+ years (bought 2024\u20132026). Combined cap \u0e3f500,000 with RMF/SSF/PVD.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Property & Donations \u2014</strong></td></tr>'+
'<tr><td><strong>Home Loan Interest</strong></td><td class="r">100,000</td><td>Interest on mortgage for self-occupied property. Lender must be Thai financial institution. <strong>Multiple borrowers:</strong> the \u0e3f100,000 cap is split equally among all co-borrowers — e.g., 2 co-borrowers = \u0e3f50,000 each; 3 co-borrowers = \u0e3f33,333 each. Multiple properties allowed but combined deduction still max \u0e3f100,000 per person.</td></tr>'+
'<tr><td><strong>First Home Buyer</strong></td><td class="r">200,000</td><td>House value up to \u0e3f5M. Deduct 20% over 5 years (\u0e3f200,000/yr). Specific scheme periods apply.</td></tr>'+
'<tr><td><strong>General Donation</strong></td><td class="r">10% of net</td><td>Donations to qualified charities, temples, hospitals. Max 10% of income after all other deductions.</td></tr>'+
'<tr><td><strong>Education Donation</strong></td><td class="r">2x amount</td><td>Donations to approved educational institutions. Deduct 2x actual amount, combined with general donation max 10%.</td></tr>'+
'<tr><td><strong>Political Party Donation</strong></td><td class="r">10,000</td><td>Donations to registered political parties.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Stimulus Measures \u2014</strong></td></tr>'+
'<tr><td><strong>Shopping Stimulus (Easy E-Receipt)</strong></td><td class="r">50,000</td><td>Purchases with e-tax invoice/e-receipt during qualifying period. Varies by tax year.</td></tr>'+
'<tr><td><strong>Domestic Travel</strong></td><td class="r">15,000</td><td>Hotel accommodation in Thailand during qualifying period. Requires receipts.</td></tr>'+
'</tbody></table>'+
'<div style="font-size:9px;color:var(--text3);margin-top:4px"><strong>Note:</strong> Combined cap for RMF + SSF + Thai ESG + PVD = \u0e3f500,000. Life + Health insurance combined max \u0e3f100,000. Amounts and conditions based on Revenue Code and 2026 regulations. Always verify with the Revenue Department or a tax advisor.</div>',
sources_title:'Sources'
},
th:{
title:'\u0e04\u0e39\u0e48\u0e21\u0e37\u0e2d\u0e41\u0e25\u0e30\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07',
sso_title:'\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (SSO) \u2014 \u0e2b\u0e25\u0e31\u0e01\u0e40\u0e01\u0e13\u0e11\u0e4c\u0e01\u0e32\u0e23\u0e04\u0e33\u0e19\u0e27\u0e13',
legal:'<strong>\u0e2b\u0e25\u0e31\u0e01\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22:</strong> \u0e1e.\u0e23.\u0e1a.\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e1e.\u0e28. 2533 \u0e21\u0e32\u0e15\u0e23\u0e32 33<br><strong>\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e07\u0e32\u0e19:</strong> \u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (\u0e2a\u0e1b\u0e2a.) \u0e01\u0e23\u0e30\u0e17\u0e23\u0e27\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19<br><strong>\u0e1c\u0e39\u0e49\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e15\u0e19:</strong> \u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07\u0e20\u0e32\u0e04\u0e40\u0e2d\u0e01\u0e0a\u0e19\u0e17\u0e38\u0e01\u0e04\u0e19 \u0e2d\u0e32\u0e22\u0e38 15\u201360 \u0e1b\u0e35 \u0e23\u0e27\u0e21\u0e16\u0e36\u0e07\u0e0a\u0e32\u0e27\u0e15\u0e48\u0e32\u0e07\u0e0a\u0e32\u0e15\u0e34\u0e17\u0e35\u0e48\u0e21\u0e35\u0e43\u0e1a\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15\u0e17\u0e33\u0e07\u0e32\u0e19',
rate_title:'\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e2a\u0e21\u0e17\u0e1a',
rate_hdr:'<tr><th>\u0e1d\u0e48\u0e32\u0e22</th><th class="r">\u0e2d\u0e31\u0e15\u0e23\u0e32</th><th>\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38</th></tr>',
rate_tbl:'<tr><td>\u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u0e2b\u0e31\u0e01\u0e08\u0e32\u0e01\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e38\u0e01\u0e40\u0e14\u0e37\u0e2d\u0e19</td></tr><tr><td>\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u0e2a\u0e21\u0e17\u0e1a\u0e2a\u0e21\u0e17\u0e1a \u0e08\u0e48\u0e32\u0e22\u0e41\u0e22\u0e01\u0e15\u0e48\u0e32\u0e07\u0e2b\u0e32\u0e01</td></tr><tr><td>\u0e23\u0e31\u0e10\u0e1a\u0e32\u0e25</td><td class="r" style="font-family:var(--mono)">2.75%</td><td>\u0e23\u0e31\u0e10\u0e1a\u0e32\u0e25\u0e08\u0e48\u0e32\u0e22</td></tr>',
ceil_title:'\u0e40\u0e1e\u0e14\u0e32\u0e19\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07 (\u0e1b\u0e23\u0e31\u0e1a\u0e2b\u0e25\u0e32\u0e22\u0e23\u0e30\u0e22\u0e30)',
ceil_hdr:'<tr><th>\u0e23\u0e30\u0e22\u0e30</th><th>\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e25\u0e32</th><th class="r">\u0e40\u0e1e\u0e14\u0e32\u0e19\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07</th><th class="r">\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14/\u0e1d\u0e48\u0e32\u0e22</th><th class="r">\u0e23\u0e27\u0e21\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14</th></tr>',
ceil_note:'\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e02\u0e31\u0e49\u0e19\u0e15\u0e48\u0e33: \u0e3f1,650/\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e1b\u0e23\u0e30\u0e01\u0e32\u0e28\u0e23\u0e32\u0e0a\u0e01\u0e34\u0e08\u0e08\u0e32\u0e19\u0e38\u0e40\u0e1a\u0e01\u0e29\u0e32: 12 \u0e18.\u0e04. 2568',
calc_title:'\u0e2a\u0e39\u0e15\u0e23\u0e04\u0e33\u0e19\u0e27\u0e13',
calc_body:'<strong>\u0e10\u0e32\u0e19\u0e2a\u0e21\u0e17\u0e1a</strong> = min(\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19, \u0e40\u0e1e\u0e14\u0e32\u0e19\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07)<br><strong>\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e21\u0e17\u0e1a\u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07</strong> = \u0e10\u0e32\u0e19\u0e2a\u0e21\u0e17\u0e1a \u00d7 5%<br><br><strong>\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07 (2569):</strong><br>\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e3f10,000 \u2192 \u0e2a\u0e21\u0e17\u0e1a = <strong>\u0e3f500</strong><br>\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e3f17,500 \u2192 \u0e2a\u0e21\u0e17\u0e1a = <strong>\u0e3f875</strong> (\u0e40\u0e15\u0e47\u0e21\u0e40\u0e1e\u0e14\u0e32\u0e19)<br>\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e3f62,566 \u2192 \u0e2a\u0e21\u0e17\u0e1a = <strong>\u0e3f875</strong> (\u0e16\u0e39\u0e01\u0e08\u0e33\u0e01\u0e31\u0e14)',
setup_title:'\u0e27\u0e34\u0e18\u0e35\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e43\u0e19\u0e41\u0e2d\u0e1b',
setup_body:'<ol style="padding-left:18px"><li>\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e41\u0e17\u0e47\u0e1a <strong>Payroll</strong></li><li>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49: \u0e15\u0e34\u0e01\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e2b\u0e21\u0e32\u0e22 <strong>SSO</strong></li><li>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01: \u0e40\u0e25\u0e37\u0e2d\u0e01 <strong>"% of SSO Base"</strong>, \u0e2d\u0e31\u0e15\u0e23\u0e32 = <strong>5%</strong>, \u0e40\u0e1e\u0e14\u0e32\u0e19 = <strong>\u0e3f875</strong></li></ol>',
benefit_title:'\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e0a\u0e19\u0e4c (\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e1b\u0e35 2569)',
benefit_hdr:'<tr><th>\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e0a\u0e19\u0e4c</th><th class="r">\u0e01\u0e48\u0e2d\u0e19 2569</th><th class="r">\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48 \u0e21.\u0e04. 2569</th></tr>',
compliance_title:'\u0e02\u0e49\u0e2d\u0e1b\u0e0f\u0e34\u0e1a\u0e31\u0e15\u0e34\u0e2a\u0e33\u0e04\u0e31\u0e0d',
compliance:'<li>\u0e19\u0e33\u0e2a\u0e48\u0e07\u0e20\u0e32\u0e22\u0e43\u0e19<strong>\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 15 \u0e02\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b</strong></li><li>\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e31\u0e1a\u0e25\u0e48\u0e32\u0e0a\u0e49\u0e32: <strong>2% \u0e15\u0e48\u0e2d\u0e40\u0e14\u0e37\u0e2d\u0e19</strong></li><li>\u0e02\u0e36\u0e49\u0e19\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e20\u0e32\u0e22\u0e43\u0e19 <strong>30 \u0e27\u0e31\u0e19</strong></li><li>\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e40\u0e23\u0e34\u0e48\u0e21<strong>\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e27\u0e31\u0e19\u0e41\u0e23\u0e01\u0e17\u0e35\u0e48\u0e17\u0e33\u0e07\u0e32\u0e19</strong></li>',
sources_title:'\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25',
tax_title:'\u0e20\u0e32\u0e29\u0e35\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e1a\u0e38\u0e04\u0e04\u0e25\u0e18\u0e23\u0e23\u0e21\u0e14\u0e32',
tax_rates:'<table class="tbl" style="margin-bottom:10px"><thead><tr><th>\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e2a\u0e38\u0e17\u0e18\u0e34 (\u0e1a\u0e32\u0e17)</th><th class="r">\u0e2d\u0e31\u0e15\u0e23\u0e32</th><th class="r">\u0e20\u0e32\u0e29\u0e35\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14</th></tr></thead><tbody>'+
'<tr><td>0 - 150,000</td><td class="r">\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19</td><td class="r">0</td></tr>'+
'<tr><td>150,001 - 300,000</td><td class="r">5%</td><td class="r">7,500</td></tr>'+
'<tr><td>300,001 - 500,000</td><td class="r">10%</td><td class="r">20,000</td></tr>'+
'<tr><td>500,001 - 750,000</td><td class="r">15%</td><td class="r">37,500</td></tr>'+
'<tr><td>750,001 - 1,000,000</td><td class="r">20%</td><td class="r">50,000</td></tr>'+
'<tr><td>1,000,001 - 2,000,000</td><td class="r">25%</td><td class="r">250,000</td></tr>'+
'<tr><td>2,000,001 - 5,000,000</td><td class="r">30%</td><td class="r">900,000</td></tr>'+
'<tr><td>5,000,001+</td><td class="r">35%</td><td class="r">-</td></tr></tbody></table>',
tax_formula:'<strong>\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e2a\u0e38\u0e17\u0e18\u0e34</strong> = \u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e1e\u0e36\u0e07\u0e1b\u0e23\u0e30\u0e40\u0e21\u0e34\u0e19 - \u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22 (50% \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 \u0e3f100,000) - \u0e04\u0e48\u0e32\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19<br><strong>\u0e20\u0e32\u0e29\u0e35</strong> = \u0e04\u0e33\u0e19\u0e27\u0e13\u0e15\u0e32\u0e21\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32',
tax_exemptions_title:'\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e41\u0e25\u0e30\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19\u0e20\u0e32\u0e29\u0e35',
tax_exemptions_detail:'<table class="tbl" style="margin-bottom:10px;font-size:10px"><thead><tr><th>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19</th><th class="r">\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 (\u0e3f)</th><th>\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e41\u0e25\u0e30\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02</th></tr></thead><tbody>'+
'<tr><td><strong>\u0e04\u0e48\u0e32\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27</strong></td><td class="r">60,000</td><td>\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35\u0e17\u0e38\u0e01\u0e04\u0e19 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02</td></tr>'+
'<tr><td><strong>\u0e04\u0e48\u0e32\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e04\u0e39\u0e48\u0e2a\u0e21\u0e23\u0e2a</strong></td><td class="r">60,000</td><td>\u0e04\u0e39\u0e48\u0e2a\u0e21\u0e23\u0e2a\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49 \u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e37\u0e48\u0e19\u0e20\u0e32\u0e29\u0e35\u0e23\u0e48\u0e27\u0e21\u0e01\u0e31\u0e19</td></tr>'+
'<tr><td><strong>\u0e04\u0e48\u0e32\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e1a\u0e38\u0e15\u0e23</strong></td><td class="r">30,000/\u0e04\u0e19</td><td>\u0e1a\u0e38\u0e15\u0e23\u0e0a\u0e2d\u0e1a\u0e14\u0e49\u0e27\u0e22\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u0e1a\u0e38\u0e15\u0e23\u0e04\u0e19\u0e17\u0e35\u0e48 2 \u0e40\u0e01\u0e34\u0e14\u0e1b\u0e35 2561+ \u0e44\u0e14\u0e49 \u0e3f60,000</td></tr>'+
'<tr><td><strong>\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e14\u0e39\u0e1a\u0e34\u0e14\u0e32\u0e21\u0e32\u0e23\u0e14\u0e32</strong></td><td class="r">30,000/\u0e04\u0e19</td><td>\u0e1a\u0e34\u0e14\u0e32\u0e21\u0e32\u0e23\u0e14\u0e32\u0e2d\u0e32\u0e22\u0e38 60+ \u0e21\u0e35\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f30,000/\u0e1b\u0e35 \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 4 \u0e04\u0e19</td></tr>'+
'<tr><td><strong>\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e14\u0e39\u0e04\u0e19\u0e1e\u0e34\u0e01\u0e32\u0e23</strong></td><td class="r">60,000</td><td>\u0e14\u0e39\u0e41\u0e25\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e04\u0e23\u0e2d\u0e1a\u0e04\u0e23\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e1e\u0e34\u0e01\u0e32\u0e23</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e01\u0e32\u0e23\u0e17\u0e33\u0e07\u0e32\u0e19 \u2014</strong></td></tr>'+
'<tr><td><strong>\u0e2b\u0e31\u0e01\u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22</strong></td><td class="r">100,000</td><td>50% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19 \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 \u0e3f100,000 \u0e04\u0e33\u0e19\u0e27\u0e13\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19 & \u0e2d\u0e2d\u0e21\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c \u2014</strong></td></tr>'+
'<tr><td><strong>\u0e40\u0e1a\u0e35\u0e49\u0e22\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e0a\u0e35\u0e27\u0e34\u0e15</strong></td><td class="r">100,000</td><td>\u0e01\u0e23\u0e21\u0e18\u0e23\u0e23\u0e21\u0e4c 10 \u0e1b\u0e35\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b \u0e01\u0e31\u0e1a\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e43\u0e19\u0e44\u0e17\u0e22 \u0e23\u0e27\u0e21\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f100,000</td></tr>'+
'<tr><td><strong>\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e</strong></td><td class="r">25,000</td><td>\u0e02\u0e2d\u0e07\u0e15\u0e19\u0e40\u0e2d\u0e07 \u0e23\u0e27\u0e21\u0e01\u0e31\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e0a\u0e35\u0e27\u0e34\u0e15\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f100,000</td></tr>'+
'<tr><td><strong>\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (\u0e2a\u0e1b\u0e2a.)</strong></td><td class="r">10,500</td><td>\u0e21.33: 5% \u0e02\u0e2d\u0e07\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07 \u0e40\u0e1e\u0e14\u0e32\u0e19 \u0e3f17,500 (2569-2571) \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 \u0e3f875/\u0e40\u0e14\u0e37\u0e2d\u0e19</td></tr>'+
'<tr><td><strong>\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e (PVD)</strong></td><td class="r">500,000</td><td>\u0e2a\u0e48\u0e27\u0e19\u0e17\u0e35\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f10,000 \u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e44\u0e14\u0e49\u0e16\u0e36\u0e07 \u0e3f490,000 \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 15% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e23\u0e27\u0e21 (\u0e23\u0e27\u0e21\u0e01\u0e31\u0e19\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f500,000) \u2014</strong></td></tr>'+
'<tr><td><strong>RMF (\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e23\u0e27\u0e21\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e01\u0e32\u0e23\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e)</strong></td><td class="r">500,000</td><td>\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 30% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49 \u0e15\u0e49\u0e2d\u0e07\u0e25\u0e07\u0e17\u0e38\u0e19\u0e15\u0e48\u0e2d\u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e16\u0e36\u0e07\u0e2d\u0e32\u0e22\u0e38 55</td></tr>'+
'<tr><td><strong>SSF (\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e23\u0e27\u0e21\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e01\u0e32\u0e23\u0e2d\u0e2d\u0e21)</strong></td><td class="r">200,000</td><td>\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 30% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49 \u0e16\u0e37\u0e2d\u0e04\u0e23\u0e2d\u0e07\u0e02\u0e31\u0e49\u0e19\u0e15\u0e48\u0e33 10 \u0e1b\u0e35</td></tr>'+
'<tr><td><strong>Thai ESG</strong></td><td class="r">300,000</td><td>\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 30% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49 \u0e16\u0e37\u0e2d\u0e04\u0e23\u0e2d\u0e07\u0e02\u0e31\u0e49\u0e19\u0e15\u0e48\u0e33 8 \u0e1b\u0e35 (2567-2569)</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2a\u0e34\u0e19 & \u0e40\u0e07\u0e34\u0e19\u0e1a\u0e23\u0e34\u0e08\u0e32\u0e04 \u2014</strong></td></tr>'+
'<tr><td><strong>\u0e14\u0e2d\u0e01\u0e40\u0e1a\u0e35\u0e49\u0e22\u0e40\u0e07\u0e34\u0e19\u0e01\u0e39\u0e49\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e2d\u0e32\u0e28\u0e31\u0e22</strong></td><td class="r">100,000</td><td>\u0e14\u0e2d\u0e01\u0e40\u0e1a\u0e35\u0e49\u0e22\u0e08\u0e32\u0e01\u0e2a\u0e34\u0e19\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e2d\u0e32\u0e28\u0e31\u0e22\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e08\u0e23\u0e34\u0e07 \u0e1c\u0e39\u0e49\u0e43\u0e2b\u0e49\u0e01\u0e39\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e16\u0e32\u0e1a\u0e31\u0e19\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e43\u0e19\u0e44\u0e17\u0e22 <strong>\u0e01\u0e23\u0e13\u0e35\u0e01\u0e39\u0e49\u0e23\u0e48\u0e27\u0e21:</strong> \u0e27\u0e07\u0e40\u0e07\u0e34\u0e19 \u0e3f100,000 \u0e2b\u0e32\u0e23\u0e40\u0e17\u0e48\u0e32\u0e46 \u0e01\u0e31\u0e19\u0e15\u0e32\u0e21\u0e08\u0e33\u0e19\u0e27\u0e19\u0e1c\u0e39\u0e49\u0e01\u0e39\u0e49 \u0e40\u0e0a\u0e48\u0e19 \u0e01\u0e39\u0e49\u0e23\u0e48\u0e27\u0e21 2 \u0e04\u0e19 = \u0e04\u0e19\u0e25\u0e30 \u0e3f50,000, \u0e01\u0e39\u0e49\u0e23\u0e48\u0e27\u0e21 3 \u0e04\u0e19 = \u0e04\u0e19\u0e25\u0e30 \u0e3f33,333 \u0e01\u0e39\u0e49\u0e2b\u0e25\u0e32\u0e22\u0e2b\u0e25\u0e31\u0e07\u0e44\u0e14\u0e49\u0e41\u0e15\u0e48\u0e23\u0e27\u0e21\u0e01\u0e31\u0e19\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f100,000 \u0e15\u0e48\u0e2d\u0e04\u0e19</td></tr>'+
'<tr><td><strong>\u0e40\u0e07\u0e34\u0e19\u0e1a\u0e23\u0e34\u0e08\u0e32\u0e04\u0e17\u0e31\u0e48\u0e27\u0e44\u0e1b</strong></td><td class="r">10% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e2a\u0e38\u0e17\u0e18\u0e34</td><td>\u0e1a\u0e23\u0e34\u0e08\u0e32\u0e04\u0e41\u0e01\u0e48\u0e2d\u0e07\u0e04\u0e4c\u0e01\u0e23\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e01\u0e38\u0e28\u0e25\u0e17\u0e35\u0e48\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</td></tr>'+
'<tr><td><strong>\u0e1a\u0e23\u0e34\u0e08\u0e32\u0e04\u0e01\u0e32\u0e23\u0e28\u0e36\u0e01\u0e29\u0e32/\u0e01\u0e35\u0e2c\u0e32</strong></td><td class="r">2x \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 10%</td><td>\u0e2b\u0e31\u0e01\u0e44\u0e14\u0e49 2 \u0e40\u0e17\u0e48\u0e32 \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 10% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e2a\u0e38\u0e17\u0e18\u0e34</td></tr>'+
'</tbody></table>'+
'<div style="font-size:9px;color:var(--text3);margin-top:6px">\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38: RMF + SSF + Thai ESG + PVD \u0e23\u0e27\u0e21\u0e01\u0e31\u0e19\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f500,000 \u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e0a\u0e35\u0e27\u0e34\u0e15 + \u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e \u0e23\u0e27\u0e21\u0e01\u0e31\u0e19\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19 \u0e3f100,000 \u0e08\u0e33\u0e19\u0e27\u0e19\u0e41\u0e25\u0e30\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e23\u0e31\u0e29\u0e0e\u0e32\u0e01\u0e23\u0e41\u0e25\u0e30\u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a\u0e1b\u0e35 2569 \u0e04\u0e27\u0e23\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e01\u0e31\u0e1a\u0e01\u0e23\u0e21\u0e2a\u0e23\u0e23\u0e1e\u0e32\u0e01\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e17\u0e35\u0e48\u0e1b\u0e23\u0e36\u0e01\u0e29\u0e32\u0e20\u0e32\u0e29\u0e35</div>'
},
ja:{
title:'\u30d8\u30eb\u30d7\u30fb\u30ea\u30d5\u30a1\u30ec\u30f3\u30b9',
sso_title:'\u30bf\u30a4\u793e\u4f1a\u4fdd\u969c (SSO) \u2014 \u62e0\u51fa\u91d1\u30eb\u30fc\u30eb',
legal:'<strong>\u6cd5\u7684\u6839\u62e0:</strong> \u793e\u4f1a\u4fdd\u969c\u6cd5 B.E.2533 (1990\u5e74) \u7b2c33\u6761<br><strong>\u7ba1\u8f44\u6a5f\u95a2:</strong> \u793e\u4f1a\u4fdd\u969c\u4e8b\u52d9\u5c40 (SSO)\u3001\u52b4\u50cd\u7701<br><strong>\u5bfe\u8c61\u8005:</strong> 15\u301c60\u6b73\u306e\u5168\u6c11\u9593\u90e8\u9580\u5f93\u696d\u54e1\uff08\u5916\u56fd\u4eba\u52b4\u50cd\u8a31\u53ef\u4fdd\u6709\u8005\u3092\u542b\u3080\uff09',
rate_title:'\u62e0\u51fa\u7387',
rate_hdr:'<tr><th>\u5f53\u4e8b\u8005</th><th class="r">\u7387</th><th>\u5099\u8003</th></tr>',
rate_tbl:'<tr><td>\u5f93\u696d\u54e1</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u6bce\u6708\u7d66\u4e0e\u304b\u3089\u63a7\u9664</td></tr><tr><td>\u96c7\u7528\u4e3b</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u30de\u30c3\u30c1\u30f3\u30b0\u62e0\u51fa\u3001\u5225\u9014\u652f\u6255\u3044</td></tr><tr><td>\u653f\u5e9c</td><td class="r" style="font-family:var(--mono)">2.75%</td><td>\u56fd\u304c\u8ca0\u62c5</td></tr>',
ceil_title:'\u8cc3\u91d1\u4e0a\u9650\u984d\uff08\u6bb5\u968e\u7684\u6539\u9769\uff09',
ceil_hdr:'<tr><th>\u30d5\u30a7\u30fc\u30ba</th><th>\u671f\u9593</th><th class="r">\u8cc3\u91d1\u4e0a\u9650</th><th class="r">\u6700\u5927/\u5f53\u4e8b\u8005</th><th class="r">\u5408\u8a08\u6700\u5927</th></tr>',
ceil_note:'\u6700\u4f4e\u8cc3\u91d1: \u0e3f1,650/\u6708\u3002\u5b98\u5831\u516c\u5e03: 2025\u5e7412\u670812\u65e5\u3002',
calc_title:'\u8a08\u7b97\u5f0f',
calc_body:'<strong>\u62e0\u51fa\u30d9\u30fc\u30b9</strong> = min(\u6708\u7d66, \u8cc3\u91d1\u4e0a\u9650)<br><strong>\u5f93\u696d\u54e1SSO</strong> = \u62e0\u51fa\u30d9\u30fc\u30b9 \u00d7 5%<br><br><strong>\u4f8b (2026\u5e74):</strong><br>\u6708\u7d66 \u0e3f10,000 \u2192 <strong>\u0e3f500</strong><br>\u6708\u7d66 \u0e3f17,500 \u2192 <strong>\u0e3f875</strong> (\u4e0a\u9650)<br>\u6708\u7d66 \u0e3f62,566 \u2192 <strong>\u0e3f875</strong> (\u4e0a\u9650\u9069\u7528)',
setup_title:'\u30a2\u30d7\u30ea\u3067\u306e\u8a2d\u5b9a\u65b9\u6cd5',
setup_body:'<ol style="padding-left:18px"><li><strong>Payroll</strong>\u30bf\u30d6\u3078</li><li>\u53ce\u5165\u9805\u76ee: <strong>SSO</strong>\u30c1\u30a7\u30c3\u30af\u30dc\u30c3\u30af\u30b9\u3092\u30aa\u30f3</li><li>\u63a7\u9664\u9805\u76ee: <strong>"% of SSO Base"</strong>\u3001\u7387 = <strong>5%</strong>\u3001\u4e0a\u9650 = <strong>\u0e3f875</strong></li></ol>',
benefit_title:'SSO\u7d66\u4ed8\u91d1 (2026\u5e74\u7387)',
benefit_hdr:'<tr><th>\u7d66\u4ed8</th><th class="r">2026\u5e74\u524d</th><th class="r">2026\u5e741\u6708\u304b\u3089</th></tr>',
compliance_title:'\u4e3b\u306a\u30b3\u30f3\u30d7\u30e9\u30a4\u30a2\u30f3\u30b9\u4e8b\u9805',
compliance:'<li>\u7d0d\u4ed8\u671f\u9650: <strong>\u7fcc\u670815\u65e5</strong></li><li>\u5ef6\u6ede\u7f70\u5247: <strong>\u6708\u30012%</strong></li><li>\u767b\u9332\u671f\u9650: <strong>\u5165\u793e\u304b\u308930\u65e5\u4ee5\u5185</strong></li><li>\u88dc\u511f\u958b\u59cb: <strong>\u521d\u65e5\u304b\u3089</strong></li>',
sources_title:'\u51fa\u5178',
tax_title:'\u30bf\u30a4\u500b\u4eba\u6240\u5f97\u7a0e',
tax_rates:'<table class="tbl" style="margin-bottom:10px"><thead><tr><th>\u8ab2\u7a0e\u6240\u5f97\uff08\u30d0\u30fc\u30c4\uff09</th><th class="r">\u7a0e\u7387</th><th class="r">\u6700\u5927\u7a0e\u984d</th></tr></thead><tbody>'+
'<tr><td>0 - 150,000</td><td class="r">\u514d\u7a0e</td><td class="r">0</td></tr>'+
'<tr><td>150,001 - 300,000</td><td class="r">5%</td><td class="r">7,500</td></tr>'+
'<tr><td>300,001 - 500,000</td><td class="r">10%</td><td class="r">20,000</td></tr>'+
'<tr><td>500,001 - 750,000</td><td class="r">15%</td><td class="r">37,500</td></tr>'+
'<tr><td>750,001 - 1,000,000</td><td class="r">20%</td><td class="r">50,000</td></tr>'+
'<tr><td>1,000,001 - 2,000,000</td><td class="r">25%</td><td class="r">250,000</td></tr>'+
'<tr><td>2,000,001 - 5,000,000</td><td class="r">30%</td><td class="r">900,000</td></tr>'+
'<tr><td>5,000,001+</td><td class="r">35%</td><td class="r">-</td></tr></tbody></table>',
tax_formula:'<strong>\u8ab2\u7a0e\u6240\u5f97</strong> = \u8a55\u4fa1\u6240\u5f97 - \u7d4c\u8cbb\u63a7\u9664\uff0850%\u3001\u4e0a\u9650 \u0e3f100,000\uff09 - \u6240\u5f97\u63a7\u9664<br><strong>\u7a0e\u984d</strong> = \u7d2f\u9032\u7a0e\u7387\u3092\u8ab2\u7a0e\u6240\u5f97\u306b\u9069\u7528',
tax_exemptions_title:'\u6240\u5f97\u63a7\u9664\u30fb\u7a0e\u984d\u63a7\u9664\u4e00\u89a7',
tax_exemptions_detail:'<table class="tbl" style="margin-bottom:10px;font-size:10px"><thead><tr><th>\u63a7\u9664\u9805\u76ee</th><th class="r">\u4e0a\u9650\u984d\uff08\u0e3f\uff09</th><th>\u8a73\u7d30\u30fb\u6761\u4ef6</th></tr></thead><tbody>'+
'<tr><td><strong>\u57fa\u790e\u63a7\u9664</strong></td><td class="r">60,000</td><td>\u5168\u7d0d\u7a0e\u8005\u3002\u6761\u4ef6\u306a\u3057\u3002</td></tr>'+
'<tr><td><strong>\u914d\u5076\u8005\u63a7\u9664</strong></td><td class="r">60,000</td><td>\u914d\u5076\u8005\u306b\u6240\u5f97\u304c\u306a\u3044\u5834\u5408\u3001\u307e\u305f\u306f\u5408\u7b97\u7533\u544a\u306e\u5834\u5408\u3002</td></tr>'+
'<tr><td><strong>\u5b50\u5973\u63a7\u9664</strong></td><td class="r">30,000/\u4eba</td><td>\u5ae1\u51fa\u5b50\u30022018\u5e74\u4ee5\u964d\u306e\u7b2c2\u5b50\u306f\u0e3f60,000\u3002</td></tr>'+
'<tr><td><strong>\u89aa\u6276\u990a\u63a7\u9664</strong></td><td class="r">30,000/\u4eba</td><td>60\u6b73\u4ee5\u4e0a\u3067\u6240\u5f97\u0e3f30,000/\u5e74\u4ee5\u4e0b\u3002\u6700\u59274\u540d\u3002</td></tr>'+
'<tr><td><strong>\u969c\u5bb3\u8005\u6276\u990a\u63a7\u9664</strong></td><td class="r">60,000</td><td>\u969c\u5bb3\u306e\u3042\u308b\u5bb6\u65cf\u306e\u4ecb\u8b77\u3002</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u5c31\u696d\u7d4c\u8cbb\u63a7\u9664 \u2014</strong></td></tr>'+
'<tr><td><strong>\u7d4c\u8cbb\u63a7\u9664</strong></td><td class="r">100,000</td><td>\u7d66\u4e0e\u6240\u5f97\u306e50%\u3001\u4e0a\u9650\u0e3f100,000\u3002\u81ea\u52d5\u8a08\u7b97\u3002</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u4fdd\u967a\u30fb\u8caf\u84c4 \u2014</strong></td></tr>'+
'<tr><td><strong>\u751f\u547d\u4fdd\u967a\u6599</strong></td><td class="r">100,000</td><td>\u30bf\u30a4\u8a8d\u53ef\u4fdd\u967a\u4f1a\u793e\u3002\u5951\u7d0410\u5e74\u4ee5\u4e0a\u3002\u5065\u5eb7\u4fdd\u967a\u3068\u5408\u8a08\u0e3f100,000\u307e\u3067\u3002</td></tr>'+
'<tr><td><strong>\u5065\u5eb7\u4fdd\u967a\u6599</strong></td><td class="r">25,000</td><td>\u672c\u4eba\u306e\u307f\u3002\u751f\u547d\u4fdd\u967a\u3068\u5408\u8a08\u0e3f100,000\u3092\u8d85\u3048\u306a\u3044\u3002</td></tr>'+
'<tr><td><strong>\u793e\u4f1a\u4fdd\u967a\uff08SSO\uff09</strong></td><td class="r">10,500</td><td>\u7b2c33\u6761\uff1a\u8cc3\u91d1\u306e5%\u3001\u4e0a\u9650\u0e3f17,500\uff082026-2028\u5e74\uff09\u3002\u6708\u984d\u4e0a\u9650\u0e3f875\u3002</td></tr>'+
'<tr><td><strong>\u9000\u8077\u7a4d\u7acb\u57fa\u91d1\uff08PVD\uff09</strong></td><td class="r">500,000</td><td>\u0e3f10,000\u8d85\u904e\u5206\u304c\u6700\u5927\u0e3f490,000\u307e\u3067\u63a7\u9664\u53ef\u3002\u7d66\u4e0e\u306e15%\u307e\u3067\u3002</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u6295\u8cc7\u30d5\u30a1\u30f3\u30c9\uff08\u5408\u8a08\u4e0a\u9650\u0e3f500,000\uff09 \u2014</strong></td></tr>'+
'<tr><td><strong>RMF\uff08\u9000\u8077\u6295\u8cc7\u4fe1\u8a17\uff09</strong></td><td class="r">500,000</td><td>\u6240\u5f97\u306e30%\u307e\u3067\u300255\u6b73\u307e\u3067\u7d99\u7d9a\u6295\u8cc7\u5fc5\u9808\u3002</td></tr>'+
'<tr><td><strong>SSF\uff08\u8caf\u84c4\u6295\u8cc7\u4fe1\u8a17\uff09</strong></td><td class="r">200,000</td><td>\u6240\u5f97\u306e30%\u307e\u3067\u3002\u6700\u4f4e\u4fdd\u6709\u671f\u959310\u5e74\u3002</td></tr>'+
'<tr><td><strong>Thai ESG</strong></td><td class="r">300,000</td><td>\u6240\u5f97\u306e30%\u307e\u3067\u3002\u6700\u4f4e\u4fdd\u6709\u671f\u95938\u5e74\uff082024-2026\u5e74\uff09\u3002</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 \u4e0d\u52d5\u7523\u30fb\u5bc4\u4ed8\u91d1 \u2014</strong></td></tr>'+
'<tr><td><strong>\u4f4f\u5b85\u30ed\u30fc\u30f3\u5229\u606f</strong></td><td class="r">100,000</td><td>\u81ea\u5df1\u5c45\u4f4f\u7528\u4f4f\u5b85\u306e\u4f4f\u5b85\u30ed\u30fc\u30f3\u5229\u606f\u3002\u30bf\u30a4\u306e\u91d1\u878d\u6a5f\u95a2\u304b\u3089\u306e\u501f\u5165\u304c\u5bfe\u8c61\u3002<strong>\u5171\u540c\u501f\u5165\u306e\u5834\u5408\uff1a</strong>\u0e3f100,000\u306e\u4e0a\u9650\u3092\u501f\u5165\u4eba\u6570\u3067\u5747\u7b49\u5206\u5272 \u2014 \u4f8b\uff1a2\u540d\u3067\u5171\u540c\u501f\u5165=\u5404\u0e3f50,000\u30013\u540d=\u5404\u0e3f33,333\u3002\u8907\u6570\u7269\u4ef6\u306e\u5408\u7b97\u30821\u4eba\u3042\u305f\u308a\u4e0a\u9650\u0e3f100,000\u3002</td></tr>'+
'<tr><td><strong>\u4e00\u822c\u5bc4\u4ed8\u91d1</strong></td><td class="r">\u8ab2\u7a0e\u6240\u5f97\u306e10%</td><td>\u627f\u8a8d\u3055\u308c\u305f\u6148\u5584\u56e3\u4f53\u3078\u306e\u5bc4\u4ed8\u3002</td></tr>'+
'<tr><td><strong>\u6559\u80b2\u30fb\u30b9\u30dd\u30fc\u30c4\u5bc4\u4ed8</strong></td><td class="r">2\u500d \u4e0a\u965010%</td><td>2\u500d\u63a7\u9664\u3002\u8ab2\u7a0e\u6240\u5f97\u306e10%\u307e\u3067\u3002</td></tr>'+
'</tbody></table>'+
'<div style="font-size:9px;color:var(--text3);margin-top:6px">\u6ce8\uff1aRMF + SSF + Thai ESG + PVD \u5408\u8a08\u4e0a\u9650\u0e3f500,000\u3002\u751f\u547d\u4fdd\u967a+\u5065\u5eb7\u4fdd\u967a \u5408\u8a08\u4e0a\u9650\u0e3f100,000\u3002\u91d1\u984d\u30fb\u6761\u4ef6\u306f\u6b73\u5165\u6cd5\u5178\u304a\u3088\u30732026\u5e74\u898f\u5247\u306b\u57fa\u3065\u304f\u3002\u7a0e\u52d9\u7f72\u307e\u305f\u306f\u7a0e\u7406\u58eb\u306b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002</div>'
}
};


function getCardBreakdown(){
var breakdown={'Cash/Direct':{monthly:[],yearly:[],installments:[]}};
var nMo=0;if(SIM&&SIM.mAgg){nMo=Object.keys(SIM.mAgg).length}
if(!nMo)nMo=1;
D.cards.forEach(function(c){breakdown[c.name]={monthly:[],yearly:[],installments:[]}});
D.monthly.forEach(function(m){
var cn=m.card||'Cash/Direct';if(!breakdown[cn])breakdown[cn]={monthly:[],yearly:[],installments:[]};
breakdown[cn].monthly.push({name:m.name,amount:m.amount,annual:m.amount*nMo,direction:m.direction||'expense'})});
D.yearly.forEach(function(y){
var cn=y.card||'Cash/Direct';if(!breakdown[cn])breakdown[cn]={monthly:[],yearly:[],installments:[]};
breakdown[cn].yearly.push({name:y.name,amount:y.amount,pay_mode:y.pay_mode||'full',direction:y.direction||'expense'})});
allInstallments().filter(function(x){return x.status==='Active'||x.status==='Planned'}).forEach(function(inst){
var cn=inst.card||'Cash/Direct';if(!breakdown[cn])breakdown[cn]={monthly:[],yearly:[],installments:[]};
breakdown[cn].installments.push({name:inst.name,per_period:inst.per_period,periods:inst.periods,total:inst.total})});
return breakdown}
