var _ganttSort='start';
function setGanttSort(v){_ganttSort=v;if(typeof renderDash==='function')renderDash();}
// ui-dashboard.js — Dashboard & Analysis charts

function renderPeriodBanner(targetId,title){
var el=document.getElementById(targetId);if(!el||!D)return;
var sd=new Date(D.profile.start_date+'T00:00:00'),ed=new Date(D.profile.end_date+'T00:00:00');
var sStr=sd.getDate()+' '+MO[sd.getMonth()]+' '+sd.getFullYear();
var eStr=ed.getDate()+' '+MO[ed.getMonth()]+' '+ed.getFullYear();
var diffMs=ed-sd,diffDays=Math.round(diffMs/86400000);
var diffMo=Math.round(diffDays/30.44);
var spanTxt=diffDays+' days';
if(diffMo>=2)spanTxt=diffMo+' months ('+diffDays+' days)';
el.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--primary-bg);border:1px solid var(--primary);border-radius:var(--radius);border-left:4px solid var(--primary)">'+
'<i class="fa-solid fa-calendar-days" style="font-size:16px;color:var(--primary)"></i>'+
'<div style="flex:1">'+
'<div style="font-size:13px;font-weight:700;color:var(--text)">'+(title||'Cash Flow Overview')+'</div>'+
'<div style="font-size:11px;color:var(--text2);margin-top:1px">'+
'<span style="font-weight:600">'+sStr+'</span>'+
' <i class="fa-solid fa-arrow-right" style="font-size:8px;color:var(--text3);margin:0 4px"></i> '+
'<span style="font-weight:600">'+eStr+'</span>'+
'<span style="color:var(--text3);margin-left:8px;font-size:10px">('+spanTxt+')</span></div></div></div>'}

