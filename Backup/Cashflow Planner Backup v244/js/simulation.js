// simulation.js — Simulation engine, payroll & tax calculations
var TAX_BRACKETS=[
{min:0,max:150000,rate:0,label:'0 - 150,000'},
{min:150000,max:300000,rate:0.05,label:'150,001 - 300,000'},
{min:300000,max:500000,rate:0.10,label:'300,001 - 500,000'},
{min:500000,max:750000,rate:0.15,label:'500,001 - 750,000'},
{min:750000,max:1000000,rate:0.20,label:'750,001 - 1,000,000'},
{min:1000000,max:2000000,rate:0.25,label:'1,000,001 - 2,000,000'},
{min:2000000,max:5000000,rate:0.30,label:'2,000,001 - 5,000,000'},
{min:5000000,max:Infinity,rate:0.35,label:'5,000,001+'}
];

function simulate(){
var p=D.profile,sd=new Date(p.start_date+'T00:00:00'),ed=new Date(p.end_date+'T00:00:00'),events={},typeExp={},cardExp={};
function dk(d){return d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate()}
function addE(d,ic,desc,amt,cardN,typ,grp,info){var k=dk(d);if(!events[k])events[k]=[];events[k].push({icon:ic,desc:desc,amount:amt,card:cardN||'',type:typ||'',group:grp||'',info:info||''})}
var mR=[];var cy=sd.getFullYear(),cm=sd.getMonth();while(cy<ed.getFullYear()||(cy===ed.getFullYear()&&cm<=ed.getMonth())){mR.push([cy,cm]);cm++;if(cm>11){cm=0;cy++}}
// Retirement: determine separation date for payroll cutoff
var _retEnabled=D.retirement&&D.retirement.enabled&&D.retirement.separation_date;
var _retSepDate=_retEnabled?new Date(D.retirement.separation_date+'T00:00:00'):null;
// Income
mR.forEach(function(ym){var pd=payDt(ym[0],ym[1],p.payout_day,p.weekend_rule);
if(_retSepDate&&pd>_retSepDate)return;// Stop payroll after separation
if(pd>=sd&&pd<=ed){var mn=ym[1]+1,pay=computePayroll(mn),hasBonus=pay.gross>computePayroll(1).gross;
addE(pd,'💰','Net Pay'+(hasBonus?' (+Bonus)':''),pay.net,'','Income','payroll_net');
D.payroll.forEach(function(pi){var applies=pi.freq==='every_month'||(pi.freq==='specific_month'&&pi.month===mn);
if(!applies)return;var amt=pi.amount;
if(pi.calc_mode==='percent_epf'){amt=Math.round(pay.epfBase*(pi.epf_pct||0)/100*100)/100}
else if(pi.calc_mode==='percent_sso'){amt=Math.round(pay.ssoBase*(pi.sso_pct||5)/100*100)/100;if(pi.sso_cap&&amt>pi.sso_cap)amt=pi.sso_cap}
addE(pd,pi.type==='income'?'📥':'📤',pi.name,pi.type==='income'?amt:-amt,'','Income','payroll_detail')})}});
// Monthly recurring
mR.forEach(function(ym){D.monthly.forEach(function(item){if(item.status&&item.status!=='Active')return;
var ep=effPayment(item);
var pm=ym[1]+ep.monthShift,py=ym[0];if(pm>11){pm-=12;py++}
var d=new Date(py,pm,Math.min(ep.day,dim(py,pm)));
if(item.end_mode==='date'&&item.end_date&&d>new Date(item.end_date+'T00:00:00'))return;
if(item.start_mode==='date'&&item.start_date&&d<new Date(item.start_date+'T00:00:00'))return;
if(d>=sd&&d<=ed)addE(d,item.direction==='income'?'💰':'📋',item.name,(item.direction==='income'?1:-1)*item.amount,item.card!=='Cash/Direct'?item.card:'',item.type)})});
// Yearly recurring - full payment mode only
D.yearly.forEach(function(item){if(item.pay_mode!=='full')return;if(item.status&&item.status!=='Active')return;mR.forEach(function(ym){if(ym[1]===(item.month-1)){var ep=effPayment(item);
var pm=ym[1]+ep.monthShift,py=ym[0];if(pm>11){pm-=12;py++}
var d=new Date(py,pm,Math.min(ep.day,dim(py,pm)));
if(item.start_mode==='date'&&item.start_from&&d<new Date(item.start_from+'T00:00:00'))return;
if(d>=sd&&d<=ed)addE(d,item.direction==='income'?'💰':'📆',item.name,(item.direction==='income'?1:-1)*item.amount,item.card!=='Cash/Direct'?item.card:'',item.type,'','Full')}})});
// All installments (manual + yearly-derived)
var allInst=allInstallments();
allInst.forEach(function(inst){if(inst.status==='Cancelled'||inst.status==='Hold')return;
var c=D.cards.find(function(x){return x.name===inst.card});
var dl=c?c.payment_day:15;
var instMonthShift=(c&&inst.billing_day&&inst.billing_day>c.statement_day)?1:0;
// Cashback
if(inst.cashback_rate&&inst.total>=10000){var cb=Math.floor(inst.total/10000)*inst.cashback_rate;
var cbm=inst.start_month-1+instMonthShift,cby=inst.start_year;if(cbm>11){cbm-=12;cby++}
var d0=new Date(cby,cbm,Math.min(dl,dim(cby,cbm)));
if(d0>=sd&&d0<=ed)addE(d0,'💳','Cashback: '+inst.name,cb,inst.card,'Income')}
for(var i=0;i<inst.periods;i++){var m=inst.start_month-1+i+instMonthShift,y=inst.start_year;
while(m>11){m-=12;y++}var d=new Date(y,m,Math.min(dl,dim(y,m)));
if(inst.hide_before&&d<new Date(inst.hide_before+'T00:00:00'))continue;
var tag=inst.own_by==='Mum'?' \ud83d\udc69':'';
if(d>=sd&&d<=ed){var instInfo=inst.periods===1?'Full':(i===inst.periods-1?'\u2705 ('+(i+1)+'/'+inst.periods+')':'('+(i+1)+'/'+inst.periods+')');
addE(d,'💳',inst.name+tag,-inst.per_period,inst.card,inst.type,'',instInfo)}}});
// Planned one-time expenses
D.planned.forEach(function(item){if(!item.date)return;
var parts=item.date.split('-'),py=parseInt(parts[0]),pm=parseInt(parts[1])-1,pd=parseInt(parts[2]);
var c=D.cards.find(function(x){return x.name===item.card});
var payDay=pd,mShift=0;
if(c&&item.card!=='Cash/Direct'){payDay=c.payment_day;if(pd>c.statement_day)mShift=1}
var adjM=pm+mShift,adjY=py;if(adjM>11){adjM-=12;adjY++}
var d=new Date(adjY,adjM,Math.min(payDay,dim(adjY,adjM)));
if(d>=sd&&d<=ed)addE(d,item.direction==='income'?'\ud83d\udcb0':'\ud83d\udcc5',item.name,(item.direction==='income'?1:-1)*item.amount,item.card!=='Cash/Direct'?item.card:'',item.type)});
// Tax refund or tax owed — computed for EVERY tax year in the simulation window.
// Each tax year's refund/owed lands in the FOLLOWING year (month = tax_refund_month).
// The base tax year (D.tax_year) uses actual settings; later years are estimates
// (same payroll base) and are labelled "(est.)".
try{
var _baseTaxYr=D.tax_year||parseInt(D.profile.start_date.slice(0,4))||new Date().getFullYear();
var _taxMonth=D.tax_refund_month||3;
// Iterate candidate tax years: from the base year up through the last year that could
// produce a refund event inside [sd,ed] (refund lands in _tyr+1).
var _firstTaxYr=Math.min(_baseTaxYr,sd.getFullYear());
var _lastTaxYr=ed.getFullYear();// refund for _lastTaxYr lands in _lastTaxYr+1
for(var _tyr=_firstTaxYr;_tyr<=_lastTaxYr;_tyr++){
var _rfDay=(D.tax_refund_day==null?15:D.tax_refund_day);
var _rfDom=(_rfDay==='last')?dim(_tyr+1,_taxMonth-1):Math.min(parseInt(_rfDay)||15,dim(_tyr+1,_taxMonth-1));
var _taxDate=new Date(_tyr+1,_taxMonth-1,_rfDom);
if(_taxDate<sd||_taxDate>ed)continue;// only if the refund date is within the window
var _hasPay=!_retSepDate||new Date(_tyr,0,1)<=_retSepDate;
if(!_hasPay)continue;
// Months of payroll in THIS tax year (pro-rated if separation falls in it).
var _payMonths=12;
if(_retSepDate){
var _sepYr=_retSepDate.getFullYear(),_sepMo=_retSepDate.getMonth();
if(_sepYr===_tyr)_payMonths=_sepMo+1;else if(_sepYr<_tyr)_payMonths=0;
}
if(_payMonths<=0)continue;
var _proGross=0,_proWithheld=0;
for(var _pm=1;_pm<=_payMonths;_pm++){
var _pp=computePayroll(_pm);_proGross+=_pp.gross;
try{var _ppd=computePayrollDetailed(_pm);
_ppd.items.forEach(function(it){
if(it.type==='deduction'&&(it.name.toLowerCase().indexOf('tax')>=0||it.name.toLowerCase().indexOf('wht')>=0)){_proWithheld+=Math.abs(it.amount)}});}catch(e2){}
}
var _proExemptions=D.tax_exemptions.reduce(function(s,e){
var amt=e.override!=null?Math.min(e.override,e.max>0?e.max:Infinity):Math.min(e.amount,e.max>0?e.max:Infinity);return s+amt},0);
var _proTaxable=Math.max(0,_proGross-_proExemptions);
var _proTaxResult=calcTax(_proTaxable);
if(_proWithheld>0||_proTaxResult.total>0){
var _taxDiff=_proWithheld-_proTaxResult.total;
var _estLabel=(_tyr>_baseTaxYr)?' (est.)':'';
var _moLabel=_payMonths<12?' ('+_payMonths+'mo)':'';
if(_taxDiff>0){addE(_taxDate,'\ud83c\udf89','Tax Refund'+_moLabel+_estLabel,Math.round(_taxDiff*100)/100,'Cash/Direct','Income','','FY'+_tyr)}
else if(_taxDiff<0){addE(_taxDate,'\u26a0\ufe0f','Tax Owed'+_moLabel+_estLabel,-Math.round(Math.abs(_taxDiff)*100)/100,'Cash/Direct','Tax','','FY'+_tyr)}
}
}
}catch(e){}
// Retirement events
if(_retEnabled&&_retSepDate&&_retSepDate>=sd&&_retSepDate<=ed){
var _r=D.retirement;
var _yos=_r.hire_date&&_r.separation_date?calcYearsOfService(_r.hire_date,_r.separation_date):(_r.years_of_service||0);
var _sal=_r.last_salary||0;
if(!_sal){D.payroll.forEach(function(pp){if(pp.type==='income'&&pp.freq==='every_month')_sal+=pp.amount})}
if(_sal>0&&_yos>0){
var _sevOpts={noticeAlreadyGiven:_r.include_notice===false,leaveCashEnabled:_r.leave_cash_enabled,leaveBalanceDays:_r.leave_balance_days,companySpecialPay:_r.include_company_special!==false?(_r.company_special_pay||[]):[],includeSeverance:_r.include_severance!==false,includeSpecial:_r.include_special!==false,includeNotice:_r.include_notice!==false};
var _sev=calcSeverance(_r.scenario,_yos,_sal,_sevOpts);
// Severance pay
if(_sev.severance>0&&_r.include_severance!==false)addE(_retSepDate,'\ud83d\udcb0','Severance Pay',_sev.severance,'Cash/Direct','Income','retirement','\u00a7118 '+_sev.severanceDays+'d');
// Special severance
if(_sev.specialSeverance>0&&_r.include_special!==false)addE(_retSepDate,'\ud83c\udf1f','Special Severance (\u00a7122)',_sev.specialSeverance,'Cash/Direct','Income','retirement','15d\u00d7'+Math.floor(_yos)+'yr');
// Notice pay
if(_sev.noticePay>0&&_r.include_notice!==false)addE(_retSepDate,'\ud83d\udcdd','Notice Pay (\u00a717)',_sev.noticePay,'Cash/Direct','Income','retirement','1 pay period');
// Leave cash-out
if(_sev.leaveCashout>0&&_r.leave_cash_enabled)addE(_retSepDate,'\ud83c\udfd6\ufe0f','Leave Cash-out',_sev.leaveCashout,'Cash/Direct','Income','retirement',_sev.leaveDays+'d');
// Company special pay
if(_sev.companySpecialPay>0&&_r.include_company_special!==false)addE(_retSepDate,'\ud83c\udf81','Company Special Pay',_sev.companySpecialPay,'Cash/Direct','Income','retirement',_sev.companySpecialItems.length+' items');
// Tax on severance
if(_sev.tax>0)addE(_retSepDate,'\ud83c\udfe6','Severance Tax (\u00a748(5))',-_sev.tax,'Cash/Direct','Tax','retirement','half-rate');

// SSO unemployment benefits — monthly
var _sso=calcSSOBenefit(_r.scenario,_sal);
if(_sso.monthlyBenefit>0&&_r.include_sso!==false){
for(var _si=1;_si<=_sso.months;_si++){
var _ssoD=new Date(_retSepDate.getFullYear(),_retSepDate.getMonth()+_si,15);
if(_ssoD>=sd&&_ssoD<=ed)addE(_ssoD,'\ud83d\udee1\ufe0f','SSO Benefit ('+_si+'/'+_sso.months+')',_sso.monthlyBenefit,'Cash/Direct','Income','retirement','')}}

// EPF payout
var _vestPct=typeof lookupVesting==='function'?lookupVesting(_r.epf_vesting_schedule,_yos):(_r.epf_vesting_pct||100);
if(_r.epf_action==='cashout'&&_r.epf_balance>0&&_r.include_epf!==false){
var _epf=calcEPFPayout(_r.epf_balance,_vestPct,'cashout',Math.floor(_yos),_r.age_at_separation||0);
var _epfD=_r.epf_cashout_date?new Date(_r.epf_cashout_date+'T00:00:00'):_retSepDate;
if(_epfD>=sd&&_epfD<=ed){
addE(_epfD,'\ud83c\udfe6','EPF Cash Out',_epf.net,'Cash/Direct','Income','retirement','Vesting '+_vestPct+'%');
if(_epf.tax>0)addE(_epfD,'\ud83c\udfe6','EPF Tax',-_epf.tax,'Cash/Direct','Tax','retirement','')}}
// EPF transfer to RMF — tax-free rollover, withdrawal at specified date
if(_r.epf_action==='move_rmf'&&_r.epf_balance>0&&_r.include_epf!==false){
var _epfRmf=calcEPFPayout(_r.epf_balance,_vestPct,'move_rmf',Math.floor(_yos),_r.age_at_separation||0);
var _rmfD=_r.epf_cashout_date?new Date(_r.epf_cashout_date+'T00:00:00'):null;
if(_rmfD&&_rmfD>=sd&&_rmfD<=ed){
addE(_rmfD,'\ud83c\udfe6','RMF Withdrawal (from EPF)',_epfRmf.net,'Cash/Direct','Income','retirement','Tax-free at 55+')}}

// Asset cashouts
(_r.assets||[]).forEach(function(_a){
if(!(_a.cashout_date&&_a.value>0))return;
var _cur=_a.currency||'THB';
var _thb=_cur==='THB'?_a.value:(parseFloat(_a.fx_rate)>0?_a.value*parseFloat(_a.fx_rate):null);
if(_thb===null)return; // non-THB with no rate — skip (flagged on Assets page)
var _info=_cur==='THB'?'':(_a.value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+_cur+' @ '+parseFloat(_a.fx_rate));
var _aD=new Date(_a.cashout_date+'T00:00:00');
if(_aD>=sd&&_aD<=ed)addE(_aD,'\ud83d\udcbc',_a.name||'Asset',_thb,'Cash/Direct','Income','retirement',_info)})

// SSO old-age pension — monthly payments from age 55 if 180+ months contributed
if(_r.dob&&_r.include_sso_pension!==false){
var _ssoPen=calcSSOPension?calcSSOPension(_r):null;
if(_ssoPen&&_ssoPen.monthlyPension>0){
var _penStart=new Date(_ssoPen.pensionStartDate+'T00:00:00');
// Add monthly pension events within simulation window (up to 30 years)
var _penCur=new Date(_penStart);
var _penEnd=new Date(_penCur.getFullYear()+30,_penCur.getMonth(),_penCur.getDate());
if(_penEnd>ed)_penEnd=ed;
while(_penCur<=_penEnd){
if(_penCur>=sd&&_penCur<=ed){
addE(new Date(_penCur),'\ud83c\udfe5','SSO Pension',_ssoPen.monthlyPension,'Cash/Direct','Income','retirement','\u00a755+')}
_penCur.setMonth(_penCur.getMonth()+1)}}}
}}

// Cat
if(p.cat_expense>0){mR.forEach(function(ym){if(ym[0]===sd.getFullYear()&&ym[1]===sd.getMonth()){var dm=dim(ym[0],ym[1]);var rem=dm-sd.getDate()+1;
addE(sd,'🐱',p.cat_names+' (pro-rated)',-Math.round(p.cat_expense*rem/dm*100)/100,'','Other')}else{var d=new Date(ym[0],ym[1],1);
if(d>=sd&&d<=ed)addE(d,'🐱',p.cat_names,-p.cat_expense,'','Other')}})}
// Living
if(p.daily_living>0){var cur=new Date(sd);while(cur<=ed){addE(new Date(cur),'🍽️','Living',-p.daily_living,'','Living');cur.setDate(cur.getDate()+1)}}
// ===== Consolidate credit-card charges into one statement payment per card per month =====
// When enabled (default), individual card-charged EXPENSES become display-only (group 'card_charge',
// excluded from balance) and one 'Pay [card] statement' cash-out is added on the card's Planned Pay day.
if(D.consolidate_card_bills!==false){
var _cardGroups={}; // key: card + '::' + YYYY-MM(of charge's payment date)
Object.keys(events).forEach(function(_k){events[_k].forEach(function(_e){
if(_e.amount>=0)return; // expenses only
var _cd=_e.card;if(!_cd||_cd==='Cash/Direct')return; // real cards only
if(_e.group==='card_statement')return; // don't re-consolidate
var _pp=_k.split('-');var _ey=parseInt(_pp[0]),_em=parseInt(_pp[1])-1;
var _gk=_cd+'::'+_ey+'-'+(_em+1<10?'0':'')+(_em+1);
if(!_cardGroups[_gk])_cardGroups[_gk]={card:_cd,y:_ey,m:_em,sum:0,count:0};
_cardGroups[_gk].sum+=Math.abs(_e.amount);_cardGroups[_gk].count++;
_e.group='card_charge'; // mark display-only (excluded from balance below)
})});
// Override-only months: a cardbill_override may exist for a card/month that has NO charges
// (e.g. a statement you pay manually with no auto-detected charges). Create an empty group so
// a statement is still generated from the override amount.
Object.keys(D.cardbill_extra||{}).forEach(function(_ok){
var _parts=_ok.split('::');if(_parts.length!==2)return;
if(!(parseFloat(D.cardbill_extra[_ok])>0))return;// only extra-only months with a positive extra
var _oc=_parts[0],_om=_parts[1];// card, YYYY-MM
if(_cardGroups[_oc+'::'+_om])return;// already has charges
var _oy=parseInt(_om.split('-')[0]),_omo=parseInt(_om.split('-')[1])-1;
if(isNaN(_oy)||isNaN(_omo))return;
_cardGroups[_oc+'::'+_om]={card:_oc,y:_oy,m:_omo,sum:0,count:0};
});
Object.keys(_cardGroups).forEach(function(_gk){
var _g=_cardGroups[_gk];
var _cardObj=D.cards.find(function(x){return x.name===_g.card});
var _mk=_g.y+'-'+(_g.m+1<10?'0':'')+(_g.m+1);
// Card 'Statements from' cutoff: skip statement months before the card's start month.
if(_cardObj&&_cardObj.statement_start&&_mk<_cardObj.statement_start)return;
var _extra=parseFloat((D.cardbill_extra||{})[_g.card+'::'+_mk])||0;
var _eff=(_g.sum||0)+_extra;
if(!(_eff>0))return;
var _dlDay=_cardObj&&_cardObj.payment_day?_cardObj.payment_day:(_cardObj&&_cardObj.deadline?_cardObj.deadline:28);
var _dlDate=new Date(_g.y,_g.m,Math.min(_dlDay,dim(_g.y,_g.m)));
if(_dlDate>=sd&&_dlDate<=ed){
if(_extra>0){addE(_dlDate,'\u2795','Extra spend (keyed in)',-_extra,_g.card,'Card Payment','card_charge','added to statement');}
addE(_dlDate,'\ud83d\udcb3',_g.card+' statement',-_eff,_g.card,'Card Payment','card_statement',_g.count+' charge'+(_g.count!==1?'s':'')+(_extra>0?' \u00b7 +extra':''))}
})}
// Run
var bal=p.starting_cash,minB=bal,minDt=new Date(sd),cData=[],mAgg={},dLog=[];var prevMK=null;var cur2=new Date(sd);
while(cur2<=ed){var mk=cur2.getFullYear()+'-'+(cur2.getMonth()<10?'0':'')+cur2.getMonth();
if(mk!==prevMK){mAgg[mk]={income:0,expense:0,start:bal,end:0,y:cur2.getFullYear(),m:cur2.getMonth(),byType:{},byCard:{}};prevMK=mk}
var k2=dk(cur2);var dE=events[k2]||[];
dE.forEach(function(e){if(e.group==='payroll_detail')return;if(e.group==='card_charge')return;if(e.amount>0){mAgg[mk].income+=e.amount}else{mAgg[mk].expense+=Math.abs(e.amount);
var tp=e.type||'Other';if(!mAgg[mk].byType[tp])mAgg[mk].byType[tp]=0;mAgg[mk].byType[tp]+=Math.abs(e.amount);var cd2=e.card||'Cash/Direct';if(!mAgg[mk].byCard[cd2])mAgg[mk].byCard[cd2]=0;mAgg[mk].byCard[cd2]+=Math.abs(e.amount);
if(!typeExp[tp])typeExp[tp]=0;typeExp[tp]+=Math.abs(e.amount);var cd=e.card||'Cash/Direct';if(!cardExp[cd])cardExp[cd]=0;cardExp[cd]+=Math.abs(e.amount)}if(e.group!=='payroll_detail')bal+=e.amount});
mAgg[mk].end=bal;cData.push([Date.UTC(cur2.getFullYear(),cur2.getMonth(),cur2.getDate()),Math.round(bal*100)/100]);
var nL=dE.filter(function(e){return e.desc!=='Living'&&e.group!=='payroll_detail'});var payDetails=dE.filter(function(e){return e.group==='payroll_detail'});
if(nL.length>0)dLog.push({date:new Date(cur2),events:dE,balance:Math.round(bal*100)/100});
if(bal<minB){minB=bal;minDt=new Date(cur2)}cur2.setDate(cur2.getDate()+1)}
var def=0;Object.keys(mAgg).forEach(function(k){if(mAgg[k].income-mAgg[k].expense<0)def++});
SIM={cData:cData,mAgg:mAgg,dLog:dLog,minB:Math.round(minB*100)/100,minDt:minDt,
finalB:Math.round(bal*100)/100,def:def,totI:Object.values(mAgg).reduce(function(s,a){return s+a.income},0),
totE:Object.values(mAgg).reduce(function(s,a){return s+a.expense},0),typeExp:typeExp,cardExp:cardExp,allInst:allInst}}

