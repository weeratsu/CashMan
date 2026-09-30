// ui-creditcards.js — Credit Cards module: full card details, summary, credit-terms planner,
// expiry alerts, points log, rule-based "best card" recommendation, and export-for-AI.
// Extends the existing D.cards objects (keeps statement_day/payment_day/deadline/statement_start).

// ---- helpers ----
// Which card rows are expanded (persists across re-renders so editing a field doesn't collapse the card).
var _ccOpen={};
var _ccDebtOpen={};
function ccToggleDebt(i){_ccDebtOpen[i]=!_ccDebtOpen[i];var b=document.getElementById('ccdebt_'+i);var cx=document.getElementById('ccdebtcx_'+i);if(b)b.style.display=_ccDebtOpen[i]?'':'none';if(cx)cx.textContent=_ccDebtOpen[i]?'\u25bc':'\u25b6';}
function ccToggleCard(i){_ccOpen[i]=!_ccOpen[i];var b=document.getElementById('ccbody_'+i);var cx=document.getElementById('ccx_'+i);if(b)b.style.display=_ccOpen[i]?'':'none';if(cx)cx.textContent=_ccOpen[i]?'\u25bc':'\u25b6';}
function _ccToday(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function _ccDaysUntil(dateObj){return Math.round((dateObj-_ccToday())/86400000);}
// Credit terms = interest-free days = from statement (cutoff) day to payment deadline day.
// If deadline day <= statement day, the deadline is next month, so add days-in-month.
function ccCreditTermDays(c){
var sd=c.statement_day||1, dl=c.deadline||c.payment_day||1;
var d=dl-sd; if(d<=0)d+=30; return d;
}
// Expiry (YYYY-MM) -> Date at end of that month; returns null if unset/invalid.
function ccExpiryDate(c){
if(!c.expiry)return null; var p=c.expiry.split('-'); if(p.length<2)return null;
var y=parseInt(p[0]),m=parseInt(p[1]); if(isNaN(y)||isNaN(m))return null;
return new Date(y,m,0); // day 0 of next month = last day of expiry month
}
function ccExpiryStatus(c){ // {state:'expired'|'soon'|'ok', days, date} or null
var e=ccExpiryDate(c); if(!e)return null;
var diff=Math.round((e-_ccToday())/86400000);
if(diff<0)return{state:'expired',days:-diff,date:e};
if(diff<=90)return{state:'soon',days:diff,date:e}; // warn within ~3 months
return{state:'ok',days:diff,date:e};
}
function ccAvail(c){ // remaining credit
var lim=c.credit_limit||0, bal=c.current_balance||0; return lim-bal;
}

// ---- Calculated debt from transactions ----
// Outstanding debt charged to a card = remaining (future) installment periods x per-period amount
// + future planned expenses charged to the card. "Future" = payment date strictly after today.
// Mirrors simulation.js period-date logic so figures match the Timeline.
// First (earliest visible) payment date label for an installment, for 'starts ...' text.
function _ccInstStartLabel(inst,shift,dl){
for(var i=0;i<inst.periods;i++){
var m=inst.start_month-1+i+shift,y=inst.start_year;while(m>11){m-=12;y++}
var d=new Date(y,m,Math.min(dl,dim(y,m)));
if(inst.hide_before&&d<new Date(inst.hide_before+'T00:00:00'))continue;
return fmtDate(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2));
}
return '';
}
function ccCalcDebt(cardName){
var out={inst:0,planned:0,total:0,items:[]};
if(!cardName||cardName==='Cash/Direct'||typeof allInstallments!=='function')return out;
var today=_ccToday();
var cardObj=(D.cards||[]).find(function(x){return x.name===cardName;});
var dl=cardObj?(cardObj.payment_day||15):15;
// Installments (manual + yearly-derived)
try{
allInstallments().forEach(function(inst){
if(inst.card!==cardName)return;
if(inst.status!=='Active'&&inst.status!=='Planned')return;
var shift=(cardObj&&inst.billing_day&&inst.billing_day>cardObj.statement_day)?1:0;
// Rule (user-chosen): count only UNPAID periods (due date strictly after today) — e.g. a
// 10-period plan with 3 paid contributes periods 4–10. A plan that has NOT started yet (its
// first period is still in a future month) is excluded entirely — future commitment, not debt.
var monthEnd=new Date(today.getFullYear(),today.getMonth(),dim(today.getFullYear(),today.getMonth()));
var firstDue=null,remain=0,remCount=0,paidCount=0,visibleCount=0;
for(var i=0;i<inst.periods;i++){
var m=inst.start_month-1+i+shift,y=inst.start_year;while(m>11){m-=12;y++}
var d=new Date(y,m,Math.min(dl,dim(y,m)));
if(inst.hide_before&&d<new Date(inst.hide_before+'T00:00:00'))continue;
if(firstDue===null)firstDue=d;
visibleCount++;
if(d>today){remain+=inst.per_period;remCount++;}else{paidCount++;}
}
var startedPlan=(firstDue!==null&&firstDue<=monthEnd);
if(startedPlan&&remain>0){out.inst+=remain;out.items.push({name:inst.name,kind:'Installment',remaining:remain,note:remCount+' unpaid of '+visibleCount+' ('+paidCount+' paid)',source:inst.source});}
else if(!startedPlan&&visibleCount>0){out.items.push({name:inst.name,kind:'Installment',remaining:0,_future:true,note:'not started · starts '+_ccInstStartLabel(inst,shift,dl),source:inst.source});}
});
}catch(e){}
// Planned expenses charged to this card, still in the future
(D.planned||[]).forEach(function(p){
if(p.card!==cardName)return;
if((p.direction||'expense')!=='expense')return;
if(!p.date)return;
var d=new Date(p.date+'T00:00:00');if(isNaN(d))return;
if(d>today){out.planned+=(p.amount||0);out.items.push({name:p.name,kind:'Planned',remaining:p.amount||0,note:fmtDate(p.date),source:'Planned'});}
});
out.total=out.inst+out.planned;
return out;
}
function ccUseCalcDebt(i){
if(!D.cards[i])return;
var dbt=ccCalcDebt(D.cards[i].name);
_ccEnsureDraft(i).current_balance=Math.round(dbt.total*100)/100;
_ccMarkDirty(i);renderCreditCards();
toast('Set balance to calculated debt \u0e3f'+fmt(dbt.total));
}

