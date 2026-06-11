/**
 * Qatar Live Weather — X (Twitter) Auto-Poster
 * ─────────────────────────────────────────────
 * Posts bilingual EN/AR weather updates (and alerts) to X.
 * Runs via GitHub Actions on a schedule — no manual effort needed.
 *
 * Dependencies : twitter-api-v2 (npm)
 * Weather data : Open-Meteo (free, no API key required)
 * Credentials  : Set as GitHub Secrets (never commit keys to git)
 *
 * Required secrets in your GitHub repo:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 */

import { TwitterApi } from 'twitter-api-v2';

// ── 1. Auth ────────────────────────────────────────────────────────────────
const client = new TwitterApi({
  appKey:       process.env.X_API_KEY,
  appSecret:    process.env.X_API_SECRET,
  accessToken:  process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

// ── 2. Fetch live weather from Open-Meteo (Doha, Qatar) ───────────────────
const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=25.2854&longitude=51.531' +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,' +
  'wind_speed_10m,wind_direction_10m,uv_index,weather_code,visibility' +
  '&timezone=Asia/Qatar';

let weatherData;
try {
  const res = await fetch(OPEN_METEO_URL);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  weatherData = await res.json();
} catch (err) {
  console.error('❌ Failed to fetch weather data:', err.message);
  process.exit(1);
}

const c = weatherData.current;

// ── 3. Helpers ─────────────────────────────────────────────────────────────

/**
 * WMO weather code → human-readable label (EN + AR emoji prefix)
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
function getCondition(code) {
  const map = {
    0:  '☀️ Clear / صافٍ',
    1:  '🌤 Mostly Clear / صافٍ غالباً',
    2:  '⛅ Partly Cloudy / غائم جزئياً',
    3:  '☁️ Overcast / غائم',
    45: '🌫 Foggy / ضبابي',
    48: '🌫 Icy Fog / ضباب جليدي',
    51: '🌦 Light Drizzle / رذاذ خفيف',
    53: '🌦 Drizzle / رذاذ',
    55: '🌧 Heavy Drizzle / رذاذ غزير',
    61: '🌧 Light Rain / مطر خفيف',
    63: '🌧 Rain / مطر',
    65: '🌧 Heavy Rain / مطر غزير',
    71: '❄️ Light Snow / ثلج خفيف',
    80: '🌦 Showers / زخات مطر',
    81: '🌧 Rain Showers / زخات',
    82: '⛈ Heavy Showers / زخات غزيرة',
    95: '⛈ Thunderstorm / عاصفة رعدية',
    96: '⛈ Thunderstorm + Hail / عاصفة مع برَد',
    99: '⛈ Heavy Thunderstorm / عاصفة رعدية شديدة',
  };
  // Round to nearest recognised code
  return map[code] ?? map[Math.max(...Object.keys(map).filter(k => k <= code))] ?? '🌡 Conditions Vary';
}

/** UV index → safety label (EN + AR) */
function getUvLabel(uv) {
  if (uv <= 2)  return `${uv} – Low / منخفض`;
  if (uv <= 5)  return `${uv} – Moderate / معتدل`;
  if (uv <= 7)  return `${uv} – High / عالٍ`;
  if (uv <= 10) return `${uv} – Very High / مرتفع جداً`;
  return         `${uv} – EXTREME / شديد جداً ⚠️`;
}

/** Wind degrees → compass direction */
function windDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/** Current Doha date string */
function dohaDate() {
  return new Date().toLocaleDateString('en-QA', {
    timeZone: 'Asia/Qatar',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ── 4. Decide which tweet type to post ────────────────────────────────────
const feelsLike   = Math.round(c.apparent_temperature);
const temp        = Math.round(c.temperature_2m);
const humidity    = c.relative_humidity_2m;
const windSpeed   = Math.round(c.wind_speed_10m);
const uv          = Math.round(c.uv_index);
const visKm       = c.visibility ? (c.visibility / 1000).toFixed(1) : null;
const isHeatAlert = feelsLike >= 45;
const isDustAlert = windSpeed >= 40 && visKm && parseFloat(visKm) < 3;
const isUvExtreme = uv >= 11;

let tweet;

// ─ Priority 1: Heat alert (feels-like ≥ 45 °C)
if (isHeatAlert) {
  tweet =
`⚠️ EXTREME HEAT ALERT – Qatar
تحذير حرارة شديدة – قطر

🌡 Feels like: ${feelsLike}°C (Temp: ${temp}°C)
💧 Humidity: ${humidity}%

🇬🇧 Stay indoors 10AM–4PM. Drink water every 30 min.
🇶🇦 ابقَ في الداخل من ١٠ص–٤م. اشرب الماء كل ٣٠ دقيقة.

📍 Full map → qatarliveweather.com
#Qatar #HeatAlert #DohaWeather #طقس_قطر #تحذير_حرارة`;

// ─ Priority 2: Dust / sandstorm alert
} else if (isDustAlert) {
  tweet =
`⚠️ DUST STORM ALERT – Qatar
تحذير عاصفة ترابية – قطر

💨 Wind: ${windSpeed} km/h ${windDir(c.wind_direction_10m)}
👁 Visibility: ~${visKm} km

🇬🇧 Reduce speed. Keep headlights on. Avoid open areas.
🇶🇦 قلّل السرعة. شغّل الأضواء. تجنّب المناطق المكشوفة.

📍 Live conditions → qatarliveweather.com
#Qatar #DustStorm #SandStorm #طقس_قطر #عاصفة_رملية`;

// ─ Priority 3: Extreme UV warning
} else if (isUvExtreme) {
  tweet =
`☀️ EXTREME UV INDEX – Qatar
مؤشر أشعة فوق بنفسجية شديد – قطر

🔆 UV Index: ${uv} (EXTREME)
🌡 Temp: ${temp}°C | Feels like: ${feelsLike}°C

🇬🇧 Apply SPF 50+. Avoid direct sun 10AM–2PM.
🇶🇦 استخدم واقي الشمس. تجنّب الشمس المباشرة ١٠ص–٢م.

📍 qatarliveweather.com
#Qatar #UVAlert #SunSafety #طقس_قطر`;

// ─ Default: Regular weather update
} else {
  tweet =
`🌤 Qatar Weather – ${dohaDate()}
طقس قطر

${getCondition(c.weather_code)}
🌡 ${temp}°C | Feels ${feelsLike}°C
💧 Humidity: ${humidity}%
💨 Wind: ${windSpeed} km/h ${windDir(c.wind_direction_10m)}
☀️ UV: ${getUvLabel(uv)}

📍 Full interactive map → qatarliveweather.com
#Qatar #DohaWeather #QatarWeather #طقس_قطر #طقس_الدوحة`;
}

// ── 5. Post to X ──────────────────────────────────────────────────────────
try {
  const result = await client.v2.tweet(tweet);
  console.log('✅ Tweet posted successfully!');
  console.log('   Tweet ID :', result.data.id);
  console.log('   Content  :\n', tweet);
} catch (err) {
  console.error('❌ Failed to post tweet:', err.message ?? err);
  process.exit(1);
}
