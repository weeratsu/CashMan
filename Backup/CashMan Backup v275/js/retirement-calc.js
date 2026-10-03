// retirement-calc.js — Thai Severance & Retirement Calculation Engine
// Based on Thai Labour Protection Act B.E. 2541 (1998) and amendments

// Severance Pay brackets (§118)
var SEVERANCE_BRACKETS=[
{minDays:0,maxDays:119,days:0,label:'Less than 120 days'},
{minDays:120,maxDays:365,days:30,label:'120 days - 1 year'},
{minDays:366,maxYears:3,days:90,label:'1 - 3 years'},
{minYears:3,maxYears:6,days:180,label:'3 - 6 years'},
{minYears:6,maxYears:10,days:240,label:'6 - 10 years'},
{minYears:10,maxYears:20,days:300,label:'10 - 20 years'},
{minYears:20,maxYears:Infinity,days:400,label:'20+ years'}
];

// Asset types
var ASSET_TYPES=['Savings','Investment','Property','Vehicle','Insurance Surrender','Gold','Crypto','Other'];

// Currencies available for assets
var ASSET_CURRENCIES=['THB','USD','EUR','GBP','JPY','SGD','AUD','CNY','HKD','CHF','Gold (oz)','BTC','ETH'];

// Liquidity classification for asset types (used by Asset Summary liquidity grouping)
// Liquid = readily convertible to cash; Illiquid = takes time/effort to sell
var ASSET_LIQUIDITY={'Savings':'Liquid','Investment':'Liquid','Crypto':'Liquid','Gold':'Liquid','Insurance Surrender':'Illiquid','Property':'Illiquid','Vehicle':'Illiquid','Other':'Illiquid'};
function assetLiquidity(type){return ASSET_LIQUIDITY[type]||'Illiquid'}

// EPF action options
var EPF_ACTIONS=[
{id:'cashout',label:'Cash Out',desc:'Receive full vested amount now'},
{id:'move_rmf',label:'Transfer to RMF',desc:'Tax-free rollover to RMF'},
{id:'hold',label:'Hold in Fund',desc:'No payout, stay invested'}
];

// Calculate severance pay
function calcSeverance(scenario,yearsFrac,lastSalary,opts){
opts=opts||{};
var dailyWage=lastSalary/30;
var totalDays=Math.round(yearsFrac*365);
var years=Math.floor(yearsFrac);
var result={
severance:0,severanceDays:0,
specialSeverance:0,specialDays:0,
noticePay:0,
leaveCashout:0,leaveDays:0,
companySpecialPay:0,companySpecialItems:[],
taxExempt:0,taxable:0,tax:0,netAfterTax:0,
scenario:scenario,years:years,yearsFrac:yearsFrac,
lastSalary:lastSalary,dailyWage:dailyWage,
breakdown:[]
};

// Self-resign: no severance
if(scenario==='resign'){
result.breakdown.push({item:'Severance Pay',amount:0,note:'Not eligible (self-resignation)'});
result.breakdown.push({item:'Special Severance',amount:0,note:'Not eligible'});
result.breakdown.push({item:'Notice Pay',amount:0,note:'Employee provides notice'});
_addLeaveCashout(result,opts);
_addCompanySpecialPay(result,opts);
return _calcSeveranceTax(result);
}

// Determine severance days from brackets
for(var i=0;i<SEVERANCE_BRACKETS.length;i++){
var b=SEVERANCE_BRACKETS[i];
var match=false;
if(b.maxDays!==undefined){
if(totalDays>=b.minDays&&totalDays<=b.maxDays)match=true;
}else{
var minY=b.minYears||0,maxY=b.maxYears||Infinity;
if(years>=minY&&years<maxY)match=true;
}
if(match){result.severanceDays=b.days;break}
}
result.severance=Math.round(result.severanceDays*dailyWage*100)/100;
if(opts.includeSeverance===false){result.severance=0;result.severanceDays=0}
result.breakdown.push({item:'Severance Pay (\u00a7118)',amount:result.severance,
note:result.severanceDays+' days \u00d7 \u0e3f'+fmt(dailyWage)+'/day'});

// Special severance (§122) — layoff only, 6+ years
if(scenario==='layoff'&&years>=6){
result.specialDays=15*years;if(opts.includeSpecial===false){result.specialDays=0;result.specialSeverance=0}else{
result.specialSeverance=Math.round(result.specialDays*dailyWage*100)/100;
result.breakdown.push({item:'Special Severance (\u00a7122)',amount:result.specialSeverance,
note:'15 days \u00d7 '+years+' years \u00d7 \u0e3f'+fmt(dailyWage)+'/day'});}
}else{
var reason=scenario==='retire'?'Retirement (not applicable)':scenario==='end_contract'?'End of contract (not applicable)':'Less than 6 years service';
result.breakdown.push({item:'Special Severance (\u00a7122)',amount:0,note:reason});
}

// Notice pay (§17) — layoff without notice
if(scenario==='layoff'||scenario==='retire'){
if(opts.noticeAlreadyGiven){
result.noticePay=0;
result.breakdown.push({item:'Notice Pay (\u00a717)',amount:0,note:'Company already gave advance notice'});
}else{
result.noticePay=opts.includeNotice===false?0:lastSalary;
result.breakdown.push({item:'Notice Pay (\u00a717)',amount:result.noticePay,
note:'1 pay period (no advance notice given)'});
}
_addLeaveCashout(result,opts);
_addCompanySpecialPay(result,opts);

}else if(scenario==='end_contract'){
result.breakdown.push({item:'Notice Pay',amount:0,note:'Fixed-term contract — no notice pay'});
}else{
result.breakdown.push({item:'Notice Pay',amount:0,note:'Not applicable for '+scenario});
}

return _calcSeveranceTax(result);
}

