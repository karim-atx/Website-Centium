import type { Catalogue } from "../core";

// Round G (EH4b), Arabic: the professional's tools, part 2: a client's Biomarkers, Vitals and Sleep panels.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/pro/insights/sleepModel.ts",
  "components/pro/insights/SleepCharts.tsx",
  "components/pro/insights/VitalsPanel.tsx",
  "components/pro/insights/BiomarkersPanel.tsx",
];

// note (whole file): every line here describes a client's shared readings and
// stays neutral and non-diagnostic, as the English. Biomarker names, units the
// lab reported and the lab's own report names are data and stay as they are
// (F13). Terms: biomarker «مؤشر حيوي», reading «قراءة», result «نتيجة», test
// (a lab panel) «فحص», lab range «نطاق المختبر», out of range «خارج النطاق»,
// borderline «على الحد» (as proclients), weigh-in «قياس وزن», sleep stages
// «مراحل النوم» (deep «عميق», light «خفيف», REM kept in Latin as the member
// screens, awake «يقظة», asleep «مدة النوم»), bedtime «وقت النوم», hypnogram
// «مخطط مراحل النوم». Blood pressure bands: Normal «طبيعي» (a context key, as
// the bare "Normal" is a workout word), Elevated «مرتفع», Stage 1 / 2
// «المرحلة 1 / 2». Units in sentences: mmHg «ملم زئبق», bpm «نبضة/د», kg «كغ».
const provitals: Catalogue = {
  // == Sleep: stages, bedtime and the hypnogram ==
  // note: health wording; sleep stage names (the member screens' choices)
  Deep: "عميق",
  REM: "REM", // note: health wording; kept in Latin as the member screens (eh-health has «حركة العين السريعة»)
  Awake: "يقظة", // note: health wording; the member screens' form (eh-health has «مستيقظ»)
  Asleep: "مدة النوم", // note: health wording; the member screens' form (eh-health has «النوم»)
  Bedtime: "وقت النوم",
  "Sleep stages": "مراحل النوم", // note: health wording
  "Is {firstName} getting enough deep and REM sleep?": "هل يحصل {firstName} على ما يكفي من النوم العميق ونوم REM؟", // note: health wording
  "Sleep stages: deep {deep}, REM {rem}, light {light} a night on average over {n} nights.": {
    zero: "مراحل النوم: عميق {deep}، REM {rem}، خفيف {light} في الليلة في المتوسط على مدى {n} ليلة.",
    one: "مراحل النوم: عميق {deep}، REM {rem}، خفيف {light} في الليلة في المتوسط على مدى ليلة واحدة.",
    two: "مراحل النوم: عميق {deep}، REM {rem}، خفيف {light} في الليلة في المتوسط على مدى ليلتين.",
    few: "مراحل النوم: عميق {deep}، REM {rem}، خفيف {light} في الليلة في المتوسط على مدى {n} ليالٍ.",
    many: "مراحل النوم: عميق {deep}، REM {rem}، خفيف {light} في الليلة في المتوسط على مدى {n} ليلة.",
    other: "مراحل النوم: عميق {deep}، REM {rem}، خفيف {light} في الليلة في المتوسط على مدى {n} ليلة.",
  }, // note: health wording
  "{asleep} asleep · {awake} awake": "{asleep} نوم · {awake} يقظة", // note: health wording
  "Deep {deep} · REM {rem}": "عميق {deep} · REM {rem}", // note: health wording
  "Average of {n} nights": { zero: "متوسط {n} ليلة", one: "متوسط ليلة واحدة", two: "متوسط ليلتين", few: "متوسط {n} ليالٍ", many: "متوسط {n} ليلة", other: "متوسط {n} ليلة" },
  "No stages this night": "لا مراحل لهذه الليلة",
  "{n}h": "{n} س",
  "{n}m": "{n} د",
  "How regular are bedtime and wake time?": "ما مدى انتظام وقت النوم ووقت الاستيقاظ؟", // note: health wording
  "Bedtime {time} on average over {n} nights.": {
    zero: "وقت النوم {time} في المتوسط على مدى {n} ليلة.",
    one: "وقت النوم {time} في المتوسط على مدى ليلة واحدة.",
    two: "وقت النوم {time} في المتوسط على مدى ليلتين.",
    few: "وقت النوم {time} في المتوسط على مدى {n} ليالٍ.",
    many: "وقت النوم {time} في المتوسط على مدى {n} ليلة.",
    other: "وقت النوم {time} في المتوسط على مدى {n} ليلة.",
  },
  "Night of {date}": "ليلة {date}",
  "Hypnogram: when {firstName} woke and how sleep cycled.": "مخطط مراحل النوم: متى استيقظ {firstName} وكيف تعاقبت دورات النوم.", // note: health wording
  Hypnogram: "مخطط مراحل النوم",
  "No sleep stages yet. They fill in when {firstName}'s sleep syncs with stages from a wearable.": "لا مراحل نوم بعد. تظهر عندما يُزامَن نوم {firstName} مع مراحله من جهاز قابل للارتداء.",
  "No sleep stages yet.": "لا مراحل نوم بعد.",
  "Sleep per night": "النوم في الليلة",
  "Sleep per night (h)": "النوم في الليلة (س)",
  "{n}-day average": "متوسط {n} يوم",
  Average: "المتوسط",
  "Nights under 6 h": "ليالٍ أقل من 6 س", // note: health wording; a count of short nights, no judgement
  "Last night": "الليلة الماضية",
  "Last {n} days": { zero: "آخر {n} يوم", one: "آخر يوم", two: "آخر يومين", few: "آخر {n} أيام", many: "آخر {n} يومًا", other: "آخر {n} يوم" },
  "No sleep logged yet.": "لم يُسجَّل نوم بعد.",
  "No sleep logged": "لم يُسجَّل نوم",
  "{time} asleep": "{time} نوم",
  "Sleep per night {time} on average.": "النوم في الليلة {time} في المتوسط.",
  "Stages: Deep {deep} · REM {rem} · Light {light} a night on average.": "المراحل: عميق {deep} · REM {rem} · خفيف {light} في الليلة في المتوسط.", // note: health wording
  "Previous period": "الفترة السابقة",

  // == Sleep: the insight lines (measured facts only) ==
  "Bedtime varies by {n} minutes.": {
    zero: "يتفاوت وقت النوم بمقدار {n} دقيقة.",
    one: "يتفاوت وقت النوم بمقدار دقيقة واحدة.",
    two: "يتفاوت وقت النوم بمقدار دقيقتين.",
    few: "يتفاوت وقت النوم بمقدار {n} دقائق.",
    many: "يتفاوت وقت النوم بمقدار {n} دقيقة.",
    other: "يتفاوت وقت النوم بمقدار {n} دقيقة.",
  },
  "Deep sleep is shortest on the nights with a bedtime after midnight.": "يكون النوم العميق أقصر في الليالي التي يبدأ فيها النوم بعد منتصف الليل.", // note: health wording; a measured fact, no cause or advice
  "Deep {deep} and REM {rem} a night on average.": "عميق {deep} وREM {rem} في الليلة في المتوسط.", // note: health wording
  "No wake-ups during the night": "لا استيقاظ خلال الليل",
  "Woke once": "استيقظ مرة واحدة",
  "Woke twice": "استيقظ مرتين",
  "Woke {n} times": { zero: "استيقظ {n} مرة", one: "استيقظ مرة واحدة", two: "استيقظ مرتين", few: "استيقظ {n} مرات", many: "استيقظ {n} مرة", other: "استيقظ {n} مرة" },
  "no deep block": "لا فترة نوم عميق",
  "only one deep block": "فترة نوم عميق واحدة فقط",
  "{n} deep blocks": { zero: "لا فترات نوم عميق", one: "فترة نوم عميق واحدة", two: "فترتا نوم عميق", few: "{n} فترات نوم عميق", many: "{n} فترة نوم عميق", other: "{n} فترة نوم عميق" },
  "{woke}; {deep} in the second half of the night.": "{woke}؛ {deep} في النصف الثاني من الليل.", // note: health wording; {woke} and {deep} are the phrases above

  // == Vitals: tabs and empty states ==
  "Heart rate": "معدل النبض", // note: health wording; the member screens' form (eh-health has «معدل القلب»)
  "Calories burned": "السعرات المحروقة",
  "{firstName} shares vitals with you, but nothing has been logged yet.": "يشارك {firstName} علاماته الحيوية معك، لكن لم يُسجَّل شيء بعد.",
  "No blood pressure shared yet": "لم يُشارَك ضغط الدم بعد",
  "This fills in when {firstName} shares blood pressure with you.": "يمتلئ هذا عندما يشارك {firstName} ضغط الدم معك.",
  "No heart rate shared yet": "لم يُشارَك معدل النبض بعد",
  "This fills in when {firstName} shares Activity and vitals with you.": "يمتلئ هذا عندما يشارك {firstName} النشاط والعلامات الحيوية معك.",
  "No weight shared yet": "لم يُشارَك الوزن بعد",
  "This fills in when {firstName} shares weight with you.": "يمتلئ هذا عندما يشارك {firstName} الوزن معك.",
  "No sleep shared yet": "لم يُشارَك النوم بعد",

  // == Vitals: blood pressure ==
  mmHg: "ملم زئبق",
  "{n} readings": { zero: "لا قراءات", one: "قراءة واحدة", two: "قراءتان", few: "{n} قراءات", many: "{n} قراءة", other: "{n} قراءة" },
  "In the normal band": "ضمن الفئة الطبيعية", // note: health wording; the AHA category the reading falls in
  "of {n}": "من {n}",
  "Readings in this range": "القراءات في هذه الفترة",
  Mornings: "الصباح",
  "Higher than evenings": "أعلى من المساء", // note: health wording
  "Lower than evenings": "أقل من المساء", // note: health wording
  "{n} readings so far. Trends appear after 2 weeks.": {
    zero: "لا قراءات حتى الآن. تظهر الاتجاهات بعد أسبوعين.",
    one: "قراءة واحدة حتى الآن. تظهر الاتجاهات بعد أسبوعين.",
    two: "قراءتان حتى الآن. تظهر الاتجاهات بعد أسبوعين.",
    few: "{n} قراءات حتى الآن. تظهر الاتجاهات بعد أسبوعين.",
    many: "{n} قراءة حتى الآن. تظهر الاتجاهات بعد أسبوعين.",
    other: "{n} قراءة حتى الآن. تظهر الاتجاهات بعد أسبوعين.",
  },
  "Is blood pressure coming down out of Stage {n}?": "هل ينخفض ضغط الدم خارج المرحلة {n}؟", // note: health wording; the AHA category name
  "Is blood pressure staying within a healthy range?": "هل يبقى ضغط الدم ضمن نطاق صحي؟", // note: health wording
  "Normal|blood pressure": "طبيعي", // note: health wording; the blood pressure category (AHA)
  Elevated: "مرتفع", // note: health wording; the blood pressure category (AHA)
  "Stage 1": "المرحلة 1", // note: health wording; the blood pressure category (AHA)
  "Stage 2": "المرحلة 2", // note: health wording; the blood pressure category (AHA)
  "Stage 1 high": "مرتفع، المرحلة 1", // note: health wording; the blood pressure category (AHA)
  "Stage 2 high": "مرتفع، المرحلة 2", // note: health wording; the blood pressure category (AHA)
  "Very high": "مرتفع جدًا", // note: health wording; the blood pressure category (AHA)
  Categories: "الفئات",
  "Systolic and diastolic": "الانقباضي والانبساطي", // note: health wording
  "No readings": "لا قراءات",
  "1 reading": "قراءة واحدة",
  "avg of {n} readings": { zero: "متوسط {n} قراءة", one: "متوسط قراءة واحدة", two: "متوسط قراءتين", few: "متوسط {n} قراءات", many: "متوسط {n} قراءة", other: "متوسط {n} قراءة" },
  "Systolic down {n} mmHg since {date}.": "انخفض الانقباضي {n} ملم زئبق منذ {date}.", // note: health wording; a measured change
  "Systolic up {n} mmHg since {date}.": "ارتفع الانقباضي {n} ملم زئبق منذ {date}.", // note: health wording; a measured change
  "Blood pressure {value} mmHg on average, {n} readings.": {
    zero: "ضغط الدم {value} ملم زئبق في المتوسط، {n} قراءة.",
    one: "ضغط الدم {value} ملم زئبق في المتوسط، قراءة واحدة.",
    two: "ضغط الدم {value} ملم زئبق في المتوسط، قراءتان.",
    few: "ضغط الدم {value} ملم زئبق في المتوسط، {n} قراءات.",
    many: "ضغط الدم {value} ملم زئبق في المتوسط، {n} قراءة.",
    other: "ضغط الدم {value} ملم زئبق في المتوسط، {n} قراءة.",
  },

  // == Vitals: heart rate ==
  "Is resting heart rate settling while daily range stays healthy?": "هل يستقر نبض الراحة بينما يبقى المدى اليومي صحيًا؟", // note: health wording
  "Normal resting 60 to 100": "نبض الراحة الطبيعي من 60 إلى 100", // note: health wording; the usual adult reference band
  "Min to max": "من الأدنى إلى الأعلى",
  "Resting {n} bpm": "الراحة {n} نبضة/د", // note: health wording
  "No resting reading": "لا قراءة أثناء الراحة",
  "Range {min} to {max}": "المدى من {min} إلى {max}",
  "Resting down {n} bpm since {date}.": "انخفض نبض الراحة {n} نبضة/د منذ {date}.", // note: health wording; a measured change
  "Resting up {n} bpm since {date}.": "ارتفع نبض الراحة {n} نبضة/د منذ {date}.", // note: health wording; a measured change
  "Resting heart rate {n} bpm on average.": "معدل نبض القلب أثناء الراحة {n} نبضة/د في المتوسط.", // note: health wording
  "Resting heart rate": "معدل نبض القلب أثناء الراحة",
  bpm: "نبضة/د",
  "Highest today": "الأعلى اليوم",
  "Lowest this week": "الأدنى هذا الأسبوع",
  "From shared readings": "من القراءات المشارَكة",

  // == Vitals: weight ==
  "Is weight trending toward the {n} kg goal?": "هل يتجه الوزن نحو هدف {n} كغ؟", // note: health wording
  "How is weight changing over time?": "كيف يتغير الوزن مع مرور الوقت؟", // note: health wording
  "Goal {n} kg": "الهدف {n} كغ",
  "Weigh-ins": "قياسات الوزن",
  "Smoothed trend": "الاتجاه المُنعَّم",
  "{kg} kg · trend {trend}": "{kg} كغ · الاتجاه {trend}",
  "{kg} kg": "{kg} كغ",
  "{kg} kg to goal": "{kg} كغ حتى الهدف",
  "The trend is down {kg} kg a week.": "الاتجاه منخفض {kg} كغ في الأسبوع.", // note: health wording; a measured change
  "The trend is up {kg} kg a week.": "الاتجاه مرتفع {kg} كغ في الأسبوع.", // note: health wording; a measured change
  "Weight {kg} kg, {n} weigh-ins in this range.": "الوزن {kg} كغ، عدد قياسات الوزن في هذه الفترة: {n}.",
  "Weight {kg} kg, {n} weigh-ins in this range; the trend line starts at 3 weigh-ins.": "الوزن {kg} كغ، عدد قياسات الوزن في هذه الفترة: {n}؛ يبدأ خط الاتجاه عند 3 قياسات.",
  "No weigh-ins in this range.": "لا قياسات وزن في هذه الفترة.",
  "Since {date}": "منذ {date}",
  Waist: "الخصر",
  "Body fat": "دهون الجسم",
  "Body measurements, if shared": "قياسات الجسم، إن شوركت",
  "From body measurements": "من قياسات الجسم",

  // == Vitals: steps, water, calories burned ==
  h: "س",
  steps: "خطوة",
  ml: "مل",
  kcal: "سعرة",
  "How long does {firstName} sleep?": "كم ينام {firstName}؟", // note: health wording
  "No reading": "لا قراءة",
  "{title} {value} on average.": "{title}: {value} في المتوسط.",
  "{title} a day": "{title} في اليوم",
  "{count} of {n} days": { zero: "{count} من {n} يوم", one: "{count} من يوم واحد", two: "{count} من يومين", few: "{count} من {n} أيام", many: "{count} من {n} يومًا", other: "{count} من {n} يوم" },

  // == Biomarkers: the list ==
  "Out of range": "خارج النطاق", // note: health wording; outside the lab's reference range
  "{low} to {high} {unit}": "من {low} إلى {high} {unit}",
  "Under {high} {unit}": "أقل من {high} {unit}",
  "under {high} {unit}": "أقل من {high} {unit}",
  "Above {low} {unit}": "أعلى من {low} {unit}",
  "above {low} {unit}": "أعلى من {low} {unit}",
  "Below {low} {unit}": "أقل من {low} {unit}",
  "{n} weeks ago": { zero: "منذ {n} أسبوع", one: "منذ أسبوع", two: "منذ أسبوعين", few: "منذ {n} أسابيع", many: "منذ {n} أسبوعًا", other: "منذ {n} أسبوع" },
  "{n} months ago": { zero: "منذ {n} شهر", one: "منذ شهر", two: "منذ شهرين", few: "منذ {n} أشهر", many: "منذ {n} شهرًا", other: "منذ {n} شهر" },
  "{n} years ago": { zero: "منذ {n} سنة", one: "منذ سنة", two: "منذ سنتين", few: "منذ {n} سنوات", many: "منذ {n} سنة", other: "منذ {n} سنة" },
  "No lab results shared": "لم تُشارَك نتائج مختبر",
  "Trends appear here when {firstName} shares a test with you, or a single result.": "تظهر الاتجاهات هنا عندما يشارك {firstName} فحصًا معك، أو نتيجة واحدة.",
  "Ask {firstName} to share a test": "اطلب من {firstName} مشاركة فحص",
  "Ask {firstName} to share the whole test": "اطلب من {firstName} مشاركة الفحص كاملًا",
  Changing: "متغيّرة", // note: health wording; results that changed a lot between tests
  "Last test": "آخر فحص",
  "Latest results": "أحدث النتائج",
  Improving: "تتحسن", // note: health wording; results moving back toward their range
  "Out of range or critical": "خارج النطاق أو حرجة", // note: health wording
  Compare: "مقارنة",
  "No results match this filter.": "لا نتائج تطابق هذا التصنيف.",
  "Points sit on their real test dates. Ranges are the reporting lab's; where a lab gives none, Centium's reference range for {firstName}'s sex and age is used.": "تقع النقاط على تواريخ الفحوص الفعلية. النطاقات هي نطاقات المختبر الذي أصدر النتيجة؛ وحيث لا يعطي المختبر نطاقًا، يُستخدم النطاق المرجعي من Centium لجنس {firstName} وعمره.", // note: health wording
  Tests: "الفحوص",
  "Lab report": "تقرير المختبر",
  "{n} out of range": "{n} خارج النطاق", // note: health wording
  "Open test, {date}": "فتح الفحص، {date}",
  "; ": "؛ ",

  // == Biomarkers: one marker over time ==
  "Centium reference range": "النطاق المرجعي من Centium", // note: health wording
  "reported by the lab": "وفق المختبر",
  Results: "النتائج",
  "({pct}%) since {date}": "({pct}%) منذ {date}",
  "First test": "الفحص الأول",
  "Over {n} months: {change} · about {perYear} a year": {
    zero: "خلال {n} شهر: {change} · نحو {perYear} في السنة",
    one: "خلال شهر واحد: {change} · نحو {perYear} في السنة",
    two: "خلال شهرين: {change} · نحو {perYear} في السنة",
    few: "خلال {n} أشهر: {change} · نحو {perYear} في السنة",
    many: "خلال {n} شهرًا: {change} · نحو {perYear} في السنة",
    other: "خلال {n} شهر: {change} · نحو {perYear} في السنة",
  },
  "Lab range {range} · {source}": "نطاق المختبر {range} · {source}", // note: health wording
  "Over time": "مع مرور الوقت",
  Unit: "الوحدة",
  "Lab range": "نطاق المختبر", // note: health wording
  "{change} since {date} ({pct}%)": "{change} منذ {date} ({pct}%)",
  "Drag sideways to scrub, tap a point to pin it": "اسحب جانبيًا للتنقل، واضغط على نقطة لتثبيتها",
  "{name}: {n} results, latest {value} {unit}, lab range {range}.": {
    zero: "{name}: لا نتائج، الأحدث {value} {unit}، نطاق المختبر {range}.",
    one: "{name}: نتيجة واحدة، الأحدث {value} {unit}، نطاق المختبر {range}.",
    two: "{name}: نتيجتان، الأحدث {value} {unit}، نطاق المختبر {range}.",
    few: "{name}: {n} نتائج، الأحدث {value} {unit}، نطاق المختبر {range}.",
    many: "{name}: {n} نتيجة، الأحدث {value} {unit}، نطاق المختبر {range}.",
    other: "{name}: {n} نتيجة، الأحدث {value} {unit}، نطاق المختبر {range}.",
  },
  "One test so far, so there is no trend yet. It draws once {firstName} shares a second result.": "فحص واحد حتى الآن، لذا لا اتجاه بعد. يُرسم عندما يشارك {firstName} نتيجة ثانية.",
  "All results": "كل النتائج",
  "{n} tests": { zero: "لا فحوص", one: "فحص واحد", two: "فحصان", few: "{n} فحوص", many: "{n} فحصًا", other: "{n} فحص" },
  "Shared result": "نتيجة مشارَكة",
  "Add to note": "إضافة إلى ملاحظة",

  // == Biomarkers: one result (the sheet) ==
  Value: "القيمة",
  "None given": "لم يُذكر",
  "{change} {unit} ({pct}%) since {date}": "{change} {unit} ({pct}%) منذ {date}",
  "Lab and date": "المختبر والتاريخ",
  "{report} · drawn {date}": "{report} · سُحبت العينة في {date}",
  "Source document": "المستند المصدر",

  // == Biomarkers: compare ==
  "{names} fell since {date}": "انخفضت {names} منذ {date}", // note: health wording; a measured change
  "{names} rose since {date}": "ارتفعت {names} منذ {date}", // note: health wording; a measured change
  "{names} did not change": "لم تتغير {names}",
  "One chart": "مخطط واحد",
  "Two charts": "مخططان",
  "Three charts": "ثلاثة مخططات",
  "Four charts": "أربعة مخططات",
  "{n} charts": { zero: "{n} مخطط", one: "مخطط واحد", two: "مخططان", few: "{n} مخططات", many: "{n} مخططًا", other: "{n} مخطط" },
  "Compare {category}": "مقارنة {category}",
  "Compare results": "مقارنة النتائج",
  "Against range": "مقابل النطاق",
  "Own scales": "مقاييس مستقلة",
  "Remove {name}": "إزالة {name}",
  "Position in each lab range": "الموضع ضمن نطاق كل مختبر",
  "Are the {category} moving together?": "هل تتحرك {category} معًا؟",
  "Are these results moving together?": "هل تتحرك هذه النتائج معًا؟",
  "Inside each lab range": "داخل نطاق كل مختبر",
  "Upper limit": "الحد الأعلى",
  "Lower limit": "الحد الأدنى",
  "{name} {value} {unit} · {pct}% of range": "{name} {value} {unit} · {pct}% من النطاق",
  "{insight}. Filled points are outside their range.": "{insight}. النقاط المعبأة خارج نطاقها.",
  "Each line is placed against its own lab range: 0 is the lower limit, 100 the upper.": "يوضع كل خط مقابل نطاق مختبره: 0 هو الحد الأدنى و100 الحد الأعلى.",
  "{name} has no upper limit, so {value} {unit} is used as its top.": "ليس لـ {name} حد أعلى، لذا تُستخدم {value} {unit} كقمة له.",
  "{charts} on one time axis, each on its own scale.": "{charts} على محور زمني واحد، لكل منها مقياسه.",
  "Scrubbing one moves the pin on both.": "التنقل في أحدهما يحرّك التثبيت في كليهما.",
  "Scrubbing one moves the pin on all three.": "التنقل في أحدها يحرّك التثبيت في الثلاثة.",
  "Scrubbing one moves the pin on all four.": "التنقل في أحدها يحرّك التثبيت في الأربعة.",

  // == Biomarkers: a test ==
  "Within 10% of the upper limit": "ضمن 10% من الحد الأعلى", // note: health wording
  "Within 10% of the lower limit": "ضمن 10% من الحد الأدنى", // note: health wording
  "Test · {date}": "فحص · {date}",
  "Shared as part of {firstName}'s lab history": "مشارَك ضمن سجل المختبر الخاص بـ {firstName}",
  "{n} results shared individually by {firstName} on {date}": {
    zero: "لم يشارك {firstName} أي نتيجة بمفردها في {date}",
    one: "نتيجة واحدة شاركها {firstName} بمفردها في {date}",
    two: "نتيجتان شاركهما {firstName} كلًّا بمفردها في {date}",
    few: "{n} نتائج شاركها {firstName} كلًّا بمفردها في {date}",
    many: "{n} نتيجة شاركها {firstName} كلًّا بمفردها في {date}",
    other: "{n} نتيجة شاركها {firstName} كلًّا بمفردها في {date}",
  },
  "Only the results shared one at a time show here.": "تظهر هنا فقط النتائج المشارَكة واحدة تلو الأخرى.",
  "Compare with": "مقارنة مع",
  "{kind} · opens in the viewer": "{kind} · يُفتح في العارض",
  "PDF · {n} pages": { zero: "PDF · {n} صفحة", one: "PDF · صفحة واحدة", two: "PDF · صفحتان", few: "PDF · {n} صفحات", many: "PDF · {n} صفحة", other: "PDF · {n} صفحة" },
  Image: "صورة",
  "{n} flagged": "{n} مُعلَّمة", // note: health wording; results outside or near their range
  "Was {value} · {change}": "كانت {value} · {change}",
  "{a} vs {b}": "{a} مقابل {b}",
  Result: "النتيجة",
  "Green: moved toward range. Red: moved away.": "الأخضر: اقترب من النطاق. الأحمر: ابتعد عنه.", // note: health wording
  "{n} results from {date} were not in the {month} test.": {
    zero: "لا نتائج من {date} غائبة عن فحص {month}.",
    one: "نتيجة واحدة من {date} لم تكن في فحص {month}.",
    two: "نتيجتان من {date} لم تكونا في فحص {month}.",
    few: "{n} نتائج من {date} لم تكن في فحص {month}.",
    many: "{n} نتيجة من {date} لم تكن في فحص {month}.",
    other: "{n} نتيجة من {date} لم تكن في فحص {month}.",
  },
};

export default provitals;
