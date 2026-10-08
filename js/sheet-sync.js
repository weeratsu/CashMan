/* sheet-sync.js - CashMan <-> Google Sheet (LOCAL-FIRST, background sync). Oct 2026.
   CashMan keeps working exactly as before on localStorage (SKEY). This file only adds:
     - after every saveD(): push the whole D to the Sheet in the background (debounced 1.5s)
     - on page open: show localStorage instantly, then pull the Sheet in the background; if the
       Sheet is NEWER (last_modified) and there are no unsent local edits, adopt it and redraw.
   No config (js/config-sheet.js missing or endpoint empty, e.g. on GitHub Pages) = does nothing. */
(function(){
  var cfg=window.CM_SHEET_CFG;
  // GitHub Pages / phone: no config-sheet.js -> use the connection saved in THIS browser by connect.html
  if(!cfg||!cfg.endpoint){ try{ cfg=JSON.parse(localStorage.getItem('cm_sheet_cfg')||'null'); }catch(e){ cfg=null; } if(cfg) window.CM_SHEET_CFG=cfg; }

  // Not logged in on the web (GitHub Pages / phone): show a small Login link. Local PC (file://) is unaffected.
  try{ if((!window.CM_SHEET_CFG||!window.CM_SHEET_CFG.endpoint) && /^https?:$/.test(location.protocol)){
    var _addLogin=function(){ if(document.getElementById('vm-login-bar')) return; var a=document.createElement('a'); a.id='vm-login-bar'; a.href='login.html';
      a.textContent='🔐 Login เพื่อดึงข้อมูลจริงจาก Google Sheet'; a.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99999;background:#2563eb;color:#fff;text-align:center;padding:10px;font:14px system-ui,sans-serif;text-decoration:none';
      (document.body||document.documentElement).appendChild(a); };
    if(document.body) _addLogin(); else window.addEventListener('DOMContentLoaded',_addLogin);
  } }catch(e){}
  if(!cfg||!cfg.endpoint||String(cfg.endpoint).indexOf('http')!==0){ window.CM_SHEET_ON=false; return; }
  window.CM_SHEET_ON=true;
  var DIRTY='cashflow_sheet_dirty', timer=null, pushing=false, gen=0;
  // NEW-BROWSER GUARD: if this browser had NO CashMan data before the app started, the local D is
  // just defaults (+ auto-synced utility bills). Never let that overwrite the real Sheet:
  // pushes are blocked until the first pull has finished, and a fresh browser always ADOPTS the Sheet.
  var hadLocal=false; try{ hadLocal=!!localStorage.getItem((typeof SKEY!=='undefined'&&SKEY)||'cashflow_v5'); }catch(e){}
  var pulledOnce=false;
  // REAL-DATA GUARD (Oct 7 incident): empty/default data must never reach the Sheet, and must never win
  // over real data, whatever the timestamps say.
  function realScore(x){
    if(!x||typeof x!=='object'||!x.profile) return 0;
    var n=0; ['todos','wishlist','planned','monthly','yearly','installments','cards'].forEach(function(k){ if(Array.isArray(x[k])) n+=x[k].length; });
    if(x.bill_payments&&typeof x.bill_payments==='object') n+=Object.keys(x.bill_payments).length;
    return n;
  }
  function isReal(x){ return !!(x&&x.profile&&String(x.profile.name||'').trim()) && realScore(x)>=5; }
  window.__cmIsReal=isReal;
  function dirty(v){ try{ if(v===undefined) return localStorage.getItem(DIRTY)==='1'; v?localStorage.setItem(DIRTY,'1'):localStorage.removeItem(DIRTY);}catch(e){} return false; }
  function badge(txt,color){
    try{ var el=document.getElementById('cm-sync-badge');
      if(!el){ el=document.createElement('div'); el.id='cm-sync-badge';
        el.style.cssText='position:fixed;right:10px;bottom:10px;z-index:9999;font-size:10px;padding:3px 8px;border-radius:10px;background:var(--bg3,#eee);color:var(--text2,#555);border:1px solid var(--border,#ddd);pointer-events:none';
        (document.body||document.documentElement).appendChild(el); }
      el.textContent=txt; el.style.color=color||''; el.style.display='';
      clearTimeout(el._t); if(/synced/.test(txt)) el._t=setTimeout(function(){el.style.display='none';},2500);
    }catch(e){}
  }
  function post(data){
    return fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({token:cfg.writeToken,action:'replaceAll',data:data})}).then(function(r){return r.json();});
  }
  function push(){
    if(!pulledOnce){ return; }            // wait for the first Sheet read (pull will push afterwards if needed)
    if(pushing){ schedule(1500); return; }
    if(typeof D==='undefined'||!D||!D.profile) return;
    if(!isReal(D)){ console.warn('CashMan: local data looks empty/default - NOT sent to Sheet'); badge('\u26a0 local data empty - not sent','var(--error,#c33)'); return; }
    pushing=true; badge('\u2191 saving to Sheet\u2026');
    var snap=JSON.stringify(D), g=gen;
    post(JSON.parse(snap)).then(function(res){
      if(!res||!res.ok) throw new Error((res&&res.error)||'save failed');
      if(g===gen) dirty(false); else schedule(1500);   // newer edits arrived meanwhile -> push again
      badge('\u2713 synced','var(--success,#2a7)');
    }).catch(function(e){
      console.warn('CashMan Sheet push failed (kept locally, retry in 30s):',e);
      badge('\u26a0 not saved to Sheet yet - will retry','var(--error,#c33)'); schedule(30000);
    }).then(function(){ pushing=false; });
  }
  function schedule(ms){ clearTimeout(timer); timer=setTimeout(push,ms); }
  // hook saveD (defined in data.js, which loads before this file)
  var _saveD=window.saveD;
  if(typeof _saveD==='function'){
    window.saveD=function(){ var r=_saveD.apply(this,arguments); gen++; dirty(true); schedule(1500); return r; };
  }
  function pull(){
    if(pulledOnce && dirty()){ schedule(0); return; }   // unsent local edits win: push them first
    var g=gen; badge('\u21bb syncing\u2026');
    fetch(cfg.endpoint+'?action=all&token='+encodeURIComponent(cfg.readToken||cfg.writeToken)+'&t='+Date.now())
      .then(function(r){return r.json();}).then(function(res){
        if(!res||!res.ok) throw new Error((res&&res.error)||'load failed');
        var remote=res.data||{};
        var first=!pulledOnce; pulledOnce=true;
        if(!first && (dirty()||g!==gen)){ badge('\u2713 synced','var(--success,#2a7)'); return; }   // edited while fetching
        if(!remote.profile){                       // empty Sheet (first run) -> upload local data
          if(typeof D!=='undefined'&&D&&D.profile){ gen++; dirty(true); schedule(0); }
          return;
        }
        var rl=remote.last_modified||'', ll=(typeof D!=='undefined'&&D&&D.last_modified)||'';
        var lReal=(typeof D!=='undefined')&&isReal(D), rReal=isReal(remote);
        var takeRemote = rReal && ( !lReal || rl>ll || (first && !hadLocal) );   // real Sheet beats empty local, always
        if(!rReal && lReal){ gen++; dirty(true); schedule(0); badge('\u2191 restoring Sheet from local\u2026'); return; } // Sheet empty/broken -> repair from local
        if(takeRemote){
          try{ localStorage.setItem(SKEY,JSON.stringify(remote)); }catch(e){}
          loadD(); DATA_READY=true;               // re-run CashMan's own migrations on the Sheet data
          try{ loadForm(); }catch(e){}
          try{ if(typeof utilAutoSyncPlanned==='function') utilAutoSyncPlanned(); }catch(e){}
          try{ simulate(); }catch(e){}
          try{ renderAllTabs(); }catch(e){}
          if(typeof toast==='function') toast('\u2601 Loaded newer data from Google Sheet');
          dirty(false);
        } else if((ll && ll>rl) || dirty()){ gen++; dirty(true); schedule(0); }   // local newer / unsent edits -> upload
        badge('\u2713 synced','var(--success,#2a7)');
      }).catch(function(e){ console.warn('CashMan Sheet pull failed (using local data):',e); badge('\u26a0 offline (local data)','var(--error,#c33)'); });
  }
  window.cmSheetSyncNow=function(){ (pulledOnce&&dirty())?schedule(0):pull(); };
  window.__cmSheetState=function(){ return {pulledOnce:pulledOnce,hadLocal:hadLocal,dirty:dirty(),gen:gen}; };
  window.addEventListener('beforeunload',function(e){ if(dirty()){ e.preventDefault(); e.returnValue=''; } });
  // run after app.js finished its init (load + first render)
  if(document.readyState==='complete') setTimeout(pull,300); else window.addEventListener('load',function(){ setTimeout(pull,300); });
})();
