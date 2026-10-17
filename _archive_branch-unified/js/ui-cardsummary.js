/* ui-cardsummary.js — Card Summary view for CashMan.
 *
 * PURPOSE (user, Oct 15 2026): a READ-ONLY per-card / per-period summary of credit-card
 * statements — how much was SPENT (amount_due), PAID (paid_total), and OUTSTANDING (remaining)
 * each cycle. Reads window.CARD_BILLS.bills (written by parse_cardbills.py). Click a period row
 * to EXPAND its transactions from D.card_txns (no re-fetch). Nothing is recomputed beyond simple
 * sums — it DISPLAYS the stored statement fields.
 *
 * ISOLATION: self-contained IIFE. Defines ONLY window.renderCardSummary + private `_cs*` helpers.
 */
(function(){
  'use strict';
  var _csCard='';           // filter by card ('' = all)
  var _csOpen={};           // expanded period rows: key card||period -> true

  function _csBills(){ var b=(window.CARD_BILLS&&window.CARD_BILLS.bills); return Array.isArray(b)?b:[]; }
  function _csTxns(){ return (typeof D!=='undefined'&&D&&Array.isArray(D.card_txns))?D.card_txns:[]; }
  function _n(v){ var n=(typeof v==='number')?v:parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n)?0:n; }
  function _f(v){ return _n(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function _esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function _dmy(iso){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m?((+m[3])+'/'+(+m[2])+'/'+m[1]):_esc(iso||'-'); }

  var _KIND={purchase:'ซื้อ',payment:'จ่าย',adjustment:'ปรับปรุง',installment:'ผ่อน'};

  // v4 (user Oct 15 2026): PAID per period = sum of REAL bill payments in that period's txns.
  // A real payment = negative-amount txn whose desc contains "Payment" (e.g. "Payment via ttb touch").
  // Excludes Reversal-to-Installment, Cash Back, and merchant refunds (also negative, not payments).
  function _ym_next(period){
    var m=/^(\d{4})-(\d{2})$/.exec(String(period||'')); if(!m) return '';
    var y=+m[1], mo=+m[2]+1; if(mo>12){mo=1;y++;}
    return y+'-'+(mo<10?'0':'')+mo;
  }
  // v5 (user Oct 15 2026): a credit-card BILL PAYMENT posts to the NEXT statement cycle, not the one
  // it pays. So the payment FOR period N appears as the "Payment via ..." line INSIDE period N+1's
  // transactions. Read the next period's payment lines to get what was paid for THIS period. (The
  // latest period has no next statement yet -> returns 0 here, and _csPaid falls back to the manual
  // ledger the user set when they paid it by hand.)
  // v7 (user Oct 15 2026): "รูดใหม่" (new charges this cycle) must EXCLUDE reversal-to-installment.
  // A purchase that is moved to installments shows as BOTH the full purchase (+) AND a reversal (-)
  // of the same amount in the same statement, then reappears as the installment principal. Counting
  // txn_total + installment_total double-counts that purchase; subtracting the reversal cancels it,
  // leaving the true net new spend (= the bank's SUB TOTAL BALANCE line).
  function _csReversalForPeriod(card, period){
    var rows=_csTxns().filter(function(t){ return t.card===card && t.period===period; });
    var sum=0;
    rows.forEach(function(t){ var a=_n(t.amount); if(a<0 && /reversal/i.test(String(t.desc||''))) sum+=(-a); });
    return sum;  // positive magnitude of reversals
  }
  function _csRealPaidFromTxns(card, period){
    var nxt=_ym_next(period);
    var rows=_csTxns().filter(function(t){ return t.card===card && t.period===nxt; });
    var sum=0;
    rows.forEach(function(t){
      var a=_n(t.amount); if(a>=0) return;
      var d=String(t.desc||'');
      // v15 (user Oct 16 2026): count what SETTLES the statement — a real bill payment AND a credit
      // the bank applies to the balance (CASH REBATE / point redemption). Both reduce what is owed.
      // Still EXCLUDE reversal-to-installment (offset by its own installment charge) and merchant
      // refunds (reduce spend, not the prior statement's balance).
      if(/reversal/i.test(d)) return;
      if(/payment|cash\s*rebate|rebate|redem|redeem/i.test(d)) sum+=(-a);
    });
    return sum;
  }

  // v2 (user Oct 15 2026): paid status is the GROUND TRUTH in D.bill_payments (what the user marked
  // / what Bill Reminder shows), NOT card_bills.js paid_total (which is 0 for cards with no payment-
  // email matching, e.g. ttb/UOB). Read via window.cardPaidRecFor (prefix-matches CB|card|period::).
  // Returns {paid_total, paid_full} merging the ledger record over the file's paid_total fallback.
  function _csPaid(card, period, b){
    var due=_n(b&&b.amount_due);
    // 1) manual ledger override (user pressed Pay with a specific amount)
    var rec=null;
    try{ if(typeof window.cardPaidRecFor==='function') rec=window.cardPaidRecFor(card, period); }catch(e){}
    if(rec&&rec.paid&&_n(rec.paid_amount)>0){
      var pt=_n(rec.paid_amount);
      return { paid_total: pt, paid_full: due>0?(pt+0.01)>=due:false, paid_date: rec.paid_date||'' };
    }
    // 2) email-matched paid_total from card_bills.js (BAY/AIA/JCB via card_payments.json)
    var filePt=_n(b&&b.paid_total);
    if(filePt>0.005) return { paid_total: filePt, paid_full: !!(b&&b.paid_full), paid_date: (b&&b.paid_date)||'' };
    // 3) compute from the period's real "Payment ..." transactions (ttb/UOB with no email).
    // v16 (user Oct 16 2026): the credits that settle THIS statement appear in the NEXT statement's
    // transactions, but that next statement may ALSO contain credits that pay down ITS OWN new spend
    // (e.g. a point-redemption applied to new charges). Priority rule (user-locked): a credit pays the
    // CARRIED-OVER balance (this period's amount_due) FIRST; only the EXCESS belongs to the next
    // period. So cap the amount counted toward THIS period at its own amount_due — the overflow is not
    // this period's payment (it reduces the next period's spend instead), preventing a 1,000-due
    // statement from showing 1,200 "paid" when the next cycle redeemed 200 against new purchases.
    var tp=_csRealPaidFromTxns(card, period);
    if(due>0 && tp>due) tp=due;   // cap: carried-over balance first, excess belongs to the next period
    if(tp>0.005) return { paid_total: tp, paid_full: due>0?(tp+0.01)>=due:false, paid_date:'' };
    return { paid_total: 0, paid_full: false, paid_date:'' };
  }

  window.setCardSummaryFilter=function(v){ _csCard=v||''; try{ renderCardSummary(); }catch(e){ console.error(e); } };
  window.cardSummaryToggle=function(key){ _csOpen[key]=!_csOpen[key]; try{ renderCardSummary(); }catch(e){ console.error(e); } };

  function _csTxnRows(card, period){
    var rows=_csTxns().filter(function(t){ return t.card===card && t.period===period; });
    if(!rows.length) return '<div style="padding:6px 10px;color:var(--text3);font-size:10px">ไม่มีรายการ transaction ของงวดนี้</div>';
    rows.sort(function(a,b){ return String(a.txn_date||'').localeCompare(String(b.txn_date||'')); });
    var h='<table class="tbl" style="font-size:10px;width:100%;margin:4px 0">';
    h+='<thead><tr><th style="text-align:left">วันที่</th><th style="text-align:left">รายการ</th><th>ประเภท</th><th style="text-align:right">จำนวน</th></tr></thead><tbody>';
    rows.forEach(function(t){
      var inst=(t.kind==='installment'&&t.installment_seq)?(' <span style="color:var(--text3)">('+_esc(t.installment_seq)+')</span>'):'';
      // v12 (user Oct 15 2026): negative-amount rows (payments / credits / refunds / reversals) are
      // money going OUT of the balance — color them green so they stand out from charges (spending).
      var _neg=_n(t.amount)<0;
      var _rc=_neg?'color:var(--success,#16a34a)':'';
      h+='<tr style="'+_rc+'"><td style="white-space:nowrap">'+_dmy(t.txn_date||t.post_date)+'</td>'+
         '<td>'+_esc(t.desc||'-')+inst+'</td>'+
         '<td style="white-space:nowrap;color:'+(_neg?'var(--success,#16a34a)':'var(--text3)')+'">'+_esc(_KIND[t.kind]||t.kind||'-')+'</td>'+
         '<td style="text-align:right;font-variant-numeric:tabular-nums;'+_rc+'">'+_f(t.amount)+'</td></tr>';
    });
    h+='</tbody></table>';
    return h;
  }

  window.renderCardSummary=function(){
    var host=document.getElementById('cardsummary-content');
    if(!host) return;
    try{
      var bills=_csBills();
      if(!bills.length){
        host.innerHTML='<div class="card" style="text-align:center;color:var(--text3);padding:20px">'+
          '<i class="fa-solid fa-table-list" style="font-size:22px;opacity:.4"></i><div style="margin-top:8px;font-size:12px">ยังไม่มีข้อมูลบิลบัตรเครดิต<br>'+
          '<span style="font-size:10px">(รัน run_cardbills.bat เพื่ออ่าน statement)</span></div></div>';
        return;
      }
      // distinct cards for the filter
      var cardSet={}; bills.forEach(function(b){ if(b.card) cardSet[b.card]=1; });
      var cards=Object.keys(cardSet).sort();

      var view=bills.filter(function(b){ return !_csCard || b.card===_csCard; });

      // group by card
      var byCard={}; view.forEach(function(b){ (byCard[b.card]=byCard[b.card]||[]).push(b); });

      var h='';
      // filter bar
      h+='<div class="card" style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">';
      h+='<span style="font-size:11px;font-weight:600"><i class="fa-solid fa-filter" style="margin-right:4px"></i>บัตร:</span>';
      h+='<select class="inp" style="font-size:11px;padding:2px 6px" onchange="setCardSummaryFilter(this.value)">';
      h+='<option value="">ทุกบัตร</option>';
      cards.forEach(function(c){ h+='<option value="'+_esc(c)+'"'+(c===_csCard?' selected':'')+'>'+_esc(c)+'</option>'; });
      h+='</select><span style="flex:1"></span><span style="font-size:10px;color:var(--text3)">คลิกงวดเพื่อดู transaction</span></div>';
      // chart: net new charges (รูดใหม่) per period, filtered by card (or all)
      h+='<div class="card" style="margin-bottom:8px"><div id="cardsummary-chart" style="height:260px"></div></div>';

      Object.keys(byCard).sort().forEach(function(card){
        var rows=byCard[card].slice().sort(function(a,b){ return String(b.period||'').localeCompare(String(a.period||'')); });
        // card-level totals
        // v6: card totals — ใช้ = sum of NEW charges (txn+installment) across periods (NOT amount_due,
        // which double-counts carried balances); จ่าย = sum paid; ค้าง = the LATEST period's outstanding
        // (its บิลรวม - จ่าย), i.e. what is still owed now (carried balances already fold into it).
        var tSpent=0,tPaid=0;
        rows.forEach(function(b){ var ps=_csPaid(card,b.period,b); tSpent+=Math.max(0,_n(b.txn_total)+_n(b.installment_total)-_csReversalForPeriod(card,b.period)); tPaid+=ps.paid_total; });
        var _latest=rows.slice().sort(function(a,b){return String(b.period||'').localeCompare(String(a.period||''));})[0];
        var tRem=0; if(_latest){ var _lp=_csPaid(card,_latest.period,_latest); tRem=Math.max(0,_n(_latest.amount_due)-_lp.paid_total); }
        h+='<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden">';
        h+='<div style="background:var(--bg3,#f1f5f9);padding:8px 12px;font-weight:700;font-size:12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px">'+
           '<span>💳 '+_esc(card)+'</span><span style="flex:1"></span>'+
           '<span style="font-size:10px;font-weight:600;color:var(--text3)">ใช้ '+_f(tSpent)+' · จ่าย '+_f(tPaid)+' · ค้าง <b style="color:'+(tRem>0.005?'var(--error,#dc2626)':'var(--success,#16a34a)')+'">'+_f(tRem)+'</b></span></div>';
        // table
        h+='<table class="tbl" style="font-size:11px;width:100%">';
        h+='<thead><tr><th style="text-align:left">งวด</th><th style="text-align:left">statement</th>'+
           '<th style="text-align:right">ยกมา</th><th style="text-align:right">รูดใหม่</th><th style="text-align:right">บิลรวม</th><th style="text-align:right">จ่าย</th><th style="text-align:right">ค้าง</th><th>สถานะ</th></tr></thead><tbody>';
        // v6 (user Oct 15 2026): real columns. ยกมา(carried) = PREVIOUS period's (บิลรวม - จ่าย) = the
        // amount that was still outstanding and rolled into this cycle. รูดใหม่(new charges this cycle) =
        // txn_total + installment_total. บิลรวม(total billed) = amount_due = carried + new - discounts.
        // Build a period -> {due, paid} map across THIS card's rows so we can look up the previous period.
        var _info={};
        rows.forEach(function(x){ var pp=_csPaid(card,x.period,x); _info[x.period]={due:_n(x.amount_due),paid:pp.paid_total}; });
        function _prevPeriod(per){ var m=/^(\d{4})-(\d{2})$/.exec(String(per||'')); if(!m) return ''; var y=+m[1],mo=+m[2]-1; if(mo<1){mo=12;y--;} return y+'-'+(mo<10?'0':'')+mo; }
        rows.forEach(function(b){
          var key=card+'||'+b.period;
          var ps=_csPaid(card,b.period,b);
          var spent=_n(b.amount_due);
          var paidT=ps.paid_total;
          var rem=Math.max(0, spent-paidT);
          // carried = previous period's outstanding (its บิลรวม - its จ่าย); new charges = txn + installment
          var newCharge=Math.max(0, _n(b.txn_total)+_n(b.installment_total)-_csReversalForPeriod(card,b.period));
          // v11 (user Oct 15 2026): ยกมา (carried-over) = บิลรวม − รูดใหม่. The total bill IS carried +
          // new charges (minus discounts), so the real carried balance is simply amount_due − newCharge.
          // This is self-consistent (ยกมา + รูดใหม่ === บิลรวม always) and works for the earliest period
          // too, without needing prev_balance or a prior row.
          var carried=Math.max(0, _n(b.amount_due)-newCharge);
          var paidFull=ps.paid_full;
          var st=paidFull?'<span style="color:var(--success,#16a34a);font-weight:600">✓ จ่ายครบ</span>'
                 :(paidT>0.005?'<span style="color:var(--warning,#d97706);font-weight:600">จ่ายบางส่วน</span>'
                 :'<span style="color:var(--error,#dc2626);font-weight:600">ค้าง</span>');
          var open=_csOpen[key];
          h+='<tr style="cursor:pointer" onclick="cardSummaryToggle(\''+_esc(key).replace(/'/g,"\\'")+'\')">'+
             '<td style="white-space:nowrap;font-weight:600">'+(open?'▾ ':'▸ ')+_esc(b.period)+'</td>'+
             '<td style="white-space:nowrap">'+_dmy(b.stmt_date)+'</td>'+
             '<td style="text-align:right;font-variant-numeric:tabular-nums;color:var(--text3)">'+_f(carried)+'</td>'+
             '<td style="text-align:right;font-variant-numeric:tabular-nums">'+_f(newCharge)+'</td>'+
             '<td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600">'+_f(b.amount_due)+'</td>'+
             '<td style="text-align:right;font-variant-numeric:tabular-nums">'+_f(paidT)+'</td>'+
             '<td style="text-align:right;font-variant-numeric:tabular-nums;color:'+(rem>0.005?'var(--error,#dc2626)':'inherit')+'">'+_f(rem)+'</td>'+
             '<td style="white-space:nowrap">'+st+'</td></tr>';
          if(open){
            h+='<tr><td colspan="8" style="background:var(--bg2,#fafafa);padding:0 10px">'+_csTxnRows(card,b.period)+'</td></tr>';
          }
        });
        h+='</tbody></table></div>';
      });

      host.innerHTML=h;
      try{ _csChart(byCard, _csCard); }catch(e){ console.error('_csChart:',e); }
    }catch(e){
      console.error('renderCardSummary failed',e);
      host.innerHTML='<div class="card" style="color:var(--error)">แสดง summary ไม่สำเร็จ: '+_esc(e&&e.message)+'</div>';
    }
  };

  // v14 (user Oct 15 2026): Card Summary chart — compare net new charges (รูดใหม่) across periods.
  // When a single card is filtered, one column series for that card. When "ทุกบัตร", a stacked column
  // per card so you see each card's contribution + the monthly total. A dashed average line shows the
  // mean monthly spend across the periods shown. Net new charge = txn_total + installment_total − reversal.
  function _csNewCharge(b){ return Math.max(0, _n(b.txn_total)+_n(b.installment_total)-_csReversalForPeriod(b.card,b.period)); }
  function _csChart(byCard, filterCard){
    var el=document.getElementById('cardsummary-chart'); if(!el||typeof Highcharts==='undefined') return;
    var dk=document.documentElement.classList.contains('dark');
    var tc=dk?'#e8eaed':'#1a1d27', tc2=dk?'#6b7185':'#7a8098', gc=dk?'#353849':'#d4d7e0', bg2=dk?'#1a1d27':'#fff';
    var pal=(typeof COLORS!=='undefined'&&COLORS)||['#4a7aed','#16a34a','#d97706','#dc2626','#7c3aed'];
    // all periods present across the shown cards, ascending
    var perSet={}; Object.keys(byCard).forEach(function(c){ byCard[c].forEach(function(b){ if(b.period) perSet[b.period]=1; }); });
    var periods=Object.keys(perSet).sort();
    if(!periods.length){ el.innerHTML=''; return; }
    var cards=Object.keys(byCard).sort();
    var series=cards.map(function(c,ci){
      var byPer={}; byCard[c].forEach(function(b){ byPer[b.period]=_csNewCharge(b); });
      return { name:c, data:periods.map(function(p){ return Math.round((byPer[p]||0)*100)/100; }), color:pal[ci%pal.length] };
    });
    // average line = mean of monthly TOTALS (sum across cards per period)
    var totals=periods.map(function(p){ return series.reduce(function(s,sr,i){ return s+(sr.data[i]||0); },0); });
    var avg=totals.length?totals.reduce(function(a,b){return a+b;},0)/totals.length:0;
    var single=(filterCard&&cards.length===1);
    Highcharts.chart('cardsummary-chart',{
      chart:{type:'column',backgroundColor:'transparent'},
      title:{text:(single?filterCard:'ทุกบัตร')+' — รูดใหม่ต่องวด',style:{color:tc,fontWeight:'600',fontSize:'13px'}},
      credits:{enabled:false},
      xAxis:{categories:periods,labels:{style:{color:tc2,fontSize:'9px'}},lineColor:gc},
      yAxis:{title:{text:null},gridLineColor:gc,labels:{style:{color:tc2,fontSize:'9px'}},
             plotLines:[{value:avg,color:dk?'#fbbf24':'#d97706',dashStyle:'Dash',width:1.5,zIndex:5,
                         label:{text:'เฉลี่ย '+Highcharts.numberFormat(avg,0),style:{color:dk?'#fbbf24':'#d97706',fontSize:'9px'},align:'right'}}]},
      legend:{enabled:!single,itemStyle:{color:tc2,fontSize:'9px'}},
      tooltip:{backgroundColor:bg2,borderColor:gc,style:{color:tc,fontSize:'10px'},shared:true,valueDecimals:2,valuePrefix:'฿'},
      plotOptions:{column:{stacking:single?undefined:'normal',borderWidth:0}},
      series:series
    });
  }
})();


// v13 (user Oct 15 2026): Credit Cards sub-tab switcher. The 3 card VIEW pages (Card Summary,
// Card Transactions, Card Data raw) moved here from Bills & Plans; Overview = the original card
// management page. Mirrors swAn/swBills: toggle sub-tab + sub-panel, then run that panel's render.
window.swCC=function(el,tab){
  try{
    el.parentElement.querySelectorAll('.sub-tab').forEach(function(t){t.classList.remove('active');});
    el.classList.add('active');
    document.querySelectorAll('#tab-creditcards .sub-panel').forEach(function(p){p.classList.remove('active');});
    var pane=document.getElementById('cc-'+tab); if(pane) pane.classList.add('active');
    if(tab==='overview'){ try{renderCreditCards();}catch(e){console.error('renderCreditCards:',e);} }
    else if(tab==='ccsummary'){ try{renderCardSummary();}catch(e){console.error('renderCardSummary:',e);} }
    else if(tab==='cctxns'){ try{renderCardTxns();}catch(e){console.error('renderCardTxns:',e);} }
    else if(tab==='ccdata'){ try{renderCardRaw();}catch(e){console.error('renderCardRaw:',e);} }
  }catch(e){ console.error('swCC:',e); }
};
