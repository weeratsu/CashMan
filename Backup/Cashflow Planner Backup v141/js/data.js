// data.js — Data model, utilities, save/load, migration
var D,SIM=null,DATA_READY=false;
var instSortState={col:null,asc:true};
var plannedSortState={col:null,asc:true};
var sortState={monthly:{col:null,asc:true},yearly:{col:null,asc:true},payroll:{col:null,asc:true}};

var SKEY='cashflow_v5',MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
STATUSES=['Active','Cancelled','Finished','Planned'],OWNERS=['Me','Mum','Other'],
COLORS=['#4a7aed','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#c026d3','#ea580c','#4f46e5','#059669'];

// Thai Tax Exemption Master Catalog (Revenue Dept 2024-2025 rules)
var TAX_EXEMPTION_CATALOG=[
{id:'personal',name:'Personal Allowance',max:60000,source:'fixed',group:'personal',notes:'Every taxpayer',validation:{type:'fixed'}},
{id:'spouse',name:'Spouse Allowance',max:60000,source:'manual',group:'personal',notes:'If spouse has no income',validation:{type:'manual'}},
{id:'child_pre2018',name:'Child Allowance (born before 2018)',max:0,source:'manual',group:'personal',notes:'\u0e3f30,000/child, no limit on count',validation:{type:'per_unit',unit_amt:30000,label:'children'}},
{id:'child_post2018',name:'Child Allowance (born 2018+)',max:0,source:'manual',group:'personal',notes:'\u0e3f60,000/child (2nd child onward)',validation:{type:'per_unit',unit_amt:60000,label:'children'}},
{id:'parent_care',name:'Parent Care Allowance',max:120000,source:'manual',group:'personal',notes:'\u0e3f30,000/parent, max 4 (incl. in-laws, age 60+, income <\u0e3f30K/yr)',validation:{type:'per_unit',unit_amt:30000,max_units:4,label:'parents'}},
{id:'disability_care',name:'Disability/Incapacity Care',max:60000,source:'manual',group:'personal',notes:'\u0e3f60,000/person',validation:{type:'per_unit',unit_amt:60000,max_units:1,label:'persons'}},
{id:'prenatal',name:'Prenatal & Childbirth',max:60000,source:'manual',group:'personal',notes:'\u0e3f60,000 per pregnancy',validation:{type:'per_unit',unit_amt:60000,max_units:1,label:'pregnancies'}},
{id:'auto_expense',name:'Expense Deduction (50%)',max:100000,source:'auto_expense',group:'income',notes:'50% of assessable income, max \u0e3f100K',validation:{type:'auto'}},
{id:'auto_sso',name:'Social Security (SSO)',max:10500,source:'auto_sso',group:'income',notes:'Auto from payroll SSO deduction',validation:{type:'auto'}},
{id:'auto_epf',name:'Provident Fund (PVD)',max:500000,source:'auto_epf',group:'savings',notes:'Auto from payroll EPF deduction',validation:{type:'auto',cross_group:'retirement_combined'}},
{id:'life_ins',name:'Life Insurance Premium',max:100000,source:'manual',group:'insurance',notes:'Select from yearly recurring policies',validation:{type:'select_ins'}},
{id:'health_ins',name:'Health Insurance Premium',max:25000,source:'manual',group:'insurance',notes:'Select from yearly recurring policies',validation:{type:'select_ins',ins_filter:'health'}},
{id:'parent_health_ins',name:'Parent Health Insurance',max:15000,source:'manual',group:'insurance',notes:'Health insurance for parents',validation:{type:'manual'}},
{id:'home_loan',name:'Home Loan Interest',max:100000,source:'manual',group:'housing',notes:'Split equally among co-borrowers',validation:{type:'manual'}},
{id:'rmf',name:'RMF (Retirement Mutual Fund)',max:500000,source:'manual',group:'savings',notes:'Max 30% of income or \u0e3f500K',validation:{type:'percent_cap',pct:30,cross_group:'retirement_combined'}},
{id:'ssf',name:'SSF (Super Savings Fund)',max:200000,source:'manual',group:'savings',notes:'Max 30% of income or \u0e3f200K',validation:{type:'percent_cap',pct:30,cross_group:'retirement_combined'}},
{id:'thai_esg',name:'Thai ESG Fund',max:300000,source:'manual',group:'savings',notes:'Max 30% of income or \u0e3f300K',validation:{type:'percent_cap',pct:30,cross_group:'retirement_combined'}},
{id:'donation',name:'Donation',max:0,source:'manual',group:'donation',notes:'Max 10% of net income after deductions',validation:{type:'percent_net',pct:10}},
{id:'edu_donation',name:'Education Donation (x2)',max:0,source:'manual',group:'donation',notes:'Actual x2 credited, then max 10% of net',validation:{type:'percent_net_x2',pct:10}},
{id:'political_donation',name:'Political Party Donation',max:10000,source:'manual',group:'donation',notes:'Max \u0e3f10,000/yr',validation:{type:'manual'}}
];

// Cross-validation rules
var TAX_CROSS_RULES=[
{group:'retirement_combined',ids:['auto_epf','rmf','ssf','thai_esg'],max:500000,label:'PVD + RMF + SSF + Thai ESG combined max \u0e3f500,000'}
];

function getCatalogItem(id){return TAX_EXEMPTION_CATALOG.find(function(c){return c.id===id})||null}

function sG(k){try{return localStorage.getItem(k)}catch(e){return null}}

function sS(k,v){try{localStorage.setItem(k,v)}catch(e){}}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function fmtDate(d){if(!d)return'';var p=d.split('-');if(p.length!==3)return d;return p[2]+'/'+p[1]+'/'+p[0]}

