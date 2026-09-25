(function(global){
  const LIST_PREFIX='FPA_ALBUMS_LIST_PERSIST_V1_', COUNTS_PREFIX='FPA_ALBUMS_COUNTS_PERSIST_V1_', COVER_PREFIX='FPA_ALBUM_COVER_PENDING_V1_', MAX_AGE=21600000;
  let items=[], currentSession=null, editId='', deleteId='', coverId='', lastPaintFingerprint='';
  const $=id=>document.getElementById(id);
  function session(){try{return global.SessionManager?.getSession?.()||global.getSession?.()||null;}catch(_){return null;}}
  function uid(s=currentSession){const u=s?.user||{};return String(u.id||u.email||s?.userId||'anon').trim().toLowerCase();}
  function role(s=currentSession){return String(s?.user?.role||'').toUpperCase();}
  function tokenKey(s=currentSession){let h=2166136261;for(const ch of String(s?.token||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function sessionListKey(s=currentSession){return LIST_PREFIX+uid(s)+'_SESSION_'+tokenKey(s);}
  function sessionCountsKey(s=currentSession){return COUNTS_PREFIX+uid(s)+'_SESSION_'+tokenKey(s);}
  function readKey(key){try{const x=JSON.parse(localStorage.getItem(key)||'null');if(!x||x.value==null)return null;if(x.ts&&Date.now()-Number(x.ts)>MAX_AGE)return null;return x.value;}catch(_){return null;}}
  function writeKey(key,value){try{localStorage.setItem(key,JSON.stringify({ts:Date.now(),value}));}catch(_){}}
  function canCreate(){return role()==='ADMIN'||role()==='FAMILY';}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function clean(list){return (Array.isArray(list)?list:[]).filter(a=>a&&!a.isVirtual&&a.id!=='__ALL__');}
  function read(prefix,s=currentSession){try{const x=JSON.parse(localStorage.getItem(prefix+uid(s))||'null');if(!x||x.value==null)return null;if(x.ts&&Date.now()-Number(x.ts)>MAX_AGE)return null;return x.value;}catch(_){return null;}}
  function write(prefix,value,s=currentSession){try{localStorage.setItem(prefix+uid(s),JSON.stringify({ts:Date.now(),value}));}catch(_){}}
  function mergeCounts(list,counts){if(!counts||typeof counts!=='object')return list;return list.map(a=>Object.prototype.hasOwnProperty.call(counts,String(a.id))?Object.assign({},a,{photoCount:Number(counts[String(a.id)])||0}):a);}
  function applyPendingCovers(list){try{const key=COVER_PREFIX+uid(), now=Date.now(), all=JSON.parse(sessionStorage.getItem(key)||'{}');let changed=false;const out=clean(list).map(a=>{const p=all[String(a.id)];if(!p)return a;if(Number(p.expiresAt||0)<=now){delete all[String(a.id)];changed=true;return a;}return Object.assign({},a,p.patch||{});});if(changed)sessionStorage.setItem(key,JSON.stringify(all));return out;}catch(_){return clean(list);}}
  function persist(){global.API?.cacheSet?.('albums','list',items);write(LIST_PREFIX,items);global.AppState?.setData?.('albums',items);}
  function invalidate(){global.API?.cacheRemove?.('dashboard','main');}
  function find(id){return items.find(a=>String(a.id)===String(id))||null;}
  function manageable(a){return !!(a&&(role()==='ADMIN'||a.canManage===true));}
  function fingerprint(list){return JSON.stringify(clean(list).map(a=>[String(a.id||''),String(a.title||''),String(a.description||''),String(a.coverUrl||''),Number(a.photoCount)||0,!!a.canUpload,!!a.canManage]));}
  function modalMarkup(){return `<div id="spaAlbumCreateModal" class="album-edit-modal" aria-hidden="true"><div class="album-edit-card" role="dialog" aria-modal="true"><h2>אלבום חדש</h2><label>שם אלבום <span class="required-star">*</span><input id="spaCreateAlbumName" required placeholder="נא להזין שם אלבום"></label><label>תיאור<textarea id="spaCreateAlbumDescription" placeholder="נא להזין תיאור (אופציונלי)"></textarea></label><p class="owner-permission-note">האלבום יהיה בבעלותך עם הרשאה מלאה לניהול האלבום והתמונות.</p><div id="spaCreateAlbumBusy" class="spa-create-album-busy" hidden><span class="spa-create-spinner" aria-hidden="true"></span><strong>יוצר את האלבום...</strong></div><div id="spaCreateAlbumStatus" class="album-create-status" role="status" aria-live="polite"></div><div class="album-edit-actions"><button data-spa-close="create" class="album-edit-cancel">ביטול</button><button id="spaSaveAlbumCreate" class="album-edit-save">צור אלבום</button></div></div></div>
  <div id="spaAlbumEditModal" class="album-edit-modal" aria-hidden="true"><div class="album-edit-card" role="dialog" aria-modal="true"><h2>עריכת אלבום</h2><label>שם אלבום <span class="required-star">*</span><input id="spaEditAlbumName" required></label><label>תיאור<textarea id="spaEditAlbumDescription"></textarea></label><div id="spaEditAlbumStatus" class="album-create-status"></div><div class="album-edit-actions"><button data-spa-close="edit" class="album-edit-cancel">ביטול</button><button id="spaSaveAlbumEdit" class="album-edit-save">שמור</button></div></div></div>
  <div id="spaAlbumDeleteModal" class="album-edit-modal" aria-hidden="true"><div class="album-edit-card" role="dialog" aria-modal="true"><h2>מחיקת אלבום</h2><p>האם למחוק את האלבום <strong id="spaDeleteAlbumName"></strong>?</p><p id="spaDeleteAlbumWarning">האלבום יוסר מרשימת האלבומים.</p><div id="spaDeleteAlbumStatus" class="album-create-status"></div><div class="album-edit-actions"><button data-spa-close="delete" class="album-edit-cancel">ביטול</button><button id="spaConfirmAlbumDelete" class="album-delete-confirm-btn">כן, מחק</button></div></div></div>
  <div id="spaAlbumCoverModal" class="album-edit-modal" aria-hidden="true"><div class="album-edit-card album-cover-card" role="dialog" aria-modal="true"><h2 id="spaAlbumCoverTitle">שינוי תמונת מעטפת</h2><div id="spaOwnerCoverGrid" class="owner-cover-grid"><div class="loading spa-view-loading">טוען תמונות...</div></div><div class="owner-cover-divider"><span>או</span></div><label class="owner-cover-upload">תמונה מהמחשב<input id="spaOwnerCoverFile" type="file" accept="image/*"></label><div id="spaOwnerCoverStatus" class="owner-cover-status"></div><div class="album-edit-actions owner-cover-actions"><button id="spaClearOwnerCover" class="album-edit-cancel">הסר מעטפת</button><button data-spa-close="cover" class="album-edit-cancel">סגור</button><button id="spaUploadOwnerCover" class="album-edit-save">העלה ושמור</button></div></div></div>`;}
  function template(){return `<section class="section spa-albums-page"><div class="albums-head"><div><span class="eyebrow">אלבומים · SPA</span><h1>האלבומים שלנו</h1><p>כל הזיכרונות במקום אחד.</p></div>${canCreate()?'<button id="spaCreateAlbumBtn" class="album-create-main" type="button">＋ אלבום חדש</button>':''}</div><div id="spaAlbumsMessage" class="spa-albums-message" role="status"></div><div id="spaAlbumsStatus" class="albums-load-status" role="status"></div><div id="spaAlbumsGrid" class="album-list-grid"></div></section>${modalMarkup()}`;}
  function card(a){const admin=role()==='ADMIN',canUpload=admin||a.canUpload===true,canManage=admin||a.canManage===true,title=esc(a.title||'אלבום'),desc=esc(a.description||''),id=esc(a.id||''),cover=String(a.coverUrl||'');const actions=(canUpload||canManage)?`<div class="album-admin-actions spa-album-actions">${canUpload?`<a class="album-upload-btn" href="#/album?id=${encodeURIComponent(a.id)}&upload=1" title="העלאת תמונות">📤</a>`:''}${canManage?`<button class="album-cover-btn" data-spa-cover="${id}" title="שינוי מעטפת">🖼️</button><button class="album-edit-btn" data-spa-edit="${id}" title="עריכת אלבום">✎</button><button class="album-delete-btn" data-spa-delete="${id}" title="מחיקת אלבום">🗑️</button>`:''}</div>`:'';return `<div class="album-card-wrap"><a class="album-card" href="#/album?id=${encodeURIComponent(a.id)}"><div class="album-cover-wrap">${cover?`<img class="album-cover" src="${esc(cover)}" alt="${title}" loading="lazy">`:`<div class="album-cover empty">📷</div>`}<span class="album-photo-count" data-spa-album-count="${id}">📷 ${a.photoCount==null?'…':Number(a.photoCount)||0}</span></div><div class="album-card-body"><h2>${title}</h2><p>${desc}</p></div></a>${actions}</div>`;}
  function paint(list){const grid=$('spaAlbumsGrid');if(!grid)return;const next=clean(list),fp=fingerprint(next);if(lastPaintFingerprint===fp&&grid.dataset.painted==='1'){items=next;return;}items=next;lastPaintFingerprint=fp;grid.dataset.painted='1';grid.innerHTML=items.length?items.map(card).join(''):'<div class="empty-state">אין אלבומים להצגה.</div>';}
  function message(text,type=''){const el=$('spaAlbumsMessage');if(!el)return;el.textContent=text||'';el.className='spa-albums-message'+(type?' '+type:'');if(text)setTimeout(()=>{if(el.textContent===text)el.textContent='';},3500);}
  const feedbackPause=()=>new Promise(resolve=>setTimeout(resolve,1400));
  function modalSuccess(el,text){if(el){el.textContent='✓ '+text;el.className='album-create-status success';}}
  function openModal(name){const m=$('spaAlbum'+name+'Modal');m?.classList.add('open');m?.setAttribute('aria-hidden','false');}
  function closeModal(name){const m=$('spaAlbum'+name+'Modal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true');if(name==='Edit')editId='';if(name==='Delete')deleteId='';if(name==='Cover'){coverId='';if($('spaOwnerCoverStatus'))$('spaOwnerCoverStatus').textContent='';}}
  async function createAlbum(){
    if(!canCreate())return;
    const name=$('spaCreateAlbumName'),desc=$('spaCreateAlbumDescription'),st=$('spaCreateAlbumStatus'),btn=$('spaSaveAlbumCreate'),busy=$('spaCreateAlbumBusy');
    const title=String(name.value||'').trim().replace(/\s+/g,' '),description=String(desc.value||'').trim();
    st.textContent='';st.className='album-create-status';
    if(!title){st.textContent='נא להזין שם אלבום';st.classList.add('error');name.focus();return;}

    // R17L5E: optimistic create is painted BEFORE the network call. This makes the
    // progress state and the new row independent of Apps Script latency, cache and
    // bootstrap refreshes. A failed create rolls the temporary card back.
    const tempId='__creating__'+Date.now();
    const temp={id:tempId,title,description,coverUrl:'',photoCount:0,canUpload:false,canManage:false,isOwner:true,_creating:true};
    const previous=items.slice();
    items=[...items,temp];
    lastPaintFingerprint='';
    paint(items);
    message('⏳ יוצר את האלבום "'+title+'"...','loading');

    const old=btn.textContent;
    btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='⏳ יוצר...';
    if(busy){busy.hidden=false;busy.style.display='flex';}
    st.textContent='⏳ יוצר את האלבום... נא להמתין';st.className='album-create-status loading';
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    try{
      const r=await global.API.call('createAlbum',{token:currentSession.token,title,description});
      if(!r?.ok)throw new Error(r?.message||'לא ניתן ליצור את האלבום');
      const a=Object.assign({coverUrl:'',photoCount:0,canUpload:true,canManage:true,isOwner:true},r.data||{});
      if(!a.id)throw new Error('האלבום נוצר אך לא התקבל מזהה אלבום');

      items=items.map(x=>String(x.id)===tempId?a:x);
      lastPaintFingerprint='';
      paint(items);
      persist();
      const counts=read(COUNTS_PREFIX)||{};counts[String(a.id)]=0;write(COUNTS_PREFIX,counts);
      writeKey(sessionListKey(),items);writeKey(sessionCountsKey(),counts);
      global.API.cacheSet?.('albums','list',items);global.API.cacheSet?.('albums','counts',counts);global.AppState?.setData?.('albums',items);global.AppStateSync?.albumDelta?.(1);invalidate();
      try{
        const boot=global.AppState?.getBootstrap?.();
        if(boot){
          const albums=Array.isArray(boot.albums)?boot.albums:[];
          boot.albums=[...albums.filter(x=>String(x.id)!==String(a.id)),a];
          boot.albumPhotoCounts=Object.assign({},boot.albumPhotoCounts||{}, {[String(a.id)]:0});
        }
      }catch(_){}
      // The permissions editor has its own SPA cache, independent of the album cards.
      // Update it immediately so navigating to Admin needs no F5 or extra request.
      const permissionData=global.AppState?.getData?.('adminPermissions');
      if(permissionData&&Array.isArray(permissionData.albums)){
        permissionData.albums=[...permissionData.albums.filter(x=>String(x.id)!==String(a.id)),{id:a.id,title:a.title}];
        permissionData.permissions=[...(permissionData.permissions||[]),{userId:currentSession.userId||currentSession.user?.id,albumId:a.id,canView:true,canUpload:true,canDelete:true}];
        global.AppState?.setData?.('adminPermissions',permissionData);
      }
      global.API?.cacheRemove?.('adminPermissionsBootstrap','main');
      if(busy){busy.hidden=true;busy.style.display='';}
      modalSuccess(st,'האלבום נוצר בהצלחה');
      await feedbackPause();
      closeModal('Create');
    }catch(e){
      items=previous;lastPaintFingerprint='';paint(items);
      st.textContent='✕ '+(e.message||'לא ניתן ליצור את האלבום');st.className='album-create-status error';
      message('יצירת האלבום נכשלה','error');
    }finally{
      if(busy){busy.hidden=true;busy.style.display='';}
      btn.disabled=false;btn.removeAttribute('aria-busy');btn.textContent=old;
    }
  }
  async function saveEdit(){const a=find(editId);if(!manageable(a))return;const name=$('spaEditAlbumName'),st=$('spaEditAlbumStatus'),btn=$('spaSaveAlbumEdit'),title=String(name.value||'').trim().replace(/\s+/g,' '),description=String($('spaEditAlbumDescription').value||'').trim();if(!title){st.textContent='נא להזין שם אלבום';st.className='album-create-status error';name.focus();return;}const old=btn.textContent;btn.disabled=true;btn.textContent='שומר...';try{const r=await global.API.call('updateAlbum',{token:currentSession.token,id:editId,title,description});if(!r?.ok)throw new Error(r?.message||'לא ניתן לעדכן את האלבום');Object.assign(a,{title,description});persist();global.API.cacheRemove?.('albumView',editId);invalidate();paint(items);modalSuccess(st,'האלבום עודכן בהצלחה');await feedbackPause();closeModal('Edit');}catch(e){st.textContent=e.message||'לא ניתן לעדכן את האלבום';st.className='album-create-status error';}finally{btn.disabled=false;btn.textContent=old;}}
  async function removeAlbum(){
    const a=find(deleteId);if(!manageable(a))return;
    const id=String(deleteId),btn=$('spaConfirmAlbumDelete'),old=btn.textContent,prev=items.slice(),st=$('spaDeleteAlbumStatus');
    btn.disabled=true;btn.textContent='מוחק...';
    if(st){st.textContent='מוחק...';st.className='album-create-status loading';}
    message('מוחק את האלבום...');
    try{
      const r=await global.API.call('deleteAlbum',{token:currentSession.token,id});
      if(!r?.ok)throw new Error(r?.message||'לא ניתן למחוק את האלבום');
      const trashedPhotos=Math.max(0,Number(r?.data?.trashedPhotos)||0);
      // R17P2O22G: retain the surviving albums as the authoritative SPA snapshot.
      // Do not invalidate the Albums route: a remount during the mutation can
      // replace the live list with an empty/stale snapshot until manual refresh.
      const survivors=prev.filter(x=>String(x.id)!==id);
      lastPaintFingerprint='';paint(survivors);persist();
      writeKey(sessionListKey(),survivors);
      const counts=read(COUNTS_PREFIX)||{};delete counts[id];
      write(COUNTS_PREFIX,counts);writeKey(sessionCountsKey(),counts);
      global.API?.cacheSet?.('albums','counts',counts);
      global.API?.cacheRemove?.('albumView',id);
      global.AppStateSync?.invalidatePhotoViews?.(id);
      try{
        const boot=global.AppState?.getBootstrap?.();
        if(boot){
          if(Array.isArray(boot.albums))boot.albums=boot.albums.filter(x=>String(x?.id)!==id);
          if(boot.albumPhotoCounts&&typeof boot.albumPhotoCounts==='object')delete boot.albumPhotoCounts[id];
        }
      }catch(_){}
      global.AppDataSync?.commitDashboardDelta?.({albums:-1,photos:-trashedPhotos});
      // Trash and dashboard may refresh independently; Albums is already updated.
      global.AppDataSync?.afterMutation?.({trash:true,dashboard:true,albums:false});
      if(st){st.textContent='✓ האלבום נמחק בהצלחה';st.className='album-create-status success';}
      invalidate();message('האלבום נמחק','success');
      await feedbackPause();
      closeModal('Delete');
    }catch(e){
      lastPaintFingerprint='';paint(prev);persist();
      if(st){st.textContent='✕ '+(e.message||'לא ניתן למחוק את האלבום');st.className='album-create-status error';}
      message(e.message||'לא ניתן למחוק את האלבום','error');
    }finally{btn.disabled=false;btn.textContent=old;}
  }

  function rememberCover(id,patch){try{const key=COVER_PREFIX+uid(),all=JSON.parse(sessionStorage.getItem(key)||'{}');all[String(id)]={ts:Date.now(),expiresAt:Date.now()+20000,patch:Object.assign({},patch)};sessionStorage.setItem(key,JSON.stringify(all));}catch(_){}}
  function patchCover(id,patch){const a=find(id);if(a)Object.assign(a,patch);rememberCover(id,patch);persist();paint(items);global.API.cacheRemove?.('albumView',id);}
  async function openCover(id){const a=find(id);if(!manageable(a))return;coverId=String(id);$('spaAlbumCoverTitle').textContent='תמונת מעטפת — '+String(a.title||'אלבום');$('spaOwnerCoverFile').value='';$('spaOwnerCoverStatus').textContent='';openModal('Cover');const grid=$('spaOwnerCoverGrid');grid.innerHTML='<div class="loading spa-view-loading">טוען תמונות...</div>';try{const r=await global.API.call('photos',{token:currentSession.token,albumId:coverId});if(!r?.ok)throw new Error(r?.message||'לא ניתן לטעון תמונות');const photos=Array.isArray(r.data)?r.data:[];grid.innerHTML=photos.length?photos.map(p=>{const src=String(p.imageUrl||'');return `<button type="button" class="owner-cover-photo" data-spa-cover-photo="${esc(p.id)}">${src?`<img src="${esc(src)}" alt="${esc(p.photoTitle||p.fileName||'תמונה')}">`:'<span>אין תצוגה</span>'}<b>${esc(p.photoTitle||p.fileName||'תמונה')}</b></button>`;}).join(''):'<div class="empty-state">אין תמונות באלבום. אפשר להעלות מעטפת מהמחשב.</div>';}catch(e){grid.innerHTML='<div class="error">'+esc(e.message||'שגיאה')+'</div>';}}
  async function chooseCover(photoId){if(!coverId||!manageable(find(coverId)))return;const st=$('spaOwnerCoverStatus');st.textContent='שומר...';st.className='album-create-status loading';try{const r=await global.API.call('setAlbumCover',{token:currentSession.token,albumId:coverId,photoId});if(!r?.ok)throw new Error(r?.message||'שמירת המעטפת נכשלה');patchCover(coverId,{coverUrl:r.data?.coverUrl||'',coverPhotoId:photoId,coverSource:'album',coverExternalId:''});modalSuccess(st,'תמונת המעטפת עודכנה בהצלחה');await feedbackPause();closeModal('Cover');}catch(e){st.textContent='✕ '+(e.message||'שגיאה');st.className='album-create-status error';}}
  function base64(file){return new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result||'').split(',')[1]||'');fr.onerror=()=>no(fr.error||new Error('קריאת הקובץ נכשלה'));fr.readAsDataURL(file);});}
  async function uploadCover(){const file=$('spaOwnerCoverFile').files?.[0],st=$('spaOwnerCoverStatus'),btn=$('spaUploadOwnerCover');if(!coverId||!manageable(find(coverId)))return;if(!file||!String(file.type||'').startsWith('image/')){st.textContent='יש לבחור קובץ תמונה';return;}const id=coverId,old=btn.textContent;btn.disabled=true;btn.textContent='שומר...';st.textContent='שומר...';st.className='album-create-status loading';try{const b64=await base64(file);const r=await global.API.call('uploadAndSetAlbumCover',{token:currentSession.token,albumId:id,fileName:file.name,mimeType:file.type||'image/jpeg',base64:b64});if(!r?.ok)throw new Error(r?.message||'העלאת המעטפת נכשלה');patchCover(id,{coverUrl:r.data?.coverUrl||r.data?.imageUrl||'',coverPhotoId:'',coverSource:'external',coverExternalId:r.data?.coverId||r.data?.id||''});modalSuccess(st,'תמונת המעטפת עודכנה בהצלחה');await feedbackPause();closeModal('Cover');}catch(e){st.textContent='✕ '+(e.message||'שגיאה');st.className='album-create-status error';}finally{btn.disabled=false;btn.textContent=old;}}
  async function clearCover(){if(!coverId||!manageable(find(coverId)))return;const id=coverId,st=$('spaOwnerCoverStatus');st.textContent='מסיר...';st.className='album-create-status loading';try{const r=await global.API.call('clearAlbumCover',{token:currentSession.token,albumId:id});if(!r?.ok)throw new Error(r?.message||'לא ניתן להסיר מעטפת');patchCover(id,{coverUrl:'',coverPhotoId:'',coverSource:'',coverExternalId:''});modalSuccess(st,'תמונת המעטפת הוסרה בהצלחה');await feedbackPause();closeModal('Cover');}catch(e){st.textContent='✕ '+(e.message||'שגיאה');st.className='album-create-status error';}}
  function wire(){const page=document.querySelector('.spa-albums-page')?.parentElement||document;$('spaCreateAlbumBtn')?.addEventListener('click',()=>{ $('spaCreateAlbumName').value='';$('spaCreateAlbumDescription').value='';$('spaCreateAlbumStatus').textContent='';openModal('Create');setTimeout(()=>$('spaCreateAlbumName')?.focus(),0);});$('spaSaveAlbumCreate')?.addEventListener('click',createAlbum);$('spaSaveAlbumEdit')?.addEventListener('click',saveEdit);$('spaConfirmAlbumDelete')?.addEventListener('click',removeAlbum);$('spaUploadOwnerCover')?.addEventListener('click',uploadCover);$('spaClearOwnerCover')?.addEventListener('click',clearCover);page.addEventListener('click',e=>{const edit=e.target.closest('[data-spa-edit]'),del=e.target.closest('[data-spa-delete]'),cov=e.target.closest('[data-spa-cover]'),photo=e.target.closest('[data-spa-cover-photo]'),close=e.target.closest('[data-spa-close]');if(edit){e.preventDefault();editId=edit.dataset.spaEdit;const a=find(editId);if(manageable(a)){$('spaEditAlbumName').value=a.title||'';$('spaEditAlbumDescription').value=a.description||'';$('spaEditAlbumStatus').textContent='';openModal('Edit');}}else if(del){e.preventDefault();deleteId=del.dataset.spaDelete;const a=find(deleteId);if(manageable(a)){const n=Math.max(0,Number(a.photoCount)||0);$('spaDeleteAlbumName').textContent=a.title||'אלבום';const warning=$('spaDeleteAlbumWarning'),confirmBtn=$('spaConfirmAlbumDelete');if(warning)warning.textContent=n>0?`⚠️ האלבום מכיל ${n} תמונות. מחיקת האלבום תעביר את כל התמונות לסל המחזור. האם למחוק את האלבום בכל זאת?`:'האלבום ריק ויוסר מרשימת האלבומים.';if(confirmBtn)confirmBtn.textContent=n>0?'מחק בכל זאת':'כן, מחק';openModal('Delete');}}else if(cov){e.preventDefault();openCover(cov.dataset.spaCover);}else if(photo){e.preventDefault();chooseCover(photo.dataset.spaCoverPhoto);}else if(close){e.preventDefault();closeModal(close.dataset.spaClose.charAt(0).toUpperCase()+close.dataset.spaClose.slice(1));}});}
  async function mount(outlet, routeContext){
    const active=()=>!routeContext || routeContext.isActive();
    let first=null;
    try{
      currentSession=session();
      if(!currentSession?.user||!currentSession?.token){
        location.href='index.html?autoLogin=1&loginRequired=1&return='+encodeURIComponent('index.html#/albums');
        return;
      }
      global.AppState?.setSession(currentSession);
      outlet.innerHTML=template();
      wire();
      const status=$('spaAlbumsStatus');

      // R17J1: warm navigation is allowed only from a validated album-array snapshot.
      // Any malformed/stale AppState value is ignored instead of being allowed to
      // reject the route before the API error handler is installed.
      const bootWarm=global.AppState?.getBootstrap?.()||null;
      const warm=global.AppState?.getData?.('albums')||(Array.isArray(bootWarm?.albums)?mergeCounts(bootWarm.albums,bootWarm.albumPhotoCounts||{}):null);
      first=Array.isArray(warm)?applyPendingCovers(clean(warm)):null;
      if(first){
        items=first;
        paint(items);
        if(status)status.textContent='';
        // R17K9: albums are Session data. A warm snapshot is authoritative for
        // navigation and must not start another cold/bootstrap request.
        return;
      }else if(status){
        status.textContent='טוען אלבומים...';
        status.className='albums-load-status loading';
      }

      // R17K: Dashboard and Albums share one cold bootstrap. If Dashboard already
      // loaded it in this SPA session, Albums is a true warm navigation: no request.
      let boot=bootWarm;
      if(!boot){
        boot=await global.SessionDataStore.ensureBootstrap();
        if(!active())return;
      }
      const counts=boot.albumPhotoCounts&&typeof boot.albumPhotoCounts==='object'?boot.albumPhotoCounts:{};
      const rawAlbums=Array.isArray(boot.albums)?boot.albums:[];
      const list=applyPendingCovers(mergeCounts(clean(rawAlbums),counts));
      const changed=!first||fingerprint(first)!==fingerprint(list);
      items=list;
      persist();
      writeKey(sessionListKey(),clean(rawAlbums));
      writeKey(sessionCountsKey(),counts);
      global.API.cacheSet('albums','counts',counts);write(COUNTS_PREFIX,counts);
      if(changed)paint(list);
      if(status){status.textContent='';status.className='albums-load-status ok';}
    }catch(e){
      if(!active())return;
      console.error('SPA albums:',e);
      // R17J1: never let an Albums exception escape to the router's generic
      // "אירעה שגיאה" screen. Preserve a warm snapshot when one exists.
      const status=$('spaAlbumsStatus');
      if(status){
        status.className='albums-load-status '+(first?'ok':'error');
        status.textContent=first?'':(e?.message||'לא ניתן לטעון אלבומים');
      }else if(!first){
        outlet.innerHTML='<section class="card"><h2>אלבומים</h2><p class="error">'+esc(e?.message||'לא ניתן לטעון אלבומים')+'</p></section>';
      }
    }
  }
  // R17P2O22U: make a restored album authoritative in every Albums snapshot.
  // Trash and Albums are keep-alive SPA views; updating AppState alone is not
  // enough because Albums can keep its module-local `items` array and persisted
  // session snapshot from before the deletion.
  function upsertRestoredAlbum(album,photoCount){
    if(!album||!album.id)return;
    currentSession=session()||currentSession;
    const id=String(album.id),count=Math.max(0,Number(photoCount)||0);
    const restored=Object.assign({},album,{active:true,deletedAt:'',deletedBy:'',photoCount:count});
    // R17P2O22W: owner-safe fallback for older/partially cached restore responses.
    // The backend now returns these flags, but deriving them for the creator keeps
    // the SPA card complete immediately even if a stale frontend response is used.
    const s=currentSession||session();
    if(String(restored.createdBy||'')===String(s?.userId||'')){
      restored.isOwner=true;
      if(restored.canUpload==null)restored.canUpload=true;
      if(restored.canManage==null)restored.canManage=true;
    }
    const state=global.AppState?.getData?.('albums');
    const base=Array.isArray(state)?clean(state):(Array.isArray(items)?clean(items):[]);
    const next=base.slice(),pos=next.findIndex(a=>String(a?.id)===id);
    if(pos>=0)next[pos]=Object.assign({},next[pos],restored);else next.push(restored);
    items=next;
    global.API?.cacheSet?.('albums','list',next);
    global.AppState?.setData?.('albums',next);
    write(LIST_PREFIX,next);
    writeKey(sessionListKey(),next);
    let counts=global.API?.cacheGet?.('albums','counts',21600000);
    counts=Object.assign({},counts&&typeof counts==='object'?counts:{});counts[id]=count;
    global.API?.cacheSet?.('albums','counts',counts);
    write(COUNTS_PREFIX,counts);
    writeKey(sessionCountsKey(),counts);
    const boot=global.AppState?.getBootstrap?.();
    if(boot){
      boot.albums=next.slice();
      boot.albumPhotoCounts=Object.assign({},boot.albumPhotoCounts||{},counts);
    }
    lastPaintFingerprint='';
    if(document.getElementById('spaAlbumsGrid'))paint(next);
  }
  global.SPAAlbums={mount,upsertRestoredAlbum};
})(window);
