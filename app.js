/**
 * app.js
 * Qatar Live Weather Map
 * by mohammedlglg
 *
 * wttr.in JSON format (format=j1) provides per location:
 *   current_condition[0]  — live readings
 *   weather[0..2]         — today + 2 days forecast
 *   weather[n].hourly[]   — 8 x 3-hour slots per day
 *   weather[n].astronomy  — sunrise, sunset, moon phase
 *
 * Because wttr.in has no batch endpoint, all fetches are
 * individual and run in parallel. A progress bar tracks
 * how many have completed so the map fills in progressively.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   BASEMAPS  (no API key required)
   ═══════════════════════════════════════════════════════════════ */
const BASEMAPS = [
    { key:'carto_light',  labelEn:'Light',        labelAr:'فاتح',           color:'#e5e7eb',
      url:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution:'&copy; CARTO', subdomains:'abcd', maxZoom:20 },
    { key:'carto_dark',   labelEn:'Dark',          labelAr:'داكن',           color:'#1e293b',
      url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:'&copy; CARTO', subdomains:'abcd', maxZoom:20 },
    { key:'osm',          labelEn:'Street Map',    labelAr:'خريطة الشوارع',  color:'#bfdbfe',
      url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:'&copy; OpenStreetMap', subdomains:'abc', maxZoom:19 },
    { key:'esri_street',  labelEn:'ESRI Street',   labelAr:'إسري شوارع',    color:'#fde68a',
      url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:'&copy; Esri', maxZoom:20 },
    { key:'esri_topo',    labelEn:'Topo',           labelAr:'طبوغرافي',      color:'#bbf7d0',
      url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:'&copy; Esri', maxZoom:20 },
    { key:'esri_imagery', labelEn:'Satellite',      labelAr:'صور الأقمار',   color:'#334155',
      url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:'&copy; Esri &mdash; Maxar', maxZoom:20 }
];

/* ═══════════════════════════════════════════════════════════════
   WTTR.IN  →  CONDITION ICON MAP
   Maps wttr.in weatherCode (WMO-style) to an emoji
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */
let map, markersLayer, legendControl, basemapControl;
let currentTileLayer  = null;
let currentBasemapKey = 'carto_light';
let currentLang       = 'en';
let currentRegionKey  = 'DOHA';
const factsCache      = new Map();
const weatherCache    = new Map();   // key: "lat,lon" → wttr JSON

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
const rnd = v => (v == null || isNaN(+v)) ? null : Math.round(+v);

function getColor(t) {
    return t > 40 ? '#b91c1c'
         : t > 35 ? '#ef4444'
         : t > 30 ? '#f59e0b'
         : t > 25 ? '#10b981'
         :          '#3b82f6';
}

function getWindDir(deg) {
    if (currentLang === 'ar') {
        const d = ['شمال','شمال.شرق','شرق','جنوب.شرق','جنوب','جنوب.غرب','غرب','شمال.غرب'];
        return d[Math.round(deg / 45) % 8];
    }
    return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8];
}

function getQatarTime() {
    const now  = new Date();
    const utc  = now.getTime() + now.getTimezoneOffset() * 60000;
    const q    = new Date(utc + 3 * 3600000);
    const h    = q.getHours().toString().padStart(2,'0');
    const m    = q.getMinutes().toString().padStart(2,'0');
    const day  = q.getDate().toString().padStart(2,'0');
    const mons = currentLang === 'ar'
        ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${mons[q.getMonth()]} ${q.getFullYear()}, ${h}:${m}`;
}

/* ── Day label from wttr date string "YYYY-MM-DD" ─────────── */
function dayLabel(dateStr) {
    const d   = new Date(dateStr + 'T12:00:00');
    const now = new Date();
    const td  = new Date(now.getTime() + now.getTimezoneOffset()*60000 + 3*3600000);
    const diffDays = Math.round((d - new Date(td.toISOString().slice(0,10)+'T12:00:00')) / 86400000);
    if (currentLang === 'ar') {
        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'غداً';
        const arDays = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
        return arDays[d.getDay()];
    }
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

/* ── Format "HH00" → "Hpm/am" ──────────────────────────────── */
function hourLabel(timeVal) {
    const h = Math.floor(+timeVal / 100);
    if (currentLang === 'ar') return `${h}:00`;
    if (h === 0)  return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h-12}pm`;
}

