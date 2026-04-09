/**
 * sw.js — Service Worker
 * Qatar Live Weather Map
 * Cache-first for app shell assets, network-first for weather API.
 * by mohammedlglg
 */

const CACHE_NAME  = 'qatar-weather-v1';
const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './translations.js',
    './data.js',
    './favicon.svg',
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
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Network-first for wttr.in and Wikipedia (live data)
    if (url.includes('wttr.in') || url.includes('wikipedia.org')) {
        event.respondWith(
            fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
        );
        return;
    }

    // Cache-first for everything else (shell assets, tiles, fonts)
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
