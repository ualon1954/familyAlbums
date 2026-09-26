(function(){
  function syncSession(){
    let session = null;
    try{ session = window.SessionManager?.getSession?.() || window.getSession?.() || null; }catch(e){}
    window.AppState?.setSession(session);
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    syncSession();
    if(window.mountLayout) window.mountLayout('home');
    const spaNav={home:'#/home',dashboard:'#/dashboard',albums:'#/albums',favorites:'#/favorites',about:'#/about',trash:'#/trash',activity:'#/activity',admin:'#/admin',feedback:'#/feedback'};
    document.querySelectorAll('#nav a').forEach(a=>{const href=(a.getAttribute('href')||'').toLowerCase();const key=href==='index.html'?'home':href==='dashboard.html'?'dashboard':href==='albums.html'?'albums':href==='favorites.html'?'favorites':href==='about.html'?'about':href==='trash.html'?'trash':href==='activity-log.html'?'activity':href==='admin.html'?'admin':'';if(key)a.setAttribute('href',spaNav[key]);});
    window.AppState?.subscribe?.(st=>{document.querySelectorAll('#nav a').forEach(a=>a.classList.remove('active'));const active=document.querySelector(`#nav a[href="#/`+st.route+`"]`);active?.classList.add('active');});

    AppRouter.register('home', ({outlet})=>{ outlet.innerHTML = SPAViews.home(); });
    AppRouter.register('dashboard', async ({outlet,routeContext})=>{ await SPADashboard.mount(outlet,routeContext); }, {keepAlive:true});
    AppRouter.register('albums', async ({outlet,routeContext})=>{ await SPAAlbums.mount(outlet,routeContext); }, {keepAlive:true});
    AppRouter.register('album', async ({outlet,params})=>{ return await SPAAlbum.mount(outlet,params); });
    AppRouter.register('favorites', async ({outlet})=>{ return await SPAFavorites.mount(outlet); }, {keepAlive:true});
    AppRouter.register('trash', async ({outlet})=>{ return await SPATrash.mount(outlet); }, {keepAlive:true});
    AppRouter.register('feedback', async ({outlet})=>{ return await SPAFeedback.mount(outlet); });
    AppRouter.register('activity', async ({outlet})=>{ return await SPAActivity.mount(outlet); }, {keepAlive:true});
    AppRouter.register('admin', async ({outlet})=>{ return await SPAAdmin.mount(outlet); }, {keepAlive:true});
    AppRouter.register('about', ({outlet})=>{ outlet.innerHTML = SPAViews.about(); const s=window.SessionManager?.getSession?.()||window.getSession?.(); const el=outlet.querySelector('#aboutRolesSection'); if(el) el.hidden=String(s?.user?.role||'').toUpperCase()!=='ADMIN'; });
    AppRouter.register('migration', ({outlet})=>{ outlet.innerHTML = SPAViews.migration(); });
    AppRouter.register('not-found', ({outlet})=>{ outlet.innerHTML = SPAViews.notFound(); });

    // R17P1: an already-valid Session uses the same application bootstrap as a fresh login.
    // Do not enter Dashboard until all role-specific mandatory parallel tasks have settled.
    const startupSession=window.SessionManager?.getSession?.()||window.getSession?.()||null;
    if(startupSession?.token){
      try{
        await window.SessionDataStore?.ensureApplicationBootstrap?.();
        if(window.mountLayout) window.mountLayout('dashboard');
        if(!location.hash || location.hash==='#/home') location.hash='#/dashboard';
      }catch(e){
        console.error('Application bootstrap failed:',e);
        if(window.uiAlert) await window.uiAlert((e?.message||'טעינת המערכת נכשלה')+'\nנסה לרענן את הדף.',{title:'טעינת המערכת נכשלה',icon:'!'});
      }
    }
    AppRouter.start('#spaOutlet');

    // R17K6T2: SPA navigation firewall. Some legacy/generated controls can still
    // carry *.html hrefs. Inside the SPA shell they must NEVER trigger a document
    // navigation. Translate them to SPA routes at click time in capture phase,
    // before any legacy bubbling handler can run.
    const legacyToSpa={
      'index.html':'home','dashboard.html':'dashboard','albums.html':'albums',
      'favorites.html':'favorites','about.html':'about','trash.html':'trash','activity-log.html':'activity','admin.html':'admin','album.html':'album'
    };
    document.addEventListener('click',(e)=>{
      const a=e.target?.closest?.('a[href]');
      if(!a || !document.querySelector('#spaOutlet')) return;
      const raw=(a.getAttribute('href')||'').trim();
      if(!raw || raw.startsWith('#/') || raw.startsWith('javascript:')) return;
      let url;
      try{ url=new URL(raw,location.href); }catch(_){ return; }
      if(url.origin!==location.origin) return;
      const file=(url.pathname.split('/').pop()||'').toLowerCase();
      const route=legacyToSpa[file];
      if(!route) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      if(route==='album'){
        const id=url.searchParams.get('id')||'';
        AppRouter.go('album',{id});
      }else AppRouter.go(route);
    },true);

    // R17K5: login/logout must fully rehydrate the SPA shell in-place.
    window.addEventListener('fpa:sessionchange', (ev)=>{
      const type=ev?.detail?.type||'';
      const next=ev?.detail?.session||null;
      if(type==='logout'){
        window.API?.cacheClear?.();
        window.SessionDataStore?.reset?.();
        window.AppRouter?.resetPersistent?.();
        window.AppState?.resetSession?.();
        if(window.mountLayout) window.mountLayout('home');
        // R17K6: render the Home view first, then place the mandatory Login Modal
        // above it. This preserves the blurred-home background after logout/expiry.
        window.AppRouter?.go?.('home');
        requestAnimationFrame(()=>{
          if(typeof window.resetLoginForm==='function') window.resetLoginForm();
          if(typeof window.openLoginModal==='function') window.openLoginModal();
        });
        return;
      }
      if(type==='login' && next){
        window.API?.cacheClear?.();
        window.SessionDataStore?.reset?.();
        window.AppRouter?.resetPersistent?.();
        window.AppState?.setSession?.(next);
        if(window.mountLayout) window.mountLayout('dashboard');
      }
    });
  });
})();
