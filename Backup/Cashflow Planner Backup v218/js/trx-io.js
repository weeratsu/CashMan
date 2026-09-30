// trx-io.js — Export/Import transaction lists to/from Excel

// ===== EXPORT =====

function exportTrxExcel(type){
readAll();
if(typeof XLSX==='undefined'){toast('\u26a0\ufe0f SheetJS not loaded');return}
var ws,name,data=[];
if(type==='monthly'){
name='Monthly_Recurring';
D.monthly.forEach(function(m){data.push({Name:m.name,Direction:m.direction||'expense',Type:m.type||'',Amount:m.amount||0,Billing_Day:m.billing_day||1,Card:m.card||'Cash/Direct',Status:m.status||'Active',End_Mode:m.end_mode||'forever',End_Date:m.end_mode==='date'?fmtDate(m.end_date||''):'',Auto_Pay:m.auto_pay?'Y':'N',Deadline_Mode:m.deadline_mode||'',Deadline_Day:m.deadline_day||'',Start_Mode:m.start_mode||'forever',Start_Date:m.start_mode==='date'?fmtDate(m.start_date||''):''})});
}else if(type==='yearly'){
name='Yearly_Recurring';
D.yearly.forEach(function(y){data.push({Name:y.name,Direction:y.direction||'expense',Type:y.type||'',Amount:y.amount||0,Billing_Day:y.billing_day||1,Month:y.month||1,Pay_Mode:y.pay_mode||'full',Card:y.card||'Cash/Direct',Installment_Periods:y.inst_periods||1,Own_By:y.own_by||'Me',Status:y.status||'Active',Auto_Pay:y.auto_pay?'Y':'N',Deadline_Mode:y.deadline_mode||'',Deadline_Day:y.deadline_day||'',Start_Mode:y.start_mode||'forever',Start_From:y.start_mode==='date'?fmtDate(y.start_from||''):'',Inst_Hide_Before:fmtDate(y.inst_hide_before||'')})});
}else if(type==='installments'){
name='Installments';
var all=allInstallments();
all.forEach(function(inst){data.push({Name:inst.name,Type:inst.type||'',Card:inst.card||'',Own_By:inst.own_by||'Me',Total:inst.total||0,Per_Period:inst.per_period||0,Periods:inst.periods||1,Start_Year:inst.start_year||'',Start_Month:inst.start_month||'',Start_Day:inst.start_day||1,Billing_Day:inst.billing_day||inst.start_day||1,Status:inst.status||'Active',Source:inst.source||'Manual',Auto_Pay:inst.auto_pay?'Y':'N',Hide_Before:fmtDate(inst.hide_before||'')})});
}else if(type==='planned'){
name='Planned_Expenses';
D.planned.forEach(function(p){data.push({Name:p.name,Direction:p.direction||'expense',Type:p.type||'',Amount:p.amount||0,Date:fmtDate(p.date||''),Card:p.card||'Cash/Direct',Own_By:p.own_by||'Me',Notes:p.notes||'',Auto_Pay:p.auto_pay?'Y':'N'})});
}else if(type==='assets'){
name='Assets';
((D.retirement&&D.retirement.assets)||[]).forEach(function(a){data.push({Name:a.name||'',Type:a.type||'',Currency:a.currency||'THB',Value:a.value||0,FX_Rate:a.fx_rate||0,Cashout_Date:fmtDate(a.cashout_date||''),Notes:a.notes||''})});
}else if(type==='todos'){
name='Todos';
(D.todos||[]).forEach(function(x){data.push({Title:x.title||'',Note:x.note||'',Deadline_Mode:x.deadline_mode||'none',Due_Date:x.due_date?fmtDate(x.due_date):'',Due_Time:x.due_time||'',Recur:x.recur||'none',Recur_Every:x.recur_every||1,Recur_DOW:x.recur_dow||0,Recur_DOM:x.recur_dom||1,Recur_Month:x.recur_month||1,Category:x.category||'',Priority:x.priority||2,Done:x.done?'Y':'N',Done_Date:x.done_date?fmtDate(x.done_date):'',Link_Type:x.link_type||'',Link_Ref:x.link_ref||''})});
}else if(type==='wishlist'){
name='Wishlist';
(D.wishlist||[]).forEach(function(w){data.push({Item:w.item||'',Note:w.note||'',Target_Price:w.target_price||0,Target_Date:w.target_date?fmtDate(w.target_date):'',Priority:w.priority||2,Category:w.category||'',Status:w.status||'wishing',URL:w.url||'',Added_Date:w.added_date?fmtDate(w.added_date):''})});
}else if(type==='recurring'){
name='Recurring';
var wb=XLSX.utils.book_new();var sc=0;
var mD=[];D.monthly.forEach(function(m){mD.push({Name:m.name,Direction:m.direction||'expense',Type:m.type||'',Amount:m.amount||0,Billing_Day:m.billing_day||1,Card:m.card||'Cash/Direct',Status:m.status||'Active',End_Mode:m.end_mode||'forever',End_Date:m.end_mode==='date'?fmtDate(m.end_date||''):'',Auto_Pay:m.auto_pay?'Y':'N',Deadline_Mode:m.deadline_mode||'',Deadline_Day:m.deadline_day||'',Start_Mode:m.start_mode||'forever',Start_Date:m.start_mode==='date'?fmtDate(m.start_date||''):''})});
if(mD.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mD),'Monthly');sc++}
var yD=[];D.yearly.forEach(function(y){yD.push({Name:y.name,Direction:y.direction||'expense',Type:y.type||'',Amount:y.amount||0,Billing_Day:y.billing_day||1,Month:y.month||1,Pay_Mode:y.pay_mode||'full',Card:y.card||'Cash/Direct',Installment_Periods:y.inst_periods||1,Own_By:y.own_by||'Me',Status:y.status||'Active',Auto_Pay:y.auto_pay?'Y':'N',Deadline_Mode:y.deadline_mode||'',Deadline_Day:y.deadline_day||'',Start_Mode:y.start_mode||'forever',Start_From:y.start_mode==='date'?fmtDate(y.start_from||''):'',Inst_Hide_Before:fmtDate(y.inst_hide_before||'')})});
if(yD.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(yD),'Yearly');sc++}
if(!sc){toast('\u26a0\ufe0f No data to export');return}
XLSX.writeFile(wb,'cashflow_recurring_'+new Date().toISOString().slice(0,10)+'.xlsx');
toast('\ud83d\udce5 Exported '+mD.length+' monthly + '+yD.length+' yearly to Excel');return;
}else if(type==='all'){
// Full multi-sheet export covering ALL data
var wb=XLSX.utils.book_new();var sheetCount=0;

// Profile sheet
var profData=[{
Name:D.profile.name||'',DOB:fmtDate(D.profile.dob||''),Starting_Cash:D.profile.starting_cash||0,
Payout_Day:D.profile.payout_day||25,Weekend_Rule:D.profile.weekend_rule||'before',
Daily_Living:D.profile.daily_living||0,Cat_Expense:D.profile.cat_expense||0,
Cat_Names:D.profile.cat_names||'',
Start_Date:fmtDate(D.profile.start_date||''),End_Date:fmtDate(D.profile.end_date||''),
Tax_Year:D.tax_year||'',Tax_Refund_Month:D.tax_refund_month||3,
Tax_Actual_Override:D.tax_actual_override===null?'':D.tax_actual_override
}];
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(profData),'Profile');sheetCount++;

