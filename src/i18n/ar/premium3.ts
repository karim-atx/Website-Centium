import type { Catalogue } from "../core";

// Round G3, Arabic: every label around the Premium content (Centium
// programmes, the meditation library, journal prompts) and the Premium
// readers (the weekly review and goal suggestions, the doctor summary, lab
// report comparison and biomarker trends). Every entry is in
// design-handover/round-g/ARABIC_REVIEW_G.md for Karim's review before merge.
//
// note (whole file): the CONTENT ITSELF (programme titles, sessions,
// exercises, the safety and effort lines, meditation scripts, journal
// prompts) comes from the Database in the member's language (Karim's
// approved Arabic, docs/premium-content-ar.md, loaded); only the labels
// around it are here. Premium stays «Premium» / «Centium Premium» (brand), as in Rounds
// G1 and G2. Terms: programme «برنامج», session «جلسة», the free preview
// «المعاينة المجانية», journal prompt «موضوع» (G1's "Journal
// prompts" «مواضيع اليوميات», Karim 2026-11-02), weekly review «مراجعة الأسبوع», goal
// «هدف», lab report «تقرير المختبر», marker «المؤشر», doctor summary «ملخّص
// لطبيبك» (as G1). Keys shared with the open EH branches carry their Arabic
// exactly (the clash check).

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "services/premium/g3.ts",
  "services/premium/g3Calls.ts",
  "services/premium/summaryLayout.ts",
  "services/premium/summaryPdf.ts",
  "components/premium/g3/useG3.ts",
  "components/premium/g3/parts.tsx",
  "pages/workout/centium/CentiumProgrammesEntry.tsx",
  "pages/workout/centium/CentiumProgrammesPage.tsx",
  "pages/workout/centium/CentiumProgrammePage.tsx",
  "pages/mind/library/MindLibraryEntry.tsx",
  "pages/mind/library/MindLibraryPage.tsx",
  "pages/mind/library/LibrarySessionPage.tsx",
  "pages/mind/library/ScriptRunner.tsx",
  "pages/mind/journal/JournalPrompts.tsx",
  "pages/home/review/WeeklyReviewCard.tsx",
  "pages/home/review/WeeklyReviewPage.tsx",
  "pages/health/doctor/DoctorSummaryEntry.tsx",
  "pages/health/doctor/DoctorSummaryPage.tsx",
  "components/health/records/premium/TrendGate.tsx",
  "components/health/records/premium/useTrendResults.ts",
  "components/health/records/premium/CompareReports.tsx",
];

