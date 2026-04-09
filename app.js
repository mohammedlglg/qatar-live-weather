/**
 * app.js
 * Qatar Live Weather Map — Application logic
 * Combined: interactive Leaflet map + rich dashboard panel
 * Enhancements: cache TTL, concurrency limiter, lazy Chart.js, active marker,
 *   skeleton loader, share URL, geolocation, heat/dust alerts, service worker,
 *   aria labels, mobile bottom sheet, error markers, refresh button, "near me"
 * by mohammedlglg
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FETCH_CONCURRENCY = 5;       // max parallel wttr.in requests

const BASEMAPS = [
    { key: 'esri_street',  labelEn: 'Street Map',   labelAr: 'خريطة الشوارع', color: '#fde68a',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri', maxZoom: 20 },
    { key: 'carto_light',  labelEn: 'Light',         labelAr: 'فاتح',          color: '#e5e7eb',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20 },
    { key: 'carto_dark',   labelEn: 'Dark',          labelAr: 'داكن',          color: '#1e293b',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20 },
    { key: 'esri_imagery', labelEn: 'Satellite',     labelAr: 'صور الأقمار',  color: '#334155',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Maxar', maxZoom: 20 },
    { key: 'esri_topo',    labelEn: 'Topo',          labelAr: 'طبوغرافي',     color: '#bbf7d0',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri', maxZoom: 20 },
    { key: 'osm',          labelEn: 'OpenStreetMap', labelAr: 'خريطة الشوارع',color: '#bfdbfe',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap', subdomains: 'abc', maxZoom: 19 }
];

const WTTR_ICONS = {
    113:'☀️', 116:'⛅', 119:'☁️', 122:'☁️',
    143:'🌫️', 176:'🌦️', 179:'🌨️', 182:'🌧️', 185:'🌧️',
    200:'⛈️', 227:'🌨️', 230:'❄️',
    248:'🌫️', 260:'🌫️', 263:'🌦️', 266:'🌦️',
    281:'🌧️', 284:'🌧️', 293:'🌧️', 296:'🌧️',
    299:'🌧️', 302:'🌧️', 305:'🌧️', 308:'🌧️',
    311:'🌧️', 314:'🌧️', 317:'🌧️', 320:'🌨️',
    323:'🌨️', 326:'🌨️', 329:'❄️', 332:'❄️',
    335:'❄️', 338:'❄️', 350:'🌧️', 353:'🌦️',
    356:'🌧️', 359:'🌧️', 362:'🌧️', 365:'🌧️',
    368:'🌨️', 371:'❄️', 374:'🌧️', 377:'🌧️',
    386:'⛈️', 389:'⛈️', 392:'⛈️', 395:'⛈️'
};

const MOON_PHASES = {
    '🌑':'New Moon','🌒':'Waxing Crescent','🌓':'First Quarter','🌔':'Waxing Gibbous',
    '🌕':'Full Moon','🌖':'Waning Gibbous','🌗':'Last Quarter','🌘':'Waning Crescent'
};

/* ═══════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════ */

let map, markersLayer, legendControl, basemapControl;
let currentTileLayer  = null;
let currentBasemapKey = 'esri_street';
let currentLang       = 'en';
let currentRegionKey  = 'DOHA';
let currentUnit       = 'C';
let activeMarkerEl    = null;  // DOM element of currently selected marker

// Cache with TTL: stores { data, ts }
const weatherCache = new Map();
const factsCache   = new Map();

let lastTown    = null;
let lastReading = null;
let lastMoon    = '🌙';

let tempChartInst   = null;
let precipChartInst = null;

// Freshness ticker
let freshnessInterval = null;
let lastFetchTime     = null;

/* ═══════════════════════════════════════════════════════════
   LAZY CHART.JS LOADER
   ═══════════════════════════════════════════════════════════ */

let chartJsLoaded = false;
function loadChartJs() {
    return new Promise((resolve, reject) => {
        if (window.Chart) { chartJsLoaded = true; return resolve(); }
        if (chartJsLoaded) return resolve();
        const s   = document.createElement('script');
        s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload  = () => { chartJsLoaded = true; resolve(); };
        s.onerror = () => reject(new Error('Chart.js failed to load'));
        document.head.appendChild(s);
    });
}

/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER REGISTRATION
   ═══════════════════════════════════════════════════════════ */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const rnd = v => (v == null || isNaN(+v)) ? null : Math.round(+v);

function getColor(t) {
    return t > 40 ? '#b91c1c'
         : t > 35 ? '#ef4444'
         : t > 30 ? '#f59e0b'
         : t > 25 ? '#10b981'
         :          '#3b82f6';
}

function tv(c, f) { return currentUnit === 'C' ? c : f; }
function tu()     { return currentUnit === 'C' ? '°C' : '°F'; }

function uvLabel(uv) {
    if (uv <= 2)  return { t: 'Low',       c: 'var(--success)' };
    if (uv <= 5)  return { t: 'Moderate',  c: 'var(--warm)'    };
    if (uv <= 7)  return { t: 'High',      c: '#f97316'        };
    if (uv <= 10) return { t: 'Very High', c: 'var(--danger)'  };
    return                 { t: 'Extreme',  c: '#7c3aed'        };
}
function windDesc(k)  { if(k<2)return'Calm';if(k<12)return'Light';if(k<20)return'Gentle';if(k<29)return'Moderate';if(k<50)return'Fresh';return'Strong'; }
function pressDesc(p) { if(p<1000)return'Very low';if(p<1010)return'Below normal';if(p<1020)return'Normal';if(p<1030)return'Above normal';return'High'; }
function visDesc(k)   { if(k<1)return'Very poor';if(k<4)return'Poor';if(k<10)return'Moderate';if(k<20)return'Good';return'Excellent'; }
function humDesc(h)   { if(h<30)return'Dry';if(h<60)return'Comfortable';if(h<80)return'Humid';return'Very humid'; }

function getWindDir(deg) {
    if (currentLang === 'ar') {
        const d = ['شمال','ش.شرق','شرق','ج.شرق','جنوب','ج.غرب','غرب','ش.غرب'];
        return d[Math.round(deg / 45) % 8];
    }
    return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8];
}

function getQatarTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const q   = new Date(utc + 3 * 3600000);
    const h   = q.getHours().toString().padStart(2,'0');
    const m   = q.getMinutes().toString().padStart(2,'0');
    const day = q.getDate().toString().padStart(2,'0');
    const mons = currentLang === 'ar'
        ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${mons[q.getMonth()]} ${q.getFullYear()}, ${h}:${m}`;
}

function dayLabel(dateStr) {
    const d    = new Date(dateStr + 'T12:00:00');
    const now  = new Date();
    const td   = new Date(now.getTime() + now.getTimezoneOffset()*60000 + 3*3600000);
    const diff = Math.round((d - new Date(td.toISOString().slice(0,10)+'T12:00:00')) / 86400000);
    if (currentLang === 'ar') {
        if (diff === 0) return 'اليوم';
        if (diff === 1) return 'غداً';
        const ar = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
        return ar[d.getDay()];
    }
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

function fmtDate(d) { return new Date(d).toLocaleDateString('en', { month:'short', day:'numeric' }); }
function fmtTime(t) { const h = Math.floor(parseInt(t)/100); return h + ':' + String(parseInt(t)%100).padStart(2,'0'); }

/* Relative freshness: "Updated 3 min ago" */
function updateFreshnessLabel() {
    if (!lastFetchTime) return;
    const mins = Math.floor((Date.now() - lastFetchTime) / 60000);
    const tr   = T[currentLang];
    const label = mins < 1
        ? (currentLang === 'ar' ? 'تم التحديث للتو' : 'Updated just now')
        : (currentLang === 'ar' ? `تم التحديث منذ ${mins} دقيقة` : `Updated ${mins} min ago`);
    const el = document.getElementById('collection-time');
    if (el) el.textContent = label;
}

/* ═══════════════════════════════════════════════════════════
   CONCURRENCY-LIMITED FETCH (batch of N at a time)
   ═══════════════════════════════════════════════════════════ */

async function fetchInBatches(towns, fn, batchSize = FETCH_CONCURRENCY) {
    const results = [];
    for (let i = 0; i < towns.length; i += batchSize) {
        const batch = towns.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

/* ═══════════════════════════════════════════════════════════
   MARKER ICON — touch-friendly 44px on mobile, 32px on desktop
   ═══════════════════════════════════════════════════════════ */

const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function makeTempIcon(temp, color, isActive = false) {
    const S    = IS_TOUCH ? 44 : 32;
    const ring = isActive
        ? `box-shadow:0 0 0 3px #fff,0 0 0 5px ${color};animation:markerPulse 1.5s ease-in-out infinite;`
        : '';
    return L.divIcon({
        className: '',
        html: `<div style="
            width:${S}px;height:${S}px;border-radius:50%;
            background:${color};border:2px solid #fff;box-sizing:border-box;
            display:flex;align-items:center;justify-content:center;
            font-size:${IS_TOUCH ? 13 : 11}px;font-weight:800;color:#fff;
            text-shadow:0 0 3px rgba(0,0,0,0.85);
            direction:ltr;unicode-bidi:isolate;cursor:pointer;
            transition:box-shadow 0.2s;${ring}">${temp}</div>`,
        iconSize:    [S, S],
        iconAnchor:  [S / 2, S / 2],
        popupAnchor: [0, -(S / 2)]
    });
}

/* ═══════════════════════════════════════════════════════════
   ALERT BANNER — heat index & dust/sandstorm
   ═══════════════════════════════════════════════════════════ */