function renderDash(){if(!SIM){var _ka=document.getElementById('kpi-area');if(_ka){var _diag='No simulation yet. ';try{_diag+='D='+(typeof D!=='undefined'&&D?'ok':'MISSING')+', start='+((typeof D!=='undefined'&&D&&D.profile)?D.profile.start_date:'?')+', end='+((typeof D!=='undefined'&&D&&D.profile)?D.profile.end_date:'?');if(window.__SIMERR)_diag+=' | simulate error: '+window.__SIMERR;}catch(_){}_ka.innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="kpi-note" style="color:var(--error);white-space:normal">'+_diag+'</div></div>';}return;}var R=SIM;
try{applyDashLayout()}catch(e){console.warn('applyDashLayout:',e);}
try{renderPeriodBanner('dash-period','Dashboard');}catch(e){console.warn('period banner:',e);}
if(typeof Highcharts==='undefined'){var _cb=document.getElementById('chart-balance'),_cm=document.getElementById('chart-monthly');if(_cb)_cb.innerHTML='<div style="padding:20px;text-align:center;color:var(--text3);font-size:11px">Charts need an internet connection (Highcharts) — reconnect and refresh.</div>';if(_cm)_cm.innerHTML='';}
document.getElementById('kpi-area').innerHTML=
'<div class="kpi"><div class="kpi-label">Starting</div><div class="kpi-val">฿'+fmt(D.profile.starting_cash)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Ending</div><div class="kpi-val text-success">฿'+fmt(R.finalB)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Income</div><div class="kpi-val text-success">฿'+fmt(R.totI)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Expenses</div><div class="kpi-val text-error">฿'+fmt(R.totE)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Lowest</div><div class="kpi-val text-warning">฿'+fmt(R.minB)+'</div><div class="kpi-note">'+MO[R.minDt.getMonth()]+' '+R.minDt.getDate()+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Deficit Mo.</div><div class="kpi-val '+(R.def>0?'text-error':'text-success')+'">'+R.def+'</div></div>';
if(typeof Highcharts!=='undefined'){try{
var dk=document.documentElement.classList.contains('dark'),tc=dk?'#e8eaed':'#1a1d27',tc2=dk?'#6b7185':'#7a8098',gc=dk?'#353849':'#d4d7e0',bg2=dk?'#1a1d27':'#fff',sc=dk?'#5b8def':'#4a7aed',ec=dk?'#f87171':'#dc2626',gc2=dk?'#4ade80':'#16a34a',wc=dk?'#fbbf24':'#d97706';
Highcharts.chart('chart-balance',{chart:{type:'areaspline',backgroundColor:'transparent',zooming:{type:'x'}},title:{text:'Daily Cash Balance',style:{color:tc,fontWeight:'600',fontSize:'13px'}},
xAxis:{type:'datetime',labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'},formatter:function(){return Highcharts.numberFormat(this.value/1000,0)+'K'}},gridLineColor:gc,plotLines:[{color:wc,width:1,value:15000,dashStyle:'ShortDot'}]},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},xDateFormat:'%A, %b %e, %Y',pointFormat:'฿{point.y:,.2f}'},
series:[{name:'Balance',data:R.cData,color:sc,fillColor:{linearGradient:{x1:0,y1:0,x2:0,y2:1},stops:[[0,sc+'40'],[1,sc+'05']]},lineWidth:2,marker:{enabled:false,states:{hover:{enabled:true,radius:3}}}}],legend:{enabled:false},credits:{enabled:false}});
var mK=Object.keys(R.mAgg).sort(),mL=mK.map(function(k){var a=R.mAgg[k];return MO[a.m]+' '+String(a.y).slice(2)});
Highcharts.chart('chart-monthly',{chart:{type:'column',backgroundColor:'transparent'},title:{text:'Monthly Income vs Expenses',style:{color:tc,fontWeight:'600',fontSize:'13px'}},
xAxis:{categories:mL,labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'},formatter:function(){return Highcharts.numberFormat(this.value/1000,0)+'K'}},gridLineColor:gc},
tooltip:{shared:true,backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},valuePrefix:'฿',valueDecimals:2},
plotOptions:{column:{borderRadius:3,borderWidth:0,groupPadding:.15}},
series:[{name:'Income',data:mK.map(function(k){return Math.round(R.mAgg[k].income*100)/100}),color:gc2},{name:'Expenses',data:mK.map(function(k){return Math.round(R.mAgg[k].expense*100)/100}),color:ec}],
legend:{itemStyle:{color:tc2,fontSize:'10px'}},credits:{enabled:false}});
// Gantt chart
var ganttData=[],cats=[];
// Include Active/Planned, PLUS recently-finished plans whose last period ended within ~40 days
// (so a plan you just finished last period still shows). Recently-finished are drawn muted.
var _now=new Date();var _todayMs=Date.UTC(_now.getFullYear(),_now.getMonth(),_now.getDate());
var _recentMs=_todayMs-40*86400000;
var _ginst=R.allInst.map(function(inst){
var sm=inst.start_month-1,sy=inst.start_year;var em=sm+inst.periods-1,ey=sy;while(em>11){em-=12;ey++}
var dl=cPD(inst.card)||15;
return {inst:inst,start:Date.UTC(sy,sm,1),end:Date.UTC(ey,em,Math.min(dl,dim(ey,em))),amount:inst.total||0};
}).filter(function(g){
var st=g.inst.status||'Active';
if(st==='Active'||st==='Planned')return true;
if(st==='Cancelled')return false;
// Finished (auto or manual): keep only if it ended within the recent window.
return g.end>=_recentMs&&g.end<=_todayMs;
}).map(function(g){g._recent=(g.end<=_todayMs);return g;});
// Sort per user choice
_ginst.sort(function(a,b){
if(_ganttSort==='end')return a.end-b.end||a.start-b.start;
if(_ganttSort==='name')return (a.inst.name||'').localeCompare(b.inst.name||'');
if(_ganttSort==='amount')return b.amount-a.amount;
return a.start-b.start||a.end-b.end;
});
_ginst.forEach(function(g,idx){
var _fin=(g.inst.status==='Finished')||(g.end<=_todayMs&&g.inst.status!=='Active'&&g.inst.status!=='Planned');
cats.push(g.inst.name+(_fin?' ✓':''));
ganttData.push({x:g.start,x2:g.end,y:idx,color:_fin?'#9ca3af':COLORS[idx%COLORS.length],_finished:_fin});
});
var gh=Math.max(200,cats.length*28+60);
document.getElementById('chart-gantt').style.height=gh+'px';
Highcharts.chart('chart-gantt',{chart:{type:'xrange',backgroundColor:'transparent'},title:{text:null},
xAxis:{type:'datetime',labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc,gridLineWidth:1,gridLineColor:gc,
plotLines:[{color:ec,width:2,value:(function(){var _t=new Date();return Date.UTC(_t.getFullYear(),_t.getMonth(),_t.getDate());})(),dashStyle:'Dash',label:{text:'Today',style:{color:ec,fontSize:'9px'}}}]},
yAxis:{categories:cats,reversed:true,labels:{style:{color:tc2,fontSize:'9px'}},gridLineColor:gc,title:{text:null}},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},
pointFormatter:function(){return '<b>'+this.yCategory+'</b><br/>'+Highcharts.dateFormat('%b %Y',this.x)+' \u2192 '+Highcharts.dateFormat('%b %Y',this.x2)}},
series:[{name:'Installments',data:ganttData,borderRadius:3,pointWidth:16,borderWidth:0,dataLabels:{enabled:false}}],legend:{enabled:false},credits:{enabled:false}});var _gs=document.getElementById('gantt-sort');if(_gs)_gs.value=_ganttSort;}catch(e){console.warn('dash charts:',e);}}}

// === ANALYSIS ===

function renderAnalysis(){if(!SIM)return;var R=SIM;
renderPeriodBanner('analysis-period','Expense Analysis');
var dk=document.documentElement.classList.contains('dark'),tc=dk?'#e8eaed':'#1a1d27',tc2=dk?'#6b7185':'#7a8098',gc=dk?'#353849':'#d4d7e0',bg2=dk?'#1a1d27':'#fff';
// Pie
var pieData=Object.keys(R.typeExp).sort().map(function(t,i){return{name:t,y:Math.round(R.typeExp[t]*100)/100,color:COLORS[i%COLORS.length]}}).filter(function(d){return d.y>0});
Highcharts.chart('chart-pie',{chart:{type:'pie',backgroundColor:'transparent'},title:{text:null},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>฿{point.y:,.2f}</b> ({point.percentage:.1f}%)'},
plotOptions:{pie:{allowPointSelect:true,cursor:'pointer',borderWidth:0,innerSize:'45%',
dataLabels:{enabled:true,format:'{point.name}: {point.percentage:.1f}%',style:{color:tc2,fontSize:'10px',textOutline:'none'}}}},
series:[{name:'Expenses',data:pieData}],credits:{enabled:false}});
// Stacked bar by type per month
var mK=Object.keys(R.mAgg).sort(),mL=mK.map(function(k){var a=R.mAgg[k];return MO[a.m]+' '+String(a.y).slice(2)});
var allTypes=Object.keys(R.typeExp).sort();
var series=allTypes.map(function(t,ti){return{name:t,data:mK.map(function(k){return Math.round((R.mAgg[k].byType[t]||0)*100)/100}),color:COLORS[ti%COLORS.length]}});
Highcharts.chart('chart-type-bar',{chart:{type:'column',backgroundColor:'transparent'},title:{text:null},
xAxis:{categories:mL,labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'},formatter:function(){return Highcharts.numberFormat(this.value/1000,0)+'K'}},gridLineColor:gc,stackLabels:{enabled:false}},
tooltip:{shared:true,backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},valuePrefix:'฿',valueDecimals:2},
plotOptions:{column:{stacking:'normal',borderRadius:2,borderWidth:0}},series:series,
legend:{itemStyle:{color:tc2,fontSize:'10px'}},credits:{enabled:false}});
// Summary table
var nMo=mK.length||1;
document.getElementById('type-summary-body').innerHTML=(function(){
var typeItems={};
D.monthly.forEach(function(m){var t=m.type||'Other';if(!typeItems[t])typeItems[t]=[];
typeItems[t].push({name:m.name,freq:'Monthly',amount:m.amount,annual:m.amount*12,card:m.card||'',direction:m.direction||'expense'})});
D.yearly.forEach(function(y){var t=y.type||'Other';if(!typeItems[t])typeItems[t]=[];
typeItems[t].push({name:y.name,freq:'Yearly',amount:y.amount,annual:y.amount,card:y.card||'',direction:y.direction||'expense'})});
allInstallments().filter(function(x){return x.status==='Active'||x.status==='Planned'}).forEach(function(x){
var t=x.type||'Other';if(!typeItems[t])typeItems[t]=[];
typeItems[t].push({name:x.name,freq:'Installment',amount:x.per_period,annual:x.per_period*12,card:x.card||'',direction:'expense'})});
return pieData.sort(function(a,b){return b.y-a.y}).map(function(d,di){
var pct=(d.y/R.totE*100).toFixed(1);
var items=(typeItems[d.name]||[]).sort(function(a,b){return b.annual-a.annual});
var detail='';
if(items.length>0){
detail='<tr id="type-detail-'+di+'" style="display:none"><td colspan="4" style="padding:0;background:var(--bg2)"><div style="padding:6px 12px">';
items.forEach(function(it){
var dirBadge=it.direction==='income'?'<span style="font-size:8px;padding:1px 4px;border-radius:6px;background:var(--success);color:#fff;margin-right:4px">Income</span>':'';
detail+='<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:10px">'+dirBadge+
'<span style="flex:1">'+esc(it.name)+'</span>'+
'<span style="font-size:9px;color:var(--text3);min-width:55px">'+it.freq+'</span>'+
(it.card?'<span style="font-size:9px;color:var(--text3);min-width:65px">'+esc(it.card)+'</span>':'')+
'<span style="font-family:var(--mono);font-size:10px;min-width:70px;text-align:right">\u0e3f'+fmt(it.amount)+(it.freq==='Monthly'?'/mo':it.freq==='Yearly'?'/yr':'/mo')+'</span></div>'});
detail+='</div></td></tr>'}
return '<tr style="cursor:pointer" onclick="var d=document.getElementById(\'type-detail-'+di+'\');if(d)d.style.display=d.style.display===\'none\'?\'\':\'none\'"><td>\u25b6 '+esc(d.name)+' <span style="font-size:9px;color:var(--text3)">('+items.length+')</span></td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(d.y)+'</td><td class="r" style="font-family:var(--mono);font-size:10px">'+pct+'%</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(d.y/nMo)+'</td></tr>'+detail}).join('')+
'<tr style="font-weight:700;background:var(--bg3)"><td>TOTAL</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(R.totE)+'</td><td class="r">100%</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(R.totE/nMo)+'</td></tr>'})()
renderCardAn()}


function swAn(el,tab){
el.parentElement.querySelectorAll('.sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');
document.querySelectorAll('#tab-analysis .sub-panel').forEach(function(p){p.classList.remove('active')});
document.getElementById('an-'+tab).classList.add('active');
if(tab==='card'){renderCardAn()}else{renderAnalysis()}}



function renderCardAn(){if(!SIM)return;var R=SIM;
var dk=document.documentElement.classList.contains('dark'),tc=dk?'#e8eaed':'#1a1d27',tc2=dk?'#6b7185':'#7a8098',gc=dk?'#353849':'#d4d7e0',bg2=dk?'#1a1d27':'#fff';
var cD=Object.keys(R.cardExp).sort().map(function(c,i){return{name:c,y:Math.round(R.cardExp[c]*100)/100,color:COLORS[i%COLORS.length]}}).filter(function(d){return d.y>0});
Highcharts.chart('chart-card-pie',{chart:{type:'pie',backgroundColor:'transparent'},title:{text:null},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>{point.y:,.2f}</b> ({point.percentage:.1f}%)'},
plotOptions:{pie:{allowPointSelect:true,cursor:'pointer',borderWidth:0,innerSize:'45%',
dataLabels:{enabled:true,format:'{point.name}: {point.percentage:.1f}%',style:{color:tc2,fontSize:'9px',textOutline:'none'}}}},
series:[{name:'By Card',data:cD}],credits:{enabled:false}});
var mK=Object.keys(R.mAgg).sort(),mL=mK.map(function(k){var a=R.mAgg[k];return MO[a.m]+' '+String(a.y).slice(2)});
var allC=Object.keys(R.cardExp).sort();
var cS=allC.map(function(c,ci){return{name:c,data:mK.map(function(k){return Math.round((R.mAgg[k].byCard[c]||0)*100)/100}),color:COLORS[ci%COLORS.length]}});
Highcharts.chart('chart-card-bar',{chart:{type:'column',backgroundColor:'transparent'},title:{text:null},
xAxis:{categories:mL,labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'},formatter:function(){return Highcharts.numberFormat(this.value/1000,0)+'K'}},gridLineColor:gc},
tooltip:{shared:true,backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},valuePrefix:'฿',valueDecimals:2},
plotOptions:{column:{stacking:'normal',borderRadius:2,borderWidth:0}},series:cS,
legend:{itemStyle:{color:tc2,fontSize:'9px'}},credits:{enabled:false}});
var nMo=mK.length||1;var bd=getCardBreakdown();
var el3=document.getElementById('card-summary-body');if(el3){var rows='';
cD.sort(function(a,b){return b.y-a.y}).forEach(function(d){
var pct=(d.y/R.totE*100).toFixed(1);
rows+='<tr style="cursor:pointer" onclick="togInstMonth(this)">';
rows+='<td><span class="arr" style="font-size:8px;color:var(--text3)">\u25b6</span> '+esc(d.name)+'</td>';
rows+='<td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(d.y)+'</td>';
rows+='<td class="r" style="font-family:var(--mono);font-size:10px">'+pct+'%</td>';
rows+='<td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(d.y/nMo)+'</td></tr>';
rows+='<tr class="acc-body"><td colspan="4" style="padding:0"><div style="padding:4px 8px 4px 28px;background:var(--bg3)">';
var cb=bd[d.name]||{monthly:[],yearly:[],installments:[]};
if(cb.monthly.length){rows+='<div style="font-size:9px;font-weight:600;color:var(--text3);padding:4px 0 2px">MONTHLY RECURRING</div>';
cb.monthly.forEach(function(it){var cls=it.direction==='income'?'color:var(--success)':'';
rows+='<div style="display:flex;gap:6px;padding:1px 0;font-size:10px;'+cls+'"><span style="flex:1">'+esc(it.name)+'</span><span style="font-family:var(--mono);min-width:70px;text-align:right">\u0e3f'+fmt(it.amount)+'/mo</span></div>'})}
if(cb.yearly.length){rows+='<div style="font-size:9px;font-weight:600;color:var(--text3);padding:4px 0 2px">YEARLY RECURRING</div>';
cb.yearly.forEach(function(it){var cls=it.direction==='income'?'color:var(--success)':'';var badge=it.pay_mode==='installment'?'<span class="tag tag-auto" style="font-size:7px;margin-left:4px">Installment</span>':'';
rows+='<div style="display:flex;gap:6px;padding:1px 0;font-size:10px;'+cls+'"><span style="flex:1">'+esc(it.name)+badge+'</span><span style="font-family:var(--mono);min-width:70px;text-align:right">\u0e3f'+fmt(it.amount)+'</span></div>'})}
if(cb.installments.length){rows+='<div style="font-size:9px;font-weight:600;color:var(--text3);padding:4px 0 2px">INSTALLMENTS</div>';
cb.installments.forEach(function(it){
rows+='<div style="display:flex;gap:6px;padding:1px 0;font-size:10px"><span style="flex:1">'+esc(it.name)+'</span><span style="font-size:8px;padding:0 4px;border-radius:4px;background:var(--bg);color:var(--text3);font-family:var(--mono)">'+it.periods+' periods</span><span style="font-family:var(--mono);min-width:70px;text-align:right">\u0e3f'+fmt(it.per_period)+'/mo</span><span style="font-family:var(--mono);min-width:80px;text-align:right;color:var(--text2)">\u0e3f'+fmt(it.total)+' total</span></div>'})}
if(!cb.monthly.length&&!cb.yearly.length&&!cb.installments.length){rows+='<div style="font-size:10px;color:var(--text3);padding:4px">No items found</div>'}
rows+='</div></td></tr>'});
rows+='<tr style="font-weight:700;background:var(--bg3)"><td>TOTAL</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(R.totE)+'</td><td class="r">100%</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(R.totE/nMo)+'</td></tr>';
el3.innerHTML=rows}}

// === TIMELINE ===

// ===== DASHBOARD CALENDAR (monthly view: bills + to-do tasks per date) =====
var _dashCalMonth=''; // 'YYYY-MM'; '' = current month
var _dashCalCache=[]; // per-render cache of occurrences/tasks for click-to-expand
var _dashCalShowAuto=true; // calendar: whether to show auto-pay bills
function dashCalNav(delta){
var base=_dashCalMonth||(function(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);})();
var y=parseInt(base.slice(0,4),10),m=parseInt(base.slice(5,7),10)-1;
m+=delta;while(m<0){m+=12;y--;}while(m>11){m-=12;y++;}
_dashCalMonth=y+'-'+('0'+(m+1)).slice(-2);
renderDashCalendar();
}
function dashCalToday(){_dashCalMonth='';renderDashCalendar();}
function dashCalToggleAuto(cb){_dashCalShowAuto=!!cb.checked;renderDashCalendar();}
function renderDashCalendar(){
var el=document.getElementById('dash-calendar');if(!el)return;
if(!D){el.innerHTML='';return;}
var now=new Date();now.setHours(0,0,0,0);
var base=_dashCalMonth||(now.getFullYear()+'-'+('0'+(now.getMonth()+1)).slice(-2));
var y=parseInt(base.slice(0,4),10),m=parseInt(base.slice(5,7),10)-1;
var first=new Date(y,m,1),last=new Date(y,m+1,0);
var daysIn=last.getDate();
// Bills for the month (by orig_due — the real bill day, un-shifted)
var occ=[];
// Fetch a WIDER window (prev month 1st .. next month last day). billOccurrences windows by the
// PAYMENT date, but a card-charged bill's payment can shift into an adjacent month while its real
// bill day (orig_due) stays in THIS month. Fetching neighbors ensures we still catch it; the cell
// filter below places each occurrence by orig_due within the visible month.
try{if(typeof billOccurrences==='function')occ=billOccurrences(new Date(y,m-1,1),new Date(y,m+2,0,23,59,59));}catch(e){occ=[];}
var billByDay={},prevByDay={},nextByDay={};
_dashCalCache=[]; // cache occurrences for click-to-expand popups (index = _calIdx)
// dayStatus[day] tracks the most urgent ACTION needed that day (for cell highlight):
// 2=overdue unpaid manual, 1=due-today unpaid manual. Auto/paid charges need no action.
var dayStatus={};
var _calToday=new Date();_calToday.setHours(0,0,0,0);
var _prevY=(m===0?y-1:y),_prevM=(m===0?11:m-1);
var _nextY=(m===11?y+1:y),_nextM=(m===11?0:m+1);
occ.forEach(function(o){
var d=o.orig_due||o.due;if(!d)return;
// Optional filter: hide auto-pay bills when the user unchecks "Show auto".
if(!_dashCalShowAuto&&o.auto_pay)return;
var oy=d.getFullYear(),om=d.getMonth(),day=d.getDate();
// Bucket into current / previous / next month (adjacent-month bills fill the faded edge cells).
var bucket=null;
if(oy===y&&om===m)bucket=billByDay;
else if(oy===_prevY&&om===_prevM)bucket=prevByDay;
else if(oy===_nextY&&om===_nextM)bucket=nextByDay;
else return;
// A consolidated statement's individual charges are surfaced as _surfaced rows; we DO show them
// (so manual bills like AIS appear on their own due date), but exclude them from the month total.
var idx=_dashCalCache.push(o)-1;o._calIdx=idx;
(bucket[day]=bucket[day]||[]).push(o);
// Action highlight: only for CURRENT-month charges that need a manual tap (not auto, not paid, not statements).
if(bucket===billByDay&&typeof billStatus==='function'&&o.kind!=='Card Statement'&&!o.auto_pay){
var st=billStatus(o,_calToday);
if(st==='overdue')dayStatus[day]=Math.max(dayStatus[day]||0,2);
else if(st==='due'){var diff=Math.round((d-_calToday)/86400000);if(diff===0)dayStatus[day]=Math.max(dayStatus[day]||0,1);}
}
});
// Bill-line HTML (shared by current-month cells and faded adjacent cells). `muted` dims adjacent-month bills.
function _calBillLine(o,muted){
var auto=o.auto_pay?' <span style="color:var(--text3)" title="auto-pay">\u26a1</span>':'';
var _isPaid=(o.paid||(typeof billStatus==='function'&&(function(){var s=billStatus(o,_calToday);return s==='paid'||s==='auto_paid';})()));
var col=(o.auto_pay||_isPaid)?'var(--text3)':'var(--error)';
var paidMark=_isPaid?' <span style="color:var(--text3)" title="paid">\u2713</span>':'';
var isStmt=(o.kind==='Card Statement'&&o.children&&o.children.length);
var caret=isStmt?'<span style="color:var(--text3);font-size:8px">\u25b8</span> ':'';
var bic=(typeof _billIcon==='function')?_billIcon(o):'';
var perLbl=(o.kind==='Installment'&&o.info)?' <span style="color:var(--text3);font-size:8px">'+esc(o.info)+'</span>':'';
var stmtNote=o._surfaced?' <span style="color:var(--text3);font-size:8px" title="also included in the '+esc(o._inStmtCard||o.card||'')+' statement">\u21b3'+esc(o._inStmtCard||o.card||'')+'</span>':'';
return '<div onclick="dashCalShow('+o._calIdx+')" title="'+esc(o.name)+(o.kind==='Installment'&&o.info?' '+esc(o.info):'')+' \u00b7 \u0e3f'+fmt(o.amount||0)+(o.auto_pay?' (auto)':'')+(isStmt?' \u00b7 click for breakdown':' \u00b7 click for details')+'" style="cursor:pointer;font-size:9px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:'+col+(muted?';opacity:.7':'')+'">'+caret+bic+' '+esc(o.name)+perLbl+stmtNote+auto+paidMark+' <span style="color:var(--text3)">\u0e3f'+fmt(o.amount||0)+'</span></div>';
}
// Tasks for the month (by due_date) — plus adjacent months for the faded edge cells.
var taskByDay={},prevTaskByDay={},nextTaskByDay={};
// Is the calendar currently showing the real current month? (ASAP tasks pin to today's cell only then.)
var _viewingThisMonth=(y===now.getFullYear()&&m===now.getMonth());
var _todayDom=now.getDate();
(D.todos||[]).forEach(function(t){
if(t.done)return;
// ASAP tasks (no specific date) surface in today's cell when viewing the current month.
if(t.deadline_mode==='asap'){if(_viewingThisMonth)(taskByDay[_todayDom]=taskByDay[_todayDom]||[]).push(t);return;}
if(t.deadline_mode!=='date'||!t.due_date)return;
var parts=t.due_date.split('-');if(parts.length!==3)return;
var ty=parseInt(parts[0],10),tm=parseInt(parts[1],10)-1,day=parseInt(parts[2],10);
if(ty===y&&tm===m)(taskByDay[day]=taskByDay[day]||[]).push(t);
else if(ty===_prevY&&tm===_prevM)(prevTaskByDay[day]=prevTaskByDay[day]||[]).push(t);
else if(ty===_nextY&&tm===_nextM)(nextTaskByDay[day]=nextTaskByDay[day]||[]).push(t);
});
// Task-line HTML (shared by current-month cells and faded adjacent cells). `muted` dims adjacent tasks.
function _calTaskLine(t,muted){
var tidx=_dashCalCache.push({_isTask:true,task:t})-1;
return '<div onclick="dashCalShow('+tidx+')" title="'+esc(t.title||'')+(t.category?' \u00b7 '+esc(t.category):'')+' \u00b7 click for details" style="cursor:pointer;font-size:9px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--accent)'+(muted?';opacity:.7':'')+'"><i class="fa-solid fa-list-check" style="width:14px;text-align:center"></i> '+esc(t.title||'')+'</div>';
}
// Build calendar grid (weeks start Sunday)
var startDow=first.getDay();
var h='<div class="card">';
h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">';
h+='<h2 style="margin:0"><i class="fa-solid fa-calendar-days"></i> Calendar</h2>';
h+='<span style="flex:1"></span>';
h+='<button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" onclick="dashCalNav(-1)" title="Previous month"><i class="fa-solid fa-chevron-left"></i></button>';
h+='<div style="font-weight:600;min-width:96px;text-align:center">'+MO[m]+' '+y+'</div>';
h+='<button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" onclick="dashCalNav(1)" title="Next month"><i class="fa-solid fa-chevron-right"></i></button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:4px 10px" onclick="dashCalToday()" title="Jump to current month">Today</button>';
h+='<label style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3);cursor:pointer;margin-left:4px" title="Show or hide auto-pay bills"><input type="checkbox" '+(_dashCalShowAuto?'checked':'')+' onchange="dashCalToggleAuto(this)"> Show auto</label>';
h+='</div>';
// Legend
h+='<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--text3);margin-bottom:8px">';
h+='<span><i class="fa-solid fa-credit-card" style="color:#7c3aed"></i> Card statement</span>';
h+='<span><i class="fa-solid fa-file-invoice"></i> Bill (icon by type)</span>';
h+='<span><span style="color:var(--text3)">\u26a1</span> Auto-pay</span>';
h+='<span><i class="fa-solid fa-list-check" style="color:var(--accent)"></i> Task</span>';
h+='</div>';
h+='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(dn,di){
var _we=(di===0||di===6);
h+='<div style="font-size:10px;font-weight:600;color:'+(_we?'var(--warning)':'var(--text3)')+';text-align:center;padding:2px">'+dn+'</div>';});
// Leading days: show the tail of the previous month, faded (not empty), so the first row starts Sunday.
var _prevLast=new Date(y,m,0).getDate();// last day of previous month
for(var b=0;b<startDow;b++){var _pd=_prevLast-startDow+1+b;
h+='<div style="min-height:74px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 4px;overflow:hidden;opacity:.6"><div style="font-size:10px;font-weight:600;color:var(--text3)">'+_pd+'</div>';
(prevByDay[_pd]||[]).forEach(function(o){h+=_calBillLine(o,true);});
(prevTaskByDay[_pd]||[]).forEach(function(t){h+=_calTaskLine(t,true);});
h+='</div>';}
for(var day=1;day<=daysIn;day++){
var isToday=(y===now.getFullYear()&&m===now.getMonth()&&day===now.getDate());
var _dow=new Date(y,m,day).getDay();var _isWe=(_dow===0||_dow===6);
var _act=dayStatus[day]||0;// 2=overdue,1=due today (manual, unpaid)
// Background priority: overdue (red) > due-today (amber) > today (blue) > weekend (soft amber) > normal.
var cellBg=_act===2?'rgba(220,38,38,0.10)':(_act===1?'rgba(245,158,11,0.12)':(isToday?'rgba(59,130,246,0.10)':(_isWe?'rgba(245,158,11,0.06)':'var(--bg2)')));
// Border priority: keep today's blue ring; else overdue red / due-today amber; else weekend/normal.
var cellBd=isToday?'border:1px solid var(--accent)':(_act===2?'border:1px solid var(--error)':(_act===1?'border:1px solid var(--warning)':(_isWe?'border:1px solid rgba(245,158,11,0.25)':'border:1px solid var(--border)')));
// Left accent bar for action days (doesn't shift layout).
var cellBar=_act===2?'box-shadow:inset 3px 0 0 var(--error);':(_act===1?'box-shadow:inset 3px 0 0 var(--warning);':'');
h+='<div style="min-height:74px;background:'+cellBg+';'+cellBd+';'+cellBar+'border-radius:6px;padding:3px 4px;overflow:hidden">';
h+='<div style="font-size:10px;font-weight:600;color:'+(isToday?'var(--accent)':'var(--text3)')+';margin-bottom:2px">'+day+'</div>';
var bills=billByDay[day]||[],tasks=taskByDay[day]||[];
bills.forEach(function(o){h+=_calBillLine(o,false);});
tasks.forEach(function(t){h+=_calTaskLine(t,false);});
h+='</div>';
}
// Trailing days: fill the last row with the start of next month, faded, so the row ends on Saturday.
var _usedCells=startDow+daysIn;var _trail=(7-(_usedCells%7))%7;
for(var tzi=1;tzi<=_trail;tzi++){
h+='<div style="min-height:74px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 4px;overflow:hidden;opacity:.6"><div style="font-size:10px;font-weight:600;color:var(--text3)">'+tzi+'</div>';
(nextByDay[tzi]||[]).forEach(function(o){h+=_calBillLine(o,true);});
(nextTaskByDay[tzi]||[]).forEach(function(t){h+=_calTaskLine(t,true);});
h+='</div>';}
h+='</div>';
// Monthly totals note
var totExp=0,nBills=0;Object.keys(billByDay).forEach(function(k){billByDay[k].forEach(function(o){if(o._surfaced)return;totExp+=(o.amount||0);nBills++;});});
var nTasks=0;Object.keys(taskByDay).forEach(function(k){nTasks+=taskByDay[k].length;});
h+='<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--text3)">';
h+='<span>'+nBills+' bill'+(nBills===1?'':'s')+' \u00b7 \u0e3f'+fmt(totExp)+'</span>';
h+='<span>'+nTasks+' task'+(nTasks===1?'':'s')+'</span>';
h+='</div>';
h+='</div>';
el.innerHTML=h;
}

