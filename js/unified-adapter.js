/* ============================================================================
 * CashMan Unified Adapter — Step 2
 * window.billOccurrencesUnified(fromD,toD) -> occurrences in the SAME shape the
 * existing Bill Reminder / Timeline / Calendar / Dashboard render expects, but
 * sourced from the proven unified generator (generateOccurrences) so period is
 * assigned in exactly one place (no 4-loop desync).
 *
 * Depends on (all already loaded): window.generateOccurrences, window.migrateToUnified,
 *   D, _billKeyId, _billDeadline (optional), dim, window.cardStmtPeriodOf,
 *   window.cardStmtKey, window.cardPaidRecFor, window.CARD_BILLS.
 * Pure read: does NOT mutate D (migration runs on a throwaway clone unless D.bills exists).
 * ==========================================================================*/
(function(glob){
'use strict';

function _dim(y,m0){ return new Date(y,m0+1,0).getDate(); }
function _clamp(y,m0,d){ return Math.min(d,_dim(y,m0)); }
function _ym(d){ return d.getFullYear()+'-'+((d.getMonth()+1)<10?'0':'')+(d.getMonth()+1); }
function _card(ref){ return (D.cards||[]).find(function(c){return c.id===ref||c.name===ref;})||null; }
function _pdfSet(){ var s={}; try{((glob.CARD_BILLS&&glob.CARD_BILLS.bills)||[]).forEach(function(b){if(b&&b.card)s[b.card]=1;});}catch(e){} return s; }
// Resolve a non-card child's paid record by (keyBase, period) using the authoritative stored
// `period` FIELD (not the key suffix). A charge keyed I|name|seq or M|name is paid for `period`
// if ANY ledger key starting with keyBase+'::' has a paid record whose .period === period
// (fallback: whose suffix === period, for legacy records with no period field).
function _paidRecByNamePeriod(keyBase, period){
  if(!period) return null;
  var bp=D.bill_payments||{}, ks=Object.keys(bp), pfx=keyBase+'::';
  for(var i=0;i<ks.length;i++){ var k=ks[i]; if(k.indexOf(pfx)!==0) continue; var r=bp[k]; if(!r||!r.paid) continue; var rp=r.period||k.slice(pfx.length); if(rp===period) return r; }
  return null;
}
function _paidRecByNameServicePeriod(keyBase, svcPeriod){
  // v321: match a paid record to an occurrence by the IMMUTABLE service period (the usage month),
  // via the record's orig_due month (orig_due = the charge's own bill date, not the shifted pay date).
  // Used when the occurrence's card_period (derived from the bill's CURRENT card) does not match the
  // paid record's period because the card changed after payment (e.g. AIS service-Aug paid via JCB
  // period 2026-08, but the bill now points at ttb which would compute card_period 2026-09).
  if(!svcPeriod) return null;
  var bp=D.bill_payments||{}, ks=Object.keys(bp), pfx=keyBase+'::';
  for(var i=0;i<ks.length;i++){
    var k=ks[i]; if(k.indexOf(pfx)!==0) continue; var r=bp[k]; if(!r||!r.paid) continue;
    var od=(r.orig_due||''); var om=(/^\d{4}-\d{2}/.test(od))?od.slice(0,7):'';
    if(om===svcPeriod) return r;
  }
  return null;
}
function _childPaidFor(keyBase, period){
  if(!period) return null;
  var bp=D.bill_payments||{}, ks=Object.keys(bp), pfx=keyBase+'::';
  for(var i=0;i<ks.length;i++){
    var k=ks[i]; if(k.indexOf(pfx)!==0) continue;
    var r=bp[k]; if(!r||!r.paid) continue;
    var rp=r.period||k.slice(pfx.length);
    if(rp===period) return r;
  }
  return null;
}

// v335 (user concept Oct 17 2026): which statement period a card is in ON a given date.
// Uses the SAME per-card setting (statement_day/period_rule) as _stmtDueDeadline, inverse direction:
// given a real paid_date, find the period whose cutoff range contains it. A charge paid with a card
// folds into THIS period's statement. period_rule 'prev' -> period = month BEFORE the statement month.
function _periodForDateOnCardU(cardObj, iso){
  if(!cardObj||!cardObj.statement_day) return null;
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); if(!m) return null;
  var S=parseInt(cardObj.statement_day,10)||1, cy=+m[1], cm=(+m[2])-1, pd=+m[3];
  var _pr=cardObj.period_rule;
  // statement month = the month whose statement_day closes the cycle this date falls in.
  var stmtM=cm+(pd>S?1:0), stmtY=cy;
  // period month relative to statement month (same setting used forward in _stmtDueDeadline).
  var shift=(_pr==='prev')?1:(_pr==='same')?0:((S<=15)?1:0);
  var per=stmtM-shift, py=stmtY;
  while(per<0){per+=12;py--;} while(per>11){per-=12;py++;}
  return py+'-'+((per+1)<10?'0':'')+(per+1);
}

// Build D.bills[] on the fly (read-only clone) if the app hasn't migrated yet.
function _unifiedBills(){
  if(D.bills && D.bills.length) return D.bills;
  var clone=JSON.parse(JSON.stringify({monthly:D.monthly||[],yearly:D.yearly||[],installments:D.installments||[],planned:D.planned||[],cards:D.cards||[]}));
  var mig=glob.migrateToUnified(clone,{force:true});
  return mig.bills;
}

// Due/deadline for a card statement period (mirrors v311 PDF/legacy logic).
function _stmtDueDeadline(cardObj, periodY, periodM0, pdfChild){
  // DUE DATE RULE (user-confirmed Oct 13 2026, verified vs real due dates for KBank/UOB/BAY/JCB):
  // the statement for PERIOD closes on statement_day in the month AFTER the period, and is PAID on
  // payment_day of that same (period+1) month. So:  due = payment_day of month (periodM0 + 1).
  // Verified: KBank period 2026-07 -> 06/08 ; UOB 2026-08 -> 13/09 ; BAY/JCB 2026-09 -> 10/10.
  // A real PDF statement overrides with its own printed due/deadline (immutable fact).
  if(pdfChild && pdfChild.due instanceof Date){
    var _dl=(pdfChild.deadline instanceof Date)?pdfChild.deadline:null;
    // v322c (user Oct 16 2026): unified occurrences don't carry the PDF deadline (printed "pay within"
    // date), so pdfChild.deadline is usually null -> deadline wrongly fell back to the DUE date. Read
    // the real printed due_date from CARD_BILLS (card_bills.js) for this card+period and use it as the
    // deadline. (KBank statement 05 -> deadline 20; the due/plan-pay day stays 06.)
    if(!_dl){
      try{
        var _per=periodY+'-'+((periodM0+1)<10?'0':'')+(periodM0+1);
        var _cb=(glob.CARD_BILLS&&glob.CARD_BILLS.bills)||[];
        var _cname=(cardObj&&cardObj.name)||'';
        for(var _i=0;_i<_cb.length;_i++){
          var _b=_cb[_i];
          if(_b && _b.card===_cname && _b.period===_per && /^\d{4}-\d{2}-\d{2}$/.test(_b.due_date||'')){
            var _p=_b.due_date.split('-'); _dl=new Date(+_p[0],(+_p[1])-1,+_p[2]); break;
          }
        }
      }catch(_e){}
    }
    return {due:pdfChild.due, deadline:_dl||pdfChild.due};
  }
  // v319 (user-locked Oct 13 2026): due day = statement_day + due_offset, in the STATEMENT MONTH.
  // The statement month relative to the period is a per-card SETTING (period_rule), not computed:
  //   period_rule='prev' -> statement month = period month + 1 (period is the month BEFORE cutoff)
  //   period_rule='same' -> statement month = period month     (period is the cutoff's own month)
  // Back-compat: no period_rule -> legacy statement_day<=15 ? prev-equivalent(+1) : same(+0).
  var _sday=cardObj&&cardObj.statement_day?parseInt(cardObj.statement_day)||1:1;
  var _soff=cardObj&&cardObj.due_offset?parseInt(cardObj.due_offset)||0:0;
  var _prule=cardObj&&cardObj.period_rule;
  var _shift=(_prule==='prev')?1:(_prule==='same')?0:((_sday<=15)?1:0);
  var pmo=periodM0+_shift, py=periodY; while(pmo>11){pmo-=12;py++;}
  var payDay=_sday+_soff;
  var dueDate=new Date(py,pmo,_clamp(py,pmo,payDay));
  // deadline = card.deadline day in the pay month (fallback: due date). Roll to next month only if the
  // deadline day falls on/before the pay day (i.e. deadline wraps past payment).
  var dlDay=cardObj&&cardObj.deadline?parseInt(cardObj.deadline)||null:null;
  var dlDate=dueDate;
  if(dlDay){ var dy=py,dm=pmo; if(dlDay<payDay){dm++;if(dm>11){dm=0;dy++;}} dlDate=new Date(dy,dm,_clamp(dy,dm,dlDay)); }
  return {due:dueDate, deadline:dlDate};
}

// kind + key for a non-card occurrence, matching v311 _billKeyId usage.
function _occKindKey(o){
  var leg=(o._legacy||'');
  if(o.source==='pdf') return {kind:'Card Statement', _isPdfRow:true};
  if(o.recurrence==='monthly') return {kind:'Monthly', key:glob._billKeyId('M',o.name)};
  if(o.recurrence==='yearly' && o.mode==='full') return {kind:'Yearly', key:glob._billKeyId('Y',o.name)};
  if(o.mode==='installment') return {kind:'Installment', key:glob._billKeyId('I',o.name,o.seq)};
  return {kind:'Planned', key:glob._billKeyId('P',o.name, _ym(o.orig_due)+'-'+('0'+o.orig_due.getDate()).slice(-2)) };
}

glob.billOccurrencesUnified=function(fromD,toD){
  if(!D) return [];
  var bills=_unifiedBills();
  var gen=glob.generateOccurrences(bills, D.cards, fromD, toD);
  var pdfSet=_pdfSet();

  // ---- split cash vs card ----
  var cashOcc=[], cardOcc=[];
  // UTILITY DEDUP (user rule 13 Oct, period-based): an ACTUAL utility bill (source 'utility',
  // source_ref 'util|period', e.g. 'electric|2026-09') OWNS that (util, period). A recurring utility
  // FORECAST (source 'utility', source_ref just 'util') for the SAME (util, usage-period) must be
  // dropped so the real bill overwrites the forecast (fixes the Electricity 04/10 duplicate).
  // A utility is arrears (pay-after-use): a forecast charge landing in month M is for USAGE month M-1.
  var _utilActualPeriods={}; // "util|period" -> true  (from real _fromUtility bills)
  (gen||[]).forEach(function(o){
    if(o.source!=='utility') return;
    var ref=String(o.source_ref||'');
    if(ref.indexOf('|')>0){ _utilActualPeriods[ref]=true; } // actual bill carries util|period
  });
  function _utilForecastDropped(o){
    if(o.source!=='utility') return false;
    var ref=String(o.source_ref||'');
    if(ref.indexOf('|')>0) return false;           // this IS an actual bill, never drop
    var util=ref;                                   // recurring forecast: source_ref = util only
    if(!util) return false;
    // v322: usage period = the forecast occurrence's OWN service_period (computed with the bill's
    // period_rule in unified.js), NOT a hardcoded charge-month-1 (that assumed every utility is
    // arrears and wrongly dropped same-month water forecasts). service_period is authoritative.
    var per=o.service_period;
    if(!/^\d{4}-\d{2}$/.test(per||'')){ var d=o.orig_due, m0=d.getMonth(), y=d.getFullYear(); per=y+'-'+((m0+1)<10?'0':'')+(m0+1); }
    return !!_utilActualPeriods[util+'|'+per];
  }
  gen.forEach(function(o){
    if(_utilForecastDropped(o)) return;   // real utility bill overwrites the recurring forecast (same util+period)
    var isCash=(!o.card || o.card==='cash' || o.card==='Cash/Direct');
    // map to render shape
    var kk=_occKindKey(o);
    var base={
      kind:kk.kind, key:kk.key, name:o.name, type:o.type||'',
      amount:o.amount||0, card:isCash?'Cash/Direct':o.card, auto_pay:((kk.kind==='Installment')?true:(o.settle==='auto')),
      due:o.orig_due, orig_due:o.orig_due, deadline:null,
      info:(o.seq?('('+o.seq.replace('of','/')+')'):''),
      _income:(o.direction==='income'),
      card_period:o.card_period, service_period:o.service_period,
      source:o.source, source_ref:o.source_ref, seq:o.seq,
      // actual utility bills carry source_ref 'util|period' — expose the usage period + utility so
      // the display badge (via _svcPer) shows the USAGE month, not the landing-date month.
      _utilPeriod:(o.source==='utility'&&String(o.source_ref||'').indexOf('|')>0)?String(o.source_ref).split('|')[1]:'',
      _utilUtility:(o.source==='utility')?String(o.source_ref||'').split('|')[0]:'',
      _fromUtility:(o.source==='utility'&&String(o.source_ref||'').indexOf('|')>0)
    };
    if(o.source==='pdf'){ base._fromCard=true; base._cardPeriod=o.card_period; base._cardName=o.card; }
    // v341 (user Oct 17 2026): PER-OCCURRENCE OVERRIDE. A single occurrence (this bill, this period)
    // can override card / amount / due / paid_date WITHOUT touching the recurring/installment template.
    // Keyed by '<billKey>::<natural period>' in D.occ_overrides, where natural period is the occurrence's
    // own card_period (card bills) else service_period else due month — the SAME key the edit UI writes.
    // Applied BEFORE the fold block so an overridden card/due re-folds correctly downstream.
    if(!base._fromCard && base.key && D.occ_overrides){
      var _opKey=base.key+'::'+((/^\d{4}-\d{2}$/.test(o.card_period||''))?o.card_period:(/^\d{4}-\d{2}$/.test(o.service_period||''))?o.service_period:_ym(base.due));
      var _ov=D.occ_overrides[_opKey];
      if(_ov && typeof _ov==='object'){
        base._occOverride=_opKey;
        if(_ov.card){ base.card=_ov.card; var _ovIsCash=(_ov.card==='Cash/Direct'||_ov.card==='cash'); if(_ovIsCash){ base.card='Cash/Direct'; isCash=true; } }
        if(_ov.amount!=null && !isNaN(parseFloat(_ov.amount))) base.amount=parseFloat(_ov.amount);
        if(/^\d{4}-\d{2}-\d{2}$/.test(_ov.due||'')){ var _dp=_ov.due.split('-'); base.due=new Date(+_dp[0],(+_dp[1])-1,+_dp[2]); base.orig_due=base.due; }
      }
    }
    // v335 FOLD RULE (user-locked Oct 17 2026): a card-linked charge (not a PDF statement row) folds
    // ONLY by its ACTUAL PAID DATE. Look up the paid record for THIS charge's own service period
    // (exact key+period, never a cross-period prefix match). Then:
    //   PAID  -> fold under the card it was paid with, into the statement period whose date-range
    //            CONTAINS paid_date (_periodForDateOnCardU). Set base.card + base.card_period to that.
    //   UNPAID-> do NOT fold: flag base._noFold so it skips grouping and surfaces as a standalone
    //            actionable row. (A charge's CURRENT card/card_period is a forecast, not a fold target.)
    if(!isCash && o.source!=='pdf' && base.key){
      var _isInst=(kk.kind==='Installment') || (typeof base.key==='string' && base.key.indexOf('I|')===0);
      // v18 (locked fold rule): auto-debit recurring (auto_pay) also folds by its CUT date, like installments.
      var _isAuto=!!(o.auto_pay||base.auto_pay);
      if(_isInst||_isAuto){
        // v340 (user-locked Oct 17 2026): an INSTALLMENT is swiped on a specific date and auto-posts to
        // whichever statement period its CUT date (orig_due) falls into — ALWAYS, regardless of paid
        // status or the unreliable auto_pay field. It never surfaces as a manual actionable row; it is
        // part of the card bill. Fold by orig_due on the bill's own card.
        var _icObj=_card(base.card) || (D.cards||[]).find(function(c){return c.id===base.card;}) || null;
        var _icDate=(o.orig_due instanceof Date)?(o.orig_due.getFullYear()+'-'+((o.orig_due.getMonth()+1)<10?'0':'')+(o.orig_due.getMonth()+1)+'-'+(o.orig_due.getDate()<10?'0':'')+o.orig_due.getDate()):String(o.orig_due||'').slice(0,10);
        var _icPer=_icObj?_periodForDateOnCardU(_icObj, _icDate):null;
        if(_icPer){ base.card_period=_icPer; }
        base._paidFold=true;   // treat as folded (never a standalone manual row)
      } else {
        // the charge's own service period (immutable usage month); fall back to card_period then due month.
        var _sp=(/^\d{4}-\d{2}$/.test(o.service_period||''))?o.service_period
               :(/^\d{4}-\d{2}$/.test(o.card_period||''))?o.card_period:_ym(base.due);
        var _rec=_childPaidFor(base.key, _sp);
        if(!_rec){ var _rk=(D.bill_payments||{})[base.key+'::'+_sp]; if(_rk&&_rk.paid) _rec=_rk; }
        if(_rec && _rec.paid && _rec.paid_date){
          var _payCard=_rec.card && _rec.card!=='Cash/Direct' ? _rec.card : base.card;
          var _pcObj=_card(_payCard) || (D.cards||[]).find(function(c){return c.id===_payCard;}) || null;
          var _foldPer=_periodForDateOnCardU(_pcObj, _rec.paid_date);
          base.card=_payCard;
          base.card_period=_foldPer || _rec.period || base.card_period;
          base._paidFold=true;
        } else {
          base._noFold=true;   // unpaid linked charge: never fold into a statement
        }
      }
    }
    if(isCash) cashOcc.push(base); else cardOcc.push(base);
  });

  // ---- consolidate card charges into one statement per (card, card_period) ----
  var groups={};
  cardOcc.forEach(function(o){
    if(o._noFold) return;   // v335: unpaid linked charge never folds into a statement group
    var mk=o.card_period || _ym(o.due);
    var gk=o.card+'::'+mk;
    if(!groups[gk]){
      var pm=/^(\d{4})-(\d{2})$/.exec(mk);
      var gy=pm?+pm[1]:o.due.getFullYear(), gm=pm?(+pm[2]-1):o.due.getMonth();
      groups[gk]={card:o.card, mk:mk, y:gy, m:gm, items:[], sum:0, pdfAmount:null, pdfChild:null};
    }
    var g=groups[gk]; g.items.push(o);
    if(o._fromCard){ g.pdfAmount=(o.amount||0); g.pdfChild=o; }
    else g.sum+=(o.amount||0);
  });

  // override-only months (cardbill_extra for a period with no charges)
  Object.keys(D.cardbill_extra||{}).forEach(function(ok){
    var pp=ok.split('::'); if(pp.length!==2) return;
    if(!(parseFloat(D.cardbill_extra[ok])>0)) return;
    var oc=pp[0], om=pp[1]; if(groups[oc+'::'+om]) return;
    var pm=/^(\d{4})-(\d{2})$/.exec(om); if(!pm) return;
    var oy=+pm[1], omo=+pm[2]-1;
    var cObj=_card(oc); var dd=_stmtDueDeadline(cObj,oy,omo,null);
    if(dd.due<fromD||dd.due>toD) return;
    groups[oc+'::'+om]={card:oc,mk:om,y:oy,m:omo,items:[],sum:0,pdfAmount:null,pdfChild:null};
  });

  var stmts=[];
  Object.keys(groups).forEach(function(gk){
    var g=groups[gk]; var cObj=_card(g.card);
    if(cObj&&cObj.statement_start&&g.mk<cObj.statement_start) return; // statement-start cutoff
    var extraRec=parseFloat((D.cardbill_extra||{})[g.card+'::'+g.mk])||0;
    var hasPdf=(g.pdfAmount!=null);
    var eff=hasPdf?g.pdfAmount:((g.sum||0)+extraRec);
    var dd=_stmtDueDeadline(cObj,g.y,g.m,g.pdfChild);
    var children=hasPdf?g.items.filter(function(it){return !it._fromCard;}):g.items;
    stmts.push({
      kind:'Card Statement', key:glob._billKeyId('CB',g.card,g.mk), _cardPeriod:g.mk,
      name:((typeof glob.cardDisplayName==='function'&&glob.cardDisplayName(g.card))||g.card)+' statement', type:'Credit Card', amount:eff, card:g.card, auto_pay:false,
      children:children, _pdfDriven:hasPdf, due:dd.due, deadline:dd.deadline,
      info:(hasPdf?('\ud83d\udcc4 from statement'+(g.items.length>1?(' \u00b7 '+(g.items.length-1)+' charge'+((g.items.length-1)!==1?'s':'')):''))
                  :((pdfSet[g.card]?'\ud83d\udd2e forecast \u00b7 ':'')+g.items.length+' charge'+(g.items.length!==1?'s':'')+(extraRec>0?' \u00b7 +extra':''))),
      _isForecast:(!hasPdf&&!!pdfSet[g.card])
    });
  });

  // ---- surface UNPAID card charges as their own actionable rows (paid ones fold) ----
  var surfaced=[];
  cardOcc.forEach(function(o){
    if(o._fromCard) return;
    // v335: UNPAID linked charges (flagged _noFold above) do not fold -> surface them as standalone
    // actionable rows. PAID charges folded into a statement; they must NOT also surface.
    if(o._noFold){
      var su=Object.assign({},o); su._surfaced=true; su._inStmtCard=o.card; su._unpaidStandalone=true;
      surfaced.push(su); return;
    }
  });

  var occ=cashOcc.concat(stmts).concat(surfaced);

  // ---- attach paid status + fullKey (same central helpers as v311) ----
  occ.forEach(function(o){
    var isCB=(o.kind==='Card Statement'||(typeof o.key==='string'&&o.key.indexOf('CB|')===0));
    if(isCB && typeof glob.cardStmtPeriodOf==='function' && typeof glob.cardPaidRecFor==='function'){
      var per=glob.cardStmtPeriodOf(o)||'';
      o.statementPeriod=per;
      o.fullKey=(per&&typeof glob.cardStmtKey==='function')?glob.cardStmtKey(o.card,per):(o.key+'::'+_ym(o.due));
      o.periodKey=o.fullKey;
      var r=per?glob.cardPaidRecFor(o.card,per):null;
      o.paid=!!r; o.paid_date=r&&r.paid_date; o.paid_amount=r&&r.paid_amount;
      return;
    }
    // non-card paid resolution (§0, authoritative = stored period FIELD):
    //  - a charge folded under a CARD resolves ONLY by its card_period. NEVER fall back to the
    //    service month: card_period and service_period can differ by a month (AIS billing 28 on
    //    ttb S=22 -> card_period 2026-11 but service_period 2026-10), and matching the service
    //    month would wrongly inherit the previous card period's paid record.
    //  - a pure CASH charge (no card_period) resolves by its service/due month.
    var rec=null;
    if(o.card_period){
      o.periodKey=o.key+'::'+o.card_period; o.fullKey=o.periodKey;
      rec=_childPaidFor(o.key, o.card_period);
    } else {
      var suf=o.service_period||_ym(o.due);
      o.periodKey=o.key+'::'+suf; o.fullKey=o.periodKey;
      rec=_childPaidFor(o.key, suf);
      if(!rec){ var r1=(D.bill_payments||{})[o.key+'::'+_ym(o.due)]; if(r1&&r1.paid) rec=r1; }
    }
    o.paid=!!(rec&&rec.paid); o.paid_date=rec&&rec.paid_date; o.paid_amount=rec&&rec.paid_amount;
  });

  occ.sort(function(a,b){return a.due-b.due;});
  return occ;
};

})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