function checkAlerts(reading) {
    const banner   = document.getElementById('alert-banner');
    const alertTxt = document.getElementById('alert-text');
    const alertIco = document.getElementById('alert-icon');
    if (!banner) return;

    const feelsC = +reading.feelsLike;
    const vis    = +reading.visibility;
    const wind   = +reading.windSpd;
    const isAr   = currentLang === 'ar';

    // Dust/sandstorm: visibility < 2km + wind > 30 km/h
    if (vis < 2 && wind > 30) {
        alertIco.textContent = '🌪️';
        alertTxt.textContent = isAr
            ? `تحذير عاصفة رملية — الرؤية ${vis} كم، الرياح ${wind} كم/س. تجنب القيادة.`
            : `Dust/Sandstorm Alert — Visibility ${vis} km, Wind ${wind} km/h. Avoid driving.`;
        banner.className = 'alert-banner alert-dust';
        banner.style.display = 'flex';
        return;
    }

    // Extreme heat: feels-like > 45°C
    if (feelsC > 45) {
        alertIco.textContent = '🔥';
        alertTxt.textContent = isAr
            ? `تحذير حرارة شديدة — الحرارة الحسية ${feelsC}°م. تجنب التعرض للشمس.`
            : `Extreme Heat Alert — Feels like ${feelsC}°C. Avoid outdoor exposure.`;
        banner.className = 'alert-banner alert-heat';
        banner.style.display = 'flex';
        return;
    }

    banner.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════
   FETCH
   ═══════════════════════════════════════════════════════════ */

async function fetchWttr(town) {
    const key    = `${town.lat},${town.lon}`;
    const cached = weatherCache.get(key);
    // Return cached if still fresh
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.data;

    const res = await fetch(
        `https://wttr.in/${town.lat},${town.lon}?format=j1`,
        { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) throw new Error(`wttr HTTP ${res.status}`);
    const data = await res.json();
    weatherCache.set(key, { data, ts: Date.now() });
    return data;
}

async function fetchMoon(town) {
    try {
        const res = await fetch(
            `https://wttr.in/${town.lat},${town.lon}?format=%m`,
            { signal: AbortSignal.timeout(8000) }
        );
        return res.ok ? (await res.text()).trim() : '🌙';
    } catch { return '🌙'; }
}

function parseWttr(data) {
    const c = data.current_condition?.[0] || {};
    const w = data.weather?.[0]           || {};
    const a = w.astronomy?.[0]            || {};
    return {
        temp:        rnd(c.temp_C),       tempF:      rnd(c.temp_F),
        feelsLike:   rnd(c.FeelsLikeC),   feelsLikeF: rnd(c.FeelsLikeF),
        humidity:    rnd(c.humidity),
        windSpd:     rnd(c.windspeedKmph),
        windDeg:     rnd(c.winddirDegree),
        windDir16:   c.winddir16Point,
        pressure:    rnd(c.pressure),
        uvIndex:     rnd(c.uvIndex),
        precip:      rnd(c.precipMM),
        visibility:  rnd(c.visibility),
        cloud:       rnd(c.cloudcover),
        weatherCode: +c.weatherCode,
        todayMax:    rnd(w.maxtempC),     todayMaxF:  rnd(w.maxtempF),
        todayMin:    rnd(w.mintempC),     todayMinF:  rnd(w.mintempF),
        condition:   c.weatherDesc?.[0]?.value || null,
        icon:        WTTR_ICONS[+c.weatherCode] || '🌡️',
        sunrise:     a.sunrise  || null,
        sunset:      a.sunset   || null,
        moonPhase:   a.moon_phase || null,
        moonrise:    a.moonrise || null,
        moonset:     a.moonset  || null,
        moonIll:     a.moon_illumination || null,
        sunHour:     w.sunHour  || null,
        forecast: (data.weather || []).map(day => ({
            date:    day.date,
            max:     rnd(day.maxtempC), maxF: rnd(day.maxtempF),
            min:     rnd(day.mintempC), minF: rnd(day.mintempF),
            icon:    WTTR_ICONS[+(day.hourly?.[4]?.weatherCode || 113)] || '🌡️',
            desc:    day.hourly?.[4]?.weatherDesc?.[0]?.value || '',
            uvIndex: day.uvIndex,
            avgHum:  Math.round((day.hourly||[]).reduce((s,x) => s + +x.humidity,      0) / ((day.hourly||[]).length || 1)),
            avgWind: Math.round((day.hourly||[]).reduce((s,x) => s + +x.windspeedKmph, 0) / ((day.hourly||[]).length || 1))
        })),
        hourly: (w.hourly || []).map(h => ({
            time:               h.time,
            temp:               rnd(h.tempC),        tempF:         rnd(h.tempF),
            feelsC:             rnd(h.FeelsLikeC),   feelsF:        rnd(h.FeelsLikeF),
            icon:               WTTR_ICONS[+h.weatherCode] || '🌡️',
            rain:               rnd(h.chanceofrain),
            chanceofrain:       +h.chanceofrain       || 0,
            chanceofsunshine:   +h.chanceofsunshine   || 0,
            chanceofovercast:   +h.chanceofovercast   || 0,
            chanceofsnow:       +h.chanceofsnow       || 0,
            chanceofthunder:    +h.chanceofthunder    || 0,
            chanceoffog:        +h.chanceoffog        || 0,
            chanceofhightemp:   +h.chanceofhightemp   || 0,
            chanceofremdry:     +h.chanceofremdry     || 0,
            HeatIndexC:         h.HeatIndexC,   HeatIndexF:  h.HeatIndexF,
            WindChillC:         h.WindChillC,   WindChillF:  h.WindChillF,
            DewPointC:          h.DewPointC,    DewPointF:   h.DewPointF,
            WindGustKmph:       h.WindGustKmph
        }))
    };
}

/* ═══════════════════════════════════════════════════════════
   WIKIPEDIA FACTS
   ═══════════════════════════════════════════════════════════ */

async function getTownFacts(nameEn, nameAr, region) {
    const key = `${nameEn}-${region}-${currentLang}`;
    if (factsCache.has(key)) return factsCache.get(key);
    try {
        let summary;
        if (currentLang === 'ar') {
            for (const q of [nameAr, nameEn].filter(Boolean)) {
                const r = await fetch(`https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
                if (r.ok) {
                    const d = await r.json();
                    if (d.extract && d.type !== 'disambiguation') {
                        summary = d.extract.split('. ').slice(0,2).join('. ') + '.';
                        break;
                    }
                }
            }
        } else {
            const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nameEn)}`);
            if (r.ok) {
                const d = await r.json();
                if (d.extract && d.type !== 'disambiguation')
                    summary = d.extract.split('. ').slice(0,2).join('. ') + '.';
            }
        }
        const result = summary || T[currentLang].fallback(nameEn, region);
        factsCache.set(key, result);
        return result;
    } catch { return T[currentLang].fallback(nameEn, region); }
}

/* ═══════════════════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════════════════ */

function showDashboardSkeleton() {
    document.getElementById('dash-panel').innerHTML = `
        <div class="skel-hero"></div>
        <div class="q-grid">
            <div class="skel-card"></div><div class="skel-card"></div>
            <div class="skel-card"></div><div class="skel-card"></div>
        </div>
        <div class="skel-bar" style="width:40%;height:14px;margin:8px 0"></div>
        <div class="skel-hourly">
            ${Array(8).fill('<div class="skel-h"></div>').join('')}
        </div>
        <div class="skel-bar" style="width:40%;height:14px;margin:8px 0"></div>
        <div class="forecast-grid">
            <div class="skel-card" style="height:140px"></div>
            <div class="skel-card" style="height:140px"></div>
            <div class="skel-card" style="height:140px"></div>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════
   SHARE URL
   ═══════════════════════════════════════════════════════════ */

function shareLocation(town, regionKey) {
    const url = new URL(location.href);
    url.searchParams.set('loc',  town.name);
    url.searchParams.set('lat',  town.lat);
    url.searchParams.set('lon',  town.lon);
    url.searchParams.set('reg',  regionKey);
    url.searchParams.set('lang', currentLang);
    const shareData = {
        title: `${currentLang === 'ar' ? town.nameAr : town.name} — Qatar Weather`,
        text:  `Live weather in ${town.name}: ${lastReading?.temp}°C`,
        url:   url.toString()
    };
    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else {
        navigator.clipboard?.writeText(url.toString()).then(() => {
            showToast(currentLang === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!');
        }).catch(() => {});
    }
}

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════════════════════════
   GEOLOCATION — "Near Me"
   ═══════════════════════════════════════════════════════════ */

function nearestTown(lat, lon) {
    let best = null, bestDist = Infinity;
    const allTowns = DATA_POINTS.ALL || Object.values(DATA_POINTS).flat();
    allTowns.forEach(t => {
        const d = Math.hypot(t.lat - lat, t.lon - lon);
        if (d < bestDist) { bestDist = d; best = t; }
    });
    return best;
}

function geoLocate() {
    const btn = document.getElementById('geoBtn');
    if (!navigator.geolocation) {
        showToast(currentLang === 'ar' ? 'الموقع غير مدعوم' : 'Geolocation not supported');
        return;
    }
    if (btn) btn.classList.add('spinning');
    navigator.geolocation.getCurrentPosition(
        pos => {
            if (btn) btn.classList.remove('spinning');
            const { latitude: lat, longitude: lon } = pos.coords;
            const town = nearestTown(lat, lon);
            if (!town) return;
            // Find which region this town belongs to
            let foundRegion = currentRegionKey;
            for (const [key, arr] of Object.entries(DATA_POINTS)) {
                if (key === 'ALL') continue;
                if (arr.some(t => t.lat === town.lat && t.lon === town.lon)) {
                    foundRegion = key;
                    break;
                }
            }
            map.flyTo([town.lat, town.lon], 14, { animate: true, duration: 1.2 });
            // Load weather for that town
            fetchWttr(town).then(raw => {
                const reading = parseWttr(raw);
                lastTown    = town;
                lastReading = reading;
                showDashboardSkeleton();
                const cachedFacts = factsCache.get(`${town.name}-${T.en.regions[foundRegion]}-${currentLang}`);
                renderDashboard(town, reading, lastMoon, cachedFacts || T[currentLang].searching, !cachedFacts, foundRegion);
                if (!cachedFacts) {
                    Promise.all([
                        getTownFacts(town.name, town.nameAr, T.en.regions[foundRegion]),
                        fetchMoon(town)
                    ]).then(([facts, moon]) => {
                        lastMoon = moon;
                        if (lastTown === town) renderDashboard(town, reading, moon, facts, false, foundRegion);
                    });
                }
                checkAlerts(reading);
                if (window.innerWidth < 1024) {
                    document.getElementById('dash-panel')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }).catch(() => {
                showToast(currentLang === 'ar' ? 'تعذّر جلب البيانات' : 'Could not fetch weather');
            });
        },
        () => {
            if (btn) btn.classList.remove('spinning');
            showToast(currentLang === 'ar' ? 'تعذّر تحديد الموقع' : 'Location access denied');
        },
        { timeout: 8000 }
    );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD SUB-RENDERERS
   ═══════════════════════════════════════════════════════════ */

function renderHero(d, tr, isRTL, name, rName, regionKey, town) {
    const now     = new Date();
    const dateStr = now.toLocaleDateString(isRTL ? 'ar' : 'en', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    return `<div class="hero-card animate-in">
        <div>
            <div class="hero-loc">${rName}, Qatar</div>
            <div class="hero-city">${name}</div>
            <div class="hero-date">${dateStr}</div>
            ${isRTL ? `<div class="hero-weather-icon" aria-hidden="true">${d.icon}</div>` : ''}
        </div>
        ${!isRTL ? `<div class="hero-weather-icon" aria-hidden="true">${d.icon}</div>` : ''}
        <div>
            <div class="hero-temp-row">
                <span class="hero-temp">${tv(d.temp, d.tempF)}</span>
                <span class="hero-temp-unit">${tu()}</span>
            </div>
            <div class="hero-desc">${d.condition || ''}</div>
            <div class="hero-feels">${tr.feelsLike}: ${tv(d.feelsLike, d.feelsLikeF)}${tu()}</div>
            <div class="hero-hilo">H: ${tv(d.todayMax, d.todayMaxF)}° &nbsp; L: ${tv(d.todayMin, d.todayMinF)}°</div>
        </div>
        <button class="share-btn" onclick="shareLocation(lastTown,'${regionKey}')" aria-label="Share this location's weather">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            ${isRTL ? 'مشاركة' : 'Share'}
        </button>
    </div>`;
}

function renderQuickStats(d, tr) {
    const uvL = uvLabel(+d.uvIndex);
    return `<div class="q-grid animate-in" style="animation-delay:.05s">
        <div class="q-card">
            <div class="q-icon" style="background:var(--warm-light)" aria-hidden="true">☀️</div>
            <div>
                <div class="q-label">${tr.uvIndex}</div>
                <div class="q-val">${d.uvIndex}</div>
                <div class="q-sub" style="color:${uvL.c};font-weight:600">${uvL.t}</div>
            </div>
        </div>
        <div class="q-card">
            <div class="q-icon" style="background:var(--accent-light)" aria-hidden="true">💧</div>
            <div>
                <div class="q-label">${tr.humidity}</div>
                <div class="q-val">${d.humidity}%</div>
                <div class="q-sub">${humDesc(+d.humidity)}</div>
            </div>
        </div>
        <div class="q-card">
            <div class="q-icon" style="background:var(--info-light)" aria-hidden="true">💨</div>
            <div>
                <div class="q-label">${tr.windSpeed}</div>
                <div class="q-val">${d.windSpd} <span style="font-size:10px;font-weight:400">km/h</span></div>
                <div class="q-sub">${d.windDir16} — ${windDesc(+d.windSpd)}</div>
            </div>
        </div>
        <div class="q-card">
            <div class="q-icon" style="background:var(--success-light)" aria-hidden="true">🌡️</div>
            <div>
                <div class="q-label">${tr.pressure}</div>
                <div class="q-val">${d.pressure} <span style="font-size:10px;font-weight:400">hPa</span></div>
                <div class="q-sub">${pressDesc(+d.pressure)}</div>
            </div>
        </div>
    </div>`;
}

function renderHourly(d, hIdx, tr) {
    let html = `<div class="sec-title animate-in" style="animation-delay:.08s">${tr.hourly}</div>
    <div class="hourly-scroll animate-in" style="animation-delay:.1s" role="list">`;
    d.hourly.forEach((h, i) => {
        const isNow = (i === hIdx);
        html += `<div class="h-card${isNow ? ' now' : ''}" role="listitem">
            <div class="hc-t">${isNow ? (currentLang === 'ar' ? 'الآن' : 'Now') : fmtTime(h.time)}</div>
            <div class="hc-i" aria-hidden="true">${h.icon}</div>
            <div class="hc-temp">${tv(h.temp, h.tempF)}°</div>
            ${h.rain > 0 ? `<div class="hc-rain">${h.rain}%</div>` : ''}
        </div>`;
    });
    return html + `</div>`;
}

function renderForecast(d, tr) {
    let html = `<div class="sec-title animate-in" style="animation-delay:.12s">${tr.forecast}</div>
    <div class="forecast-grid animate-in" style="animation-delay:.14s">`;
    d.forecast.forEach(f => {
        html += `<div class="day-card">
            <div class="dc-day">${dayLabel(f.date)}</div>
            <div class="dc-date">${fmtDate(f.date)}</div>
            <div class="dc-icon" aria-hidden="true">${f.icon}</div>
            <div class="dc-desc">${f.desc}</div>
            <div class="dc-temps">
                <span class="dc-hi">${tv(f.max, f.maxF)}°</span>
                <span class="dc-lo">${tv(f.min, f.minF)}°</span>
            </div>
            <div class="dc-details">
                <div class="dc-det">💧 ${f.avgHum}%</div>
                <div class="dc-det">💨 ${f.avgWind} km/h</div>
                <div class="dc-det">☀️ UV ${f.uvIndex}</div>
            </div>
        </div>`;
    });
    return html + `</div>`;
}

function renderConditions(d, ch, tr) {
    const vis = +d.visibility;
    return `<div class="sec-title animate-in" style="animation-delay:.16s">${tr.conditions}</div>
    <div class="details-grid animate-in" style="animation-delay:.18s">
        <div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">👁️</span><span class="d-title">${tr.visibility}</span></div>
            <div class="d-val">${vis} <span class="d-unit">km</span></div>
            <div class="d-sub">${visDesc(vis)}</div>
            <div class="d-bar" role="meter" aria-valuenow="${vis}" aria-valuemin="0" aria-valuemax="20">
                <div class="d-bar-fill" style="width:${Math.min(vis/20*100,100)}%;background:var(--accent)"></div>
            </div>
        </div>
        <div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">☁️</span><span class="d-title">${tr.cloud}</span></div>
            <div class="d-val">${d.cloud}<span class="d-unit">%</span></div>
            <div class="d-sub">${+d.cloud<25?'Mostly clear':+d.cloud<50?'Partly cloudy':+d.cloud<75?'Mostly cloudy':'Overcast'}</div>
            <div class="d-bar"><div class="d-bar-fill" style="width:${d.cloud}%;background:#94a3b8"></div></div>
        </div>
        <div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">🌧️</span><span class="d-title">${tr.precip}</span></div>
            <div class="d-val">${d.precip} <span class="d-unit">mm</span></div>
            <div class="d-sub">${+d.precip === 0 ? 'No precipitation' : 'Active precip.'}</div>
        </div>
        ${ch.DewPointC != null ? `<div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">💦</span><span class="d-title">Dew Point</span></div>
            <div class="d-val">${tv(ch.DewPointC, ch.DewPointF)}<span class="d-unit">${tu()}</span></div>
            <div class="d-sub">${+ch.DewPointC > 20 ? 'Muggy' : 'Comfortable'}</div>
        </div>` : ''}
        ${ch.HeatIndexC != null ? `<div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">🔥</span><span class="d-title">Heat Index</span></div>
            <div class="d-val">${tv(ch.HeatIndexC, ch.HeatIndexF)}<span class="d-unit">${tu()}</span></div>
            <div class="d-sub">Wind chill: ${tv(ch.WindChillC, ch.WindChillF)}${tu()}</div>
        </div>` : ''}
        ${ch.WindGustKmph != null ? `<div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">🌬️</span><span class="d-title">Wind Gust</span></div>
            <div class="d-val">${ch.WindGustKmph} <span class="d-unit">km/h</span></div>
            <div class="d-sub">Dir: ${d.windDir16} (${d.windDeg}°)</div>
        </div>` : ''}
    </div>`;
}

function renderProbability(ch, tr) {
    const probs = [
        { i:'🌧️', l:'Rain',     v: ch.chanceofrain     || 0, c:'var(--accent)' },
        { i:'☀️',  l:'Sunshine', v: ch.chanceofsunshine || 0, c:'var(--warm)'   },
        { i:'☁️',  l:'Overcast', v: ch.chanceofovercast || 0, c:'#94a3b8'       },
        { i:'⛈️',  l:'Thunder',  v: ch.chanceofthunder  || 0, c:'var(--danger)' },
        { i:'🌫️',  l:'Fog',      v: ch.chanceoffog      || 0, c:'#a1a1aa'       },
        { i:'🌡️',  l:'High Temp',v: ch.chanceofhightemp || 0, c:'#f97316'       },
        { i:'🌤️',  l:'Dry',      v: ch.chanceofremdry   || 0, c:'var(--success)'},
        { i:'❄️',  l:'Snow',     v: ch.chanceofsnow     || 0, c:'var(--info)'   },
        { i:'🥶',  l:'Frost',    v: 0,                        c:'#06b6d4'       }
    ];
    let html = `<div class="sec-title animate-in" style="animation-delay:.2s">${tr.probability}</div>
    <div class="prob-grid animate-in" style="animation-delay:.22s">`;
    probs.forEach(p => {
        html += `<div class="d-card">
            <div class="d-head"><span class="d-icon" aria-hidden="true">${p.i}</span><span class="d-title">${p.l}</span></div>
            <div class="d-val">${p.v}<span class="d-unit">%</span></div>
            <div class="d-bar"><div class="d-bar-fill" style="width:${p.v}%;background:${p.c}"></div></div>
        </div>`;
    });
    return html + `</div>`;
}

function renderAstro(d, moonEmoji, tr) {
    let html = `<div class="sec-title animate-in" style="animation-delay:.24s">${tr.sunMoon}</div>
    <div class="astro-row animate-in" style="animation-delay:.26s">`;

    if (d.sunrise || d.sunset) {
        html += `<div class="sun-card">
            <div class="sun-row">
                <div class="sun-item">
                    <div class="si-icon" aria-hidden="true">🌅</div>
                    <div class="si-label">${tr.sunrise}</div>
                    <div class="si-time">${d.sunrise || '—'}</div>
                </div>
                ${d.sunHour ? `<div class="sun-item">
                    <div class="si-icon" aria-hidden="true">☀️</div>
                    <div class="si-label">Sun Hours</div>
                    <div class="si-time">${d.sunHour}h</div>
                </div>` : ''}
                <div class="sun-item">
                    <div class="si-icon" aria-hidden="true">🌇</div>
                    <div class="si-label">${tr.sunset}</div>
                    <div class="si-time">${d.sunset || '—'}</div>
                </div>
            </div>
            <div class="sun-arc" aria-hidden="true">
                <svg viewBox="0 0 300 90">
                    <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stop-color="#f59e0b" stop-opacity=".35"/>
                        <stop offset="50%"  stop-color="#f59e0b" stop-opacity=".65"/>
                        <stop offset="100%" stop-color="#ef4444" stop-opacity=".35"/>
                    </linearGradient></defs>
                    <path d="M 20 80 Q 150 -15 280 80" fill="none" stroke="url(#sg)" stroke-width="2.5" stroke-dasharray="5,3"/>
                    <line x1="15" y1="80" x2="285" y2="80" stroke="var(--border)" stroke-width=".5"/>
                    <circle cx="20"  cy="80" r="4" fill="#f59e0b"/>
                    <circle cx="280" cy="80" r="4" fill="#ef4444"/>
                </svg>
            </div>
        </div>`;
    }

    html += `<div class="moon-card">
        <div class="moon-emoji" aria-label="${MOON_PHASES[moonEmoji] || 'Moon phase'}">${moonEmoji || '🌙'}</div>
        <div>
            <div class="mi-phase">${MOON_PHASES[moonEmoji] || d.moonPhase || 'Unknown'}</div>
            ${d.moonrise ? `<div class="mi-det">🌙 Rise: ${d.moonrise}</div>` : ''}
            ${d.moonset  ? `<div class="mi-det">🌘 Set: ${d.moonset}</div>`  : ''}
            ${d.moonIll  ? `<div class="mi-det">💡 ${d.moonIll}% illuminated</div>` : ''}
        </div>
    </div>`;
    return html + `</div>`;
}

function renderChartSection(d, tr) {
    return `<div class="sec-title animate-in" style="animation-delay:.28s">${tr.tempTrend}</div>
    <div class="chart-card animate-in" style="animation-delay:.3s">
        <div style="position:relative;height:200px"><canvas id="tempChart" aria-label="Temperature trend chart"></canvas></div>
    </div>
    <div class="two-col animate-in" style="animation-delay:.32s">
        <div class="chart-card">
            <div class="chart-title">${tr.precipTrend}</div>
            <div style="position:relative;height:170px"><canvas id="precipChart" aria-label="Rain chance chart"></canvas></div>
        </div>
        <div class="wind-card">
            <div class="chart-title">${tr.windDir}</div>
            <svg viewBox="0 0 200 200" role="img" aria-label="Wind direction compass: ${d.windDir16} at ${d.windSpd} km/h">
                <circle cx="100" cy="100" r="82" fill="none" stroke="var(--border)" stroke-width=".5"/>
                <circle cx="100" cy="100" r="58" fill="none" stroke="var(--border)" stroke-width=".5" stroke-dasharray="3,3"/>
                <circle cx="100" cy="100" r="34" fill="none" stroke="var(--border)" stroke-width=".5" stroke-dasharray="2,3"/>
                <text x="100" y="12"  text-anchor="middle" font-size="11" fill="var(--txt2)" font-weight="600">N</text>
                <text x="192" y="104" text-anchor="middle" font-size="11" fill="var(--txt2)" font-weight="600">E</text>
                <text x="100" y="198" text-anchor="middle" font-size="11" fill="var(--txt2)" font-weight="600">S</text>
                <text x="8"   y="104" text-anchor="middle" font-size="11" fill="var(--txt2)" font-weight="600">W</text>
                <g transform="rotate(${d.windDeg || 0},100,100)">
                    <line x1="100" y1="100" x2="100" y2="24" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
                    <polygon points="100,18 93,34 107,34" fill="var(--accent)"/>
                </g>
                <circle cx="100" cy="100" r="5" fill="var(--accent)"/>
            </svg>
            <div style="font-size:13px;font-weight:700;margin-top:8px">${d.windDir16 || '—'} at ${d.windSpd} km/h</div>
            <div style="font-size:11px;color:var(--txt2)">${d.windDeg}° bearing</div>
        </div>
    </div>`;
}

function renderFacts(facts, isLoadingFacts, isRTL, tr) {
    return `<div class="sec-title animate-in" style="animation-delay:.34s">${tr.quickFacts}</div>
    <div class="chart-card animate-in" style="animation-delay:.36s">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:6px;font-style:italic">${tr.wikiSource}</div>
        <p id="facts-para"
           style="font-size:13px;color:var(--txt2);line-height:1.7;margin:0;
                  border-${isRTL ? 'right' : 'left'}:2px solid var(--accent-mid);
                  padding-${isRTL ? 'right' : 'left'}:10px;"
           class="${isLoadingFacts ? 'loading-pulse' : ''}">${facts}</p>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD RENDERER
   ═══════════════════════════════════════════════════════════ */

function renderDashboard(town, reading, moonEmoji, facts, isLoadingFacts, regionKey) {
    const tr    = T[currentLang];
    const isRTL = currentLang === 'ar';
    const name  = isRTL ? town.nameAr : town.name;
    const rName = tr.regions[regionKey];
    const d     = reading;

    const now         = new Date();
    const currentHour = now.getHours();
    const hIdx        = Math.min(Math.floor(currentHour / 3), 7);
    const ch          = d.hourly[hIdx] || d.hourly[0] || {};

    const html =
        renderHero(d, tr, isRTL, name, rName, regionKey, town) +
        renderQuickStats(d, tr) +
        renderHourly(d, hIdx, tr) +
        renderForecast(d, tr) +
        renderConditions(d, ch, tr) +
        renderProbability(ch, tr) +
        renderAstro(d, moonEmoji, tr) +
        renderChartSection(d, tr) +
        renderFacts(facts, isLoadingFacts, isRTL, tr);

    document.getElementById('dash-panel').innerHTML = html;

    // Draw charts after DOM is ready (lazy load Chart.js first)
    loadChartJs().then(() => {
        setTimeout(() => drawCharts(d), 80);
    });
}

function drawCharts(d) {
    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDark ? '#94a3b8' : '#64748b';

    if (tempChartInst)   { tempChartInst.destroy();   tempChartInst   = null; }
    if (precipChartInst) { precipChartInst.destroy(); precipChartInst = null; }

    const tc = document.getElementById('tempChart');
    if (tc && window.Chart) {
        tempChartInst = new Chart(tc, {
            type: 'line',
            data: {
                labels:   d.hourly.map(x => fmtTime(x.time)),
                datasets: [
                    { label: 'Temp',       data: d.hourly.map(x => tv(x.temp,   x.tempF)),
                      borderColor: 'var(--accent)', backgroundColor: 'rgba(5,150,105,0.08)',
                      fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: 'var(--accent)', borderWidth: 2 },
                    { label: 'Feels like', data: d.hourly.map(x => tv(x.feelsC, x.feelsF)),
                      borderColor: 'var(--warm)',   backgroundColor: 'transparent',
                      borderDash: [5,4], tension: .4, pointRadius: 2, pointBackgroundColor: 'var(--warm)', borderWidth: 1.5 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom',
                    labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, font: { size: 10 }, color: tickColor } } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: tickColor, maxRotation: 0 } },
                    y: { grid: { color: gridColor }, ticks: { font: { size: 9 }, color: tickColor, callback: v => v + '°' } }
                }
            }
        });
    }

    const pc = document.getElementById('precipChart');
    if (pc && window.Chart) {
        precipChartInst = new Chart(pc, {
            type: 'bar',
            data: {
                labels:   d.hourly.map(x => fmtTime(x.time)),
                datasets: [{ label: 'Rain %', data: d.hourly.map(x => +x.chanceofrain),
                    backgroundColor: 'rgba(5,150,105,0.45)', borderRadius: 4, borderSkipped: false }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: tickColor, maxRotation: 0 } },
                    y: { grid: { color: gridColor }, max: 100, ticks: { font: { size: 9 }, color: tickColor, callback: v => v + '%' } }
                }
            }
        });
    }
}

