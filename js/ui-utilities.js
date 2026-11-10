// ui-utilities.js — Utilities (electric/water) analysis + Bills integration
// Reads window.UTILITY_DATA (written by UtilityLog/parse_utility.py as data/utility_log.js).
// Shows KPIs, usage charts (kWh / m3), cost charts, YoY comparison, a bills table, and
// integrates with Bills Reminder: update recurring forecast to the 12-month actual average,
// and add an unpaid utility bill into the ledger / recurring.
// No personal data hardcoded — all data comes from UTILITY_DATA (generated on the user's machine).

var _utilFilter = 'all';      // all | electric | water
var _utilYear = 'all';        // 'all' or a specific year (YYYY)
var _utilChartUnit = null;    // Highcharts instances (destroyed on re-render)
var _utilChartCost = null;
var _utilChartYoY = null;
var _utilExpanded = {};       // bill-key -> true when its detail row is open
var _utilSynced = false;      // auto-sync-to-Planned runs once per page load

function _utilKey(b){ return (b.utility||'')+'|'+(b.period||'')+'|'+(b.ref||''); }
function utilToggleRow(key){ _utilExpanded[key] = !_utilExpanded[key]; renderUtilities(); }

function _utilData(){
  var d = (typeof window !== 'undefined' && window.UTILITY_DATA) ? window.UTILITY_DATA : null;
  var leg=(typeof window!=='undefined'&&window.UTILITY_LEGACY&&window.UTILITY_LEGACY.bills)||[];
  if(!d || !d.bills){ if(!leg.length) return {generated_at:'', bill_count:0, bills:[]}; d={generated_at:'',bills:[]}; }
  if(!leg.length) return d;
  var have={}; d.bills.forEach(function(b){ have[(b.utility||'')+'|'+(b.period||'')]=1; });
  var add=leg.filter(function(b){ return !have[b.utility+'|'+b.period]; });
  if(!add.length) return d;
  var out=Object.assign({},d); out.bills=d.bills.concat(add); out.bill_count=out.bills.length; return out;
}

function _utilPills(sm){
  var L=[['all','All'],['electric','\u26a1 Electric'],['water','\ud83d\udca7 Water']], fs=sm?'11px':'12px', pd=sm?'3px 10px':'5px 12px';
  return '<span style="display:inline-flex;gap:4px">'+L.map(function(x){ var on=_utilFilter===x[0];
    return '<button type="button" onclick="setUtilFilter(\''+x[0]+'\')" style="border:1px solid '+(on?'var(--primary,#3b82f6)':'var(--border,#d0d5e0)')+';background:'+(on?'var(--primary,#3b82f6)':'transparent')+';color:'+(on?'#fff':'var(--text2,#4a5068)')+';border-radius:999px;padding:'+pd+';font-size:'+fs+';font-weight:600;cursor:pointer">'+x[1]+'</button>'; }).join('')+'</span>';
}
function setUtilFilter(v){_utilFilter=v||'all';renderUtilities();}
function setUtilYear(v){_utilYear=v||'all';renderUtilities();}

// group bills by period, applying the current filter
function _utilBills(){
  var bills=_utilData().bills.slice();
  if(_utilFilter!=='all') bills=bills.filter(function(b){return b.utility===_utilFilter;});
  if(_utilYear!=='all') bills=bills.filter(function(b){return (b.period||'').slice(0,4)===_utilYear;});
  // overlay manual-paid marks (stored in CashMan localStorage, survives parser re-runs)
  var mp=(typeof D!=='undefined'&&D&&D.util_manual_paid)?D.util_manual_paid:{};
  bills=bills.map(function(b){
    var mk=(b.utility||'')+'|'+(b.period||'');
    if(!b.paid && mp[mk]){
      var c=Object.assign({},b);
      c.paid=true; c.paid_date=mp[mk].paid_date||''; c._manualPaid=true;
      return c;
    }
    return b;
  });
  return bills;
}

function _utilYears(){
  var ys={};
  _utilData().bills.forEach(function(b){var y=(b.period||'').slice(0,4);if(y)ys[y]=1;});
  return Object.keys(ys).sort();
}

// 12-month trailing average amount for a utility (for the recurring forecast update)
function _utilAvg(utility, months){
  months=months||12;
  var bills=_utilData().bills.filter(function(b){return b.utility===utility && b.amount!=null && b.period;});
  bills.sort(function(a,b){return a.period<b.period?1:-1;}); // newest first
  var take=bills.slice(0,months);
  if(!take.length) return null;
  var sum=take.reduce(function(s,b){return s+(b.amount||0);},0);
  return sum/take.length;
}

