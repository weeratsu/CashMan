// ui-balances.js — Account balance tracking, currencies & FX (Oct 31 2026)
// D.currencies=[{id:'THB',name,symbol}] (id = ISO code, immutable) · D.fx_log=[{id,date,cur,rate}] (1 cur = rate THB)
// D.balance_log=[{id,date,acct,balance,cur,rate}] snapshot each time a balance is saved
// account: currency (default THB), in_sim (default true), type 'loan' => liability (debt, never cash)
function _balInit(){
if(typeof D==='undefined'||!D)return;
if(!Array.isArray(D.currencies)||!D.currencies.length)D.currencies=[{id:'THB',name:'Thai Baht',symbol:'\u0e3f'},{id:'USD',name:'US Dollar',symbol:'$'}];
if(!Array.isArray(D.fx_log))D.fx_log=[];
if(!Array.isArray(D.balance_log))D.balance_log=[];
if(!D._ballog_seeded){(D.accounts||[]).forEach(function(a){if(a.balance!==''&&a.balance!=null)D.balance_log.push({id:'bl'+Math.random().toString(36).slice(2,9),date:a.balance_date||_isoT(),acct:a.id,balance:+a.balance,cur:a.currency||'THB',rate:1});});D._ballog_seeded=true;}
}
_balInit();
function _isoT(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _bid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function curSym(c){var x=(D.currencies||[]).find(function(y){return y.id===c;});return x?(x.symbol||x.id):(c||'\u0e3f');}
function curOpts(sel){return (D.currencies||[]).map(function(c){return '<option value="'+c.id+'"'+(c.id===(sel||'THB')?' selected':'')+'>'+esc(c.id+' \u2014 '+c.name)+'</option>';}).join('');}
// rate (THB per 1 unit) on/before date
function fxRate(cur,date){_balInit();if(!cur||cur==='THB')return 1;date=date||'9999-12-31';var l=(D.fx_log||[]).filter(function(f){return f.cur===cur&&f.date<=date;}).sort(function(a,b){return a.date<b.date?1:-1;});
 if(l.length)return +l[0].rate;var any=(D.fx_log||[]).filter(function(f){return f.cur===cur;}).sort(function(a,b){return a.date>b.date?1:-1;});return any.length?+any[0].rate:null;}
function acctIsLoan(a){return a&&a.type==='loan';}
function acctInSim(a){return a&&a.in_sim!==false&&!acctIsLoan(a);}
function acctTHB(a,bal,date){var r=fxRate(a.currency||'THB',date);return r==null?null:(+bal)*r;}
function _hasBal(a){return a.balance!==undefined&&a.balance!==null&&a.balance!=='';}
// OVERRIDES ui-setup: only accounts ticked "use in simulation", non-loan, converted to THB
function cmActualCash(){_balInit();var a=(D.accounts||[]).filter(function(x){return _hasBal(x)&&acctInSim(x);});
 if(!a.length)return null;return Math.round(a.reduce(function(s,x){var v=acctTHB(x,x.balance,x.balance_date);return s+(v||0);},0)*100)/100;}
function cmStartCash(){var v=cmActualCash();return v===null?((D.profile&&D.profile.starting_cash)||0):v;}
window.cmActualCash=cmActualCash;window.cmStartCash=cmStartCash;
function balLogSave(a){_balInit();if(!_hasBal(a))return;var d=a.balance_date||_isoT();
 D.balance_log=(D.balance_log||[]).filter(function(x){return !(x.acct===a.id&&x.date===d);});
 D.balance_log.push({id:_bid('bl'),date:d,acct:a.id,balance:+a.balance,cur:a.currency||'THB',rate:fxRate(a.currency||'THB',d)||1});}
function acctToggleSim(id){var a=(D.accounts||[]).find(function(x){return x.id===id;});if(!a)return;a.in_sim=(a.in_sim===false);saveD();renderBankAccount();try{simulate();renderAllTabs&&renderAllTabs();}catch(e){}}

// ===== Setup > Currency & FX =====
var _fxSort={c:'date',d:-1},_fxCur='';
function renderCurrencyFx(){_balInit();var h=document.getElementById('setup-fx-body');if(!h)return;
 var cur=(D.currencies||[]).map(function(c){var r=fxRate(c.id);return '<tr><td style="font-weight:600">'+esc(c.id)+'</td><td>'+esc(c.name||'')+'</td><td>'+esc(c.symbol||'')+'</td><td style="text-align:right;font-family:var(--mono)">'+(c.id==='THB'?'1':(r==null?'<span style="color:var(--danger)">no rate</span>':fmt(r)))+'</td><td style="text-align:center;white-space:nowrap">'+(c.id==='THB'?'':'<button class="btn btn-ghost" style="font-size:11px;padding:3px 7px" onclick="curEdit(\''+c.id+'\')"><i class="fa-solid fa-pen"></i></button> <button class="btn btn-ghost" style="font-size:11px;padding:3px 7px" onclick="curDel(\''+c.id+'\')"><i class="fa-solid fa-xmark"></i></button>')+'</td></tr>';}).join('');
 var fx=(D.fx_log||[]).filter(function(f){return !_fxCur||f.cur===_fxCur;}).sort(function(a,b){var x=a[_fxSort.c],y=b[_fxSort.c];if(_fxSort.c==='rate'){x=+x;y=+y;}return x<y?-_fxSort.d:x>y?_fxSort.d:0;});
 var fr=fx.map(function(f){return '<tr><td>'+fmtDate(f.date)+'</td><td style="font-weight:600">'+esc(f.cur)+'</td><td style="text-align:right;font-family:var(--mono)">'+fmt(+f.rate)+'</td><td style="text-align:center;white-space:nowrap"><button class="btn btn-ghost" style="font-size:11px;padding:3px 7px" onclick="fxEdit(\''+f.id+'\')"><i class="fa-solid fa-pen"></i></button> <button class="btn btn-ghost" style="font-size:11px;padding:3px 7px" onclick="fxDel(\''+f.id+'\')"><i class="fa-solid fa-xmark"></i></button></td></tr>';}).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:12px">No FX rates yet</td></tr>';
 function th(c,l,r){return '<th style="cursor:pointer;'+(r?'text-align:right':'')+'" onclick="_fxSort.d=(_fxSort.c===\''+c+'\')?-_fxSort.d:1;_fxSort.c=\''+c+'\';renderCurrencyFx()">'+l+(_fxSort.c===c?(_fxSort.d>0?' \u25b2':' \u25bc'):'')+'</th>';}
 h.innerHTML='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h2 style="margin:0"><i class="fa-solid fa-coins"></i> Currencies</h2><button class="btn btn-primary" style="font-size:11px" onclick="curEdit(\'\')"><i class="fa-solid fa-plus"></i> Add Currency</button></div>'+
 '<div class="rec-scroll"><table class="tbl" style="font-size:11px;width:100%"><thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th style="text-align:right">Latest rate (\u0e3f / 1)</th><th style="width:84px"></th></tr></thead><tbody>'+cur+'</tbody></table></div></div>'+
 '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h2 style="margin:0"><i class="fa-solid fa-chart-line"></i> FX Rates (history)</h2><div style="display:flex;gap:6px"><select class="inp" style="font-size:11px;width:auto" onchange="_fxCur=this.value;renderCurrencyFx()"><option value="">All currencies</option>'+(D.currencies||[]).filter(function(c){return c.id!=='THB';}).map(function(c){return '<option value="'+c.id+'"'+(c.id===_fxCur?' selected':'')+'>'+esc(c.id)+'</option>';}).join('')+'</select><button class="btn btn-primary" style="font-size:11px" onclick="fxEdit(\'\')"><i class="fa-solid fa-plus"></i> Add FX Rate</button></div></div>'+
 '<div id="fx-chart" style="height:240px"></div>'+
 '<div class="rec-scroll"><table class="tbl" style="font-size:11px;width:100%"><thead><tr>'+th('date','Date')+th('cur','Currency')+th('rate','Rate (\u0e3f / 1)',1)+'<th style="width:84px"></th></tr></thead><tbody>'+fr+'</tbody></table></div></div>';
 if(window.Highcharts){var by={};fx.forEach(function(f){(by[f.cur]=by[f.cur]||[]).push([Date.parse(f.date),+f.rate]);});
  var s=Object.keys(by).map(function(k){return {name:k,data:by[k].sort(function(a,b){return a[0]-b[0];})};});
  var _fc=document.getElementById('fx-chart');if(_fc)_fc.style.display=s.length?'':'none';if(s.length)Highcharts.chart('fx-chart',{chart:{backgroundColor:'transparent'},title:{text:null},credits:{enabled:false},accessibility:{enabled:false},xAxis:{type:'datetime'},yAxis:{title:{text:'\u0e3f'}},series:s});else document.getElementById('fx-chart').style.display='none';}
}
function _bpop(title,body,onsave){var ov=document.createElement('div');ov.id='bal-pop';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
 ov.innerHTML='<div class="card" style="max-width:380px;width:100%;margin:0" onclick="event.stopPropagation()"><h2 style="margin-top:0">'+title+'</h2>'+body+'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn btn-ghost" id="bp-c">Cancel</button><button class="btn btn-primary" id="bp-s"><i class="fa-solid fa-check"></i> Save</button></div></div>';
 function cl(){ov.remove();document.removeEventListener('keydown',kd);}function kd(e){if(e.key==='Escape')cl();if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();if(onsave()!==false)cl();}}
 ov.onclick=cl;document.body.appendChild(ov);ov.querySelector('#bp-c').onclick=cl;ov.querySelector('#bp-s').onclick=function(){if(onsave()!==false)cl();};document.addEventListener('keydown',kd);
 setTimeout(function(){var i=ov.querySelector('input,select');if(i)i.focus();},30);}
