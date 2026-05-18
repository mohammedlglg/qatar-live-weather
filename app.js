/**
 * app.js — PATCH: Google Analytics 4 deferred consent
 *
 * FIX #7: GA4 must NOT fire before the user accepts cookies.
 *
 * HOW TO APPLY:
 * 1. Remove these two blocks from index.html <head>:
 *      <script async src="https://www.googletagmanager.com/gtag/js?id=G-YWEKPB5X90"></script>
 *      <script>
 *          window.dataLayer = window.dataLayer || [];
 *          function gtag(){dataLayer.push(arguments);}
 *          gtag('js', new Date());
 *          gtag('config', 'G-YWEKPB5X90');
 *      </script>
 *
 * 2. Keep the consent stub in index.html <head> (from index-head-patch.html):
 *      <script>
 *          window.dataLayer = window.dataLayer || [];
 *          function gtag(){dataLayer.push(arguments);}
 *          gtag('consent', 'default', {
 *              analytics_storage: 'denied',
 *              ad_storage:        'denied'
 *          });
 *      </script>
 *
 * 3. Add initAnalytics() below into app.js (anywhere before the cookie handler).
 *
 * 4. In your cookie accept handler, call initAnalytics() BEFORE initAds():
 *      cookieAcceptBtn.addEventListener('click', () => {
 *          localStorage.setItem('cookie_consent', 'accepted');
 *          hideCookieBanner();
 *          initAnalytics();   // ← ADD THIS LINE
 *          initAds();
 *      });
 *
 * 5. On page load, if consent was previously given, also call initAnalytics():
 *      if (localStorage.getItem('cookie_consent') === 'accepted') {
 *          initAnalytics();
 *          // initAds() is already called after weather loads
 *      }
 */

/* ═══════════════════════════════════════════════════════════
   ANALYTICS INITIALISATION (GDPR-compliant, deferred)
   Called only after user accepts cookies.
   ═══════════════════════════════════════════════════════════ */

const GA_ID = 'G-YWEKPB5X90';
let analyticsInitialised = false;

function initAnalytics() {
    if (analyticsInitialised) return;
    analyticsInitialised = true;

    // Update consent state to granted
    if (typeof gtag === 'function') {
        gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage:        'granted'
        });
    }

    // Dynamically load the GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    script.onload = () => {
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', GA_ID, { anonymize_ip: true });
    };
}