// Owners sheet
if(D.owners&&D.owners.length){
var owData=D.owners.map(function(o){return{Owner:o}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(owData),'Owners');sheetCount++}

// Cards sheet
if(D.cards&&D.cards.length){
var cData=D.cards.map(function(c){return{Name:c.name||'',Statement_Day:c.statement_day||1,Payment_Day:c.payment_day||1,Deadline:c.deadline||c.payment_day||1,Statement_Start:c.statement_start||'',Bank:c.bank||'',Last4:c.last4||'',Expiry:c.expiry||'',Credit_Limit:c.credit_limit||0,Current_Balance:c.current_balance||0,Benefits:c.benefits||'',Fee_Waiver:c.fee_waiver||'',Fee_Waiver_Target:c.fee_waiver_target||0,Fee_Waiver_Mode:c.fee_waiver_mode||'amount',Fee_Waiver_Manual:c.fee_waiver_manual||0,Fee_Waiver_Target_Count:c.fee_waiver_target_count||0,Fee_Waiver_Manual_Count:c.fee_waiver_manual_count||0,Remarks:c.remarks||'',Limit_Group:c.limit_group||'',URL:c.url||'',Points_Log:JSON.stringify(c.points_log||[])}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cData),'Cards');sheetCount++}

// Payroll sheet
if(D.payroll&&D.payroll.length){
var pyData=D.payroll.map(function(p){return{Name:p.name||'',Type:p.type||'income',Amount:p.amount||0,Freq:p.freq||'every_month',Month:p.month||'',Notes:p.notes||'',Affects_EPF:p.affects_epf?'Y':'N',Affects_SSO:p.affects_sso?'Y':'N',Affects_Tax:p.affects_tax?'Y':'N',Calc_Mode:p.calc_mode||'fixed',EPF_Pct:p.epf_pct||'',SSO_Pct:p.sso_pct||'',SSO_Cap:p.sso_cap||''}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(pyData),'Payroll');sheetCount++}

// Monthly
var mData=[];D.monthly.forEach(function(m){mData.push({Name:m.name,Direction:m.direction||'expense',Type:m.type||'',Amount:m.amount||0,Billing_Day:m.billing_day||1,Card:m.card||'Cash/Direct',Status:m.status||'Active',End_Mode:m.end_mode||'forever',End_Date:m.end_mode==='date'?fmtDate(m.end_date||''):'',Auto_Pay:m.auto_pay?'Y':'N',Deadline_Mode:m.deadline_mode||'',Deadline_Day:m.deadline_day||'',Start_Mode:m.start_mode||'forever',Start_Date:m.start_mode==='date'?fmtDate(m.start_date||''):''})});
if(mData.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mData),'Monthly');sheetCount++}

// Yearly
var yData=[];D.yearly.forEach(function(y){yData.push({Name:y.name,Direction:y.direction||'expense',Type:y.type||'',Amount:y.amount||0,Billing_Day:y.billing_day||1,Month:y.month||1,Pay_Mode:y.pay_mode||'full',Card:y.card||'Cash/Direct',Installment_Periods:y.inst_periods||1,Own_By:y.own_by||'Me',Status:y.status||'Active',Auto_Pay:y.auto_pay?'Y':'N',Deadline_Mode:y.deadline_mode||'',Deadline_Day:y.deadline_day||'',Start_Mode:y.start_mode||'forever',Start_From:y.start_mode==='date'?fmtDate(y.start_from||''):'',Inst_Hide_Before:fmtDate(y.inst_hide_before||'')})});
if(yData.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(yData),'Yearly');sheetCount++}

