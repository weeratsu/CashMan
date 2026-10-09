/* table-search.js (Oct 9 2026) - keyword search box above every list table in CashMan.
   Searches what you see in each row (text + values typed in boxes + chosen dropdown option).
   Expandable detail rows (*-detail) stay attached to their main row. Several words = all must match.
   The search text survives re-renders (app redraws tables often). To-Do has its own search -> skipped. */
(function(){
 if(window.__tableSearch) return; window.__tableSearch=true;
 var MIN_ROWS=4, Q={}, pending=false;
 var st=document.createElement('style');
 st.textContent='.ts-bar{position:relative;display:flex;align-items:center;gap:6px;margin:4px 0 6px}'
  +'.ts-bar i{position:absolute;left:9px;font-size:11px;color:var(--text3,#94a3b8);pointer-events:none}'
  +'.ts-bar input{font-size:12px;padding:5px 26px;border:1px solid var(--border,#cbd5e1);border-radius:8px;width:240px;max-width:70vw;background:var(--bg2,#fff);color:inherit}'
  +'.ts-bar input:focus{outline:2px solid var(--primary,#3b82f6);outline-offset:-1px}'
  +'.ts-bar .ts-x{position:absolute;left:214px;border:0;background:none;font-size:15px;color:var(--text3,#94a3b8);cursor:pointer;display:none}'
  +'.ts-bar.on .ts-x{display:block}.ts-bar .ts-n{font-size:11px;color:var(--text3,#94a3b8)}'
  +'.ts-hide{display:none!important}';
 (document.head||document.documentElement).appendChild(st);
 function norm(x){ return String(x==null?'':x).toLowerCase(); }
 function rowText(tr){
   var t=tr.textContent||'';
   var f=tr.querySelectorAll?tr.querySelectorAll('input,select,textarea'):[];
   for(var i=0;i<f.length;i++){ var e=f[i];
     if(e.tagName==='SELECT'){ var o=e.options&&e.options[e.selectedIndex]; if(o) t+=' '+o.text; }
     else if(e.type!=='checkbox'&&e.type!=='radio') t+=' '+(e.value||''); }
   return norm(t);
 }
 function matches(text,q){ return q.split(/\s+/).filter(Boolean).every(function(w){ return text.indexOf(w)>=0; }); }
 function isDetail(tr){ return /(^|\s)[\w]+-detail(\s|$)/.test(tr.className||''); }
 // groups: [main row, its detail rows...]
 function groups(tb){ var g=[], cur=null, rows=tb.rows||[];
   for(var i=0;i<rows.length;i++){ var r=rows[i]; if(isDetail(r)&&cur) cur.push(r); else { cur=[r]; g.push(cur); } }
   return g; }
 function keyOf(tbl,idx){ var card=tbl.closest&&tbl.closest('.card'); var h=card&&card.querySelector('h2,h3');
   var tab=tbl.closest&&tbl.closest('.tab-content'); return (tab?tab.id:'')+'|'+(h?norm(h.textContent).slice(0,40):'')+'|'+idx; }
 function apply(tbl,q){
   var tb=tbl.tBodies&&tbl.tBodies[0]; if(!tb) return 0; var shown=0;
   groups(tb).forEach(function(g){
     var hit=!q || g.some(function(r){ return matches(rowText(r),q); });
     g.forEach(function(r){ var has=r.classList.contains('ts-hide'); if(hit&&has) r.classList.remove('ts-hide'); if(!hit&&!has) r.classList.add('ts-hide'); });
     if(hit) shown++;
   });
   return shown;
 }
 function eligible(tbl){
   if(tbl.closest('#todos-content')) return false;                 // To-Do has its own search
   if(tbl.parentNode&&tbl.parentNode.closest&&tbl.parentNode.closest('td')) return false;   // nested table
   if(tbl.closest('#dashcal-pop,#util-doc-ov,#drive-view-ov,.modal')) return false;         // popups
   var tb=tbl.tBodies&&tbl.tBodies[0]; return !!(tb && groups(tb).length>=MIN_ROWS);
 }
 function bar(tbl,key){
   var anchor=(tbl.parentNode&&tbl.parentNode.classList&&tbl.parentNode.classList.contains('tbl-fit'))?tbl.parentNode:tbl;
   var prev=anchor.previousElementSibling;
   if(prev&&prev.classList&&prev.classList.contains('ts-bar')&&prev.getAttribute('data-k')===key) return prev;
   var b=document.createElement('div'); b.className='ts-bar'; b.setAttribute('data-k',key);
   b.innerHTML='<i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="ค้นหาในตารางนี้"><button class="ts-x" title="ล้าง">\u00d7</button><span class="ts-n"></span>';
   anchor.parentNode.insertBefore(b,anchor);
   var inp=b.querySelector('input');
   inp.value=Q[key]||'';
   inp.addEventListener('input',function(){ Q[key]=norm(inp.value).trim(); run(); });
   inp.addEventListener('keydown',function(e){ if(e.key==='Escape'){ inp.value=''; Q[key]=''; run(); } });
   b.querySelector('.ts-x').addEventListener('click',function(){ inp.value=''; Q[key]=''; run(); inp.focus(); });
   return b;
 }
 function run(){
   pending=false;
   var list=document.querySelectorAll('table'), n=0;
   for(var i=0;i<list.length;i++){ var t=list[i]; if(!eligible(t)) continue;
     var k=keyOf(t,n++), b=bar(t,k), q=Q[k]||'', shown=apply(t,q);
     var on=!!q; if(b.classList.contains('on')!==on) b.classList.toggle('on',on);
     var txt=q?('พบ '+shown+' รายการ'):''; var s=b.querySelector('.ts-n'); if(s.textContent!==txt) s.textContent=txt;
   }
 }
 function init(){
   run();
   try{ new MutationObserver(function(){ if(!pending){ pending=true; (window.requestAnimationFrame||setTimeout)(run); } })
     .observe(document.body,{childList:true,subtree:true}); }catch(e){}
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
 window.__tsTest={matches:matches,groups:groups,rowText:rowText,isDetail:isDetail};
})();
