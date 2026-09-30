// ui-todos.js — To-Do list module (finance-aware, but general purpose)
// Tasks with: title, note, deadline mode (none/date/asap), optional time, recurrence
// (none/daily/weekly/monthly/yearly via a TEMPLATE that rolls forward on complete — no data
// explosion), category, priority, done status, and an optional context link to a bill/card.
// Deliberately SEPARATE from Bills Reminder: a To-Do has no amount and no balance impact.
// No personal data hardcoded — all rows live in D.todos.

var _todoFilter='open';   // open | done | all
var _todoCatFilter='';    // '' = all categories; else a category name (combines with status filter)
function setTodoCatFilter(v){_todoCatFilter=v||'';renderTodos();}
var _todoHistOpen=false;  // collapsible completion-history section (persist across re-renders)
function toggleTodoHist(){_todoHistOpen=!_todoHistOpen;renderTodos();}
function clearTodoLog(){if(!confirm('Clear ALL completion history? This cannot be undone.'))return;D.todo_log=[];saveD();renderTodos();}
var _todoSort='urgency';  // urgency | due | priority | name | category
var _todoAsc=true;

function setTodoFilter(f){_todoFilter=f;renderTodos();}
function setTodoSort(col){if(_todoSort===col){_todoAsc=!_todoAsc;}else{_todoSort=col;_todoAsc=true;}renderTodos();}

function _todoId(){return 't'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);}

function addTodo(){
readAll();
D.todos.push({id:_todoId(),title:'New task',note:'',
deadline_mode:'none',due_date:'',due_time:'',
recur:'none',recur_every:1,recur_dow:1,recur_dom:1,recur_month:1,
category:(D.todo_cats&&D.todo_cats[0])||'Other',priority:2,
done:false,done_date:'',link_type:'',link_ref:''});
saveD();renderTodos();
}

function todoSaveAll(){
// Fields already persist on change; this is an explicit confirm-save for peace of mind.
saveD();
if(typeof toast==='function')toast('\u2705 All tasks saved');
}
function delTodo(id){
if(!confirm('Delete this task?'))return;
D.todos=D.todos.filter(function(t){return t.id!==id;});
saveD();renderTodos();
}

function todoSaveField(id,f,el){
var t=(D.todos||[]).find(function(x){return x.id===id;});if(!t)return;
var v=el.value;
if(f==='priority'){t[f]=parseInt(v)||2;}
else if(f==='recur_every'){t[f]=Math.max(1,parseInt(v)||1);}
else if(f==='recur_dow'||f==='recur_dom'||f==='recur_month'){t[f]=parseInt(v)||0;}
else if(f==='due_date'){t[f]=v||'';}
else{t[f]=v;}
saveD();
if(typeof toast==='function')toast('\u2705 Saved');
if(['deadline_mode','recur','recur_every','due_date','priority','category'].indexOf(f)>=0)renderTodos();
}

// Advance a YYYY-MM-DD by the task's recurrence rule. Returns the next ISO date.
function _todoNextDate(t,fromISO){
var base=fromISO?new Date(fromISO+'T00:00:00'):new Date();
var y=base.getFullYear(),m=base.getMonth(),d=base.getDate();
var n=Math.max(1,t.recur_every||1); // interval multiplier (every N units)
if(t.recur==='daily'){var nd=new Date(y,m,d+n);return _billISO(nd);}
if(t.recur==='weekly'){var nd2=new Date(y,m,d+7*n);return _billISO(nd2);}
if(t.recur==='monthly'){var dom=t.recur_dom||d;var nm=m+n,ny=y;while(nm>11){nm-=12;ny++;}var nd3=new Date(ny,nm,Math.min(dom,dim(ny,nm)));return _billISO(nd3);}
if(t.recur==='yearly'){var mo=(t.recur_month||1)-1,dom2=t.recur_dom||d;var nd4=new Date(y+n,mo,Math.min(dom2,dim(y+n,mo)));return _billISO(nd4);}
return '';
}