function parseDMY(s){if(!s)return'';var p=s.split('/');if(p.length!==3)return s;return p[2]+'-'+p[1]+'-'+p[0]}

function fmt(n){return Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}

function pn(s){return parseFloat(String(s).replace(/,/g,''))||0}

function ord(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}

function toast(m){var t=document.getElementById('toast');t.textContent=m||'Saved';t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2000)}

function numFmt(el,v){el.value=fmt(v);el.onfocus=function(){var x=pn(this.value);this.value=x===0?'':x;this.select()};el.onblur=function(){this.value=fmt(pn(this.value))}}

function dim(y,m){return new Date(y,m+1,0).getDate()}

function payDt(y,m,d,r){if(d==='last'||d>28){d=d==='last'?dim(y,m):Math.min(d,dim(y,m))}var dt=new Date(y,m,d);if(r==='after'){if(dt.getDay()===6)dt.setDate(dt.getDate()+2);if(dt.getDay()===0)dt.setDate(dt.getDate()+1)}else{if(dt.getDay()===6)dt.setDate(dt.getDate()-1);if(dt.getDay()===0)dt.setDate(dt.getDate()-2)}return dt}


function emptyData(){return{
profile:{name:'',dob:'',starting_cash:0,payout_day:25,weekend_rule:'before',daily_living:0,cat_expense:0,cat_names:'',start_date:'2026-01-01',end_date:'2026-12-31'},
payroll:[],
owners:['Me'],
types:['Insurance','Utilities','Subscription','Entertainment','Food','Transport','Home','Health','Other'],
cards:[],
monthly:[],
yearly:[],
installments:[],
payroll_overrides:{},
tax_exemptions:[
{id:'personal',amount:60000},{id:'auto_expense',amount:0},{id:'auto_sso',amount:0},
{id:'auto_epf',amount:0}
],
tax_ins_selections:{},bill_payments:{},cardbill_overrides:{},
tax_refund_month:3,tax_year:new Date().getFullYear(),
tax_actual_override:null,
planned:[],asset_types:['Savings','Investment','Property','Vehicle','Insurance Surrender','Gold','Crypto','Other'],
retirement:{enabled:false,scenario:'layoff',separation_date:'',hire_date:'',years_of_service:0,
last_salary:0,age_at_separation:0,dob:'',
epf_balance:0,epf_action:'cashout',epf_cashout_date:'',epf_vesting_pct:100,
sso_accumulated:0,assets:[]}
}}


function defaultData(){return JSON.parse(JSON.stringify({
profile:{name:'',dob:'',starting_cash:0,payout_day:25,weekend_rule:'before',daily_living:0,cat_expense:0,cat_names:'',start_date:new Date().getFullYear()+'-01-01',end_date:new Date().getFullYear()+'-12-31'},
owners:['Me'],
payroll:[
{name:'Base Salary',type:'income',amount:0,freq:'every_month',month:null,notes:'',affects_epf:true,affects_sso:true,affects_tax:true,calc_mode:'fixed'},
{name:'Annual Bonus',type:'income',amount:0,freq:'specific_month',month:12,notes:'',affects_epf:false,affects_sso:false,affects_tax:true,calc_mode:'fixed'},
{name:'Income Tax',type:'deduction',amount:0,freq:'every_month',month:null,notes:'Withholding',affects_epf:false,affects_sso:false,affects_tax:false,calc_mode:'fixed'},
{name:'Social Security (SSO)',type:'deduction',amount:0,freq:'every_month',month:null,notes:'Sec.33 5% cap 875',affects_epf:false,affects_sso:false,affects_tax:false,calc_mode:'percent_sso',sso_pct:5,sso_cap:875},
{name:'Provident Fund',type:'deduction',amount:0,freq:'every_month',month:null,notes:'',affects_epf:false,affects_sso:false,affects_tax:false,calc_mode:'fixed',epf_pct:0}
],
types:['Insurance','Utilities','Subscription','Entertainment','Food','Transport','Home','Health','Other'],
cards:[],
monthly:[],
yearly:[],
payroll_overrides:{},
tax_exemptions:[
{id:'personal',amount:60000},{id:'auto_expense',amount:0},{id:'auto_sso',amount:0},
{id:'auto_epf',amount:0},
{id:'health_ins',amount:0},{id:'rmf',amount:0},{id:'ssf',amount:0},
{id:'thai_esg',amount:0},{id:'home_loan',amount:0},{id:'donation',amount:0}
],
tax_ins_selections:{},bill_payments:{},cardbill_overrides:{},tax_refund_month:3,
planned:[],asset_types:['Savings','Investment','Property','Vehicle','Insurance Surrender','Gold','Crypto','Other'],
installments:[],
retirement:{enabled:false,scenario:'layoff',separation_date:'',hire_date:'',years_of_service:0,
last_salary:0,age_at_separation:0,dob:'',
epf_balance:0,epf_action:'cashout',epf_cashout_date:'',epf_vesting_pct:100,
sso_accumulated:0,assets:[]}
}))}


function saveD(){D.last_modified=new Date().toISOString();sS(SKEY,JSON.stringify(D))}

function cPD(n){var c=D.cards.find(function(x){return x.name===n});return c?c.payment_day:null}

function effDay(it){return cPD(it.card)||it.billing_day}

function effPayment(it){
var c=D.cards.find(function(x){return x.name===it.card});
if(!c||it.card==='Cash/Direct')return{day:it.billing_day,monthShift:0};
var shift=it.billing_day>c.statement_day?1:0;
return{day:c.payment_day,monthShift:shift}}

function sCards(){return D.cards.slice().sort(function(a,b){return a.name.localeCompare(b.name)})}

function sTypes(){return D.types.slice().sort()}

