// ui-retirement.js — Retirement & Separation module UI

function swRetire(el,tab){
document.querySelectorAll('#tab-retirement .sub-panel').forEach(function(p){p.classList.remove('active')});
document.querySelectorAll('#tab-retirement .sub-tab').forEach(function(t){t.classList.remove('active')});
el.classList.add('active');document.getElementById('ret-'+tab).classList.add('active');
if(tab==='calc')renderRetCalc();if(tab==='summary')renderRetSummary()}

function renderRetirement(){renderRetSetup();renderRetAssets();renderRetCalc();renderRetSummary()}

// ===== SCENARIO SETUP =====
function renderRetSetup(){
var r=D.retirement;if(!r)return;
var el=document.getElementById('ret-setup-content');if(!el)return;

// Auto-calculate years of service
var yos=r.hire_date&&r.separation_date?calcYearsOfService(r.hire_date,r.separation_date):r.years_of_service||0;
var yosYears=Math.floor(yos);var yosMo=Math.floor((yos-yosYears)*12);
var yosStr=yosYears+' yr'+(yosMo>0?' '+yosMo+' mo':'');

// Auto-get last salary from payroll
var autoSalary=0;
if(D.payroll){D.payroll.forEach(function(p){if(p.type==='income'&&p.freq==='every_month')autoSalary+=p.amount})}
var salary=r.last_salary||autoSalary;

var scenarioLabels={'layoff':'Laid Off (Terminated)','resign':'Self-Resign','retire':'Retirement (Age 55+)','end_contract':'End of Contract'};
var scenarioIcons={'layoff':'\ud83d\udce4','resign':'\ud83d\udeb6','retire':'\ud83c\udfd6\ufe0f','end_contract':'\ud83d\udccb'};

var h='<div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">';
h+='<div class="form-group"><label>Enable Retirement Simulation</label><div style="display:flex;align-items:center;gap:8px;margin-top:2px"><input type="checkbox" id="ret-enabled" '+(r.enabled?'checked':'')+' onchange="D.retirement.enabled=this.checked;saveD();simulate();renderRetirement()" style="width:16px;height:16px"><span style="font-size:11px;font-weight:600;color:'+(r.enabled?'var(--success)':'var(--text3)')+'">'+(r.enabled?'Active':'Disabled')+'</span></div></div>';
h+='<div class="form-group"><label>Scenario</label><select class="inp" id="ret-scenario" onchange="readRetirement();saveD();renderRetirement()">';
['layoff','resign','retire','end_contract'].forEach(function(s){
h+='<option value="'+s+'"'+(r.scenario===s?' selected':'')+'>'+scenarioIcons[s]+' '+scenarioLabels[s]+'</option>'});
h+='</select></div>';
h+='<div class="form-group"><label>Hire Date</label><input type="date" class="inp" id="ret-hire" value="'+(r.hire_date||'')+'" onblur="readRetirement();saveD();simulate();renderRetirement()"></div>';
h+='<div class="form-group"><label>Separation Date</label><input type="date" class="inp" id="ret-sepdate" value="'+(r.separation_date||'')+'" onblur="readRetirement();saveD();simulate();renderRetirement()"></div>';
h+='<div class="form-group"><label>Years of Service</label><div style="font-size:13px;font-weight:600;color:var(--primary);margin-top:2px">'+yosStr+'</div><div style="font-size:8px;color:var(--text3)">Auto-calculated from dates</div></div>';
h+='<div class="form-group"><label>Last Monthly Salary</label><input type="text" class="inp inp-num" id="ret-salary" value="'+fmt(salary)+'" style="width:120px" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"><div style="font-size:8px;color:var(--text3)">Auto from payroll: \u0e3f'+fmt(autoSalary)+'</div></div>';
var _profDob=D.profile.dob||r.dob||'';
if(_profDob)r.dob=_profDob;
if(r.scenario==='retire'){
h+='<div class="form-group"><label>Date of Birth</label><div style="font-size:13px;font-weight:600;color:var(--primary)">'+(_profDob?fmtDate(_profDob):'<span style=\"color:var(--error)\">Not set</span>')+'</div><div style="font-size:8px;color:var(--text3)">From Setup \u2192 Profile</div></div>';
var age=r.dob&&r.separation_date?calcAgeAt(r.dob,r.separation_date):r.age_at_separation||0;
h+='<div class="form-group"><label>Age at Separation</label><div style="font-size:13px;font-weight:600;color:'+(age>=55?'var(--success)':'var(--warning)')+'">'+age+' years</div><div style="font-size:8px;color:var(--text3)">'+(age>=55?'\u2705 Eligible for retirement':'\u26a0\ufe0f Under 55')+'</div></div>';
}
h+='</div>';

// Scenario info card
h+='<div style="margin-top:12px;padding:10px 14px;background:var(--primary-bg);border:1px solid var(--primary);border-radius:var(--radius);border-left:4px solid var(--primary)">';
h+='<div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:4px">'+scenarioIcons[r.scenario]+' '+scenarioLabels[r.scenario]+'</div>';
var info={'layoff':'Entitled to severance pay (\u00a7118), special severance for 6+ years (\u00a7122), notice pay (\u00a717), and SSO unemployment benefit (50% for 6 months).',
'resign':'No severance or special severance. SSO unemployment benefit at 30% for 3 months. EPF vesting depends on company policy.',
'retire':'Same severance as layoff (\u00a7118). No special severance. Full EPF vesting if age 55+. SSO old-age pension may apply.',
'end_contract':'Severance pay (\u00a7118) if employed long enough. No special severance. SSO unemployment benefit at 30% for 3 months (same as resignation per SSO rules).'};
h+='<div style="font-size:10px;color:var(--text2)">'+info[r.scenario]+'</div></div>';
// ===== Payout Components (include/exclude) =====
h+='<div style="margin-top:12px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius)">';
h+='<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px"><i class="fa-solid fa-sliders" style="margin-right:4px"></i> Payout Components</div>';
h+='<div style="display:flex;gap:4px;margin-bottom:8px"><span style="font-size:8px;padding:1px 6px;border-radius:3px;background:var(--primary-bg);color:var(--primary);font-weight:600">\u2696\ufe0f LAW</span><span style="font-size:8px;color:var(--text3)">Thai Labour Protection Act</span><span style="font-size:8px;padding:1px 6px;border-radius:3px;background:var(--purple-bg);color:var(--purple);font-weight:600;margin-left:8px">\ud83c\udfe2 COMPANY</span><span style="font-size:8px;color:var(--text3)">Per employer policy</span></div>';
var _comps=[
{key:'include_severance',label:'Severance Pay',ref:'\u00a7118',icon:'\ud83d\udcb0',src:'law',tip:'Mandatory for all terminations. Based on years of service.'},
{key:'include_special',label:'Special Severance',ref:'\u00a7122',icon:'\ud83c\udf1f',src:'law',tip:'Only for restructuring / technology layoffs with 6+ years. 15 days per year of service, max 360 days.'},
{key:'include_notice',label:'Notice Pay',ref:'\u00a717',icon:'\ud83d\udcdd',src:'law',tip:'Employer must give written notice 1 pay cycle before termination. If not given, employer pays 1 month salary in lieu. Uncheck if company already gave advance notice.'},
{key:'include_sso',label:'SSO Unemployment Benefit',ref:'SSA',icon:'\ud83d\udee1\ufe0f',src:'law',tip:'Dismissed/Laid off: 50% for 6 months. Resign or End of contract: 30% for 3 months. Based on salary capped at \u0e3f15,000/mo.'},
{key:'include_epf',label:'Provident Fund (EPF)',ref:'PVD',icon:'\ud83c\udfe6',src:'company',tip:'Employer portion vested per company schedule. Employee portion always yours.'},
{key:'include_company_special',label:'Company Special Pay',ref:'',icon:'\ud83c\udf81',src:'company',tip:'Pro-rated bonus, 13th month, separation package, long service award, etc.'},
{key:'include_sso_pension',label:'SSO Old-Age Pension',ref:'\u0e1a\u0e33\u0e19\u0e32\u0e0d',icon:'\ud83c\udfe5',src:'law',tip:'Monthly pension from age 55 if 180+ months contributed. Configure in Pension & Funds tab.'}
];
h+='<table style="width:100%;border-collapse:collapse;font-size:10px">';
_comps.forEach(function(cp){
var chk=r[cp.key]!==false;
var srcBadge=cp.src==='law'?'<span style="font-size:7px;padding:1px 5px;border-radius:2px;background:var(--primary-bg);color:var(--primary);font-weight:700">LAW</span>':'<span style="font-size:7px;padding:1px 5px;border-radius:2px;background:var(--purple-bg);color:var(--purple);font-weight:700">COMPANY</span>';
var refBadge=cp.ref?'<span style="font-size:8px;font-family:var(--mono);color:var(--text3);margin-left:3px">'+cp.ref+'</span>':'';
h+='<tr style="border-bottom:1px solid var(--border);opacity:'+(chk?'1':'0.45')+'">';
h+='<td style="padding:6px 4px;width:28px"><input type="checkbox" '+(chk?'checked':'')+' onchange="D.retirement[\''+cp.key+'\']=this.checked;saveD();simulate();renderRetirement()" style="width:14px;height:14px;cursor:pointer"></td>';
h+='<td style="padding:6px 4px;width:24px;font-size:13px">'+cp.icon+'</td>';
h+='<td style="padding:6px 4px"><div style="font-weight:600;font-size:11px">'+cp.label+' '+refBadge+'</div><div style="font-size:8px;color:var(--text3);margin-top:1px">'+cp.tip+'</div></td>';
h+='<td style="padding:6px 4px;text-align:right;white-space:nowrap">'+srcBadge+'</td>';
h+='</tr>';
});
h+='</table>';
h+='</div>';

// ===== Leave Balance Cash-out =====
h+='<div style="margin-top:12px;padding:10px 14px;background:var(--success-bg);border:1px solid var(--success);border-radius:var(--radius)">';
h+='<div style="font-size:12px;font-weight:700;color:var(--success);margin-bottom:6px"><i class="fa-solid fa-umbrella-beach" style="margin-right:4px"></i> Annual Leave Cash-out <span style="font-size:7px;padding:0 4px;border-radius:2px;background:var(--primary-bg);color:var(--primary);font-weight:700;margin-left:4px">LAW</span></div>';
h+='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">';
h+='<label style="display:flex;align-items:center;gap:6px;font-size:11px"><input type="checkbox" id="ret-leave-enabled" '+(r.leave_cash_enabled?'checked':'')+' onchange="readRetirement();saveD();renderRetSetup()" style="width:14px;height:14px"> Convert unused leave to cash</label>';
if(r.leave_cash_enabled){
h+='<div style="display:flex;align-items:center;gap:4px"><label style="font-size:10px;color:var(--text2)">Leave balance:</label><input type="number" class="inp inp-num" id="ret-leave-days" value="'+(r.leave_balance_days||0)+'" min="0" max="999" step="0.5" style="width:60px;padding:2px 4px;font-size:11px" onchange="readRetirement();saveD();renderRetSetup()" oninput="var _d=parseFloat(this.value)||0;var _a=_d*('+(salary/30)+');var _el=document.getElementById(\'ret-leave-est\');if(_el)_el.textContent=\'\\u2248 \\u0e3f\'+_a.toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"> <span style="font-size:10px;color:var(--text3)">days</span></div>';
var lvAmt=r.leave_balance_days*(salary/30);
h+='<div id="ret-leave-est" style="font-size:10px;color:var(--success);font-weight:600">\u2248 \u0e3f'+fmt(lvAmt)+'</div>';
}
h+='</div>';
h+='<div style="font-size:8px;color:var(--text3);margin-top:4px">DXC Policy: CY Term (pro-rated) + LY carry-over - LD adjustments. Only Annual Leave types are encashable.</div>';
h+='</div>';



// ===== Company Special Pay =====
var _cspEnabled=r.include_company_special!==false;
h+='<div style="margin-top:12px;padding:10px 14px;background:'+(_cspEnabled?'var(--warning-bg)':'var(--bg3)')+';border:1px solid '+(_cspEnabled?'var(--warning)':'var(--border)')+';border-radius:var(--radius);'+(_cspEnabled?'':'opacity:0.45;pointer-events:none')+"'>";
h+='<div style="font-size:12px;font-weight:700;color:var(--warning);margin-bottom:6px"><i class="fa-solid fa-gift" style="margin-right:4px"></i> Company Special Pay <span style="font-size:7px;padding:0 4px;border-radius:2px;background:var(--purple-bg);color:var(--purple);font-weight:700;margin-left:4px">COMPANY</span></div>';
h+='<div style="font-size:8px;color:var(--text3);margin-bottom:6px">Company-specific benefits (not guaranteed by law): pro-rated AIP bonus, 13th month bonus, separation package, long service award, etc.</div>';
h+='<table class="tbl" style="font-size:10px"><thead><tr><th>Item Name</th><th class="r">Amount (\u0e3f)</th><th>Notes</th><th style="width:30px"></th></tr></thead><tbody>';
(r.company_special_pay||[]).forEach(function(sp,si){
h+='<tr><td><input class="inp-inline" value="'+esc(sp.name||'')+'" data-spi="'+si+'" data-f="name" style="font-size:10px"></td>';
h+='<td class="r"><input class="inp inp-num" type="text" value="'+fmt(sp.amount||0)+'" style="width:90px;padding:2px 4px;font-size:10px" data-spi="'+si+'" data-f="amount" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"></td>';
h+='<td><input class="inp-inline" value="'+esc(sp.note||'')+'" data-spi="'+si+'" data-f="note" style="font-size:10px"></td>';
h+='<td><button class="del-btn" onclick="readRetirement();D.retirement.company_special_pay.splice('+si+',1);saveD();renderRetSetup()"><i class="fa-solid fa-trash"></i></button></td></tr>';
});
h+='</tbody></table>';
h+='<div class="add-row" onclick="retAddSpecial()" style="font-size:10px"><i class="fa-solid fa-plus"></i> Add Item</div>';
var spTotal=(r.company_special_pay||[]).reduce(function(s,sp){return s+(parseFloat(sp.amount)||0)},0);
if(spTotal>0)h+='<div style="font-size:11px;font-weight:600;color:var(--warning);margin-top:4px;text-align:right">Total: \u0e3f'+fmt(spTotal)+'</div>';

if(!_cspEnabled){
h+='<div style="font-size:9px;color:var(--text3);font-style:italic;margin-top:4px;pointer-events:auto"><i class="fa-solid fa-info-circle"></i> Enable \u201cCompany Special Pay\u201d in Payout Components above to edit</div>';
}
h+='</div>';

// Save & Simulate button
h+='<div style="margin-top:14px;display:flex;gap:8px;align-items:center">';
h+='<button class="btn btn-primary" onclick="readRetirement();saveD();simulate();renderRetirement();toast(\'\ud83d\udcbe Saved & Simulated\')"><i class="fa-solid fa-floppy-disk"></i> Save & Simulate</button>';
h+='<button class="btn btn-ghost" onclick="readRetirement();saveD();toast(\'\ud83d\udcbe Saved\')"><i class="fa-solid fa-check"></i> Save</button>';
h+='</div>';

el.innerHTML=h;
}

