(function(global){
  let trashItems=[];
  let session=null;
  let outletRef=null;

  function esc_(v){ return global.esc ? global.esc(v) : String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function year_(v){ return String(v||'').match(/(?:19|20|21)\d{2}/)?.[0] || String(v||''); }
  function date_(v){ if(!v)return ''; try{const d=v instanceof Date?v:new Date(v);if(!Number.isNaN(d.getTime()))return new Intl.DateTimeFormat('he-IL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace(',', '');}catch(e){} return String(v||''); }
  function status_(text,show=true,loading=false){ const el=outletRef?.querySelector('#spaTrashStatus'); if(!el)return; el.style.display=show?'flex':'none'; el.classList.toggle('loading',!!loading); el.innerHTML=show?(loading?'<span class="spa-inline-spinner" aria-hidden="true"></span><span>'+esc_(text||'')+'</span>':esc_(text||'')):''; }
  function countStatus_(){ const el=outletRef?.querySelector('#spaTrashCountStatus'); if(!el)return; const n=trashItems.length; el.style.display='flex'; el.textContent=`סה״כ רשומות בסל המחזור: ${n}`; }

  function isAdmin_(){return String(session?.user?.role||'').toUpperCase()==='ADMIN';}
  function render_(){
    const grid=outletRef?.querySelector('#spaTrashGrid'); if(!grid)return;
    countStatus_();
    const emptyBtn=outletRef?.querySelector('#spaEmptyTrashBtn'); if(emptyBtn)emptyBtn.disabled=!trashItems.length;
    grid.innerHTML=trashItems.map(p=>String(p.trashType||'photo')==='album'?`<figure class="photo-card trash-album-card" data-trash-id="${esc_(p.id)}"><div class="photo-wrap trash-album-icon"><span aria-hidden="true">📁</span></div><figcaption><strong>אלבום: ${esc_(p.title||'ללא שם')}</strong><small>🖼️ ${Math.max(0,Number(p.photoCount)||0)} תמונות שנמחקו עם האלבום</small><small>🗑️ נמחק: ${esc_(date_(p.deletedAt))}</small><div class="trash-actions"><button class="btn" type="button" data-restore-album="${esc_(p.id)}">↩ שחזור אלבום ותמונות</button>${isAdmin_()?`<button class="danger-btn" type="button" data-permanent-album="${esc_(p.id)}">🗑️ מחיקה לצמיתות</button>`:''}</div></figcaption></figure>`:`<figure class="photo-card" data-trash-id="${esc_(p.id)}"><div class="photo-wrap"><img src="${esc_(p.thumbnailUrl||p.imageUrl||'')}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" alt="${esc_(p.photoTitle||p.fileName||'תמונה')}"></div><figcaption><strong>${esc_(p.photoTitle||'ללא כותרת')}</strong>${p.photoDate?`<small>📅 ${esc_(year_(p.photoDate))}</small>`:''}<small>🗑️ נמחקה: ${esc_(date_(p.deletedAt))}</small><div class="trash-actions"><button class="btn" type="button" data-restore="${esc_(p.id)}">↩ שחזור</button>${isAdmin_()?`<button class="danger-btn" type="button" data-permanent="${esc_(p.id)}">🗑️ מחיקה לצמיתות</button>`:''}</div></figcaption></figure>`).join('')||'<p class="spa-empty-state">סל המחזור ריק.</p>';
  }

  async function load_(hasVisibleData=false){
    if(hasVisibleData) status_('',false); else status_('טוען סל מחזור...',true,true);
    try{
      const r=await API.call('trash',{token:session.token},'GET');
      if(!r.ok) throw new Error(r.message||'לא ניתן לטעון את סל המחזור');
      trashItems=Array.isArray(r.data)?r.data:[];
      global.AppState?.setData?.('trash',trashItems);
      global.API?.cacheSet?.('trash','list',trashItems);
      render_(); status_('',false);
    }catch(e){
      console.error('spa trash:',e);
      status_((e?.message||'לא ניתן לטעון את סל המחזור')+' — לחץ כאן לניסיון נוסף');
      const st=outletRef?.querySelector('#spaTrashStatus'); if(st){st.style.cursor='pointer';st.onclick=load_;}
      if(!trashItems.length){ const grid=outletRef?.querySelector('#spaTrashGrid'); if(grid)grid.innerHTML='<p>לא ניתן לטעון כרגע את סל המחזור.</p>'; }
    }
  }


  async function activeAlbums_(){
    let list=global.AppState?.getData?.('albums');
    if(!Array.isArray(list)||!list.length){
      const cached=global.API?.cacheGet?.('albums','list',600000); if(Array.isArray(cached))list=cached;
    }
    if(!Array.isArray(list)||!list.length){
      const r=await API.call('albums',{token:session.token},'GET');
      if(r?.ok)list=Array.isArray(r.data)?r.data:[];
    }
    return (Array.isArray(list)?list:[]).filter(a=>a&&String(a.id)!=='__ALL__'&&String(a.active).toLowerCase()!=='false');
  }
  async function chooseRestoreAlbum_(item){
    const allAlbums=await activeAlbums_();
    const isAdmin=String(session?.user?.role||'').toUpperCase()==='ADMIN';
    const albums=allAlbums.filter(a=>isAdmin||a.canDelete===true);
    if(!albums.length){global.toast?.('אין אלבום פעיל עם הרשאת מחיקה/שחזור שאליו ניתן לשחזר את התמונה','error');return '';}
    const modal=outletRef?.querySelector('#spaRestoreTargetModal'),sel=outletRef?.querySelector('#spaRestoreTargetAlbum');
    if(!modal||!sel)return '';
    sel.innerHTML='<option value="">נא לבחור אלבום יעד</option>'+albums.map(a=>`<option value="${esc_(a.id)}">${esc_(a.title||a.name||'אלבום')}</option>`).join('');
    modal.hidden=false; modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
    return await new Promise(resolve=>{
      const done=v=>{modal.classList.remove('open');modal.hidden=true;modal.setAttribute('aria-hidden','true');ok.onclick=cancel.onclick=null;resolve(v||'');};
      const ok=outletRef.querySelector('#spaRestoreTargetOk'),cancel=outletRef.querySelector('#spaRestoreTargetCancel');
      ok.onclick=()=>{if(!sel.value){global.toast?.('יש לבחור אלבום יעד','error');return;}done(sel.value);}; cancel.onclick=()=>done('');
    });
  }


  async function restoreAlbum_(id,btn){
    const item=trashItems.find(x=>String(x.id)===String(id)&&String(x.trashType)==='album'); if(!item)return;
    let result=null;
    const ok=global.uiConfirm?await global.uiConfirm(`לשחזר את האלבום “${String(item.title||'')}” ואת ${Math.max(0,Number(item.photoCount)||0)} התמונות שנמחקו איתו?`,{title:'שחזור אלבום',confirmText:'שחזר אלבום',cancelText:'ביטול',icon:'↩',busyText:'משחזר...',successText:'✓ האלבום שוחזר בהצלחה',successDelay:1800,onConfirm:async()=>{const r=await API.call('restoreAlbum',{token:session.token,id});if(!r?.ok)throw new Error(r?.message||'לא ניתן לשחזר את האלבום');result=r;}}):confirm('לשחזר את האלבום והתמונות?');
    if(!ok)return;
    if(!global.uiConfirm){const r=await API.call('restoreAlbum',{token:session.token,id});if(!r?.ok){global.toast?.(r?.message||'לא ניתן לשחזר את האלבום','error');return;}result=r;}
    if(!result)return;
    trashItems=trashItems.filter(x=>String(x.id)!==String(id)); global.AppState?.setData?.('trash',trashItems); global.API?.cacheSet?.('trash','list',trashItems);
    const restoredPhotos=Math.max(0,Number(result?.data?.restoredPhotos)||0);
    const restoredAlbum=Object.assign({},result?.data?.album||item,{active:true,deletedAt:'',deletedBy:'',photoCount:restoredPhotos});
    // R17P2O22P: patch the warm Albums snapshot immediately. Albums intentionally
    // trusts warm session state, so clearing it here made the restored album appear
    // only after F5. Keep the restored album + count authoritative in the SPA.
    try{
      const current=global.AppState?.getData?.('albums');
      const list=Array.isArray(current)?current.slice():[];
      const pos=list.findIndex(x=>String(x?.id)===String(id));
      if(pos>=0)list[pos]=Object.assign({},list[pos],restoredAlbum);else list.push(restoredAlbum);
      global.AppState?.setData?.('albums',list); global.API?.cacheSet?.('albums','list',list);
      const counts=Object.assign({},global.API?.cacheGet?.('albums','counts',21600000)||{}); counts[id]=restoredPhotos; global.API?.cacheSet?.('albums','counts',counts);
      const boot=global.AppState?.getBootstrap?.(); if(boot){boot.albums=list.slice();boot.albumPhotoCounts=Object.assign({},boot.albumPhotoCounts||{},counts);}
    }catch(_){}
    // R17P2O22U: also update Albums' module-local + persisted warm snapshots.
    // Without this, the keep-alive Albums view can keep the pre-restore list until F5.
    global.SPAAlbums?.upsertRestoredAlbum?.(restoredAlbum,restoredPhotos);
    global.AppStateSync?.invalidatePhotoViews?.(id); global.AppRouter?.invalidate?.('album');
    global.AppDataSync?.afterMutation?.({dashboard:true,albums:false,trash:false}); render_();
    // X4L: Restore has one consistent completion destination. State/counts are
    // committed first, then the user returns to the warm Albums list.
    global.AppRouter?.invalidate?.('albums');
    global.AppRouter?.go?.('albums');
  }
  async function restore_(id,btn){
    let restoreResult=null;
    const item=trashItems.find(x=>String(x.id)===String(id));
    if(!item)return;
    const albumId=String(item?.albumId||'');
    const albums=await activeAlbums_();
    const isAdmin=String(session?.user?.role||'').toUpperCase()==='ADMIN';
    const sourceExists=albums.some(a=>String(a.id)===albumId&&(isAdmin||a.canDelete===true));
    let targetAlbumId='';
    if(!sourceExists){
      targetAlbumId=await chooseRestoreAlbum_(item);
      if(!targetAlbumId)return;
    }
    const ok=global.uiConfirm ? await global.uiConfirm(sourceExists?'לשחזר את התמונה לאלבום?':'לשחזר את התמונה לאלבום שנבחר?',{
      title:'שחזור תמונה',confirmText:'שחזר',cancelText:'ביטול',icon:'↩',busyText:'משחזר...',successText:'✓ התמונה שוחזרה בהצלחה',successDelay:1800,
      onConfirm:async()=>{
        const r=await API.call('restorePhoto',{token:session.token,id,targetAlbumId});
        if(!r?.ok)throw new Error(r?.message||'לא ניתן לשחזר את התמונה');
        restoreResult=r;
        // R17P2O13: uiConfirm owns its lifecycle; do not remove its overlay manually.
        // Manual removal left queued confirmations alive and could reopen the same restore dialog.
      }
    }) : confirm('לשחזר את התמונה לאלבום?');
    if(!ok)return;
    if(!global.uiConfirm){
      try{
        const r=await API.call('restorePhoto',{token:session.token,id,targetAlbumId});
        if(!r?.ok)throw new Error(r?.message||'לא ניתן לשחזר את התמונה');
        restoreResult=r;
      }catch(e){
        global.toast?.('שגיאה: '+(e?.message||e),'error');
        return;
      }
    }
    if(!restoreResult)return;
    // Commit client state only after the server has confirmed the restore.
    trashItems=trashItems.filter(x=>String(x.id)!==String(id));
    global.AppState?.setData?.('trash',trashItems);
    global.API?.cacheSet?.('trash','list',trashItems);
    const restoredAlbumId=String(restoreResult?.data?.albumId||targetAlbumId||albumId);
    global.AppStateSync?.photoDelta?.(restoredAlbumId,1);
    global.AppDataSync?.upsertPhotoEverywhere?.(Object.assign({},item,{albumId:restoredAlbumId,active:true,deletedAt:''}));
    global.AppDataSync?.removeTrashItem?.(id);
    // R17P2O22D: the restored photo must not be hidden by an old albumView
    // (including the persisted view used after navigation). Invalidate both
    // the target album and All Photos only AFTER the server confirms success.
    global.AppDataSync?.afterMutation?.({dashboard:true,albums:false});
    render_();
    global.AppRouter?.invalidate?.('albums');
    global.AppRouter?.go?.('albums');
  }

  async function permanentAlbum_(id,btn){
    const item=trashItems.find(x=>String(x.id)===String(id)&&String(x.trashType)==='album'); if(!item)return;
    let result=null;
    const ok=global.uiConfirm?await global.uiConfirm(`למחוק לצמיתות את האלבום “${String(item.title||'')}” ואת כל התוכן שלו? פעולה זו אינה ניתנת לביטול.`,{title:'מחיקת אלבום לצמיתות',confirmText:'מחק לצמיתות',cancelText:'ביטול',danger:true,icon:'🗑',busyText:'מוחק...',onConfirm:async()=>{const r=await API.call('permanentlyDeleteAlbum',{token:session.token,id});if(!r?.ok)throw new Error(r?.message||'לא ניתן למחוק את האלבום לצמיתות');result=r;}}):confirm('למחוק את האלבום לצמיתות?');
    if(!ok||!result)return;
    trashItems=trashItems.filter(x=>String(x.id)!==String(id)); global.AppDataSync?.setTrash?.(trashItems); render_();
    global.AppDataSync?.afterMutation?.({dashboard:true,albums:true}); global.toast?.('האלבום נמחק לצמיתות','success');
  }
  async function emptyTrash_(){
    if(!trashItems.length)return; let result=null;
    const ok=global.uiConfirm?await global.uiConfirm(`למחוק לצמיתות את כל ${trashItems.length} הרשומות שבסל המחזור? פעולה זו אינה ניתנת לביטול.`,{title:'ריקון סל המחזור',confirmText:'רוקן סל',cancelText:'ביטול',danger:true,icon:'🗑',busyText:'מרוקן...',onConfirm:async()=>{const r=await API.call('emptyTrash',{token:session.token});if(!r?.ok)throw new Error(r?.message||'לא ניתן לרוקן את סל המחזור');result=r;}}):confirm('לרוקן את כל סל המחזור?');
    if(!ok||!result)return;
    trashItems=[]; global.AppDataSync?.setTrash?.([]); render_(); global.AppDataSync?.afterMutation?.({dashboard:true,albums:true}); global.toast?.('סל המחזור רוקן בהצלחה','success');
  }

  async function permanent_(id,btn){
    let deleteResult=null;
    const ok=global.uiConfirm ? await global.uiConfirm('מחיקה לצמיתות לא ניתנת לביטול. להמשיך?',{
      title:'מחיקה לצמיתות',confirmText:'מחק לצמיתות',cancelText:'ביטול',danger:true,icon:'🗑',busyText:'מוחק...',
      onConfirm:async()=>{const r=await API.call('permanentlyDeletePhoto',{token:session.token,id});if(!r?.ok)throw new Error(r?.message||'לא ניתן למחוק לצמיתות');deleteResult=r;}
    }) : confirm('מחיקה לצמיתות לא ניתנת לביטול. להמשיך?');
    if(!ok||!deleteResult)return;
    // Commit the client state only after the server has confirmed the permanent delete.
    trashItems=trashItems.filter(x=>String(x.id)!==String(id));
    global.AppState?.setData?.('trash',trashItems);
    global.API?.cacheSet?.('trash','list',trashItems);
    global.AppDataSync?.removeTrashItem?.(id);
    global.AppDataSync?.afterMutation?.({dashboard:true});
    render_();
    global.toast?.('התמונה נמחקה לצמיתות','success');
  }

  async function mount(outlet){
    outletRef=outlet; session=global.SessionManager?.getSession?.()||global.getSession?.()||null;
    if(!session){ location.href='index.html?autoLogin=1&return='+encodeURIComponent('index.html#/trash'); return; }
    const role=String(session?.user?.role||'').toUpperCase();
    if(role!=='ADMIN'&&role!=='FAMILY'){
      outlet.innerHTML='<section class="section"><div class="card spa-access-denied"><h1>אין הרשאה</h1><p>אין לך הרשאה לסל המחזור.</p><a class="btn" href="#/dashboard">חזרה ללוח הבקרה</a></div></section>'; return;
    }
    const admin=role==='ADMIN';
    outlet.innerHTML=`<section class="section"><div class="heading"><div><span class="eyebrow">${admin?'ADMIN':'שלי'}</span><h1>🗑️ סל מחזור</h1><p>${admin?'אלבומים ותמונות שנמחקו נשמרים כאן עד לשחזור או למחיקה לצמיתות.':'כאן מוצגים רק האלבומים והתמונות שלך שנמחקו, וניתן לשחזר אותם.'}</p></div><div class="trash-page-actions">${admin?'<button id="spaEmptyTrashBtn" class="danger-btn" type="button">🗑️ ריקון סל המחזור</button>':''}<a class="btn" href="#/dashboard">חזרה ללוח הבקרה</a></div></div><div id="spaTrashStatus" class="api-status-line" role="status" aria-live="polite" style="display:none"></div><div id="spaTrashCountStatus" class="api-status-line spa-trash-count-status" role="status" aria-live="polite" style="display:flex;font-weight:700">סה״כ רשומות בסל המחזור: 0</div><div id="spaTrashGrid" class="gallery"></div><div id="spaRestoreTargetModal" class="album-edit-modal" hidden aria-hidden="true"><div class="album-edit-card" role="dialog" aria-modal="true"><h2>בחירת אלבום לשחזור</h2><p>אלבום המקור של התמונה נמחק. יש לבחור אלבום יעד לשחזור.</p><label>אלבום יעד<select id="spaRestoreTargetAlbum"><option value="">נא לבחור אלבום יעד</option></select></label><div class="album-edit-actions"><button id="spaRestoreTargetCancel" class="album-edit-cancel" type="button">ביטול</button><button id="spaRestoreTargetOk" class="album-edit-save" type="button">שחזר</button></div></div></div></section>`;
    if(outlet.__spaTrashClickHandler)outlet.removeEventListener('click',outlet.__spaTrashClickHandler); outlet.__spaTrashClickHandler=e=>{ const empty=e.target.closest('#spaEmptyTrashBtn'); if(empty){emptyTrash_();return;} const pa=e.target.closest('[data-permanent-album]'); if(pa){permanentAlbum_(pa.dataset.permanentAlbum,pa);return;} const ar=e.target.closest('[data-restore-album]'); if(ar){restoreAlbum_(ar.dataset.restoreAlbum,ar);return;} const r=e.target.closest('[data-restore]'); if(r){restore_(r.dataset.restore,r);return;} const p=e.target.closest('[data-permanent]'); if(p)permanent_(p.dataset.permanent,p); }; outlet.addEventListener('click',outlet.__spaTrashClickHandler);
    const stateTrash=global.AppState?.getData?.('trash'); const cachedTrash=Array.isArray(stateTrash)?stateTrash:global.API?.cacheGet?.('trash','list',600000);
    const hasCached=Array.isArray(cachedTrash);
    if(hasCached){ trashItems=cachedTrash; render_(); return; }
    await load_(false);
  }
  global.SPATrash={mount,replaceCache(list){trashItems=Array.isArray(list)?list:[];if(outletRef?.querySelector('#spaTrashGrid'))render_();}};
})(window);