// Installments
var iData=[];D.installments.forEach(function(inst){iData.push({Name:inst.name,Type:inst.type||'',Card:inst.card||'',Own_By:inst.own_by||'Me',Total:inst.total||0,Per_Period:inst.per_period||0,Periods:inst.periods||1,Start_Year:inst.start_year||'',Start_Month:inst.start_month||'',Start_Day:inst.start_day||1,Billing_Day:inst.billing_day||inst.start_day||1,Status:inst.status||'Active',Auto_Pay:inst.auto_pay?'Y':'N',Hide_Before:fmtDate(inst.hide_before||''),Source:inst.source||'Manual'})});
if(iData.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(iData),'Installments');sheetCount++}

// Planned
var pData=[];D.planned.forEach(function(p){pData.push({Name:p.name,Direction:p.direction||'expense',Type:p.type||'',Amount:p.amount||0,Date:fmtDate(p.date||''),Card:p.card||'Cash/Direct',Own_By:p.own_by||'Me',Notes:p.notes||'',Auto_Pay:p.auto_pay?'Y':'N'})});
if(pData.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(pData),'Planned');sheetCount++}

// Tax Exemptions
if(D.tax_exemptions&&D.tax_exemptions.length){
var txData=D.tax_exemptions.map(function(e){var cat=getCatalogItem(e.id);return{ID:e.id,Name:cat?cat.name:e.id,Amount:e.amount||0,Override:e.override===null||e.override===undefined?'':e.override,Units:e.units||''}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(txData),'Tax_Exemptions');sheetCount++}

// Tax Insurance Selections
var insKeys=Object.keys(D.tax_ins_selections||{}).filter(function(k){return D.tax_ins_selections[k]});
if(insKeys.length){
var insData=insKeys.map(function(k){return{Selection_Key:k}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(insData),'Tax_Ins_Selections');sheetCount++}

// Payroll Overrides
var ovKeys=Object.keys(D.payroll_overrides||{});
if(ovKeys.length){
var ovData=ovKeys.map(function(k){return{Month_Key:k,Override_JSON:JSON.stringify(D.payroll_overrides[k])}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ovData),'Payroll_Overrides');sheetCount++}

// Retirement Config
if(D.retirement){
var r=D.retirement;
var retData=[{Enabled:r.enabled?'Y':'N',Scenario:r.scenario||'',Separation_Date:fmtDate(r.separation_date||''),Hire_Date:fmtDate(r.hire_date||''),
Years_of_Service:r.years_of_service||0,Last_Salary:r.last_salary||0,Age_at_Separation:r.age_at_separation||0,DOB:fmtDate(r.dob||''),
EPF_Balance:r.epf_balance||0,EPF_Action:r.epf_action||'cashout',EPF_Cashout_Date:fmtDate(r.epf_cashout_date||''),EPF_Vesting_Pct:r.epf_vesting_pct||100,SSO_Accumulated:r.sso_accumulated||0,
Leave_Cash_Enabled:r.leave_cash_enabled?'Y':'N',Leave_Balance_Days:r.leave_balance_days||0,
Include_Severance:r.include_severance!==false?'Y':'N',Include_Special:r.include_special!==false?'Y':'N',
Include_Notice:r.include_notice!==false?'Y':'N',Include_SSO:r.include_sso!==false?'Y':'N',
Include_EPF:r.include_epf!==false?'Y':'N',Include_Company_Special:r.include_company_special!==false?'Y':'N',Include_SSO_Pension:r.include_sso_pension!==false?'Y':'N',SSO_Contribution_Months:r.sso_contribution_months||0,SSO_Start_Date:fmtDate(r.sso_start_date||''),SSO_Avg_Salary:r.sso_avg_salary||0}];
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(retData),'Retirement');sheetCount++;
// EPF Vesting Schedule
if(r.epf_vesting_schedule&&r.epf_vesting_schedule.length){
var vsData=r.epf_vesting_schedule.map(function(v){return{Min_Years:v.min_years,Max_Years:v.max_years,Pct:v.pct}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(vsData),'EPF_Vesting');sheetCount++}
// Company Special Pay
if(r.company_special_pay&&r.company_special_pay.length){
var cspData=r.company_special_pay.map(function(sp){return{Name:sp.name||'',Amount:sp.amount||0,Note:sp.note||''}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cspData),'Company_Special_Pay');sheetCount++}
}

// Retirement Assets
if(D.retirement&&D.retirement.assets&&D.retirement.assets.length){
var raData=D.retirement.assets.map(function(a){return{Name:a.name||'',Type:a.type||'',Currency:a.currency||'THB',Value:a.value||0,FX_Rate:a.fx_rate||0,Cashout_Date:fmtDate(a.cashout_date||''),Notes:a.notes||''}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(raData),'Assets');sheetCount++}

// Types
if(D.types&&D.types.length){
var tData=D.types.map(function(t){return{Type:t}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(tData),'Types');sheetCount++}

// Asset Types
if(D.asset_types&&D.asset_types.length){
var atData=D.asset_types.map(function(t){return{Asset_Type:t}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(atData),'Asset_Types');sheetCount++}
// Banks
if(D.banks&&D.banks.length){
var bkData=D.banks.map(function(t){return{Bank:t}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(bkData),'Banks');sheetCount++}

// Bill Payments (paid ledger — payment history)
var bpKeys=Object.keys(D.bill_payments||{});
if(bpKeys.length){
var bpData=bpKeys.map(function(k){var r=D.bill_payments[k]||{};return{Key:k,Paid:r.paid?'Y':'N',Paid_Date:fmtDate(r.paid_date||''),Paid_Amount:r.paid_amount||0}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(bpData),'Bill_Payments');sheetCount++}
// Card statement EXTRA spend (added on top of auto-calculated total, per-card per-month)
var ceKeys=Object.keys(D.cardbill_extra||{});
if(ceKeys.length){
var ceData=ceKeys.map(function(k){return{Key:k,Extra:D.cardbill_extra[k]}});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ceData),'Card_Extra');sheetCount++}
// To-Dos
if(D.todos&&D.todos.length){
var tdData=D.todos.map(function(x){return{Title:x.title||'',Note:x.note||'',Deadline_Mode:x.deadline_mode||'none',Due_Date:x.due_date||'',Due_Time:x.due_time||'',Recur:x.recur||'none',Recur_Every:x.recur_every||1,Recur_DOW:x.recur_dow||0,Recur_DOM:x.recur_dom||1,Recur_Month:x.recur_month||1,Category:x.category||'',Priority:x.priority||2,Done:x.done?'Y':'N',Done_Date:x.done_date||'',Link_Type:x.link_type||'',Link_Ref:x.link_ref||''};});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(tdData),'Todos');sheetCount++}
// To-Do completion history
if(D.todo_log&&D.todo_log.length){
var tlData=D.todo_log.map(function(L){return{Title:L.title||'',Category:L.category||'',Priority:L.priority||2,Done_Date:L.done_date||'',Due_Date:L.due_date||'',Recurring:L.recurring?'Y':'N'};});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(tlData),'Todo_Log');sheetCount++}
// Wishlist
if(D.wishlist&&D.wishlist.length){
var wlData=D.wishlist.map(function(w){return{Item:w.item||'',Note:w.note||'',Target_Price:w.target_price||0,Target_Date:w.target_date||'',Priority:w.priority||2,Category:w.category||'',Status:w.status||'wishing',URL:w.url||'',Added_Date:w.added_date||''};});
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(wlData),'Wishlist');sheetCount++}
// Settings (single-row flags)
var setData=[{Consolidate_Card_Bills:D.consolidate_card_bills!==false?'Y':'N',Due_Soon_Days:D.due_soon_days||7,Tax_Refund_Month:D.tax_refund_month||3,Tax_Refund_Day:(D.tax_refund_day==null?15:D.tax_refund_day)}];
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(setData),'Settings');sheetCount++;
if(!sheetCount){toast('\u26a0\ufe0f No data to export');return}
XLSX.writeFile(wb,'cashflow_all_'+new Date().toISOString().slice(0,10)+'.xlsx');
toast('\ud83d\udce5 Exported all data ('+sheetCount+' sheets) to Excel');return;
}
if(!data.length){toast('\u26a0\ufe0f No data to export');return}
ws=XLSX.utils.json_to_sheet(data);
// Auto column widths
var colWidths=Object.keys(data[0]).map(function(k){
var maxLen=k.length;
data.forEach(function(r){var v=String(r[k]||'');if(v.length>maxLen)maxLen=v.length});
return{wch:Math.min(maxLen+2,40)}});
ws['!cols']=colWidths;
var wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,ws,name);
XLSX.writeFile(wb,'cashflow_'+name.toLowerCase()+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
toast('\ud83d\udce5 Exported '+data.length+' items to Excel');
}


