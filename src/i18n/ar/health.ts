import type { Catalogue } from "../core";

// Round G (EH2), Arabic: the Health tab, the metric pages, lab results,
// biomarkers and imaging, the care plan and health checks. Source files this
// catalogue covers (paths from src/). The catalogue test checks every
// t/tn/tk key in them has Arabic here or in another area file, and that no
// English is left outside t() in their JSX. Clinical guidance
// (services/*/guidance.ts, services/health-metrics/clinicalCopy.ts, the
// screening and pregnancy-check catalogues), biomarker names and lab
// catalogue content stay English (F13).
export const FILES: string[] = [
  // == Health · the Health tab ==
  "pages/health/Health.tsx",
  "pages/health/HealthSources.tsx",
  "components/health/MetricWidget.tsx",
  "components/health/HealthSafetyCard.tsx",
  "components/health/IntegrationsCard.tsx",
  "components/health/HeartRateEKG.tsx",
  "components/health/Sparkline.tsx",
  "components/health/WeightTrendChart.tsx",
  "components/health/widgetGraphics.tsx",
  "components/health/useLoopWhileVisible.ts",
  // == Health · Add metric and the log sheets ==
  "components/health/AddMetricSheet.tsx",
  "components/health/BloodPressureSheet.tsx",
  "components/health/BpVeryHighPopup.tsx",
  "components/health/BpHowToMeasureSheet.tsx",
  "components/health/log/LogSheetParts.tsx",
  "components/health/log/LogWaterSheet.tsx",
  "components/health/log/LogWeightSheet.tsx",
  "components/health/log/useLogQueue.ts",
  "services/blood-pressure/classify.ts",
  "services/blood-pressure/reading.ts",
  // == Health · metric pages (shared kit) ==
  "components/health/metric/MetricKit.tsx",
  "components/health/metric/periods.ts",
  "components/health/metric/HealthPopup.tsx",
  "components/health/metric/SyncedRemove.tsx",
  "components/health/metric/StepsNoDevice.tsx",
  "components/health/metric/HourlyBars.tsx",
  "services/health-metrics/b1.ts",
  // == Health · Steps ==
  "pages/health/metrics/StepsPage.tsx",
  "components/health/metric/StepsHero.tsx",
  "components/health/metric/StepsBarChart.tsx",
  "components/health/metric/StepsGoalSheet.tsx",
  // == Health · Sleep ==
  "pages/health/metrics/SleepPage.tsx",
  "components/health/metric/SleepHero.tsx",
  "components/health/metric/SleepBedChart.tsx",
  // == Health · Water ==
  "pages/health/metrics/WaterPage.tsx",
  "components/health/metric/WaterHero.tsx",
  "components/health/metric/WaterCharts.tsx",
  "components/health/metric/WaterSheets.tsx",
  // == Health · Weight trend ==
  "pages/health/metrics/WeightPage.tsx",
  "components/health/metric/WeightParts.tsx",
  // == Health · Calories burned ==
  "pages/health/metrics/CaloriesPage.tsx",
  "components/health/metric/CaloriesHero.tsx",
  "components/health/metric/FromWorkoutsCard.tsx",
  // == Health · Heart rate ==
  "pages/health/metrics/HeartRatePage.tsx",
  "pages/health/metrics/HeartRateAlertsPage.tsx",
  "components/health/metric/HeartRateParts.tsx",
  // == Health · Blood pressure ==
  "pages/health/metrics/BloodPressurePage.tsx",
  "components/health/metric/BloodPressureParts.tsx",
  // == Health · Biomarkers & imaging (the Records page) ==
  "pages/health/HealthRecords.tsx",
  "components/health/records/kit.tsx",
  "components/health/records/RecordsHeader.tsx",
  "components/health/records/BiomarkersTab.tsx",
  "components/health/records/LabsTab.tsx",
  "components/health/records/ImagingTab.tsx",
  "components/health/records/HistoryTab.tsx",
  "components/health/records/InjuriesSection.tsx",
  "components/health/records/MarkerPage.tsx",
  "components/health/records/MarkerPickerSheet.tsx",
  "components/health/records/ResultFormSheet.tsx",
  "components/health/records/UploadChoiceSheet.tsx",
  "components/health/records/ProfessionalSharedFiles.tsx",
  "components/health/records/useLabResults.ts",
  "components/health/BiomarkerDetailSheet.tsx",
  "components/health/BiomarkerLineChart.tsx",
  "components/health/FileViewerSheet.tsx",
  "components/health/imagingTypes.ts",
  // == Health · Scan or upload a report ==
  "components/health/BiomarkerCaptureFlow.tsx",
  "components/health/MarkerEntryRow.tsx",
  "components/health/markerDraft.ts",
  "components/health/useLabCatalogue.ts",
  "services/labs/catalogueLogic.ts",
  // == Health · Imaging form and sharing ==
  "components/health/ImagingCaptureFlow.tsx",
  "components/health/ShareImagingSheet.tsx",
  "components/health/ShareResultSheet.tsx",
  "components/health/ShareBiomarkerSheet.tsx",
  // == Health · Care plan ==
  "pages/health/CarePlan.tsx",
  // == Health · medical history (service messages) ==
  "services/medical-history/index.ts",
  // == Health · Your health checks ==
  "pages/health/HealthChecks.tsx",
  "components/health-checks/GeneralPlan.tsx",
  "components/health-checks/CheckInSheet.tsx",
  "components/health-checks/HealthChecksSetting.tsx",
  "components/health-checks/HealthCheckParts.tsx",
  "components/health-checks/CheckFlag.tsx",
  "components/health-checks/useCheckFlags.ts",
  "services/health-checks/checkStatus.ts",
  "services/health-checks/screening.ts",
  "services/health-checks/remote.ts",
  "services/health-checks/flags.ts",
  "services/health-checks/plan.ts",
  "services/health-checks/setting.ts",
];