// Read retirement form fields into D.retirement
function readRetirement(){
var r=D.retirement;
var gv=function(id){var el=document.getElementById(id);return el?el.value:''};
r.enabled=document.getElementById('ret-enabled')?document.getElementById('ret-enabled').checked:r.enabled;
r.scenario=gv('ret-scenario')||'layoff';
r.hire_date=gv('ret-hire');
r.separation_date=gv('ret-sepdate');
r.last_salary=pn(gv('ret-salary'));
r.dob=D.profile.dob||'';
r.dob=D.profile.dob||r.dob||'';r.age_at_separation=r.dob&&r.separation_date?calcAgeAt(r.dob,r.separation_date):0;
r.years_of_service=r.hire_date&&r.separation_date?calcYearsOfService(r.hire_date,r.separation_date):0;
// Assets
document.querySelectorAll('[data-ai]').forEach(function(el){
var i=+el.dataset.ai,f=el.dataset.f;if(!r.assets[i])return;
if(f==='value')r.assets[i].value=pn(el.value);
else r.assets[i][f]=el.value});
// EPF
r.epf_balance=pn(gv('ret-epf-bal'));
r.epf_action=gv('ret-epf-action')||'cashout';
r.epf_cashout_date=gv('ret-epf-date');
// epf_vesting_pct auto-calculated from schedule in renderRetAssets
// Leave cash-out
var lcEl=document.getElementById('ret-leave-enabled');
if(lcEl)r.leave_cash_enabled=lcEl.checked;
r.leave_balance_days=parseFloat(gv('ret-leave-days'))||0;

// Company special pay items
document.querySelectorAll('[data-spi]').forEach(function(el){
var i=+el.dataset.spi,f=el.dataset.f;if(!r.company_special_pay[i])return;if(f==='amount')r.company_special_pay[i][f]=pn(el.value);else r.company_special_pay[i][f]=el.value});
}

function readRetVesting(){
var sched=D.retirement.epf_vesting_schedule||[];
document.querySelectorAll('[data-vi]').forEach(function(el){
var i=+el.dataset.vi,f=el.dataset.vf;if(!sched[i])return;
sched[i][f]=parseFloat(el.value)||0});
// Auto-recalculate vesting pct
var yos=D.retirement.hire_date&&D.retirement.separation_date?calcYearsOfService(D.retirement.hire_date,D.retirement.separation_date):(D.retirement.years_of_service||0);
D.retirement.epf_vesting_pct=typeof lookupVesting==='function'?lookupVesting(sched,yos):100;
}

function readRetSSO(){
var r=D.retirement;
var gv=function(id){var el=document.getElementById(id);return el?el.value:''};
r.sso_contribution_months=parseInt(gv('ret-sso-months'))||0;
r.sso_accumulated=parseFloat(String(gv('ret-sso-accum')).replace(/,/g,''))||0;
}


