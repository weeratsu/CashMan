// ui-payroll.js — Payroll Setup, Monthly Earnings, Tax Calculator, Tax Exemptions
function sortPayroll(col){
var st=sortState.payroll;if(st.col===col)st.asc=!st.asc;else{st.col=col;st.asc=true}
D.payroll.sort(function(a,b){if(a.type!==b.type)return a.type==='income'?-1:1;
var va=a[col],vb=b[col];if(typeof va==='number')return st.asc?va-vb:vb-va;
return st.asc?String(va||'').localeCompare(String(vb||'')):String(vb||'').localeCompare(String(va||''))});
renderPayroll()}

function renderPayroll(){
var incItems=[],dedItems=[];
D.payroll.forEach(function(p,i){p._gi=i;if(p.type==='income')incItems.push(p);else dedItems.push(p)});
var normalPay=computePayroll(1);var decPay=computePayroll(12);

function calcAmt(p,base){
if(p.calc_mode==='percent_epf'){return Math.round((base.epfBase)*(p.epf_pct||0)/100*100)/100}
if(p.calc_mode==='percent_sso'){var a=Math.round((base.ssoBase)*(p.sso_pct||5)/100*100)/100;if(p.sso_cap&&a>p.sso_cap)a=p.sso_cap;return a}
return p.amount}

function payRow(p){
var gi=p._gi;
var freqSel='<select class="sel" data-pi="'+gi+'" data-f="freq" onchange="readAll();renderPayroll()"><option value="every_month"'+(p.freq==='every_month'?' selected':'')+'>Every Month</option><option value="specific_month"'+(p.freq==='specific_month'?' selected':'')+'>Specific Month</option></select>';
var monthSel=p.freq==='specific_month'?'<select class="sel" data-pi="'+gi+'" data-f="month">'+MO.map(function(mn,mi){return '<option value="'+(mi+1)+'"'+(p.month===mi+1?' selected':'')+'>'+mn+'</option>'}).join('')+'</select>':'<span class="orig">All</span>';

var amtField;
if(p.calc_mode==='percent_epf'){var ca=calcAmt(p,normalPay);amtField='<span style="font-family:var(--mono);font-size:10px;color:var(--primary);font-weight:600">= ฿'+fmt(ca)+'</span>'}
else if(p.calc_mode==='percent_sso'){var ca2=calcAmt(p,normalPay);amtField='<span style="font-family:var(--mono);font-size:10px;color:var(--primary);font-weight:600">= ฿'+fmt(ca2)+'</span>'}
else{amtField='<input class="inp inp-num" type="text" value="'+fmt(p.amount)+'" style="width:75px;padding:2px 4px;font-size:10px" data-pi="'+gi+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})">'}

var calcSel='<select class="sel" data-pi="'+gi+'" data-f="calc_mode" onchange="readAll();renderPayroll()"><option value="fixed"'+(p.calc_mode==='fixed'?' selected':'')+'>Fixed ฿</option>'+(p.type==='deduction'?'<option value="percent_epf"'+(p.calc_mode==='percent_epf'?' selected':'')+'>% of EPF Base</option><option value="percent_sso"'+(p.calc_mode==='percent_sso'?' selected':'')+'>% of SSO Base</option>':'')+'</select>';

var pctField='';
if(p.calc_mode==='percent_epf'){pctField='<input type="number" class="inp inp-num" value="'+(p.epf_pct||0)+'" min="0" max="100" step="0.5" style="width:45px;padding:2px 4px;font-size:10px" data-pi="'+gi+'" data-f="epf_pct">%'}
else if(p.calc_mode==='percent_sso'){pctField='<input type="number" class="inp inp-num" value="'+(p.sso_pct||5)+'" min="0" max="100" step="0.5" style="width:35px;padding:2px 4px;font-size:10px" data-pi="'+gi+'" data-f="sso_pct">% cap <input type="text" class="inp inp-num" value="'+fmt(p.sso_cap||750)+'" style="width:55px;padding:2px 4px;font-size:10px" data-pi="'+gi+'" data-f="sso_cap" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})">'}

var chkE='<input type="checkbox" data-pi="'+gi+'" data-f="affects_epf" '+(p.affects_epf?'checked':'')+' onchange="D.payroll['+gi+'].affects_epf=this.checked" style="margin:0">';
var chkS='<input type="checkbox" data-pi="'+gi+'" data-f="affects_sso" '+(p.affects_sso?'checked':'')+' onchange="D.payroll['+gi+'].affects_sso=this.checked" style="margin:0">';
var chkT='<input type="checkbox" data-pi="'+gi+'" data-f="affects_tax" '+(p.affects_tax?'checked':'')+' onchange="D.payroll['+gi+'].affects_tax=this.checked" style="margin:0">';

return '<tr><td><input class="inp-inline" value="'+esc(p.name)+'" data-pi="'+gi+'" data-f="name"></td>'+
'<td class="r">'+amtField+'</td>'+
'<td>'+calcSel+(pctField?' '+pctField:'')+'</td>'+
'<td>'+freqSel+'</td><td>'+monthSel+'</td>'+
'<td style="text-align:center">'+chkE+'</td><td style="text-align:center">'+chkS+'</td><td style="text-align:center">'+chkT+'</td>'+
'<td><button class="del-btn" onclick="readAll();D.payroll.splice('+gi+',1);renderPayroll()"><i class="fa-solid fa-trash"></i></button></td></tr>'}

document.getElementById('pay-income-body').innerHTML=incItems.map(payRow).join('');
document.getElementById('pay-deduct-body').innerHTML=dedItems.map(payRow).join('');