// ===== IMPORT =====

function importTrxExcel(type,event){
var f=event.target.files[0];if(!f)return;
if(typeof XLSX==='undefined'){toast('\u26a0\ufe0f SheetJS not loaded');return}
var reader=new FileReader();
reader.onload=function(ev){
try{
var wb=XLSX.read(ev.target.result,{type:'array'});

if(type==='recurring'){
var counts={m:0,y:0};
if(wb.SheetNames.indexOf('Monthly')>=0){
var mR=XLSX.utils.sheet_to_json(wb.Sheets['Monthly']);
mR.forEach(function(r){D.monthly.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,billing_day:parseInt(r.Billing_Day)||1,card:r.Card||'Cash/Direct',status:r.Status||'Active',end_mode:r.End_Mode||'forever',end_date:r.End_Mode==='date'?parseDMY(r.End_Date||''):'',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),deadline_mode:r.Deadline_Mode||undefined,deadline_day:r.Deadline_Day||'',start_mode:r.Start_Mode||'forever',start_date:r.Start_Mode==='date'?parseDMY(r.Start_Date||''):''})});
counts.m=mR.length}
if(wb.SheetNames.indexOf('Yearly')>=0){
var yR=XLSX.utils.sheet_to_json(wb.Sheets['Yearly']);
yR.forEach(function(r){D.yearly.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,billing_day:parseInt(r.Billing_Day)||1,month:parseInt(r.Month)||1,pay_mode:r.Pay_Mode||'full',card:r.Card||'Cash/Direct',inst_periods:parseInt(r.Installment_Periods)||1,own_by:r.Own_By||'Me',status:r.Status||'Active',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),deadline_mode:r.Deadline_Mode||undefined,deadline_day:r.Deadline_Day||'',start_mode:r.Start_Mode||'forever',start_from:r.Start_Mode==='date'?parseDMY(r.Start_From||''):'',inst_hide_before:parseDMY(r.Inst_Hide_Before||'')||''})});
counts.y=yR.length}
saveD();simulate();renderAllTabs();loadForm();
toast('\ud83d\udce4 Imported: '+counts.m+' monthly + '+counts.y+' yearly');
return;
}