/* ═══════════════════════════════════════════════════════════════
   WTTR.IN  FETCH  (single location, with cache)
   ═══════════════════════════════════════════════════════════════ */
async function fetchWttr(town) {
    const cacheKey = `${town.lat},${town.lon}`;
    if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey);

    const res = await fetch(
        `https://wttr.in/${town.lat},${town.lon}?format=j1`,
        { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`wttr HTTP ${res.status}`);
    const data = await res.json();
    weatherCache.set(cacheKey, data);
    return data;
}

/* ── Parse a wttr j1 response into a flat reading object ───── */
function parseWttr(data) {
    const c = data.current_condition?.[0] || {};
    const w = data.weather?.[0]           || {};
    const a = w.astronomy?.[0]            || {};
    return {
        temp:      rnd(c.temp_C),
        feelsLike: rnd(c.FeelsLikeC),
        humidity:  rnd(c.humidity),
        windSpd:   rnd(c.windspeedKmph),
        windDeg:   rnd(c.winddirDegree),
        pressure:  rnd(c.pressure),
        uvIndex:   rnd(c.uvIndex),
        precip:    rnd(c.precipMM),
        visibility:rnd(c.visibility),
        cloud:     rnd(c.cloudcover),
        todayMax:  rnd(w.maxtempC),
        todayMin:  rnd(w.mintempC),
        condition: c.weatherDesc?.[0]?.value || null,
        icon:      WTTR_ICONS[+c.weatherCode] || '🌡️',
        sunrise:   a.sunrise || null,
        sunset:    a.sunset  || null,
        moonPhase: a.moon_phase || null,
        forecast:  (data.weather || []).map(day => ({
            date:    day.date,
            max:     rnd(day.maxtempC),
            min:     rnd(day.mintempC),
            icon:    WTTR_ICONS[+(day.hourly?.[4]?.weatherCode || 113)] || '🌡️',
            desc:    day.hourly?.[4]?.weatherDesc?.[0]?.value || ''
        })),
        hourly: (w.hourly || []).map(h => ({
            time: h.time,
            temp: rnd(h.tempC),
            icon: WTTR_ICONS[+h.weatherCode] || '🌡️',
            rain: rnd(h.chanceofrain),
        }))
    };
}

/* ═══════════════════════════════════════════════════════════════
   WIKIPEDIA FACTS
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   POPUP BUILDER  — rich wttr popup with forecast + hourly
   ═══════════════════════════════════════════════════════════════ */
