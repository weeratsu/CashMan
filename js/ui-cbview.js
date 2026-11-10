// ui-cbview.js (Nov 9 2026) — Card Bills add-ons, step 1: Month/Year jump.
// Does NOT wrap renderCardBills; just watches the page and adds two selects next to the month title.
(function(){
// Nov 10 2026: paid = the header has a badge whose own text is exactly "paid" (any case; the badge is
// uppercased by CSS, so textContent is "Paid" — the old /PAID/ test never matched).
// v16 (Nov 10 2026): paid state from DATA, not page text — same source ui-bills.js uses for the PAID badge:
// cbPaidRec(card, viewYear, viewMonth, period).paid, card resolved to its id (D.cards[].id).
// Period = the box's "งวด YYYY-MM" badge (blank -> cbPaidRec derives it from the view month).
// Falls back to the old text check only if cbPaidRec is unavailable.
window.cbvIsPaid=function(h){if(!h)return false;
  try{
    if(typeof window.cbPaidRec==='function'||typeof cbPaidRec==='function'){
      var f=window.cbPaidRec||cbPaidRec;
      var m=/cbToggle\('(.*)'\)/.exec(h.getAttribute('onclick')||'');if(!m)return false;
      var nm=m[1].replace(/\\'/g,"'");
      var c=(typeof window.cardResolve==='function'&&window.cardResolve(nm))||(window.D&&D.cards||[]).filter(function(x){return x.name===nm;})[0]||null;
      var key=(c&&c.name)||nm;  // cbPaidRec resolves name->id internally (records keyed CB|<id>|period)
      var pm=/\u0e07\u0e27\u0e14\s*(\d{4}-\d{2})/.exec(h.textContent||'');
      var vp=(typeof _cbPeriod==='function')?_cbPeriod():{y:_cbYear,m:_cbMonth};
      var r=f(key,vp.y,vp.m,pm?pm[1]:'');
      return !!(r&&r.paid);
    }
  }catch(e){console.warn('cbvIsPaid',e);}
  var box=h.closest('.card')||h;
  var s=box.querySelectorAll('span,b,div');
  for(var i=0;i<s.length;i++){var t=(s[i].textContent||'').replace(/\s+/g,' ').trim();
    if(/^to pay$/i.test(t))return false;}
  for(var j=0;j<s.length;j++){var u=(s[j].textContent||'').replace(/\s+/g,' ').trim();
    if(/^paid$/i.test(u)||/^statement paid$/i.test(u))return true;}
  return false;};
var MONF=['January','February','March','April','May','June','July','August','September','October','November','December'];
window.cbvJump=function(){
  try{var y=+document.getElementById('cbv-y').value,m=+document.getElementById('cbv-m').value;
    _cbYear=y;_cbMonth=m;renderCardBills();}catch(e){console.warn('cbvJump',e);}
};
function add(){
  try{
    var el=document.getElementById('cardbills-content');if(!el||document.getElementById('cbv-y'))return;
    var spans=el.querySelectorAll('span'),title=null;
    for(var i=0;i<spans.length;i++){var t=spans[i].textContent.trim();if(/^[A-Z][a-z]+ \d{4}$/.test(t)){title=spans[i];break;}}
    if(!title)return;
    var p=title.textContent.trim().split(' '),cm=MONF.indexOf(p[0]),cy=+p[1];
    var ys='';for(var y=new Date().getFullYear()+1;y>=2013;y--)ys+='<option'+(y===cy?' selected':'')+'>'+y+'</option>';
    var ms='';for(var m=0;m<12;m++)ms+='<option value="'+m+'"'+(m===cm?' selected':'')+'>'+MONF[m]+'</option>';
    var w=document.createElement('span');w.style.cssText='display:inline-flex;gap:4px;align-items:center';
    w.innerHTML='<select id="cbv-m" class="sel" style="font-size:11px;padding:2px 6px" onchange="cbvJump()">'+ms+'</select>'+
      '<select id="cbv-y" class="sel" style="font-size:11px;padding:2px 6px" onchange="cbvJump()">'+ys+'</select>';
    title.style.display='none';title.parentNode.insertBefore(w,title.nextSibling);
  }catch(e){console.warn('cbview:',e);}
}
// ---- step 2: TRANSFER BY BANK (unpaid amount per bank, from the rendered card boxes) ----
function bankSum(){
  try{
    var el=document.getElementById('cardbills-content');if(!el||document.getElementById('cbv-bank'))return;
    var nav=el.querySelector('.card');if(!nav)return;
    var hdrs=el.querySelectorAll('[onclick^="cbToggle("]');if(!hdrs.length)return;
    var by={},order=[];
    for(var i=0;i<hdrs.length;i++){
      var h=hdrs[i],m=/cbToggle\('(.*)'\)/.exec(h.getAttribute('onclick')||'');if(!m)continue;
      var nm=m[1].replace(/\\'/g,"'");
      var c=(window.D&&D.cards||[]).filter(function(x){return x.name===nm;})[0]||{};
      var bk=c.bank||'';try{if(typeof bankName==='function')bk=bankName(bk)||bk;}catch(e){}
      bk=bk||'Other';
      var txt=h.textContent||'',mm=/Effective:\s*\u0e3f?\s*([\d,]+\.\d{2})/.exec(txt);
      var amt=mm?parseFloat(mm[1].replace(/,/g,'')):0;if(!(amt>0.005))continue;
      var paid=window.cbvIsPaid(h);
      if(!by[bk]){by[bk]={due:0,paid:0,n:0};order.push(bk);}
      if(paid)by[bk].paid+=amt;else{by[bk].due+=amt;by[bk].n++;}
    }
    if(!order.length)return;
    order.sort(function(a,b){return by[b].due-by[a].due;});
    var f=function(v){return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});};
    var d=document.createElement('div');d.id='cbv-bank';d.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';
    d.innerHTML='<div style="width:100%;font-size:9px;font-weight:700;color:var(--text3)"><i class="fa-solid fa-building-columns"></i> TRANSFER BY BANK</div>'+
      order.map(function(bk){var g=by[bk],ok=g.due<=0.005;
        return '<div style="flex:1;min-width:140px;padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg2)">'+
          '<div style="font-size:10px;font-weight:700">'+String(bk).replace(/</g,'&lt;')+'</div>'+
          '<div style="font-family:var(--mono);font-size:13px;font-weight:700;color:'+(ok?'var(--success)':'var(--error)')+'">\u0e3f'+f(g.due)+'</div>'+
          '<div style="font-size:9px;color:var(--text3)">'+(ok?'\u2713 all paid':g.n+' card'+(g.n!==1?'s':'')+' to pay')+(g.paid>0.005?' \u00b7 paid \u0e3f'+f(g.paid):'')+'</div></div>';}).join('');
    nav.appendChild(d);
  }catch(e){console.warn('cbview bank:',e);}
}
// ---- step 3: group card boxes by bank (framed) + filters (only with amount / only active) ----
function opt(k,d){try{var v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
window.cbvOpt=function(k,v){try{localStorage.setItem(k,v);}catch(e){}try{renderCardBills();}catch(e){}};
function group(){
  try{
    var el=document.getElementById('cardbills-content');if(!el||el.querySelector('.cbv-done'))return;
    var nav=el.querySelector('.card');if(!nav)return;
    var hdrs=el.querySelectorAll('[onclick^="cbToggle("]');if(!hdrs.length)return;
    var fG=opt('cm_cbv_grp','1')==='1',fA=opt('cm_cbv_amt','0')==='1',fX=opt('cm_cbv_act','1')==='1';
    var mk=document.createElement('span');mk.className='cbv-done';mk.style.display='none';el.appendChild(mk);
    var f=document.createElement('div');f.style.cssText='display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px';
    function cb(k,on,lbl){return '<label style="cursor:pointer;display:inline-flex;gap:4px;align-items:center"><input type="checkbox"'+(on?' checked':'')+' onchange="cbvOpt(\''+k+'\',this.checked?\'1\':\'0\')">'+lbl+'</label>';}
    f.innerHTML=cb('cm_cbv_grp',fG,'Group by bank')+cb('cm_cbv_amt',fA,'Only cards with amount')+cb('cm_cbv_act',fX,'Only active cards');
    nav.appendChild(f);
    var items=[];
    for(var i=0;i<hdrs.length;i++){
      var h=hdrs[i],box=h.closest('.card');if(!box||box===nav)continue;
      var m=/cbToggle\('(.*)'\)/.exec(h.getAttribute('onclick')||'');var nm=m?m[1].replace(/\\'/g,"'"):'';
      var c=(window.D&&D.cards||[]).filter(function(x){return x.name===nm;})[0]||{};
      var bk=c.bank||'';try{if(typeof bankName==='function')bk=bankName(bk)||bk;}catch(e){}
      var mm=/Effective:\s*\u0e3f?\s*([\d,]+\.\d{2})/.exec(h.textContent||'');
      var amt=mm?parseFloat(mm[1].replace(/,/g,'')):0;
      var closed=(typeof window.ccIsClosed==='function')?window.ccIsClosed(c):false;
      var show=!(fA&&!(amt>0.005))&&!(fX&&closed);
      box.style.display=show?'':'none';
      var dm=/deadline\s+(\d+)\w*\s+([A-Z][a-z]{2})/.exec(h.textContent||''),dl=9999;
      if(dm){var mi=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(dm[2]);if(mi>=0)dl=((mi-_cbMonth+12)%12)*40+(+dm[1]);}
      items.push({box:box,bank:bk||'Other',code:c.bank,amt:amt,dl:dl,paid:window.cbvIsPaid(h),show:show});
    }
    if(!fG||!items.length)return;
    var order=[];items.forEach(function(x){if(order.indexOf(x.bank)<0)order.push(x.bank);});
    var info={};order.forEach(function(bk){var v=items.filter(function(x){return x.bank===bk&&x.show;});
      info[bk]={due:v.reduce(function(a,x){return a+(x.paid?0:x.amt);},0),dl:v.filter(function(x){return !x.paid&&x.amt>0.005;}).reduce(function(a,x){return Math.min(a,x.dl);},9999)};});
    order.sort(function(a,b){var za=info[a].due>0.005?0:1,zb=info[b].due>0.005?0:1;return za-zb||info[a].dl-info[b].dl||a.localeCompare(b);});
    var fm=function(v){return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});};
    var wrap=document.createElement('div');wrap.className='cbv-wrap';items[0].box.parentNode.insertBefore(wrap,items[0].box);
    var COL=['#2563eb','#16a34a','#ea580c','#9333ea','#0891b2','#db2777','#ca8a04','#475569'];
    order.forEach(function(bk){
      var mem=items.filter(function(x){return x.bank===bk;}),vis=mem.filter(function(x){return x.show;});
      var due=vis.reduce(function(a,x){return a+(x.paid?0:x.amt);},0);
      var g=document.createElement('div');
      var col=COL[order.indexOf(bk)%COL.length];
      try{if(typeof bankColor==='function')col=bankColor(bk)||col;}catch(e){}
      g.style.cssText='border:1px solid '+col+';border-left-width:4px;border-radius:12px;padding:10px 10px 2px;margin-bottom:18px;'+
        'background:color-mix(in srgb, '+col+' 7%, var(--bg3));box-shadow:0 2px 6px rgba(0,0,0,.08)'+(vis.length?'':';display:none');
      var badge='';try{if(typeof bankBadge==='function')badge=bankBadge(mem[0].code,false);}catch(e){}
      g.innerHTML='<div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;margin:0 4px 8px">'+badge+String(bk).replace(/</g,'&lt;')+
        ' <span style="font-weight:400;color:var(--text3);font-size:10px">('+vis.length+' card'+(vis.length!==1?'s':'')+')</span><span style="flex:1"></span>'+
        '<span style="font-size:11px">To pay: <span style="font-family:var(--mono);color:'+(due>0.005?'var(--error)':'var(--success)')+'">\u0e3f'+fm(due)+'</span></span></div>';
      wrap.appendChild(g);
      // Nov 10 2026: paid cards sink to the bottom of their bank frame (stable: keeps original order otherwise)
      mem.map(function(x,i){return {x:x,i:i};}).sort(function(a,b){return (a.x.paid?1:0)-(b.x.paid?1:0)||a.i-b.i;})
        .forEach(function(o){g.appendChild(o.x.box);});
    });
  }catch(e){console.warn('cbview group:',e);}
}
// ---- step 4: PDF icon per card (statement of the shown month, from CARD_BILLS b.file) ----
function pdfIcons(){
  try{
    var el=document.getElementById('cardbills-content');if(!el)return;
    var bills=(window.CARD_BILLS&&window.CARD_BILLS.bills)||[];if(!bills.length)return;
    var ym=_cbYear+'-'+('0'+(_cbMonth+1)).slice(-2);
    var hdrs=el.querySelectorAll('[onclick^="cbToggle("]');
    for(var i=0;i<hdrs.length;i++){
      var h=hdrs[i];if(h.querySelector('.cbv-pdf'))continue;
      var m=/cbToggle\('(.*)'\)/.exec(h.getAttribute('onclick')||'');if(!m)continue;
      var nm=m[1].replace(/\\'/g,"'");
      var c=(window.D&&D.cards||[]).filter(function(x){return x.name===nm;})[0]||{};
      var l4=String(c.last4||c.card_last4||'');
      // link by card id first (b.card_id === D.cards id), then last4, then name
      var mine=bills.filter(function(b){return b.file&&((c.id&&b.card_id===c.id)||(l4&&String(b.last4||'')===l4)||b.card===nm);});
      var pm=/\u0e07\u0e27\u0e14\s*(\d{4}-\d{2})/.exec(h.textContent||'');
      var b=null;
      if(pm)b=mine.filter(function(b){return b.period===pm[1];})[0];
      if(!b)b=mine.filter(function(b){return String(b.due_date||'').slice(0,7)===ym;})[0];
      if(!b){mine.sort(function(a,b){return String(b.stmt_date).localeCompare(String(a.stmt_date));});
        b=mine.filter(function(b){return String(b.stmt_date||'').slice(0,7)<=ym;})[0];}
      if(!b)continue;
      var a=document.createElement('a');a.href='#';a.className='cbv-pdf';a.title=b.file;a.style.marginLeft='6px';
      a.innerHTML='<i class="fa-solid fa-file-pdf" style="color:var(--error,#dc2626)"></i>';
      a.onclick=(function(p){return function(ev){ev.preventDefault();ev.stopPropagation();
        if(typeof window.cardSummaryPdf==='function')return window.cardSummaryPdf(ev,p);
        if(typeof window.utilViewDoc==='function')return window.utilViewDoc(p,ev);return false;};})(b.file);
      var tgt=h.querySelector('b,strong')||h.firstElementChild||h;
      tgt.appendChild(a);
    }
  }catch(e){console.warn('cbview pdf:',e);}
}
// ---- step 5 (Nov 10 2026): missing-statement alert. Per active card (by card_id): if today is past
// last stmt_date + 1 month + GRACE days and no newer PDF arrived -> warn (email subject/sender may have changed).
var GRACE=5;
function missAlert(){
  try{
    var el=document.getElementById('cardbills-content');if(!el||document.getElementById('cbv-miss'))return;
    var nav=el.querySelector('.card');if(!nav)return;
    var bills=(window.CARD_BILLS&&window.CARD_BILLS.bills)||[],last={};
    bills.forEach(function(b){if(b.card_id&&b.stmt_date&&(!last[b.card_id]||b.stmt_date>last[b.card_id]))last[b.card_id]=b.stmt_date;});
    var today=new Date();today.setHours(0,0,0,0);var miss=[];
    (window.D&&D.cards||[]).forEach(function(c){
      if(!c||!c.id||!last[c.id])return;
      if(typeof window.ccIsClosed==='function'&&window.ccIsClosed(c))return;
      var d=new Date(last[c.id]+'T00:00:00');var exp=new Date(d.getFullYear(),d.getMonth()+1,d.getDate()+GRACE);
      if(today>exp)miss.push({n:c.name,l:last[c.id],days:Math.round((today-exp)/864e5)});
    });
    if(!miss.length)return;
    var w=document.createElement('div');w.id='cbv-miss';
    w.style.cssText='margin-top:8px;padding:8px 12px;border-radius:8px;border:1px solid var(--warning,#d97706);background:color-mix(in srgb, var(--warning,#d97706) 10%, transparent);font-size:11px';
    w.innerHTML='<b>\u26a0\ufe0f Statement PDF not received</b> \u2014 check Gmail Saver (bank may have changed email subject/sender):'+
      miss.map(function(m){return '<div style="margin-top:3px">\u2022 '+String(m.n).replace(/</g,'&lt;')+' \u2014 last statement '+m.l+' ('+m.days+' day'+(m.days!==1?'s':'')+' overdue)</div>';}).join('');
    nav.appendChild(w);
  }catch(e){console.warn('cbview miss:',e);}
}
// v14: totals/grouping are built once per render; if any card's paid state changes afterwards
// (Mark paid / late badge), re-render so TRANSFER BY BANK, To pay and order are recomputed.
var _paidSig=null;
function paidWatch(){
  try{var el=document.getElementById('cardbills-content');if(!el||!el.querySelector('#cbv-bank'))return;
    var hs=el.querySelectorAll('[onclick^="cbToggle("]'),s='';
    for(var i=0;i<hs.length;i++)s+=(hs[i].getAttribute('onclick')||'')+(window.cbvIsPaid(hs[i])?'1':'0');
    var stamp=el.querySelector('#cbv-bank');
    if(stamp._sig===undefined){stamp._sig=s;return;}
    if(stamp._sig!==s){stamp._sig=s;renderCardBills();}
  }catch(e){console.warn('cbview paidWatch:',e);}
}
setInterval(function(){add();bankSum();group();pdfIcons();missAlert();paidWatch();},500);
})();
