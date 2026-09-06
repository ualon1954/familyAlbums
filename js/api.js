const API = {
  CACHE_PREFIX:"FPA_R7_CACHE_",
  _inflight:new Map(),
  _readActions:new Set(["albums","album","photos","albumView","dashboard","favorites","trash","apiVersion","adminPageBootstrap","adminPermissionsBootstrap","listUsers","getPermissions"]),
  cacheKey(action,key=""){
    const s=getSession?.();
    const uid=String(s?.user?.id||s?.user?.email||"anon");
    return this.CACHE_PREFIX+uid+"_"+action+"_"+String(key||"");
  },
  cacheGet(action,key="",maxAgeMs=60000){
    try{
      const raw=sessionStorage.getItem(this.cacheKey(action,key));
      if(!raw)return null;
      const x=JSON.parse(raw);
      if(!x||!x.ts||Date.now()-x.ts>maxAgeMs){sessionStorage.removeItem(this.cacheKey(action,key));return null;}
      return x.value;
    }catch(e){return null;}
  },
  cacheSet(action,key="",value){
    try{sessionStorage.setItem(this.cacheKey(action,key),JSON.stringify({ts:Date.now(),value}));}catch(e){}
    return value;
  },
  cacheAge(action,key=""){
    try{const raw=sessionStorage.getItem(this.cacheKey(action,key));if(!raw)return Infinity;const x=JSON.parse(raw);return x?.ts?Math.max(0,Date.now()-x.ts):Infinity;}catch(e){return Infinity;}
  },
  cacheRemove(action,key=""){
    try{sessionStorage.removeItem(this.cacheKey(action,key));}catch(e){}
  },
  cacheClear(){
    try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith(this.CACHE_PREFIX))sessionStorage.removeItem(k);}}catch(e){}
  },
  recordTiming(action,clientMs,result){
    const entry={action,clientMs:Math.round(clientMs),serverMs:Number(result?.meta?.serverMs)||0,at:new Date().toISOString()};
    try{
      const key="FPA_API_TIMINGS";
      const list=JSON.parse(sessionStorage.getItem(key)||"[]");
      list.push(entry);while(list.length>30)list.shift();sessionStorage.setItem(key,JSON.stringify(list));
    }catch(e){}
    if(window.APP_CONFIG?.DEBUG_PERFORMANCE) console.info("[API timing]",entry);
    if(result&&typeof result==="object")result.clientTimingMs=entry.clientMs;
  },
  requestKey(action,data={},method="POST"){
    if(!this._readActions.has(action))return "";
    try{return method+"|"+action+"|"+JSON.stringify(data,Object.keys(data).sort());}catch(e){return "";}
  },
  async call(action,data={},method="POST"){
    const url=window.APP_CONFIG?.API_URL;
    if(!url || url.includes("PASTE_")) throw new Error("יש להגדיר API_URL בקובץ config.js");
    const inflightKey=this.requestKey(action,data,method);
    if(inflightKey&&this._inflight.has(inflightKey))return this._inflight.get(inflightKey);
    const task=(async()=>{
      const t0=performance.now();
      let result;
      if(method==="GET"){
        const qs=new URLSearchParams({action,...data});
        const r=await fetch(url+"?"+qs.toString());
        result=await r.json();
      }else{
        const r=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...data})});
        result=await r.json();
      }
      this.recordTiming(action,performance.now()-t0,result);
      if(!result || typeof result!=="object") throw new Error("השרת החזיר תשובה לא תקינה");
      return result;
    })();
    if(inflightKey)this._inflight.set(inflightKey,task);
    try{return await task;}finally{if(inflightKey)this._inflight.delete(inflightKey);}
  },
  prefetchAlbumView(albumId,maxAgeMs=60000){
    albumId=String(albumId||"").trim();
    const s=getSession?.();
    if(!albumId||!s?.token||this.cacheGet("albumView",albumId,maxAgeMs))return Promise.resolve(null);
    return this.call("albumView",{albumId,token:s.token},"POST").then(r=>{if(r?.ok&&r.data)this.cacheSet("albumView",albumId,r.data);return r;}).catch(()=>null);
  },
  async health(){
    const url=window.APP_CONFIG?.API_URL;
    if(!url || url.includes("PASTE_")) throw new Error("יש להגדיר API_URL בקובץ config.js");
    const t0=performance.now();
    const r=await fetch(url+"?action=apiVersion&t="+Date.now(),{cache:"no-store"});
    const result=await r.json();this.recordTiming("apiVersion",performance.now()-t0,result);return result;
  },
  timings(){try{return JSON.parse(sessionStorage.getItem("FPA_API_TIMINGS")||"[]");}catch(e){return[];}},
  lastUploadDiagnostic(){try{return JSON.parse(sessionStorage.getItem("FPA_LAST_UPLOAD_DIAGNOSTIC")||"null");}catch(e){return null;}},
  session(){return getSession()},
  token(){return getSession()?.token||""}
};