// ---- Yearly spend on a card (for fee-waiver tracking) ----
// Sums all expense charges to this card within the given calendar year, using the same
// occurrence enumeration as the Bills Reminder (installments + recurring + planned).
function ccSpendForCard(cardName,year){
if(!cardName||cardName==='Cash/Direct')return 0;
if(typeof billOccurrences!=='function')return 0;
var from=new Date(year,0,1),to=new Date(year,11,31);
var total=0;
try{
billOccurrences(from,to).forEach(function(o){
if(o.card!==cardName)return;
if(o.group==='card_statement')return; // don't double-count consolidated statement payments
total+=(o.amount||0);
});
}catch(e){}
return total;
}
// Number of expense charges to a card within a calendar year (for count-based fee-waiver).
function ccCountForCard(cardName,year){
if(!cardName||cardName==='Cash/Direct')return 0;
if(typeof billOccurrences!=='function')return 0;
var from=new Date(year,0,1),to=new Date(year,11,31);var n=0;
try{billOccurrences(from,to).forEach(function(o){if(o.card!==cardName)return;if(o.group==='card_statement')return;n++;});}catch(e){}
return n;
}
// Fee-waiver progress. Supports two modes:
//   'amount' — target is ฿/year; auto = sum of charges this year.
//   'count'  — target is number of swipes/year; auto = count of charges this year.
// fee_waiver_manual is ADDED to the auto figure (spend/count that wasn't recorded in the app).
// Returns {mode, target, auto, manual, done, pct, met, remaining, year} or null if no target.
function ccFeeWaiverProgress(c){
var mode=c.fee_waiver_mode;if(mode!=='count'&&mode!=='either')mode='amount';
var yr=(new Date()).getFullYear();
// Build a sub-progress for the amount side and/or the count side as needed.
function sub(kind){
var tgt=(kind==='count')?(parseFloat(c.fee_waiver_target_count)||0):(parseFloat(c.fee_waiver_target)||0);
if(tgt<=0)return null;
var man=(kind==='count')?(parseFloat(c.fee_waiver_manual_count)||0):(parseFloat(c.fee_waiver_manual)||0);
var au=(kind==='count')?ccCountForCard(c.name,yr):ccSpendForCard(c.name,yr);
var dn=au+man;var pc=Math.min(100,Math.round(dn/tgt*1000)/10);
return {kind:kind,target:tgt,auto:au,manual:man,done:dn,pct:pc,met:dn>=tgt,remaining:Math.max(0,tgt-dn)};
}
if(mode==='either'){
var a=sub('amount'),n=sub('count');
if(!a&&!n)return null;
var met=(a&&a.met)||(n&&n.met);
return {mode:'either',year:yr,amount:a,count:n,met:met};
}
var s=sub(mode);if(!s)return null;
return {mode:mode,year:yr,target:s.target,auto:s.auto,manual:s.manual,done:s.done,pct:s.pct,met:s.met,remaining:s.remaining};
}

// Shared credit-limit group: members share ONE limit. Group limit = the largest limit set on
// any member (they should all be the same shared ceiling); balance = sum of all members' balances.
function ccGroupInfo(name){
if(!name)return null;
var members=(D.cards||[]).filter(function(c){return (c.limit_group||'')===name;});
if(members.length<2)return null; // a group needs 2+ cards to be meaningful
var limit=0,bal=0;
members.forEach(function(c){if((c.credit_limit||0)>limit)limit=c.credit_limit||0;bal+=(c.current_balance||0);});
return {name:name,members:members,limit:limit,balance:bal,available:limit-bal,count:members.length};
}
function ccLatestPoints(c){
if(!c.points_log||!c.points_log.length)return null;
return c.points_log.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');})[0];
}
// ---- summary table sorting ----
var _ccSort={col:'term',dir:-1}; // default: credit term, descending
function ccSortSummary(col){
if(_ccSort.col===col){_ccSort.dir=-_ccSort.dir;}else{_ccSort.col=col;_ccSort.dir=(col==='name'||col==='bank')?1:-1;}
renderCreditCards();
}
function _ccSortVal(c,col){
switch(col){
case 'name':return (c.name||'').toLowerCase();
case 'bank':return (c.bank||'').toLowerCase();
case 'limit':return c.credit_limit||0;
case 'balance':return c.current_balance||0;
case 'avail':return ccAvail(c);
case 'term':return ccCreditTermDays(c);
case 'statement':return c.statement_day||1;
case 'deadline':return c.deadline||c.payment_day||1;
case 'expiry':return (c.expiry||'9999-99');
default:return 0;
}
}
function _ccSortCards(arr){
var col=_ccSort.col,dir=_ccSort.dir;
return arr.slice().sort(function(a,b){var va=_ccSortVal(a,col),vb=_ccSortVal(b,col);if(va<vb)return -1*dir;if(va>vb)return 1*dir;return (a.name||'').localeCompare(b.name||'');});
}
function _ccSortArrow(col){return _ccSort.col===col?(_ccSort.dir>0?' \u25b2':' \u25bc'):'';}

