# Qatar Live Weather Map

> **Real-time interactive weather map for Qatar powered exclusively by [wttr.in](https://wttr.in)**
> *by [mohammedlglg](https://github.com/mohammedlglg)*

---

## ✨ What's Different from the Multi-Source Version

This edition uses **only wttr.in** as the data source, which unlocks richer data per click:

| Feature | wttr.in Edition |
|---|---|
| Current temp, feels like, humidity, pressure | ✅ |
| UV index, visibility, cloud cover, precipitation | ✅ |
| **3-day forecast** (max/min/icon per day) | ✅ |
| **Hourly breakdown** (8 × 3-hour slots today) | ✅ |
| **Astronomy** — sunrise, sunset, moon phase | ✅ |
| Progressive loading with progress bar | ✅ |
| Weather condition text + emoji icon | ✅ |

## ⚠️ Important: wttr.in Rate Limits

wttr.in has **no batch API** — each location is fetched individually. This means:

- Markers appear **progressively** as each fetch completes (progress bar shows status)
- The **All Qatar** view (60+ locations) may take 10–20 seconds to fully load
- wttr.in may occasionally rate-limit requests — if markers stop appearing, wait 30 seconds and change region to retry
- For fastest loading, use **municipality-level** views (Doha, Rayyan, etc.) rather than All Qatar

## 📂 Project Structure

```
qatar-live-weather/
├── index.html          ← Entry point (emerald green theme)
├── style.css           ← Styles (wttr.in branded, progress bar, forecast strip, hourly row)
├── translations.js     ← EN/AR strings including wttr-specific fields
├── data.js             ← Location coordinates (shared with multi-source version)
└── app.js              ← Single-source wttr.in logic with progressive loading
```

## 🚀 Quick Start

```bash
# No build step — just serve the files
python3 -m http.server 8080
# Visit http://localhost:8080
```

## 🌐 Deploy to GitHub Pages

Same process as the main version:
1. Push to a GitHub repo
2. Settings → Pages → main branch / root
3. Live at `https://mohammedlglg.github.io/qatar-live-weather/`

## 📡 wttr.in API

Each location fetches: `https://wttr.in/{lat},{lon}?format=j1`

The `j1` JSON format returns:
- `current_condition[0]` — live temp, feels like, wind, humidity, UV, visibility, cloud, precip, weather code
- `weather[0..2]` — 3 days of forecast (max/min/hourly)
- `weather[n].hourly[]` — 8 × 3-hour slots with temp, condition, rain chance
- `weather[n].astronomy[0]` — sunrise, sunset, moon phase, moon illumination

## 🎨 Colour Theme

Emerald green (`#059669`) throughout — distinct from the purple multi-source version so both can coexist in the same GitHub repo.

---

<div align="center">
  <sub>Built with ☁️ &nbsp;·&nbsp; Powered by <a href="https://wttr.in">wttr.in</a> &nbsp;·&nbsp; by <strong>mohammedlglg</strong></sub>
</div>
