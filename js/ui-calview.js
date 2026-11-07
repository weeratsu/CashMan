// ui-calview.js (Nov 7 2026) — Dashboard calendar view options, kept OUT of ui-dashboard.js so a bug here can never blank the calendar.
// Options (per browser, localStorage): cm_cal_icons ('1'/'0'), cm_cal_grid ('0'/'1'), cm_cal_fs (0.8–1.6)
(function(){
try{if(window.Highcharts)Highcharts.setOptions({accessibility:{enabled:false}});}catch(e){}
function opt(k,d){try{var v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
function css(){
  var c='',G='#dash-calendar div[style*="grid-template-columns:repeat(7"]';
  if(opt('cm_cal_icons','1')==='0')c+='#dash-calendar .cl-it i,#dash-calendar .cl-it span[title="auto-pay"]{display:none!important}';
  if(opt('cm_cal_grid','0')==='1'){
    c+=G+'{gap:0!important;border:1px solid var(--border);border-radius:10px;overflow:hidden}';
    c+=G+'>div{border-radius:0!important;border-width:0 1px 1px 0!important;border-style:solid!important;border-color:var(--border)!important;box-shadow:none!important;margin:0!important}';
    c+=G+'>div:nth-child(7n){border-right-width:0!important}';
    c+=G+'>div:nth-child(-n+7){background:transparent!important}';
  }
  var f=parseFloat(opt('cm_cal_fs','1'))||1;
  if(f!==1)c+='#dash-calendar .cl-it,#dash-calendar '+G.slice(14)+'>div>div{font-size:'+(9*f).toFixed(1)+'px!important}';
  return c;
}
function apply(){
  try{
    var s=document.getElementById('cm-calview-css');
    if(!s){s=document.createElement('style');s.id='cm-calview-css';document.head.appendChild(s);}
    s.textContent=css();
    addBtns();addCat();
  }catch(e){console.warn('calview:',e);}
}
function addBtns(){
  var el=document.getElementById('dash-calendar');if(!el)return;
  var today=el.querySelector('button[onclick="dashCalToday()"]');if(!today)return;
  var old=document.getElementById('calview-fs');if(old)old.remove();
  var p=Math.round((parseFloat(opt('cm_cal_fs','1'))||1)*100);
  var w=document.createElement('span');w.id='calview-fs';w.style.cssText='display:inline-flex;gap:4px';
  var cls=today.className,st='font-size:10px;padding:4px 10px';
  w.innerHTML='<button class="'+cls+'" style="'+st+'" onclick="calFont(-1)" title="Smaller text"><i class="fa-solid fa-minus" style="font-size:9px"></i> A</button>'+
    '<button class="'+cls+'" style="font-size:10px;padding:4px 8px;min-width:44px" onclick="calFont(0)" title="Reset text size">'+p+'%</button>'+
    '<button class="'+cls+'" style="'+st+'" onclick="calFont(1)" title="Larger text"><i class="fa-solid fa-plus" style="font-size:9px"></i> A</button>';
  today.parentNode.insertBefore(w,today);
}
function rerender(){try{if(typeof renderDashCalendar==='function')renderDashCalendar();}catch(e){}apply();}
// ---- Task category filter (Nov 7 2026) — filters To-Do tasks by category; bills unaffected ----
var _seenCats={};
function catSel(){return opt('cm_cal_cat','');}
function hookTask(){
  if(typeof window._calTaskLine!=='function'||window._calTaskLine._cv)return false;
  var o=window._calTaskLine;
  var w=function(t){var c=(t&&t.category)||'';if(c)_seenCats[c]=1;var f=catSel();
    if(f&&(f==='__none__'?c!=='':c!==f))return '';return o.apply(this,arguments);};
  w._cv=true;try{window._calTaskLine=w;}catch(e){}return true;
}
function addCat(){
  var el=document.getElementById('dash-calendar');if(!el)return;
  var old=document.getElementById('calview-cat');if(old)old.remove();
  try{((window.D&&(D.todos||D.tasks))||[]).forEach(function(t){if(t&&t.category)_seenCats[t.category]=1;});}catch(e){}
  var f=catSel(),cats=Object.keys(_seenCats).sort(function(a,b){return a.localeCompare(b);});
  if(f&&f!=='__none__'&&cats.indexOf(f)<0)cats.push(f);
  var hol=el.querySelector('[onclick*="dashCalPill(\'hol\')"]');var grp=hol&&hol.closest('.calf-grp');
  var anchor=grp||el.querySelector('.calf-grp');if(!anchor)return;
  var s=document.createElement('span');s.id='calview-cat';s.className='calf-grp';
  s.innerHTML='<i class="fa-solid fa-tag" style="font-size:10px;color:var(--text3);margin:0 2px"></i>'+
    '<select class="sel" style="font-size:10px;padding:2px 6px;border-radius:999px'+(f?';border-color:var(--primary);color:var(--primary);font-weight:600':'')+'" title="Filter tasks by category" onchange="setCalOpt(\'cm_cal_cat\',this.value)">'+
    '<option value="">All categories</option>'+
    cats.map(function(c){var e=(typeof esc==='function')?esc(c):String(c);return '<option value="'+e+'"'+(c===f?' selected':'')+'>'+e+'</option>';}).join('')+
    '<option value="__none__"'+(f==='__none__'?' selected':'')+'>(no category)</option></select>';
  anchor.parentNode.insertBefore(s,anchor.nextSibling);
}
window._calOpt=opt;
window.setCalOpt=function(k,v){try{localStorage.setItem(k,v);}catch(e){}rerender();};
window.calFont=function(dir){var f=parseFloat(opt('cm_cal_fs','1'))||1;
  f=dir===0?1:Math.max(.8,Math.min(1.6,Math.round((f+dir*.1)*10)/10));
  try{localStorage.setItem('cm_cal_fs',String(f));}catch(e){}rerender();};
// re-apply after every calendar render (wrap once the dashboard script has defined it)
function hook(){
  if(typeof window.renderDashCalendar!=='function'||window.renderDashCalendar._cv)return false;
  var orig=window.renderDashCalendar;
  // category filter: hand the calendar a filtered D.todos for this render only, then restore
  var w=function(){var f=catSel(),bak=null,bakL=null,r;
    try{if(f&&window.D&&Array.isArray(D.todos)){bak=D.todos;bak.forEach(function(t){if(t&&t.category)_seenCats[t.category]=1;});
      var ok=function(c){c=c||'';return f==='__none__'?!c:c===f;},byId={};
      bak.forEach(function(t){if(t&&t.id!=null)byId[t.id]=t;});
      D.todos=bak.filter(function(t){return ok(t&&t.category);});
      // completed occurrences live in D.todo_log — filter by the task's current category (fallback: logged category)
      if(Array.isArray(D.todo_log)){bakL=D.todo_log;D.todo_log=bakL.filter(function(L){var t=byId[L.todo_id];return ok(t?t.category:L.category);});}
    }}catch(e){}
    try{r=orig.apply(this,arguments);}finally{if(bak)D.todos=bak;if(bakL)D.todo_log=bakL;}
    apply();return r;};w._cv=true;
  try{window.renderDashCalendar=w;}catch(e){}
  return true;
}
function hookAll(){var a=hook(),b=hookTask();return (a||window.renderDashCalendar&&window.renderDashCalendar._cv)&&(b||window._calTaskLine&&window._calTaskLine._cv);}
if(!hookAll()){var n=0,t=setInterval(function(){if(hookAll()||++n>50)clearInterval(t);},100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
