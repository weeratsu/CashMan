// ui-cardstatus.js (Nov 9 2026) — card lifecycle status (Active / Cancelled / Expired).
// Kept OUT of ui-creditcards.js so a bug here can never blank the Credit Cards page.
// Closed cards: no expiry alert, not recommended, badge in header. Bills/history unaffected.
(function(){
function st(c){var s=String((c&&c.status)||'').toLowerCase();return (s==='cancelled'||s==='expired')?s:'active';}
window.ccStatus=st;
window.ccIsClosed=function(c){return st(c)!=='active';};
var OPTS=[['active','Active'],['cancelled','Cancelled'],['expired','Expired']];
function sel(id,v,on){return '<select '+(id?'id="'+id+'" ':'')+'style="width:100%;padding:3px 6px;font-size:10px"'+(on?' onchange="'+on+'"':'')+'>'+
  OPTS.map(function(o){return '<option value="'+o[0]+'"'+(v===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';}
function badge(c){var s=st(c);if(s==='active')return '';
  return '<span class="cs-badge" style="font-size:9px;font-weight:600;padding:1px 6px;border-radius:999px;background:var(--bg3);color:var(--text3);border:1px solid var(--border)">'+(s==='cancelled'?'\u2715 Cancelled':'\u23f1 Expired')+'</span>';}

function wrap(name,fn){var o=window[name];if(typeof o!=='function'||o._cs)return false;var w=fn(o);w._cs=true;window[name]=w;return true;}
function hookAll(){
  var ok=true;
  ok=wrap('ccExpiryStatus',function(o){return function(c){return st(c)!=='active'?null:o.apply(this,arguments);};})||(window.ccExpiryStatus&&window.ccExpiryStatus._cs)&&ok;
  // recommendation: hide closed cards for this call only (indexes not used by ccRecommend output)
  wrap('ccRecommend',function(o){return function(){var bak=D.cards;try{D.cards=(bak||[]).filter(function(c){return st(c)==='active';});return o.apply(this,arguments);}finally{D.cards=bak;}};});
  wrap('renderCreditCards',function(o){return function(){var r=o.apply(this,arguments);try{decorate();}catch(e){console.warn('cardstatus:',e);}return r;};});
  wrap('ccEditOpen',function(o){return function(){var r=o.apply(this,arguments);try{decorate();}catch(e){}return r;};});
  wrap('ccAddCardPopup',function(o){return function(){var r=o.apply(this,arguments);try{addField();}catch(e){}return r;};});
  wrap('ccAddCardSave',function(o){return function(){var v=(document.getElementById('ca-status')||{}).value||'active',n=(D.cards||[]).length;
    var r=o.apply(this,arguments);try{if(v!=='active'&&D.cards.length>n){var nc=D.cards[D.cards.length-1];
      var nm=(document.getElementById('ca-name')||{}).value;var t=(D.cards||[]).filter(function(c){return !c.status&&(!nm||c.name===nm);});(t[t.length-1]||nc).status=v;saveD();if(window.renderCreditCards)renderCreditCards();}}catch(e){}return r;};});
  return window.renderCreditCards&&window.renderCreditCards._cs;
}
// header badge + Status select after Expiry field in each card body
function decorate(){
  (D.cards||[]).forEach(function(c,i){
    var hd=document.querySelector('[onclick="ccToggleCard('+i+')"]');
    if(hd&&!hd.querySelector('.cs-badge')){var b=badge(c);if(b){var nm=hd.querySelector('b');(nm||hd).insertAdjacentHTML('afterend',b);}}
    var body=document.getElementById('ccbody_'+i)||document;
    var ex=body.querySelector('[onchange*="ccSet('+i+',\'expiry\'"],[onchange*="ccSet('+i+', \'expiry\'"]');
    if(!ex||body.querySelector('#cs-st-'+i))return;
    var cur=(typeof cardVal==='function')?cardVal(i,'status'):c.status;
    var d=document.createElement('div');d.style.fontSize='10px';d.id='cs-st-'+i;
    d.innerHTML='<label style="color:var(--text3)">Status</label>'+sel('',st({status:cur}),"ccSet("+i+",'status',this.value)");
    var cell=ex.parentNode;(cell.parentNode||body).insertBefore(d,cell.nextSibling);
  });
}
function addField(){
  var ex=document.getElementById('ca-exp');if(!ex||document.getElementById('ca-status'))return;
  var cell=ex.closest('div')||ex.parentNode;var d=document.createElement('div');
  d.style.cssText='display:flex;flex-direction:column;gap:2px;flex:1';   // same as fld() in the Add Card popup
  d.innerHTML='<label style="font-size:10px;color:var(--text2)">\u0e2a\u0e16\u0e32\u0e19\u0e30 / Status</label>'+sel('ca-status','active').replace('style="width:100%;padding:3px 6px;font-size:10px"','style="font-size:12px;padding:5px 8px"');
  cell.parentNode.insertBefore(d,cell.nextSibling);
}
if(!hookAll()){var n=0,t=setInterval(function(){if(hookAll()||++n>50)clearInterval(t);},100);}
setTimeout(function(){try{if(window.renderCreditCards)renderCreditCards();if(window.renderDashCards)renderDashCards();}catch(e){}},400);
})();
