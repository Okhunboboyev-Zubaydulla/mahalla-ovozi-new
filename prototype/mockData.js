/**
 * Mahalla Ovozi - Reference Prototype Mock Data
 * Faithfully matches the reference UI screenshot layout, topics, categories, and quote snippets.
 */

export const DISTRICT_NAME = "Sharof Rashidov tumani";

export const MAHALLAS = [
  "Barcha mahallalar",
  "Uch-Tepa mahallasi",
  "Ziyokor mahallasi",
  "Ravalliq mahallasi",
  "Toqchiliq mahallasi",
  "Nonisangil mahallasi",
  "Qahramon mahallasi",
  "Qulpisar mahallasi"
];

export const LANES_CONFIG = {
  hokim: {
    id: "hokim",
    title: "Hokimga oid",
    color: "#E02424",
    surface: "#FEF2F2",
    badgeBg: "#FEE2E2",
    badgeColor: "#DC2626",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
  },
  water: {
    id: "water",
    title: "Suv",
    color: "#2563EB",
    surface: "#EFF6FF",
    badgeBg: "#DBEAFE",
    badgeColor: "#1D4ED8",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`
  },
  electricity: {
    id: "electricity",
    title: "Elektr",
    color: "#7C3AED",
    surface: "#FAF5FF",
    badgeBg: "#F3E8FF",
    badgeColor: "#6D28D9",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
  },
  gas: {
    id: "gas",
    title: "Gaz",
    color: "#EA580C",
    surface: "#FFF7ED",
    badgeBg: "#FFEDD5",
    badgeColor: "#C2410C",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`
  },
  waste: {
    id: "waste",
    title: "Chiqindi",
    color: "#059669",
    surface: "#ECFDF5",
    badgeBg: "#D1FAE5",
    badgeColor: "#047857",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
  }
};

