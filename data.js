/**
 * data.js
 * Qatar Live Weather Map — Location data for all municipalities
 * Each entry: { name (EN), nameAr (AR), lat, lon }
 * by mohammedlglg
 */

const DATA_POINTS = {
    DOHA: [
        { name: "Doha City Centre",     nameAr: "وسط مدينة الدوحة",    lat: 25.2854, lon: 51.5310 },
        { name: "West Bay",             nameAr: "الخليج الغربي",        lat: 25.3217, lon: 51.5285 },
        { name: "The Pearl-Qatar",      nameAr: "اللؤلؤة - قطر",        lat: 25.3713, lon: 51.5513 },
        { name: "Lusail",               nameAr: "لوسيل",                lat: 25.4278, lon: 51.5149 },
        { name: "Old Doha Port",        nameAr: "ميناء الدوحة القديم",  lat: 25.2919, lon: 51.5500 },
        { name: "Corniche",             nameAr: "الكورنيش",             lat: 25.3025, lon: 51.5251 },
        { name: "Hamad Medical City",   nameAr: "مدينة حمد الطبية",     lat: 25.2892, lon: 51.4878 },
        { name: "Msheireb",             nameAr: "مشيرب",                lat: 25.2834, lon: 51.5269 },
        { name: "Al Sadd",              nameAr: "السد",                 lat: 25.2730, lon: 51.5219 },
        { name: "Madinat Khalifa",      nameAr: "مدينة خليفة",          lat: 25.2597, lon: 51.4900 },
        { name: "Bin Mahmoud",          nameAr: "بن محمود",             lat: 25.2759, lon: 51.5337 },
        { name: "Fereej Al Amir",       nameAr: "فريج الأمير",          lat: 25.2848, lon: 51.5439 },
        { name: "Al Dafna",             nameAr: "الدفنة",               lat: 25.3117, lon: 51.5363 },
        { name: "Al Khulaifat",         nameAr: "الخليفات",             lat: 25.2677, lon: 51.5452 },
        { name: "Doha Industrial Area", nameAr: "المنطقة الصناعية",     lat: 25.2397, lon: 51.5492 }
    ],
    RAYYAN: [
        { name: "Al Rayyan City",       nameAr: "مدينة الريان",         lat: 25.2583, lon: 51.4297 },
        { name: "Education City",       nameAr: "المدينة التعليمية",   lat: 25.3134, lon: 51.4392 },
        { name: "Al Waab",              nameAr: "الوعب",                lat: 25.2569, lon: 51.4639 },
        { name: "Muaither",             nameAr: "معيذر",                lat: 25.243100, lon: 51.406400 },
        { name: "Al Sailiya",          nameAr: "السيلية",             lat: 25.214302, lon: 51.354788 },
        { name: "Abu Nakhla",           nameAr: "أبو نخلة",             lat: 25.115060, lon: 51.316209 },
        { name: "Al Shaqab",            nameAr: "الشقب",                lat: 25.307343, lon: 51.438941 },
        { name: "Al Wajba",             nameAr: "الوجبة",               lat: 25.312630, lon: 51.377280 },
        { name: "Al Gharrafa",          nameAr: "الغرافة",              lat: 25.337442, lon: 51.447724 },
        { name: "Abu Samra",            nameAr: "أبو سمرة",             lat: 24.745054, lon: 50.846933 },
    ],
    WAKRAH: [
        { name: "Al Wakrah City",       nameAr: "مدينة الوكرة",         lat: 25.1694, lon: 51.5983 },
        { name: "Al Wukair",            nameAr: "الوكير",               lat: 25.1614, lon: 51.5178 },
        { name: "Mesaieed",             nameAr: "مسيعيد",               lat: 24.9989, lon: 51.5547 },
        { name: "Sealine Beach",        nameAr: "شاطئ سيلاين",          lat: 24.9200, lon: 51.5800 },
        { name: "Al Mashaf",            nameAr: "المشاف",               lat: 25.1867, lon: 51.5622 },
        { name: "Wholesale Market",     nameAr: "سوق الجملة",           lat: 25.1453, lon: 51.5325 },
        { name: "Ras Laffan South",     nameAr: "رأس لفان الجنوبية",    lat: 25.1000, lon: 51.5500 }
    ],
    KHOR: [
        { name: "Al Khor Town",         nameAr: "مدينة الخور",          lat: 25.6804, lon: 51.4958 },
        { name: "Al Thakhira",          nameAr: "الذخيرة",              lat: 25.7414, lon: 51.4367 },
        { name: "Ras Laffan City",      nameAr: "مدينة رأس لفان",       lat: 25.8917, lon: 51.5500 },
        { name: "Fuwayrit",             nameAr: "فويرط",                lat: 25.8331, lon: 51.4147 },
        { name: "Al Ghuwariyah",        nameAr: "الغويرية",             lat: 25.7939, lon: 51.4011 }
    ],
    SHAMAL: [
        { name: "Madinat ash Shamal",   nameAr: "مدينة الشمال",         lat: 26.1131, lon: 51.2131 },
        { name: "Al Ruwais",            nameAr: "الرويس",               lat: 26.1467, lon: 51.2058 },
        { name: "Abu Dhalouf",          nameAr: "أبو ذلوف",             lat: 26.0836, lon: 51.2517 },
        { name: "Al Qa`Abiyah",         nameAr: "الكعبية",              lat: 26.0622, lon: 51.2733 },
        { name: "Al Zubara",            nameAr: "الزبارة",              lat: 25.973990, lon: 51.031428 },
        { name: "Al Arish",             nameAr: "العريش",               lat: 26.048194, lon: 51.056901 },
        { name: "Fuwayrit",             nameAr: "فويرط",                lat: 26.024326, lon: 51.373197 }
    ],
    SHEEHANIYA: [
        { name: "Ash Sheehaniya Town",  nameAr: "مدينة الشحانية",       lat: 25.3500, lon: 51.2333 },
        { name: "Dukhan",               nameAr: "دخان",                  lat: 25.4275, lon: 50.7828 },
        { name: "Camel Race Track",     nameAr: "مضمار سباق الهجن",     lat: 25.4167, lon: 51.2167 },
        { name: "Al Jumayliyah",        nameAr: "الجميلية",             lat: 25.6161, lon: 51.0815 },
        { name: "Rawdat Rashed",        nameAr: "روضـة راشـد",            lat: 25.237289, lon: 51.204732 },
        { name: "Umm Bab",              nameAr: "أم بـاب",               lat: 25.2087, lon: 50.8026 }
    ],
    DAAYEN: [
        { name: "Umm Slal Mohammed",    nameAr: "أم صلال محمد",         lat: 25.4697, lon: 51.4411 },
        { name: "Al Kheesa",            nameAr: "الخيسة",              lat: 25.4531, lon: 51.4214 },
        { name: "Al Jelaiah",           nameAr: "الجلاية",              lat: 25.4978, lon: 51.4556 },
        { name: "Al Froosh",            nameAr: "الفروش",              lat: 25.5225, lon: 51.4736 },
        { name: "Umm Qarn",             nameAr: "أم قرن",              lat: 25.5500, lon: 51.4167 },
        { name: "Umm Slal Ali",         nameAr: "أم صلال علي",          lat: 25.4742, lon: 51.4031 }
    ]
};

// Build ALL from all municipalities
DATA_POINTS.ALL = Object.keys(DATA_POINTS)
    .filter(k => k !== 'ALL')
    .reduce((acc, k) => acc.concat(DATA_POINTS[k]), []);
