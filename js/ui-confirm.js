// ui-confirm.js (Nov 10 2026) — app-wide styled replacement for window.confirm().
// Same look as other CashMan popups: card, title, message, footer Cancel (left, ghost) + OK (right, primary/red for delete).
// Enter = OK, Esc = Cancel, click backdrop = Cancel (drag-select released outside does NOT close).
// window.confirm is synchronous; native callers expect a boolean right away. So this overrides confirm()
// to show the popup and returns false immediately, then RE-RUNS the original caller's action on OK by
// re-dispatching the same click (the element that triggered it) with a one-shot "yes" flag.
(function(){
var _yes=false,_lastEl=null;
document.addEventListener('click',function(e){_lastEl=e.target;},true);
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
window.cmConfirm=function(msg,onOk,opt){opt=opt||{};
  var old=document.getElementById('cm-confirm-ov');if(old)old.remove();
  var danger=opt.danger!=null?opt.danger:/delete|remove|clear|ลบ/i.test(msg);
  var ov=document.createElement('div');ov.id='cm-confirm-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px';
  var down=null;ov.addEventListener('mousedown',function(e){down=e.target;});
  ov.addEventListener('mouseup',function(e){if(down===ov&&e.target===ov)close();down=null;});
  ov.innerHTML='<div style="background:var(--bg2,#fff);color:var(--text);border-radius:10px;padding:16px 18px;width:min(380px,94vw);box-shadow:0 10px 40px rgba(0,0,0,.3)">'+
    '<h3 style="margin:0 0 8px;font-size:14px"><i class="fa-solid '+(danger?'fa-triangle-exclamation" style="color:var(--error,#dc2626)':'fa-circle-question" style="color:var(--primary)')+'"></i> '+esc(opt.title||(danger?'Confirm delete':'Please confirm'))+'</h3>'+
    '<div style="font-size:12px;line-height:1.5;white-space:pre-wrap;margin-bottom:14px">'+esc(msg)+'</div>'+
    '<div style="display:flex;justify-content:space-between;gap:8px"><button class="btn btn-ghost" id="cm-cf-no">Cancel</button>'+
    '<button class="btn btn-primary" id="cm-cf-yes"'+(danger?' style="background:var(--error,#dc2626);border-color:var(--error,#dc2626)"':'')+'>'+(danger?'<i class="fa-solid fa-trash"></i> Delete':'\u2713 OK')+'</button></div></div>';
  document.body.appendChild(ov);
  function close(){ov.remove();document.removeEventListener('keydown',key,true);}
  function key(e){if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Enter'){e.preventDefault();close();onOk&&onOk();}}
  document.addEventListener('keydown',key,true);
  ov.querySelector('#cm-cf-no').onclick=close;
  ov.querySelector('#cm-cf-yes').onclick=function(){close();onOk&&onOk();};
  setTimeout(function(){var b=ov.querySelector('#cm-cf-yes');if(b)b.focus();},20);
};
var nat=window.confirm.bind(window);
window.confirm=function(msg){
  if(_yes){_yes=false;return true;}           // re-run after OK
  var el=_lastEl;
  if(!el||!document.contains(el))return nat(msg);   // not from a click (e.g. script) -> native fallback
  window.cmConfirm(msg,function(){_yes=true;try{el.click();}finally{_yes=false;}});
  return false;
};
})();
