(function(global){
  const PERSIST='FPA_ALBUM_VIEW_PERSIST_V1_';
  const STEP=60;
  let photos=[], filtered=[], index=0, limit=STEP, session=null, albumId='', albumMeta={}, cleanup=[], slideTimer=null, editIndex=-1, returnToAlbumsAfterUpload=false, selectedUploadFiles=[], uploadTargetAlbumId='';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const photoTitle=p=>String(p?.photoTitle||p?.caption||p?.fileName||'ללא כותרת').trim();
  const albumTitle=p=>String(p?.albumTitle||'').trim();
  const year=v=>{const m=String(v||'').match(/\b(18|19|20|21)\d{2}\b/);return m?m[0]:'';};
  const caption=p=>`${albumTitle(p)||'ללא אלבום'}${year(p?.photoDate)?' • '+year(p.photoDate):''}`;
  const uid=s=>String(s?.user?.id||s?.user?.email||'anon').trim().toLowerCase();
  function readPersist(id){try{const x=JSON.parse(localStorage.getItem(PERSIST+uid(session)+'|'+id)||'null');return x?.value||null;}catch(_){return null;}}
  function writePersist(id,v){try{localStorage.setItem(PERSIST+uid(session)+'|'+id,JSON.stringify({ts:Date.now(),value:v}));}catch(_){}}
  function template(){return `<section class="section spa-photo-page"><div class="heading"><div><span class="eyebrow">אלבום · SPA</span><h1 id="spaAlbumTitle">טוען...</h1><p id="spaAlbumDesc"></p></div><div class="spa-photo-heading-actions"><button class="btn" id="spaUpload" type="button" hidden>📤 העלאת תמונות</button><button id="spaSlide" class="btn spa-slide-btn" type="button"><span class="spa-slide-launch-icon" aria-hidden="true">▶</span><span>מצגת</span></button></div></div>
    <div id="spaPhotoTools" class="photo-tools"><input id="spaSearchTitle" type="search" placeholder="🔎 חיפוש לפי כותרת..."><input id="spaSearchAlbum" type="search" placeholder="📁 חיפוש לפי שם אלבום..."><input id="spaYearFrom" type="number" min="1800" max="2200" placeholder="משנה"><input id="spaYearTo" type="number" min="1800" max="2200" placeholder="עד שנה"><select id="spaSort"><option value="newest">חדשים ← ישנים</option><option value="oldest">ישנים ← חדשים</option></select><button id="spaClear" class="pill" type="button">נקה</button><span id="spaGalleryPhotoCount" class="hint"></span><span id="spaYearRangeError" class="photo-filter-error" role="alert"></span></div>
    <div id="spaPhotoStatus" class="gallery-sync-status" role="status" aria-live="polite"></div><div id="spaPhotoRecordStatus" class="api-status-line spa-photo-record-status" role="status" aria-live="polite">סה״כ רשומות: 0</div><div id="spaGallery" class="gallery"><p class="spa-view-loading">טוען תמונות...</p></div></section>
    <div id="spaViewer" class="viewer spa-viewer" aria-hidden="true"><button id="spaPrev" type="button" aria-label="הקודם"><svg class="viewer-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button><img id="spaBig" alt=""><button id="spaNext" type="button" aria-label="הבא"><svg class="viewer-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div id="spaCaption"></div><button id="spaSlideToggle" class="viewer-slide-toggle" type="button" aria-label="השהה מצגת" hidden>⏸</button><div id="spaDots" class="viewer-dots"></div></div><button id="spaClose" class="viewer-close-global spa-close" type="button" aria-label="סגור" hidden>×</button>
    <div id="spaUploadModal" class="photo-upload-modal" aria-hidden="true"><div class="photo-upload-card" role="dialog" aria-modal="true"><h2>העלאת תמונות</h2><p class="upload-hint">שדות המסומנים <span class="required-star">*</span> הם שדות חובה לכל תמונה.</p><label id="spaUploadAlbumWrap" class="photo-upload-album" hidden>אלבום יעד <span class="required-star">*</span><select id="spaUploadAlbum"></select></label><div id="spaUploadFileGate" class="photo-upload-file-gate"><input id="spaUploadFiles" class="photo-upload-file" type="file" accept="image/*" multiple></div><div id="spaUploadMeta" class="photo-upload-meta"></div><div id="spaUploadSummary" class="photo-upload-summary"></div><div class="photo-upload-actions"><button id="spaUploadCancel" class="photo-upload-cancel" type="button">ביטול</button><button id="spaUploadSubmit" class="photo-upload-submit" type="button">העלה</button></div></div></div>
    <div id="spaEditModal" class="photo-edit-modal" aria-hidden="true"><div class="photo-edit-card" role="dialog" aria-modal="true"><h2>עריכת תמונה</h2><label>כותרת <span class="required-star">*</span> <input id="spaEditTitle" type="text" required></label><label>שנה <span class="required-star">*</span> <input id="spaEditYear" type="number" min="1800" max="2200" required></label><label>אלבום <span class="required-star">*</span> <select id="spaEditAlbum" required></select></label><div id="spaEditMessage" class="photo-edit-message" role="alert"></div><div class="photo-edit-actions"><button id="spaEditCancel" class="photo-edit-cancel" type="button">ביטול</button><button id="spaEditSave" class="photo-edit-save" type="button">שמור</button></div></div></div>`;}
  function setHeader(album){albumMeta=album||{};$('spaAlbumTitle').textContent=albumId==='__ALL__'?'כל התמונות':`תמונות באלבום: ${album?.title||'אלבום'}`;$('spaAlbumDesc').textContent=album?.description||(albumId==='__ALL__'?'כל התמונות מכל האלבומים שיש לך הרשאת צפייה בהם':'');const up=$('spaUpload');if(up){const allowed=albumId==='__ALL__'?uploadableAlbums().length>0:!!album?.canUpload;up.hidden=!allowed;}}
  function uploadableAlbums(){const list=global.AppState?.getData?.('albums')||global.AppState?.getBootstrap?.()?.albums||[];return (Array.isArray(list)?list:[]).filter(a=>a&&String(a.id)!=='__ALL__'&&a.canUpload);}
  function selectedUploadAlbum(){return uploadTargetAlbumId||albumId;}
  function apply(){const q=$('spaSearchTitle').value.trim().toLowerCase(),a=$('spaSearchAlbum').value.trim().toLowerCase(),yf=$('spaYearFrom').value.trim(),yt=$('spaYearTo').value.trim();const rangeError=$('spaYearRangeError');if(rangeError)rangeError.textContent='';if(/^\d{4}$/.test(yf)&&/^\d{4}$/.test(yt)&&+yt<+yf){if(rangeError)rangeError.textContent="טווח השנים אינו תקין: השנה 'עד שנה' חייבת להיות שווה או מאוחרת מהשנה 'משנה'.";filtered=[];render();return;}filtered=photos.filter(p=>{const py=+year(p.photoDate)||0;return(!q||photoTitle(p).toLowerCase().includes(q))&&(!a||albumTitle(p).toLowerCase().includes(a))&&(!yf||py>=+yf)&&(!yt||py<=+yt);});filtered.sort((x,y)=>{const a=+year(x.photoDate)||0,b=+year(y.photoDate)||0;return $('spaSort').value==='oldest'?a-b:b-a;});limit=STEP;render();}
  function render(){const g=$('spaGallery');if(!g)return;$('spaGalleryPhotoCount').textContent=`${filtered.length} מתוך ${photos.length} תמונות`;const rs=$('spaPhotoRecordStatus');if(rs)rs.textContent=filtered.length===photos.length?`סה״כ רשומות: ${photos.length}`:`סה״כ רשומות: ${filtered.length} מתוך ${photos.length}`;const html=filtered.slice(0,limit).map((p,n)=>`<figure class="photo-card"><div class="photo-wrap"><img src="${esc(p.thumbnailUrl||p.imageUrl||'')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${esc(photoTitle(p))}" data-open="${n}"><button class="favorite-btn ${p.isFavorite?'active':''}" type="button" data-fav="${n}" aria-label="${p.isFavorite?'הסר ממועדפים':'הוסף למועדפים'}">${p.isFavorite?'♥':'♡'}</button>${p.canDelete?`<div class="spa-photo-actions"><button type="button" data-edit="${n}" title="עריכת תמונה">✎</button><button type="button" data-del="${n}" title="מחיקת תמונה">🗑️</button></div>`:''}</div><figcaption><strong>${esc(photoTitle(p))}</strong><small>📁 ${esc(caption(p))}</small></figcaption></figure>`).join('');g.innerHTML=html+(limit<filtered.length?`<div class="gallery-more"><button id="spaMore" class="pill">טען עוד ${Math.min(STEP,filtered.length-limit)} תמונות</button></div>`:'')||'<p>לא נמצאו תמונות התואמות לחיפוש.</p>';g.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>open(+el.dataset.open));g.querySelectorAll('[data-fav]').forEach(el=>el.onclick=e=>{e.stopPropagation();toggleFav(+el.dataset.fav,el);});g.querySelectorAll('[data-edit]').forEach(el=>el.onclick=e=>{e.stopPropagation();openEdit(+el.dataset.edit);});g.querySelectorAll('[data-del]').forEach(el=>el.onclick=e=>{e.stopPropagation();deletePhoto(+el.dataset.del,el);});$('spaMore')&&($('spaMore').onclick=()=>{limit+=STEP;render();});}
  function dots(){const d=$('spaDots');d.innerHTML=filtered.map((_,n)=>`<button class="viewer-dot ${n===index?'active':''}" data-dot="${n}" aria-label="תמונה ${n+1}"></button>`).join('');d.querySelectorAll('[data-dot]').forEach(b=>b.onclick=()=>open(+b.dataset.dot));d.querySelector('.active')?.scrollIntoView({block:'nearest',inline:'center'});}
  function open(n){if(!filtered.length)return;index=(n+filtered.length)%filtered.length;const p=filtered[index];$('spaBig').src=p.imageUrl||p.thumbnailUrl||'';$('spaBig').alt=photoTitle(p);/* R17P2O21: preserve the live Pause/Play node before rebuilding caption. O20 appended it inside spaCaption, so the next slide's innerHTML replacement destroyed the control. */const toggle=$('spaSlideToggle');if(toggle&&toggle.parentElement!==$('spaViewer'))$('spaViewer').appendChild(toggle);$('spaCaption').innerHTML=`<strong>${esc(photoTitle(p))}</strong><small class="viewer-album-line"><span>📁 ${esc(caption(p))}</span></small>`;const albumLine=$('spaCaption').querySelector('.viewer-album-line');if(toggle&&albumLine)albumLine.appendChild(toggle);$('spaViewer').classList.add('open');$('spaViewer').setAttribute('aria-hidden','false');$('spaClose').hidden=false;$('spaClose').classList.add('is-visible');document.body.classList.add('viewer-open');dots();}
  function close(){if(slideTimer){clearInterval(slideTimer);slideTimer=null;} $('spaViewer')?.classList.remove('open');$('spaViewer')?.setAttribute('aria-hidden','true');if($('spaClose')){$('spaClose').hidden=true;$('spaClose').classList.remove('is-visible');}document.body.classList.remove('viewer-open');}
  function move(d){open(index+d);}
  async function toggleFav(n,btn){const p=filtered[n];if(!p)return;const old=!!p.isFavorite,desired=!old;p.isFavorite=desired;btn.textContent=desired?'♥':'♡';btn.classList.toggle('active',desired);btn.setAttribute('aria-label',desired?'הסר ממועדפים':'הוסף למועדפים');/* R17P2O16 optimistic favorite state: Favorites + Dashboard update immediately. */global.AppDataSync?.syncFavorite?.(p,desired);global.AppStateSync?.favoriteState?.(p.id,desired,p.albumId||albumId);global.AppStateSync?.favoriteDelta?.(desired?1:-1);syncView();try{const r=await global.API.call('toggleFavorite',{token:session.token,photoId:p.id});if(!r?.ok)throw new Error(r?.message||'שגיאה');const actual=typeof r.data?.favorite==='boolean'?r.data.favorite:desired;if(actual!==desired){p.isFavorite=actual;global.AppDataSync?.syncFavorite?.(p,actual);global.AppStateSync?.favoriteState?.(p.id,actual,p.albumId||albumId);global.AppStateSync?.favoriteDelta?.(actual?1:-1);syncView();}}catch(e){p.isFavorite=old;btn.textContent=old?'♥':'♡';btn.classList.toggle('active',old);btn.setAttribute('aria-label',old?'הסר ממועדפים':'הוסף למועדפים');global.AppDataSync?.syncFavorite?.(p,old);global.AppStateSync?.favoriteState?.(p.id,old,p.albumId||albumId);global.AppStateSync?.favoriteDelta?.(old?1:-1);syncView();console.error(e);}}

  function syncView(){const v={album:albumMeta,photos};global.API.cacheSet?.('albumView',albumId,v);writePersist(albumId,v);global.AppState?.setData('albumView',v);}
  function notify(msg,type){try{if(global.toast)return global.toast(msg,type);}catch(_){} const st=$('spaPhotoStatus');if(st){st.textContent=msg;st.className='gallery-sync-status show '+(type||'');setTimeout(()=>{if(st.textContent===msg){st.textContent='';st.className='gallery-sync-status';}},2600);}}
  function confirmUi(msg,opts){return global.uiConfirm?global.uiConfirm(msg,opts):Promise.resolve(confirm(msg));}
  function readBase64(blob){return new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(',')[1]);f.onerror=()=>no(f.error||new Error('קריאת הקובץ נכשלה'));f.readAsDataURL(blob);});}
  function readBitmap(file){if(global.createImageBitmap)return createImageBitmap(file);return new Promise((ok,no)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);ok(img)};img.onerror=()=>{URL.revokeObjectURL(u);no(new Error('קריאת התמונה נכשלה'))};img.src=u;});}
  async function prepareImage(file){const max=2048,hard=850*1024;if(!file.type.startsWith('image/')||file.type==='image/gif')return {blob:file,fileName:file.name,mimeType:file.type||'application/octet-stream'};let img;try{img=await readBitmap(file)}catch(_){return {blob:file,fileName:file.name,mimeType:file.type||'image/jpeg'}}const w=img.width||img.naturalWidth||0,h=img.height||img.naturalHeight||0,largest=Math.max(w,h);if(!w||!h||(largest<=max&&file.size<=hard)){img.close?.();return {blob:file,fileName:file.name,mimeType:file.type||'image/jpeg'}}const sc=Math.min(1,max/largest),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*sc));c.height=Math.max(1,Math.round(h*sc));c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.close?.();const type=file.type==='image/png'?'image/png':(file.type==='image/webp'?'image/webp':'image/jpeg');const blob=await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('דחיסת התמונה נכשלה')),type,type==='image/png'?undefined:.82));let name=file.name;if(type==='image/jpeg'&&!/\.jpe?g$/i.test(name))name=name.replace(/\.[^.]+$/,'')+'.jpg';return blob.size<file.size*.97?{blob,fileName:name,mimeType:type}:{blob:file,fileName:file.name,mimeType:file.type||type};}
  function openUpload(){const all=albumId==='__ALL__', choices=uploadableAlbums();if((!all&&!albumMeta?.canUpload)||(all&&!choices.length))return;selectedUploadFiles=[];uploadTargetAlbumId=all?'':albumId;$('spaUploadFiles').value='';$('spaUploadMeta').innerHTML='';$('spaUploadSummary').textContent='';const wrap=$('spaUploadAlbumWrap'),sel=$('spaUploadAlbum');if(wrap&&sel){wrap.hidden=!all;if(all){sel.innerHTML='<option value="">נא לבחור אלבום</option>'+choices.map(a=>`<option value="${esc(a.id)}">${esc(a.title||'ללא שם')}</option>`).join('');sel.value='';const fileInput=$('spaUploadFiles');if(fileInput)fileInput.disabled=true;sel.onchange=()=>{uploadTargetAlbumId=sel.value;const valid=!!sel.value;sel.classList.toggle('is-invalid',!valid);if(fileInput)fileInput.disabled=!valid;if(valid){sel.removeAttribute('aria-invalid');if($('spaUploadSummary')?.textContent==='יש לבחור אלבום')$('spaUploadSummary').textContent='';}};}}$('spaUploadModal').classList.add('open');$('spaUploadModal').setAttribute('aria-hidden','false');if(!all)void global.API.call('prepareAlbumUpload',{token:session.token,albumId}).catch(()=>{});}
  function closeUpload(){$('spaUploadModal')?.classList.remove('open');$('spaUploadModal')?.setAttribute('aria-hidden','true');}
  function cancelUpload(){closeUpload();if(returnToAlbumsAfterUpload){global.AppRouter?.go?.('albums');}}
  function captureUploadSelection(){
    const input=$('spaUploadFiles');
    const files=Array.from(input?.files||[]);
    if(!files.length)return; // File-picker cancel must not destroy an existing selection.
    selectedUploadFiles=files.map((file,i)=>({file,title:'',year:'',key:`${file.name}|${file.size}|${file.lastModified}|${i}`}));
    renderUploadRows();
  }
  function renderUploadRows(){
    const box=$('spaUploadMeta');if(!box)return;
    box.replaceChildren();
    selectedUploadFiles.forEach((item,i)=>{const f=item.file,r=document.createElement('div');r.className='photo-upload-row';r.dataset.uploadKey=item.key;r.innerHTML=`<div class="photo-upload-name">🖼️ ${esc(f.name)}</div><label class="upload-required-field"><span class="required-star" aria-hidden="true">*</span><input class="spa-up-title" data-i="${i}" placeholder="כותרת" aria-label="כותרת - שדה חובה" required></label><label class="upload-required-field"><span class="required-star" aria-hidden="true">*</span><input class="spa-up-year" data-i="${i}" type="number" min="1800" max="2200" placeholder="שנה" aria-label="שנה - שדה חובה" required></label><button class="photo-upload-remove" type="button" data-remove-upload="${i}" title="הסר תמונה" aria-label="הסר תמונה">×</button><span class="photo-upload-status" data-up-status="${i}"></span>`;
      const title=r.querySelector('.spa-up-title'),yr=r.querySelector('.spa-up-year');title.value=item.title;yr.value=item.year;title.addEventListener('input',()=>{item.title=title.value;});yr.addEventListener('input',()=>{item.year=yr.value;});r.querySelector('[data-remove-upload]').onclick=()=>{selectedUploadFiles.splice(i,1);renderUploadRows();};box.appendChild(r);});
  }
  function upStatus(i,t,c=''){const e=document.querySelector(`[data-up-status="${i}"]`);if(e){e.textContent=t;e.className='photo-upload-status '+c;}}
  async function submitUpload(){
    const files=selectedUploadFiles.map(x=>x.file),btn=$('spaUploadSubmit'),sum=$('spaUploadSummary'),targetAlbumId=selectedUploadAlbum();
    if(albumId==='__ALL__'&&!targetAlbumId){sum.textContent='יש לבחור אלבום';$('spaUploadAlbum')?.focus();return;}
    if(!files.length){sum.textContent='יש לבחור תמונות';return;}
    const rows=selectedUploadFiles.map((x,i)=>({f:x.file,i,title:String(x.title||'').trim(),year:String(x.year||'').trim()}));
    const bad=rows.find(x=>!x.title||!/^(19|20|21)\d{2}$/.test(x.year));if(bad){const problem=!bad.title?'חובה להזין כותרת': 'יש להזין שנה תקינה בת 4 ספרות';sum.textContent=`תמונה ${bad.i+1} (${bad.f.name}): ${problem}`;document.querySelector(`.spa-up-${!bad.title?'title':'year'}[data-i=\"${bad.i}\"]`)?.focus();return;}
    btn.disabled=true;btn.textContent='מעלה...';let added=0;
    let duplicateBatchKey='', duplicateByName=new Map();
    try{
      try{
        const d=await global.API.call('checkUploadDuplicates',{token:session.token,albumId:targetAlbumId,fileNames:rows.map(x=>x.f.name)});
        duplicateBatchKey=String(d?.data?.batchKey||'');
        const items=d?.data?.items||d?.data||[];
        if(Array.isArray(items))items.forEach(item=>duplicateByName.set(String(item?.fileName||''),item));
      }catch(_){}
      for(const x of rows){
        upStatus(x.i,'מכין...','uploading');let replace='';
        const dup=duplicateByName.get(String(x.f.name));
        if(dup?.exists&&dup.photoId){const yes=await confirmUi(`הקובץ "${x.f.name}" כבר קיים. להחליף אותו?`,{title:'קובץ קיים',confirmText:'החלף',icon:'↻'});if(!yes){upStatus(x.i,'דולג — קיים','error');continue;}replace=String(dup.photoId);}
        const pr=await prepareImage(x.f);upStatus(x.i,'מעלה...','uploading');
        const base64=await readBase64(pr.blob);
        const r=await global.API.call('uploadPhoto',{token:session.token,albumId:targetAlbumId,fileName:pr.fileName,mimeType:pr.mimeType,base64,photoTitle:x.title,photoDate:x.year,caption:'',replaceExistingId:replace,duplicateBatchKey,clientUploadBytes:pr.blob.size,clientOriginalBytes:x.f.size});
        if(!r?.ok)throw new Error(r?.message||'העלאה נכשלה');
        const targetMeta=uploadableAlbums().find(a=>String(a.id)===String(targetAlbumId))||albumMeta;const row={id:String(r.data?.id||''),albumId:targetAlbumId,fileName:pr.fileName,imageUrl:String(r.data?.imageUrl||''),thumbnailUrl:String(r.data?.imageUrl||''),photoTitle:x.title,photoDate:x.year,caption:'',active:true,isFavorite:false,canDelete:!!targetMeta?.canDelete,canUpload:!!targetMeta?.canUpload,albumTitle:targetMeta?.title||''};const pos=photos.findIndex(p=>String(p.id)===row.id);if(pos>=0)photos[pos]={...photos[pos],...row};else photos.push(row);global.AppDataSync?.upsertPhotoInAll?.(row);if(!r.data?.replaced)added++;upStatus(x.i,'✓ הועלה','done');
      }
      if(added){global.AppStateSync?.photoDelta?.(targetAlbumId,added);global.AppDataSync?.afterMutation?.({dashboard:false,albums:false});}syncView();apply();closeUpload();notify('התמונות הועלו בהצלחה','success');if(returnToAlbumsAfterUpload){global.AppRouter?.invalidate?.('albums');global.AppRouter?.go?.('albums');}void global.API.call('flushUploadPhotos',{token:session.token}).then(()=>global.AppDataSync?.afterMutation?.({dashboard:true,albums:false})).catch(()=>{});
    }catch(e){sum.textContent='✕ '+(e?.message||'ההעלאה נכשלה');}finally{btn.disabled=false;btn.textContent='העלה';}
  }

  async function openEdit(n){const p=filtered[n];if(!p?.canDelete)return;editIndex=n;$('spaEditTitle').value=photoTitle(p);$('spaEditYear').value=year(p.photoDate);$('spaEditMessage').textContent='';$('spaEditModal').classList.add('open');$('spaEditModal').setAttribute('aria-hidden','false');const sel=$('spaEditAlbum');sel.disabled=true;sel.innerHTML='<option>טוען...</option>';try{const r=await global.API.call('photoEditAlbums',{token:session.token,sourceAlbumId:String(p.albumId||albumId)});if(!r?.ok)throw new Error(r?.message||'שגיאה');let items=Array.isArray(r.data)?r.data:[];const sourceId=String(p.albumId||albumId);items=items.filter(x=>String(x.id)!==sourceId);sel.innerHTML=`<option value="${esc(sourceId)}" selected hidden>${esc(p.albumTitle||albumMeta?.title||'אלבום נוכחי')}</option>`+items.map(x=>`<option value="${esc(x.id)}">${esc(x.title||'ללא שם')}</option>`).join('');sel.value=sourceId;}catch(e){sel.innerHTML=`<option value="${esc(p.albumId||albumId)}">${esc(p.albumTitle||albumMeta?.title||'אלבום נוכחי')}</option>`;}sel.disabled=false;}
  function closeEdit(){$('spaEditModal')?.classList.remove('open');$('spaEditModal')?.setAttribute('aria-hidden','true');editIndex=-1;}
  async function saveEdit(){const p=filtered[editIndex];if(!p)return;const title=$('spaEditTitle').value.trim(),yr=$('spaEditYear').value.trim(),target=$('spaEditAlbum').value,btn=$('spaEditSave');if(!title){$('spaEditMessage').textContent='נא להזין כותרת';return;}if(!/^\d{4}$/.test(yr)||+yr<1800||+yr>2200){$('spaEditMessage').textContent='נא להזין שנה תקינה';return;}const source=String(p.albumId||albumId),moved=target!==source,targetTitle=$('spaEditAlbum').selectedOptions[0]?.text||'';btn.disabled=true;btn.textContent='שומר...';try{const r=await global.API.call('updatePhoto',{token:session.token,id:p.id,photoTitle:title,photoDate:yr,albumId:target});if(!r?.ok)throw new Error(r?.message||'שגיאה');if(moved&&albumId!=='__ALL__')photos=photos.filter(x=>String(x.id)!==String(p.id));else{const q=photos.find(x=>String(x.id)===String(p.id));if(q){q.photoTitle=title;q.photoDate=yr;q.albumId=target;q.albumTitle=targetTitle;}}if(moved)global.AppStateSync?.photoMove?.(source,target);const updated=Object.assign({},p,{photoTitle:title,photoDate:yr,albumId:target,albumTitle:targetTitle});if(moved)global.AppDataSync?.movePhotoEverywhere?.(updated,source,target);else global.AppDataSync?.patchPhotoEverywhere?.(updated);syncView();closeEdit();apply();notify(moved?'התמונה עודכנה והועברה':'פרטי התמונה עודכנו','success');if(moved){global.AppRouter?.invalidate?.('albums');global.AppRouter?.go?.('albums');}}catch(e){const m=/כבר קיי|already exists/i.test(String(e?.message))?'התמונה כבר קיימת באלבום שנבחר. לא בוצעה העברה.':String(e?.message||'לא ניתן לעדכן');$('spaEditMessage').textContent=m;}finally{btn.disabled=false;btn.textContent='שמור';}}
  async function deletePhoto(n,btn){
    const p=filtered[n];if(!p?.canDelete)return;
    const aid=String(p.albumId||albumId);
    let deleteResult=null;
    const yes=await confirmUi('למחוק את התמונה? התמונה תוסר מהאלבום וגם מהמועדפים.',{
      title:'מחיקת תמונה',confirmText:'מחק',cancelText:'ביטול',danger:true,icon:'🗑',busyText:'מוחק...',
      onConfirm:async()=>{const r=await global.API.call('deletePhoto',{token:session.token,id:p.id});if(!r?.ok)throw new Error(r?.message||'לא ניתן למחוק');deleteResult=r;}
    });
    if(!yes||!deleteResult)return;
    // Commit the client state only after the server has confirmed the delete.
    photos=photos.filter(x=>String(x.id)!==String(p.id));
    global.AppDataSync?.removePhotoFromAll?.(p.id);
    global.AppDataSync?.removePhotoEverywhere?.(p.id,aid);
    global.AppStateSync?.photoDelta?.(aid,-1);
    if(p.isFavorite)global.AppStateSync?.favoriteDelta?.(-1);
    // R17P2O13: mutate the warm Trash cache immediately; no visible reload on next entry.
    global.AppDataSync?.addTrashItem?.(Object.assign({},p,{albumId:aid}));
    global.AppDataSync?.afterMutation?.({trash:false,dashboard:true,albums:false});
    syncView();apply();
    notify('התמונה נמחקה','success');
    global.AppRouter?.invalidate?.('albums');
  }

  async function loadAll(){let out=[],cursor=0,done=false;while(!done){const r=await global.API.call('photosAllPage',{token:session.token,cursor,pageSize:80});if(!r?.ok)throw new Error(r?.message||'לא ניתן לטעון תמונות');out.push(...(r.data?.items||[]));cursor=+r.data?.nextCursor||0;done=!!r.data?.done;}return {album:{id:'__ALL__',title:'כל התמונות',isVirtual:true,canUpload:false},photos:out};}
  async function mount(outlet,params){cleanup=[];document.body.classList.remove('viewer-open');session=global.SessionManager?.getSession?.()||global.getSession?.();albumId=String(params?.id||'').trim();if(!session?.token){location.href='index.html?autoLogin=1&loginRequired=1&return='+encodeURIComponent('index.html#/album?id='+albumId);return;}if(!albumId){global.AppRouter.go('albums');return;}outlet.innerHTML=template();photos=[];filtered=[];
    // R17P2C: bind upload selection before any awaited album/API work. The upload modal can
    // open from cached album data immediately, so late binding created an intermittent race:
    // the browser showed the native file name while metadata rows had no listener yet.
    const uploadInput=$('spaUploadFiles');
    const onUploadSelection=()=>captureUploadSelection();
    const onUploadPickerOpen=e=>{
      // R17P2O19: in All Photos, an album must be selected BEFORE opening the native file picker.
      if(albumId==='__ALL__'&&!selectedUploadAlbum()){
        e.preventDefault();
        const sum=$('spaUploadSummary'),sel=$('spaUploadAlbum');
        if(sum)sum.textContent='יש לבחור אלבום';
        if(sel){sel.classList.add('is-invalid');sel.setAttribute('aria-invalid','true');sel.focus();}
        return;
      }
      const sum=$('spaUploadSummary'),sel=$('spaUploadAlbum');
      if(sum&&sum.textContent==='יש לבחור אלבום')sum.textContent='';
      if(sel){sel.classList.remove('is-invalid');sel.removeAttribute('aria-invalid');}
      uploadInput.value=''; // allow selecting the same file again
    };
    const uploadGate=$('spaUploadFileGate');
    const onUploadGateClick=e=>{
      if(albumId==='__ALL__'&&!selectedUploadAlbum()){
        e.preventDefault();e.stopPropagation();
        const sum=$('spaUploadSummary'),sel=$('spaUploadAlbum');
        if(sum)sum.textContent='יש לבחור אלבום';
        if(sel){sel.classList.add('is-invalid');sel.setAttribute('aria-invalid','true');sel.focus();}
      }
    };
    uploadGate?.addEventListener('click',onUploadGateClick,true);
    uploadInput.addEventListener('click',onUploadPickerOpen);
    uploadInput.addEventListener('change',onUploadSelection);
    cleanup.push(()=>{uploadGate?.removeEventListener('click',onUploadGateClick,true);uploadInput.removeEventListener('click',onUploadPickerOpen);uploadInput.removeEventListener('change',onUploadSelection);});
    // R17P2D: bind upload-modal controls before any awaited album/API work.
    // The modal may be opened immediately from cached album data; binding Cancel later
    // made the first click a no-op while albumView was still loading.
    const uploadCancel=$('spaUploadCancel'), uploadSubmit=$('spaUploadSubmit'), uploadModal=$('spaUploadModal');
    uploadCancel.onclick=cancelUpload;
    uploadSubmit.onclick=submitUpload;
    uploadModal.onclick=e=>{if(e.target===uploadModal)closeUpload();};
    // R17L5B: when upload was requested from the Albums card, resolve permission
    // from the already-loaded session album list and open the upload dialog immediately.
    // Do not wait for the slower albumView request and briefly show the search/gallery screen.
    const wantsUpload=String(params?.upload||'')==='1'&&albumId!=='__ALL__';
    returnToAlbumsAfterUpload=wantsUpload;
    let uploadOpened=false;
    if(wantsUpload){
      try{
        const knownAlbums=global.AppState?.getData?.('albums')||global.AppState?.getBootstrap?.()?.albums||[];
        const known=Array.isArray(knownAlbums)?knownAlbums.find(a=>String(a.id)===albumId):null;
        const isAdmin=String(session?.user?.role||'').toUpperCase()==='ADMIN';
        if(known||isAdmin){
          setHeader(Object.assign({},known||{id:albumId,title:'אלבום'}, {canUpload:isAdmin||known?.canUpload===true}));
          if(albumMeta?.canUpload){openUpload();uploadOpened=true;}
        }
      }catch(_){}
    }
    const cached=global.API.cacheGet?.('albumView',albumId,21600000);if(cached){setHeader(cached.album||{});photos=Array.isArray(cached.photos)?cached.photos:[];if(albumId!=='__ALL__')photos=photos.filter(p=>String(p?.albumId||'')===albumId);apply();global.AppState?.setData('albumView',cached);if(wantsUpload&&!uploadOpened&&albumMeta?.canUpload){openUpload();uploadOpened=true;}}else try{const r=albumId==='__ALL__'?{ok:true,data:await loadAll()}:await global.API.call('albumView',{albumId,token:session.token},'GET');if(!r?.ok)throw new Error(r?.message||'לא ניתן לטעון אלבום');setHeader(r.data?.album||{});photos=Array.isArray(r.data?.photos)?r.data.photos:[];if(albumId!=='__ALL__')photos=photos.filter(p=>String(p?.albumId||'')===albumId);r.data.photos=photos;global.API.cacheSet?.('albumView',albumId,r.data);writePersist(albumId,r.data);apply();global.AppState?.setData('albumView',r.data);}catch(e){if(!photos.length)$('spaGallery').innerHTML=`<div class="load-error"><strong>לא ניתן לטעון את התמונות</strong><p>${esc(e.message||e)}</p></div>`;console.error(e);}
    ['spaSearchTitle','spaSearchAlbum','spaYearFrom','spaYearTo'].forEach(id=>{const el=$(id);el.addEventListener('input',apply);cleanup.push(()=>el.removeEventListener('input',apply));});$('spaSort').onchange=apply;$('spaClear').onclick=()=>{['spaSearchTitle','spaSearchAlbum','spaYearFrom','spaYearTo'].forEach(id=>$(id).value='');$('spaSort').value='newest';apply();};$('spaUpload').onclick=openUpload;$('spaEditCancel').onclick=closeEdit;$('spaEditSave').onclick=saveEdit;$('spaEditModal').onclick=e=>{if(e.target===$('spaEditModal'))closeEdit();};$('spaPrev').onclick=()=>move(-1);$('spaNext').onclick=()=>move(1);$('spaClose').onclick=close;const startSlide=()=>{if(slideTimer)clearInterval(slideTimer);slideTimer=setInterval(()=>{if(!$('spaViewer')?.classList.contains('open'))close();else move(1);},2800);};$('spaSlide').onclick=()=>{if(!filtered.length)return;open(0);const st=$('spaSlideToggle');if(st){st.hidden=false;st.textContent='⏸';st.setAttribute('aria-label','השהה מצגת');}startSlide();};$('spaSlideToggle').onclick=()=>{const st=$('spaSlideToggle');if(slideTimer){clearInterval(slideTimer);slideTimer=null;st.textContent='▶';st.setAttribute('aria-label','המשך מצגת');}else{startSlide();st.textContent='⏸';st.setAttribute('aria-label','השהה מצגת');}};
    const key=e=>{if(e.key==='Escape'&&$('spaEditModal')?.classList.contains('open')){closeEdit();return;}if(e.key==='Escape'&&$('spaUploadModal')?.classList.contains('open')){cancelUpload();return;}if(!$('spaViewer')?.classList.contains('open'))return;if(e.key==='Escape')close();else if(e.key==='ArrowRight')move(-1);else if(e.key==='ArrowLeft')move(1);};document.addEventListener('keydown',key);cleanup.push(()=>document.removeEventListener('keydown',key));let x=null;const ts=e=>x=e.changedTouches?.[0]?.clientX??null,te=e=>{if(x==null)return;const nx=e.changedTouches?.[0]?.clientX??x,dx=nx-x;x=null;if(Math.abs(dx)>45)move(dx>0?-1:1);};$('spaViewer').addEventListener('touchstart',ts,{passive:true});$('spaViewer').addEventListener('touchend',te,{passive:true});cleanup.push(()=>{$('spaViewer')?.removeEventListener('touchstart',ts);$('spaViewer')?.removeEventListener('touchend',te);close();});if(wantsUpload&&!uploadOpened&&albumMeta?.canUpload){openUpload();uploadOpened=true;}return ()=>{cleanup.splice(0).forEach(fn=>{try{fn();}catch(_){}});};}
  global.SPAAlbum={mount};
})(window);
