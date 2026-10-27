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

function swSetup(el,tab){document.querySelectorAll('#tab-setup .sub-panel').forEach(function(p){p.classList.remove('active')});document.querySelectorAll('#tab-setup .sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('setup-'+tab).classList.add('active');if(tab==='bank')try{renderBankAccount()}catch(e){console.error('renderBankAccount:',e)}if(tab==='holiday')try{renderHolidays()}catch(e){console.error('renderHolidays:',e)}}



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
  if(c){list.sort(function(a,b){var x=a[c],y=b[c];if(c==='type'){x=_acctTypeLabel(x);y=_acctTypeLabel(y);}if(c==='bank'){x=(typeof bankName==='function'?bankName(x):x);y=(typeof bankName==='function'?bankName(y):y);}x=(x||'').toString().toLowerCase();y=(y||'').toString().toLowerCase();return x<y?-1*_acctSort.dir:x>y?1*_acctSort.dir:0;});}
  return list;
}
function setAcctSort(col){
  if(_acctSort.col===col){_acctSort.dir*=-1;if(_acctSort.dir===1){_acctSort.col=null;}}
  else{_acctSort.col=col;_acctSort.dir=1;}
  renderBankAccount();
}
function _acctAr(col){return _acctSort.col===col?(_acctSort.dir>0?' \u25b2':' \u25bc'):'';}

function renderBankAccount(){
  if(typeof renderBanks==='function')try{renderBanks()}catch(e){}   // refresh the Banks chip list
  var host=document.getElementById('setup-accounts-host');
  if(!host)return;
  if(!Array.isArray(D.accounts))D.accounts=[];
  var rows=_acctSorted().map(function(a){
    var hl=_acctTouched[a.id]?';box-shadow:inset 3px 0 0 var(--primary);background:var(--primary-bg,rgba(59,130,246,0.06))':'';
    return '<tr data-aid="'+a.id+'" style="'+hl.replace(/^;/,'')+'">'+
      '<td style="white-space:nowrap">'+esc((a.bank&&typeof bankName==='function')?bankName(a.bank):(a.bank||'\u2014'))+'</td>'+
      '<td style="font-weight:600">'+esc(a.name||'')+'</td>'+
      '<td style="white-space:nowrap">'+(a.type?'<span class="type-chip" style="font-size:10px">'+esc(_acctTypeLabel(a.type))+'</span>':'')+'</td>'+
      '<td style="font-size:11px;color:var(--text3)">'+esc(a.note||'')+'</td>'+
      '<td style="text-align:center;white-space:nowrap">'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e41\u0e01\u0e49\u0e44\u0e02" onclick="acctEditPopup(\''+a.id+'\')"><i class="fa-solid fa-pen"></i></button> '+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e25\u0e1a" onclick="acctDel(\''+a.id+'\')"><i class="fa-solid fa-xmark"></i></button>'+
      '</td></tr>';
  }).join('');
  if(!(D.accounts||[]).length)rows='<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u2014 \u0e01\u0e14 "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e31\u0e0d\u0e0a\u0e35"</td></tr>';
  host.innerHTML=
    '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
      '<h2 style="margin:0"><i class="fa-solid fa-wallet"></i> Accounts</h2>'+
      '<button class="btn btn-primary" style="font-size:11px" onclick="acctAddPopup()"><i class="fa-solid fa-plus"></i> \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1a\u0e31\u0e0d\u0e0a\u0e35</button>'+
    '</div>'+
    '<p class="text-muted" style="font-size:10px;margin-bottom:8px">1 \u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\u0e21\u0e35\u0e44\u0e14\u0e49\u0e2b\u0e25\u0e32\u0e22\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u2014 \u0e43\u0e0a\u0e49\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e43\u0e19 Monthly Planning (\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\u0e14\u0e36\u0e07\u0e08\u0e32\u0e01 Banks \u0e14\u0e49\u0e32\u0e19\u0e1a\u0e19)</p>'+
    '<table class="tbl" style="font-size:11px;width:100%">'+
      '<thead><tr>'+
        '<th style="cursor:pointer;white-space:nowrap;width:160px" onclick="setAcctSort(\'bank\')">Bank'+_acctAr('bank')+'</th>'+
        '<th style="cursor:pointer" onclick="setAcctSort(\'name\')">Account'+_acctAr('name')+'</th>'+
        '<th style="cursor:pointer;white-space:nowrap;width:150px" onclick="setAcctSort(\'type\')">\u0e0a\u0e19\u0e34\u0e14'+_acctAr('type')+'</th>'+
        '<th style="cursor:pointer" onclick="setAcctSort(\'note\')">Note'+_acctAr('note')+'</th>'+
        '<th style="width:84px"></th>'+
      '</tr></thead><tbody>'+rows+'</tbody>'+
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
    '<div class="form-group"><label>\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38</label><input class="inp" id="acct-f-note" value="'+esc(a.note||'')+'" placeholder="(\u0e44\u0e21\u0e48\u0e1a\u0e31\u0e07\u0e04\u0e31\u0e1a)"></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">'+
      '<button class="btn btn-ghost" onclick="_acctClosePopup()">\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</button>'+
      '<button class="btn btn-primary" onclick="acctSavePopup(\''+(a.id||'')+'\')"><i class="fa-solid fa-check"></i> \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button>'+
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
  if(id){var a=D.accounts.find(function(x){return x.id===id;});if(a){a.bank=bank;a.name=name;a.note=note;a.type=type;}}
  else{id=_acctId();D.accounts.push({id:id,bank:bank,name:name,note:note,type:type});}
  _acctTouched[id]=true;
  saveD();_acctClosePopup();renderBankAccount();
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
