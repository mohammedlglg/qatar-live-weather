# Qatar Live Weather Map

> **Real-time interactive weather map + rich dashboard for Qatar — powered by [wttr.in](https://wttr.in)**  
> *by [mohammedlglg](https://github.com/mohammedlglg)*  
> 🌐 Live at **[qatarliveweather.com](https://qatarliveweather.com)**

---

## ✨ Features

This project combines a **live Leaflet map** (colour-coded temperature markers across all municipalities) with a **full-screen dashboard panel** that opens when you click any marker. Everything is powered exclusively by wttr.in.

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
| **Extreme heat alerts** (feels-like > 45 °C) | ✅ |
| **Dust & sandstorm alerts** (low visibility + high wind) | ✅ |
| **Prayer times** with next-prayer highlight | ✅ |
| Wikipedia quick facts per location | ✅ |
| **°C / °F toggle** | ✅ |
| **Light / Dark theme** | ✅ |
| **Bilingual EN / AR** with full RTL layout | ✅ |
| **PWA** — installable, offline support | ✅ |
| **Share by URL** — deep-link any location | ✅ |
| **Geolocation** — finds nearest station to your position | ✅ |
| **Google AdSense** — ads load only after weather content renders | ✅ |
| **Google Analytics 4** — anonymised usage tracking | ✅ |
| **Cookie consent banner** — GDPR-friendly opt-in/opt-out | ✅ |

---

## 📂 Project Structure

```
qatar-live-weather/
├── index.html        ← Entry point — markup only, references all other files
├── style.css         ← All styles (CSS variables, layout, components, dark mode, RTL)
├── translations.js   ← EN/AR string table (T.en / T.ar)
├── data.js           ← Location coordinates for all 7 municipalities
├── app.js            ← All application logic (map, dashboard, charts, fetch, i18n, ads)
├── about.html        ← About page (static)
├── privacy.html      ← Privacy Policy (static)
├── contact.html      ← Contact page (static)
├── sitemap.xml       ← XML sitemap for Google Search Console
├── ads.txt           ← Google AdSense publisher verification
├── CNAME             ← Custom domain: qatarliveweather.com
├── favicon.svg       ← Site icon
├── .gitignore
├── LICENSE
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

## 🌐 Deploy to GitHub Pages (Custom Domain)

1. Push the repo to GitHub.
2. Go to **Settings → Pages → Deploy from branch → main / root**.
3. Under **Custom domain**, enter `qatarliveweather.com` and save.
4. Ensure the `CNAME` file at the repo root contains exactly:
   ```
   qatarliveweather.com
   ```
5. Live at **https://qatarliveweather.com**

> **Important:** Now that a custom domain is in use, all internal links, sitemaps, and canonical URLs must reference `https://qatarliveweather.com/` — **not** the old GitHub Pages path `mohammedlglg.github.io/qatar-live-weather/`. Mixing these causes redirect errors in Google Search Console.

---

## 🗺️ Sitemap & SEO

The `sitemap.xml` lists all indexable pages at their canonical URLs:

```xml
https://qatarliveweather.com/
https://qatarliveweather.com/about.html
https://qatarliveweather.com/privacy.html
https://qatarliveweather.com/contact.html
```

Submit or resubmit the sitemap in **Google Search Console → Sitemaps** whenever URLs change. All four pages return HTTP 200 — no redirects.

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
- The **All Qatar** view (60+ locations) may take 10–20 seconds to fully load.

---

## 🗺️ Regions Covered

All seven Qatari municipalities (*Baladiyat*):

| Municipality | Key Locations |
|---|---|
| 🏙️ Ad Dawhah (Doha) | West Bay, Lusail, The Pearl, Qatar University, Airport, Old Town, Hamad Port |
| 🏘️ Ar Rayyan | Education City, Al Waab, Sports City, Abu Samra |
| 🌊 Al Wakrah | Al Wakrah city, Mesaieed Industrial Area, Sealine, Inland Sea |
| 🏭 Al Khor & Dhekra | Al Khor city, Ras Laffan Industrial City |
| 🏝️ Ash Shamal | Al Zubara (UNESCO site), Al Ruwais |
| 🐪 Ash Sheehaniya | Dukhan, Camel Race Track, Al Shahaniya |
| 🌿 Ad Daayen | Umm Slal Mohammed, Al Kheesa, Al Daayen |

---

## 🍪 Privacy & Ads

- **Google AdSense** ads appear **only on `index.html`**, and only **after live weather data has loaded and is visible**. This prevents ads from displaying on an empty or loading screen, in compliance with Google's AdSense programme policies.
- **Google Analytics 4** collects anonymised usage data (pages visited, device type, region). Analytics cookies are only set after the user accepts via the cookie consent banner.
- No personally identifiable information is collected or stored on our servers.
- Full details: [qatarliveweather.com/privacy.html](https://qatarliveweather.com/privacy.html)

---

## 📄 License

MIT — see [LICENSE](LICENSE) for full terms.

---

## ⚠️ Disclaimer

Qatar Live Weather is an independent community project. It is **not affiliated with or endorsed by the Qatar Meteorology Department (QMD)**. For official weather warnings and forecasts, visit [met.gov.qa](https://www.met.gov.qa).
