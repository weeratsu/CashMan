// ui-todoview.js (Nov 10 2026) - expanded To-Do row = read-only details + Edit button (opens todoEditOpen popup).
// Does not change ui-todos.js: hides the inline editor (#tedit_<id>) and shows a view panel in its place.
(function(){
var st=document.createElement('style');st.textContent='[id^="tedit_"]{display:none!important}';document.head.appendChild(st);
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function dt(iso){if(!iso)return '';var p=iso.split('-');return (+p[2])+' '+MON[(+p[1])-1]+' '+p[0];}
function line(ic,html){return '<div style="display:flex;gap:6px;align-items:flex-start"><span style="width:18px;text-align:center">'+ic+'</span><span>'+html+'</span></div>';}
function view(t,ed){
  var h='',pri={1:'\ud83d\udd34 High',2:'\ud83d\udfe1 Normal',3:'\ud83d\udfe3 Low'}[t.priority||2];
  h+=line('\ud83d\udcc2',e(t.category||'-')+' &nbsp;\u00b7&nbsp; '+pri);
  var due=t.deadline_mode==='asap'?'ASAP':t.deadline_mode==='date'&&t.due_date?dt(t.due_date)+(t.due_time?' '+e(t.due_time):''):'-';
  h+=line('\ud83d\udcc5','Due '+due+(t.deadline_date?' &nbsp;\u00b7&nbsp; \u23f3 Deadline '+dt(t.deadline_date):''));
  if(t.recur&&t.recur!=='none'){var n=t.recur_every||1,u={daily:'day',weekly:'week',monthly:'month',yearly:'year'}[t.recur];
    var r='Every '+(n>1?n+' '+u+'s':u)+(t.recur==='weekly'?' on '+DOW[t.recur_dow||0]:'')+(t.recur_until?' &nbsp;\u00b7&nbsp; until '+dt(t.recur_until):'');
    h+=line('\ud83d\udd01',r);}
  var ls=ed&&ed.querySelector('select[data-tf="link"]'),lt=ls&&ls.value&&ls.options[ls.selectedIndex]?ls.options[ls.selectedIndex].text:'';
  if(lt)h+=line('\ud83d\udd17',e(lt));
  if(t.url&&typeof todoUrlA==='function')h+=line('\ud83c\udf10',todoUrlA(t.url));
  if(t.note)h+=line('\ud83d\udcdd','<span style="white-space:pre-wrap">'+(typeof todoLinkify==='function'?todoLinkify(t.note):e(t.note))+'</span>');
  return '<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 12px;margin:4px 0;border:1px solid var(--border);border-radius:8px;background:var(--bg2);font-size:11px">'+
    '<div style="flex:1;display:grid;gap:5px">'+h+'</div>'+
    '<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="event.stopPropagation();todoEditOpen(\''+t.id+'\')"><i class="fa-solid fa-pen"></i> Edit</button></div>';
}
function tick(){
  try{
    var eds=document.querySelectorAll('[id^="tedit_"]');
    for(var i=0;i<eds.length;i++){
      var ed=eds[i],id=ed.id.slice(6),open=ed.style.display==='grid';
      var v=document.getElementById('tview_'+id);
      if(!open){if(v)v.remove();continue;}
      var t=(window.D&&D.todos||[]).find(function(x){return x.id===id;});if(!t)continue;
      var sig=JSON.stringify(t);
      if(v&&v._sig===sig)continue;
      if(!v){v=document.createElement('div');v.id='tview_'+id;ed.parentNode.insertBefore(v,ed);}
      v.innerHTML=view(t,ed);v._sig=sig;
    }
  }catch(err){console.warn('todoview:',err);}
}
setInterval(tick,400);
})();