// ===== MAIN RENDER =====
function renderCreditCards(){
var el=document.getElementById('creditcards-content'); if(!el)return;
if(!D){el.innerHTML='<p class="text-muted">No data.</p>';return;}
var cards=(D.cards||[]).slice().sort(function(a,b){return a.name.localeCompare(b.name);});
var h='';

// ---- Expiry alerts banner ----
var alerts=cards.map(function(c){return {c:c,st:ccExpiryStatus(c)};}).filter(function(x){return x.st&&(x.st.state==='expired'||x.st.state==='soon');});
if(alerts.length){
h+='<div class="card" style="border:1px solid var(--warning);background:rgba(245,158,11,0.08);margin-bottom:10px">';
h+='<h2 style="font-size:12px;color:var(--warning)"><i class="fa-solid fa-triangle-exclamation"></i> Card expiry alerts</h2>';
h+='<ul style="margin:6px 0 0 18px;font-size:11px">';
alerts.forEach(function(x){
var s=x.st; var lbl=s.state==='expired'?('<b style="color:var(--error)">EXPIRED</b> '+s.days+' day(s) ago'):('expires in <b>'+s.days+' day(s)</b>');
h+='<li>'+esc(x.c.name)+(x.c.last4?' ••••'+esc(x.c.last4):'')+' — '+lbl+' ('+_ccMon(x.c.expiry)+')</li>';
});
h+='</ul></div>';
}

// ---- Summary + credit-terms ranking ----
h+='<div class="card" style="margin-bottom:10px"><h2 style="font-size:12px"><i class="fa-solid fa-table-list"></i> Card Summary &amp; Credit Terms</h2>';
if(!cards.length){h+='<p class="text-muted" style="font-size:11px">No cards yet. Add one below.</p>';}
else{
// rank by credit-term days (longest interest-free first)
var ranked=cards.slice().sort(function(a,b){return ccCreditTermDays(b)-ccCreditTermDays(a);});
var best=ranked[0];
var sorted=_ccSortCards(cards);var _tLim=0,_tBal=0,_tAvail=0;var _sh='cursor:pointer;user-select:none;white-space:nowrap';
var sorted=_ccSortCards(cards);var _sh='cursor:pointer;user-select:none;white-space:nowrap';h+='<table class="tbl" style="font-size:10px"><thead><tr>'+'<th style="'+_sh+'" onclick="ccSortSummary(&#39;name&#39;)">Card'+_ccSortArrow('name')+'</th>'+'<th style="'+_sh+'" onclick="ccSortSummary(&#39;bank&#39;)">Bank'+_ccSortArrow('bank')+'</th>'+'<th class="r" style="'+_sh+'" onclick="ccSortSummary(&#39;limit&#39;)">Limit'+_ccSortArrow('limit')+'</th>'+'<th class="r" style="'+_sh+'" onclick="ccSortSummary(&#39;balance&#39;)">Balance'+_ccSortArrow('balance')+'</th>'+'<th class="r" style="'+_sh+'" onclick="ccSortSummary(&#39;avail&#39;)">Available'+_ccSortArrow('avail')+'</th>'+'<th class="r" style="'+_sh+'" onclick="ccSortSummary(&#39;term&#39;)" title="Interest-free days">Credit Term'+_ccSortArrow('term')+'</th>'+'<th class="r" style="'+_sh+'" onclick="ccSortSummary(&#39;statement&#39;)">Statement'+_ccSortArrow('statement')+'</th>'+'<th class="r" style="'+_sh+'" onclick="ccSortSummary(&#39;deadline&#39;)">Deadline'+_ccSortArrow('deadline')+'</th>'+'<th style="'+_sh+'" onclick="ccSortSummary(&#39;expiry&#39;)">Expiry'+_ccSortArrow('expiry')+'</th>'+'<th></th></tr></thead><tbody>';
sorted.forEach(function(c){
var term=ccCreditTermDays(c); var avail=ccAvail(c);
var util=(c.credit_limit>0)?(c.current_balance/c.credit_limit*100):0;
_tLim+=c.credit_limit||0;_tBal+=c.current_balance||0;_tAvail+=(c.credit_limit>0?ccAvail(c):0);
var es=ccExpiryStatus(c);
var expTxt=c.expiry?('<span style="'+(es&&es.state==='expired'?'color:var(--error);font-weight:600':es&&es.state==='soon'?'color:var(--warning);font-weight:600':'')+'">'+_ccMon(c.expiry)+'</span>'):'<span style="color:var(--text3)">—</span>';
var isBest=(c===best&&term>0);
h+='<tr'+(isBest?' style="background:var(--primary-bg)"':'')+'>'+
'<td style="font-weight:600">'+(isBest?'<i class="fa-solid fa-star" style="color:var(--primary);font-size:8px;margin-right:3px" title="Longest interest-free period"></i>':'')+esc(c.name)+(c.last4?' <span style="font-size:8px;color:var(--text3)">••••'+esc(c.last4)+'</span>':'')+'</td>'+
'<td style="font-size:9px">'+esc(c.bank||'—')+'</td>'+
'<td class="r" style="font-family:var(--mono)">'+(c.credit_limit>0?'฿'+fmt(c.credit_limit):'—')+'</td>'+
'<td class="r" style="font-family:var(--mono)">'+(c.current_balance>0?'฿'+fmt(c.current_balance):'—')+'</td>'+
'<td class="r" style="font-family:var(--mono);color:'+(avail>0?'var(--success)':'var(--text3)')+'">'+(c.credit_limit>0?'฿'+fmt(avail):'—')+(util>0?' <span style="font-size:8px;color:'+(util>80?'var(--error)':'var(--text3)')+'">('+util.toFixed(0)+'%)</span>':'')+'</td>'+
'<td class="r" style="font-weight:700;color:var(--primary)">'+term+'d</td>'+
'<td class="r">'+ord(c.statement_day||1)+'</td>'+
'<td class="r">'+ord(c.deadline||c.payment_day||1)+'</td>'+
'<td style="white-space:nowrap">'+expTxt+'</td>'+'<td class="r">'+(c.url?('<a href="'+esc(c.url)+'" target="_blank" rel="noopener" title="'+esc(c.url)+'" style="color:var(--primary)"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>'):'')+'</td></tr>';
});
h+='</tbody><tfoot><tr style="border-top:2px solid var(--border);font-weight:700">'+'<td colspan="2">Total ('+sorted.length+' cards)</td>'+'<td class="r" style="font-family:var(--mono)">฿'+fmt(_tLim)+'</td>'+'<td class="r" style="font-family:var(--mono);color:var(--error)">฿'+fmt(_tBal)+'</td>'+'<td class="r" style="font-family:var(--mono);color:'+(_tAvail>0?'var(--success)':'var(--text3)')+'">฿'+fmt(_tAvail)+'</td>'+'<td colspan="5"></td></tr></tfoot></table>';
if(best&&ccCreditTermDays(best)>0){
h+='<div style="font-size:10px;color:var(--text2);margin-top:6px"><i class="fa-solid fa-lightbulb" style="color:var(--warning)"></i> <b>Tip:</b> '+esc(best.name)+' gives the longest interest-free period ('+ccCreditTermDays(best)+' days). Charge big purchases just after its statement day ('+ord(best.statement_day||1)+') to maximise float before the '+ord(best.deadline||best.payment_day||1)+' deadline.</div>';
}
// Shared credit-limit groups summary
var _seen={},_grpList=[];
cards.forEach(function(c){var g=c.limit_group||'';if(g&&!_seen[g]){var gi=ccGroupInfo(g);if(gi){_seen[g]=1;_grpList.push(gi);}}});
if(_grpList.length){
h+='<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:3px"><i class="fa-solid fa-link" style="margin-right:3px"></i> Shared credit-limit groups</div>';
h+='<table class="tbl" style="font-size:10px"><thead><tr><th>Group</th><th>Cards</th><th class="r">Group limit</th><th class="r">Used</th><th class="r">Available</th></tr></thead><tbody>';
_grpList.forEach(function(g){h+='<tr><td style="font-weight:600">'+esc(g.name)+'</td><td style="font-size:9px;color:var(--text3)">'+g.members.map(function(m){return esc(m.name);}).join(', ')+'</td><td class="r" style="font-family:var(--mono)">฿'+fmt(g.limit)+'</td><td class="r" style="font-family:var(--mono)">฿'+fmt(g.balance)+'</td><td class="r" style="font-family:var(--mono);color:'+(g.available>0?'var(--success)':'var(--error)')+'">฿'+fmt(g.available)+'</td></tr>';});
h+='</tbody></table></div>';
}
}
h+='</div>';

// ---- Best-card recommender (rule-based) ----
h+='<div class="card" style="margin-bottom:10px"><h2 style="font-size:12px"><i class="fa-solid fa-wand-magic-sparkles"></i> Which card should I use?</h2>';
h+='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11px">';
h+='<span style="color:var(--text2)">What are you buying?</span>';
h+='<input type="text" id="cc-reco-q" placeholder="e.g. online, dining, travel, fuel, grocery" style="flex:1;min-width:160px;padding:3px 8px;font-size:11px" onkeydown="if(event.key===\'Enter\')ccRecommend()">';
h+='<button class="btn btn-primary" style="font-size:10px;padding:4px 12px" onclick="ccRecommend()"><i class="fa-solid fa-magnifying-glass"></i> Suggest</button>';
h+='</div><div id="cc-reco-out" style="margin-top:8px"></div>';
h+='<div style="font-size:9px;color:var(--text3);margin-top:6px"><i class="fa-solid fa-info-circle"></i> Matches your keyword against each card\u2019s Benefits text, and factors in the interest-free period. For deeper advice, use \u201cExport for AI\u201d below and ask in chat.</div>';
h+='</div>';

// ---- Card editor (per-card expandable) ----
h+='<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><h2 style="font-size:12px;flex:1"><i class="fa-solid fa-credit-card"></i> Card Details</h2>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="ccExportForAI()"><i class="fa-solid fa-robot"></i> Export for AI</button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="ccBackupCards()" title="Download all card data as a JSON backup"><i class="fa-solid fa-download"></i> Backup Cards</button>';
h+='<button class="btn btn-primary" style="font-size:10px;padding:3px 10px" onclick="addCard();renderCreditCards()"><i class="fa-solid fa-plus"></i> Add Card</button></div>';
if(!cards.length){h+='<p class="text-muted" style="font-size:11px">No cards yet.</p>';}
cards.forEach(function(c){
var i=(D.cards||[]).indexOf(c);
var es=ccExpiryStatus(c);
var expBadge=es?(es.state==='expired'?'<span style="font-size:8px;padding:1px 6px;border-radius:6px;background:var(--error);color:#fff">EXPIRED</span>':es.state==='soon'?'<span style="font-size:8px;padding:1px 6px;border-radius:6px;background:var(--warning);color:#fff">expires in '+es.days+'d</span>':''):'';
var lp=ccLatestPoints(c);
var gid='ccbody_'+i;
h+='<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden">';
// header row (click to expand)
h+='<div style="background:var(--bg3);padding:7px 10px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px" onclick="ccToggleCard('+i+')">';
h+='<span class="ccx" id="ccx_'+i+'" style="color:var(--text3);width:12px">'+(_ccOpen[i]?'\u25bc':'\u25b6')+'</span>';
h+='<i class="fa-solid fa-credit-card" style="color:var(--primary)"></i><b style="font-size:12px">'+esc(c.name)+'</b>';
if(c.last4)h+='<span style="font-size:9px;color:var(--text3)">••••'+esc(c.last4)+'</span>';
if(c.bank)h+='<span style="font-size:9px;color:var(--text3)">'+esc(c.bank)+'</span>';
h+='<span style="flex:1"></span>'+expBadge;
h+='<span style="font-size:10px;color:var(--primary);font-weight:600">'+ccCreditTermDays(c)+'d term</span></div>';
// body
h+='<div id="'+gid+'" style="display:'+(_ccOpen[i]?'':'none')+';padding:10px">';
// Unsaved-changes badge
h+='<div id="ccdirty_'+i+'" style="display:'+(_ccDirty[i]?'inline':'none')+';font-size:9px;color:var(--warning);font-weight:700;margin-bottom:4px">\u25cf Unsaved changes</div>';
h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:10px">';
h+=_ccField(i,'name','Card name','text',cardVal(i,'name'));
h+='<div><label style="color:var(--text3)">Bank</label><select style="width:100%;padding:3px 6px;font-size:10px" onchange="ccSet('+i+',\'bank\',this.value)">'+(typeof bankOpts==='function'?bankOpts(cardVal(i,'bank')||''):'<option>'+esc(cardVal(i,'bank')||'')+'</option>')+'</select><div style="font-size:8px;color:var(--text3);margin-top:1px">Manage list in Setup \u2192 Banks</div></div>';
h+=_ccField(i,'last4','Last 4 digits','text',cardVal(i,'last4'));
h+=_ccField(i,'expiry','Expiry (month)','month',cardVal(i,'expiry'));
h+=_ccNum(i,'statement_day','Statement day',cardVal(i,'statement_day'));
h+=_ccNum(i,'payment_day','Planned Pay day',cardVal(i,'payment_day'));
h+=_ccNum(i,'deadline','Deadline day',cardVal(i,'deadline'));
h+=_ccField(i,'statement_start','Statements from','month',cardVal(i,'statement_start'));
h+=_ccMoney(i,'credit_limit','Credit limit (฿)',cardVal(i,'credit_limit'));
h+=_ccMoney(i,'current_balance','Current balance (฿)',cardVal(i,'current_balance'));
var _dbt=ccCalcDebt(c.name);
if(_dbt.total>0){h+='<div><label style="color:var(--text3)">Calculated debt (from transactions)</label><div style="font-family:var(--mono);font-weight:600;color:var(--error);padding:3px 0">฿'+fmt(_dbt.total)+'<div style="font-size:8px;color:var(--text3);font-weight:400">installments ฿'+fmt(_dbt.inst)+' + planned ฿'+fmt(_dbt.planned)+'</div>';h+='<div style="display:flex;gap:8px;align-items:center;margin-top:2px">';h+='<span id="ccdebtcx_'+i+'" style="cursor:pointer;user-select:none;font-size:9px;color:var(--primary)" onclick="ccToggleDebt('+i+')">'+(_ccDebtOpen[i]?'▼':'▶')+' details ('+_dbt.items.length+')</span>';h+='<button class="btn btn-ghost" style="font-size:8px;padding:1px 8px" onclick="ccUseCalcDebt('+i+')"><i class="fa-solid fa-arrow-down"></i> Use as balance</button>';h+='</div>';h+='<div id="ccdebt_'+i+'" style="display:'+(_ccDebtOpen[i]?'':'none')+';margin-top:4px">';if(_dbt.items.length){h+='<table class="tbl" style="font-size:9px"><thead><tr><th>Item</th><th>Kind</th><th>Detail</th><th class="r">Remaining</th></tr></thead><tbody>';_dbt.items.slice().sort(function(a,b){return (b._future?-1:b.remaining)-(a._future?-1:a.remaining);}).forEach(function(it){var _fu=it._future;h+='<tr style="'+(_fu?'opacity:.55':'')+'"><td style="font-weight:600">'+esc(it.name)+'</td><td><span style="font-size:8px;padding:1px 5px;border-radius:4px;background:'+(it.kind==='Installment'?'var(--primary-bg);color:var(--primary)':'var(--bg3);color:var(--text2)')+'">'+esc(it.kind)+(it.source&&it.source!=='Manual'&&it.source!=='Planned'?' · '+esc(it.source):'')+'</span>'+(_fu?' <span style="font-size:7px;padding:1px 4px;border-radius:3px;background:var(--bg3);color:var(--text3)">future</span>':'')+'</td><td style="font-size:8px;color:var(--text3)">'+esc(it.note||'')+'</td><td class="r" style="font-family:var(--mono);color:'+(_fu?'var(--text3)':'var(--error)')+'">'+(_fu?'not counted':'฿'+fmt(it.remaining))+'</td></tr>';});h+='</tbody></table>';}else{h+='<div style="font-size:9px;color:var(--text3)">No future charges.</div>';}h+='</div>';h+='</div></div>';}
h+=_ccField(i,'limit_group','Shared limit group','text',cardVal(i,'limit_group'));
h+='<div><label style="color:var(--text3)">Card details URL</label><input type="url" value="'+esc(cardVal(i,'url')||'')+'" placeholder="https://..." style="width:100%;padding:3px 6px;font-size:10px" onchange="ccSet('+i+',&#39;url&#39;,this.value)">'+((cardVal(i,'url'))?'<a href="'+esc(cardVal(i,'url'))+'" target="_blank" rel="noopener" style="font-size:8px;color:var(--primary)"><i class="fa-solid fa-arrow-up-right-from-square"></i> open</a>':'')+'</div>';
var _grp=ccGroupInfo(c.limit_group||'');
if(_grp){
h+='<div><label style="color:var(--text3)">Available (shared: '+esc(_grp.name)+')</label><div style="font-family:var(--mono);font-weight:600;color:'+(_grp.available>0?'var(--success)':'var(--error)')+';padding:3px 0">฿'+fmt(_grp.available)+'<div style="font-size:8px;color:var(--text3);font-weight:400">group limit ฿'+fmt(_grp.limit)+' − used ฿'+fmt(_grp.balance)+' ('+_grp.count+' cards) · this card uses ฿'+fmt(c.current_balance||0)+'</div></div></div>';
}else{
h+='<div><label style="color:var(--text3)">Available</label><div style="font-family:var(--mono);font-weight:600;color:'+(ccAvail(c)>0?'var(--success)':'var(--text3)')+';padding:3px 0">'+(c.credit_limit>0?'฿'+fmt(ccAvail(c)):'—')+'<div style="font-size:8px;color:var(--text3);font-weight:400">(saved values)</div></div></div>';
}
h+='<div><label style="color:var(--text3)">Credit term (interest-free)</label><div style="font-family:var(--mono);font-weight:600;color:var(--primary);padding:3px 0">'+ccCreditTermDays(c)+' days</div></div>';
h+='</div>';
// long text fields
h+='<div style="margin-top:8px;font-size:10px"><label style="color:var(--text3)">Benefits / perks (for AI to read)</label>'+_ccArea(i,'benefits',cardVal(i,'benefits'),'List rewards, cashback %, categories, lounge access, travel insurance, etc.')+'</div>';
h+='<div style="margin-top:6px;font-size:10px"><label style="color:var(--text3)">Fee-waiver conditions</label>'+_ccArea(i,'fee_waiver',cardVal(i,'fee_waiver'),'e.g. spend ฿100,000/yr to waive annual fee')+'</div>';
// Fee-waiver: mode (amount / count / either) + target(s) + manual + progress
var _fwm=(cardVal(i,'fee_waiver_mode')||'amount');
// number input builder for fee-waiver fields (comma formatting, saves via ccSetMoney)
function _fwInp(field,label,ph){
var v=cardVal(i,field);
return '<div><label style="color:var(--text3)">'+label+'</label><input type="text" value="'+(v?Number(v).toLocaleString('en-US'):'')+'" placeholder="'+ph+'" style="width:100%;padding:3px 6px;font-size:10px;font-family:var(--mono)" onfocus="this.value=this.value.replace(/,/g,&#39;&#39;)" onblur="var n=parseFloat(this.value.replace(/,/g,&#39;&#39;));this.value=isNaN(n)?&#39;&#39;:n.toLocaleString(&#39;en-US&#39;)" onchange="ccSetMoney('+i+',&#39;'+field+'&#39;,this.value)"></div>';
}
h+='<div style="margin-top:6px;font-size:10px"><label style="color:var(--text3)">Fee-waiver condition</label><select style="width:100%;padding:3px 6px;font-size:10px" onchange="ccSet('+i+',&#39;fee_waiver_mode&#39;,this.value);renderCreditCards()"><option value="amount"'+(_fwm==='amount'?' selected':'')+'>Spend amount (฿/yr)</option><option value="count"'+(_fwm==='count'?' selected':'')+'>Number of swipes (/yr)</option><option value="either"'+(_fwm==='either'?' selected':'')+'>Spend amount OR swipes (either one)</option></select></div>';
if(_fwm==='either'){
h+='<div style="margin-top:4px;font-size:9px;color:var(--text3)">Fee is waived if <b>either</b> condition is met.</div>';
h+='<div style="margin-top:2px;font-size:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px">';
h+=_fwInp('fee_waiver_target','Spend target (฿/yr)','e.g. 100,000');
h+=_fwInp('fee_waiver_manual','+ manual spend','e.g. 20,000');
h+=_fwInp('fee_waiver_target_count','Swipe target (times/yr)','e.g. 5');
h+=_fwInp('fee_waiver_manual_count','+ manual swipes','e.g. 3');
h+='</div>';
}else{
h+='<div style="margin-top:4px;font-size:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px">';
h+=_fwInp('fee_waiver_target','Target ('+(_fwm==='count'?'times/yr':'฿/yr')+', 0=none)',(_fwm==='count'?'e.g. 5':'e.g. 100,000'));
h+=_fwInp('fee_waiver_manual','+ Add un-recorded '+(_fwm==='count'?'swipes':'spend'),(_fwm==='count'?'e.g. 3':'e.g. 20,000'));
h+='</div>';
}
var _fw=ccFeeWaiverProgress(c);
if(_fw){
// bar renderer for one sub-progress
function _fwBar(s,isCount){
var fv=function(v){return isCount?(fmt(v).replace('.00','')):('฿'+fmt(v));};
var b='<div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin:3px 0"><div style="height:100%;width:'+s.pct+'%;background:'+(s.met?'var(--success)':'var(--primary)')+'"></div></div>';
b+='<div style="font-size:9px;color:var(--text2);font-family:var(--mono)">'+(isCount?'Swipes: ':'Spend: ')+fv(s.done)+' / '+fv(s.target)+' ('+s.pct+'%)'+(s.met?' \u2713':' \u00b7 '+fv(s.remaining)+' to go')+'</div>';
b+='<div style="font-size:8px;color:var(--text3)">recorded '+fv(s.auto)+' + manual '+fv(s.manual)+'</div>';
return b;
}
h+='<div style="margin-top:4px;font-size:10px;padding:6px 8px;border-radius:6px;background:'+(_fw.met?'rgba(16,185,129,0.10)':'var(--bg2)')+';border:1px solid '+(_fw.met?'var(--success)':'var(--border)')+'">';
h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'+(_fw.met?'<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> <b style="color:var(--success)">Fee waived \u2014 target met (est.)!</b>':'<i class="fa-solid fa-hourglass-half" style="color:var(--warning)"></i> <b>Fee-waiver progress ('+_fw.year+', est.)</b>')+'</div>';
if(_fw.mode==='either'){
if(_fw.amount)h+=_fwBar(_fw.amount,false);
if(_fw.count)h+=_fwBar(_fw.count,true);
h+='<div style="font-size:8px;color:var(--text3);margin-top:2px">Whichever hits first waives the fee \u00b7 estimate, real usage may be higher</div>';
}else{
h+=_fwBar({target:_fw.target,auto:_fw.auto,manual:_fw.manual,done:_fw.done,pct:_fw.pct,met:_fw.met,remaining:_fw.remaining},_fw.mode==='count');
h+='<div style="font-size:8px;color:var(--text3);margin-top:2px">estimate, real usage may be higher</div>';
}
h+='</div>';
}
h+='<div style="margin-top:6px;font-size:10px"><label style="color:var(--text3)">Personal remarks</label>'+_ccArea(i,'remarks',cardVal(i,'remarks'),'your own notes')+'</div>';
// points log
h+='<div style="margin-top:8px;font-size:10px"><label style="color:var(--text3)">Reward points log</label>';
h+='<table class="tbl" style="font-size:10px;margin-top:3px"><thead><tr><th>Date</th><th class="r">Points</th><th>Note</th><th style="width:24px"></th></tr></thead><tbody>';
(cardVal(i,'points_log')||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');}).forEach(function(pt,pi){
var realIdx=(cardVal(i,'points_log')||[]).indexOf(pt);
h+='<tr><td>'+(pt.date?fmtDate(pt.date):'—')+'</td><td class="r" style="font-family:var(--mono)">'+fmt(pt.points||0)+'</td><td style="font-size:9px">'+esc(pt.note||'')+'</td><td><button class="del-btn" style="font-size:9px" onclick="ccDeletePoint('+i+','+realIdx+')"><i class="fa-solid fa-xmark"></i></button></td></tr>';
});
h+='</tbody></table>';
if(lp)h+='<div style="font-size:9px;color:var(--text3);margin-top:2px">Latest: '+fmt(lp.points||0)+' points on '+(lp.date?fmtDate(lp.date):'—')+'</div>';
h+='<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap"><input type="date" id="ccpt-date-'+i+'" style="font-size:9px;padding:2px 4px"><input type="text" id="ccpt-pts-'+i+'" placeholder="points" style="font-size:9px;padding:2px 4px;width:70px"><input type="text" id="ccpt-note-'+i+'" placeholder="note" style="font-size:9px;padding:2px 4px;width:120px"><button class="btn btn-ghost" style="font-size:9px;padding:2px 8px" onclick="ccAddPoint('+i+')"><i class="fa-solid fa-plus"></i> Log</button></div>';
h+='</div>';
// delete card
// Save / Cancel bar (shown when there are unsaved edits) + delete
h+='<div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">';
h+='<div id="ccsave_'+i+'" style="display:'+(_ccDirty[i]?'flex':'none')+';gap:6px;align-items:center">';
h+='<button class="btn btn-primary" style="font-size:10px;padding:4px 14px" onclick="ccSaveCard('+i+')"><i class="fa-solid fa-floppy-disk"></i> Save</button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:4px 12px" onclick="ccCancelCard('+i+')"><i class="fa-solid fa-rotate-left"></i> Cancel</button>';
h+='<span style="font-size:9px;color:var(--warning)">unsaved</span>';
h+='</div><span style="flex:1"></span>';
h+='<button class="btn btn-ghost" style="font-size:9px;padding:2px 10px;color:var(--error)" onclick="ccDeleteCard('+i+')"><i class="fa-solid fa-trash"></i> Delete card</button></div>';
h+='</div></div>';
});
h+='</div>';

