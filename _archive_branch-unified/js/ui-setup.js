// ui-setup.js — Setup Profile & Cards
function renderCards(){var _cb=document.getElementById('cards-body');if(!_cb)return;_cb.innerHTML=D.cards.map(function(c,i){
var load=allInstallments().filter(function(x){return x.card===c.name&&(x.status==='Active'||x.status==='Planned')}).reduce(function(s,x){return s+x.per_period},0)+D.monthly.filter(function(x){return x.card===c.name}).reduce(function(s,x){return s+x.amount},0);
return '<tr><td><input class="inp-inline" value="'+esc(c.name)+'" data-ci="'+i+'" data-f="name"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+c.statement_day+'" min="1" max="31" style="width:45px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="statement_day"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+c.payment_day+'" min="1" max="31" style="width:45px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="payment_day"></td>'+
'<td class="r"><input type="number" class="inp inp-num" value="'+c.deadline+'" min="1" max="31" style="width:45px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="deadline"></td>'+
'<td class="r"><input type="month" class="inp" value="'+(c.statement_start||'')+'" style="width:110px;padding:2px 4px;font-size:10px" data-ci="'+i+'" data-f="statement_start" title="Only produce statements from this month onward (blank = always)"></td>'+
'<td class="r" style="font-family:var(--mono);font-size:10px">'+(load>0?'฿'+fmt(load):'\u2014')+'</td>'+
'<td><button class="del-btn" onclick="if(confirm(\'Delete?\')){readAll();D.cards.splice('+i+',1);renderCards()}"><i class="fa-solid fa-trash"></i></button></td></tr>'}).join('')}

function addCard(){readAll();D.cards.push({name:'New Card',statement_day:1,payment_day:2,deadline:15,statement_start:'',bank:'',last4:'',expiry:'',credit_limit:0,current_balance:0,benefits:'',fee_waiver:'',fee_waiver_target:0,fee_waiver_mode:'amount',fee_waiver_manual:0,fee_waiver_target_count:0,fee_waiver_manual_count:0,remarks:'',limit_group:'',url:'',points_log:[]});D.cards.sort(function(a,b){return a.name.localeCompare(b.name)});renderCards()}

// MONTHLY

function swSetup(el,tab){document.querySelectorAll('#tab-setup .sub-panel').forEach(function(p){p.classList.remove('active')});document.querySelectorAll('#tab-setup .sub-tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('setup-'+tab).classList.add('active')}