var normal=computePayroll(1);var bonus=computePayroll(12);
document.getElementById('payroll-kpis').innerHTML=
'<div class="kpi"><div class="kpi-label">Monthly Gross</div><div class="kpi-val text-success">฿'+fmt(normal.gross)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Monthly Deductions</div><div class="kpi-val text-error">฿'+fmt(normal.deduct)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Monthly Net Pay</div><div class="kpi-val text-primary">฿'+fmt(normal.net)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">EPF Base</div><div class="kpi-val">฿'+fmt(normal.epfBase)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Dec Gross (+Bonus)</div><div class="kpi-val text-success">฿'+fmt(bonus.gross)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Dec Net Pay</div><div class="kpi-val text-primary">฿'+fmt(bonus.net)+'</div></div>';
var psTbl='<table class="tbl"><thead><tr><th>Component</th><th>Type</th><th>Freq</th><th class="r">Monthly</th><th class="r">Annual</th></tr></thead><tbody>';
D.payroll.forEach(function(p){
var isInc=p.type==='income';var mAmt=0,aAmt=0;
if(p.calc_mode==='percent_epf'){mAmt=Math.round(normalPay.epfBase*(p.epf_pct||0)/100*100)/100}
else if(p.calc_mode==='percent_sso'){mAmt=Math.round(normalPay.ssoBase*(p.sso_pct||5)/100*100)/100;if(p.sso_cap&&mAmt>p.sso_cap)mAmt=p.sso_cap}
else{mAmt=p.amount}
if(p.freq==='every_month'){aAmt=mAmt*12}else{aAmt=mAmt;mAmt=Math.round(mAmt/12*100)/100}
var sign=isInc?'+':'-';var col=isInc?'var(--success)':'var(--error)';
psTbl+='<tr><td>'+esc(p.name)+'</td><td style="font-size:9px;color:var(--text3)">'+(isInc?'Income':'Deduction')+'</td><td style="font-size:9px;color:var(--text3)">'+(p.freq==='every_month'?'Monthly':MO[(p.month||1)-1])+'</td><td class="r" style="font-family:var(--mono);font-size:10px;color:'+col+'">'+sign+'฿'+fmt(mAmt)+'</td><td class="r" style="font-family:var(--mono);font-size:10px;color:'+col+'">'+sign+'฿'+fmt(aAmt)+'</td></tr>'});
var annualNet=normal.net*12+(bonus.net-normal.net);
psTbl+='<tr style="font-weight:700;background:var(--bg3)"><td colspan="3">NET PAY</td><td class="r" style="font-family:var(--mono);font-size:10px;color:var(--primary)">฿'+fmt(normal.net)+'</td><td class="r" style="font-family:var(--mono);font-size:10px;color:var(--primary)">฿'+fmt(annualNet)+'</td></tr></tbody></table>';
document.getElementById('payroll-summary-tbl').innerHTML=psTbl}


function addPayItem(type){readAll();D.payroll.push({name:'New '+(type==='income'?'Income':'Deduction'),type:type,amount:0,freq:'every_month',month:null,notes:'',affects_epf:(type==='income'),affects_sso:(type==='income'),affects_tax:(type==='income'),calc_mode:'fixed'});renderPayroll()}


// TAX_BRACKETS defined in simulation.js


