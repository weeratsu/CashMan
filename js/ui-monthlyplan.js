// ui-monthlyplan.js — Monthly Planning page (under Payroll & Tax)
// Shows income (payroll net + all-source income for a chosen month) and a single
// "master plan" list of allocations (name / amount / account / purpose) with a
// running balance after each row. Master plans are VERSIONED.
// Accounts are managed in Setup > Bank & Account (D.accounts); here we only READ them
// for the account dropdown.
//
// Add row = popup (like other pages) + soft highlight on the newly-added row.
// Table headers are sortable, BUT sorting changes display order only AFTER the running
// balance is computed in plan order; so sorting is on a snapshot — the running balance
// column is meaningful in the saved plan order. We sort a copy for display and recompute
// balance in that displayed order so "คงเหลือ" always reads top-to-bottom on screen.

var _mpMonth = (function(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);})();
var _mpSort={col:null,dir:1};
var _mpGroupBy='account'; // summary grouping: account|category|bank
var _mpSumSort='total'; var _mpSumAsc=false; // Summary table sort: group|total|pct
var _mpFilterCat='';   // table filter: category id (''=all)
var _mpFilterAcct='';  // table filter: account id (''=all)
var _mpFilterBank='';  // table filter: bank id (''=all)
var _mpTouched={}; // row id -> true (soft highlight)

