(function(global){
  let identity='', bootstrapPromise=null;
  function session(){try{return global.SessionManager?.getSession?.()||global.getSession?.()||null;}catch(_){return null;}}
  function id(s){const u=s?.user||{};return [String(u.id||u.email||s?.userId||'').toLowerCase(),String(s?.token||'')].join('|');}
  function sync(){const s=session(),next=id(s);if(next!==identity){identity=next;bootstrapPromise=null;}return s;}
  function apply(boot){
    boot=boot||{};const albums=Array.isArray(boot.albums)?boot.albums:[];
    global.API?.cacheSet?.('dashboard','main',boot.dashboard||{});
    global.API?.cacheSet?.('albums','list',albums);
    global.API?.cacheSet?.('albums','counts',boot.albumPhotoCounts||{});
    global.AppState?.patchData?.({dashboard:boot.dashboard||{},albums});
    global.AppState?.setBootstrap?.(boot);return boot;
  }
  function existing(){return global.AppState?.getBootstrap?.()||null;}
  function loader(){return document.getElementById('spaGlobalBootstrap');}
  function showLoader(){const el=loader();if(!el)return;el.hidden=false;el.removeAttribute('hidden');el.classList.add('is-visible');el.setAttribute('aria-hidden','false');document.body.classList.add('spa-bootstrap-active');setProgress(0);}
  function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
  function hideLoader(){const el=loader();if(!el)return;el.classList.remove('is-visible');el.hidden=true;el.setAttribute('hidden','');el.setAttribute('aria-hidden','true');document.body.classList.remove('spa-bootstrap-active');}
  function setProgress(percent){const el=loader();if(!el)return;const p=Math.max(0,Math.min(100,Math.round(percent||0)));el.querySelector('.spa-global-progress-fill')?.style.setProperty('width',p+'%');const n=el.querySelector('[data-bootstrap-percent]');if(n)n.textContent=p+'%';}
  function cacheResult(name,data){
    if(name==='favorites'){const v=Array.isArray(data)?data:[];global.API?.cacheSet?.('favorites','list',v);global.AppState?.setData?.('favorites',v);}
    if(name==='trash'){const v=Array.isArray(data)?data:[];global.API?.cacheSet?.('trash','list',v);global.AppState?.setData?.('trash',v);}
    if(name==='users'){const v=Array.isArray(data)?data:[];global.API?.cacheSet?.('listUsers','list',v);global.AppState?.setData?.('adminUsers',v);}
    if(name==='permissions'){global.API?.cacheSet?.('adminPermissionsBootstrap','main',data||{});global.AppState?.setData?.('adminPermissions',data||{});}
    if(name==='activity'){global.API?.cacheSet?.('activityLogQuery','initial',data||{});global.AppState?.setData?.('activityInitial',data||{});}
  }
  function task(name,label,action,payload,method='GET',applyFn){return {name,label,run:async()=>{const r=await global.API.call(action,payload,method);if(!r?.ok)throw new Error(r?.message||('טעינת '+label+' נכשלה'));if(applyFn)applyFn(r.data);else cacheResult(name,r.data);return r.data;}};}
  function clearAdminOnlyCache(){
    ['adminUsers','adminPermissions','activityInitial'].forEach(k=>global.AppState?.setData?.(k,null));
  }
  async function loadAllPhotos_(token){
    let items=[],cursor=0,done=false;
    while(!done){
      const r=await global.API.call('photosAllPage',{token,cursor,pageSize:80});
      if(!r?.ok)throw new Error(r?.message||'טעינת תמונות נכשלה');
      items.push(...(r.data?.items||[]));cursor=Number(r.data?.nextCursor)||0;done=!!r.data?.done;
    }
    const view={album:{id:'__ALL__',title:'כל התמונות',isVirtual:true,canUpload:false},photos:items};
    global.API?.cacheSet?.('albumView','__ALL__',view);
    global.AppState?.setData?.('allPhotos',items);
    return view;
  }
  function tasksFor(s){
    const token=s.token,role=String(s?.user?.role||'').toUpperCase();
    // R17P1D: Management and Activity are lazy-loaded on demand for Admin.
    // Clear their session state at application bootstrap so first entry loads fresh data.
    clearAdminOnlyCache();
    const tasks=[
      task('core','נתוני המערכת','spaBootstrap',{token},'GET',apply),
      task('favorites','מועדפים','favorites',{token},'GET'),
      {name:'allPhotos',label:'תמונות',run:()=>loadAllPhotos_(token)}
    ];
    if(role==='ADMIN'){
      // R17P1D: Trash remains part of the Admin global bootstrap.
      // Users, permissions, Activity Log and the Admin shell load only when opened.
      tasks.push(task('trash','סל המחזור','trash',{token},'GET'));
    }
    return tasks;
  }
  async function runParallel(s){
    const tasks=tasksFor(s),total=tasks.length,my=id(s);let done=0;
    showLoader();
    // R17P1C: guarantee at least one real browser paint of the bootstrap card
    // before any cached/fast task can finish and hide it again.
    await nextPaint();
    const wrapped=tasks.map(t=>(async()=>{try{return await t.run();}finally{done++;if(id(session())===my)setProgress(done/total*100);}})());
    const results=await Promise.allSettled(wrapped);
    if(id(session())!==my)throw new Error('Session changed');
    const failed=results.map((r,i)=>r.status==='rejected'?{task:tasks[i],reason:r.reason}:null).filter(Boolean);
    if(failed.length){
      const e=new Error('לא ניתן להשלים את טעינת המערכת: '+failed.map(x=>x.task.label).join(', '));e.failures=failed;throw e;
    }
    // R17P2O16: the first navigation to every permitted album must already be warm.
    // Build per-album albumView caches from the globally preloaded All Photos snapshot.
    try{
      const boot=existing()||{}, albums=Array.isArray(boot.albums)?boot.albums:[];
      const all=global.AppState?.getData?.('allPhotos')||global.API?.cacheGet?.('albumView','__ALL__',21600000)?.photos||[];
      if(Array.isArray(all)) albums.forEach(album=>{
        const aid=String(album?.id||'');if(!aid)return;
        const photos=all.filter(photo=>String(photo?.albumId||'')===aid).map(photo=>global.AppDataSync?.decoratePhoto?.(photo,aid)||photo);
        global.API?.cacheSet?.('albumView',aid,{album,photos});
      });
    }catch(e){console.warn('Album warm-cache preload:',e);}
    global.AppState?.setData?.('applicationBootstrap',{ready:true,at:Date.now(),role:String(s?.user?.role||'').toUpperCase(),taskCount:total});
    return existing();
  }
  async function ensureApplicationBootstrap(options={}){
    const s=sync();if(!s?.token)throw new Error('אין Session פעיל');
    const appReady=global.AppState?.getData?.('applicationBootstrap');
    if(!options.force&&appReady?.ready&&existing()){hideLoader();return existing();}
    if(bootstrapPromise)return bootstrapPromise;
    const my=id(s);
    bootstrapPromise=runParallel(s).then(v=>{setProgress(100);return v;}).finally(()=>{if(id(session())===my)bootstrapPromise=null;});
    try{const v=await bootstrapPromise;hideLoader();return v;}catch(e){hideLoader();throw e;}
  }
  async function ensureBootstrap(){return ensureApplicationBootstrap();}
  function reset(){identity=id(session());bootstrapPromise=null;hideLoader();}
  global.SessionDataStore={ensureBootstrap,ensureApplicationBootstrap,apply,existing,reset,showLoader,hideLoader,setProgress};
})(window);
