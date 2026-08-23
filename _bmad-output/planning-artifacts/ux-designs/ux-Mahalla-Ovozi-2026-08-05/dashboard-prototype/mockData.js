/**
 * Mahalla Ovozi - Reference Prototype Mock Data
 * Uzbek Cyrillic domain dataset with full multi-lane, freshness, and evidence attributes.
 */

export const DISTRICT_NAME = "Шароф Рашидов тумани";

export const MAHALLAS = [
  "Барча маҳаллалар",
  "Учтепа маҳалласи",
  "Зиёкор маҳалласи",
  "Раваллиқ маҳалласи",
  "Тоқчилик маҳалласи",
  "Нонисангил маҳалласи",
  "Қаҳрамон маҳалласи",
  "Қулписар маҳалласи"
];

export const LANES_CONFIG = {
  hokim: {
    id: "hokim",
    title: "Ҳокимга оид",
    color: "#EF4444",
    surface: "#FEE2E2",
    badgeBg: "#FEE2E2",
    badgeColor: "#DC2626",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
  },
  water: {
    id: "water",
    title: "Сув",
    color: "#2563EB",
    surface: "#EFF6FF",
    badgeBg: "#DBEAFE",
    badgeColor: "#1D4ED8",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`
  },
  electricity: {
    id: "electricity",
    title: "Электр",
    color: "#7C3AED",
    surface: "#FAF5FF",
    badgeBg: "#F3E8FF",
    badgeColor: "#6D28D9",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
  },
  gas: {
    id: "gas",
    title: "Газ",
    color: "#EA580C",
    surface: "#FFF7ED",
    badgeBg: "#FFEDD5",
    badgeColor: "#C2410C",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`
  },
  waste: {
    id: "waste",
    title: "Чиқинди",
    color: "#059669",
    surface: "#ECFDF5",
    badgeBg: "#D1FAE5",
    badgeColor: "#047857",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
  }
};

