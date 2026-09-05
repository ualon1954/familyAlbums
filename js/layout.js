function mountLayout(active=""){
  const top=document.querySelector(".top");
  const nav=document.querySelector("#nav");
  if(!top||!nav)return;

  const brand=top.querySelector(".brand");
  if(brand){
    brand.innerHTML='<span class="brand-mark" aria-hidden="true"><span class="brand-heart">♥</span></span><span class="brand-name">אלבום</span>';
    brand.setAttribute("aria-label","אלבום משפחתי – דף הבית");
  }

  const navItems=[
    ["index.html","ראשי","home"],
    ["dashboard.html","לוח בקרה","dashboard"],
    ["albums.html","אלבומים","albums"],
    ["favorites.html","מועדפים","favorites"],
    ["about.html","אודות","about"]
  ];
  const user=getSession()?.user;
  if(user?.role==="ADMIN") navItems.push(["trash.html","סל מחזור","trash"]);
  nav.innerHTML=navItems.map(x=>`<a class="${active===x[2]?"active":""}" href="${x[0]}">${x[1]}</a>`).join("");

  let menuBtn=top.querySelector(".menu-toggle");
  if(!menuBtn){
    menuBtn=document.createElement("button");
    menuBtn.className="menu-toggle";
    menuBtn.type="button";
    menuBtn.setAttribute("aria-label","פתיחת תפריט");
    menuBtn.setAttribute("aria-expanded","false");
    menuBtn.innerHTML="☰";
    top.insertBefore(menuBtn,nav);
    menuBtn.addEventListener("click",()=>{
      const open=nav.classList.toggle("mobile-open");
      menuBtn.classList.toggle("open",open);
      menuBtn.setAttribute("aria-expanded",String(open));
      menuBtn.innerHTML=open?"×":"☰";
    });
    nav.addEventListener("click",e=>{
      if(e.target.closest("a")){
        nav.classList.remove("mobile-open");
        menuBtn.classList.remove("open");
        menuBtn.setAttribute("aria-expanded","false");
        menuBtn.innerHTML="☰";
      }
    });
  }

  const userEl=document.querySelector("#userName");
  if(userEl)userEl.textContent=user?user.name:"אורח";
  const admin=document.querySelector("#adminLink");
  if(admin&&user?.role==="ADMIN")admin.style.display="inline-flex";
}

/* Navigation safety fix: Albums must always open the albums list, never Admin. */
(function () {
  function fixAlbumsNavigation() {
    document.querySelectorAll('a[href="admin.html"], a[data-href="admin.html"]').forEach(function (a) {
      var label = (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (label.indexOf('אלבומים') !== -1 && label.indexOf('ניהול') === -1) {
        if (a.hasAttribute('href')) a.setAttribute('href', 'albums.html');
        if (a.hasAttribute('data-href')) a.setAttribute('data-href', 'albums.html');
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
