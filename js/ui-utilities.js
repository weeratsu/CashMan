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
      '<td>'+paidTag+'</td>'+
      '<td>'+(b.paid_date?fmtDate(b.paid_date):'-')+'</td>'+
      '<td onclick="event.stopPropagation()">'+actBtn+'</td>'+
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
      var _ledgerPaid=D.bill_payments[payKey]&&D.bill_payments[payKey].paid;
      if(_ledgerPaid&&!isPaid){
        isPaid=true;
        if(!paidDate)paidDate=D.bill_payments[payKey].paid_date||due;
        if(!D.util_manual_paid)D.util_manual_paid={};
        if(!D.util_manual_paid[ukey]){D.util_manual_paid[ukey]={paid_date:paidDate};changed=true;}
      }
      if(isPaid){
        var prev=D.bill_payments[payKey];
        if(!prev || prev.paid_amount!==amt || prev.paid_date!==(paidDate||due)){
          D.bill_payments[payKey]={paid:true,paid_date:paidDate||due,paid_amount:amt,due:due,type:'Utilities',card:'',auto_pay:false,_fromUtility:true};
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