function renderUtilities(){
  var host=document.getElementById('utilities-content');
  if(!host) return;
  var data=_utilData();
  if(!data.bills.length){
    host.innerHTML='<div class="card"><h2><i class="fa-solid fa-bolt"></i> Utilities</h2>'+
      '<p class="text-muted" style="font-size:12px;line-height:1.6">No utility data found yet.<br>'+
      'Run <code>UtilityLog/scripts/run_utility_rebuild.bat</code> on your PC to generate '+
      '<code>data/utility_log.js</code>, then reload CashMan.</p></div>';
    return;
  }
  // auto-sync all bills into Planned once per page load (dedup inside) so Calendar/Timeline reflect them
  if(!_utilSynced){ _utilSynced=true; try{ utilAutoSyncPlanned(); }catch(e){ console.error('utilAutoSyncPlanned:',e); } }
  var bills=_utilBills();

  // ---- KPIs ----
  var elec=bills.filter(function(b){return b.utility==='electric';});
  var water=bills.filter(function(b){return b.utility==='water';});
  function avg(arr){if(!arr.length)return 0;return arr.reduce(function(s,b){return s+(b.amount||0);},0)/arr.length;}
  function mx(arr){return arr.reduce(function(m,b){return Math.max(m,b.amount||0);},0);}
  function avgUnit(arr){var u=arr.filter(function(b){return b.units;});if(!u.length)return 0;var tc=u.reduce(function(s,b){return s+(b.amount||0);},0);var tu=u.reduce(function(s,b){return s+(b.units||0);},0);return tu?tc/tu:0;}
  var thisYear=String(new Date().getFullYear());
  var ytdElec=elec.filter(function(b){return (b.period||'').slice(0,4)===thisYear;}).reduce(function(s,b){return s+(b.amount||0);},0);
  var ytdWater=water.filter(function(b){return (b.period||'').slice(0,4)===thisYear;}).reduce(function(s,b){return s+(b.amount||0);},0);

  var kpi='<div class="kpi-grid">'+
    '<div class="kpi"><div class="kpi-label">Avg Electric / mo</div><div class="kpi-val">\u0e3f'+fmt(avg(elec))+'</div><div class="kpi-note">'+elec.length+' bills</div></div>'+
    '<div class="kpi"><div class="kpi-label">Avg Water / mo</div><div class="kpi-val">\u0e3f'+fmt(avg(water))+'</div><div class="kpi-note">'+water.length+' bills</div></div>'+
    '<div class="kpi"><div class="kpi-label">Max Electric</div><div class="kpi-val">\u0e3f'+fmt(mx(elec))+'</div></div>'+
    '<div class="kpi"><div class="kpi-label">Avg \u0e3f/kWh</div><div class="kpi-val">'+avgUnit(elec).toFixed(2)+'</div><div class="kpi-note">electric</div></div>'+
    '<div class="kpi"><div class="kpi-label">Avg \u0e3f/m\u00b3</div><div class="kpi-val">'+avgUnit(water).toFixed(2)+'</div><div class="kpi-note">water</div></div>'+
    '<div class="kpi"><div class="kpi-label">YTD '+thisYear+'</div><div class="kpi-val">\u0e3f'+fmt(ytdElec+ytdWater)+'</div><div class="kpi-note">\u26a1\u0e3f'+fmt(ytdElec)+' \u00b7 \ud83d\udca7\u0e3f'+fmt(ytdWater)+'</div></div>'+
    '</div>';

  // ---- filter bar ----
  var years=_utilYears();
  var fb='<div class="filterbar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'+
    '<label>Utility</label>'+_utilPills()+
    '<label>Year</label><select class="sel" onchange="setUtilYear(this.value)">'+
      '<option value="all"'+(_utilYear==='all'?' selected':'')+'>All years</option>'+
      years.map(function(y){return '<option value="'+y+'"'+(_utilYear===y?' selected':'')+'>'+y+'</option>';}).join('')+
    '</select></div>';

  // ---- integration card ----
  var avgE=_utilAvg('electric',12), avgW=_utilAvg('water',12);
  var _ulGen=(_utilData().generated_at||'').replace('T',' ').slice(0,16);
  var refreshBar='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:10px;color:var(--text3)">'+
    '<button class="btn btn-ghost" style="font-size:10px;padding:4px 10px" onclick="utilRefresh()" title="Reload the latest bills written by run_utility.bat"><i class="fa-solid fa-rotate-right"></i> Refresh bills</button>'+
    '<span>UtilityLog updated: '+(_ulGen||'-')+'</span></div>';
  var integ='<details class="card" style="padding-top:10px;padding-bottom:10px"><summary style="cursor:pointer;font-weight:600;font-size:13px"><i class="fa-solid fa-link"></i> Bills Reminder Integration</summary><div style="margin-top:8px">'+
    '<p class="text-muted" style="font-size:10px;margin-bottom:8px">Keep your recurring forecast accurate using the real 12-month average, and push unpaid bills into Bills Reminder.</p>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    (avgE!=null?'<button class="btn btn-ghost" onclick="utilUpdateRecurring(\'electric\')">Update \u26a1 recurring \u2192 \u0e3f'+fmt(avgE)+'/mo</button>':'')+
    (avgW!=null?'<button class="btn btn-ghost" onclick="utilUpdateRecurring(\'water\')">Update \ud83d\udca7 recurring \u2192 \u0e3f'+fmt(avgW)+'/mo</button>':'')+
    '</div></div></details>';

  // ---- charts ----
  var charts='<div class="card"><h2><i class="fa-solid fa-chart-line"></i> Monthly utilities</h2><div id="util-opt-main" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:-4px 0 6px">'+_utilMainBar()+'</div><div id="util-chart-unit" class="chart-box"></div></div>'+
    '<div class="card"><h2><i class="fa-solid fa-calendar-week"></i> Year-over-year (cost)</h2><div id="util-opt-yoy" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:-4px 0 6px">'+_utilYoyBar()+'</div><div id="util-chart-yoy" class="chart-box"></div></div>'+
    '<div class="card"><h2><i class="fa-solid fa-sun"></i> Seasonal average (by month, all years)</h2><div id="util-opt-season" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:-4px 0 6px">'+_utilSeasonBar()+'</div><div id="util-chart-season" class="chart-box"></div><div id="util-season-tbl" style="overflow-x:auto;margin-top:6px"></div></div>';

  // ---- table ----
  var rows=bills.slice().sort(function(a,b){return (a.period<b.period?1:-1);}).map(function(b){
    var icon=b.utility==='electric'?'\u26a1':'\ud83d\udca7';
    var unitLbl=b.utility==='electric'?'kWh':'m\u00b3';
    var paidTag= b.paid
      ? (b._manualPaid
          ? '<span class="tag" style="background:var(--purple-bg);color:var(--purple)">Paid (manual)</span>'
          : '<span class="tag tag-active">Paid</span>')
      : '<span class="tag tag-planned">Unpaid</span>';
    var actBtn;
    if(!b.paid){
      actBtn='<button class="btn btn-ghost" style="font-size:9px;padding:3px 7px" onclick="utilMarkPaid(\''+b.utility+'\',\''+(b.period||'')+'\')">Mark paid</button>';
    }else if(b._manualPaid){
      actBtn='<button class="btn btn-ghost" style="font-size:9px;padding:3px 7px" onclick="utilUnmarkPaid(\''+b.utility+'\',\''+(b.period||'')+'\')">Unmark</button>';
    }else{
      actBtn='';
    }
    var key=_utilKey(b);
    var open=!!_utilExpanded[key];
    var chev='<i class="fa-solid fa-chevron-'+(open?'down':'right')+'" style="font-size:8px;color:var(--text3);margin-right:5px"></i>';
    var row='<tr style="cursor:pointer" onclick="utilToggleRow(\''+key.replace(/'/g,"\\'")+'\')">'+
      '<td>'+chev+icon+' '+(b.period||'-')+'</td>'+
      '<td class="r">\u0e3f'+fmt(b.amount||0)+'</td>'+
      '<td class="r">'+(b.units!=null?b.units+' '+unitLbl:'-')+'</td>'+
      '<td class="r">'+(b.ft!=null?b.ft:'-')+'</td>'+
      '<td>'+(_utilIssueDate(b)?fmtDate(_utilIssueDate(b)):'-')+'</td>'+
      '<td>'+(b.due_date?fmtDate(b.due_date):'-')+'</td>'+
      '<td>'+paidTag+'</td>'+
      '<td>'+(b.paid_date?fmtDate(b.paid_date):'-')+'</td>'+
      '<td onclick="event.stopPropagation()" style="white-space:nowrap">'+_utilDocIcons(b)+'</td>'+
      '<td onclick="event.stopPropagation()">'+actBtn+'</td>'+
    '</tr>';
    if(open) row+=_utilDetailRow(b);
    return row;
  }).join('');
  var _ufOpts=['all','electric','water'].map(function(uu){return '<option value="'+uu+'"'+(_utilFilter===uu?' selected':'')+'>'+(uu==='all'?'All':uu==='electric'?'\u26a1 Electric':'\ud83d\udca7 Water')+'</option>';}).join('');
  var table='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px"><h2 style="margin:0"><i class="fa-solid fa-table-list"></i> All bills ('+bills.length+')</h2>'+
    '<div style="display:flex;align-items:center;gap:8px">'+_utilPills(1)+'<select class="sel" style="font-size:11px" onchange="setUtilYear(this.value)"><option value="all"'+(_utilYear==='all'?' selected':'')+'>All years</option>'+years.map(function(y){return '<option value="'+y+'"'+(_utilYear===y?' selected':'')+'>'+y+'</option>';}).join('')+'</select></div>'+
    '</div>'+
    '<div style="overflow-x:auto"><table class="tbl"><thead><tr>'+
    '<th>Period</th><th class="r">Amount</th><th class="r">Usage</th><th class="r">Ft</th><th>Due date</th><th>Deadline</th><th>Status</th><th>Paid date</th><th>Docs</th><th></th>'+
    '</tr></thead><tbody>'+table_rows_guard(rows)+'</tbody></table></div></div>';

  host.innerHTML=refreshBar+kpi+charts+table+integ;

  // draw charts after DOM is in place
  setTimeout(_utilDrawCharts, 30);
}

/* Due (bill issue date) uses the same rule as utilAutoSyncPlanned: water=invoice_date, electric=meter_date,
   fallback due_date. Deadline = printed payment-due date (b.due_date). */
function _utilIssueDate(b){ return (b.utility==='water'?(b.invoice_date||b.meter_date):(b.meter_date||b.invoice_date))||b.due_date||''; }
function table_rows_guard(rows){return rows||'<tr><td colspan="10" class="text-muted">No bills for this filter</td></tr>';}

// Expandable detail row — shows every raw field the parser captured for one bill.
function _utilDetailRow(b){
  function money(v){ return v!=null ? '\u0e3f'+fmt(v) : '-'; }
  function raw(v){ return v!=null && v!=='' ? v : '-'; }
  // Render a bill document (invoice/receipt) as a clickable file:// link when the parser stored a
  // full path; otherwise show the filename as plain text (web/iPhone build has no local file access).
  function fileLink(name,path){
    if(!name) return '-';
    if(path){
      return '<a href="#" data-src="'+esc(_utilFileUrl(path))+'" onclick="event.stopPropagation();utilViewDoc(this.getAttribute(\'data-src\'),event);return false;" title="Open '+esc(name)+'" style="color:var(--primary);text-decoration:underline">'+esc(name)+'</a>';
    }
    return esc(name);
  }
  var isElec=b.utility==='electric';
  var unitLbl=isElec?'kWh':'m\u00b3';
  var items=[];
  items.push(['Meter reading date', b.meter_date?fmtDate(b.meter_date):'-']);
  items.push(['Meter now', raw(b.meter_now)]);
  items.push(['Meter prev', raw(b.meter_prev)]);
  items.push(['Usage', b.units!=null?(b.units+' '+unitLbl):'-']);
  items.push([isElec?'CA / Ref No.1':'Account No.', raw(b.ca_no)]);
  if(isElec){ items.push(['Installation', raw(b.installation)]); }
  if(isElec){
    items.push(['Energy charge', money(b.energy_charge)]);
    items.push(['Service fee', money(b.service_fee)]);
    items.push(['Ft rate', raw(b.ft)]);
    items.push(['Ft amount', money(b.ft_amount)]);
    items.push(['Charge (pre-VAT)', money(b.charge)]);
  } else {
    items.push(['Water charge', money(b.water_charge)]);
  }
  items.push(['VAT', money(b.vat)]);
  items.push(['Total', money(b.amount)]);
  items.push(['Invoice no.', raw(b.invoice_no||b.ref)]);
  items.push(['Due date', b.due_date?fmtDate(b.due_date):'-']);
  items.push(['Invoice date', b.invoice_date?fmtDate(b.invoice_date):'-']);
  items.push(['Paid date', b.paid_date?fmtDate(b.paid_date):'-']);
  items.push(['Invoice file', fileLink(b.invoice_file,b.invoice_path)]);
  items.push(['Receipt file', fileLink(b.receipt_file,b.receipt_path)]);
  var cells=items.map(function(it){
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid var(--border)">'+
      '<span style="color:var(--text3);font-size:10px">'+it[0]+'</span>'+
      '<span style="font-family:var(--mono);font-size:10px;text-align:right;word-break:break-all">'+it[1]+'</span></div>';
  }).join('');
  return '<tr><td colspan="10" style="background:var(--bg3);padding:10px 14px">'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 18px">'+cells+'</div>'+
    '</td></tr>';
}

function _utilMonthKeys(){
  // all YYYY-MM present, sorted ascending
  var ks={};
  _utilData().bills.forEach(function(b){if(b.period)ks[b.period]=1;});
  return Object.keys(ks).sort();
}

var _utilOptKey='cm_util_chart_opt';
function _utilOpts(){ var d={unit:{electric:true,water:true,avg:false,trend:false},cost:{electric:true,water:true,avg:false,trend:false}}; try{ var s=JSON.parse(localStorage.getItem(_utilOptKey)||'{}'); ['unit','cost'].forEach(function(k){ if(s[k]) Object.assign(d[k],s[k]); }); }catch(e){} return d; }
function _utilOptBar(k){
  var o=_utilOpts()[k], L=[['electric','\u26a1 '+(k==='unit'?'kWh':'Electric')],['water','\ud83d\udca7 '+(k==='unit'?'m\u00b3':'Water')],['avg','Average'],['trend','Trend']];
  return L.map(function(x){ return '<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" '+(o[x[0]]?'checked':'')+' onchange="utilSetChartOpt(\''+k+'\',\''+x[0]+'\',this.checked)">'+x[1]+'</label>'; }).join('');
}
function utilSetChartOpt(k,key,v){ var o=_utilOpts(); o[k][key]=v; if(!o[k].electric&&!o[k].water){ o[k][key==='electric'?'water':'electric']=true; } localStorage.setItem(_utilOptKey,JSON.stringify(o)); var el=document.getElementById('util-opt-'+k); if(el) el.innerHTML=_utilOptBar(k); _utilDrawCharts(); }
window.utilSetChartOpt=utilSetChartOpt;
function _utilExtras(data,name,color,yAxis,opt){
  var out=[], pts=[]; data.forEach(function(v,i){ if(v!=null) pts.push([i,v]); }); if(!pts.length) return out;
  if(opt.avg){ var a=pts.reduce(function(s,p){return s+p[1];},0)/pts.length;
    out.push({name:name+' avg '+Math.round(a).toLocaleString('en-US'),type:'line',data:data.map(function(){return Math.round(a*100)/100;}),color:color,dashStyle:'Dash',lineWidth:1.5,marker:{enabled:false},enableMouseTracking:false,yAxis:yAxis}); }
  if(opt.trend && pts.length>1){ var n=pts.length,sx=0,sy=0,sxy=0,sxx=0; pts.forEach(function(p){sx+=p[0];sy+=p[1];sxy+=p[0]*p[1];sxx+=p[0]*p[0];});
    var m=(n*sxy-sx*sy)/((n*sxx-sx*sx)||1), b=(sy-m*sx)/n;
    out.push({name:name+' trend',type:'line',data:[[pts[0][0],Math.round((m*pts[0][0]+b)*100)/100],[pts[n-1][0],Math.round((m*pts[n-1][0]+b)*100)/100]],color:color,dashStyle:'ShortDot',lineWidth:2,marker:{enabled:false},enableMouseTracking:false,yAxis:yAxis}); }
  return out;
}
function _utilPill(on,label,click){ return '<button type="button" onclick="'+click+'" style="border:1px solid '+(on?'var(--primary,#3b82f6)':'var(--border,#d0d5e0)')+';background:'+(on?'var(--primary,#3b82f6)':'transparent')+';color:'+(on?'#fff':'var(--text2,#4a5068)')+';border-radius:999px;padding:3px 11px;font-size:11px;font-weight:600;cursor:pointer">'+label+'</button>'; }
function _utilMainOpt(){ var d={metric:'cost',electric:true,water:true,avg:false,trend:false,years:null,scope:'all',from:'',to:'',labels:false,yoyUtil:'all',yoyLabels:false}; try{ Object.assign(d,JSON.parse(localStorage.getItem('cm_util_main_opt')||'{}')); }catch(e){} return d; }
function _utilMainSave(o){ localStorage.setItem('cm_util_main_opt',JSON.stringify(o)); }
function _utilRangeSel(o){ var ms=_utilMonthKeys(); if(!ms.length) return '';
  var opt=function(sel,first){ return ms.map(function(m){ return '<option value="'+m+'"'+(m===sel?' selected':'')+'>'+m+'</option>'; }).join(''); };
  var f=o.from&&ms.indexOf(o.from)>=0?o.from:ms[0], t=o.to&&ms.indexOf(o.to)>=0?o.to:ms[ms.length-1], st='font-size:11px;padding:2px 4px';
  return '<span style="display:inline-flex;gap:4px;align-items:center;font-size:11px;color:var(--text3)"><select class="sel" style="'+st+'" onchange="utilMainSet(\'from\',this.value)">'+opt(f)+'</select> - <select class="sel" style="'+st+'" onchange="utilMainSet(\'to\',this.value)">'+opt(t)+'</select>'
    +(function(){ var L=ms.length, fi=ms.indexOf(f), atEnd=(t===ms[L-1]), n=ms.indexOf(t)-fi+1; return _utilPill(atEnd&&n===Math.min(12,L)&&L>12,'12m',"utilMainSet('range',12)")+_utilPill(atEnd&&n===Math.min(36,L)&&L>36,'3y',"utilMainSet('range',36)")+_utilPill(atEnd&&fi===0,'All',"utilMainSet('range',0)"); })()+'</span>'; }
function _utilDL(on,dec){ return {enabled:!!on,style:{fontSize:'9px',fontWeight:'600',textOutline:'none'},formatter:function(){ return this.y==null?'':Number(this.y).toLocaleString('en-US',{maximumFractionDigits:dec}); }}; }
function _utilMainBar(){
  var o=_utilMainOpt(), sep='<span style="width:1px;height:18px;background:var(--border,#d0d5e0)"></span>';
  return '<span style="display:inline-flex;gap:4px">'+_utilPill(o.metric==='cost','\u0e3f Cost',"utilMainSet('metric','cost')")+_utilPill(o.metric==='units','Usage',"utilMainSet('metric','units')")+'</span>'+sep
    +'<span style="display:inline-flex;gap:4px">'+_utilPill(o.electric,'\u26a1 Electric',"utilMainSet('electric')")+_utilPill(o.water,'\ud83d\udca7 Water',"utilMainSet('water')")+'</span>'+sep
    +(window.VILLAGEMAN_DATA?('<span style="display:inline-flex;gap:4px" title="Electric only - split from VillageMan central readings">'+_utilPill(o.scope==='home','\ud83c\udfe0 Home',"utilMainSet('scope','home')")+_utilPill(o.scope==='central','\ud83c\udfd8\ufe0f Central',"utilMainSet('scope','central')")+_utilPill(o.scope==='all','All',"utilMainSet('scope','all')")+'</span>'+sep):'')+'<span style="display:inline-flex;gap:4px">'+_utilPill(o.avg,'Average',"utilMainSet('avg')")+_utilPill(o.trend,'Trend',"utilMainSet('trend')")+_utilPill(o.labels,'123',"utilMainSet('labels')")+'</span>'+sep+_utilRangeSel(o);
}
function utilMainSet(k,v){ var o=_utilMainOpt(); if(k==='metric') o.metric=v; else if(k==='scope') o.scope=v; else if(k==='from'||k==='to') o[k]=v; else if(k==='range'){ var ms=_utilMonthKeys(); o.to=''; o.from=v?ms[Math.max(0,ms.length-v)]:''; } else if(k==='yoyUtil') o.yoyUtil=v; else if(k==='labels'||k==='yoyLabels') o[k]=!o[k]; else { o[k]=!o[k]; if(!o.electric&&!o.water) o[k==='electric'?'water':'electric']=true; } _utilMainSave(o); var el=document.getElementById('util-opt-main'); if(el) el.innerHTML=_utilMainBar(); var ey=document.getElementById('util-opt-yoy'); if(ey) ey.innerHTML=_utilYoyBar(); _utilDrawCharts(); }
function _utilAllYears(){ var ys={}; _utilData().bills.forEach(function(b){ if(b.period) ys[b.period.slice(0,4)]=1; }); return Object.keys(ys).sort(); }
function _utilYoySel(){ var all=_utilAllYears(), o=_utilMainOpt(); var y=(o.years&&o.years.length)?o.years.filter(function(x){return all.indexOf(x)>=0;}):all.slice(-3); return y.length?y:all.slice(-3); }
function _utilYoyBar(){ var sel=_utilYoySel(), o=_utilMainOpt(), sep='<span style="width:1px;height:18px;background:var(--border,#d0d5e0)"></span>'; return _utilPill(o.yoyUtil==='all','All',"utilMainSet('yoyUtil','all')")+_utilPill(o.yoyUtil==='electric','\u26a1 Electric',"utilMainSet('yoyUtil','electric')")+_utilPill(o.yoyUtil==='water','\ud83d\udca7 Water',"utilMainSet('yoyUtil','water')")+_utilPill(o.yoyLabels,'123',"utilMainSet('yoyLabels')")+sep+_utilAllYears().map(function(y){ return _utilPill(sel.indexOf(y)>=0,y,"utilYoyToggle('"+y+"')"); }).join('')+'<span style="width:1px;height:18px;background:var(--border,#d0d5e0)"></span>'+_utilPill(false,'All',"utilYoyToggle('*')")+_utilPill(false,'Last 3',"utilYoyToggle('3')"); }
function utilYoyToggle(y){ var o=_utilMainOpt(), all=_utilAllYears(), sel=_utilYoySel();
  if(y==='*') sel=all.slice(); else if(y==='3') sel=all.slice(-3); else { var i=sel.indexOf(y); if(i>=0){ if(sel.length>1) sel.splice(i,1); } else sel.push(y); }
  o.years=sel.sort(); _utilMainSave(o); var el=document.getElementById('util-opt-yoy'); if(el) el.innerHTML=_utilYoyBar(); _utilDrawCharts(); }
window.utilMainSet=utilMainSet; window.utilYoyToggle=utilYoyToggle;
var _utilChartSeason=null;
function _utilSeasonOpt(){ var d={metric:'units',utility:'electric',scope:'all',labels:false}; try{ Object.assign(d,JSON.parse(localStorage.getItem('cm_util_season_opt')||'{}')); }catch(e){} return d; }
function _utilSeasonBar(){ var o=_utilSeasonOpt(), sep='<span style="width:1px;height:18px;background:var(--border,#d0d5e0)"></span>';
  return '<span style="display:inline-flex;gap:4px">'+_utilPill(o.metric==='units','Usage',"utilSeasonSet('metric','units')")+_utilPill(o.metric==='amount','\u0e3f Cost',"utilSeasonSet('metric','amount')")+'</span>'+sep
   +'<span style="display:inline-flex;gap:4px">'+_utilPill(o.utility==='electric','\u26a1 Electric',"utilSeasonSet('utility','electric')")+_utilPill(o.utility==='water','\ud83d\udca7 Water',"utilSeasonSet('utility','water')")+'</span>'+((o.utility==='electric'&&window.VILLAGEMAN_DATA)?sep+'<span style="display:inline-flex;gap:4px">'+_utilPill(o.scope==='home','\ud83c\udfe0 Home',"utilSeasonSet('scope','home')")+_utilPill(o.scope==='central','\ud83c\udfd8\ufe0f Central',"utilSeasonSet('scope','central')")+_utilPill(o.scope==='all','All',"utilSeasonSet('scope','all')")+'</span>':'')+sep+_utilPill(o.labels,'123',"utilSeasonSet('labels',"+(!o.labels)+")"); }
function utilSeasonSet(k,v){ var o=_utilSeasonOpt(); o[k]=(v==='true')?true:(v==='false')?false:v; localStorage.setItem('cm_util_season_opt',JSON.stringify(o)); var el=document.getElementById('util-opt-season'); if(el) el.innerHTML=_utilSeasonBar(); _utilDrawCharts(); }
window.utilSeasonSet=utilSeasonSet;
function _utilDrawSeason(common,txtColor){
  var o=_utilSeasonOpt(), MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var by=[]; for(var i=0;i<12;i++) by.push([]);
  _utilData().bills.forEach(function(b){ if(b.utility!==o.utility||!b.period) return; var v=Number(b[o.metric]); if(!(v>0)) return; var sc=(o.utility==='electric')?(o.scope||'all'):'all'; if(sc!=='all'){ var cm=_utilCentralMap()[b.period], cv=cm?(Number(cm[o.metric==='units'?'units':'amount'])||0):0; if(sc==='central'){ if(!cm) return; v=cv; } else v=v-cv; if(!(v>0)) return; } by[parseInt(b.period.slice(5,7),10)-1].push(v); });
  var st=by.map(function(a){ if(!a.length) return null; var s=a.reduce(function(x,y){return x+y;},0); return {avg:s/a.length,min:Math.min.apply(null,a),max:Math.max.apply(null,a),n:a.length}; });
  var dec=o.metric==='units'?0:2, col=o.utility==='electric'?'#d97706':'#0891b2', unit=o.metric==='units'?(o.utility==='electric'?'kWh':'m\u00b3'):'\u0e3f';
  var all=st.filter(Boolean), ov=all.length?all.reduce(function(s,x){return s+x.avg;},0)/all.length:null;
  if(_utilChartSeason){try{_utilChartSeason.destroy()}catch(e){}_utilChartSeason=null;}
  // Nov 10 2026: other pages call renderUtilities() in the background; building this range chart in a
  // hidden container throws "reading 'stacks'" (highcharts-more). Only build it when it is on screen.
  var _sc=document.getElementById('util-chart-season');if(!_sc||!_sc.offsetParent)return;
  _utilChartSeason=Highcharts.chart('util-chart-season',Object.assign({},common,{
    // Nov 10 2026: no window-resize reflow / animation — other pages re-render while this chart sits hidden,
    // and a pending reflow on a destroyed/hidden range series threw "reading 'stacks'" (highcharts-more).
    chart:Object.assign({},common.chart||{},{reflow:false,animation:false}),plotOptions:Object.assign({},common.plotOptions||{},{series:Object.assign({},(common.plotOptions||{}).series||{},{animation:false})}),
    title:{text:null}, xAxis:{categories:MON,labels:{style:{color:txtColor}}},
    yAxis:{title:{text:unit,style:{color:txtColor}},labels:{style:{color:txtColor}},
      plotLines:ov!=null?[{value:ov,color:col,dashStyle:'Dash',width:1.5,label:{text:'avg '+ov.toLocaleString('en-US',{maximumFractionDigits:dec}),align:'right',style:{color:col,fontSize:'10px'}}}]:[]},
    tooltip:{shared:true,valueDecimals:dec},
    series:[{name:'Min-Max',type:'areasplinerange',data:st.map(function(s){return s?[Math.round(s.min*100)/100,Math.round(s.max*100)/100]:null;}),color:col,fillOpacity:0.15,lineWidth:0,marker:{enabled:false}},
            {name:'Average',type:'spline',data:st.map(function(s){return s?Math.round(s.avg*100)/100:null;}),color:col,lineWidth:3,marker:{radius:4},dataLabels:_utilDL(o.labels,dec)}]
  }));
  var hi=-1,lo=-1; st.forEach(function(s,i){ if(!s) return; if(hi<0||s.avg>st[hi].avg) hi=i; if(lo<0||s.avg<st[lo].avg) lo=i; });
  var f=function(v){ return v==null?'-':v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}); };
  var t='<table class="tbl" style="font-size:11px"><thead><tr><th></th>'+MON.map(function(m){return '<th class="r">'+m+'</th>';}).join('')+'</tr></thead><tbody>'
   +'<tr><td>Avg</td>'+st.map(function(s,i){ return '<td class="r" style="'+(i===hi?'color:var(--error,#dc2626);font-weight:700':i===lo?'color:var(--success,#16a34a);font-weight:700':'')+'">'+f(s&&s.avg)+'</td>'; }).join('')+'</tr>'
   +'<tr><td class="text-muted">Years</td>'+st.map(function(s){return '<td class="r text-muted">'+(s?s.n:'-')+'</td>';}).join('')+'</tr></tbody></table>';
  var el=document.getElementById('util-season-tbl'); if(el) el.innerHTML=t;
}
/* Central (common-area) split from VillageMan export: period -> {units, amount}. */
function _utilCentralMap(){
  var V=window.VILLAGEMAN_DATA, m={}; if(!V||!V.utility_bills) return m;
  V.utility_bills.forEach(function(b){ if(!b.split_meter||!b.period) return; if(String(b.utility_type||'').toLowerCase().indexOf('w')===0) return;
    var u=Number(b.central_units)||0, a=Number(b.central_amount)||0; if(!(u>0||a>0)) return;
    var x=m[b.period]||{units:0,amount:0}; x.units+=u; x.amount+=a; m[b.period]=x; });
  return m;
}
function _utilSplitSeries(data,months,field,scope){
  if(scope==='all') return data; var cm=_utilCentralMap(), k=field==='units'?'units':'amount';
  return data.map(function(v,i){ if(v==null) return null; var hc=cm[months[i]], c=(hc||{})[k]||0; if(scope==='central'&&!hc) return null; var r=scope==='central'?c:(v-c); return Math.round(r*100)/100; });
}
function _utilDrawCharts(){
  if(typeof Highcharts==='undefined')return;
  var _sf=_utilFilter,_sy=_utilYear; _utilFilter='all'; _utilYear='all';
  var bills=_utilBills(); _utilFilter=_sf; _utilYear=_sy;
  var months=_utilMonthKeys();

  function series(utility,field){
    var map={};
    bills.filter(function(b){return b.utility===utility;}).forEach(function(b){if(b.period)map[b.period]=b[field];});
    return months.map(function(m){return map[m]!=null?map[m]:null;});
  }
  var dark=document.documentElement.classList.contains('dark');
  var txtColor=dark?'#9aa0b0':'#4a5068';
  var common={credits:{enabled:false},legend:{itemStyle:{color:txtColor}},
    xAxis:{categories:months,labels:{style:{color:txtColor,fontSize:'9px'}}},
    chart:{backgroundColor:'transparent',style:{fontFamily:'inherit'}}};

  // Combined monthly chart
  if(_utilChartUnit){try{_utilChartUnit.destroy()}catch(e){}}
  if(_utilChartCost){try{_utilChartCost.destroy()}catch(e){} _utilChartCost=null;}
  var mo=_utilMainOpt(), isU=mo.metric==='units', ms=[], dual=isU&&mo.electric&&mo.water;
  var _f=mo.from&&months.indexOf(mo.from)>=0?mo.from:'', _t=mo.to&&months.indexOf(mo.to)>=0?mo.to:'';
  months=months.filter(function(m){ return (!_f||m>=_f)&&(!_t||m<=_t); });
  if(mo.electric){ var se=series('electric',mo.metric==='units'?'units':'amount'); se=_utilSplitSeries(se,months,mo.metric==='units'?'units':'amount',mo.scope||'all'); ms.push({name:'\u26a1 '+(isU?'kWh':'Electric')+(mo.scope==='home'?' (home)':mo.scope==='central'?' (central)':''),data:se,color:'#d97706',yAxis:0,type:'areaspline'}); ms=ms.concat(_utilExtras(se,'\u26a1','#d97706',0,mo)); }
  if(mo.water){ var sw=series('water',mo.metric==='units'?'units':'amount'), wa=dual?1:0; ms.push({name:'\ud83d\udca7 '+(isU?'m\u00b3':'Water'),data:sw,color:'#0891b2',yAxis:wa,type:'areaspline'}); ms=ms.concat(_utilExtras(sw,'\ud83d\udca7','#0891b2',wa,mo)); }
  var yA=[{title:{text:isU?(mo.electric?'kWh':'m\u00b3'):'\u0e3f',style:{color:txtColor}},labels:{style:{color:txtColor}}}];
  if(dual) yA.push({title:{text:'m\u00b3',style:{color:txtColor}},opposite:true,labels:{style:{color:txtColor}}});
  _utilChartUnit=Highcharts.chart('util-chart-unit',Object.assign({},common,{
    title:{text:null}, xAxis:{categories:months,labels:{style:{color:txtColor,fontSize:'9px'}}}, yAxis:yA, tooltip:{shared:true,valueDecimals:isU?0:2},
    plotOptions:{areaspline:{fillOpacity:0.12,lineWidth:2.5,connectNulls:true,marker:{radius:2.5},dataLabels:_utilDL(mo.labels,isU?0:0)}},
    series:ms
  }));

  // YoY chart — one line per year, x = month (1-12), y = total cost
  if(_utilChartYoY){try{_utilChartYoY.destroy()}catch(e){}}
  var byYear={};
  bills.forEach(function(b){
    var _yu=_utilMainOpt().yoyUtil||'all'; if(!b.period||(_yu!=='all'&&b.utility!==_yu))return;var y=b.period.slice(0,4),m=parseInt(b.period.slice(5,7),10);
    if(!byYear[y])byYear[y]=new Array(12).fill(null);
    byYear[y][m-1]=(byYear[y][m-1]||0)+(b.amount||0);
  });
  var _ysel=_utilYoySel();
  var yoySeries=Object.keys(byYear).sort().filter(function(y){return _ysel.indexOf(y)>=0;}).map(function(y){return {name:y,data:byYear[y]};});
  _utilChartYoY=Highcharts.chart('util-chart-yoy',Object.assign({},common,{
    title:{text:null},
    xAxis:{categories:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],labels:{style:{color:txtColor,fontSize:'9px'}}},
    yAxis:{title:{text:'\u0e3f',style:{color:txtColor}},labels:{style:{color:txtColor}}},
    plotOptions:{series:{type:'spline'},spline:{lineWidth:2.5,marker:{radius:3},dataLabels:_utilDL(_utilMainOpt().yoyLabels,0)}},
    series:yoySeries.map(function(s){s.type='spline';return s;})
  }));
  try{ if(document.getElementById('util-chart-season')) _utilDrawSeason(common,txtColor); }catch(e){ console.error(e); }
}