// ---- Perks / benefits comparison (moved to bottom) ----
h+=_ccPerksSection(cards);

el.innerHTML=h;
}

// ---- Perks / benefits comparison ----
// Presents each card's Benefits, Fee-waiver and Remarks as readable cards, plus a compact
// compare table so cards can be scanned side by side. Two view modes: Cards / Compare table.
var _ccPerksView='cards'; // 'cards' | 'table'
function ccPerksView(v){_ccPerksView=v;renderCreditCards();}
function _ccPerksSection(cards){
var withInfo=cards.filter(function(c){return (c.benefits&&c.benefits.trim())||(c.fee_waiver&&c.fee_waiver.trim())||(c.remarks&&c.remarks.trim());});
var h='<div class="card" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
h+='<h2 style="font-size:12px;flex:1"><i class="fa-solid fa-gift"></i> Perks &amp; Benefits</h2>';
h+='<div style="display:flex;gap:4px">';
h+='<button class="btn '+(_ccPerksView==='cards'?'btn-primary':'btn-ghost')+'" style="font-size:9px;padding:3px 10px" onclick="ccPerksView(&#39;cards&#39;)"><i class="fa-solid fa-grip"></i> Cards</button>';
h+='<button class="btn '+(_ccPerksView==='table'?'btn-primary':'btn-ghost')+'" style="font-size:9px;padding:3px 10px" onclick="ccPerksView(&#39;table&#39;)"><i class="fa-solid fa-table-columns"></i> Compare</button>';
h+='</div></div>';
if(!withInfo.length){h+='<p class="text-muted" style="font-size:11px">No perks entered yet. Fill in <b>Benefits / perks</b>, <b>Fee-waiver</b> or <b>Remarks</b> on a card below.</p></div>';return h;}
if(_ccPerksView==='table'){
h+='<div style="overflow-x:auto"><table class="tbl" style="font-size:10px;min-width:520px"><thead><tr><th style="min-width:110px">Card</th><th style="min-width:180px">Benefits / perks</th><th style="min-width:150px">Fee-waiver</th><th style="min-width:140px">Remarks</th></tr></thead><tbody>';
withInfo.forEach(function(c){
h+='<tr>'+
'<td style="font-weight:600;vertical-align:top">'+esc(c.name)+(c.bank?'<div style="font-size:8px;color:var(--text3);font-weight:400">'+esc(c.bank)+'</div>':'')+'</td>'+
'<td style="vertical-align:top;white-space:pre-wrap;font-size:9px">'+(c.benefits?esc(c.benefits):'<span style="color:var(--text3)">—</span>')+'</td>'+
'<td style="vertical-align:top;white-space:pre-wrap;font-size:9px">'+(c.fee_waiver?esc(c.fee_waiver):'<span style="color:var(--text3)">—</span>')+'</td>'+
'<td style="vertical-align:top;white-space:pre-wrap;font-size:9px">'+(c.remarks?esc(c.remarks):'<span style="color:var(--text3)">—</span>')+'</td></tr>';
});
h+='</tbody></table></div>';
}else{
h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">';
withInfo.forEach(function(c){
var es=ccExpiryStatus(c);
h+='<div style="border:1px solid var(--border);border-radius:8px;padding:8px;background:var(--bg2)">';
h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><i class="fa-solid fa-credit-card" style="color:var(--primary)"></i><b style="font-size:11px">'+esc(c.name)+'</b>';
if(c.bank)h+='<span style="font-size:8px;color:var(--text3)">'+esc(c.bank)+'</span>';
h+='<span style="flex:1"></span><span style="font-size:8px;color:var(--primary);font-weight:600">'+ccCreditTermDays(c)+'d</span></div>';
if(c.benefits&&c.benefits.trim()){h+='<div style="margin-bottom:5px"><div style="font-size:8px;font-weight:700;color:var(--success);text-transform:uppercase;letter-spacing:.3px"><i class="fa-solid fa-star"></i> Benefits</div><div style="font-size:10px;white-space:pre-wrap;color:var(--text1)">'+esc(c.benefits)+'</div></div>';}
if(c.fee_waiver&&c.fee_waiver.trim()){h+='<div style="margin-bottom:5px"><div style="font-size:8px;font-weight:700;color:var(--warning);text-transform:uppercase;letter-spacing:.3px"><i class="fa-solid fa-percent"></i> Fee-waiver</div><div style="font-size:10px;white-space:pre-wrap;color:var(--text1)">'+esc(c.fee_waiver)+'</div></div>';}
if(c.remarks&&c.remarks.trim()){h+='<div><div style="font-size:8px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px"><i class="fa-solid fa-note-sticky"></i> Remarks</div><div style="font-size:10px;white-space:pre-wrap;color:var(--text2)">'+esc(c.remarks)+'</div></div>';}
if(c.url){h+='<div style="margin-top:5px"><a href="'+esc(c.url)+'" target="_blank" rel="noopener" style="font-size:9px;color:var(--primary)"><i class="fa-solid fa-arrow-up-right-from-square"></i> Card details page</a></div>';}
h+='</div>';
});
h+='</div>';
}
h+='</div>';
return h;
}