// Complete a task. Recurring tasks roll forward to the next occurrence (stay open);
// one-time tasks are marked done.
function todoComplete(id){
var t=(D.todos||[]).find(function(x){return x.id===id;});if(!t)return;
var todayISO=_billISO(new Date());
// Log EVERY completion (one-time and each recurring occurrence) so history is complete.
if(!D.todo_log)D.todo_log=[];
var wasRecurring=!!(t.recur&&t.recur!=='none');
var occDue=(t.deadline_mode==='date'&&t.due_date)?t.due_date:'';
D.todo_log.push({id:_todoId(),todo_id:t.id,title:t.title||'',category:t.category||'',
priority:t.priority||2,done_date:todayISO,due_date:occDue,recurring:wasRecurring,
recur_label:(typeof _todoRecurLabel==='function'?'':'')});
if(wasRecurring){
// Roll forward from whichever is LATER — the occurrence's due date or today — so completing
// a task today always advances the next occurrence into the future (e.g. 'every 2 days' done
// today 28/09 → 30/09, not a past-anchored 28/09 when the old due_date lagged behind).
var from=(occDue&&occDue>todayISO)?occDue:todayISO;
var next=_todoNextDate(t,from);
if(next){t.due_date=next;t.deadline_mode='date';toast('\u2705 Logged \u00b7 rolled to '+fmtDate(next));}
else{t.done=true;t.done_date=todayISO;toast('\u2705 Done');}
}else{
t.done=true;t.done_date=todayISO;toast('\u2705 Done');
}
saveD();renderTodos();
}

function todoReopen(id){
var t=(D.todos||[]).find(function(x){return x.id===id;});if(!t)return;
t.done=false;t.done_date='';
// Remove the newest log entry for this (one-time) task so reopening undoes its completion record.
if(D.todo_log&&D.todo_log.length){for(var i=D.todo_log.length-1;i>=0;i--){if(D.todo_log[i].todo_id===t.id){D.todo_log.splice(i,1);break;}}}
saveD();renderTodos();
}

// Undo a specific completion from history. Removes the log entry and restores the task:
// recurring → roll the task's due_date BACK to the completed occurrence's date (re-open it);
// one-time → mark not-done again. Safe if the task was since deleted (just drops the log row).
function todoUndoLog(logId){
if(!D.todo_log)return;
var idx=-1;for(var i=0;i<D.todo_log.length;i++){if(D.todo_log[i].id===logId){idx=i;break;}}
if(idx<0)return;
var L=D.todo_log[idx];
var t=(D.todos||[]).find(function(x){return x.id===L.todo_id;});
if(!confirm('Undo completion of "'+(L.title||'task')+'"'+(L.done_date?' (done '+fmtDate(L.done_date)+')':'')+'?'))return;
if(t){
if(L.recurring){
// Restore the occurrence that was completed: set due_date back to the logged occurrence date.
if(L.due_date){t.due_date=L.due_date;t.deadline_mode='date';}
t.done=false;t.done_date='';
}else{
t.done=false;t.done_date='';
}
}
D.todo_log.splice(idx,1);
saveD();renderTodos();
toast('\u21a9\ufe0f Completion undone');
}

// Urgency rank for sorting: overdue(0) < today(1) < asap(2) < soon(3) < later(4) < none(5) < done(9)
function _todoRank(t,today){
if(t.done)return 9;
if(t.deadline_mode==='asap')return 0;// ASAP on top — act now, no specific date
if(t.deadline_mode!=='date'||!t.due_date)return 5;
var diff=Math.round((new Date(t.due_date+'T00:00:00')-today)/86400000);
if(diff<0)return 1;if(diff===0)return 2;if(diff<=7)return 3;return 4;
}
// Effective due timestamp for within-band date ordering (ASAP/none sort last within their band).
function _todoDueMs(t){if(t.deadline_mode==='date'&&t.due_date){return new Date(t.due_date+'T00:00:00').getTime();}return Infinity;}