function _gv(id){return ((document.getElementById(id)||{}).value||'').trim();}
function curEdit(id){_balInit();var c=(D.currencies||[]).find(function(x){return x.id===id;})||{id:'',name:'',symbol:''};
 _bpop('<i class="fa-solid fa-coins"></i> '+(id?'Edit':'Add')+' Currency','<div class="form-group"><label>Code (e.g. USD, JPY)</label><input class="inp" id="cu-id" value="'+esc(c.id)+'"'+(id?' disabled':'')+'></div><div class="form-group"><label>Name</label><input class="inp" id="cu-n" value="'+esc(c.name)+'"></div><div class="form-group"><label>Symbol</label><input class="inp" id="cu-s" value="'+esc(c.symbol||'')+'"></div>'+(id?'':'<div class="form-group"><label>Rate today (\u0e3f per 1, optional)</label><input class="inp inp-num" id="cu-r"></div>'),
 function(){var code=(id||_gv('cu-id')).toUpperCase();if(!code){toast('\u26a0\ufe0f Code required');return false;}
  if(!id&&(D.currencies||[]).some(function(x){return x.id===code;})){toast('\u26a0\ufe0f '+code+' exists');return false;}
  if(id){c.name=_gv('cu-n');c.symbol=_gv('cu-s');}else{D.currencies.push({id:code,name:_gv('cu-n')||code,symbol:_gv('cu-s')});var r=parseFloat(_gv('cu-r').replace(/,/g,''));if(r>0)D.fx_log.push({id:_bid('fx'),date:_isoT(),cur:code,rate:r});}
  saveD();renderCurrencyFx();});}