function swPayTax(el,tab){document.querySelectorAll('#tab-paytax .sub-panel').forEach(function(p){p.classList.remove('active')});document.querySelectorAll('#tab-paytax .sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('pt-'+tab).classList.add('active');
if(tab==='tax-calc')try{renderTax()}catch(e){};if(tab==='tax-exempt')try{renderExemptions()}catch(e){};if(tab==='monthly-earn')try{renderMonthlyEarnings()}catch(e){}}


function swTax(el,tab){
el.parentElement.querySelectorAll('.sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');
document.querySelectorAll('#tab-paytax .sub-panel').forEach(function(p){p.classList.remove('active')});
document.getElementById('tax-'+tab).classList.add('active');renderTax()}



function applyTaxOverride(){
var el=document.getElementById('tax-override-input');
if(!el)return;
var v=el.value;
D.tax_actual_override=v?pn(v):null;
sS(SKEY,JSON.stringify(D));
location.hash='tax';location.reload()}

function resetTaxOverride(){
D.tax_actual_override=null;
sS(SKEY,JSON.stringify(D));
location.hash='tax';location.reload()}

function renderTax(){
var tyd=document.getElementById('tax-year-display');
if(tyd)tyd.textContent=D.tax_year||new Date().getFullYear();
// Check if tax year is after separation — no payroll income
var _retOn=D.retirement&&D.retirement.enabled&&D.retirement.separation_date;
if(_retOn){
var _sepYr=parseInt(D.retirement.separation_date.slice(0,4));
var _ty=D.tax_year||new Date().getFullYear();
if(_ty>_sepYr){
document.getElementById('tax-kpis').innerHTML='<div style="padding:20px;text-align:center;color:var(--text3)"><i class="fa-solid fa-calendar-xmark" style="font-size:24px;margin-bottom:8px;display:block"></i><div style="font-size:12px;font-weight:600">No payroll income in '+_ty+'</div><div style="font-size:10px;margin-top:4px">Separation date: '+fmtDate(D.retirement.separation_date)+'</div><div style="font-size:9px;margin-top:2px">Select '+_sepYr+' or earlier to see tax calculations.</div></div>';
var brkEl=document.getElementById('tax-bracket-body');if(brkEl)brkEl.innerHTML='';
try{var tyEl=document.getElementById('tax-year-selector-area');
if(tyEl){var yrSel2='<select class="sel" id="tax-year-sel" onchange="D.tax_year=parseInt(this.value);saveD();simulate();renderTax();renderDash();toast(this.value)">';
var _curYr2=new Date().getFullYear();for(var yi2=_curYr2-2;yi2<=_curYr2+15;yi2++){yrSel2+='<option value="'+yi2+'"'+(D.tax_year===yi2?' selected':'')+'>'+yi2+'</option>'}
yrSel2+='</select>';tyEl.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg3);border-radius:var(--radius-sm);font-size:10px">'+'<span style="color:var(--text3)">Tax Year:</span>'+yrSel2+'</div>'}}catch(e){}
return}}
try{
var info=getAnnualTaxableIncome();var result=calcTax(info.taxable);
document.getElementById('tax-kpis').innerHTML=
'<div class="kpi"><div class="kpi-label">Annual Gross</div><div class="kpi-val">\u0e3f'+fmt(info.gross)+'</div>'+(info.payMonths&&info.payMonths<12?'<div class="kpi-note">'+info.payMonths+' months (to separation)</div>':'')+'</div>'+
'<div class="kpi"><div class="kpi-label">Taxable Gross</div><div class="kpi-val">\u0e3f'+fmt(info.taxableGross)+'</div><div class="kpi-note">Income flagged as taxable</div></div>'+
'<div class="kpi"><div class="kpi-label">Total Exemptions</div><div class="kpi-val text-success">-\u0e3f'+fmt(info.exemptions)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Net Taxable</div><div class="kpi-val text-warning">\u0e3f'+fmt(info.taxable)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Annual Tax</div><div class="kpi-val text-error">\u0e3f'+fmt(result.total)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Monthly Tax</div><div class="kpi-val text-error">\u0e3f'+fmt(result.total/12)+'</div><div class="kpi-note">Effective '+result.effective.toFixed(2)+'%</div></div>';
}catch(e){var info={gross:0,taxableGross:0,exemptions:0,taxable:0};var result={total:0,details:[],effective:0}}
// Show pro-rating info if retirement active
if(_retOn&&info.payMonths&&info.payMonths<12){
document.getElementById('tax-kpis').innerHTML+='<div style="grid-column:1/-1;padding:6px 10px;background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius-sm);font-size:10px;color:var(--warning)"><i class="fa-solid fa-info-circle" style="margin-right:4px"></i> Calculating for <b>'+info.payMonths+' months</b> of payroll (separation: '+fmtDate(D.retirement.separation_date)+'). To calculate full year, disable Retirement simulation in the <b>Retirement</b> tab.</div>'}
var withheld=0;try{withheld=getAnnualTaxWithheld()}catch(e){}var diff=withheld-result.total;var isRefund=diff>0;
document.getElementById('tax-kpis').innerHTML+=
'<div class="kpi" style="border-left:3px solid var(--border2)"><div class="kpi-label">Actual Withheld</div><div class="kpi-val">\u0e3f'+fmt(withheld)+'</div><div class="kpi-note">'+(withheld>0?(D.tax_actual_override!=null&&D.tax_actual_override!==''?'Manual override':'From payroll tax items'):'\u2757 Enter below or set in Payroll')+'</div></div>'+
'<div class="kpi" style="border-left:3px solid '+(withheld===0?'var(--border2)':(isRefund?'var(--success)':'var(--error)'))+'"><div class="kpi-label">'+(withheld===0?'\ud83d\udcdd Enter Withheld Tax':(isRefund?'\u2705 Tax Refund':'\u26a0\ufe0f Tax Owed'))+'</div><div class="kpi-val '+(withheld===0?'text-muted':(isRefund?'text-success':'text-error'))+'">\u0e3f'+fmt(Math.abs(diff))+'</div><div class="kpi-note">'+(withheld===0?'Use override below to calculate refund':(isRefund?'Overpaid \u2014 you get this back':'Underpaid \u2014 you owe this'))+'</div></div>';


try{var ohEl=document.getElementById('tax-override-area');
if(ohEl)ohEl.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin:8px 0;padding:8px 12px;background:var(--bg3);border-radius:var(--radius-sm);font-size:10px">'+
'<span style="color:var(--text3)">\u270f\ufe0f Override actual tax withheld:</span>'+
'<input class="inp inp-num" type="text" id="tax-override-input" value="'+(D.tax_actual_override!=null&&D.tax_actual_override!==''?fmt(D.tax_actual_override):'')+'" placeholder="Auto from payroll" style="width:130px;padding:3px 6px;font-size:10px">'+
'<button class="btn btn-ghost" style="font-size:9px;padding:3px 8px" onclick="applyTaxOverride()">Apply</button>'+
'<button class="btn btn-ghost" style="font-size:9px;padding:3px 8px" onclick="resetTaxOverride()">Reset</button>'+
'</div>';}catch(e){}

var tyEl=document.getElementById('tax-year-selector-area');
if(tyEl){var yrSel='<select class="sel" id="tax-year-sel" onchange="D.tax_year=parseInt(this.value);saveD();simulate();renderTax();renderDash();toast(this.value)">';
var _curYr=new Date().getFullYear();for(var yi=_curYr-2;yi<=_curYr+15;yi++){yrSel+='<option value="'+yi+'"'+(D.tax_year===yi?' selected':'')+'>'+yi+'</option>'}
yrSel+='</select>';
tyEl.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg3);border-radius:var(--radius-sm);font-size:10px;margin-bottom:4px">'+
'<span style="color:var(--text3)">\ud83d\udcc5 Tax Year:</span>'+yrSel+
'</div>'}
var rmEl=document.getElementById('tax-refund-month-area');
if(rmEl){var moSel='<select class="sel" id="tax-refund-month-sel" onchange="D.tax_refund_month=parseInt(this.value);saveD();simulate();renderAllTabs()">';
for(var mi=1;mi<=12;mi++){moSel+='<option value="'+mi+'"'+(D.tax_refund_month===mi?' selected':'')+'>'+MO[mi-1]+'</option>'}
moSel+='</select>';
var _rfDay=(D.tax_refund_day==null?15:D.tax_refund_day);
var daySel='<select class="sel" id="tax-refund-day-sel" onchange="D.tax_refund_day=(this.value===\'last\'?\'last\':parseInt(this.value));saveD();simulate();renderAllTabs()">';
for(var _dd=1;_dd<=31;_dd++){daySel+='<option value="'+_dd+'"'+(_rfDay===_dd?' selected':'')+'>'+_dd+'</option>'}
daySel+='<option value="last"'+(_rfDay==='last'?' selected':'')+'>Last day</option></select>';
rmEl.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg3);border-radius:var(--radius-sm);font-size:10px;margin-bottom:8px">'+
'<span style="color:var(--text3)">\ud83d\udcc5 Tax refund/filing month:</span>'+moSel+
'<span style="color:var(--text3)">Day:</span>'+daySel+
'<span style="color:var(--text3);font-size:9px">(refund or payment appears in the timeline on this day of the chosen month, in the following year)</span>'+
'</div>'}
try{document.getElementById('tax-brackets-body').innerHTML=result.details.map(function(d){
return '<tr'+(d.amount>0?' style="font-weight:500"':' style="opacity:.4"')+'><td>'+d.label+'</td><td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(d.amount)+'</td><td class="r" style="font-family:var(--mono);font-size:10px">'+(d.rate*100)+'%</td><td class="r" style="font-family:var(--mono);font-size:10px;'+(d.tax>0?'color:var(--error)':'')+'">\u0e3f'+fmt(d.tax)+'</td></tr>'}).join('')+
'<tr style="font-weight:700;background:var(--bg3)"><td>TOTAL TAX</td><td></td><td class="r" style="font-family:var(--mono);font-size:10px">'+result.effective.toFixed(2)+'%</td><td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">\u0e3f'+fmt(result.total)+'</td></tr>';

}catch(e){}
try{var recEl=document.getElementById('tax-recommendation');
if(recEl){
var ti=info.taxable,recH='';
var curBracketIdx=-1;
for(var bi=TAX_BRACKETS.length-1;bi>=0;bi--){if(ti>TAX_BRACKETS[bi].min){curBracketIdx=bi;break}}
if(curBracketIdx>0){
var curB=TAX_BRACKETS[curBracketIdx];
var prevB=TAX_BRACKETS[curBracketIdx-1];
var extraNeeded=ti-curB.min;
var curTax=calcTax(ti).total;
var newTax=calcTax(curB.min).total;
var savings=curTax-newTax;
var targetLabel=prevB.label;
var curRate=curB.rate*100;
var prevRate=prevB.rate*100;
recH='<div style="background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(16,185,129,0.08));border:1px solid var(--primary);border-radius:var(--radius);padding:12px;margin-top:10px">'+
'<div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:6px">\ud83d\udca1 Tax Optimization Tip</div>'+
'<div style="font-size:10px;line-height:1.6;color:var(--text2)">'+
'You are currently in the <strong>'+curRate+'% bracket</strong> ('+curB.label+').<br>'+
'Add <strong style="color:var(--primary)">\u0e3f'+fmt(extraNeeded)+'</strong> more in exemptions/deductions to drop to the <strong>'+prevRate+'% bracket</strong>.<br><br>'+
'<div style="display:flex;gap:16px;flex-wrap:wrap">'+
'<div style="text-align:center"><div style="font-size:9px;color:var(--text3)">Extra Exemption Needed</div><div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--primary)">\u0e3f'+fmt(extraNeeded)+'</div></div>'+
'<div style="text-align:center"><div style="font-size:9px;color:var(--text3)">Annual Tax Savings</div><div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--success)">\u0e3f'+fmt(savings)+'</div></div>'+
'<div style="text-align:center"><div style="font-size:9px;color:var(--text3)">New Annual Tax</div><div style="font-family:var(--mono);font-size:14px;font-weight:700">\u0e3f'+fmt(newTax)+'</div></div>'+
'<div style="text-align:center"><div style="font-size:9px;color:var(--text3)">New Monthly Tax</div><div style="font-family:var(--mono);font-size:14px;font-weight:700">\u0e3f'+fmt(newTax/12)+'</div></div>'+
'</div><br>'+
'<div style="font-size:9px;color:var(--text3)">Consider: RMF, SSF, Thai ESG, Life Insurance, Provident Fund, or Donations to reach this target.</div>'+
'</div></div>'}
else if(curBracketIdx===0){
recH='<div style="background:rgba(16,185,129,0.08);border:1px solid var(--success);border-radius:var(--radius);padding:12px;margin-top:10px">'+
'<div style="font-size:11px;font-weight:700;color:var(--success)">\u2705 You are in the tax-exempt bracket!</div>'+
'<div style="font-size:10px;color:var(--text3)">Net taxable income is under \u0e3f150,000 \u2014 no income tax due.</div></div>'}
recEl.innerHTML=recH}}catch(e){}

renderExemptions();renderMonthlyEarnings()}


function toggleInsSelection(exemptId,policyName,checked){
var selKey=exemptId+'::'+policyName;
D.tax_ins_selections[selKey]=checked;
// Recalculate total from selections for this exemption
var selTotal=0;D.yearly.forEach(function(y){if(y.type==='Insurance'&&D.tax_ins_selections[exemptId+'::'+y.name]===true)selTotal+=y.amount});
var ex=D.tax_exemptions.find(function(e){return e.id===exemptId});
if(ex){var cat=getCatalogItem(exemptId);ex.amount=Math.min(selTotal,cat?cat.max:Infinity)}
saveD();renderExemptions()}

function toggleOverride(i){
readAll();var e=D.tax_exemptions[i];
if(e.override==null){e.override=e._autoVal||e.amount}
else{e.override=null}
saveAll();renderTax()}


function renderExemptions(){
calcAutoExemptions();
var annualGross=getAnnualGross();
// Cross-validation: compute group totals
var crossTotals={};
TAX_CROSS_RULES.forEach(function(r){crossTotals[r.group]=0});
D.tax_exemptions.forEach(function(e){
var cat=e.id?getCatalogItem(e.id):null;
if(cat&&cat.validation&&cat.validation.cross_group){
var mx=cat.max>0?cat.max:Infinity;var effA=e.override!=null?Math.min(e.override,mx):Math.min(e.amount,mx);
crossTotals[cat.validation.cross_group]=(crossTotals[cat.validation.cross_group]||0)+effA}});

var h='';
D.tax_exemptions.forEach(function(e,i){
var cat=e.id?getCatalogItem(e.id):null;
var isAuto=(e.source&&e.source.indexOf('auto')===0)||e.source==='fixed';
var isFixed=e.source==='fixed';
var hasOverride=e.override!=null&&e.override!==0;
var effMax=cat?cat.max:(e.max||0);
var displayName=cat?cat.name:(e.name||'Custom');
var displayNotes=cat?cat.notes:(e.notes||'');
var vld=cat&&cat.validation?cat.validation:{type:'manual'};

// Compute effective max for percent_cap types
var pctCapAmt=Infinity;
if(vld.type==='percent_cap'){pctCapAmt=Math.round(annualGross*vld.pct/100);if(effMax>0)pctCapAmt=Math.min(pctCapAmt,effMax)}
var actualMax=vld.type==='percent_cap'?pctCapAmt:(effMax>0?effMax:Infinity);

// For per_unit: compute from units
if(vld.type==='per_unit'){var uAmt=vld.unit_amt||0;e.amount=(e.units||0)*uAmt;actualMax=vld.max_units?(vld.max_units*uAmt):Infinity}

// Effective amount
var effAmt=hasOverride?Math.min(e.override,actualMax):Math.min(e.amount,actualMax);
if(isFixed)effAmt=effMax;

// Donation max
if(vld.type==='percent_net'||vld.type==='percent_net_x2'){
var nonDonExempt=D.tax_exemptions.reduce(function(s,ex){
var c2=ex.id?getCatalogItem(ex.id):null;var v2=c2&&c2.validation?c2.validation:{};
if(v2.type==='percent_net'||v2.type==='percent_net_x2')return s;
return s+(ex.override!=null?ex.override:ex.amount)},0);
var netAfter=Math.max(0,annualGross-nonDonExempt);actualMax=Math.round(netAfter*vld.pct/100)}

// Validation
var valIcon='\u2705',valMsg='',valCls='';
if(!isFixed&&!isAuto&&e.amount>actualMax&&actualMax!==Infinity){
valIcon='\u26a0\ufe0f';valMsg='Over max \u0e3f'+fmt(actualMax);valCls='color:var(--warning)'}
if(vld.cross_group){var rule=TAX_CROSS_RULES.find(function(r){return r.group===vld.cross_group});
if(rule&&crossTotals[vld.cross_group]>rule.max){valIcon='\u26a0\ufe0f';valMsg=rule.label;valCls='color:var(--warning)'}}
if(e.amount===0&&!isAuto&&!isFixed){valIcon='';valMsg=''}

// Badge
var badge='';
if(isFixed)badge='<span style="font-size:8px;padding:1px 5px;border-radius:8px;background:var(--bg3);color:var(--text3);margin-left:4px">Fixed</span>';
else if(isAuto&&!hasOverride)badge='<span style="font-size:8px;padding:1px 5px;border-radius:8px;background:var(--primary);color:#fff;margin-left:4px">Auto</span>';
else if(isAuto&&hasOverride)badge='<span style="font-size:8px;padding:1px 5px;border-radius:8px;background:var(--warning);color:#fff;margin-left:4px">Override</span>';

// Amount cell
var amtCell='';
if(isFixed){
amtCell='<span style="font-family:var(--mono);font-size:10px;font-weight:600">\u0e3f'+fmt(effMax)+'</span>'
}else if(vld.type==='select_ins'){
// Show editable input pre-filled from selections, user can override
var selTotal=0;var _eid=e.id||'';D.yearly.forEach(function(y){if(y.type==='Insurance'&&D.tax_ins_selections[_eid+'::'+y.name]===true)selTotal+=y.amount});
var insAmt=e.amount||0;
amtCell='<input class="inp inp-num" type="text" value="'+fmt(insAmt)+'" style="width:80px;padding:2px 4px;font-size:10px" data-ti="'+i+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\\x27\\x27));this.value=v||\\x27\\x27;" onblur="this.value=(parseFloat(this.value.replace(/,/g,\\x27\\x27))||0).toLocaleString(\\x27en-US\\x27,{minimumFractionDigits:2,maximumFractionDigits:2})">'+
(selTotal>0?' <span style="font-size:8px;color:var(--text3)">selected: \u0e3f'+fmt(selTotal)+'</span>':'')
}else if(vld.type==='per_unit'){
var units=e.units||0;var uA=vld.unit_amt||0;
amtCell='<input type="number" class="inp inp-num" value="'+units+'" min="0"'+(vld.max_units?' max="'+vld.max_units+'"':'')+' style="width:40px;padding:2px 4px;font-size:10px" data-ti="'+i+'" data-f="units" onchange="readAll();renderExemptions()"> '+esc(vld.label||'')+' \u00d7 \u0e3f'+fmt(uA)+' = <span style="font-family:var(--mono);font-weight:600">\u0e3f'+fmt(units*uA)+'</span>'
}else if(isAuto&&!hasOverride){
amtCell='<span style="font-family:var(--mono);font-size:10px;font-weight:600;color:var(--primary)">\u0e3f'+fmt(effAmt)+'</span>'
}else if(isAuto&&hasOverride){
amtCell='<input class="inp inp-num" type="text" value="'+fmt(e.override)+'" style="width:80px;padding:2px 4px;font-size:10px;border-color:var(--warning)" data-ti="'+i+'" data-f="override" onfocus="var v=parseFloat(this.value.replace(/,/g,\x27\x27));this.value=v||\x27\x27;" onblur="this.value=(parseFloat(this.value.replace(/,/g,\x27\x27))||0).toLocaleString(\x27en-US\x27,{minimumFractionDigits:2,maximumFractionDigits:2})"> <span style="font-size:8px;color:var(--text3)">auto: \u0e3f'+fmt(e._autoVal||0)+'</span>'
}else{
amtCell='<input class="inp inp-num" type="text" value="'+fmt(e.amount)+'" style="width:80px;padding:2px 4px;font-size:10px" data-ti="'+i+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\x27\x27));this.value=v||\x27\x27;" onblur="this.value=(parseFloat(this.value.replace(/,/g,\x27\x27))||0).toLocaleString(\x27en-US\x27,{minimumFractionDigits:2,maximumFractionDigits:2})">'
}

// Max display
var maxDisp=actualMax===Infinity?'\u221e':'\u0e3f'+fmt(actualMax);
if(vld.type==='percent_cap'){maxDisp='\u0e3f'+fmt(pctCapAmt)+' <span style="font-size:8px;color:var(--text3)">('+vld.pct+'%)</span>'}
if(vld.type==='percent_net'||vld.type==='percent_net_x2'){maxDisp='\u0e3f'+fmt(actualMax)+' <span style="font-size:8px;color:var(--text3)">('+vld.pct+'% net)</span>'}

// Actions
var actCell='';
if(isAuto&&e.source!=='fixed'){
if(hasOverride)actCell='<button class="del-btn" title="Reset to auto" onclick="toggleOverride('+i+')" style="font-size:9px;padding:1px 4px">\ud83d\udd04</button>';
else actCell='<button class="del-btn" title="Override" onclick="toggleOverride('+i+')" style="font-size:9px;padding:1px 4px">\u270f\ufe0f</button>'}
if(!isAuto&&!isFixed){actCell='<button class="del-btn" title="Remove" onclick="removeExemption('+i+')"><i class="fa-solid fa-trash"></i></button>'}

h+='<tr'+(hasOverride?' style="background:rgba(245,158,11,0.05)"':'')+'>'+
'<td>'+esc(displayName)+badge+'</td>'+
'<td class="r" style="white-space:nowrap">'+amtCell+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--text3)">'+maxDisp+'</td>'+
'<td style="font-size:9px;'+valCls+'">'+valIcon+(valMsg?' <span style="font-size:8px">'+esc(valMsg)+'</span>':'')+'</td>'+
'<td style="font-size:9px;color:var(--text3)">'+esc(displayNotes)+'</td>'+
'<td>'+actCell+'</td></tr>';

