// app.js — Navigation, initialization, renderAllTabs

// SIDEBAR collapse/expand (persisted)
function sidebarToggle(){
var col=!document.body.classList.contains('sb-collapsed');
document.body.classList.toggle('sb-collapsed',col);
try{localStorage.setItem('cashflow_sidebar_collapsed',col?'1':'0')}catch(e){}
var ic=document.querySelector('#sb-toggle i');
if(ic)ic.className=col?'fa-solid fa-angles-right':'fa-solid fa-angles-left';
}
function _restoreSidebar(){
try{if(localStorage.getItem('cashflow_sidebar_collapsed')==='1'){document.body.classList.add('sb-collapsed');var ic=document.querySelector('#sb-toggle i');if(ic)ic.className='fa-solid fa-angles-right';}}catch(e){}
}
// Show today's date in the sidebar (used as the reference "now" for debt/planned calcs)
function _updateToday(){
try{var el=document.querySelector('#sb-today .sb-today-txt');if(!el)return;
var d=new Date();var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
el.textContent='Today: '+days[d.getDay()]+' '+d.getDate()+' '+mons[d.getMonth()]+' '+d.getFullYear();
}catch(e){}
}

// NAV
document.getElementById('nav-tabs').onclick=function(e){
var sub=e.target.closest('.nav-sub');
if(sub){
var ptab=sub.dataset.tab,skey=sub.dataset.sub;
// activate parent tab content + parent nav-tab highlight
document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active')});
document.querySelectorAll('.nav-tab').forEach(function(t){t.classList.remove('active')});
var pbtn=document.querySelector('.nav-tab[data-tab="'+ptab+'"]');if(pbtn)pbtn.classList.add('active');
var pc=document.getElementById('tab-'+ptab);if(pc)pc.classList.add('active');
// highlight this sidebar sub-item; clear siblings
document.querySelectorAll('.nav-sub').forEach(function(s){s.classList.remove('active')});sub.classList.add('active');
// trigger the matching top sub-tab to switch the sub-panel + run its render
var tops=document.querySelectorAll('#tab-'+ptab+' .sub-tab');
var map={'payroll-setup':0,'monthly-earn':1,'tax-calc':2,'tax-exempt':3,'recurring':0,'installments':1,'planned':2,'cardbills':3,'setup':0,'assets':1,'calc':2,'summary':3,'type':0,'card':1};
var idx=map[skey];if(tops&&tops[idx])tops[idx].click();
return;
}
var b=e.target.closest('.nav-tab');if(!b)return;
// when switching to a parent via its main button, sync the sidebar sub-item highlight to the active sub-panel

document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active')});
document.querySelectorAll('.nav-tab').forEach(function(t){t.classList.remove('active')});
b.classList.add('active');document.getElementById('tab-'+b.dataset.tab).classList.add('active');
if(b.dataset.tab==='todos'){try{renderTodos()}catch(e){console.error('renderTodos:',e)}};if(b.dataset.tab==='wishlist'){try{renderWishlist()}catch(e){console.error('renderWishlist:',e)}};if(b.dataset.tab==='help')renderHelp();
if(b.dataset.tab==='utilities'){try{renderUtilities()}catch(e){console.error('renderUtilities:',e)}};
// sync sidebar sub-item highlight to whichever sub-panel is active in this parent
try{document.querySelectorAll('.nav-sub').forEach(function(s){s.classList.remove('active')});
var _wrap=document.querySelector('.nav-subwrap[data-parent="'+b.dataset.tab+'"]');
if(_wrap){var _tops=document.querySelectorAll('#tab-'+b.dataset.tab+' .sub-tab');var _ai=-1;_tops.forEach(function(t,ix){if(t.classList.contains('active'))_ai=ix;});if(_ai<0)_ai=0;var _subs=_wrap.querySelectorAll('.nav-sub');if(_subs[_ai])_subs[_ai].classList.add('active');}
}catch(_e){}
};

