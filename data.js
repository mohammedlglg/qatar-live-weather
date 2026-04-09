/**
 * data.js
 * Qatar Live Weather Map — Location data for all municipalities
 * Each entry: { name (EN), nameAr (AR), lat, lon }
 * by mohammedlglg
 */

const DATA_POINTS = {
    DOHA: [
        { name: "Hamad International Airport",      nameAr: "مطار حمد الدولي",                      lat: 25.259477, lon: 51.614324 },
        { name: "West Bay",                         nameAr: "الخليج الغربي",                        lat: 25.324515, lon: 51.533941 },
        { name: "The Pearl",                        nameAr: "اللؤلؤة",                              lat: 25.3713, lon: 51.5513 },
        { name: "Lusail",                           nameAr: "لوسيل",                                 lat: 25.421421, lon: 51.501751 },
        { name: "Old Doha Port",                    nameAr: "ميناء الدوحة القديم",                  lat: 25.297427, lon: 51.549693 },
        { name: "Corniche",                         nameAr: "الكورنيش",                             lat: 25.301023, lon: 51.518848 },
        { name: "Hamad Medical City",               nameAr: "مدينة حمد الطبية",                     lat: 25.293630, lon: 51.503090 },
        { name: "Msheireb - Downtown",              nameAr: "مشيرب - قلب الدوحة",                   lat: 25.286369, lon: 51.527401 },
        { name: "Al Sadd",                          nameAr: "السد",                                  lat: 25.280699, lon: 51.498365 },
        { name: "Madinat Khalifa South",            nameAr: "جنوب مدينة الخليفة",                   lat: 25.316274, lon: 51.480802 },
        { name: "Al Thumama Stadium",               nameAr: "أستاد الثمامة",                         lat: 25.234515, lon: 51.531729 },
        { name: "Souq Waqif",                       nameAr: "سوق واقف",                               lat: 25.287905, lon: 51.532883 },
        { name: "Qatar University",                 nameAr: "جامعة قطر",                             lat: 25.375385, lon: 51.483011 },
        { name: "Doha Industrial Area",             nameAr: "المنطقة الصناعية",                     lat: 25.186484, lon: 51.437173 }
    ],
    RAYYAN: [
        { name: "Al Rayyan City",       nameAr: "مدينة الريان",         lat: 25.2583, lon: 51.4297 },
        { name: "Education City",       nameAr: "المدينة التعليمية",    lat: 25.3134, lon: 51.4392 },
        { name: "Al Waab",              nameAr: "الوعب",                lat: 25.2569, lon: 51.4639 },
        { name: "Muaither",             nameAr: "معيذر",                lat: 25.2431, lon: 51.4064 },
        { name: "Al Sailiya",           nameAr: "السيلية",              lat: 25.2143, lon: 51.3548 },
        { name: "Abu Nakhla",           nameAr: "أبو نخلة",             lat: 25.1151, lon: 51.3162 },
        { name: "Al Shaqab",            nameAr: "الشقب",                lat: 25.3073, lon: 51.4389 },
        { name: "Al Wajba",             nameAr: "الوجبة",               lat: 25.3126, lon: 51.3773 },
        { name: "Al Gharrafa",          nameAr: "الغرافة",              lat: 25.3374, lon: 51.4477 },
        { name: "Abu Samra",            nameAr: "أبو سمرة",             lat: 24.7451, lon: 50.8469 }
    ],
    WAKRAH: [
        { name: "Al Wakrah City",       nameAr: "مدينة الوكرة",             lat: 25.1694, lon: 51.5983 },
        { name: "Al Wukair",            nameAr: "الوكير",                   lat: 25.1614, lon: 51.5178 },
        { name: "Mesaieed",             nameAr: "مسيعيد",                   lat: 24.9989, lon: 51.5547 },
        { name: "Sealine Beach",        nameAr: "شاطئ سيلين",              lat: 24.9200, lon: 51.5800 },
        { name: "Al Mashaf",            nameAr: "المشاف",                   lat: 25.1867, lon: 51.5622 },
        { name: "Inland Sea",           nameAr: "خـور العديد",              lat: 24.552253, lon: 51.319885 },
        { name: "Al Kharrara",          nameAr: "الخرارة",                  lat: 24.902455, lon: 51.173222 }
    ],
    KHOR: [
        { name: "Al Khor Town",         nameAr: "مدينة الخور",          lat: 25.6804, lon: 51.4958 },
        { name: "Al Thakhira",          nameAr: "الذخيرة",              lat: 25.734884, lon: 51.542873 },
        { name: "Ras Laffan City",      nameAr: "مدينة رأس لفان",       lat: 25.8917, lon: 51.5500 },
        { name: "Al Ghuwariyah",        nameAr: "الغويرية",             lat: 25.843546, lon: 51.246360 }
    ],
    SHAMAL: [
        { name: "Madinat ash Shamal",   nameAr: "مدينة الشمال",         lat: 26.1131, lon: 51.2131 },
        { name: "Al Ruwais",            nameAr: "الرويس",               lat: 26.1467, lon: 51.2058 },
        { name: "Al Ghariya Beach",     nameAr: "شاطئ الغارية",         lat: 26.072598, lon: 51.359646 },
        { name: "Al Qa`Abiyah",         nameAr: "الكعبية",              lat: 26.0622, lon: 51.2733 },
        { name: "Al Zubara",            nameAr: "الزبارة",              lat: 25.9740, lon: 51.0314 },
        { name: "Al Arish",             nameAr: "العريش",               lat: 26.0482, lon: 51.0569 },
        { name: "Fuwayrit",             nameAr: "فويرط",                lat: 26.024615, lon: 51.374141 }
    ],
    SHEEHANIYA: [
        { name: "Ash Sheehaniya Town",  nameAr: "مدينة الشحانية",       lat: 25.3500, lon: 51.2333 },
        { name: "Dukhan",               nameAr: "دخان",                  lat: 25.4275, lon: 50.7828 },
        { name: "Camel Race Track",     nameAr: "مضمار سباق الهجن",     lat: 25.4167, lon: 51.2167 },
        { name: "Al Jumayliyah",        nameAr: "الجميلية",             lat: 25.6161, lon: 51.0815 },
        { name: "Rawdat Rashed",        nameAr: "روضة راشد",             lat: 25.2373, lon: 51.2047 },
        { name: "Umm Bab",              nameAr: "أم باب",                lat: 25.2087, lon: 50.8026 }
    ],
    DAAYEN: [
        { name: "Umm Slal Mohammed",    nameAr: "أم صلال محمد",         lat: 25.4697, lon: 51.4411 },
        { name: "Al Kheesa",            nameAr: "الخيسة",               lat: 25.4531, lon: 51.4214 },
        { name: "Al Jelaiah",           nameAr: "الجلاية",              lat: 25.4978, lon: 51.4556 },
        { name: "Al Froosh",            nameAr: "الفروش",               lat: 25.5225, lon: 51.4736 },
        { name: "Umm Qarn",             nameAr: "أم قرن",               lat: 25.5500, lon: 51.4167 },
        { name: "Umm Slal Ali",         nameAr: "أم صلال علي",          lat: 25.4742, lon: 51.4031 }
    ]
};

// Build ALL from every municipality (exclude the ALL key itself)
DATA_POINTS.ALL = Object.keys(DATA_POINTS)
    .filter(k => k !== 'ALL')
    .reduce((acc, k) => acc.concat(DATA_POINTS[k]), []);
