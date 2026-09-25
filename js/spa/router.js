(function(global){
  const routes = new Map();
  let outlet = null;
  let currentCleanup = null;
  let navigationGeneration = 0;
  let currentRouteKey = '';
  const persistentPanels = new Map();

  function normalize(path){
    const raw = String(path || '').replace(/^#\/?/, '').replace(/^\//, '');
    return raw || 'home';
  }
  function parseHash(){
    const value = normalize(location.hash);
    const [path, query=''] = value.split('?');
    return { path, params: Object.fromEntries(new URLSearchParams(query)) };
  }
  function routeKey(path,params){ return path+'?'+new URLSearchParams(params||{}).toString(); }
  function register(name, renderer, options){ routes.set(name,{renderer,keepAlive:!!options?.keepAlive}); }
  function hidePersistent(except){
    persistentPanels.forEach((panel,key)=>{ panel.hidden = key!==except; });
  }
  function persistentPanel(path){
    let panel=persistentPanels.get(path);
    if(!panel){
      panel=document.createElement('div');
      panel.className='spa-persistent-view';
      panel.dataset.spaPersistent=path;
      outlet.appendChild(panel);
      persistentPanels.set(path,panel);
    }
    return panel;
  }
  function transientPanel(){
    let panel=outlet.querySelector(':scope > [data-spa-transient="1"]');
    if(!panel){ panel=document.createElement('div'); panel.dataset.spaTransient='1'; outlet.appendChild(panel); }
    return panel;
  }
  async function render(){
    if(!outlet) return;
    const {path,params}=parseHash();
    const key=routeKey(path,params);
    // R17K2: browsers/layout code may produce a duplicate render for the same hash.
    // Never remount an already active route.
    if(key===currentRouteKey) return;
    currentRouteKey=key;
    const generation=++navigationGeneration;
    const routeContext={generation,path,params,isActive:()=>generation===navigationGeneration};
    const entry=routes.get(path)||routes.get('not-found');
    if(!entry)return;
    try{ if(typeof currentCleanup==='function') currentCleanup(); }catch(err){console.warn('SPA cleanup:',err);}
    currentCleanup=null;
    global.AppState?.setRoute(path,params);

    const keepAlive=entry.keepAlive;
    const panel=keepAlive?persistentPanel(path):transientPanel();
    hidePersistent(keepAlive?path:null);
    const transient=outlet.querySelector(':scope > [data-spa-transient="1"]');
    if(transient) transient.hidden=keepAlive;
    if(!keepAlive){ panel.hidden=false; panel.innerHTML=''; }

    // A mounted persistent Dashboard/Albums view is shown as-is: no loading,
    // no initialization and no server call on warm navigation.
    if(keepAlive && panel.dataset.spaMounted==='1') return;

    panel.setAttribute('aria-busy','true');
    try{
      const result=await entry.renderer({path,params,outlet:panel,routeContext});
      if(generation!==navigationGeneration)return;
      if(keepAlive) panel.dataset.spaMounted='1';
      if(typeof result==='function')currentCleanup=result;
    }catch(err){
      if(generation!==navigationGeneration)return;
      console.error('SPA route error:',err);
      panel.innerHTML='<section class="card"><h2>אירעה שגיאה</h2><p>לא ניתן לטעון את המסך.</p></section>';
    }finally{
      if(generation===navigationGeneration)panel.removeAttribute('aria-busy');
    }
  }
  function start(target){
    outlet=typeof target==='string'?document.querySelector(target):target;
    if(!outlet)throw new Error('SPA outlet not found');
    addEventListener('hashchange',render);
    if(!location.hash)history.replaceState(null,'','#/home');
    render();
  }
  function go(path,params){
    const q=new URLSearchParams(params||{}).toString();
    const next='#/'+normalize(path)+(q?'?'+q:'');
    if(location.hash===next){render();return;}
    location.hash=next;
  }
  function invalidate(path){
    const panel=persistentPanels.get(path);
    if(panel){ panel.dataset.spaMounted='0'; panel.innerHTML=''; }
    if(currentRouteKey.startsWith(path+'?')) currentRouteKey='';
  }
  function resetPersistent(){
    persistentPanels.forEach(p=>p.remove());
    persistentPanels.clear(); currentRouteKey='';
  }
  global.AppRouter={register,start,go,render,invalidate,resetPersistent};
})(window);
