/* ui-cardsync.js - Credit-card statement auto-sync into CashMan (Oct 2026).
   Works exactly like the utility auto-sync (ui-utilities.js utilAutoSyncPlanned):
     - card_bills.js (written by parse_cardbills.py, loaded as window.CARD_BILLS) holds ONE
       summary per card per statement period: amount_due, min_due, due_date, period, and the
       payment status (paid_total / paid_full / remaining / paid_date) matched from Krungsri
       bill-payment emails.
     - For every statement we push ONE planned row into D.planned (flag _fromCard), amount =
       amount_due, card = the card name, due = statement due_date (fallback: card payment_day).
       The existing Bills Reminder "Card Statement" grouping then rolls it up by card+month, and
       Calendar/Timeline show it — same as a utility bill.
     - A Monthly recurring linked to this card (card_link === cardName) is SKIPPED for any month
       that has a real statement (see simulation.js / ui-billreminder.js _cardActual), so the
       recurring forecast is replaced by the real bill for that period and only forecasts future
       months with no statement yet.
     - Paid status: if the statement is paid_full, mark the planned occurrence paid in the
       bill_payments ledger (paid_amount = paid_total, paid_date). Partial payment = still unpaid
       (user chose "จ่ายบางส่วน = ยังค้าง"), but we remember paid_total on the row for display.
     - Detailed per-transaction lines (card_txns_local.json) are merged into D.card_txns on the PC
       and pushed to the Google Sheet by sheet-sync; they are NEVER in card_bills.js (public). */