// ---- field builders ----
function _ccMon(ym){if(!ym)return '—';var p=ym.split('-');if(p.length<2)return ym;var M=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return (M[parseInt(p[1])]||p[1])+' '+p[0];}
function _ccField(i,f,label,type,val){
return '<div><label style="color:var(--text3)">'+label+'</label><input type="'+type+'" value="'+esc(val||'')+'" style="width:100%;padding:3px 6px;font-size:10px" onchange="ccSet('+i+',\''+f+'\',this.value)"></div>';
}
function _ccNum(i,f,label,val){
return '<div><label style="color:var(--text3)">'+label+'</label><input type="number" min="1" max="31" value="'+(val||1)+'" style="width:100%;padding:3px 6px;font-size:10px" onchange="ccSetNum('+i+',\''+f+'\',this.value)"></div>';
}
function _ccMoney(i,f,label,val){
var disp=val?Number(val).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
return '<div><label style="color:var(--text3)">'+label+'</label>'+
'<input type="text" value="'+disp+'" placeholder="0.00" style="width:100%;padding:3px 6px;font-size:10px;font-family:var(--mono)" '+
'onfocus="this.value=this.value.replace(/,/g,&#39;&#39;)" '+
'onblur="var n=parseFloat(this.value.replace(/,/g,&#39;&#39;));this.value=isNaN(n)?&#39;&#39;:n.toLocaleString(&#39;en-US&#39;,{minimumFractionDigits:2,maximumFractionDigits:2})" '+
'onchange="ccSetMoney('+i+',&#39;'+f+'&#39;,this.value)"></div>';
}
function _ccArea(i,f,val,ph){
return '<textarea rows="2" placeholder="'+esc(ph)+'" style="width:100%;padding:4px 6px;font-size:10px;resize:vertical" onchange="ccSet('+i+',\''+f+'\',this.value)">'+esc(val||'')+'</textarea>';
}

