/**
 * translations.js
 * Qatar Live Weather Map — i18n strings (EN / AR)
 * by mohammedlglg
 */

const T = {
    en: {
        pageTitle:   "Qatar Live Weather",
        navTitle:    "Qatar Live Weather",
        mapTitle:    (r) => `${r} Live Weather`,
        mapSubtitle: "Click any marker for detailed forecast",
        updating:    "Updating current conditions...",
        fetching:    "Fetching Live Weather Data...",
        failed:      "Weather retrieval failed — try again shortly.",
        regionLabel: "Region:",
        updated:     (t) => `Updated: ${t} (GMT+3)`,
        hintTxt:     "Click any map marker for detailed weather",
        hintSub:     "Forecast, hourly chart, astronomy & more",

        // Conditions
        current:     "CURRENT",
        todayMax:    "TODAY MAX",
        todayMin:    "TODAY MIN",
        feelsLike:   "Feels Like",
        humidity:    "Humidity",
        pressure:    "Pressure",
        uvIndex:     "UV Index",
        precip:      "Precip.",
        visibility:  "Visibility",
        cloud:       "Cloud",
        windSpeed:   "Wind",

        // Dashboard sections
        conditions:  "Current Conditions",
        probability: "Probability Outlook",
        sunMoon:     "Sun & Moon",
        tempTrend:   "Temperature Trend — Today",
        precipTrend: "Rain Chance — Today",
        windDir:     "Wind Direction",
        forecast:    "3-Day Forecast",
        hourly:      "Hourly Forecast",

        // Astro
        sunrise:     "Sunrise",
        sunset:      "Sunset",
        moonPhase:   "Moon",

        // Misc
        quickFacts:  "Quick Facts",
        wikiSource:  "Source: Wikipedia",
        searching:   "Searching local history...",
        tempLegend:  "Temp (°C)",
        fallback:    (n, r) => `${n} is an important area in ${r}, Qatar.`,

        // Alerts
        alertHeat:   (t) => `Extreme Heat Alert — Feels like ${t}°C. Avoid outdoor exposure.`,
        alertDust:   (v, w) => `Dust/Sandstorm Alert — Visibility ${v} km, Wind ${w} km/h. Avoid driving.`,

        // New features
        shareBtn:    "Share",
        nearMe:      "Near Me",
        refresh:     "Refresh",
        linkCopied:  "Link copied!",
        locDenied:   "Location access denied",
        locUnsupported: "Geolocation not supported",
        updatedAgo:  (m) => `Updated ${m} min ago`,
        updatedNow:  "Updated just now",

        regions: {
            ALL:        "All Qatar",
            DOHA:       "Doha (Ad Dawhah)",
            RAYYAN:     "Ar Rayyan",
            WAKRAH:     "Al Wakrah",
            KHOR:       "Al Khor & Dhekra",
            SHAMAL:     "Ash Shamal",
            SHEEHANIYA: "Ash Sheehaniya",
            DAAYEN:     "Ad Daayen"
        },
        optgroup: "Municipalities (Baladiyat)"
    },

    ar: {
        pageTitle:   "طقس قطر المباشر",
        navTitle:    "طقس قطر المباشر",
        mapTitle:    (r) => `طقس ${r} المباشر`,
        mapSubtitle: "انقر على أي علامة لرؤية تفاصيل الطقس",
        updating:    "جارٍ تحديث الأحوال الجوية...",
        fetching:    "جارٍ جلب البيانات...",
        failed:      "فشل في جلب البيانات. — حاول مجدداً.",
        regionLabel: "المنطقة:",
        updated:     (t) => `آخر تحديث: ${t} (GMT+3)`,
        hintTxt:     "انقر على أي علامة لعرض تفاصيل الطقس",
        hintSub:     "التوقعات، الرسم البياني بالساعة، الفلك وأكثر",

        // Conditions
        current:     "الآن",
        todayMax:    "أعلى اليوم",
        todayMin:    "أدنى اليوم",
        feelsLike:   "الحرارة الحسية",
        humidity:    "الرطوبة",
        pressure:    "الضغط الجوي",
        uvIndex:     "مؤشر UV",
        precip:      "الهطول",
        visibility:  "الرؤية",
        cloud:       "الغيوم",
        windSpeed:   "الرياح",

        // Dashboard sections
        conditions:  "الأحوال الراهنة",
        probability: "احتمالات الطقس",
        sunMoon:     "الشمس والقمر",
        tempTrend:   "منحنى الحرارة — اليوم",
        precipTrend: "احتمال المطر — اليوم",
        windDir:     "اتجاه الرياح",
        forecast:    "توقعات 3 أيام",
        hourly:      "التوقعات بالساعة",

        // Astro
        sunrise:     "شروق الشمس",
        sunset:      "غروب الشمس",
        moonPhase:   "القمر",

        // Misc
        quickFacts:  "معلومات سريعة",
        wikiSource:  "المصدر: ويكيبيديا",
        searching:   "جارٍ البحث...",
        tempLegend:  "درجة الحرارة",
        fallback:    (n, r) => `${n} منطقة مهمة في ${r}، قطر.`,

        // Alerts
        alertHeat:   (t) => `تحذير حرارة شديدة — الحرارة الحسية ${t}°م. تجنب التعرض للشمس.`,
        alertDust:   (v, w) => `تحذير عاصفة رملية — الرؤية ${v} كم، الرياح ${w} كم/س. تجنب القيادة.`,

        // New features
        shareBtn:    "مشاركة",
        nearMe:      "قريب مني",
        refresh:     "تحديث",
        linkCopied:  "تم نسخ الرابط!",
        locDenied:   "تعذّر تحديد الموقع",
        locUnsupported: "الموقع غير مدعوم",
        updatedAgo:  (m) => `تم التحديث منذ ${m} دقيقة`,
        updatedNow:  "تم التحديث للتو",

        regions: {
            ALL:        "قطر",
            DOHA:       "الدوحة",
            RAYYAN:     "الريان",
            WAKRAH:     "الوكرة",
            KHOR:       "الخور والذخيرة",
            SHAMAL:     "الشمال",
            SHEEHANIYA: "الشحانية",
            DAAYEN:     "الظعاين"
        },
        optgroup: "البلديات"
    }
};