function _todoStatusBadge(t,today){
if(t.done)return '<span style="color:var(--success)">\u2705 Done'+(t.done_date?' '+fmtDate(t.done_date):'')+'</span>';
if(t.deadline_mode==='asap')return '<span style="color:var(--error);font-weight:700">\u2757 ASAP</span>';
if(t.deadline_mode!=='date'||!t.due_date)return '<span style="color:var(--text3)">\u2014 no deadline</span>';
var diff=Math.round((new Date(t.due_date+'T00:00:00')-today)/86400000);
if(diff<0)return '<span style="color:var(--error);font-weight:600">\u26a0\ufe0f Overdue '+(-diff)+'d</span>';
if(diff===0)return '<span style="color:#dc2626;font-weight:700">\ud83d\udccc Due today</span>';
if(diff<=7)return '<span style="color:var(--warning);font-weight:600">\ud83d\udd14 Due in '+diff+'d</span>';
return '<span style="color:var(--primary)">\ud83d\udcc5 in '+diff+'d</span>';
}

function _todoRecurLabel(t){
if(!t.recur||t.recur==='none')return '';
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var s='';var n=Math.max(1,t.recur_every||1);var ev=(n>1?'every '+n+' ':'');
if(t.recur==='daily')s=(n>1?'every '+n+' days':'daily');
else if(t.recur==='weekly')s=ev+(n>1?'weeks':'weekly')+' \u00b7 '+DOW[t.recur_dow||0];
else if(t.recur==='monthly')s=ev+(n>1?'months':'monthly')+' \u00b7 day '+(t.recur_dom||1);
else if(t.recur==='yearly')s=ev+(n>1?'years':'yearly')+' \u00b7 '+MON[(t.recur_month||1)-1]+' '+(t.recur_dom||1);
return '<span style="font-size:8px;color:var(--primary);background:var(--primary-bg,rgba(59,130,246,0.1));padding:1px 5px;border-radius:4px">\ud83d\udd01 '+s+'</span>';
}

// Context-link options: bills (monthly/yearly/installment names) + cards.
function _todoLinkOptions(t){
var h='<option value="">\u2014 no link</option>';
var groups=[];
if(D.cards&&D.cards.length)groups.push(['card',D.cards.map(function(c){return c.name;})]);
var billNames=[];
(D.monthly||[]).forEach(function(b){if(b.name)billNames.push(b.name);});
(D.yearly||[]).forEach(function(b){if(b.name)billNames.push(b.name);});
(D.installments||[]).forEach(function(b){if(b.name)billNames.push(b.name);});
if(billNames.length)groups.push(['bill',billNames]);
groups.forEach(function(g){
h+='<optgroup label="'+(g[0]==='card'?'Cards':'Bills')+'">';
g[1].forEach(function(nm){
var val=g[0]+'::'+nm;var cur=(t.link_type&&t.link_ref)?(t.link_type+'::'+t.link_ref):'';
h+='<option value="'+esc(val)+'"'+(cur===val?' selected':'')+'>'+esc(nm)+'</option>';
});
h+='</optgroup>';
});
return h;
}

function todoSaveLink(id,el){
var t=(D.todos||[]).find(function(x){return x.id===id;});if(!t)return;
var v=el.value;
if(!v){t.link_type='';t.link_ref='';}
else{var p=v.split('::');t.link_type=p[0]||'';t.link_ref=p.slice(1).join('::')||'';}
saveD();
}