if(type==='all'){
// Full multi-sheet import
var counts={};

// Profile
if(wb.SheetNames.indexOf('Profile')>=0){
var pRows=XLSX.utils.sheet_to_json(wb.Sheets['Profile']);
if(pRows.length){var r=pRows[0];
D.profile.name=r.Name||'';D.profile.dob=parseDMY(r.DOB||'')||D.profile.dob||'';D.profile.starting_cash=parseFloat(r.Starting_Cash)||0;
D.profile.payout_day=r.Payout_Day==='last'?'last':parseInt(r.Payout_Day)||25;
D.profile.weekend_rule=r.Weekend_Rule||'before';
D.profile.daily_living=parseFloat(r.Daily_Living)||0;D.profile.cat_expense=parseFloat(r.Cat_Expense)||0;
D.profile.cat_names=r.Cat_Names||'';
D.profile.start_date=parseDMY(r.Start_Date||'')||D.profile.start_date;
D.profile.end_date=parseDMY(r.End_Date||'')||D.profile.end_date;
D.tax_year=parseInt(r.Tax_Year)||D.tax_year;D.tax_refund_month=parseInt(r.Tax_Refund_Month)||3;
if(r.Tax_Actual_Override!==''&&r.Tax_Actual_Override!==undefined)D.tax_actual_override=parseFloat(r.Tax_Actual_Override);else D.tax_actual_override=null;
counts.profile=1}}

// Owners
if(wb.SheetNames.indexOf('Owners')>=0){
var oRows=XLSX.utils.sheet_to_json(wb.Sheets['Owners']);
if(oRows.length){D.owners=oRows.map(function(r){return r.Owner||'Me'});if(D.owners.indexOf('Me')<0)D.owners.unshift('Me');counts.owners=oRows.length}}

// Types
if(wb.SheetNames.indexOf('Types')>=0){
var tRows=XLSX.utils.sheet_to_json(wb.Sheets['Types']);
if(tRows.length){D.types=tRows.map(function(r){return r.Type||'Other'});counts.types=tRows.length}}

// Asset Types
if(wb.SheetNames.indexOf('Asset_Types')>=0){
var atRows=XLSX.utils.sheet_to_json(wb.Sheets['Asset_Types']);
if(atRows.length){D.asset_types=atRows.map(function(r){return r.Asset_Type||'Other'});counts.asset_types=atRows.length}}
// Banks
if(wb.SheetNames.indexOf('Banks')>=0){
var bkRows=XLSX.utils.sheet_to_json(wb.Sheets['Banks']);
if(bkRows.length){D.banks=bkRows.map(function(r){return r.Bank||'';}).filter(function(b){return b;});counts.banks=bkRows.length}}

// Cards
if(wb.SheetNames.indexOf('Cards')>=0){
var cRows=XLSX.utils.sheet_to_json(wb.Sheets['Cards']);
D.cards=cRows.map(function(r){var pl=[];try{pl=r.Points_Log?JSON.parse(r.Points_Log):[]}catch(e){pl=[]}return{name:r.Name||'',statement_day:parseInt(r.Statement_Day)||1,payment_day:parseInt(r.Payment_Day)||1,deadline:parseInt(r.Deadline)||parseInt(r.Payment_Day)||1,statement_start:r.Statement_Start||'',bank:r.Bank||'',last4:r.Last4!==undefined?String(r.Last4):'',expiry:r.Expiry||'',credit_limit:parseFloat(r.Credit_Limit)||0,current_balance:parseFloat(r.Current_Balance)||0,benefits:r.Benefits||'',fee_waiver:r.Fee_Waiver||'',fee_waiver_target:parseFloat(r.Fee_Waiver_Target)||0,fee_waiver_mode:r.Fee_Waiver_Mode||'amount',fee_waiver_manual:parseFloat(r.Fee_Waiver_Manual)||0,fee_waiver_target_count:parseFloat(r.Fee_Waiver_Target_Count)||0,fee_waiver_manual_count:parseFloat(r.Fee_Waiver_Manual_Count)||0,remarks:r.Remarks||'',limit_group:r.Limit_Group||'',url:r.URL||'',points_log:pl}});
counts.cards=cRows.length}

// Payroll
if(wb.SheetNames.indexOf('Payroll')>=0){
var pyRows=XLSX.utils.sheet_to_json(wb.Sheets['Payroll']);
D.payroll=pyRows.map(function(r){return{name:r.Name||'',type:r.Type||'income',amount:parseFloat(r.Amount)||0,freq:r.Freq||'every_month',month:r.Month?parseInt(r.Month):null,notes:r.Notes||'',affects_epf:r.Affects_EPF==='Y',affects_sso:r.Affects_SSO==='Y',affects_tax:r.Affects_Tax==='Y',calc_mode:r.Calc_Mode||'fixed',epf_pct:parseFloat(r.EPF_Pct)||0,sso_pct:parseFloat(r.SSO_Pct)||0,sso_cap:parseFloat(r.SSO_Cap)||0}});
counts.payroll=pyRows.length}

// Monthly
if(wb.SheetNames.indexOf('Monthly')>=0){
var mRows=XLSX.utils.sheet_to_json(wb.Sheets['Monthly']);
mRows.forEach(function(r){D.monthly.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,billing_day:parseInt(r.Billing_Day)||1,card:r.Card||'Cash/Direct',status:r.Status||'Active',end_mode:r.End_Mode||'forever',end_date:r.End_Mode==='date'?parseDMY(r.End_Date||''):'',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),deadline_mode:r.Deadline_Mode||undefined,deadline_day:r.Deadline_Day||'',start_mode:r.Start_Mode||'forever',start_date:r.Start_Mode==='date'?parseDMY(r.Start_Date||''):''})});
counts.monthly=mRows.length}

