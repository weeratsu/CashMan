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

function _utilKey(b){ return (b.utility||'')+'|'+(b.period||'')+'|'+(b.ref||''); }
function utilToggleRow(key){ _utilExpanded[key] = !_utilExpanded[key]; renderUtilities(); }

function _utilData(){
  var d = (typeof window !== 'undefined' && window.UTILITY_DATA) ? window.UTILITY_DATA : null;
  if(!d || !d.bills) return {generated_at:'', bill_count:0, bills:[]};
  return d;
}

function setUtilFilter(v){_utilFilter=v||'all';renderUtilities();}
function setUtilYear(v){_utilYear=v||'all';renderUtilities();}

// group bills by period, applying the current filter
function _utilBills(){
  var bills=_utilData().bills.slice();
  if(_utilFilter!=='all') bills=bills.filter(function(b){return b.utility===_utilFilter;});
  if(_utilYear!=='all') bills=bills.filter(function(b){return (b.period||'').slice(0,4)===_utilYear;});
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
    '<label>Utility</label><select class="sel" onchange="setUtilFilter(this.value)">'+
      ['all','electric','water'].map(function(u){return '<option value="'+u+'"'+(_utilFilter===u?' selected':'')+'>'+(u==='all'?'All':u==='electric'?'\u26a1 Electric':'\ud83d\udca7 Water')+'</option>';}).join('')+
    '</select>'+
    '<label>Year</label><select class="sel" onchange="setUtilYear(this.value)">'+
      '<option value="all"'+(_utilYear==='all'?' selected':'')+'>All years</option>'+
      years.map(function(y){return '<option value="'+y+'"'+(_utilYear===y?' selected':'')+'>'+y+'</option>';}).join('')+
    '</select></div>';

  // ---- integration card ----
  var avgE=_utilAvg('electric',12), avgW=_utilAvg('water',12);
  var integ='<div class="card"><h2><i class="fa-solid fa-link"></i> Bills Reminder Integration</h2>'+
    '<p class="text-muted" style="font-size:10px;margin-bottom:8px">Keep your recurring forecast accurate using the real 12-month average, and push unpaid bills into Bills Reminder.</p>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
    (avgE!=null?'<button class="btn btn-ghost" onclick="utilUpdateRecurring(\'electric\')">Update \u26a1 recurring \u2192 \u0e3f'+fmt(avgE)+'/mo</button>':'')+
    (avgW!=null?'<button class="btn btn-ghost" onclick="utilUpdateRecurring(\'water\')">Update \ud83d\udca7 recurring \u2192 \u0e3f'+fmt(avgW)+'/mo</button>':'')+
    '</div></div>';

  // ---- charts ----
  var charts='<div class="card"><h2><i class="fa-solid fa-chart-column"></i> Usage per month</h2><div id="util-chart-unit" class="chart-box"></div></div>'+
    '<div class="card"><h2><i class="fa-solid fa-money-bill-wave"></i> Cost per month</h2><div id="util-chart-cost" class="chart-box"></div></div>'+
    '<div class="card"><h2><i class="fa-solid fa-calendar-week"></i> Year-over-year (cost)</h2><div id="util-chart-yoy" class="chart-box"></div></div>';

  // ---- table ----
  var rows=bills.slice().sort(function(a,b){return (a.period<b.period?1:-1);}).map(function(b){
    var icon=b.utility==='electric'?'\u26a1':'\ud83d\udca7';
    var unitLbl=b.utility==='electric'?'kWh':'m\u00b3';
    var paidTag=b.paid?'<span class="tag tag-active">Paid</span>':'<span class="tag tag-planned">Unpaid</span>';
    var addBtn=!b.paid?'<button class="btn btn-ghost" style="font-size:9px;padding:3px 7px" onclick="utilAddBill(\''+b.utility+'\',\''+(b.period||'')+'\')">+ Bills</button>':'';
    var key=_utilKey(b);
    var open=!!_utilExpanded[key];
    var chev='<i class="fa-solid fa-chevron-'+(open?'down':'right')+'" style="font-size:8px;color:var(--text3);margin-right:5px"></i>';
    var row='<tr style="cursor:pointer" onclick="utilToggleRow(\''+key.replace(/'/g,"\\'")+'\')">'+
      '<td>'+chev+icon+' '+(b.period||'-')+'</td>'+
      '<td class="r">\u0e3f'+fmt(b.amount||0)+'</td>'+
      '<td class="r">'+(b.units!=null?b.units+' '+unitLbl:'-')+'</td>'+
      '<td class="r">'+(b.ft!=null?b.ft:'-')+'</td>'+
      '<td>'+paidTag+'</td>'+
      '<td>'+(b.paid_date?fmtDate(b.paid_date):'-')+'</td>'+
      '<td onclick="event.stopPropagation()">'+addBtn+'</td>'+
    '</tr>';
    if(open) row+=_utilDetailRow(b);
    return row;
  }).join('');
  var table='<div class="card"><h2><i class="fa-solid fa-table-list"></i> All bills ('+bills.length+')</h2>'+
    '<div style="overflow-x:auto"><table class="tbl"><thead><tr>'+
    '<th>Period</th><th class="r">Amount</th><th class="r">Usage</th><th class="r">Ft</th><th>Status</th><th>Paid date</th><th></th>'+
    '</tr></thead><tbody>'+table_rows_guard(rows)+'</tbody></table></div></div>';

  host.innerHTML=kpi+fb+integ+charts+table;

  // draw charts after DOM is in place
  setTimeout(_utilDrawCharts, 30);
}

function table_rows_guard(rows){return rows||'<tr><td colspan="7" class="text-muted">No bills for this filter</td></tr>';}

// Expandable detail row — shows every raw field the parser captured for one bill.
function _utilDetailRow(b){
  function money(v){ return v!=null ? '\u0e3f'+fmt(v) : '-'; }
  function raw(v){ return v!=null && v!=='' ? v : '-'; }
  var isElec=b.utility==='electric';
  var unitLbl=isElec?'kWh':'m\u00b3';
  var items=[];
  items.push(['Meter read date', b.meter_date?fmtDate(b.meter_date):'-']);
  items.push(['Meter now', raw(b.meter_now)]);
  items.push(['Meter prev', raw(b.meter_prev)]);
  items.push(['Usage', b.units!=null?(b.units+' '+unitLbl):'-']);
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
  items.push(['Invoice file', raw(b.invoice_file)]);
  items.push(['Receipt file', raw(b.receipt_file)]);
  var cells=items.map(function(it){
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid var(--border)">'+
      '<span style="color:var(--text3);font-size:10px">'+it[0]+'</span>'+
      '<span style="font-family:var(--mono);font-size:10px;text-align:right;word-break:break-all">'+it[1]+'</span></div>';
  }).join('');
  return '<tr><td colspan="7" style="background:var(--bg3);padding:10px 14px">'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 18px">'+cells+'</div>'+
    '</td></tr>';
}

function _utilMonthKeys(){
  // all YYYY-MM present, sorted ascending
  var ks={};
  _utilData().bills.forEach(function(b){if(b.period)ks[b.period]=1;});
  return Object.keys(ks).sort();
}

function _utilDrawCharts(){
  if(typeof Highcharts==='undefined')return;
  var bills=_utilBills();
  var months=_utilMonthKeys();
  if(_utilYear!=='all')months=months.filter(function(m){return m.slice(0,4)===_utilYear;});

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

  // Usage chart (kWh + m3) — dual axis
  if(_utilChartUnit){try{_utilChartUnit.destroy()}catch(e){}}
  _utilChartUnit=Highcharts.chart('util-chart-unit',Object.assign({},common,{
    title:{text:null},
    yAxis:[{title:{text:'kWh',style:{color:txtColor}},labels:{style:{color:txtColor}}},
           {title:{text:'m\u00b3',style:{color:txtColor}},opposite:true,labels:{style:{color:txtColor}}}],
    series:[{name:'\u26a1 kWh',data:series('electric','units'),color:'#d97706',yAxis:0,type:'column'},
            {name:'\ud83d\udca7 m\u00b3',data:series('water','units'),color:'#0891b2',yAxis:1,type:'spline'}]
  }));

  // Cost chart (THB)
  if(_utilChartCost){try{_utilChartCost.destroy()}catch(e){}}
  _utilChartCost=Highcharts.chart('util-chart-cost',Object.assign({},common,{
    title:{text:null},
    yAxis:{title:{text:'\u0e3f',style:{color:txtColor}},labels:{style:{color:txtColor}}},
    plotOptions:{column:{stacking:'normal'}},
    series:[{name:'\u26a1 Electric',data:series('electric','amount'),color:'#d97706',type:'column'},
            {name:'\ud83d\udca7 Water',data:series('water','amount'),color:'#0891b2',type:'column'}]
  }));

  // YoY chart — one line per year, x = month (1-12), y = total cost
  if(_utilChartYoY){try{_utilChartYoY.destroy()}catch(e){}}
  var byYear={};
  bills.forEach(function(b){
    if(!b.period)return;var y=b.period.slice(0,4),m=parseInt(b.period.slice(5,7),10);
    if(!byYear[y])byYear[y]=new Array(12).fill(null);
    byYear[y][m-1]=(byYear[y][m-1]||0)+(b.amount||0);
  });
  var yoySeries=Object.keys(byYear).sort().map(function(y){return {name:y,data:byYear[y]};});
  _utilChartYoY=Highcharts.chart('util-chart-yoy',Object.assign({},common,{
    title:{text:null},
    xAxis:{categories:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],labels:{style:{color:txtColor,fontSize:'9px'}}},
    yAxis:{title:{text:'\u0e3f',style:{color:txtColor}},labels:{style:{color:txtColor}}},
    series:yoySeries
  }));
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
