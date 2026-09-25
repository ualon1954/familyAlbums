/* R17L3 — Activity Log Native SPA. No iframe / no activity-log.html runtime dependency. */
(function(global){
  let initialized=false;
  const MARKUP="<main class=\"section\"><div class=\"heading\"><div><span class=\"eyebrow\">ADMIN</span><h1>📋 יומן פעילויות</h1><p>צפייה, סינון ומיון של פעולות שבוצעו במערכת.</p></div></div>\n<div class=\"activity-shell\">\n<div class=\"activity-filter-toolbar\"><strong><span aria-hidden=\"true\" class=\"filter-icon\"><svg fill=\"none\" height=\"18\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" viewbox=\"0 0 24 24\" width=\"18\"><path d=\"M3 5h18l-7 8v5l-4 2v-7L3 5z\"></path></svg></span> סינון יומן</strong><span class=\"activity-filter-summary\" id=\"filterSummary\">ללא סינון פעיל</span><button aria-expanded=\"false\" class=\"btn activity-filter-toggle activity-icon-btn\" id=\"filterToggle\" type=\"button\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">⚲</span><span>הצג סינון</span><span aria-hidden=\"true\" class=\"toggle-arrow\">⌄</span></button></div>\n<section aria-hidden=\"true\" class=\"panel activity-filter-panel\" id=\"filterPanel\"><div class=\"activity-filter-title\"><h2><span aria-hidden=\"true\" class=\"filter-icon\"><svg fill=\"none\" height=\"18\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" viewbox=\"0 0 24 24\" width=\"18\"><path d=\"M3 5h18l-7 8v5l-4 2v-7L3 5z\"></path></svg></span> סינון</h2><button aria-label=\"סגור סינון\" class=\"activity-filter-close\" id=\"filterClose\" title=\"סגור סינון\" type=\"button\">×</button></div><div class=\"activity-filters\">\n<div class=\"activity-field\"><label>מתאריך ושעה</label><div class=\"activity-date-time\"><div class=\"activity-date-control\"><input aria-label=\"מתאריך\" class=\"activity-date-display\" id=\"fromDateDisplay\" inputmode=\"none\" placeholder=\"dd/mm/yyyy\" readonly=\"\" type=\"text\"/><button aria-label=\"פתח לוח שנה למתאריך\" class=\"activity-picker-btn\" id=\"fromDatePicker\" title=\"בחר תאריך\" type=\"button\">📅</button><input aria-label=\"בחר מתאריך\" class=\"activity-date-native\" id=\"fromDate\" type=\"date\"/></div><div class=\"activity-time-control\"><input aria-label=\"משעה\" class=\"activity-time-display\" id=\"fromTimeDisplay\" inputmode=\"none\" placeholder=\"hh:mm\" readonly=\"\" type=\"text\"/><button aria-label=\"בחר שעה התחלתית\" class=\"activity-picker-btn\" id=\"fromTimePicker\" title=\"בחר שעה\" type=\"button\">🕒</button><input aria-label=\"בחר משעה\" class=\"activity-time-native\" id=\"fromTime\" step=\"60\" type=\"time\"/></div></div></div>\n<div class=\"activity-field\"><label>עד תאריך ושעה</label><div class=\"activity-date-time\"><div class=\"activity-date-control\"><input aria-label=\"עד תאריך\" class=\"activity-date-display\" id=\"toDateDisplay\" inputmode=\"none\" placeholder=\"dd/mm/yyyy\" readonly=\"\" type=\"text\"/><button aria-label=\"פתח לוח שנה לעד תאריך\" class=\"activity-picker-btn\" id=\"toDatePicker\" title=\"בחר תאריך\" type=\"button\">📅</button><input aria-label=\"בחר עד תאריך\" class=\"activity-date-native\" id=\"toDate\" type=\"date\"/></div><div class=\"activity-time-control\"><input aria-label=\"עד שעה\" class=\"activity-time-display\" id=\"toTimeDisplay\" inputmode=\"none\" placeholder=\"hh:mm\" readonly=\"\" type=\"text\"/><button aria-label=\"בחר שעה סופית\" class=\"activity-picker-btn\" id=\"toTimePicker\" title=\"בחר שעה\" type=\"button\">🕒</button><input aria-label=\"בחר עד שעה\" class=\"activity-time-native\" id=\"toTime\" step=\"60\" type=\"time\"/></div></div></div>\n<div class=\"activity-field activity-user-search\"><label for=\"userFilter\">משתמש</label><div class=\"activity-user-input-wrap\"><span aria-hidden=\"true\" class=\"activity-user-search-icon\">⌕</span><input aria-label=\"חיפוש משתמש לפי שם\" autocomplete=\"off\" id=\"userFilter\" placeholder=\"הקלד שם משתמש...\" type=\"search\"/></div></div>\n<div class=\"activity-field\"><label for=\"actionFilter\">פעולה</label><select id=\"actionFilter\"><option value=\"\">כל הפעולות</option></select></div>\n<div class=\"activity-field\"><label for=\"typeFilter\">סוג</label><select id=\"typeFilter\"><option value=\"\">כל הסוגים</option></select></div>\n<div class=\"activity-field activity-mobile-sort\"><label for=\"mobileSortBy\">מיון לפי</label><select aria-label=\"מיון לפי\" id=\"mobileSortBy\">\n<option value=\"createdAt\">תאריך ושעה</option><option value=\"user\">משתמש</option><option value=\"action\">פעולה</option><option value=\"entityType\">סוג</option><option value=\"details\">פרטים</option>\n</select></div>\n<div class=\"activity-field activity-mobile-sort\"><label for=\"mobileSortDir\">סדר</label><select aria-label=\"סדר מיון\" id=\"mobileSortDir\">\n<option value=\"desc\">↓ יורד</option><option value=\"asc\">↑ עולה</option>\n</select></div>\n</div><div class=\"activity-filter-actions\"><button class=\"btn activity-filter-action-btn activity-apply-btn activity-icon-btn\" id=\"applyFilters\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">⚲</span><span>סנן</span></button><button class=\"btn secondary activity-filter-action-btn activity-reset-btn activity-icon-btn\" id=\"resetFilters\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">↺</span><span>נקה סינון</span></button><button class=\"btn activity-clear-btn activity-icon-btn\" id=\"clearLog\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">🗑</span><span>ניקוי יומן</span></button></div></section>\n<section class=\"panel activity-list-panel\"><div class=\"activity-summary\"><div class=\"activity-count\" id=\"resultCount\">—</div><div class=\"activity-index-note\" id=\"indexInfo\"></div></div><div class=\"activity-table-wrap\"><table class=\"activity-table\"><thead><tr><th><button class=\"activity-sort\" data-sort=\"createdAt\">תאריך ושעה <span class=\"sort-arrow\">↕</span></button></th><th><button class=\"activity-sort\" data-sort=\"user\">משתמש <span class=\"sort-arrow\">↕</span></button></th><th><button class=\"activity-sort\" data-sort=\"action\">פעולה <span class=\"sort-arrow\">↕</span></button></th><th><button class=\"activity-sort\" data-sort=\"entityType\">סוג <span class=\"sort-arrow\">↕</span></button></th><th><button class=\"activity-sort\" data-sort=\"details\">פרטים <span class=\"sort-arrow\">↕</span></button></th></tr></thead><tbody id=\"activityRows\"></tbody></table></div><div class=\"activity-pager\"><button class=\"btn activity-icon-btn\" id=\"nextPage\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">→</span><span>הבא</span></button><span id=\"pageInfo\"></span><button class=\"btn activity-icon-btn\" id=\"prevPage\"><span>הקודם</span><span aria-hidden=\"true\" class=\"activity-btn-icon\">←</span></button></div></section></div>\n</main><div aria-hidden=\"true\" class=\"activity-modal\" id=\"userInfoModal\"><div aria-modal=\"true\" class=\"activity-modal-card\" role=\"dialog\"><h2>פרטי משתמש</h2><p><strong id=\"infoUserName\"></strong></p><div class=\"activity-email\" id=\"infoUserEmail\"></div><div class=\"activity-modal-actions\"><button class=\"btn activity-icon-btn\" id=\"closeUserInfo\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">×</span><span>סגור</span></button></div></div></div><div aria-hidden=\"true\" class=\"activity-modal\" id=\"clearLogModal\"><div aria-modal=\"true\" class=\"activity-modal-card\" role=\"dialog\"><h2>ניקוי יומן פעילויות</h2><p id=\"clearLogText\"></p><p class=\"hint\">המחיקה אינה ניתנת לביטול. פעולת הניקוי עצמה תירשם מחדש ביומן.</p><div class=\"activity-modal-actions\"><button class=\"btn secondary activity-icon-btn\" id=\"cancelClear\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">×</span><span>ביטול</span></button><button class=\"btn activity-clear-btn activity-icon-btn\" id=\"confirmClear\"><span aria-hidden=\"true\" class=\"activity-btn-icon\">🗑</span><span>כן, מחק</span></button></div></div></div>";
  // R17P2O4: hard-stop any orphan automatic busy marker after Activity Log reaches a terminal paint.
  function clearActivityOrphanBusy(host){
    if(!host)return;
    host.querySelectorAll('.fpa-busy-ellipsis,.is-action-busy').forEach(el=>{
      if(!el.classList.contains('spa-view-loading'))el.classList.remove('fpa-busy-ellipsis','is-action-busy');
    });
    host.querySelector('.activity-list-panel')?.classList.remove('is-refreshing');
  }
  function sizeActivityDataScroller(host){
    if(matchMedia('(max-width:850px)').matches) return;
    const tbody=host.querySelector('.activity-table tbody');
    const pager=host.querySelector('.activity-pager');
    if(!tbody) return;
    const top=tbody.getBoundingClientRect().top;
    const pagerH=(pager && !pager.hidden)?Math.max(0,pager.getBoundingClientRect().height):0;
    const h=Math.max(180,Math.floor(window.innerHeight-top-pagerH-24));
    document.documentElement.style.setProperty('--activity-data-height',h+'px');
  }
  async function mount(outlet){
    const session=global.SessionManager?.getSession?.()||global.getSession?.()||null;
    if(!session?.token){ global.AppRouter?.go?.('home'); return; }
    if(String(session?.user?.role||'').toUpperCase()!=='ADMIN'){
      outlet.innerHTML='<section class="section"><div class="card spa-access-denied"><h1>אין הרשאה</h1><p>יומן הפעילויות זמין למנהל מערכת בלבד.</p></div></section>'; return;
    }
    if(initialized && outlet.querySelector('.spa-activity-native')){ requestAnimationFrame(()=>sizeActivityDataScroller(outlet)); return; }
    outlet.innerHTML='<div class="spa-activity-native activity-log-page">'+MARKUP+'</div>';
    const host=outlet.querySelector('.spa-activity-native');
    initialized=true;
    const resize=()=>sizeActivityDataScroller(host);
    addEventListener('resize',resize,{passive:true});
    new MutationObserver(()=>requestAnimationFrame(resize)).observe(host.querySelector('.activity-list-panel')||host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    requestAnimationFrame(resize);
    try{
      
const S=requireLogin('ADMIN');let bootstrap=null,currentPage=1,lastResult=null,sortBy='createdAt',sortDir='desc',loadSeq=0,userSearchTimer=0,activityClientRows=null,activityClientMode=false;const ACTIVITY_CLIENT_LIMIT=500;

const $=id=>host.querySelector('#'+id);
function opt(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function fillSelect(id,items,valueKey,labelKey){const el=$(id);items.forEach(x=>el.appendChild(opt(typeof x==='string'?x:x[valueKey],typeof x==='string'?x:x[labelKey])));}
function resetSelectOptions(id){
  const el=$(id);if(!el)return;
  while(el.options.length>1)el.remove(1);
}
function deriveActivityFilterOptions(rows){
  const actions=[...new Set((rows||[]).map(r=>String(r?.action||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'he'));
  const types=[...new Set((rows||[]).map(r=>String(r?.entityType||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'he'));
  resetSelectOptions('actionFilter');resetSelectOptions('typeFilter');
  fillSelect('actionFilter',actions);fillSelect('typeFilter',types);
  return {actions,types};
}
let activityInitPromise=null;
if(S){initActivityLog();}
function isTransientActivityLogError(e){
  const code=String(e?.code||'');
  const status=Number(e?.httpStatus||0);
  const msg=String(e?.message||'');
  return code==='API_HTML_RESPONSE'||code==='ACTIVITY_EMPTY_TRANSIENT'||code==='ACTIVITY_EMPTY_RESPONSE'||status===404||/HTML במקום JSON|תשובה ריקה|JSON תקין/i.test(msg);
}
function waitActivityRetry(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function callActivityReadWithRetry(action,payload,validator){
  const url=String(window.APP_CONFIG?.API_URL||'').trim();
  if(!url||url.includes('PASTE_'))throw Error('יש להגדיר API_URL בקובץ config.js');
  let lastError=null;
  const maxAttempts=2;

  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const startedAt=performance.now();
    let slowTimer=null;
    try{
      slowTimer=setTimeout(()=>{
        const rc=$('resultCount');
        if(rc)rc.textContent='הטעינה נמשכת... ממתין לתשובת השרת';
      },5000);

      const resp=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action,...payload}),
        cache:'no-store'
      });

      const raw=await resp.text();
      const trimmed=String(raw||'').trim();

      if(!trimmed){
        const e=Error('השרת החזיר תשובה ריקה');
        e.code='ACTIVITY_EMPTY_RESPONSE';
        e.httpStatus=resp.status;
        throw e;
      }
      if(trimmed[0]==='<'){
        const e=Error('השרת החזיר דף HTML במקום JSON. יש לבדוק את פרסום ה-Web App וההרשאות.');
        e.code='API_HTML_RESPONSE';
        e.httpStatus=resp.status;
        throw e;
      }

      let r;
      try{r=JSON.parse(trimmed);}
      catch(_){
        const e=Error('תשובת השרת אינה JSON תקין');
        e.code='API_INVALID_JSON';
        e.httpStatus=resp.status;
        throw e;
      }

      if(!r?.ok)throw Error(r?.message||'לא ניתן לטעון את היומן');
      if(typeof validator==='function')validator(r);



      return r;
    }catch(e){
      lastError=e;

      const status=Number(e?.httpStatus||0);
      const code=String(e?.code||'');
      const retryable=
        code==='API_HTML_RESPONSE'||
        code==='ACTIVITY_EMPTY_RESPONSE'||
        code==='API_INVALID_JSON'||
        status===404;

      if(!retryable||attempt>=maxAttempts)throw lastError;

      const rc=$('resultCount');
      if(rc)rc.textContent='התקבלה תשובת שרת לא תקינה, מבצע ניסיון נוסף...';
      await waitActivityRetry(700);
    }finally{
      if(slowTimer)clearTimeout(slowTimer);
    }
  }

  throw lastError||Error('לא ניתן לטעון את היומן');
}
async function loadClientSnapshotWithRetry(){
  const payload={token:S.token,page:1,pageSize:ACTIVITY_CLIENT_LIMIT,clientSnapshot:true,sortBy:'createdAt',sortDir:'desc'};
  const snap=await callActivityReadWithRetry('activityLogQuery',payload,r=>{
    const items=r?.data?.items;
    if(!Array.isArray(items))throw Error('השרת החזיר מבנה יומן לא תקין');
  });
  return snap.data||{};
}
async function initActivityLog(){
  if(activityInitPromise)return activityInitPromise;
  activityInitPromise=(async()=>{
    try{
      $('resultCount').textContent='';
      $('indexInfo').textContent='';
      const initBody=$('activityRows');
      if(initBody && !initBody.children.length) initBody.innerHTML='<tr><td colspan="5" class="activity-empty spa-view-loading">טוען...</td></tr>';

      // First paint uses ONE Activity Log query. For logs up to 500 rows this
      // response already contains everything needed to render and build filters.
      // R17P1A: consume the Activity dataset already loaded by Application Bootstrap.
      // Only fall back to the server when bootstrap did not provide it.
      const cachedInitial=window.AppState?.getData?.('activityInitial');
      const data=(cachedInitial && Array.isArray(cachedInitial.items)) ? cachedInitial : await loadClientSnapshotWithRetry();
      const items=Array.isArray(data.items)?data.items:[];
      const total=Number(data.total||items.length||0);

      if(total<=ACTIVITY_CLIENT_LIMIT){
        activityClientMode=true;
        activityClientRows=items;
        const derived=deriveActivityFilterOptions(items);
        bootstrap={total,actions:derived.actions,types:derived.types};
        updatePagerVisibility();
        $('indexInfo').textContent=`מצב מהיר בדפדפן · אינדקסים: משתמש, פעולה, סוג ותאריך · ${activityClientRows.length} רשומות`;
        renderClientActivityLog();
        return;
      }

      // Large logs keep the existing server-paged path. Bootstrap is only
      // requested when it is actually needed.
      activityClientMode=false;
      activityClientRows=null;
      const r=await callActivityReadWithRetry('activityLogBootstrap',{token:S.token});
      bootstrap=r.data||{total};
      resetSelectOptions('actionFilter');resetSelectOptions('typeFilter');
      fillSelect('actionFilter',bootstrap.actions||[]);
      fillSelect('typeFilter',bootstrap.types||[]);
      updatePagerVisibility();
      $('indexInfo').textContent=`אינדקסים פעילים: משתמש, פעולה, סוג ותאריך · ${bootstrap.total||total} רשומות`;
      await loadActivityLog();
    }catch(e){
      const msg=String(e?.message||'לא ניתן לטעון את היומן');
      $('resultCount').textContent=msg;
      const tbody=$('activityRows');
      if(tbody)tbody.innerHTML=`<tr><td colspan="5" class="activity-empty">${esc(msg)}</td></tr>`;
      toast(msg,'error');
      clearActivityOrphanBusy(host);
    }finally{
      activityInitPromise=null;
    }
  })();
  return activityInitPromise;
}
function dateTimeISO(dateId,timeId,isEnd=false){const d=$(dateId).value;if(!d)return '';const t=$(timeId).value||(isEnd?'23:59':'00:00');const x=new Date(`${d}T${t}`);return isNaN(x)?'':x.toISOString();}
function filters(){return {token:S.token,from:dateTimeISO('fromDate','fromTime'),to:dateTimeISO('toDate','toTime',true),userQuery:String($('userFilter').value||'').trim(),logAction:$('actionFilter').value,entityType:$('typeFilter').value,sortBy,sortDir,page:currentPage,pageSize:50};}
function formatDT(v){if(!v)return '';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'});}
function setFilterOpen(open){const panel=$('filterPanel'),btn=$('filterToggle');panel.classList.toggle('open',!!open);panel.setAttribute('aria-hidden',open?'false':'true');btn.setAttribute('aria-expanded',open?'true':'false');const label=btn.querySelector('span:not(.activity-btn-icon):not(.toggle-arrow)');if(label)label.textContent=open?'הסתר סינון':'הצג סינון';}
function updateSortUI(){
  const key=String(sortBy||'createdAt'),dir=sortDir==='asc'?'asc':'desc';
  host.querySelectorAll('.activity-table thead th').forEach(th=>{th.classList.remove('sorted');th.removeAttribute('aria-sort');});
  host.querySelectorAll('.activity-sort').forEach(b=>{b.classList.remove('active');const a=b.querySelector('.sort-arrow');if(a)a.textContent='↕';});
  host.querySelectorAll('.activity-table tbody td.sorted-col').forEach(td=>{td.classList.remove('sorted-col');delete td.dataset.sortDir;});
  const activeBtn=Array.from(host.querySelectorAll('.activity-sort')).find(b=>String(b.dataset.sort)===key);
  if(!activeBtn)return;
  activeBtn.classList.add('active');
  const th=activeBtn.closest('th');
  if(th){th.classList.add('sorted');th.setAttribute('aria-sort',dir==='asc'?'ascending':'descending');}
  const arrow=activeBtn.querySelector('.sort-arrow');if(arrow)arrow.textContent=dir==='asc'?'↑':'↓';
  const columnMap={createdAt:1,user:2,action:3,entityType:4,details:5};
  const col=columnMap[key];
  if(col){
    host.querySelectorAll(`.activity-table tbody tr td:nth-child(${col})`).forEach(td=>{
      td.classList.add('sorted-col');
      td.dataset.sortDir=dir;
    });
  }

  const msb=$('mobileSortBy'),msd=$('mobileSortDir');
  if(msb)msb.value=key;
  if(msd)msd.value=dir;
}
function updatePagerVisibility(){
  const pager=host.querySelector('.activity-pager');
  if(!pager)return;
  const hide=!!activityClientMode;
  pager.hidden=hide;
  pager.style.display=hide?'none':'';
}
function updateFilterSummary(){const parts=[];if($('fromDate').value)parts.push('מתאריך');if($('toDate').value)parts.push('עד תאריך');if($('userFilter').value)parts.push('משתמש');if($('actionFilter').value)parts.push('פעולה');if($('typeFilter').value)parts.push('סוג');$('filterSummary').textContent=parts.length?`סינון פעיל: ${parts.join(' · ')}`:'ללא סינון פעיל';updateSortUI();}
function showUser(name,email){$('infoUserName').textContent=name||'משתמש';$('infoUserEmail').textContent=email||'אין כתובת אימייל';$('userInfoModal').classList.add('open');$('userInfoModal').setAttribute('aria-hidden','false');}
function closeModal(id){$(id).classList.remove('open');$(id).setAttribute('aria-hidden','true');}

function clientDateMs(idDate,idTime,isEnd=false){
  const d=$(idDate).value;if(!d)return NaN;
  const t=$(idTime).value||(isEnd?'23:59':'00:00');
  const x=new Date(`${d}T${t}`);return isNaN(x)?NaN:x.getTime();
}
function clientFilteredRows(){
  const q=String($('userFilter').value||'').trim().normalize('NFKC').toLocaleLowerCase('he');
  const action=String($('actionFilter').value||'').trim().toUpperCase();
  const type=String($('typeFilter').value||'').trim().toUpperCase();
  const fromMs=clientDateMs('fromDate','fromTime',false),toMs=clientDateMs('toDate','toTime',true);
  let list=(activityClientRows||[]).filter(x=>{
    if(q){
      const n=[x.userDisplayName,x.userName,x.name].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase('he');
      if(!n.includes(q))return false;
    }
    if(action&&String(x.action||'').toUpperCase()!==action)return false;
    if(type&&String(x.entityType||'').toUpperCase()!==type)return false;
    const ms=new Date(x.createdAt).getTime();
    if(!isNaN(fromMs)&&ms<fromMs)return false;
    if(!isNaN(toMs)&&ms>toMs)return false;
    return true;
  });
  const dir=sortDir==='asc'?1:-1;
  list.sort((a,b)=>{
    let av,bv;
    if(sortBy==='user'){av=a.userDisplayName||a.userName||'';bv=b.userDisplayName||b.userName||'';}
    else{av=a[sortBy]||'';bv=b[sortBy]||'';}
    if(sortBy==='createdAt')return ((new Date(av).getTime()||0)-(new Date(bv).getTime()||0))*dir;
    return String(av).localeCompare(String(bv),'he',{numeric:true,sensitivity:'base'})*dir;
  });
  return list;
}
function renderClientActivityLog(){
  const tbody=$('activityRows'),items=clientFilteredRows();
  lastResult={items,total:items.length,page:1,pageSize:items.length,pages:1};
  currentPage=1;
  $('resultCount').textContent=`נמצאו ${items.length} רשומות`;
  $('pageInfo').textContent='';
  $('prevPage').disabled=true;
  $('nextPage').disabled=true;
  $('clearLog').disabled=!items.length;
  tbody.innerHTML=items.map(x=>`<tr><td data-label="תאריך ושעה">${esc(formatDT(x.createdAt))}</td><td data-label="משתמש"><button class="activity-user-btn" data-user-name="${esc(x.userDisplayName)}" data-user-email="${esc(x.userEmail)}" title="${esc(x.userEmail||x.userDisplayName)}">${esc(x.userDisplayName)}</button></td><td data-label="פעולה"><span class="activity-badge">${esc(x.action||'—')}</span></td><td data-label="סוג">${esc(x.entityType||'—')}</td><td data-label="פרטים" data-wide="1" class="activity-details" title="${esc(x.details||'')}">${esc(x.details||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="activity-empty">לא נמצאו פעילויות התואמות לסינון.</td></tr>';
  updateSortUI();
  clearActivityOrphanBusy(host);
}
function refreshActivityView(options={}){
  if(activityClientMode){renderClientActivityLog();return Promise.resolve();}
  return loadActivityLog(options);
}
async function loadActivityLog(options={}){
  const tbody=$('activityRows'),panel=host.querySelector('.activity-list-panel');
  const preserve=!!options.preserve && !!lastResult;
  const seq=++loadSeq;
  if(preserve){
    panel?.classList.add('is-refreshing');
  }else{
    tbody.innerHTML='<tr><td colspan="5" class="activity-empty spa-view-loading">טוען...</td></tr>';
  }
  try{
    const r=await API.call('activityLogQuery',filters());
    if(seq!==loadSeq)return;
    if(!r?.ok)throw Error(r?.message||'שגיאה בטעינת היומן');
    lastResult=r.data||{items:[],total:0,page:1,pages:1};
    $('resultCount').textContent=`נמצאו ${lastResult.total} רשומות`;
    $('pageInfo').textContent=`עמוד ${lastResult.page} מתוך ${lastResult.pages}`;
    $('prevPage').disabled=lastResult.page<=1;
    $('nextPage').disabled=lastResult.page>=lastResult.pages;
    $('clearLog').disabled=!lastResult.total;
    tbody.innerHTML=(lastResult.items||[]).map(x=>`<tr><td data-label="תאריך ושעה">${esc(formatDT(x.createdAt))}</td><td data-label="משתמש"><button class="activity-user-btn" data-user-name="${esc(x.userDisplayName)}" data-user-email="${esc(x.userEmail)}" title="${esc(x.userEmail||x.userDisplayName)}">${esc(x.userDisplayName)}</button></td><td data-label="פעולה"><span class="activity-badge">${esc(x.action||'—')}</span></td><td data-label="סוג">${esc(x.entityType||'—')}</td><td data-label="פרטים" data-wide="1" class="activity-details" title="${esc(x.details||'')}">${esc(x.details||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="activity-empty">לא נמצאו פעילויות התואמות לסינון.</td></tr>';
    updateSortUI();
    clearActivityOrphanBusy(host);
  }catch(e){
    if(seq!==loadSeq)return;
    if(!preserve)tbody.innerHTML=`<tr><td colspan="5" class="activity-empty">${esc(e.message)}</td></tr>`;
    toast(e.message,'error');
  }finally{
    if(seq===loadSeq)panel?.classList.remove('is-refreshing');
  }
}
function formatTimeHM(value){
  const m=String(value||'').match(/^(\d{2}):(\d{2})/);
  return m?`${m[1]}:${m[2]}`:'';
}
function syncTimeDisplay(nativeId,displayId){
  const nativeEl=$(nativeId),displayEl=$(displayId);
  if(!nativeEl||!displayEl)return;
  displayEl.value=formatTimeHM(nativeEl.value);
}
function openNativePicker(nativeEl){
  if(!nativeEl)return;
  if(typeof nativeEl.showPicker==='function'){
    try{nativeEl.showPicker();return;}catch(_){}
  }
  try{nativeEl.click();}catch(_){}
}
function bindTimeDisplay(nativeId,displayId,pickerId){
  const nativeEl=$(nativeId),displayEl=$(displayId),pickerEl=$(pickerId);
  if(!nativeEl||!displayEl)return;
  const sync=()=>syncTimeDisplay(nativeId,displayId);
  const open=()=>openNativePicker(nativeEl);
  nativeEl.addEventListener('change',sync);
  nativeEl.addEventListener('input',sync);
  displayEl.addEventListener('click',open);
  pickerEl?.addEventListener('click',open);
  sync();
}

function formatDateDMY(value){
  const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:'';
}
function syncDateDisplay(nativeId,displayId){
  const nativeEl=$(nativeId),displayEl=$(displayId);
  if(!nativeEl||!displayEl)return;
  displayEl.value=formatDateDMY(nativeEl.value);
}
function bindDateDisplay(nativeId,displayId,pickerId){
  const nativeEl=$(nativeId),displayEl=$(displayId),pickerEl=$(pickerId);
  if(!nativeEl||!displayEl)return;
  const sync=()=>syncDateDisplay(nativeId,displayId);
  const open=()=>openNativePicker(nativeEl);
  nativeEl.addEventListener('change',sync);
  nativeEl.addEventListener('input',sync);
  displayEl.addEventListener('click',open);
  pickerEl?.addEventListener('click',open);
  sync();
}

function runInteractiveUserSearch(){
  clearTimeout(userSearchTimer);
  currentPage=1;
  updateFilterSummary();
  if(activityClientMode){renderClientActivityLog();return;}
  userSearchTimer=setTimeout(async()=>{await loadActivityLog({preserve:true});},150);
}
bindDateDisplay('fromDate','fromDateDisplay','fromDatePicker');
bindDateDisplay('toDate','toDateDisplay','toDatePicker');
bindTimeDisplay('fromTime','fromTimeDisplay','fromTimePicker');
bindTimeDisplay('toTime','toTimeDisplay','toTimePicker');
const userFilterEl=$('userFilter');
userFilterEl.addEventListener('input',runInteractiveUserSearch);
userFilterEl.addEventListener('search',runInteractiveUserSearch);
userFilterEl.addEventListener('change',runInteractiveUserSearch);

function bindDefaultTime(dateId,timeId,defaultTime){
  $(dateId).addEventListener('change',()=>{
    if($(dateId).value && !$(timeId).value){
      $(timeId).value=defaultTime;
      syncTimeDisplay(timeId,timeId==='fromTime'?'fromTimeDisplay':'toTimeDisplay');
    }
  });
}
bindDefaultTime('fromDate','fromTime','00:00');
bindDefaultTime('toDate','toTime','23:59');

['fromDate','fromTime','toDate','toTime','actionFilter','typeFilter'].forEach(id=>{
  $(id)?.addEventListener('change',()=>{
    if(activityClientMode){currentPage=1;updateFilterSummary();renderClientActivityLog();}
  });
});
$('filterToggle').onclick=()=>setFilterOpen(!$('filterPanel').classList.contains('open'));$('filterClose').onclick=()=>setFilterOpen(false);
$('applyFilters').onclick=()=>{currentPage=1;updateFilterSummary();setFilterOpen(false);refreshActivityView();};$('resetFilters').onclick=()=>{clearTimeout(userSearchTimer);['fromDate','fromTime','toDate','toTime','userFilter','actionFilter','typeFilter'].forEach(id=>$(id).value='');syncDateDisplay('fromDate','fromDateDisplay');syncDateDisplay('toDate','toDateDisplay');syncTimeDisplay('fromTime','fromTimeDisplay');syncTimeDisplay('toTime','toTimeDisplay');currentPage=1;updateFilterSummary();refreshActivityView();};
$('mobileSortBy')?.addEventListener('change',()=>{
  sortBy=$('mobileSortBy').value||'createdAt';
  sortDir=$('mobileSortDir').value||'desc';
  currentPage=1;updateSortUI();refreshActivityView({preserve:true});
});
$('mobileSortDir')?.addEventListener('change',()=>{
  sortDir=$('mobileSortDir').value==='asc'?'asc':'desc';
  currentPage=1;updateSortUI();refreshActivityView({preserve:true});
});
$('prevPage').onclick=()=>{if(currentPage>1){currentPage--;refreshActivityView({preserve:true});}};$('nextPage').onclick=()=>{if(lastResult&&currentPage<lastResult.pages){currentPage++;refreshActivityView({preserve:true});}};
host.querySelectorAll('.activity-sort').forEach(b=>b.onclick=()=>{const key=b.dataset.sort;if(sortBy===key)sortDir=sortDir==='asc'?'desc':'asc';else{sortBy=key;sortDir='asc';}currentPage=1;updateSortUI();refreshActivityView({preserve:true});});
$('activityRows').addEventListener('click',e=>{const b=e.target.closest('.activity-user-btn');if(b)showUser(b.dataset.userName,b.dataset.userEmail);});$('closeUserInfo').onclick=()=>closeModal('userInfoModal');$('userInfoModal').onclick=e=>{if(e.target===$('userInfoModal'))closeModal('userInfoModal');};
$('clearLog').onclick=()=>{if(!lastResult?.total)return;$('clearLogText').textContent=`יימחקו ${lastResult.total} הרשומות התואמות לסינון הנוכחי.`;$('clearLogModal').classList.add('open');$('clearLogModal').setAttribute('aria-hidden','false');};$('cancelClear').onclick=()=>closeModal('clearLogModal');$('clearLogModal').onclick=e=>{if(e.target===$('clearLogModal'))closeModal('clearLogModal');};$('confirmClear').onclick=async()=>{const b=$('confirmClear');b.disabled=true;const old=b.textContent;b.textContent='מוחק...';try{const payload=filters();delete payload.page;delete payload.pageSize;delete payload.sortBy;delete payload.sortDir;const r=await API.call('clearActivityLogFiltered',payload);if(!r?.ok)throw Error(r?.message||'לא ניתן לנקות את היומן');closeModal('clearLogModal');toast(`${r.data?.deleted||0} רשומות נמחקו`,'success');currentPage=1;await initAfterClear();}catch(e){toast(e.message,'error');}finally{b.disabled=false;b.textContent=old;}};
async function initAfterClear(){
  const data=await loadClientSnapshotWithRetry();
  const items=Array.isArray(data.items)?data.items:[];
  const total=Number(data.total||items.length||0);

  if(total<=ACTIVITY_CLIENT_LIMIT){
    activityClientMode=true;
    activityClientRows=items;
    const derived=deriveActivityFilterOptions(items);
    bootstrap={total,actions:derived.actions,types:derived.types};
    updatePagerVisibility();
    $('indexInfo').textContent=`מצב מהיר בדפדפן · אינדקסים: משתמש, פעולה, סוג ותאריך · ${activityClientRows.length} רשומות`;
    renderClientActivityLog();
    return;
  }

  activityClientMode=false;
  activityClientRows=null;
  const r=await callActivityReadWithRetry('activityLogBootstrap',{token:S.token});
  if(r?.ok){
    bootstrap=r.data||bootstrap||{total};
    resetSelectOptions('actionFilter');resetSelectOptions('typeFilter');
    fillSelect('actionFilter',bootstrap.actions||[]);
    fillSelect('typeFilter',bootstrap.types||[]);
    updatePagerVisibility();
    $('indexInfo').textContent=`אינדקסים פעילים: משתמש, פעולה, סוג ותאריך · ${bootstrap.total||total} רשומות`;
  }
  await loadActivityLog();
}

    }catch(e){
      console.error('Activity Native SPA init:',e);
      host.innerHTML='<section class="section"><div class="card"><h1>יומן פעילויות</h1><p class="error">לא ניתן לטעון את יומן הפעילויות.</p></div></section>';
    }
  }
  global.SPAActivity={mount};
})(window);