// Tax calculation on severance (§48(5))
function _calcSeveranceTax(r){
var totalPay=r.severance+r.specialSeverance+r.noticePay+r.leaveCashout+r.companySpecialPay;

// Tax-exempt amount: severance up to 300 days' wages OR ฿300,000, whichever is GREATER
var exempt300days=300*r.dailyWage;
var exemptFloor=300000;
r.taxExempt=Math.max(exempt300days,exemptFloor);
r.taxExempt=Math.min(r.taxExempt,r.severance);// can't exempt more than severance itself

// Taxable = total - exempt (half-rate tax under §48(5))
r.taxable=Math.max(0,totalPay-r.taxExempt);

// Tax at half normal progressive rate
if(r.taxable>0){
var halfTaxable=r.taxable;
// Apply progressive rates at half rate
var brackets=[
{min:0,max:150000,rate:0},{min:150000,max:300000,rate:0.025},
{min:300000,max:500000,rate:0.05},{min:500000,max:750000,rate:0.075},
{min:750000,max:1000000,rate:0.10},{min:1000000,max:2000000,rate:0.125},
{min:2000000,max:5000000,rate:0.15},{min:5000000,max:Infinity,rate:0.175}
];
var tax=0;
brackets.forEach(function(b){
var amt=Math.max(0,Math.min(halfTaxable,b.max)-b.min);
tax+=amt*b.rate});
r.tax=Math.round(tax*100)/100;
}

r.netAfterTax=Math.round((totalPay-r.tax)*100)/100;
r.breakdown.push({item:'Tax Exempt Amount',amount:r.taxExempt,
note:'Max(300 days\u2019 wages, \u0e3f300K) = \u0e3f'+fmt(Math.max(300*r.dailyWage,300000))});
r.breakdown.push({item:'Estimated Tax (\u00a748(5) half-rate)',amount:-r.tax,
note:'On taxable portion \u0e3f'+fmt(r.taxable)});
r.breakdown.push({item:'Net After Tax',amount:r.netAfterTax,note:'Total payout after tax',isBold:true});

return r;
}