// === DASHBOARD ===

function computePayrollDetailed(monthNum){
var items=[],gross=0,epfBase=0,ssoBase=0,deduct=0;
var mo=D.payroll_overrides[monthNum]||{};
D.payroll.forEach(function(p,pi){
var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===monthNum);
if(!applies)return;
if(p.type==='income'){
var amt=mo[pi]!=null?mo[pi]:p.amount;
gross+=amt;if(p.affects_epf)epfBase+=amt;if(p.affects_sso)ssoBase+=amt;
items.push({idx:pi,name:p.name,type:'income',base:p.amount,amount:amt,overridden:mo[pi]!=null})}});
D.payroll.forEach(function(p,pi){
var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===monthNum);
if(!applies||p.type!=='deduction')return;
var baseAmt=p.amount;
if(p.calc_mode==='percent_epf')baseAmt=Math.round(epfBase*(p.epf_pct||0)/100*100)/100;
else if(p.calc_mode==='percent_sso'){baseAmt=Math.round(ssoBase*(p.sso_pct||5)/100*100)/100;if(p.sso_cap&&baseAmt>p.sso_cap)baseAmt=p.sso_cap}
var amt=mo[pi]!=null?mo[pi]:baseAmt;
deduct+=amt;
items.push({idx:pi,name:p.name,type:'deduction',base:baseAmt,amount:amt,overridden:mo[pi]!=null,calc_mode:p.calc_mode})});
return{gross:gross,deduct:deduct,net:gross-deduct,epfBase:epfBase,ssoBase:ssoBase,items:items}}


