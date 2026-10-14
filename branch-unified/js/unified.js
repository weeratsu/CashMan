/* ============================================================================
 * CashMan Unified Bill System — Step 1 core (schema + migration + generator)
 * Per CashMan_Bills_Requirements.md §13 (v1.8). Standalone, framework-free.
 * Exposes: window.migrateToUnified(D), window.generateOccurrences(bills,cards,from,to)
 * Pure logic — no DOM, no localStorage. Node-testable.
 * ==========================================================================*/
(function(glob){
'use strict';

// ---- small date helpers (match current app's dim/clamp behaviour) ----
function dim(y,m0){ return new Date(y, m0+1, 0).getDate(); }            // days in month (m0: 0-based)
function clampDay(y,m0,d){ return Math.min(d, dim(y,m0)); }
function ymStr(y,m0){ return y+'-'+((m0+1)<10?'0':'')+(m0+1); }         // m0 0-based -> "YYYY-MM"
function parseYM(s){ var p=String(s||'').split('-'); return {y:parseInt(p[0],10), m0:(parseInt(p[1],10)||1)-1}; }
function addMonths(y,m0,n){ var t=m0+n, ny=y+Math.floor(t/12), nm=((t%12)+12)%12; return {y:ny,m0:nm}; }
function mkDate(y,m0,d){ return new Date(y,m0,clampDay(y,m0,d)); }
function uuid(){ return 'b_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); }

// ---- §2 period rule: card statement period from a charge date + card.statement_day ----
// base = real charge date (Date). S = statement_day. Returns "YYYY-MM" or null if no S.
function periodFromDate(baseDate, S, billing_mode, period_rule){
  if(!S && S!==0) return null;
  S=parseInt(S,10)||1;
  var pd=baseDate.getDate(), cm=baseDate.getMonth(), cy=baseDate.getFullYear();
  var M = cm + (pd>S?1:0);
  // v319 (user-locked Oct 13 2026): period relative to the statement month is a per-card SETTING
  // (period_rule), NOT a computed heuristic. 'prev' = period is the month BEFORE the statement month;
  // 'same' = period is the statement's own month. Fall back to the legacy S<=15 heuristic only when
  // the card has no period_rule set (back-compat). This is what finally stops the recurring
  // off-by-one-month period bugs: the rule is stored, never re-derived.
  var per;
  if(period_rule==='prev') per = M-1;
  else if(period_rule==='same') per = M;
  else per = (S<=15)?(M-1):M; // legacy fallback
  // advance (pay-before-use, e.g. Netflix/iCloud) shifts the period ONE month forward vs arrears.
  if(billing_mode==='advance') per += 1;
  var y=cy; while(per<0){per+=12;y--;} while(per>11){per-=12;y++;}
  return ymStr(y,per);
}
// service period = period rule using the charge's OWN cycle. Convention (matches app):
// service period is computed with the same rule but treating the charge's billing_day as its
// own close day — i.e. the month the charge falls in IS its service period (no card shift).
// Per §2.0 the service period is "the trx's own billing cycle" = the calendar month of billing_day.
function servicePeriodFromDate(baseDate){ return ymStr(baseDate.getFullYear(), baseDate.getMonth()); }

function cardByName(cards,name){ return (cards||[]).find(function(c){return c.name===name;})||null; }

/* ============================================================================
 * MIGRATION  (D.monthly/yearly/installments/planned  ->  D.bills[])
 * Idempotent; guard D.bills_schema>=4. Keeps a legacy-key map for payment re-point.
 * ==========================================================================*/
function migrateToUnified(D, opts){
  opts=opts||{};
  if((D.bills_schema||0)>=4 && !opts.force){ return {skipped:true, reason:'already schema>=4'}; }

  // deep backup of the 5 old stores (once)
  if(!D._pre_unified_backup){
    D._pre_unified_backup = JSON.parse(JSON.stringify({
      monthly:D.monthly||[], yearly:D.yearly||[], installments:D.installments||[], planned:D.planned||[]
    }));
  }

  var bills=[];
  var legacy={}; // legacyKey -> new bill id (for re-pointing payment ledger)
  function emit(row, legacyKey){
    if(!row.id) row.id=uuid();
    if(legacyKey) legacy[legacyKey]=row.id;
    bills.push(row);
    return row;
  }
  function baseRow(o){
    return {
      id:null, name:o.name||'', amount:0, type:o.type||'Other',
      recurrence:'once', mode:'full', settle:(o.auto_pay?'auto':'manual'),
      pay_with:(o.card && o.card!=='Cash/Direct')?('card:'+o.card):'cash',
      billing_day:parseInt(o.billing_day,10)||1, start_ym:null, periods:null, end_ym:null, month:null, start_cutoff:null,
      direction:o.direction||'expense',
      billing_mode:(o.billing_mode==='advance'?'advance':'arrears'),
      // v322 (user-locked Oct 13 2026): per-bill period rule, same meaning as cards —
      // 'same' = period is the charge/billing month itself (Water: bill 20/10 = usage Oct);
      // 'prev' = period is the month BEFORE the charge month (Electricity: bill 02/10 = usage Sep).
      // null -> legacy behavior (service period = calendar month of charge).
      period_rule:((o.period_rule==='prev'||o.period_rule==='same')?o.period_rule:null),
      source:'manual', source_ref:null,
      active:(function(_st){ if(!_st) return true; _st=String(_st); return (_st==='Active'||_st==='Planned'||_st==='Finished'); })(o.status), created_at:new Date().toISOString(), notes:o.notes||'',
      _legacy:null
    };
  }

  // ---- monthly -> recurrence monthly, mode full ----
  (D.monthly||[]).forEach(function(m,idx){
    var r=baseRow(m);
    r.amount=parseFloat(m.amount)||0;
    r.recurrence='monthly'; r.mode='full';
    var sm=(m.start_mode==='date'&&m.start_date)?parseYM(m.start_date):null;
    r.start_ym = sm?ymStr(sm.y,sm.m0):null;
    // start_cutoff: a hard floor — the generator drops any occurrence whose charge date is before
    // this ISO date (used by the global 'Set start date for all bills' control). For monthly it's start_date.
    if(m.start_mode==='date'&&m.start_date) r.start_cutoff=m.start_date;
    r.end_ym = (m.end_mode==='date'&&m.end_date)?ymStr(parseYM(m.end_date).y,parseYM(m.end_date).m0):null;
    r._legacy='M#'+idx+'|'+(m.name||'');
    // utility provenance
    if(m.util_link){ r.source='utility'; r.source_ref=m.util_link; }
    emit(r, r._legacy);
  });

  // ---- yearly -> recurrence yearly; full or installment ----
  (D.yearly||[]).forEach(function(y,idx){
    var r=baseRow(y);
    r.recurrence='yearly';
    r.month=parseInt(y.month,10)||1;
    if(y.pay_mode==='installment'){
      r.mode='installment';
      r.periods=parseInt(y.inst_periods,10)||1;
      r.amount=parseFloat(y.amount)||0; // per-period amount (yearly installment stores per-period in amount)
    } else {
      r.mode='full';
      r.amount=parseFloat(y.amount)||0;
    }
    // start anchor: start_from (date) else year+month
    if(y.start_from){ var s=parseYM(y.start_from); r.start_ym=ymStr(s.y,s.m0); }
    else if(y.year){ r.start_ym=ymStr(parseInt(y.year,10),(parseInt(y.month,10)||1)-1); }
    // start_cutoff: yearly 'From' date clamps full-mode; inst_hide_before clamps installment-mode.
    if(y.start_mode==='date'&&y.start_from) r.start_cutoff=y.start_from;
    if(y.pay_mode==='installment'&&y.inst_hide_before) r.start_cutoff=y.inst_hide_before;
    r._legacy='Y#'+idx+'|'+(y.name||'');
    emit(r, r._legacy);
  });

  // ---- installments -> recurrence once, mode installment ----
  (D.installments||[]).forEach(function(it,idx){
    var r=baseRow(it);
    r.recurrence='once'; r.mode='installment';
    r.periods=parseInt(it.periods,10)||1;
    r.amount=parseFloat(it.per_period)|| (parseFloat(it.total)/(parseInt(it.periods,10)||1)) ||0;
    r.billing_day=parseInt(it.billing_day,10)||parseInt(it.start_day,10)||1;
    r.start_ym=ymStr(parseInt(it.start_year,10), (parseInt(it.start_month,10)||1)-1);
    if(it.hide_before) r.start_cutoff=it.hide_before; // installment Hide Before = occurrence floor
    r._legacy='I#'+idx+'|'+(it.name||'');
    emit(r, r._legacy);
  });

  // ---- planned -> recurrence once, mode full (incl _fromCard / _fromUtility) ----
  (D.planned||[]).forEach(function(p,idx){
    var r=baseRow(p);
    r.recurrence='once'; r.mode='full';
    r.amount=parseFloat(p.amount)||0;
    r.direction=p.direction||'expense';
    var pm=parseYM(p.date); r.start_ym=ymStr(pm.y,pm.m0);
    r.billing_day=parseYM(p.date)?parseInt((p.date||'').split('-')[2],10)||1:1;
    if(p._fromCard){ r.source='pdf'; r.source_ref=(p._cardName||p.card||'')+'|'+(p._cardPeriod||''); r.settle='auto'; r._cardPeriod=p._cardPeriod||''; }
    else if(p._fromUtility){ r.source='utility'; r.source_ref=(p._utilUtility||'')+'|'+(p._utilPeriod||''); }
    r._legacy='P#'+idx+'|'+(p.name||'')+'|'+(p.date||'');
    emit(r, r._legacy);
  });

  var out={ bills:bills, legacy:legacy, counts:{
    monthly:(D.monthly||[]).length, yearly:(D.yearly||[]).length,
    installments:(D.installments||[]).length, planned:(D.planned||[]).length, total:bills.length
  }};
  if(opts.apply){
    D.bills=bills; D._bills_legacy_map=legacy; D.bills_schema=4;
  }
  return out;
}

/* ============================================================================
 * GENERATOR  (D.bills[] -> dated occurrences for [from,to])
 * ==========================================================================*/
function generateOccurrences(bills, cards, fromDate, toDate){
  var occ=[];
  function within(d){ return d>=fromDate && d<=toDate; }

  // card_period for an arbitrary charge date on a given pay_with card (same math pushOcc uses).
  function _cardPeriodFor(bill, chargeDate){
    var card = (bill.pay_with && bill.pay_with.indexOf('card:')===0) ? bill.pay_with.slice(5) : null;
    if(bill.source==='pdf' && bill._cardPeriod && /^\d{4}-\d{2}$/.test(bill._cardPeriod)) return bill._cardPeriod;
    if(!card) return null;
    var cObj=cardByName(cards,card); var S=cObj?cObj.statement_day:null;
    return (S!=null)?periodFromDate(chargeDate,S,bill.billing_mode,(cObj&&cObj.period_rule)):null;
  }
  // DUPLICATE RULE (user-locked 12 Oct, compared by PERIOD not seq): a Manual installment
  // (recurrence 'once', mode 'installment' — the purchase actually being paid off) OWNS its
  // (name, card, card_period) buckets. A yearly-installment FORECAST (recurrence 'yearly',
  // mode 'installment' — the recurring projection) must NOT emit an occurrence for a
  // (name, card, card_period) the Manual one already covers. Overlap is per-period: if Manual
  // covers periods 8/9/10 and the forecast would emit 7/8/9, only 8 and 9 are skipped (7 stays).
  var _manualInstPeriods={}; // "name|card|period" -> true
  (bills||[]).forEach(function(bill){
    if(bill.active===false) return;
    if(bill.recurrence!=='once' || bill.mode!=='installment') return;
    var sd = bill.start_ym?parseYM(bill.start_ym):null; if(!sd) return;
    var card = (bill.pay_with && bill.pay_with.indexOf('card:')===0) ? bill.pay_with.slice(5) : 'cash';
    var n=parseInt(bill.periods,10)||1;
    for(var k=1;k<=n;k++){
      var mm=addMonths(sd.y,sd.m0,k-1);
      var dk=mkDate(mm.y,mm.m0,bill.billing_day);
      // honor the same start_cutoff so a cut Manual period doesn't claim ownership it won't render
      if(bill.start_cutoff){ var _co=new Date(String(bill.start_cutoff)+'T00:00:00'); if(!isNaN(_co.getTime())&&dk<_co) continue; }
      var per=_cardPeriodFor(bill,dk);
      if(per) _manualInstPeriods[bill.name+'|'+card+'|'+per]=true;
    }
  });

  function pushOcc(bill, chargeDate, seq, k){
    // start_cutoff: hard floor. Drop any occurrence whose REAL charge date is before the cutoff
    // (set by the global 'Set start date for all bills' control -> start_date/start_from/hide_before).
    // Compared on the charge's own date (chargeDate = orig_due), NOT the shifted statement/pay date.
    if(bill.start_cutoff){
      var _co=new Date(String(bill.start_cutoff)+'T00:00:00');
      if(!isNaN(_co.getTime()) && chargeDate < _co) return;
    }
    var card = (bill.pay_with && bill.pay_with.indexOf('card:')===0) ? bill.pay_with.slice(5) : null;
    var cObj = card?cardByName(cards,card):null;
    var S = cObj?cObj.statement_day:null;
    // v322: usage period follows the bill's period_rule. 'prev' shifts usage one month BEFORE the
    // charge month (arrears, e.g. electricity); 'same'/null keeps the charge month (water).
    var service_period = (function(){
      // v322b: an ACTUAL utility bill carries its authoritative usage period in source_ref
      // ("util|period", e.g. "electric|2026-10"). Use it verbatim — the charge DATE is the
      // landing/pay date, which for arrears utilities (electricity) is the month AFTER usage.
      if(bill.source==='utility'){ var _sr=String(bill.source_ref||''); var _pi=_sr.indexOf('|'); if(_pi>0){ var _p=_sr.slice(_pi+1); if(/^\d{4}-\d{2}$/.test(_p)) return _p; } }
      if(bill.period_rule==='prev'){ var _m=chargeDate.getMonth()-1,_y=chargeDate.getFullYear(); if(_m<0){_m+=12;_y--;} return ymStr(_y,_m); }
      return servicePeriodFromDate(chargeDate);
    })();
    var card_period = (card && S!=null) ? periodFromDate(chargeDate, S, bill.billing_mode, (cObj&&cObj.period_rule)) : null;
    // _fromCard PDF rows carry an authoritative period in source_ref ("card|period")
    if(bill.source==='pdf' && bill._cardPeriod && /^\d{4}-\d{2}$/.test(bill._cardPeriod)){
      card_period = bill._cardPeriod;
    }
    occ.push({
      bill_id:bill.id, name:bill.name, amount:bill.amount, type:bill.type,
      recurrence:bill.recurrence, mode:bill.mode, settle:bill.settle,
      pay_with:bill.pay_with, card:card||'cash',
      direction:bill.direction||'expense',
      orig_due:chargeDate,                       // immutable real charge date
      service_period:service_period,
      card_period:card_period,                   // THE grouping key for card statements
      group_period: card_period || service_period,
      seq:seq||null, k:k||null,
      source:bill.source, source_ref:bill.source_ref
    });
  }

  (bills||[]).forEach(function(bill){
    if(bill.active===false) return;
    var sd = bill.start_ym?parseYM(bill.start_ym):null;

    if(bill.recurrence==='once'){
      if(bill.mode==='full'){
        if(!sd) return;
        var d=mkDate(sd.y,sd.m0,bill.billing_day);
        if(within(d)) pushOcc(bill,d,null,1);
      } else { // installment
        var n=parseInt(bill.periods,10)||1;
        for(var k=1;k<=n;k++){
          var mm=addMonths(sd.y,sd.m0,k-1);
          var dk=mkDate(mm.y,mm.m0,bill.billing_day);
          if(within(dk)) pushOcc(bill,dk,k+'of'+n,k);
        }
      }
    } else if(bill.recurrence==='monthly'){
      if(!sd) return;
      var endd = bill.end_ym?parseYM(bill.end_ym):null;
      // iterate month by month across window (bounded by start/end)
      var cur={y:fromDate.getFullYear(), m0:fromDate.getMonth()};
      // step back one to be safe then walk forward until past toDate
      var guard=0;
      var walk={y:sd.y,m0:sd.m0};
      // fast-forward walk to near fromDate
      while((walk.y*12+walk.m0) < (fromDate.getFullYear()*12+fromDate.getMonth()) && guard++<1000){
        walk=addMonths(walk.y,walk.m0,1);
      }
      guard=0;
      while((walk.y*12+walk.m0) <= (toDate.getFullYear()*12+toDate.getMonth()) && guard++<1000){
        if(!(sd && (walk.y*12+walk.m0) < (sd.y*12+sd.m0))){
          if(!(endd && (walk.y*12+walk.m0) > (endd.y*12+endd.m0))){
            var dM=mkDate(walk.y,walk.m0,bill.billing_day);
            if(within(dM)) pushOcc(bill,dM,null,null);
          }
        }
        walk=addMonths(walk.y,walk.m0,1);
      }
    } else if(bill.recurrence==='yearly'){
      var mon=(parseInt(bill.month,10)||1)-1;
      if(bill.mode==='full'){
        // one per year in `month`, from start year through window
        var y0 = sd?sd.y:fromDate.getFullYear();
        for(var yy=y0; yy<=toDate.getFullYear()+1; yy++){
          var dY=mkDate(yy,mon,bill.billing_day);
          if(within(dY)) pushOcc(bill,dY,null,1);
        }
      } else { // yearly installment: N consecutive periods anchored at (start year, month)
        var n2=parseInt(bill.periods,10)||1;
        var ay = sd?sd.y:fromDate.getFullYear();
        var _ycard=(bill.pay_with && bill.pay_with.indexOf('card:')===0)?bill.pay_with.slice(5):'cash';
        for(var k2=1;k2<=n2;k2++){
          var mm2=addMonths(ay,mon,k2-1);
          var d2=mkDate(mm2.y,mm2.m0,bill.billing_day);
          // skip forecast period already OWNED by a Manual installment of the same name+card (period-overlap)
          var _yper=_cardPeriodFor(bill,d2);
          if(_yper && _manualInstPeriods[bill.name+'|'+_ycard+'|'+_yper]) continue;
          if(within(d2)) pushOcc(bill,d2,k2+'of'+n2,k2);
        }
      }
    }
  });

  return occ;
}

glob.migrateToUnified=migrateToUnified;
glob.generateOccurrences=generateOccurrences;
glob._unifiedHelpers={dim:dim,periodFromDate:periodFromDate,servicePeriodFromDate:servicePeriodFromDate,ymStr:ymStr,addMonths:addMonths};

})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
