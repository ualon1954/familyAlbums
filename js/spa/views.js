(function(global){
  function home(){
    return `
<section class="hero home-hero">
<div class="home-hero-copy">
<span class="eyebrow">המשפחה שלנו · הסיפור שלנו</span>
<h1>הזיכרונות שלנו<br/><em>נשארים קרובים</em></h1>
<p>מקום משפחתי אחד לכל התמונות, הרגעים והסיפורים שאנחנו רוצים לשמור — ולחזור אליהם שוב ושוב.</p>
<div class="home-hero-actions">
<a class="btn" href="#/albums">פתיחת האלבומים</a>
<a class="home-secondary-link" href="#/about">הסיפור שלנו ←</a>
</div>
</div>
<div aria-label="תמונה משפחתית" class="hero-image home-hero-image" role="img"></div>
</section>
<section aria-labelledby="homeWelcomeTitle" class="home-welcome section">
<div class="home-welcome-card">
<span aria-hidden="true" class="home-welcome-icon">♥</span>
<div>
<span class="eyebrow">זיכרונות משותפים</span>
<h2 id="homeWelcomeTitle">כל המשפחה. כל הזיכרונות. במקום אחד.</h2>
<p>טיולים, חגים, אירועים ורגעים קטנים מהחיים — מסודרים באלבומים פרטיים ונגישים לבני המשפחה.</p>
</div>
</div>
</section>
<section aria-label="יתרונות האלבום" class="stats home-stats">
<div><strong>∞</strong><small>זיכרונות לשמור</small></div>
<div><strong>24/7</strong><small>גישה מכל מקום</small></div>
<div><strong>♥</strong><small>רק למשפחה</small></div>
<div><strong>☁</strong><small>שמירה בענן</small></div>
</section>
<section class="section home-cta">
<div class="home-cta-card">
<div>
<span class="eyebrow">האלבום המשפחתי</span>
<h2>מוכנים להיזכר?</h2>
<p>היכנסו לאלבומים ובחרו את התקופה, האירוע או הרגע שאליו תרצו לחזור.</p>
</div>
<a class="btn" href="#/albums">לכל האלבומים ←</a>
</div>
</section>
`;
  }

  function about(){
    return `
<section class="about-hero about-hero-redesign">
<span class="eyebrow">המשפחה שלנו · הסיפור שלנו</span>
<h1>הסיפור המשפחתי<br/><em>שלנו</em></h1>
<p>מקום פרטי ומשפחתי לשמור בו את התמונות, הזיכרונות והסיפורים שמלווים אותנו לאורך השנים.</p>
</section>
<section class="section story about-story-redesign">
<div aria-label="זיכרונות משפחתיים" class="about-image" role="img"></div>
<div class="about-story-copy">
<span class="eyebrow">למה יצרנו את האלבום</span>
<h2>כי הזיכרונות שלנו ראויים למקום משלהם</h2>
<p>ימי הולדת, חגים, טיולים, מפגשים משפחתיים ורגעים קטנים מהחיים — כולם מצטברים לסיפור אחד גדול.</p>
<p>האלבום נועד לאפשר לנו לשמור את הרגעים האלה בצורה מסודרת, נעימה וקלה לצפייה, ולחזור אליהם בכל זמן.</p>
<blockquote>“תמונה טובה לא רק מראה רגע — היא מחזירה אותנו אליו.”</blockquote>
</div>
</section>
<section aria-labelledby="aboutValuesTitle" class="section about-values-section">
<div class="about-values-head">
<span class="eyebrow">מה חשוב לנו</span>
<h2 id="aboutValuesTitle">מה חשוב לנו באלבום המשפחתי</h2>
</div>
<div class="about-values-grid">
<article class="about-value-card">
<div aria-hidden="true" class="about-value-icon">♥</div>
<h3>משפחה במרכז</h3>
<p>האלבום נבנה קודם כול עבור בני המשפחה — כדי שיהיה פשוט למצוא, לראות ולשתף זיכרונות משותפים.</p>
</article>
<article class="about-value-card">
<div aria-hidden="true" class="about-value-icon">🔒</div>
<h3>פרטיות</h3>
<p>התמונות והתכנים מיועדים לבני המשפחה ולמוזמנים בלבד, והגישה יכולה להיות מוגבלת למשתמשים מורשים.</p>
</article>
<article class="about-value-card">
<div aria-hidden="true" class="about-value-icon">⌛</div>
<h3>זיכרונות לאורך השנים</h3>
<p>המטרה היא לשמור את הסיפור המשפחתי גם לדורות הבאים — בצורה מסודרת שקל לחזור אליה.</p>
</article>
</div>
</section>
<section class="section about-closing-section">
<div class="about-closing-card">
<span aria-hidden="true" class="about-closing-heart">♥</span>
<div>
<span class="eyebrow">זיכרונות משותפים</span>
<h2>הסיפור ממשיך להיכתב</h2>
<p>כל תמונה חדשה מוסיפה עוד רגע לסיפור המשפחתי שלנו.</p>
</div>
<a class="btn" href="#/albums">לאלבומים ←</a>
</div>
</section>
<section aria-labelledby="aboutRolesTitle" class="section about-roles-section" hidden="" id="aboutRolesSection">
<div class="about-values-head">
<span class="eyebrow">תפקידים והרשאות</span>
<h2 id="aboutRolesTitle">מי יכול לעשות מה במערכת?</h2>
<p class="about-roles-intro">לכל משתמש מוגדר תפקיד. מנהל המערכת קובע גם את ההרשאות לכל אלבום, כך שניתן להתאים את רמת הגישה לכל משתמש.</p>
</div>
<div class="about-roles-grid">
<article class="about-role-card about-role-admin">
<div aria-hidden="true" class="about-role-icon">⚙️</div>
<div>
<h3>ADMIN — מנהל</h3>
<p>מנהל המערכת. יכול לנהל אלבומים, משתמשים והרשאות, להעלות ולמחוק תמונות, ולגשת לסל המחזור לצורך שחזור או מחיקה לצמיתות.</p>
<small>למנהל יש גישה מלאה לכל האלבומים.</small>
</div>
</article>
<article class="about-role-card">
<div aria-hidden="true" class="about-role-icon">♥</div>
<div>
<h3>FAMILY — משפחה</h3>
<p>משתמש משפחתי רגיל. יכול לצפות באלבומים שהותרו לו, להשתמש במועדפים, ובהתאם להרשאות שהגדיר המנהל גם להעלות תמונות או לערוך ולמחוק תמונות.</p>
<small>ההרשאות נקבעות בנפרד לכל אלבום.</small>
</div>
</article>
<article class="about-role-card">
<div aria-hidden="true" class="about-role-icon">👤</div>
<div>
<h3>GUEST — אורח</h3>
<p>משתמש מוזמן שאינו חייב להיות בן משפחה. יכול לצפות באלבומים שהותרו לו ולהשתמש במועדפים. אם המנהל מעניק לו הרשאה מתאימה, ניתן לאפשר גם העלאה או עריכה ומחיקה של תמונות.</p>
<small>גם לאורח ניתן להגדיר הרשאות שונות לכל אלבום.</small>
</div>
</article>
</div>
<div class="about-role-note">
<strong>חשוב לדעת:</strong>
<span>במערכת הנוכחית ההבדל בין FAMILY ל־GUEST הוא בעיקר סוג המשתמש. ההרשאות בפועל נקבעות על ידי המנהל לכל משתמש ולכל אלבום: צפייה, העלאה ועריכה/מחיקה.</span>
</div>
</section>
<section aria-labelledby="aboutUserRulesTitle" class="section about-user-rules-section" hidden="" id="aboutUserRulesSection">
<div class="about-user-rules-card">
<div class="about-user-rules-head">
<div aria-hidden="true" class="about-user-rules-icon">🛡️</div>
<div>
<span class="eyebrow">למנהלים בלבד</span>
<h2 id="aboutUserRulesTitle">כללי עריכה ומחיקה של משתמש קיים</h2>
<p>כדי לשמור על תקינות המערכת ועל גישת הניהול, פעולות על משתמשים קיימים כפופות לכללים הבאים.</p>
</div>
</div>
<div class="about-user-rules-grid">
<article><span class="rule-no">01</span><div><h3>עריכת משתמש</h3><p>מנהל יכול לערוך את פרטי המשתמש ואת תפקידו. כתובת דוא״ל חייבת להישאר ייחודית ולא ניתן לשמור כתובת שכבר משויכת למשתמש אחר.</p></div></article>
<article><span class="rule-no">02</span><div><h3>הגנה על המנהל המחובר</h3><p>מנהל אינו יכול להוריד את התפקיד של עצמו מ־ADMIN. כך נמנעת איבוד גישת הניהול במהלך עבודה במערכת.</p></div></article>
<article><span class="rule-no">03</span><div><h3>המנהל האחרון</h3><p>לא ניתן למחוק או להוריד מתפקיד ADMIN את המנהל האחרון במערכת. תמיד חייב להישאר לפחות מנהל פעיל אחד.</p></div></article>
<article><span class="rule-no">04</span><div><h3>מחיקת משתמש</h3><p>מנהל יכול למחוק משתמש אחר, אך אינו יכול למחוק את המשתמש שבו הוא מחובר כעת. המחיקה היא מחיקה לוגית (Soft Delete) ולא מחיקה פיזית מיידית של הרשומה.</p></div></article>
<article><span class="rule-no">05</span><div><h3>הרשאות לאלבומים</h3><p>תפקיד FAMILY או GUEST אינו קובע לבדו את הגישה. הרשאות צפייה, העלאה ועריכה/מחיקה נקבעות על ידי המנהל לכל משתמש ולכל אלבום.</p></div></article>
<article><span class="rule-no">06</span><div><h3>תיעוד פעולות</h3><p>פעולות ניהול משמעותיות על משתמשים מתועדות ביומן הפעילות לצורך מעקב ובקרה.</p></div></article>
</div>
<div class="about-user-rules-warning"><strong>כלל בטיחות:</strong><span> לפני שינוי תפקיד או מחיקת משתמש, מומלץ לוודא שזה המשתמש הנכון ושיישאר ADMIN פעיל נוסף כאשר הפעולה נוגעת למנהל.</span></div>
</div>
</section>
`;
  }

  function migration(){
    return `
      <section class="section">
        <div class="card">
          <h1>SPA Migration</h1>
          <p>תשתית ה-SPA פעילה: Router, Application State ו-Shell משותף.</p>
          <p>בשלב זה מסכי הנתונים המורכבים עדיין נפתחים בדפים הקיימים כדי לא לשבור את ה-Baseline.</p>
        </div>
      </section>`;
  }

  function notFound(){
    return '<section class="card"><h2>המסך לא נמצא</h2><a class="btn" href="#/home">חזרה לראשי</a></section>';
  }

  function dashboard(){ return '<section class="section"><div class="card">טוען לוח בקרה...</div></section>'; }

  global.SPAViews = { home, dashboard, about, migration, notFound };
})(window);
