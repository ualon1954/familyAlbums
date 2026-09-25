function getSession(){
  try{
    if(window.SessionManager && typeof window.SessionManager.getSession==="function"){
      return window.SessionManager.getSession();
    }
    return JSON.parse(localStorage.getItem("familyPhotoAlbumSession")||"null");
  }catch(e){ return null; }
}
function requireLogin(role){
  const s=getSession();
  if(!s||!s.user||!s.token){
    location.replace("index.html?autoLogin=1&loginRequired=1");
    return null;
  }
  if(role&&s.user.role!==role){
    location.replace("index.html#/dashboard");
    return null;
  }
  return s;
}
function logout(){
  if(window.SessionManager && typeof window.SessionManager.logout==="function"){
    window.SessionManager.logout();
    return;
  }
  localStorage.removeItem("familyPhotoAlbumSession");
  localStorage.removeItem("familyAlbumSession");
  location.replace("index.html?autoLogin=1");
}

// Shared UI helpers used by all pages.
function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
function toast(message, type){
  let el=document.getElementById('toast');
  if(!el){
    el=document.createElement('div');
    el.id='toast';
    el.className='toast';
    document.body.appendChild(el);
  }
  el.textContent=String(message ?? '');
  el.classList.add('show');
  clearTimeout(window.__familyToastTimer);
  window.__familyToastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}


