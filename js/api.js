const API = {
  CACHE_PREFIX:"FPA_R7_CACHE_",
  _inflight:new Map(),
  _readActions:new Set(["albums","album","photos","albumView","dashboard","favorites","trash","apiVersion","adminPageBootstrap","adminPermissionsBootstrap","listUsers","getPermissions","activityLogInitial","activityLogUsersLite","activityLogBootstrap","activityLogQuery","photosAllPage","albumPhotoCounts","homeAlbums","spaBootstrap","feedback"]),
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
  cacheSet(action,key="",value){try{sessionStorage.setItem(this.cacheKey(action,key),JSON.stringify({ts:Date.now(),value}));}catch(e){}return value;},
  cacheAge(action,key=""){try{const raw=sessionStorage.getItem(this.cacheKey(action,key));if(!raw)return Infinity;const x=JSON.parse(raw);return x?.ts?Math.max(0,Date.now()-x.ts):Infinity;}catch(e){return Infinity;}},
  cacheRemove(action,key=""){try{sessionStorage.removeItem(this.cacheKey(action,key));}catch(e){}},
  cacheClear(){try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith(this.CACHE_PREFIX))sessionStorage.removeItem(k);}}catch(e){}},
  requestKey(action,data={},method="POST"){
    if(!this._readActions.has(action))return "";
    try{return method+"|"+action+"|"+JSON.stringify(data,Object.keys(data).sort());}catch(e){return "";}
  },
  requestId(){return "r16z5t_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,11);},
  isLocalOrigin(){try{return ["127.0.0.1","localhost"].includes(String(location.hostname||"").toLowerCase());}catch(e){return false;}},
  isTransportError(e){return !!e&&["API_TRANSPORT","API_BRIDGE_TIMEOUT","API_JSONP_TIMEOUT"].includes(String(e.code||""));},
  async _fetchJson(url,options,action){
    let r;
    try{r=await fetch(url,Object.assign({},options||{},{cache:"no-store"}));}
    catch(cause){
      const err=new Error("לא ניתן להתחבר לשרת. ייתכן שחיבור ה-Web App נחסם או שפג תוקף הפרסום.");
      err.code="API_TRANSPORT";err.cause=cause;
      try{sessionStorage.setItem("FPA_LAST_API_ERROR",JSON.stringify({action,transport:true,message:String(cause?.message||cause),at:new Date().toISOString()}));}catch(_){}
      throw err;
    }
    const text=await r.text(),trimmed=String(text||"").trim();
    if(!trimmed)throw new Error("השרת החזיר תשובה ריקה");
    if(trimmed[0]==="<"){
      const err=new Error("השרת החזיר דף HTML במקום JSON. יש לבדוק את פרסום ה-Web App וההרשאות.");
      err.code="API_HTML_RESPONSE";err.httpStatus=r.status;err.finalUrl=r.url;
      try{sessionStorage.setItem("FPA_LAST_API_ERROR",JSON.stringify({action,status:r.status,url:r.url,html:true,at:new Date().toISOString()}));}catch(_){}
      throw err;
    }
    try{return JSON.parse(trimmed);}catch(parseErr){const err=new Error("תשובת השרת אינה JSON תקין");err.code="API_INVALID_JSON";err.httpStatus=r.status;throw err;}
  },
  _jsonp(action,data={},timeoutMs=22000){
    const url=window.APP_CONFIG?.API_URL;
    return new Promise((resolve,reject)=>{
      const cb="__fpa_jsonp_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
      const script=document.createElement("script");let done=false;
      const cleanup=()=>{if(done)return;done=true;clearTimeout(timer);window[cb]=()=>{};setTimeout(()=>{try{delete window[cb];}catch(_){window[cb]=undefined;}},60000);script.remove();};
      window[cb]=(payload)=>{cleanup();resolve(payload);};
      const qs=new URLSearchParams({action,...(data||{}),callback:cb,t:String(Date.now())});
      script.src=url+"?"+qs.toString();script.async=true;
      script.onerror=()=>{cleanup();const e=new Error("לא ניתן לטעון נתונים מהשרת גם במסלול הגיבוי.");e.code="API_JSONP_TIMEOUT";reject(e);};
      const timer=setTimeout(()=>{cleanup();const e=new Error("שרת הנתונים לא החזיר תשובה בזמן.");e.code="API_JSONP_TIMEOUT";reject(e);},timeoutMs);
      document.head.appendChild(script);
    });
  },
  _postBridge(payload,timeoutMs=35000){
    const url=window.APP_CONFIG?.API_URL,requestId=String(payload?.requestId||"");
    return new Promise((resolve,reject)=>{
      const frameName="fpa_api_bridge_"+Math.random().toString(36).slice(2),iframe=document.createElement("iframe"),form=document.createElement("form");
      iframe.name=frameName;iframe.style.display="none";iframe.setAttribute("aria-hidden","true");
      form.method="POST";form.action=url;form.target=frameName;form.style.display="none";
      const add=(name,value)=>{const i=document.createElement("input");i.type="hidden";i.name=name;i.value=String(value??"");form.appendChild(i);};
      add("bridge","1");add("requestId",requestId);add("payload",JSON.stringify(payload));
      let finished=false,pollTimer=null,pollBusy=false;
      const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(pollTimer);window.removeEventListener("message",onMessage);setTimeout(()=>{iframe.remove();form.remove();},0);};
      const finishOk=(value)=>{if(finished)return;cleanup();resolve(value);};
      const onMessage=(ev)=>{const m=ev?.data;if(!m||m.type!=="FPA_API_BRIDGE"||String(m.requestId||"")!==requestId)return;finishOk(m.payload);};
      const poll=async()=>{
        if(finished||pollBusy)return;
        pollBusy=true;
        try{
          const r=await this._jsonp("bridgeResult",{requestId},7000);
          if(r&&!(r.ok===true&&r.data&&r.data.pending===true))return finishOk(r);
        }catch(_e){}
        finally{pollBusy=false;}
        if(!finished)pollTimer=setTimeout(poll,1500);
      };
      window.addEventListener("message",onMessage);
      document.body.appendChild(iframe);document.body.appendChild(form);
      const timer=setTimeout(()=>{cleanup();const e=new Error("לא התקבל אישור מהשרת. יש לבדוק שה-Web App פורסם מהגרסה R16Z5T ושהגישה לפריסה פתוחה למשתמשים המתאימים.");e.code="API_BRIDGE_TIMEOUT";reject(e);},timeoutMs);
      form.submit();
      // R17P2J: give the POST response a chance to return directly via postMessage.
      // Starting bridgeResult JSONP while uploadPhoto is still running creates a second Apps Script
      // execution and was adding several seconds of transport overhead on localhost.
      pollTimer=setTimeout(poll,4500);
    });
  },
  async call(action,data={},method="POST"){
    const url=window.APP_CONFIG?.API_URL;
    if(!url||url.includes("PASTE_"))throw new Error("יש להגדיר API_URL בקובץ config.js");
    const inflightKey=this.requestKey(action,data,method);
    if(inflightKey&&this._inflight.has(inflightKey))return this._inflight.get(inflightKey);
    const task=(async()=>{
      let result;
      if(method==="GET"){
        const qs=new URLSearchParams({action,...(data||{}),t:String(Date.now())});
        // Apps Script can omit CORS headers on redirects. On localhost use JSONP
        // directly for reads instead of producing a predictable CORS error first.
        if(this.isLocalOrigin()) result=await this._jsonp(action,data);
        else{
          try{result=await this._fetchJson(url+"?"+qs.toString(),{},action);}catch(e){if(!this.isTransportError(e))throw e;result=await this._jsonp(action,data);}
        }
      }else{
        const payload={action,...data,requestId:this.requestId()};
        // R16Z5T: localhost writes/login use a real form POST + persistent result polling.
        // A form navigation is not subject to fetch CORS and keeps credentials out
        // of the URL. This also removes the red CORS errors seen on the login page.
        if(this.isLocalOrigin()) result=await this._postBridge(payload);
        else{
          try{result=await this._fetchJson(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)},action);}
          catch(e){
            if(this.isTransportError(e)){
              if(this._readActions.has(action))result=await this._jsonp(action,data);
              else result=await this._postBridge(payload);
            }else throw e;
          }
        }
      }
      if(!result||typeof result!=="object")throw new Error("השרת החזיר תשובה לא תקינה");
      return result;
    })();
    if(inflightKey)this._inflight.set(inflightKey,task);
    try{return await task;}finally{if(inflightKey)this._inflight.delete(inflightKey);}
  },
  prefetchAlbumView(albumId,maxAgeMs=60000){albumId=String(albumId||"").trim();const s=getSession?.();if(!albumId||!s?.token||this.cacheGet("albumView",albumId,maxAgeMs))return Promise.resolve(null);return this.call("albumView",{albumId,token:s.token},"GET").then(r=>{if(r?.ok&&r.data)this.cacheSet("albumView",albumId,r.data);return r;}).catch(()=>null);},
  async health(){const url=window.APP_CONFIG?.API_URL;if(!url||url.includes("PASTE_"))throw new Error("יש להגדיר API_URL בקובץ config.js");let result;if(this.isLocalOrigin())result=await this._jsonp("apiVersion",{});else{try{result=await this._fetchJson(url+"?action=apiVersion&t="+Date.now(),{},"apiVersion");}catch(e){if(!this.isTransportError(e))throw e;result=await this._jsonp("apiVersion",{});}}return result;},
  session(){return getSession()},token(){return getSession()?.token||""}
};

// R17DIAG2: expose shared API singleton to SPA modules.
if (typeof window !== "undefined") window.API = API;