// For select_ins: show expandable insurance policy selector
if(vld.type==='select_ins'){
var insFilter=vld.ins_filter||'';
var exId=e.id||'';
var allIns=D.yearly.filter(function(y){return y.type==='Insurance'});
if(allIns.length>0){
h+='<tr id="ins-select-row-'+i+'"><td colspan="6" style="padding:0;background:var(--bg2)">';
h+='<div style="padding:8px 12px 8px 24px;border-left:3px solid var(--primary)">';
h+='<div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:6px"><i class="fa-solid fa-list-check" style="margin-right:4px"></i>Select policies for '+esc(displayName)+' (from Yearly Recurring \u2192 Insurance):</div>';
allIns.forEach(function(y,yi){
var selKey=exId+'::'+y.name;var checked=D.tax_ins_selections[selKey]===true;
var ownBadge=y.own_by&&y.own_by!=='Me'?' <span style="font-size:8px;padding:0 4px;border-radius:6px;background:var(--purple-bg);color:var(--purple)">'+esc(y.own_by)+'</span>':'';
h+='<label style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:10px;cursor:pointer">'+
'<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleInsSelection(\''+esc(exId)+'\',\''+esc(y.name)+'\',this.checked)" style="margin:0;flex-shrink:0">'+
'<span style="flex:1">'+esc(y.name)+ownBadge+'</span>'+
'<span style="font-size:9px;color:var(--text3)">'+esc(y.pay_mode==='installment'?y.inst_periods+' periods':'Full')+'</span>'+
'<span style="font-family:var(--mono);font-size:10px;min-width:80px;text-align:right;font-weight:'+(checked?'600':'400')+';color:'+(checked?'var(--primary)':'var(--text3)')+'">\u0e3f'+fmt(y.amount)+'</span>'+
'</label>'});
var selTotal2=allIns.reduce(function(s,y){return s+(D.tax_ins_selections[exId+'::'+y.name]===true?y.amount:0)},0);
h+='<div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:10px;font-weight:600">'+
'<span>Selected Total</span>'+
'<span style="font-family:var(--mono);color:'+(selTotal2>actualMax?'var(--error)':'var(--primary)')+'">\u0e3f'+fmt(selTotal2)+(selTotal2>actualMax?' <span style="font-size:8px;font-weight:400">(capped at \u0e3f'+fmt(actualMax)+')</span>':'')+'</span></div>';
h+='</div></td></tr>'}
else{
h+='<tr><td colspan="6" style="padding:6px 12px 6px 24px;font-size:10px;color:var(--text3);background:var(--bg2);border-left:3px solid var(--border)"><i class="fa-solid fa-info-circle" style="margin-right:4px"></i>No insurance policies found. Add insurance items in <strong>Bills &amp; Plans \u2192 Yearly Recurring</strong> with type "Insurance".</td></tr>'}}

});

