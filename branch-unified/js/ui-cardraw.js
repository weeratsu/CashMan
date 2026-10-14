/* ui-cardraw.js — Card Data (RAW) debug view for CashMan.
 *
 * PURPOSE (user, Oct 11 2026): a READ-ONLY page that shows the RAW backend data
 * exactly as stored — window.CARD_BILLS (from card_bills.js, written by
 * parse_cardbills.py) and D.cards (card settings). It does NOT recompute period,
 * due, deadline or paid status — it only DISPLAYS what the backend already holds,
 * so you can verify the stored data is correct using the same values every other
 * page reads.
 *
 * ISOLATION: this module is fully self-contained. It defines ONLY window.renderCardRaw
 * and private helpers prefixed `_cr`. It does NOT modify or depend on ui-bills.js,
 * ui-cardsync.js, ui-billreminder.js or simulation.js. If it throws, its single
 * try/caught entry point keeps the rest of the app unaffected.
 *
 * The ONLY computed value here is each card's "current period" convenience line,
 * and it is clearly labelled as a display-time hint (not backend data). Everything
 * else is printed verbatim from the stored objects.
 */
(function(){
  'use strict';

  // v320: sortable Card Data (raw) table. Default = card name ascending. Clicking a header cycles
  // asc -> desc -> back to default (name asc). State is module-level, mirrors ui-billreminder pattern.
  var _crSort='name', _crAsc=true;
  // sortable value per column key — matches the header order below.
  function _crSortVal(c,col){
    var S=parseInt(c&&c.statement_day)||0;
    var rule=(c&&(c.period_rule==='prev'||c.period_rule==='same'))?c.period_rule:((S<=15)?'prev':'same');
    switch(col){
      case 'name':   return (''+(c.name||'')).toLowerCase();
      case 'last4':  return (''+(c.last4||''));
      case 'statement_day': return S;
      case 'period_rule':   return rule;
      case 'due_offset':    return parseInt(c&&c.due_offset)||0;
      case 'deadline':      return parseInt(c&&c.deadline)||0;
      case 'payment_day':   return parseInt(c&&c.payment_day)||0;
      case 'pdf':    return (window.CARD_BILLS&&(window.CARD_BILLS.bills||[]).some(function(b){return b&&b.card===c.name;}))?1:0;
      case 'period': return _crCurrentPeriod(c)||'';
      case 'due':    { var pr=_crDueForPeriod(c,_crCurrentPeriod(c))||''; var mm=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(pr); return mm?(mm[3]+mm[2]+mm[1]):pr; }
      default: return '';
    }
  }
  function _crSortCards(cards){
    var arr=cards.slice();
    arr.sort(function(a,b){
      var va=_crSortVal(a,_crSort), vb=_crSortVal(b,_crSort), r;
      if(typeof va==='number'&&typeof vb==='number') r=va-vb; else r=(''+va).localeCompare(''+vb);
      if(r===0) r=(''+(a.name||'')).toLowerCase().localeCompare((''+(b.name||'')).toLowerCase());
      return _crAsc?r:-r;
    });
    return arr;
  }
  function _crArrow(col){ if(_crSort!==col) return ''; return _crAsc?' \u25b2':' \u25bc'; }
  window.setCardRawSort=function(col){
    if(_crSort===col){ if(_crAsc){_crAsc=false;} else { _crSort='name'; _crAsc=true; } }
    else { _crSort=col; _crAsc=true; }
    try{ window.renderCardRaw(); }catch(e){ console.error(e); }
  };

  function _crEsc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function _crMoney(x){ var n=parseFloat(x); return isNaN(n)?'—':('฿'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})); }
  function _crDMY(iso){ if(!iso) return '—'; var p=String(iso).slice(0,10).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):_crEsc(iso); }
  function _crNum(x){ return (x==null||x==='')?'—':_crEsc(x); }

  // Display-time hint ONLY (clearly labelled): which period is "current" as of today,
  // from the card's statement_day. Mirrors the period rule but is NOT backend data —
  // it's a convenience so you can see which stored bill SHOULD be the current one.
  function _crCurrentPeriod(card){
    // v319: honor the stored per-card period_rule (prev/same) instead of the old day<=15 guess.
    var S=parseInt(card&&card.statement_day); if(isNaN(S)) return null;
    var rule=(card&&(card.period_rule==='prev'||card.period_rule==='same'))?card.period_rule:((S<=15)?'prev':'same');
    var now=new Date(); var y=now.getFullYear(), m=now.getMonth(); // m 0-based
    // most recent statement date on/before today
    var recent=new Date(y,m,Math.min(S,_crDim(y,m)));
    if(recent>now){ m-=1; if(m<0){m=11;y-=1;} recent=new Date(y,m,Math.min(S,_crDim(y,m))); }
    var ry=recent.getFullYear(), rm=recent.getMonth();
    var pm,py;
    if(rule==='prev'){ pm=rm-1; py=ry; if(pm<0){pm=11;py-=1;} } else { pm=rm; py=ry; }
    return py+'-'+(pm+1<10?'0':'')+(pm+1);
  }
  function _crDim(y,m){ return new Date(y,m+1,0).getDate(); }
  // v319: due for a given period "YYYY-MM" = statement_day+due_offset in the STATEMENT month.
  // statement month = period month + (1 if period_rule 'prev' else 0). Mirrors the adapter rule.
  function _crDueForPeriod(c,per){
    if(!per||!/^\d{4}-\d{2}$/.test(per)) return null;
    var S=parseInt(c&&c.statement_day)||1, off=parseInt(c&&c.due_offset)||0;
    var rule=(c&&(c.period_rule==='prev'||c.period_rule==='same'))?c.period_rule:((S<=15)?'prev':'same');
    var py=parseInt(per.split('-')[0]), pm0=parseInt(per.split('-')[1])-1;
    var sm=pm0+(rule==='prev'?1:0), sy=py; while(sm>11){sm-=12;sy++;}
    var day=Math.min(S+off,_crDim(sy,sm));
    return (day<10?'0':'')+day+'/'+(sm+1<10?'0':'')+(sm+1)+'/'+sy;
  }

  window.renderCardRaw=function(){
    var host=document.getElementById('carddata-content');
    if(!host) return;
    try{
      var cards=(typeof D!=='undefined'&&D&&Array.isArray(D.cards))?D.cards:[];
      var CB=(window.CARD_BILLS&&Array.isArray(window.CARD_BILLS.bills))?window.CARD_BILLS.bills:[];
      var gen=(window.CARD_BILLS&&window.CARD_BILLS.generated_at)||null;

      // index bills by card name (raw, no transform)
      var billsByCard={};
      CB.forEach(function(b){ if(!b) return; (billsByCard[b.card]=billsByCard[b.card]||[]).push(b); });
      var pdfSet={}; CB.forEach(function(b){ if(b&&b.card) pdfSet[b.card]=1; });

      var h='';
      h+='<div style="font-size:11px;color:var(--text3);margin:2px 0 10px">'
        +'<i class="fa-solid fa-database" style="margin-right:4px"></i>'
        +'ข้อมูลดิบจากหลังบ้าน (read-only) · ไม่คำนวณใหม่ · บัตร '+cards.length+' ใบ · บิล PDF '+CB.length+' รายการ'
        +(gen?(' · card_bills generate ล่าสุด '+_crEsc(gen)):'')
        +'</div>';

      // ---- Table 1: all cards (D.cards) raw settings + current-period hint ----
      h+='<div class="card" style="margin-bottom:12px"><h3 style="margin:0 0 6px;font-size:13px"><i class="fa-solid fa-id-card" style="margin-right:5px"></i>บัตรทั้งหมดใน CM (D.cards) — ค่าตั้งดิบ</h3>';
      h+='<div style="overflow-x:auto"><table class="tbl" style="width:100%;border-collapse:collapse;font-size:11px">';
      h+='<thead><tr>'
        +_crThSort('ชื่อบัตร','name')+_crThSort('last4','last4')+_crThSort('statement_day','statement_day')+_crThSort('period_rule','period_rule')+_crThSort('due_offset','due_offset')+_crThSort('deadline','deadline')
        +_crThSort('payment_day','payment_day')+_crThSort('มีบิล PDF?','pdf')+_crThSort('งวดปัจจุบัน (hint)','period')+_crThSort('due (งวดนี้)','due')
        +'</tr></thead><tbody>';
      _crSortCards(cards).forEach(function(c){
        var cur=_crCurrentPeriod(c);
        var _rule=(c.period_rule==='prev'||c.period_rule==='same')?c.period_rule:((parseInt(c.statement_day)||1)<=15?'prev':'same');
        var _due=_crDueForPeriod(c,cur);
        h+='<tr>'
          +_crTd('<b>'+_crEsc(c.name)+'</b>')
          +_crTd('<span class="mono">'+_crNum(c.last4)+'</span>')
          +_crTd(_crNum(c.statement_day),'center')
          +_crTd('<b>'+_rule+'</b>','center')
          +_crTd(c.due_offset==null?'—':('+'+_crEsc(c.due_offset)),'center')
          +_crTd(_crNum(c.deadline),'center')
          +_crTd(_crNum(c.payment_day),'center')
          +_crTd(pdfSet[c.name]?'<span style="color:#1d4ed8">📄 ใช่</span>':'<span style="color:var(--text3)">✍️ ไม่</span>','center')
          +_crTd('<b>'+_crNum(cur)+'</b>','center')
          +_crTd('<b>'+_crNum(_due)+'</b>','center')
          +'</tr>';
      });
      if(!cards.length) h+='<tr><td colspan="10" style="text-align:center;color:var(--text3);padding:10px">ไม่มีบัตรใน D.cards</td></tr>';
      h+='</tbody></table></div>';
      h+='<div style="font-size:10px;color:var(--text3);margin-top:5px">“งวดปัจจุบัน (hint)” เป็นค่าคำนวณ ณ เวลาที่เปิดหน้า เพื่อให้รู้ว่าบิลงวดไหนควรเป็นงวดล่าสุด — ไม่ใช่ข้อมูลที่เก็บในหลังบ้าน ส่วนคอลัมน์อื่นเป็นค่าดิบจาก D.cards ตรง ๆ</div>';
      h+='</div>';

      // ---- Table 2: raw bills (window.CARD_BILLS.bills) verbatim ----
      h+='<div class="card"><h3 style="margin:0 0 6px;font-size:13px"><i class="fa-solid fa-file-invoice" style="margin-right:5px"></i>บิลที่อ่านได้ (window.CARD_BILLS.bills) — ค่าดิบทุก field</h3>';
      if(!CB.length){
        h+='<p style="color:var(--text3);font-size:11px;margin:4px 0">ยังไม่มีบิลใน card_bills.js</p>';
      } else {
        cards.forEach(function(c){
          var bs=billsByCard[c.name]; if(!bs||!bs.length) return;
          bs.sort(function(a,b){ return String(b.period||'').localeCompare(String(a.period||'')); });
          h+='<div style="margin:10px 0 4px;font-weight:700;font-size:12px;color:#be123c">'+_crEsc(c.name)+' <span class="mono" style="color:var(--text3);font-weight:400">••'+_crNum(c.last4)+'</span></div>';
          h+='<div style="overflow-x:auto"><table class="tbl" style="width:100%;border-collapse:collapse;font-size:10px">';
          h+='<thead><tr>'
            +_crTh('period')+_crTh('stmt_date')+_crTh('due_date')+_crTh('amount_due')+_crTh('min_due')
            +_crTh('txn_total')+_crTh('installment_total')+_crTh('adjustment_total')+_crTh('total_payments')
            +_crTh('prev_balance')+_crTh('points')+_crTh('paid_full')+_crTh('paid_total')+_crTh('paid_date')
            +_crTh('remaining')+_crTh('payments[]')+_crTh('unmatched_payments[]')+_crTh('source_file')
            +'</tr></thead><tbody>';
          bs.forEach(function(b){
            var pays=(b.payments||[]).map(function(p){ return _crMoney(p.amount)+' <span style="color:var(--text3)">·'+_crDMY(p.paid_at)+(p.carry?' ·carry':'')+(p.ref?(' ·'+_crEsc(p.ref)):'')+'</span>'; }).join('<br>')||'—';
            var um=(b.unmatched_payments||[]).map(function(p){ return '<span style="color:#be123c">'+_crMoney(p.amount)+'</span> <span style="color:var(--text3)">·'+_crDMY(p.paid_at)+(p.ref?(' ·'+_crEsc(p.ref)):'')+'</span>'; }).join('<br>')||'—';
            h+='<tr>'
              +_crTd('<b>'+_crNum(b.period)+'</b>','center')
              +_crTd(_crDMY(b.stmt_date),'center')
              +_crTd(_crDMY(b.due_date),'center')
              +_crTd('<b>'+_crMoney(b.amount_due)+'</b>','right mono')
              +_crTd(_crMoney(b.min_due),'right mono')
              +_crTd(_crMoney(b.txn_total),'right mono')
              +_crTd(_crMoney(b.installment_total),'right mono')
              +_crTd(_crMoney(b.adjustment_total),'right mono')
              +_crTd(_crMoney(b.total_payments),'right mono')
              +_crTd(_crMoney(b.prev_balance),'right mono')
              +_crTd(_crNum(b.points_balance),'center mono')
              +_crTd(b.paid_full?'<span style="color:#047857">✅ true</span>':'<span style="color:#be123c">false</span>','center')
              +_crTd(_crMoney(b.paid_total),'right mono')
              +_crTd(_crDMY(b.paid_date),'center')
              +_crTd(_crMoney(b.remaining),'right mono')
              +_crTd(pays,'right mono')
              +_crTd(um,'right mono')
              +_crTd('<span style="color:var(--text3)">'+_crEsc(b.source_file)+'</span>','mono')
              +'</tr>';
          });
          h+='</tbody></table></div>';
        });
      }
      h+='</div>';

      host.innerHTML=h;
    }catch(e){
      host.innerHTML='<div style="color:#be123c;font-size:12px;padding:10px">renderCardRaw error: '+_crEsc(e&&e.message?e.message:e)+'</div>';
      if(window.console)console.error('renderCardRaw:',e);
    }
  };

  function _crTh(t){ return '<th style="text-align:center;padding:5px 7px;border-bottom:2px solid var(--border);background:var(--bg3);white-space:nowrap">'+t+'</th>'; }
  function _crThSort(label,col){ return '<th onclick="setCardRawSort(\''+col+'\')" title="Sort" style="cursor:pointer;text-align:center;padding:5px 7px;border-bottom:2px solid var(--border);background:var(--bg3);white-space:nowrap;user-select:none">'+label+_crArrow(col)+'</th>'; }
  function _crTd(html,cls){
    cls=cls||'';
    var align = cls.indexOf('right')>=0?'right':(cls.indexOf('center')>=0?'center':'left');
    var mono = cls.indexOf('mono')>=0?'font-family:ui-monospace,Menlo,Consolas,monospace;':'';
    return '<td style="text-align:'+align+';padding:4px 7px;border-bottom:1px solid var(--border);'+mono+'vertical-align:top;white-space:nowrap">'+html+'</td>';
  }
})();
