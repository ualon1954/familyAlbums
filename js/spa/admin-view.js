(function(global){
  let themeObserver=null, messageBound=false, nativeUsers=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function postToAdmin_(frame,type,payload={}){ try{ frame?.contentWindow?.postMessage({source:'fpa-spa',type,...payload},location.origin); }catch(_){} }
  function bindMessages_(){
    if(messageBound)return; messageBound=true;
    window.addEventListener('message',e=>{
      if(e.origin!==location.origin || e.data?.source!=='fpa-admin')return;
      if(e.data.type==='ready'){ const f=document.getElementById('spaAdminFrame'); syncTheme_(f); postToAdmin_(f,'session',{role:'ADMIN'}); }
      if(e.data.type==='navigate' && e.data.route){ location.hash=String(e.data.route); }
      if(e.data.type==='data-changed'){ try{ window.SPASessionDataStore?.invalidate?.(e.data.scope||'admin'); }catch(_){} }
    });
  }
  function syncTheme_(frame){
    try{ const dark=document.documentElement.classList.contains('dark'); frame.contentDocument?.documentElement?.classList.toggle('dark',dark); postToAdmin_(frame,'theme',{dark}); }catch(_){}
  }
  async function syncLegacyUsers_(frame){
    try{ await frame?.contentWindow?.refreshAdminUsersFromSheet_?.(); }catch(_){}
    // R17P2O8: user mutations must bypass the cached permissions bootstrap so
    // the permissions user combo reflects the new/updated user immediately.
    try{ await frame?.__spaReloadPermissions?.(true); }catch(_){}
    try{ window.SPASessionDataStore?.invalidate?.('admin'); }catch(_){}
  }
  function nativeMarkup_(){return `
    <h2>👤 משתמש</h2>
    <label class="required-field"><span class="required-field-label">שם <span class="required-star">*</span></span><input id="spaUn" required placeholder="נא להזין שם משתמש"></label>
    <label class="required-field"><span class="required-field-label">אימייל <span class="required-star">*</span></span><input id="spaUe" required type="email" placeholder="name@example.com"></label>
    <label class="required-field"><span class="required-field-label">סיסמה <span class="required-star">*</span></span><input id="spaUp" required type="password" placeholder="נא להזין סיסמה"></label>
    <label class="required-field"><span class="required-field-label">תפקיד <span class="required-star">*</span></span><select id="spaUr" required><option value="" disabled selected hidden>נא לבחור תפקיד</option><option value="FAMILY">FAMILY</option><option value="GUEST">GUEST</option><option value="ADMIN">ADMIN</option></select></label>
    <button class="btn" id="spaCreateUser">צור משתמש</button><p id="spaUserMsg"></p>
    <hr class="user-manage-separator"><h3 class="user-manage-heading">משתמשים קיימים</h3>
    <p class="hint">עריכה כוללת שם, אימייל, תפקיד, סטטוס ואפשרות לשינוי סיסמה.</p>
    <div class="user-manage-toolbar"><label for="spaUserStatusFilter">הצג:</label><select id="spaUserStatusFilter"><option value="active" selected>משתמשים פעילים</option><option value="inactive">משתמשים לא פעילים</option><option value="all">כל המשתמשים</option></select></div>
    <div id="spaUserManageStatus" class="user-manage-status" aria-live="polite"></div><p id="spaUserActionMsg" role="status" aria-live="polite" style="font-weight:800"></p><div id="spaUserManageList" class="user-manage-list"></div>`;}
  function modalMarkup_(){return `<div id="spaNativeUserModal" class="user-manage-modal" aria-hidden="true"><div class="user-manage-card" role="dialog" aria-modal="true"><h2>עריכת משתמש</h2><label>שם<input id="spaEditName" type="text" required></label><label>אימייל<input id="spaEditEmail" type="email" required></label><label>תפקיד<select id="spaEditRole"><option>ADMIN</option><option>FAMILY</option><option>GUEST</option></select></label><label>סיסמה חדשה<input id="spaEditPassword" type="password" placeholder="השאר ריק כדי לא לשנות"></label><div class="user-status-field"><div class="user-status-field-title">סטטוס משתמש</div><div class="user-status-toggle-row"><div class="user-status-toggle-text"><strong id="spaEditStatusText">פעיל</strong><span>קובע אם המשתמש יכול להתחבר למערכת</span></div><label class="user-status-switch" aria-label="שינוי סטטוס משתמש"><input id="spaEditActive" type="checkbox" role="switch" aria-checked="true"><span class="user-status-slider" aria-hidden="true"></span></label></div></div><p id="spaEditMsg"></p><div class="user-manage-actions"><button class="user-manage-cancel" id="spaEditCancel">ביטול</button><button class="user-manage-save" id="spaEditSave">שמור</button></div></div></div>`;}
  function renderNativeUsers_(doc,session){
    const filter=doc.getElementById('spaUserStatusFilter')?.value||'active';
    const list=nativeUsers.filter(Boolean).filter(u=>filter==='all'||(filter==='inactive'?u.active===false:u.active!==false));
    const status=doc.getElementById('spaUserManageStatus'),box=doc.getElementById('spaUserManageList'); if(!box)return;
    status.textContent=`${filter==='inactive'?'משתמשים לא פעילים':filter==='all'?'כל המשתמשים':'משתמשים פעילים'}: ${list.length}`;
    box.innerHTML=list.length?list.map(u=>{const self=String(u.id)===String(session.user.id),active=u.active!==false;return `<div class="user-manage-row ${active?'':'inactive'}"><div class="user-manage-info"><b>${esc(u.name||'ללא שם')}${self?' — אתה':''}</b><span>${esc(u.email||'')}</span><span class="user-manage-role">${esc(u.role||'')}</span><span class="user-status-badge ${active?'':'inactive'}">${active?'פעיל':'לא פעיל'}</span></div><div class="user-manage-buttons"><button type="button" class="edit-user-btn" data-native-edit="${esc(u.id)}">✎</button>${active?'':`<button type="button" class="permanent-delete-user-btn" data-native-delete="${esc(u.id)}">🗑</button>`}</div></div>`}).join(''):'<div class="hint">אין משתמשים להצגה בסינון שנבחר.</div>';
  }
  async function activateNativeUsers_(frame,session){
    const doc=frame.contentDocument; if(!doc||doc.documentElement.dataset.spaNativeUsers==='1')return;
    const old=doc.getElementById('un')?.closest('section.panel'); if(!old)return;
    doc.documentElement.dataset.spaNativeUsers='1'; old.innerHTML=nativeMarkup_(); old.dataset.nativeSpaUsers='1';
    doc.body.insertAdjacentHTML('beforeend',modalMarkup_());
    const msg=doc.getElementById('spaUserMsg'), modal=doc.getElementById('spaNativeUserModal'); let editId='';
    const updateEditStatus_=()=>{const input=doc.getElementById('spaEditActive'),text=doc.getElementById('spaEditStatusText');const active=!!input?.checked;if(text)text.textContent=active?'פעיל':'לא פעיל';if(input)input.setAttribute('aria-checked',active?'true':'false');};
    doc.getElementById('spaEditActive')?.addEventListener('change',updateEditStatus_);
    const reload=async(force=false)=>{ const cached=!force?global.AppState?.getData?.('adminUsers'):null; if(Array.isArray(cached)){nativeUsers=cached;renderNativeUsers_(doc,session);return;} const r=await global.API.call('listUsers',{token:session.token},'GET'); if(!r?.ok||!Array.isArray(r.data))throw new Error(r?.message||'לא ניתן לטעון משתמשים'); nativeUsers=r.data; global.AppState?.setData?.('adminUsers',nativeUsers); renderNativeUsers_(doc,session); };
    doc.getElementById('spaUserStatusFilter').addEventListener('change',()=>renderNativeUsers_(doc,session));
    doc.getElementById('spaCreateUser').addEventListener('click',async()=>{ const name=doc.getElementById('spaUn').value.trim(),email=doc.getElementById('spaUe').value.trim(),password=doc.getElementById('spaUp').value,role=doc.getElementById('spaUr').value; if(!name||!email||!password||!role){msg.textContent='✕ יש למלא את כל שדות החובה';return;} if(nativeUsers.some(u=>String(u.email||'').trim().toLowerCase()===email.toLowerCase())){msg.textContent='✕ המשתמש כבר קיים';return;} const b=doc.getElementById('spaCreateUser');msg.style.color='';msg.textContent='שומר...';b.disabled=true;b.textContent='שומר...';try{const r=await global.API.call('createUser',{token:session.token,name,email,password,role});if(!r?.ok)throw new Error(r?.message||'לא ניתן ליצור משתמש');doc.getElementById('spaUn').value='';doc.getElementById('spaUe').value='';doc.getElementById('spaUp').value='';doc.getElementById('spaUr').value='';msg.textContent='מסנכרן משתמשים...';await reload(true);await syncLegacyUsers_(frame);msg.textContent='✓ המשתמש נוצר בהצלחה';msg.style.color='#22c55e';}catch(e){msg.style.color='#ef4444';msg.textContent='✕ '+(e.message||'שגיאה');}finally{b.disabled=false;b.textContent='צור משתמש';}});
    doc.getElementById('spaUserManageList').addEventListener('click',async e=>{ const eb=e.target.closest('[data-native-edit]'),pb=e.target.closest('[data-native-delete]'); if(eb){const u=nativeUsers.find(x=>String(x.id)===String(eb.dataset.nativeEdit));if(!u)return;editId=String(u.id);doc.getElementById('spaEditName').value=u.name||'';doc.getElementById('spaEditEmail').value=u.email||'';doc.getElementById('spaEditRole').value=String(u.role||'FAMILY').toUpperCase();doc.getElementById('spaEditPassword').value='';doc.getElementById('spaEditActive').checked=u.active!==false;updateEditStatus_();doc.getElementById('spaEditMsg').textContent='';const visibleTop=Math.max(18,(-frame.getBoundingClientRect().top)+72);modal.style.position='absolute';modal.style.alignItems='flex-start';modal.style.paddingTop=visibleTop+'px';modal.classList.add('open');modal.setAttribute('aria-hidden','false');return;} if(pb){
      const user=nativeUsers.find(x=>String(x.id)===String(pb.dataset.nativeDelete));
      if(!user)return;
      const userId=String(user.id), userName=String(user.name||user.email||'ללא שם');
      // The dialog owns the entire mutation lifecycle: it must not disappear
      // before the server responds, including on a filtered-out deleted row.
      const dialog=doc.createElement('div');
      dialog.className='user-manage-modal open';
      dialog.setAttribute('aria-hidden','false');
      dialog.style.zIndex='9000';
      const visibleTop=Math.max(18,(-frame.getBoundingClientRect().top)+72);
      dialog.style.position='absolute';dialog.style.alignItems='flex-start';dialog.style.paddingTop=visibleTop+'px';
      dialog.innerHTML=`<div class="user-manage-card" role="dialog" aria-modal="true" aria-labelledby="spaDeleteUserTitle">
        <h2 id="spaDeleteUserTitle">מחיקה לצמיתות</h2>
        <p>למחוק לצמיתות את המשתמש <strong>${esc(userName)}</strong>? פעולה זו אינה ניתנת לביטול.</p>
        <p data-delete-result role="status" aria-live="polite" style="font-weight:800"></p>
        <div class="user-manage-actions"><button type="button" class="user-manage-cancel" data-delete-cancel>ביטול</button>
        <button type="button" class="user-manage-save" data-delete-confirm style="background:#b3261e;color:#fff">מחק לצמיתות</button></div></div>`;
      doc.body.appendChild(dialog);
      const confirm=dialog.querySelector('[data-delete-confirm]'),cancel=dialog.querySelector('[data-delete-cancel]'),result=dialog.querySelector('[data-delete-result]');
      let busy=false;
      const close=()=>{if(busy)return;dialog.remove();};
      cancel.addEventListener('click',close);
      confirm.addEventListener('click',async()=>{
        if(busy)return;busy=true;confirm.disabled=true;cancel.disabled=true;
        confirm.textContent='מוחק...';result.style.color='';result.textContent='מוחק את המשתמש...';
        try{
          const r=await global.API.call('permanentlyDeleteUser',{token:session.token,id:userId});
          if(!r?.ok)throw new Error(r?.message||'לא ניתן למחוק');
          result.style.color='#22c55e';result.textContent=`✓ המשתמש ׳${userName}׳ נמחק לצמיתות בהצלחה`;
          try{await reload(true);await syncLegacyUsers_(frame);}catch(syncError){console.error('User deleted; refresh failed',syncError);}
          await new Promise(resolve=>setTimeout(resolve,1800));
          busy=false;close();
        }catch(x){
          result.style.color='#ef4444';result.textContent=`✕ לא ניתן למחוק את המשתמש ׳${userName}׳: ${x.message||'שגיאה'}`;
          busy=false;confirm.disabled=false;cancel.disabled=false;confirm.textContent='מחק לצמיתות';
        }
      });
      confirm.focus();
    } });
    doc.getElementById('spaEditCancel').onclick=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');modal.style.paddingTop='';};
    doc.getElementById('spaEditSave').onclick=async()=>{const u=nativeUsers.find(x=>String(x.id)===editId);if(!u)return;const name=doc.getElementById('spaEditName').value.trim(),email=doc.getElementById('spaEditEmail').value.trim(),role=doc.getElementById('spaEditRole').value,password=doc.getElementById('spaEditPassword').value,active=doc.getElementById('spaEditActive').checked,m=doc.getElementById('spaEditMsg'),b=doc.getElementById('spaEditSave');if(!name||!email||!role){m.textContent='יש למלא שם, אימייל ותפקיד';return;}if(String(u.id)===String(session.user.id)&&role!=='ADMIN'){m.textContent='לא ניתן לשנות את תפקיד המנהל המחובר';return;}m.style.color='';m.textContent='שומר...';b.disabled=true;b.textContent='שומר...';try{const r=await global.API.call('updateUser',{token:session.token,id:editId,name,email,role,password,active});if(!r?.ok)throw new Error(r?.message||'לא ניתן לעדכן');await reload(true);await syncLegacyUsers_(frame);m.style.color='#22c55e';m.textContent=active!== (u.active!==false)?(active?`✓ המשתמש ׳${name}׳ הופעל בהצלחה`:`✓ המשתמש ׳${name}׳ הושבת בהצלחה`):'✓ המשתמש עודכן בהצלחה';await new Promise(resolve=>setTimeout(resolve,1800));modal.classList.remove('open');modal.setAttribute('aria-hidden','true');modal.style.paddingTop='';}catch(x){m.style.color='#ef4444';m.textContent='✕ '+(active!== (u.active!==false)?`לא ניתן ${active?'להפעיל':'להשבית'} את המשתמש ׳${name}׳: `:'')+(x.message||'שגיאה');}finally{b.disabled=false;b.textContent='שמור';}};
    try{await reload();}catch(e){msg.textContent='✕ '+(e.message||'לא ניתן לטעון משתמשים');}
  }

  async function activateNativePermissions_(frame,session){
    const doc=frame.contentDocument; if(!doc||doc.documentElement.dataset.spaNativePermissions==='1')return;
    const panel=doc.querySelector('.permissions-panel'); if(!panel)return;
    doc.documentElement.dataset.spaNativePermissions='1';
    panel.dataset.nativeSpaPermissions='1';
    panel.innerHTML=`<h2>🔐 ניהול הרשאות</h2><p class="hint">בחר משתמש ואלבום והגדר מה מותר לו לבצע.</p><select id="spaPermUser"></select><select id="spaPermAlbum"></select><label class="perm-check"><input id="spaPermView" type="checkbox"> צפייה באלבום</label><label class="perm-check" id="spaPermUploadRow"><input id="spaPermUpload" type="checkbox"> העלאת תמונות</label><label class="perm-check" id="spaPermDeleteRow"><input id="spaPermDelete" type="checkbox"> עריכה ומחיקת תמונות</label><button class="btn" id="spaPermSave">שמור הרשאות</button><p id="spaPermMsg"></p>`;
    const userEl=doc.getElementById('spaPermUser'), albumEl=doc.getElementById('spaPermAlbum'), viewEl=doc.getElementById('spaPermView'), uploadEl=doc.getElementById('spaPermUpload'), deleteEl=doc.getElementById('spaPermDelete'), msg=doc.getElementById('spaPermMsg'), save=doc.getElementById('spaPermSave');
    let users=[],albums=[],drafts=new Map();
    const key=()=>`${String(userEl.value||'')}::${String(albumEl.value||'')}`;
    const selectedUser=()=>users.find(u=>String(u.id)===String(userEl.value||''));
    const isGuest=()=>String(selectedUser()?.role||'').toUpperCase()==='GUEST';
    const updateRoleUI=()=>{const guest=isGuest(),ur=doc.getElementById('spaPermUploadRow'),dr=doc.getElementById('spaPermDeleteRow');if(ur)ur.style.display=guest?'none':'';if(dr)dr.style.display=guest?'none':'';if(guest){uploadEl.checked=false;deleteEl.checked=false;}};
    const remember=()=>{const k=key();if(k&&k!=='::')drafts.set(k,{canView:!!viewEl.checked,canUpload:isGuest()?false:!!uploadEl.checked,canDelete:isGuest()?false:!!deleteEl.checked});};
    const apply=()=>{const k=key();updateRoleUI();if(!userEl.value||!albumEl.value){viewEl.checked=uploadEl.checked=deleteEl.checked=false;return;}let v=drafts.get(k);if(!v){v={canView:isGuest()?false:true,canUpload:false,canDelete:false};drafts.set(k,v);}viewEl.checked=!!v.canView;uploadEl.checked=isGuest()?false:!!v.canUpload;deleteEl.checked=isGuest()?false:!!v.canDelete;msg.textContent='';};
    const render=()=>{const keepUser=String(userEl.value||''),keepAlbum=String(albumEl.value||'');const active=users.filter(u=>u&&u.active!==false);userEl.innerHTML=active.map(u=>`<option value="${esc(u.id)}">${esc(u.name||'')} — ${esc(u.email||'')} (${esc(u.role||'')})</option>`).join('');albumEl.innerHTML=albums.map(a=>`<option value="${esc(a.id)}">${esc(a.title||'')}</option>`).join('');if(active.some(u=>String(u.id)===keepUser))userEl.value=keepUser;if(albums.some(a=>String(a.id)===keepAlbum))albumEl.value=keepAlbum;apply();};
    const reload=async(force=false)=>{msg.textContent='טוען הרשאות...';let d=!force?global.AppState?.getData?.('adminPermissions'):null;if(!d){const r=await global.API.call('adminPermissionsBootstrap',{token:session.token});if(!r?.ok)throw new Error(r?.message||'טעינת הרשאות נכשלה');d=r.data||{};global.AppState?.setData?.('adminPermissions',d);}users=Array.isArray(d.users)?d.users:[];albums=(Array.isArray(d.albums)?d.albums:[]).filter(a=>a&&String(a.id)!=='__ALL__');drafts=new Map();(Array.isArray(d.permissions)?d.permissions:[]).forEach(x=>drafts.set(`${String(x.userId||'')}::${String(x.albumId||'')}`,{canView:!!x.canView,canUpload:!!x.canUpload,canDelete:!!x.canDelete}));render();msg.textContent='';};
    [viewEl,uploadEl,deleteEl].forEach(el=>el.addEventListener('change',remember));userEl.addEventListener('change',apply);albumEl.addEventListener('change',apply);
    save.addEventListener('click',async()=>{remember();const userId=String(userEl.value||'');if(!userId){msg.textContent='✕ בחר משתמש';return;}const entries=[...drafts.entries()].filter(([k])=>k.startsWith(userId+'::')).map(([k,v])=>({albumId:k.split('::').slice(1).join('::'),canView:!!v.canView,canUpload:isGuest()?false:!!v.canUpload,canDelete:isGuest()?false:!!v.canDelete})).filter(x=>x.albumId&&x.albumId!=='__ALL__');if(!entries.length){msg.textContent='אין שינויים לשמירה';return;}save.disabled=true;save.textContent='שומר...';msg.textContent=`שומר ${entries.length} הרשאות...`;try{const r=await global.API.call('savePermissionsBatch',{token:session.token,userId,entries});if(!r?.ok)throw new Error(r?.message||'שגיאה בשמירת הרשאות');msg.textContent=`✓ נשמרו הרשאות עבור ${Number(r.data?.updatedCount)||entries.length} אלבומים`;try{window.SPASessionDataStore?.invalidate?.('permissions');}catch(_){}if(global.uiAlert)await global.uiAlert('ההרשאות נשמרו בהצלחה',{title:'שמירת הרשאות',icon:'✓'});}catch(e){msg.textContent='✕ '+(e.message||'שגיאה');if(global.uiAlert)await global.uiAlert(e.message||'שגיאה בשמירת הרשאות',{title:'שמירת הרשאות נכשלה',icon:'!'});}finally{save.disabled=false;save.textContent='שמור הרשאות';}});
    frame.__spaReloadPermissions=reload;
    await reload();
  }

  async function mount(outlet){
    bindMessages_(); const s=global.SessionManager?.getSession?.()||global.getSession?.();
    if(!s){ location.href='index.html?autoLogin=1&return='+encodeURIComponent('index.html#/admin'); return; }
    if(String(s?.user?.role||'').toUpperCase()!=='ADMIN'){ outlet.innerHTML='<section class="section"><h1>אין הרשאה</h1></section>'; return; }
    outlet.innerHTML='<section class="section spa-admin-legacy-host"><div id="spaAdminStatus" class="dashboard-load-status loading spa-view-loading">טוען מסך ניהול...</div><iframe id="spaAdminFrame" class="spa-admin-legacy-frame" title="מרכז ניהול" scrolling="no"></iframe></section>';
    const frame=outlet.querySelector('#spaAdminFrame'),status=outlet.querySelector('#spaAdminStatus');
    frame.addEventListener('load',()=>{
      syncTheme_(frame);
      // R17P2: show the Admin shell immediately. Users and Permissions load in
      // parallel and populate their own panels; they no longer block the screen.
      // R17P2O7: .spa-view-loading uses display:flex!important, so a normal
      // inline display:none cannot hide this banner. Retire the loading owner
      // explicitly before showing the already-loaded Admin shell.
      status.classList.remove('loading','spa-view-loading');
      status.textContent='';
      status.hidden=true;
      status.setAttribute('aria-hidden','true');
      status.style.setProperty('display','none','important');
      frame.style.display='block';
      const usersTask=activateNativeUsers_(frame,s).catch(e=>console.error('Native SPA users activation failed',e));
      const permissionsTask=activateNativePermissions_(frame,s).catch(e=>console.error('Native SPA permissions activation failed',e));
      Promise.allSettled([usersTask,permissionsTask]).then(()=>{
        try{
          const doc=frame.contentDocument;
          const resize=()=>{const h=Math.max(doc.documentElement.scrollHeight,doc.body?.scrollHeight||0);frame.style.height=Math.max(720,h+12)+'px';};
          resize();
        }catch(_){}
      });
      try{
        const doc=frame.contentDocument;
        const resize=()=>{const h=Math.max(doc.documentElement.scrollHeight,doc.body?.scrollHeight||0);frame.style.height=Math.max(720,h+12)+'px';};
        resize();
        new ResizeObserver(resize).observe(doc.body);
      }catch(_){}
    },{once:true});
    frame.srcdoc=global.SPAAdminShellHTML||'<p>Admin shell unavailable</p>'; themeObserver?.disconnect?.(); themeObserver=new MutationObserver(()=>syncTheme_(frame)); themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  }
  global.SPAAdmin={mount};
})(window);