function cOpts(sel){var h='<option value="Cash/Direct"'+(sel==='Cash/Direct'?' selected':'')+'>Cash/Direct</option>';sCards().forEach(function(c){h+='<option value="'+esc(c.name)+'"'+(sel===c.name?' selected':'')+'>'+esc(c.name)+' (pay:'+ord(c.payment_day)+', due:'+ord(c.deadline)+')</option>'});return h}

function cOnlyOpts(sel){var h='';sCards().forEach(function(c){h+='<option value="'+esc(c.name)+'"'+(sel===c.name?' selected':'')+'>'+esc(c.name)+'</option>'});return h}

function dirOpts(v){return '<option value="expense"'+(v==='expense'?' selected':'')+'>Expense</option><option value="income"'+(v==='income'?' selected':'')+'>Income</option>'}

function tOpts(sel){var h='';sTypes().forEach(function(t){h+='<option'+(sel===t?' selected':'')+'>'+esc(t)+'</option>'});return h}

function oOpts(sel){var h='';(D.owners||['Me']).slice().sort().forEach(function(o){h+='<option'+(sel===o?' selected':'')+'>'+esc(o)+'</option>'});return h}

// Build combined installment list (manual + yearly-derived)

function allInstallments(){
if(!DATA_READY||!D||!D.installments||!D.yearly)return[];
try{
var list=D.installments.map(function(inst){return Object.assign({},inst,{source:'Manual'})});
D.yearly.forEach(function(y){if(y.pay_mode==='installment'){
var pp=Math.round(y.amount/y.inst_periods*100)/100;
list.push({name:y.name,type:y.type,card:y.card,own_by:y.own_by||'Me',total:y.amount,per_period:pp,periods:y.inst_periods,
start_year:y.month>=9?parseInt(D.profile.start_date.slice(0,4)):parseInt(D.profile.start_date.slice(0,4))+1,
start_month:y.month,start_day:y.billing_day||25,billing_day:y.billing_day||25,hide_before:y.inst_hide_before||'',status:'Planned',source:'Yearly',cashback_rate:y.cashback_rate||0})}});
return list}catch(e){return[]}}

// THEME

function loadTheme(){if(sG('cf_theme')==='dark')document.documentElement.classList.add('dark');updTB()}

function togTheme(){document.documentElement.classList.toggle('dark');sS('cf_theme',document.documentElement.classList.contains('dark')?'dark':'light');updTB();
var at=document.querySelector('.tab-content.active');if(at.id==='tab-dashboard')renderDash();if(at.id==='tab-analysis')renderAnalysis()}

function updTB(){var dk=document.documentElement.classList.contains('dark');document.getElementById('theme-toggle').innerHTML=dk?'<i class="fa-solid fa-sun"></i><span>Light</span>':'<i class="fa-solid fa-moon"></i><span>Dark</span>'}

// READ ALL

function readAll(){
var p=D.profile,gv=function(id){var el=document.getElementById(id);return el?el.value:''};
p.name=gv('f-name');p.dob=gv('f-dob')||'';
p.starting_cash=pn(gv('f-cash'));
p.payout_day=gv('f-payday')==='last'?'last':parseInt(gv('f-payday'))||25;
p.weekend_rule=gv('f-wr')||'before';
var flv=document.getElementById('f-living');if(flv)p.daily_living=pn(flv.value);
var fct=document.getElementById('f-cat');if(fct)p.cat_expense=pn(fct.value);
var fcn=document.getElementById('f-catname');if(fcn)p.cat_names=fcn.value;

var _sd=gv('f-start');if(_sd)p.start_date=_sd;var _ed=gv('f-end');if(_ed)p.end_date=_ed;
document.querySelectorAll('[data-ci]').forEach(function(el){var i=+el.dataset.ci,f=el.dataset.f;if(D.cards[i]){if(f==='name')D.cards[i].name=el.value;else if(f==='statement_start')D.cards[i].statement_start=el.value||'';else D.cards[i][f]=parseInt(el.value)||1}});
document.querySelectorAll('[data-mi]').forEach(function(el){var i=+el.dataset.mi,f=el.dataset.f;if(!D.monthly[i])return;if(f==='amount')D.monthly[i].amount=pn(el.value);else if(f==='billing_day')D.monthly[i].billing_day=parseInt(el.value)||1;else if(f==='deadline_day')D.monthly[i].deadline_day=parseInt(el.value)||'';else if(f==='end_mode'){D.monthly[i].end_mode=el.value;if(el.value==='forever')D.monthly[i].end_date=''}else if(f==='end_date'){D.monthly[i].end_date=el.value}else if(f==='start_mode'){D.monthly[i].start_mode=el.value;if(el.value==='forever')D.monthly[i].start_date=''}else if(f==='start_date'){D.monthly[i].start_date=el.value}else D.monthly[i][f]=el.value});
document.querySelectorAll('[data-yi]').forEach(function(el){var i=+el.dataset.yi,f=el.dataset.f;if(!D.yearly[i])return;if(f==='amount')D.yearly[i].amount=pn(el.value);else if(f==='start_date'){var dp=el.value.split('-');D.yearly[i].year=parseInt(dp[0])||new Date().getFullYear();D.yearly[i].month=parseInt(dp[1])||1;D.yearly[i].billing_day=parseInt(dp[2])||1}else if(f==='billing_day')D.yearly[i].billing_day=parseInt(el.value)||1;else if(f==='deadline_day')D.yearly[i].deadline_day=parseInt(el.value)||'';else if(f==='month')D.yearly[i].month=parseInt(el.value);else if(f==='inst_periods')D.yearly[i].inst_periods=parseInt(el.value)||1;else if(f==='pay_mode'){D.yearly[i][f]=el.value;if(el.value==='full')D.yearly[i].inst_periods=1}else if(f==='start_mode'){D.yearly[i].start_mode=el.value;if(el.value==='forever')D.yearly[i].start_from=''}else if(f==='start_from'){D.yearly[i].start_from=el.value}else D.yearly[i][f]=el.value});
document.querySelectorAll('[data-pi]').forEach(function(el){var i=+el.dataset.pi,f=el.dataset.f;if(!D.payroll[i])return;
if(f==='amount'||f==='sso_cap')D.payroll[i][f]=pn(el.value);
else if(f==='month')D.payroll[i][f]=parseInt(el.value);
else if(f==='epf_pct'||f==='sso_pct')D.payroll[i][f]=parseFloat(el.value)||0;
else if(f==='affects_epf'||f==='affects_sso'||f==='affects_tax')D.payroll[i][f]=el.checked;
else D.payroll[i][f]=el.value});
document.querySelectorAll('[data-ti]').forEach(function(el){var i=+el.dataset.ti,f=el.dataset.f;if(!D.tax_exemptions[i])return;
if(f==='override'){D.tax_exemptions[i].override=pn(el.value)===0?null:pn(el.value)}
else if(f==='amount'){var te=D.tax_exemptions[i];if(te.source==='manual'||te.editable)te.amount=pn(el.value)}
else if(f==='units'){D.tax_exemptions[i].units=parseInt(el.value)||0;var cat2=getCatalogItem(D.tax_exemptions[i].id);if(cat2&&cat2.validation&&cat2.validation.unit_amt)D.tax_exemptions[i].amount=D.tax_exemptions[i].units*cat2.validation.unit_amt}
else{var te2=D.tax_exemptions[i];if(te2.source==='manual'||te2.editable)te2[f]=el.value}});
document.querySelectorAll('[data-pli]').forEach(function(el){var i=+el.dataset.pli,f=el.dataset.f;if(!D.planned[i])return;if(f==='amount')D.planned[i].amount=pn(el.value);else D.planned[i][f]=el.value});
document.querySelectorAll('[data-ii]').forEach(function(el){var i=+el.dataset.ii,f=el.dataset.f;if(!D.installments[i])return;if(f==='total'||f==='per_period')D.installments[i][f]=pn(el.value);else if(f==='start_date'){var dp=el.value.split('-');D.installments[i].start_year=parseInt(dp[0])||new Date().getFullYear();D.installments[i].start_month=parseInt(dp[1])||1;D.installments[i].start_day=parseInt(dp[2])||1;D.installments[i].billing_day=D.installments[i].start_day}else if(f==='periods'||f==='start_year')D.installments[i][f]=parseInt(el.value)||1;else if(f==='start_month')D.installments[i][f]=parseInt(el.value);else D.installments[i][f]=el.value});
if(typeof readRetirement==='function')try{readRetirement()}catch(e){}}