// ---- DRAFT model: edits go to _ccDraft[i] (a working copy); nothing is saved to D.cards
// until the user clicks Save. Cancel discards the draft (revert). Setters do NOT re-render
// (so the card stays open and typing isn't interrupted); they only flag dirty + show the Save bar.
var _ccDraft={},_ccDirty={};
function _ccEnsureDraft(i){if(!_ccDraft[i]){_ccDraft[i]=JSON.parse(JSON.stringify(D.cards[i]||{}));}return _ccDraft[i];}
function cardVal(i,f){if(_ccDraft[i]&&_ccDraft[i][f]!==undefined)return _ccDraft[i][f];return (D.cards[i]||{})[f];}
function _ccMarkDirty(i){_ccDirty[i]=true;var bar=document.getElementById('ccsave_'+i);if(bar)bar.style.display='flex';var bd=document.getElementById('ccdirty_'+i);if(bd)bd.style.display='inline';}
function ccSet(i,f,v){if(!D.cards[i])return;_ccEnsureDraft(i)[f]=v;_ccMarkDirty(i);}
function ccSetNum(i,f,v){if(!D.cards[i])return;_ccEnsureDraft(i)[f]=parseInt(v)||1;_ccMarkDirty(i);}
function ccSetMoney(i,f,v){if(!D.cards[i])return;_ccEnsureDraft(i)[f]=parseFloat(String(v).replace(/,/g,''))||0;_ccMarkDirty(i);}
function ccSaveCard(i){if(!D.cards[i])return;if(_ccDraft[i]){D.cards[i]=_ccDraft[i];}delete _ccDraft[i];delete _ccDirty[i];saveD();toast('\u2705 Saved '+(D.cards[i].name||'card'));renderCreditCards();if(typeof renderDashCards==='function')try{renderDashCards()}catch(e){}if(typeof renderBanks==='function')try{renderBanks()}catch(e){}}
function ccCancelCard(i){delete _ccDraft[i];delete _ccDirty[i];toast('\u21a9\ufe0f Reverted');renderCreditCards();}
function ccDeleteCard(i){if(!D.cards[i])return;if(!confirm('Delete card "'+D.cards[i].name+'"? This also removes it from bills that use it.'))return;D.cards.splice(i,1);saveD();renderCreditCards();if(typeof renderAllTabs==='function')try{renderAllTabs()}catch(e){}}
function ccAddPoint(i){if(!D.cards[i])return;var c=_ccEnsureDraft(i);if(!Array.isArray(c.points_log))c.points_log=[];
var dt=(document.getElementById('ccpt-date-'+i)||{}).value||'';var pts=parseFloat(String((document.getElementById('ccpt-pts-'+i)||{}).value||'').replace(/,/g,''))||0;var note=(document.getElementById('ccpt-note-'+i)||{}).value||'';
if(!dt&&!pts){toast('Enter a date or points');return;}
c.points_log.push({date:dt,points:pts,note:note});_ccMarkDirty(i);renderCreditCards();toast('Point added (click Save to keep)');}
function ccDeletePoint(i,pi){if(!D.cards[i])return;var c=_ccEnsureDraft(i);if(!c.points_log)return;c.points_log.splice(pi,1);_ccMarkDirty(i);renderCreditCards();}

