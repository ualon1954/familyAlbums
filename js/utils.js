function getSession(){
  try{
    if(window.SessionManager && typeof window.SessionManager.getSession==="function"){
      return window.SessionManager.getSession();
    }
    return JSON.parse(localStorage.getItem("familyPhotoAlbumSession")||"null");
  }catch(e){ return null; }
}
function requireLogin(role){
  const s=getSession();
  if(!s||!s.user||!s.token){
    location.replace("index.html?autoLogin=1&loginRequired=1");
    return null;
  }
  if(role&&s.user.role!==role){
    location.replace("dashboard.html");
    return null;
  }
  return s;
}
function logout(){
  if(window.SessionManager && typeof window.SessionManager.logout==="function"){
    window.SessionManager.logout();
    return;
  }
  localStorage.removeItem("familyPhotoAlbumSession");
  localStorage.removeItem("familyAlbumSession");
  location.replace("index.html?autoLogin=1");
}

// Shared UI helpers used by all pages.
function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
function toast(message, type){
  let el=document.getElementById('toast');
  if(!el){
    el=document.createElement('div');
    el.id='toast';
    el.className='toast';
    document.body.appendChild(el);
  }
  el.textContent=String(message ?? '');
  el.classList.add('show');
  clearTimeout(window.__familyToastTimer);
  window.__familyToastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}