function _mpId(pfx){return (pfx||'p')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// ---- account helpers (READ from D.accounts; managed in Setup) ----------------
function mpAcctLabel(id){
  var a=(D.accounts||[]).find(function(x){return x.id===id;});
  if(!a)return id||'';
  var bn=(a.bank&&typeof bankName==='function')?bankName(a.bank):(a.bank||'');
  return (bn?bn+' \u00b7 ':'')+(a.name||'');
}
function _mpBankOpts(sel){var o='<option value="">\u2014 \u0e17\u0e38\u0e01\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23 \u2014</option>';(D.banks||[]).slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base'});}).forEach(function(b){o+='<option value="'+b.id+'"'+(b.id===sel?' selected':'')+'>'+esc(b.name)+'</option>';});return o;}
function mpAcctOpts(sel,bankFilter){
  var o='<option value="">\u2014 \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1a\u0e31\u0e0d\u0e0a\u0e35 \u2014</option>';
  (D.accounts||[]).filter(function(a){return !bankFilter||a.bank===bankFilter;}).slice().map(function(a){var _bn=(a.bank&&typeof bankName==='function')?bankName(a.bank):(a.bank||'');return {id:a.id,label:(_bn?_bn+' \u00b7 ':'')+(a.name||'')};}).sort(function(a,b){return a.label.localeCompare(b.label,undefined,{sensitivity:'base'});}).forEach(function(a){
    o+='<option value="'+a.id+'"'+(a.id===sel?' selected':'')+'>'+esc(a.label)+'</option>';
  });
  return o;
}

// ---- income for the chosen month -------------------------------------------
function _mpPayrollNet(ym){
  try{var mn=parseInt(ym.slice(5,7),10);if(typeof computePayroll==='function'){var p=computePayroll(mn);return (p&&p.net)||0;}}catch(e){}
  return 0;
}
function _mpOtherIncome(ym){
  var tot=0,list=[];
  try{
    var occ=(typeof billOccurrences==='function')?billOccurrences(ym+'-01',ym+'-31'):[];
    occ.forEach(function(o){
      if(!(o._income||o._mIncome||o._yIncome))return;
      var d=(o.due||o.orig_due||'')+'';if(d.slice(0,7)!==ym)return;
      var amt=Math.abs(o.amount||0);tot+=amt;list.push({name:o.name||'(income)',amount:amt,date:d});
    });
  }catch(e){}
  return {total:tot,list:list};
}
function _mpIncome(ym){
  var net=_mpPayrollNet(ym),oth=_mpOtherIncome(ym);
  return {payroll:net,other:oth.total,otherList:oth.list,total:net+oth.total};
}

// ---- version helpers --------------------------------------------------------
function _mpActive(){
  if(!Array.isArray(D.plan_versions))D.plan_versions=[];
  if(!D.plan_versions.length){var v={id:_mpId('v'),label:'\u0e41\u0e1c\u0e19\u0e2b\u0e25\u0e31\u0e01',created:new Date().toISOString(),rows:[]};D.plan_versions.push(v);D.plan_active=v.id;saveD();}
  var a=D.plan_versions.find(function(v){return v.id===D.plan_active;});
  if(!a){a=D.plan_versions[D.plan_versions.length-1];D.plan_active=a.id;}
  return a;
}

function _mpSortedRows(rows){
  var list=rows.slice();var c=_mpSort.col;
  if(c){list.sort(function(a,b){
    var x=a[c],y=b[c];
    if(c==='amount'){x=+x||0;y=+y||0;return (x-y)*_mpSort.dir;}
    if(c==='category'){x=(typeof _planCatName==='function'?_planCatName(x):x);y=(typeof _planCatName==='function'?_planCatName(y):y);}
    if(c==='account'){x=mpAcctLabel(x);y=mpAcctLabel(y);}
    x=(x||'').toString().toLowerCase();y=(y||'').toString().toLowerCase();
    return x<y?-1*_mpSort.dir:x>y?1*_mpSort.dir:0;
  });}
  return list;
}
function setMpFilter(which,val){ if(which==='cat')_mpFilterCat=val; else if(which==='acct')_mpFilterAcct=val; else if(which==='bank'){_mpFilterBank=val; var _a=(D.accounts||[]).find(function(x){return x.id===_mpFilterAcct;}); if(val&&_a&&_a.bank!==val)_mpFilterAcct=''; } renderMonthlyPlan(); }
function setMpSort(col){
  if(_mpSort.col===col){_mpSort.dir*=-1;if(_mpSort.dir===1)_mpSort.col=null;}
  else{_mpSort.col=col;_mpSort.dir=1;}
  renderMonthlyPlan();
}
function _mpAr(col){return _mpSort.col===col?(_mpSort.dir>0?' \u25b2':' \u25bc'):'';}

function renderMonthlyPlan(){
  var host=document.getElementById('pt-monthly-plan');if(!host)return;
  if(!Array.isArray(D.accounts))D.accounts=[];
  var V=_mpActive();
  var inc=_mpIncome(_mpMonth);

  var MONs=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var moSel='<select class="sel" id="mp-month" onchange="_mpMonth=this.value;renderMonthlyPlan()">';
  var cy=new Date().getFullYear();
  for(var yy=cy-1;yy<=cy+1;yy++){for(var mm=1;mm<=12;mm++){var key=yy+'-'+('0'+mm).slice(-2);moSel+='<option value="'+key+'"'+(key===_mpMonth?' selected':'')+'>'+MONs[mm-1]+' '+yy+'</option>';}}
  moSel+='</select>';

  var kpis='<div class="kpi-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+
    '<div class="kpi" style="flex:1;min-width:150px"><div class="kpi-label">Net \u0e08\u0e32\u0e01 Payroll</div><div class="kpi-val text-primary">\u0e3f'+fmt(inc.payroll)+'</div></div>'+
    '<div class="kpi" style="flex:1;min-width:150px"><div class="kpi-label">Income \u0e2d\u0e37\u0e48\u0e19 \u0e46</div><div class="kpi-val" style="color:var(--success,#16a34a)">\u0e3f'+fmt(inc.other)+'</div></div>'+
    '<div class="kpi" style="flex:1;min-width:150px"><div class="kpi-label">\u0e23\u0e27\u0e21 Income \u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49</div><div class="kpi-val text-primary">\u0e3f'+fmt(inc.total)+'</div></div>'+
    '</div>';

  var rows=_mpSortedRows(V.rows||[]);
  var _fCat=_mpFilterCat, _fAcct=_mpFilterAcct, _fBank=_mpFilterBank;
  function _mpAcctBank(aid){var a=(D.accounts||[]).find(function(x){return x.id===aid;});return a?(a.bank||''):'';}
  function _mpMatch(r){ return (!_fCat||r.category===_fCat) && (!_fAcct||r.account===_fAcct) && (!_fBank||_mpAcctBank(r.account)===_fBank); }
  var _shownN=0;
  var bodyRows='',bal=inc.total,totalPlan=0;
  rows.forEach(function(r){
    var amt=+r.amount||0;totalPlan+=amt;bal-=amt;
    if(!_mpMatch(r)) return;   // running balance still counts ALL rows; only display is filtered
    _shownN++;
    var balColor=bal<0?'var(--error)':'var(--text)';
    var hl=_mpTouched[r.id]?';box-shadow:inset 3px 0 0 var(--primary);background:var(--primary-bg,rgba(59,130,246,0.06))':'';
    bodyRows+='<tr data-rid="'+r.id+'" style="'+hl.replace(/^;/,'')+'">'+
      '<td style="font-weight:600;font-size:12px">'+esc(r.name||'')+'</td>'+
      '<td style="white-space:nowrap;font-size:11px">'+(r.category?'<span class="type-chip" style="font-size:10px">'+esc((typeof _planCatName==='function')?_planCatName(r.category):r.category)+'</span>':'')+'</td>'+
      '<td style="text-align:right;white-space:nowrap">\u0e3f'+fmt(amt)+'</td>'+
      '<td style="white-space:nowrap;font-size:11px">'+esc(mpAcctLabel(r.account))+'</td>'+
      '<td style="font-size:11px">'+esc(r.purpose||'')+'</td>'+
      '<td style="text-align:right;white-space:nowrap;font-weight:600;color:'+balColor+'">\u0e3f'+fmt(bal)+'</td>'+
      '<td style="text-align:center;white-space:nowrap">'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e41\u0e01\u0e49\u0e44\u0e02" onclick="mpEditPopup(\''+r.id+'\')"><i class="fa-solid fa-pen"></i></button> '+
        '<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px;line-height:1" title="\u0e25\u0e1a" onclick="mpDelRow(\''+r.id+'\')"><i class="fa-solid fa-xmark"></i></button>'+
      '</td></tr>';
  });
  if(!_shownN)bodyRows='<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:16px">'+((_fCat||_fAcct)?'\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e15\u0e32\u0e21\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07':'\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 \u2014 \u0e01\u0e14 "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23"')+'</td></tr>';

  var finalColor=bal<0?'var(--error)':'var(--success,#16a34a)';
  var planTable=
    '<div class="todo-fit" style="overflow-x:auto"><table class="tbl" style="font-size:11px;width:100%;min-width:620px">'+
    '<thead><tr>'+
      '<th style="text-align:left;cursor:pointer" onclick="setMpSort(\'name\')">\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23'+_mpAr('name')+'</th>'+
      '<th style="white-space:nowrap;width:120px;cursor:pointer" onclick="setMpSort(\'category\')">\u0e2b\u0e21\u0e27\u0e14'+_mpAr('category')+'</th>'+
      '<th style="text-align:right;white-space:nowrap;width:100px;cursor:pointer" onclick="setMpSort(\'amount\')">\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19'+_mpAr('amount')+'</th>'+
      '<th style="white-space:nowrap;width:180px;cursor:pointer" onclick="setMpSort(\'account\')">\u0e1a\u0e31\u0e0d\u0e0a\u0e35'+_mpAr('account')+'</th>'+
      '<th style="text-align:left;cursor:pointer" onclick="setMpSort(\'purpose\')">Remarks'+_mpAr('purpose')+'</th>'+
      '<th style="text-align:right;white-space:nowrap;width:110px">\u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d</th>'+
      '<th style="width:84px"></th>'+
    '</tr></thead><tbody>'+bodyRows+'</tbody>'+
    '<tfoot><tr style="border-top:2px solid var(--border)">'+
      '<td colspan="2" style="font-weight:700">\u0e23\u0e27\u0e21\u0e41\u0e1c\u0e19</td>'+
      '<td style="text-align:right;font-weight:700;white-space:nowrap">\u0e3f'+fmt(totalPlan)+'</td>'+
      '<td colspan="2" style="text-align:right;color:var(--text3)">\u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e2a\u0e38\u0e17\u0e18\u0e34</td>'+
      '<td style="text-align:right;font-weight:700;color:'+finalColor+';white-space:nowrap">\u0e3f'+fmt(bal)+'</td>'+
      '<td></td>'+
    '</tr></tfoot></table></div>';

  var verSel='<select class="sel" id="mp-ver" onchange="mpSwitchVer(this.value)" style="font-size:11px;max-width:220px">';
  (D.plan_versions||[]).forEach(function(v){var dt=v.created?new Date(v.created):null;var dtxt=dt?(' ('+dt.toLocaleDateString('en-GB')+')'):'';verSel+='<option value="'+v.id+'"'+(v.id===D.plan_active?' selected':'')+'>'+esc(v.label||'\u0e41\u0e1c\u0e19')+dtxt+'</option>';});
  verSel+='</select>';

  host.innerHTML=
    '<div class="card">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><h2 style="margin:0"><i class="fa-solid fa-wallet"></i> Monthly Planning</h2>'+
        '<button class="btn btn-primary" style="font-size:11px" onclick="mpAddPopup()"><i class="fa-solid fa-plus"></i> \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</button></div>'+
      '<p class="text-muted" style="font-size:10px;margin-bottom:8px">\u0e27\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e08\u0e31\u0e14\u0e2a\u0e23\u0e23\u0e40\u0e07\u0e34\u0e19\u0e41\u0e15\u0e48\u0e25\u0e30\u0e40\u0e14\u0e37\u0e2d\u0e19 \u2014 income \u0e14\u0e36\u0e07\u0e08\u0e32\u0e01 Payroll + \u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a\u0e2d\u0e37\u0e48\u0e19 \u0e46, \u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e04\u0e33\u0e19\u0e27\u0e13\u0e17\u0e49\u0e32\u0e22\u0e41\u0e15\u0e48\u0e25\u0e30\u0e41\u0e16\u0e27 (\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e35\u0e48 Setup \u203a Bank & Account)</p>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">'+
        '<span style="font-size:11px;color:var(--text3)">\u0e40\u0e14\u0e37\u0e2d\u0e19</span>'+moSel+
        '<span style="margin-left:auto;font-size:11px;color:var(--text3)">\u0e41\u0e1c\u0e19</span>'+verSel+
        '<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="mpNewVersion()" title="\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e1c\u0e19\u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e0a\u0e31\u0e19 \u0e41\u0e25\u0e49\u0e27\u0e40\u0e23\u0e34\u0e48\u0e21\u0e41\u0e1c\u0e19\u0e43\u0e2b\u0e21\u0e48"><i class="fa-solid fa-code-branch"></i> \u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e0a\u0e31\u0e19\u0e43\u0e2b\u0e21\u0e48</button>'+
        '<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="mpRenameVersion()" title="\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e41\u0e1c\u0e19\u0e19\u0e35\u0e49"><i class="fa-solid fa-pen"></i></button>'+
      '</div>'+
      // table filters (category + account) — sourced from Setup, id-linked, sorted
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">'+
        '<span style="font-size:11px;color:var(--text3)">\u0e01\u0e23\u0e2d\u0e07</span>'+
        '<select class="sel" style="font-size:11px" onchange="setMpFilter(\'cat\',this.value)">'+(typeof planCatOpts==='function'?planCatOpts(_mpFilterCat):'')+'</select>'+
        '<select class="sel" style="font-size:11px" onchange="setMpFilter(\'bank\',this.value)">'+_mpBankOpts(_mpFilterBank)+'</select>'+
        '<select class="sel" style="font-size:11px" onchange="setMpFilter(\'acct\',this.value)">'+mpAcctOpts(_mpFilterAcct,_mpFilterBank)+'</select>'+
        ((_mpFilterCat||_mpFilterAcct||_mpFilterBank)?'<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="_mpFilterCat=\'\';_mpFilterAcct=\'\';_mpFilterBank=\'\';renderMonthlyPlan()">\u2715 \u0e25\u0e49\u0e32\u0e07</button>':'')+
      '</div>'+
      kpis+planTable+
    '</div>'+
    // --- group-by summary list ---
    _mpSummaryHtml(V)+
    // --- infographic / analysis section ---
    '<div class="card" style="margin-top:10px"><h2><i class="fa-solid fa-chart-pie"></i> \u0e2a\u0e23\u0e38\u0e1b / \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c</h2>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:6px">'+
      '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px;font-weight:600">\u0e42\u0e2d\u0e19\u0e40\u0e02\u0e49\u0e32\u0e1a\u0e31\u0e0d\u0e0a\u0e35 (\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49)</div><div id="mp-chart-account" style="height:240px"></div></div>'+
      '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px;font-weight:600">\u0e41\u0e22\u0e01\u0e15\u0e32\u0e21\u0e2b\u0e21\u0e27\u0e14 (\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49)</div><div id="mp-chart-category" style="height:240px"></div></div>'+
      '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px;font-weight:600">\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e01\u0e32\u0e23\u0e23\u0e32\u0e22\u0e1b\u0e35 (\u00d712 \u0e15\u0e48\u0e2d\u0e2b\u0e21\u0e27\u0e14)</div><div id="mp-chart-year" style="height:240px"></div></div>'+
    '</div></div>';
  try{_mpCharts(V,inc);}catch(e){console.error('_mpCharts:',e);}
}

// ---- plan row CRUD (popup add/edit + highlight) -----------------------------
function _mpClosePopup(){var ov=document.getElementById('mp-popup-ov');if(ov)ov.remove();}
function _mpRowPopup(existing){
  _mpClosePopup();
  var r=existing||{id:'',name:'',amount:null,account:'',purpose:''};
  var ov=document.createElement('div');ov.id='mp-popup-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div class="card" style="max-width:400px;width:100%;margin:0" onclick="event.stopPropagation()">'+
    '<h2 style="margin-top:0"><i class="fa-solid fa-wallet"></i> '+(existing?'\u0e41\u0e01\u0e49\u0e44\u0e02\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23':'\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23')+'</h2>'+
    '<div class="form-group"><label>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 / \u0e41\u0e1c\u0e19</label><input class="inp" id="mp-f-name" value="'+esc(r.name||'')+'" placeholder="\u0e40\u0e0a\u0e48\u0e19 \u0e42\u0e2d\u0e19\u0e40\u0e02\u0e49\u0e32\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19"></div>'+
    '<div class="form-group"><label>\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19</label><input class="inp" id="mp-f-amount" type="number" value="'+(r.amount!=null?r.amount:'')+'" placeholder="0"></div>'+
    '<div class="form-group"><label>\u0e2b\u0e21\u0e27\u0e14</label><select class="inp" id="mp-f-category">'+(typeof planCatOpts==='function'?planCatOpts(r.category):'')+'</select></div>'+
    '<div class="form-group"><label>\u0e1a\u0e31\u0e0d\u0e0a\u0e35</label><select class="inp" id="mp-f-account">'+mpAcctOpts(r.account)+'</select></div>'+
    '<div class="form-group"><label>Remarks</label><input class="inp" id="mp-f-purpose" value="'+esc(r.purpose||'')+'" placeholder="(\u0e44\u0e21\u0e48\u0e1a\u0e31\u0e07\u0e04\u0e31\u0e1a)"></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">'+
      '<button class="btn btn-ghost" onclick="_mpClosePopup()">\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</button>'+
      '<button class="btn btn-primary" onclick="mpSavePopup(\''+(r.id||'')+'\')"><i class="fa-solid fa-check"></i> \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button>'+
    '</div></div>';
  ov.onclick=_mpClosePopup;
  document.body.appendChild(ov);
  setTimeout(function(){var n=document.getElementById('mp-f-name');if(n)n.focus();},30);
  ov.addEventListener('keydown',function(e){if(e.key==='Enter'){mpSavePopup(r.id||'');}else if(e.key==='Escape'){_mpClosePopup();}});
}
function mpAddPopup(){_mpRowPopup(null);}
function mpEditPopup(id){var V=_mpActive();var r=(V.rows||[]).find(function(x){return x.id===id;});if(r)_mpRowPopup(r);}
function mpSavePopup(id){
  var name=((document.getElementById('mp-f-name')||{}).value||'').trim();
  var amtRaw=(document.getElementById('mp-f-amount')||{}).value;
  var account=(document.getElementById('mp-f-account')||{}).value||'';
  var purpose=((document.getElementById('mp-f-purpose')||{}).value||'').trim();
  var category=(document.getElementById('mp-f-category')||{}).value||'';
  if(!name){toast('\u26a0\ufe0f \u0e43\u0e2a\u0e48\u0e0a\u0e37\u0e48\u0e2d\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23');return;}
  var amount=(amtRaw===''||amtRaw==null)?0:(+amtRaw||0);
  var V=_mpActive();if(!Array.isArray(V.rows))V.rows=[];
  if(id){var r=V.rows.find(function(x){return x.id===id;});if(r){r.name=name;r.amount=amount;r.account=account;r.purpose=purpose;r.category=category;}}
  else{id=_mpId('r');V.rows.push({id:id,name:name,amount:amount,account:account,purpose:purpose,category:category});}
  _mpTouched[id]=true;
  saveD();_mpClosePopup();renderMonthlyPlan();
  setTimeout(function(){var row=document.querySelector('tr[data-rid="'+id+'"]');if(row)row.scrollIntoView({behavior:'smooth',block:'center'});},40);
}
function mpDelRow(id){var V=_mpActive();V.rows=(V.rows||[]).filter(function(x){return x.id!==id;});saveD();renderMonthlyPlan();}

// ---- version CRUD -----------------------------------------------------------
function mpSwitchVer(id){D.plan_active=id;saveD();renderMonthlyPlan();}
function mpNewVersion(){
  var V=_mpActive();
  var label=prompt('\u0e0a\u0e37\u0e48\u0e2d\u0e41\u0e1c\u0e19\u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e0a\u0e31\u0e19\u0e43\u0e2b\u0e21\u0e48 (\u0e02\u0e2d\u0e07\u0e40\u0e01\u0e48\u0e32\u0e08\u0e30\u0e16\u0e39\u0e01\u0e40\u0e01\u0e47\u0e1a\u0e44\u0e27\u0e49 refer \u0e44\u0e14\u0e49):','\u0e41\u0e1c\u0e19 '+new Date().toLocaleDateString('en-GB'));
  if(label===null)return;
  var copy=(V.rows||[]).map(function(r){return {id:_mpId('r'),name:r.name,amount:r.amount,account:r.account,purpose:r.purpose,category:r.category};});
  var nv={id:_mpId('v'),label:label.trim()||('\u0e41\u0e1c\u0e19 '+new Date().toLocaleDateString('en-GB')),created:new Date().toISOString(),rows:copy};
  D.plan_versions.push(nv);D.plan_active=nv.id;saveD();renderMonthlyPlan();
  toast('\u2705 \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e0a\u0e31\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e41\u0e25\u0e49\u0e27 \u2014 \u0e02\u0e2d\u0e07\u0e40\u0e01\u0e48\u0e32\u0e22\u0e31\u0e07\u0e2d\u0e22\u0e39\u0e48');
}
function mpRenameVersion(){var V=_mpActive();var label=prompt('\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e41\u0e1c\u0e19\u0e19\u0e35\u0e49:',V.label||'');if(label===null||!label.trim())return;V.label=label.trim();saveD();renderMonthlyPlan();}


// ---- infographic charts (account / category / annual) -----------------------
function _mpCharts(V, inc){
  if(typeof Highcharts==='undefined')return;
  var dk=document.documentElement.classList.contains('dark');
  var tc=dk?'#e8eaed':'#1a1d27', tc2=dk?'#6b7185':'#7a8098', gc=dk?'#353849':'#d4d7e0';
  var pal=(typeof COLORS!=='undefined'&&COLORS)||['#4a7aed','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d'];
  var rows=(V&&V.rows)||[];

  // aggregate by account + by category
  var byAcct={}, byCat={};
  rows.forEach(function(r){
    var amt=+r.amount||0; if(!amt)return;
    var al=mpAcctLabel(r.account)||'\u2014 \u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38 \u2014';
    byAcct[al]=(byAcct[al]||0)+amt;
    var cl=(r.category&&typeof _planCatName==='function')?_planCatName(r.category):(r.category||'');
    cl=cl||'\u2014 \u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38 \u2014';
    byCat[cl]=(byCat[cl]||0)+amt;
  });

  var baseChart={chart:{backgroundColor:'transparent',spacing:[8,8,8,8]},credits:{enabled:false},title:{text:null},legend:{itemStyle:{color:tc,fontSize:'10px'}},
    xAxis:{labels:{style:{color:tc2,fontSize:'10px'}},lineColor:gc,tickColor:gc},
    yAxis:{title:{text:null},gridLineColor:gc,labels:{style:{color:tc2,fontSize:'10px'},formatter:function(){return (this.value>=1000?(this.value/1000)+'k':this.value);}}}};

  // 1) by account — column
  var aKeys=Object.keys(byAcct);
  Highcharts.chart('mp-chart-account', Object.assign({}, baseChart, {
    chart:Object.assign({type:'column'},baseChart.chart),
    xAxis:Object.assign({categories:aKeys},baseChart.xAxis),
    tooltip:{pointFormat:'<b>\u0e3f{point.y:,.0f}</b>'},
    plotOptions:{column:{borderRadius:4,dataLabels:{enabled:true,color:tc,style:{fontSize:'9px',textOutline:'none'},formatter:function(){return '\u0e3f'+Highcharts.numberFormat(this.y,0);}}}},
    legend:{enabled:false},
    series:[{name:'\u0e42\u0e2d\u0e19',data:aKeys.map(function(k,i){return {y:Math.round(byAcct[k]),color:pal[i%pal.length]};})}]
  }));

  // 2) by category — donut
  var cKeys=Object.keys(byCat);
  Highcharts.chart('mp-chart-category', Object.assign({}, baseChart, {
    chart:Object.assign({type:'pie'},baseChart.chart),
    tooltip:{pointFormat:'<b>\u0e3f{point.y:,.0f}</b> ({point.percentage:.0f}%)'},
    plotOptions:{pie:{innerSize:'55%',dataLabels:{enabled:true,distance:12,style:{color:tc,fontSize:'9px',textOutline:'none'},formatter:function(){return this.point.name+': \u0e3f'+Highcharts.numberFormat(this.y,0);}}}},
    series:[{name:'\u0e2b\u0e21\u0e27\u0e14',colorByPoint:true,colors:pal,data:cKeys.map(function(k){return {name:k,y:Math.round(byCat[k])};})}]
  }));

  // 3) annual projection — monthly plan total x12, split by category
  Highcharts.chart('mp-chart-year', Object.assign({}, baseChart, {
    chart:Object.assign({type:'column'},baseChart.chart),
    xAxis:Object.assign({categories:cKeys},baseChart.xAxis),
    tooltip:{pointFormat:'<b>\u0e3f{point.y:,.0f}</b>/\u0e1b\u0e35'},
    plotOptions:{column:{borderRadius:4,dataLabels:{enabled:true,color:tc,style:{fontSize:'9px',textOutline:'none'},formatter:function(){return '\u0e3f'+Highcharts.numberFormat(this.y,0);}}}},
    legend:{enabled:false},
    series:[{name:'\u0e15\u0e48\u0e2d\u0e1b\u0e35',data:cKeys.map(function(k,i){return {y:Math.round(byCat[k]*12),color:pal[i%pal.length]};})}]
  }));
}


// ---- group-by summary list -------------------------------------------------
function setMpGroupBy(v){_mpGroupBy=v;renderMonthlyPlan();}
function setMpSumSort(col){ if(_mpSumSort===col){_mpSumAsc=!_mpSumAsc;} else {_mpSumSort=col;_mpSumAsc=(col==='group');} renderMonthlyPlan(); }
function _mpSumArrow(col){ return _mpSumSort===col?(_mpSumAsc?' \u25b2':' \u25bc'):''; }
function _mpSummaryHtml(V){
  var rows=(V&&V.rows)||[];
  var gb=_mpGroupBy||'account';
  var groups={}, total=0;
  rows.forEach(function(r){
    var amt=+r.amount||0; total+=amt;
    var label;
    if(gb==='category'){var key=r.category||'';label=(key&&typeof _planCatName==='function')?_planCatName(key):(key||'\u2014 none \u2014');}
    else if(gb==='bank'){var a=(D.accounts||[]).find(function(x){return x.id===r.account;});var bid=a?a.bank:'';label=(bid&&typeof bankName==='function')?bankName(bid):(bid||'\u2014 none \u2014');}
    else{label=mpAcctLabel(r.account)||'\u2014 none \u2014';}
    if(!groups[label])groups[label]={amt:0,n:0,items:[]};
    groups[label].amt+=amt;groups[label].n++;groups[label].items.push(r);
  });
  var keys=Object.keys(groups).filter(function(k){return (groups[k].amt||0)!==0;});
  keys.sort(function(a,b){var r;if(_mpSumSort==='group')r=a.localeCompare(b,undefined,{sensitivity:'base'});else r=groups[a].amt-groups[b].amt;/* total and pct share the same order */return _mpSumAsc?r:-r;});
  var sel='<select class="sel" style="font-size:11px" onchange="setMpGroupBy(this.value)">'+
    '<option value="account"'+(gb==='account'?' selected':'')+'>Account</option>'+
    '<option value="category"'+(gb==='category'?' selected':'')+'>Category</option>'+
    '<option value="bank"'+(gb==='bank'?' selected':'')+'>Bank</option>'+
    '</select>';
  var body=keys.map(function(k,gi){
    var g=groups[k];var pct=total?Math.round(g.amt/total*100):0;
    var gid='mpg_'+gi;
    var head='<tr style="cursor:pointer" onclick="_mpToggleGrp(\''+gid+'\',this)">'+
      '<td style="font-weight:600"><i class="fa-solid fa-chevron-right" style="font-size:9px;color:var(--text3);margin-right:6px;transition:transform .15s"></i>'+esc(k)+' <span style="color:var(--text3);font-weight:400;font-size:10px">('+g.n+')</span></td>'+
      '<td style="text-align:right;white-space:nowrap;font-weight:600">\u0e3f'+fmt(g.amt)+'</td>'+
      '<td style="text-align:right;white-space:nowrap;color:var(--text3);font-size:10px">'+pct+'%</td>'+
    '</tr>';
    // detail sub-rows (hidden by default)
    var det=g.items.map(function(r){
      var amt=+r.amount||0;
      var sub=[];
      if(gb!=='account'){var al=mpAcctLabel(r.account);if(al)sub.push(al);}
      if(gb!=='category'){var cl=(r.category&&typeof _planCatName==='function')?_planCatName(r.category):'';if(cl)sub.push(cl);}
      if(r.purpose)sub.push(r.purpose);
      return '<tr class="'+gid+'" style="display:none;background:var(--bg3,rgba(0,0,0,0.02))">'+
        '<td style="padding-left:24px;font-size:11px">'+esc(r.name||'(no name)')+(sub.length?' <span style="color:var(--text3);font-size:10px">\u00b7 '+esc(sub.join(' \u00b7 '))+'</span>':'')+'</td>'+
        '<td style="text-align:right;white-space:nowrap;font-size:11px">\u0e3f'+fmt(amt)+'</td>'+
        '<td></td>'+
      '</tr>';
    }).join('');
    return head+det;
  }).join('');
  if(!keys.length)body='<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:12px">No plan items</td></tr>';
  return '<div class="card" style="margin-top:10px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">'+
      '<h2 style="margin:0"><i class="fa-solid fa-list-ul"></i> Summary</h2>'+
      '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;color:var(--text3)">Group by</span>'+sel+'</div>'+
    '</div>'+
    '<table class="tbl" style="font-size:11px;width:100%">'+
      '<thead><tr>'+
      '<th style="text-align:left;cursor:pointer" onclick="setMpSumSort(\'group\')">Group'+_mpSumArrow('group')+'</th>'+
      '<th style="text-align:right;white-space:nowrap;width:120px;cursor:pointer" onclick="setMpSumSort(\'total\')">Total'+_mpSumArrow('total')+'</th>'+
      '<th style="text-align:right;width:60px;cursor:pointer" onclick="setMpSumSort(\'pct\')">%'+_mpSumArrow('pct')+'</th>'+
      '</tr></thead>'+
      '<tbody>'+body+'</tbody>'+
      '<tfoot><tr style="border-top:2px solid var(--border)"><td style="font-weight:700">Grand total</td><td style="text-align:right;font-weight:700;white-space:nowrap">\u0e3f'+fmt(total)+'</td><td></td></tr></tfoot>'+
    '</table></div>';
}
function _mpToggleGrp(gid,tr){
  var open=false;
  document.querySelectorAll('tr.'+gid).forEach(function(r){var show=r.style.display==='none';r.style.display=show?'':'none';open=show;});
  var ic=tr&&tr.querySelector('i');if(ic)ic.style.transform=open?'rotate(90deg)':'';
}

window.setMpGroupBy=setMpGroupBy;window.setMpSumSort=setMpSumSort;window._mpToggleGrp=_mpToggleGrp;
window.renderMonthlyPlan=renderMonthlyPlan;
window.setMpSort=setMpSort;window.setMpFilter=setMpFilter;
window.mpAddPopup=mpAddPopup;window.mpEditPopup=mpEditPopup;window.mpSavePopup=mpSavePopup;window.mpDelRow=mpDelRow;window._mpClosePopup=_mpClosePopup;
window.mpSwitchVer=mpSwitchVer;window.mpNewVersion=mpNewVersion;window.mpRenameVersion=mpRenameVersion;
window.mpAcctLabel=mpAcctLabel;