// ===== Bills Reminder integration =====

// Update the recurring monthly forecast for electric/water to the 12-month actual average.
function utilUpdateRecurring(utility){
  readAll();
  var avg=_utilAvg(utility,12);
  if(avg==null){toast('No data to average');return;}
  var nameMatch=utility==='electric'?/\u0e44\u0e1f|electric|\u0e01\u0e32\u0e23\u0e44\u0e1f\u0e1f\u0e49\u0e32|mea/i:/\u0e19\u0e49\u0e33|water|\u0e1b\u0e23\u0e30\u0e1b\u0e32|mwa/i;
  if(!D.monthly)D.monthly=[];
  var row=D.monthly.find(function(m){return nameMatch.test(m.name||'');});
  var rounded=Math.round(avg);
  if(row){
    row.amount=rounded;
    saveD();simulate();if(typeof renderAllTabs==='function')renderAllTabs();
    toast('\u2705 Updated "'+row.name+'" \u2192 \u0e3f'+fmt(rounded)+'/mo');
  }else{
    if(!confirm('No recurring '+(utility==='electric'?'electric':'water')+' bill found. Create one at \u0e3f'+fmt(rounded)+'/mo?'))return;
    D.monthly.push({name:utility==='electric'?'\u0e04\u0e48\u0e32\u0e44\u0e1f':'\u0e04\u0e48\u0e32\u0e19\u0e49\u0e33',amount:rounded,day:15,type:'Utilities',owner:'Me',start_mode:'forever',start_date:'',auto_pay:false});
    saveD();simulate();if(typeof renderAllTabs==='function')renderAllTabs();
    toast('\u2705 Created recurring '+(utility==='electric'?'\u0e04\u0e48\u0e32\u0e44\u0e1f':'\u0e04\u0e48\u0e32\u0e19\u0e49\u0e33')+' \u2192 \u0e3f'+fmt(rounded)+'/mo');
  }
}