// Cross-validation warnings
TAX_CROSS_RULES.forEach(function(r){
if(crossTotals[r.group]>r.max){
h+='<tr style="background:rgba(217,119,6,0.08)"><td colspan="6" style="font-size:10px;color:var(--warning);padding:6px 8px">\u26a0\ufe0f <strong>'+r.label+'</strong> \u2014 Current total: \u0e3f'+fmt(crossTotals[r.group])+', exceeds by \u0e3f'+fmt(crossTotals[r.group]-r.max)+'</td></tr>'}});

h+='<tr style="font-weight:700;background:var(--bg3)"><td>TOTAL EXEMPTIONS</td><td class="r" style="font-family:var(--mono);font-size:10px;color:var(--primary)">\u0e3f'+fmt(D.tax_exemptions.reduce(function(s,e){var cat2=e.id?getCatalogItem(e.id):null;var mx=(cat2?cat2.max:(e.max||0));var v=e.override!=null?Math.min(e.override,mx>0?mx:Infinity):Math.min(e.amount,mx>0?mx:Infinity);if(e.source==='fixed'&&mx>0)v=mx;return s+v},0))+'</td><td></td><td></td><td></td><td></td></tr>';
document.getElementById('tax-exempt-body').innerHTML=h;

// Update header
var thdr=document.querySelector('#pt-tax-exempt .tbl thead tr');
if(thdr)thdr.innerHTML='<th>Deduction</th><th class="r">Amount (\u0e3f)</th><th class="r">Max</th><th>Status</th><th>Notes</th><th></th>';