function computePayroll(monthNum){
var gross=0,epfBase=0,ssoBase=0,taxBase=0,deduct=0;
var mo=D.payroll_overrides[monthNum]||{};
D.payroll.forEach(function(p,pi){
var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===monthNum);
if(!applies||p.type!=='income')return;
var amt=mo[pi]!=null?mo[pi]:p.amount;
gross+=amt;
if(p.affects_epf)epfBase+=amt;
if(p.affects_sso)ssoBase+=amt;
if(p.affects_tax)taxBase+=amt});
D.payroll.forEach(function(p,pi){
var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===monthNum);
if(!applies||p.type!=='deduction')return;
var amt=p.amount;
if(p.calc_mode==='percent_epf'){amt=Math.round(epfBase*(p.epf_pct||0)/100*100)/100}
else if(p.calc_mode==='percent_sso'){amt=Math.round(ssoBase*(p.sso_pct||5)/100*100)/100;if(p.sso_cap&&amt>p.sso_cap)amt=p.sso_cap}
if(mo[pi]!=null)amt=mo[pi];
deduct+=amt});
return{gross:gross,deduct:deduct,net:gross-deduct,epfBase:epfBase,ssoBase:ssoBase}}


function calcTax(taxableIncome){
var tax=0,details=[];
TAX_BRACKETS.forEach(function(b){
var amt=Math.max(0,Math.min(taxableIncome,b.max)-b.min);
var t=amt*b.rate;tax+=t;
details.push({label:b.label,amount:amt,rate:b.rate,tax:t})});
return{total:tax,details:details,effective:taxableIncome>0?tax/taxableIncome*100:0}}