// Yearly
if(wb.SheetNames.indexOf('Yearly')>=0){
var yRows=XLSX.utils.sheet_to_json(wb.Sheets['Yearly']);
yRows.forEach(function(r){D.yearly.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,billing_day:parseInt(r.Billing_Day)||1,month:parseInt(r.Month)||1,pay_mode:r.Pay_Mode||'full',card:r.Card||'Cash/Direct',inst_periods:parseInt(r.Installment_Periods)||1,own_by:r.Own_By||'Me',status:r.Status||'Active',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),deadline_mode:r.Deadline_Mode||undefined,deadline_day:r.Deadline_Day||'',start_mode:r.Start_Mode||'forever',start_from:r.Start_Mode==='date'?parseDMY(r.Start_From||''):'',inst_hide_before:parseDMY(r.Inst_Hide_Before||'')||''})});
counts.yearly=yRows.length}

// Installments
if(wb.SheetNames.indexOf('Installments')>=0){
var iRows=XLSX.utils.sheet_to_json(wb.Sheets['Installments']);
iRows.forEach(function(r){D.installments.push({name:r.Name||'',type:r.Type||'Other',card:r.Card||'',own_by:r.Own_By||'Me',total:parseFloat(r.Total)||0,per_period:parseFloat(r.Per_Period)||0,periods:parseInt(r.Periods)||1,start_year:parseInt(r.Start_Year)||new Date().getFullYear(),start_month:parseInt(r.Start_Month)||1,start_day:parseInt(r.Start_Day)||1,billing_day:parseInt(r.Billing_Day||r.Start_Day)||1,status:r.Status||'Active',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),hide_before:parseDMY(r.Hide_Before||'')||'',source:r.Source||'Manual'})});
counts.installments=iRows.length}