(function(){
  'use strict';
  function _norm(s){ return String(s==null?'':s).trim(); }
  function _cardByName(name){ return (D.cards||[]).find(function(c){return c.name===name;}); }
  // card -> immutable id (accepts id already, a name, or 'Cash/Direct'/''); falls back to input.
  function _cardIdOf(x){ if(x==null||x==='Cash/Direct'||x==='')return x; if(/^c\d+$/.test(String(x)))return x; try{ if(typeof window.cardResolve==='function'){ var c=window.cardResolve(x); if(c&&c.id)return c.id; } }catch(e){} var m=_cardByName(x); return (m&&m.id)?m.id:x; }
  // canonical cardbill_extra key: '<id>::period'
  window.cardExtraKey=function(card, period){ return _cardIdOf(card)+'::'+_norm(period); }
  function dim(y,m){ return new Date(y,m+1,0).getDate(); }

  // due = statement due_date (ISO) if present, else the card's payment_day in the period's month.
  // DUE = Planned Pay day (card.payment_day), in the month the statement is issued (stmt_date's month;
  // payment_day = statement_day+1 so it stays in that month). This is the date the user plans to pay.
  // It is NEVER the PDF "pay within" date (that is the DEADLINE, see _deadlineFor).
  function _dueFor(bill){
    // NEW MODEL: Due = statement_date + due_offset(days). The statement date comes from the real bill
    // (bill.stmt_date). due_offset is a per-card setting (default 0 = due on the statement date itself).
    // Due may legitimately cross a month boundary (e.g. stmt day 30 + offset 1 => day 1 next month).
    var c=_cardByName(bill.card);
    var sd=_norm(bill.stmt_date);
    var ms=/^(\d{4})-(\d{2})-(\d{2})$/.exec(sd);
    if(!ms) return _norm(bill.due_date)||'';   // no real statement date -> fall back to PDF due_date
    var off=(c&&typeof c.due_offset==='number')?c.due_offset:(c&&c.due_offset?parseInt(c.due_offset)||0:0);
    var dt=new Date(+ms[1],+ms[2]-1,+ms[3]+off);
    var y=dt.getFullYear(),mo=dt.getMonth()+1,d=dt.getDate();
    return y+'-'+(mo<10?'0':'')+mo+'-'+(d<10?'0':'')+d;
  }
  // DEADLINE = the PDF "pay within" date (bill.due_date, read from the statement). When a real bill
  // exists it OVERRIDES the card's configured deadline_day for that period.
  function _deadlineFor(bill){
    var dd=_norm(bill.due_date);
    return /^\d{4}-\d{2}-\d{2}$/.test(dd)?dd:'';
  }

  // Auto-sync every CARD_BILLS statement into D.planned. Dedup by _cardKey (card|period).
  // Returns number of NEW rows added. Does NOT re-render (caller controls).
  // ===================================================================================
  // SINGLE SOURCE OF TRUTH for credit-card statements (Oct 2026 architecture).
  // Every surface (Bill Reminder, Card Bills, Timeline, Calendar) must read a statement's
  // identity, amount, due/deadline and PAID state through these helpers — never recompute
  // its own key or paid-check. This kills the "view month vs period vs due month" drift.
  //
  //   canonical key  = 'CB|'+card+'|'+PERIOD+'::'+DUE_MONTH
  //     PERIOD    = usage month (parser's bill.period, or the day<=15 rule for forecast)
  //     DUE_MONTH = YYYY-MM of the statement's due date (due may cross a month boundary)
  // ===================================================================================

  // Period of a card charge dated (chargeISO) under a card's statement_day, using the
  // user-confirmed rule: a charge belongs to the cycle that CLOSES on statement_day of month M
  // (M = chargeMonth if day<=S else chargeMonth+1); period month = (S<=15 ? M-1 : M).
  function cardChargePeriod(cardName, chargeISO){
    var c=_cardByName(cardName); if(!c||!c.statement_day) return '';
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(_norm(chargeISO)); if(!m) return '';
    var S=parseInt(c.statement_day)||1, cy=+m[1], cm=(+m[2])-1, pd=+m[3];
    var M=cm+(pd>S?1:0), per=(S<=15)?(M-1):M, y=cy;
    while(per<0){per+=12;y--;} while(per>11){per-=12;y++;}
    return y+'-'+(per+1<10?'0':'')+(per+1);
  }
  // Statement DATE for a given PERIOD + card (forecast reconstruction): statement_day in the month
  // whose statement_day closes that period (period+1 when S<=15, else the period month).
  function cardStmtDateFor(cardName, period){
    var c=_cardByName(cardName); if(!c) return '';
    var m=/^(\d{4})-(\d{2})$/.exec(_norm(period)); if(!m) return '';
    var S=c.statement_day?parseInt(c.statement_day)||1:1, py=+m[1], pm=(+m[2])-1;
    var sm=(S<=15)?(pm+1):pm, sy=py; if(sm>11){sm-=12;sy++;}
    var d=Math.min(S, new Date(sy,sm+1,0).getDate());
    return sy+'-'+(sm+1<10?'0':'')+(sm+1)+'-'+(d<10?'0':'')+d;
  }
  // Due date for a PERIOD + card = statement_date + due_offset (new model).
  function cardDueFor(cardName, period, stmtISO){
    var c=_cardByName(cardName);
    var sd=_norm(stmtISO)||cardStmtDateFor(cardName,period);
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(sd); if(!m) return '';
    var off=(c&&typeof c.due_offset==='number')?c.due_offset:(c&&c.due_offset?parseInt(c.due_offset)||0:0);
    var dt=new Date(+m[1],(+m[2])-1,(+m[3])+off);
    return dt.getFullYear()+'-'+(dt.getMonth()+1<10?'0':'')+(dt.getMonth()+1)+'-'+(dt.getDate()<10?'0':'')+dt.getDate();
  }
  function _ym(iso){ var m=/^(\d{4})-(\d{2})/.exec(_norm(iso)); return m?(m[1]+'-'+m[2]):''; }
  // THE canonical paid-ledger key. dueISO optional -> derived from period if omitted.
  // Expose the period/due helpers so other surfaces (simulation.js Timeline, etc.) use the SAME
  // single source of truth instead of recomputing. (These were inner-only before — simulation
  // called window.cardDueFor and silently got undefined, falling back to the legacy due date.)
  window.cardChargePeriod=cardChargePeriod;
  window.cardStmtDateFor=cardStmtDateFor;
  window.cardDueFor=cardDueFor;
  window.cardStmtKey=function(card, period, dueISO){
    var dm=_ym(dueISO||cardDueFor(card,period,''))||period;
    return 'CB|'+_cardIdOf(card)+'|'+_norm(period)+'::'+dm;
  };
  // Read paid state for a statement (card+period). Returns the ledger record or null.
  window.cardPaidRec=function(card, period, dueISO){
    var k=window.cardStmtKey(card,period,dueISO);
    var r=(D.bill_payments||{})[k];
    return (r&&r.paid)?r:null;
  };
  // ===== v311 CENTRAL period/paid resolvers — THE single source of truth for every surface =====
  // cardStmtPeriodOf(o): resolve a statement/charge occurrence's CARD PERIOD. Priority (user-locked
  // 12 Oct): (1) parser-authoritative _cardPeriod on a _fromCard row; (2) the PERIOD segment of a
  // CB|card|period(::due) key; (3) compute from the charge's own date via cardChargePeriod (§2 rule).
  // This fixes statements whose due month differs from their period (e.g. BAY JCB period 2026-04 due
  // 2026-05 was being mis-derived to 2026-05). Returns 'YYYY-MM' or ''.
  window.cardStmtPeriodOf=function(o){
    if(!o) return '';
    if(/^\d{4}-\d{2}$/.test(_norm(o._cardPeriod))) return _norm(o._cardPeriod);
    var k=_norm(o.key||o.fullKey);
    if(k.indexOf('CB|')===0){ var seg=(k.split('|')[2]||'').split('::')[0]; if(/^\d{4}-\d{2}$/.test(seg)) return seg; }
    var card=_norm(o.card);
    var cd=o.orig_due||o.due;
    if(cd){ var iso=(typeof cd==='string')?cd:(cd&&cd.getFullYear?(cd.getFullYear()+'-'+((cd.getMonth()+1<10?'0':'')+(cd.getMonth()+1))+'-'+((cd.getDate()<10?'0':'')+cd.getDate())):''); var p=cardChargePeriod(card,iso); if(p) return p; }
    return '';
  };
  // cardPaidRecFor(card, period): THE paid-state reader for a statement. Prefix-matches
  // 'CB|card|period::' so a record stored with ANY dueMonth suffix resolves (period alone identifies
  // the statement; the suffix is cosmetic — user-locked 12 Oct). Returns the paid record or null.
  window.cardPaidRecFor=function(card, period){
    if(!D.bill_payments||!/^\d{4}-\d{2}$/.test(_norm(period))) return null;
    var bp=D.bill_payments, per=_norm(period);
    var pfxId='CB|'+_cardIdOf(card)+'|'+per+'::';           // new id-keyed
    var pfxNm='CB|'+_norm(card)+'|'+per+'::';               // legacy name-keyed (transition)
    for(var kk in bp){ if(kk.indexOf(pfxId)===0||kk.indexOf(pfxNm)===0){ var r=bp[kk]; if(r&&r.paid) return r; } }
    return null;
  };
  // Mark a statement paid — THE single writer. Every "Pay"/"Mark paid" button calls this.
  window.cardMarkPaid=function(card, period, amount, paidDateISO, dueISO){
    if(!D.bill_payments) D.bill_payments={};
    var k=window.cardStmtKey(card,period,dueISO);
    var due=dueISO||cardDueFor(card,period,'');
    var _pd=(_norm(paidDateISO)||new Date().toISOString().slice(0,10));
    D.bill_payments[k]={paid:true,
      paid_date:_pd,
      paid_amount:(typeof amount==='number'?amount:parseFloat(amount)||0),
      due:due, type:'Credit Card', card:_cardIdOf(card)};
    // LAYER B (v=309): also mark this statement's installment/monthly children paid for card+period,
    // so Payment History folds them and per-charge paid-state is correct. Guarded; never overwrites
    // hand-keyed records; children it creates carry _autoChild for clean reversal.
    try{ if(typeof window.cardMarkChildren==='function') window.cardMarkChildren(_norm(card), _norm(period), _pd); }catch(e){}
    return k;
  };
  // Clear paid state (un-pay).
  window.cardUnmarkPaid=function(card, period, dueISO){
    if(!D.bill_payments) return;
    delete D.bill_payments[window.cardStmtKey(card,period,dueISO)];
    // LAYER B (v=309): also remove the installment/monthly child records WE auto-created for this
    // card+period (flagged _autoChild). Hand-keyed child records are left untouched.
    try{ if(typeof window.cardUnmarkChildren==='function') window.cardUnmarkChildren(_norm(card), _norm(period)); }catch(e){}
  };
  // Set of PDF-managed card names (any bank present in CARD_BILLS).
  window.cardPdfSet=function(){
    var set={}; ((window.CARD_BILLS&&window.CARD_BILLS.bills)||[]).forEach(function(b){ if(b&&b.card) set[_norm(b.card)]=1; });
    return set;
  };

  window.cardAutoSyncPlanned=function(){
    if(typeof D==='undefined'||!D) return 0;
    if(!D.planned) D.planned=[];
    if(!D.bill_payments) D.bill_payments={};
    var src=(window.CARD_BILLS&&window.CARD_BILLS.bills)|| [];
    if(!src.length) return 0;
    var have={}, haveName={};
    D.planned.forEach(function(p){
      if(p&&p._fromCard&&p._cardKey) have[p._cardKey]=p;
      if(p&&p.name) haveName[p.name]=p;
    });
    var added=0, changed=false;
    src.forEach(function(b){
      var card=_norm(b.card), period=_norm(b.period);
      if(!card||!period) return;
      var cid=_cardIdOf(card);                       // immutable id for keys
      var ckey=cid+'|'+period;                       // id-keyed (was name|period)
      var nm=card+' '+period;                       // e.g. "BAY JCB 2026-09" (display name)
      var amt=(typeof b.amount_due==='number')?b.amount_due:parseFloat(b.amount_due||0)||0;
      var due=_dueFor(b);
      var ddl=_deadlineFor(b);
      var paidFull=!!b.paid_full;
      var paidTotal=(typeof b.paid_total==='number')?b.paid_total:parseFloat(b.paid_total||0)||0;
      var paidDate=_norm(b.paid_date).slice(0,10);
      var ex=have[ckey]||haveName[nm];
      if(ex){
        if(ex.amount!==amt){ex.amount=amt;changed=true;}
        if(ex.date!==due){ex.date=due;changed=true;}
        if((ex.deadline_date||'')!==ddl){ex.deadline_date=ddl;ex.deadline_mode=(ddl?'custom':'');changed=true;}
        if(!ex._fromCard){ex._fromCard=true;changed=true;}
        if(ex._cardKey!==ckey){ex._cardKey=ckey;changed=true;}
        if(ex._cardName!==card){ex._cardName=card;changed=true;}
        if(ex._cardPeriod!==period){ex._cardPeriod=period;changed=true;}
        if(ex.type!=='Credit Card'){ex.type='Credit Card';changed=true;}
        if(ex.card!==cid){ex.card=cid;changed=true;}
        if((ex._cardPaidTotal||0)!==paidTotal){ex._cardPaidTotal=paidTotal;changed=true;}
        if((ex._cardMinDue||0)!==(b.min_due||0)){ex._cardMinDue=b.min_due||0;changed=true;}
        have[ckey]=ex;
      }else{
        var row={name:nm,amount:amt,date:due,type:'Credit Card',owner:'Me',card:cid,
                 deadline_date:ddl,deadline_mode:(ddl?'custom':''),
                 _fromCard:true,_cardKey:ckey,_cardName:card,_cardId:cid,_cardPeriod:period,
                 _cardPaidTotal:paidTotal,_cardMinDue:(b.min_due||0)};
        D.planned.push(row); have[ckey]=row; added++; changed=true;
      }
      // paid ledger: planned occurrence fullKey = 'P|'+name+'|'+date + '::' + YYYY-MM(due month).
      // Card rows carry card=cardName; the planned occurrence in billOccurrences shifts by the
      // card payment day, but since OUR due IS the statement/pay date, the landing month == due month.
      if(due){
        var dmk=due.slice(0,7);
        // Mark paid against the CARD STATEMENT's own ledger key so it matches the statement
        // occurrence that billOccurrences builds: fullKey = o.key+'::'+dueMonth, where
        //   o.key = 'CB|'+card+'|'+PERIOD   (billOccurrences now groups PDF-managed cards by the
        //           statement PERIOD, not the due month), and
        //   the '::' suffix = the MONTH OF THE DUE DATE (dmk).
        // So the first segment must be the PERIOD and the suffix the due month. (Earlier this used
        // dmk for BOTH, which broke once grouping moved to period: period 2026-08 vs due-month
        // 2026-09 made the paid key miss the occurrence -> statement showed Overdue despite paid.)
        var payKey='CB|'+cid+'|'+period+'::'+dmk;
        if(paidFull){
          var prev=D.bill_payments[payKey];
          var pd=paidDate||due;
          // Only CREATE the paid record if absent. NEVER overwrite an existing one — the user may have
          // hand-corrected paid_date/amount (e.g. the real bank date differs from the card_bills/email
          // date). Overwriting on every load was resetting user edits back to the PDF date each refresh.
          if(!prev){
            D.bill_payments[payKey]={paid:true,paid_date:pd,paid_amount:paidTotal,due:due,type:'Credit Card',card:card,auto_pay:false,_fromCard:true};
            changed=true;
          }
        }else if(D.bill_payments[payKey]&&D.bill_payments[payKey]._fromCard){
          // was auto-marked paid before, now not full anymore -> unmark
          delete D.bill_payments[payKey]; changed=true;
        }
      }
      // Reward points: append the statement's points balance to this card's points_log (dedup by date).
      // CM's Credit Cards page already shows points_log (ccLatestPoints + table), so no UI change needed.
      try{
        var _pb=(typeof b.points_balance==='number')?b.points_balance:(b.points_balance?parseInt(String(b.points_balance).replace(/,/g,'')):null);
        var _pd=_norm(b.points_date).slice(0,10);
        if(_pb!=null && _pd){
          var _cObj=_cardByName(card);
          if(_cObj){
            if(!Array.isArray(_cObj.points_log)) _cObj.points_log=[];
            var _hit=_cObj.points_log.filter(function(x){return (x.date||'')===_pd;})[0];
            var _note='from statement '+period;
            if(_hit){ if((_hit.points||0)!==_pb || _hit.note!==_note){ _hit.points=_pb; _hit.note=_note; changed=true; } }
            else { _cObj.points_log.push({date:_pd,points:_pb,note:_note}); changed=true; }
          }
        }
      }catch(e){ console.warn('card points merge failed',e); }
    });
    // merge detailed txns (PC only; file loaded as window.CARD_TXNS_LOCAL if present)
    // v2 (Oct 17 2026 — id refactor): CARD_TXNS_LOCAL (from parse_cardbills.py) is the GROUND TRUTH
    // for card transactions and now carries card_id. To avoid stale duplicates after a card rename
    // (old short-name rows + new long-name rows coexisting), REPLACE the PDF-sourced txns wholesale
    // instead of merging: drop every existing txn that has a card_id OR matches a last4 present in
    // the fresh set, then install the fresh set. Non-PDF/manually-added txns (no card_id, unknown
    // last4) are preserved.
    try{
      var det=(window.CARD_TXNS_LOCAL&&window.CARD_TXNS_LOCAL.card_txns)||null;
      if(Array.isArray(det)){
        if(!Array.isArray(D.card_txns)) D.card_txns=[];
        var freshLast4={}, freshNames={}, freshIds={};
        det.forEach(function(t){
          var l=String(t.last4||'').replace(/\D/g,''); if(l) freshLast4[l]=1;
          if(t.card_id) freshIds[t.card_id]=1;
          // record the CURRENT display name for each fresh card so stale rows (same card, no last4)
          // can be matched by name too
          var nm=(typeof window.cardDisplayName==='function')?window.cardDisplayName(t.card_id||t.card,t.last4):t.card;
          if(nm) freshNames[nm]=1;
          if(t.card) freshNames[t.card]=1;
        });
        var kept=D.card_txns.filter(function(t){
          if(t.card_id) return false;                       // old PDF-sourced row -> drop (replaced)
          var l=String(t.last4||'').replace(/\D/g,'');
          if(l && freshLast4[l]) return false;              // same card by last4 -> drop (replaced)
          // stale row with no last4 (e.g. old KBank) — match by resolved current name
          var rn=(typeof window.cardDisplayName==='function')?window.cardDisplayName(t.card_id||t.card,t.last4):t.card;
          if(rn && freshNames[rn]) return false;            // same card by name -> drop (replaced)
          if(t.card && freshNames[t.card]) return false;    // raw stale name matches a fresh card -> drop
          return true;                                       // manual/foreign row -> keep
        });
        var before=D.card_txns.length;
        D.card_txns = kept.concat(det);
        if(D.card_txns.length!==before || det.length) changed=true;
      }
    }catch(e){ console.warn('card_txns replace failed',e); }
    // ORPHAN CLEANUP: remove _fromCard planned rows whose _cardKey is no longer in CARD_BILLS.
    // This happens when a statement's period changes (e.g. a parsing-rule fix moved BAY from
    // 2026-09 to 2026-08): the old row must be dropped so it doesn't duplicate the new one across
    // Bills Reminder / Payment History / Calendar. Also drop the stale paid-ledger entry it created.
    var _valid={};
    src.forEach(function(b){ var c=_cardIdOf(b.card), pr=_norm(b.period); if(c&&pr) _valid[c+'|'+pr]=1; });
    // Build the set of CURRENTLY-VALID Card Statement paid keys from CARD_BILLS. A card statement's
    // paid key is 'CB|<card>|<dueMonth>::<dueMonth>' where dueMonth is the month of the statement's
    // printed due_date (what ui-billreminder now uses for _fromCard statements). Also track which
    // cards are managed by card_bills so we only ever touch THOSE cards' CB records.
    var _validCB={}, _cardManaged={};
    src.forEach(function(b){
      var c=_cardIdOf(b.card); if(!c) return; _cardManaged[c]=1;
      // Valid CB key must match the occurrence's periodKey = 'CB|'+card+'|'+PERIOD+'::'+dueMonth.
      // (period = b.period from the parser; dueMonth = month of the statement's printed due_date,
      // which is the due date ui-cardsync writes. These can differ by a month — that is expected.)
      var per=_norm(b.period);
      var _due=_dueFor(b); var dmk=(/^\d{4}-\d{2}-\d{2}$/.test(_due))?_due.slice(0,7):per;
      if(per && dmk) _validCB['CB|'+c+'|'+per+'::'+dmk]=1;
    });
    // Build the set of card::period that have a REAL PDF statement. Per the user rule, once a bill
    // arrives the manually-keyed "extra spend" (cardbill_extra) for THAT period is obsolete (the PDF
    // amount is authoritative), so purge it. Only touches PDF-managed cards' own periods — manual
    // extras on forecast periods (no PDF yet) and all non-managed cards are left untouched.
    var _pdfPeriod={};
    src.forEach(function(b){ var c=_cardIdOf(b.card), pr=_norm(b.period); if(c&&pr) _pdfPeriod[c+'::'+pr]=1; });
    try{
      Object.keys(D.cardbill_extra||{}).forEach(function(k){
        var pp=k.split('::'); if(pp.length!==2) return;
        var c=_cardIdOf(pp[0]);
        if(!_cardManaged[c]) return;
        // ONLY purge extra for a period that already has a REAL PDF statement (bill arrived ->
        // the PDF total is authoritative, the manual estimate is obsolete). A period with NO PDF
        // yet keeps its extra so "key an estimate -> it shows" always holds. Do NOT purge on
        // amount-equals-a-PDF-total: a user estimate can legitimately equal a past bill.
        if(_pdfPeriod[c+'::'+_norm(pp[1])]){ delete D.cardbill_extra[k]; changed=true; }
      });
    }catch(e){}
    // Purge stale card paid-ledger entries that cause duplicate History rows:
    //  - legacy 'P|<name>|...' _fromCard records (superseded by CB keys), and
    //  - 'CB|<card>|...' records for a card_bills-managed card whose key is no longer valid
    //    (e.g. an old period/due-month from before a parsing-rule or due-date fix).
    try{
      Object.keys(D.bill_payments||{}).forEach(function(k){
        var v=D.bill_payments[k]||{};
        if(v._fromCard && k.indexOf('P|')===0){ delete D.bill_payments[k]; changed=true; return; }
        if(k.indexOf('CB|')===0){
          var _c=_norm(k.split('|')[1]);
          // Purge ONLY auto-synced-from-PDF orphans (_fromCard:true) whose key is no longer a valid
          // CARD_BILLS period — e.g. an old period left behind after a parsing-rule/due-date fix.
          // A record the USER marked paid by hand (markRowPaid/cardMarkPaid) carries NO _fromCard flag,
          // and forecast statements (no PDF yet) will NEVER be in _validCB — those must survive reload.
          // (Bug fix Oct 11 2026: this block was deleting user-paid forecast statements like
          //  CB|BAY|2026-07::2026-08 on every load, so "pay then refresh" lost the payment.)
          if(_cardManaged[_c] && !_validCB[k] && v._fromCard===true){ delete D.bill_payments[k]; changed=true; }
        }
      });
    }catch(e){}
    var _kept=[];
    (D.planned||[]).forEach(function(p){
      if(p&&p._fromCard&&p._cardKey && !_valid[p._cardKey]){
        // stale card row -> remove it and its auto paid-ledger entry (P|name|date::YYYY-MM)
        var _due=(p.date||''); var _dmk=_due.slice(0,7);
        var _pk='P|'+(p.name||'')+'|'+_due+'::'+_dmk;
        if(D.bill_payments && D.bill_payments[_pk] && D.bill_payments[_pk]._fromCard){ delete D.bill_payments[_pk]; }
        changed=true;
        return; // drop
      }
      _kept.push(p);
    });
    if(_kept.length!==(D.planned||[]).length){ D.planned=_kept; }
    if(changed){ saveD(); if(typeof simulate==='function') simulate(); }
    return added;
  };
  function _txnKey(t){ t=t||{}; return [t.card_id||t.last4||t.card,t.period,t.ref||'',t.txn_date||'',t.amount,t.desc||''].join('|'); }

  // run after app init + after sheet-sync pull (like utilAutoSyncPlanned hooks)
  window.addEventListener('load',function(){ setTimeout(function(){ try{ if(window.cardAutoSyncPlanned) cardAutoSyncPlanned(); }catch(e){ console.error('cardAutoSyncPlanned:',e); } }, 400); });
})();