function saveAll(){readAll();saveD();simulate();renderAllTabs();toast('\u2705 Saved & Simulated')}

function resetAll(){if(confirm('This will DELETE all your data and start fresh. Are you sure?')){D=emptyData();sS(SKEY,JSON.stringify(D));location.reload()}}

function exportData(){readAll();saveD();var b=new Blob([JSON.stringify(D,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='cashflow_'+new Date().toISOString().slice(0,10)+'.json';a.click();toast('\ud83d\udce5 Exported')}

function importData(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){try{D=JSON.parse(ev.target.result);saveD();location.reload()}catch(err){alert('Error: '+err.message)}};r.readAsText(f);e.target.value=''}


function loadD(){try{var s=sG(SKEY);if(!s)s=sG('cashflow_v4');D=s?JSON.parse(s):defaultData()}catch(e){D=defaultData()}
// Guard core structures FIRST — a partial/older imported JSON may omit arrays, which would crash migration below and leave modules broken
if(!D||typeof D!=='object')D=defaultData();
if(!D.profile||typeof D.profile!=='object')D.profile={};
if(!Array.isArray(D.monthly))D.monthly=[];
if(!Array.isArray(D.yearly))D.yearly=[];
if(!Array.isArray(D.cards))D.cards=[];
D.cards.forEach(function(c){if(c.statement_start===undefined)c.statement_start='';}); // 'Statements from' month cutoff (blank=always)
// Credit Card module: extended fields (all default empty/0 — never hardcode real data)
D.cards.forEach(function(c){
if(c.bank===undefined)c.bank='';
if(c.last4===undefined)c.last4='';
if(c.expiry===undefined)c.expiry=''; // 'YYYY-MM'
if(c.credit_limit===undefined)c.credit_limit=0;
if(c.current_balance===undefined)c.current_balance=0;
if(c.benefits===undefined)c.benefits=''; // long text — perks, for AI to read
if(c.fee_waiver===undefined)c.fee_waiver=''; // annual-fee waiver conditions
if(c.remarks===undefined)c.remarks=''; // personal notes
if(c.limit_group===undefined)c.limit_group=''; // shared credit-limit group name (blank = own limit)
if(c.url===undefined)c.url=''; // link to the card's details webpage
if(c.fee_waiver_target===undefined)c.fee_waiver_target=0; // annual spend needed to waive fee (0 = none)
if(c.fee_waiver_mode===undefined)c.fee_waiver_mode='amount'; // 'amount' (฿/yr) | 'count' (times/yr)
if(c.fee_waiver_manual===undefined)c.fee_waiver_manual=0; // extra spend/count from un-recorded transactions
if(c.fee_waiver_target_count===undefined)c.fee_waiver_target_count=0; // count target for 'either' mode (times/yr)
if(c.fee_waiver_manual_count===undefined)c.fee_waiver_manual_count=0; // manual extra swipes for 'either' mode
if(!Array.isArray(c.points_log))c.points_log=[];
});
if(!Array.isArray(D.installments))D.installments=[];
if(!Array.isArray(D.planned))D.planned=[];
if(!Array.isArray(D.payroll))D.payroll=[];
// Bill reminder: paid-status ledger keyed by "billKey::YYYY-MM-DD"
if(!D.bill_payments||typeof D.bill_payments!=='object')D.bill_payments={};
// MIGRATION: paid-ledger keys were once "key::YYYY-MM-DD" (exact due date), which orphaned
// entries whenever due-date logic changed. Re-map to period-month "key::YYYY-MM" and preserve
// the original day inside rec.due. Idempotent: keys already YYYY-MM are left as-is.
(function(){var bp=D.bill_payments,out={};var changed=false;
Object.keys(bp).forEach(function(k){
var parts=k.split('::');
if(parts.length!==2){out[k]=bp[k];return;}
var pfx=parts[0],dt=parts[1];var seg=dt.split('-');
if(seg.length===3){ // legacy YYYY-MM-DD -> YYYY-MM
var nk=pfx+'::'+seg[0]+'-'+seg[1];var rec=bp[k]||{};
if(!rec.due)rec.due=dt; // preserve original full due date for history display
// If a period key already exists (collision), keep the one with the latest paid_date.
if(out[nk]){var a=out[nk].paid_date||'',b=rec.paid_date||'';if(b>=a)out[nk]=rec;}else out[nk]=rec;
changed=true;
}else{out[nk=k]=bp[k];} // already YYYY-MM (or other) — keep
});
if(changed)D.bill_payments=out;
})();
// BACKFILL: older paid records (pre-v110) lack type/card/auto_pay. Match each by bill name
// against the current setup (monthly/yearly/installments/planned) and fill in what's missing.
// Statement records (key prefix 'CB|cardName|...') get card + auto_pay:false (manual statement).
(function(){var bp=D.bill_payments||{};
var byName={};
function idx(arr){(arr||[]).forEach(function(it){if(it&&it.name&&!byName[it.name])byName[it.name]=it;});}
idx(D.monthly);idx(D.yearly);idx(D.installments);idx(D.planned);
Object.keys(bp).forEach(function(k){var rec=bp[k];if(!rec||typeof rec!=='object')return;
if(rec.type!==undefined&&rec.card!==undefined&&rec.auto_pay!==undefined)return; // already complete
var parts=(k.split('::')[0]||'').split('|');var pfx=parts[0],nm=parts[1]||'';
if(pfx==='CB'){ // card statement: 'CB|cardName|YYYY-MM'
if(rec.card===undefined)rec.card=nm;
if(rec.type===undefined)rec.type='Credit Card';
if(rec.auto_pay===undefined)rec.auto_pay=false; // statements are paid manually to the bank
return;}
var it=byName[nm];
if(it){
if(rec.type===undefined)rec.type=it.type||'';
if(rec.card===undefined)rec.card=it.card||'';
if(rec.auto_pay===undefined)rec.auto_pay=(it.auto_pay!==undefined?!!it.auto_pay:(it.card&&it.card!=='Cash/Direct'));
}
});
})();
// Credit Card Bills: manual per-card, per-month override amounts, keyed "cardName::YYYY-MM"
if(!D.cardbill_overrides||typeof D.cardbill_overrides!=='object')D.cardbill_overrides={};
// Consolidate card charges into one statement payment on the Timeline & Bills Reminder (default on)
if(D.consolidate_card_bills===undefined)D.consolidate_card_bills=true;
// auto_pay inference (only when undefined so user overrides persist):
// credit-card items are auto-charged; Cash/Direct defaults to manual.
function _inferAuto(x){if(x.auto_pay===undefined)x.auto_pay=(x.card&&x.card!=='Cash/Direct')?true:false;}
D.monthly.forEach(_inferAuto);D.yearly.forEach(_inferAuto);
D.installments.forEach(_inferAuto);D.planned.forEach(_inferAuto);
// Start-date backfill: default 'forever' (no start limit) so existing bills are unchanged.
D.monthly.forEach(function(m){if(m.start_mode===undefined)m.start_mode='forever';if(m.start_date===undefined)m.start_date='';});
D.yearly.forEach(function(y){if(y.start_mode===undefined)y.start_mode='forever';if(y.start_from===undefined)y.start_from='';});
D.installments.forEach(function(x){if(x.hide_before===undefined)x.hide_before='';});
D.yearly.forEach(function(y){if(y.inst_hide_before===undefined)y.inst_hide_before='';});
// Deadline backfill: mode 'card' for card-paid bills, 'custom' for Cash/Direct; day empty until set.
D.monthly.forEach(function(m){if(m.deadline_mode===undefined)m.deadline_mode=(m.card&&m.card!=='Cash/Direct')?'card':'custom';if(m.deadline_day===undefined)m.deadline_day='';});
D.yearly.forEach(function(y){if(y.deadline_mode===undefined)y.deadline_mode=(y.card&&y.card!=='Cash/Direct')?'card':'custom';if(y.deadline_day===undefined)y.deadline_day='';});
if(!D.asset_types)D.asset_types=['Savings','Investment','Property','Vehicle','Insurance Surrender','Gold','Crypto','Other'];
if(!Array.isArray(D.banks))D.banks=[]; // user-managed bank list for the Card Details bank dropdown
// Auto-seed the bank list (one-time) from bank names already entered on cards, when the list is empty.
if(!D.banks.length){var _bk={};(D.cards||[]).forEach(function(c){if(c.bank&&c.bank.trim())_bk[c.bank.trim()]=1;});D.banks=Object.keys(_bk).sort();}
if(!D.profile.name)D.profile.name='';
if(!D.types)D.types=defaultData().types;if(!D.profile.start_date)D.profile.start_date='2026-09-15';if(!D.profile.dob)D.profile.dob='';if(!D.profile.end_date)D.profile.end_date='2027-05-31';
if(!D.planned)D.planned=[];if(D.tax_actual_override===undefined)D.tax_actual_override=null;if(!D.tax_refund_month)D.tax_refund_month=3;if(!D.tax_year)D.tax_year=parseInt(D.profile.start_date.slice(0,4))||new Date().getFullYear();
if(!D.installments)D.installments=[];
// Migrate owners: collect from existing data if D.owners missing
if(!D.owners||!D.owners.length){var _ow={Me:1};
D.installments.forEach(function(i){if(i.own_by)_ow[i.own_by]=1});
D.yearly.forEach(function(y){if(y.own_by)_ow[y.own_by]=1});
if(D.planned)D.planned.forEach(function(p){if(p.own_by)_ow[p.own_by]=1});
D.owners=Object.keys(_ow).sort()}
OWNERS=D.owners;
D.installments.forEach(function(i){if(i.paid_by&&!i.own_by){i.own_by=i.paid_by;delete i.paid_by}if(!i.own_by)i.own_by='Me';if(!i.type)i.type='Other';if(!i.start_day)i.start_day=1;if(!i.billing_day)i.billing_day=i.start_day||1;if(!i.start_year)i.start_year=parseInt(D.profile.start_date.slice(0,4))||new Date().getFullYear();if(!i.start_month)i.start_month=1});
D.monthly.forEach(function(m){if(m.category&&!m.type){m.type=m.category;delete m.category}if(!m.type)m.type='Other';if(m.card==='Direct Debit')m.card='Cash/Direct';if(!m.direction)m.direction='expense';if(!m.status)m.status='Active';if(!m.end_mode)m.end_mode='forever';if(m.end_mode==='forever')m.end_date=''});
D.yearly.forEach(function(y){if(y.category&&!y.type){y.type=y.category;delete y.category}if(!y.type)y.type='Other';if(y.card==='Direct Debit')y.card='Cash/Direct';if(!y.pay_mode)y.pay_mode='full';if(!y.inst_periods)y.inst_periods=1;if(!y.own_by)y.own_by='Me';if(!y.direction)y.direction='expense';if(!y.status)y.status='Active';if(!y.year){var sd=D.profile.start_date?parseInt(D.profile.start_date.slice(0,4)):new Date().getFullYear();y.year=y.month>=9?sd:sd+1}});
if(!D.payroll)D.payroll=[{name:'Base Salary',type:'income',amount:D.profile.salary||0,freq:'every_month',month:null,notes:'',affects_epf:true,affects_sso:true,affects_tax:true,calc_mode:'fixed'},{name:'Annual Bonus',type:'income',amount:(D.profile.december_payout||0)-(D.profile.salary||0),freq:'specific_month',month:12,notes:'',affects_epf:false,affects_sso:false,affects_tax:true,calc_mode:'fixed'}];
D.payroll.forEach(function(p){if(p.affects_epf===undefined)p.affects_epf=(p.type==='income');if(p.affects_sso===undefined)p.affects_sso=(p.type==='income');if(p.affects_tax===undefined)p.affects_tax=(p.type==='income');if(!p.calc_mode)p.calc_mode='fixed'});
if(!D.payroll_overrides)D.payroll_overrides={};
if(!D.tax_exemptions)D.tax_exemptions=defaultData().tax_exemptions;
if(!D.tax_ins_selections)D.tax_ins_selections={};
// Migrate old selection keys (bare names) to new format (exemptId::name)
Object.keys(D.tax_ins_selections).forEach(function(k){
if(k.indexOf('::')<0&&D.tax_ins_selections[k]){
D.tax_ins_selections['life_ins::'+k]=true;
delete D.tax_ins_selections[k]}});
// Migrate old name-based exemptions to id-based
var _idMap={'Personal Allowance':'personal','Expense Deduction':'auto_expense','Expense Deduction (50%)':'auto_expense',
'SSO':'auto_sso','Social Security (SSO)':'auto_sso','EPF':'auto_epf','Provident Fund':'auto_epf','Provident Fund (PVD)':'auto_epf',
'Life Insurance':'life_ins','Life Insurance Premium':'life_ins','Health Insurance':'health_ins','Parent Health Insurance':'parent_health_ins',
'Home Loan Interest':'home_loan','RMF':'rmf','SSF':'ssf','Thai ESG':'thai_esg','Donation':'donation',
'Education Donation':'edu_donation','Education Donation (x2)':'edu_donation','Political Party Donation':'political_donation',
'Spouse Allowance':'spouse','Parent Care Allowance':'parent_care','Disability/Incapacity Care':'disability_care',
'Prenatal & Childbirth':'prenatal','Child Allowance (born before 2018)':'child_pre2018','Child Allowance (born 2018+)':'child_post2018'};
D.tax_exemptions.forEach(function(e){
if(!e.id&&e.name){e.id=_idMap[e.name]||null}
if(!e.id&&e.source){var _srcMap={'fixed':'personal','auto_expense':'auto_expense','auto_sso':'auto_sso','auto_epf':'auto_epf','auto_life_ins':'life_ins','auto_ins':'life_ins'};e.id=_srcMap[e.source]||null}
var cat=e.id?getCatalogItem(e.id):null;
if(cat){e.source=cat.source;e.max=cat.max;e.name=cat.name;e.editable=(cat.source==='manual')}
else{if(!e.source)e.source='manual';e.editable=true}
if(e.units===undefined&&cat&&cat.validation&&cat.validation.type==='per_unit'){e.units=e.amount>0?Math.round(e.amount/cat.validation.unit_amt):0}
});
// Ensure auto items exist
['personal','auto_expense','auto_sso','auto_epf'].forEach(function(reqId){
if(!D.tax_exemptions.find(function(e){return e.id===reqId})){
var cat=getCatalogItem(reqId);D.tax_exemptions.unshift({id:reqId,amount:cat.source==='fixed'?cat.max:0})}});
// Remove life_ins if it was auto-added with 0 amount and no policies selected
var _liIdx=D.tax_exemptions.findIndex(function(e){return e.id==='life_ins'||e.id==='auto_life_ins'});
if(_liIdx>=0){var _li=D.tax_exemptions[_liIdx];
if(_li.id==='auto_life_ins'){_li.id='life_ins';_li.source='manual'}
var _hasSelections=Object.keys(D.tax_ins_selections||{}).some(function(k){return k.indexOf('life_ins::')===0&&D.tax_ins_selections[k]===true});
if(_li.amount===0&&!_hasSelections)D.tax_exemptions.splice(_liIdx,1)}
D.cards.forEach(function(c){if(!c.payment_day)c.payment_day=(c.statement_day%31)+1;if(!c.deadline)c.deadline=c.payment_day});
// Retirement migration
if(!D.retirement)D.retirement={enabled:false,scenario:'layoff',separation_date:'',hire_date:'',years_of_service:0,
last_salary:0,age_at_separation:0,dob:'',epf_balance:0,epf_action:'cashout',epf_cashout_date:'',epf_vesting_pct:100,sso_accumulated:0,assets:[],
leave_cash_enabled:false,leave_balance_days:0,notice_already_given:false,company_special_pay:[]};
if(D.retirement.leave_cash_enabled===undefined)D.retirement.leave_cash_enabled=false;
if(D.retirement.leave_balance_days===undefined)D.retirement.leave_balance_days=0;
if(D.retirement.notice_already_given===undefined)D.retirement.notice_already_given=false;
if(!D.retirement.company_special_pay)D.retirement.company_special_pay=[];if(!D.asset_types)D.asset_types=['Savings','Investment','Property','Vehicle','Insurance Surrender','Gold','Crypto','Other'];
if(!D.retirement.epf_vesting_schedule)D.retirement.epf_vesting_schedule=[{min_years:0,max_years:3,pct:0},{min_years:3,max_years:4,pct:20},{min_years:4,max_years:5,pct:40},{min_years:5,max_years:6,pct:60},{min_years:6,max_years:7,pct:80},{min_years:7,max_years:99,pct:100}];
D.retirement.epf_vesting_schedule.forEach(function(row){row.min_years=Math.round(row.min_years);row.max_years=Math.round(row.max_years);row.pct=Math.round(row.pct)});
if(D.retirement.include_severance===undefined)D.retirement.include_severance=true;
if(D.retirement.include_special===undefined)D.retirement.include_special=true;
if(D.retirement.include_notice===undefined)D.retirement.include_notice=true;
if(D.retirement.include_sso===undefined)D.retirement.include_sso=true;
if(D.retirement.include_epf===undefined)D.retirement.include_epf=true;
if(D.retirement.include_company_special===undefined)D.retirement.include_company_special=true;
if(!D.retirement.assets)D.retirement.assets=[];
D.retirement.assets.forEach(function(a){if(a.currency===undefined)a.currency='THB';if(a.fx_rate===undefined)a.fx_rate=0});
if(!D.retirement.dob)D.retirement.dob='';
if(D.retirement.sso_contribution_months===undefined)D.retirement.sso_contribution_months=0;
if(D.retirement.sso_avg_salary===undefined)D.retirement.sso_avg_salary=0;
if(D.retirement.sso_start_date===undefined)D.retirement.sso_start_date='';
if(D.retirement.include_sso_pension===undefined)D.retirement.include_sso_pension=true;if(D.profile.dob&&!D.retirement.dob)D.retirement.dob=D.profile.dob}


// SETUP

function loadForm(){var p=D.profile;
var fn=document.getElementById('f-name');if(fn)fn.value=p.name||'';var fdob=document.getElementById('f-dob');if(fdob)fdob.value=p.dob||'';
numFmt(document.getElementById('f-cash'),p.starting_cash);
var pdSel=document.getElementById('f-payday');
if(pdSel){pdSel.innerHTML='';
for(var di=1;di<=31;di++){pdSel.innerHTML+='<option value="'+di+'">'+ord(di)+'</option>'}
pdSel.innerHTML+='<option value="last">Last day of month</option>';
pdSel.value=p.payout_day||25;}

document.getElementById('f-wr').value=p.weekend_rule;
var _fs=document.getElementById('f-start');if(_fs)_fs.value=p.start_date;
var _fe=document.getElementById('f-end');if(_fe)_fe.value=p.end_date;
if(document.getElementById('f-living'))numFmt(document.getElementById('f-living'),p.daily_living);
if(document.getElementById('f-cat'))numFmt(document.getElementById('f-cat'),p.cat_expense);
if(document.getElementById('f-catname'))document.getElementById('f-catname').value=p.cat_names||'';
renderTypes();renderOwners();renderAssetTypes();renderBanks()}

function renderTypes(){var c=document.getElementById('types-list');
c.innerHTML=sTypes().map(function(t,i){return '<span class="type-chip">'+esc(t)+' <span class="x" onclick="rmType('+i+')">&times;</span></span>'}).join('')+
'<span class="type-add" onclick="addType()"><i class="fa-solid fa-plus" style="font-size:8px"></i> Add</span>'}

function addType(){var t=prompt('New type:');if(t&&t.trim()&&D.types.indexOf(t.trim())===-1){D.types.push(t.trim());D.types.sort();if(document.getElementById('f-living'))numFmt(document.getElementById('f-living'),D.profile.daily_living);
if(document.getElementById('f-cat'))numFmt(document.getElementById('f-cat'),D.profile.cat_expense);
if(document.getElementById('f-catname'))document.getElementById('f-catname').value=D.profile.cat_names||'';
renderTypes()}}

function rmType(i){D.types.splice(i,1);if(document.getElementById('f-living'))numFmt(document.getElementById('f-living'),D.profile.daily_living);
if(document.getElementById('f-cat'))numFmt(document.getElementById('f-cat'),D.profile.cat_expense);
if(document.getElementById('f-catname'))document.getElementById('f-catname').value=D.profile.cat_names||'';
renderTypes()}

function renderOwners(){var c=document.getElementById('owners-list');if(!c)return;
c.innerHTML=(D.owners||[]).slice().sort().map(function(o,i){return '<span class="type-chip">'+esc(o)+
(o==='Me'?'':' <span class="x" onclick="rmOwner('+i+')">&times;</span>')+'</span>'}).join('')+
'<span class="type-add" onclick="addOwner()"><i class="fa-solid fa-plus" style="font-size:8px"></i> Add</span>'}

function addOwner(){var o=prompt('New owner name:');if(o&&o.trim()&&D.owners.indexOf(o.trim())===-1){D.owners.push(o.trim());D.owners.sort();OWNERS=D.owners;saveD();renderOwners()}}

function rmOwner(i){var name=D.owners[i];if(name==='Me'){alert('Cannot remove "Me"');return}
if(!confirm('Remove owner "'+name+'"? Items assigned to them will keep their current value.')){return}
D.owners.splice(i,1);OWNERS=D.owners;saveD();renderOwners()}

function renderAssetTypes(){var el=document.getElementById('asset-types-list');if(!el)return;
el.innerHTML=(D.asset_types||[]).map(function(t,i){return '<span class="type-chip">'+esc(t)+' <span class="x" onclick="rmAssetType('+i+')">&times;</span></span>'}).join('')+
'<span class="type-add" onclick="addAssetType()"><i class="fa-solid fa-plus" style="font-size:8px"></i> Add</span>'}

function addAssetType(){var n=prompt('New asset type:');if(!n||!n.trim())return;n=n.trim();if(D.asset_types.indexOf(n)>=0){toast('\u26a0\ufe0f Already exists');return}D.asset_types.push(n);saveD();renderAssetTypes()}

function rmAssetType(i){if(!confirm('Remove asset type "'+D.asset_types[i]+'"?'))return;D.asset_types.splice(i,1);saveD();renderAssetTypes()}

// Banks — user-managed list for the Card Details bank dropdown (Setup page chip UI)
function renderBanks(){var el=document.getElementById('banks-list');if(!el)return;
el.innerHTML=(D.banks||[]).map(function(t,i){return '<span class="type-chip">'+esc(t)+' <span class="x" onclick="rmBank('+i+')">&times;</span></span>'}).join('')+
'<span class="type-add" onclick="addBank()"><i class="fa-solid fa-plus" style="font-size:8px"></i> Add</span>'}
function addBank(){var n=prompt('New bank:');if(!n||!n.trim())return;n=n.trim();if(!Array.isArray(D.banks))D.banks=[];if(D.banks.indexOf(n)>=0){toast('\u26a0\ufe0f Already exists');return}D.banks.push(n);D.banks.sort(function(a,b){return a.localeCompare(b,undefined,{sensitivity:'base'})});saveD();renderBanks();if(typeof renderCreditCards==='function')try{renderCreditCards()}catch(e){}}
function rmBank(i){if(!confirm('Remove bank "'+D.banks[i]+'"?'))return;D.banks.splice(i,1);saveD();renderBanks();if(typeof renderCreditCards==='function')try{renderCreditCards()}catch(e){}}
// <option> list for a bank <select>; includes the current value even if not in the list, plus a blank.
function bankOpts(sel){var h='<option value="">— select —</option>';var list=(D.banks||[]).slice();if(sel&&list.indexOf(sel)<0)list.push(sel);list.sort(function(a,b){return a.localeCompare(b,undefined,{sensitivity:'base'})});list.forEach(function(b){h+='<option'+(sel===b?' selected':'')+'>'+esc(b)+'</option>'});return h}

function sHdr(grp,col,label){return '<th class="r" style="cursor:pointer" onclick="sort'+grp.charAt(0).toUpperCase()+grp.slice(1)+'(\''+col+'\')">'+label+' <span style="font-size:7px;color:var(--text3)">'+((sortState[grp]||{}).col===col?((sortState[grp]||{}).asc?'\u25b2':'\u25bc'):'\u25b4\u25be')+'</span></th>'}

function sortMonthly(col){var st=sortState.monthly;if(st.col===col)st.asc=!st.asc;else{st.col=col;st.asc=true}
D.monthly.sort(function(a,b){var va=a[col],vb=b[col];if(typeof va==='number')return st.asc?va-vb:vb-va;return st.asc?String(va||'').localeCompare(String(vb||'')):String(vb||'').localeCompare(String(va||''))});
renderMonthly();filterMonthly()}

function sortYearly(col){var st=sortState.yearly;if(st.col===col)st.asc=!st.asc;else{st.col=col;st.asc=true}
D.yearly.sort(function(a,b){if(col==='billing_day'){var va2=((a.year||0)*10000+(a.month||0)*100+(a.billing_day||0)),vb2=((b.year||0)*10000+(b.month||0)*100+(b.billing_day||0));return st.asc?va2-vb2:vb2-va2}
var va=a[col],vb=b[col];if(typeof va==='number')return st.asc?va-vb:vb-va;return st.asc?String(va||'').localeCompare(String(vb||'')):String(vb||'').localeCompare(String(va||''))});
renderYearly();filterYearly()}

// CARDS
