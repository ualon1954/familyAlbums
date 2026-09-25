(function(global){
  const PERSIST_PREFIX='FPA_DASHBOARD_PERSIST_V1_';
  const LAST_PREFIX='FPA_DASHBOARD_LAST_V1_';

  function session(){
    try{return global.SessionManager?.getSession?.() || global.getSession?.() || null;}catch(_){return null;}
  }
  function uid(s){const u=s?.user||{};return String(u.id||u.email||s?.userId||'anon').trim().toLowerCase();}
  function read(key){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x?.value||null;}catch(_){return null;}}
  function write(s,value){
    try{const raw=JSON.stringify({ts:Date.now(),value});localStorage.setItem(PERSIST_PREFIX+uid(s),raw);localStorage.setItem(LAST_PREFIX+uid(s),raw);}catch(_){}
  }
  function tokenKey(s){let h=2166136261;for(const ch of String(s?.token||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function sessionCacheKey(s){return PERSIST_PREFIX+uid(s)+'_SESSION_'+tokenKey(s);}
  function cached(s){
    const admin=String(s?.user?.role||'').toUpperCase()==='ADMIN';
    // R17I6: permission-sensitive users are strictly server-first.
    // Do not return any persisted/session cache for FAMILY/GUEST: even a
    // session-scoped snapshot can be stale after Admin changes permissions.
    if(!admin) return null;
    return read(sessionCacheKey(s))||global.API?.cacheGet?.('dashboard','main',600000)||read(PERSIST_PREFIX+uid(s))||read(LAST_PREFIX+uid(s))||null;
  }
  function writeSessionSafe(s,value){try{localStorage.setItem(sessionCacheKey(s),JSON.stringify({ts:Date.now(),value}));}catch(_){}}
  function normalized(data){
    return {
      albums:Math.max(0,Number(data?.albums)||0),
      photos:Math.max(0,Number(data?.photos)||0),
      favorites:Math.max(0,Number(data?.favorites)||0)
    };
  }
  function sameCounts(a,b){
    const x=normalized(a),y=normalized(b);
    return x.albums===y.albums&&x.photos===y.photos&&x.favorites===y.favorites;
  }
  function paint(data){
    const values=normalized(data);
    const map={spaAlbumCount:'albums',spaPhotoCount:'photos',spaFavCount:'favorites'};
    Object.entries(map).forEach(([id,key])=>{
      const el=document.getElementById(id);
      const next=String(values[key]);
      if(el&&el.textContent!==next)el.textContent=next;
    });
  }
  function template(s){
    const u=s?.user||{}, admin=String(u.role||'').toUpperCase()==='ADMIN';
    return `<section class="section"><div class="heading"><div><span class="eyebrow">לוח בקרה · SPA</span><h1>שלום, <span id="spaHello"></span> 👋</h1><p>כאן מתחילים את המסע בזיכרונות שלכם.</p></div></div>
      <div id="spaDashboardStatus" class="dashboard-load-status" role="status" aria-live="polite"></div>
      <div id="spaDashboardGrid" class="dashboard-grid">
        <a class="metric metric-link" href="#/albums"><span>📚</span><strong id="spaAlbumCount">—</strong><small>אלבומים</small><b class="metric-action">פתח אלבומים ←</b></a>
        <a class="metric metric-link" href="#/album?id=__ALL__"><span>🖼️</span><strong id="spaPhotoCount">—</strong><small>כל התמונות</small><b class="metric-action">פתח כל התמונות ←</b></a>
        <a class="metric metric-link" href="#/favorites"><span>♥</span><strong id="spaFavCount">—</strong><small>מועדפים</small><b class="metric-action">פתח מועדפים ←</b></a>
        ${admin?'<a class="metric metric-link" href="#/trash"><span>🗑️</span><strong>♻</strong><small>סל מחזור</small><b class="metric-action">פתח סל מחזור ←</b></a><a class="metric metric-link" href="#/admin"><span>⚙️</span><strong>ADMIN</strong><small>ניהול</small><b class="metric-action">פתח ניהול ←</b></a>':''}
      </div></section>`;
  }
  async function mount(outlet, routeContext){
    const active=()=>!routeContext || routeContext.isActive();
    const s=session();
    if(!s?.user||!s?.token){
      location.href='index.html?autoLogin=1&loginRequired=1&return='+encodeURIComponent('index.html#/dashboard');
      return;
    }
    global.AppState?.setSession(s);
    outlet.innerHTML=template(s);
    const hello=document.getElementById('spaHello');if(hello)hello.textContent=s.user.name||s.user.email||'משתמש';
    const status=document.getElementById('spaDashboardStatus');
    const grid=document.getElementById('spaDashboardGrid');

    // R17J: within the same authenticated SPA session, AppState is authoritative
    // for warm navigation. Paint immediately and never show a loading message.
    const bootWarm=global.AppState?.getBootstrap?.()||null;
    const warm=global.AppState?.getData?.('dashboard')||bootWarm?.dashboard||null;
    if(warm){
      paint(warm);
      if(status){status.textContent='';status.className='dashboard-load-status ok';}
      if(grid)grid.hidden=false;
    }else{
      if(grid)grid.hidden=true;
      if(status){status.textContent='טוען נתוני לוח בקרה...';status.className='dashboard-load-status loading';}
    }

    // R17K1: a valid bootstrap is authoritative for the lifetime of this login.
    // Warm route changes must not enter a loading state or call the server again.
    if(bootWarm){
      if(!global.AppState?.getData?.('dashboard')) global.AppState?.setData?.('dashboard',bootWarm.dashboard||{});
      return;
    }

    try{
      // Cold load only: one bootstrap request for this authenticated session.
      const boot=await global.SessionDataStore.ensureBootstrap();
      if(!active()) return;
      const data=boot.dashboard||{};
      const bootAlbums=Array.isArray(boot.albums)?boot.albums:[];
      global.API.cacheSet('dashboard','main',data);write(s,data);writeSessionSafe(s,data);
      global.API.cacheSet('albums','list',bootAlbums);
      global.API.cacheSet('albums','counts',boot.albumPhotoCounts||{});
      global.AppState?.patchData?.({dashboard:data,albums:bootAlbums});
      global.AppState?.setBootstrap?.(boot);
      // Cold load paints once. Warm navigation repaints only if server data changed.
      if(!warm || !sameCounts(warm,data)) paint(data);
      if(grid)grid.hidden=false;
      if(status){status.textContent='';status.className='dashboard-load-status ok';}
    }catch(err){
      if(!active()) return;
      console.error('SPA dashboard:',err);
      if(status){status.className='dashboard-load-status '+(warm?'ok':'error');status.textContent=warm?'':(err?.message||'לא ניתן לטעון את לוח הבקרה');}
    }
  }
  global.SPADashboard={mount};
})(window);