/* ═══════════════════════════════════════════════════════════
   BASEMAP CONTROL
   ═══════════════════════════════════════════════════════════ */

function switchBasemap(key) {
    if (currentTileLayer) map.removeLayer(currentTileLayer);
    const bm = BASEMAPS.find(b => b.key === key);
    if (!bm) return;
    currentBasemapKey = key;
    currentTileLayer  = L.tileLayer(bm.url, {
        attribution: bm.attribution, subdomains: bm.subdomains || '', maxZoom: bm.maxZoom
    }).addTo(map);
    document.querySelectorAll('.basemap-dropdown-list li')
        .forEach(li => li.classList.toggle('active', li.dataset.key === key));
}

function buildBasemapControl() {
    if (basemapControl) basemapControl.remove();
    const isAr = currentLang === 'ar';
    const BC = L.Control.extend({
        options: { position: 'topright' },
        onAdd() {
            const wrap = L.DomUtil.create('div', 'leaflet-basemap-wrap');
            L.DomEvent.disableClickPropagation(wrap);
            L.DomEvent.disableScrollPropagation(wrap);
            wrap.innerHTML = `
                <button class="basemap-btn" id="basemap-toggle-btn"
                        title="${isAr ? 'خريطة الأساس' : 'Switch basemap'}"
                        aria-haspopup="listbox" aria-expanded="false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                    </svg>
                </button>
                <div class="basemap-dropdown" id="basemap-dropdown" role="listbox">
                    <div class="basemap-dropdown-header">${isAr ? 'خريطة الأساس' : 'Basemap'}</div>
                    <ul class="basemap-dropdown-list">
                        ${BASEMAPS.map(bm => `
                        <li data-key="${bm.key}" class="${bm.key === currentBasemapKey ? 'active' : ''}"
                            role="option" aria-selected="${bm.key === currentBasemapKey}">
                            <span class="basemap-swatch" style="background:${bm.color}"></span>
                            ${isAr ? (bm.labelAr || bm.labelEn) : bm.labelEn}
                        </li>`).join('')}
                    </ul>
                </div>`;

            // Wire up events without inline onclick
            wrap.querySelector('#basemap-toggle-btn').addEventListener('click', e => {
                e.stopPropagation();
                const dd  = wrap.querySelector('#basemap-dropdown');
                const btn = wrap.querySelector('#basemap-toggle-btn');
                const open = dd.classList.toggle('open');
                btn.setAttribute('aria-expanded', open);
            });
            wrap.querySelectorAll('.basemap-dropdown-list li').forEach(li => {
                li.addEventListener('click', () => {
                    switchBasemap(li.dataset.key);
                    wrap.querySelector('#basemap-dropdown').classList.remove('open');
                    wrap.querySelector('#basemap-toggle-btn').setAttribute('aria-expanded', 'false');
                });
            });
            return wrap;
        }
    });
    basemapControl = new BC();
    basemapControl.addTo(map);
}

