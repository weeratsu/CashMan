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
  if(c){list.sort(function(a,b){var x=a[c],y=b[c];if(c==='type'){x=_acctTypeLabel(x);y=_acctTypeLabel(y);}if(c==='bank'){x=(typeof bankName==='function'?bankName(x):x);y=(typeof bankName==='function'?bankName(y):y);}if(c==='sim'){var sx=a.type==='loan'?0:(a.in_sim!==false?2:1),sy=b.type==='loan'?0:(b.in_sim!==false?2:1);return (sy-sx)*_acctSort.dir||(a.name||'').localeCompare(b.name||'');}if(c==='balance'){if(typeof acctTHB==='function'){var ax=a.balance===''||a.balance==null?null:acctTHB(a,a.balance,a.balance_date),bx=b.balance===''||b.balance==null?null:acctTHB(b,b.balance,b.balance_date);x=ax==null?'':ax;y=bx==null?'':bx;}var nx=(x===''||x==null)?-1e15:+x,ny=(y===''||y==null)?-1e15:+y;return (nx-ny)*_acctSort.dir;}x=(x||'').toString().toLowerCase();y=(y||'').toString().toLowerCase();return x<y?-1*_acctSort.dir:x>y?1*_acctSort.dir:0;});}
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
      '<td style="font-weight:600">'+esc(a.name||'')+'</td>'+
      '<td style="white-space:nowrap">'+(a.type?'<span class="type-chip" style="font-size:10px">'+esc(_acctTypeLabel(a.type))+'</span>':'')+'</td>'+
      '<td style="text-align:right;font-family:var(--mono);white-space:nowrap'+(a.type==='loan'?';color:var(--danger)':'')+'">'+((a.balance!==undefined&&a.balance!==null&&a.balance!=='')?(a.type==='loan'?'<span style="font-size:9px">debt </span>':'')+(typeof curSym==='function'?curSym(a.currency||'THB'):'\u0e3f')+fmt(+a.balance)+(((a.currency||'THB')!=='THB'&&typeof acctTHB==='function')?(function(){var v=acctTHB(a,a.balance,a.balance_date);return '<div style="font-size:9px;color:var(--text3)">'+(v==null?'no FX rate':'\u2248 \u0e3f'+fmt(v))+'</div>';})():'')+(a.balance_date?'<div style="font-size:9px;color:var(--text3)">'+fmtDate(a.balance_date)+'</div>':''):'<span style="color:var(--text3)">\u2014</span>')+'</td>'+'<td style="font-size:11px;color:var(--text3)">'+esc(a.note||'')+'</td>'+
      '<td style="text-align:center;white-space:nowrap">'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e41\u0e01\u0e49\u0e44\u0e02" onclick="acctEditPopup(\''+a.id+'\')"><i class="fa-solid fa-pen"></i></button> '+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e25\u0e1a" onclick="acctDel(\''+a.id+'\')"><i class="fa-solid fa-xmark"></i></button>'+
      '</td></tr>';
  }).join('');
  if(!(D.accounts||[]).length)rows='<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:14px">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u2014 \u0e01\u0e14 "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e31\u0e0d\u0e0a\u0e35"</td></tr>';
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
        '<th style="cursor:pointer;text-align:right;white-space:nowrap" onclick="setAcctSort(\'balance\')">Actual Balance'+_acctAr('balance')+'</th>'+'<th style="cursor:pointer" onclick="setAcctSort(\'note\')">Note'+_acctAr('note')+'</th>'+
        '<th style="width:84px"></th>'+
      '</tr></thead><tbody>'+rows+'</tbody>'+
    '<tfoot><tr style="font-weight:700;background:var(--bg3)"><td colspan="4">Total cash in Timeline</td><td style="text-align:right;font-family:var(--mono)">'+(cmActualCash()===null?'\u2014':'\u0e3f'+fmt(cmActualCash()))+'</td><td colspan="2" style="font-size:10px;color:var(--text3);font-weight:400">'+(cmActualCash()===null?'Using Starting Cash from Profile (\u0e3f'+fmt((D.profile&&D.profile.starting_cash)||0)+')':'\u2192 ticked, non-loan accounts (THB) \u2014 overrides Starting Cash')+'</td></tr></tfoot>'+
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
  var _cur=(document.getElementById('acct-f-cur')||{}).value||'THB',_sim=!!(document.getElementById('acct-f-sim')||{}).checked;
  var bdt=(document.getElementById('acct-f-baldt')||{}).value||'';if(bal!==''&&!bdt){var _t=new Date();bdt=_t.getFullYear()+'-'+String(_t.getMonth()+1).padStart(2,'0')+'-'+String(_t.getDate()).padStart(2,'0');}
  if(id){var a=D.accounts.find(function(x){return x.id===id;});if(a){a.bank=bank;a.name=name;a.note=note;a.type=type;a.balance=bal;a.balance_date=bal===''?'':bdt;a.currency=_cur;a.in_sim=_sim;}}
  else{id=_acctId();D.accounts.push({id:id,bank:bank,name:name,note:note,type:type,balance:bal,balance_date:bal===''?'':bdt,currency:_cur,in_sim:_sim});}
  try{var _sa=D.accounts.find(function(x){return x.id===id;});if(_sa&&typeof balLogSave==='function')balLogSave(_sa);}catch(_e){}
  _acctTouched[id]=true;
  saveD();_acctClosePopup();renderBankAccount();try{if(typeof simulate==='function')simulate();if(typeof renderAllTabs==='function')renderAllTabs();}catch(_e){}
  setTimeout(function(){var r=document.querySelector('tr[data-aid="'+id+'"]');if(r)r.scrollIntoView({behavior:'smooth',block:'center'});},40);
}
function acctDel(id){
  var a=(D.accounts||[]).find(function(x){return x.id===id;});
  if(!confirm('\u0e25\u0e1a\u0e1a\u0e31\u0e0d\u0e0a\u0e35 "'+((a&&a.name)||'')+'" ?'))return;
  D.accounts=(D.accounts||[]).filter(function(x){return x.id!==id;});
  saveD();renderBankAccount();
}

window.swSetup=swSetup;window.renderBankAccount=renderBankAccount;window.setAcctSort=setAcctSort;
window.acctAddPopup=acctAddPopup;window.acctEditPopup=acctEditPopup;window.acctSavePopup=acctSavePopup;window.acctDel=acctDel;window._acctClosePopup=_acctClosePopup;
window._acctTypeLabel=_acctTypeLabel;window._acctTypeOpts=_acctTypeOpts;