// ===== ASSETS =====
function renderRetAssets(){
var r=D.retirement;if(!r)return;
var el=document.getElementById('ret-assets-content');if(!el)return;
var yos=r.hire_date&&r.separation_date?calcYearsOfService(r.hire_date,r.separation_date):(r.years_of_service||0);

// EPF Section
var h='<div style="padding:10px 14px;background:var(--purple-bg);border:1px solid var(--purple);border-radius:var(--radius);margin-bottom:12px">';
h+='<div style="font-size:12px;font-weight:700;color:var(--purple);margin-bottom:8px"><i class="fa-solid fa-building-columns" style="margin-right:4px"></i> Provident Fund (EPF)</div>';
h+='<div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">';
h+='<div class="form-group"><label>EPF Balance</label><input type="text" class="inp inp-num" id="ret-epf-bal" value="'+fmt(r.epf_balance||0)+'" style="width:120px" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\';" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2})"></div>';
h+='<div class="form-group"><label>Action on Separation</label><select class="inp" id="ret-epf-action" onchange="readRetirement();saveD();renderRetAssets()">';
EPF_ACTIONS.forEach(function(a){h+='<option value="'+a.id+'"'+(r.epf_action===a.id?' selected':'')+'>'+a.label+'</option>'});
h+='</select></div>';
var _autoVest=typeof lookupVesting==='function'?lookupVesting(r.epf_vesting_schedule,yos):r.epf_vesting_pct||100;
r.epf_vesting_pct=_autoVest;
h+='<div class="form-group"><label>Vesting %</label><div style="font-size:16px;font-weight:700;color:'+(_autoVest>=100?'var(--success)':_autoVest>0?'var(--warning)':'var(--error)')+'">'+_autoVest+'%</div><div style="font-size:8px;color:var(--text3)">Auto from schedule below</div></div>';
if(r.epf_action==='cashout'){
h+='<div class="form-group"><label>Cash-out Date</label><input type="date" class="inp" id="ret-epf-date" value="'+(r.epf_cashout_date||r.separation_date||'')+'"><div style="font-size:8px;color:var(--text3)">Any date after separation</div></div>';
}else if(r.epf_action==='move_rmf'){
var _dob55='';if(r.dob){var _bd=new Date(r.dob+'T00:00:00');_dob55=(_bd.getFullYear()+55)+'-'+((_bd.getMonth()+1)<10?'0':'')+(_bd.getMonth()+1)+'-'+(_bd.getDate()<10?'0':'')+_bd.getDate()}
h+='<div class="form-group"><label>RMF Withdrawal Date</label><input type="date" class="inp" id="ret-epf-date" value="'+(r.epf_cashout_date||_dob55||'')+'"'+(_dob55?' min="'+_dob55+'"':'')+'>'+(_dob55?'<div style="font-size:8px;color:var(--warning)">Earliest: '+fmtDate(_dob55)+' (age 55)</div>':'<div style="font-size:8px;color:var(--error)">Set date of birth to calculate age 55</div>')+'</div>';
}
h+='</div>';
// EPF action descriptions
var _epfDescs={cashout:'Receive full vested amount. Employer portion taxed if service < 5 years or age < 55.',move_rmf:'Transfer to Retirement Mutual Fund. Tax-free rollover — no tax event now. Must hold until age 55 to withdraw tax-free.',hold:'Keep money invested in the provident fund. No payout, no tax event. You can withdraw later when eligible.'};
h+='<div style="font-size:9px;color:var(--text3);margin-top:4px;padding:6px 8px;background:var(--bg3);border-radius:var(--radius-sm)"><i class="fa-solid fa-info-circle" style="margin-right:3px"></i> '+(_epfDescs[r.epf_action]||'')+'</div>';

// Vesting Schedule Table
h+='<div style="margin-top:10px;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm)">';
h+='<div style="font-size:10px;font-weight:700;color:var(--purple);margin-bottom:6px"><i class="fa-solid fa-table" style="margin-right:4px"></i> Employer Vesting Schedule <span style="font-size:7px;padding:0 4px;border-radius:2px;background:var(--purple-bg);color:var(--purple);font-weight:700;margin-left:4px">COMPANY</span></div>';
h+='<table class="tbl" style="font-size:10px"><thead><tr><th>From (years \u2265)</th><th>To (years <)</th><th class="r">Vesting %</th><th style="width:30px"></th></tr></thead><tbody>';
var _sched=r.epf_vesting_schedule||[];
_sched.forEach(function(row,vi){
var _isMatch=yos>=row.min_years&&(yos<row.max_years||(vi===_sched.length-1&&yos>=row.min_years));
h+='<tr style="'+(_isMatch?'background:var(--success-bg);font-weight:600':'')+'"><td><input type="number" class="inp inp-num" value="'+row.min_years+'" min="0" max="99" step="1" style="width:50px;padding:2px 4px;font-size:10px" data-vi="'+vi+'" data-vf="min_years" onchange="readRetVesting();saveD();renderRetAssets()"></td>';
h+='<td><input type="number" class="inp inp-num" value="'+row.max_years+'" min="1" max="999" step="1" style="width:50px;padding:2px 4px;font-size:10px" data-vi="'+vi+'" data-vf="max_years" onchange="readRetVesting();saveD();renderRetAssets()"></td>';
h+='<td class="r"><input type="number" class="inp inp-num" value="'+row.pct+'" min="0" max="100" step="5" style="width:55px;padding:2px 4px;font-size:10px;text-align:right;font-weight:600;color:'+(_isMatch?'var(--success)':'var(--text)')+'" data-vi="'+vi+'" data-vf="pct" onchange="readRetVesting();saveD();renderRetAssets()"> %</td>';
h+='<td><button class="del-btn" onclick="readRetVesting();D.retirement.epf_vesting_schedule.splice('+vi+',1);saveD();renderRetAssets()"><i class="fa-solid fa-trash"></i></button></td></tr>';
});
h+='</tbody></table>';
h+='<div class="add-row" style="font-size:10px" onclick="var s=D.retirement.epf_vesting_schedule,last=s.length?s[s.length-1]:{max_years:0,pct:0};s.push({min_years:last.max_years,max_years:last.max_years+1,pct:Math.min(last.pct+20,100)});saveD();renderRetAssets()"><i class="fa-solid fa-plus"></i> Add Row</div>';
if(yos>0)h+='<div style="font-size:9px;color:var(--text2);margin-top:4px"><i class="fa-solid fa-user-clock" style="margin-right:3px"></i> Your service: <b>'+Math.floor(yos)+'yr '+(Math.floor((yos-Math.floor(yos))*12))+'mo</b> \u2192 Vesting: <b style="color:'+(_autoVest>=100?'var(--success)':_autoVest>0?'var(--warning)':'var(--error)')+'">'+_autoVest+'%</b></div>';
h+='<div style="font-size:8px;color:var(--text3);margin-top:3px"><i class="fa-solid fa-info-circle" style="margin-right:2px"></i> DXC default: 0% (<3yr), 20% (3yr), 40% (4yr), 60% (5yr), 80% (6yr), 100% (7+yr). Adjust to match your company policy.</div>';
h+='</div>';
h+='</div>';


// ===== SSO Old-Age Pension (บำนาญชราภาพ) =====
h+='<div style="margin-top:16px;padding:10px 14px;background:var(--primary-bg);border:1px solid var(--primary);border-radius:var(--radius)">';
h+='<div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:4px"><i class="fa-solid fa-hospital" style="margin-right:4px"></i> SSO Old-Age Pension (\u0e1a\u0e33\u0e19\u0e32\u0e0d\u0e0a\u0e23\u0e32\u0e20\u0e32\u0e1e) <span style="font-size:7px;padding:0 4px;border-radius:2px;background:var(--primary-bg);color:var(--primary);font-weight:700;margin-left:4px">LAW</span></div>';
h+='<div style="font-size:9px;color:var(--text3);margin-bottom:8px">Enter the data from your SSO app (\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21). Go to: \u0e40\u0e07\u0e34\u0e19\u0e2a\u0e21\u0e17\u0e1a\u0e1c\u0e39\u0e49\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e15\u0e19 \u2192 \u0e0a\u0e23\u0e32\u0e20\u0e32\u0e1e</div>';

h+='<div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">';

// Contribution months (งวด)
h+='<div class="form-group"><label>\u0e08\u0e33\u0e19\u0e27\u0e19\u0e07\u0e27\u0e14 (Contribution Months)</label><input type="number" class="inp inp-num" id="ret-sso-months" value="'+(r.sso_contribution_months||0)+'" min="0" max="600" step="1" style="width:80px" onchange="readRetSSO();saveD();renderRetAssets()"><div style="font-size:8px;color:var(--text3)">\u0e08\u0e32\u0e01\u0e41\u0e2d\u0e1b\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (from SSO app)</div></div>';

// Accumulated amount (เงินสมทบชราภาพสะสม)
h+='<div class="form-group"><label>\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e21\u0e17\u0e1a\u0e0a\u0e23\u0e32\u0e20\u0e32\u0e1e\u0e2a\u0e30\u0e2a\u0e21 (Accumulated)</label><input type="text" class="inp inp-num" id="ret-sso-accum" value="'+fmt(r.sso_accumulated||0)+'" style="width:120px" onfocus="var v=parseFloat(this.value.replace(/,/g,\x27\x27));this.value=v||\x27\x27" onblur="this.value=(parseFloat(this.value.replace(/,/g,\x27\x27))||0).toLocaleString(\x27en-US\x27,{minimumFractionDigits:2,maximumFractionDigits:2});readRetSSO();saveD()"><div style="font-size:8px;color:var(--text3)">\u0e08\u0e32\u0e01\u0e41\u0e2d\u0e1b\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (from SSO app)</div></div>';

h+='</div>';

// Pension calculation
var _ssoMo=r.sso_contribution_months||0;
var _ssoAccum=r.sso_accumulated||0;
var _ssoCap=17500;
// Estimate avg salary from accumulated: total = months × avg × 3% × 2 (employee+employer)
// So avg ≈ accumulated / (months × 0.06). But capped at 17,500
var _estAvg=_ssoMo>0?Math.min(Math.round(_ssoAccum/(_ssoMo*0.06)),_ssoCap):0;
if(!_estAvg&&(r.last_salary||0)>0)_estAvg=Math.min(r.last_salary,_ssoCap);

if(_ssoMo>0){
h+='<div style="margin-top:8px;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm)">';
h+='<div style="font-size:10px;font-weight:700;color:var(--primary);margin-bottom:6px"><i class="fa-solid fa-calculator" style="margin-right:3px"></i> Pension Estimate</div>';

if(_ssoMo>=180){
var _basePct=20;
var _extraYrs=Math.floor((_ssoMo-180)/12);
var _extraPct=_extraYrs*1.5;
var _totalPct=_basePct+_extraPct;
var _monthlyPen=Math.round(_estAvg*_totalPct/100*100)/100;
var _annualPen=_monthlyPen*12;
var _dob55='';
if(r.dob||D.profile.dob){var _bd2=new Date((r.dob||D.profile.dob)+'T00:00:00');_dob55=(_bd2.getFullYear()+55)+'-'+String(_bd2.getMonth()+1).padStart(2,'0')+'-'+String(_bd2.getDate()).padStart(2,'0')}

h+='<table class="tbl" style="font-size:10px"><tbody>';
h+='<tr><td>\u0e08\u0e33\u0e19\u0e27\u0e19\u0e07\u0e27\u0e14 (Months)</td><td class="r" style="font-family:var(--mono)">'+_ssoMo+' \u0e07\u0e27\u0e14 ('+Math.floor(_ssoMo/12)+' yr '+(_ssoMo%12)+' mo)</td></tr>';
h+='<tr><td>\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e30\u0e2a\u0e21 (Accumulated)</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(_ssoAccum)+'</td></tr>';
h+='<tr><td>Estimated avg salary (from accumulated)</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(_estAvg)+'/mo</td></tr>';
h+='<tr><td>Pension eligibility</td><td class="r" style="color:var(--success);font-weight:600">\u2714 Eligible (180+ months)</td></tr>';
h+='<tr><td>Base rate (first 180 mo)</td><td class="r" style="font-family:var(--mono)">'+_basePct+'%</td></tr>';
if(_extraYrs>0)h+='<tr><td>Extra ('+_extraYrs+' yr \u00d7 1.5%)</td><td class="r" style="font-family:var(--mono)">+'+_extraPct.toFixed(1)+'%</td></tr>';
h+='<tr><td>Total pension rate</td><td class="r" style="font-family:var(--mono);font-weight:600">'+_totalPct.toFixed(1)+'%</td></tr>';
h+='<tr style="background:var(--success-bg);font-weight:700"><td>\ud83c\udfe5 Monthly Pension (\u0e1a\u0e33\u0e19\u0e32\u0e0d/\u0e40\u0e14\u0e37\u0e2d\u0e19)</td><td class="r" style="font-family:var(--mono);color:var(--success);font-size:14px">\u0e3f'+fmt(_monthlyPen)+'</td></tr>';
h+='<tr><td>Annual pension</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(_annualPen)+'/yr</td></tr>';
if(_dob55)h+='<tr><td>\u0e40\u0e23\u0e34\u0e48\u0e21\u0e23\u0e31\u0e1a\u0e1a\u0e33\u0e19\u0e32\u0e0d (Pension starts)</td><td class="r" style="font-family:var(--mono)">'+fmtDate(_dob55)+' (age 55)</td></tr>';
h+='</tbody></table>';
h+='<div style="font-size:8px;color:var(--text3);margin-top:4px"><i class="fa-solid fa-info-circle" style="margin-right:2px"></i> Formula: 20% of avg capped salary for first 180 months + 1.5% for each additional 12 months. Paid monthly for life from age 55. Avg salary estimated from your accumulated contributions.</div>';

}else{
var _shortfall=180-_ssoMo;
var _moNeeded=_shortfall;
h+='<table class="tbl" style="font-size:10px"><tbody>';
h+='<tr><td>\u0e08\u0e33\u0e19\u0e27\u0e19\u0e07\u0e27\u0e14 (Months)</td><td class="r" style="font-family:var(--mono)">'+_ssoMo+' \u0e07\u0e27\u0e14</td></tr>';
h+='<tr><td>Required for pension</td><td class="r" style="font-family:var(--mono);color:var(--error)">180 \u0e07\u0e27\u0e14 (need '+_shortfall+' more)</td></tr>';
h+='<tr><td>\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e30\u0e2a\u0e21 (Accumulated)</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(_ssoAccum)+'</td></tr>';
h+='<tr style="background:var(--warning-bg);font-weight:600"><td>Lump Sum Refund (at age 55)</td><td class="r" style="font-family:var(--mono);color:var(--warning)">\u0e3f'+fmt(_ssoAccum)+'</td></tr>';
h+='</tbody></table>';
h+='<div style="font-size:8px;color:var(--warning);margin-top:4px"><i class="fa-solid fa-triangle-exclamation" style="margin-right:2px"></i> Less than 180 months \u2014 you will receive a lump sum of your accumulated contributions (\u0e3f'+fmt(_ssoAccum)+') at age 55, not a monthly pension. Need '+_shortfall+' more months to qualify.</div>';
}
h+='</div>';
}else{
h+='<div style="font-size:9px;color:var(--text3);margin-top:4px"><i class="fa-solid fa-info-circle" style="margin-right:2px"></i> Enter your contribution months from the SSO app to see pension estimate.</div>';
}

h+='</div>';


el.innerHTML=h;
}