function renderTodos(){
var el=document.getElementById('todos-content');if(!el)return;
if(!D){el.innerHTML='<p class="text-muted">No data.</p>';return;}
if(!D.todos)D.todos=[];
var today=new Date();today.setHours(0,0,0,0);

var items=D.todos.slice().filter(function(t){
if(_todoCatFilter&&(t.category||'')!==_todoCatFilter)return false;
if(_todoFilter==='all')return true;
if(_todoFilter==='open')return !t.done;
if(_todoFilter==='done')return !!t.done;
// Urgency-band filters apply to OPEN tasks only (done tasks are history).
if(t.done)return false;
var rk=_todoRank(t,today);// 0 asap,1 overdue,2 today,3 soon,4 upcoming/later,5 none
if(_todoFilter==='asap')return rk===0;
if(_todoFilter==='overdue')return rk===1;
if(_todoFilter==='today')return rk===2;
if(_todoFilter==='soon')return rk===3;
if(_todoFilter==='upcoming')return rk===4;
return true;
});
var _c=function(a,b){var r=0;
if(_todoSort==='urgency'){r=_todoRank(a,today)-_todoRank(b,today);if(r===0)r=_todoDueMs(a)-_todoDueMs(b);}
else if(_todoSort==='due')r=((a.due_date||'zzzz')).localeCompare(b.due_date||'zzzz');
else if(_todoSort==='priority')r=(a.priority||2)-(b.priority||2);
else if(_todoSort==='name')r=(a.title||'').localeCompare(b.title||'');
else if(_todoSort==='category')r=(a.category||'').localeCompare(b.category||'');
if(r===0){r=_todoRank(a,today)-_todoRank(b,today);if(r===0)r=_todoDueMs(a)-_todoDueMs(b);}
return _todoAsc?r:-r;
};
items.sort(_c);

var openCount=D.todos.filter(function(t){return !t.done;}).length;
var overdue=D.todos.filter(function(t){return !t.done&&t.deadline_mode==='date'&&t.due_date&&(new Date(t.due_date+'T00:00:00')<today);}).length;

var catOpts=function(sel){return (D.todo_cats||['Other']).slice().sort(function(a,b){return a.localeCompare(b);}).map(function(c){
return '<option'+(sel===c?' selected':'')+'>'+esc(c)+'</option>';}).join('');};

var h='<div class="card">';
h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">';
h+='<h2 style="margin:0"><i class="fa-solid fa-list-check"></i> To-Do</h2>';
h+='<span style="flex:1"></span>';
h+='<button class="btn btn-ghost" style="font-size:11px;padding:4px 12px" onclick="todoSaveAll()" title="All changes save automatically; click to confirm"><i class="fa-solid fa-floppy-disk"></i> Save</button>';
h+='</div>';

h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:11px">';
h+='<div style="background:var(--bg3);border-radius:6px;padding:6px 12px"><span style="color:var(--text3)">Open</span> <b>'+openCount+'</b></div>';
if(overdue)h+='<div style="background:rgba(220,38,38,0.08);border-radius:6px;padding:6px 12px"><span style="color:var(--error)">Overdue</span> <b style="color:var(--error)">'+overdue+'</b></div>';
h+='</div>';

var chips=[['open','\ud83d\udcdd Open'],['asap','\u2757 ASAP'],['overdue','\u26a0\ufe0f Overdue'],['today','\ud83d\udccc Due today'],['soon','\ud83d\udd14 Due soon'],['upcoming','\ud83d\udcc5 Upcoming'],['done','\u2705 Done'],['all','All']];
h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
chips.forEach(function(c){var on=_todoFilter===c[0];
h+='<button class="btn '+(on?'btn-primary':'btn-ghost')+'" style="font-size:10px;padding:3px 10px" onclick="setTodoFilter(\''+c[0]+'\')">'+c[1]+'</button>';});
// Category filter dropdown (combines with the status chips above).
var _tcats=(D.todo_cats||[]).slice().sort(function(a,b){return a.localeCompare(b);});
h+='<span style="flex:1"></span>';
h+='<select class="sel" style="font-size:10px;padding:2px 8px" onchange="setTodoCatFilter(this.value)" title="Filter by category"><option value="">All categories</option>'+_tcats.map(function(cn){return '<option value="'+esc(cn)+'"'+(_todoCatFilter===cn?' selected':'')+'>'+esc(cn)+'</option>';}).join('')+'</select>';
h+='</div>';

if(!items.length){
h+='<p class="text-muted" style="font-size:11px">'+(D.todos.length?'No tasks match this filter.':'No tasks yet \u2705')+'</p>';
h+='<div class="add-row" onclick="addTodo()"><i class="fa-solid fa-plus"></i> Add task</div></div>';
el.innerHTML=h;return;
}

var _ar=function(col){return _todoSort===col?(_todoAsc?' \u25b2':' \u25bc'):'';};
h+='<div style="overflow-x:auto"><table class="tbl" style="font-size:11px;min-width:920px"><thead><tr>'+
'<th style="width:28px"></th>'+
'<th style="cursor:pointer" onclick="setTodoSort(\'name\')">Task'+_ar('name')+'</th>'+
'<th style="cursor:pointer" onclick="setTodoSort(\'category\')">Category'+_ar('category')+'</th>'+
'<th style="cursor:pointer" onclick="setTodoSort(\'priority\')">Priority'+_ar('priority')+'</th>'+
'<th>Deadline</th>'+
'<th style="cursor:pointer" onclick="setTodoSort(\'urgency\')">Status'+_ar('urgency')+'</th>'+
'<th>Link</th>'+
'<th style="width:56px"></th></tr></thead><tbody>';

var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

items.forEach(function(t){
var overdueRow=!t.done&&t.deadline_mode==='date'&&t.due_date&&(new Date(t.due_date+'T00:00:00')<today);
var dueToday=!t.done&&t.deadline_mode==='date'&&t.due_date&&(Math.round((new Date(t.due_date+'T00:00:00')-today)/86400000)===0);
var rowStyle=t.done?'opacity:.55;':(overdueRow?'background:rgba(220,38,38,0.06);box-shadow:inset 3px 0 0 var(--error)':(dueToday?'background:rgba(245,158,11,0.08);box-shadow:inset 3px 0 0 var(--warning)':((t.deadline_mode==='asap')?'background:rgba(220,38,38,0.06);box-shadow:inset 3px 0 0 var(--error)':'')));

// Deadline editor cell — mode dropdown + conditional date/time or recurrence day pickers.
var dlCell='<select class="sel" data-tid="'+t.id+'" data-tf="deadline_mode" onchange="todoSaveField(\''+t.id+'\',\'deadline_mode\',this)" style="font-size:10px"><option value="none"'+(t.deadline_mode==='none'?' selected':'')+'>None</option><option value="date"'+(t.deadline_mode==='date'?' selected':'')+'>Date</option><option value="asap"'+(t.deadline_mode==='asap'?' selected':'')+'>ASAP</option></select>';
if(t.deadline_mode==='date'){
dlCell+=' <input type="date" class="inp-inline" value="'+esc(t.due_date||'')+'" data-tid="'+t.id+'" data-tf="due_date" onchange="todoSaveField(\''+t.id+'\',\'due_date\',this)" style="width:130px" title="Deadline date">';
}
// Time can be set for ANY deadline mode (e.g. recurring 'every day at 09:00', or an ASAP-by time).
dlCell+=' <input type="time" class="inp-inline" value="'+esc(t.due_time||'')+'" data-tid="'+t.id+'" data-tf="due_time" onchange="todoSaveField(\''+t.id+'\',\'due_time\',this)" style="width:74px" title="Optional time">';
// Recurrence row (under deadline)
var recCell='<select class="sel" data-tid="'+t.id+'" data-tf="recur" onchange="todoSaveField(\''+t.id+'\',\'recur\',this)" style="font-size:9px"><option value="none"'+(t.recur==='none'?' selected':'')+'>once</option><option value="daily"'+(t.recur==='daily'?' selected':'')+'>daily</option><option value="weekly"'+(t.recur==='weekly'?' selected':'')+'>weekly</option><option value="monthly"'+(t.recur==='monthly'?' selected':'')+'>monthly</option><option value="yearly"'+(t.recur==='yearly'?' selected':'')+'>yearly</option></select>';
if(t.recur&&t.recur!=='none'){var _unit=(t.recur==='daily'?'day':t.recur==='weekly'?'week':t.recur==='monthly'?'month':'year');recCell+=' <span style="font-size:8px;color:var(--text3)">every</span> <input type="number" min="1" class="inp-inline" value="'+(t.recur_every||1)+'" data-tid="'+t.id+'" data-tf="recur_every" onchange="todoSaveField(\''+t.id+'\',\'recur_every\',this)" style="width:40px" title="Repeat every N '+_unit+'s"> <span style="font-size:8px;color:var(--text3)">'+_unit+'(s)</span>';}
if(t.recur==='weekly'){recCell+=' <select class="sel" data-tid="'+t.id+'" data-tf="recur_dow" onchange="todoSaveField(\''+t.id+'\',\'recur_dow\',this)" style="font-size:9px">'+DOW.map(function(dn,di){return '<option value="'+di+'"'+((t.recur_dow||0)===di?' selected':'')+'>'+dn+'</option>';}).join('')+'</select>';}
else if(t.recur==='monthly'){recCell+=' <select class="sel" data-tid="'+t.id+'" data-tf="recur_dom" onchange="todoSaveField(\''+t.id+'\',\'recur_dom\',this)" style="font-size:9px">'+Array.from({length:31},function(_,k){return k+1;}).map(function(dn){return '<option value="'+dn+'"'+((t.recur_dom||1)===dn?' selected':'')+'>'+dn+'</option>';}).join('')+'</select>';}
else if(t.recur==='yearly'){recCell+=' <select class="sel" data-tid="'+t.id+'" data-tf="recur_month" onchange="todoSaveField(\''+t.id+'\',\'recur_month\',this)" style="font-size:9px">'+MON.map(function(mn,mi){return '<option value="'+(mi+1)+'"'+((t.recur_month||1)===(mi+1)?' selected':'')+'>'+mn+'</option>';}).join('')+'</select> <select class="sel" data-tid="'+t.id+'" data-tf="recur_dom" onchange="todoSaveField(\''+t.id+'\',\'recur_dom\',this)" style="font-size:9px">'+Array.from({length:31},function(_,k){return k+1;}).map(function(dn){return '<option value="'+dn+'"'+((t.recur_dom||1)===dn?' selected':'')+'>'+dn+'</option>';}).join('')+'</select>';}

h+='<tr style="'+rowStyle+'">'+
'<td class="r"><input type="checkbox"'+(t.done?' checked':'')+' title="'+(t.done?'Reopen':'Complete')+'" onchange="this.checked?todoComplete(\''+t.id+'\'):todoReopen(\''+t.id+'\')"></td>'+
'<td><input class="inp-inline" value="'+esc(t.title||'')+'" data-tid="'+t.id+'" data-tf="title" onchange="todoSaveField(\''+t.id+'\',\'title\',this)" style="font-weight:500;min-width:130px'+(t.done?';text-decoration:line-through':'')+'">'+
'<br><input class="inp-inline" value="'+esc(t.note||'')+'" placeholder="note / idea" data-tid="'+t.id+'" data-tf="note" onchange="todoSaveField(\''+t.id+'\',\'note\',this)" style="font-size:9px;color:var(--text3);min-width:170px"></td>'+
'<td><select class="sel" data-tid="'+t.id+'" data-tf="category" onchange="todoSaveField(\''+t.id+'\',\'category\',this)" style="font-size:10px">'+catOpts(t.category)+'</select></td>'+
'<td><select class="sel" data-tid="'+t.id+'" data-tf="priority" onchange="todoSaveField(\''+t.id+'\',\'priority\',this)" style="font-size:10px"><option value="1"'+(t.priority===1?' selected':'')+'>\ud83d\udd34 High</option><option value="2"'+((t.priority||2)===2?' selected':'')+'>\ud83d\udfe1 Normal</option><option value="3"'+(t.priority===3?' selected':'')+'>\u26aa Low</option></select></td>'+
'<td style="white-space:nowrap">'+dlCell+'<br>'+recCell+'</td>'+
'<td style="white-space:nowrap">'+_todoStatusBadge(t,today)+' '+_todoRecurLabel(t)+'</td>'+
'<td><select class="sel" data-tid="'+t.id+'" data-tf="link" onchange="todoSaveLink(\''+t.id+'\',this)" style="font-size:9px;max-width:120px">'+_todoLinkOptions(t)+'</select></td>'+
'<td style="white-space:nowrap"><button class="del-btn" title="Delete" onclick="delTodo(\''+t.id+'\')"><i class="fa-solid fa-xmark"></i></button></td>'+
'</tr>';
});
h+='</tbody></table></div>';
h+='<div class="add-row" onclick="addTodo()"><i class="fa-solid fa-plus"></i> Add task</div>';
h+='<p class="text-muted" style="font-size:9px;margin-top:8px">\ud83d\udca1 Recurring tasks roll forward to the next occurrence when you complete them (no duplicate rows). To-Dos are for <b>actions</b> \u2014 anything with an amount that moves your balance belongs in Bills &amp; Plans instead.</p>';
h+='</div>';
// ===== Completion History (collapsible) =====
var log=(D.todo_log||[]).slice().sort(function(a,b){return (b.done_date||'').localeCompare(a.done_date||'');});
h+='<div class="card" style="margin-top:12px">';
h+='<h2 style="font-size:12px;cursor:pointer;user-select:none;margin:0" onclick="toggleTodoHist()"><span style="display:inline-block;width:12px">'+(_todoHistOpen?'\u25bc':'\u25b6')+'</span> \u2705 Completion History <span style="font-weight:400;color:var(--text3);font-size:10px">('+log.length+')</span></h2>';
h+='<div style="display:'+(_todoHistOpen?'':'none')+';margin-top:8px">';
if(!log.length){h+='<p class="text-muted" style="font-size:11px">No completed tasks yet. Completing a task (including each recurring occurrence) records it here.</p>';}
else{
h+='<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button class="btn btn-ghost" style="font-size:9px;padding:2px 8px;color:var(--error)" onclick="clearTodoLog()"><i class="fa-solid fa-trash"></i> Clear history</button></div>';
h+='<div style="overflow-x:auto"><table class="tbl" style="font-size:11px;min-width:520px"><thead><tr><th>Task</th><th>Category</th><th>Done on</th><th>Was due</th><th>Type</th><th></th></tr></thead><tbody>';
log.forEach(function(L){
h+='<tr><td>'+esc(L.title||'')+'</td>'+
'<td style="font-size:10px;color:var(--text3)">'+esc(L.category||'')+'</td>'+
'<td style="white-space:nowrap">'+(L.done_date?fmtDate(L.done_date):'\u2014')+'</td>'+
'<td style="white-space:nowrap;font-size:10px;color:var(--text3)">'+(L.due_date?fmtDate(L.due_date):'\u2014')+'</td>'+
'<td>'+(L.recurring?'<span style="font-size:8px;color:var(--primary);background:var(--primary-bg,rgba(59,130,246,0.1));padding:1px 5px;border-radius:4px">\ud83d\udd01 recurring</span>':'<span style="font-size:8px;color:var(--text3)">one-time</span>')+'</td>'+
'<td style="white-space:nowrap"><button class="btn btn-ghost" style="font-size:8px;padding:2px 7px" title="Undo this completion" onclick="todoUndoLog(\''+L.id+'\')"><i class="fa-solid fa-rotate-left"></i> Undo</button></td></tr>';
});
h+='</tbody></table></div>';
}
h+='</div></div>';
el.innerHTML=h;
}


