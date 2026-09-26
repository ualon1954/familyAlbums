function ensureFavicon(){
  if(document.querySelector('link[rel~="icon"]'))return;
  const icon=document.createElement("link");
  icon.rel="icon"; icon.type="image/x-icon"; icon.href="favicon.ico";
  document.head.appendChild(icon);
}
ensureFavicon();

function mountLayout(active=""){
  const top=document.querySelector(".top");
  const nav=document.querySelector("#nav");
  if(!top||!nav)return;

  const brand=top.querySelector(".brand");
  if(brand){
    brand.innerHTML='<span class="brand-mark" aria-hidden="true"><span class="brand-heart">♥</span></span><span class="brand-name"><span class="brand-name-main">אלבומים</span><span class="brand-name-accent">משפחתיים</span></span>';
    brand.setAttribute("aria-label","אלבומים משפחתיים – דף הבית");
  }

  const user=getSession()?.user;
  const userRole=String(user?.role||"").toUpperCase();
  const isAdmin=userRole==="ADMIN";
  const canUseTrash=isAdmin||userRole==="FAMILY";
  const isSpaShell=!!document.querySelector("#spaOutlet") || /\/(?:index|spa-preview)\.html$/i.test(location.pathname) || /\/frontend\/?$/i.test(location.pathname);
  const navItems=isSpaShell ? [
    ["#/home","ראשי","home"],
    ["#/dashboard","לוח בקרה","dashboard"],
    ["#/albums","אלבומים","albums"],
    ["#/favorites","מועדפים","favorites"],
    ["#/about","אודות","about"]
  ] : [
    ["index.html#/home","ראשי","home"],
    ["index.html#/dashboard","לוח בקרה","dashboard"],
    ["index.html#/albums","אלבומים","albums"],
    ["index.html#/favorites","מועדפים","favorites"],
    ["index.html#/about","אודות","about"]
  ];
  if(isAdmin||userRole==="FAMILY") navItems.push([isSpaShell?"#/feedback":"index.html#/feedback","מעקב","feedback"]);
  if(canUseTrash) navItems.push([isSpaShell?"#/trash":"index.html#/trash","סל מחזור","trash"]);
  if(isAdmin){
    navItems.push([isSpaShell?"#/activity":"index.html#/activity","יומן פעילויות","activityLog"]);
    navItems.push([isSpaShell?"#/admin":"index.html#/admin","ניהול","admin"]);
  }
  nav.innerHTML=navItems.map(x=>`<a class="${active===x[2]?"active":""}" href="${x[0]}">${x[1]}</a>`).join("");

  // R15V: normalize header actions on every page.
  // Some older pages have theme as a direct child and others have an .actions wrapper.
  let actions=top.querySelector(".actions");
  if(!actions){
    actions=document.createElement("div");
    actions.className="actions";
    top.appendChild(actions);
  }

  // Move any direct theme button into the shared actions area.
  [...top.children].forEach(el=>{
    if(el===actions)return;
    if(el.tagName==="BUTTON" && /toggleTheme\s*\(/i.test(String(el.getAttribute("onclick")||""))){
      actions.appendChild(el);
    }
  });

  top.querySelectorAll("#adminLink").forEach(el=>el.remove());
  top.querySelectorAll(".login-open").forEach(el=>el.remove());

  // Remove legacy logout buttons so there is exactly one logout control.
  top.querySelectorAll("button").forEach(btn=>{
    const label=(btn.textContent||"").trim();
    const onclick=String(btn.getAttribute("onclick")||"");
    if(btn.classList.contains("header-logout") || label==="יציאה" || /logout\s*\(/i.test(onclick)){
      btn.remove();
    }
  });

  // Ensure the theme control is first, and logout is the final toolbar control.
  let themeBtn=actions.querySelector('button[onclick*="toggleTheme"]') || actions.querySelector('[data-theme-toggle]');
  if(!themeBtn){ themeBtn=document.createElement("button"); themeBtn.type="button"; themeBtn.textContent="◐"; actions.prepend(themeBtn); }
  themeBtn.removeAttribute("onclick");
  themeBtn.dataset.themeToggle="1";
  themeBtn.setAttribute("aria-label","החלפת מצב תצוגה");
  if(!themeBtn.__familyThemeBound){
    themeBtn.__familyThemeBound=true;
    themeBtn.addEventListener("click",()=>{
      if(typeof window.toggleTheme==="function") window.toggleTheme();
      else{
        document.documentElement.classList.toggle("dark");
        try{localStorage.setItem("familyTheme",document.documentElement.classList.contains("dark")?"dark":"light");}catch(_){}
      }
    });
  }

  if(user){
    const logoutBtn=document.createElement("button");
    logoutBtn.type="button";
    logoutBtn.className="header-logout";
    logoutBtn.textContent="יציאה";
    logoutBtn.setAttribute("aria-label","יציאה מהמערכת");
    logoutBtn.addEventListener("click",()=>{
      if(typeof window.logout==="function") window.logout();
      else if(window.SessionManager?.logout) SessionManager.logout();
    });
    actions.appendChild(logoutBtn);
  }

  // One consistent signed-in user identity on every page.
  let headerUser=top.querySelector(".header-user");
  if(!headerUser){
    headerUser=document.createElement("div");
    headerUser.className="header-user";
    headerUser.setAttribute("aria-label","המשתמש המחובר");
    if(actions) actions.insertAdjacentElement("beforebegin",headerUser);
    else nav.insertAdjacentElement("afterend",headerUser);
  }
  if(user){
    const displayName=String(user.name||user.email||"משתמש").trim();
    const initial=(displayName.charAt(0)||"U").toUpperCase();
    headerUser.innerHTML=`<span class="header-user-avatar" aria-hidden="true">${esc(initial)}</span><span class="header-user-copy"><small>מחובר</small><strong title="${esc(displayName)}">${esc(displayName)}</strong></span>`;
    headerUser.hidden=false;
  }else{
    headerUser.hidden=true;
  }

  const pageNames={
    home:"ראשי",
    dashboard:"לוח בקרה",
    albums:"אלבומים",
    favorites:"מועדפים",
    about:"אודות",
    trash:"סל מחזור",
    activityLog:"יומן פעילויות",
    admin:"ניהול"
  };
  let mobilePageName=top.querySelector(".mobile-page-name");
  if(!mobilePageName){
    mobilePageName=document.createElement("span");
    mobilePageName.className="mobile-page-name";
    mobilePageName.setAttribute("aria-current","page");
    nav.insertAdjacentElement("beforebegin",mobilePageName);
  }
  const path=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  const currentLabel=path==="admin.html"?"ניהול":(path==="album.html"?"אלבום":(pageNames[active]||""));
  mobilePageName.textContent=currentLabel;

  let menuBtn=top.querySelector(".menu-toggle");
  if(!menuBtn){
    menuBtn=document.createElement("button");
    menuBtn.className="menu-toggle";
    menuBtn.type="button";
    menuBtn.setAttribute("aria-label","פתיחת תפריט");
    menuBtn.setAttribute("aria-expanded","false");
    const menuClosedIcon='☰';
    const menuOpenIcon='<span class="menu-close-text" aria-hidden="true">×</span>';
    menuBtn.innerHTML=menuClosedIcon;
    top.insertBefore(menuBtn,nav);
    menuBtn.addEventListener("click",()=>{
      const open=nav.classList.toggle("mobile-open");
      menuBtn.classList.toggle("open",open);
      menuBtn.setAttribute("aria-expanded",String(open));
      menuBtn.innerHTML=open?menuOpenIcon:menuClosedIcon;
    });
    nav.addEventListener("click",e=>{
      if(e.target.closest("a")){
        nav.classList.remove("mobile-open");
        menuBtn.classList.remove("open");
        menuBtn.setAttribute("aria-expanded","false");
        menuBtn.innerHTML=menuClosedIcon;
      }
    });
  }



  // R16Z: background dashboard prefetch disabled; page loads must not compete for Apps Script executions.

  const userEl=document.querySelector("#userName");
  if(userEl)userEl.textContent=user?user.name:"אורח";
}

/* Navigation safety fix: Albums must always open the albums list, never Admin. */
(function () {
  function fixAlbumsNavigation() {
    if (document.querySelector("#spaOutlet") || /\/(?:index|spa-preview)\.html$/i.test(location.pathname) || /\/frontend\/?$/i.test(location.pathname)) return;
    document.querySelectorAll('a[href="admin.html"], a[data-href="admin.html"]').forEach(function (a) {
      var label = (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (label.indexOf('אלבומים') !== -1 && label.indexOf('ניהול') === -1) {
        if (a.hasAttribute('href')) a.setAttribute('href', 'index.html#/albums');
        if (a.hasAttribute('data-href')) a.setAttribute('data-href', 'index.html#/albums');
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAlbumsNavigation);
  } else {
    fixAlbumsNavigation();
  }
  new MutationObserver(fixAlbumsNavigation).observe(document.documentElement, {childList:true, subtree:true});
})();