// ===== SEVERANCE CALCULATOR =====
function renderRetCalc(){
var r=D.retirement;if(!r)return;
var el=document.getElementById('ret-calc-content');if(!el)return;

var yos=r.hire_date&&r.separation_date?calcYearsOfService(r.hire_date,r.separation_date):(r.years_of_service||0);
var salary=r.last_salary||0;
if(!salary){D.payroll.forEach(function(p){if(p.type==='income'&&p.freq==='every_month')salary+=p.amount})}

if(!salary||!yos){
el.innerHTML='<div class="text-muted" style="padding:20px;text-align:center"><i class="fa-solid fa-info-circle"></i> Set hire date, separation date, and salary in Scenario Setup to see calculations.</div>';
return;
}

var _opts={noticeAlreadyGiven:r.include_notice===false,leaveCashEnabled:r.leave_cash_enabled,leaveBalanceDays:r.leave_balance_days,companySpecialPay:r.include_company_special!==false?(r.company_special_pay||[]):[],includeSeverance:r.include_severance!==false,includeSpecial:r.include_special!==false,includeNotice:r.include_notice!==false};
var sev=calcSeverance(r.scenario,yos,salary,_opts);
var _vpct=typeof lookupVesting==='function'?lookupVesting(r.epf_vesting_schedule,yos):(r.epf_vesting_pct||100);var epf=calcEPFPayout(r.epf_balance||0,_vpct,r.epf_action||'cashout',Math.floor(yos),r.age_at_separation||0);
var sso=calcSSOBenefit(r.scenario,salary);

// KPIs — respect include/exclude toggles
var _incSev=r.include_severance!==false,_incSpec=r.include_special!==false,_incNot=r.include_notice!==false;
var _incSSO=r.include_sso!==false,_incEPF=r.include_epf!==false;
var _netTotal=0;
if(_incSev)_netTotal+=sev.severance;
if(_incSpec)_netTotal+=sev.specialSeverance;
if(_incNot)_netTotal+=sev.noticePay;
_netTotal+=sev.leaveCashout+sev.companySpecialPay;
_netTotal-=sev.tax;
if(_incSSO)_netTotal+=sso.total;
if(_incEPF&&epf.action==='cashout')_netTotal+=epf.net;

var h='<div class="kpi-grid">';
if(_incSev)h+='<div class="kpi"><div class="kpi-label">Severance Pay</div><div class="kpi-val text-success">\u0e3f'+fmt(sev.severance)+'</div><div class="kpi-note">'+sev.severanceDays+' days\u2019 wages</div></div>';
if(_incSpec&&sev.specialSeverance>0)h+='<div class="kpi"><div class="kpi-label">Special Severance</div><div class="kpi-val text-success">\u0e3f'+fmt(sev.specialSeverance)+'</div><div class="kpi-note">'+sev.specialDays+' days</div></div>';
if(_incNot&&sev.noticePay>0)h+='<div class="kpi"><div class="kpi-label">Notice Pay</div><div class="kpi-val text-success">\u0e3f'+fmt(sev.noticePay)+'</div></div>';
if(sev.leaveCashout>0)h+='<div class="kpi"><div class="kpi-label">Leave Cash-out</div><div class="kpi-val text-success">\u0e3f'+fmt(sev.leaveCashout)+'</div><div class="kpi-note">'+sev.leaveDays+' days</div></div>';
if(sev.companySpecialPay>0)h+='<div class="kpi"><div class="kpi-label">Company Special Pay</div><div class="kpi-val" style="color:var(--warning)">\u0e3f'+fmt(sev.companySpecialPay)+'</div><div class="kpi-note">'+sev.companySpecialItems.length+' item(s)</div></div>';
if(_incSSO)h+='<div class="kpi"><div class="kpi-label">SSO Benefit</div><div class="kpi-val text-primary">\u0e3f'+fmt(sso.total)+'</div><div class="kpi-note">\u0e3f'+fmt(sso.monthlyBenefit)+'/mo \u00d7 '+sso.months+'mo</div></div>';
if(_incEPF&&epf.action==='cashout')h+='<div class="kpi"><div class="kpi-label">EPF Payout</div><div class="kpi-val text-purple">\u0e3f'+fmt(epf.net)+'</div><div class="kpi-note">After '+epf.vestingPct+'% vesting</div></div>';
if(sev.tax>0)h+='<div class="kpi"><div class="kpi-label">Estimated Tax</div><div class="kpi-val" style="color:var(--error)">-\u0e3f'+fmt(sev.tax)+'</div><div class="kpi-note">\u00a748(5) half-rate</div></div>';
var _ntFs=_netTotal>=10000000?'13px':_netTotal>=1000000?'16px':'20px';
h+='<div class="kpi" style="border-color:var(--success);border-width:2px"><div class="kpi-label">NET TOTAL</div><div class="kpi-val text-success" style="font-size:'+_ntFs+'">\u0e3f'+fmt(_netTotal)+'</div><div class="kpi-note">After estimated tax</div></div>';
h+='</div>';

// Severance Pay Rules Reference (§118)
h+='<div class="card" style="margin-top:10px"><h2><i class="fa-solid fa-scale-balanced"></i> Severance Pay Rules (\u00a7118)</h2>';
h+='<div style="font-size:9px;color:var(--text3);margin-bottom:6px">Thai Labour Protection Act B.E. 2541 — Employer must pay based on years of continuous service</div>';
h+='<table class="tbl" style="font-size:10px"><thead><tr><th>Years of Service</th><th class="r">Severance (days)</th><th class="r">Your Estimate (\u0e3f)</th><th></th></tr></thead><tbody>';
var _dw=salary/30;
SEVERANCE_BRACKETS.forEach(function(b){
var isMatch=false;
var totalDays=Math.round(yos*365);var years=Math.floor(yos);
if(b.maxDays!==undefined){if(totalDays>=b.minDays&&totalDays<=b.maxDays)isMatch=true}
else{var minY=b.minYears||0,maxY=b.maxYears||Infinity;if(years>=minY&&years<maxY)isMatch=true}
var estAmt=b.days*_dw;
h+='<tr style="'+(isMatch?'background:var(--success-bg);font-weight:700':'')+'"><td>'+esc(b.label)+'</td>';
h+='<td class="r" style="font-family:var(--mono)">'+b.days+' days</td>';
h+='<td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(estAmt)+'</td>';
h+='<td style="font-size:9px">'+(isMatch?'\u25c0 You are here':'')+'</td></tr>'});
h+='</tbody></table>';
h+='<div style="font-size:9px;color:var(--text2);margin-top:6px"><i class="fa-solid fa-calculator" style="margin-right:3px"></i> Daily wage: \u0e3f'+fmt(_dw)+' (salary \u0e3f'+fmt(salary)+' \u00f7 30) &bull; Service: '+Math.floor(yos)+' yr '+(Math.floor((yos-Math.floor(yos))*12))+' mo</div>';
h+='</div>';

// Breakdown table
h+='<div class="card" style="margin-top:10px"><h2><i class="fa-solid fa-list"></i> Detailed Breakdown</h2>';
h+='<table class="tbl"><thead><tr><th>Item</th><th class="r">Amount (\u0e3f)</th><th>Notes</th></tr></thead><tbody>';
sev.breakdown.forEach(function(b){
var col=b.amount>0?'var(--success)':b.amount<0?'var(--error)':'var(--text3)';
h+='<tr style="'+(b.isBold?'font-weight:700;background:var(--bg3)':'')+'"><td>'+esc(b.item)+'</td>';
h+='<td class="r" style="font-family:var(--mono);color:'+col+'">'+(b.amount>=0?'':'-')+'\u0e3f'+fmt(b.amount)+'</td>';
h+='<td style="font-size:9px;color:var(--text3)">'+esc(b.note||'')+'</td></tr>'});
h+='</tbody></table></div>';

// SSO section
h+='<div class="card" style="margin-top:10px"><h2><i class="fa-solid fa-shield-halved"></i> Social Security Unemployment Benefit</h2>';
h+='<div style="font-size:10px;color:var(--text2);margin-bottom:6px">'+esc(sso.note)+'</div>';
h+='<table class="tbl"><tbody>';
h+='<tr><td>Salary base (capped at \u0e3f'+fmt(sso.salaryCap)+')</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(sso.salaryBase)+'</td></tr>';
h+='<tr><td>Monthly benefit</td><td class="r" style="font-family:var(--mono);font-weight:600;color:var(--primary)">\u0e3f'+fmt(sso.monthlyBenefit)+'</td></tr>';
h+='<tr><td>Duration</td><td class="r">'+sso.months+' months</td></tr>';
h+='<tr style="font-weight:600;background:var(--bg3)"><td>Total SSO benefit</td><td class="r" style="font-family:var(--mono);color:var(--success)">\u0e3f'+fmt(sso.total)+'</td></tr>';
h+='</tbody></table>';
h+='<div style="font-size:9px;color:var(--text3);margin-top:6px"><i class="fa-solid fa-info-circle"></i> Must register at employment office within 30 days of separation. Benefits start after 8-day waiting period.</div></div>';

// EPF section
if(r.epf_balance>0){
h+='<div class="card" style="margin-top:10px"><h2><i class="fa-solid fa-building-columns"></i> Provident Fund (EPF) Payout</h2>';
h+='<table class="tbl"><tbody>';
h+='<tr><td>Total Balance</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(epf.balance)+'</td></tr>';
h+='<tr><td>Employee Portion (~50%)</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(epf.employeePortion)+'</td></tr>';
h+='<tr><td>Employer Portion (~50%)</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(epf.employerPortion)+'</td></tr>';
h+='<tr><td>Vesting ('+epf.vestingPct+'%)</td><td class="r" style="font-family:var(--mono);color:var(--success)">\u0e3f'+fmt(epf.vestedEmployer)+'</td></tr>';
if(epf.forfeited>0)h+='<tr><td>Forfeited</td><td class="r" style="font-family:var(--mono);color:var(--error)">-\u0e3f'+fmt(epf.forfeited)+'</td></tr>';
h+='<tr><td>Action</td><td class="r" style="font-weight:600">'+EPF_ACTIONS.find(function(a){return a.id===epf.action}).label+'</td></tr>';
if(epf.action==='cashout'){
h+='<tr><td>Estimated Tax</td><td class="r" style="font-family:var(--mono);color:var(--error)">-\u0e3f'+fmt(epf.tax)+'</td></tr>';
h+='<tr style="font-weight:600;background:var(--bg3)"><td>Net Payout</td><td class="r" style="font-family:var(--mono);color:var(--success)">\u0e3f'+fmt(epf.net)+'</td></tr>';
}
h+='</tbody></table></div>';
}

el.innerHTML=h;
}

