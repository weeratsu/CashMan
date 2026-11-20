/* ui-labels.js — Nov 20 2026 (user): show "Category" instead of "Type" for bill/expense types (D.types).
   Display-only relabel: data fields (.type, D.types) and ids are unchanged.
   Scope: Bills & Plans (monthly/yearly/installments/planned/card bills) + Dashboard/Timeline filters + popups. */
(function(){
'use strict';
// Nov 20 2026 (user): required-field highlight — red frame + "Required" hint; clears as soon as the field changes.
function cmMarkReq(el,msg){if(!el)return;try{
 el.style.outline='2px solid var(--error,#dc2626)';el.style.outlineOffset='1px';el.setAttribute('aria-invalid','true');
 var h=el.parentNode&&el.parentNode.querySelector('.cm-req-hint');
 if(!h){h=document.createElement('div');h.className='cm-req-hint';h.style.cssText='color:var(--error,#dc2626);font-size:9px;margin-top:2px';el.parentNode.insertBefore(h,el.nextSibling);}
 h.textContent='\u26a0\ufe0f '+(msg||'Required');
 var clr=function(){el.style.outline='';el.removeAttribute('aria-invalid');if(h&&h.parentNode)h.parentNode.removeChild(h);el.removeEventListener('input',clr);el.removeEventListener('change',clr);};
 el.addEventListener('input',clr);el.addEventListener('change',clr);
}catch(e){}}
// check a list of [element, isMissing, message]; marks all missing, focuses the first; returns true if OK
function cmCheckReq(list){var first=null;(list||[]).forEach(function(x){if(x&&x[0]&&x[1]){cmMarkReq(x[0],x[2]);if(!first)first=x[0];}});
 if(first){try{first.focus();}catch(e){}return false;}return true;}
window.cmMarkReq=cmMarkReq;window.cmCheckReq=cmCheckReq;
var SCOPE='#tab-bills, #tab-dash, #tab-dashboard, #tab-timeline, #tab-billreminder, #rec-edit-ov, #rec-add-ov, #pl-add-ov, #inst-add-ov';
function fix(root){
 try{(root||document).querySelectorAll(SCOPE).forEach(function(box){
  // table headers / popup box labels / form labels: exact text "Type"
  box.querySelectorAll('th, label, div').forEach(function(el){
   if(el.children.length)return;var t=el.textContent;
   if(/^\s*Type\s*(\u25b2|\u25bc)?\s*$/i.test(t))el.textContent=t.replace(/Type/i,function(m){return m===m.toUpperCase()?'CATEGORY':'Category';});});
  // filter dropdown first option
  box.querySelectorAll('select option[value=""]').forEach(function(o){if(/^All Types$/i.test(o.textContent.trim()))o.textContent='All Categories';});
 });}catch(e){}
}
var pend=false;
function sched(){if(pend)return;pend=true;requestAnimationFrame(function(){pend=false;fix();});}
fix();
try{new MutationObserver(sched).observe(document.body,{childList:true,subtree:true});}catch(e){}
window.cmFixLabels=fix;
})();