document.addEventListener('click', e => {
    if (!e.target.closest('.leaflet-basemap-wrap')) {
        document.querySelectorAll('.basemap-dropdown.open').forEach(d => d.classList.remove('open'));
    }
});

/* ═══════════════════════════════════════════════════════════
   LEGEND
   ═══════════════════════════════════════════════════════════ */

function buildLegend() {
    if (legendControl) legendControl.remove();
    legendControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd() {
            const div = L.DomUtil.create('div', 'map-legend');
            div.setAttribute('aria-label', 'Temperature colour legend');
            const t   = T[currentLang].tempLegend;
            div.innerHTML = `<div class="l-title">${t}</div>` +
                [[41,'> 40°'],[36,'36–40°'],[31,'31–35°'],[26,'26–30°'],[0,'< 26°']].map(([v, lbl]) =>
                    `<div class="l-row">
                        <span class="l-dot" style="background:${getColor(v)}"></span>
                        <span style="font-size:11px">${lbl}</span>
                    </div>`
                ).join('');
            return div;
        }
    });
    new legendControl().addTo(map);
}

/* ═══════════════════════════════════════════════════════════
   REGION SELECT (desktop + mobile)
   ═══════════════════════════════════════════════════════════ */

function buildSelect(selectedKey) {
    const ids = ['region-select', 'region-select-m'];
    const t   = T[currentLang];
    const inner = `<option value="ALL">${t.regions.ALL}</option>
        <optgroup label="${t.optgroup}">
            ${['DOHA','RAYYAN','WAKRAH','KHOR','SHAMAL','SHEEHANIYA','DAAYEN']
                .map(k => `<option value="${k}"${k === selectedKey ? ' selected' : ''}>${t.regions[k]}</option>`)
                .join('')}
        </optgroup>`;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = inner;
        if (selectedKey === 'ALL') el.value = 'ALL';
    });
}