// Helper: last payroll month in tax year (1-12, or 0 if no payroll)
function _payMonthsInTaxYear(){
var ty=D.tax_year||new Date().getFullYear();
if(D.retirement&&D.retirement.enabled&&D.retirement.separation_date){
var sepYr=parseInt(D.retirement.separation_date.slice(0,4));
var sepMo=parseInt(D.retirement.separation_date.slice(5,7));
if(ty>sepYr)return 0;
if(ty===sepYr)return sepMo;
}
return 12;
}

function getAnnualGross(){
var _maxMo=_payMonthsInTaxYear();
var total=0;for(var m=1;m<=_maxMo;m++){var p=computePayroll(m);total+=p.gross}return total}


function calcAutoExemptions(){
var annualGross=getAnnualGross();
D.tax_exemptions.forEach(function(e){
if(e.source==='auto_expense'){
var taxInc=0;D.payroll.filter(function(p){return p.type==='income'&&p.affects_tax}).forEach(function(p){
var months=p.freq==='every_month'?12:1;taxInc+=p.amount*months});
var av=Math.min(taxInc*0.5,e.max);e._autoVal=av;e._autoNote='50% of \u0e3f'+fmt(taxInc)+', max \u0e3f100K';
if(e.override==null){e.amount=av;e.notes=e._autoNote}}
else if(e.source==='auto_sso'){
var total=0;for(var m=1;m<=12;m++){D.payroll.forEach(function(p){
if(p.type!=='deduction')return;var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===m);
if(!applies)return;if(p.calc_mode==='percent_sso'){var base=0;D.payroll.forEach(function(q){
if(q.type==='income'&&q.affects_sso){var a2=q.freq==='every_month'||(q.freq==='specific_month'&&q.month===m);if(a2)base+=q.amount}});
var amt=Math.round(base*(p.sso_pct||5)/100*100)/100;if(p.sso_cap&&amt>p.sso_cap)amt=p.sso_cap;total+=amt}})}
e._autoVal=Math.min(total,e.max);e._autoNote='SSO \u0e3f'+fmt(total/12)+'/mo \u00d7 12 = \u0e3f'+fmt(total);
if(e.override==null){e.amount=e._autoVal;e.notes=e._autoNote}}
else if(e.source==='auto_epf'){
var total=0;for(var m=1;m<=12;m++){D.payroll.forEach(function(p){
if(p.type!=='deduction')return;var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===m);
if(!applies)return;if(p.calc_mode==='percent_epf'){var base=0;D.payroll.forEach(function(q){
if(q.type==='income'&&q.affects_epf){var a2=q.freq==='every_month'||(q.freq==='specific_month'&&q.month===m);if(a2)base+=q.amount}});
var amt=Math.round(base*(p.epf_pct||0)/100*100)/100;total+=amt}})}
e._autoVal=Math.min(total,e.max);e._autoNote=total>0?'EPF \u0e3f'+fmt(total/12)+'/mo \u00d7 12':'No EPF in Payroll';
if(e.override==null){e.amount=e._autoVal;e.notes=e._autoNote}}
// select_ins type (Life/Health Insurance) — compute from selected policies
var cat=e.id?getCatalogItem(e.id):null;
if(cat&&cat.validation&&cat.validation.type==='select_ins'){
var insTotal=0;var _exId=e.id;D.yearly.forEach(function(y){
if(y.type==='Insurance'){var selKey=_exId+'::'+y.name;if(D.tax_ins_selections[selKey])insTotal+=y.amount}});
e.amount=Math.min(insTotal,cat.max||100000)}
else if(e.source==='fixed'){e._autoVal=e.amount;e._autoNote=e.notes||''}
});
D.tax_exemptions.forEach(function(e){if(e.override!=null)e.amount=Math.min(e.override,e.max>0?e.max:Infinity)})}