// EPF/Provident Fund payout calculation
function calcEPFPayout(balance,vestingPct,action,yearsOfService,ageAtSep){
var employerPortion=balance*0.5;// approximate: employer ~ 50% of balance
var employeePortion=balance-employerPortion;
var vestedEmployer=Math.round(employerPortion*vestingPct/100*100)/100;
var totalPayout=employeePortion+vestedEmployer;
var forfeited=employerPortion-vestedEmployer;
var tax=0,net=totalPayout;

if(action==='cashout'){
// Tax on employer portion gains (simplified)
// If service < 5 years or age < 55: taxed on employer portion
if(yearsOfService<5||ageAtSep<55){
var taxableEPF=vestedEmployer;// employer portion is taxable
// Progressive tax (simplified — use 5% effective for estimation)
tax=Math.round(taxableEPF*0.05*100)/100;
}
// If 5+ years AND age 55+: tax-exempt
net=totalPayout-tax;
}else if(action==='move_rmf'){
// Tax-free rollover to RMF
tax=0;net=totalPayout;
}else{
// Hold — no payout
totalPayout=0;tax=0;net=0;
}

return{
balance:balance,
employeePortion:employeePortion,
employerPortion:employerPortion,
vestingPct:vestingPct,
vestedEmployer:vestedEmployer,
forfeited:forfeited,
totalPayout:Math.round(totalPayout*100)/100,
tax:Math.round(tax*100)/100,
net:Math.round(net*100)/100,
action:action
};
}

// Social Security unemployment benefit
function calcSSOBenefit(scenario,lastSalary){
var cap=15000;// SSO salary cap
var base=Math.min(lastSalary,cap);
var monthlyBenefit=0,months=0;

if(scenario==='layoff'){
// Dismissed/laid off: 50% of capped salary for up to 180 days (6 months)
monthlyBenefit=Math.round(base*0.50*100)/100;
months=6;
}else if(scenario==='resign'||scenario==='end_contract'){
// Resign or end of contract: 30% of capped salary for up to 90 days (3 months)
// Per Thai SSO rules, end of contract = same as voluntary quit
monthlyBenefit=Math.round(base*0.30*100)/100;
months=3;
}
// retire: depends on age, may qualify for old-age pension instead

return{
monthlyBenefit:monthlyBenefit,
months:months,
total:Math.round(monthlyBenefit*months*100)/100,
note:scenario==='layoff'?'50% for 6 months (dismissed/laid off)':scenario==='end_contract'?'30% for 3 months (end of contract)':'30% for 3 months (voluntary quit)',
salaryBase:base,
salaryCap:cap
};
}

// Calculate years of service from hire date to separation date
function calcYearsOfService(hireDate,sepDate){
if(!hireDate||!sepDate)return 0;
var h=new Date(hireDate+'T00:00:00'),s=new Date(sepDate+'T00:00:00');
if(isNaN(h.getTime())||isNaN(s.getTime()))return 0;
var diffMs=s-h;
return Math.max(0,diffMs/(365.25*24*60*60*1000));
}

