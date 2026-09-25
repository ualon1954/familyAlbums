(function(global){
  let seq=0;
  const t0=performance.now();
  function safe(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return String(v);}}
  function log(event,detail){
    const row={n:++seq,ms:Math.round(performance.now()-t0),event,detail:safe(detail||{})};
    try{(global.__SPA_DIAG_LOG__||(global.__SPA_DIAG_LOG__=[])).push(row);}catch(_){}
    return row;
  }
  global.SPADiag={log,dump:()=>safe(global.__SPA_DIAG_LOG__||[])};

  if(global.API&&typeof global.API.call==='function'){
    const original=global.API.call.bind(global.API);
    global.API.call=async function(action,payload){
      log('API:start',{action});
      try{const r=await original(action,payload);log('API:end',{action,ok:!!r?.ok});return r;}
      catch(e){log('API:error',{action,message:e?.message||String(e)});throw e;}
    };
  }
  if(global.AppState){
    ['setSession','setRoute','setData','patchData'].forEach(name=>{
      const original=global.AppState[name]; if(typeof original!=='function')return;
      global.AppState[name]=function(...args){log('AppState:'+name,{key:name==='setData'?args[0]:undefined,route:name==='setRoute'?args[0]:undefined});return original.apply(this,args);};
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    log('DOMContentLoaded',{hash:location.hash});
    const outlet=document.querySelector('#spaOutlet');
    if(outlet){
      const mo=new MutationObserver(muts=>log('DOM:mutation',{hash:location.hash,mutations:muts.length,children:outlet.childElementCount,text:(outlet.textContent||'').trim().slice(0,80)}));
      mo.observe(outlet,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class','aria-busy']});
      global.__SPA_DIAG_OBSERVER__=mo;
    }
  });
  addEventListener('hashchange',()=>log('hashchange',{hash:location.hash}));
})(window);