function getAnnualTaxableIncome(){
var _maxMo=_payMonthsInTaxYear();
var gross=getAnnualGross();
calcAutoExemptions();
var taxItems=D.payroll.filter(function(p){return p.type==='income'&&p.affects_tax});
var taxableGross=0;
for(var m=1;m<=_maxMo;m++){taxItems.forEach(function(p){
var applies=p.freq==='every_month'||(p.freq==='specific_month'&&p.month===m);
if(applies)taxableGross+=p.amount})}
var exemptions=D.tax_exemptions.reduce(function(s,e){
var amt=e.override!=null?Math.min(e.override,e.max>0?e.max:Infinity):Math.min(e.amount,e.max>0?e.max:Infinity);return s+amt},0);
return{gross:gross,taxableGross:taxableGross,exemptions:exemptions,taxable:Math.max(0,taxableGross-exemptions),payMonths:_maxMo}}



function getAnnualTaxWithheld(){
if(D.tax_actual_override!=null&&D.tax_actual_override!==''&&D.tax_actual_override!==0)return parseFloat(D.tax_actual_override)||0;
var _maxMo=_payMonthsInTaxYear();
var total=0;
for(var m=1;m<=_maxMo;m++){
try{var pr=computePayrollDetailed(m);
pr.items.forEach(function(p){
if(p.type==='deduction'&&(p.name.toLowerCase().indexOf('tax')>=0||p.name.toLowerCase().indexOf('wht')>=0)){
total+=Math.abs(p.amount)}})}catch(e){}}
return total}