// ===== Dashboard card: To-Do — Due & Upcoming =====
// Shows OPEN tasks that need action, relative to today: overdue, due today, due soon (<=30d),
// plus ASAP tasks (no date). Mirrors the Bills 'Due & Upcoming' card pattern.
function renderDashTodos(){
var el=document.getElementById('dash-todos');if(!el)return;
if(!D||!D.todos){el.innerHTML='';return;}
var today=new Date();today.setHours(0,0,0,0);
var HORIZON=30;
var items=D.todos.filter(function(t){
if(t.done)return false;
if(t.deadline_mode==='asap')return true;
if(t.deadline_mode!=='date'||!t.due_date)return false;
var diff=Math.round((new Date(t.due_date+'T00:00:00')-today)/86400000);
return diff<=HORIZON; // overdue (negative) through 30 days out
});
if(!items.length){el.innerHTML='';return;}
// Sort by urgency then date
items.sort(function(a,b){var r=_todoRank(a,today)-_todoRank(b,today);if(r===0)r=_todoDueMs(a)-_todoDueMs(b);return r;});
var h='<div class="card"><h2><i class="fa-solid fa-list-check"></i> To-Do &mdash; Due &amp; Upcoming</h2>';
h+='<table class="tbl" style="font-size:11px"><thead><tr><th>Task</th><th>Category</th><th>When</th><th>Status</th></tr></thead><tbody>';
items.slice(0,12).forEach(function(t){
var overdueRow=t.deadline_mode==='date'&&t.due_date&&(new Date(t.due_date+'T00:00:00')<today);
var dueToday=t.deadline_mode==='date'&&t.due_date&&(Math.round((new Date(t.due_date+'T00:00:00')-today)/86400000)===0);
var rs=overdueRow?'background:rgba(220,38,38,0.06);box-shadow:inset 3px 0 0 var(--error)':(dueToday?'background:rgba(245,158,11,0.08);box-shadow:inset 3px 0 0 var(--warning)':(t.deadline_mode==='asap'?'background:rgba(220,38,38,0.06);box-shadow:inset 3px 0 0 var(--error)':''));
var whenTxt,relTxt='';
if(t.deadline_mode==='asap'){whenTxt='<span style="color:var(--error);font-weight:600">ASAP</span>';}
else{var diff=Math.round((new Date(t.due_date+'T00:00:00')-today)/86400000);
whenTxt=fmtDate(t.due_date)+(t.due_time?' '+esc(t.due_time):'');
relTxt=' <span style="font-size:8px;color:var(--text3)">'+(diff===0?'today':diff>0?'in '+diff+'d':(-diff)+'d ago')+'</span>';}
h+='<tr style="'+rs+'"><td>'+esc(t.title||'')+'</td>'+
'<td style="font-size:10px;color:var(--text3)">'+esc(t.category||'')+'</td>'+
'<td style="white-space:nowrap">'+whenTxt+relTxt+'</td>'+
'<td>'+_todoStatusBadge(t,today)+'</td></tr>';
});
h+='</tbody></table>';
var overdueN=items.filter(function(t){return t.deadline_mode==='date'&&t.due_date&&(new Date(t.due_date+'T00:00:00')<today);}).length;
var openN=D.todos.filter(function(t){return !t.done;}).length;
h+='<div style="display:flex;gap:8px;margin-top:8px;font-size:10px">';
h+='<div style="flex:1;background:var(--bg3);border-radius:6px;padding:6px 10px"><span style="color:var(--text3)">Open tasks</span> <b>'+openN+'</b></div>';
if(overdueN)h+='<div style="flex:1;background:rgba(220,38,38,0.08);border-radius:6px;padding:6px 10px"><span style="color:var(--error)">Overdue</span> <b style="color:var(--error)">'+overdueN+'</b></div>';
h+='</div>';
h+='<div style="margin-top:8px"><button class="btn btn-ghost" style="font-size:10px;padding:3px 10px" onclick="document.querySelector(\'.nav-tab[data-tab=&quot;todos&quot;]\').click()"><i class="fa-solid fa-arrow-right"></i> Open To-Do</button></div>';
h+='</div>';
el.innerHTML=h;
}