function curDel(id){_balInit();var used=(D.accounts||[]).filter(function(a){return a.currency===id;}).length;if(used){toast('\u26a0\ufe0f '+id+' used by '+used+' account(s)');return;}
 if(!confirm('Delete currency '+id+' and its FX history?'))return;D.currencies=D.currencies.filter(function(x){return x.id!==id;});D.fx_log=D.fx_log.filter(function(f){return f.cur!==id;});saveD();renderCurrencyFx();}
function fxEdit(id){_balInit();var f=(D.fx_log||[]).find(function(x){return x.id===id;})||{date:_isoT(),cur:'',rate:''};
 var opts=(D.currencies||[]).filter(function(c){return c.id!=='THB';}).map(function(c){return '<option value="'+c.id+'"'+(c.id===f.cur?' selected':'')+'>'+esc(c.id)+'</option>';}).join('');
 if(!opts){toast('\u26a0\ufe0f Add a currency first');return;}
 _bpop('<i class="fa-solid fa-chart-line"></i> '+(id?'Edit':'Add')+' FX Rate','<div class="form-group"><label>Date</label><input type="date" class="inp" id="fx-d" value="'+f.date+'"></div><div class="form-group"><label>Currency</label><select class="inp" id="fx-c">'+opts+'</select></div><div class="form-group"><label>Rate (\u0e3f per 1 unit)</label><input class="inp inp-num" id="fx-r" value="'+(f.rate||'')+'"></div>',
 function(){var r=parseFloat(_gv('fx-r').replace(/,/g,''));if(!(r>0)){toast('\u26a0\ufe0f Rate required');return false;}var d=_gv('fx-d')||_isoT(),c=_gv('fx-c');
  if(id){f.date=d;f.cur=c;f.rate=r;}else{D.fx_log=D.fx_log.filter(function(x){return !(x.cur===c&&x.date===d);});D.fx_log.push({id:_bid('fx'),date:d,cur:c,rate:r});}
  saveD();renderCurrencyFx();try{simulate();}catch(e){}});}
function fxDel(id){_balInit();if(!confirm('Delete this FX rate?'))return;D.fx_log=D.fx_log.filter(function(x){return x.id!==id;});saveD();renderCurrencyFx();}

// ===== Analysis > Balances =====
var _blSort={c:'date',d:-1},_blAcct='';
function _acName(id){var a=(D.accounts||[]).find(function(x){return x.id===id;});return a?a.name:'(deleted)';}
// series of totals by date: carry each account's latest balance forward
function _balSeries(){var log=(D.balance_log||[]).slice().sort(function(a,b){return a.date<b.date?-1:1;});var dates=[];log.forEach(function(l){if(dates.indexOf(l.date)<0)dates.push(l.date);});
 var last={},out=[];dates.forEach(function(d){log.filter(function(l){return l.date===d;}).forEach(function(l){last[l.acct]=l;});
  var as=0,li=0;Object.keys(last).forEach(function(k){var a=(D.accounts||[]).find(function(x){return x.id===k;});if(!a)return;var v=(+last[k].balance)*(fxRate(last[k].cur,d)||last[k].rate||1);if(acctIsLoan(a))li+=Math.abs(v);else as+=v;});
  out.push({date:d,assets:as,debt:li,net:as-li});});return out;}
