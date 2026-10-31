// ui-setup.js — Setup Profile & Cards
function renderCards(){var _cb=document.getElementById('cards-body');if(!_cb)return;_cb.innerHTML=D.cards.map(function(c,i){
var load=allInstallments().filter(function(x){return x.card===c.name&&(x.status==='Active'||x.status==='Planned')}).reduce(function(s,x){return s+x.per_period},0)+D.monthly.filter(function(x){return x.card===c.name}).reduce(function(s,x){return s+x.amount},0);
return '<tr><td><input class="inp-inline" value="'+esc(c.name)+'" data-ci="'+i+'" data-f="name"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+c.statement_day+'" min="1" max="31" style="width:45px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="statement_day"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+c.payment_day+'" min="1" max="31" style="width:45px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="payment_day"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+c.deadline+'" min="1" max="31" style="width:45px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="deadline"></td>'+
'<td class="r"><input type="month" class="inp" value="'+(c.statement_start||'')+'" style="width:110px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="statement_start" title="Only produce statements from this month onward (blank = always)"></td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px">'+(load>0?'฿'+fmt(load):'\u2014')+'</td>'+
'<td><button class="del-btn" onclick="if(confirm(\'Delete?\')){readAll();D.cards.splice('+i+',1);renderCards()}"><i class="fa-solid fa-trash"></i></button></td></tr>'}).join('')}

function addCard(){readAll();D.cards.push({name:'New Card',statement_day:1,payment_day:2,deadline:15,statement_start:'',bank:'',last4:'',expiry:'',credit_limit:0,current_balance:0,benefits:'',fee_waiver:'',fee_waiver_target:0,fee_waiver_mode:'amount',fee_waiver_manual:0,fee_waiver_target_count:0,fee_waiver_manual_count:0,remarks:'',limit_group:'',url:'',points_log:[]});D.cards.sort(function(a,b){return a.name.localeCompare(b.name)});renderCards()}

// MONTHLY

