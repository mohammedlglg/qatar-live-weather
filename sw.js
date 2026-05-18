/**
 * sw.js — Service Worker
 * Qatar Live Weather Map
 * Cache-first for app shell assets, network-first for weather API.
 * by mohammedlglg
 *
 * FIX #4: Cache name now includes date — update this on every deploy
 *         to ensure users receive the latest assets immediately.
 * FIX #9: Static pages (about, privacy, contact) added to SHELL_ASSETS
 *         so the PWA works fully offline.
 */

const CACHE_NAME = 'qatar-weather-2026-05-18'; // ← UPDATE THIS ON EVERY DEPLOY

const SHELL_ASSETS = [
    './',
    './index.html',
    './about.html',       // FIX #9: was missing
    './privacy.html',     // FIX #9: was missing
    './contact.html',     // FIX #9: was missing
    './style.css',
    './app.js',
    './translations.js',
    './data.js',
    './favicon.svg',
    './manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Network-first for live data APIs
    if (
        url.includes('wttr.in') ||
        url.includes('wikipedia.org') ||
        url.includes('aladhan.com')
    ) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response('{}', { headers: { 'Content-Type': 'application/json' } })
            )
        );
        return;
    }

    // Network-first for Google Analytics / AdSense (never cache ad/tracking calls)
    if (
        url.includes('googlesyndication.com') ||
        url.includes('googletagmanager.com') ||
        url.includes('pagead2.google')
    ) {
        event.respondWith(fetch(event.request).catch(() => new Response('')));
        return;
    }

    // Cache-first for everything else (shell assets, map tiles, fonts)
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