// ---- rule-based recommender ----
function ccRecommend(){
var q=((document.getElementById('cc-reco-q')||{}).value||'').toLowerCase().trim();
var out=document.getElementById('cc-reco-out'); if(!out)return;
var cards=(D.cards||[]);
if(!cards.length){out.innerHTML='<p class="text-muted" style="font-size:11px">No cards to compare.</p>';return;}
var scored=cards.map(function(c){
var score=0, reasons=[];
var ben=(c.benefits||'').toLowerCase();
if(q){ // keyword hits in benefits
q.split(/[\s,]+/).forEach(function(w){if(w&&ben.indexOf(w)>=0){score+=10;reasons.push('matches \u201c'+w+'\u201d in benefits');}});
}
// interest-free period bonus (normalised): up to +5
var term=ccCreditTermDays(c); score+=Math.min(term/10,5);
if(term>0)reasons.push(term+'d interest-free');
// available credit bonus: small
if(ccAvail(c)>0)score+=1;
// penalise expired
var es=ccExpiryStatus(c); if(es&&es.state==='expired'){score-=100;reasons.push('EXPIRED');}
return {c:c,score:score,reasons:reasons};
}).sort(function(a,b){return b.score-a.score;});
var top=scored[0];
var h='<div style="font-size:11px">';
if(q&&top.reasons.filter(function(r){return r.indexOf('matches')>=0;}).length===0){
h+='<div style="color:var(--text2);margin-bottom:4px">No card lists \u201c'+esc(q)+'\u201d in its benefits. Ranking by interest-free period instead:</div>';
}
h+='<div style="padding:8px 10px;background:var(--primary-bg);border-radius:6px;margin-bottom:6px"><i class="fa-solid fa-star" style="color:var(--primary)"></i> <b>'+esc(top.c.name)+'</b>'+(top.c.last4?' ••••'+esc(top.c.last4):'')+' — '+top.reasons.join(', ')+'</div>';
h+='<table class="tbl" style="font-size:10px"><thead><tr><th>Card</th><th class="r">Score</th><th>Why</th></tr></thead><tbody>';
scored.slice(0,6).forEach(function(s){h+='<tr><td>'+esc(s.c.name)+'</td><td class="r" style="font-family:var(--mono)">'+s.score.toFixed(1)+'</td><td style="font-size:9px;color:var(--text3)">'+esc(s.reasons.join(', ')||'—')+'</td></tr>';});
h+='</tbody></table></div>';
out.innerHTML=h;
}