// ===== SUMMARY =====
function renderRetSummary(){
var r=D.retirement;if(!r)return;
var el=document.getElementById('ret-summary-content');if(!el)return;

if(!r.enabled){
el.innerHTML='<div class="text-muted" style="padding:30px;text-align:center;font-size:12px"><i class="fa-solid fa-toggle-off" style="font-size:20px;display:block;margin-bottom:8px"></i>Retirement simulation is disabled.<br>Enable it in Scenario Setup to see the impact on your cash flow.</div>';
return;
}

var yos=r.hire_date&&r.separation_date?calcYearsOfService(r.hire_date,r.separation_date):(r.years_of_service||0);
var salary=r.last_salary||0;
if(!salary){D.payroll.forEach(function(p){if(p.type==='income'&&p.freq==='every_month')salary+=p.amount})}
if(!salary||!yos){el.innerHTML='<div class="text-muted" style="padding:20px;text-align:center">Complete scenario setup first.</div>';return}

var _opts2={noticeAlreadyGiven:r.include_notice===false,leaveCashEnabled:r.leave_cash_enabled,leaveBalanceDays:r.leave_balance_days,companySpecialPay:r.include_company_special!==false?(r.company_special_pay||[]):[],includeSeverance:r.include_severance!==false,includeSpecial:r.include_special!==false,includeNotice:r.include_notice!==false};
var sev=calcSeverance(r.scenario,yos,salary,_opts2);
var _vpct=typeof lookupVesting==='function'?lookupVesting(r.epf_vesting_schedule,yos):(r.epf_vesting_pct||100);var epf=calcEPFPayout(r.epf_balance||0,_vpct,r.epf_action||'cashout',Math.floor(yos),r.age_at_separation||0);
var sso=calcSSOBenefit(r.scenario,salary);
var totalAssets=(r.assets||[]).reduce(function(s,a){return s+(a.value||0)},0);
var assetsCashout=(r.assets||[]).filter(function(a){return a.cashout_date}).reduce(function(s,a){return s+(a.value||0)},0);

var scenarioLabels={'layoff':'Laid Off','resign':'Self-Resign','retire':'Retirement','end_contract':'End of Contract'};

// Timeline of events
var h='<div style="margin-bottom:12px;padding:10px 14px;background:var(--primary-bg);border-left:4px solid var(--primary);border-radius:var(--radius)">';
h+='<div style="font-size:13px;font-weight:700">'+scenarioLabels[r.scenario]+' \u2014 '+fmtDate(r.separation_date)+'</div>';
h+='<div style="font-size:10px;color:var(--text2)">'+Math.floor(yos)+' years '+Math.floor((yos-Math.floor(yos))*12)+' months of service | Last salary \u0e3f'+fmt(salary)+'/mo</div></div>';

h+='<h3 style="font-size:12px;font-weight:600;margin:10px 0 8px"><i class="fa-solid fa-timeline" style="margin-right:4px"></i> Cash Flow Events from Separation</h3>';
h+='<table class="tbl"><thead><tr><th>Date</th><th>Event</th><th class="r">Amount (\u0e3f)</th><th>Notes</th></tr></thead><tbody>';

// Severance on separation date
if(sev.severance>0)h+='<tr><td>'+fmtDate(r.separation_date)+'</td><td>\ud83d\udcb0 Severance Pay</td><td class="r" style="font-family:var(--mono);color:var(--success)">+\u0e3f'+fmt(sev.severance)+'</td><td style="font-size:9px">'+sev.severanceDays+' days\u2019 wages</td></tr>';
if(sev.specialSeverance>0)h+='<tr><td>'+fmtDate(r.separation_date)+'</td><td>\ud83c\udf1f Special Severance</td><td class="r" style="font-family:var(--mono);color:var(--success)">+\u0e3f'+fmt(sev.specialSeverance)+'</td><td style="font-size:9px">\u00a7122</td></tr>';
if(sev.noticePay>0)h+='<tr><td>'+fmtDate(r.separation_date)+'</td><td>\ud83d\udcdd Notice Pay</td><td class="r" style="font-family:var(--mono);color:var(--success)">+\u0e3f'+fmt(sev.noticePay)+'</td><td style="font-size:9px">\u00a717</td></tr>';
if(sev.tax>0)h+='<tr><td>'+fmtDate(r.separation_date)+'</td><td>\ud83c\udfe6 Severance Tax</td><td class="r" style="font-family:var(--mono);color:var(--error)">-\u0e3f'+fmt(sev.tax)+'</td><td style="font-size:9px">\u00a748(5) half-rate</td></tr>';

// SSO benefits — monthly
if(sso.monthlyBenefit>0){
var sepD=new Date(r.separation_date+'T00:00:00');
for(var si=1;si<=sso.months;si++){
var ssoDate=new Date(sepD.getFullYear(),sepD.getMonth()+si,15);
h+='<tr><td>'+ssoDate.getDate()+'/'+('0'+(ssoDate.getMonth()+1)).slice(-2)+'/'+ssoDate.getFullYear()+'</td><td>\ud83d\udee1\ufe0f SSO Benefit ('+si+'/'+sso.months+')</td><td class="r" style="font-family:var(--mono);color:var(--primary)">+\u0e3f'+fmt(sso.monthlyBenefit)+'</td><td style="font-size:9px">Unemployment</td></tr>'}}

// EPF
if(epf.action==='cashout'&&epf.net>0){
var epfDate=r.epf_cashout_date||r.separation_date;
h+='<tr><td>'+fmtDate(epfDate)+'</td><td>\ud83c\udfe6 EPF Cash Out</td><td class="r" style="font-family:var(--mono);color:var(--purple)">+\u0e3f'+fmt(epf.net)+'</td><td style="font-size:9px">After vesting & tax</td></tr>';
}

// Asset cashouts
(r.assets||[]).forEach(function(a){
if(a.cashout_date&&a.value>0){
h+='<tr><td>'+fmtDate(a.cashout_date)+'</td><td>\ud83d\udcbc '+esc(a.name)+'</td><td class="r" style="font-family:var(--mono);color:var(--success)">+\u0e3f'+fmt(a.value)+'</td><td style="font-size:9px">'+esc(a.type)+'</td></tr>'}});

h+='<tr style="font-weight:700;background:var(--bg3)"><td colspan="2">TOTAL CASH INFLOW</td><td class="r" style="font-family:var(--mono);color:var(--success);font-size:12px">+\u0e3f'+fmt(sev.netAfterTax+sso.total+(epf.action==='cashout'?epf.net:0)+assetsCashout)+'</td><td></td></tr>';
h+='</tbody></table>';

// SSO Old-Age Pension section
var _pension=typeof calcSSOPension==='function'?calcSSOPension(r):null;
if(_pension){
h+='<div class="card" style="margin-top:10px"><h2><i class="fa-solid fa-hospital"></i> SSO Old-Age Pension</h2>';
if(_pension.type==='pension'){
h+='<div style="font-size:10px;color:var(--text2);margin-bottom:8px">Thai Social Security Act \u2014 Monthly pension from age 55 for life</div>';
h+='<table class="tbl"><tbody>';
h+='<tr><td>Contribution months</td><td class="r" style="font-family:var(--mono)">'+_pension.contributionMonths+' months ('+(Math.floor(_pension.contributionMonths/12))+' years)</td></tr>';
h+='<tr><td>Required for pension</td><td class="r" style="font-family:var(--mono)">180 months (15 years)</td></tr>';
h+='<tr><td>Base rate (first 180 months)</td><td class="r" style="font-family:var(--mono)">'+_pension.basePct+'%</td></tr>';
if(_pension.extraYears>0)h+='<tr><td>Extra ('+_pension.extraYears+' years \u00d7 1.5%)</td><td class="r" style="font-family:var(--mono)">+'+_pension.extraPct+'%</td></tr>';
h+='<tr><td>Total pension rate</td><td class="r" style="font-family:var(--mono);font-weight:600">'+_pension.totalPct+'%</td></tr>';
h+='<tr><td>Salary base (capped at \u0e3f'+fmt(_pension.salaryCap)+')</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(_pension.avgMonthly)+'</td></tr>';
h+='<tr style="font-weight:600;background:var(--bg3)"><td>Monthly pension</td><td class="r" style="font-family:var(--mono);color:var(--success);font-size:13px">\u0e3f'+fmt(_pension.monthlyPension)+'/mo</td></tr>';
h+='<tr><td>Pension starts</td><td class="r" style="font-family:var(--mono)">'+fmtDate(_pension.pensionStartDate)+' (age 55)</td></tr>';
h+='</tbody></table>';
h+='<div style="font-size:9px;color:var(--text3);margin-top:6px"><i class="fa-solid fa-info-circle" style="margin-right:3px"></i> Pension formula: 20% of avg capped salary for first 180 months + 1.5% for each additional 12 months. Paid monthly for life. Must register at SSO after turning 55.</div>';
}else{
h+='<div style="font-size:10px;color:var(--warning);margin-bottom:8px">\u26a0\ufe0f Less than 180 months contributed \u2014 lump sum refund only</div>';
h+='<table class="tbl"><tbody>';
h+='<tr><td>Contribution months</td><td class="r" style="font-family:var(--mono)">'+_pension.contributionMonths+' months</td></tr>';
h+='<tr><td>Required for pension</td><td class="r">180 months (shortfall: '+_pension.shortfall+' months)</td></tr>';
h+='<tr style="font-weight:600;background:var(--bg3)"><td>Lump sum refund (est.)</td><td class="r" style="font-family:var(--mono);color:var(--primary)">\u0e3f'+fmt(_pension.lumpSum)+'</td></tr>';
h+='</tbody></table>';
h+='<div style="font-size:9px;color:var(--text3);margin-top:6px"><i class="fa-solid fa-info-circle" style="margin-right:3px"></i> With fewer than 180 months of contributions, you receive a lump sum of your old-age contributions (3% portion) instead of a monthly pension. Claimable at age 55.</div>';
}
h+='</div>';
}

// Note about payroll stopping
h+='<div style="margin-top:12px;padding:8px 12px;background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius);font-size:10px;color:var(--warning)">';
h+='<i class="fa-solid fa-triangle-exclamation" style="margin-right:4px"></i><strong>Payroll stops after separation date.</strong> Monthly income events will not appear in the timeline after '+fmtDate(r.separation_date)+'.';
h+='</div>';

el.innerHTML=h;
}
// ===== ASSETS & NET WORTH PAGE =====
// THB value of an asset: THB assets use value as-is; other currencies convert via fx_rate (THB per 1 unit).
// Returns null when a non-THB asset has no usable rate (so callers can flag it).
function assetThb(a){
var cur=(a.currency||'THB');
if(cur==='THB')return a.value||0;
var rate=parseFloat(a.fx_rate)||0;
if(rate>0)return (a.value||0)*rate;
return null;
}
// Fetch live THB exchange rates for all non-THB currencies currently in use and fill fx_rate.
function updateAssetRates(){
var r=D.retirement;if(!r||!r.assets)return;
readAssetsPage();
var curs={};r.assets.forEach(function(a){var c=a.currency||'THB';if(c!=='THB')curs[c]=1});
var codes=Object.keys(curs).filter(function(c){return /^[A-Z]{3}$/.test(c)});
if(!codes.length){toast('No standard-currency assets to update (custom units like Gold/BTC must be set manually)');return}
toast('\u23f3 Fetching rates\u2026');
// Apply a rates map keyed by currency (THB per 1 unit derived from THB->foreign or foreign-from-THB base).
function _applyRates(ratesThbTo,dateStr){
// ratesThbTo[c] = amount of currency c per 1 THB  => fx_rate (THB per 1 c) = 1/that.
var n=0;r.assets.forEach(function(a){var c=a.currency||'THB';if(c!=='THB'&&ratesThbTo[c]>0){a.fx_rate=1/ratesThbTo[c];n++}});
var manual={};r.assets.forEach(function(a){var c=a.currency||'THB';if(c!=='THB'&&!(parseFloat(a.fx_rate)>0))manual[c]=1});
var manualList=Object.keys(manual);
saveD();simulate();renderAssetsPage();
toast('\u2705 Updated '+n+' asset rate(s) as of '+(dateStr||'today')+(manualList.length?' \u2014 set a manual \u0e3f rate for: '+manualList.join(', '):''));
}
// Primary: frankfurter.app (THB base). Fallback: open.er-api.com (THB base). Both return {rates:{USD:...}}.
fetch('https://api.frankfurter.app/latest?from=THB&to='+codes.join(','))
.then(function(res){if(!res.ok)throw new Error('http '+res.status);return res.json()})
.then(function(j){if(!j||!j.rates)throw new Error('no rates');_applyRates(j.rates,j.date);})
.catch(function(e1){
console.warn('frankfurter failed, trying fallback:',e1);
fetch('https://open.er-api.com/v6/latest/THB')
.then(function(res){if(!res.ok)throw new Error('http '+res.status);return res.json()})
.then(function(j){if(!j||!j.rates)throw new Error('no rates');_applyRates(j.rates,(j.time_last_update_utc||'').slice(0,16)||'today');})
.catch(function(e2){console.error('both rate APIs failed:',e2);toast('\u26a0\ufe0f Rate fetch failed (no internet or API blocked) \u2014 enter rates manually');});
});
}