export const INITIAL_TOPICS = [
  // --- 1. HOKIMGA OID ---
  {
    id: "top-h01",
    lane: "hokim",
    tag: "Sayyor qabul va'dasi",
    tagType: "red",
    summary: "Fuqarolar tuman hokimi o'tgan oydagi sayyor qabulda Uch-Tepa mahallasiga bergan asfalt yotqizish va'dasi kechikayotganini bildirishmoqda.",
    mahalla: "Uch-Tepa mahallasi",
    date: "today",
    time: "08:27",
    evidenceCount: 6,
    quote: "O'tgan oy tuman hokimi sayyor qabulda kelib, shu haftada asfalt yotqiziladi degandi.",
    evidence: [
      {
        id: "ev-h01-1",
        senderName: "Javlonbek Yuldashev",
        username: "@javlon_uchtepa",
        timestamp: "05.08.2026, 08:12",
        text: "O'tgan oy tuman hokimi sayyor qabulda kelib, shu haftada asfalt yotqiziladi degandi. Texnikalar qachon keladi?",
        telegramLink: "https://t.me/uchtepa_murojaat/4521"
      },
      {
        id: "ev-h01-2",
        senderName: "Mavluda opa Qodirova",
        username: "@mavluda_q",
        timestamp: "05.08.2026, 08:19",
        text: "Sayyor qabul bayoniga kiritilgan edi, maktab yo'li chang-to'zon bo'lib yotibdi.",
        telegramLink: "https://t.me/uchtepa_murojaat/4524"
      },
      {
        id: "ev-h01-3",
        senderName: "Rustam Tohirov",
        username: "@rustam_t_88",
        timestamp: "05.08.2026, 08:27",
        text: "Hokim va'da qilgan muddat o'tib ketdi. Iltimos mas'ullar amaliy javob berishsin.",
        telegramLink: "https://t.me/uchtepa_murojaat/4530"
      }
    ]
  },
  {
    id: "top-h02",
    lane: "hokim",
    tag: "1-Sektor va Obodonlashtirish",
    tagType: "red",
    summary: "Ziyokor mahallasida 1-sektor rahbari va tuman hokimligi obodonlashtirish dasturi bo'yicha bolalar maydonchasi qurilishi to'xtab qolgan.",
    mahalla: "Ziyokor mahallasi",
    date: "today",
    time: "07:58",
    evidenceCount: 4,
    quote: "Tuman hokimligi obodonlashtirish dasturiga tushgan bolalar maydonchasi yarim yo'lda to'xtadi.",
    evidence: [
      {
        id: "ev-h02-1",
        senderName: "Dilshod Nurmatov",
        username: "@dilshod_nur",
        timestamp: "05.08.2026, 07:40",
        text: "Tuman hokimligi obodonlashtirish dasturiga tushgan bolalar maydonchasi yarim yo'lda to'xtadi. Qurilish chiqindilari yotibdi.",
        telegramLink: "https://t.me/ziyokor_ovozi/3110"
      },
      {
        id: "ev-h02-2",
        senderName: "Shahnoza Rahimova",
        username: "@shahnoza_r",
        timestamp: "05.08.2026, 07:58",
        text: "1-sektor rahbari o'tgan hafta ko'rib ketgandi, ammo hamon ishlar davom etmadi.",
        telegramLink: "https://t.me/ziyokor_ovozi/3115"
      }
    ]
  },
  {
    id: "top-h03",
    lane: "hokim",
    tag: "Kredit va Subsidiya",
    tagType: "red",
    summary: "Toqchiliq mahallasida fuqarolar hokim yordamchisi tomonidan imtiyozli kredit va subsidiya hujjatlari kechiktirilayotganidan shikoyat qilmoqda.",
    mahalla: "Toqchiliq mahallasi",
    date: "today",
    time: "06:50",
    evidenceCount: 3,
    quote: "Hokim yordamchisiga subsidiya arizasi topshirilganiga 20 kun bo'ldi, hali ham javob yo'q.",
    evidence: [
      {
        id: "ev-h03-1",
        senderName: "Sobir Aliyev",
        username: "@sobir_a",
        timestamp: "05.08.2026, 06:50",
        text: "Hokim yordamchisiga subsidiya arizasi topshirilganiga 20 kun bo'ldi, hali ham javob yo'q.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1205"
      }
    ]
  },

  // --- 2. SUV ---
  {
    id: "top-w01",
    lane: "water",
    tag: "Avariya va Suv ta'minoti",
    tagType: "blue",
    summary: "Ravalliq mahallasida markaziy suv quvurida yorilish sodir bo'lib, ko'p qavatli uylar suvsiz qolgan.",
    mahalla: "Ravalliq mahallasi",
    date: "today",
    time: "08:35",
    evidenceCount: 5,
    quote: "Markaziy quvur yorilgan, suv ko'chaga oqib ketyapti!",
    evidence: [
      {
        id: "ev-w01-1",
        senderName: "Farhod Murodov",
        username: "@farhod_m",
        timestamp: "05.08.2026, 07:15",
        text: "Markaziy quvur yorilgan, suv ko'chaga oqib ketyapti! 12, 14, 16-uylarda suv yo'q.",
        telegramLink: "https://t.me/ravalliq_ovozi/2104"
      },
      {
        id: "ev-w01-2",
        senderName: "Anvarjon Saidov",
        username: "@anvar_s",
        timestamp: "05.08.2026, 08:35",
        text: "Avariya xizmati keldi, nasos kutishyapti.",
        telegramLink: "https://t.me/ravalliq_ovozi/2115"
      }
    ]
  },
  {
    id: "top-w02",
    lane: "water",
    tag: "Suv sifati",
    tagType: "blue",
    summary: "Nonisangil mahallasida ichimlik suvi rangi oqarib va loyqalanib kelayotgani haqida shikoyat bor.",
    mahalla: "Nonisangil mahallasi",
    date: "today",
    time: "07:42",
    evidenceCount: 3,
    quote: "Suv oqarib kelmoqda, filtrlarni tozalab bo'lmay qoldi.",
    evidence: [
      {
        id: "ev-w02-1",
        senderName: "Nigora Samadova",
        username: "@nigora_s",
        timestamp: "05.08.2026, 07:10",
        text: "Suv oqarib kelmoqda, filtrlarni tozalab bo'lmay qoldi. Ichishga yaroqsiz.",
        telegramLink: "https://t.me/nonisangil_murojaat/1890"
      },
      {
        id: "ev-w02-2",
        senderName: "Ismoil Boboyev",
        username: "@ismoil_b",
        timestamp: "05.08.2026, 07:42",
        text: "Suv ta'minoti tekshirib bersin.",
        telegramLink: "https://t.me/nonisangil_murojaat/1895"
      }
    ]
  },
  {
    id: "top-w03",
    lane: "water",
    tag: "Hisob va To'lov",
    tagType: "blue",
    summary: "Qahramon mahallasida suv hisoblagichi kvitansiyasida asossiz qarzdorlik ko'rsatilganidan e'tiroz bildirilmoqda.",
    mahalla: "Qahramon mahallasi",
    date: "today",
    time: "09:05",
    evidenceCount: 2,
    quote: "Suv ta'minoti kvitansiyasida asossiz qarzdorlik yozilgan.",
    evidence: [
      {
        id: "ev-w03-1",
        senderName: "Kamol Mahmudov",
        username: "@kamol_m",
        timestamp: "05.08.2026, 09:05",
        text: "To'lovlar to'langan, tizimda asossiz qarz ko'rsatyapti.",
        telegramLink: "https://t.me/qahramon_murojaat/884"
      }
    ]
  },

  // --- 3. ELEKTR ---
  {
    id: "top-e01",
    lane: "electricity",
    tag: "Elektr simlari va Xavfsizlik",
    tagType: "purple",
    summary: "Ziyokor mahallasida havo liniyasidagi simlar osilib qolgan va xavf tug'dirmoqda.",
    mahalla: "Ziyokor mahallasi",
    date: "today",
    time: "10:05",
    evidenceCount: 3,
    quote: "Yaqinda shamolda sim yog'ochdan uzilib osilib qoldi.",
    evidence: [
      {
        id: "ev-e01-1",
        senderName: "Hamidullo Qosimov",
        username: "@hamidullo_q",
        timestamp: "05.08.2026, 09:30",
        text: "Yaqinda shamolda sim yog'ochdan uzilib osilib qoldi. Ko'chadan bolalar o'tadi, xavfli!",
        telegramLink: "https://t.me/ziyokor_ovozi/3128"
      },
      {
        id: "ev-e01-2",
        senderName: "Lolaxon Zokirova",
        username: null,
        timestamp: "05.08.2026, 10:05",
        text: "HETK ga xabar berdik, brigada kutilyapti.",
        telegramLink: "https://t.me/ziyokor_ovozi/3133"
      }
    ]
  },
  {
    id: "top-e02",
    lane: "electricity",
    tag: "Ko'cha yoritish",
    tagType: "purple",
    summary: "Toqchiliq mahallasida tunda ko'cha chiroqlari yoqilmayotgani sababli xavfsizlik muammosi.",
    mahalla: "Toqchiliq mahallasi",
    date: "today",
    time: "10:40",
    evidenceCount: 2,
    quote: "Kechasi ko'chalar tumtoq qorong'i, yoritish chiroqlari o'chirilgan.",
    evidence: [
      {
        id: "ev-e02-1",
        senderName: "Bahodir Shokirov",
        username: "@bahodir_sh",
        timestamp: "05.08.2026, 10:40",
        text: "Kechasi ko'chalar tumtoq qorong'i, yoritish chiroqlari o'chirilgan.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1220"
      }
    ]
  },
  {
    id: "top-e03",
    lane: "electricity",
    tag: "Kuchlanish pastligi",
    tagType: "purple",
    summary: "Nonisangil mahallasida kuchlanish 140V ga tushib ketib, maishiy texnikalar o'chib qolmoqda.",
    mahalla: "Nonisangil mahallasi",
    date: "today",
    time: "11:10",
    evidenceCount: 3,
    quote: "Kuchlanish juda past, muzlatgich va konditsioner ishlamayapti.",
    evidence: [
      {
        id: "ev-e03-1",
        senderName: "Sardor Mirzayev",
        username: "@sardor_m_90",
        timestamp: "05.08.2026, 10:45",
        text: "Kuchlanish juda past, muzlatgich va konditsioner ishlamayapti. 140V ko'rsatyapti.",
        telegramLink: "https://t.me/nonisangil_murojaat/1910"
      },
      {
        id: "ev-e03-2",
        senderName: "Akmal Rasulov",
        username: "@akmal_rasulov",
        timestamp: "05.08.2026, 11:10",
        text: "Transformator quvvati yetmayapti.",
        telegramLink: "https://t.me/nonisangil_murojaat/1915"
      }
    ]
  },

  // --- 4. GAZ ---
  {
    id: "top-g01",
    lane: "gas",
    tag: "Gaz bosimi",
    tagType: "orange",
    summary: "Ziyokor mahallasida gaz bosimi minimal darajaga tushib ketib, isitish pechlari yonmayapti.",
    mahalla: "Ziyokor mahallasi",
    date: "today",
    time: "08:18",
    evidenceCount: 4,
    quote: "Gaz bosimi juda past, ovqat pishirish va uy isitish qiyin.",
    evidence: [
      {
        id: "ev-g01-1",
        senderName: "Mukarram opa",
        username: null,
        timestamp: "05.08.2026, 07:30",
        text: "Gaz bosimi juda past, ovqat pishirish va uy isitish qiyin.",
        telegramLink: "https://t.me/ziyokor_ovozi/3108"
      },
      {
        id: "ev-g01-2",
        senderName: "Jasur To'rayev",
        username: "@jasur_t",
        timestamp: "05.08.2026, 08:18",
        text: "Raygazga murojaat qildik, sozlab berishsin.",
        telegramLink: "https://t.me/ziyokor_ovozi/3116"
      }
    ]
  },
  {
    id: "top-g02",
    lane: "gas",
    tag: "Gaz sizib chiqishi",
    tagType: "orange",
    summary: "Toqchiliq mahallasida gaz ta'minoti quvurida sizib chiqish hidi anqiyotgani haqida xabar.",
    mahalla: "Toqchiliq mahallasi",
    date: "today",
    time: "07:05",
    evidenceCount: 3,
    quote: "Ko'chada gaz hidi kelyapti, avariya xizmati zudlik bilan kelsin.",
    evidence: [
      {
        id: "ev-g02-1",
        senderName: "Elyor Hakimov",
        username: "@elyor_h",
        timestamp: "05.08.2026, 06:50",
        text: "Ko'chada gaz hidi kelyapti, avariya xizmati zudlik bilan kelsin.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1188"
      },
      {
        id: "ev-g02-2",
        senderName: "Sobirjon Karimov",
        username: "@sobir_k",
        timestamp: "05.08.2026, 07:05",
        text: "104 ga qo'ng'iroq qilindi.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1192"
      }
    ]
  },
  {
    id: "top-g03",
    lane: "gas",
    tag: "Gaz Hisoblagich",
    tagType: "orange",
    summary: "Ravalliq mahallasida gaz hisoblagichlarini davlat ko'rigidan o'tkazish bo'yicha murojaat.",
    mahalla: "Ravalliq mahallasi",
    date: "today",
    time: "09:50",
    evidenceCount: 2,
    quote: "Smart gaz meter almashtirilgandan keyin ulash kechikmoqda.",
    evidence: [
      {
        id: "ev-g03-1",
        senderName: "Ulug'bek Zoirov",
        username: "@ulugbek_z",
        timestamp: "05.08.2026, 09:50",
        text: "Smart gaz meter almashtirilgandan keyin plombalashga kelishmadi.",
        telegramLink: "https://t.me/ravalliq_ovozi/2140"
      }
    ]
  },

  // --- 5. CHIQINDI ---
  {
    id: "top-c01",
    lane: "waste",
    tag: "Chiqindi xizmati",
    tagType: "green",
    summary: "Ravalliq mahallasida maishiy chiqindilar 4 kundan beri olib ketilmay, konteynerlar to'lib toshgan.",
    mahalla: "Ravalliq mahallasi",
    date: "today",
    time: "08:05",
    evidenceCount: 4,
    quote: "Chiqindi mashinasi kelmadi, ko'chada noxush hid tarqalyapti.",
    evidence: [
      {
        id: "ev-c01-1",
        senderName: "Munojat Aliyeva",
        username: "@munojat_a",
        timestamp: "05.08.2026, 07:20",
        text: "Chiqindi mashinasi kelmadi, ko'chada noxush hid tarqalyapti.",
        telegramLink: "https://t.me/ravalliq_ovozi/2110"
      },
      {
        id: "ev-c01-2",
        senderName: "Baxtiyor To'laganov",
        username: "@baxtiyor_t",
        timestamp: "05.08.2026, 08:05",
        text: "Grafik bo'yicha har 2 kunda kelishi kerak edi.",
        telegramLink: "https://t.me/ravalliq_ovozi/2114"
      }
    ]
  },
  {
    id: "top-c02",
    lane: "waste",
    tag: "Noqonuniy chiqindixona",
    tagType: "green",
    summary: "Qahramon mahallasida noqonuniy chiqindi to'plana boshlangani va tozalanishi so'ralmoqda.",
    mahalla: "Qahramon mahallasi",
    date: "today",
    time: "07:22",
    evidenceCount: 3,
    quote: "Ko'cha burchagiga qurilish chiqindilari va axlat tashlab ketishmoqda.",
    evidence: [
      {
        id: "ev-c02-1",
        senderName: "Yorqin Haydarov",
        username: "@yorqin_h",
        timestamp: "05.08.2026, 07:22",
        text: "Ko'cha burchagiga qurilish chiqindilari va axlat tashlab ketishmoqda.",
        telegramLink: "https://t.me/qahramon_murojaat/860"
      }
    ]
  },
  {
    id: "top-c03",
    lane: "waste",
    tag: "Konteyner o'rnatishtirish",
    tagType: "green",
    summary: "Qulpisar mahallasida yangi maishiy chiqindi konteynerlari o'rnatish bo'yicha murojaat.",
    mahalla: "Qulpisar mahallasi",
    date: "today",
    time: "09:30",
    evidenceCount: 2,
    quote: "Mahallamizda yangi konteynerlar o'rnatilishi zarur.",
    evidence: [
      {
        id: "ev-c03-1",
        senderName: "Zulfiya Sattorova",
        username: "@zulfiya_s",
        timestamp: "05.08.2026, 09:30",
        text: "Mahallamizda aholi soni ko'paygan, konteynerlar yetishmaydi.",
        telegramLink: "https://t.me/qulpisar_murojaat/540"
      }
    ]
  }
];

export const SIMULATION_EVENTS = {
  newTopicWater: {
    id: "top-sim-w01",
    lane: "water",
    tag: "Avariya va Suv ta'minoti",
    tagType: "blue",
    summary: "Uch-Tepa mahallasi Yangihayot ko'chasida yangi yorilish sodir bo'ldi: suv ta'minoti to'xtatildi.",
    mahalla: "Uch-Tepa mahallasi",
    date: "today",
    time: "12:58",
    evidenceCount: 1,
    quote: "Hozirgina Yangihayot ko'chasida quvur yorilib suv toshib chiqdi!",
    evidence: [
      {
        id: "ev-sim-w01-1",
        senderName: "Ma'murjon Sobirov",
        username: "@mamur_sobir",
        timestamp: "05.08.2026, 12:58",
        text: "Hozirgina Yangihayot ko'chasida quvur yorilib suv toshib chiqdi, tezda avariya xizmati kelsin!",
        telegramLink: "https://t.me/uchtepa_murojaat/4590"
      }
    ]
  }
};
