/* ui-cardtxns.js — Card Transactions view for CashMan.
 *
 * PURPOSE (user, Oct 15 2026): a READ-ONLY page listing per-transaction credit-card
 * detail stored in D.card_txns (merged from the private card_txns_local.js written by
 * parse_cardbills.py, then carried across devices by the normal Sheet sync). Shows
 * date / description / amount / kind per card+period, with filters by card and period,
 * sortable columns, and per-filter totals. Nothing is recomputed — it DISPLAYS the
 * stored rows verbatim.
 *
 * ISOLATION: self-contained IIFE. Defines ONLY window.renderCardTxns + private `_ct*`
 * helpers. Does not touch other modules. A single try/catch keeps the app safe if it throws.
 *
 * Row shape (from parse_cardbills.py _push): {card,last4,period,kind,txn_date,post_date,desc,amount}
 *   kind: purchase | payment | adjustment | installment  (installment also: installment_seq, installment_principal)
 */
(function(){
  'use strict';
  var _ctCard='', _ctPeriod='', _ctSort='txn_date', _ctAsc=true;

  function _ctRows(){ return (typeof D!=='undefined'&&D&&Array.isArray(D.card_txns))?D.card_txns:[]; }
  function _ctNum(v){ var n=(typeof v==='number')?v:parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n)?0:n; }
  function _ctFmt(n){ return _ctNum(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function _ctEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  var _KIND={purchase:{t:'ซื้อ',c:'var(--text1)'},payment:{t:'จ่าย',c:'var(--success,#16a34a)'},
             adjustment:{t:'ปรับปรุง',c:'var(--warning,#d97706)'},installment:{t:'ผ่อน',c:'var(--accent,#2563eb)'}};

  function _ctKindBadge(k){ var m=_KIND[k]||{t:k||'-',c:'var(--text3)'};
    return '<span style="font-size:9px;font-weight:600;color:'+m.c+'">'+_ctEsc(m.t)+'</span>'; }

  function _ctDMY(iso){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); if(!m) return _ctEsc(iso||'-');
    return (+m[3])+'/'+(+m[2])+'/'+m[1]; }

  function _ctSortVal(t,col){
    switch(col){
      case 'txn_date': return String(t.txn_date||t.post_date||'');
      case 'desc':     return String(t.desc||'').toLowerCase();
      case 'amount':   return _ctNum(t.amount);
      case 'kind':     return String(t.kind||'');
      case 'card':     return String(t.card||'').toLowerCase();
      case 'period':   return String(t.period||'');
      default:         return '';
    }
  }
  window.setCardTxnSort=function(col){
    if(_ctSort===col){ _ctAsc=!_ctAsc; } else { _ctSort=col; _ctAsc=true; }
    try{ renderCardTxns(); }catch(e){ console.error(e); }
  };
  window.setCardTxnFilter=function(which,val){
    if(which==='card') _ctCard=val||''; else if(which==='period') _ctPeriod=val||'';
    try{ renderCardTxns(); }catch(e){ console.error(e); }
  };

  function _ctArrow(col){ if(_ctSort!==col) return ''; return _ctAsc?' \u25b2':' \u25bc'; }

  window.renderCardTxns=function(){
    var host=document.getElementById('cardtxns-content');
    if(!host) return;
    try{
      var rows=_ctRows();
      if(!rows.length){
        host.innerHTML='<div class="card" style="text-align:center;color:var(--text3);padding:20px">'+
          '<i class="fa-solid fa-receipt" style="font-size:22px;opacity:.4"></i><div style="margin-top:8px;font-size:12px">'+
          'ยังไม่มีรายการ transaction<br><span style="font-size:10px">(parse_cardbills.py จะเขียน detail ลง card_txns_local เมื่ออ่าน statement ที่มีรายการ แล้ว sync เข้ามาเอง)</span></div></div>';
        return;
      }
      // distinct cards + periods for filters
      var cards={}, periods={};
      rows.forEach(function(t){ if(t.card)cards[t.card]=1; if(t.period)periods[t.period]=1; });
      var cardList=Object.keys(cards).sort();
      var perList=Object.keys(periods).sort().reverse();

      // apply filters
      var view=rows.filter(function(t){
        if(_ctCard && t.card!==_ctCard) return false;
        if(_ctPeriod && t.period!==_ctPeriod) return false;
        return true;
      });
      // sort
      view.sort(function(a,b){
        var va=_ctSortVal(a,_ctSort), vb=_ctSortVal(b,_ctSort), r;
        if(typeof va==='number'&&typeof vb==='number') r=va-vb; else r=String(va).localeCompare(String(vb));
        return _ctAsc?r:-r;
      });

      // totals by kind
      var tot={purchase:0,payment:0,adjustment:0,installment:0};
      view.forEach(function(t){ var k=t.kind||'purchase'; if(!(k in tot))tot[k]=0; tot[k]+=_ctNum(t.amount); });

      var h='';
      // filter bar
      h+='<div class="card" style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">';
      h+='<span style="font-size:11px;font-weight:600"><i class="fa-solid fa-filter" style="margin-right:4px"></i>กรอง:</span>';
      h+='<select class="inp" style="font-size:11px;padding:2px 6px" onchange="setCardTxnFilter(\'card\',this.value)">';
      h+='<option value="">ทุกบัตร</option>';
      cardList.forEach(function(c){ h+='<option value="'+_ctEsc(c)+'"'+(c===_ctCard?' selected':'')+'>'+_ctEsc(c)+'</option>'; });
      h+='</select>';
      h+='<select class="inp" style="font-size:11px;padding:2px 6px" onchange="setCardTxnFilter(\'period\',this.value)">';
      h+='<option value="">ทุกงวด</option>';
      perList.forEach(function(p){ h+='<option value="'+_ctEsc(p)+'"'+(p===_ctPeriod?' selected':'')+'>'+_ctEsc(p)+'</option>'; });
      h+='</select>';
      h+='<span style="flex:1"></span><span style="font-size:10px;color:var(--text3)">'+view.length+' รายการ</span>';
      h+='</div>';

      // totals chips
      h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">';
      [['purchase','ซื้อ'],['installment','ผ่อน'],['payment','จ่าย'],['adjustment','ปรับปรุง']].forEach(function(p){
        if(Math.abs(tot[p[0]])<0.005) return;
        var m=_KIND[p[0]];
        h+='<span style="font-size:10px;padding:3px 8px;border-radius:10px;background:var(--bg3,#f1f5f9);border:1px solid var(--border,#e2e8f0)">'+
           p[1]+': <b style="color:'+(m?m.c:'inherit')+'">'+_ctFmt(tot[p[0]])+'</b></span>';
      });
      h+='</div>';

      // table
      h+='<div style="overflow-x:auto"><table class="tbl" style="font-size:11px;width:100%;min-width:560px">';
      h+='<thead><tr>';
      h+='<th style="cursor:pointer;white-space:nowrap;text-align:left" onclick="setCardTxnSort(\'txn_date\')">วันที่'+_ctArrow('txn_date')+'</th>';
      h+='<th style="cursor:pointer;text-align:left" onclick="setCardTxnSort(\'desc\')">รายการ'+_ctArrow('desc')+'</th>';
      h+='<th style="cursor:pointer;white-space:nowrap" onclick="setCardTxnSort(\'kind\')">ประเภท'+_ctArrow('kind')+'</th>';
      if(!_ctCard) h+='<th style="cursor:pointer;white-space:nowrap;text-align:left" onclick="setCardTxnSort(\'card\')">บัตร'+_ctArrow('card')+'</th>';
      if(!_ctPeriod) h+='<th style="cursor:pointer;white-space:nowrap" onclick="setCardTxnSort(\'period\')">งวด'+_ctArrow('period')+'</th>';
      h+='<th style="cursor:pointer;white-space:nowrap;text-align:right" onclick="setCardTxnSort(\'amount\')">จำนวน'+_ctArrow('amount')+'</th>';
      h+='</tr></thead><tbody>';
      view.forEach(function(t){
        var inst=(t.kind==='installment'&&t.installment_seq)?(' <span style="font-size:9px;color:var(--text3)">('+_ctEsc(t.installment_seq)+')</span>'):'';
        h+='<tr>';
        h+='<td style="white-space:nowrap">'+_ctDMY(t.txn_date||t.post_date)+'</td>';
        h+='<td>'+_ctEsc(t.desc||'-')+inst+'</td>';
        h+='<td style="white-space:nowrap">'+_ctKindBadge(t.kind)+'</td>';
        if(!_ctCard) h+='<td style="white-space:nowrap">'+_ctEsc(t.card||'-')+'</td>';
        if(!_ctPeriod) h+='<td style="white-space:nowrap">'+_ctEsc(t.period||'-')+'</td>';
        h+='<td style="white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums">'+_ctFmt(t.amount)+'</td>';
        h+='</tr>';
      });
      h+='</tbody></table></div>';

      host.innerHTML=h;
    }catch(e){
      console.error('renderCardTxns failed',e);
      host.innerHTML='<div class="card" style="color:var(--error)">แสดง transactions ไม่สำเร็จ: '+_ctEsc(e&&e.message)+'</div>';
    }
  };
})();