export const INITIAL_TOPICS = [
  // --- 1. ҲОКИМГА ОИД ---
  {
    id: "top-h01",
    lane: "hokim",
    tag: "Сайёр қабул ваъдаси",
    tagType: "red",
    isUpdated: true,
    summary: "Фуқаролар туман ҳокими ўтган ойдаги сайёр қабулда Учтепа маҳалласига берган асфальт ётқизиш ваъдаси кечикаётганини билдиришмоқда.",
    mahalla: "Учтепа маҳалласи",
    date: "today",
    time: "08:27",
    evidenceCount: 6,
    quote: "Ўтган ой туман ҳокими сайёр қабулда келиб, шу ҳафтада асфальт ётқизилади деганди.",
    evidence: [
      {
        id: "ev-h01-1",
        senderName: "Жавлонбек Йўлдошев",
        username: "@javlon_uchtepa",
        timestamp: "05.08.2026, 08:12",
        text: "Ўтган ой туман ҳокими сайёр қабулда келиб, шу ҳафтада асфальт ётқизилади деганди. Техникалар қачон келади?",
        telegramLink: "https://t.me/uchtepa_murojaat/4521"
      },
      {
        id: "ev-h01-2",
        senderName: "Мавлуда опа Қодирова",
        username: "@mavluda_q",
        timestamp: "05.08.2026, 08:19",
        text: "Сайёр қабул баёнига киритилган эди, мактаб йўли чанг-тўзон бўлиб ётибди.",
        telegramLink: "https://t.me/uchtepa_murojaat/4524"
      },
      {
        id: "ev-h01-3",
        senderName: "Рустам Тоҳиров",
        username: "@rustam_t_88",
        timestamp: "05.08.2026, 08:27",
        text: "Ҳоким ваъда қилган муддат ўтиб кетди. Илтимос масъуллар амалий жавоб беришсин.",
        telegramLink: "https://t.me/uchtepa_murojaat/4530"
      }
    ]
  },
  {
    id: "top-h02",
    lane: "hokim",
    tag: "1-Сектор ва Ободонлаштириш",
    tagType: "red",
    summary: "Зиёкор маҳалласида 1-сектор раҳбари ва туман ҳокимлиги ободонлаштириш дастури бўйича болалар майдончаси қурилиши тўхтаб қолган.",
    mahalla: "Зиёкор маҳалласи",
    date: "today",
    time: "07:58",
    evidenceCount: 4,
    quote: "Туман ҳокимлиги ободонлаштириш дастурига тушган болалар майдончаси ярим йўлда тўхтади.",
    evidence: [
      {
        id: "ev-h02-1",
        senderName: "Дилшод Нурматов",
        username: "@dilshod_nur",
        timestamp: "05.08.2026, 07:40",
        text: "Туман ҳокимлиги ободонлаштириш дастурига тушган болалар майдончаси ярим йўлда тўхтади. Қурилиш чиқиндилари ётибди.",
        telegramLink: "https://t.me/ziyokor_ovozi/3110"
      },
      {
        id: "ev-h02-2",
        senderName: "Шаҳноза Раҳимова",
        username: "@shahnoza_r",
        timestamp: "05.08.2026, 07:58",
        text: "1-сектор раҳбари ўтган ҳафта кўриб кетганди, аммо ҳамон ишлар давом этмади.",
        telegramLink: "https://t.me/ziyokor_ovozi/3115"
      }
    ]
  },
  {
    id: "top-h03",
    lane: "hokim",
    tag: "Кредит ва Субсидия",
    tagType: "red",
    summary: "Тоқчилик маҳалласида фуқаролар ҳоким ёрдамчиси томонидан имтиёзли кредит ва субсидия ҳужжатлари кечиктирилаётганидан шикоят қилмоқда.",
    mahalla: "Тоқчилик маҳалласи",
    date: "today",
    time: "06:50",
    evidenceCount: 3,
    quote: "Ҳоким ёрдамчисига субсидия аризаси топширилганига 20 кун бўлди, ҳали ҳам жавоб йўқ.",
    evidence: [
      {
        id: "ev-h03-1",
        senderName: "Собир Алиев",
        username: "@sobir_a",
        timestamp: "05.08.2026, 06:50",
        text: "Ҳоким ёрдамчисига субсидия аризаси топширилганига 20 кун бўлди, ҳали ҳам жавоб йўқ.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1205"
      }
    ]
  },

  // --- 2. СУВ ---
  {
    id: "top-w01",
    lane: "water",
    tag: "Авария ва Сув таъминоти",
    tagType: "blue",
    isNew: true,
    secondaryLanes: ["hokim"],
    summary: "Раваллиқ маҳалласида марказий сув қувурида ёрилиш содир бўлиб, кўп қаватли уйлар сувсиз қолган.",
    mahalla: "Раваллиқ маҳалласи",
    date: "today",
    time: "08:35",
    evidenceCount: 5,
    quote: "Марказий қувур ёрилган, сув кўчага оқиб кетяпти!",
    evidence: [
      {
        id: "ev-w01-1",
        senderName: "Фарҳод Муродов",
        username: "@farhod_m",
        timestamp: "05.08.2026, 07:15",
        text: "Марказий қувур ёрилган, сув кўчага оқиб кетяпти! 12, 14, 16-уйларда сув йўқ.",
        telegramLink: "https://t.me/ravalliq_ovozi/2104"
      },
      {
        id: "ev-w01-2",
        senderName: "Анваржон Саидов",
        username: "@anvar_s",
        timestamp: "05.08.2026, 08:35",
        text: "Авария хизмати келди, насос кутишяпти.",
        telegramLink: "https://t.me/ravalliq_ovozi/2115"
      }
    ]
  },
  {
    id: "top-w02",
    lane: "water",
    tag: "Сув сифати",
    tagType: "blue",
    summary: "Нонисангил маҳалласида ичимлик суви ранги оқариб ва лойқаланиб келаётгани ҳақида шикоят бор.",
    mahalla: "Нонисангил маҳалласи",
    date: "today",
    time: "07:42",
    evidenceCount: 3,
    quote: "Сув оқариб келмоқда, фильтрларни тозалаб бўлмай қолди.",
    evidence: [
      {
        id: "ev-w02-1",
        senderName: "Нигора Самадова",
        username: "@nigora_s",
        timestamp: "05.08.2026, 07:10",
        text: "Сув оқариб келмоқда, фильтрларни тозалаб бўлмай қолди. Ичишга яроқсиз.",
        telegramLink: "https://t.me/nonisangil_murojaat/1890"
      },
      {
        id: "ev-w02-2",
        senderName: "Исмоил Бобоев",
        username: "@ismoil_b",
        timestamp: "05.08.2026, 07:42",
        text: "Сув таъминоти текшириб берсин.",
        telegramLink: "https://t.me/nonisangil_murojaat/1895"
      }
    ]
  },
  {
    id: "top-w03",
    lane: "water",
    tag: "Ҳисоб ва Тўлов",
    tagType: "blue",
    summary: "Қаҳрамон маҳалласида сув ҳисоблагичи квитанциясида асоссиз қарздорлик кўрсатилганидан эътироз билдирилмоқда.",
    mahalla: "Қаҳрамон маҳалласи",
    date: "today",
    time: "09:05",
    evidenceCount: 2,
    quote: "Сув таъминоти квитанциясида асоссиз қарздорлик ёзилган.",
    evidence: [
      {
        id: "ev-w03-1",
        senderName: "Камол Маҳмудов",
        username: "@kamol_m",
        timestamp: "05.08.2026, 09:05",
        text: "Тўловлар тўланган, тизимда асоссиз қарз кўрсатяпти.",
        telegramLink: "https://t.me/qahramon_murojaat/884"
      }
    ]
  },

  // --- 3. ЭЛЕКТР ---
  {
    id: "top-e01",
    lane: "electricity",
    tag: "Электр симлари ва Хавфсизлик",
    tagType: "purple",
    isNew: true,
    summary: "Зиёкор маҳалласида ҳаво линиясидаги симлар осилиб қолган ва хавф туғдирмоқда.",
    mahalla: "Зиёкор маҳалласи",
    date: "today",
    time: "10:05",
    evidenceCount: 3,
    quote: "Яқинда шамолда сим ёғочдан узилиб осилиб қолди.",
    evidence: [
      {
        id: "ev-e01-1",
        senderName: "Ҳамидулло Қосимов",
        username: "@hamidullo_q",
        timestamp: "05.08.2026, 09:30",
        text: "Яқинда шамолда сим ёғочдан узилиб осилиб қолди. Кўчадан болалар ўтади, хавфли!",
        telegramLink: "https://t.me/ziyokor_ovozi/3128"
      },
      {
        id: "ev-e01-2",
        senderName: "Лолахон Зокирова",
        username: null,
        timestamp: "05.08.2026, 10:05",
        text: "ҲЭТК га хабар бердик, бригада кутиляпти.",
        telegramLink: "https://t.me/ziyokor_ovozi/3133"
      }
    ]
  },
  {
    id: "top-e02",
    lane: "electricity",
    tag: "Кўча ёритиш",
    tagType: "purple",
    summary: "Тоқчилик маҳалласида тунда кўча чироқлари ёқилмаётгани сабабли хавфсизлик муаммоси.",
    mahalla: "Тоқчилик маҳалласи",
    date: "today",
    time: "10:40",
    evidenceCount: 2,
    quote: "Кечаси кўчалар тумтоқ қоронғи, ёритиш чироқлари ўчирилган.",
    evidence: [
      {
        id: "ev-e02-1",
        senderName: "Баҳодир Шокиров",
        username: "@bahodir_sh",
        timestamp: "05.08.2026, 10:40",
        text: "Кечаси кўчалар тумтоқ қоронғи, ёритиш чироқлари ўчирилган.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1220"
      }
    ]
  },
  {
    id: "top-e03",
    lane: "electricity",
    tag: "Кучланиш пастлиги",
    tagType: "purple",
    summary: "Нонисангил маҳалласида кучланиш 140V га тушиб кетиб, маиший техникалар ўчиб қолмоқда.",
    mahalla: "Нонисангил маҳалласи",
    date: "today",
    time: "11:10",
    evidenceCount: 3,
    quote: "Кучланиш жуда паст, музлатгич ва кондиционер ишламаяпти.",
    evidence: [
      {
        id: "ev-e03-1",
        senderName: "Сардор Мирзаев",
        username: "@sardor_m_90",
        timestamp: "05.08.2026, 10:45",
        text: "Кучланиш жуда паст, музлатгич ва кондиционер ишламаяпти. 140V кўрсатяпти.",
        telegramLink: "https://t.me/nonisangil_murojaat/1910"
      },
      {
        id: "ev-e03-2",
        senderName: "Акмал Расулов",
        username: "@akmal_rasulov",
        timestamp: "05.08.2026, 11:10",
        text: "Трансформатор қуввати етмаяпти.",
        telegramLink: "https://t.me/nonisangil_murojaat/1915"
      }
    ]
  },

  // --- 4. ГАЗ ---
  {
    id: "top-g01",
    lane: "gas",
    tag: "Газ босими",
    tagType: "orange",
    isUpdated: true,
    summary: "Зиёкор маҳалласида газ босими минимал даражага тушиб кетиб, иситиш печлари ёнмаяпти.",
    mahalla: "Зиёкор маҳалласи",
    date: "today",
    time: "08:18",
    evidenceCount: 4,
    quote: "Газ босими жуда паст, овқат пишириш ва уй иситиш қийин.",
    evidence: [
      {
        id: "ev-g01-1",
        senderName: "Мукаррам опа",
        username: null,
        timestamp: "05.08.2026, 07:30",
        text: "Газ босими жуда паст, овқат пишириш ва уй иситиш қийин.",
        telegramLink: "https://t.me/ziyokor_ovozi/3108"
      },
      {
        id: "ev-g01-2",
        senderName: "Жасур Тўраев",
        username: "@jasur_t",
        timestamp: "05.08.2026, 08:18",
        text: "Райгазга мурожаат қилдик, созлаб беришсин.",
        telegramLink: "https://t.me/ziyokor_ovozi/3116"
      }
    ]
  },
  {
    id: "top-g02",
    lane: "gas",
    tag: "Газ сизиб чиқиши",
    tagType: "orange",
    summary: "Тоқчилик маҳалласида газ таъминоти қувурида сизиб чиқиш ҳиди анқиётгани ҳақида хабар.",
    mahalla: "Тоқчилик маҳалласи",
    date: "today",
    time: "07:05",
    evidenceCount: 3,
    quote: "Кўчада газ ҳиди келяпти, авария хизмати зудлик билан келсин.",
    evidence: [
      {
        id: "ev-g02-1",
        senderName: "Элёр Ҳакимов",
        username: "@elyor_h",
        timestamp: "05.08.2026, 06:50",
        text: "Кўчада газ ҳиди келяпти, авария хизмати зудлик билан келсин.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1188"
      },
      {
        id: "ev-g02-2",
        senderName: "Собиржон Каримов",
        username: "@sobir_k",
        timestamp: "05.08.2026, 07:05",
        text: "104 га қўнғироқ қилинди.",
        telegramLink: "https://t.me/toqchiliq_murojaat/1192"
      }
    ]
  },
  {
    id: "top-g03",
    lane: "gas",
    tag: "Газ Ҳисоблагич",
    tagType: "orange",
    summary: "Раваллиқ маҳалласида газ ҳисоблагичларини давлат кўригидан ўтказиш бўйича мурожаат.",
    mahalla: "Раваллиқ маҳалласи",
    date: "today",
    time: "09:50",
    evidenceCount: 2,
    quote: "Smart gaz meter алмаштирилгандан keyin ulanishi kechikmoqda.",
    evidence: [
      {
        id: "ev-g03-1",
        senderName: "Улуғбек Зоиров",
        username: "@ulugbek_z",
        timestamp: "05.08.2026, 09:50",
        text: "Smart gaz meter алмаштирилгандан кейин пломбалашга келишмади.",
        telegramLink: "https://t.me/ravalliq_ovozi/2140"
      }
    ]
  },

  // --- 5. ЧИҚИНДИ ---
  {
    id: "top-c01",
    lane: "waste",
    tag: "Чиқинди хизмати",
    tagType: "green",
    summary: "Раваллиқ маҳалласида маиший чиқиндилар 4 кундан бери олиб кетилмай, контейнерлар тўлиб тошган.",
    mahalla: "Раваллиқ маҳалласи",
    date: "today",
    time: "08:05",
    evidenceCount: 4,
    quote: "Чиқинди машинаси келмади, кўчада нохуш ҳид тарқаляпти.",
    evidence: [
      {
        id: "ev-c01-1",
        senderName: "Муножат Алиева",
        username: "@munojat_a",
        timestamp: "05.08.2026, 07:20",
        text: "Чиқинди машинаси келмади, кўчада нохуш ҳид тарқаляпти.",
        telegramLink: "https://t.me/ravalliq_ovozi/2110"
      },
      {
        id: "ev-c01-2",
        senderName: "Бахтиёр Тўлаганов",
        username: "@baxtiyor_t",
        timestamp: "05.08.2026, 08:05",
        text: "График бўйича ҳар 2 кунда келиши керак эди.",
        telegramLink: "https://t.me/ravalliq_ovozi/2114"
      }
    ]
  },
  {
    id: "top-c02",
    lane: "waste",
    tag: "Ноқонуний чиқиндихона",
    tagType: "green",
    summary: "Қаҳрамон маҳалласида ноқонуний чиқинди тўплана бошлангани ва тозаланиши сўралмоқда.",
    mahalla: "Қаҳрамон маҳалласи",
    date: "today",
    time: "07:22",
    evidenceCount: 3,
    quote: "Кўча бурчагига қурилиш чиқиндилари ва ахлат ташлаб кетишмоқда.",
    evidence: [
      {
        id: "ev-c02-1",
        senderName: "Ёрқин Ҳайдаров",
        username: "@yorqin_h",
        timestamp: "05.08.2026, 07:22",
        text: "Кўча бурчагига қурилиш чиқиндилари ва ахлат ташлаб кетишмоқда.",
        telegramLink: "https://t.me/qahramon_murojaat/860"
      }
    ]
  },
  {
    id: "top-c03",
    lane: "waste",
    tag: "Контейнер ўрнатиш",
    tagType: "green",
    summary: "Қулписар маҳалласида янги маиший чиқинди контейнерлари ўрнатиш бўйича мурожаат.",
    mahalla: "Қулписар маҳалласи",
    date: "today",
    time: "09:30",
    evidenceCount: 2,
    quote: "Маҳалламизда янги контейнерлар ўрнатилиши зарур.",
    evidence: [
      {
        id: "ev-c03-1",
        senderName: "Зулфия Сатторова",
        username: "@zulfiya_s",
        timestamp: "05.08.2026, 09:30",
        text: "Маҳалламизда аҳоли сони кўпайган, контейнерлар етишмайди.",
        telegramLink: "https://t.me/qulpisar_murojaat/540"
      }
    ]
  },

  // --- 6. КЕЧАГИ САЛОҲИЯТЛИ МИСОЛЛАР (YESTERDAY) ---
  {
    id: "top-y01",
    lane: "water",
    tag: "Сув таъминоти",
    tagType: "blue",
    summary: "Учтепа маҳалласида насос станциясидаги таъмирлаш ишлари якунланди.",
    mahalla: "Учтепа маҳалласи",
    date: "yesterday",
    time: "17:40",
    evidenceCount: 4,
    quote: "Сув таъминоти қайта тикланди, босим меъёрида.",
    evidence: [
      {
        id: "ev-y01-1",
        senderName: "Улуғбек Раҳимов",
        username: "@ulugbek_r",
        timestamp: "04.08.2026, 17:40",
        text: "Сув таъминоти қайта тикланди, босим меъёрида.",
        telegramLink: "https://t.me/uchtepa_murojaat/4490"
      }
    ]
  },
  {
    id: "top-y02",
    lane: "electricity",
    tag: "Трансформатор созлаш",
    tagType: "purple",
    summary: "Раваллиқ маҳалласида янги трансформатор пункти синовдан ўтказилди.",
    mahalla: "Раваллиқ маҳалласи",
    date: "yesterday",
    time: "15:20",
    evidenceCount: 3,
    quote: "ҲЭТК ходимлари янги подстанцияни улашди.",
    evidence: [
      {
        id: "ev-y02-1",
        senderName: "Дилмурод Каримов",
        username: "@dilmurod_k",
        timestamp: "04.08.2026, 15:20",
        text: "ҲЭТК ходимлари янги подстанцияни улашди.",
        telegramLink: "https://t.me/ravalliq_ovozi/2080"
      }
    ]
  }
];

export const SIMULATION_EVENTS = {
  newTopicWater: {
    id: "top-sim-w01",
    lane: "water",
    tag: "Авария ва Сув таъминоти",
    tagType: "blue",
    isNew: true,
    summary: "Учтепа маҳалласи Янгиҳаёт кўчасида янги ёрилиш содир бўлди: сув таъминоти тўхтатилди.",
    mahalla: "Учтепа маҳалласи",
    date: "today",
    time: "12:58",
    evidenceCount: 1,
    quote: "Ҳозиргина Янгиҳаёт кўчасида қувур ёрилиб сув тошиб чиқди!",
    evidence: [
      {
        id: "ev-sim-w01-1",
        senderName: "Маъмуржон Собиров",
        username: "@mamur_sobir",
        timestamp: "05.08.2026, 12:58",
        text: "Ҳозиргина Янгиҳаёт кўчасида қувур ёрилиб сув тошиб чиқди, тезда авария хизмати келсин!",
        telegramLink: "https://t.me/uchtepa_murojaat/4590"
      }
    ]
  }
};