// Add a specific unpaid utility bill into the Bills ledger as a one-off planned expense.
function utilAddBill(utility,period){
  readAll();
  var b=_utilData().bills.find(function(x){return x.utility===utility && x.period===period;});
  if(!b){toast('Bill not found');return;}
  if(!D.planned)D.planned=[];
  var nm=(utility==='electric'?'\u0e04\u0e48\u0e32\u0e44\u0e1f':'\u0e04\u0e48\u0e32\u0e19\u0e49\u0e33')+' '+period;
  // due date: use bill due_date if present else 15th of month after period
  var due=b.due_date||'';
  if(!due && period){var p=period.split('-');var y=+p[0],mo=+p[1];var ny=mo===12?y+1:y,nm2=mo===12?1:mo+1;due=ny+'-'+(nm2<10?'0':'')+nm2+'-15';}
  D.planned.push({name:nm,amount:b.amount||b.paid_amount||0,date:due,type:'Utilities',owner:'Me'});
  saveD();simulate();if(typeof renderAllTabs==='function')renderAllTabs();
  toast('\u2705 Added "'+nm+'" to Planned (\u0e3f'+fmt(b.amount||b.paid_amount||0)+')');
}

// Auto-sync EVERY utility_log bill into D.planned (one planned row per utility+period).
// Dedup via _fromUtility flag + _utilKey on the row, so repeated renders never duplicate.
// Returns the number of NEW rows added. Does NOT re-render (caller controls that) to avoid recursion.
function utilAutoSyncPlanned(){
  if(typeof D==='undefined'||!D) return 0;
  if(!D.planned) D.planned=[];
  if(!D.bill_payments) D.bill_payments={};
  var bills=_utilData().bills;
  if(!bills.length) return 0;
  // index existing auto-synced planned rows by their utility+period key
  var have={};
  var haveName={};
  D.planned.forEach(function(p){
    if(p && p._fromUtility && p._utilKey) have[p._utilKey]=p;
    // also index by display name so a legacy row (no _utilKey) is adopted, not duplicated
    if(p && p.name) haveName[p.name]=p;
  });
  var added=0, changed=false;
  var mp=D.util_manual_paid||{};
  bills.forEach(function(b){
    if(!b.period) return;
    var ukey=b.utility+'|'+b.period;
    var nm=(b.utility==='electric'?'\u0e04\u0e48\u0e32\u0e44\u0e1f':'\u0e04\u0e48\u0e32\u0e19\u0e49\u0e33')+' '+b.period;
    var amt=b.amount||b.paid_amount||0;
    // due = bill ISSUE date: water uses invoice_date, electric uses meter_date (no invoice_date).
    // fallbacks: due_date, then 15th of the month after the usage period.
    var due=(b.utility==='water'?(b.invoice_date||b.meter_date):(b.meter_date||b.invoice_date))||b.due_date||'';
    if(!due && b.period){var p=b.period.split('-');var y=+p[0],mo=+p[1];var ny=mo===12?y+1:y,nm2=mo===12?1:mo+1;due=ny+'-'+(nm2<10?'0':'')+nm2+'-15';}
    var dl=b.due_date||'';  // printed payment-due date (deadline) from the bill
    // paid status: receipt-paid (b.paid) OR manually marked
    var manual=mp[ukey];
    var isPaid=!!b.paid || !!manual;
    var paidDate=(manual&&manual.paid_date)||b.paid_date||'';
    var ex=have[ukey];
    if(ex){
      // keep amount/date fresh if the parsed bill changed
      if(ex.amount!==amt){ ex.amount=amt; changed=true; }
      if(ex.date!==due){ ex.date=due; changed=true; }
      // backfill the utility/period tags if an older sync set _fromUtility+_utilKey but not these
      // (missing tags make the recurring-skip in simulation/billOccurrences never fire -> dupes).
      if(ex._utilUtility!==b.utility){ ex._utilUtility=b.utility; changed=true; }
      if(ex._utilPeriod!==b.period){ ex._utilPeriod=b.period; changed=true; }
      if(ex.deadline_date!==dl){ ex.deadline_date=dl; changed=true; }
    }else if(haveName[nm]){
      // adopt a legacy row with the same name (e.g. from the retired utilAddBill button) that
      // lacks the _fromUtility flags — tag it in place instead of pushing a duplicate.
      var lg=haveName[nm];
      lg._fromUtility=true; lg._utilKey=ukey; lg._utilUtility=b.utility; lg._utilPeriod=b.period;
      lg.amount=amt; lg.date=due; lg.type='Utilities'; lg.deadline_date=dl;
      have[ukey]=lg; changed=true;
    }else{
      D.planned.push({name:nm,amount:amt,date:due,type:'Utilities',owner:'Me',deadline_date:dl,
        _fromUtility:true,_utilKey:ukey,_utilUtility:b.utility,_utilPeriod:b.period});
      added++; changed=true;
    }
    // mark paid in the Bills Reminder ledger. The planned occurrence's fullKey must match
    // what billOccurrences() builds: 'P|'+name+'|'+date  then  '::'+YYYY-MM of the due month.
    // Utility rows are Cash/Direct (no card shift) so the due month == the planned date's month.
    if(due){
      var dmk=due.slice(0,7);                       // YYYY-MM of the planned/due date
      var payKey='P|'+nm+'|'+due+'::'+dmk;
      // If the user already marked this bill paid from Bills Reminder (a paid ledger entry exists,
      // whether or not it carries _fromUtility), treat it as paid and REMEMBER it in util_manual_paid
      // so this sync (and future reloads) don't wipe it. This lets "Mark paid" work from any page.
      // PAID-EARLY CARRY-OVER (Nov 4 2026): user often pays the known amount on the RECURRING forecast
      // (key M|<name>::YYYY-MM) before the PDF arrives. When the real bill lands it replaces that
      // recurring row, which orphaned the paid mark. Carry it over to the real bill once.
      if(!isPaid && !mp[ukey]){
        var _rk=Object.keys(D.bill_payments).find(function(k){
          if(k.indexOf('M|')!==0) return false;
          var r=D.bill_payments[k]; if(!r||!r.paid) return false;
          if(k.slice(-9)!=='::'+dmk && String(r.due||r.orig_due||'').slice(0,7)!==dmk) return false;
          var nmR=k.slice(2,k.length-9);
          var it=(D.monthly||[]).find(function(x){ return x&&x.name===nmR; });
          var lk=it?(it.util_link===''?null:(it.util_link||(/\u0e44\u0e1f|electric|\u0e01\u0e32\u0e23\u0e44\u0e1f\u0e1f\u0e49\u0e32|mea/i.test(nmR)?'electric':(/\u0e19\u0e49\u0e33|water|\u0e1b\u0e23\u0e30\u0e1b\u0e32|mwa/i.test(nmR)?'water':null)))):null;
          return lk===b.utility;
        });
        if(_rk){
          var _rr=D.bill_payments[_rk];
          if(!D.util_manual_paid) D.util_manual_paid={};
          D.util_manual_paid[ukey]={paid_date:_rr.paid_date||due, from_recurring:_rk, recurring_amount:_rr.paid_amount||null};
          mp=D.util_manual_paid; isPaid=true; paidDate=_rr.paid_date||due; changed=true;
        }
      }
      var _ledgerPaid=D.bill_payments[payKey]&&D.bill_payments[payKey].paid;
      if(_ledgerPaid&&!isPaid){
        isPaid=true;
        if(!paidDate)paidDate=D.bill_payments[payKey].paid_date||due;
        if(!D.util_manual_paid)D.util_manual_paid={};
        if(!D.util_manual_paid[ukey]){D.util_manual_paid[ukey]={paid_date:paidDate};changed=true;}
      }
      if(isPaid){
        var prev=D.bill_payments[payKey];
        // Nov 10 2026: store the bill's own period (e.g. 2026-10) so History shows งวด correctly, not the due-month key suffix
        if(!prev || prev.paid_amount!==amt || prev.paid_date!==(paidDate||due) || prev.period!==b.period){
          D.bill_payments[payKey]={paid:true,paid_date:paidDate||due,paid_amount:amt,due:due,type:'Utilities',card:'',auto_pay:false,_fromUtility:true,period:b.period,orig_due:due};
          changed=true;
        }
      }else if(D.bill_payments[payKey]&&D.bill_payments[payKey]._fromUtility){
        delete D.bill_payments[payKey]; changed=true;
      }
    }
  });
  if(changed){ saveD(); if(typeof simulate==='function') simulate(); }
  return added;
}