function renderAllTabs(){renderCards();renderCardDetail();renderMonthly();renderYearly();renderPlanned();renderInst();renderInstMonthly();try{renderInstMatrix()}catch(e){};renderPayroll();renderRecurringSummary();populateFilters();try{renderRetirement()}catch(e){};try{renderAssetsPage()}catch(e){};if(typeof Highcharts!=='undefined')renderDash();try{renderDashBills()}catch(e){console.error('renderDashBills:',e)};try{renderDashTodos()}catch(e){console.error('renderDashTodos:',e)};try{renderDashCalendar()}catch(e){console.error('renderDashCalendar:',e)};try{applyDashLayout()}catch(e){console.error('applyDashLayout:',e)};try{renderBillReminder()}catch(e){console.error('renderBillReminder:',e)};try{renderCardBills()}catch(e){console.error('renderCardBills:',e)};try{renderCreditCards()}catch(e){console.error('renderCreditCards:',e)};try{renderDashCards()}catch(e){console.error('renderDashCards:',e)};try{renderTax()}catch(e){console.error('renderTax error:',e)};try{filterMonthly();filterYearly();filterPlanned();filterInst()}catch(e){}
try{renderTodos()}catch(e){console.error('renderTodos:',e)};try{renderWishlist()}catch(e){console.error('renderWishlist:',e)}
try{renderUtilities()}catch(e){console.error('renderUtilities:',e)}
// Update data footer
var ft=document.getElementById('data-footer');
if(ft&&D){var lm=D.last_modified?new Date(D.last_modified):null;var ls=D.profile.name?'Profile: '+D.profile.name+' \u2022 ':'';ft.innerHTML='<i class="fa-solid fa-clock" style="margin-right:3px"></i>'+ls+(lm?'Last modified: '+lm.toLocaleDateString('en-GB')+' '+lm.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Not yet saved')+' \u2022 Data stored in browser localStorage (key: '+SKEY+')';}}

// INIT
function _initErr(step,e){try{var b=document.getElementById('__err');if(!b){b=document.createElement('div');b.id='__err';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;font:12px/1.4 monospace;padding:8px 12px;white-space:pre-wrap;max-height:40vh;overflow:auto';(document.body||document.documentElement).appendChild(b);}b.textContent+='\u26a0\ufe0f '+step+': '+(e&&e.message?e.message:e)+'\n';}catch(_){}console.error(step+':',e);}
try{loadTheme()}catch(e){console.error('loadTheme:',e)}
try{document.getElementById('theme-toggle').onclick=togTheme}catch(e){}
try{_restoreSidebar()}catch(e){}
try{_updateToday()}catch(e){}
try{loadD();DATA_READY=true}catch(e){window.__LOADERR=(e&&e.message?e.message:String(e));_initErr('loadD',e)}
try{if(typeof autoFinishInstallments==='function')autoFinishInstallments()}catch(e){_initErr('autoFinish',e)}
try{loadForm()}catch(e){_initErr('loadForm',e)}
try{simulate()}catch(e){window.__SIMERR=(e&&e.message?e.message:String(e));_initErr('simulate',e)}
try{renderAllTabs()}catch(e){_initErr('renderAllTabs',e)}
try{renderHelp()}catch(e){_initErr('renderHelp',e)}

if(location.hash){var ht=location.hash.slice(1);
var tabMap={'tax':'paytax','payroll':'paytax','recurring':'bills','installments':'bills','planned':'bills','cards':'setup'};
var actualTab=tabMap[ht]||ht;
var hb=document.querySelector('.nav-tab[data-tab="'+actualTab+'"]');
if(hb){document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active')});
document.querySelectorAll('.nav-tab').forEach(function(t){t.classList.remove('active')});
hb.classList.add('active');document.getElementById('tab-'+actualTab).classList.add('active');
if(ht==='tax'){document.querySelectorAll('#tab-paytax .sub-tab').forEach(function(t,i){t.classList.remove('active');if(i===2)t.classList.add('active')});document.querySelectorAll('#tab-paytax .sub-panel').forEach(function(p){p.classList.remove('active')});var tce=document.getElementById('pt-tax-calc');if(tce)tce.classList.add('active');try{renderTax()}catch(e){}}}}