function renderBalances(){_balInit();var h=document.getElementById('an-balances-body');if(!h)return;
 var acc=(D.accounts||[]).filter(_hasBal),as=0,li=0,sim=0,miss=[];
 acc.forEach(function(a){var v=acctTHB(a,a.balance,a.balance_date);if(v==null){miss.push(a.name);return;}if(acctIsLoan(a))li+=Math.abs(v);else{as+=v;if(acctInSim(a))sim+=v;}});
 var ser=_balSeries(),prev=ser.length>1?ser[ser.length-2]:null,chg=prev?(as-li)-prev.net:null;
 function kpi(l,v,c,sub){return '<div class="kpi"><div class="kpi-label">'+l+'</div><div class="kpi-val" style="color:'+(c||'inherit')+'">\u0e3f'+fmt(v)+'</div>'+(sub?'<div style="font-size:9px;color:var(--text3)">'+sub+'</div>':'')+'</div>';}
 var k='<div class="kpi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px">'+kpi('Total Assets',as,'var(--success)',acc.filter(function(a){return !acctIsLoan(a);}).length+' accounts')+kpi('Total Debt',li,'var(--danger)','loan accounts')+kpi('Net Worth (cash)',as-li,(as-li)<0?'var(--danger)':'var(--primary)',chg==null?'':((chg>=0?'\u25b2 ':'\u25bc ')+'\u0e3f'+fmt(Math.abs(chg))+' vs '+fmtDate(prev.date)))+kpi('Used in Timeline',sim,'','ticked accounts')+'</div>'+(miss.length?'<div style="font-size:10px;color:var(--danger);margin-bottom:8px">\u26a0\ufe0f No FX rate: '+esc(miss.join(', '))+' \u2014 add in Accounts & Wealth \u203a FX Rates</div>':'');
 // per account summary
 var rows=(D.accounts||[]).filter(_hasBal).map(function(a){var lg=(D.balance_log||[]).filter(function(l){return l.acct===a.id;}).sort(function(x,y){return x.date<y.date?-1:1;});var p=lg.length>1?lg[lg.length-2]:null;var v=acctTHB(a,a.balance,a.balance_date);var d=p?(+a.balance)-(+p.balance):null;
  return {a:a,v:v,d:d};}).sort(function(x,y){return (y.v||0)-(x.v||0);});
 var tb=rows.map(function(r){var a=r.a,loan=acctIsLoan(a);return '<tr><td>'+esc((typeof bankName==='function'?bankName(a.bank):a.bank)||'')+'</td><td style="font-weight:600">'+esc(a.name)+(loan?' <span class="type-chip" style="font-size:9px;color:var(--danger)">Debt</span>':'')+'</td><td style="text-align:right;font-family:var(--mono)">'+curSym(a.currency||'THB')+fmt(+a.balance)+'</td><td style="text-align:right;font-family:var(--mono);color:'+(loan?'var(--danger)':'inherit')+'">'+(r.v==null?'\u2014':(loan?'-':'')+'\u0e3f'+fmt(Math.abs(r.v)))+'</td><td style="text-align:right;font-family:var(--mono);color:'+(r.d==null?'var(--text3)':r.d>=0?'var(--success)':'var(--danger)')+'">'+(r.d==null?'\u2014':(r.d>=0?'+':'')+fmt(r.d))+'</td><td>'+fmtDate(a.balance_date||'')+'</td></tr>';}).join('');
 // log table
 var lg=(D.balance_log||[]).filter(function(l){return !_blAcct||l.acct===_blAcct;}).map(function(l){return {l:l,n:_acName(l.acct),t:(+l.balance)*(fxRate(l.cur,l.date)||l.rate||1)};});
 lg.sort(function(x,y){var c=_blSort.c,a=c==='acct'?x.n:c==='balance'?+x.l.balance:c==='thb'?x.t:x.l.date,b=c==='acct'?y.n:c==='balance'?+y.l.balance:c==='thb'?y.t:y.l.date;return a<b?-_blSort.d:a>b?_blSort.d:0;});
 function th(c,l,r){return '<th style="cursor:pointer;'+(r?'text-align:right':'')+'" onclick="_blSort.d=(_blSort.c===\''+c+'\')?-_blSort.d:1;_blSort.c=\''+c+'\';renderBalances()">'+l+(_blSort.c===c?(_blSort.d>0?' \u25b2':' \u25bc'):'')+'</th>';}
 var lr=lg.map(function(x){return '<tr><td>'+fmtDate(x.l.date)+'</td><td>'+esc(x.n)+'</td><td style="text-align:right;font-family:var(--mono)">'+curSym(x.l.cur)+fmt(+x.l.balance)+'</td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(x.t)+'</td><td style="text-align:center"><button class="btn btn-ghost" style="font-size:11px;padding:3px 7px" onclick="balLogDel(\''+x.l.id+'\')"><i class="fa-solid fa-xmark"></i></button></td></tr>';}).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:12px">No balance log yet \u2014 enter Actual Balance in Accounts & Wealth \u203a Accounts</td></tr>';
 var ao='<option value="">All accounts</option>'+(D.accounts||[]).slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'');}).map(function(a){return '<option value="'+a.id+'"'+(a.id===_blAcct?' selected':'')+'>'+esc(a.name)+'</option>';}).join('');
 h.innerHTML=k+
 '<div class="card"><h2><i class="fa-solid fa-chart-area"></i> Balance Trend</h2><div id="bal-trend" style="height:300px"></div></div>'+
 '<div class="card"><h2><i class="fa-solid fa-chart-pie"></i> Assets by Account</h2><div id="bal-pie" style="height:300px"></div></div>'+
 '<div class="card"><h2><i class="fa-solid fa-table"></i> Account Summary</h2><div class="rec-scroll"><table class="tbl" style="font-size:11px;width:100%"><thead><tr><th>Bank</th><th>Account</th><th style="text-align:right">Balance</th><th style="text-align:right">THB</th><th style="text-align:right">Change vs prev</th><th>As of</th></tr></thead><tbody>'+tb+'</tbody></table></div></div>'+
 '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap"><h2 style="margin:0"><i class="fa-solid fa-clock-rotate-left"></i> Balance Log</h2><div style="display:flex;gap:6px"><select class="inp" style="font-size:11px;width:auto" onchange="_blAcct=this.value;renderBalances()">'+ao+'</select><button class="btn btn-primary" style="font-size:11px" onclick="balLogAdd()"><i class="fa-solid fa-plus"></i> Add Balance</button></div></div><div class="rec-scroll"><table class="tbl" style="font-size:11px;width:100%"><thead><tr>'+th('date','Date')+th('acct','Account')+th('balance','Balance',1)+th('thb','THB',1)+'<th style="width:44px"></th></tr></thead><tbody>'+lr+'</tbody></table></div></div>';
 if(window.Highcharts){var co={chart:{backgroundColor:'transparent'},credits:{enabled:false},accessibility:{enabled:false},title:{text:null}};
  if(ser.length)Highcharts.chart('bal-trend',Object.assign({},co,{xAxis:{type:'datetime'},yAxis:{title:{text:'\u0e3f'}},tooltip:{shared:true,valueDecimals:2,valuePrefix:'\u0e3f'},series:[{name:'Assets',type:'area',color:'#22c55e',fillOpacity:.15,data:ser.map(function(s){return [Date.parse(s.date),Math.round(s.assets*100)/100];})},{name:'Debt',type:'line',color:'#ef4444',data:ser.map(function(s){return [Date.parse(s.date),Math.round(s.debt*100)/100];})},{name:'Net',type:'line',color:'#3b82f6',lineWidth:3,data:ser.map(function(s){return [Date.parse(s.date),Math.round(s.net*100)/100];})}]}));
  var pd=rows.filter(function(r){return !acctIsLoan(r.a)&&r.v>0;}).map(function(r){return {name:r.a.name,y:Math.round(r.v*100)/100};});
  if(pd.length)Highcharts.chart('bal-pie',Object.assign({},co,{chart:{type:'pie',backgroundColor:'transparent'},tooltip:{pointFormat:'\u0e3f{point.y:,.2f} ({point.percentage:.1f}%)'},plotOptions:{pie:{innerSize:'55%',dataLabels:{format:'{point.name}: {point.percentage:.0f}%',style:{fontSize:'10px'}}}},series:[{name:'Balance',data:pd}]}));}
}
function balLogDel(id){_balInit();if(!confirm('Delete this balance log entry?'))return;D.balance_log=D.balance_log.filter(function(x){return x.id!==id;});saveD();renderBalances();}
function balLogAdd(){_balInit();var ao=(D.accounts||[]).slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'');}).map(function(a){return '<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join('');
 _bpop('<i class="fa-solid fa-clock-rotate-left"></i> Add Balance','<div class="form-group"><label>Account</label><select class="inp" id="bl-a">'+ao+'</select></div><div class="form-group"><label>Date</label><input type="date" class="inp" id="bl-d" value="'+_isoT()+'"></div><div class="form-group"><label>Balance (account currency)</label><input class="inp inp-num" id="bl-b"></div>',
 function(){var b=parseFloat(_gv('bl-b').replace(/,/g,''));if(isNaN(b)){toast('\u26a0\ufe0f Balance required');return false;}var a=(D.accounts||[]).find(function(x){return x.id===_gv('bl-a');});if(!a)return false;var d=_gv('bl-d')||_isoT();
  D.balance_log=D.balance_log.filter(function(x){return !(x.acct===a.id&&x.date===d);});D.balance_log.push({id:_bid('bl'),date:d,acct:a.id,balance:b,cur:a.currency||'THB',rate:fxRate(a.currency||'THB',d)||1});
  if(!a.balance_date||d>=a.balance_date){a.balance=b;a.balance_date=d;}saveD();renderBalances();try{simulate();}catch(e){}});}
window.renderCurrencyFx=renderCurrencyFx;window.renderBalances=renderBalances;

// Accounts & Wealth module sub-tab switch
function swAcct(el,tab){document.querySelectorAll('#tab-accounts .sub-panel').forEach(function(p){p.classList.remove('active')});document.querySelectorAll('#tab-accounts .sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');var p=document.getElementById('acct-'+tab);if(p)p.classList.add('active');
 try{if(tab==='list')renderBankAccount();else if(tab==='bal')renderBalances();else if(tab==='fx')renderCurrencyFx();else if(tab==='int')renderInterest();}catch(e){console.error('swAcct',e)}}
window.swAcct=swAcct;

// ===== Accounts & Wealth > Interest summary (Oct 31 2026) =====
var _intF={bank:'',acct:'',kind:'',atype:'',q:'',sort:'int'};
function _intKind(a){return a.rate_sched?(a.pay_maturity?'maturity':'term'):(a.rate_tiers?'tiered':'flat');}
function setIntF(k,v){_intF[k]=v;renderInterest();}
window.setIntF=setIntF;
function renderInterest(){_balInit();var h=document.getElementById('acct-int-body');if(!h)return;
 var all=(D.accounts||[]).filter(function(a){return !acctIsLoan(a)&&((a.rate!==''&&a.rate!=null)||a.rate_tiers||a.rate_sched);});
 var _bn=function(a){return (typeof bankName==='function'?bankName(a.bank):a.bank)||'';};
 var acc=all.filter(function(a){if(_intF.bank&&a.bank!==_intF.bank)return false;if(_intF.acct&&a.id!==_intF.acct)return false;if(_intF.kind&&_intKind(a)!==_intF.kind)return false;if(_intF.atype&&a.type!==_intF.atype)return false;
   if(_intF.q){var q=_intF.q.toLowerCase();if(((a.name||'')+' '+_bn(a)+' '+(a.note||'')).toLowerCase().indexOf(q)<0)return false;}return true;});
 var _iv=function(a){var ti=acctTermInfo(a);if(ti&&a.pay_maturity)return acctTHB(a,ti.total/(ti.term/12),a.balance_date)||0;return acctTHB(a,acctInterest(a,a.balance)||0,a.balance_date)||0;};
 var _rv=function(a){var e=acctEffRate(a);return e==null?(+a.rate||0):e;};
 var _bv=function(a){return acctTHB(a,+a.balance||0,a.balance_date)||0;};
 var SO={int:function(x,y){return _iv(y)-_iv(x);},rate:function(x,y){return _rv(y)-_rv(x);},bal:function(x,y){return _bv(y)-_bv(x);},name:function(x,y){return (x.name||'').localeCompare(y.name||'');},bank:function(x,y){return _bn(x).localeCompare(_bn(y))||(x.name||'').localeCompare(y.name||'');}};
 var _banks={};all.forEach(function(a){if(a.bank)_banks[a.bank]=_bn(a);});
 var fbar='<div class="filterbar" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'+
  '<input class="inp" style="width:170px;font-size:11px" placeholder="Search account / bank / note" value="'+esc(_intF.q)+'" onchange="setIntF(\'q\',this.value)">'+
  '<select class="inp sel" style="width:auto;font-size:11px" onchange="setIntF(\'bank\',this.value)"><option value="">All banks</option>'+Object.keys(_banks).sort(function(x,y){return _banks[x].localeCompare(_banks[y]);}).map(function(k){return '<option value="'+k+'"'+(k===_intF.bank?' selected':'')+'>'+esc(_banks[k])+'</option>';}).join('')+'</select>'+
  '<select class="inp sel" style="width:auto;font-size:11px" onchange="setIntF(\'acct\',this.value)"><option value="">All accounts</option>'+all.filter(function(a){return !_intF.bank||a.bank===_intF.bank;}).slice().sort(SO.name).map(function(a){return '<option value="'+a.id+'"'+(a.id===_intF.acct?' selected':'')+'>'+esc(a.name)+'</option>';}).join('')+'</select>'+
  (function(){var u={};all.forEach(function(a){if(a.type)u[a.type]=1;});var L=Object.keys(u).map(function(k){return [k,(typeof acctTypeName==='function'?acctTypeName(k):k)||k];}).sort(function(x,y){return x[1].localeCompare(y[1]);});
   return '<select class="inp sel" style="width:auto;font-size:11px" onchange="setIntF(\'atype\',this.value)"><option value="">All account types</option>'+L.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===_intF.atype?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>';})()+
  '<select class="inp sel" style="width:auto;font-size:11px" onchange="setIntF(\'kind\',this.value)"><option value="">All rate types</option>'+[['flat','Flat'],['tiered','Tiered'],['term','By month'],['maturity','At maturity']].map(function(o){return '<option value="'+o[0]+'"'+(o[0]===_intF.kind?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
  '<select class="inp sel" style="width:auto;font-size:11px" onchange="setIntF(\'sort\',this.value)">'+[['int','Sort: Interest/yr \u2193'],['rate','Sort: Rate \u2193'],['bal','Sort: Balance \u2193'],['bank','Sort: Bank A\u2192Z'],['name','Sort: Account A\u2192Z']].map(function(o){return '<option value="'+o[0]+'"'+(o[0]===_intF.sort?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
  ((_intF.bank||_intF.acct||_intF.kind||_intF.atype||_intF.q)?'<button class="btn btn-ghost" style="font-size:11px" onclick="_intF.bank=\'\';_intF.acct=\'\';_intF.kind=\'\';_intF.atype=\'\';_intF.q=\'\';renderInterest()"><i class="fa-solid fa-xmark"></i> Clear</button>':'')+
  '<span style="font-size:10px;color:var(--text3)">'+acc.length+' / '+all.length+' accounts</span></div>';
 var totI=0,totB=0,cards='';
 acc.sort(SO[_intF.sort]||SO.int).forEach(function(a){
  var sym=curSym(a.currency||'THB'),b=+a.balance||0,T=acctParseTiers(a.rate_tiers),I=acctInterest(a,b)||0,eff=b?I/b*100:(T?T[0].rate:+a.rate);
  var It=acctTHB(a,I,a.balance_date),Bt=acctTHB(a,b,a.balance_date);if(It!=null){totI+=It;totB+=Bt;}
  var rows='';
  if(T){var prev=0;T.forEach(function(t,i){var cap=t.upto-prev,inT=Math.max(0,Math.min(b-prev,cap)),cur=b>prev&&b<=t.upto,full=b>=t.upto;
    var pct=cap===Infinity?(inT>0?100:0):inT/cap*100;
    rows+='<tr style="'+(cur?'background:var(--primary-bg,rgba(59,130,246,.08));font-weight:700':'')+'"><td>'+(cur?'\u25b6 ':'')+'Tier '+(i+1)+'</td><td>'+sym+fmt(prev,0)+' \u2013 '+(t.upto===Infinity?'\u221e':sym+fmt(t.upto,0))+'</td><td style="text-align:right;font-family:var(--mono)">'+t.rate.toFixed(2)+'%</td>'+
     '<td style="min-width:120px"><div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct.toFixed(1)+'%;background:'+(full?'var(--success)':'var(--primary)')+'"></div></div><div style="font-size:9px;color:var(--text3)">'+sym+fmt(inT)+(cap!==Infinity?' / '+sym+fmt(cap,0)+(cur?' \u00b7 room '+sym+fmt(t.upto-b):''):'')+'</div></td>'+
     '<td style="text-align:right;font-family:var(--mono)">'+sym+fmt(inT*t.rate/100)+'</td></tr>';prev=t.upto;});}
  var TI=acctTermInfo(a);
  if(TI){I=a.pay_maturity?0:(TI.cur?b*TI.cur.rate/100:0);eff=TI.cur?TI.cur.rate:0;It=acctTHB(a,I,a.balance_date);
    TI.sched.forEach(function(x,i){var cur=TI.cur===x&&!TI.matured,done=TI.month>x.to||TI.matured,mths=x.to-x.from+1,inM=Math.max(0,Math.min(TI.month,x.to)-x.from+1),pct=inM/mths*100;
     rows+='<tr style="'+(cur?'background:var(--primary-bg,rgba(59,130,246,.08));font-weight:700':'')+'"><td>'+(cur?'\u25b6 ':'')+'Month '+x.from+'\u2013'+x.to+'</td><td>'+mths+' mo</td><td style="text-align:right;font-family:var(--mono)">'+x.rate.toFixed(2)+'%</td>'+
      '<td style="min-width:120px"><div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct.toFixed(1)+'%;background:'+(done?'var(--success)':'var(--primary)')+'"></div></div><div style="font-size:9px;color:var(--text3)">'+inM+' / '+mths+' mo</div></td>'+
      '<td style="text-align:right;font-family:var(--mono)">'+sym+fmt(b*x.rate/100*mths/12)+'</td></tr>';});
    rows+='<tr style="font-weight:700;background:var(--bg3)"><td colspan="4">'+(a.pay_maturity?'Paid once at maturity ':'Total over term ')+fmtDate(TI.maturity)+(TI.matured?' \u2714 matured':' \u00b7 month '+TI.month+'/'+TI.term)+'</td><td style="text-align:right;font-family:var(--mono)">'+sym+fmt(TI.total)+'</td></tr>'+
     '<tr><td colspan="4" style="font-size:10px;color:var(--text3)">Accrued so far \u00b7 avg '+TI.avg.toFixed(2)+'% p.a.</td><td style="text-align:right;font-family:var(--mono);font-size:10px">'+sym+fmt(TI.accrued)+'</td></tr>';}
  else if(!T) rows='<tr><td>Flat</td><td>all balance</td><td style="text-align:right;font-family:var(--mono)">'+(+a.rate).toFixed(2)+'%</td><td></td><td style="text-align:right;font-family:var(--mono)">'+sym+fmt(I)+'</td></tr>';
  var hint='';if(TI&&a.pay_maturity&&!TI.matured)hint='<div style="font-size:10px;color:var(--text3);margin-top:4px">\u23f3 No interest until '+fmtDate(TI.maturity)+' \u2014 withdrawing early may lose it</div>';if(T&&!TI){var ci=T.findIndex(function(t){return b<=t.upto;});if(ci<0)ci=T.length-1;if(ci>0&&T[ci].rate<T[0].rate)hint='<div style="font-size:10px;color:#d97706;margin-top:4px">\u26a0\ufe0f Balance above '+sym+fmt(T[ci-1].upto,0)+' earns only '+T[ci].rate.toFixed(2)+'% on the extra \u2014 consider moving it to a higher-rate account</div>';}
  cards+='<div class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:baseline"><h2 style="margin:0">'+esc(a.name)+' <span style="font-size:11px;color:var(--text3);font-weight:400">'+esc((typeof bankName==='function'?bankName(a.bank):a.bank)||'')+(a.rate_date?' \u00b7 since '+fmtDate(a.rate_date):'')+'</span></h2>'+
   '<div style="font-size:12px">Balance <b>'+sym+fmt(b)+'</b> \u00b7 '+(TI&&a.pay_maturity?'At maturity <b style="color:var(--success)">'+sym+fmt(TI.total)+'</b> on '+fmtDate(TI.maturity):'Rate now <b>'+eff.toFixed(2)+'%</b> \u00b7 \u2248 <b style="color:var(--success)">'+sym+fmt(I)+'/yr</b>')+((a.currency||'THB')!=='THB'&&It!=null?' (\u2248\u0e3f'+fmt(It)+')':'')+'</div></div>'+
   '<div class="rec-scroll"><table class="tbl" style="font-size:11px;width:100%;margin-top:6px"><thead><tr><th>'+(TI?'Period':'Tier')+'</th><th>'+(TI?'Length':'Range')+'</th><th style="text-align:right">Rate</th><th>Filled</th><th style="text-align:right">Interest/yr</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+hint+(function(){var L=(D.rate_log||[]).filter(function(x){return x.acct===a.id;}).sort(function(x,y){return x.date<y.date?1:-1;});if(!L.length)return '';return '<details style="margin-top:6px;font-size:11px"><summary style="cursor:pointer;color:var(--text3)">Rate history ('+L.length+')</summary><table class="tbl" style="font-size:10px;width:100%;margin-top:4px"><thead><tr><th>Effective</th><th>Rate</th><th>Entered</th></tr></thead><tbody>'+L.map(function(x,i){return '<tr'+(i===0?' style="font-weight:700"':'')+'><td>'+fmtDate(x.date)+(i===0?' (current)':'')+'</td><td style="font-family:var(--mono)">'+(x.tiers?esc(x.tiers):(+x.rate).toFixed(2)+'%')+'</td><td>'+fmtDate(x.entered||'')+'</td></tr>';}).join('')+'</tbody></table></details>';})()+'</div>';});
 var k='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px">'+
  '<div class="kpi"><div class="kpi-label">Est. interest / yr</div><div class="kpi-val" style="color:var(--success)">\u0e3f'+fmt(totI)+'</div><div style="font-size:9px;color:var(--text3)">\u2248 \u0e3f'+fmt(totI/12)+'/mo</div></div>'+
  '<div class="kpi"><div class="kpi-label">Avg. effective rate</div><div class="kpi-val">'+(totB?(totI/totB*100).toFixed(2):'0.00')+'%</div><div style="font-size:9px;color:var(--text3)">weighted by balance</div></div>'+
  '<div class="kpi"><div class="kpi-label">Accounts with rate</div><div class="kpi-val">'+acc.length+'</div><div style="font-size:9px;color:var(--text3)">'+acc.filter(function(a){return a.rate_tiers;}).length+' tiered</div></div></div>';
 h.innerHTML=k+_dpCard()+fbar+(cards||'<div class="card" style="text-align:center;color:var(--text3)">No interest rates yet \u2014 set them in Accounts (\u270f\ufe0f)</div>')+'<div style="font-size:10px;color:var(--text3)">Estimate on current balance, before tax. \u25b6 = the tier your balance is in now.</div>';}
window.renderInterest=renderInterest;

// ===== Deposit planner (Oct 31 2026): greedy fill by highest marginal rate, respecting tiers + Max Target =====
var _dpAmt='',_dpExcess=true;
function _dpSegments(a){ // [{rate,cap}] THB capacity from current balance upward
 if(acctIsLoan(a)||a.rate_sched)return [];if((a.currency||'THB')!=='THB')return [];
 var b=+a.balance||0,mx=+a.max_amount||Infinity,T=acctParseTiers(a.rate_tiers),segs=[];
 if(!T){if(a.rate===''||a.rate==null)return [];if(mx>b)segs.push({rate:+a.rate,from:b,to:mx});return segs;}
 var prev=0;T.forEach(function(t){var lo=Math.max(prev,b),hi=Math.min(t.upto,mx);if(hi>lo)segs.push({rate:t.rate,from:lo,to:hi});prev=t.upto;});return segs;}
function dpPlan(amount,useExcess){var src=[],pool=+amount||0;
 if(useExcess)(D.accounts||[]).forEach(function(a){if(acctIsLoan(a)||(a.currency||'THB')!=='THB')return;var mx=+a.max_amount||0,b=+a.balance||0;if(mx&&b>mx){src.push({a:a,amt:b-mx});pool+=b-mx;}});
 // tiers of one account must fill IN ORDER (can't reach 1.3% at 5M before filling 0.1% up to 1M) -> pick the best NEXT segment each step
 var Q=[];(D.accounts||[]).forEach(function(a){var s=_dpSegments(a);if(s.length)Q.push({a:a,s:s,i:0});});
 var steps=[],left=pool,guard=0;
 while(left>0.005&&guard++<500){var best=null;Q.forEach(function(q){if(q.i>=q.s.length)return;var r=q.s[q.i].rate;if(!best||r>best.s[best.i].rate)best=q;});if(!best)break;
  var s=best.s[best.i],room=s.to-s.from,put=Math.min(left,room);best.i++;if(put<=0)continue;left-=put;
  var last=steps[steps.length-1];if(last&&last.a===best.a&&last.rate===s.rate){last.amt+=put;last.to=s.to;last.fill=put>=room-0.005;last.int+=put*s.rate/100;}
  else steps.push({a:best.a,rate:s.rate,amt:put,fill:put>=room-0.005,to:s.to,int:put*s.rate/100});}
 return {src:src,pool:pool,steps:steps,left:left,int:steps.reduce(function(t,x){return t+x.int;},0)};}
function dpSet(k,v){if(k==='amt')_dpAmt=v;else _dpExcess=v;renderInterest();}
window.dpPlan=dpPlan;window.dpSet=dpSet;
function _dpCard(){var P=dpPlan(parseFloat(String(_dpAmt).replace(/,/g,''))||0,_dpExcess);
 var h='<div class="card" style="border-color:var(--primary)"><h2 style="margin-top:0"><i class="fa-solid fa-route"></i> Where to deposit</h2>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><label style="font-size:11px">New money (\u0e3f)</label><input class="inp inp-num" style="width:140px" inputmode="decimal" value="'+esc(String(_dpAmt))+'" placeholder="e.g. 50000" onchange="dpSet(\'amt\',this.value)">'+
 '<label style="font-size:11px;display:flex;gap:4px;align-items:center;cursor:pointer"><input type="checkbox"'+(_dpExcess?' checked':'')+' onchange="dpSet(\'ex\',this.checked)"> also move money above Max Target</label></div>';
 if(P.src.length)h+='<div style="font-size:11px;margin-bottom:6px"><b>Step 0 \u2014 take out excess over Max Target:</b> '+P.src.map(function(s){return esc(s.a.name)+' \u0e3f'+fmt(s.amt);}).join(', ')+'</div>';
 if(!P.pool){h+='<div style="font-size:11px;color:var(--text3)">Enter an amount to see the best allocation.</div></div>';return h;}
 h+='<div class="rec-scroll"><table class="tbl" style="font-size:11px;width:100%"><thead><tr><th>Step</th><th>Deposit to</th><th style="text-align:right">Amount</th><th style="text-align:right">Rate</th><th>Why stop</th><th style="text-align:right">Interest/yr</th></tr></thead><tbody>'+
  P.steps.map(function(s,i){var mx=+s.a.max_amount||0,why=!s.fill?'all money placed':(mx&&Math.abs(s.to-mx)<0.01?'reached Max Target \u0e3f'+fmt(mx,0):'tier full at \u0e3f'+fmt(s.to,0)+' \u2192 rate drops');
   return '<tr><td>'+(i+1)+'</td><td style="font-weight:600">'+esc(s.a.name)+' <span style="font-weight:400;color:var(--text3)">'+esc((typeof bankName==='function'?bankName(s.a.bank):s.a.bank)||'')+'</span></td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(s.amt)+'</td><td style="text-align:right;font-family:var(--mono)">'+s.rate.toFixed(2)+'%</td><td style="font-size:10px;color:var(--text3)">'+why+'</td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(s.int)+'</td></tr>';}).join('')+
  '<tr style="font-weight:700;background:var(--bg3)"><td colspan="2">Total</td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(P.pool-P.left)+'</td><td style="text-align:right;font-family:var(--mono)">'+((P.pool-P.left)?(P.int/(P.pool-P.left)*100).toFixed(2):'0.00')+'%</td><td></td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(P.int)+'</td></tr></tbody></table></div>'+
  (P.left>0.005?'<div style="font-size:11px;color:#d97706;margin-top:4px">\u26a0\ufe0f \u0e3f'+fmt(P.left)+' left over \u2014 every account is at its Max Target. Raise a target or add an account.</div>':'')+
  (function(){var used={};P.steps.forEach(function(s){used[s.a.id]=1;});var minR=P.steps.length?P.steps[P.steps.length-1].rate:0,L=[];
   (D.accounts||[]).forEach(function(a){if(used[a.id]||acctIsLoan(a))return;var r=a.rate_sched?(function(){var ti=acctTermInfo(a);return ti&&ti.cur?ti.cur.rate:(acctParseSched(a.rate_sched)||[{rate:0}])[0].rate;})():(acctParseTiers(a.rate_tiers)?Math.max.apply(null,acctParseTiers(a.rate_tiers).map(function(t){return t.rate;})):+a.rate||0);
    if(r<=minR)return;var why=(a.currency||'THB')!=='THB'?'foreign currency ('+(a.currency)+')':a.rate_sched?'fixed-term / by-month account':(+a.max_amount&&(+a.balance||0)>=+a.max_amount)?'already at Max Target \u0e3f'+fmt(+a.max_amount,0):'higher-rate tier already full';L.push({a:a,r:r,why:why});});
   L.sort(function(x,y){return y.r-x.r;});if(!L.length)return '';
   return '<div style="font-size:10px;margin-top:6px"><b>Higher-rate accounts not used:</b><ul style="margin:2px 0 0 16px;padding:0">'+L.map(function(x){return '<li>'+esc(x.a.name)+' '+x.r.toFixed(2)+'% \u2014 '+x.why+'</li>';}).join('')+'</ul></div>';})()+
  '<div style="font-size:9px;color:var(--text3);margin-top:4px">THB accounts only, highest rate first. Skips loans, foreign-currency and by-month/maturity (fixed-term) accounts. Interest is a yearly estimate before tax.</div></div>';
 return h;}