// Add dropdown for adding new exemptions
var addArea=document.getElementById('tax-exempt-add-area');
if(addArea){var usedIds={};D.tax_exemptions.forEach(function(e){if(e.id)usedIds[e.id]=1});
var opts='<option value="">-- Select exemption to add --</option>';
TAX_EXEMPTION_CATALOG.slice().sort(function(a,b){return a.name.localeCompare(b.name)}).forEach(function(c){if(!usedIds[c.id]&&c.source!=='fixed'&&c.source.indexOf('auto')!==0){
opts+='<option value="'+c.id+'">'+esc(c.name)+(c.max>0?' (max \u0e3f'+fmt(c.max)+')':'')+'</option>'}});
addArea.innerHTML='<div style="display:flex;gap:6px;align-items:center;margin-top:8px">'+
'<select class="sel" id="exempt-add-sel" style="flex:1;font-size:10px;padding:4px 6px">'+opts+'</select>'+
'<button class="btn btn-primary" style="font-size:10px;padding:4px 10px" onclick="addExemption()"><i class="fa-solid fa-plus"></i> Add</button></div>'}

// Life insurance selection is now inline in the select_ins row above
}


function addExemption(){
var sel=document.getElementById('exempt-add-sel');
if(!sel||!sel.value){toast('\u26a0\ufe0f Select an exemption type first');return}
var catId=sel.value;
if(D.tax_exemptions.find(function(e){return e.id===catId})){toast('\u26a0\ufe0f Already added');return}
var cat=getCatalogItem(catId);
if(!cat){toast('Unknown type');return}
readAll();
var newItem={id:catId,amount:0,source:cat.source};
if(cat.validation&&cat.validation.type==='per_unit')newItem.units=0;
D.tax_exemptions.push(newItem);
saveD();renderExemptions();sel.value=''}

