/* ═══════════════════════════════════════════════════════════
   COOKIE CONSENT
   ═══════════════════════════════════════════════════════════ */

function initCookieConsent() {
    const consent = localStorage.getItem('cookie_consent');
    if (consent !== null) return; // already answered

    const banner = document.getElementById('cookie-banner');
    if (!banner) return;
    banner.style.display = 'flex';

    document.getElementById('cookie-accept').addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'accepted');
        banner.classList.add('cookie-hide');
        setTimeout(() => { banner.style.display = 'none'; }, 350);
        // ── Enable GA4 now that user has consented ──
        if (typeof enableAnalytics === 'function') enableAnalytics();
    });
    document.getElementById('cookie-decline').addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'declined');
        banner.classList.add('cookie-hide');
        setTimeout(() => { banner.style.display = 'none'; }, 350);
    });
}