// ===== Manual "mark paid" (stored in CashMan localStorage, survives parser re-runs) =====
// D.util_manual_paid = { 'electric|2024-03': {paid_date:'2024-04-20'}, ... }
var _utilMarkTarget = null;   // {utility, period} while the date overlay is open

function utilMarkPaid(utility, period){
  _utilMarkTarget = {utility:utility, period:period};
  var today=new Date().toISOString().slice(0,10);
  var ov=document.getElementById('util-markpaid-ov');
  if(!ov){
    ov=document.createElement('div'); ov.id='util-markpaid-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center';
    document.body.appendChild(ov);
  }
  var isDark=document.documentElement.classList.contains('dark');
  ov.innerHTML='<div style="background:'+(isDark?'#1f2230':'#fff')+';color:var(--text);border-radius:8px;padding:16px 18px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,.3)">'+
    '<div style="font-weight:600;font-size:13px;margin-bottom:10px">Mark paid \u2014 '+(utility==='electric'?'\u26a1':'\ud83d\udca7')+' '+period+'</div>'+
    '<label style="font-size:10px;color:var(--text3);text-transform:uppercase">Paid date</label>'+
    '<input type="date" id="util-markpaid-date" value="'+today+'" style="width:100%;margin:4px 0 12px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);font-family:var(--font)">'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button class="btn btn-ghost" onclick="utilMarkPaidCancel()">Cancel</button>'+
      '<button class="btn btn-primary" onclick="utilMarkPaidConfirm()">Save</button>'+
    '</div></div>';
  ov.style.display='flex';
}
function utilMarkPaidCancel(){
  var ov=document.getElementById('util-markpaid-ov'); if(ov) ov.style.display='none';
  _utilMarkTarget=null;
}
function utilMarkPaidConfirm(){
  if(!_utilMarkTarget) return;
  readAll();
  var el=document.getElementById('util-markpaid-date');
  var d=el?el.value:'';   // native date input returns YYYY-MM-DD (no parseDMY)
  if(!d){ toast('Pick a date'); return; }
  if(!D.util_manual_paid) D.util_manual_paid={};
  D.util_manual_paid[_utilMarkTarget.utility+'|'+_utilMarkTarget.period]={paid_date:d};
  // Cross-page sync: push this paid state into the Bills Reminder ledger (D.bill_payments)
  // immediately so the Bill Reminder page shows it paid without waiting for a reload.
  if(typeof utilAutoSyncPlanned==='function'){ try{ utilAutoSyncPlanned(); }catch(e){} }
  saveD();
  var ov=document.getElementById('util-markpaid-ov'); if(ov) ov.style.display='none';
  _utilMarkTarget=null;
  renderUtilities();
  if(typeof renderBillReminder==='function'){ try{ renderBillReminder(); }catch(e){} }
  if(typeof renderDashBills==='function'){ try{ renderDashBills(); }catch(e){} }
  if(typeof toast==='function') toast('\u2705 Marked paid');
}
function utilUnmarkPaid(utility, period){
  readAll();
  if(D.util_manual_paid){ delete D.util_manual_paid[utility+'|'+period]; }
  // Cross-page sync: reconcile the Bills Reminder ledger so the matching _fromUtility paid
  // entry is removed too (unless a real receipt in the log still marks it paid).
  if(typeof utilAutoSyncPlanned==='function'){ try{ utilAutoSyncPlanned(); }catch(e){} }
  saveD();
  renderUtilities();
  if(typeof renderBillReminder==='function'){ try{ renderBillReminder(); }catch(e){} }
  if(typeof renderDashBills==='function'){ try{ renderDashBills(); }catch(e){} }
  if(typeof toast==='function') toast('Unmarked');
}