/* ═══════════════════════════════════════════════════════════
   LANGUAGE
   ═══════════════════════════════════════════════════════════ */

function setLang(lang) {
    currentLang = lang;
    const html  = document.documentElement;
    html.lang   = lang;
    html.dir    = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('ar', lang === 'ar');

    const t = T[lang];
    document.title = t.pageTitle;
    document.getElementById('nav-title').textContent    = t.navTitle;
    document.getElementById('region-label').textContent = t.regionLabel;
    const rlm = document.getElementById('region-label-m');
    if (rlm) rlm.textContent = t.regionLabel;
    const ht = document.getElementById('hint-txt');
    const hs = document.getElementById('hint-sub');
    if (ht) ht.textContent = t.hintTxt;
    if (hs) hs.textContent = t.hintSub;

    document.getElementById('btn-en').setAttribute('aria-pressed', lang === 'en');
    document.getElementById('btn-ar').setAttribute('aria-pressed', lang === 'ar');

    const key = document.getElementById('region-select').value;
    buildSelect(key);
    buildLegend();
    if (map) buildBasemapControl();
    updateFreshnessLabel();

    if (lastTown && lastReading) {
        const cachedFacts = factsCache.get(`${lastTown.name}-${T.en.regions[currentRegionKey]}-${lang}`);
        renderDashboard(lastTown, lastReading, lastMoon, cachedFacts || t.searching, !cachedFacts, currentRegionKey);
        if (!cachedFacts) {
            getTownFacts(lastTown.name, lastTown.nameAr, T.en.regions[currentRegionKey]).then(facts => {
                const p = document.getElementById('facts-para');
                if (p) { p.textContent = facts; p.classList.remove('loading-pulse'); }
            });
        }
    } else {
        document.getElementById('dash-panel').innerHTML = `
            <div class="hero-empty">
                <div style="font-size:36px" aria-hidden="true">🗺️</div>
                <div class="hint-txt">${t.hintTxt}</div>
                <div class="hint-sub">${t.hintSub}</div>
            </div>`;
    }
}