// ===== Calendar item popup (click a calendar entry to see its breakdown/details) =====
function dashCalClosePop(){var ov=document.getElementById('dashcal-pop');if(ov)ov.remove();}
function dashCalShow(idx){
var o=_dashCalCache[idx];if(!o){return;}
dashCalClosePop();
var body='';
if(o._isTask){
var t=o.task;
body+='<div style="font-size:13px;font-weight:600;margin-bottom:8px">\u25cb '+esc(t.title||'(untitled)')+'</div>';
body+='<table style="width:100%;font-size:12px;border-collapse:collapse">';
if(t.category)body+='<tr><td style="color:var(--text3);padding:3px 0">Category</td><td style="text-align:right">'+esc(t.category)+'</td></tr>';
if(t.due_date)body+='<tr><td style="color:var(--text3);padding:3px 0">Due</td><td style="text-align:right">'+fmtDate(t.due_date)+(t.due_time?' '+esc(t.due_time):'')+'</td></tr>';
var pr={1:'High',2:'Normal',3:'Low'}[t.priority||2]||'Normal';
body+='<tr><td style="color:var(--text3);padding:3px 0">Priority</td><td style="text-align:right">'+pr+'</td></tr>';
if(t.note)body+='<tr><td style="color:var(--text3);padding:3px 0;vertical-align:top">Note</td><td style="text-align:right;white-space:pre-wrap">'+esc(t.note)+'</td></tr>';
body+='</table>';
body+='<div style="margin-top:12px;text-align:right"><button class="btn btn-ghost" style="font-size:11px" onclick="dashCalClosePop();var b=document.querySelector(\'.nav-tab[data-tab=&quot;todos&quot;]\');if(b)b.click();">Open To-Do \u2192</button></div>';
}else{
var isStmt=(o.kind==='Card Statement'&&o.children&&o.children.length);
var d=o.orig_due||o.due;
body+='<div style="font-size:13px;font-weight:600;margin-bottom:2px">'+(o.auto_pay?'\u26a1 ':'')+esc(o.name||'')+'</div>';
body+='<div style="font-size:11px;color:var(--text3);margin-bottom:8px">'+(o.kind||'Bill')+(d?' \u00b7 due '+fmtDate(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)):'')+(o.auto_pay?' \u00b7 auto-pay':'')+'</div>';
if(isStmt){
body+='<table style="width:100%;font-size:12px;border-collapse:collapse">';
body+='<thead><tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:4px 0;color:var(--text3);font-weight:600">Charge</th><th style="text-align:left;color:var(--text3);font-weight:600">Type</th><th style="text-align:right;color:var(--text3);font-weight:600">Amount</th></tr></thead><tbody>';
var kidSum=0;
o.children.forEach(function(ch){kidSum+=(ch.amount||0);
var cd=ch.orig_due||ch.due;
var chLbl=(ch.kind==='Installment'&&ch.info)?' <span style=\"font-size:9px;color:var(--text3)\">'+esc(ch.info)+'</span>':'';
body+='<tr><td style="padding:3px 0">'+(ch.auto_pay?'\u26a1 ':'')+esc(ch.name||'')+chLbl+(cd?' <span style=\"font-size:9px;color:var(--text3)\">'+cd.getDate()+'</span>':'')+'</td><td style="font-size:10px;color:var(--text3)">'+esc(ch.type||'')+'</td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(ch.amount||0)+'</td></tr>';
});
var extra=(o.amount||0)-kidSum;
if(extra>0.005)body+='<tr><td style="padding:3px 0;color:var(--primary)">+ extra spend</td><td></td><td style="text-align:right;font-family:var(--mono);color:var(--primary)">\u0e3f'+fmt(extra)+'</td></tr>';
body+='</tbody><tfoot><tr style="border-top:2px solid var(--border);font-weight:700"><td style="padding:5px 0">Total</td><td></td><td style="text-align:right;font-family:var(--mono)">\u0e3f'+fmt(o.amount||0)+'</td></tr></tfoot>';
body+='</table>';
body+='<div style="font-size:10px;color:var(--text3);margin-top:6px">'+o.children.length+' charge'+(o.children.length!==1?'s':'')+' on this '+esc(o.card||'')+' statement'+(extra>0.005?' (+ manually-added spend)':'')+'.</div>';
}else{
body+='<table style="width:100%;font-size:12px;border-collapse:collapse">';
body+='<tr><td style="color:var(--text3);padding:3px 0">Amount</td><td style="text-align:right;font-family:var(--mono);font-weight:600">\u0e3f'+fmt(o.amount||0)+'</td></tr>';
if(o.kind==='Installment'&&o.info)body+='<tr><td style="color:var(--text3);padding:3px 0">Period</td><td style="text-align:right">'+esc(o.info)+'</td></tr>';
if(o.type)body+='<tr><td style="color:var(--text3);padding:3px 0">Type</td><td style="text-align:right">'+esc(o.type)+'</td></tr>';
if(o.card&&o.card!=='Cash/Direct')body+='<tr><td style="color:var(--text3);padding:3px 0">Card</td><td style="text-align:right">'+esc(o.card)+'</td></tr>';
body+='<tr><td style="color:var(--text3);padding:3px 0">Payment</td><td style="text-align:right">'+(o.auto_pay?'Auto-charged':'Manual')+'</td></tr>';
body+='</table>';
}
// Open the Bills Reminder page (mirrors the To-Do task button) so the user can act on this bill.
body+='<div style="margin-top:12px;text-align:right"><button class="btn btn-ghost" style="font-size:11px" onclick="dashCalClosePop();var b=document.querySelector(\'.nav-tab[data-tab=&quot;billreminder&quot;]\');if(b)b.click();">Open Bills Reminder \u2192</button></div>';
}
var ov=document.createElement('div');
ov.id='dashcal-pop';
var _dk=document.documentElement.classList.contains('dark');
var _panelBg=_dk?'#1f2230':'#ffffff';var _panelFg=_dk?'#e8eaed':'#1a1d27';var _panelBd=_dk?'#3a3f52':'#d4d7e0';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
ov.onclick=function(e){if(e.target===ov)dashCalClosePop();};
ov.innerHTML='<div style="background:'+_panelBg+';color:'+_panelFg+';border:1px solid '+_panelBd+';border-radius:10px;max-width:420px;width:100%;max-height:80vh;overflow:auto;padding:16px 18px;box-shadow:0 16px 48px rgba(0,0,0,0.5)">'+body+'<div style="margin-top:14px;text-align:right"><button class="btn btn-ghost" style="font-size:11px" onclick="dashCalClosePop()">Close</button></div></div>';
document.body.appendChild(ov);
}