// Assets page sort/filter state (sort keeps original index via data-ai, so read/delete stay correct)
var _assetSort='',_assetAsc=true,_assetTypeFilter='';
function setAssetSort(col){if(_assetSort===col){_assetAsc=!_assetAsc;}else{_assetSort=col;_assetAsc=true;}renderAssetsPage();}
function setAssetTypeFilter(v){_assetTypeFilter=v||'';renderAssetsPage();}
function renderAssetsPage(){
var el=document.getElementById('assets-content');if(!el)return;
var r=D.retirement;if(!r)return;
var assets=r.assets||[];

var h='';

// Summary KPIs
// Converted THB totals: THB assets as-is, other currencies via fx_rate. Assets missing a rate are flagged.
var byCur={};
assets.forEach(function(a){var cur=a.currency||'THB';byCur[cur]=(byCur[cur]||0)+(a.value||0)});
var thbTotal=0,missingRate=[];
assets.forEach(function(a){if(!(a.value>0))return;var t=assetThb(a);if(t===null)missingRate.push(a);else thbTotal+=t});
var cashoutAssets=assets.filter(function(a){return a.cashout_date&&a.value>0});
var thbCashout=cashoutAssets.reduce(function(s,a){var t=assetThb(a);return s+(t===null?0:t)},0);
var otherCurs=Object.keys(byCur).filter(function(k){return k!=='THB'&&byCur[k]>0});

h+='<div class="kpi-grid" style="margin-bottom:12px">';
h+='<div class="kpi"><div class="kpi-label">Total Assets (THB)</div><div class="kpi-val text-success">\u0e3f'+fmt(thbTotal)+'</div><div class="kpi-note">'+assets.length+' item(s), converted</div></div>';
h+='<div class="kpi"><div class="kpi-label">With Cash-out Date (THB)</div><div class="kpi-val text-primary">\u0e3f'+fmt(thbCashout)+'</div><div class="kpi-note">'+cashoutAssets.length+' scheduled</div></div>';
h+='<div class="kpi"><div class="kpi-label">No Cash-out Date (THB)</div><div class="kpi-val" style="color:var(--text3)">\u0e3f'+fmt(thbTotal-thbCashout)+'</div></div>';
if(otherCurs.length){h+='<div class="kpi"><div class="kpi-label">Other Currencies</div><div class="kpi-val" style="font-size:12px;color:var(--warning)">'+otherCurs.map(function(k){return byCur[k].toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+k}).join('<br>')+'</div><div class="kpi-note">converted into \u0e3f total above</div></div>'}
h+='</div>';
if(missingRate.length){h+='<div style="background:rgba(217,119,6,0.12);border:1px solid var(--warning);border-radius:6px;padding:6px 10px;font-size:10px;color:var(--warning);margin-bottom:10px"><i class="fa-solid fa-triangle-exclamation" style="margin-right:4px"></i><b>'+missingRate.length+'</b> non-THB asset(s) have no exchange rate set and are excluded from \u0e3f totals &amp; Timeline: '+missingRate.map(function(a){return esc(a.name||'?')+' ('+(a.currency||'?')+')'}).join(', ')+'. Set a rate below or click <b>Update rates</b>.</div>';
}

// ===== Asset Summary (charts + grouped breakdown) — all assets converted to THB =====
// convAssets: assets with a resolvable THB value (THB, or non-THB with a rate), each tagged with _thb
var convAssets=[];
assets.forEach(function(a){if(!(a.value>0))return;var t=assetThb(a);if(t!==null)convAssets.push({src:a,_thb:t,type:a.type||'Other',cashout_date:a.cashout_date})});
if(convAssets.length){
// Group by type
var byType={};convAssets.forEach(function(a){byType[a.type]=(byType[a.type]||0)+a._thb});
// Group by cashout status
var schedTotal=convAssets.filter(function(a){return a.cashout_date}).reduce(function(s,a){return s+a._thb},0);
var unschedTotal=thbTotal-schedTotal;
h+='<div class="card" style="margin-top:4px;margin-bottom:12px"><h2 style="font-size:12px"><i class="fa-solid fa-chart-pie"></i> Asset Summary (THB)</h2>';
h+='<div style="display:flex;flex-wrap:wrap;gap:12px">';
h+='<div style="flex:1;min-width:260px"><div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;text-align:center">By Type</div><div id="asset-chart-type" style="height:220px"></div></div>';
h+='<div style="flex:1;min-width:260px"><div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;text-align:center">By Cash-out Status</div><div id="asset-chart-status" style="height:220px"></div></div>';
h+='</div>';
// Breakdown table by type
h+='<table class="tbl" style="margin-top:10px;font-size:11px"><thead><tr><th>Type</th><th class="r">Value (\u0e3f)</th><th class="r">% of Total</th><th class="r">Count</th></tr></thead><tbody>';
Object.keys(byType).sort(function(a,b){return byType[b]-byType[a]}).forEach(function(t){
var cnt=convAssets.filter(function(a){return a.type===t}).length;
var pct=thbTotal>0?(byType[t]/thbTotal*100):0;
h+='<tr><td>'+esc(t)+'</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(byType[t])+'</td><td class="r" style="font-family:var(--mono);color:var(--text3)">'+pct.toFixed(1)+'%</td><td class="r">'+cnt+'</td></tr>'});
h+='<tr style="font-weight:700;background:var(--bg3)"><td>TOTAL</td><td class="r" style="font-family:var(--mono)">\u0e3f'+fmt(thbTotal)+'</td><td class="r">100%</td><td class="r">'+convAssets.length+'</td></tr>';
h+='</tbody></table>';
if(otherCurs.length)h+='<div style="font-size:9px;color:var(--text3);margin-top:6px"><i class="fa-solid fa-circle-info" style="margin-right:3px"></i> Charts and \u0e3f totals include non-THB assets converted at their FX rate. Assets without a rate are excluded until you set one.</div>';
h+='</div>';
// stash chart data for the deferred chart render
// Group by liquidity (THB)
var byLiq={};convAssets.forEach(function(a){var l=assetLiquidity(a.type);byLiq[l]=(byLiq[l]||0)+a._thb});
// Group scheduled THB cash-outs by year
var byYear={};convAssets.forEach(function(a){if(a.cashout_date){var y=String(a.cashout_date).slice(0,4);if(y)byYear[y]=(byYear[y]||0)+a._thb}});
// Group ALL assets by currency (native totals — not converted)
var byCurAll={};assets.forEach(function(a){if((a.value||0)>0){var cur=a.currency||'THB';byCurAll[cur]=(byCurAll[cur]||0)+(a.value||0)}});
h+='<div style="flex:1;min-width:260px"><div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;text-align:center">By Liquidity</div><div id="asset-chart-liq" style="height:220px"></div></div>';
// Second chart row: cash-out timeline (THB) + by currency (native)
h+='<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">';
h+='<div style="flex:1;min-width:280px"><div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;text-align:center">Scheduled Cash-outs by Year (THB)</div><div id="asset-chart-cashout" style="height:220px"></div></div>';
h+='<div style="flex:1;min-width:280px"><div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;text-align:center">By Currency (native amounts, not converted)</div><div id="asset-chart-cur" style="height:220px"></div></div>';
h+='</div>';
// Liquidity summary line (THB)
var liqAmt=byLiq['Liquid']||0,illiqAmt=byLiq['Illiquid']||0;
h+='<div style="display:flex;gap:8px;margin-top:8px;font-size:10px">';
h+='<div style="flex:1;background:var(--bg3);border-radius:6px;padding:6px 10px"><span style="color:#16a34a;font-weight:600">\u25cf Liquid</span> \u0e3f'+fmt(liqAmt)+' <span style="color:var(--text3)">('+(thbTotal>0?(liqAmt/thbTotal*100).toFixed(0):0)+'%)</span></div>';
h+='<div style="flex:1;background:var(--bg3);border-radius:6px;padding:6px 10px"><span style="color:#d97706;font-weight:600">\u25cf Illiquid</span> \u0e3f'+fmt(illiqAmt)+' <span style="color:var(--text3)">('+(thbTotal>0?(illiqAmt/thbTotal*100).toFixed(0):0)+'%)</span></div>';
h+='</div>';
window._assetChartData={byType:byType,sched:schedTotal,unsched:unschedTotal,byLiq:byLiq,byYear:byYear,byCurAll:byCurAll};
}else{window._assetChartData=null}

// Assets table
// Build a display list preserving each asset's ORIGINAL index (data-ai must stay the real index so
// readAssetsPage / delete keep working regardless of display order).
var _aTypes=(D.asset_types||['Savings','Investment','Property','Vehicle','Other']);
var _rows=assets.map(function(a,i){return {a:a,i:i};});
// Type filter
if(_assetTypeFilter)_rows=_rows.filter(function(x){return (x.a.type||'')===_assetTypeFilter;});
// Sort (keeps original index in x.i)
if(_assetSort){
_rows.sort(function(p,q){var a=p.a,b=q.a,r=0;
if(_assetSort==='name')r=(a.name||'').localeCompare(b.name||'');
else if(_assetSort==='type')r=(a.type||'').localeCompare(b.type||'');
else if(_assetSort==='currency')r=((a.currency||'THB')).localeCompare(b.currency||'THB');
else if(_assetSort==='value')r=(a.value||0)-(b.value||0);
else if(_assetSort==='thb'){var ta=assetThb(a),tb=assetThb(b);r=((ta===null?-1:ta))-((tb===null?-1:tb));}
else if(_assetSort==='cashout')r=((a.cashout_date||'zzzz')).localeCompare(b.cashout_date||'zzzz');
return _assetAsc?r:-r;});
}
// Filter bar
var _arrow=function(col){return _assetSort===col?(_assetAsc?' \u25b2':' \u25bc'):'';};
h+='<div class="filterbar">';
h+='<span>Filter type:</span>';
h+='<select class="sel" style="font-size:11px;padding:3px 8px" onchange="setAssetTypeFilter(this.value)"><option value=""'+(_assetTypeFilter?'':' selected')+'>All types ('+assets.length+')</option>';
_aTypes.forEach(function(t){var n=assets.filter(function(a){return (a.type||'')===t;}).length;h+='<option value="'+esc(t)+'"'+(_assetTypeFilter===t?' selected':'')+'>'+esc(t)+' ('+n+')</option>';});
h+='</select>';
if(_assetSort||_assetTypeFilter)h+='<button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="_assetSort=\'\';_assetTypeFilter=\'\';renderAssetsPage()"><i class="fa-solid fa-xmark"></i> Clear</button>';
h+='<span style="flex:1"></span><span style="font-size:10px;color:var(--text3)">'+_rows.length+' shown</span>';
h+='</div>';
// Table — sortable headers (click to sort; click again to flip). All cells use a consistent 11px.
// FX rate is merged INTO the Currency cell (shows a small rate input only for non-THB assets),
// so there is no separate FX column — keeps the table compact since most assets are THB.
h+='<table class="tbl" style="font-size:11px">';
h+='<colgroup><col class="c-name"><col class="c-type"><col class="c-cur"><col class="c-val"><col class="c-thb"><col class="c-cash"><col class="c-notes"><col class="c-del"></colgroup>';
h+='<thead><tr>';
h+='<th style="cursor:pointer" onclick="setAssetSort(\'name\')">Asset Name'+_arrow('name')+'</th>';
h+='<th style="cursor:pointer" onclick="setAssetSort(\'type\')">Type'+_arrow('type')+'</th>';
h+='<th style="cursor:pointer" onclick="setAssetSort(\'currency\')">Currency'+_arrow('currency')+'</th>';
h+='<th class="r" style="cursor:pointer" onclick="setAssetSort(\'value\')">Value'+_arrow('value')+'</th>';
h+='<th class="r" style="cursor:pointer" onclick="setAssetSort(\'thb\')">Value (\u0e3f)'+_arrow('thb')+'</th>';
h+='<th style="cursor:pointer" onclick="setAssetSort(\'cashout\')">Cash-out Date'+_arrow('cashout')+'</th>';
h+='<th>Notes</th><th style="width:30px"></th></tr></thead><tbody>';
if(!_rows.length){h+='<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:12px;font-size:11px">No assets'+(_assetTypeFilter?' of type "'+esc(_assetTypeFilter)+'"':'')+'.</td></tr>';}
_rows.forEach(function(x){var a=x.a,i=x.i;var _isTHB=((a.currency||'THB')==='THB');
h+='<tr><td><input class="inp-inline" style="font-size:11px" value="'+esc(a.name||'')+'" data-ai="'+i+'" data-f="name" onchange="readAssetsPage();saveD()"></td>';
h+='<td><select class="sel" style="font-size:11px" data-ai="'+i+'" data-f="type" onchange="readAssetsPage();saveD();renderAssetsPage()">';
_aTypes.forEach(function(t){h+='<option'+(a.type===t?' selected':'')+'>'+esc(t)+'</option>'});
h+='</select></td>';
// Currency cell — select + (for non-THB) an inline FX rate input directly beneath it.
h+='<td><select class="sel" style="font-size:11px" data-ai="'+i+'" data-f="currency" onchange="readAssetsPage();saveD();simulate();renderAssetsPage()">';
ASSET_CURRENCIES.forEach(function(cur){h+='<option'+((a.currency||'THB')===cur?' selected':'')+'>'+cur+'</option>'});
h+='</select>';
if(!_isTHB){var _rate=parseFloat(a.fx_rate)||0;var _unit=(a.currency||'').replace(/\s*\(oz\)/,'');
h+='<div style="display:flex;align-items:center;gap:4px;margin-top:3px"><input class="inp inp-num" type="text" value="'+(_rate>0?_rate.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}):'')+'" placeholder="rate" title="Exchange rate: THB per 1 '+esc(_unit||'unit')+'" style="width:64px;padding:1px 4px;font-size:10px;text-align:right'+(_rate>0?'':';border-color:var(--warning)')+'" data-ai="'+i+'" data-f="fx_rate" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\'" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0)||\'\';readAssetsPage();saveD();simulate();renderAssetsPage()"><span style="font-size:8px;color:var(--text3)">\u0e3f/'+esc(_unit||'unit')+'</span></div>';}
h+='</td>';
h+='<td class="r"><input class="inp inp-num" type="text" value="'+fmt(a.value||0)+'" style="padding:2px 4px;font-size:11px;text-align:right;box-sizing:border-box" data-ai="'+i+'" data-f="value" onfocus="var v=parseFloat(this.value.replace(/,/g,\'\'));this.value=v||\'\'" onblur="this.value=(parseFloat(this.value.replace(/,/g,\'\'))||0).toLocaleString(\'en-US\',{minimumFractionDigits:2,maximumFractionDigits:2});readAssetsPage();saveD()"></td>';
var _thb=assetThb(a);
h+='<td class="r" style="font-family:var(--mono);'+(_thb===null?'color:var(--warning)':'')+'">'+(_thb===null?'\u2014':'\u0e3f'+fmt(_thb))+'</td>';
h+='<td><input type="date" class="inp" value="'+(a.cashout_date||'')+'" data-ai="'+i+'" data-f="cashout_date" style="font-size:11px" onchange="readAssetsPage();saveD()"></td>';
h+='<td><input class="inp-inline" style="font-size:11px" value="'+esc(a.notes||'')+'" data-ai="'+i+'" data-f="notes" onchange="readAssetsPage();saveD()"></td>';
h+='<td><button class="del-btn" onclick="readAssetsPage();D.retirement.assets.splice('+i+',1);saveD();renderAssetsPage()"><i class="fa-solid fa-trash"></i></button></td></tr>'});
h+='</tbody></table>';

// Add button
h+='<div class="add-row" onclick="D.retirement.assets.push({name:\'New Asset\',type:\'Savings\',currency:\'THB\',value:0,fx_rate:0,cashout_date:\'\',notes:\'\'});saveD();renderAssetsPage()"><i class="fa-solid fa-plus"></i> Add Asset</div>';

// Update exchange rates button (fetches live THB rates for non-THB currencies in use)
h+='<div style="margin-top:8px"><button class="btn btn-ghost" style="font-size:10px;padding:4px 12px" onclick="updateAssetRates()"><i class="fa-solid fa-arrows-rotate" style="margin-right:4px"></i>Update exchange rates (live)</button>'+
'<span style="font-size:9px;color:var(--text3);margin-left:8px">Fetches THB rates for USD, EUR, etc. Custom units (Gold/BTC/ETH) convert too \u2014 just type their \u0e3f rate manually (e.g. \u0e3f per 1 oz, \u0e3f per 1 BTC).</span></div>';

// Info
h+='<div style="margin-top:10px;font-size:9px;color:var(--text3)"><i class="fa-solid fa-info-circle" style="margin-right:3px"></i> Assets with a cash-out date appear as income events on the Timeline. Non-THB assets are <b>converted to THB using their FX rate</b> (\u0e3f per 1 unit) for totals, charts, and the Timeline. Set a rate per asset or click <b>Update exchange rates</b>. Asset types can be configured in Setup.</div>';

// Export / Import Excel (single-category)
h+='<div style="display:flex;gap:5px;margin-top:10px">';
h+='<button class="btn btn-ghost" style="font-size:9px;padding:3px 8px" onclick="exportTrxExcel(\'assets\')"><i class="fa-solid fa-file-excel"></i> Export Excel</button>';
h+='<button class="btn btn-ghost" style="font-size:9px;padding:3px 8px" onclick="document.getElementById(\'imp-assets\').click()"><i class="fa-solid fa-file-import"></i> Import Excel</button>';
h+='<input type="file" id="imp-assets" accept=".xlsx,.xls,.csv" style="display:none" onchange="importTrxExcel(\'assets\',event)"></div>';

// Save button
h+='<div style="margin-top:12px"><button class="btn btn-primary" onclick="readAssetsPage();saveD();simulate();renderAssetsPage();toast(\'Saved\')"><i class="fa-solid fa-floppy-disk"></i> Save &amp; Simulate</button></div>';

el.innerHTML=h;
try{renderAssetsCharts()}catch(e){console.error('renderAssetsCharts:',e)}
}

