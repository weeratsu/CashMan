// ui-holidays.js — Setup > Holidays: yearly holiday master (D.holidays=[{id,date,name}]).
// Editable table (add/edit/delete) + Excel import/export. Calendar reads window.holidayOn(iso).
(function(){
if(typeof D!=='undefined'&&D&&!Array.isArray(D.holidays))D.holidays=[];
var _hy=new Date().getFullYear();
function _hl(){if(!Array.isArray(D.holidays))D.holidays=[];return D.holidays;}
function _hid(){D._holiday_seq=(D._holiday_seq||0)+1;return 'hd'+D._holiday_seq;}
function _e(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function _iso(v){
 if(v==null||v==='')return '';
 if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
 if(typeof v==='number'&&v>10000&&v<100000){var d=new Date(Math.round((v-25569)*86400000));return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
 var s=String(v).trim(),m;
 if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 if((m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))){var y=+m[3];if(y>2400)y-=543;return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');}
 return '';
}
function _dmy(iso){return iso?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'';}
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
window.holidayOn=function(iso){var r=_hl().filter(function(h){return h.date===iso;});return r.length?r:null;};
window.renderHolidays=function(){
 var el=document.getElementById('holiday-body');if(!el)return;
 var yrs={};_hl().forEach(function(h){if(h.date)yrs[h.date.slice(0,4)]=1;});yrs[_hy]=1;yrs[new Date().getFullYear()]=1;
 var ys=Object.keys(yrs).sort();
 var rows=_hl().filter(function(h){return (h.date||'').slice(0,4)===String(_hy)||!h.date;}).sort(function(a,b){return (a.date||'9').localeCompare(b.date||'9');});
 var h='<div class="filterbar" style="margin-bottom:8px;gap:6px;flex-wrap:wrap;align-items:center">';
 h+='<span style="font-size:11px;color:var(--text3)">\u0e1b\u0e35</span><select class="sel" onchange="holidaySetYear(this.value)">'+ys.map(function(y){return '<option'+(String(_hy)===y?' selected':'')+'>'+y+'</option>';}).join('')+'</select>';
 h+='<button class="btn btn-primary" onclick="holidayAdd()"><i class="fa-solid fa-plus"></i> \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14</button>';
 h+='<button class="btn btn-ghost" style="color:var(--success)" onclick="document.getElementById(\'imp-holiday\').click()"><i class="fa-solid fa-file-excel"></i> Import Excel</button>';
 h+='<button class="btn btn-ghost" onclick="holidayExport()"><i class="fa-solid fa-download"></i> Export / Template</button>';
 h+='<button class="btn btn-ghost" style="color:var(--error)" onclick="holidayClearYear()"><i class="fa-solid fa-trash"></i> \u0e25\u0e1a\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35</button>';
 h+='<input type="file" id="imp-holiday" accept=".xlsx,.xls,.csv" style="display:none" onchange="holidayImport(event)"></div>';
 h+='<p class="text-muted" style="font-size:10px;margin:0 0 6px">Excel: \u0e04\u0e2d\u0e25\u0e31\u0e21\u0e19\u0e4c <b>Date</b> (dd/mm/yyyy) + <b>Name</b> \u00b7 import \u0e0b\u0e49\u0e33\u0e27\u0e31\u0e19\u0e40\u0e14\u0e34\u0e21\u0e08\u0e30\u0e2d\u0e31\u0e1e\u0e40\u0e14\u0e17\u0e0a\u0e37\u0e48\u0e2d\u0e43\u0e2b\u0e49</p>';
 h+='<table class="tbl" style="font-size:11px;width:100%"><thead><tr><th style="width:150px">Date</th><th style="width:60px">Day</th><th>Name</th><th style="width:40px"></th></tr></thead><tbody>';
 if(!rows.length)h+='<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:12px">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e1b\u0e35 '+_hy+'</td></tr>';
 rows.forEach(function(r){
  var dw=r.date?DOW[new Date(r.date+'T00:00:00').getDay()]:'';
  h+='<tr id="hrow_'+r.id+'"'+(r.id===_hNew?' style="box-shadow:inset 3px 0 0 var(--primary);background:var(--primary-bg,rgba(59,130,246,0.06))"':'')+'><td><input type="date" class="inp" style="font-size:11px" value="'+_e(r.date)+'" onchange="holidaySet(\''+r.id+'\',\'date\',this.value)"></td>'+
   '<td style="color:'+((dw==='Sat'||dw==='Sun')?'var(--warning)':'var(--text3)')+'">'+dw+'</td>'+
   '<td><input class="inp" style="font-size:11px;width:100%" value="'+_e(r.name)+'" placeholder="\u0e0a\u0e37\u0e48\u0e2d\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14" onchange="holidaySet(\''+r.id+'\',\'name\',this.value)"></td>'+
   '<td style="text-align:center"><button class="btn btn-ghost" style="font-size:11px;padding:2px 7px" title="Delete" onclick="holidayDel(\''+r.id+'\')">\u00d7</button></td></tr>';
 });
 h+='</tbody></table><div style="font-size:10px;color:var(--text3);margin-top:6px">'+rows.length+' \u0e27\u0e31\u0e19 \u00b7 \u0e41\u0e2a\u0e14\u0e07\u0e43\u0e19 Dashboard Calendar \u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34</div>';
 el.innerHTML=h;
};
function _done(){if(typeof saveD==='function')saveD();window.renderHolidays();if(typeof renderDashCalendar==='function'){try{renderDashCalendar();}catch(e){}}}
window.holidaySetYear=function(y){_hy=+y;window.renderHolidays();};
var _hNew=null;
window.holidayAdd=function(){
 var t=new Date(),d=(String(_hy)===String(t.getFullYear()))?(t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')):(String(_hy)+'-01-01');
 var ov=document.getElementById('hol-add-ov');if(ov)ov.remove();
 ov=document.createElement('div');ov.id='hol-add-ov';
 ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
 ov.onclick=function(e){if(e.target===ov)holidayAddClose();};
 ov.innerHTML='<div style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:10px;max-width:380px;width:100%;padding:16px">'+
  '<div style="font-size:14px;font-weight:700;margin-bottom:12px">\ud83c\udf8c \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14</div>'+
  '<label style="display:block;font-size:11px;color:var(--text3);margin-bottom:3px">Date *</label><input id="ha-date" type="date" class="inp" style="width:100%;margin-bottom:10px" value="'+d+'">'+
  '<label style="display:block;font-size:11px;color:var(--text3);margin-bottom:3px">Name *</label><input id="ha-name" class="inp" style="width:100%" placeholder="\u0e0a\u0e37\u0e48\u0e2d\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14">'+
  '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost" onclick="holidayAddClose()">Cancel</button><button class="btn btn-primary" onclick="holidayAddSave()"><i class="fa-solid fa-check"></i> Save</button></div>'+
  '<div style="font-size:9px;color:var(--text3);margin-top:6px">Enter = Save \u00b7 Esc = Cancel</div></div>';
 document.body.appendChild(ov);
 ov.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();holidayAddSave();}else if(e.key==='Escape')holidayAddClose();});
 setTimeout(function(){var n=document.getElementById('ha-name');if(n)n.focus();},30);
};
window.holidayAddClose=function(){var ov=document.getElementById('hol-add-ov');if(ov)ov.remove();};
window.holidayAddSave=function(){
 var iso=_iso((document.getElementById('ha-date')||{}).value),nm=((document.getElementById('ha-name')||{}).value||'').trim();
 if(!iso){alert('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48');return;}
 if(!nm){alert('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e43\u0e2a\u0e48\u0e0a\u0e37\u0e48\u0e2d\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14');return;}
 var ex=_hl().find(function(h){return h.date===iso;});
 if(ex){ex.name=nm;_hNew=ex.id;}else{var r={id:_hid(),date:iso,name:nm};_hl().push(r);_hNew=r.id;}
 _hy=+iso.slice(0,4);holidayAddClose();_done();
 if(typeof toast==='function')toast('\u2705 Added '+nm);
 setTimeout(function(){var tr=document.getElementById('hrow_'+_hNew);if(tr)tr.scrollIntoView({block:'center',behavior:'smooth'});},60);
};
window.holidaySet=function(id,f,v){var r=_hl().find(function(x){return x.id===id;});if(!r)return;r[f]=(f==='date')?_iso(v):v;if(f==='date'&&r.date)_hy=+r.date.slice(0,4);_done();};
window.holidayDel=function(id){D.holidays=_hl().filter(function(x){return x.id!==id;});_done();};
window.holidayClearYear=function(){if(!confirm('\u0e25\u0e1a\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e02\u0e2d\u0e07\u0e1b\u0e35 '+_hy+'?'))return;D.holidays=_hl().filter(function(x){return (x.date||'').slice(0,4)!==String(_hy);});_done();};
window.holidayExport=function(){
 if(typeof XLSX==='undefined'){alert('Excel library not loaded');return;}
 var rows=_hl().filter(function(h){return (h.date||'').slice(0,4)===String(_hy);}).sort(function(a,b){return a.date.localeCompare(b.date);}).map(function(h){return {Date:_dmy(h.date),Name:h.name||''};});
 if(!rows.length)rows=[{Date:'01/01/'+_hy,Name:'New Year\'s Day'}];
 var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Holidays');XLSX.writeFile(wb,'holidays_'+_hy+'.xlsx');
};
window.holidayImport=function(ev){
 var f=ev.target.files&&ev.target.files[0];if(!f)return;
 if(typeof XLSX==='undefined'){alert('Excel library not loaded');return;}
 var rd=new FileReader();rd.onload=function(e){
  try{
   var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
   var ws=wb.Sheets[wb.SheetNames[0]];var arr=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});
   var add=0,upd=0,skip=0,lastY=null;
   arr.forEach(function(row){
    var dk=null,nk=null;Object.keys(row).forEach(function(k){var l=k.toLowerCase();if(!dk&&(l.indexOf('date')>=0||k.indexOf('\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48')>=0))dk=k;else if(!nk&&(l.indexOf('name')>=0||l.indexOf('holiday')>=0||k.indexOf('\u0e0a\u0e37\u0e48\u0e2d')>=0||k.indexOf('\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14')>=0))nk=k;});
    var ks=Object.keys(row);if(!dk)dk=ks[0];if(!nk)nk=ks[1];
    var iso=_iso(row[dk]);if(!iso){skip++;return;}
    var nm=String(row[nk]==null?'':row[nk]).trim();lastY=iso.slice(0,4);
    var ex=_hl().find(function(h){return h.date===iso;});
    if(ex){if(nm&&ex.name!==nm){ex.name=nm;upd++;}}else{_hl().push({id:_hid(),date:iso,name:nm});add++;}
   });
   if(lastY)_hy=+lastY;_done();
   if(typeof toast==='function')toast('\u2705 Holidays: +'+add+' new, '+upd+' updated'+(skip?', '+skip+' skipped':''));
  }catch(err){alert('Import failed: '+err.message);}
  ev.target.value='';
 };rd.readAsArrayBuffer(f);
};
})();