const premium3: Catalogue = {
  // == The features table (services/premium/features, Round G3's entry) ==
  "Your weekly review": "مراجعة أسبوعك",
  "Premium looks back on your week every Monday, with goal suggestions you can accept.": "يراجع Premium أسبوعك كل يوم اثنين، مع اقتراحات لأهدافك يمكنك قبولها.",

  // == Shared G3 parts (components/premium/g3, services/premium/g3Calls) ==
  "Week {n}": "الأسبوع {n}",
  "{n} min": { zero: "0 دقيقة", one: "دقيقة واحدة", two: "دقيقتان", few: "{n} دقائق", many: "{n} دقيقةً", other: "{n} دقيقة" },

  // == Centium programmes (pages/workout/centium) ==
  "Centium programmes": "برامج Centium",
  "Ready-made programmes from Centium": "برامج جاهزة من Centium",
  "Browse Centium programmes": "تصفّح برامج Centium",
  "See all Centium programmes": "عرض كل برامج Centium",
  "{done} of {n} sessions done": { zero: "{done} من 0 جلسة مُنجزة", one: "{done} من جلسة واحدة مُنجزة", two: "{done} من جلستين مُنجزة", few: "{done} من {n} جلسات مُنجزة", many: "{done} من {n} جلسة مُنجزة", other: "{done} من {n} جلسة مُنجزة" },
  "Next: session {n}, {day}": "التالية: الجلسة {n}، {day}",
  "Next: session {n}": "التالية: الجلسة {n}",
  "Every session done": "أنجزت كل الجلسات",
  "This programme isn't available.": "هذا البرنامج غير متاح.",
  "For": "لمن",
  "Length": "المدة",
  "How it runs": "كيف يسير",
  "Warm-up": "الإحماء",
  "How it progresses": "كيف يتدرّج",
  "Weeks": "الأسابيع",
  "Effort": "مستوى الجهد",
  "What to do": "ما تفعله",
  // note: the effort guide itself (RPE) is content, from the Database in the member's language
  "Effort guide": "دليل الجهد",
  "Free preview": "المعاينة المجانية",
  "Afterwards": "بعد ذلك",
  "Week by week": "أسبوعًا بأسبوع",
  "Start this programme": "بدء هذا البرنامج",
  "When do you want to start?": "متى تريد أن تبدأ؟",
  "Start on this day": "البدء في هذا اليوم",
  "Starts {day}": "يبدأ {day}",
  "You're following this programme": "أنت تتبع هذا البرنامج",
  "Programme started.": "بدأ البرنامج.",
  "Programme starts {day}.": "يبدأ البرنامج {day}.",
  "Programme ended.": "انتهى البرنامج.",
  "End programme": "إنهاء البرنامج",
  "End this programme?": "إنهاء هذا البرنامج؟",
  "You'll stop following it. You can start it again later, from week 1.": "ستتوقف عن متابعته. يمكنك بدؤه من جديد لاحقًا، من الأسبوع الأول.",
  "Mark done": "تعليم كمُنجز",
  "rest {rest}": "راحة {rest}",
  "You're already following this programme.": "أنت تتبع هذا البرنامج بالفعل.",
  "Choose a day from today to 30 days ahead.": "اختر يومًا من اليوم حتى 30 يومًا مقبلة.",
  "Couldn't start the programme. Try again.": "تعذّر بدء البرنامج. حاول مرة أخرى.",
  "Couldn't end the programme. Try again.": "تعذّر إنهاء البرنامج. حاول مرة أخرى.",

  // == The meditation library (pages/mind/library) ==
  "Meditation library": "مكتبة التأمل",
  "Guided sessions and breathing": "جلسات موجَّهة وتمارين تنفّس",
  "Breathing": "التنفّس",
  "This session isn't available.": "هذه الجلسة غير متاحة.",
  "Get support": "اطلب الدعم",
  "Step {n} of {total}": "الخطوة {n} من {total}",
  "Session progress": "تقدّم الجلسة",
  "{left} left": "متبقٍّ {left}",
  "Pause": "إيقاف مؤقت",
  "Resume": "استئناف",
  "Begin": "البدء",
  "Start again": "البدء من جديد",
  "Stop": "إيقاف",
  "Saved · {time}": "حُفظت · {time}",
  "Finish the session to save it.": "أكمل الجلسة لحفظها.",

  // == Journal prompts (pages/mind/journal) ==
  "Today's prompt": "موضوع اليوم",
  "Write about this": "الكتابة عن هذا",
  "Pick a prompt to start a new entry with it as the title. You can always write freely too.": "اختر موضوعًا لتبدأ تدوينة جديدة عنوانها هذا الموضوع. ويمكنك دائمًا الكتابة بحرية أيضًا.",
  "{n} prompts": { zero: "{n} موضوع", one: "موضوع واحد", two: "موضوعان", few: "{n} مواضيع", many: "{n} موضوعًا", other: "{n} موضوع" },

  // == The weekly review and goal suggestions (pages/home/review) ==
  "Your week": "أسبوعك",
  "Last week at a glance, with goal suggestions": "أسبوعك الماضي في لمحة، مع اقتراحات لأهدافك",
  "Week before": "الأسبوع السابق",
  "Week after": "الأسبوع التالي",
  "Nothing to show for this week.": "لا شيء لعرضه لهذا الأسبوع.",
  "Days with something logged": "أيام سجّلت فيها شيئًا",
  "Habit check-ins": "تسجيلات العادات",
  "Meditation sessions": "جلسات التأمل",
  "Journal entries": "تدوينات اليوميات",
  "Days you reached your water goal": "أيام بلغت فيها هدف الماء",
  "Average steps": "متوسط الخطوات",
  "Average sleep": "متوسط النوم",
  "Meditation minutes": "دقائق التأمل",
  "{h} h {m} min": "{h} ساعة {m} دقيقة",
  "Goal suggestions": "اقتراحات للأهداف",
  "{n} steps": "{n} خطوة",
  "{n} ml": "{n} مل",
  "Make {suggested} my goal": "اجعل {suggested} هدفي",
  // note: health wording (ours, neutral; never applied by itself)
  "You reached your step goal on 5 or more days last week.": "بلغت هدف خطواتك في 5 أيام أو أكثر الأسبوع الماضي.",
  // note: health wording (ours, neutral, never judging)
  "Your step goal fitted 2 days or fewer last week. A different goal might suit your weeks better.": "ناسبك هدف خطواتك في يومين أو أقل الأسبوع الماضي. قد يناسب أسابيعك هدفٌ مختلف أكثر.",
  // note: health wording (ours, neutral)
  "You reached your water goal on 5 or more days last week.": "بلغت هدف الماء في 5 أيام أو أكثر الأسبوع الماضي.",
  // note: health wording (ours; calories never carry a number)
  "Your calories were quite far from your target on most days last week. You might check that your target still suits you.": "كانت سعراتك بعيدة نوعًا ما عن هدفك في معظم أيام الأسبوع الماضي. قد ترغب في التحقق من أن هدفك ما زال يناسبك.",
  // note: health wording (ours; protein never carries a number)
  "Your protein was quite far from your target on most days last week. You might check that your target still suits you.": "كان البروتين لديك بعيدًا نوعًا ما عن هدفك في معظم أيام الأسبوع الماضي. قد ترغب في التحقق من أن هدفك ما زال يناسبك.",
  "Suggestions are never applied by themselves.": "لا تُطبَّق الاقتراحات من تلقاء نفسها أبدًا.",
  "Your step goal is updated from today.": "حُدّث هدف خطواتك بدءًا من اليوم.",
  "Your water goal is updated from today.": "حُدّث هدف الماء بدءًا من اليوم.",
  "That suggestion has changed. Look again next week.": "تغيّر هذا الاقتراح. ألقِ نظرة مجددًا الأسبوع المقبل.",

  // == The doctor summary (pages/health/doctor, services/premium/g3) ==
  "Summary for your doctor": "ملخّص لطبيبك",
  "A printable summary of your records, made on your device": "ملخّص قابل للطباعة لسجلاتك، يُعدّ على جهازك",
  "Made on your device from what you've logged": "يُعدّ على جهازك مما سجّلته",
  "Dates covered": "الفترة المشمولة",
  "Last 90 days": "آخر 90 يومًا",
  "Last 6 months": "آخر 6 أشهر",
  "Last year": "آخر سنة",
  "Last 2 years": "آخر سنتين",
  "Make the summary": "إعداد الملخّص",
  "Make it again": "إعداده من جديد",
  "Print": "طباعة",
  "Save as PDF": "حفظ كملف PDF",
  "Couldn't make the PDF. Try again.": "تعذّر إعداد ملف PDF. حاول مرة أخرى.",
  "Couldn't make your summary. Try again.": "تعذّر إعداد ملخّصك. حاول مرة أخرى.",
  "Choose a period of up to two years.": "اختر فترة لا تتجاوز سنتين.",
  // note: health wording (decision G11): the line the summary always carries
  "For your doctor. Not a diagnosis.": "لطبيبك. ليس تشخيصًا.",
  "Name: {name}": "الاسم: {name}",
  "Age: {n}": "العمر: {n}",
  // note: the sex value itself is the member's own record, shown as stored
  "Sex: {sex}": "الجنس: {sex}",
  "Nothing recorded.": "لا شيء مسجّل.",
  // note: health wording
  "Medications": "الأدوية",
  // note: health wording
  "No medications recorded.": "لا توجد أدوية مسجَّلة.",
  // note: health wording
  "No allergies recorded.": "لا توجد حساسية مسجَّلة.",
  // note: health wording
  "Conditions": "الحالات الصحية",
  // note: health wording
  "No conditions recorded.": "لا توجد حالات صحية مسجَّلة.",
  "Surgeries": "العمليات الجراحية",
  "No surgeries recorded.": "لا توجد عمليات جراحية مسجَّلة.",
  "{n} readings in this period": { zero: "{n} قراءة في هذه الفترة", one: "قراءة واحدة في هذه الفترة", two: "قراءتان في هذه الفترة", few: "{n} قراءات في هذه الفترة", many: "{n} قراءة في هذه الفترة", other: "{n} قراءة في هذه الفترة" },
  // note: health wording
  "Average: {sys}/{dia} mmHg": "المتوسط: {sys}/{dia} ملم زئبق",
  // note: health wording
  "Latest: {sys}/{dia} mmHg": "الأحدث: {sys}/{dia} ملم زئبق",
  // note: health wording
  "pulse {n}": "النبض {n}",
  "No readings in this period.": "لا توجد قراءات في هذه الفترة.",
  "First: {kg} kg": "الأولى: {kg} كغ",
  "Latest: {kg} kg": "الأحدث: {kg} كغ",
  "No weight readings in this period.": "لا توجد قراءات للوزن في هذه الفترة.",
  // note: health wording
  "Lab results (latest of each)": "نتائج التحاليل (الأحدث لكل مؤشر)",
  "No lab results in this period.": "لا توجد نتائج تحاليل في هذه الفترة.",
  // note: health wording (neutral, as the lab report puts it)
  "below range": "دون النطاق",
  // note: health wording
  "in range": "ضمن النطاق",
  // note: health wording
  "above range": "فوق النطاق",
  // note: health wording
  "range {range}": "النطاق {range}",
  // note: health wording
  "Typical cycle: {n} days": { zero: "الدورة المعتادة: {n} يوم", one: "الدورة المعتادة: يوم واحد", two: "الدورة المعتادة: يومان", few: "الدورة المعتادة: {n} أيام", many: "الدورة المعتادة: {n} يومًا", other: "الدورة المعتادة: {n} يوم" },
  // note: health wording
  "Typical period: {n} days": { zero: "مدة الحيض المعتادة: {n} يوم", one: "مدة الحيض المعتادة: يوم واحد", two: "مدة الحيض المعتادة: يومان", few: "مدة الحيض المعتادة: {n} أيام", many: "مدة الحيض المعتادة: {n} يومًا", other: "مدة الحيض المعتادة: {n} يوم" },

  // == Lab report comparison and biomarker trends (components/health/records/premium) ==
  "Compare two reports": "مقارنة تقريرين",
  "Side by side, marker by marker": "جنبًا إلى جنب، مؤشرًا بمؤشر",
  "Lab report": "تقرير المختبر",
  "Earlier report": "التقرير الأقدم",
  "Later report": "التقرير الأحدث",
  "Compare": "مقارنة",
  "Choose two different reports.": "اختر تقريرين مختلفين.",
  "Choose two of your own reports.": "اختر تقريرين من تقاريرك.",
  "Couldn't compare the reports. Try again.": "تعذّرت مقارنة التقريرين. حاول مرة أخرى.",
  "These reports have no markers to compare.": "لا توجد في هذين التقريرين مؤشرات للمقارنة.",
  "Marker": "المؤشر",
  "Earlier|lab report column": "الأقدم",
  "Later|lab report column": "الأحدث",
  // note: health wording
  "A change is shown only when both reports use the same unit.": "يظهر التغيير فقط حين يستخدم التقريران الوحدة نفسها.",
  // note: health wording
  "See how this marker has changed over time. Your latest reading stays here, and adding results is free.": "اطّلع على تغيّر هذا المؤشر مع الوقت. تبقى أحدث قراءة لك هنا، وإضافة النتائج مجانية.",
};

export default premium3;