function removeExemption(i){
var e=D.tax_exemptions[i];if(!e)return;
var cat=e.id?getCatalogItem(e.id):null;
if(cat&&(cat.source==='fixed'||cat.source.indexOf('auto')===0)){toast('Cannot remove auto/fixed items');return}
if(!confirm('Remove '+esc(cat?cat.name:e.name)+'?'))return;
readAll();D.tax_exemptions.splice(i,1);saveD();renderExemptions()}


function setPayrollOverride(month,pi,val){
if(!D.payroll_overrides[month])D.payroll_overrides[month]={};
D.payroll_overrides[month][pi]=val;saveAll()}


function clearPayrollOverride(month,pi){
if(D.payroll_overrides[month]){delete D.payroll_overrides[month][pi];
if(Object.keys(D.payroll_overrides[month]).length===0)delete D.payroll_overrides[month]}
saveAll()}


function toggleEarningsMonth(mi){
var el=document.getElementById('earnings-detail-'+mi);
if(!el)return;
var isOpen=el.style.display!=='none';
document.querySelectorAll('[id^="earnings-detail-"]').forEach(function(d){d.style.display='none'});
document.querySelectorAll('.earnings-row').forEach(function(r){r.classList.remove('active')});
if(!isOpen){el.style.display='';document.getElementById('earnings-row-'+mi).classList.add('active')}}