/* Reload data/utility_log.js WITHOUT a page reload (the parser rewrites it on every run).
   Injects a fresh cache-busted <script>; resolves after window.UTILITY_DATA is replaced.
   On failure (file missing/offline) keeps the old data and resolves false. */
function utilReloadLog(){
  return new Promise(function(resolve){
    var before=(window.UTILITY_DATA&&window.UTILITY_DATA.generated_at)||'';
    var old=document.getElementById('util-log-reload'); if(old&&old.parentNode) old.parentNode.removeChild(old);
    var s=document.createElement('script'); s.id='util-log-reload';
    s.src='data/utility_log.js?t='+Date.now();
    s.onload=function(){ var after=(window.UTILITY_DATA&&window.UTILITY_DATA.generated_at)||''; resolve({ok:true, changed:after!==before, generated_at:after}); };
    s.onerror=function(){ resolve({ok:false}); };
    document.head.appendChild(s);
  });
}
/* Utilities page "Refresh": reload utility_log.js, re-sync bills into Planned/Bills Reminder, redraw. */
async function utilRefresh(){
  var r=await utilReloadLog();
  if(!r.ok){ if(typeof toast==='function') toast('\u26a0 Could not load utility_log.js'); return; }
  try{ if(typeof utilAutoSyncPlanned==='function') utilAutoSyncPlanned(); }catch(e){ console.error('utilRefresh sync:',e); }
  try{ if(typeof simulate==='function') simulate(); }catch(e){}
  try{ if(typeof renderAllTabs==='function') renderAllTabs(); else renderUtilities(); }catch(e){ renderUtilities(); }
  if(typeof toast==='function') toast(r.changed ? ('\u2705 Loaded new UtilityLog data ('+String(r.generated_at).replace('T',' ').slice(0,16)+')') : 'UtilityLog already up to date');
}

