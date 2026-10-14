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

  function _crEsc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function _crMoney(x){ var n=parseFloat(x); return isNaN(n)?'—':('฿'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})); }
  function _crDMY(iso){ if(!iso) return '—'; var p=String(iso).slice(0,10).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):_crEsc(iso); }
  function _crNum(x){ return (x==null||x==='')?'—':_crEsc(x); }

  // Display-time hint ONLY (clearly labelled): which period is "current" as of today,
  // from the card's statement_day. Mirrors the period rule but is NOT backend data —
  // it's a convenience so you can see which stored bill SHOULD be the current one.
  function _crCurrentPeriod(statement_day){
    var S=parseInt(statement_day); if(isNaN(S)) return null;
    var now=new Date(); var y=now.getFullYear(), m=now.getMonth(); // m 0-based
    // most recent statement date on/before today
    var recent=new Date(y,m,Math.min(S,_crDim(y,m)));
    if(recent>now){ m-=1; if(m<0){m=11;y-=1;} recent=new Date(y,m,Math.min(S,_crDim(y,m))); }
    var ry=recent.getFullYear(), rm=recent.getMonth(), rd=recent.getDate();
    var pm,py;
    if(rd<=15){ pm=rm-1; py=ry; if(pm<0){pm=11;py-=1;} } else { pm=rm; py=ry; }
    return py+'-'+(pm+1<10?'0':'')+(pm+1);
  }
  function _crDim(y,m){ return new Date(y,m+1,0).getDate(); }

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
        +_crTh('ชื่อบัตร')+_crTh('last4')+_crTh('statement_day')+_crTh('due_offset')+_crTh('deadline')
        +_crTh('payment_day')+_crTh('มีบิล PDF?')+_crTh('งวดปัจจุบัน (hint)')
        +'</tr></thead><tbody>';
      cards.forEach(function(c){
        var cur=_crCurrentPeriod(c.statement_day);
        h+='<tr>'
          +_crTd('<b>'+_crEsc(c.name)+'</b>')
          +_crTd('<span class="mono">'+_crNum(c.last4)+'</span>')
          +_crTd(_crNum(c.statement_day),'center')
          +_crTd(c.due_offset==null?'—':('+'+_crEsc(c.due_offset)),'center')
          +_crTd(_crNum(c.deadline),'center')
          +_crTd(_crNum(c.payment_day),'center')
          +_crTd(pdfSet[c.name]?'<span style="color:#1d4ed8">📄 ใช่</span>':'<span style="color:var(--text3)">✍️ ไม่</span>','center')
          +_crTd('<b>'+_crNum(cur)+'</b>','center')
          +'</tr>';
      });
      if(!cards.length) h+='<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:10px">ไม่มีบัตรใน D.cards</td></tr>';
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
  function _crTd(html,cls){
    cls=cls||'';
    var align = cls.indexOf('right')>=0?'right':(cls.indexOf('center')>=0?'center':'left');
    var mono = cls.indexOf('mono')>=0?'font-family:ui-monospace,Menlo,Consolas,monospace;':'';
    return '<td style="text-align:'+align+';padding:4px 7px;border-bottom:1px solid var(--border);'+mono+'vertical-align:top;white-space:nowrap">'+html+'</td>';
  }
})();