function renderAssetsCharts(){
var cd=window._assetChartData;if(!cd)return;
if(typeof Highcharts==='undefined')return;
var dk=document.documentElement.classList.contains('dark');
var tc=dk?'#e8eaed':'#1a1d27',tc2=dk?'#6b7185':'#7a8098',gc=dk?'#353849':'#d4d7e0',bg2=dk?'#1a1d27':'#fff';
var pal=['#4a7aed','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#c026d3','#ea580c','#4f46e5','#059669'];
// By Type pie
var typeData=Object.keys(cd.byType).sort(function(a,b){return cd.byType[b]-cd.byType[a]}).map(function(t,i){return{name:t,y:cd.byType[t],color:pal[i%pal.length]}});
if(document.getElementById('asset-chart-type')){
Highcharts.chart('asset-chart-type',{chart:{type:'pie',backgroundColor:'transparent'},title:{text:null},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>\u0e3f{point.y:,.2f}</b> ({point.percentage:.1f}%)'},
plotOptions:{pie:{allowPointSelect:true,cursor:'pointer',borderWidth:0,innerSize:'45%',
dataLabels:{enabled:true,format:'{point.name}: {point.percentage:.1f}%',style:{color:tc2,fontSize:'9px',textOutline:'none'}}}},
series:[{name:'Assets',data:typeData}],credits:{enabled:false}})}
// By Cash-out Status pie
var statusData=[];
if(cd.sched>0)statusData.push({name:'Scheduled cash-out',y:cd.sched,color:'#16a34a'});
if(cd.unsched>0)statusData.push({name:'No cash-out date',y:cd.unsched,color:'#7a8098'});
if(document.getElementById('asset-chart-status')){
Highcharts.chart('asset-chart-status',{chart:{type:'pie',backgroundColor:'transparent'},title:{text:null},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>\u0e3f{point.y:,.2f}</b> ({point.percentage:.1f}%)'},
plotOptions:{pie:{allowPointSelect:true,cursor:'pointer',borderWidth:0,innerSize:'45%',
dataLabels:{enabled:true,format:'{point.name}: {point.percentage:.1f}%',style:{color:tc2,fontSize:'9px',textOutline:'none'}}}},
series:[{name:'Assets',data:statusData}],credits:{enabled:false}})}
// By Liquidity pie (THB)
var liqData=[];
if((cd.byLiq['Liquid']||0)>0)liqData.push({name:'Liquid',y:cd.byLiq['Liquid'],color:'#16a34a'});
if((cd.byLiq['Illiquid']||0)>0)liqData.push({name:'Illiquid',y:cd.byLiq['Illiquid'],color:'#d97706'});
if(document.getElementById('asset-chart-liq')){
Highcharts.chart('asset-chart-liq',{chart:{type:'pie',backgroundColor:'transparent'},title:{text:null},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>\u0e3f{point.y:,.2f}</b> ({point.percentage:.1f}%)'},
plotOptions:{pie:{allowPointSelect:true,cursor:'pointer',borderWidth:0,innerSize:'45%',
dataLabels:{enabled:true,format:'{point.name}: {point.percentage:.1f}%',style:{color:tc2,fontSize:'9px',textOutline:'none'}}}},
series:[{name:'Assets',data:liqData}],credits:{enabled:false}})}
// Scheduled cash-outs by year (THB) — column
var yrs=Object.keys(cd.byYear).sort();
var yrData=yrs.map(function(y){return cd.byYear[y]});
if(document.getElementById('asset-chart-cashout')){
if(yrs.length){
Highcharts.chart('asset-chart-cashout',{chart:{type:'column',backgroundColor:'transparent'},title:{text:null},
xAxis:{categories:yrs,labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'},formatter:function(){return '\u0e3f'+(this.value>=1000?(this.value/1000)+'k':this.value)}},gridLineColor:gc},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>\u0e3f{point.y:,.2f}</b>'},
plotOptions:{column:{borderWidth:0,borderRadius:3,color:'#4a7aed'}},
legend:{enabled:false},series:[{name:'Cash-out',data:yrData}],credits:{enabled:false}})}
else{document.getElementById('asset-chart-cashout').innerHTML='<div style="text-align:center;color:var(--text3);font-size:10px;padding-top:80px">No scheduled cash-out dates yet</div>'}}
// By currency (native amounts) — column, one bar per currency
var curKeys=Object.keys(cd.byCurAll).sort(function(a,b){return cd.byCurAll[b]-cd.byCurAll[a]});
var curData=curKeys.map(function(k,i){return{y:cd.byCurAll[k],color:pal[i%pal.length]}});
if(document.getElementById('asset-chart-cur')){
Highcharts.chart('asset-chart-cur',{chart:{type:'column',backgroundColor:'transparent'},title:{text:null},
xAxis:{categories:curKeys,labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
yAxis:{title:{text:null},labels:{style:{color:tc2,fontSize:'9px'}},gridLineColor:gc,type:'logarithmic'},
tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},pointFormat:'<b>{point.y:,.2f}</b> {point.category}'},
plotOptions:{column:{borderWidth:0,borderRadius:3}},
legend:{enabled:false},series:[{name:'Amount',data:curData}],credits:{enabled:false}})}
}

function readAssetsPage(){
var r=D.retirement;if(!r)return;
document.querySelectorAll('[data-ai]').forEach(function(el){
var i=+el.dataset.ai,f=el.dataset.f;if(!r.assets||!r.assets[i])return;
if(f==='value'||f==='fx_rate')r.assets[i][f]=parseFloat(String(el.value).replace(/,/g,''))||0;
else r.assets[i][f]=el.value});
}

/* Add a Company Special Pay row: save what's already typed first (readRetirement), then add the row
   and put the cursor straight into its name field so the new row is easy to find. */
function retAddSpecial(){
  try{ if(typeof readRetirement==='function') readRetirement(); }catch(e){}
  if(!D.retirement.company_special_pay) D.retirement.company_special_pay=[];
  D.retirement.company_special_pay.push({name:'',amount:0,note:''});
  var ni=D.retirement.company_special_pay.length-1;
  saveD(); renderRetSetup();
  setTimeout(function(){var e=document.querySelector('[data-spi="'+ni+'"][data-f="name"]');if(e){var tr=e.closest('tr');if(tr){tr.style.outline='2px solid var(--primary)';tr.style.outlineOffset='-2px';}e.focus();}},30);
}
window.retAddSpecial=retAddSpecial;