// ---- export for AI ----
function ccBackupCards(){
var payload={_type:'cashflow_cards_backup',exported:new Date().toISOString(),cards:D.cards||[],banks:D.banks||[]};
var b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cashflow_cards_'+new Date().toISOString().slice(0,10)+'.json';a.click();
toast('\ud83d\udcbe Card backup downloaded');
}
function ccExportForAI(){
var cards=(D.cards||[]);
if(!cards.length){toast('No cards to export');return;}
var lines=['# Credit Cards — for AI analysis','','Ask: "Given these cards, which should I use for <purchase>, and how do I maximise interest-free float and benefits?"',''];
cards.forEach(function(c){
lines.push('## '+c.name+(c.last4?' (••••'+c.last4+')':''));
if(c.bank)lines.push('- Bank: '+c.bank);
lines.push('- Statement day: '+(c.statement_day||'-')+' | Planned pay: '+(c.payment_day||'-')+' | Deadline: '+(c.deadline||'-')+' | Interest-free: '+ccCreditTermDays(c)+' days');
if(c.credit_limit)lines.push('- Limit: '+fmt(c.credit_limit)+' | Balance: '+fmt(c.current_balance||0)+' | Available: '+fmt(ccAvail(c)));
if(c.expiry)lines.push('- Expiry: '+_ccMon(c.expiry));
if(c.benefits)lines.push('- Benefits: '+c.benefits);
if(c.fee_waiver)lines.push('- Fee waiver: '+c.fee_waiver);
if(c.remarks)lines.push('- Remarks: '+c.remarks);
var lp=ccLatestPoints(c); if(lp)lines.push('- Latest points: '+fmt(lp.points||0)+' ('+(lp.date||'')+')');
lines.push('');
});
var txt=lines.join('\n');
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('\ud83d\udccb Copied — paste into chat to ask the AI');},function(){_ccShowExport(txt);});}
else _ccShowExport(txt);
}
function _ccShowExport(txt){
var out=document.getElementById('cc-reco-out');
if(out)out.innerHTML='<div style="font-size:10px;color:var(--text2);margin-bottom:4px">Copy this and paste into chat:</div><textarea readonly rows="10" style="width:100%;font-size:10px;font-family:var(--mono)">'+esc(txt)+'</textarea>';
}

// ---- Dashboard expiry alert (called from renderDash) ----
function renderDashCards(){
var el=document.getElementById('dash-cards'); if(!el)return;
if(!D){el.innerHTML='';return;}
var alerts=(D.cards||[]).map(function(c){return {c:c,st:ccExpiryStatus(c)};}).filter(function(x){return x.st&&(x.st.state==='expired'||x.st.state==='soon');});
if(!alerts.length){el.innerHTML='';return;}
var h='<div class="card" style="border:1px solid var(--warning);background:rgba(245,158,11,0.08)"><h2 style="font-size:12px;color:var(--warning)"><i class="fa-solid fa-credit-card"></i> Card expiry</h2><ul style="margin:4px 0 0 18px;font-size:11px">';
alerts.forEach(function(x){var s=x.st;h+='<li>'+esc(x.c.name)+(x.c.last4?' ••••'+esc(x.c.last4):'')+' — '+(s.state==='expired'?'<b style="color:var(--error)">expired</b>':'expires in <b>'+s.days+'d</b>')+' ('+_ccMon(x.c.expiry)+')</li>';});
h+='</ul></div>';
el.innerHTML=h;
}
