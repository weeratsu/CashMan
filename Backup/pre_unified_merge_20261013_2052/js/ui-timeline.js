
function tlToggleYears(open){document.querySelectorAll('#timeline-months [id^="tl-year-"]').forEach(function(b){b.style.display=open?'':'none'});
document.querySelectorAll('#timeline-months .tl-yr-hdr .arr').forEach(function(a){if(open)a.classList.add('open');else a.classList.remove('open')})}

function renderTimeline(){if(!SIM)return;var R=SIM,c=document.getElementById('timeline-months');var _allHtml='';var _today=new Date();

// Update period info
var _pi=document.getElementById('tl-period-info');
if(_pi&&D){var _sd=new Date(D.profile.start_date+'T00:00:00'),_ed=new Date(D.profile.end_date+'T00:00:00');
var _days=Math.round((_ed-_sd)/86400000),_mo=Math.round(_days/30.44);
_pi.innerHTML='<i class="fa-solid fa-circle-info" style="margin-right:3px"></i>'+
_days+' days'+(_mo>=2?' ('+_mo+' months)':'')+'  \u2022  Starting: \u0e3f'+fmt(D.profile.starting_cash)}

// Populate date inputs if present
var _fsd=document.getElementById('f-start');if(_fsd&&D)_fsd.value=D.profile.start_date;
var _fed=document.getElementById('f-end');if(_fed&&D)_fed.value=D.profile.end_date;

var bm={};R.dLog.forEach(function(e){var mk=e.date.getFullYear()+'-'+(e.date.getMonth()<10?'0':'')+e.date.getMonth();if(!bm[mk])bm[mk]=[];bm[mk].push(e)});

// Build running balance per event
var runBal=D.profile.starting_cash;
var balByEvent={};
R.dLog.forEach(function(entry){
var dk=entry.date.getFullYear()+'-'+(entry.date.getMonth()+1)+'-'+entry.date.getDate();
var evtBals=[];
entry.events.forEach(function(evt){
if(evt.group==='payroll_detail'){return;}
if(evt.group==='card_charge'){var _b=Math.round(runBal*100)/100;evt._bal=_b;evtBals.push(_b);return;}
runBal+=evt.amount;
var _b2=Math.round(runBal*100)/100;evt._bal=_b2;evtBals.push(_b2)});
balByEvent[dk]=evtBals});

var _tlGrpId=0;
// Group months by year
var sortedMks=Object.keys(R.mAgg).sort();
var yearGroups={},yearOrder=[];
sortedMks.forEach(function(mk){var ag=R.mAgg[mk];var yr=ag.y;if(!yearGroups[yr]){yearGroups[yr]=[];yearOrder.push(yr)}yearGroups[yr].push(mk)});

var _globalIdx=0;
yearOrder.forEach(function(yr){
var yrMks=yearGroups[yr];
// Compute year totals
var yrInc=0,yrExp=0;yrMks.forEach(function(mk){var a=R.mAgg[mk];yrInc+=a.income;yrExp+=a.expense});
var yrNet=yrInc-yrExp,yrNetCol=yrNet>=0?'var(--success)':'var(--error)';
var yrIsNow=(yr===new Date().getFullYear());
var yrOpen=yrIsNow||yearOrder.length<=2;
_allHtml+='<div class="acc-header tl-yr-hdr" style="background:var(--primary-bg);border:1px solid var(--primary);margin-top:8px;border-radius:var(--radius)" onclick="this.querySelector(\'.arr\').classList.toggle(\'open\');var b=document.getElementById(\'tl-year-'+yr+'\');b.style.display=b.style.display===\'none\'?\'\':\'none\'">'+
'<span class="arr '+(yrOpen?'open':'')+'">&#9654;</span><span style="flex:1;font-weight:700;font-size:13px;color:var(--primary)"><i class="fa-solid fa-calendar" style="margin-right:5px"></i>'+yr+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;color:var(--success);min-width:90px;text-align:right">+\u0e3f'+fmt(yrInc)+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;color:var(--error);min-width:90px;text-align:right">-\u0e3f'+fmt(yrExp)+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;font-weight:700;min-width:95px;text-align:right;color:'+yrNetCol+'">'+(yrNet>=0?'+':'')+'\u0e3f'+fmt(yrNet)+'</span></div>'+
'<div id="tl-year-'+yr+'" style="'+(yrOpen?'':'display:none')+'">';

yrMks.forEach(function(mk){var idx=_globalIdx++;var ag=R.mAgg[mk],net=ag.income-ag.expense,entries=bm[mk]||[],op=idx===0;
var _hasTd=(ag.y===new Date().getFullYear()&&ag.m===new Date().getMonth());op=op||_hasTd;
var endCol=ag.end>=ag.start?'var(--success)':'var(--error)';
var h='<div class="acc-header" onclick="this.querySelector(\'.arr\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')">'+
'<span class="arr '+(op?'open':'')+'">&#9654;</span><span style="flex:1;font-weight:600">'+MO[ag.m]+' '+ag.y+'</span>'+
'<span style="font-family:var(--mono);font-size:9px;color:var(--text3);min-width:90px;text-align:right">Open: \u0e3f'+fmt(ag.start)+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;color:var(--success);min-width:80px;text-align:right">+\u0e3f'+fmt(ag.income)+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;color:var(--error);min-width:80px;text-align:right">-\u0e3f'+fmt(ag.expense)+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;font-weight:600;min-width:95px;text-align:right;color:'+endCol+'">Close: \u0e3f'+fmt(ag.end)+'</span></div>'+
'<div class="acc-body '+(op?'open':'')+'">';
var _td=new Date(),_ty=_td.getFullYear(),_tm=_td.getMonth(),_tday=_td.getDate();
var _isThisMonth=(ag.y===_ty&&ag.m===_tm),_todayInserted=false,_prevBal=null;
entries.forEach(function(entry){var d=entry.date,ds=d.getDate()+' '+MO[d.getMonth()];
var dk2=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
var dayBals=balByEvent[dk2]||[];
if(_isThisMonth&&!_todayInserted&&d.getDate()>_tday){
var todayHasEvents=entries.some(function(e){return e.date.getDate()===_tday});
if(!todayHasEvents){
h+='<div class="day-row day-today" style="border-top:1px dashed var(--primary);border-bottom:1px dashed var(--primary);padding:6px 0">'+
'<span class="day-date" style="color:var(--primary);font-weight:700">'+_tday+' '+MO[_tm]+'</span>'+
'<span class="day-icon">\ud83d\udccd</span>'+
'<span class="day-name" style="color:var(--primary);font-weight:600">Today \u2014 no transactions</span>'+
'<span class="day-amt"></span>'+
(_prevBal!=null?'<span class="day-bal" style="color:var(--primary);font-weight:600">\u0e3f'+fmt(_prevBal)+'</span>':'<span class="day-bal"></span>')+'</div>'}
_todayInserted=true}
if(_isThisMonth&&d.getDate()===_tday)_todayInserted=true;
_prevBal=entry.balance;
var nL=entry.events.filter(function(e){return e.desc!=='Living'&&e.group!=='payroll_detail'});
var payDetails=entry.events.filter(function(e){return e.group==='payroll_detail'});

// Group events by card
var byCard={};var evtOrder=[];
nL.forEach(function(evt,origIdx){
var ck=evt.card||'Cash/Direct';
if(evt.group==='payroll_net')ck='__payroll__';
if(evt.group==='card_statement'||evt.group==='card_charge')ck='__stmt_'+(evt.card||'');
if(!byCard[ck])byCard[ck]=[];
byCard[ck].push({evt:evt,origIdx:origIdx})});
// Sort: payroll first, then Cash/Direct, then cards alphabetically
var cardKeys=Object.keys(byCard).sort(function(a,b){
if(a==='__payroll__')return -1;if(b==='__payroll__')return 1;
if(a==='Cash/Direct')return -1;if(b==='Cash/Direct')return 1;
if(a==='')return -1;if(b==='')return 1;
return a.localeCompare(b)});

var isFirstEvt=true;
var _isToday=d.getFullYear()+'_'+(d.getMonth()+1)+'_'+d.getDate()===_today.getFullYear()+'_'+(_today.getMonth()+1)+'_'+_today.getDate();

cardKeys.forEach(function(ck){
var items=byCard[ck];
var isPayroll=ck==='__payroll__';
var cardLabel=isPayroll?'':ck;
// Does this group contain a consolidated card statement? If so, render the statement as the
// header and its card charges (+ extra) as indented children — no intermediate "Card N items" level.
var stmtItem=null,childItems=[];
items.forEach(function(it){if(it.evt.group==='card_statement'&&!stmtItem){stmtItem=it;}else{childItems.push(it);}});

if(stmtItem){
// ----- Statement header + children -----
var sEvt=stmtItem.evt;
var sBal=(sEvt._bal!=null)?sEvt._bal:entry.balance;
var sBalCol=sBal>=0?'var(--primary)':'var(--error)';
var sBig=Math.abs(sEvt.amount)>=10000;
var gid='tlg'+(_tlGrpId++);
var hasKids=childItems.length>0;
h+='<div class="day-row" style="'+(hasKids?'cursor:pointer;':'')+'border-left:3px solid #7c3aed;background:rgba(124,58,237,0.08);border-radius:var(--radius-sm);margin:1px 0"'+(hasKids?' onclick="var b=document.getElementById(\''+gid+'\');b.style.display=b.style.display===\'none\'?\'\':\'none\';var a=this.querySelector(\'.arr\');if(a)a.classList.toggle(\'open\')"':'')+'>'+
'<span class="day-date">'+(isFirstEvt?ds:'')+'</span>'+
'<span class="day-icon">'+sEvt.icon+'</span>'+
'<span class="day-name">'+(hasKids?'<span class="arr" style="font-size:8px;color:#7c3aed;margin-right:3px">\u25b6</span>':'')+'<b style="color:#7c3aed">'+esc(sEvt.desc)+'</b>'+(sEvt.info?' <span style="font-size:8px;padding:0 4px;border-radius:4px;font-family:var(--mono);background:var(--bg3);color:var(--text3)">'+esc(sEvt.info)+'</span>':'')+'</span>'+
'<span class="day-amt" style="color:'+(sEvt.amount>0?'var(--success)':'')+';'+(sBig?'font-weight:700':'')+'">'+(sEvt.amount>0?'+':'-')+'\u0e3f'+fmt(sEvt.amount)+'</span>'+
'<span class="day-bal" style="color:'+sBalCol+'">\u0e3f'+fmt(sBal)+'</span></div>';
isFirstEvt=false;
if(hasKids){
h+='<div id="'+gid+'" style="display:none">';
childItems.forEach(function(item){
var evt=item.evt;
var ac=evt.amount>0?'var(--success)':'',sign=evt.amount>0?'+':'-';
var isExtra=(evt.desc&&evt.desc.indexOf('Extra spend')>=0);
h+='<div class="day-row" style="padding-left:38px;font-size:9px;opacity:'+(isExtra?'0.85':'0.6')+'">'+
'<span class="day-date"></span><span class="day-icon">'+evt.icon+'</span>'+
'<span class="day-name"'+(isExtra?' style="color:var(--primary)"':' style="color:var(--text3)"')+'>'+esc(evt.desc)+(evt.info?' <span style="font-size:7px;padding:0 3px;border-radius:3px;font-family:var(--mono);background:var(--bg3);color:var(--text3)">'+esc(evt.info)+'</span>':'')+'</span>'+
'<span class="day-amt" style="color:'+(isExtra?'var(--primary)':'var(--text3)')+'">'+sign+'\u0e3f'+fmt(evt.amount)+'</span>'+
'<span class="day-bal"></span></div>';});
h+='</div>';}
}
else if(items.length===1||isPayroll){
// ----- Single item or payroll: render flat -----
items.forEach(function(item){
var evt=item.evt;
var ac=evt.amount>0?'var(--success)':'',sign=evt.amount>0?'+':'-',big=Math.abs(evt.amount)>=10000;
var ct=evt.card?'<span class="day-card">'+esc(evt.card)+'</span>':'';
var isPay=evt.group==='payroll_net';
var isCardCharge=evt.group==='card_charge';
var evtBal=(evt._bal!=null)?evt._bal:entry.balance;
var balCol=evtBal>=0?'var(--primary)':'var(--error)';
var isFinal=evt.info&&evt.info.indexOf('\u2705')>=0;
var finalStyle=isFinal?'border-left:3px solid var(--success);background:var(--success-bg)':'';
var rowStyle2=(isCardCharge?'opacity:.55;':'')+finalStyle;
h+='<div class="day-row'+(_isToday?' day-today':'')+(isPay?' pay-row':'')+'"'+(isPay?' onclick="this.nextElementSibling.classList.toggle(\'open\')" style="cursor:pointer;'+finalStyle+'"':(rowStyle2?' style="'+rowStyle2+'"':''))+'>'+
'<span class="day-date">'+(isFirstEvt?ds:'')+'</span><span class="day-icon">'+evt.icon+'</span>'+
'<span class="day-name">'+(isFinal?'<b style="color:var(--success)">':'')+esc(evt.desc)+(isFinal?'</b>':'')+(isFinal?' <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--success);color:#fff;font-weight:700">\ud83c\udf89 FINAL '+esc(evt.info.replace(/[^0-9\/]/g,''))+'</span>':(evt.info?' <span style="font-size:8px;padding:0 4px;border-radius:4px;font-family:var(--mono);background:var(--bg3);color:var(--text3)">'+esc(evt.info)+'</span>':''))+ct+(isCardCharge?' <span style="font-size:8px;color:var(--text3)">on statement</span>':'')+(isPay?' <span style="font-size:8px;color:var(--text3)">\u25b6 details</span>':'')+'</span>'+
'<span class="day-amt" style="color:'+(isCardCharge?'var(--text3)':ac)+';'+(big&&!isCardCharge?'font-weight:700':'')+'">'+sign+'\u0e3f'+fmt(evt.amount)+'</span>'+
'<span class="day-bal" style="color:'+(isCardCharge?'var(--text3)':balCol)+'">'+(isCardCharge?'':'\u0e3f'+fmt(evtBal))+'</span></div>';
isFirstEvt=false;
if(isPay&&payDetails.length>0){h+='<div class="pay-details">';
payDetails.forEach(function(pd){var pSign=pd.amount>0?'+':'-',pCol=pd.amount>0?'var(--success)':'var(--error)';
h+='<div class="day-row" style="padding-left:48px;opacity:.7;font-size:9px"><span class="day-date"></span><span class="day-icon">'+pd.icon+'</span>'+
'<span class="day-name" style="color:var(--text3)">'+esc(pd.desc)+'</span>'+
'<span class="day-amt" style="color:'+pCol+';font-size:9px">'+pSign+'\u0e3f'+fmt(pd.amount)+'</span><span class="day-bal"></span></div>'});
h+='</div>'}
})}
else{
// ----- Multi-item card group WITHOUT a statement (e.g. consolidation off): collapsible -----
var grpTotal=items.reduce(function(s,it){return s+it.evt.amount},0);
var grpSign=grpTotal>0?'+':'-';
var grpCol=grpTotal>0?'var(--success)':'';
var grpEndBal=entry.balance;
items.forEach(function(it){if(it.evt._bal!=null)grpEndBal=it.evt._bal;});
var grpBalCol=grpEndBal>=0?'var(--primary)':'var(--error)';
var gid='tlg'+(_tlGrpId++);
var grpHasFinal=items.some(function(it){return it.evt.info&&it.evt.info.indexOf('\u2705')>=0});
h+='<div class="day-row" style="cursor:pointer;background:var(--bg3);border-radius:var(--radius-sm);margin:1px 0" onclick="var b=document.getElementById(\''+gid+'\');b.style.display=b.style.display===\'none\'?\'\':\'none\';this.querySelector(\'.arr\').classList.toggle(\'open\')">'+
'<span class="day-date">'+(isFirstEvt?ds:'')+'</span>'+
'<span class="day-icon"><span class="arr" style="font-size:8px;color:var(--text3)">\u25b6</span></span>'+
'<span class="day-name" style="font-weight:600"><span class="day-card" style="font-size:9px">'+esc(cardLabel)+'</span> <span style="font-size:9px;color:var(--text3)">'+items.length+' items</span>'+(grpHasFinal?' <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--success);color:#fff;font-weight:700">\ud83c\udf89 FINAL</span>':'')+'</span>'+
'<span class="day-amt" style="color:'+grpCol+';font-weight:600">'+grpSign+'\u0e3f'+fmt(grpTotal)+'</span>'+
'<span class="day-bal" style="color:'+grpBalCol+'">\u0e3f'+fmt(grpEndBal)+'</span></div>';
isFirstEvt=false;
h+='<div id="'+gid+'" style="display:none">';
items.forEach(function(item){
var evt=item.evt;
var ac=evt.amount>0?'var(--success)':'',sign=evt.amount>0?'+':'-',big=Math.abs(evt.amount)>=10000;
var evtBal=(evt._bal!=null)?evt._bal:entry.balance;
var balCol2=evtBal>=0?'var(--primary)':'var(--error)';
var isFinal2=evt.info&&evt.info.indexOf('\u2705')>=0;
h+='<div class="day-row" style="padding-left:38px;font-size:9px;'+(isFinal2?'opacity:1;border-left:3px solid var(--success);background:var(--success-bg)':'opacity:.85')+'">'+
'<span class="day-date"></span><span class="day-icon">'+evt.icon+'</span>'+
'<span class="day-name">'+(isFinal2?'<b style="color:var(--success)">':'')+esc(evt.desc)+(isFinal2?'</b>':'')+(isFinal2?' <span style="font-size:7px;padding:1px 4px;border-radius:3px;background:var(--success);color:#fff;font-weight:700">\ud83c\udf89 FINAL '+esc(evt.info.replace(/[^0-9\/]/g,''))+'</span>':(evt.info?' <span style="font-size:7px;padding:0 3px;border-radius:3px;font-family:var(--mono);background:var(--bg3);color:var(--text3)">'+esc(evt.info)+'</span>':''))+'</span>'+
'<span class="day-amt" style="color:'+ac+';'+(big?'font-weight:600':'')+'">'+sign+'\u0e3f'+fmt(evt.amount)+'</span>'+
'<span class="day-bal" style="color:'+balCol2+';font-size:9px">\u0e3f'+fmt(evtBal)+'</span></div>'});
h+='</div>'}
})});

// Today marker at end of month
if(_isThisMonth&&!_todayInserted){
var todayHasEvents2=entries.some(function(e){return e.date.getDate()===_tday});
if(!todayHasEvents2){
h+='<div class="day-row day-today" style="border-top:1px dashed var(--primary);border-bottom:1px dashed var(--primary);padding:6px 0">'+
'<span class="day-date" style="color:var(--primary);font-weight:700">'+_tday+' '+MO[_tm]+'</span>'+
'<span class="day-icon">\ud83d\udccd</span>'+
'<span class="day-name" style="color:var(--primary);font-weight:600">Today \u2014 no transactions</span>'+
'<span class="day-amt"></span>'+
(_prevBal!=null?'<span class="day-bal" style="color:var(--primary);font-weight:600">\u0e3f'+fmt(_prevBal)+'</span>':'<span class="day-bal"></span>')+'</div>'}}
var livingDays=new Date(ag.y,ag.m+1,0).getDate();
var sd2=new Date(D.profile.start_date+'T00:00:00');
if(ag.y===sd2.getFullYear()&&ag.m===sd2.getMonth())livingDays=livingDays-sd2.getDate()+1;
var livingAmt=D.profile.daily_living*livingDays;
if(livingAmt>0){h+='<div class="day-row" style="opacity:.6"><span class="day-date" style="font-size:9px">daily</span><span class="day-icon">\ud83c\udf7d\ufe0f</span>'+
'<span class="day-name" style="font-size:10px;color:var(--text3)">Living expenses (\u0e3f'+fmt(D.profile.daily_living)+'/day \u00d7 '+livingDays+' days)</span>'+
'<span class="day-amt" style="font-size:10px;color:var(--text3)">-\u0e3f'+fmt(livingAmt)+'</span><span class="day-bal"></span></div>'}

h+='<div class="day-row" style="background:var(--bg3);font-weight:600;border-radius:0 0 4px 4px"><span class="day-date"></span><span class="day-icon"></span><span class="day-name">End of Month</span><span class="day-amt"></span><span class="day-bal" style="color:var(--primary)">\u0e3f'+fmt(ag.end)+'</span></div></div>';
_allHtml+=h});

// Close year group
_allHtml+='</div>';
});
c.innerHTML=_allHtml}


function tlToggle(open){document.querySelectorAll('#timeline-months .acc-body').forEach(function(b){if(open)b.classList.add('open');else b.classList.remove('open')});
document.querySelectorAll('#timeline-months .acc-header .arr').forEach(function(a){if(open)a.classList.add('open');else a.classList.remove('open')})}

function tlToggleGroups(open){
document.querySelectorAll('#timeline-months [id^="tlg"]').forEach(function(g){g.style.display=open?'':'none'});
document.querySelectorAll('#timeline-months .day-row .arr').forEach(function(a){
if(open)a.classList.add('open');else a.classList.remove('open')})}