// SSO old-age pension calculation
// Thai Social Security Act: Age 55+ with 180+ months contributions
// Pension = 20% of avg monthly covered earnings (last 60 months) + 1.5% per 12 months over 180
// If < 180 months: lump sum of total contributions instead
// Salary cap: 15,000 THB (pre-2026), 17,500 THB (2026+)
function calcSSOPension(retData){
var dob=retData.dob;if(!dob)return null;
var sepDate=retData.separation_date;if(!sepDate)return null;
var hireDate=retData.hire_date;if(!hireDate)return null;

var bd=new Date(dob+'T00:00:00');
var age55=new Date(bd.getFullYear()+55,bd.getMonth(),bd.getDate());
var pensionStart=new Date(age55.getFullYear(),age55.getMonth()+1,15);// 15th of month after turning 55

var yos=calcYearsOfService(hireDate,sepDate);
// Use user-entered SSO contribution months if available, otherwise derive from hire date
var contributionMonths=retData.sso_contribution_months>0?retData.sso_contribution_months:Math.floor(yos*12);

var salaryCap=17500;// 2026+ cap
// Estimate avg salary from accumulated contributions: accumulated = months × avg × 6% (3% employee + 3% employer)
var avgMonthly=0;
if(retData.sso_accumulated>0&&contributionMonths>0){
avgMonthly=Math.min(Math.round(retData.sso_accumulated/(contributionMonths*0.06)),salaryCap);
}else{
avgMonthly=Math.min(retData.last_salary||0,salaryCap);
}

if(contributionMonths<180){
// Lump sum — total employee contributions returned
var lumpSum=Math.round(contributionMonths*avgMonthly*0.03*100)/100;// 3% old-age portion
return{
type:'lump_sum',
contributionMonths:contributionMonths,
requiredMonths:180,
shortfall:180-contributionMonths,
lumpSum:lumpSum,
monthlyPension:0,
pensionStartDate:'',
avgMonthly:avgMonthly,
salaryCap:salaryCap,
note:'Less than 180 months contributed — lump sum refund of \u0e3f'+fmt(lumpSum)
};
}

// Pension calculation
var basePct=20;// 20% for first 180 months
var extraMonths=contributionMonths-180;
var extraYears=Math.floor(extraMonths/12);
var extraPct=extraYears*1.5;
var totalPct=basePct+extraPct;

var monthlyPension=Math.round(avgMonthly*totalPct/100*100)/100;

return{
type:'pension',
contributionMonths:contributionMonths,
requiredMonths:180,
basePct:basePct,
extraYears:extraYears,
extraPct:extraPct,
totalPct:totalPct,
monthlyPension:monthlyPension,
pensionStartDate:pensionStart.getFullYear()+'-'+((pensionStart.getMonth()+1)<10?'0':'')+(pensionStart.getMonth()+1)+'-'+((pensionStart.getDate())<10?'0':'')+pensionStart.getDate(),
age55Date:age55.getFullYear()+'-'+((age55.getMonth()+1)<10?'0':'')+(age55.getMonth()+1)+'-'+((age55.getDate())<10?'0':'')+age55.getDate(),
avgMonthly:avgMonthly,
salaryCap:salaryCap,
note:'Pension: '+totalPct+'% of \u0e3f'+fmt(avgMonthly)+' = \u0e3f'+fmt(monthlyPension)+'/month from age 55'
};
}

// Look up vesting % from schedule based on years of service
function lookupVesting(schedule,yearsOfService){
if(!schedule||!schedule.length)return 100;
var pct=0;
for(var i=0;i<schedule.length;i++){
var row=schedule[i];
if(yearsOfService>=row.min_years&&yearsOfService<row.max_years){pct=row.pct;break}
if(i===schedule.length-1&&yearsOfService>=row.min_years)pct=row.pct;
}
return pct;
}

// Calculate age at a given date
function calcAgeAt(birthDate,atDate){
if(!birthDate||!atDate)return 0;
var b=new Date(birthDate+'T00:00:00'),d=new Date(atDate+'T00:00:00');
var age=d.getFullYear()-b.getFullYear();
var m=d.getMonth()-b.getMonth();
if(m<0||(m===0&&d.getDate()<b.getDate()))age--;
return Math.max(0,age);
}

// Leave balance → cash (Thai law: annual leave encashable on termination)
function _addLeaveCashout(r,opts){
if(opts.leaveCashEnabled&&opts.leaveBalanceDays>0){
r.leaveDays=opts.leaveBalanceDays;
r.leaveCashout=Math.round(r.leaveDays*r.dailyWage*100)/100;
r.breakdown.push({item:'Annual Leave Cash-out',amount:r.leaveCashout,
note:r.leaveDays+' days \u00d7 \u0e3f'+fmt(r.dailyWage)+'/day'});
}else{
r.breakdown.push({item:'Annual Leave Cash-out',amount:0,
note:opts.leaveCashEnabled?'No leave balance':'Not enabled'});
}
}

// Company-specific special pay items
// DXC examples: Pro-rated AIP bonus, 13th month bonus (pro-rated),
// Company separation package, Long service award, etc.
function _addCompanySpecialPay(r,opts){
var items=opts.companySpecialPay||[];
if(!items.length)return;
var total=0;
items.forEach(function(sp){
var amt=parseFloat(sp.amount)||0;
if(amt>0){
total+=amt;
r.breakdown.push({item:sp.name||'Company Special Pay',amount:amt,note:sp.note||''});
}
});
r.companySpecialPay=Math.round(total*100)/100;
r.companySpecialItems=items;
}
