const API = {
  async call(action,data={},method="POST"){
    const url=window.APP_CONFIG?.API_URL;
    if(!url || url.includes("PASTE_")) throw new Error("יש להגדיר API_URL בקובץ config.js");
    if(method==="GET"){
      const qs=new URLSearchParams({action,...data});
      const r=await fetch(url+"?"+qs.toString());
      return await r.json();
    }
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action,...data})});
    const result=await r.json();
    if(!result || typeof result!=="object") throw new Error("השרת החזיר תשובה לא תקינה");
    return result;
  },
  async health(){
    const url=window.APP_CONFIG?.API_URL;
    if(!url || url.includes("PASTE_")) throw new Error("יש להגדיר API_URL בקובץ config.js");
    const r=await fetch(url+"?action=apiVersion&t="+Date.now(),{cache:"no-store"});
    return await r.json();
  },
  session(){return getSession()},
  token(){return getSession()?.token||""}
};