function swSetup(el,tab){document.querySelectorAll('#tab-setup .sub-panel').forEach(function(p){p.classList.remove('active')});document.querySelectorAll('#tab-setup .sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('setup-'+tab).classList.add('active');if(tab==='bank')try{renderBankAccount()}catch(e){console.error('renderBankAccount:',e)}if(tab==='fx')try{renderCurrencyFx()}catch(e){console.error(e)}if(tab==='holiday')try{renderHolidays()}catch(e){console.error('renderHolidays:',e)}}



// ===== Bank & Account master (Setup > Bank & Account) =====
// Accounts: 1 bank -> many accounts. D.accounts=[{id,bank,name,note}].
// Banks come from Setup Banks list (D.banks). Used by Monthly Planning account dropdown.
var _acctSort={col:null,dir:1};        // sortable headers
var _acctTouched={};                   // id -> true (soft highlight for newly added/edited)

function _acctId(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
// Account types — fixed curated list (key=stable code acts as id; label is display).
function _acctTypeLabel(code){return (typeof acctTypeName==='function')?acctTypeName(code):code;}
function _acctTypeOpts(sel){return (typeof acctTypeOpts==='function')?acctTypeOpts(sel):'';}
function _acctBankOpts(sel){var o='<option value="">\u2014 bank \u2014</option>';(Array.isArray(D.banks)?D.banks.slice():[]).sort(function(a,b){return (a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base'});}).forEach(function(b){o+='<option value="'+b.id+'"'+(b.id===sel?' selected':'')+'>'+esc(b.name)+'</option>';});return o;}

function _acctSorted(){
  var list=(D.accounts||[]).slice();
  var c=_acctSort.col;
  if(c){list.sort(function(a,b){var x=a[c],y=b[c];if(c==='type'){x=_acctTypeLabel(x);y=_acctTypeLabel(y);}if(c==='bank'){x=(typeof bankName==='function'?bankName(x):x);y=(typeof bankName==='function'?bankName(y):y);}if(c==='target'){var tx=+a.max_amount?(+a.balance||0)/(+a.max_amount):-1,ty=+b.max_amount?(+b.balance||0)/(+b.max_amount):-1;return (tx-ty)*_acctSort.dir;}if(c==='sim'){var sx=a.type==='loan'?0:(a.in_sim!==false?2:1),sy=b.type==='loan'?0:(b.in_sim!==false?2:1);return (sy-sx)*_acctSort.dir||(a.name||'').localeCompare(b.name||'');}if(c==='balance'){if(typeof acctTHB==='function'){var ax=a.balance===''||a.balance==null?null:acctTHB(a,a.balance,a.balance_date),bx=b.balance===''||b.balance==null?null:acctTHB(b,b.balance,b.balance_date);x=ax==null?'':ax;y=bx==null?'':bx;}var nx=(x===''||x==null)?-1e15:+x,ny=(y===''||y==null)?-1e15:+y;return (nx-ny)*_acctSort.dir;}x=(x||'').toString().toLowerCase();y=(y||'').toString().toLowerCase();return x<y?-1*_acctSort.dir:x>y?1*_acctSort.dir:0;});}
  return list;
}
function setAcctSort(col){
  if(_acctSort.col===col){_acctSort.dir*=-1;if(_acctSort.dir===1){_acctSort.col=null;}}
  else{_acctSort.col=col;_acctSort.dir=1;}
  renderBankAccount();
}
function _acctAr(col){return _acctSort.col===col?(_acctSort.dir>0?' \u25b2':' \u25bc'):'';}


// Actual balance (user Oct 31 2026): each account can carry its real current balance. When ANY account
// has a balance entered, the SUM of those balances overrides Setup > Starting Cash for the simulation/timeline.
function cmActualCash(){var a=(D.accounts||[]).filter(function(x){return x.balance!==undefined&&x.balance!==null&&x.balance!=='';});
 if(!a.length)return null;return Math.round(a.reduce(function(s,x){return s+(parseFloat(x.balance)||0);},0)*100)/100;}
function cmStartCash(){var v=cmActualCash();return v===null?((D.profile&&D.profile.starting_cash)||0):v;}
window.cmActualCash=cmActualCash;window.cmStartCash=cmStartCash;

// Tiered interest (Oct 31 2026): a.rate_tiers = "2000=4.5; 20000=2.5; *=0.5" (portion up to X at r%). Blank = flat a.rate.
function acctParseTiers(s){if(!s)return null;var t=[];String(s).split(/[;\n]+/).forEach(function(p){var m=p.split('=');if(m.length!==2)return;var c=m[0].trim(),r=parseFloat(m[1]);if(isNaN(r))return;t.push({upto:(c==='*'||c==='')?Infinity:parseFloat(c.replace(/,/g,'')),rate:r});});
 t=t.filter(function(x){return !isNaN(x.upto);}).sort(function(a,b){return a.upto-b.upto;});return t.length?t:null;}
function acctInterest(a,bal){bal=+bal||0;var _S=acctParseSched(a.rate_sched);if(_S){var _ti=acctTermInfo(a);var _r=_ti&&_ti.cur?_ti.cur.rate:_S[0].rate;return bal*_r/100;}var T=acctParseTiers(a.rate_tiers);if(!T){return (a.rate!==''&&a.rate!=null)?bal*(+a.rate)/100:null;}
 var left=bal,prev=0,sum=0;T.forEach(function(x){if(left<=0)return;var cap=x.upto-prev,part=Math.min(left,cap);sum+=part*x.rate/100;left-=part;prev=x.upto;});return sum;}
function acctEffRate(a){var b=+a.balance||0,i=acctInterest(a,b);return (i==null||!b)?null:i/b*100;}
window.acctParseTiers=acctParseTiers;window.acctInterest=acctInterest;window.acctEffRate=acctEffRate;

// Term-based (Oct 31 2026): a.open_date + a.rate_sched "1-18=1.25; 19-24=1.35" (month ranges) + a.pay_maturity (interest paid once at end)
function acctParseSched(s){if(!s)return null;var t=[],after=null,prev=0;String(s).split(/[;\n]+/).map(function(p){return p.trim();}).filter(Boolean).forEach(function(p){
  var m=p.match(/^(\d+)\s*-\s*(\d+)\s*=\s*([\d.]+)$/);if(m){t.push({from:+m[1],to:+m[2],rate:+m[3]});return;}   // legacy 1-18=1.25
  m=p.match(/^(\d+|\*)\s*=\s*([\d.]+)$/);if(!m)return;if(m[1]==='*'){after=+m[2];return;}t.push({upto:+m[1],rate:+m[2]});});
 t.sort(function(a,b){return (a.to||a.upto)-(b.to||b.upto);});t=t.map(function(x){if(x.upto!=null){var r={from:prev+1,to:x.upto,rate:x.rate};prev=x.upto;return r;}prev=x.to;return x;});
 if(!t.length)return null;t.after=after;return t;}
function acctTermInfo(a){var S=acctParseSched(a.rate_sched);if(!S||!a.open_date)return null;var o=new Date(a.open_date+'T00:00:00'),n=new Date();
 var mon=(n.getFullYear()-o.getFullYear())*12+(n.getMonth()-o.getMonth())+(n.getDate()>=o.getDate()?1:0);if(mon<1)mon=1;var term=S[S.length-1].to;
 var cur=S.find(function(x){return mon>=x.from&&mon<=x.to;})||null;var mat=new Date(o);mat.setMonth(mat.getMonth()+term);
 var b=+a.balance||0,tot=0;S.forEach(function(x){tot+=b*x.rate/100*(x.to-x.from+1)/12;});
 var acc=0;S.forEach(function(x){var m=Math.max(0,Math.min(mon-1,x.to)-x.from+1);acc+=b*x.rate/100*m/12;});
 return {sched:S,month:Math.min(mon,term),term:term,cur:cur,matured:mon>term,maturity:mat.getFullYear()+'-'+String(mat.getMonth()+1).padStart(2,'0')+'-'+String(mat.getDate()).padStart(2,'0'),total:tot,accrued:acc,avg:term?tot/b/(term/12)*100:0};}
window.acctParseSched=acctParseSched;window.acctTermInfo=acctTermInfo;
function renderBankAccount(){
  if(typeof renderBanks==='function')try{renderBanks()}catch(e){}   // refresh the Banks chip list
  var host=document.getElementById('setup-accounts-host');
  if(!host)return;
  if(!Array.isArray(D.accounts))D.accounts=[];
  var _F=window._acctF||(window._acctF={bank:'',type:'',cur:'',sim:''});
  var _list=_acctSorted().filter(function(a){if(_F.bank&&a.bank!==_F.bank)return false;if(_F.type&&a.type!==_F.type)return false;if(_F.cur&&(a.currency||'THB')!==_F.cur)return false;
    if(_F.sim==='on'&&!(a.type!=='loan'&&a.in_sim!==false))return false;if(_F.sim==='off'&&(a.type!=='loan'&&a.in_sim!==false))return false;return true;});
  var rows=_list.map(function(a){
    var hl=_acctTouched[a.id]?';box-shadow:inset 3px 0 0 var(--primary);background:var(--primary-bg,rgba(59,130,246,0.06))':'';
    return '<tr data-aid="'+a.id+'" style="'+hl.replace(/^;/,'')+'">'+
      '<td style="text-align:center">'+(a.type==='loan'?'<span title="Loan = debt, not used" style="color:var(--text3)">\u2014</span>':'<input type="checkbox" title="Use in Timeline simulation"'+(a.in_sim!==false?' checked':'')+' onclick="acctToggleSim(\''+a.id+'\')">')+'</td>'+
      '<td style="white-space:nowrap">'+esc((a.bank&&typeof bankName==='function')?bankName(a.bank):(a.bank||'\u2014'))+'</td>'+
      '<td style="font-weight:600">'+esc(a.name||'')+((a.rate!==undefined&&a.rate!==null&&a.rate!=='')?'<div style="font-size:9px;font-weight:400;color:var(--success)" title="'+esc(a.rate_tiers||'')+'">'+(a.rate_sched?(function(){var ti=acctTermInfo(a);return ti?('M'+ti.month+'/'+ti.term+' \u00b7 '+(a.pay_maturity?'at maturity '+fmtDate(ti.maturity)+' \u2248 '+fmt(ti.total):(ti.cur?ti.cur.rate.toFixed(2)+'%':''))):'';})()+'':'')+(a.rate_sched?'':(a.rate_tiers?('Tiered \u00b7 eff '+((acctEffRate(a)!=null)?acctEffRate(a).toFixed(2):'\u2014')+'%'):((+a.rate).toFixed(2)+'%'))+' p.a.'+((acctInterest(a,a.balance)||0)>0?' \u2248 '+fmt(acctInterest(a,a.balance))+'/yr':''))+(a.rate_date?' \u00b7 since '+fmtDate(a.rate_date):'')+'</div>':'')+'</td>'+
      '<td style="white-space:nowrap">'+(a.type?'<span class="type-chip" style="font-size:10px">'+esc(_acctTypeLabel(a.type))+'</span>':'')+'</td>'+
      '<td style="text-align:right;font-family:var(--mono);white-space:nowrap'+(a.type==='loan'?';color:var(--danger)':'')+'">'+((a.balance!==undefined&&a.balance!==null&&a.balance!=='')?(a.type==='loan'?'<span style="font-size:9px">debt </span>':'')+(typeof curSym==='function'?curSym(a.currency||'THB'):'\u0e3f')+fmt(+a.balance)+(((a.currency||'THB')!=='THB'&&typeof acctTHB==='function')?(function(){var v=acctTHB(a,a.balance,a.balance_date);return '<div style="font-size:9px;color:var(--text3)">'+(v==null?'no FX rate':'\u2248 \u0e3f'+fmt(v))+'</div>';})():'')+(a.balance_date?'<div style="font-size:9px;color:var(--text3)">'+fmtDate(a.balance_date)+'</div>':''):'<span style="color:var(--text3)">\u2014</span>')+'</td>'+'<td style="white-space:nowrap;min-width:120px">'+(function(){var mx=+a.max_amount||0;if(!mx)return '<span style="color:var(--text3)">\u2014</span>';var sym=(typeof curSym==='function'?curSym(a.currency||'THB'):'\u0e3f');var b=+a.balance||0,pct=Math.max(0,Math.min(100,b/mx*100)),left=mx-b,col=pct>=100?'var(--success)':pct>=75?'#f59e0b':'var(--primary)';
 return '<div style="font-family:var(--mono);font-size:11px;text-align:right">'+sym+fmt(mx)+'</div><div style="height:5px;background:var(--bg3);border-radius:3px;margin:2px 0;overflow:hidden"><div style="height:100%;width:'+pct.toFixed(1)+'%;background:'+col+'"></div></div><div style="font-size:9px;color:var(--text3);text-align:right">'+(left>0?pct.toFixed(0)+'% \u00b7 left '+sym+fmt(left):'<span style="color:var(--success)">\u2713 reached'+(left<0?' (+'+sym+fmt(-left)+')':'')+'</span>')+'</div>';})()+'</td>'+'<td style="font-size:11px;color:var(--text3)">'+esc(a.note||'')+'</td>'+
      '<td style="text-align:center;white-space:nowrap">'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e41\u0e01\u0e49\u0e44\u0e02" onclick="acctEditPopup(\''+a.id+'\')"><i class="fa-solid fa-pen"></i></button> '+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e25\u0e1a" onclick="acctDel(\''+a.id+'\')"><i class="fa-solid fa-xmark"></i></button>'+
      '</td></tr>';
  }).join('');
  if(!(D.accounts||[]).length)rows='<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:14px">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u2014 \u0e01\u0e14 "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e31\u0e0d\u0e0a\u0e35"</td></tr>';
  host.innerHTML=
    '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
      '<h2 style="margin:0"><i class="fa-solid fa-wallet"></i> Accounts</h2>'+
      '<button class="btn btn-primary" style="font-size:11px" onclick="acctAddPopup()"><i class="fa-solid fa-plus"></i> Add Account</button>'+
    '</div>'+
    '<p class="text-muted" style="font-size:10px;margin-bottom:8px">1 \u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\u0e21\u0e35\u0e44\u0e14\u0e49\u0e2b\u0e25\u0e32\u0e22\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u2014 \u0e43\u0e0a\u0e49\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e43\u0e19 Monthly Planning (\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\u0e14\u0e36\u0e07\u0e08\u0e32\u0e01 Banks \u0e14\u0e49\u0e32\u0e19\u0e1a\u0e19)</p>'+
    '<div class="filterbar" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">'+
      '<select class="inp sel" style="width:auto;font-size:11px" onchange="_acctF.bank=this.value;renderBankAccount()"><option value="">All banks</option>'+(D.banks||[]).slice().sort(function(x,y){return (x.name||'').localeCompare(y.name||'');}).map(function(x){return '<option value="'+x.id+'"'+(x.id===_F.bank?' selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select>'+
      '<select class="inp sel" style="width:auto;font-size:11px" onchange="_acctF.type=this.value;renderBankAccount()"><option value="">All types</option>'+(D.account_types||[]).slice().sort(function(x,y){return (x.name||'').localeCompare(y.name||'');}).map(function(x){return '<option value="'+x.id+'"'+(x.id===_F.type?' selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select>'+
      '<select class="inp sel" style="width:auto;font-size:11px" onchange="_acctF.cur=this.value;renderBankAccount()"><option value="">All currencies</option>'+(D.currencies||[{id:'THB'}]).map(function(x){return '<option value="'+x.id+'"'+(x.id===_F.cur?' selected':'')+'>'+esc(x.id)+'</option>';}).join('')+'</select>'+
      '<select class="inp sel" style="width:auto;font-size:11px" onchange="_acctF.sim=this.value;renderBankAccount()"><option value="">Sim: all</option><option value="on"'+(_F.sim==='on'?' selected':'')+'>Sim: ticked</option><option value="off"'+(_F.sim==='off'?' selected':'')+'>Sim: not ticked</option></select>'+
      ((_F.bank||_F.type||_F.cur||_F.sim)?'<button class="btn btn-ghost" style="font-size:11px" onclick="window._acctF={bank:\'\',type:\'\',cur:\'\',sim:\'\'};renderBankAccount()"><i class="fa-solid fa-xmark"></i> Clear</button>':'')+
      '<span style="font-size:10px;color:var(--text3)">'+_list.length+' / '+(D.accounts||[]).length+' accounts</span>'+
    '</div>'+
    '<table class="tbl" style="font-size:11px;width:100%">'+
      '<thead><tr>'+
        '<th style="width:48px;text-align:center;cursor:pointer;white-space:nowrap" title="Use in Timeline" onclick="setAcctSort(\'sim\')">Sim'+_acctAr('sim')+'</th>'+
        '<th style="cursor:pointer;white-space:nowrap;width:160px" onclick="setAcctSort(\'bank\')">Bank'+_acctAr('bank')+'</th>'+
        '<th style="cursor:pointer" onclick="setAcctSort(\'name\')">Account'+_acctAr('name')+'</th>'+
        '<th style="cursor:pointer;white-space:nowrap;width:150px" onclick="setAcctSort(\'type\')">\u0e0a\u0e19\u0e34\u0e14'+_acctAr('type')+'</th>'+
        '<th style="cursor:pointer;text-align:right;white-space:nowrap" onclick="setAcctSort(\'balance\')">Actual Balance'+_acctAr('balance')+'</th>'+'<th style="cursor:pointer;text-align:right;white-space:nowrap" onclick="setAcctSort(\'target\')">Max Target'+_acctAr('target')+'</th>'+'<th style="cursor:pointer" onclick="setAcctSort(\'note\')">Note'+_acctAr('note')+'</th>'+
        '<th style="width:84px"></th>'+
      '</tr></thead><tbody>'+rows+'</tbody>'+
    '<tfoot><tr style="font-weight:700;background:var(--bg3)"><td colspan="4">Total cash in Timeline</td><td style="text-align:right;font-family:var(--mono)">'+(cmActualCash()===null?'\u2014':'\u0e3f'+fmt(cmActualCash()))+'</td><td colspan="3" style="font-size:10px;color:var(--text3);font-weight:400">'+(cmActualCash()===null?'Using Starting Cash from Profile (\u0e3f'+fmt((D.profile&&D.profile.starting_cash)||0)+')':'\u2192 ticked, non-loan accounts (THB) \u2014 overrides Starting Cash')+'</td></tr></tfoot>'+
    '</table></div>';
}

// ---- popup (add / edit) modeled on the app's modal overlay pattern ----
function _acctClosePopup(){var ov=document.getElementById('acct-popup-ov');if(ov)ov.remove();}
function _acctPopup(existing){
  _acctClosePopup();
  var a=existing||{id:'',bank:'',name:'',note:''};
  var ov=document.createElement('div');ov.id='acct-popup-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div class="card" style="max-width:380px;width:100%;margin:0" onclick="event.stopPropagation()">'+
    '<h2 style="margin-top:0"><i class="fa-solid fa-wallet"></i> '+(existing?'\u0e41\u0e01\u0e49\u0e44\u0e02\u0e1a\u0e31\u0e0d\u0e0a\u0e35':'\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e31\u0e0d\u0e0a\u0e35')+'</h2>'+
    '<div class="form-group"><label>Bank</label><select class="inp" id="acct-f-bank">'+_acctBankOpts(a.bank)+'</select></div>'+
    '<div class="form-group"><label>\u0e0a\u0e19\u0e34\u0e14\u0e1a\u0e31\u0e0d\u0e0a\u0e35</label><select class="inp" id="acct-f-type">'+_acctTypeOpts(a.type)+'</select></div>'+
    '<div class="form-group"><label>\u0e0a\u0e37\u0e48\u0e2d\u0e1a\u0e31\u0e0d\u0e0a\u0e35</label><input class="inp" id="acct-f-name" value="'+esc(a.name||'')+'" placeholder="\u0e40\u0e0a\u0e48\u0e19 \u0e2d\u0e2d\u0e21\u0e17\u0e23\u0e31\u0e1e\u0e22\u0e4c\u0e2b\u0e25\u0e31\u0e01"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="form-group"><label>Actual Balance (\u0e3f)</label><input class="inp inp-num" id="acct-f-bal" inputmode="decimal" value="'+((a.balance!==undefined&&a.balance!==null&&a.balance!=='')?a.balance:'')+'" placeholder="blank = not tracked"></div>'+
    '<div class="form-group"><label>Currency</label><select class="inp" id="acct-f-cur">'+(typeof curOpts==='function'?curOpts(a.currency):'<option>THB</option>')+'</select></div>'+
    '<div class="form-group" style="display:flex;align-items:flex-end"><label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="acct-f-sim"'+(a.in_sim!==false?' checked':'')+'> Use in Timeline</label></div>'+
    '<div class="form-group"><label>As of</label><input type="date" class="inp" id="acct-f-baldt" value="'+esc(a.balance_date||'')+'"></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="form-group"><label>Interest Rate (% p.a.)</label><input class="inp inp-num" id="acct-f-rate" inputmode="decimal" value="'+((a.rate!==undefined&&a.rate!==null&&a.rate!=='')?a.rate:'')+'" placeholder="e.g. 1.50"></div>'+
    '<div class="form-group"><label>Effective Date</label><input type="date" class="inp" id="acct-f-rdt" value="'+esc(a.rate_date||'')+'"></div></div>'+
    '<div class="form-group"><label>Tiered rates (optional) \u2014 format: up to=rate%; \u2026; *=rate%</label><input class="inp" id="acct-f-tiers" value="'+esc(a.rate_tiers||'')+'" placeholder="e.g. 2000=4.5; 20000=2.5; *=0.5"><div style="font-size:9px;color:var(--text3)">Each tier applies only to the portion of the balance in that range. Leave blank for a flat rate.</div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start"><div class="form-group"><label>Rate by month</label><input class="inp" id="acct-f-sched" value="'+esc(a.rate_sched||'')+'" placeholder="18=1.25; 24=1.35; *=0"><div style="font-size:9px;color:var(--text3)">month=rate%; *=after term</div></div>'+
    '<div class="form-group"><label>Open / start date</label><input type="date" class="inp" id="acct-f-open" value="'+esc(a.open_date||'')+'"></div></div>'+
    '<label style="display:flex;gap:6px;align-items:center;font-size:11px;margin:0 0 10px;cursor:pointer;text-transform:none;letter-spacing:0"><input type="checkbox" id="acct-f-mat"'+(a.pay_maturity?' checked':'')+'> Interest paid once at maturity (e.g. 24=1.8)</label>'+
    (function(){var L=(D.rate_log||[]).filter(function(x){return x.acct===a.id;}).sort(function(x,y){return x.date<y.date?1:-1;});if(!L.length)return '';
      return '<div style="font-size:10px;margin:0 0 10px;max-height:110px;overflow:auto;border:1px solid var(--border);border-radius:6px;padding:4px 6px"><b>Rate history</b>'+L.map(function(x){return '<div style="display:grid;grid-template-columns:80px 1fr 110px 16px;gap:8px;align-items:center"><span>'+fmtDate(x.date)+'</span><span style="font-family:var(--mono)">'+(+x.rate).toFixed(2)+'%</span><span style="color:var(--text3)">entered '+fmtDate(x.entered||'')+'</span><a href="#" style="color:var(--danger)" onclick="acctRateLogDel(\''+x.id+'\');return false">\u2715</a></div>';}).join('')+'</div>';})()+
    '<div class="form-group"><label>Max Target (account currency)</label><input class="inp inp-num" id="acct-f-max" inputmode="decimal" value="'+(a.max_amount||'')+'" placeholder="blank = no target"></div>'+
    '<div class="form-group"><label>\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38</label><input class="inp" id="acct-f-note" value="'+esc(a.note||'')+'" placeholder="(\u0e44\u0e21\u0e48\u0e1a\u0e31\u0e07\u0e04\u0e31\u0e1a)"></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">'+
      '<button class="btn btn-ghost" onclick="_acctClosePopup()">Cancel</button>'+
      '<button class="btn btn-primary" onclick="acctSavePopup(\''+(a.id||'')+'\')"><i class="fa-solid fa-check"></i> Save</button>'+
    '</div></div>';
  ov.onclick=_acctClosePopup;
  document.body.appendChild(ov);
  setTimeout(function(){var n=document.getElementById('acct-f-name');if(n)n.focus();},30);
  ov.addEventListener('keydown',function(e){if(e.key==='Enter'){acctSavePopup(a.id||'');}else if(e.key==='Escape'){_acctClosePopup();}});
}
function acctAddPopup(){_acctPopup(null);}
function acctEditPopup(id){var a=(D.accounts||[]).find(function(x){return x.id===id;});if(a)_acctPopup(a);}
function acctSavePopup(id){
  var bank=(document.getElementById('acct-f-bank')||{}).value||'';
  var name=((document.getElementById('acct-f-name')||{}).value||'').trim();
  var note=((document.getElementById('acct-f-note')||{}).value||'').trim();
  var type=(document.getElementById('acct-f-type')||{}).value||'';
  if(!name){toast('\u26a0\ufe0f \u0e43\u0e2a\u0e48\u0e0a\u0e37\u0e48\u0e2d\u0e1a\u0e31\u0e0d\u0e0a\u0e35');return;}
  if(!Array.isArray(D.accounts))D.accounts=[];
  var _bs=((document.getElementById('acct-f-bal')||{}).value||'').replace(/,/g,'').trim(),bal=_bs===''?'':(parseFloat(_bs)||0);
  var _sched=((document.getElementById('acct-f-sched')||{}).value||'').trim(),_open=(document.getElementById('acct-f-open')||{}).value||'',_pm=!!(document.getElementById('acct-f-mat')||{}).checked;
  if(_sched&&!acctParseSched(_sched)){toast('\u26a0\ufe0f Format: 18=1.25; 24=1.35; *=0');return;}if(_sched&&!_open){toast('\u26a0\ufe0f Open date required for rate by month');return;}
  var _tiers=((document.getElementById('acct-f-tiers')||{}).value||'').trim();if(_tiers&&!acctParseTiers(_tiers)){toast('\u26a0\ufe0f Tier format: 2000=4.5; 20000=2.5; *=0.5');return;}
  var _rs=((document.getElementById('acct-f-rate')||{}).value||'').replace(/,/g,'').trim(),_rate=_rs===''?'':(parseFloat(_rs)||0);if(_tiers&&_rate===''){_rate=acctParseTiers(_tiers)[0].rate;}if(_sched&&_rate===''){_rate=acctParseSched(_sched)[0].rate;}var _rdt=(document.getElementById('acct-f-rdt')||{}).value||'';
  if(_rate!==''&&!_rdt){var _t2=new Date();_rdt=_t2.getFullYear()+'-'+String(_t2.getMonth()+1).padStart(2,'0')+'-'+String(_t2.getDate()).padStart(2,'0');}
  var _max=parseFloat(((document.getElementById('acct-f-max')||{}).value||'').replace(/,/g,''))||0;
  var _cur=(document.getElementById('acct-f-cur')||{}).value||'THB',_sim=!!(document.getElementById('acct-f-sim')||{}).checked;
  var bdt=(document.getElementById('acct-f-baldt')||{}).value||'';if(bal!==''&&!bdt){var _t=new Date();bdt=_t.getFullYear()+'-'+String(_t.getMonth()+1).padStart(2,'0')+'-'+String(_t.getDate()).padStart(2,'0');}
  if(id){var a=D.accounts.find(function(x){return x.id===id;});if(a){a.bank=bank;a.name=name;a.note=note;a.type=type;a.balance=bal;a.balance_date=bal===''?'':bdt;a.currency=_cur;a.in_sim=_sim;a.max_amount=_max;a.rate=_rate;a.rate_date=_rate===''?'':_rdt;a.rate_tiers=_tiers;a.rate_sched=_sched;a.open_date=_open;a.pay_maturity=_pm;}}
  else{id=_acctId();D.accounts.push({id:id,bank:bank,name:name,note:note,type:type,balance:bal,balance_date:bal===''?'':bdt,currency:_cur,in_sim:_sim,max_amount:_max,rate_tiers:_tiers,rate_sched:_sched,open_date:_open,pay_maturity:_pm,rate:_rate,rate_date:_rate===''?'':_rdt});}
  try{if(_rate!==''){if(!Array.isArray(D.rate_log))D.rate_log=[];var _now=new Date(),_ent=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0')+'-'+String(_now.getDate()).padStart(2,'0');
    var _ex=D.rate_log.find(function(x){return x.acct===id&&x.date===_rdt;});
    if(_ex){if(+_ex.rate!==+_rate||(_ex.tiers||'')!==_tiers){_ex.rate=_rate;_ex.tiers=_tiers;_ex.entered=_ent;}}else D.rate_log.push({id:'rl'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),acct:id,date:_rdt,rate:_rate,tiers:_tiers||_sched,entered:_ent});}}catch(_e){}
  try{var _sa=D.accounts.find(function(x){return x.id===id;});if(_sa&&typeof balLogSave==='function')balLogSave(_sa);}catch(_e){}
  _acctTouched[id]=true;
  saveD();_acctClosePopup();renderBankAccount();try{if(typeof simulate==='function')simulate();if(typeof renderAllTabs==='function')renderAllTabs();}catch(_e){}
  setTimeout(function(){var r=document.querySelector('tr[data-aid="'+id+'"]');if(r)r.scrollIntoView({behavior:'smooth',block:'center'});},40);
}
function acctRateLogDel(id){if(!confirm('Delete this rate entry?'))return;D.rate_log=(D.rate_log||[]).filter(function(x){return x.id!==id;});saveD();var ov=document.getElementById('acct-popup-ov');if(ov){var aid=(ov.querySelector('[onclick^="acctSavePopup"]')||{}).getAttribute;}var r=document.querySelector('#acct-popup-ov [onclick^="acctSavePopup"]');var m=r&&r.getAttribute('onclick').match(/'([^']*)'/);_acctClosePopup();if(m&&m[1])acctEditPopup(m[1]);}
window.acctRateLogDel=acctRateLogDel;
function acctDel(id){
  var a=(D.accounts||[]).find(function(x){return x.id===id;});
  if(!confirm('\u0e25\u0e1a\u0e1a\u0e31\u0e0d\u0e0a\u0e35 "'+((a&&a.name)||'')+'" ?'))return;
  D.accounts=(D.accounts||[]).filter(function(x){return x.id!==id;});
  saveD();renderBankAccount();
}

window.swSetup=swSetup;window.renderBankAccount=renderBankAccount;window.setAcctSort=setAcctSort;
window.acctAddPopup=acctAddPopup;window.acctEditPopup=acctEditPopup;window.acctSavePopup=acctSavePopup;window.acctDel=acctDel;window._acctClosePopup=_acctClosePopup;
window._acctTypeLabel=_acctTypeLabel;window._acctTypeOpts=_acctTypeOpts;
