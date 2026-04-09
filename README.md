# Qatar Live Weather Map

> **Real-time interactive weather map + rich dashboard for Qatar — powered by [wttr.in](https://wttr.in)**  
> *by [mohammedlglg](https://github.com/mohammedlglg)*

---

## ✨ What This Version Adds

This edition combines a **live Leaflet map** (colour-coded temperature markers across all municipalities) with a **full-screen dashboard panel** that opens when you click any marker. Everything is powered exclusively by wttr.in.

| Feature | Status |
|---|---|
| Interactive Leaflet map with coloured temp markers | ✅ |
| 7 municipalities + All Qatar region selector | ✅ |
| 6 switchable basemaps (Street, Satellite, Topo, …) | ✅ |
| Temperature legend (bottom-left on map) | ✅ |
| Progressive loading with progress bar | ✅ |
| **Hero card** — large temp, H/L, feels-like | ✅ |
| **Quick stats** — UV, humidity, wind, pressure | ✅ |
| **Hourly forecast strip** with "Now" highlight | ✅ |
| **3-day forecast** cards | ✅ |
| **Current conditions** — visibility, dew point, heat index, wind gust | ✅ |
| **Probability outlook** — rain, sunshine, thunder, fog, snow… | ✅ |
| **Sun & Moon** — arc diagram, moonrise/set, illumination | ✅ |
| **Temperature trend chart** (Chart.js line) | ✅ |
| **Precipitation chance chart** (Chart.js bar) | ✅ |
| **Wind compass** SVG | ✅ |
| Wikipedia quick facts per location | ✅ |
| **°C / °F toggle** | ✅ |
| **Light / Dark theme** | ✅ |
| **Bilingual EN / AR** with full RTL layout | ✅ |

---

## 📂 Project Structure

```
qatar-live-weather/
├── index.html        ← Entry point — markup only, references all other files
├── style.css         ← All styles (CSS variables, layout, components, dark mode, RTL)
├── translations.js   ← EN/AR string table (T.en / T.ar)
├── data.js           ← Location coordinates for all 7 municipalities
├── app.js            ← All application logic (map, dashboard, charts, fetch, i18n)
├── ads.txt           ← Google AdSense verification
└── README.md         ← This file
```

---

## 🚀 Quick Start

No build step required — just serve the files over HTTP:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Or use any static file server (VS Code Live Server, `npx serve`, Nginx, etc.).

---

## 🌐 Deploy to GitHub Pages

1. Push the repo to GitHub.
2. **Settings → Pages → Deploy from branch → main / root**.
3. Live at `https://mohammedlglg.github.io/qatar-live-weather/`

---

## 📡 wttr.in API

Each marker fetches two endpoints:

| Endpoint | Used for |
|---|---|
| `https://wttr.in/{lat},{lon}?format=j1` | Full JSON — current conditions, 3-day forecast, hourly, astronomy |
| `https://wttr.in/{lat},{lon}?format=%m` | Moon emoji (separate call, triggered on marker click) |

### ⚠️ Rate Limits

wttr.in has **no batch API** — every location is fetched individually.

- Markers appear **progressively** as each fetch completes (progress bar shows `done / total`).
- The **All Qatar** view (60 + locations) may take 10–20 seconds to fully load.
- If markers stop appearing, wttr.in may be rate-limiting — wait 30 s and switch region to retry.
- For fastest results, use **municipality-level** views rather than All Qatar.

---

## 🎨 Design

| Token | Value |
|---|---|
| Primary font | Plus Jakarta Sans |
| Arabic font   | Noto Sans Arabic |
| Accent colour | `#059669` (emerald) |
| Dark accent   | `#10b981` |
| Radius        | 14 px (cards), 10 px (components) |
| Theme         | Light default, full dark mode via `[data-theme="dark"]` |

All colours are CSS variables defined in `:root` — swap the accent to rebrand instantly.

---

## 🗺️ Municipalities Covered

| Key | Region |
|---|---|
| DOHA | Doha (Ad Dawhah) — 15 locations |
| RAYYAN | Ar Rayyan — 10 locations |
| WAKRAH | Al Wakrah — 7 locations |
| KHOR | Al Khor & Dhekra — 5 locations |
| SHAMAL | Ash Shamal — 7 locations |
| SHEEHANIYA | Ash Sheehaniya — 6 locations |
| DAAYEN | Ad Daayen — 6 locations |

Add or remove entries in `data.js` — the map and select rebuild automatically.

---

<div align="center">
  <sub>Built with ☁️ &nbsp;·&nbsp; Powered by <a href="https://wttr.in">wttr.in</a> &nbsp;·&nbsp; by <strong>mohammedlglg</strong></sub>
</div>