function renderMonthlyEarnings(){
// Year selector
var _ey=D.tax_year||new Date().getFullYear();
var eyEl=document.getElementById('earnings-year-selector');
if(eyEl){
var eySel='<select class="sel" id="earn-year-sel" onchange="D.tax_year=parseInt(this.value);saveD();simulate();renderMonthlyEarnings();renderTax()">';
var _curYr=new Date().getFullYear();for(var eyi=_curYr-2;eyi<=_curYr+15;eyi++){eySel+='<option value="'+eyi+'"'+(_ey===eyi?' selected':'')+'>'+eyi+'</option>'}
eySel+='</select>';
eyEl.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg3);border-radius:var(--radius-sm);font-size:10px"><span style="color:var(--text3)">Year:</span>'+eySel+'</div>'}

// Determine active payroll months
var _maxMo=typeof _payMonthsInTaxYear==='function'?_payMonthsInTaxYear():12;

var cumGross=0;var info=getAnnualTaxableIncome();
var totalGross=0,totalDeduct=0,totalNet=0;
for(var m=1;m<=_maxMo;m++){var p=computePayroll(m);totalGross+=p.gross;totalDeduct+=p.deduct;totalNet+=p.net}

var _annualTax=calcTax(info.taxable).total;
var kpiHtml='<div class="kpi"><div class="kpi-label">Annual Gross</div><div class="kpi-val">\u0e3f'+fmt(totalGross)+'</div>'+(_maxMo<12?'<div class="kpi-note">'+_maxMo+' months (to separation)</div>':'')+'</div>'+
'<div class="kpi"><div class="kpi-label">Deductions</div><div class="kpi-val text-error">\u0e3f'+fmt(totalDeduct)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Net Pay</div><div class="kpi-val text-primary">\u0e3f'+fmt(totalNet)+'</div></div>'+
'<div class="kpi"><div class="kpi-label">Tax Exemptions</div><div class="kpi-val text-success">-\u0e3f'+fmt(info.exemptions)+'</div><div class="kpi-note">From Tax Exemptions tab</div></div>'+
'<div class="kpi"><div class="kpi-label">Taxable Income</div><div class="kpi-val text-warning">\u0e3f'+fmt(info.taxable)+'</div><div class="kpi-note">Gross - Exemptions</div></div>'+
'<div class="kpi"><div class="kpi-label">Annual Tax</div><div class="kpi-val text-error">\u0e3f'+fmt(_annualTax)+'</div><div class="kpi-note">'+(_annualTax>0?((_annualTax/totalGross*100).toFixed(1))+'% effective':'No tax')+'</div></div>';
document.getElementById('earnings-kpis').innerHTML=kpiHtml;

cumGross=0;
var rows='';
MO.forEach(function(mn,mi){
var monthNum=mi+1;
var isActive=monthNum<=_maxMo;
var pd=computePayrollDetailed(monthNum);
if(isActive)cumGross+=pd.gross;
var estTax=isActive?calcTax(Math.max(0,cumGross-info.exemptions*(mi+1)/12)).total:0;
var hasOverrides=D.payroll_overrides[monthNum]&&Object.keys(D.payroll_overrides[monthNum]).length>0;
var rowStyle=isActive?'':(';opacity:0.3;background:var(--bg3)');
rows+='<tr id="earnings-row-'+mi+'" class="earnings-row" style="cursor:pointer;'+(hasOverrides?'background:rgba(245,158,11,0.05)':'')+rowStyle+(monthNum===12&&isActive?';font-weight:600':'')+'" onclick="toggleEarningsMonth('+mi+')">'+
'<td>'+mn+(hasOverrides?' <span style="font-size:8px;padding:1px 4px;border-radius:6px;background:var(--warning);color:#fff">Edited</span>':'')+(!isActive?' <span style="font-size:8px;color:var(--error)">No payroll</span>':'')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px">'+(isActive?'\u0e3f'+fmt(pd.gross):'-')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">'+(isActive?'\u0e3f'+fmt(pd.deduct):'-')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--primary)">'+(isActive?'\u0e3f'+fmt(pd.net):'-')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px">'+(isActive?'\u0e3f'+fmt(cumGross):'-')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">'+(isActive?'\u0e3f'+fmt(estTax):'-')+'</td>'+
'<td style="font-size:10px;color:var(--text3)">'+(isActive?'\u25b6':'')+'</td></tr>';

if(isActive){
rows+='<tr id="earnings-detail-'+mi+'" style="display:none"><td colspan="7" style="padding:0;background:var(--bg2)">'+
'<div style="padding:8px 12px">';
pd.items.forEach(function(it){
var isInc=it.type==='income';
var color=isInc?'var(--success)':'var(--error)';
var sign=isInc?'+':'-';
rows+='<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px">'+
'<span style="width:14px;text-align:center;color:'+color+';font-weight:700">'+sign+'</span>'+
'<span style="flex:1">'+esc(it.name)+(it.calc_mode&&it.calc_mode!=='fixed'?' <span style="color:var(--text3);font-size:9px">('+it.calc_mode+')</span>':'')+'</span>';
if(it.overridden){
rows+='<span style="font-size:8px;color:var(--text3);text-decoration:line-through">\u0e3f'+fmt(it.base)+'</span>'+
'<input class="inp inp-num" type="text" value="'+fmt(it.amount)+'" style="width:75px;padding:2px 4px;font-size:10px;border-color:var(--warning);margin:0 4px" '+
'onblur="setPayrollOverride('+monthNum+','+it.idx+',parseFloat(this.value.replace(/,/g,\x27\x27))||0);renderTax()">'+
'<button class="del-btn" title="Reset" style="font-size:9px;padding:1px 4px" onclick="clearPayrollOverride('+monthNum+','+it.idx+');renderTax()">\ud83d\udd04</button>'}
else{
rows+='<span style="font-family:var(--mono);font-size:10px;color:'+color+'">\u0e3f'+fmt(it.amount)+'</span>'+
'<button class="del-btn" title="Override for '+mn+'" style="font-size:9px;padding:1px 4px;margin-left:4px" '+
'onclick="setPayrollOverride('+monthNum+','+it.idx+','+it.amount+');renderTax()">\u270f\ufe0f</button>'}
rows+='</div>'});
rows+='<div style="display:flex;padding:4px 0;margin-top:4px;border-top:1px solid var(--border);font-size:10px;font-weight:700">'+
'<span style="width:14px"></span><span style="flex:1">NET PAY</span>'+
'<span style="font-family:var(--mono);color:var(--primary)">\u0e3f'+fmt(pd.net)+'</span>'+
'<span style="width:28px"></span></div>';
rows+='</div></td></tr>'}});

rows+='<tr style="font-weight:700;background:var(--bg3)"><td>TOTAL'+(_maxMo<12?' ('+_maxMo+' mo)':'')+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px">\u0e3f'+fmt(totalGross)+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">\u0e3f'+fmt(totalDeduct)+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--primary)">\u0e3f'+fmt(totalNet)+'</td>'+
'<td></td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">\u0e3f'+fmt(calcTax(info.taxable).total)+'</td>'+
'<td></td></tr>';

// Tax summary rows
var _withheld=0;
for(var _wm=1;_wm<=_maxMo;_wm++){
try{var _wpr=computePayrollDetailed(_wm);
_wpr.items.forEach(function(p){
if(p.type==='deduction'&&(p.name.toLowerCase().indexOf('tax')>=0||p.name.toLowerCase().indexOf('wht')>=0)){
_withheld+=Math.abs(p.amount)}})}catch(e){}}
var _taxDue=calcTax(info.taxable).total;
var _diff=_withheld-_taxDue;
rows+='<tr style="background:var(--bg3);border-top:2px solid var(--border2)"><td colspan="5" style="font-size:10px;font-weight:600">Tax Withheld (Jan-'+MO[_maxMo-1]+', '+_maxMo+' mo)</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">\u0e3f'+fmt(_withheld)+'</td><td></td></tr>';
rows+='<tr style="background:var(--bg3)"><td colspan="5" style="font-size:10px;font-weight:600">Tax Due (Jan-'+MO[_maxMo-1]+', after exemptions)</td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px;color:var(--error)">\u0e3f'+fmt(_taxDue)+'</td><td></td></tr>';
if(_withheld>0||_taxDue>0){
var _refundStyle=_diff>0?'color:var(--success)':'color:var(--error)';
var _refundLabel=_diff>0?'Tax Refund':'Tax Owed';
var _refundIcon=_diff>0?'\ud83c\udf89':'\u26a0\ufe0f';
rows+='<tr style="background:'+(_diff>0?'var(--success-bg)':'var(--error-bg)')+';font-weight:700"><td colspan="5" style="font-size:11px">'+_refundIcon+' '+_refundLabel+'</td>'+
'<td class="r" style="font-family:var(--mono);font-size:12px;'+_refundStyle+'">'+(_diff>0?'+':'-')+'\u0e3f'+fmt(Math.abs(_diff))+'</td><td></td></tr>'}

document.getElementById('tax-monthly-body').innerHTML=rows}