// R16Z5E — shared styled dialogs. Replaces native alert()/confirm() across the UI.
(function(){
  let dialogQueue=Promise.resolve();
  function enqueueDialog_(factory){
    const run=()=>new Promise(factory);
    const result=dialogQueue.then(run,run);
    dialogQueue=result.catch(()=>{});
    return result;
  }
  function createUiDialog_(opts,resolve){
    opts=opts||{};
    const overlay=document.createElement('div');
    overlay.className='ui-dialog-overlay';
    overlay.innerHTML=`<div class="ui-dialog-card" role="dialog" aria-modal="true" aria-labelledby="uiDialogTitle">
      <div class="ui-dialog-icon" aria-hidden="true">${esc(opts.icon||'!')}</div>
      <h2 id="uiDialogTitle">${esc(opts.title||'הודעה')}</h2>
      <p>${esc(opts.message||'')}</p>
      <div class="ui-dialog-actions">
        ${opts.confirmOnly?'':`<button type="button" class="ui-dialog-btn ui-dialog-cancel">${esc(opts.cancelText||'ביטול')}</button>`}
        <button type="button" class="ui-dialog-btn ${opts.danger?'ui-dialog-danger':'ui-dialog-primary'}">${esc(opts.confirmText||'אישור')}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const primary=overlay.querySelector(opts.danger?'.ui-dialog-danger':'.ui-dialog-primary');
    const cancel=overlay.querySelector('.ui-dialog-cancel');
    let done=false;
    const finish=value=>{
      if(done)return;done=true;
      document.removeEventListener('keydown',onKey,true);
      overlay.classList.remove('open');
      setTimeout(()=>overlay.remove(),120);
      resolve(value);
    };
    const onKey=e=>{
      if(e.key==='Escape'&&!opts.confirmOnly){e.preventDefault();finish(false);}
      if(e.key==='Enter'){e.preventDefault();runPrimary();}
    };
    const runPrimary=async()=>{
      if(done)return;
      if(typeof opts.onConfirm!=='function'){finish(true);return;}
      const buttons=[primary,cancel].filter(Boolean), oldText=primary?.textContent||'';
      buttons.forEach(b=>b.disabled=true);
      overlay.classList.add('ui-dialog-busy');
      if(primary) primary.textContent=opts.busyText||'מבצע...';
      try{
        await opts.onConfirm();
        finish(true);
      }catch(err){
        overlay.classList.remove('ui-dialog-busy');
        buttons.forEach(b=>b.disabled=false);
        if(primary){primary.textContent=oldText;primary.focus();}
        let error=overlay.querySelector('.ui-dialog-error');
        if(!error){error=document.createElement('p');error.className='ui-dialog-error';overlay.querySelector('.ui-dialog-card')?.insertBefore(error,overlay.querySelector('.ui-dialog-actions'));}
        error.textContent=String(err?.message||err||'הפעולה נכשלה');
      }
    };
    primary?.addEventListener('click',runPrimary);
    cancel?.addEventListener('click',()=>{if(!overlay.classList.contains('ui-dialog-busy'))finish(false);});
    overlay.addEventListener('click',e=>{if(e.target===overlay&&!opts.confirmOnly&&!overlay.classList.contains('ui-dialog-busy'))finish(false);});
    document.addEventListener('keydown',onKey,true);
    requestAnimationFrame(()=>{overlay.classList.add('open');primary?.focus();});
  }
  window.uiConfirm=function(message,opts={}){
    return enqueueDialog_(resolve=>createUiDialog_(Object.assign({message,title:'אישור פעולה',confirmText:'אישור',cancelText:'ביטול'},opts),resolve));
  };
  // R17P2O12: allow a successful mutation to explicitly retire its dialog.
  // This is intentionally scoped to shared ui-dialog overlays and is idempotent.
  window.closeUiDialogs=function(){
    document.querySelectorAll('.ui-dialog-overlay').forEach(overlay=>{
      overlay.classList.remove('open','ui-dialog-busy');
      overlay.setAttribute('aria-hidden','true');
      setTimeout(()=>overlay.remove(),120);
    });
  };
  window.uiAlert=function(message,opts={}){
    return enqueueDialog_(resolve=>createUiDialog_(Object.assign({message,title:'שימו לב',confirmText:'הבנתי',confirmOnly:true},opts),resolve));
  };
})();


// R16Z5O — global counters/cache synchronization.
// Keeps dashboard totals, album photo counts and persistent snapshots coherent
// immediately after successful mutations instead of waiting for a later refresh.
(function(){
  function sessionUserId_(){
    const s=getSession?.(),u=s?.user||{};
    return String(u.id||u.email||s?.userId||"anon").trim().toLowerCase();
  }
  function dashPersistKey_(){return "FPA_DASHBOARD_PERSIST_V1_"+sessionUserId_();}
  function dashLastKey_(){return "FPA_DASHBOARD_LAST_V1_"+sessionUserId_();}
  function albumsListPersistKey_(){return "FPA_ALBUMS_LIST_PERSIST_V1_"+sessionUserId_();}
  function albumsCountsPersistKey_(){return "FPA_ALBUMS_COUNTS_PERSIST_V1_"+sessionUserId_();}
  function sessionTokenKey_(){let h=2166136261;const s=getSession?.();for(const ch of String(s?.token||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function albumsSessionListPersistKey_(){return albumsListPersistKey_()+"_SESSION_"+sessionTokenKey_();}
  function albumsSessionCountsPersistKey_(){return albumsCountsPersistKey_()+"_SESSION_"+sessionTokenKey_();}
  function photoViewPersistKey_(albumId){return "FPA_ALBUM_VIEW_PERSIST_V1_"+sessionUserId_()+"|"+String(albumId||"");}
  function dirtyKey_(){return "FPA_LOCAL_STATE_DIRTY_UNTIL_"+sessionUserId_();}
  function markDirty_(ms=15000){try{localStorage.setItem(dirtyKey_(),String(Date.now()+Math.max(3000,Number(ms)||15000)));}catch(_){}}
  function isDirty_(){try{return Number(localStorage.getItem(dirtyKey_())||0)>Date.now();}catch(_){return false;}}
  function readPersist_(key){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x&&x.value!=null?x:null;}catch(_){return null;}}
  function writePersist_(key,value){try{localStorage.setItem(key,JSON.stringify({ts:Date.now(),value}));}catch(_){}}
  function updateDashboard_(field,delta){
    delta=Number(delta||0); if(!delta)return;
    let d=API?.cacheGet?.("dashboard","main",21600000);
    if(d&&typeof d==="object"){
      d=Object.assign({},d);d[field]=Math.max(0,(Number(d[field])||0)+delta);API.cacheSet("dashboard","main",d);
    }
    const x=readPersist_(dashPersistKey_())||readPersist_(dashLastKey_());
    if(x&&x.value&&typeof x.value==="object"){
      const d2=Object.assign({},x.value);d2[field]=Math.max(0,(Number(d2[field])||0)+delta);
      writePersist_(dashPersistKey_(),d2);writePersist_(dashLastKey_(),d2);
      if(!d)API?.cacheSet?.("dashboard","main",d2);
    }
    const sd=window.AppState?.getData?.("dashboard");
    if(sd&&typeof sd==="object"){ const next=Object.assign({},sd); next[field]=Math.max(0,(Number(next[field])||0)+delta); window.AppState?.setData?.("dashboard",next); }
    // R17L5G4: keep the lifetime bootstrap snapshot coherent too. Warm Dashboard
    // navigation must never resurrect a pre-mutation album total.
    const boot=window.AppState?.getBootstrap?.();
    if(boot&&typeof boot==="object"){
      const bd=Object.assign({},boot.dashboard||{});
      bd[field]=Math.max(0,(Number(bd[field])||0)+delta);
      boot.dashboard=bd;
    }
    // R17L5G5: Dashboard is a keepAlive SPA view. When it is already mounted,
    // route navigation does not mount/paint it again. Patch the mounted metric
    // immediately so returning to Dashboard never exposes its old DOM value.
    const metricId={albums:"spaAlbumCount",photos:"spaPhotoCount",favorites:"spaFavCount"}[field];
    if(metricId){
      const el=document.querySelector('.dashboard-grid #'+metricId);
      const live=window.AppState?.getData?.("dashboard") || boot?.dashboard || d;
      if(el&&live&&typeof live==="object") el.textContent=String(Math.max(0,Number(live[field])||0));
    }
  }
  function updateAlbumCount_(albumId,delta){
    albumId=String(albumId||"").trim();delta=Number(delta||0);if(!albumId||albumId==="__ALL__"||!delta)return;
    let counts=API?.cacheGet?.("albums","counts",21600000);
    if(counts&&typeof counts==="object"){
      counts=Object.assign({},counts);counts[albumId]=Math.max(0,(Number(counts[albumId])||0)+delta);API.cacheSet("albums","counts",counts);
    }
    const cp=readPersist_(albumsCountsPersistKey_());
    if(cp&&cp.value&&typeof cp.value==="object"){
      const next=Object.assign({},cp.value);next[albumId]=Math.max(0,(Number(next[albumId])||0)+delta);writePersist_(albumsCountsPersistKey_(),next);
    }
    let list=API?.cacheGet?.("albums","list",21600000);
    if(Array.isArray(list)){
      list=list.map(a=>String(a?.id)===albumId?Object.assign({},a,{photoCount:Math.max(0,(Number(a?.photoCount)||0)+delta)}):a);API.cacheSet("albums","list",list);
    }
    const lp=readPersist_(albumsListPersistKey_());
    if(lp&&Array.isArray(lp.value)){
      const next=lp.value.map(a=>String(a?.id)===albumId?Object.assign({},a,{photoCount:Math.max(0,(Number(a?.photoCount)||0)+delta)}):a);writePersist_(albumsListPersistKey_(),next);
    }
    const stateList=window.AppState?.getData?.("albums");
    if(Array.isArray(stateList)){ const next=stateList.map(a=>String(a?.id)===albumId?Object.assign({},a,{photoCount:Math.max(0,(Number(a?.photoCount)||0)+delta)}):a); window.AppState?.setData?.("albums",next); writePersist_(albumsSessionListPersistKey_(),next); }
    const sc=readPersist_(albumsSessionCountsPersistKey_());
    if(sc&&sc.value&&typeof sc.value==="object"){const next=Object.assign({},sc.value);next[albumId]=Math.max(0,(Number(next[albumId])||0)+delta);writePersist_(albumsSessionCountsPersistKey_(),next);}
    const boot=window.AppState?.getBootstrap?.();
    if(boot&&typeof boot==="object"){
      const bc=Object.assign({},boot.albumPhotoCounts||{});bc[albumId]=Math.max(0,(Number(bc[albumId])||0)+delta);boot.albumPhotoCounts=bc;
      if(Array.isArray(boot.albums))boot.albums=boot.albums.map(a=>String(a?.id)===albumId?Object.assign({},a,{photoCount:bc[albumId]}):a);
    }
  }
  window.AppStateSync={
    photoDelta(albumId,delta){updateAlbumCount_(albumId,delta);updateDashboard_("photos",delta);markDirty_();},
    photoMove(sourceAlbumId,targetAlbumId){
      sourceAlbumId=String(sourceAlbumId||"");targetAlbumId=String(targetAlbumId||"");
      if(sourceAlbumId&&sourceAlbumId!==targetAlbumId)updateAlbumCount_(sourceAlbumId,-1);
      if(targetAlbumId&&sourceAlbumId!==targetAlbumId)updateAlbumCount_(targetAlbumId,1);
      // Total dashboard photo count does not change on a move.
      markDirty_();
    },
    albumDelta(delta){updateDashboard_("albums",delta);markDirty_();},
    favoriteDelta(delta){updateDashboard_("favorites",delta);markDirty_();},
    favoriteState(photoId,isFavorite,...albumIds){
      photoId=String(photoId||"").trim();
      if(!photoId)return;
      const targets=[...new Set([...albumIds.map(x=>String(x||"").trim()).filter(Boolean),"__ALL__"])];
      const patchView=(view)=>{
        if(!view||!Array.isArray(view.photos))return {view,changed:false};
        let changed=false;
        const photos=view.photos.map(p=>{
          if(String(p?.id||"")!==photoId)return p;
          changed=true;
          return Object.assign({},p,{isFavorite:!!isFavorite});
        });
        return {view:changed?Object.assign({},view,{photos}):view,changed};
      };
      targets.forEach(albumId=>{
        const cached=API?.cacheGet?.("albumView",albumId,21600000);
        const c=patchView(cached);
        if(c.changed)API?.cacheSet?.("albumView",albumId,c.view);
        const persisted=readPersist_(photoViewPersistKey_(albumId));
        const p=patchView(persisted?.value);
        if(p.changed)writePersist_(photoViewPersistKey_(albumId),p.view);
      });
      markDirty_();
    },
    invalidatePhotoViews(...albumIds){
      [...new Set(albumIds.map(x=>String(x||"")).filter(Boolean))].forEach(x=>{API?.cacheRemove?.("albumView",x);try{localStorage.removeItem(photoViewPersistKey_(x));}catch(_){}});
      API?.cacheRemove?.("albumView","__ALL__");try{localStorage.removeItem(photoViewPersistKey_("__ALL__"));}catch(_){}
    },
    isLocallyDirty(){return isDirty_();}
  };
})();


// R17P2O — legacy R17P2A busy observer retired. R17P2K is the single spinner owner.

// R17P2K — one shared busy-state visual for ongoing actions across the SPA.
(function installUnifiedActionBusyState(global){
  if (global.__unifiedActionBusyStateInstalled) return;
  global.__unifiedActionBusyStateInstalled = true;
  const ACTION_BUSY_RE = /^(?:טוען|שומר|מעלה|מוחק|מעדכן|מעביר|משחזר|מכין)(?:\s[^…]*)?(?:\.\.\.|…)/;
  const sync = (el) => {
    if (!el || el.nodeType !== 1) return;
    // R17P2O5: only actionable buttons may own the unified action spinner.
    // Container/status elements can inherit loading text from descendants and were
    // incorrectly classified as busy, producing multiple permanent admin spinners.
    if (el.tagName !== 'BUTTON') { el.classList.remove('is-action-busy'); return; }
    if (el.closest?.('.spa-global-bootstrap-card')) { el.classList.remove('is-action-busy'); return; }
    const text = String(el.textContent || '').trim();
    // R17P2O6: a button may spin only while it is explicitly in an active busy state.
    // This prevents a stale loading/saving label on an enabled admin button from spinning forever.
    const activeBusy = el.disabled === true || el.getAttribute('aria-busy') === 'true';
    el.classList.toggle('is-action-busy', activeBusy && ACTION_BUSY_RE.test(text));
  };
  const scan = (root) => {
    if (!root || root.nodeType !== 1) return;
    sync(root);
    root.querySelectorAll?.('button').forEach(sync);
  };
  const start = () => {
    scan(document.documentElement);
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') sync(m.target.parentElement);
        else {
          sync(m.target);
          m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); else if (n.parentElement) sync(n.parentElement); });
        }
      }
    }).observe(document.body || document.documentElement,{subtree:true,childList:true,characterData:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})(window);


// R17P2O11 — one mutation invalidation/reconciliation owner for Dashboard, Trash and album caches.
(function installCentralDataSync(global){
  if(global.AppDataSync)return;
  let dashboardSeq=0;
  function dashboardRoot(){return document.querySelector('.dashboard-grid');}
  function paintDashboard(data){
    const root=dashboardRoot(); if(!root||!data)return;
    const map={spaAlbumCount:'albums',spaPhotoCount:'photos',spaFavCount:'favorites'};
    Object.entries(map).forEach(([id,key])=>{const el=root.querySelector('#'+id);if(el)el.textContent=String(Math.max(0,Number(data[key])||0));});
  }
  // R17P2O13: Trash is a warm session cache. Mutations update it explicitly when
  // the affected rows are known; otherwise we refresh it in the background now,
  // rather than forcing a visible reload on the user's next Trash navigation.
  async function refreshTrash(){
    const s=global.SessionManager?.getSession?.()||global.getSession?.();
    if(!s?.token||String(s?.user?.role||'').toUpperCase()!=='ADMIN')return null;
    try{
      const r=await global.API.call('trash',{token:s.token},'GET');
      if(!r?.ok)return null;
      const list=Array.isArray(r.data)?r.data:[];
      global.API?.cacheSet?.('trash','list',list);
      global.AppState?.setData?.('trash',list);
      global.SPATrash?.replaceCache?.(list);
      return list;
    }catch(_){return null;}
  }
  function retireTrash(){ return refreshTrash(); }
  function setTrash(list){
    list=Array.isArray(list)?list:[];
    global.API?.cacheSet?.('trash','list',list);
    global.AppState?.setData?.('trash',list);
    global.SPATrash?.replaceCache?.(list);
    return list;
  }
  function addTrashItem(item){
    if(!item)return null;
    const current=global.AppState?.getData?.('trash')||global.API?.cacheGet?.('trash','list',21600000);
    if(!Array.isArray(current))return null;
    const row=Object.assign({},item,{deletedAt:item.deletedAt||new Date().toISOString()});
    return setTrash([row,...current.filter(x=>String(x?.id)!==String(row.id))]);
  }
  function removeTrashItem(id){
    const current=global.AppState?.getData?.('trash')||global.API?.cacheGet?.('trash','list',21600000);
    if(!Array.isArray(current))return null;
    return setTrash(current.filter(x=>String(x?.id)!==String(id)));
  }

  function patchAllPhotos(mutator){
    const view=global.API?.cacheGet?.('albumView','__ALL__',21600000);
    if(!view||!Array.isArray(view.photos))return null;
    const next=Object.assign({},view,{photos:mutator(view.photos.slice())});
    global.API?.cacheSet?.('albumView','__ALL__',next);
    try{localStorage.setItem('FPA_ALBUM_VIEW_PERSIST_V1_'+(global.getSession?.()?.user?.id||global.getSession?.()?.user?.email||'anon').toString().trim().toLowerCase()+'|__ALL__',JSON.stringify({ts:Date.now(),value:next}));}catch(_){}
    return next;
  }
  function favoriteList(){
    const state=global.AppState?.getData?.('favorites');
    return Array.isArray(state)?state:global.API?.cacheGet?.('favorites','list',21600000);
  }
  function setFavorites(list){
    list=Array.isArray(list)?list:[];
    global.API?.cacheSet?.('favorites','list',list);
    global.AppState?.setData?.('favorites',list);
    global.SPAFavorites?.replaceCache?.(list);
    return list;
  }
  function patchAlbumView(albumId,photoId,patch,remove){
    albumId=String(albumId||'').trim(); if(!albumId)return;
    const view=global.API?.cacheGet?.('albumView',albumId,21600000);
    if(!view||!Array.isArray(view.photos))return;
    const list=remove?view.photos.filter(x=>String(x?.id)!==String(photoId)):view.photos.map(x=>String(x?.id)===String(photoId)?Object.assign({},x,patch):x);
    global.API?.cacheSet?.('albumView',albumId,Object.assign({},view,{photos:list}));
  }
  function syncFavorite(photo,isFavorite){
    if(!photo?.id)return null;
    const id=String(photo.id), current=favoriteList();
    if(!Array.isArray(current))return null;
    let next=current.filter(x=>String(x?.id)!==id);
    if(isFavorite)next.push(Object.assign({},photo,{isFavorite:true}));
    setFavorites(next);
    patchAlbumView('__ALL__',id,{isFavorite:!!isFavorite},false);
    patchAlbumView(photo.albumId,id,{isFavorite:!!isFavorite},false);
    return next;
  }
  function patchPhotoEverywhere(photo){
    if(!photo?.id)return null; const id=String(photo.id);
    patchAlbumView('__ALL__',id,photo,false);
    patchAlbumView(photo.albumId,id,photo,false);
    const fav=favoriteList();
    if(Array.isArray(fav)&&fav.some(x=>String(x?.id)===id))setFavorites(fav.map(x=>String(x?.id)===id?Object.assign({},x,photo):x));
    return photo;
  }
  // R17P2O15 — atomically move one photo across every warm photo view.
  // The photo id is the identity; title/year never participate in duplicate identity.
  function movePhotoEverywhere(photo,sourceAlbumId,targetAlbumId){
    if(!photo?.id)return null;
    const id=String(photo.id),source=String(sourceAlbumId||''),target=String(targetAlbumId||photo.albumId||'');
    const patchStored=(albumId,mode)=>{
      if(!albumId)return;
      const patch=(view)=>{
        if(!view||!Array.isArray(view.photos))return view;
        let list=view.photos.filter(x=>String(x?.id)!==id);
        if(mode==='add')list.push(Object.assign({},photo,{albumId:target}));
        return Object.assign({},view,{photos:list});
      };
      const cached=global.API?.cacheGet?.('albumView',albumId,21600000);
      if(cached)global.API?.cacheSet?.('albumView',albumId,patch(cached));
      try{
        const key=photoViewPersistKey_(albumId),stored=readPersist_(key);
        if(stored?.value)writePersist_(key,patch(stored.value));
      }catch(_){}
    };
    patchStored(source,'remove');
    patchStored(target,'add');
    patchStored('__ALL__','add');
    const fav=favoriteList();
    if(Array.isArray(fav)&&fav.some(x=>String(x?.id)===id))setFavorites(fav.map(x=>String(x?.id)===id?Object.assign({},x,photo,{albumId:target}):x));
    return photo;
  }
  function removePhotoEverywhere(id,albumId){
    id=String(id||''); if(!id)return;
    patchAlbumView('__ALL__',id,null,true); patchAlbumView(albumId,id,null,true);
    const fav=favoriteList(); if(Array.isArray(fav))setFavorites(fav.filter(x=>String(x?.id)!==id));
  }
  function removePhotoFromAll(id){return patchAllPhotos(list=>list.filter(x=>String(x?.id)!==String(id)));}
  function upsertPhotoInAll(item){if(!item)return null;return patchAllPhotos(list=>{const i=list.findIndex(x=>String(x?.id)===String(item.id));if(i>=0)list[i]=Object.assign({},list[i],item);else list.push(item);return list;});}

  function retireAlbums(ids){
    global.API?.cacheRemove?.('albums','counts');
    (ids||[]).forEach(id=>global.AppStateSync?.invalidatePhotoViews?.(id));
    global.AppRouter?.invalidate?.('albums');
  }
  async function reconcileDashboard(){
    const s=global.SessionManager?.getSession?.()||global.getSession?.(); if(!s?.token)return null;
    const seq=++dashboardSeq;
    global.API?.cacheRemove?.('dashboard','main');
    try{
      const r=await global.API.call('dashboard',{token:s.token},'GET');
      if(seq!==dashboardSeq||!r?.ok||!r.data)return null;
      const data=r.data;
      global.API?.cacheSet?.('dashboard','main',data);
      global.AppState?.setData?.('dashboard',data);
      const boot=global.AppState?.getBootstrap?.();if(boot)boot.dashboard=Object.assign({},data);
      paintDashboard(data);
      return data;
    }catch(_){return null;}
  }
  function commitDashboardDelta(delta){
    delta=delta||{};
    const current=global.AppState?.getData?.('dashboard')||global.API?.cacheGet?.('dashboard','main',21600000);
    if(!current||typeof current!=='object')return null;
    const next=Object.assign({},current);
    ['albums','photos','favorites'].forEach(key=>{
      if(delta[key]!=null)next[key]=Math.max(0,(Number(next[key])||0)+(Number(delta[key])||0));
    });
    global.API?.cacheSet?.('dashboard','main',next);
    global.AppState?.setData?.('dashboard',next);
    const boot=global.AppState?.getBootstrap?.();if(boot)boot.dashboard=Object.assign({},next);
    paintDashboard(next);
    return next;
  }
  function afterMutation(opts){
    opts=opts||{};
    const trashPromise=opts.trash?retireTrash():Promise.resolve(null);
    if(opts.albums)retireAlbums(opts.albumIds||[]);
    const dashPromise=opts.dashboard===false?Promise.resolve(null):reconcileDashboard();
    return Promise.all([trashPromise,dashPromise]).then(x=>x[1]);
  }
  global.AppDataSync={afterMutation,reconcileDashboard,retireTrash,refreshTrash,setTrash,addTrashItem,removeTrashItem,removePhotoFromAll,upsertPhotoInAll,setFavorites,syncFavorite,patchPhotoEverywhere,movePhotoEverywhere,removePhotoEverywhere,retireAlbums,paintDashboard,commitDashboardDelta};
})(window);