// Planned
if(wb.SheetNames.indexOf('Planned')>=0){
var pRows=XLSX.utils.sheet_to_json(wb.Sheets['Planned']);
pRows.forEach(function(r){D.planned.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,date:parseDMY(r.Date||'')||r.Date||'',card:r.Card||'Cash/Direct',own_by:r.Own_By||'Me',notes:r.Notes||'',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y')})});
counts.planned=pRows.length}

// Tax Exemptions
if(wb.SheetNames.indexOf('Tax_Exemptions')>=0){
var txRows=XLSX.utils.sheet_to_json(wb.Sheets['Tax_Exemptions']);
D.tax_exemptions=txRows.map(function(r){var e={id:r.ID||'',amount:parseFloat(r.Amount)||0};if(r.Override!==''&&r.Override!==undefined)e.override=parseFloat(r.Override);if(r.Units)e.units=parseInt(r.Units);return e});
counts.tax_exemptions=txRows.length}

// Tax Insurance Selections
if(wb.SheetNames.indexOf('Tax_Ins_Selections')>=0){
var insRows=XLSX.utils.sheet_to_json(wb.Sheets['Tax_Ins_Selections']);
D.tax_ins_selections={};
insRows.forEach(function(r){if(r.Selection_Key)D.tax_ins_selections[r.Selection_Key]=true});
counts.tax_ins=insRows.length}

// Payroll Overrides
if(wb.SheetNames.indexOf('Payroll_Overrides')>=0){
var ovRows=XLSX.utils.sheet_to_json(wb.Sheets['Payroll_Overrides']);
D.payroll_overrides={};
ovRows.forEach(function(r){if(r.Month_Key&&r.Override_JSON){try{D.payroll_overrides[r.Month_Key]=JSON.parse(r.Override_JSON)}catch(e){}}});
counts.payroll_overrides=ovRows.length}

// Retirement Config
if(wb.SheetNames.indexOf('Retirement')>=0){
var retRows=XLSX.utils.sheet_to_json(wb.Sheets['Retirement']);
if(retRows.length){var r=retRows[0];
D.retirement.enabled=r.Enabled==='Y';D.retirement.scenario=r.Scenario||'layoff';
D.retirement.separation_date=parseDMY(r.Separation_Date||'')||'';D.retirement.hire_date=parseDMY(r.Hire_Date||'')||'';
D.retirement.years_of_service=parseFloat(r.Years_of_Service)||0;D.retirement.last_salary=parseFloat(r.Last_Salary)||0;
D.retirement.age_at_separation=parseFloat(r.Age_at_Separation)||0;D.retirement.dob=parseDMY(r.DOB||'')||'';
D.retirement.epf_balance=parseFloat(r.EPF_Balance)||0;D.retirement.epf_action=r.EPF_Action||'cashout';
D.retirement.epf_cashout_date=parseDMY(r.EPF_Cashout_Date||'')||'';D.retirement.epf_vesting_pct=parseFloat(r.EPF_Vesting_Pct)||100;
D.retirement.sso_accumulated=parseFloat(r.SSO_Accumulated)||0;
D.retirement.leave_cash_enabled=r.Leave_Cash_Enabled==='Y';
D.retirement.leave_balance_days=parseFloat(r.Leave_Balance_Days)||0;
D.retirement.include_severance=r.Include_Severance!=='N';
D.retirement.include_special=r.Include_Special!=='N';
D.retirement.include_notice=r.Include_Notice!=='N';
D.retirement.include_sso=r.Include_SSO!=='N';
D.retirement.include_epf=r.Include_EPF!=='N';
D.retirement.include_company_special=r.Include_Company_Special!=='N';D.retirement.include_sso_pension=r.Include_SSO_Pension!=='N';D.retirement.sso_contribution_months=parseInt(r.SSO_Contribution_Months)||0;D.retirement.sso_start_date=parseDMY(r.SSO_Start_Date||'')||'';D.retirement.sso_avg_salary=parseFloat(r.SSO_Avg_Salary)||0;
counts.retirement=1}}

// EPF Vesting Schedule
if(wb.SheetNames.indexOf('EPF_Vesting')>=0){
var vsRows=XLSX.utils.sheet_to_json(wb.Sheets['EPF_Vesting']);
D.retirement.epf_vesting_schedule=vsRows.map(function(r){return{min_years:parseInt(r.Min_Years)||0,max_years:parseInt(r.Max_Years)||99,pct:parseInt(r.Pct)||0}});
counts.epf_vesting=vsRows.length}

// Company Special Pay
if(wb.SheetNames.indexOf('Company_Special_Pay')>=0){
var cspRows=XLSX.utils.sheet_to_json(wb.Sheets['Company_Special_Pay']);
D.retirement.company_special_pay=cspRows.map(function(r){return{name:r.Name||'',amount:parseFloat(r.Amount)||0,note:r.Note||''}});
counts.company_special=cspRows.length}

// Retirement Assets
if(wb.SheetNames.indexOf('Assets')>=0){
var raRows=XLSX.utils.sheet_to_json(wb.Sheets['Assets']);
D.retirement.assets=raRows.map(function(r){return{name:r.Name||'',type:r.Type||'Savings',currency:r.Currency||'THB',value:parseFloat(r.Value)||0,fx_rate:parseFloat(r.FX_Rate)||0,cashout_date:parseDMY(r.Cashout_Date||'')||'',notes:r.Notes||''}});
counts.assets=raRows.length}

// Bill Payments (paid ledger)
if(wb.SheetNames.indexOf('Bill_Payments')>=0){
var bpRows=XLSX.utils.sheet_to_json(wb.Sheets['Bill_Payments']);
D.bill_payments={};
bpRows.forEach(function(r){if(r.Key)D.bill_payments[r.Key]={paid:r.Paid!=='N',paid_date:parseDMY(r.Paid_Date||'')||'',paid_amount:parseFloat(r.Paid_Amount)||0}});
counts.bill_payments=bpRows.length}
// Card statement extra spend (auto + extra = total). Legacy 'Card_Overrides' sheets are ignored on import.
if(wb.SheetNames.indexOf('Card_Extra')>=0){
var ceRows=XLSX.utils.sheet_to_json(wb.Sheets['Card_Extra']);
D.cardbill_extra={};
ceRows.forEach(function(r){if(r.Key!==undefined&&r.Extra!==undefined&&r.Extra!==''&&parseFloat(r.Extra)!==0)D.cardbill_extra[r.Key]=parseFloat(r.Extra)});
D._cbExtraMigrated=true;
counts.card_extra=ceRows.length}
// Settings
if(wb.SheetNames.indexOf('Settings')>=0){
var setRows=XLSX.utils.sheet_to_json(wb.Sheets['Settings']);
if(setRows.length){D.consolidate_card_bills=setRows[0].Consolidate_Card_Bills!=='N';if(parseInt(setRows[0].Due_Soon_Days)>0)D.due_soon_days=parseInt(setRows[0].Due_Soon_Days);if(parseInt(setRows[0].Tax_Refund_Month)>0)D.tax_refund_month=parseInt(setRows[0].Tax_Refund_Month);var _trd=setRows[0].Tax_Refund_Day;if(_trd!==undefined&&_trd!==''){D.tax_refund_day=(String(_trd).toLowerCase()==='last')?'last':(parseInt(_trd)||15);}counts.settings=1}}
// To-Dos
if(wb.SheetNames.indexOf('Todos')>=0){var tdRows=XLSX.utils.sheet_to_json(wb.Sheets['Todos']);
D.todos=tdRows.map(function(r){return{id:('t'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)),title:r.Title||'',note:r.Note||'',deadline_mode:r.Deadline_Mode||'none',due_date:r.Due_Date||'',due_time:r.Due_Time||'',recur:r.Recur||'none',recur_every:parseInt(r.Recur_Every)||1,recur_dow:parseInt(r.Recur_DOW)||0,recur_dom:parseInt(r.Recur_DOM)||1,recur_month:parseInt(r.Recur_Month)||1,category:r.Category||'',priority:parseInt(r.Priority)||2,done:(r.Done==='Y'||r.Done===true),done_date:r.Done_Date||'',link_type:r.Link_Type||'',link_ref:r.Link_Ref||''};});counts.todos=D.todos.length}
// To-Do completion history
if(wb.SheetNames.indexOf('Todo_Log')>=0){var tlRows=XLSX.utils.sheet_to_json(wb.Sheets['Todo_Log']);
D.todo_log=tlRows.map(function(r){return{id:('t'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)),todo_id:'',title:r.Title||'',category:r.Category||'',priority:parseInt(r.Priority)||2,done_date:r.Done_Date||'',due_date:r.Due_Date||'',recurring:(r.Recurring==='Y'||r.Recurring===true)};});counts.todo_log=D.todo_log.length}
// Wishlist
if(wb.SheetNames.indexOf('Wishlist')>=0){var wlRows=XLSX.utils.sheet_to_json(wb.Sheets['Wishlist']);
D.wishlist=wlRows.map(function(r){return{id:('w'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)),item:r.Item||'',note:r.Note||'',target_price:parseFloat(r.Target_Price)||0,target_date:r.Target_Date||'',priority:parseInt(r.Priority)||2,category:r.Category||'',status:r.Status||'wishing',url:r.URL||'',added_date:r.Added_Date||''};});counts.wishlist=D.wishlist.length}
saveD();simulate();renderAllTabs();loadForm();
var parts=[];Object.keys(counts).forEach(function(k){parts.push(counts[k]+' '+k)});
toast('\ud83d\udce4 Imported: '+parts.join(', '));
}else{
var sheetName=wb.SheetNames[0];
var rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
if(!rows.length){toast('\u26a0\ufe0f No data found in file');return}
var count=0;
if(type==='monthly'){
rows.forEach(function(r){D.monthly.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,billing_day:parseInt(r.Billing_Day)||1,card:r.Card||'Cash/Direct',status:r.Status||'Active',end_mode:r.End_Mode||'forever',end_date:r.End_Mode==='date'?parseDMY(r.End_Date||''):'',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),deadline_mode:r.Deadline_Mode||undefined,deadline_day:r.Deadline_Day||'',start_mode:r.Start_Mode||'forever',start_date:r.Start_Mode==='date'?parseDMY(r.Start_Date||''):''});count++})}
else if(type==='yearly'){
rows.forEach(function(r){D.yearly.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,billing_day:parseInt(r.Billing_Day)||1,month:parseInt(r.Month)||1,pay_mode:r.Pay_Mode||'full',card:r.Card||'Cash/Direct',inst_periods:parseInt(r.Installment_Periods)||1,own_by:r.Own_By||'Me',status:r.Status||'Active',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),deadline_mode:r.Deadline_Mode||undefined,deadline_day:r.Deadline_Day||'',start_mode:r.Start_Mode||'forever',start_from:r.Start_Mode==='date'?parseDMY(r.Start_From||''):'',inst_hide_before:parseDMY(r.Inst_Hide_Before||'')||''});count++})}
else if(type==='installments'){
rows.forEach(function(r){D.installments.push({name:r.Name||'',type:r.Type||'Other',card:r.Card||'',own_by:r.Own_By||'Me',total:parseFloat(r.Total)||0,per_period:parseFloat(r.Per_Period)||0,periods:parseInt(r.Periods)||1,start_year:parseInt(r.Start_Year)||new Date().getFullYear(),start_month:parseInt(r.Start_Month)||1,start_day:parseInt(r.Start_Day)||1,billing_day:parseInt(r.Billing_Day||r.Start_Day)||1,status:r.Status||'Active',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y'),hide_before:parseDMY(r.Hide_Before||'')||'',source:r.Source||'Manual'});count++})}
else if(type==='planned'){
rows.forEach(function(r){D.planned.push({name:r.Name||'',direction:r.Direction||'expense',type:r.Type||'Other',amount:parseFloat(r.Amount)||0,date:parseDMY(r.Date||'')||r.Date||'',card:r.Card||'Cash/Direct',own_by:r.Own_By||'Me',notes:r.Notes||'',auto_pay:r.Auto_Pay===undefined?undefined:(r.Auto_Pay==='Y')});count++})}
else if(type==='assets'){
if(!D.retirement)D.retirement={};if(!Array.isArray(D.retirement.assets))D.retirement.assets=[];
rows.forEach(function(r){D.retirement.assets.push({name:r.Name||'',type:r.Type||'Savings',currency:r.Currency||'THB',value:parseFloat(r.Value)||0,fx_rate:parseFloat(r.FX_Rate)||0,cashout_date:parseDMY(r.Cashout_Date||'')||'',notes:r.Notes||''});count++})}
else if(type==='todos'){
if(!Array.isArray(D.todos))D.todos=[];
rows.forEach(function(r){D.todos.push({id:('t'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)),title:r.Title||'',note:r.Note||'',deadline_mode:r.Deadline_Mode||'none',due_date:parseDMY(r.Due_Date||'')||'',due_time:r.Due_Time||'',recur:r.Recur||'none',recur_every:parseInt(r.Recur_Every)||1,recur_dow:parseInt(r.Recur_DOW)||0,recur_dom:parseInt(r.Recur_DOM)||1,recur_month:parseInt(r.Recur_Month)||1,category:r.Category||'',priority:parseInt(r.Priority)||2,done:(r.Done==='Y'||r.Done===true),done_date:parseDMY(r.Done_Date||'')||'',link_type:r.Link_Type||'',link_ref:r.Link_Ref||''});count++})}
else if(type==='wishlist'){
if(!Array.isArray(D.wishlist))D.wishlist=[];
rows.forEach(function(r){D.wishlist.push({id:('w'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)),item:r.Item||'',note:r.Note||'',target_price:parseFloat(r.Target_Price)||0,target_date:parseDMY(r.Target_Date||'')||'',priority:parseInt(r.Priority)||2,category:r.Category||'',status:r.Status||'wishing',url:r.URL||'',added_date:parseDMY(r.Added_Date||'')||''});count++})}
saveD();simulate();renderAllTabs();loadForm();
toast('\ud83d\udce4 Imported '+count+' items from Excel');
}
}catch(err){toast('\u274c Import error: '+err.message);console.error(err)}};
reader.readAsArrayBuffer(f);
event.target.value='';
}
