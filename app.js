/**
 * app.js
 * Qatar Live Weather Map — Application logic
 * Combined: interactive Leaflet map + rich dashboard panel
 * by mohammedlglg
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

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

const weatherCache = new Map();
const factsCache   = new Map();

let lastTown    = null;
let lastReading = null;
let lastMoon    = '🌙';

let tempChartInst   = null;
let precipChartInst = null;

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
function wIcon(c) { return WTTR_ICONS[c] || '🌡️'; }

function uvLabel(uv) {
    if (uv <= 2)  return { t: 'Low',      c: 'var(--success)' };
    if (uv <= 5)  return { t: 'Moderate', c: 'var(--warm)'    };
    if (uv <= 7)  return { t: 'High',     c: '#f97316'        };
    if (uv <= 10) return { t: 'Very High',c: 'var(--danger)'  };
    return                 { t: 'Extreme', c: '#7c3aed'        };
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

/* ═══════════════════════════════════════════════════════════
   MARKER ICON
   Uses L.divIcon so the label is immune to Leaflet's RTL
   tooltip-offset bug.
   ═══════════════════════════════════════════════════════════ */
function makeTempIcon(temp, color) {
    const S = 28;
    return L.divIcon({
        className: '',
        html: `<div style="
            width:${S}px;height:${S}px;border-radius:50%;
            background:${color};border:2px solid #fff;box-sizing:border-box;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:800;color:#fff;
            text-shadow:0 0 3px rgba(0,0,0,0.85);
            direction:ltr;unicode-bidi:isolate;cursor:pointer;">${temp}</div>`,
        iconSize:    [S, S],
        iconAnchor:  [S / 2, S / 2],
        popupAnchor: [0, -(S / 2)]
    });
}

/* ═══════════════════════════════════════════════════════════
   FETCH
   ═══════════════════════════════════════════════════════════ */