function buildPopup(town, reading, factText, isLoadingFacts, regionKey) {
    const tr      = T[currentLang];
    const isRTL   = currentLang === 'ar';
    const name    = isRTL ? town.nameAr : town.name;
    const rName   = tr.regions[regionKey];
    const d       = reading;

    const row = (label, val) =>
        `<div style="display:flex;justify-content:space-between;padding:3px 8px;font-size:11px;border-bottom:1px solid #f1f5f9">
            <span style="color:#94a3b8;font-weight:700;text-transform:uppercase">${label}</span>
            <span style="font-weight:600;color:#1e293b">${val}</span>
        </div>`;

    const extras = [
        d.feelsLike  != null && row(tr.feelsLike,  `${d.feelsLike}°C`),
        d.todayMin   != null && row(tr.todayMin,   `${d.todayMin}°C`),
        d.humidity   != null && row(tr.humidity,   `${d.humidity}%`),
        d.pressure   != null && row(tr.pressure,   `${d.pressure} hPa`),
        d.uvIndex    != null && row(tr.uvIndex,     `${d.uvIndex}`),
        d.visibility != null && row(tr.visibility, `${d.visibility} km`),
        d.cloud      != null && row(tr.cloud,       `${d.cloud}%`),
        d.precip     != null && row(tr.precip,      `${d.precip} mm`),
    ].filter(Boolean).join('');

    const forecastHTML = d.forecast?.length ? `
        <div style="margin-top:8px">
            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px">${tr.forecast}</div>
            <div class="forecast-strip">
                ${d.forecast.map(f => `
                <div class="forecast-day">
                    <div class="fc-label">${dayLabel(f.date)}</div>
                    <div class="fc-icon">${f.icon}</div>
                    <div class="fc-max">${f.max}°</div>
                    <div class="fc-min">${f.min}°</div>
                </div>`).join('')}
            </div>
        </div>` : '';

    const hourlyHTML = d.hourly?.length ? `
        <div style="margin-top:8px">
            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px">${tr.hourly}</div>
            <div class="hourly-row">
                ${d.hourly.map(h => `
                <div class="hour-cell">
                    <div class="hc-time">${hourLabel(h.time)}</div>
                    <div class="hc-icon">${h.icon}</div>
                    <div class="hc-temp">${h.temp}°</div>
                    ${h.rain > 0 ? `<div style="font-size:8px;color:#3b82f6">${h.rain}%💧</div>` : ''}
                </div>`).join('')}
            </div>
        </div>` : '';

    const astroHTML = (d.sunrise || d.sunset) ? `
        <div class="astro-row">
            ${d.sunrise ? `<div class="astro-item">🌅 ${tr.sunrise}: ${d.sunrise}</div>` : ''}
            ${d.sunset  ? `<div class="astro-item">🌇 ${tr.sunset}: ${d.sunset}</div>`   : ''}
            ${d.moonPhase ? `<div class="astro-item">🌙 ${d.moonPhase}</div>` : ''}
        </div>` : '';

    return `
    <div class="weather-popup"
         style="min-width:260px;max-width:310px;max-height:520px;overflow-y:auto;
                direction:${isRTL?'rtl':'ltr'};
                font-family:${isRTL?"'Noto Sans Arabic',sans-serif":'inherit'}">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;gap:6px">
            <b style="line-height:1.3">${name}</b>
        </div>
        <div style="font-size:13px;margin-bottom:6px;color:#475569">
            ${d.icon || ''} ${d.condition || ''}
        </div>
        <span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:3px;font-weight:700">${rName}</span>

        <hr style="margin:8px 0;border-color:#f1f5f9">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px">
            <div style="background:#f0fdf4;padding:7px;border-radius:7px;text-align:center;border:1px solid #bbf7d0">
                <span style="font-size:10px;color:#94a3b8;font-weight:700;display:block">${tr.current}</span>
                <strong style="font-size:22px;color:#065f46">${d.temp}°C</strong>
            </div>
            <div style="background:#fff7ed;padding:7px;border-radius:7px;text-align:center;border:1px solid #fed7aa">
                <span style="font-size:10px;color:#94a3b8;font-weight:700;display:block">${tr.todayMax}</span>
                <strong style="font-size:22px;color:#ea580c">${d.todayMax}°C</strong>
            </div>
        </div>

        <div style="background:#f8fafc;border-radius:7px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:8px">
            ${extras}
            <div style="display:flex;justify-content:space-between;padding:5px 8px;font-size:11px">
                <span style="color:#94a3b8;font-weight:700;text-transform:uppercase">${tr.windSpeed}</span>
                <span style="font-weight:600;color:#1e293b;display:flex;align-items:center;gap:4px">
                    ${d.windSpd} km/h ${getWindDir(d.windDeg)}
                    <span style="display:inline-block;transform:rotate(${d.windDeg}deg)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3">
                            <line x1="12" y1="19" x2="12" y2="5"/>
                            <polyline points="5 12 12 5 19 12"/>
                        </svg>
                    </span>
                </span>
            </div>
        </div>

        ${forecastHTML}
        ${hourlyHTML}
        ${astroHTML}

        <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
                <span style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase">${tr.quickFacts}</span>
                <span style="font-size:9px;color:#cbd5e1;font-style:italic">${tr.wikiSource}</span>
            </div>
            <p style="font-size:12px;color:#334155;line-height:1.5;font-style:italic;margin:0;
                      border-left:${isRTL?'none':'2px solid #6ee7b7'};
                      border-right:${isRTL?'2px solid #6ee7b7':'none'};
                      padding-left:${isRTL?'0':'8px'};
                      padding-right:${isRTL?'8px':'0'}"
               class="${isLoadingFacts?'loading-pulse':''}">
                ${factText}
            </p>
        </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   BASEMAP + LEGEND CONTROLS
   ═══════════════════════════════════════════════════════════════ */
function switchBasemap(key) {
    if (currentTileLayer) map.removeLayer(currentTileLayer);
    const bm = BASEMAPS.find(b => b.key === key);
    if (!bm) return;
    currentBasemapKey = key;
    currentTileLayer  = L.tileLayer(bm.url, {
        attribution: bm.attribution, subdomains: bm.subdomains || '', maxZoom: bm.maxZoom
    }).addTo(map);
    document.querySelectorAll('.basemap-dropdown-list li').forEach(li =>
        li.classList.toggle('active', li.dataset.key === key)
    );
}

function buildBasemapControl() {
    if (basemapControl) basemapControl.remove();
    const isAr = currentLang === 'ar';
    basemapControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd() {
            const wrap = L.DomUtil.create('div', 'leaflet-basemap-wrap');
            L.DomEvent.disableClickPropagation(wrap);
            L.DomEvent.disableScrollPropagation(wrap);
            wrap.innerHTML = `
                <button class="basemap-btn" title="${isAr?'خريطة الأساس':'Switch basemap'}"
                        onclick="toggleBasemapDropdown(event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                    </svg>
                </button>
                <div class="basemap-dropdown" id="basemap-dropdown">
                    <div class="basemap-dropdown-header">${isAr?'خريطة الأساس':'Basemap'}</div>
                    <ul class="basemap-dropdown-list">
                        ${BASEMAPS.map(bm=>`
                        <li data-key="${bm.key}" class="${bm.key===currentBasemapKey?'active':''}"
                            onclick="switchBasemap('${bm.key}');closeBasemapDropdown()">
                            <span class="basemap-swatch" style="background:${bm.color}"></span>
                            ${isAr ? (bm.labelAr||bm.labelEn) : bm.labelEn}
                        </li>`).join('')}
                    </ul>
                </div>`;
            return wrap;
        }
    });
    new basemapControl().addTo(map);
}

function toggleBasemapDropdown(e) {
    e.stopPropagation();
    document.getElementById('basemap-dropdown')?.classList.toggle('open');
}
function closeBasemapDropdown() {
    document.getElementById('basemap-dropdown')?.classList.remove('open');
}
document.addEventListener('click', e => {
    if (!e.target.closest('.leaflet-basemap-wrap')) closeBasemapDropdown();
});

function buildLegend() {
    if (legendControl) legendControl.remove();
    legendControl = L.control({ position: 'bottomright' });
    legendControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        const t   = T[currentLang];
        div.innerHTML = `<div style="font-weight:700;font-size:11px;text-transform:uppercase;text-align:center;color:#475569;margin-bottom:4px">${t.tempLegend}</div>`;
        [[41,'> 40°C'],[36,'36–40°C'],[31,'31–35°C'],[26,'26–30°C'],[0,'< 26°C']].forEach(([v,lbl]) => {
            div.innerHTML += `<div style="display:flex;align-items:center;margin-bottom:3px">
                <i style="background:${getColor(v)};width:16px;height:16px;border-radius:50%;display:inline-block;margin-right:7px;border:1px solid #fff;flex-shrink:0"></i>${lbl}</div>`;
        });
        return div;
    };
    legendControl.addTo(map);
}

/* ═══════════════════════════════════════════════════════════════
   REGION SELECT
   ═══════════════════════════════════════════════════════════════ */
function buildSelect(selectedKey) {
    const sel = document.getElementById('region-select');
    const t   = T[currentLang];
    sel.innerHTML = `<option value="ALL">${t.regions.ALL}</option>
        <optgroup label="${t.optgroup}">
            ${['DOHA','RAYYAN','WAKRAH','KHOR','SHAMAL','SHEEHANIYA','DAAYEN']
                .map(k=>`<option value="${k}"${k===selectedKey?' selected':''}>${t.regions[k]}</option>`)
                .join('')}
        </optgroup>`;
    if (selectedKey === 'ALL') sel.value = 'ALL';
}

/* ═══════════════════════════════════════════════════════════════
   LANGUAGE SWITCHER
   ═══════════════════════════════════════════════════════════════ */
function setLang(lang) {
    currentLang = lang;
    const html  = document.documentElement;
    html.lang = lang;
    html.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('ar', lang === 'ar');

    const t = T[lang];
    document.title = t.pageTitle;
    document.getElementById('region-label').textContent  = t.regionLabel;
    document.getElementById('card1-title').textContent   = t.card1Title;
    document.getElementById('card1-body').textContent    = t.card1Body;
    document.getElementById('card2-title').textContent   = t.card2Title;
    document.getElementById('card2-body').textContent    = t.card2Body;
    document.getElementById('card3-title').textContent   = t.card3Title;
    document.getElementById('card3-body').textContent    = t.card3Body;

    const key = document.getElementById('region-select').value;
    document.getElementById('map-title').textContent = t.mapTitle(t.regions[key]);
    buildSelect(key);
    document.getElementById('collection-time').textContent = t.updated(getQatarTime());
    buildLegend();
    if (map) buildBasemapControl();

    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');

    const loading = document.getElementById('loading-text');
    if (loading) loading.textContent = t.fetching;
}

/* ═══════════════════════════════════════════════════════════════
   MAP INIT
   ═══════════════════════════════════════════════════════════════ */
function initMap() {
    map = L.map('map').setView([25.2854, 51.5310], 12);
    markersLayer = L.layerGroup().addTo(map);
    switchBasemap('esri_street');
    buildLegend();
    buildBasemapControl();
    document.getElementById('region-select').addEventListener('change', e => updateView(e.target.value));
}

/* ═══════════════════════════════════════════════════════════════
   MAIN UPDATE — progressive parallel fetch with progress bar
   ═══════════════════════════════════════════════════════════════ */
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

    lText.textContent = tr.fetching;
    loading.style.display = 'flex';
    lProg.textContent = `0 / ${towns.length}`;
    lBar.style.width  = '0%';

    document.getElementById('map-title').textContent = tr.mapTitle(tr.regions[regionKey]);
    markersLayer.clearLayers();

    // Fit bounds
    const bounds = L.latLngBounds(towns.map(t => [t.lat, t.lon]));
    if (bounds.isValid()) {
        map.invalidateSize();
        const opts = { padding:[50,50], animate:!isInitial, duration:1.5, maxZoom: regionKey==='ALL'?9:13 };
        isInitial
            ? map.fitBounds(bounds.pad(0.25), {padding:[50,50]})
            : map.flyToBounds(bounds.pad(0.25), opts);
    }

    let done = 0;
    const total = towns.length;

    // Kick off all fetches in parallel; add each marker as it resolves
    const promises = towns.map(town =>
        fetchWttr(town)
            .then(raw => {
                const reading = parseWttr(raw);
                done++;
                lProg.textContent = `${done} / ${total}`;
                lBar.style.width  = `${Math.round(done/total*100)}%`;

                // Place marker immediately
                const temp   = reading.temp ?? 0;
                const marker = L.circleMarker([town.lat, town.lon], {
                    radius:14, fillColor:getColor(temp),
                    color:'#fff', weight:2, opacity:1, fillOpacity:0.9
                }).addTo(markersLayer);

                marker.bindTooltip(`${temp}`, {
                    permanent:true, direction:'center', className:'temp-label'
                });

                // Click → rich popup
                marker.on('click', async () => {
                    marker.bindPopup(
                        buildPopup(town, reading, tr.searching, true, regionKey),
                        { maxWidth: 320 }
                    ).openPopup();
                    const facts = await getTownFacts(town.name, town.nameAr, T.en.regions[regionKey]);
                    if (marker.isPopupOpen()) {
                        marker.setPopupContent(
                            buildPopup(town, reading, facts, false, regionKey)
                        );
                    }
                });
            })
            .catch(err => {
                done++;
                lProg.textContent = `${done} / ${total}`;
                lBar.style.width  = `${Math.round(done/total*100)}%`;
                console.warn(`wttr failed for ${town.name}:`, err.message);
            })
    );

    await Promise.allSettled(promises);

    loading.style.display = 'none';
    document.getElementById('collection-time').textContent = tr.updated(getQatarTime());
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════ */
window.onload = () => {
    buildSelect('DOHA');
    initMap();
    setTimeout(() => {
        try { updateView('DOHA', true); }
        catch(e) {
            console.error('Boot error:', e);
            document.getElementById('loading').style.display = 'none';
        }
    }, 300);
};