/* ═══════════════════════════════════════════════════════════
   UNIT TOGGLE (syncs desktop + mobile buttons)
   ═══════════════════════════════════════════════════════════ */

function setUnit(u) {
    currentUnit = u;
    ['btnC','btnF','btnCm','btnFm'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const isActive = (id.startsWith('btnC') && u === 'C') || (id.startsWith('btnF') && u === 'F');
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    if (lastTown && lastReading) {
        const cachedFacts = factsCache.get(`${lastTown.name}-${T.en.regions[currentRegionKey]}-${currentLang}`);
        renderDashboard(lastTown, lastReading, lastMoon, cachedFacts || '', false, currentRegionKey);
    }
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════ */

function toggleTheme() {
    const d      = document.documentElement;
    const isDark = d.getAttribute('data-theme') === 'dark';
    d.setAttribute('data-theme', isDark ? '' : 'dark');
    const btn = document.getElementById('themeBtn');
    if (btn) {
        btn.textContent = isDark ? '🌙' : '☀️';
        btn.focus();   // preserve keyboard focus
    }
    if (lastTown && lastReading) {
        const cachedFacts = factsCache.get(`${lastTown.name}-${T.en.regions[currentRegionKey]}-${currentLang}`);
        renderDashboard(lastTown, lastReading, lastMoon, cachedFacts || '', false, currentRegionKey);
    }
}

/* ═══════════════════════════════════════════════════════════
   MAP INIT
   ═══════════════════════════════════════════════════════════ */

function initMap() {
    map          = L.map('map', { zoomControl: true }).setView([25.2854, 51.5310], 12);
    markersLayer = L.layerGroup().addTo(map);
    switchBasemap('esri_street');
    buildLegend();
    buildBasemapControl();

    document.getElementById('region-select').addEventListener('change', e => {
        updateView(e.target.value);
    });
    const rsm = document.getElementById('region-select-m');
    if (rsm) rsm.addEventListener('change', e => {
        document.getElementById('region-select').value = e.target.value;
        updateView(e.target.value);
    });
}

/* ═══════════════════════════════════════════════════════════
   UPDATE VIEW (fetch + plot markers)
   ═══════════════════════════════════════════════════════════ */

async function updateView(regionKey, isInitial = false) {
    currentRegionKey = regionKey;

    const rawTowns = DATA_POINTS[regionKey];
    if (!rawTowns) return;
    const towns = rawTowns.filter(t =>
        t && typeof t.lat === 'number' && !isNaN(t.lat) &&
             typeof t.lon === 'number' && !isNaN(t.lon)
    );
    if (!towns.length) return;

    const tr      = T[currentLang];
    const loading = document.getElementById('loading');
    const lText   = document.getElementById('loading-text');
    const lProg   = document.getElementById('loading-progress');
    const lBar    = document.getElementById('loading-bar-fill');
    const lBarWrap= document.getElementById('loading-bar');

    lText.textContent = tr.fetching;
    loading.style.display = 'flex';
    lProg.textContent = `0 / ${towns.length}`;
    lBar.style.width  = '0%';
    if (lBarWrap) lBarWrap.setAttribute('aria-valuenow', '0');

    markersLayer.clearLayers();
    activeMarkerEl = null;

    const bounds = L.latLngBounds(towns.map(t => [t.lat, t.lon]));
    if (bounds.isValid()) {
        map.invalidateSize();
        isInitial
            ? map.fitBounds(bounds.pad(0.25), { padding: [50,50] })
            : map.flyToBounds(bounds.pad(0.25), {
                padding:[50,50], animate:true, duration:1.5,
                maxZoom: regionKey === 'ALL' ? 9 : 13
              });
    }

    let done  = 0;
    const total = towns.length;

    // Batched fetching — max FETCH_CONCURRENCY at a time
    await fetchInBatches(towns, town =>
        fetchWttr(town)
            .then(raw => {
                const reading = parseWttr(raw);
                done++;
                lProg.textContent = `${done} / ${total}`;
                const pct = Math.round(done / total * 100);
                lBar.style.width = `${pct}%`;
                if (lBarWrap) lBarWrap.setAttribute('aria-valuenow', pct);

                const tmpVal = reading.temp ?? 0;
                const color  = getColor(tmpVal);
                const marker = L.marker([town.lat, town.lon], {
                    icon: makeTempIcon(tmpVal, color)
                }).addTo(markersLayer);

                // Accessibility label
                marker.getElement && setTimeout(() => {
                    const el = marker.getElement();
                    if (el) el.setAttribute('aria-label',
                        `${town.name}: ${reading.temp}°C, ${reading.condition || ''}`);
                }, 50);

                // Lightweight popup
                marker.bindPopup(`
                    <div style="min-width:140px;font-size:12px;direction:${currentLang === 'ar' ? 'rtl' : 'ltr'}">
                        <b style="color:var(--accent-dark)">${currentLang === 'ar' ? town.nameAr : town.name}</b><br>
                        ${reading.icon} ${reading.condition || ''}<br>
                        <span style="font-size:14px;font-weight:800">${reading.temp}°C</span>
                        &nbsp; H:${reading.todayMax}° L:${reading.todayMin}°<br>
                        <span style="font-size:10px;color:#94a3b8">${currentLang === 'ar' ? 'انقر للتفاصيل ←' : 'Click for full details →'}</span>
                    </div>`, { maxWidth: 200 });

                // Click → full dashboard
                marker.on('click', async () => {
                    // Deactivate previous active marker
                    if (activeMarkerEl) {
                        activeMarkerEl.style.boxShadow = '';
                        activeMarkerEl.style.animation = '';
                    }

                    // Activate this marker
                    setTimeout(() => {
                        const el = marker.getElement()?.querySelector('div');
                        if (el) {
                            el.style.boxShadow = `0 0 0 3px #fff, 0 0 0 5px ${color}`;
                            el.style.animation = 'markerPulse 1.5s ease-in-out infinite';
                            activeMarkerEl = el;
                        }
                    }, 30);

                    lastTown    = town;
                    lastReading = reading;

                    // Show skeleton immediately for perceived speed
                    showDashboardSkeleton();

                    const cachedFacts = factsCache.get(`${town.name}-${T.en.regions[regionKey]}-${currentLang}`);
                    renderDashboard(town, reading, lastMoon, cachedFacts || tr.searching, !cachedFacts, regionKey);

                    checkAlerts(reading);

                    if (!cachedFacts) {
                        const [facts, moon] = await Promise.all([
                            getTownFacts(town.name, town.nameAr, T.en.regions[regionKey]),
                            fetchMoon(town)
                        ]);
                        lastMoon = moon;
                        if (lastTown === town) {
                            const p = document.getElementById('facts-para');
                            if (p) { p.textContent = facts; p.classList.remove('loading-pulse'); }
                            renderDashboard(town, reading, moon, facts, false, regionKey);
                        }
                    }

                    // Mobile: skip popup, scroll straight to dashboard
                    if (window.innerWidth < 1024) {
                        marker.closePopup();
                        document.getElementById('dash-panel')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            })
            .catch(err => {
                done++;
                lProg.textContent = `${done} / ${total}`;
                const pct = Math.round(done / total * 100);
                lBar.style.width  = `${pct}%`;
                // Show error marker (⚠)
                const errMarker = L.marker([town.lat, town.lon], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div title="Failed: ${town.name}" style="
                            width:${IS_TOUCH ? 40 : 28}px;height:${IS_TOUCH ? 40 : 28}px;
                            border-radius:50%;background:#94a3b8;border:2px solid #fff;
                            display:flex;align-items:center;justify-content:center;
                            font-size:${IS_TOUCH ? 14 : 11}px;cursor:pointer;opacity:0.6">⚠</div>`,
                        iconSize: [IS_TOUCH ? 40 : 28, IS_TOUCH ? 40 : 28],
                        iconAnchor: [IS_TOUCH ? 20 : 14, IS_TOUCH ? 20 : 14]
                    })
                }).addTo(markersLayer);
                errMarker.bindPopup(`<div style="font-size:12px">
                    <b>${town.name}</b><br>
                    <span style="color:#ef4444">${tr.failed}</span>
                </div>`);
                console.warn(`wttr failed for ${town.name}:`, err.message);
            })
    );

    loading.style.display = 'none';
    lastFetchTime = Date.now();
    updateFreshnessLabel();

    // Start freshness ticker
    if (freshnessInterval) clearInterval(freshnessInterval);
    freshnessInterval = setInterval(updateFreshnessLabel, 60000);
}

/* ═══════════════════════════════════════════════════════════
   BOOT — wire event listeners, handle URL params
   ═══════════════════════════════════════════════════════════ */

window.onload = () => {
    buildSelect('DOHA');
    initMap();

    // Button event listeners (no inline onclick)
    document.getElementById('btn-en').addEventListener('click', () => setLang('en'));
    document.getElementById('btn-ar').addEventListener('click', () => setLang('ar'));
    document.getElementById('btnC').addEventListener('click',   () => setUnit('C'));
    document.getElementById('btnF').addEventListener('click',   () => setUnit('F'));
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    document.getElementById('geoBtn').addEventListener('click',   geoLocate);
    document.getElementById('refreshBtn').addEventListener('click', () => {
        weatherCache.clear();
        updateView(currentRegionKey);
    });
    document.getElementById('alert-dismiss').addEventListener('click', () => {
        document.getElementById('alert-banner').style.display = 'none';
    });

    const btnCm = document.getElementById('btnCm');
    const btnFm = document.getElementById('btnFm');
    if (btnCm) btnCm.addEventListener('click', () => setUnit('C'));
    if (btnFm) btnFm.addEventListener('click', () => setUnit('F'));

    // Read URL params for deep-linking (e.g. ?lang=ar&reg=KHOR)
    const params = new URLSearchParams(location.search);
    if (params.get('lang') === 'ar') setLang('ar');
    const reg = params.get('reg');
    const initialRegion = reg && DATA_POINTS[reg] ? reg : 'DOHA';
    document.getElementById('region-select').value = initialRegion;
    buildSelect(initialRegion);

    setTimeout(() => {
        try { updateView(initialRegion, true); }
        catch (e) {
            console.error('Boot error:', e);
            document.getElementById('loading').style.display = 'none';
        }
    }, 300);
};