// note (whole file): Health «الصحة», heart rate «معدل القلب» (as the landing
// page writes it), blood pressure «ضغط الدم» with systolic «الانقباضي» /
// diastolic «الانبساطي» / pulse «النبض», mmHg «ملم زئبق», bpm «نبضة/د», kg
// «كغ», L «ل», ml «مل», kcal «سعرة»; "check-in" «متابعة» (Round F B); health
// checks «الفحوصات الصحية». Every health line carries a note for the clinical
// reviewer; "may" stays «قد» and estimates stay estimates.
// note (whole file): the per-metric pages (Steps, Sleep, Water, Weight trend,
// Calories burned, Heart rate, Blood pressure, Heart-rate alerts). Terms:
// reading «قراءة», goal «الهدف», average «المتوسط» / "Avg" «متوسط», resting
// «أثناء الراحة», bpm «نبضة/د», kcal «سعرة», mmHg «ملم زئبق», weigh-in «وزن
// مسجّل», bedtime «وقت النوم», wake «الاستيقاظ», "asleep" (after a duration)
// «من النوم», sleep stages Deep «عميق» / Light «خفيف» (existing key) / REM
// «حركة العين السريعة» / Awake «مستيقظ», "days ahead" «الأيام القادمة».
// "{n} of {span} days logged" is worded «أيام مسجّلة: {n} من {span}» so the
// noun never has to agree with a number. Month and weekday names come from
// Intl (ar-LB, Western digits). Clock times ("8:40 AM") stay as the shared
// 12-hour helper prints them. Blood-pressure category words, the
// heart-rate alert copy and every guidance constant are clinical copy and
// stay English. The isolates (U+2066 … U+2069) around "140 / 90" keep the
// two numbers in order inside Arabic text.
// note (whole file): biomarker «مؤشر حيوي» (a marker «مؤشر»), lab results
// «نتائج التحاليل», lab report «تقرير مختبر» (in the flow simply «التقرير»),
// imaging «التصوير الطبي», an imaging record with a file «صورة طبية», scanning
// a paper report with the camera «مسح»; reference range «النطاق المرجعي» (short
// «النطاق»), in range «ضمن النطاق», below / above «منخفض / مرتفع» (long «أدنى من
// النطاق / أعلى من النطاق»); "under 3" / "above 30" «أقل من 3 / أكثر من 30»;
// "Typed" (entered by hand, no file) «مُدخَلة يدويًا»; medication «دواء», dose
// «الجرعة», route «طريقة الأخذ», condition «حالة صحية», surgery «عملية جراحية»,
// injury «إصابة», care plan «خطة الرعاية». Biomarker names, units and the
// catalogue remarks stay English (catalogue content); the stored condition and
// imaging-type values stay English and only their labels are translated. The
// share-card image (canvas) stays English, as the other share cards do. The
// History tab and a marker's result history are both «السجل». The default
// report name "Blood panel" reuses the landing page's «فحص الدم».
const health: Catalogue = {
  // == Health · the Health tab ==
  "{h}h {m}m": "{h} س {m} د",
  "{markers} suggested": "مقترح: {markers}", // note: health wording; the Biomarkers row's second line naming up to two markers outside their reference range (main's copy, "X and Y suggested"); marker names stay English
  "From {who}": "من {who}", // note: {who} is the professional's name and role (their data)
  "From {who} · next review {date}": "من {who} · المراجعة التالية {date}",
  "{name} access is off. Turn it on": "الوصول إلى {name} متوقف. فعّله",
  "Synced {when} from {list}": "تمت المزامنة {when} من {list}", // note: {list} is device and app names (Apple Health, Health Connect)
  "Connected: {list}": "متصل: {list}",
  "{time} avg this week": "المتوسط هذا الأسبوع {time}",
  resting: "أثناء الراحة", // note: health wording; the heart-rate tile's context ("resting · 58 to 92")
  latest: "الأحدث", // note: health wording; the heart-rate tile's context when no resting value exists
  "{arrow} {n} kg since start": "{arrow} {n} كغ منذ البداية", // note: health wording (weight, hidden in recovery-sensitive mode)
  "{n} kg to goal": "{n} كغ حتى الهدف", // note: health wording (weight, hidden in recovery-sensitive mode)
  Sources: "المصادر",
  "Couldn't load your health data.": "تعذّر تحميل بياناتك الصحية.",
  "of {n} L goal": "من هدف {n} ل",
  "Tap + to log a drink": "اضغط + لتسجيل مشروب",
  "Water, {n} of {goal} litres today": "الماء، {n} من {goal} لتر اليوم",
  "of {n} steps": "من {n} خطوة",
  "Steps, no readings yet": "الخطوات، لا قراءات بعد",
  "Steps, {n} of {goal}": "الخطوات، {n} من {goal}",
  "Sleep, no readings yet": "النوم، لا قراءات بعد",
  "Sleep, {time}": "النوم، {time}",
  "Calories burned": "السعرات المحروقة",
  "of {n} kcal": "من {n} سعرة",
  "Calories burned, no readings yet": "السعرات المحروقة، لا قراءات بعد",
  "Calories burned, {n} of {goal} kilocalories": "السعرات المحروقة، {n} من {goal} سعرة حرارية",
  "Heart rate": "معدل القلب", // note: health wording; «معدل القلب» as the landing page writes it
  "Heart rate, no readings yet": "معدل القلب، لا قراءات بعد",
  "Heart rate, {n} beats per minute, resting": "معدل القلب، {n} نبضة في الدقيقة، أثناء الراحة", // note: health wording
  "Heart rate, {n} beats per minute, latest reading": "معدل القلب، {n} نبضة في الدقيقة، آخر قراءة", // note: health wording
  mmHg: "ملم زئبق", // note: health wording; the blood-pressure unit
  "Tap to add one": "اضغط لإضافة قراءة",
  "Blood pressure, {sys} over {dia}, {category}, at {time}": "ضغط الدم، {sys} على {dia}، {category}، الساعة {time}", // note: health wording; {category} is the guideline's category word (clinical copy, stays English)
  "Blood pressure, {sys} over {dia}, at {time}": "ضغط الدم، {sys} على {dia}، الساعة {time}", // note: health wording
  "Blood pressure, no readings yet": "ضغط الدم، لا قراءات بعد",
  "Weight trend": "اتجاه الوزن", // note: health wording (hidden in recovery-sensitive mode)
  "Log your weight to start tracking": "سجّل وزنك لتبدأ المتابعة",
  "Weight trend, no readings yet": "اتجاه الوزن، لا قراءات بعد",
  "Weight trend, {n} kilograms, {context}": "اتجاه الوزن، {n} كيلوغرام، {context}",
  "Weight trend, {n} kilograms": "اتجاه الوزن، {n} كيلوغرام",
  Pregnancy: "الحمل", // note: health wording
  "Only you can see your health data.": "أنت وحدك ترى بياناتك الصحية.",
  "Who can see your health data": "من يمكنه رؤية بياناتك الصحية",
  "Sources and guidelines": "المصادر والإرشادات", // note: the source titles and organisations stay as published (English)
  "Add metric": "إضافة قياس",
  "Couldn't load the sources. Please try again.": "تعذّر تحميل المصادر. يُرجى المحاولة مرة أخرى.",
  "{n}kg": "{n} كغ",

  // Metric tiles (also on Home)
  "No readings yet": "لا قراءات بعد",
  "Couldn't update": "تعذّر التحديث",
  "Tap to retry": "اضغط لإعادة المحاولة",
  "You're offline": "أنت غير متصل",
  "Shows when you reconnect": "يظهر عند عودة الاتصال",
  "Loading {label}": "جارٍ تحميل {label}",

  // Safety card and the very-high popup
  "See readings": "عرض القراءات", // note: health wording; the link under a blood-pressure safety card (the card's text is clinical copy and stays English)
  "Very high reading": "قراءة مرتفعة جدًا", // note: health wording; the popup's body is clinical copy and stays English
  "How to measure": "طريقة القياس", // note: health wording; the steps it opens are clinical copy and stay English
  "Measure again": "القياس مرة أخرى", // note: health wording
  "just now": "الآن",
  "left arm": "الذراع اليسرى",
  "right arm": "الذراع اليمنى",
  sitting: "جلوسًا",
  standing: "وقوفًا",
  lying: "استلقاءً",
  "{sys}/{dia} mmHg": "{sys}/{dia} ملم زئبق", // note: health wording

  // == Health · Add metric and the log sheets ==
  "Add Metric": "إضافة قياس",
  WATER: "الماء",
  "{n}L": "{n} ل",
  "of {n}L goal": "من هدف {n} ل",
  "Log water": "تسجيل الماء",
  "Add a drink to this day": "أضف مشروبًا إلى هذا اليوم",
  "WEIGHT TODAY": "الوزن اليوم",
  "WEIGHT FOR THIS DAY": "الوزن لهذا اليوم",
  "Log weight": "تسجيل الوزن",
  "ADD RECORDS": "إضافة سجلات",
  "Add records": "إضافة سجلات",
  "Add Photo / Upload File": "إضافة صورة / رفع ملف",
  "Lab results, reports, etc.": "نتائج التحاليل، التقارير، وغيرها",
  "BLOOD PRESSURE": "ضغط الدم",
  "{n} bpm": "{n} نبضة/دقيقة",
  "Add a reading": "إضافة قراءة",
  "Nothing recorded for this day": "لا شيء مسجّل لهذا اليوم",
  "You're offline. Entries save when you reconnect.": "أنت غير متصل. تُحفظ الإدخالات عند عودة الاتصال.",
  "Your entries are saved automatically.": "تُحفظ إدخالاتك تلقائيًا.",
  "Steps, sleep and calories burned would come from a connected device. Device sync isn't available yet.":
    "تأتي الخطوات والنوم والسعرات المحروقة من جهاز متصل. مزامنة الأجهزة غير متاحة بعد.",

  // Log blood pressure
  Left: "اليسرى", // note: which arm
  Right: "اليمنى", // note: which arm
  Sitting: "جلوس",
  Standing: "وقوف",
  Lying: "استلقاء",
  "Enter both numbers.": "أدخل الرقمين.",
  "You need to be signed in to save a reading.": "يجب أن تسجّل الدخول لحفظ قراءة.",
  "Edit reading": "تعديل القراءة",
  "Log blood pressure": "تسجيل ضغط الدم",
  "Save reading": "حفظ القراءة",
  Systolic: "الانقباضي", // note: health wording
  "Systolic, in mmHg": "الانقباضي، بوحدة ملم زئبق", // note: health wording
  Diastolic: "الانبساطي", // note: health wording
  "Diastolic, in mmHg": "الانبساطي، بوحدة ملم زئبق", // note: health wording
  "Pulse (optional)": "النبض (اختياري)", // note: health wording
  "Pulse, in beats per minute (optional)": "النبض، بعدد النبضات في الدقيقة (اختياري)", // note: health wording
  bpm: "نبضة/د",
  Arm: "الذراع",
  Position: "الوضعية",
  "When: {when}": "متى: {when}",
  "e.g. after a walk, felt dizzy": "مثلًا: بعد المشي، شعرت بدوار", // note: health wording; an example note
  "Delete this reading? It won't be recoverable.": "حذف هذه القراءة؟ لن يمكن استرجاعها.",
  "Delete this reading": "حذف هذه القراءة",

  // Log water and weight
  "Measured on": "تاريخ القياس",
  "{n} L": "{n} ل",
  "Save {n} ml": "حفظ {n} مل",
  "{day} so far {amount} of {goal}": "{day} حتى الآن {amount} من {goal}", // note: {day} is «اليوم» or a date; {amount} is drawn bold
  "Amount|quantity": "الكمية", // a quantity of water, not money
  "+ {n} ml": "+ {n} مل",
  "Amount in ml": "الكمية بالمليلتر",
  ml: "مل",
  "That's more than {n} L today. Check the amount.": "هذا أكثر من {n} ل اليوم. تحقق من الكمية.",
  "Replaces today's {n} kg": "يحل محل {n} كغ المسجّلة اليوم", // note: health wording (weight)
  "Replaces the {n} kg for {day}": "يحل محل {n} كغ المسجّلة في {day}", // note: health wording (weight)
  "Save {value}": "حفظ {value}",
  "Last weigh-in {weight} on {date}": "آخر وزن {weight} في {date}", // note: health wording (weight); {weight} is drawn bold
  Kilograms: "الكيلوغرامات",
  "Tenths of a kilogram": "أعشار الكيلوغرام",
  "e.g. after training": "مثلًا: بعد التمرين",

  // == Health · metric pages (shared kit) ==
  Day: "اليوم", // note: the Day / Week / Month / Year range tab
  Week: "الأسبوع",
  "This month": "هذا الشهر",
  "Previous period": "الفترة السابقة",
  "Next period": "الفترة التالية",
  "You're offline. Showing your last saved data.": "أنت غير متصل. نعرض آخر بيانات محفوظة لديك.",
  "Couldn't load your data.": "تعذّر تحميل بياناتك.",
  "No data yet": "لا بيانات بعد",
  "{what} come from Apple Health or Health Connect on your phone. Syncing from the Centium phone app is coming. Centium only reads the data types you allow.":
    "تأتي {what} من Apple Health أو Health Connect على هاتفك. المزامنة من تطبيق Centium على الهاتف قادمة. لا يقرأ Centium إلا أنواع البيانات التي تسمح بها.", // note: {what} is «الخطوات» / «بيانات النوم» / «السعرات المحروقة»
  "Couldn't sync.": "تعذّرت المزامنة.",
  "Last synced {when}": "آخر مزامنة {when}", // note: {when} is «اليوم الساعة …», «أمس الساعة …» or «في 5 تشرين الأول الساعة …»
  "yesterday at {time}": "أمس الساعة {time}",
  "on {date} at {time}": "يوم {date} الساعة {time}",
  "Go to date": "الانتقال إلى تاريخ",
  "Connect a source": "اربط مصدرًا",
  "Remove from Centium?": "إزالة من Centium؟",
  "It stays in {source}. Centium won't import it again.": "تبقى في {source}. لن يستوردها Centium مرة أخرى.", // note: health wording; a synced reading removed from Centium only
  "Delete this entry?|health": "حذف هذا الإدخال؟", // note: health wording; a logged reading (water, weight, blood pressure), not a journal entry
  "This removes it from your history and totals.": "يؤدي هذا إلى إزالته من سجلك ومن المجاميع.",
  "Saved on this device until you reconnect.": "حُفظ على هذا الجهاز إلى أن يعود الاتصال.", // note: the offline queue's toast (services/health-log/offlineQueue SAVED_ON_DEVICE), shown on the Water page
  Goal: "الهدف",
  "Goal {n}": "الهدف {n}",
  "Goal {n}.": "الهدف {n}.",
  "Goal reached": "بلغت الهدف",
  "{pct}% of goal": "{pct}% من الهدف",
  "Days ahead": "الأيام القادمة",
  "Months ahead": "الأشهر القادمة",
  "Daily goal": "الهدف اليومي",
  "Edit goal": "تعديل الهدف",
  Units: "الوحدات",
  "Day total": "مجموع اليوم",
  "Best day": "أفضل يوم",
  "Best day · {date}": "أفضل يوم · {date}",
  "Best month": "أفضل شهر",
  "Best month · {month}": "أفضل شهر · {month}",
  "Last week avg": "متوسط الأسبوع الماضي",
  "At goal in {month}": "بلوغ الهدف في {month}",
  "{month} so far": "{month} حتى الآن",
  "{n} of {span} days logged": "أيام مسجّلة: {n} من {span}",
  "{n} of {span}": "{n} من {span}",
  "Average a day": "المتوسط اليومي",
  "Average {n} a day.": "المتوسط {n} يوميًا.",
  "avg a day in {month}": "المتوسط اليومي في {month}",
  "avg a day in {year}": "المتوسط اليومي في {year}",
  "{n} days at goal": { zero: "0 أيام عند الهدف", one: "يوم واحد عند الهدف", two: "يومان عند الهدف", few: "{n} أيام عند الهدف", many: "{n} يومًا عند الهدف", other: "{n} يوم عند الهدف" },
  "{n} days ahead.": { zero: "0 أيام قادمة.", one: "يوم واحد قادم.", two: "يومان قادمان.", few: "{n} أيام قادمة.", many: "{n} يومًا قادمًا.", other: "{n} يوم قادم." },
  "Goal reached on {n} days.": {
    zero: "لم يُبلَغ الهدف في أي يوم.",
    one: "بُلغ الهدف في يوم واحد.",
    two: "بُلغ الهدف في يومين.",
    few: "بُلغ الهدف في {n} أيام.",
    many: "بُلغ الهدف في {n} يومًا.",
    other: "بُلغ الهدف في {n} يوم.",
  },
  "Best day {date}, {n}.": "أفضل يوم {date}، {n}.",
  "Nothing synced.": "لا شيء تمت مزامنته.",
  "Today by hour": "اليوم حسب الساعة",
  "{day} by hour": "{day} حسب الساعة",
  "{hour}, nothing synced": "{hour}، لا شيء تمت مزامنته",
  "{date}, nothing synced": "{date}، لا شيء تمت مزامنته",
  "Same as {what}": "نفس مستوى {what}", // note: {what} is «الاثنين الماضي», a month name or a year
  "{arrow} {pc}% vs {what}": "{arrow} {pc}% مقارنةً مع {what}",
  "last {day}": "{day} الماضي", // note: {day} is a weekday name (masculine «يوم»)

  // == Health · Steps ==
  "Step goal": "هدف الخطوات",
  "steps a day · today {n} ({pct}%)": "خطوة يوميًا · اليوم {n} ({pct}%)",
  "steps a day": "خطوة يوميًا",
  "Daily step goal": "هدف الخطوات اليومي",
  "Custom opens a wheel in steps of 500.": "يفتح «مخصّص» عجلة بزيادات 500 خطوة.",
  "Your week fills in once steps sync.": "يمتلئ أسبوعك عند مزامنة الخطوات.",
  "Your month fills in once steps sync.": "يمتلئ شهرك عند مزامنة الخطوات.",
  "Your year fills in once steps sync.": "تمتلئ سنتك عند مزامنة الخطوات.",
  "No steps yet. Your week fills in once steps sync.": "لا خطوات بعد. يمتلئ أسبوعك عند مزامنة الخطوات.",
  "No steps yet. Your month fills in once steps sync.": "لا خطوات بعد. يمتلئ شهرك عند مزامنة الخطوات.",
  "No steps yet. Your year fills in once steps sync.": "لا خطوات بعد. تمتلئ سنتك عند مزامنة الخطوات.",
  "Share your steps": "شارك خطواتك",
  "Nothing to share yet. Sync your steps first.": "لا شيء للمشاركة بعد. زامن خطواتك أولًا.",
  "Nothing to share yet. Reach your step goal first.": "لا شيء للمشاركة بعد. بلّغ هدف خطواتك أولًا.",
  "Step goal saved": "تم حفظ هدف الخطوات",
  "Set step goal": "تحديد هدف الخطوات",
  "avg {n} a day": "بمتوسط {n} يوميًا",
  "steps in {year}": "خطوة في {year}",
  "{n}M": "{n} مليون",
  "{n} km": "{n} كم",
  Distance: "المسافة",
  "Active time": "وقت النشاط",
  Floors: "الطوابق",
  "To go": "المتبقي",
  "Total steps": "مجموع الخطوات",
  "Days at goal": "أيام بلوغ الهدف",
  "Total in {year}": "المجموع في {year}",
  "Steps today.": "الخطوات اليوم.",
  "Steps on {day}.": "الخطوات في {day}.",
  "{n} steps.": "{n} خطوة.",
  "{n} steps": "{n} خطوة",
  "Hourly detail comes from your connected source.": "تأتي التفاصيل حسب الساعة من المصدر المتصل.",
  "No steps this week": "لا خطوات هذا الأسبوع",
  "No steps this month": "لا خطوات هذا الشهر",
  "No steps this year": "لا خطوات هذا العام",
  "{n} of 7 days logged · average {avg} a day": "أيام مسجّلة: {n} من 7 · المتوسط {avg} يوميًا",
  "{n} of {span} days logged · total {total}": "أيام مسجّلة: {n} من {span} · المجموع {total}",
  "Steps this week.": "الخطوات هذا الأسبوع.",
  "Steps in {period}.": "الخطوات في {period}.",
  "Steps in {month}.": "الخطوات في {month}.",
  "Steps in {year}.": "الخطوات في {year}.",
  "Steps a day": "الخطوات يوميًا",
  "{n} so far, average {avg} a day.": "{n} حتى الآن، بمتوسط {avg} يوميًا.",
  "{hour}, {n} steps": "{hour}، {n} خطوة",
  "{date}, {n} steps": "{date}، {n} خطوة",
  "No steps synced": "لم تتم مزامنة خطوات",
  "No steps synced yet": "لم تتم مزامنة خطوات بعد",

  // == Health · Sleep ==
  "Sleep data": "بيانات النوم", // note: the no-device card's subject ("Sleep data come from …")
  "Your week fills in once sleep sync.": "يمتلئ أسبوعك عند مزامنة بيانات النوم.",
  "Your month fills in once sleep sync.": "يمتلئ شهرك عند مزامنة بيانات النوم.",
  "Your year fills in once sleep sync.": "تمتلئ سنتك عند مزامنة بيانات النوم.",
  "No sleep yet. Your week fills in once sleep sync.": "لا بيانات نوم بعد. يمتلئ أسبوعك عند مزامنة بيانات النوم.",
  "No sleep yet. Your month fills in once sleep sync.": "لا بيانات نوم بعد. يمتلئ شهرك عند مزامنة بيانات النوم.",
  "No sleep yet. Your year fills in once sleep sync.": "لا بيانات نوم بعد. تمتلئ سنتك عند مزامنة بيانات النوم.",
  Bedtime: "وقت النوم",
  Wake: "الاستيقاظ",
  "Avg bedtime": "متوسط وقت النوم",
  "Avg wake": "متوسط الاستيقاظ",
  "Usual bedtime": "وقت النوم المعتاد",
  "Usual bedtime {time}": "وقت النوم المعتاد {time}",
  "{m}m": "{m} د",
  Deep: "عميق", // note: health wording; sleep stage
  REM: "REM", // note: health wording; sleep stage, kept Latin as the member branch and EH1 have it
  Awake: "يقظة", // note: health wording; sleep stage
  Stages: "المراحل", // note: health wording; sleep stages
  "Stages, {right}. {list}.": "المراحل، {right}. {list}.", // note: health wording
  "{stage} {time}, {pct}%": "{stage} {time}، {pct}%", // note: health wording
  "Share your sleep": "شارك نومك",
  "Nothing to share yet. Log or sync your sleep first.": "لا شيء للمشاركة بعد. سجّل نومك أو زامنه أولًا.",
  "Wind down": "الاسترخاء قبل النوم",
  "No sleep recorded last night": "لم يُسجَّل نوم الليلة الماضية", // note: health wording
  "No sleep recorded for {day}": "لم يُسجَّل نوم في {day}", // note: health wording
  "No sleep recorded this month": "لم يُسجَّل نوم هذا الشهر", // note: health wording
  "No sleep recorded this year": "لم يُسجَّل نوم هذا العام", // note: health wording
  "No sleep recorded yet": "لم يُسجَّل نوم بعد", // note: health wording
  "asleep · {time} in bed": "من النوم · {time} في السرير", // note: health wording; follows the hero's duration ("7 س 05 د")
  asleep: "من النوم", // note: health wording; follows a duration
  "avg asleep · {time} in bed": "متوسط النوم · {time} في السرير", // note: health wording
  "avg asleep": "متوسط النوم", // note: health wording
  "last night": "الليلة الماضية",
  "Last night": "الليلة الماضية",
  "avg a night": "المتوسط لكل ليلة",
  "Week avg · {n} nights": {
    zero: "متوسط الأسبوع · 0 ليالٍ",
    one: "متوسط الأسبوع · ليلة واحدة",
    two: "متوسط الأسبوع · ليلتان",
    few: "متوسط الأسبوع · {n} ليالٍ",
    many: "متوسط الأسبوع · {n} ليلةً",
    other: "متوسط الأسبوع · {n} ليلة",
  },
  "Sleep score": "درجة النوم", // note: health wording; the device's sleep score
  "Nights logged": "الليالي المسجّلة",
  "Nights logged in {year}": "الليالي المسجّلة في {year}",
  "Best night": "أفضل ليلة",
  "Best night · {date}": "أفضل ليلة · {date}",
  "Bedtime to wake": "من وقت النوم إلى الاستيقاظ",
  "Nights ahead": "الليالي القادمة",
  Asleep: "مدة النوم", // note: health wording; the chart legend for time asleep
  "Average asleep": "متوسط النوم", // note: health wording
  "Average bedtime (top scale {from} to {to})": "متوسط وقت النوم (المقياس العلوي من {from} إلى {to})",
  "No sleep logged this week": "لا نوم مسجّل هذا الأسبوع",
  "No sleep logged this month": "لا نوم مسجّل هذا الشهر",
  "No sleep logged this year": "لا نوم مسجّل هذا العام",
  "{n} of {span} nights logged": "ليالٍ مسجّلة: {n} من {span}",
  "Sleep this week.": "النوم هذا الأسبوع.",
  "Sleep in {period}.": "النوم في {period}.",
  "Sleep in {month}.": "النوم في {month}.",
  "Sleep in {year}.": "النوم في {year}.",
  "Nothing recorded.": "لا شيء مسجّل.",
  "{day}, {time} asleep, {range}": "{day}، {time} من النوم، {range}", // note: health wording
  "{day}, {time} asleep": "{day}، {time} من النوم", // note: health wording
  "Average {time} asleep.": "متوسط النوم {time}.", // note: health wording
  "Average {time} a night.": "المتوسط {time} لكل ليلة.", // note: health wording
  "Average bedtime {time}.": "متوسط وقت النوم {time}.",
  "{time} in bed": "{time} في السرير",
  "No stage detail": "لا تفاصيل للمراحل",
  "Stages and a sleep score come from a connected device.": "تأتي المراحل ودرجة النوم من جهاز متصل.", // note: health wording
  "{date}, nothing recorded": "{date}، لا شيء مسجّل",
  "{date}, {time} asleep": "{date}، {time} من النوم", // note: health wording

  // == Health · Water ==
  "Add {n} ml today": "إضافة {n} مل اليوم",
  "{n} ml": "{n} مل",
  "fl oz": "أونصة سائلة",
  L: "ل",
  "Add a drink": "إضافة مشروب",
  "Edit day total": "تعديل مجموع اليوم",
  "Day total in ml": "مجموع اليوم بالمليلتر",
  "Water goal": "هدف الماء",
  "L a day": "ل يوميًا",
  "Daily goal in litres": "الهدف اليومي باللتر",
  Litres: "اللتر",
  Millilitres: "المليلتر",
  "Fluid ounces": "الأونصة السائلة",
  "Water units": "وحدات الماء",
  "{n} ml added": "تمت إضافة {n} مل",
  "of {n} goal": "من هدف {n}",
  "{n} to go": "تبقّى {n}",
  "{pct}% today": "{pct}% اليوم",
  "avg a day this week": "المتوسط اليومي هذا الأسبوع",
  "avg a day in {period}": "المتوسط اليومي في {period}",
  "No days logged": "لا أيام مسجّلة",
  "{month} logged": "مسجّل: {month}",
  "{start} to {end} logged": "مسجّل: من {start} إلى {end}",
  "No water logged this week": "لا ماء مسجّل هذا الأسبوع",
  "No water logged this month": "لا ماء مسجّل هذا الشهر",
  "No water logged this year": "لا ماء مسجّل هذا العام",
  "{n} of {goal} so far": "{n} من {goal} حتى الآن",
  "{n} of {goal}": "{n} من {goal}",
  "last drink {time}": "آخر مشروب {time}",
  "Nothing logged yet today": "لم تسجّل شيئًا اليوم بعد",
  "Nothing logged this day": "لا شيء مسجّل في هذا اليوم",
  "Today's water.": "ماء اليوم.",
  "{day}'s water.": "الماء في {day}.",
  "{n} of {goal} litres.": "{n} من {goal} لتر.",
  "Intake so far": "الكمية حتى الآن",
  "Drink, ml": "مشروب، مل",
  "Water in {month}.": "الماء في {month}.",
  "Water in {year}.": "الماء في {year}.",
  "Water in {period}.": "الماء في {period}.",
  "Water this week.": "الماء هذا الأسبوع.",
  "Nothing logged.": "لا شيء مسجّل.",
  "Average {n} litres a day.": "المتوسط {n} لتر يوميًا.",
  "Goal reached on {n} of {span} days.": "بُلغ الهدف في {n} من {span} أيام.",
  "Best day {date}, {n} litres.": "أفضل يوم {date}، {n} لتر.",
  "At goal": "عند الهدف",
  "Dot fills with % of goal": "تمتلئ النقطة بنسبة الهدف",
  "{day} {n} litres": "{day} {n} لتر",
  Intake: "الكمية",
  "Last week at goal": "بلوغ الهدف الأسبوع الماضي",
  "Days at goal in {year}": "أيام بلوغ الهدف في {year}",
  "running total": "المجموع المتراكم",
  "day total": "مجموع اليوم",
  "Share your water": "شارك شرب الماء",
  "Nothing to share yet. Log your water first.": "لا شيء للمشاركة بعد. سجّل الماء أولًا.",
  "Nothing to share yet. Reach your water goal first.": "لا شيء للمشاركة بعد. بلّغ هدف الماء أولًا.",
  "Edit daily goal": "تعديل الهدف اليومي",
  litres: "لتر",
  "{date}, nothing logged": "{date}، لا شيء مسجّل",
  "{date}, {n}, {pct}% of goal": "{date}، {n}، {pct}% من الهدف",
  "No drinks yet today": "لا مشروبات اليوم بعد",
  "No drinks this day": "لا مشروبات في هذا اليوم",
  "Edit drink": "تعديل المشروب",
  "Drink in ml": "المشروب بالمليلتر",
  "Water goal saved": "تم حفظ هدف الماء",

  // == Health · Weight trend ==
  "Add your height in Profile to see your BMI": "أضف طولك في الملف الشخصي لترى مؤشر كتلة جسمك", // note: health wording
  Pounds: "الأرطال",
  "Weight units": "وحدات الوزن",
  underweight: "نقص الوزن", // note: health wording; WHO band (V6-06 wording), hidden in recovery-sensitive mode
  "normal weight": "وزن طبيعي", // note: health wording; WHO band (V6-06 "normal weight" kept)
  overweight: "زيادة الوزن", // note: health wording; WHO band
  obese: "سمنة", // note: health wording; WHO band
  "Set a goal": "تحديد هدف",
  BMI: "مؤشر كتلة الجسم", // note: health wording
  "Goal {weight}": "الهدف {weight}", // note: health wording (weight)
  "This day": "هذا اليوم",
  "Start {n}": "البداية {n}", // note: health wording (weight)
  "Weigh-in": "وزن مسجّل", // note: health wording; "weigh-in" «وزن مسجّل» throughout
  "Smoothed trend": "الاتجاه المُنعَّم", // note: health wording
  "Monthly average": "المتوسط الشهري",
  "{delta} {unit} since start": "{delta} {unit} منذ البداية", // note: health wording (weight)
  "{n} {unit} to goal": "{n} {unit} حتى الهدف", // note: health wording (weight)
  "{pct}% there": "أنجزت {pct}%", // note: health wording; progress towards the weight goal
  "Start · {date}": "البداية · {date}",
  "Start, {date}": "البداية، {date}",
  start: "البداية",
  "Last weigh-in": "آخر وزن مسجّل", // note: health wording
  "{unit} since yesterday": "{unit} منذ أمس", // note: health wording (weight change)
  "{unit} since {day}": "{unit} منذ {day}", // note: health wording (weight change)
  "{unit} change": "التغيّر بـ{unit}", // note: health wording (weight change)
  "Week avg {unit}": "متوسط الأسبوع ({unit})",
  "Lowest {unit}": "الأدنى ({unit})",
  "vs last week": "مقارنةً بالأسبوع الماضي",
  "Avg {unit}": "المتوسط ({unit})",
  "{unit} per week": "{unit} في الأسبوع", // note: health wording (weight change)
  "Avg {unit} since {month}": "المتوسط ({unit}) منذ {month}",
  "{unit} since start": "{unit} منذ البداية", // note: health wording (weight change)
  "No weigh-in today": "لا وزن مسجّل اليوم",
  "No weigh-in this day": "لا وزن مسجّل في هذا اليوم",
  "Your first weigh-in": "أول وزن تسجّله",
  "Compared with yesterday · {change}": "مقارنةً مع أمس · {change}", // note: health wording (weight change)
  "No weigh-in yesterday, so today compares with your last one · {change}": "لا وزن مسجّل أمس، لذا يُقارَن اليوم بآخر وزن سجّلته · {change}", // note: health wording
  "No weigh-in yesterday, so this day compares with your last one · {change}": "لا وزن مسجّل أمس، لذا يُقارَن هذا اليوم بآخر وزن سجّلته · {change}", // note: health wording
  "No weigh-ins this week": "لا أوزان مسجّلة هذا الأسبوع",
  "No weigh-ins this month": "لا أوزان مسجّلة هذا الشهر",
  "No weigh-ins this year": "لا أوزان مسجّلة هذا العام",
  "{n} weigh-ins this week · week average {avg}": {
    zero: "0 أوزان مسجّلة هذا الأسبوع · متوسط الأسبوع {avg}",
    one: "وزن مسجّل واحد هذا الأسبوع · متوسط الأسبوع {avg}",
    two: "وزنان مسجّلان هذا الأسبوع · متوسط الأسبوع {avg}",
    few: "{n} أوزان مسجّلة هذا الأسبوع · متوسط الأسبوع {avg}",
    many: "{n} وزنًا مسجّلًا هذا الأسبوع · متوسط الأسبوع {avg}",
    other: "{n} وزن مسجّل هذا الأسبوع · متوسط الأسبوع {avg}",
  }, // note: health wording (weight)
  "{n} weigh-ins · week average {avg}": {
    zero: "0 أوزان مسجّلة · متوسط الأسبوع {avg}",
    one: "وزن مسجّل واحد · متوسط الأسبوع {avg}",
    two: "وزنان مسجّلان · متوسط الأسبوع {avg}",
    few: "{n} أوزان مسجّلة · متوسط الأسبوع {avg}",
    many: "{n} وزنًا مسجّلًا · متوسط الأسبوع {avg}",
    other: "{n} وزن مسجّل · متوسط الأسبوع {avg}",
  }, // note: health wording (weight)
  "{n} weigh-ins in {month}": {
    zero: "0 أوزان مسجّلة في {month}",
    one: "وزن مسجّل واحد في {month}",
    two: "وزنان مسجّلان في {month}",
    few: "{n} أوزان مسجّلة في {month}",
    many: "{n} وزنًا مسجّلًا في {month}",
    other: "{n} وزن مسجّل في {month}",
  },
  "{n} weigh-ins · no change in {month}": {
    zero: "0 أوزان مسجّلة · لا تغيّر في {month}",
    one: "وزن مسجّل واحد · لا تغيّر في {month}",
    two: "وزنان مسجّلان · لا تغيّر في {month}",
    few: "{n} أوزان مسجّلة · لا تغيّر في {month}",
    many: "{n} وزنًا مسجّلًا · لا تغيّر في {month}",
    other: "{n} وزن مسجّل · لا تغيّر في {month}",
  }, // note: health wording (weight change)
  "{n} weigh-ins · down {amount} in {month}": {
    zero: "0 أوزان مسجّلة · انخفاض {amount} في {month}",
    one: "وزن مسجّل واحد · انخفاض {amount} في {month}",
    two: "وزنان مسجّلان · انخفاض {amount} في {month}",
    few: "{n} أوزان مسجّلة · انخفاض {amount} في {month}",
    many: "{n} وزنًا مسجّلًا · انخفاض {amount} في {month}",
    other: "{n} وزن مسجّل · انخفاض {amount} في {month}",
  }, // note: health wording (weight change)
  "{n} weigh-ins · up {amount} in {month}": {
    zero: "0 أوزان مسجّلة · ارتفاع {amount} في {month}",
    one: "وزن مسجّل واحد · ارتفاع {amount} في {month}",
    two: "وزنان مسجّلان · ارتفاع {amount} في {month}",
    few: "{n} أوزان مسجّلة · ارتفاع {amount} في {month}",
    many: "{n} وزنًا مسجّلًا · ارتفاع {amount} في {month}",
    other: "{n} وزن مسجّل · ارتفاع {amount} في {month}",
  }, // note: health wording (weight change)
  "Tracking since {month}": "المتابعة منذ {month}",
  "to {month}": "حتى {month}",
  kilograms: "كيلوغرام",
  pounds: "رطل",
  "Down {n}.": "انخفاض {n}.", // note: health wording (weight change, screen reader)
  "Up {n}.": "ارتفاع {n}.", // note: health wording (weight change, screen reader)
  "Weight {day}.": "الوزن {day}.",
  "No weigh-in.": "لا وزن مسجّل.",
  "Weight today {n} {unit}.": "الوزن اليوم {n} {unit}.", // note: health wording
  "Weight {day} {n} {unit}.": "الوزن {day} {n} {unit}.", // note: health wording
  "Last weigh-in {day}, {n}.": "آخر وزن مسجّل {day}، {n}.", // note: health wording
  "Weight {period}.": "الوزن {period}.",
  "No weigh-ins.": "لا أوزان مسجّلة.",
  "Weight this week.": "الوزن هذا الأسبوع.",
  "{n} weigh-ins, average {avg} {unit}.": {
    zero: "0 أوزان مسجّلة، المتوسط {avg} {unit}.",
    one: "وزن مسجّل واحد، المتوسط {avg} {unit}.",
    two: "وزنان مسجّلان، المتوسط {avg} {unit}.",
    few: "{n} أوزان مسجّلة، المتوسط {avg} {unit}.",
    many: "{n} وزنًا مسجّلًا، المتوسط {avg} {unit}.",
    other: "{n} وزن مسجّل، المتوسط {avg} {unit}.",
  }, // note: health wording
  "Weight in {period}.": "الوزن في {period}.",
  "{first} {unit} on {start} to {last} on {end}.": "من {first} {unit} في {start} إلى {last} في {end}.", // note: health wording
  "Weight numbers hidden": "أرقام الوزن مخفية", // note: health wording; recovery-sensitive mode
  "Weight numbers are hidden while recovery-sensitive mode is on.": "أرقام الوزن مخفية ما دام الوضع المراعي للتعافي مفعّلًا.", // note: health wording; recovery-sensitive mode
  "Change in Profile": "التغيير من الملف الشخصي",
  "Weight {weight}.": "الوزن {weight}.", // note: health wording
  "Weight, no readings yet": "الوزن، لا قراءات بعد",

  // == Health · Calories burned ==
  "Estimated, incl. workouts": "تقديري، يشمل التمارين", // note: health wording; "estimate" «تقدير»
  kcal: "سعرة",
  "{n} kcal": "{n} سعرة",
  "From workouts": "من التمارين",
  "{n} of {total} kcal": "{n} من {total} سعرة",
  "Rest of the day": "باقي اليوم",
  "Calorie numbers hidden": "أرقام السعرات مخفية", // note: health wording; recovery-sensitive mode
  "Calorie numbers are hidden while recovery-sensitive mode is on.": "أرقام السعرات مخفية ما دام الوضع المراعي للتعافي مفعّلًا.", // note: health wording; recovery-sensitive mode
  "Workouts {n}": "التمارين {n}",
  "Rest of day {n}": "باقي اليوم {n}",
  "Week avg · {n} days logged": {
    zero: "متوسط الأسبوع · 0 أيام مسجّلة",
    one: "متوسط الأسبوع · يوم واحد مسجّل",
    two: "متوسط الأسبوع · يومان مسجّلان",
    few: "متوسط الأسبوع · {n} أيام مسجّلة",
    many: "متوسط الأسبوع · {n} يومًا مسجّلًا",
    other: "متوسط الأسبوع · {n} يوم مسجّل",
  },
  "kcal in {year}": "سعرة في {year}",
  "No calories synced this week": "لم تتم مزامنة سعرات هذا الأسبوع",
  "No calories synced this month": "لم تتم مزامنة سعرات هذا الشهر",
  "No calories synced this year": "لم تتم مزامنة سعرات هذا العام",
  "No calories synced yet": "لم تتم مزامنة سعرات بعد",
  "Your week fills in once calories sync.": "يمتلئ أسبوعك عند مزامنة السعرات.",
  "Your month fills in once calories sync.": "يمتلئ شهرك عند مزامنة السعرات.",
  "Your year fills in once calories sync.": "تمتلئ سنتك عند مزامنة السعرات.",
  "No calories yet. Your week fills in once calories sync.": "لا سعرات بعد. يمتلئ أسبوعك عند مزامنة السعرات.",
  "No calories yet. Your month fills in once calories sync.": "لا سعرات بعد. يمتلئ شهرك عند مزامنة السعرات.",
  "No calories yet. Your year fills in once calories sync.": "لا سعرات بعد. تمتلئ سنتك عند مزامنة السعرات.",
  "Calories burned this week.": "السعرات المحروقة هذا الأسبوع.",
  "Calories burned in {period}.": "السعرات المحروقة في {period}.",
  "Calories burned in {month}.": "السعرات المحروقة في {month}.",
  "Calories burned in {year}.": "السعرات المحروقة في {year}.",
  "Calories burned by hour, {day}.": "السعرات المحروقة حسب الساعة، {day}.",
  "{day} {n} of {goal}": "{day} {n} من {goal}",
  Burned: "المحروقة", // note: the chart legend for calories burned
  "Burned a day": "المحروقة يوميًا",
  "workouts {n} sessions, {kcal} kcal": {
    zero: "التمارين: 0 جلسات، {kcal} سعرة",
    one: "التمارين: جلسة واحدة، {kcal} سعرة",
    two: "التمارين: جلستان، {kcal} سعرة",
    few: "التمارين: {n} جلسات، {kcal} سعرة",
    many: "التمارين: {n} جلسةً، {kcal} سعرة",
    other: "التمارين: {n} جلسة، {kcal} سعرة",
  },
  "{n} so far.": "{n} حتى الآن.",
  "{n} kcal {sub}": "{n} سعرة، {sub}",
  "{n} kcal of {goal}": "{n} سعرة من {goal}",
  "{hour}, {n} kcal": "{hour}، {n} سعرة",
  "{date}, {n} kcal": "{date}، {n} سعرة",

  // == Health · Heart rate ==
  "{n} low": "الأدنى {n}", // note: health wording; bpm, the day's lowest on the strip
  "{n} high": "الأعلى {n}", // note: health wording; bpm, the day's highest on the strip
  "Resting level": "مستوى الراحة", // note: health wording
  "Latest level": "آخر مستوى", // note: health wording
  "Daily range": "النطاق اليومي", // note: health wording
  "Week avg resting": "متوسط الراحة الأسبوعي", // note: health wording
  "Week average": "متوسط الأسبوع",
  "Avg resting": "متوسط الراحة", // note: health wording (resting heart rate)
  "Monthly range": "النطاق الشهري", // note: health wording
  "Month average": "متوسط الشهر",
  "Year average": "متوسط العام",
  Lowest: "الأدنى", // note: health wording
  "Alert settings": "إعدادات التنبيهات",
  Alerts: "التنبيهات",
  "High alert": "تنبيه الارتفاع", // note: health wording; the heart-rate alert threshold
  "Low alert": "تنبيه الانخفاض", // note: health wording; the heart-rate alert threshold
  "For at least": "لمدة لا تقل عن", // note: health wording
  "Low alert in bpm": "تنبيه الانخفاض بالنبضة/د", // note: health wording
  "High alert in bpm": "تنبيه الارتفاع بالنبضة/د", // note: health wording
  "Heart rate readings come from Apple Health or Health Connect on your phone. Syncing from the Centium phone app is coming. Centium only reads the data types you allow.":
    "تأتي قراءات معدل القلب من Apple Health أو Health Connect على هاتفك. المزامنة من تطبيق Centium على الهاتف قادمة. لا يقرأ Centium إلا أنواع البيانات التي تسمح بها.", // note: health wording
  "bpm latest": "نبضة/د، آخر قراءة", // note: health wording
  "bpm avg resting": "نبضة/د، متوسط الراحة", // note: health wording
  "bpm average": "نبضة/د، المتوسط", // note: health wording
  "Today {lo} to {hi} bpm": "اليوم من {lo} إلى {hi} نبضة/د", // note: health wording
  "Yesterday {lo} to {hi} bpm": "أمس من {lo} إلى {hi} نبضة/د", // note: health wording
  "{day} {lo} to {hi} bpm": "{day} من {lo} إلى {hi} نبضة/د", // note: health wording
  "1 reading today": "قراءة واحدة اليوم", // note: health wording
  "1 reading · yesterday": "قراءة واحدة · أمس", // note: health wording
  "1 reading · {day}": "قراءة واحدة · {day}", // note: health wording
  "{arrow} {n} bpm": "{arrow} {n} نبضة/د", // note: health wording
  "{arrow} {n} bpm vs {prev}": "{arrow} {n} نبضة/د مقارنةً مع {prev}", // note: health wording
  "Resting {n}": "الراحة {n}", // note: health wording
  "Latest {n}": "الأحدث {n}", // note: health wording
  "Avg resting {n}": "متوسط الراحة {n}", // note: health wording
  "Average {n}": "المتوسط {n}", // note: health wording
  "Week avg resting {n}": "متوسط الراحة الأسبوعي {n}", // note: health wording
  "Week average {n}": "متوسط الأسبوع {n}", // note: health wording
  "Year average {n}": "متوسط العام {n}", // note: health wording
  "{name} range {lo} to {hi} bpm": "نطاق {name} من {lo} إلى {hi} نبضة/د", // note: health wording
  "{n} bpm so far": "{n} نبضة/د حتى الآن", // note: health wording
  "No heart rate data this day": "لا بيانات لمعدل القلب في هذا اليوم",
  "No heart rate data this week": "لا بيانات لمعدل القلب هذا الأسبوع",
  "No heart rate data this month": "لا بيانات لمعدل القلب هذا الشهر",
  "No heart rate data this year": "لا بيانات لمعدل القلب هذا العام",
  "No heart rate data yet": "لا بيانات لمعدل القلب بعد",
  "Nothing synced this day": "لا شيء تمت مزامنته في هذا اليوم",
  "{n} days logged": { zero: "0 أيام مسجّلة", one: "يوم واحد مسجّل", two: "يومان مسجّلان", few: "{n} أيام مسجّلة", many: "{n} يومًا مسجّلًا", other: "{n} يوم مسجّل" },
  "This week so far · {days}": "هذا الأسبوع حتى الآن · {days}",
  "Heart rate today.": "معدل القلب اليوم.",
  "Heart rate {day}.": "معدل القلب {day}.",
  "Heart rate {period}.": "معدل القلب {period}.",
  "Heart rate this week.": "معدل القلب هذا الأسبوع.",
  "Heart rate in {period}.": "معدل القلب في {period}.",
  "Latest {n} bpm.": "آخر قراءة {n} نبضة/د.", // note: health wording
  "No readings.": "لا قراءات.",
  "{n} days, {lo} to {hi} bpm, average resting {avg}.": {
    zero: "0 أيام، من {lo} إلى {hi} نبضة/د، متوسط الراحة {avg}.",
    one: "يوم واحد، من {lo} إلى {hi} نبضة/د، متوسط الراحة {avg}.",
    two: "يومان، من {lo} إلى {hi} نبضة/د، متوسط الراحة {avg}.",
    few: "{n} أيام، من {lo} إلى {hi} نبضة/د، متوسط الراحة {avg}.",
    many: "{n} يومًا، من {lo} إلى {hi} نبضة/د، متوسط الراحة {avg}.",
    other: "{n} يوم، من {lo} إلى {hi} نبضة/د، متوسط الراحة {avg}.",
  }, // note: health wording
  "{n} days, {lo} to {hi} bpm, average {avg}.": {
    zero: "0 أيام، من {lo} إلى {hi} نبضة/د، المتوسط {avg}.",
    one: "يوم واحد، من {lo} إلى {hi} نبضة/د، المتوسط {avg}.",
    two: "يومان، من {lo} إلى {hi} نبضة/د، المتوسط {avg}.",
    few: "{n} أيام، من {lo} إلى {hi} نبضة/د، المتوسط {avg}.",
    many: "{n} يومًا، من {lo} إلى {hi} نبضة/د، المتوسط {avg}.",
    other: "{n} يوم، من {lo} إلى {hi} نبضة/د، المتوسط {avg}.",
  }, // note: health wording
  "Average resting {n} bpm.": "متوسط الراحة {n} نبضة/د.", // note: health wording
  "Average {n} bpm.": "المتوسط {n} نبضة/د.", // note: health wording
  "Range {lo} to {hi} bpm.": "النطاق من {lo} إلى {hi} نبضة/د.", // note: health wording
  "Heart rate this week. No readings yet.": "معدل القلب هذا الأسبوع. لا قراءات بعد.",
  "Your week fills in once heart rate syncs.": "يمتلئ أسبوعك عند مزامنة معدل القلب.",
  "Heart rate {n} {unit}.": "معدل القلب {n} {unit}.", // note: health wording; {unit} is «نبضة/د أثناء الراحة» etc.
  "Heart rate, no reading": "معدل القلب، لا قراءة",

  // == Health · Blood pressure ==
  "Avg {n}": "المتوسط {n}", // note: health wording; the month chart's average lines (mmHg)
  Averages: "المتوسطات",
  "Pregnancy 140 / 90": "الحمل ⁦140 / 90⁩", // note: health wording; the pregnancy reference line (V6-19), numbers isolated left to right
  "Reference 120 / 80": "المرجع ⁦120 / 80⁩", // note: health wording; the adult reference line, numbers isolated left to right
  "No reading yet": "لا قراءة بعد",
  Morning: "الصباح",
  Evening: "المساء",
  "{n} readings": { zero: "لا قراءات", one: "قراءة واحدة", two: "قراءتان", few: "{n} قراءات", many: "{n} قراءة", other: "{n} قراءة" }, // note: health wording
  "Reference ranges": "النطاقات المرجعية", // note: health wording; the category words and ranges under it are clinical copy (English)
  "{category} · latest": "{category} · الأحدث", // note: health wording; {category} is the guideline's category word (clinical copy, English)
  "Left arm": "الذراع اليسرى",
  "Right arm": "الذراع اليمنى",
  "{n} bpm pulse": "نبض {n} نبضة/د", // note: health wording
  "Avg pulse {n} bpm": "متوسط النبض {n} نبضة/د", // note: health wording
  "Last month {bp}": "الشهر الماضي {bp}", // note: health wording; {bp} is "124/79"
  "Last year {bp}": "العام الماضي {bp}", // note: health wording
  "Last week {bp}": "الأسبوع الماضي {bp}", // note: health wording
  "{n} readings this week": {
    zero: "0 قراءات هذا الأسبوع",
    one: "قراءة واحدة هذا الأسبوع",
    two: "قراءتان هذا الأسبوع",
    few: "{n} قراءات هذا الأسبوع",
    many: "{n} قراءةً هذا الأسبوع",
    other: "{n} قراءة هذا الأسبوع",
  }, // note: health wording
  "{n} readings today": { zero: "0 قراءات اليوم", one: "قراءة واحدة اليوم", two: "قراءتان اليوم", few: "{n} قراءات اليوم", many: "{n} قراءةً اليوم", other: "{n} قراءة اليوم" }, // note: health wording
  "No readings today": "لا قراءات اليوم",
  "No readings this day": "لا قراءات في هذا اليوم",
  "No readings this week": "لا قراءات هذا الأسبوع",
  "No readings this month": "لا قراءات هذا الشهر",
  "No readings this year": "لا قراءات هذا العام",
  "{count} · an evening reading makes the day comparable": "{count} · قراءة مسائية تجعل اليوم قابلًا للمقارنة", // note: health wording
  "{n} readings this week · average {avg}": {
    zero: "0 قراءات هذا الأسبوع · المتوسط {avg}",
    one: "قراءة واحدة هذا الأسبوع · المتوسط {avg}",
    two: "قراءتان هذا الأسبوع · المتوسط {avg}",
    few: "{n} قراءات هذا الأسبوع · المتوسط {avg}",
    many: "{n} قراءةً هذا الأسبوع · المتوسط {avg}",
    other: "{n} قراءة هذا الأسبوع · المتوسط {avg}",
  }, // note: health wording; {avg} is "120/80"
  "{n} readings · average {avg}": {
    zero: "0 قراءات · المتوسط {avg}",
    one: "قراءة واحدة · المتوسط {avg}",
    two: "قراءتان · المتوسط {avg}",
    few: "{n} قراءات · المتوسط {avg}",
    many: "{n} قراءةً · المتوسط {avg}",
    other: "{n} قراءة · المتوسط {avg}",
  }, // note: health wording
  "Blood pressure today.": "ضغط الدم اليوم.",
  "Blood pressure {day}.": "ضغط الدم {day}.",
  "Blood pressure this week.": "ضغط الدم هذا الأسبوع.",
  "Blood pressure in {period}.": "ضغط الدم في {period}.",
  "One reading, {sys} over {dia}, {day} at {time}.": "قراءة واحدة، {sys} على {dia}، {day} الساعة {time}.", // note: health wording
  "{n} readings.": { zero: "0 قراءات.", one: "قراءة واحدة.", two: "قراءتان.", few: "{n} قراءات.", many: "{n} قراءةً.", other: "{n} قراءة." }, // note: health wording
  "Average {sys} over {dia}.": "المتوسط {sys} على {dia}.", // note: health wording
  "Blood pressure {sys} over {dia} mmHg.": "ضغط الدم {sys} على {dia} ملم زئبق.", // note: health wording
  "Blood pressure, no readings": "ضغط الدم، لا قراءات",
  "Morning is before noon.": "الصباح هو ما قبل الظهر.", // note: health wording; how readings split into Morning / Evening

  // == Health · Records · shared pieces (kit) ==
  "{low} to {high}": "{low} إلى {high}", // note: health wording (a reference range, e.g. "30 to 100")
  "under {high}": "أقل من {high}", // note: health wording (a one-sided range)
  "above {low}": "أكثر من {low}", // note: health wording (a one-sided range)
  Below: "منخفض", // note: health wording (status word in the results table: below the range)
  "Below range": "تحت النطاق", // note: health wording
  Above: "مرتفع", // note: health wording (status word: above the range)
  "Above range": "فوق النطاق", // note: health wording

  // == Health · Records · page ==
  "Biomarkers & imaging": "المؤشرات الحيوية والتصوير الطبي", // note: health wording
  Biomarkers: "المؤشرات الحيوية", // note: health wording
  "Labs|health records": "التحاليل", // note: health wording; the tab of uploaded lab reports, «التحاليل» as the landing page writes "labs"
  "Imaging|health records": "التصوير الطبي", // note: health wording; the tab of imaging reports, paired with "Labs"
  History: "السجل", // note: health wording (the medical-history tab and a marker's result history)
  "Search markers": "البحث في المؤشرات", // note: health wording
  "Share all": "مشاركة الكل",
  "Add manually": "إضافة يدويًا",
  "Export all": "تصدير الكل",
  "Scan a report": "مسح تقرير", // note: health wording (camera scan of a lab report)
  "Upload a report": "رفع تقرير", // note: health wording
  "Add imaging": "إضافة تصوير طبي", // note: health wording
  "Add to history": "إضافة إلى السجل", // note: health wording
  "Add a report": "إضافة تقرير", // note: health wording
  "Read on your phone. The photo and its text never leave it.": "يُقرأ على هاتفك. لا تغادره الصورة ولا نصّها.", // note: health wording (privacy line of the on-device scan)
  "Couldn't share. Try again.": "تعذّرت المشاركة. حاول مرة أخرى.",
  "Shared with {name} since {date}": "مُشارَكة مع {name} منذ {date}", // note: health wording ({name} is the professional's line, e.g. "Dr Rami, GP")
  "PDF, {n} pages": { zero: "PDF، 0 صفحات", one: "PDF، صفحة واحدة", two: "PDF، صفحتان", few: "PDF، {n} صفحات", many: "PDF، {n} صفحة", other: "PDF، {n} صفحة" },
  "Delete this record?": "حذف هذا السجل؟", // note: health wording (an imaging record)
  "{name}, {date}. The attached file is removed too. This can't be undone.": "{name}، {date}. سيُحذف الملف المرفق أيضًا. لا يمكن التراجع عن ذلك.", // note: health wording
  "{name}, {date}. This can't be undone.": "{name}، {date}. لا يمكن التراجع عن ذلك.", // note: health wording
  "Record deleted.": "حُذف السجل.", // note: health wording
  "Lab report removed.": "أُزيل تقرير المختبر.", // note: health wording
  "Condition|health": "حالة صحية", // note: health wording; a health-history entry kind, not a status
  Surgery: "عملية جراحية", // note: health wording
  Medication: "دواء", // note: health wording
  Injury: "إصابة", // note: health wording
  "More options": "خيارات أكثر",
  Manage: "إدارة",

  // == Health · Records · Biomarkers tab ==
  "Couldn't load the results.": "تعذّر تحميل النتائج.", // note: health wording (a professional reading a client's results)
  "Couldn't load your results.": "تعذّر تحميل نتائجك.", // note: health wording
  "No lab results yet.": "لا توجد نتائج تحاليل بعد.", // note: health wording
  "Add a result, or scan a report, and its markers appear here.": "أضف نتيجة أو امسح تقريرًا، وستظهر مؤشراته هنا.", // note: health wording
  "Lab results aren't shared as a whole. Single results you share are listed in the banner above.": "نتائج التحاليل غير مُشارَكة كاملةً. النتائج المفردة التي تشاركها مذكورة في الشريط أعلاه.", // note: health wording
  "Not shared with professionals.": "غير مُشارَكة مع أي مختص.", // note: health wording
  "Shared with {name}.": "مُشارَكة مع {name}.", // note: health wording
  "Shared with {n} professionals.": { zero: "غير مُشارَكة مع أي مختص.", one: "مُشارَكة مع مختص واحد.", two: "مُشارَكة مع مختصَّين.", few: "مُشارَكة مع {n} مختصين.", many: "مُشارَكة مع {n} مختصًا.", other: "مُشارَكة مع {n} مختص." }, // note: health wording
  "Latest results from {date}": "أحدث النتائج من {date}", // note: health wording
  "{n} markers": { zero: "لا مؤشرات", one: "مؤشر واحد", two: "مؤشران", few: "{n} مؤشرات", many: "{n} مؤشرًا", other: "{n} مؤشر" }, // note: health wording
  "Reference ranges come from the lab report and can differ between labs.": "تأتي النطاقات المرجعية من تقرير المختبر، وقد تختلف بين مختبر وآخر.", // note: health wording ("can differ" kept as «قد تختلف»)
  "Reference ranges come from your lab report and can differ between labs.": "تأتي النطاقات المرجعية من تقرير مختبرك، وقد تختلف بين مختبر وآخر.", // note: health wording
  "No markers match '{query}'.": "لا توجد مؤشرات تطابق «{query}».", // note: health wording
  Marker: "المؤشر", // note: health wording (table column)
  "Range|reference range": "النطاق", // note: health wording (table column: the reference range; plain "Range" is a date range elsewhere)
  Result: "النتيجة", // note: health wording
  Status: "الحالة", // note: health wording (table column: in range / below / above)
  "{marker}, {value} {unit}, in range": "{marker}، {value} {unit}، ضمن النطاق", // note: health wording (screen-reader label)
  "{marker}, {value} {unit}, below range": "{marker}، {value} {unit}، أدنى من النطاق", // note: health wording (screen-reader label)
  "{marker}, {value} {unit}, above range": "{marker}، {value} {unit}، أعلى من النطاق", // note: health wording (screen-reader label)
  "{n} results added from {name}": { zero: "لم تُضَف أي نتيجة من {name}", one: "أُضيفت نتيجة واحدة من {name}", two: "أُضيفت نتيجتان من {name}", few: "أُضيفت {n} نتائج من {name}", many: "أُضيفت {n} نتيجة من {name}", other: "أُضيفت {n} نتيجة من {name}" }, // note: health wording ({name} is the report's name)

  // == Health · Records · Labs tab ==
  "Couldn't load the reports.": "تعذّر تحميل التقارير.", // note: health wording
  "Couldn't load your reports.": "تعذّر تحميل تقاريرك.", // note: health wording
  "No lab reports yet.": "لا توجد تقارير مختبر بعد.", // note: health wording
  "Upload a report and its results appear under Biomarkers.": "ارفع تقريرًا وستظهر نتائجه في «المؤشرات الحيوية».", // note: health wording
  "Changes saved.": "حُفظت التغييرات.",
  "Edit report": "تعديل التقرير", // note: health wording
  "Save changes": "حفظ التغييرات",
  "Report name": "اسم التقرير", // note: health wording
  "Give the report a name.": "أعطِ التقرير اسمًا.", // note: health wording
  "Date on the report": "التاريخ المدوَّن في التقرير", // note: health wording
  "PDF file": "ملف PDF",
  "Remove lab report?": "إزالة تقرير المختبر؟", // note: health wording
  "The report from {date} will be deleted, along with the results it recorded. Those readings will no longer appear in your biomarker history. This can't be undone.": "سيُحذف تقرير {date} مع النتائج المسجَّلة فيه، ولن تظهر تلك القراءات بعد الآن في سجل مؤشراتك الحيوية. لا يمكن التراجع عن ذلك.", // note: health wording
  "That lab report couldn't be removed.": "تعذّرت إزالة تقرير المختبر هذا.", // note: health wording

  // == Health · Records · Imaging tab ==
  "Couldn't load the imaging.": "تعذّر تحميل التصوير الطبي.", // note: health wording
  "Couldn't load your imaging.": "تعذّر تحميل تصويرك الطبي.", // note: health wording
  "No imaging yet.": "لا يوجد تصوير طبي بعد.", // note: health wording
  "Add a scan or test result to keep it with your records.": "أضف صورة طبية أو نتيجة فحص لتحفظها مع سجلاتك.", // note: health wording
  "Scan|imaging record": "صورة طبية", // note: health wording (the row has a file attached)
  Typed: "مُدخَلة يدويًا", // note: health wording (entered by hand, no file)
  "More options for {name}, {date}": "خيارات أخرى لـ{name}، {date}",
  "View file": "عرض الملف",
  "Your scans are now shared one at a time": "صورك الطبية تُشارَك الآن واحدةً واحدة", // note: health wording
  "Professionals you're connected with no longer see your imaging. They see a scan only after you share that file with them. Open a scan's menu and choose Share.": "لم يعد المختصون المرتبطون بك يرون تصويرك الطبي. لا يرون صورة طبية إلا بعد أن تشارك ذلك الملف معهم. افتح قائمة الصورة واختر «مشاركة».", // note: health wording
  "Got it": "حسنًا",
  MRI: "رنين مغناطيسي", // note: health wording (imaging type; the stored value stays "MRI")
  "X-ray": "أشعة سينية", // note: health wording (imaging type)
  Ultrasound: "موجات فوق صوتية", // note: health wording (imaging type)
  "CT scan": "تصوير مقطعي", // note: health wording (imaging type)
  ECG: "تخطيط القلب", // note: health wording (imaging type)
  "DEXA scan": "فحص DEXA", // note: health wording (imaging type, bone density)

  // == Health · Records · History tab ==
  Hypertension: "ارتفاع ضغط الدم", // note: health wording (condition chip; the stored value stays English)
  Asthma: "الربو", // note: health wording (condition chip)
  "Thyroid condition": "حالة في الغدة الدرقية", // note: health wording (condition chip)
  "Heart condition": "حالة قلبية", // note: health wording (condition chip)
  PCOS: "متلازمة تكيّس المبايض", // note: health wording (condition chip)
  "Anxiety/Depression": "القلق/الاكتئاب", // note: health wording (condition chip)
  Arthritis: "التهاب المفاصل", // note: health wording (condition chip)
  Oral: "عن طريق الفم", // note: health wording (medication route)
  Injectable: "حقن", // note: health wording (medication route)
  Topical: "موضعي", // note: health wording (medication route)
  Inhaled: "استنشاق", // note: health wording (medication route)
  "Couldn't load the history.": "تعذّر تحميل السجل.", // note: health wording
  Conditions: "الحالات الصحية", // note: health wording
  "No conditions recorded.": "لا توجد حالات صحية مسجَّلة.", // note: health wording
  "Past surgeries": "العمليات الجراحية السابقة", // note: health wording
  "No surgeries recorded.": "لا توجد عمليات جراحية مسجَّلة.", // note: health wording
  Medications: "الأدوية", // note: health wording
  "No medications recorded.": "لا توجد أدوية مسجَّلة.", // note: health wording
  "Couldn't load your history.": "تعذّر تحميل سجلك.", // note: health wording
  "Add another": "إضافة غيرها", // note: health wording (another condition)
  "Tap any that apply.": "اضغط على كل ما ينطبق عليك.", // note: health wording
  "No surgeries added.": "لم تُضَف أي عملية جراحية.", // note: health wording
  "No medications added.": "لم يُضَف أي دواء.", // note: health wording
  "reminder on": "التذكير مُفعَّل", // note: health wording (medication reminder)
  "reminder off": "التذكير متوقف", // note: health wording (medication reminder)
  "Reminder for {name}": "تذكير لـ{name}", // note: health wording ({name} is the medication)
  "Add a condition": "إضافة حالة صحية", // note: health wording
  "Condition name": "اسم الحالة الصحية", // note: health wording
  Add: "إضافة",
  "Condition added.": "أُضيفت الحالة الصحية.", // note: health wording
  "Surgery added.": "أُضيفت العملية الجراحية.", // note: health wording
  "Edit surgery": "تعديل العملية الجراحية", // note: health wording
  "Add surgery": "إضافة عملية جراحية", // note: health wording
  Procedure: "الإجراء", // note: health wording (the surgery's name)
  "e.g. ACL reconstruction": "مثل: إعادة بناء الرباط الصليبي الأمامي", // note: health wording
  "How exact is the date?": "ما مدى دقة التاريخ؟",
  "Exact day": "اليوم بالضبط",
  "Month only": "الشهر فقط",
  "Year only": "السنة فقط",
  "Required. If you're not sure of the exact day, your best estimate is fine.": "مطلوب. إن لم تكن متأكدًا من اليوم بالضبط، فأفضل تقدير لديك يكفي.", // note: health wording (a surgery or imaging date)
  "Remove time {n}": "إزالة الموعد {n}", // note: health wording (a dose time)
  "Medication added.": "أُضيف الدواء.", // note: health wording
  "Edit medication": "تعديل الدواء", // note: health wording
  "Add medication": "إضافة دواء", // note: health wording
  "e.g. Vitamin D3": "مثل: فيتامين D3", // note: health wording
  Dose: "الجرعة", // note: health wording
  "e.g. 2000 IU": "مثل: 2000 وحدة دولية", // note: health wording
  Route: "طريقة الأخذ", // note: health wording (how the medication is taken)
  Times: "المواعيد", // note: health wording (dose times)
  "Add another time": "إضافة موعد آخر", // note: health wording
  "Remind me to take this": "ذكّرني بأخذه", // note: health wording (medication reminder)

  // == Health · Records · Injuries ==
  Injuries: "الإصابات", // note: health wording
  "Couldn't load your injuries.": "تعذّر تحميل إصاباتك.", // note: health wording
  "No injuries added.": "لم تُضَف أي إصابة.", // note: health wording
  "{name}, healed": "{name}، شُفيت", // note: health wording
  "Still current": "لا تزال قائمة", // note: health wording (an injury marked current again)
  "Mark as healed": "تحديد كمشفاة", // note: health wording
  "Injury added.": "أُضيفت الإصابة.", // note: health wording
  "Edit injury": "تعديل الإصابة", // note: health wording
  "Add injury": "إضافة إصابة", // note: health wording
  "What happened": "ما الذي حدث", // note: health wording
  "e.g. Torn meniscus": "مثل: تمزّق الغضروف الهلالي", // note: health wording
  "Body area (optional)": "منطقة الجسم (اختياري)", // note: health wording
  "e.g. Left knee": "مثل: الركبة اليسرى", // note: health wording
  "Since (optional)": "منذ (اختياري)", // note: health wording

  // == Health · Records · a marker's page ==
  "6M": "6 أشهر",
  "1Y": "سنة",
  "Marker deleted.": "حُذف المؤشر.", // note: health wording
  "Result deleted.": "حُذفت النتيجة.", // note: health wording
  "Share with a professional": "مشاركة مع مختص", // note: health wording
  "Delete marker": "حذف المؤشر", // note: health wording
  Latest: "الأحدث", // note: health wording (the latest result)
  "Reference range {range} {unit}": "النطاق المرجعي {range} {unit}", // note: health wording
  "All results": "كل النتائج", // note: health wording
  "Period|time span": "المدة", // note: the chart's 6M / 1Y / All tabs ("Period" alone is the menstrual period)
  "No results in the last 6 months.": "لا توجد نتائج في آخر 6 أشهر.", // note: health wording
  "No results in the last year.": "لا توجد نتائج في السنة الأخيرة.", // note: health wording
  "{marker}, {n} results": { zero: "{marker}، لا نتائج", one: "{marker}، نتيجة واحدة", two: "{marker}، نتيجتان", few: "{marker}، {n} نتائج", many: "{marker}، {n} نتيجة", other: "{marker}، {n} نتيجة" }, // note: health wording (chart's screen-reader label)
  "Reference range": "النطاق المرجعي", // note: health wording
  "tap a point for details": "اضغط على نقطة لعرض التفاصيل",
  "{n} results since {year}": { zero: "لا نتائج منذ {year}", one: "نتيجة واحدة منذ {year}", two: "نتيجتان منذ {year}", few: "{n} نتائج منذ {year}", many: "{n} نتيجة منذ {year}", other: "{n} نتيجة منذ {year}" }, // note: health wording
  Average: "المتوسط", // note: health wording
  Highest: "الأعلى", // note: health wording
  "Change vs last": "التغيّر عن السابقة", // note: health wording (change from the previous result)
  "Add result": "إضافة نتيجة", // note: health wording
  "Delete {name}?": "حذف {name}؟", // note: health wording ({name} is the marker, English)
  "Delete this result?": "حذف هذه النتيجة؟", // note: health wording
  "All {n} results for {marker} are removed from every report. This can't be undone.": {
    zero: "ستُحذف كل نتائج {marker} من كل التقارير. لا يمكن التراجع عن ذلك.",
    one: "ستُحذف نتيجة {marker} من كل التقارير. لا يمكن التراجع عن ذلك.",
    two: "ستُحذف نتيجتا {marker} من كل التقارير. لا يمكن التراجع عن ذلك.",
    few: "ستُحذف كل نتائج {marker} ({n}) من كل التقارير. لا يمكن التراجع عن ذلك.",
    many: "ستُحذف كل نتائج {marker} ({n}) من كل التقارير. لا يمكن التراجع عن ذلك.",
    other: "ستُحذف كل نتائج {marker} ({n}) من كل التقارير. لا يمكن التراجع عن ذلك.",
  }, // note: health wording
  "{value} {unit} from {date}. This can't be undone.": "{value} {unit} بتاريخ {date}. لا يمكن التراجع عن ذلك.", // note: health wording

  // == Health · Records · marker picker and the result form ==
  "Blood count": "تعداد الدم", // note: health wording (a category of the standard list; the markers in it stay English)
  Lipids: "الدهون", // note: health wording (category)
  Liver: "الكبد", // note: health wording (category)
  Kidney: "الكلى", // note: health wording (category)
  Hormones: "الهرمونات", // note: health wording (category)
  Metabolic: "الأيض", // note: health wording (category)
  "Choose a marker": "اختيار مؤشر", // note: health wording
  "Search markers, e.g. HbA1c": "ابحث في المؤشرات، مثل HbA1c", // note: health wording
  'Other: "{query}"': "غير ذلك: «{query}»", // note: health wording (a marker not on the list)
  "Other (not on the list)": "غير ذلك (ليس في القائمة)", // note: health wording
  "Result added.": "أُضيفت النتيجة.", // note: health wording
  "Edit result": "تعديل النتيجة", // note: health wording
  "Add a result": "إضافة نتيجة", // note: health wording
  "Save result": "حفظ النتيجة", // note: health wording
  "Marker name, as on your report": "اسم المؤشر كما في تقريرك", // note: health wording
  "Marker name": "اسم المؤشر", // note: health wording
  Value: "القيمة", // note: health wording
  Unit: "الوحدة", // note: health wording
  "Cycle phase when the sample was taken": "مرحلة الدورة عند أخذ العيّنة", // note: health wording
  "Cycle phase": "مرحلة الدورة", // note: health wording
  "Choose a phase": "اختيار مرحلة", // note: health wording
  "Mid-cycle": "منتصف الدورة", // note: health wording (lab phase; "Follicular" and "Luteal" already in another catalogue)
  Postmenopausal: "بعد انقطاع الطمث", // note: health wording (lab phase)
  "The normal range depends on the phase.": "يعتمد النطاق الطبيعي على المرحلة.", // note: health wording
  Low: "الحد الأدنى", // note: health wording (the range's lower limit field)
  "Range low": "الحد الأدنى للنطاق", // note: health wording
  "to|range": "إلى", // note: between the range's two limits
  "Range high": "الحد الأعلى للنطاق", // note: health wording
  "Use the range printed on your report. Pre-filled from Centium's standard list.": "استخدم النطاق المطبوع في تقريرك. مُعبّأ مسبقًا من قائمة Centium المعيارية.", // note: health wording (the printed range wins)
  "Enter the range printed on your report.": "أدخل النطاق المطبوع في تقريرك.", // note: health wording
  "If it gives only one limit, leave the other empty.": "إن ذكر حدًّا واحدًا فقط، فاترك الآخر فارغًا.", // note: health wording
  "The standard list has no range for this marker.": "لا تتضمن القائمة المعيارية نطاقًا لهذا المؤشر.", // note: health wording
  "The low end is higher than the high end.": "الحد الأدنى أعلى من الحد الأعلى.", // note: health wording

  // == Health · Records · upload choice ==
  "That type isn't supported. Use PDF, JPG or PNG.": "هذا النوع غير مدعوم. استخدم PDF أو JPG أو PNG.",
  "That file is too big. The limit is {mb} MB.": "هذا الملف كبير جدًا. الحد الأقصى {mb} ميغابايت.",
  "Use your camera": "باستخدام الكاميرا",
  "PDF, JPG or PNG": "PDF أو JPG أو PNG",
  "Type it in": "إدخال يدوي", // note: health wording (type the results in, no file)
  "No file, just the details": "بلا ملف، التفاصيل فقط",
  "Files up to {mb} MB.": "ملفات حتى {mb} ميغابايت.",

  // == Health · Records · files shared with one professional ==
  "Shared files": "الملفات المُشارَكة", // note: health wording
  "No files shared with {name}.": "لا ملفات مُشارَكة مع {name}.", // note: health wording
  "Stop sharing": "إيقاف المشاركة",
  "Stop sharing this file?": "إيقاف مشاركة هذا الملف؟", // note: health wording
  "{name} can no longer open {file}, {date}. Copies they already saved stay with them.": "لن يتمكن {name} بعد الآن من فتح {file}، {date}. تبقى لديه النسخ التي حفظها من قبل.", // note: health wording
  "Stopped sharing with {name}.": "أُوقفت المشاركة مع {name}.", // note: health wording

  // == Health · Records · a marker's popup ==
  "Last 3 results": "آخر 3 نتائج", // note: health wording
  "Last result": "آخر نتيجة", // note: health wording
  "View full history": "عرض السجل كاملًا", // note: health wording
  "Reference {low} to {high}": "المرجعي {low} إلى {high}", // note: health wording (the chart's band label)
  "Reference under {high}": "المرجعي أقل من {high}", // note: health wording
  "Reference above {low}": "المرجعي أكثر من {low}", // note: health wording

  // == Health · Records · file viewer ==
  "The record is still here. Only the attached file couldn't be loaded.": "السجل لا يزال موجودًا. تعذّر تحميل الملف المرفق فقط.", // note: health wording
  "The record is still here. Only the attached file couldn’t be loaded.": "السجل لا يزال موجودًا. تعذّر تحميل الملف المرفق فقط.", // note: health wording (same sentence with a curly apostrophe)
  "That file couldn't be loaded.": "تعذّر تحميل هذا الملف.",
  "This file can't be previewed here.": "لا يمكن معاينة هذا الملف هنا.",
  "Only images and PDFs can be shown here. The file itself is stored and unchanged.": "يمكن عرض الصور وملفات PDF فقط هنا. الملف نفسه محفوظ ولم يتغيّر.",
  "Couldn't open this file. Try again": "تعذّر فتح هذا الملف. حاول مرة أخرى",
  Opening: "جارٍ الفتح",
  "Pinch to zoom": "باعد بإصبعين للتكبير",

  // == Health · Scan or upload a report ==
  "Couldn't read the value. Type it from your report.": "تعذّرت قراءة القيمة. اكتبها من تقريرك.", // note: health wording
  "The unit printed ({unit}) isn't one Centium uses for {marker}. Choose the unit.": "الوحدة المطبوعة ({unit}) ليست من الوحدات التي يستخدمها Centium لـ{marker}. اختر الوحدة.", // note: health wording
  "Couldn't read the unit. Choose it from your report.": "تعذّرت قراءة الوحدة. اخترها من تقريرك.", // note: health wording
  "Check this value against your report: it's far outside the range printed beside it (“{line}”).": "تحقّق من هذه القيمة في تقريرك: إنها بعيدة جدًا عن النطاق المطبوع بجانبها («{line}»).", // note: health wording (a possible misread, not a judgement of the result)
  "Check the range against your report: it may have been misread (“{line}”).": "تحقّق من النطاق في تقريرك: قد يكون قُرئ خطأً («{line}»).", // note: health wording ("may" kept as «قد»)
  "Read from your report: “{line}”": "قُرئ من تقريرك: «{line}»", // note: health wording
  "Upload didn't finish. Try again": "لم يكتمل الرفع. حاول مرة أخرى",
  "Your lab report": "تقرير مختبرك", // note: health wording (image description)
  "Reading your report": "جارٍ قراءة تقريرك", // note: health wording
  "Keep the app open. The first scan takes a little longer.": "أبقِ التطبيق مفتوحًا. يستغرق المسح الأول وقتًا أطول قليلًا.",
  "Uploading your report": "جارٍ رفع تقريرك", // note: health wording
  "Keep the app open. This takes a few seconds.": "أبقِ التطبيق مفتوحًا. يستغرق ذلك بضع ثوانٍ.",
  "Upload complete": "اكتمل الرفع",
  "Report uploaded": "رُفع التقرير", // note: health wording
  "Opening Enter results": "جارٍ فتح «إدخال النتائج»", // note: health wording
  "Check results": "التحقق من النتائج", // note: health wording
  "Enter results": "إدخال النتائج", // note: health wording
  "This report couldn't be read. Type the results in below.": "تعذّرت قراءة هذا التقرير. اكتب النتائج أدناه.", // note: health wording
  "No results could be read. Type them in below.": "لم تُقرأ أي نتائج. اكتبها أدناه.", // note: health wording
  "Found {n} results. Check each one against your report.": {
    zero: "لم يُعثر على نتائج. تحقّق من تقريرك.",
    one: "عُثر على نتيجة واحدة. تحقّق منها في تقريرك.",
    two: "عُثر على نتيجتين. تحقّق من كلٍّ منهما في تقريرك.",
    few: "عُثر على {n} نتائج. تحقّق من كل واحدة منها في تقريرك.",
    many: "عُثر على {n} نتيجة. تحقّق من كل واحدة منها في تقريرك.",
    other: "عُثر على {n} نتيجة. تحقّق من كل واحدة منها في تقريرك.",
  }, // note: health wording
  "Edit anything that was misread, remove what you don't want, and add anything missing.": "عدّل ما قُرئ خطأً، واحذف ما لا تريده، وأضف ما ينقص.", // note: health wording
  "Report file": "ملف التقرير", // note: health wording
  "Report photo": "صورة التقرير", // note: health wording
  "Tap to view full size": "اضغط للعرض بالحجم الكامل",
  "Read from your report. Check it.": "قُرئ من تقريرك. تحقّق منه.", // note: health wording (the report date)
  "No date could be read. Choose the date on your report.": "تعذّرت قراءة التاريخ. اختر التاريخ المدوَّن في تقريرك.", // note: health wording
  Results: "النتائج", // note: health wording
  "Not matched": "غير مطابَقة", // note: health wording
  "These lines look like results but aren't on Centium's list. Add any you need with Add marker.": "تبدو هذه الأسطر نتائج لكنها ليست في قائمة Centium. أضف ما تحتاج إليه عبر «إضافة مؤشر».", // note: health wording
  "Untick a result to leave it out. Tap a marker name to change it.": "ألغِ تحديد نتيجة لاستبعادها. اضغط على اسم مؤشر لتغييره.", // note: health wording
  "Add marker": "إضافة مؤشر", // note: health wording
  "Save {n} results": { zero: "حفظ النتائج", one: "حفظ نتيجة واحدة", two: "حفظ نتيجتين", few: "حفظ {n} نتائج", many: "حفظ {n} نتيجة", other: "حفظ {n} نتيجة" }, // note: health wording
  "Discard this report?": "تجاهل هذا التقرير؟", // note: health wording
  "The results read from your report are not saved.": "لن تُحفظ النتائج المقروءة من تقريرك.", // note: health wording
  "The photo and the results you typed are not saved.": "لن تُحفظ الصورة ولا النتائج التي كتبتها.", // note: health wording
  "Keep editing": "متابعة التعديل",
  Discard: "تجاهل",
  "Include result {n}, {name}": "تضمين النتيجة {n}، {name}", // note: health wording (screen-reader label)
  "Include result {n}": "تضمين النتيجة {n}", // note: health wording
  "Marker {n}: {name}": "المؤشر {n}: {name}", // note: health wording
  "Marker {n} value": "قيمة المؤشر {n}", // note: health wording
  "Marker {n} unit, {unit}": "وحدة المؤشر {n}، {unit}", // note: health wording
  "Marker {n} unit": "وحدة المؤشر {n}", // note: health wording
  unit: "الوحدة", // note: health wording (empty unit placeholder)
  "Marker {n} reference range, {range}": "النطاق المرجعي للمؤشر {n}، {range}", // note: health wording
  "Remove result {n}, {name}": "إزالة النتيجة {n}، {name}", // note: health wording
  "Remove result {n}": "إزالة النتيجة {n}", // note: health wording
  "Marker {n} name": "اسم المؤشر {n}", // note: health wording
  "Marker {n} cycle phase": "مرحلة الدورة للمؤشر {n}", // note: health wording
  "Suggested from your cycle tracker. The normal range depends on the phase.": "مقترحة من متتبّع دورتك. يعتمد النطاق الطبيعي على المرحلة.", // note: health wording
  "Marker {n} range low": "الحد الأدنى لنطاق المؤشر {n}", // note: health wording
  "Marker {n} range high": "الحد الأعلى لنطاق المؤشر {n}", // note: health wording
  "Result {n}, {name}": "النتيجة {n}، {name}", // note: health wording
  "Result {n}": "النتيجة {n}", // note: health wording

  // == Health · Imaging form ==
  "Imaging added.": "أُضيف التصوير الطبي.", // note: health wording
  "Edit imaging": "تعديل التصوير الطبي", // note: health wording
  Type: "النوع", // note: health wording (imaging type)
  Note: "ملاحظة",
  "e.g. Right knee, follow-up in 6 weeks": "مثل: الركبة اليمنى، متابعة بعد 6 أسابيع", // note: health wording
  "No file": "لا يوجد ملف",
  "{n} pages": { zero: "0 صفحات", one: "صفحة واحدة", two: "صفحتان", few: "{n} صفحات", many: "{n} صفحة", other: "{n} صفحة" },

  // == Health · Sharing (biomarker card, imaging file, one result) ==
  "Share Result": "مشاركة النتيجة", // note: health wording
  "Save Image": "حفظ الصورة",
  "Health record · Centium": "سجل صحي · Centium", // note: health wording (the system share sheet's title; neutral on purpose)
  "Shared with {name}": "مُشارَكة مع {name}", // note: health wording
  "Shared with {n} professionals": { zero: "غير مُشارَكة مع أي مختص", one: "مُشارَكة مع مختص واحد", two: "مُشارَكة مع مختصَّين", few: "مُشارَكة مع {n} مختصين", many: "مُشارَكة مع {n} مختصًا", other: "مُشارَكة مع {n} مختص" }, // note: health wording
  "Share {name}": "مشاركة {name}", // note: health wording ({name} is the imaging type)
  "Share with {n} professionals": { zero: "مشاركة", one: "مشاركة مع مختص واحد", two: "مشاركة مع مختصَّين", few: "مشاركة مع {n} مختصين", many: "مشاركة مع {n} مختصًا", other: "مشاركة مع {n} مختص" }, // note: health wording
  "Shared with": "مُشارَكة مع", // note: health wording (section heading)
  "Shared {date}": "شُورِكت في {date}", // note: health wording
  "No professionals connected yet.": "لا يوجد مختصون مرتبطون بعد.",
  "Everyone you're connected with has this file.": "كل من ترتبط بهم لديهم هذا الملف.", // note: health wording
  "Export file": "تصدير الملف",
  "Download the file to this device": "تنزيل الملف على هذا الجهاز",
  "No file to export": "لا يوجد ملف لتصديره",
  "Only the file you choose is shared.": "لا يُشارَك إلا الملف الذي تختاره.", // note: health wording
  "{n} results, {date}": { zero: "لا نتائج، {date}", one: "نتيجة واحدة، {date}", two: "نتيجتان، {date}", few: "{n} نتائج، {date}", many: "{n} نتيجة، {date}", other: "{n} نتيجة، {date}" }, // note: health wording
  "Stopped sharing with them.": "أُوقفت المشاركة معه.", // note: health wording (the professional's name is unknown)
  "They|a professional": "المختص", // note: health wording (subject of "… can no longer see …" when the name is unknown)
  "This result only": "هذه النتيجة فقط", // note: health wording
  "All results from this test": "كل نتائج هذا الفحص", // note: health wording
  "With {name} · shared {date}": "مع {name} · شُورِكت في {date}", // note: health wording
  "With a professional · shared {date}": "مع مختص · شُورِكت في {date}", // note: health wording
  Stop: "إيقاف",
  "Already shared with {name}.": "مُشارَكة مسبقًا مع {name}.", // note: health wording
  "Your other results stay private. You can stop sharing any time.": "تبقى نتائجك الأخرى خاصة. يمكنك إيقاف المشاركة في أي وقت.", // note: health wording
  "With {name} · this result only": "مع {name} · هذه النتيجة فقط", // note: health wording
  "With {name} · all results from this test": "مع {name} · كل نتائج هذا الفحص", // note: health wording
  "Note (optional)": "ملاحظة (اختياري)",
  "Can we talk about this at my next visit?": "هل يمكننا مناقشة هذا في زيارتي القادمة؟", // note: health wording (example note to a professional, in the member's voice)
  "{name} sees it straight away and gets a notification.": "سيراها {name} فورًا ويصله إشعار.", // note: health wording
  "Share with…": "مشاركة مع…",
  "Confirm sharing": "تأكيد المشاركة",
  "Share result": "مشاركة النتيجة", // note: health wording
  "Stop sharing this result?": "إيقاف مشاركة هذه النتيجة؟", // note: health wording
  "{name} can no longer see {result}.": "لن يتمكن {name} بعد الآن من رؤية {result}.", // note: health wording
  "{name} can no longer see the results from this test.": "لن يتمكن {name} بعد الآن من رؤية نتائج هذا الفحص.", // note: health wording

  // == Health · Care plan ==
  "Your care plan": "خطة رعايتك", // note: health wording
  "From {name} · reviewed {date}": "من {name} · رُوجعت في {date}", // note: health wording
  "Loading your care plan": "جارٍ تحميل خطة رعايتك", // note: health wording
  "No care plan yet": "لا خطة رعاية بعد", // note: health wording
  "When a professional shares a care plan with you, it shows here.": "عندما يشارك معك مختص خطة رعاية، ستظهر هنا.", // note: health wording
  "Next review {date}": "المراجعة التالية {date}", // note: health wording
  "What {name} recommends": "ما يوصي به {name}", // note: health wording
  "What {name} keeps an eye on": "ما يتابعه {name}", // note: health wording
  "Nothing to show yet": "لا شيء لعرضه بعد",
  "{name} hasn't added anything you can see to this plan yet.": "لم يُضِف {name} إلى هذه الخطة بعد أي شيء يمكنك رؤيته.", // note: health wording
  "{day} at {time}": "{day} في {time}", // note: {day} is still English from services/care-plan (relativeDay), which this part does not own

  // == Health · medical history (service messages) ==
  "That surgery is missing something required.": "تنقص هذه العملية الجراحية معلومة مطلوبة.", // note: health wording
  "That medication is missing something required.": "تنقص هذا الدواء معلومة مطلوبة.", // note: health wording
  "That condition is missing something required.": "تنقص هذه الحالة الصحية معلومة مطلوبة.", // note: health wording
  "Couldn't save that surgery. Check your connection and try again.": "تعذّر حفظ هذه العملية الجراحية. تحقق من اتصالك وحاول مرة أخرى.", // note: health wording
  "Couldn't save that medication. Check your connection and try again.": "تعذّر حفظ هذا الدواء. تحقق من اتصالك وحاول مرة أخرى.", // note: health wording
  "Couldn't save that condition. Check your connection and try again.": "تعذّر حفظ هذه الحالة الصحية. تحقق من اتصالك وحاول مرة أخرى.", // note: health wording
  "Add the date of this surgery before saving.": "أضف تاريخ هذه العملية الجراحية قبل الحفظ.", // note: health wording
  "That surgery couldn't be removed.": "تعذّرت إزالة هذه العملية الجراحية.", // note: health wording
  "That change couldn't be saved.": "تعذّر حفظ هذا التغيير.",
  "That medication couldn't be removed.": "تعذّرت إزالة هذا الدواء.", // note: health wording
  "That condition couldn't be removed.": "تعذّرت إزالة هذه الحالة الصحية.", // note: health wording
  "Could not load your medical records.": "تعذّر تحميل سجلاتك الطبية.", // note: health wording

  // == Health · Your health checks ==
  "Your health checks": "فحوصاتك الصحية", // note: health wording; the screen title, as Settings already writes it. The check names, how often, who they are for, the subtitle and intro under the title come from the approved screening catalogue and stay English (F13)
  "Your checks": "فحوصاتك",
  "Set a personal reminder": "ضبط تذكير شخصي",
  "Coming up": "القادم", // note: health wording; the pregnancy schedule's next test (the line under it is approved clinical copy and stays English)
  "Last checked {date}": "آخر فحص: {date}", // note: health wording
  "Not yet": "ليس بعد", // note: health wording; a check with no date on record
  "Check hidden.": "أُخفي الفحص.",
  "{name}: done. Change or undo": "{name}: تم. للتغيير أو التراجع", // note: {name} is a check name (English from the catalogue, or the member's own)
  "Mark {name} as done": "تحديد {name} كمُنجَز",
  Last: "آخر مرة", // note: health wording; the date a check was last done, beside the row
  "Next|next due": "الموعد التالي", // note: health wording; when a check is next due, beside the row
  "Add your date of birth in Profile to see checks for your age.": "أضف تاريخ ميلادك في الملف الشخصي لترى الفحوصات المناسبة لعمرك.", // note: health wording
  "No checks to show. Add a check you want to keep track of.": "لا فحوصات لعرضها. أضف فحصًا تريد متابعته.",
  "Show hidden checks": "إظهار الفحوصات المخفية",
  "Couldn't load your checks.": "تعذّر تحميل فحوصاتك.",
  "Add a check": "إضافة فحص",
  "Hidden checks ({n})": "الفحوصات المخفية ({n})",
  "You already have this check.": "لديك هذا الفحص بالفعل.",

  // Status words (services/health-checks/checkStatus.ts, still held for clinical review there)
  "Ask your doctor": "اسأل طبيبك", // note: health wording; status word, neutral (grey)
  "ask your doctor": "اسأل طبيبك", // note: health wording; the Next line when no date is known
  "not yet": "ليس بعد", // note: health wording; the Last line
  "as advised": "حسب توصية الطبيب", // note: health wording; the Next line for a check whose timing is the doctor's ("as advised")
  "ask now": "اسأل الآن", // note: health wording; only shown once the status words are approved
  "Due now": "مستحق الآن", // note: health wording; only shown once the status words are approved
  "Up to date": "محدَّث", // note: health wording; only shown once the status words are approved
  Overdue: "متأخر", // note: health wording; only shown once the status words are approved

  // == Health · Advanced health monitoring (setting, plan and check-in) ==
  "Couldn't turn it on. Please try again.": "تعذّر التشغيل. يُرجى المحاولة مرة أخرى.",
  "Couldn't turn it off. Please try again.": "تعذّر الإيقاف. يُرجى المحاولة مرة أخرى.",
  "Turn on": "تفعيل",
  "Mood check-in": "متابعة المزاج", // note: health wording; "check-in" as «متابعة», as for a professional's form (Round F B). The four questions and their answers are approved clinical copy and stay English
  "It may help to talk to a doctor about how you've been feeling.": "قد يفيدك أن تتحدث مع طبيب عن شعورك في الفترة الأخيرة.", // note: health wording; "may" kept as «قد»
  "See warning signs": "عرض العلامات التحذيرية", // note: health wording
  "Thanks. Your answers stay on this device.": "شكرًا. تبقى إجاباتك على هذا الجهاز.",
  "Your answers stay on this device and are not stored on the server.": "تبقى إجاباتك على هذا الجهاز ولا تُحفظ على الخادم.",
  "Kept on this device only.": "محفوظ على هذا الجهاز فقط.",
  "Four short questions.": "أربعة أسئلة قصيرة.",
  "Start|begin": "بدء",
  "Right-hand dates show when each was last checked, from your own records.": "تُظهر التواريخ المقابلة لكل فحص موعد آخر فحص، من سجلاتك أنت.", // note: health wording; "right-hand" dropped, since in Arabic the dates sit on the left
  // == Health · the biomarker share card (drawn on a canvas) ==
  "LOW|marker status": "منخفض", // note: health wording; the share card's status pill
  "NORMAL|marker status": "طبيعي", // note: health wording
  "HIGH|marker status": "مرتفع", // note: health wording
  HISTORY: "السجل", // note: health wording; the share card's heading over the history line
  "BIOMARKER SUMMARY": "ملخص المؤشرات الحيوية", // note: health wording; the summary card's title
  "Range: {range} {unit}": "النطاق: {range} {unit}", // note: health wording; same Arabic as the pro branch
  "Prototype health tracking, not a diagnosis.": "تتبّع صحي تجريبي، وليس تشخيصًا.", // note: health wording; the share card's footer
};

export default health;
