/* Family Photo Album V3.5.8 - Advanced Session Manager */
(function(){
  "use strict";

  const KEY = "familyPhotoAlbumSession";
  const DEFAULT_MINUTES = 60;
  const REMEMBER_DAYS = 7;
  const WARNING_MINUTES = 5;
  let timer = null;
  let warningTimer = null;
  let lastActivityUpdate = 0;

  function read(){
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch(e){ return null; }
  }
  function write(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function clear(){ localStorage.removeItem(KEY); localStorage.removeItem("familyAlbumSession"); }

  function getSession(){
    const s=read();
    if(!s || !s.user || !s.token || !s.expiresAt) return null;
    if(Date.now() >= Number(s.expiresAt)){ clear(); return null; }
    return s;
  }

  function start(user, token, remember){
    const ttl = remember ? REMEMBER_DAYS*86400000 : DEFAULT_MINUTES*60000;
    const s={user:user, token:token, remember:!!remember, createdAt:Date.now(), lastActivityAt:Date.now(), expiresAt:Date.now()+ttl};
    write(s);
    schedule();
    return s;
  }

  function touch(){
    const s=getSession();
    if(!s) return false;
    // Avoid excessive writes while the user is actively using the site.
    if(Date.now()-lastActivityUpdate < 30000) return true;
    const ttl=s.remember ? REMEMBER_DAYS*86400000 : DEFAULT_MINUTES*60000;
    s.lastActivityAt=Date.now();
    s.expiresAt=Date.now()+ttl;
    write(s);
    lastActivityUpdate=Date.now();
    schedule();
    return true;
  }

  function logout(){
    clear();
    if(timer) clearTimeout(timer);
    if(warningTimer) clearTimeout(warningTimer);
    timer=warningTimer=null;
    // Always return to the same mandatory login experience used on first entry.
    if(!/^(index|login)\\.html$/i.test(location.pathname.split("/").pop() || "")){
      location.replace("index.html?autoLogin=1&loginRequired=1");
    }
  }

  function remaining(){
    const s=getSession();
    return s ? Math.max(0, s.expiresAt-Date.now()) : 0;
  }

  function fmt(ms){
    let sec=Math.max(0,Math.ceil(ms/1000));
    const m=Math.floor(sec/60); sec%=60;
    return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
  }

  function showWarning(){
    if(document.getElementById("session-expiry-warning")) return;
    const box=document.createElement("div");
    box.id="session-expiry-warning";
    box.innerHTML='<div class="sem-card"><div class="sem-title">החיבור עומד לפוג</div><div class="sem-text">החיבור שלך יסתיים בעוד <strong id="sem-countdown">05:00</strong>.</div><div class="sem-actions"><button id="sem-continue">המשך לעבוד</button><button id="sem-logout">יציאה</button></div></div>';
    document.body.appendChild(box);
    const update=()=>{
      const r=remaining();
      const el=document.getElementById("sem-countdown");
      if(el) el.textContent=fmt(r);
      if(!r){ box.remove(); return; }
      if(r>WARNING_MINUTES*60000){ box.remove(); return; }
      setTimeout(update,1000);
    };
    update();
    document.getElementById("sem-continue").onclick=()=>{ touch(); box.remove(); };
    document.getElementById("sem-logout").onclick=()=>{ logout(); location.href="index.html"; };
  }

  function schedule(){
    if(timer) clearTimeout(timer);
    if(warningTimer) clearTimeout(warningTimer);
    const s=getSession();
    if(!s) return;
    const r=s.expiresAt-Date.now();
    if(r<=0){ logout(); return; }
    warningTimer=setTimeout(showWarning, Math.max(0,r-WARNING_MINUTES*60000));
    timer=setTimeout(()=>{
      if(getSession()){ logout(); location.href="index.html?sessionExpired=1"; }
    }, r+50);
  }

  // User activity extends the idle Session, subject to a 30s write throttle.
  ["click","keydown","mousemove","scroll","touchstart"].forEach(ev=>{
    document.addEventListener(ev, ()=>{ if(getSession()) touch(); }, {passive:true});
  });
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) { if(!getSession()) guard(); else touch(); }});
  window.addEventListener("storage", ()=>{ if(!getSession() && location.pathname.toLowerCase().includes("dashboard")) guard(); });

  function guard(){
    if(getSession()) return true;
    const current=location.pathname.split("/").pop() || "index.html";
    if(!/^(index|login)\.html$/i.test(current)){
      location.href="index.html?loginRequired=1&return="+encodeURIComponent(current+location.search);
    }
    return false;
  }

  window.SessionManager={getSession,start,touch,logout,remaining,formatRemaining:fmt,guard,schedule};
  window.getSession=getSession;
  window.logout=logout;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{ guard(); schedule(); });
  else { guard(); schedule(); }
})();