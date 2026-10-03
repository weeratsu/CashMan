// ui-wishlist.js — Wishlist module (finance-linked)
// Items you want to buy: target price + target date + priority + category + status + URL.
// Finance bridge: check whether the item FITS your projected balance at its target date
// (using SIM.mAgg end-of-month balance), and one-click convert a wish into a Planned expense.
// No personal data hardcoded — all rows live in D.wishlist.

var _wishFilter='active'; // active (wishing) | all | bought | dropped
var _wishCatFilter='';    // '' = all categories; else a category name (combines with status filter)
function setWishCatFilter(v){_wishCatFilter=v||'';renderWishlist();}
var _wishCatOpen=false;   // collapsible category-summary section (persist across re-renders)
function toggleWishCat(){_wishCatOpen=!_wishCatOpen;renderWishlist();}
var _wishSort='priority'; // priority | price | target | name | status
var _wishAsc=true;

function setWishFilter(f){_wishFilter=f;renderWishlist();}
function setWishSort(col){if(_wishSort===col){_wishAsc=!_wishAsc;}else{_wishSort=col;_wishAsc=true;}renderWishlist();}

function _wishId(){return 'w'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);}

function addWish(){
readAll();
D.wishlist.push({id:_wishId(),item:'New item',note:'',target_price:0,target_date:'',
priority:2,category:(D.wish_cats&&D.wish_cats[0])||'Other',status:'wishing',url:'',
added_date:_billISO(new Date())});
saveD();renderWishlist();
}

function delWish(id){
if(!confirm('Delete this wishlist item?'))return;
D.wishlist=D.wishlist.filter(function(w){return w.id!==id;});
saveD();renderWishlist();
}

// Read all editable inputs back into D.wishlist (called before save/convert).
function wishReadAll(){
if(!D.wishlist)return;
document.querySelectorAll('[data-wid]').forEach(function(el){
var id=el.getAttribute('data-wid'),f=el.getAttribute('data-wf');
var w=D.wishlist.find(function(x){return x.id===id;});if(!w)return;
var v=el.value;
if(f==='target_price'){w[f]=parseFloat((v+'').replace(/,/g,''))||0;}
else if(f==='priority'){w[f]=parseInt(v)||2;}
else if(f==='target_date'){w[f]=v?(parseDMY(v)||''):'';}
else{w[f]=v;}
});
}

function wishSaveField(id,f,el){
var w=(D.wishlist||[]).find(function(x){return x.id===id;});if(!w)return;
var v=el.value;
if(f==='target_price'){w[f]=parseFloat((v+'').replace(/,/g,''))||0;}
else if(f==='priority'){w[f]=parseInt(v)||2;}
else if(f==='target_date'){w[f]=v?(parseDMY(v)||''):'';}
else{w[f]=v;}
saveD();
// Re-render only when a field that affects sorting/fit changed.
if(f==='target_price'||f==='priority'||f==='target_date'||f==='status')renderWishlist();
}

// Projected balance at a target date's month-end, from the latest simulation.
// Returns null when unknown (no sim / date outside horizon).
function _wishProjBal(targetISO){
if(!targetISO||typeof SIM==='undefined'||!SIM||!SIM.mAgg)return null;
var mk=targetISO.slice(0,7); // YYYY-MM
var a=SIM.mAgg[mk];
if(a&&typeof a.end==='number')return a.end;
// If target month is beyond the sim horizon, fall back to the final balance.
var keys=Object.keys(SIM.mAgg).sort();
if(keys.length){
if(mk>keys[keys.length-1])return SIM.finalB;
if(mk<keys[0])return SIM.mAgg[keys[0]].start;
}
return null;
}

// Fit assessment for a wish: does buying it keep the projected balance non-negative?
function _wishFit(w){
var price=w.target_price||0;
if(!price)return{state:'none',label:'no price',color:'var(--text3)'};
var bal=_wishProjBal(w.target_date);
if(bal==null)return{state:'unknown',label:'set a target date to check fit',color:'var(--text3)'};
var after=bal-price;
if(after>=0)return{state:'fit',label:'\u2705 fits \u00b7 \u0e3f'+fmt(after)+' left after',color:'var(--success)'};
return{state:'over',label:'\u26a0\ufe0f short by \u0e3f'+fmt(Math.abs(after)),color:'var(--error)'};
}