// ===== Apply dashboard layout (order + visibility) from D.dash_layout =====
// Maps each layout key to its DOM block, reorders them inside #tab-dashboard, and hides
// blocks the user turned off. Chart blocks are the .card wrapping the chart-box.
function applyDashLayout(){
var tab=document.getElementById('tab-dashboard');if(!tab||!D||!Array.isArray(D.dash_layout))return;
function blockEl(key){
if(key==='kpi')return document.getElementById('kpi-area');
if(key==='bills')return document.getElementById('dash-bills');
if(key==='todos')return document.getElementById('dash-todos');
if(key==='calendar')return document.getElementById('dash-calendar');
if(key==='cards')return document.getElementById('dash-cards');
var inner=null;
if(key==='chart_balance')inner=document.getElementById('chart-balance');
else if(key==='chart_monthly')inner=document.getElementById('chart-monthly');
else if(key==='gantt')inner=document.getElementById('chart-gantt');
if(inner){var p=inner;while(p&&p.parentElement!==tab)p=p.parentElement;return p;}
return null;
}
// The period banner (#dash-period) always stays first — it's not part of the configurable set.
var anchor=document.getElementById('dash-period');
D.dash_layout.forEach(function(x){
var el=blockEl(x.key);if(!el)return;
el.style.display=x.visible?'':'none';
tab.appendChild(el); // re-append in layout order (moves to end each time → final order = layout order)
});
// Keep the period banner at the very top.
if(anchor)tab.insertBefore(anchor,tab.firstChild);
}