/* ===== Invoice / Receipt popup viewer (same look as VillageMan's lightbox) ===== */
function _utilFileUrl(path){
  var p=String(path||'').replace(/\\/g,'/');
  if(/^(https?:|file:)/i.test(p)) return p;
  if(/^[A-Za-z]:\//.test(p)) return 'file:///'+encodeURI(p);   // absolute Windows path -> file:// URL
  return p;                                                       // relative path: use as-is
}
/* Two small icons per bill row: invoice + receipt. Only shown when the parser stored a path. */
function _utilDocIcons(b){
  var h='';
  if(b.invoice_path) h+='<a href="#" data-src="'+esc(_utilFileUrl(b.invoice_path))+'" onclick="utilViewDoc(this.getAttribute(\'data-src\'),event);return false;" title="Invoice: '+esc(b.invoice_file||'')+'" style="margin-right:8px"><i class="fa-solid fa-file-invoice" style="color:var(--primary)"></i></a>';
  if(b.receipt_path) h+='<a href="#" data-src="'+esc(_utilFileUrl(b.receipt_path))+'" onclick="utilViewDoc(this.getAttribute(\'data-src\'),event);return false;" title="Receipt: '+esc(b.receipt_file||'')+'"><i class="fa-solid fa-receipt" style="color:var(--primary)"></i></a>';
  return h||'<span class="text-muted">-</span>';
}
function utilViewDoc(src, ev){
  if(ev){ if(ev.preventDefault) ev.preventDefault(); if(ev.stopPropagation) ev.stopPropagation(); }
  if(!src) return;
  var isPdf=/\.pdf(\?|$)/i.test(src);
  var ov=document.getElementById('util-doc-ov');
  if(!ov){
    ov=document.createElement('div'); ov.id='util-doc-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:24px';
    ov.addEventListener('click',function(e){ if(e.target===ov) utilCloseDoc(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') utilCloseDoc(); });
    document.body.appendChild(ov);
  }
  var inner=isPdf
    ? '<iframe src="'+esc(src)+'" style="width:88vw;height:88vh;border:0;background:#fff;border-radius:8px"></iframe>'
    : '<img src="'+esc(src)+'" style="max-width:92vw;max-height:92vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.5)">';
  ov.innerHTML='<div style="position:relative">'
    +'<button onclick="utilCloseDoc()" style="position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;border:0;background:#fff;color:#111;font-size:16px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)">&times;</button>'
    +inner
    +'<div style="margin-top:6px;text-align:center"><a href="'+esc(src)+'" target="_blank" rel="noopener" style="color:#fff;font-size:11px;opacity:.85">Open in new tab</a></div>'
    +'</div>';
  ov.style.display='flex';
}
function utilCloseDoc(){ var ov=document.getElementById('util-doc-ov'); if(ov){ ov.style.display='none'; ov.innerHTML=''; } }
window.utilViewDoc=utilViewDoc; window.utilCloseDoc=utilCloseDoc;
