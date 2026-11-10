/* ui-cardfunding.js — Pockets (sub-accounts, e.g. KBank Make) + Card Funding (Nov 10 2026, v2 id-based)
 * ID RULE (user-locked): every link is by permanent id, never by name/description.
 *   D.accounts[i].pockets = [{id:'pk…', name, balance, balance_date, card_id:'c…'}]   (card_id → D.cards[].id)
 *   D.pocket_log = [{id, date, acct_id, pocket_id, balance}]                           (no names stored)
 *   UI state = selected account id (not array index); pocket actions by pocket id.
 *   account.balance = SUM(pockets) on every pocket save → also written to Balance Log (balLogSave)
 * Card Funding per linked pocket:
 *   need = latest statement outstanding + not-yet-billed (Card Bills Known(auto) + Extra spend)
 *   transfer = max(0, need − pocket balance)
 */
(function(){
'use strict';
var B='\u0e3f';
function _n(v){var n=parseFloat(String(v==null?'':v).replace(/,/g,''));return isNaN(n)?0:n}
function _f(v){return (typeof fmt==='function')?fmt(v):_n(v).toFixed(2)}
function _e(s){return (typeof esc==='function')?esc(s):String(s==null?'':s)}
function _dt(d){return d?((typeof fmtDate==='function')?fmtDate(d):d):'\u2013'}
function _today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function _bid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function _accts(){return (D&&Array.isArray(D.accounts))?D.accounts:[]}
function _cards(){return (D&&Array.isArray(D.cards))?D.cards:[]}
function _acct(id){return _accts().find(function(a){return a.id===id})||null}
function _pocket(a,pid){return (a&&a.pockets||[]).find(function(p){return p.id===pid})||null}
function _bn(a){return a.bank?((typeof bankName==='function')?bankName(a.bank):a.bank):''}
function _acctLabel(a){var b=_bn(a);return (b?b+' \u00b7 ':'')+(a.name||'')}
function _acctSorted(){return _accts().filter(function(a){return a.id}).slice().sort(function(x,y){
return _bn(x).localeCompare(_bn(y),undefined,{sensitivity:'base'})||String(x.name||'').localeCompare(String(y.name||''),undefined,{sensitivity:'base'})})}
// card id resolver: accepts id, legacy name, or last4 → D.cards id ('' if unknown)
function _cid(x,l4){if(!x&&!l4)return '';var C=_cards(),c=C.find(function(k){return k.id===x})||C.find(function(k){return x&&k.name===x})||(l4?C.find(function(k){return String(k.last4||'')===String(l4)}):null);return c?c.id:''}
function _card(id){return _cards().find(function(k){return k.id===id})||null}
function _cname(id){try{if(typeof window.cardDisplayName==='function'){var r=window.cardDisplayName(id);if(r)return r}}catch(e){}var c=_card(id);return c?c.name:(id||'')}
function _bills(){var b=window.CARD_BILLS&&window.CARD_BILLS.bills;return Array.isArray(b)?b:[]}
function _txns(){return Array.isArray(D.card_txns)?D.card_txns:[]}

// one-time migration: pocket.card (name) → card_id; pocket_log acct/pocket → acct_id/pocket_id; drop stored names
function _migrate(){var ch=0;
_accts().forEach(function(a){(a.pockets||[]).forEach(function(p){
if(!p.id){p.id=_bid('pk');ch++}
if(p.card!==undefined){if(!p.card_id&&p.card)p.card_id=_cid(p.card);delete p.card;ch++}})});
(D.pocket_log||[]).forEach(function(x){if(x.acct&&!x.acct_id){x.acct_id=x.acct;delete x.acct;ch++}if(x.pocket&&!x.pocket_id){x.pocket_id=x.pocket;delete x.pocket;ch++}if(x.name!==undefined){delete x.name;ch++}});
if(D.card_unbilled){delete D.card_unbilled;ch++}
if(ch)try{saveD()}catch(e){}}

// Nov 10 2026: pockets may hold another currency; account total = sum converted to the account's currency (latest FX)
function _aCur(a){return (a&&a.currency)||'THB'}
function _pkCur(a,p){return (p&&p.currency)||_aCur(a)}
function _sym(c){try{return (typeof curSym==='function')?curSym(c):(c==='THB'?B:c+' ')}catch(e){return B}}
function _fx(c){if(!c||c==='THB')return 1;try{var r=(typeof fxRate==='function')?fxRate(c):null;return r||1}catch(e){return 1}}
function _pkIn(a,p,to){var c=_pkCur(a,p);to=to||_aCur(a);return c===to?_n(p.balance):_n(p.balance)*_fx(c)/_fx(to)}
// Nov 10 2026: pocket Max Target - own value if set, else inherit the account's
function _pkMax(a,p){return _n(p&&p.max_amount)>0?{v:_n(p.max_amount),own:true}:(_n(a&&a.max_amount)>0?{v:_n(a.max_amount),own:false}:null)}
// pocket interest rate: own if set, else account's
function _pkRate(a,p){return (p&&p.rate!==''&&p.rate!=null)?{v:+p.rate,own:true}:((a&&a.rate!==''&&a.rate!=null)?{v:+a.rate,own:false}:null)}
window.cfPkRate=function(aid,pid){var a=_acct(aid);return a?_pkRate(a,_pocket(a,pid)):null};
window.cfPkMax=function(aid,pid){var a=_acct(aid);return a?_pkMax(a,_pocket(a,pid)):null};
function _pkSum(a){return Math.round((a.pockets||[]).reduce(function(t,p){return t+_pkIn(a,p)},0)*100)/100}
function _syncAcct(a){if(!a||!a.pockets||!a.pockets.length)return;
a.balance=_pkSum(a);a.balance_date=_today();
try{if(typeof balLogSave==='function')balLogSave(a)}catch(e){}}
function _pkLog(a,p){var d=p.balance_date||_today();
D.pocket_log=D.pocket_log||[];   // Nov 10 2026 (user): keep EVERY save, ts = save time
D.pocket_log.push({id:_bid('pl'),date:d,ts:new Date().toISOString(),acct_id:a.id,pocket_id:p.id,balance:_n(p.balance)})}
function _plKey(x){return (x.date||'')+'|'+(x.ts||'')}
function _plTime(ts){var d=new Date(ts);return isNaN(d)?'':('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function _plX(x){var t=Date.parse(x.date+'T00:00:00');if(x.ts){var d=new Date(x.ts);if(!isNaN(d))t+=(d.getHours()*60+d.getMinutes())*60000}return t}

// what card <cardId> needs for ONE period P (YYYY-MM): bill exists → amount_due − paid; else Card Bills Known(auto) + Extra of P
function cfNeed(cardId,P){
var c=_card(cardId),cname=c?c.name:'';
var bill=_bills().filter(function(b){return b.period===P&&_cid(b.card_id||b.card,b.last4)===cardId})[0]||null;
var out=0,due='',auto=0,extra=0;
if(bill){due=bill.due_date||'';var paid=bill.paid_full?_n(bill.amount_due):_n(bill.paid_total);out=Math.max(0,_n(bill.amount_due)-paid)}
else{
try{var ek=(typeof window.cardExtraKey==='function')?window.cardExtraKey(cardId,P):(cardId+'::'+P);extra=_n((D.cardbill_extra||{})[ek])}catch(e){}
// Known(auto): find the Card Bills view month whose period for this card is P (cardBillData keyed by card name)
try{if(typeof cardBillData==='function'&&typeof _cbPeriodForView==='function'){var y0=+P.slice(0,4),m0=+P.slice(5,7);
for(var k=-1;k<=2;k++){var dt=new Date(y0,m0-1+k,1),y=dt.getFullYear(),m=dt.getMonth()+1;
var vp=_cbPeriodForView(cname,y,m);if(vp!==P)vp=_cbPeriodForView(cardId,y,m);
if(vp===P){var bd=cardBillData(y,m)||{},r=bd[cname]||bd[cardId];if(r)auto=_n(r.total);break}}}}catch(e){console.warn('cfNeed auto',e)}}
return {period:P,billed:!!bill,due:due,outstanding:out,txn:0,extra:extra,auto:auto,unbilled:auto+extra,total:out+auto+extra}}
function _prevPer(){var d=new Date(),y=d.getFullYear(),m=d.getMonth();if(m===0){m=12;y--}return y+'-'+('0'+m).slice(-2)}
var _cfPer=_prevPer();
window.cfSetPer=function(v){if(/^\d{4}-\d{2}$/.test(v||'')){_cfPer=v;renderCardFunding()}};
// Per-card CURRENT period (Nov 10 2026, user rule): latest statement still unpaid → that bill (show its period);
// latest statement paid (or none) → treat as "not billed yet" → estimate NEXT period from Card Bills (auto + extra).
function _nextPer(p){var y=+p.slice(0,4),m=+p.slice(5,7)+1;if(m>12){m=1;y++}return y+'-'+('0'+m).slice(-2)}
function cfNeedCur(cardId){var cname=_cname(cardId);
var L=_bills().filter(function(b){return b.period&&_cid(b.card_id||b.card,b.last4)===cardId}).sort(function(a,b){return String(a.period).localeCompare(String(b.period))});
var last=L[L.length-1];
if(last){var pd=null;try{if(typeof window.cardPaidFor==='function')pd=window.cardPaidFor(cname,last.period,last)}catch(e){}
var paid=pd?_n(pd.paid_total):(last.paid_full?_n(last.amount_due):_n(last.paid_total));if(pd&&pd.paid_full)paid=_n(last.amount_due);
var out=Math.max(0,_n(last.amount_due)-paid);
if(out>0.005)return {period:last.period,billed:true,due:last.due_date||'',paid:paid,outstanding:out,txn:0,extra:0,auto:0,unbilled:0,total:out}}
var P=last?_nextPer(last.period):_prevPer(),n=cfNeed(cardId,P);
if(n.billed){n.billed=false;n.outstanding=0;n.total=n.auto+n.extra}   // safety: never double count
return n}
var _cfFilt='all';window.cfFilt=function(v){_cfFilt=v;renderCardFunding()};
// Nov 10 2026: bank filter (typeable dropdown, stores bank id) — card's bank from D.cards[].bank
var _cfBank='';
function _cfBankOf(cid){var c=_cards().find(function(x){return x.id===cid});return (c&&c.bank)||''}
function _cfBankName(b){try{return (typeof bankName==='function'&&bankName(b))||b}catch(e){return b}}
window.cfBankPick=function(v){v=String(v||'').trim();var id='';
 if(v&&v!=='All banks'){var L=_cards().map(function(c){return c.bank}).filter(Boolean);
  id=L.find(function(b){return _cfBankName(b).toLowerCase()===v.toLowerCase()||String(b).toLowerCase()===v.toLowerCase()})||'';if(!id)return;}
 if(id===_cfBank)return;_cfBank=id;renderCardFunding()};

var _cfAcctId='';
var _cfSort={c:'',d:1};   // '' = original order; click header: asc → desc → original
window.cfSortBy=function(c){if(_cfSort.c!==c)_cfSort={c:c,d:1};else if(_cfSort.d>0)_cfSort.d=-1;else _cfSort={c:'',d:1};renderCardFunding()};
function renderCardFunding(){
var host=document.getElementById('cc-ccfund');if(!host)return;
_migrate();
var AS=_acctSorted();if(!_acct(_cfAcctId)){var w=AS.find(function(a){return a.pockets&&a.pockets.length});_cfAcctId=(w||AS[0]||{}).id||''}
var cards=_cards().filter(function(c){return c.id}).slice().sort(function(x,y){return _cname(x.id).localeCompare(_cname(y.id))});
var M='font-family:var(--mono);font-size:10px;white-space:nowrap';
// ---- Card Funding summary
var rows=[],tN=0,tH=0,tG=0;
AS.forEach(function(a){(a.pockets||[]).forEach(function(p){if(!p.card_id)return;
if(_cfBank&&_cfBankOf(p.card_id)!==_cfBank)return;var n=cfNeedCur(p.card_id);if(_cfFilt==='billed'&&!n.billed)return;if(_cfFilt==='est'&&n.billed)return;
var have=_pkIn(a,p,'THB'),gap=Math.max(0,n.total-have);tN+=n.total;tH+=have;tG+=gap;
rows.push({card:_cname(p.card_id),pocket:_acctLabel(a)+' \u203a '+p.name,n:n,have:have,gap:gap})})});
var S=_cfSort,K={card:function(r){return r.card},pocket:function(r){return r.pocket},out:function(r){return r.n.outstanding},unb:function(r){return r.n.unbilled},need:function(r){return r.n.total},have:function(r){return r.have},gap:function(r){return r.gap}};
if(S.c&&K[S.c])rows.sort(function(x,y){var a=K[S.c](x),b=K[S.c](y);return (typeof a==='number'?a-b:String(a).localeCompare(String(b)))*S.d});
var tO=0,tU=0,tA=0,tX=0;rows.forEach(function(r){tO+=r.n.outstanding;tU+=r.n.unbilled;tA+=r.n.auto;tX+=r.n.extra+r.n.txn});
function th(c,l,r){return '<th style="cursor:pointer;'+(r?'text-align:right':'')+'" onclick="cfSortBy(\''+c+'\')">'+l+(S.c===c?(S.d>0?' \u25b2':' \u25bc'):'')+'</th>'}
var tb=rows.map(function(r){var n=r.n;return '<tr><td><b>'+_e(r.card)+'</b><div style="font-size:9px;color:var(--text3)">'+(n.billed?'\u2705 billed '+_e(n.period)+(n.due?' \u00b7 due '+_dt(n.due):''):'\u23f3 '+_e(n.period)+' not billed \u2014 estimate')+'</div></td>'+
'<td>'+_e(r.pocket)+'</td>'+
'<td class="r" style="'+M+'">'+B+_f(n.outstanding)+'</td>'+
'<td class="r" style="'+M+'" title="Not yet billed: Card Bills Known (auto) + Extra spend">'+B+_f(n.unbilled)+'<div style="font-size:9px;color:var(--text3)">auto '+B+_f(n.auto)+' + extra '+B+_f(n.extra+n.txn)+'</div></td>'+
'<td class="r" style="'+M+'"><b>'+B+_f(n.total)+'</b></td><td class="r" style="'+M+'">'+B+_f(r.have)+'</td>'+
'<td class="r" style="'+M+';font-weight:700;color:'+(r.gap>0.005?'var(--error)':'var(--success)')+'">'+(r.gap>0.005?'\u2192 '+B+_f(r.gap):'\u2713 enough')+'</td></tr>'}).join('');
if(rows.length)tb+='<tr style="font-weight:700;background:var(--bg3)"><td colspan="2">TOTAL ('+rows.length+')</td><td class="r" style="'+M+'">'+B+_f(tO)+'</td>'+
'<td class="r" style="'+M+'">'+B+_f(tU)+'<div style="font-size:9px;color:var(--text3);font-weight:400">auto '+B+_f(tA)+' + extra '+B+_f(tX)+'</div></td>'+
'<td class="r" style="'+M+'">'+B+_f(tN)+'</td><td class="r" style="'+M+'">'+B+_f(tH)+'</td><td class="r" style="'+M+';color:'+(tG>0.005?'var(--error)':'var(--success)')+'">'+B+_f(tG)+'</td></tr>';
var h='<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px"><h2 style="margin:0"><i class="fa-solid fa-piggy-bank"></i> Card Funding</h2>'+
'<span style="flex:1"></span>'+
(function(){var bs={};_cards().forEach(function(c){if(c.bank)bs[c.bank]=1});var L=Object.keys(bs).sort(function(a,b){return _cfBankName(a).localeCompare(_cfBankName(b))});
 return '<span style="display:inline-flex;align-items:center;gap:4px"><i class="fa-solid fa-building-columns" style="font-size:10px;color:var(--text3)"></i>'+
 '<input id="cf-bank" class="inp" list="cf-bank-dl" placeholder="All banks" value="'+_e(_cfBank?_cfBankName(_cfBank):'')+'" style="font-size:10px;padding:3px 8px;width:120px;border-radius:999px" onchange="cfBankPick(this.value)" onkeydown="if(event.key===\'Enter\')cfBankPick(this.value)">'+
 '<datalist id="cf-bank-dl"><option value="All banks">'+L.map(function(b){return '<option value="'+_e(_cfBankName(b))+'">'}).join('')+'</datalist></span>'})()+
[['all','All'],['billed','Billed'],['est','Not billed']].map(function(o){var on=_cfFilt===o[0];
return '<button class="btn '+(on?'btn-primary':'btn-ghost')+'" style="font-size:10px;padding:3px 10px" onclick="cfFilt(\''+o[0]+'\')">'+o[1]+'</button>'}).join('')+'</div>'+
'<p class="text-muted" style="font-size:10px;margin-bottom:6px">Per card: latest bill still unpaid \u2192 its outstanding (amount due \u2212 paid). Latest bill already paid \u2192 next period not billed yet \u2192 Card Bills Known (auto) + Extra spend.</p>'+
'<div class="kpi-grid" style="margin-bottom:8px"><div class="kpi"><div class="kpi-label">Need</div><div class="kpi-val">'+B+_f(tN)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">In pockets</div><div class="kpi-val">'+B+_f(tH)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">To transfer</div><div class="kpi-val '+(tG>0.005?'text-error':'text-success')+'">'+B+_f(tG)+'</div></div></div>'+
'<table class="tbl"><thead><tr>'+th('card','Card')+th('pocket','Pocket')+th('out','Statement left',1)+th('unb','Unbilled',1)+th('need','Need',1)+th('have','Pocket',1)+th('gap','Transfer',1)+'</tr></thead><tbody>'+
(tb||'<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:12px">'+(((D.accounts||[]).some(function(a){return (a.pockets||[]).some(function(p){return p&&p.card_id;});}))?(_cfFilt==='billed'?'\u2705 No unpaid bill right now \u2014 all billed statements are paid.':_cfFilt==='est'?'No card in the not-billed stage right now.':'Nothing to show.'):'No pocket linked to a card yet \u2014 link one below.')+'</td></tr>')+'</tbody></table></div>';
host.innerHTML=h;}


// ---- Pockets manager (Nov 10 2026: moved to Accounts & Wealth > Accounts)
function renderPocketsMgr(){var host=document.getElementById('acct-pockets');if(!host)return;_migrate();
var AS=_acctSorted();if(!_acct(_cfAcctId)){var w=AS.find(function(a){return a.pockets&&a.pockets.length});_cfAcctId=(w||AS[0]||{}).id||''}
var cards=_cards().filter(function(c){return c.id}).slice().sort(function(x,y){return _cname(x.id).localeCompare(_cname(y.id))});
var M='font-family:var(--mono);font-size:10px;white-space:nowrap';
// ---- Pockets manager
var a=_acct(_cfAcctId),P=(a&&a.pockets)||[];
function ol(x){return _acctLabel(x)+((x.pockets&&x.pockets.length)?' ('+x.pockets.length+' pockets)':'')}
var sel='<input id="cf-acct" list="cf-acct-dl" class="inp" autocomplete="off" placeholder="Type to search account\u2026" style="font-size:11px;width:260px;padding:4px 7px" value="'+_e(a?ol(a):'')+'" onfocus="this.dataset.prev=this.value;this.value=\'\'" onblur="var t=this;setTimeout(function(){if(!t.value)t.value=t.dataset.prev||\'\'},150)">'+
'<datalist id="cf-acct-dl">'+AS.map(function(x){return '<option data-id="'+_e(x.id)+'" value="'+_e(ol(x))+'"></option>'}).join('')+'</datalist>';
function cardSel(pid,v){return '<select class="sel" style="font-size:10px" onchange="cfPocket(\''+pid+'\',\'card_id\',this.value)"><option value="">\u2014 none \u2014</option>'+
cards.map(function(c){return '<option value="'+_e(c.id)+'"'+(c.id===v?' selected':'')+'>'+_e(_cname(c.id))+'</option>'}).join('')+'</select>'}
var h='<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px"><h2 style="margin:0"><i class="fa-solid fa-wallet"></i> Pockets</h2>'+sel+
'<span style="flex:1"></span><button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="cfAddPocket()"'+(a?'':' disabled')+'><i class="fa-solid fa-plus"></i> Add pocket</button></div>'+
'<p class="text-muted" style="font-size:10px;margin-bottom:6px">Sub-accounts inside one bank account (e.g. KBank Make). Account balance = sum of its pockets (other currencies converted at the latest FX rate).</p>'+
'<table class="tbl"><thead><tr><th>Pocket</th><th>Cur</th><th class="r">Balance</th><th class="r">Rate</th><th style="min-width:120px">Max Target</th><th>As of</th><th>Pays card</th><th></th></tr></thead><tbody>'+
(P.map(function(p){var pid=_e(p.id);return '<tr data-pid="'+pid+'" ondragover="cfDragOver(event,this)" ondragleave="this.style.boxShadow=\'\'" ondrop="cfDrop(event,this)">'+
'<td style="white-space:nowrap"><span draggable="true" ondragstart="cfDragStart(event,\''+pid+'\')" title="Drag to reorder" style="cursor:grab;color:var(--text3);padding:0 6px 0 0"><i class="fa-solid fa-grip-vertical"></i></span>'+
_e(p.name)+'</td><td style="font-size:10px">'+_e(_pkCur(a,p))+'</td>'+
'<td class="r" style="'+M+'">'+_sym(_pkCur(a,p))+_f(p.balance)+'</td>'+(function(){var r=_pkRate(a,p);return '<td class="r" style="font-size:10px">'+(r?r.v+'%'+(r.own?'':' <span style="color:var(--text3)">(acct)</span>'):'\u2014')+'</td>'})()+(function(){var mx=_pkMax(a,p);if(!mx)return '<td style="font-size:10px;color:var(--text3)">\u2014</td>';var b=_n(p.balance),pc=Math.min(100,b/mx.v*100),col=pc>=100?'var(--success)':pc>=75?'var(--warning)':'var(--primary)';
return '<td style="font-size:9px"><div style="height:5px;border-radius:3px;background:var(--bg3);overflow:hidden"><div style="width:'+pc.toFixed(0)+'%;height:100%;background:'+col+'"></div></div>'+(b>=mx.v?'\u2713 reached':Math.round(pc)+'% \u00b7 left '+_sym(_pkCur(a,p))+_f(mx.v-b))+' <span style="color:var(--text3)">'+(mx.own?'':'(account)')+'</span></td>'})()+
'<td style="font-size:10px">'+_dt(p.balance_date)+'</td><td style="font-size:10px">'+(p.card_id?_e(_cname(p.card_id)):'<span style="color:var(--text3)">\u2014</span>')+'</td>'+
'<td style="white-space:nowrap"><button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:4px" title="Edit" onclick="cfEditPocket(\''+pid+'\')"><i class="fa-solid fa-pen"></i></button>'+
'<button class="btn btn-ghost" style="font-size:10px;padding:2px 7px;margin-right:4px" title="Balance history" onclick="cfPocketHist(\''+pid+'\')"><i class="fa-solid fa-clock-rotate-left"></i></button>'+
'<button class="del-btn" onclick="cfDelPocket(\''+pid+'\')"><i class="fa-solid fa-trash"></i></button></td></tr>'}).join('')||
'<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:12px">No pockets in this account.</td></tr>')+
(P.length?'<tr style="font-weight:700;background:var(--bg3)"><td>Account total</td><td style="font-size:10px">'+_e(_aCur(a))+'</td><td class="r" style="'+M+'">'+_sym(_aCur(a))+_f(_pkSum(a))+'</td><td colspan="5"></td></tr>':'')+
'</tbody></table></div>';
host.innerHTML=h;
var s=document.getElementById('cf-acct');if(s)s.addEventListener('input',function(){var v=this.value,op=document.querySelectorAll('#cf-acct-dl option');
for(var k=0;k<op.length;k++){if(op[k].value===v){_cfAcctId=op[k].getAttribute('data-id');renderPocketsMgr();return}}})}
window.renderPocketsMgr=renderPocketsMgr;
// open a pocket action for a given account (used by Balances page)
window.cfWithAcct=function(aid,fn,pid){_cfAcctId=aid;if(typeof window[fn]==='function')window[fn](pid)};
function _save(){try{saveD()}catch(e){}try{simulate()}catch(e){}try{renderCardFunding()}catch(e){}try{renderPocketsMgr()}catch(e){}try{if(typeof renderBalances==='function')renderBalances()}catch(e){}}
function _ov(id,w,html){var o=document.getElementById(id);if(o)o.remove();o=document.createElement('div');o.id=id;
o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
o.onclick=function(e){if(e.target===o)o.remove()};
o.innerHTML='<div style="background:var(--bg2);border-radius:var(--radius);padding:16px 18px;width:'+w+'px;max-width:100%;max-height:85vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.3)">'+html+'</div>';
o.addEventListener('keydown',function(e){if(e.key==='Escape')o.remove()});document.body.appendChild(o);return o}
function _curOpts(v){var L=(D.currencies||[]).map(function(c){return c.id});if(L.indexOf('THB')<0)L.unshift('THB');if(v&&L.indexOf(v)<0)L.push(v);
return L.map(function(c){return '<option value="'+_e(c)+'"'+(c===v?' selected':'')+'>'+_e(c)+'</option>'}).join('')}
function _hdr(icon,t,id){return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:13px"><i class="fa-solid '+icon+'"></i> '+t+'</b>'+
'<button class="btn btn-ghost" style="font-size:11px;padding:2px 8px" onclick="document.getElementById(\''+id+'\').remove()">\u2715</button></div>'}

window.cfPocket=function(pid,f,v){var a=_acct(_cfAcctId),p=_pocket(a,pid);if(!p)return;
if(f==='balance'){var nv=_n(v);if(nv!==_n(p.balance)){p.balance=nv;p.balance_date=_today();_pkLog(a,p)}}
else if(f==='card_id')p.card_id=v||'';else if(f==='name')p.name=String(v||'').trim()||p.name;
_syncAcct(a);_save()};
window.cfAddPocket=function(){var a=_acct(_cfAcctId);if(!a)return;
var inp='class="inp" style="width:100%;font-size:11px;padding:5px 7px;box-sizing:border-box"',L='style="display:block;font-size:10px;color:var(--text3);margin:8px 0 2px"';
var cards=_cards().filter(function(c){return c.id}).slice().sort(function(x,y){return _cname(x.id).localeCompare(_cname(y.id))});
var o=_ov('cf-pk-ov',360,_hdr('fa-wallet','Add pocket','cf-pk-ov')+
'<div style="font-size:10px;color:var(--text3)">Account: <b>'+_e(_acctLabel(a))+'</b></div>'+
'<label '+L+'>Pocket name *</label><input id="cf-pk-name" '+inp+' placeholder="e.g. Pay UOB card">'+
'<label '+L+'>Currency</label><select id="cf-pk-cur" class="sel" style="width:100%;font-size:11px">'+_curOpts(_aCur(a))+'</select>'+
'<label '+L+'>Max Target <span style="font-weight:400">(blank = use account\'s'+(_n(a.max_amount)>0?' '+_sym(_aCur(a))+_f(a.max_amount):' \u2014 none')+')</span></label><input id="cf-pk-max" '+inp+' inputmode="decimal" placeholder="use account" value="'+''+'">'+
'<label '+L+'>Interest rate % <span style="font-weight:400">(blank = use account\'s'+(a.rate!==''&&a.rate!=null?' '+a.rate+'%':' \u2014 none')+')</span></label><input id="cf-pk-rate" '+inp+' inputmode="decimal" placeholder="use account" value="'+''+'">'+
'<label '+L+'>Balance</label><input id="cf-pk-bal" '+inp+' inputmode="decimal" placeholder="0.00">'+
'<label '+L+'>Pays card</label><select id="cf-pk-card" class="sel" style="width:100%;font-size:11px"><option value="">\u2014 none \u2014</option>'+
cards.map(function(c){return '<option value="'+_e(c.id)+'">'+_e(_cname(c.id))+'</option>'}).join('')+'</select>'+
'<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:14px"><button class="btn btn-ghost" style="font-size:11px" onclick="document.getElementById(\'cf-pk-ov\').remove()">Cancel</button>'+
'<button class="btn btn-primary" style="font-size:11px" onclick="cfAddPocketSave()"><i class="fa-solid fa-plus"></i> Add</button></div>');
o.addEventListener('keydown',function(e){if(e.key==='Enter')cfAddPocketSave()});
setTimeout(function(){var n=document.getElementById('cf-pk-name');if(n)n.focus()},30)};
window.cfAddPocketSave=function(){var a=_acct(_cfAcctId);if(!a)return;
var n=document.getElementById('cf-pk-name'),nm=n?n.value.trim():'';if(!nm){if(n)n.focus();if(typeof toast==='function')toast('Enter a pocket name');return}
var p={id:_bid('pk'),name:nm,balance:_n((document.getElementById('cf-pk-bal')||{}).value),balance_date:_today(),card_id:(document.getElementById('cf-pk-card')||{}).value||'',currency:(document.getElementById('cf-pk-cur')||{}).value||_aCur(a),max_amount:_n((document.getElementById('cf-pk-max')||{}).value)||0,rate:(function(v){v=String(v||'').trim();return v===''?'':_n(v)})((document.getElementById('cf-pk-rate')||{}).value)};
(a.pockets=a.pockets||[]).push(p);_pkLog(a,p);
var o=document.getElementById('cf-pk-ov');if(o)o.remove();_syncAcct(a);_save()};
window.cfDelPocket=function(pid){var a=_acct(_cfAcctId),p=_pocket(a,pid);if(!p)return;
if(!confirm('Delete pocket "'+p.name+'"? (its history is kept)'))return;
a.pockets=a.pockets.filter(function(x){return x.id!==pid});_syncAcct(a);_save()};
// Edit pocket popup (UI standard: ✏️ → popup → Save; Enter=Save, Esc=Cancel)
window.cfEditPocket=function(pid){var a=_acct(_cfAcctId),p=_pocket(a,pid);if(!p)return;
var inp='class="inp" style="width:100%;font-size:11px;padding:5px 7px;box-sizing:border-box"',L='style="display:block;font-size:10px;color:var(--text3);margin:8px 0 2px"';
var cards=_cards().filter(function(c){return c.id}).slice().sort(function(x,y){return _cname(x.id).localeCompare(_cname(y.id))});
var o=_ov('cf-pe-ov',360,_hdr('fa-pen','Edit pocket','cf-pe-ov')+
'<div style="font-size:10px;color:var(--text3)">Account: <b>'+_e(_acctLabel(a))+'</b></div>'+
'<label '+L+'>Pocket name *</label><input id="cf-pe-name" '+inp+' value="'+_e(p.name)+'">'+
'<label '+L+'>Currency</label><select id="cf-pe-cur" class="sel" style="width:100%;font-size:11px">'+_curOpts(_pkCur(a,p))+'</select>'+
'<label '+L+'>Max Target <span style="font-weight:400">(blank = use account\'s'+(_n(a.max_amount)>0?' '+_sym(_aCur(a))+_f(a.max_amount):' \u2014 none')+')</span></label><input id="cf-pe-max" '+inp+' inputmode="decimal" placeholder="use account" value="'+(p.max_amount>0?p.max_amount:'')+'">'+
'<label '+L+'>Interest rate % <span style="font-weight:400">(blank = use account\'s'+(a.rate!==''&&a.rate!=null?' '+a.rate+'%':' \u2014 none')+')</span></label><input id="cf-pe-rate" '+inp+' inputmode="decimal" placeholder="use account" value="'+(p.rate!==''&&p.rate!=null?p.rate:'')+'">'+
'<label '+L+'>Balance</label><input id="cf-pe-bal" '+inp+' inputmode="decimal" value="'+_n(p.balance)+'">'+
'<label '+L+'>As of</label><input id="cf-pe-date" type="date" '+inp+' value="'+_today()+'">'+
'<div style="font-size:9px;color:var(--text3);margin-top:2px">Defaults to today. Last updated '+_dt(p.balance_date)+'.</div>'+
'<label '+L+'>Pays card</label><select id="cf-pe-card" class="sel" style="width:100%;font-size:11px"><option value="">\u2014 none \u2014</option>'+
cards.map(function(c){return '<option value="'+_e(c.id)+'"'+(c.id===p.card_id?' selected':'')+'>'+_e(_cname(c.id))+'</option>'}).join('')+'</select>'+
'<div style="display:flex;justify-content:space-between;gap:6px;margin-top:14px"><button class="btn btn-ghost" style="font-size:11px" onclick="document.getElementById(\'cf-pe-ov\').remove()">Cancel</button>'+
'<button class="btn btn-primary" style="font-size:11px" onclick="cfEditPocketSave(\''+_e(pid)+'\')">\u2713 Save</button></div>');
o.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName!=='SELECT')cfEditPocketSave(pid)});
setTimeout(function(){var n=document.getElementById('cf-pe-bal');if(n){n.focus();n.select()}},30)};
window.cfEditPocketSave=function(pid){var a=_acct(_cfAcctId),p=_pocket(a,pid);if(!p)return;
var g=function(id){return (document.getElementById(id)||{}).value},nm=String(g('cf-pe-name')||'').trim();
if(!nm){var e=document.getElementById('cf-pe-name');if(e)e.focus();if(typeof toast==='function')toast('Enter a pocket name');return}
var nb=_n(g('cf-pe-bal')),nd=g('cf-pe-date')||'',chg=nb!==_n(p.balance),dchg=nd&&nd!==_today();
p.name=nm;p.card_id=g('cf-pe-card')||'';p.currency=g('cf-pe-cur')||_aCur(a);p.max_amount=_n(g('cf-pe-max'))||0;var _rv=String(g('cf-pe-rate')||'').trim();p.rate=_rv===''?'':_n(_rv);
if(chg||dchg){p.balance=nb;p.balance_date=nd||_today();_pkLog(a,p)}
var o=document.getElementById('cf-pe-ov');if(o)o.remove();_syncAcct(a);_save()};
window.cfPocketHist=function(pid){var a=_acct(_cfAcctId),p=_pocket(a,pid);if(!p)return;
var Lg=(D.pocket_log||[]).filter(function(x){return x.pocket_id===pid}).sort(function(x,y){var a=_plKey(x),b=_plKey(y);return a<b?-1:a>b?1:0});
var M='font-family:var(--mono);font-size:10px;text-align:right';
var rows=Lg.slice().reverse().map(function(x,k,arr){var pr=arr[k+1],d=pr?_n(x.balance)-_n(pr.balance):null;
return '<tr><td>'+_dt(x.date)+(x.ts?' <span style="font-size:9px;color:var(--text3)">'+_plTime(x.ts)+'</span>':'')+'</td><td style="'+M+'">'+B+_f(x.balance)+'</td>'+
'<td style="'+M+';color:'+(d==null?'var(--text3)':(d>=0?'var(--success)':'var(--error)'))+'">'+(d==null?'\u2013':(d>=0?'+':'\u2212')+B+_f(Math.abs(d)))+'</td>'+
'<td><button class="del-btn" onclick="cfPkLogDel(\''+_e(x.id)+'\',\''+_e(pid)+'\')"><i class="fa-solid fa-trash"></i></button></td></tr>'}).join('');
_ov('cf-ph-ov',560,_hdr('fa-clock-rotate-left',_e(p.name),'cf-ph-ov')+
'<div style="font-size:10px;color:var(--text3);margin-bottom:8px">'+_e(_acctLabel(a))+(p.card_id?' \u00b7 pays '+_e(_cname(p.card_id)):'')+' \u00b7 now <b>'+B+_f(p.balance)+'</b></div>'+
(Lg.length>1?'<div id="cf-ph-chart" style="height:180px;margin-bottom:8px"></div>':'')+
'<table class="tbl"><thead><tr><th>Date</th><th class="r">Balance</th><th class="r">Change</th><th></th></tr></thead><tbody>'+
(rows||'<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:12px">No history yet \u2014 edit the balance to start logging.</td></tr>')+'</tbody></table>');
if(Lg.length>1&&typeof Highcharts!=='undefined'){try{Highcharts.chart('cf-ph-chart',{chart:{type:'area',backgroundColor:'transparent'},title:{text:null},credits:{enabled:false},legend:{enabled:false},
xAxis:{type:'datetime'},yAxis:{title:{text:null}},tooltip:{valuePrefix:B,valueDecimals:2,xDateFormat:'%d/%m/%Y'},
series:[{name:p.name,data:Lg.map(function(x){return [_plX(x),_n(x.balance)]}),fillOpacity:.15,marker:{radius:3}}]})}catch(e){}}};
window.cfPkLogDel=function(lid,pid){if(!confirm('Delete this history entry?'))return;D.pocket_log=(D.pocket_log||[]).filter(function(x){return x.id!==lid});try{saveD()}catch(e){}cfPocketHist(pid)};
window.renderCardFunding=renderCardFunding;window.cfNeed=cfNeed;
// Drag-to-reorder pockets (order = array order, by pocket id)
var _dragPid='';
window.cfDragStart=function(e,pid){_dragPid=pid;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',pid)}catch(x){}};
window.cfDragOver=function(e,tr){if(!_dragPid)return;e.preventDefault();var r=tr.getBoundingClientRect(),below=(e.clientY-r.top)>r.height/2;
tr.style.boxShadow=below?'inset 0 -2px 0 var(--primary)':'inset 0 2px 0 var(--primary)';tr.dataset.below=below?'1':''};
window.cfDrop=function(e,tr){e.preventDefault();tr.style.boxShadow='';var to=tr.getAttribute('data-pid'),from=_dragPid;_dragPid='';
var a=_acct(_cfAcctId);if(!a||!a.pockets||!from||from===to)return;
var mv=a.pockets.find(function(p){return p.id===from});if(!mv)return;
var L=a.pockets.filter(function(p){return p.id!==from}),i=L.findIndex(function(p){return p.id===to});if(i<0)return;
if(tr.dataset.below)i++;L.splice(i,0,mv);a.pockets=L;try{saveD()}catch(x){}renderPocketsMgr()};

// ---- inject UI (sidebar sub, top sub-tab, panel) + hook swCC + Accounts popup note
function inj(){try{
var raw=document.querySelector('.nav-sub[data-sub="ccdata"]');
if(raw&&!document.querySelector('.nav-sub[data-sub="ccfund"]')){var b=raw.cloneNode(true);b.dataset.sub='ccfund';b.classList.remove('active');b.querySelector('span').textContent='Card Funding';raw.parentNode.insertBefore(b,raw.nextSibling)}
var tt=document.querySelector('#tab-creditcards .sub-tab[onclick*="ccdata"]');
if(tt&&!document.querySelector('#tab-creditcards .sub-tab[onclick*="ccfund"]')){var s=document.createElement('span');s.className='sub-tab';s.setAttribute('onclick',"swCC(this,'ccfund')");s.textContent='Card Funding';tt.parentNode.insertBefore(s,tt.nextSibling)}
var pd=document.getElementById('cc-ccdata');
if(pd&&!document.getElementById('cc-ccfund')){var d=document.createElement('div');d.id='cc-ccfund';d.className='sub-panel';pd.parentNode.insertBefore(d,pd.nextSibling)}
if(typeof window.swCC==='function'&&!window.swCC._cf){var o=window.swCC;window.swCC=function(el,tab){o.apply(this,arguments);if(tab==='ccfund'){var p=document.getElementById('cc-ccfund');if(p)p.classList.add('active');try{renderCardFunding()}catch(e){console.error('renderCardFunding:',e)}}};window.swCC._cf=1}
if(typeof window.acctEditPopup==='function'&&!window.acctEditPopup._cf){var oe=window.acctEditPopup;window.acctEditPopup=function(id){var r=oe.apply(this,arguments);
try{var a=_acct(id),inp=document.getElementById('acct-f-bal');
if(a&&a.pockets&&a.pockets.length&&inp&&!document.getElementById('acct-f-pk-note')){var sm=a.pockets.reduce(function(t,p){return t+_n(p.balance)},0);
var n=document.createElement('div');n.id='acct-f-pk-note';
n.style.cssText='font-size:10px;margin-top:4px;padding:4px 6px;border:1px solid var(--warning);border-radius:var(--radius-sm);color:var(--warning);background:var(--warning-bg)';
n.innerHTML='\u26a0\ufe0f This account has <b>'+a.pockets.length+' pocket(s)</b> (total '+_sym(_aCur(a))+_f(_pkSum(a))+'). Editing here won\u2019t update pockets, and the next pocket edit will overwrite this balance. Edit in <b>Accounts &amp; Wealth \u203a Accounts \u203a Pockets</b> or <b>Balances</b>.';
inp.parentNode.appendChild(n)}}catch(e){}return r};window.acctEditPopup._cf=1}
var al=document.getElementById('setup-accounts-host');if(al&&!document.getElementById('acct-pockets')){var d2=document.createElement('div');d2.id='acct-pockets';al.parentNode.insertBefore(d2,al.nextSibling)}
if(typeof window.renderBankAccount==='function'&&!window.renderBankAccount._pk){var ob=window.renderBankAccount;window.renderBankAccount=function(){var r=ob.apply(this,arguments);try{renderPocketsMgr()}catch(e){console.error('renderPocketsMgr:',e)}return r};window.renderBankAccount._pk=1}
try{renderPocketsMgr()}catch(e){}
}catch(e){console.error('cardfunding inj',e)}}
inj();   // script is at end of <body>: menu already in DOM → inject now (no flash)
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inj);
})();
