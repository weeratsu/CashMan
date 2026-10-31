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
 try{if(tab==='list')renderBankAccount();else if(tab==='bal')renderBalances();else if(tab==='fx')renderCurrencyFx();}catch(e){console.error('swAcct',e)}}
window.swAcct=swAcct;