// Convert a wish into a Planned expense (Bills & Plans → Planned), then mark it bought.
function wishToPlanned(id){
var w=(D.wishlist||[]).find(function(x){return x.id===id;});if(!w)return;
if(!w.target_date){alert('Set a target date first — the Planned expense needs a date.');return;}
if(!(w.target_price>0)){alert('Set a target price first.');return;}
if(!confirm('Add "'+w.item+'" (\u0e3f'+fmt(w.target_price)+') as a Planned expense on '+fmtDate(w.target_date)+'?\nThis will show in Timeline and cash-flow projections.'))return;
readAll();
if(!D.planned)D.planned=[];
D.planned.push({name:w.item,type:'Other',amount:w.target_price,date:w.target_date,
card:'Cash/Direct',direction:'expense',own_by:'Me',notes:'From wishlist'});
w.status='bought';
saveD();
if(typeof simulate==='function')simulate();
if(typeof renderAllTabs==='function')renderAllTabs();
renderWishlist();
toast('\ud83d\uded2 Added to Planned expenses \u00b7 marked bought');
}

function _wishPrioLabel(p){return p===1?'\ud83d\udd34 High':p===3?'\u26aa Low':'\ud83d\udfe1 Normal';}

function renderWishlist(){
var el=document.getElementById('wishlist-content');if(!el)return;
if(!D){el.innerHTML='<p class="text-muted">No data.</p>';return;}
if(!D.wishlist)D.wishlist=[];

var items=D.wishlist.slice();
// Filter
items=items.filter(function(w){
if(_wishCatFilter&&(w.category||'')!==_wishCatFilter)return false;
if(_wishFilter==='all')return true;
if(_wishFilter==='active')return (w.status||'wishing')==='wishing';
return (w.status||'wishing')===_wishFilter;
});
// Sort
var _c=function(a,b){var r=0;
if(_wishSort==='priority')r=(a.priority||2)-(b.priority||2);
else if(_wishSort==='price')r=(a.target_price||0)-(b.target_price||0);
else if(_wishSort==='target')r=((a.target_date||'zzzz')).localeCompare(b.target_date||'zzzz');
else if(_wishSort==='name')r=(a.item||'').localeCompare(b.item||'');
else if(_wishSort==='status')r=(a.status||'').localeCompare(b.status||'');
if(r===0)r=(a.priority||2)-(b.priority||2);
return _wishAsc?r:-r;
};
items.sort(_c);

var totActive=D.wishlist.filter(function(w){return (w.status||'wishing')==='wishing';})
.reduce(function(s,w){return s+(w.target_price||0);},0);
// Summary metrics
var _active=D.wishlist.filter(function(w){return (w.status||'wishing')==='wishing';});
var _activeCount=_active.length;
var _boughtCount=D.wishlist.filter(function(w){return (w.status||'wishing')==='bought';}).length;
var _fitsNow=0,_shortNow=0;
_active.forEach(function(w){var f=_wishFit(w);if(f.state==='fit')_fitsNow++;else if(f.state==='over')_shortNow++;});
// Soonest upcoming target date among active wishes (today or later)
var _todayISO=(function(){var d=new Date();d.setHours(0,0,0,0);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})();
var _nextTarget='';_active.forEach(function(w){if(w.target_date&&w.target_date>=_todayISO){if(!_nextTarget||w.target_date<_nextTarget)_nextTarget=w.target_date;}});

var catOpts=function(sel){return (D.wish_cats||['Other']).slice().sort(function(a,b){return a.localeCompare(b);}).map(function(c){
return '<option'+(sel===c?' selected':'')+'>'+esc(c)+'</option>';}).join('');};

var h='<div class="card">';
h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">';
h+='<h2 style="margin:0"><i class="fa-solid fa-star"></i> Wishlist</h2>';
h+='<span style="flex:1"></span>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:4px 10px" onclick="exportTrxExcel(\'wishlist\')" title="Export Wishlist to Excel"><i class="fa-solid fa-download"></i> Excel</button>';
h+='<button class="btn btn-ghost" style="font-size:10px;padding:4px 10px" onclick="document.getElementById(\'imp-wishlist\').click()" title="Import Wishlist from Excel (adds rows)"><i class="fa-solid fa-upload"></i> Import</button>';
h+='<input type="file" id="imp-wishlist" accept=".xlsx,.xls" style="display:none" onchange="importTrxExcel(\'wishlist\',event)">';
h+='</div>';

// ===== Summary card (6 tiles) =====
var _wtile=function(label,val,color,bg){return '<div style="flex:1;min-width:92px;background:'+(bg||'var(--bg3)')+';border-radius:8px;padding:10px 12px;text-align:center"><div style="font-size:18px;font-weight:700;line-height:1.15;color:'+(color||'var(--text)')+'">'+val+'</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+label+'</div></div>';};
var _fmtTarget=_nextTarget?fmtDate(_nextTarget):'\u2014';
h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
h+=_wtile('Active wishes',_activeCount,'var(--text)',null);
h+=_wtile('Total wished','\u0e3f'+fmt(totActive),'var(--text)',null);
h+=_wtile('\u2705 Fits now',_fitsNow,_fitsNow?'var(--success)':'var(--text3)',_fitsNow?'rgba(16,185,129,0.10)':null);
h+=_wtile('\u26a0\ufe0f Short',_shortNow,_shortNow?'var(--error)':'var(--text3)',_shortNow?'rgba(220,38,38,0.08)':null);
h+=_wtile('\ud83d\uded2 Bought',_boughtCount,'var(--text)',null);
h+=_wtile('Next target',_fmtTarget,'var(--text)',null);
h+='</div>';

// ===== Category breakdown (active wishes by category: count + total baht) =====
(function(){
var map={};
_active.forEach(function(w){var k=(w.category||'\u2014');if(!map[k])map[k]={n:0,sum:0};map[k].n++;map[k].sum+=(w.target_price||0);});
var keys=Object.keys(map).sort(function(a,b){return map[b].sum-map[a].sum||map[b].n-map[a].n||a.localeCompare(b);});
h+='<div style="margin-bottom:12px">';
h+='<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="toggleWishCat()"><i class="fa-solid fa-chevron-'+(_wishCatOpen?'down':'right')+'"></i> By category ('+keys.length+')</button>';
if(_wishCatOpen){
if(!keys.length){h+='<div style="font-size:11px;color:var(--text3);padding:6px 4px">No active wishes.</div>';}
else{
h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
keys.forEach(function(k){var m=map[k];
h+='<div style="background:var(--bg3);border-radius:6px;padding:6px 12px;font-size:11px"><span style="color:var(--text3)">'+esc(k)+'</span> <b>'+m.n+'</b> <span style="color:var(--text3);font-family:var(--mono)">\u0e3f'+fmt(m.sum)+'</span></div>';});
h+='</div>';}
}
h+='</div>';
})();

// Filter chips
var chips=[['active','\u2b50 Active'],['bought','\ud83d\uded2 Bought'],['dropped','\ud83d\uddd1\ufe0f Dropped'],['all','All']];
h+='<div class="filterbar" style="gap:6px">';
chips.forEach(function(c){var on=_wishFilter===c[0];
h+='<button class="btn '+(on?'btn-primary':'btn-ghost')+'" style="font-size:10px;padding:3px 10px" onclick="setWishFilter(\''+c[0]+'\')">'+c[1]+'</button>';});
// Category filter dropdown (combines with the status chips above).
var _wcats=(D.wish_cats||[]).slice().sort(function(a,b){return a.localeCompare(b);});
h+='<span style="flex:1"></span>';
h+='<select class="sel" style="font-size:10px;padding:2px 8px" onchange="setWishCatFilter(this.value)" title="Filter by category"><option value="">All categories</option>'+_wcats.map(function(cn){return '<option value="'+esc(cn)+'"'+(_wishCatFilter===cn?' selected':'')+'>'+esc(cn)+'</option>';}).join('')+'</select>';
h+='</div>';

if(!items.length){
h+='<p class="text-muted" style="font-size:11px">'+(D.wishlist.length?'No items match this filter.':'No wishlist items yet \u2b50')+'</p>';
h+='<div class="add-row" onclick="addWish()"><i class="fa-solid fa-plus"></i> Add item</div></div>';
el.innerHTML=h;return;
}

var _ar=function(col){return _wishSort===col?(_wishAsc?' \u25b2':' \u25bc'):'';};
h+='<div style="overflow-x:auto"><table class="tbl" style="font-size:11px;min-width:900px"><thead><tr>'+
'<th style="cursor:pointer" onclick="setWishSort(\'name\')">Item'+_ar('name')+'</th>'+
'<th>Category</th>'+
'<th style="cursor:pointer" onclick="setWishSort(\'priority\')">Priority'+_ar('priority')+'</th>'+
'<th class="r" style="cursor:pointer" onclick="setWishSort(\'price\')">Target \u0e3f'+_ar('price')+'</th>'+
'<th style="cursor:pointer" onclick="setWishSort(\'target\')">Target date'+_ar('target')+'</th>'+
'<th>Fits?</th>'+
'<th style="cursor:pointer" onclick="setWishSort(\'status\')">Status'+_ar('status')+'</th>'+
'<th style="width:80px"></th></tr></thead><tbody>';

items.forEach(function(w){
var fit=_wishFit(w);
var dimd=(w.status&&w.status!=='wishing')?'opacity:.55;':'';
h+='<tr style="'+dimd+'">'+
'<td><input class="inp-inline" value="'+esc(w.item||'')+'" data-wid="'+w.id+'" data-wf="item" onchange="wishSaveField(\''+w.id+'\',\'item\',this)" style="font-weight:500;min-width:120px">'+
(w.url?' <a href="'+esc(w.url)+'" target="_blank" title="Open link" style="color:var(--primary)"><i class="fa-solid fa-link" style="font-size:9px"></i></a>':'')+
'<br><input class="inp-inline" value="'+esc(w.note||'')+'" placeholder="note / URL below" data-wid="'+w.id+'" data-wf="note" onchange="wishSaveField(\''+w.id+'\',\'note\',this)" style="font-size:9px;color:var(--text3);min-width:160px">'+
'<input class="inp-inline" value="'+esc(w.url||'')+'" placeholder="https://..." data-wid="'+w.id+'" data-wf="url" onchange="wishSaveField(\''+w.id+'\',\'url\',this)" style="font-size:9px;color:var(--text3);min-width:160px"></td>'+
'<td><select class="sel" data-wid="'+w.id+'" data-wf="category" onchange="wishSaveField(\''+w.id+'\',\'category\',this)" style="font-size:10px">'+catOpts(w.category)+'</select></td>'+
'<td><select class="sel" data-wid="'+w.id+'" data-wf="priority" onchange="wishSaveField(\''+w.id+'\',\'priority\',this)" style="font-size:10px"><option value="1"'+(w.priority===1?' selected':'')+'>\ud83d\udd34 High</option><option value="2"'+((w.priority||2)===2?' selected':'')+'>\ud83d\udfe1 Normal</option><option value="3"'+(w.priority===3?' selected':'')+'>\u26aa Low</option></select></td>'+
'<td class="r"><input class="inp-inline r" value="'+(w.target_price?fmt(w.target_price):'')+'" placeholder="0.00" data-wid="'+w.id+'" data-wf="target_price" onchange="wishSaveField(\''+w.id+'\',\'target_price\',this)" style="font-family:var(--mono);width:90px;text-align:right"></td>'+
'<td><input class="inp-inline" value="'+(w.target_date?fmtDate(w.target_date):'')+'" placeholder="dd/mm/yyyy" data-wid="'+w.id+'" data-wf="target_date" onchange="wishSaveField(\''+w.id+'\',\'target_date\',this)" style="font-family:var(--mono);width:96px"></td>'+
'<td style="font-size:9px;color:'+fit.color+'">'+fit.label+'</td>'+
'<td><select class="sel" data-wid="'+w.id+'" data-wf="status" onchange="wishSaveField(\''+w.id+'\',\'status\',this)" style="font-size:10px"><option value="wishing"'+((w.status||'wishing')==='wishing'?' selected':'')+'>\u2b50 Wishing</option><option value="bought"'+(w.status==='bought'?' selected':'')+'>\ud83d\uded2 Bought</option><option value="dropped"'+(w.status==='dropped'?' selected':'')+'>\ud83d\uddd1\ufe0f Dropped</option></select></td>'+
'<td style="white-space:nowrap">'+
((w.status||'wishing')==='wishing'?'<button class="btn btn-ghost" title="Add as Planned expense (flows into Timeline)" style="font-size:8px;padding:2px 6px;color:var(--primary)" onclick="wishToPlanned(\''+w.id+'\')"><i class="fa-solid fa-arrow-right-to-bracket"></i> Plan</button>':'')+
'<button class="del-btn" title="Delete" onclick="delWish(\''+w.id+'\')"><i class="fa-solid fa-xmark"></i></button></td>'+
'</tr>';
});
h+='</tbody></table></div>';
h+='<div class="add-row" onclick="addWish()"><i class="fa-solid fa-plus"></i> Add item</div>';
h+='<p class="text-muted" style="font-size:9px;margin-top:8px">\ud83d\udca1 "Fits?" compares each item\'s target price against your projected balance at its target month (from the latest simulation). Use <b>Plan</b> to turn a wish into a Planned expense.</p>';
h+='</div>';
el.innerHTML=h;
}