async function fetchWttr(town) {
    const key = `${town.lat},${town.lon}`;
    if (weatherCache.has(key)) return weatherCache.get(key);
    const res = await fetch(
        `https://wttr.in/${town.lat},${town.lon}?format=j1`,
        { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) throw new Error(`wttr HTTP ${res.status}`);
    const data = await res.json();
    weatherCache.set(key, data);
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
        temp:       rnd(c.temp_C),       tempF:      rnd(c.temp_F),
        feelsLike:  rnd(c.FeelsLikeC),   feelsLikeF: rnd(c.FeelsLikeF),
        humidity:   rnd(c.humidity),
        windSpd:    rnd(c.windspeedKmph),
        windDeg:    rnd(c.winddirDegree),
        windDir16:  c.winddir16Point,
        pressure:   rnd(c.pressure),
        uvIndex:    rnd(c.uvIndex),
        precip:     rnd(c.precipMM),
        visibility: rnd(c.visibility),
        cloud:      rnd(c.cloudcover),
        weatherCode: +c.weatherCode,
        todayMax:   rnd(w.maxtempC),     todayMaxF:  rnd(w.maxtempF),
        todayMin:   rnd(w.mintempC),     todayMinF:  rnd(w.mintempF),
        condition:  c.weatherDesc?.[0]?.value || null,
        icon:       WTTR_ICONS[+c.weatherCode] || '🌡️',
        sunrise:    a.sunrise  || null,
        sunset:     a.sunset   || null,
        moonPhase:  a.moon_phase || null,
        moonrise:   a.moonrise || null,
        moonset:    a.moonset  || null,
        moonIll:    a.moon_illumination || null,
        sunHour:    w.sunHour  || null,
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
   DASHBOARD RENDER
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
    const dateStr     = now.toLocaleDateString(isRTL ? 'ar' : 'en', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const uvL = uvLabel(+d.uvIndex);

    let html = '';

    /* ── HERO ── */
    // In RTL the icon sits inline (via CSS), so we include it inside the top block
    html += `<div class="hero-card animate-in">
        <div>
            <div class="hero-loc">${rName}, Qatar</div>
            <div class="hero-city">${name}</div>
            <div class="hero-date">${dateStr}</div>
            ${isRTL ? `<div class="hero-weather-icon">${d.icon}</div>` : ''}
        </div>
        ${!isRTL ? `<div class="hero-weather-icon">${d.icon}</div>` : ''}
        <div>
            <div class="hero-temp-row">
                <span class="hero-temp">${tv(d.temp, d.tempF)}</span>
                <span class="hero-temp-unit">${tu()}</span>
            </div>
            <div class="hero-desc">${d.condition || ''}</div>
            <div class="hero-feels">${tr.feelsLike}: ${tv(d.feelsLike, d.feelsLikeF)}${tu()}</div>
            <div class="hero-hilo">H: ${tv(d.todayMax, d.todayMaxF)}° &nbsp; L: ${tv(d.todayMin, d.todayMinF)}°</div>
        </div>
    </div>`;

    /* ── QUICK STATS ── */
    html += `<div class="q-grid animate-in" style="animation-delay:.05s">
        <div class="q-card">
            <div class="q-icon" style="background:var(--warm-light)">☀️</div>
            <div>
                <div class="q-label">${tr.uvIndex}</div>
                <div class="q-val">${d.uvIndex}</div>
                <div class="q-sub" style="color:${uvL.c};font-weight:600">${uvL.t}</div>
            </div>
        </div>
        <div class="q-card">
            <div class="q-icon" style="background:var(--accent-light)">💧</div>
            <div>
                <div class="q-label">${tr.humidity}</div>
                <div class="q-val">${d.humidity}%</div>
                <div class="q-sub">${humDesc(+d.humidity)}</div>
            </div>
        </div>
        <div class="q-card">
            <div class="q-icon" style="background:var(--info-light)">💨</div>
            <div>
                <div class="q-label">${tr.windSpeed}</div>
                <div class="q-val">${d.windSpd} <span style="font-size:10px;font-weight:400">km/h</span></div>
                <div class="q-sub">${d.windDir16} — ${windDesc(+d.windSpd)}</div>
            </div>
        </div>
        <div class="q-card">
            <div class="q-icon" style="background:var(--success-light)">🌡️</div>
            <div>
                <div class="q-label">${tr.pressure}</div>
                <div class="q-val">${d.pressure} <span style="font-size:10px;font-weight:400">hPa</span></div>
                <div class="q-sub">${pressDesc(+d.pressure)}</div>
            </div>
        </div>
    </div>`;

    /* ── HOURLY ── */
    html += `<div class="sec-title animate-in" style="animation-delay:.08s">${tr.hourly}</div>
    <div class="hourly-scroll animate-in" style="animation-delay:.1s">`;
    d.hourly.forEach((h, i) => {
        const isNow = (i === hIdx);
        html += `<div class="h-card${isNow ? ' now' : ''}">
            <div class="hc-t">${isNow ? 'Now' : fmtTime(h.time)}</div>
            <div class="hc-i">${h.icon}</div>
            <div class="hc-temp">${tv(h.temp, h.tempF)}°</div>
            ${h.rain > 0 ? `<div class="hc-rain">${h.rain}%</div>` : ''}
        </div>`;
    });
    html += `</div>`;

    /* ── 3-DAY FORECAST ── */
    html += `<div class="sec-title animate-in" style="animation-delay:.12s">${tr.forecast}</div>
    <div class="forecast-grid animate-in" style="animation-delay:.14s">`;
    d.forecast.forEach(f => {
        html += `<div class="day-card">
            <div class="dc-day">${dayLabel(f.date)}</div>
            <div class="dc-date">${fmtDate(f.date)}</div>
            <div class="dc-icon">${f.icon}</div>
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
    html += `</div>`;

    /* ── CURRENT CONDITIONS ── */
    const vis = +d.visibility;
    html += `<div class="sec-title animate-in" style="animation-delay:.16s">${tr.conditions}</div>
    <div class="details-grid animate-in" style="animation-delay:.18s">
        <div class="d-card">
            <div class="d-head"><span class="d-icon">👁️</span><span class="d-title">${tr.visibility}</span></div>
            <div class="d-val">${vis} <span class="d-unit">km</span></div>
            <div class="d-sub">${visDesc(vis)}</div>
            <div class="d-bar"><div class="d-bar-fill" style="width:${Math.min(vis/20*100,100)}%;background:var(--accent)"></div></div>
        </div>
        <div class="d-card">
            <div class="d-head"><span class="d-icon">☁️</span><span class="d-title">${tr.cloud}</span></div>
            <div class="d-val">${d.cloud}<span class="d-unit">%</span></div>
            <div class="d-sub">${+d.cloud<25?'Mostly clear':+d.cloud<50?'Partly cloudy':+d.cloud<75?'Mostly cloudy':'Overcast'}</div>
            <div class="d-bar"><div class="d-bar-fill" style="width:${d.cloud}%;background:#94a3b8"></div></div>
        </div>
        <div class="d-card">
            <div class="d-head"><span class="d-icon">🌧️</span><span class="d-title">${tr.precip}</span></div>
            <div class="d-val">${d.precip} <span class="d-unit">mm</span></div>
            <div class="d-sub">${+d.precip === 0 ? 'No precipitation' : 'Active precip.'}</div>
        </div>
        ${ch.DewPointC != null ? `<div class="d-card">
            <div class="d-head"><span class="d-icon">💦</span><span class="d-title">Dew Point</span></div>
            <div class="d-val">${tv(ch.DewPointC, ch.DewPointF)}<span class="d-unit">${tu()}</span></div>
            <div class="d-sub">${+ch.DewPointC > 20 ? 'Muggy' : 'Comfortable'}</div>
        </div>` : ''}
        ${ch.HeatIndexC != null ? `<div class="d-card">
            <div class="d-head"><span class="d-icon">🔥</span><span class="d-title">Heat Index</span></div>
            <div class="d-val">${tv(ch.HeatIndexC, ch.HeatIndexF)}<span class="d-unit">${tu()}</span></div>
            <div class="d-sub">Wind chill: ${tv(ch.WindChillC, ch.WindChillF)}${tu()}</div>
        </div>` : ''}
        ${ch.WindGustKmph != null ? `<div class="d-card">
            <div class="d-head"><span class="d-icon">🌬️</span><span class="d-title">Wind Gust</span></div>
            <div class="d-val">${ch.WindGustKmph} <span class="d-unit">km/h</span></div>
            <div class="d-sub">Dir: ${d.windDir16} (${d.windDeg}°)</div>
        </div>` : ''}
    </div>`;

    /* ── PROBABILITY ── */
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
    html += `<div class="sec-title animate-in" style="animation-delay:.2s">${tr.probability}</div>
    <div class="prob-grid animate-in" style="animation-delay:.22s">`;
    probs.forEach(p => {
        html += `<div class="d-card">
            <div class="d-head"><span class="d-icon">${p.i}</span><span class="d-title">${p.l}</span></div>
            <div class="d-val">${p.v}<span class="d-unit">%</span></div>
            <div class="d-bar"><div class="d-bar-fill" style="width:${p.v}%;background:${p.c}"></div></div>
        </div>`;
    });
    html += `</div>`;

    /* ── SUN & MOON ── */
    html += `<div class="sec-title animate-in" style="animation-delay:.24s">${tr.sunMoon}</div>
    <div class="astro-row animate-in" style="animation-delay:.26s">`;

    if (d.sunrise || d.sunset) {
        html += `<div class="sun-card">
            <div class="sun-row">
                <div class="sun-item">
                    <div class="si-icon">🌅</div>
                    <div class="si-label">${tr.sunrise}</div>
                    <div class="si-time">${d.sunrise || '—'}</div>
                </div>
                ${d.sunHour ? `<div class="sun-item">
                    <div class="si-icon">☀️</div>
                    <div class="si-label">Sun Hours</div>
                    <div class="si-time">${d.sunHour}h</div>
                </div>` : ''}
                <div class="sun-item">
                    <div class="si-icon">🌇</div>
                    <div class="si-label">${tr.sunset}</div>
                    <div class="si-time">${d.sunset || '—'}</div>
                </div>
            </div>
            <div class="sun-arc">
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
        <div class="moon-emoji">${moonEmoji || '🌙'}</div>
        <div>
            <div class="mi-phase">${MOON_PHASES[moonEmoji] || d.moonPhase || 'Unknown'}</div>
            ${d.moonrise ? `<div class="mi-det">🌙 Rise: ${d.moonrise}</div>` : ''}
            ${d.moonset  ? `<div class="mi-det">🌘 Set: ${d.moonset}</div>`  : ''}
            ${d.moonIll  ? `<div class="mi-det">💡 ${d.moonIll}% illuminated</div>` : ''}
        </div>
    </div>`;
    html += `</div>`;

    /* ── CHARTS ── */
    html += `<div class="sec-title animate-in" style="animation-delay:.28s">${tr.tempTrend}</div>
    <div class="chart-card animate-in" style="animation-delay:.3s">
        <div style="position:relative;height:200px"><canvas id="tempChart"></canvas></div>
    </div>
    <div class="two-col animate-in" style="animation-delay:.32s">
        <div class="chart-card">
            <div class="chart-title">${tr.precipTrend}</div>
            <div style="position:relative;height:170px"><canvas id="precipChart"></canvas></div>
        </div>
        <div class="wind-card">
            <div class="chart-title">${tr.windDir}</div>
            <svg viewBox="0 0 200 200">
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

    /* ── QUICK FACTS ── */
    html += `<div class="sec-title animate-in" style="animation-delay:.34s">${tr.quickFacts}</div>
    <div class="chart-card animate-in" style="animation-delay:.36s">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:6px;font-style:italic">${tr.wikiSource}</div>
        <p id="facts-para"
           style="font-size:13px;color:var(--txt2);line-height:1.7;margin:0;
                  border-${isRTL ? 'right' : 'left'}:2px solid var(--accent-mid);
                  padding-${isRTL ? 'right' : 'left'}:10px;"
           class="${isLoadingFacts ? 'loading-pulse' : ''}">${facts}</p>
    </div>`;

    /* Write to DOM */
    document.getElementById('dash-panel').innerHTML = html;

    /* ── CHARTS: render after DOM is ready ── */
    setTimeout(() => {
        const isDark     = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        const tickColor  = isDark ? '#94a3b8' : '#64748b';

        if (tempChartInst)   tempChartInst.destroy();
        if (precipChartInst) precipChartInst.destroy();

        const tc = document.getElementById('tempChart');
        if (tc) {
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
        if (pc) {
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
    }, 80);
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
                <button class="basemap-btn" onclick="toggleBasemapDropdown(event)"
                        title="${isAr ? 'خريطة الأساس' : 'Switch basemap'}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                    </svg>
                </button>
                <div class="basemap-dropdown" id="basemap-dropdown">
                    <div class="basemap-dropdown-header">${isAr ? 'خريطة الأساس' : 'Basemap'}</div>
                    <ul class="basemap-dropdown-list">
                        ${BASEMAPS.map(bm => `
                        <li data-key="${bm.key}" class="${bm.key === currentBasemapKey ? 'active' : ''}"
                            onclick="switchBasemap('${bm.key}');closeBasemapDropdown()">
                            <span class="basemap-swatch" style="background:${bm.color}"></span>
                            ${isAr ? (bm.labelAr || bm.labelEn) : bm.labelEn}
                        </li>`).join('')}
                    </ul>
                </div>`;
            return wrap;
        }
    });
    basemapControl = new BC();
    basemapControl.addTo(map);
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

/* ═══════════════════════════════════════════════════════════
   LEGEND (Leaflet bottom-left control)
   ═══════════════════════════════════════════════════════════ */

function buildLegend() {
    if (legendControl) legendControl.remove();
    legendControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd() {
            const div = L.DomUtil.create('div', 'map-legend');
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
   REGION SELECT
   ═══════════════════════════════════════════════════════════ */

function buildSelect(selectedKey) {
    const sel = document.getElementById('region-select');
    const t   = T[currentLang];
    sel.innerHTML = `<option value="ALL">${t.regions.ALL}</option>
        <optgroup label="${t.optgroup}">
            ${['DOHA','RAYYAN','WAKRAH','KHOR','SHAMAL','SHEEHANIYA','DAAYEN']
                .map(k => `<option value="${k}"${k === selectedKey ? ' selected' : ''}>${t.regions[k]}</option>`)
                .join('')}
        </optgroup>`;
    if (selectedKey === 'ALL') sel.value = 'ALL';
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
    document.getElementById('nav-title').textContent      = t.navTitle;
    document.getElementById('region-label').textContent   = t.regionLabel;
    document.getElementById('hint-txt') && (document.getElementById('hint-txt').textContent = t.hintTxt);
    document.getElementById('hint-sub') && (document.getElementById('hint-sub').textContent = t.hintSub);

    const key = document.getElementById('region-select').value;
    document.getElementById('collection-time').textContent = t.updated(getQatarTime());

    buildSelect(key);
    buildLegend();
    if (map) buildBasemapControl();

    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');

    // Re-render dashboard in new language if a location is active
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
                <div style="font-size:36px">🗺️</div>
                <div class="hint-txt">${t.hintTxt}</div>
                <div class="hint-sub">${t.hintSub}</div>
            </div>`;
    }
}

/* ═══════════════════════════════════════════════════════════
   UNIT TOGGLE
   ═══════════════════════════════════════════════════════════ */

function setUnit(u) {
    currentUnit = u;
    document.getElementById('btnC').classList.toggle('active', u === 'C');
    document.getElementById('btnF').classList.toggle('active', u === 'F');
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
    document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
    // Re-render charts in new theme if active
    if (lastTown && lastReading) {
        const cachedFacts = factsCache.get(`${lastTown.name}-${T.en.regions[currentRegionKey]}-${currentLang}`);
        renderDashboard(lastTown, lastReading, lastMoon, cachedFacts || '', false, currentRegionKey);
    }
}

/* ═══════════════════════════════════════════════════════════
   MAP INIT
   ═══════════════════════════════════════════════════════════ */

function initMap() {
    map          = L.map('map').setView([25.2854, 51.5310], 12);
    markersLayer = L.layerGroup().addTo(map);
    switchBasemap('esri_street');
    buildLegend();
    buildBasemapControl();
    document.getElementById('region-select').addEventListener('change', e => updateView(e.target.value));
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

    lText.textContent = tr.fetching;
    loading.style.display = 'flex';
    lProg.textContent = `0 / ${towns.length}`;
    lBar.style.width  = '0%';

    markersLayer.clearLayers();

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

    await Promise.allSettled(towns.map(town =>
        fetchWttr(town)
            .then(raw => {
                const reading = parseWttr(raw);
                done++;
                lProg.textContent = `${done} / ${total}`;
                lBar.style.width  = `${Math.round(done / total * 100)}%`;

                const tmpVal = reading.temp ?? 0;
                const color  = getColor(tmpVal);
                const marker = L.marker([town.lat, town.lon], {
                    icon: makeTempIcon(tmpVal, color)
                }).addTo(markersLayer);

                // Lightweight popup on the map itself
                marker.bindPopup(`
                    <div style="min-width:140px;font-size:12px;direction:${currentLang === 'ar' ? 'rtl' : 'ltr'}">
                        <b style="color:var(--accent-dark)">${currentLang === 'ar' ? town.nameAr : town.name}</b><br>
                        ${reading.icon} ${reading.condition || ''}<br>
                        <span style="font-size:14px;font-weight:800">${reading.temp}°C</span>
                        &nbsp; H:${reading.todayMax}° L:${reading.todayMin}°<br>
                        <span style="font-size:10px;color:#94a3b8">Click for full details →</span>
                    </div>`, { maxWidth: 200 });

                // Click → full dashboard panel
                marker.on('click', async () => {
                    lastTown    = town;
                    lastReading = reading;
                    const cachedFacts = factsCache.get(`${town.name}-${T.en.regions[regionKey]}-${currentLang}`);
                    renderDashboard(town, reading, lastMoon, cachedFacts || tr.searching, !cachedFacts, regionKey);

                    if (!cachedFacts) {
                        const [facts, moon] = await Promise.all([
                            getTownFacts(town.name, town.nameAr, T.en.regions[regionKey]),
                            fetchMoon(town)
                        ]);
                        lastMoon = moon;
                        if (lastTown === town) {
                            const p = document.getElementById('facts-para');
                            if (p) { p.textContent = facts; p.classList.remove('loading-pulse'); }
                            // Re-render with moon emoji now available
                            renderDashboard(town, reading, moon, facts, false, regionKey);
                        }
                    }

                    // On mobile, scroll dashboard into view
                    if (window.innerWidth < 1024) {
                        document.getElementById('dash-panel')
                            .scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            })
            .catch(err => {
                done++;
                lProg.textContent = `${done} / ${total}`;
                lBar.style.width  = `${Math.round(done / total * 100)}%`;
                console.warn(`wttr failed for ${town.name}:`, err.message);
            })
    ));

    loading.style.display = 'none';
    document.getElementById('collection-time').textContent = tr.updated(getQatarTime());
}

/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */

window.onload = () => {
    buildSelect('DOHA');
    initMap();
    setTimeout(() => {
        try { updateView('DOHA', true); }
        catch (e) {
            console.error('Boot error:', e);
            document.getElementById('loading').style.display = 'none';
        }
    }, 300);
};
