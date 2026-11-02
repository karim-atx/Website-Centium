import type { Catalogue } from "../core";

// Round G (EH2), Arabic: the cycle tracker, pregnancy and contraception screens.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. The three guidance
// modules are listed for their tk() UI labels only: their paragraphs of
// clinical guidance stay English (F13).
export const FILES: string[] = [
  // == Cycle · Overview, Insights and Settings ==
  "pages/cycle/Cycle.tsx",
  "components/cycle/cycleUi.tsx",
  "components/cycle/CycleRing.tsx",
  "components/cycle/CycleScrubber.tsx",
  "components/cycle/HormoneGraph.tsx",
  "components/cycle/CycleInsightsTab.tsx",
  "components/cycle/CycleSettingsTab.tsx",
  "components/cycle/CycleSharingPage.tsx",
  "components/cycle/TurnOffTrackingPopup.tsx",
  "components/cycle/LogDaySheet.tsx",
  "components/cycle/TrackerQuestion.tsx",
  "components/cycle/CyclePhaseStrip.tsx",
  "services/cycle/hormones.ts",
  "services/cycle/insights.ts",
  "services/cycle/sharing.ts",
  "services/cycle/types.ts",
  "services/cycle/guidance.ts",
  // == Cycle · Pregnancy ==
  "components/pregnancy/PregnancyOverview.tsx",
  "components/pregnancy/PregnancyRing.tsx",
  "components/pregnancy/PregnancyGuidance.tsx",
  "components/pregnancy/StartPregnancyPage.tsx",
  "components/pregnancy/EndPregnancySheet.tsx",
  "components/pregnancy/KickCounter.tsx",
  "components/pregnancy/ContractionTimer.tsx",
  "components/pregnancy/usePregnancyFlags.ts",
  "services/pregnancy/index.ts",
  "services/pregnancy/weeks.ts",
  "services/pregnancy/weight.ts",
  "services/pregnancy/guidance.ts",
  // == Cycle · Contraception ==
  "pages/contraception/Contraception.tsx",
  "components/contraception/MethodSetupSheet.tsx",
  "components/contraception/PillPack.tsx",
  "components/contraception/ReminderSettings.tsx",
  "services/contraception/index.ts",
  "services/contraception/schedule.ts",
  "services/contraception/guidance.ts",
];

// note (whole file): cycle «الدورة»; period in a sentence «الدورة الشهرية»,
// and the ring's short "Period" line reuses the existing «الحيض» (so "Period
// in" is «الحيض بعد»); phase «مرحلة»; fertile window «فترة الخصوبة»; flow
// «غزارة الدم»; trimester «الثلث» (of the pregnancy: «الثلث 2»); due date
// «موعد الولادة المتوقع»; contraction «انقباض»; kicks/movements «حركة»;
// contraception method «وسيلة»; pill pack «علبة»; ring «حلقة»; patch «لصقة»;
// injection «حقنة»; fitted (implant/IUD) «التركيب»; LH and pregnancy tests at
// home «اختبار» (not the lab «فحص»). The UI labels in the guidance modules
// (phase names, symptom, mood, flow, mucus and energy options, method names,
// buttons and headings) are marked with tk() there, or shown through tx() with
// a context where the bare word means something else ("Light|flow",
// "Active|pill pack"), and translated where they are shown; stored values stay
// English. Phases reuse «الحيض / الجُرَيبية / الإباضة / الأصفرية»; "{phase}
// phase" reads «المرحلة: {phase}», which agrees with every phase name. Moods
// are masculine adjectives as main's "Mood: calm" «المزاج: هادئ»; energy levels
// are feminine (الطاقة). The guidance paragraphs (phase descriptions,
// confidence reasons, flags, hormone, pregnancy and contraception advice,
// privacy and data paragraphs) stay English for clinical review (F13). The
// unit after a number ("28 d", "5 days") is a plural whose forms carry no
// number: «يوم / أيام / يومًا».
const cycle: Catalogue = {
  // == Cycle · Overview (the ring, chips and scrubber) ==
  "Period in": "الحيض بعد", // note: health wording; the ring's first line over "{n} days" ("Period" alone is the existing «الحيض»)
  "due|period": "متوقّع", // note: health wording; the ring's second line under "Period" (a period expected now)
  "{phase} phase.": "المرحلة: {phase}.", // note: health wording; screen-reader sentence, {phase} is the translated phase name
  "Cycle day {day} of about {length}. {date}. {phase} phase.": "اليوم {day} من الدورة من أصل {length} تقريبًا. {date}. المرحلة: {phase}.", // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. Period, day {day}.": "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية، اليوم {day}.", // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. Period due. {phase} phase.": "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية متوقّعة. المرحلة: {phase}.", // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. Period in {n} days. {phase} phase.": {
    zero: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد 0 أيام. المرحلة: {phase}.",
    one: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد يوم واحد. المرحلة: {phase}.",
    two: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد يومين. المرحلة: {phase}.",
    few: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد {n} أيام. المرحلة: {phase}.",
    many: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد {n} يومًا. المرحلة: {phase}.",
    other: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد {n} يوم. المرحلة: {phase}.",
  }, // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. {phase} phase.": "اليوم {day} من الدورة من أصل {length} تقريبًا. المرحلة: {phase}.", // note: health wording; screen-reader sentence
  "Next period expected {range}, an estimate.": "الدورة الشهرية التالية متوقّعة في {range}، وهذا تقدير.", // note: health wording; {range} is a date range such as «4–10 تشرين الأول»
  "Next period expected {range}": "الدورة الشهرية التالية متوقّعة في {range}", // note: health wording
  "Fertile {range}": "فترة الخصوبة {range}", // note: health wording; the chip, followed by the hidden ", estimate"
  ", estimate": "، تقدير", // note: health wording; screen-reader tail of the fertile chip
  "in {n} days": {
    zero: "بعد 0 أيام",
    one: "بعد يوم واحد",
    two: "بعد يومين",
    few: "بعد {n} أيام",
    many: "بعد {n} يومًا",
    other: "بعد {n} يوم",
  }, // note: health wording; the scrubber, a day ahead of today in the cycle
  "{n} days ago": {
    zero: "منذ {n} يوم",
    one: "منذ يوم",
    two: "منذ يومين",
    few: "منذ {n} أيام",
    many: "منذ {n} يومًا",
    other: "منذ {n} يوم",
  }, // note: health wording; the scrubber, a day behind today in the cycle
  "Today · Day {n}": "اليوم · يوم {n}", // note: health wording; «يوم {n}» here rather than the shared «اليوم {n}», which would read «اليوم · اليوم 14»
  "Day {n} · {relative}": "يوم {n} · {relative}", // note: health wording; same as the line above
  "{phase}, {date}": "{phase}، {date}", // note: health wording; the scrubber's spoken value (recovery-sensitive mode)
  "Day {n}, {phase}, {date}": "اليوم {n}، {phase}، {date}", // note: health wording; the scrubber's spoken value
  "Cycle phases": "مراحل الدورة", // note: health wording
  "Move through the cycle": "التنقّل عبر الدورة", // note: health wording; the scrubber's name for screen readers
  "{title}, {disclaimer}. Day {n} marked": "{title}، {disclaimer}. اليوم {n} محدّد", // note: health wording; the hormone illustration's name for screen readers
  "{title}, {disclaimer}": "{title}، {disclaimer}", // note: health wording; the same, with no day marked
  "Working|in progress": "جارٍ التنفيذ", // the spinner in a popup's confirm button, not a working weight

  // == Cycle · Insights ==
  d: { zero: "يوم", one: "يوم", two: "يوم", few: "أيام", many: "يومًا", other: "يوم" }, // note: health wording; the small unit after a cycle length ("28 d"), so the forms carry no number
  days: { zero: "يوم", one: "يوم", two: "يومان", few: "أيام", many: "يومًا", other: "يوم" }, // note: health wording; the unit after an average ("28 days"), forms without the number

  // == Cycle · Settings ==
  "Pregnancy tracking": "تتبّع الحمل", // note: health wording
  "Week {week} · day {day} · trimester {trimester}": "الأسبوع {week} · اليوم {day} · الثلث {trimester}", // note: health wording; trimester «الثلث» (of the pregnancy)
  "Decrease {label}": "إنقاص {label}", // note: health wording; {label} is the translated setting name (cycle/period/luteal length)
  "Increase {label}": "زيادة {label}", // note: health wording; as above
  "{label}, {n} days. Tap to type a number": {
    zero: "{label}، 0 أيام. اضغط لكتابة رقم",
    one: "{label}، يوم واحد. اضغط لكتابة رقم",
    two: "{label}، يومان. اضغط لكتابة رقم",
    few: "{label}، {n} أيام. اضغط لكتابة رقم",
    many: "{label}، {n} يومًا. اضغط لكتابة رقم",
    other: "{label}، {n} يوم. اضغط لكتابة رقم",
  }, // note: health wording; screen-reader label of a length value
  "That value is outside the range this can store.": "هذه القيمة خارج النطاق الذي يمكن حفظه.", // error from services/cycle (that file is shared and left untouched); shown through t() by the cycle screens and Profile's Cycle tracking row

  // == Cycle · Who can see your cycle ==
  "{label} is still not shared with {name}. Set it again to retry.": "لا تزال مشاركة «{label}» مع {name} غير مفعّلة. اضبطها مجددًا لإعادة المحاولة.", // note: health wording; {label} is the translated category name; «مشاركة» keeps the sentence free of the label's gender
  "{label} is still shared with {name}. Set it again to retry.": "لا تزال مشاركة «{label}» مع {name} مفعّلة. اضبطها مجددًا لإعادة المحاولة.", // note: health wording; as above
  "Share {label} with {name}": "مشاركة {label} مع {name}", // note: health wording; the switch's name for screen readers

  // == Cycle · Log a day ==
  "Save day": "حفظ اليوم", // note: health wording
  Flow: "غزارة الدم", // note: health wording
  "Count this as a period day": "احتساب هذا اليوم من أيام الدورة الشهرية", // note: health wording
  Symptoms: "الأعراض", // note: health wording
  "Energy, 1 very low to 5 very high": "الطاقة، من 1 منخفضة جدًا إلى 5 مرتفعة جدًا", // note: health wording; screen-reader name of the energy options
  "Cervical mucus": "مخاط عنق الرحم", // note: health wording
  Temperature: "درجة الحرارة", // note: health wording; basal body temperature, °C beside it
  "Basal body temperature in degrees Celsius": "درجة حرارة الجسم القاعدية بالدرجات المئوية", // note: health wording
  "LH test": "اختبار LH", // note: health wording; the home ovulation (LH) test, so «اختبار» rather than the lab «فحص»
  "Pregnancy test": "اختبار الحمل", // note: health wording; a home test, «اختبار» as above
  "Sexual activity": "النشاط الجنسي", // note: health wording
  "Anything worth remembering about today": "أي شيء يستحق التذكّر عن هذا اليوم", // note: health wording; the notes placeholder
  "You need to be signed in to log a day.": "يجب تسجيل الدخول لتسجيل يوم.", // note: health wording

  // == Cycle · Tracker question (Health) ==
  "Turn period tracking back on?": "هل تريد إعادة تشغيل تتبّع الدورة الشهرية؟", // note: health wording

  // == Cycle · Workout strip ==
  "Pregnancy · week {n}": "الحمل · الأسبوع {n}", // note: health wording
  "Pregnancy · {n}": "الحمل · {n}", // note: health wording; the compact chip ({n} is the week)
  "Hide the guidance": "إخفاء الإرشادات", // note: health wording
  "{phase} phase · day {n}": "المرحلة: {phase} · اليوم {n}", // note: health wording; {phase} is the translated phase name
  "{phase} phase|named": "المرحلة: {phase}", // note: health wording; as above, with the phase name translated (a context key, since the pro branch's bare "{phase} phase" is «مرحلة {phase}»)

  // == Cycle · Pregnancy overview ==
  "Week {n}": "الأسبوع {n}", // note: health wording; the pregnancy ring's headline
  "Day {day} · trimester {trimester}": "اليوم {day} · الثلث {trimester}", // note: health wording
  "Trimester {n}": "الثلث {n}", // note: health wording; the trimester bar
  "Log today": "تسجيل اليوم", // note: health wording
  "Guidance for week {n}": "إرشادات الأسبوع {n}", // note: health wording
  "This pregnancy has no start date recorded, so there's nothing to count from.": "لا يوجد تاريخ بداية مسجّل لهذا الحمل، لذا لا يوجد ما يُحتسب منه.", // note: health wording
  "These dates give a week that doesn't look right. Check the date you entered, or ask your provider for the dating from your scan.":
    "تعطي هذه التواريخ أسبوعًا لا يبدو صحيحًا. تحقّق من التاريخ الذي أدخلته، أو اطلب من مقدّم الرعاية الصحية تحديد عمر الحمل وفق صورتك الطبية.", // note: health wording; "provider" «مقدّم الرعاية الصحية», "scan" (pregnancy ultrasound) «صورتك الطبية» per the glossary
  "Due today|due date": "موعد الولادة المتوقع اليوم", // note: health wording; the pregnancy due date, not a payment
  "Due in {n} days": {
    zero: "موعد الولادة المتوقع بعد 0 أيام",
    one: "موعد الولادة المتوقع بعد يوم واحد",
    two: "موعد الولادة المتوقع بعد يومين",
    few: "موعد الولادة المتوقع بعد {n} أيام",
    many: "موعد الولادة المتوقع بعد {n} يومًا",
    other: "موعد الولادة المتوقع بعد {n} يوم",
  }, // note: health wording
  "{n} days past your due date": {
    zero: "0 أيام بعد موعد الولادة المتوقع",
    one: "يوم واحد بعد موعد الولادة المتوقع",
    two: "يومان بعد موعد الولادة المتوقع",
    few: "{n} أيام بعد موعد الولادة المتوقع",
    many: "{n} يومًا بعد موعد الولادة المتوقع",
    other: "{n} يوم بعد موعد الولادة المتوقع",
  }, // note: health wording; said plainly, as the English (no alarm), and without a gendered verb

  // == Cycle · Pregnancy cards (Food, Workout, Health) ==
  "Eating for pregnancy": "التغذية أثناء الحمل", // note: health wording
  "Moving in pregnancy": "الحركة أثناء الحمل", // note: health wording
  "Pregnancy health": "صحة الحمل", // note: health wording
  "Week {week} · trimester {trimester}": "الأسبوع {week} · الثلث {trimester}", // note: health wording
  "+{n} kcal a day": "+{n} سعرة يوميًا", // note: health wording; «سعرة» as the other kcal strings
  "Every day": "كل يوم", // note: health wording; heading over the daily nutrients (their names stay English, guidance)
  "Limit or avoid": "للتقليل أو التجنّب", // note: health wording; heading over a guidance list
  "Good choices": "خيارات جيدة", // note: health wording; heading over a guidance list
  "If they were already part of your routine": "إن كانت جزءًا من روتينك من قبل", // note: health wording; heading over a guidance list
  Avoid: "تجنّب", // note: health wording; heading over a guidance list
  "Weight gain": "زيادة الوزن", // note: health wording
  "Pre-pregnancy BMI {bmi} ({band}) · {min}–{max} kg recommended in total": "مؤشر كتلة الجسم قبل الحمل {bmi} ({band}) · يُوصى بزيادة {min}–{max} كغ إجمالًا", // note: health wording; {band} is the English BMI band from guidance ("18.5–24.9", "30 and over")
  "Expected by week {n}": "المتوقّع بحلول الأسبوع {n}", // note: health wording
  "{min}–{max} kg": "{min}–{max} كغ", // note: health wording
  "So far": "حتى الآن", // note: health wording
  "Within the expected range for this week.": "ضمن النطاق المتوقّع لهذا الأسبوع.", // note: health wording
  "Below the expected range for this week.": "دون النطاق المتوقّع لهذا الأسبوع.", // note: health wording
  "Above the expected range for this week.": "فوق النطاق المتوقّع لهذا الأسبوع.", // note: health wording

  // == Cycle · Start and end a pregnancy ==
  "How to work out the dates": "طريقة حساب التواريخ", // note: health wording
  "Tracking ended, but cycle estimates couldn't be paused. Try from Settings.": "انتهى التتبّع، لكن تعذّر إيقاف تقديرات الدورة مؤقتًا. حاول من الإعدادات.", // note: health wording
  "Nothing you've logged is deleted, and cycle estimates carry on as before.": "لن يُحذف شيء مما سجّلته، وتستمر تقديرات الدورة كما كانت.", // note: health wording
  "There's already a pregnancy being tracked.": "هناك حمل يجري تتبّعه بالفعل.", // note: health wording
  "Those dates don't work together. Check them and try again.": "هذه التواريخ لا تتوافق معًا. تحقّق منها وحاول مرة أخرى.", // note: health wording
  "Enter either your last period or your due date.": "أدخل تاريخ آخر دورة شهرية أو موعد الولادة المتوقع.", // note: health wording
  "You don't have permission to save this. Sign in again and try once more.": "ليس لديك إذن بحفظ هذا. سجّل الدخول مجددًا وحاول مرة أخرى.",
  "Couldn't save that. Check your connection and try again.": "تعذّر حفظ ذلك. تحقّق من اتصالك وحاول مرة أخرى.",

  // == Cycle · Kick counter and contraction timer ==
  "Count a movement": "احتساب حركة", // note: health wording; the big tap target while counting kicks
  "Tap each movement": "اضغط مع كل حركة", // note: health wording
  "Start counting": "بدء العدّ", // note: health wording
  "{n} movements": { zero: "0 حركات", one: "حركة واحدة", two: "حركتان", few: "{n} حركات", many: "{n} حركة", other: "{n} حركة" }, // note: health wording
  "Couldn't start counting.": "تعذّر بدء العدّ.", // note: health wording
  "Contraction in progress": "انقباض جارٍ الآن", // note: health wording
  "Start a contraction": "بدء توقيت انقباض", // note: health wording; the timer's start button, so «توقيت» is said
  Started: "البدء", // note: health wording; column head (start time of a contraction)
  Lasted: "المدة", // note: health wording; column head
  Apart: "الفاصل", // note: health wording; column head (start to start)
  "Couldn't start timing.": "تعذّر بدء التوقيت.", // note: health wording
  "{s}s": "{s} ث", // note: health wording; a contraction or kick-session duration
  "{m}m {s}s": "{m} د {s} ث", // note: health wording; as above

  // == Cycle · Contraception ==
  "Method|contraception": "الوسيلة", // note: health wording; contraception method, not a payment method
  "Started on": "تاريخ البدء", // note: health wording
  "First day of this pack": "أول يوم من هذه العلبة", // note: health wording; pill pack «علبة»
  "Active days": "الأيام الفعّالة", // note: health wording; active pills
  "Break days": "أيام الاستراحة", // note: health wording
  "No reminder time": "بلا وقت تذكير", // note: health wording
  "Set a time": "تحديد وقت", // note: health wording
  "Put in on": "تاريخ الإدخال", // note: health wording; the vaginal ring
  "Weeks in": "أسابيع الاستخدام", // note: health wording; the ring in place
  "Weeks out": "أسابيع الإزالة", // note: health wording; the ring removed
  "First patch on": "تاريخ أول لصقة", // note: health wording
  "Change day": "يوم التغيير", // note: health wording; the patch's weekly change day
  "I have a patch-free week": "لديّ أسبوع بلا لصقة", // note: health wording; first person, as the English switch
  "Last injection": "آخر حقنة", // note: health wording
  "Every (weeks)": "كل (أسابيع)", // note: health wording; injection interval
  "Fitted on": "تاريخ التركيب", // note: health wording; implant or IUD
  "Replace by": "الاستبدال قبل", // note: health wording; implant or IUD
  "There's no schedule to keep for this one. It's recorded so the rest of the app knows what you use.":
    "لا يوجد جدول يجب الالتزام به لهذه الوسيلة. تُسجَّل لكي يعرف باقي التطبيق ما تستخدمه.", // note: health wording
  today: "اليوم", // note: health wording; the pill pack day's spoken label ("Day 5, active, today")
  "Today is already logged. Change it instead of adding another.": "سُجّل اليوم بالفعل. عدّله بدلًا من إضافة إدخال آخر.", // note: health wording; one pill outcome per day
  "That schedule doesn't fit this method. Check the dates and numbers.": "هذا الجدول لا يناسب هذه الوسيلة. تحقّق من التواريخ والأرقام.", // note: health wording
  "Enter the date you started this pack.": "أدخل تاريخ بدء هذه العلبة.", // note: health wording
  "Active days should be between 20 and 28.": "يجب أن تكون الأيام الفعّالة بين 20 و28.", // note: health wording
  "Break days should be between 0 and 7.": "يجب أن تكون أيام الاستراحة بين 0 و7.", // note: health wording
  "A pack should be between 21 and 35 days in total.": "يجب أن يتراوح مجموع أيام العلبة بين 21 و35 يومًا.", // note: health wording
  "Enter the date the ring went in.": "أدخل تاريخ إدخال الحلقة.", // note: health wording
  "Weeks in should be between 1 and 4.": "يجب أن تكون أسابيع الاستخدام بين 1 و4.", // note: health wording
  "Weeks out should be between 0 and 2.": "يجب أن تكون أسابيع الإزالة بين 0 و2.", // note: health wording
  "Enter the date you put the first patch on.": "أدخل تاريخ وضع أول لصقة.", // note: health wording
  "Choose the day of the week you change it.": "اختر يوم الأسبوع الذي تغيّرها فيه.", // note: health wording
  "Enter the date of your last injection.": "أدخل تاريخ آخر حقنة.", // note: health wording
  "The interval should be between 4 and 16 weeks.": "يجب أن تكون المدة بين الحقنتين من 4 إلى 16 أسبوعًا.", // note: health wording
  "Enter the date it was fitted.": "أدخل تاريخ التركيب.", // note: health wording; implant or IUD
  "Enter the date it should be replaced by.": "أدخل التاريخ الذي يجب استبدالها قبله.", // note: health wording; implant or IUD
  "The replace-by date must be after it was fitted.": "يجب أن يكون تاريخ الاستبدال بعد تاريخ التركيب.", // note: health wording

  // == Cycle · Guidance labels (services/cycle/guidance.ts) ==
  "Estimates · Not a method of contraception": "تقديرات · ليست وسيلة لمنع الحمل", // note: health wording; the line always on the overview
  "Low confidence": "ثقة منخفضة", // note: health wording
  "Medium confidence": "ثقة متوسطة", // note: health wording
  "High confidence": "ثقة عالية", // note: health wording
  "Typical hormone pattern": "النمط الهرموني المعتاد", // note: health wording
  "Illustrative, not measured": "توضيحي، غير مقيس", // note: health wording
  Estrogen: "الإستروجين", // note: health wording
  Progesterone: "البروجسترون", // note: health wording
  Testosterone: "التستوستيرون", // note: health wording
  LH: "LH", // note: health wording; hormone abbreviation, kept Latin
  FSH: "FSH", // note: health wording; as above
  "Short cycles": "دورات قصيرة", // note: health wording; flag title; the flag sentences stay English
  "Long cycles": "دورات طويلة", // note: health wording
  "Long periods": "فترات حيض طويلة", // note: health wording
  "Heavy flow": "نزف غزير", // note: health wording
  "Bleeding between periods": "نزف بين الدورات", // note: health wording
  "No period logged in 90 days": "لا حيض مسجّل منذ 90 يومًا", // note: health wording
  "Worth a conversation": "يستحق الحديث عنه", // note: health wording; heading over the flags
  "When did your last period start?": "متى بدأت دورتك الشهرية الأخيرة؟", // note: health wording
  "Log my last period": "تسجيل آخر دورة شهرية", // note: health wording
  "None|flow": "لا شيء", // note: health wording; flow level; the saved value stays English
  "Spotting|flow": "تبقيع", // note: health wording
  "Light|flow": "خفيف", // note: health wording
  "Medium|flow": "متوسط", // note: health wording
  "Heavy|flow": "غزير", // note: health wording
  "Dry|mucus": "جاف", // note: health wording; cervical mucus option
  "Sticky|mucus": "لزج", // note: health wording
  "Creamy|mucus": "كريمي", // note: health wording
  "Watery|mucus": "مائي", // note: health wording
  "Egg white|mucus": "مثل بياض البيض", // note: health wording
  Negative: "سلبي", // note: health wording; an LH or pregnancy test result
  Positive: "إيجابي", // note: health wording
  Peak: "ذروة", // note: health wording; LH test result
  Protected: "محمي", // note: health wording
  Unprotected: "غير محمي", // note: health wording
  "Private: never shared": "خاص: لا يُشارَك أبدًا", // note: health wording
  Cramps: "تشنجات", // note: health wording; symptom option; «تشنجات» as main's "Mild cramps"
  Headache: "صداع", // note: health wording
  Bloating: "انتفاخ", // note: health wording
  "Breast tenderness": "ألم الثدي", // note: health wording
  Acne: "حبّ الشباب", // note: health wording
  Backache: "ألم الظهر", // note: health wording
  Nausea: "غثيان", // note: health wording
  Fatigue: "إرهاق", // note: health wording
  Insomnia: "أرق", // note: health wording
  Cravings: "رغبة شديدة في الأكل", // note: health wording
  Diarrhoea: "إسهال", // note: health wording
  Constipation: "إمساك", // note: health wording
  Dizziness: "دوخة", // note: health wording
  "Hot flashes": "هبّات ساخنة", // note: health wording
  "Calm|mood": "هادئ", // note: health wording; mood option, masculine adjective as main's "Mood: calm"
  "Happy|mood": "سعيد", // note: health wording
  "Energetic|mood": "نشيط", // note: health wording
  "Irritable|mood": "سريع الانفعال", // note: health wording
  "Anxious|mood": "قلق", // note: health wording
  "Sad|mood": "حزين", // note: health wording
  "Sensitive|mood": "حساس", // note: health wording
  "Angry|mood": "غاضب", // note: health wording
  "Unmotivated|mood": "بلا حافز", // note: health wording
  "Other|mood": "آخر", // note: health wording
  "Very low|energy": "منخفضة جدًا", // note: health wording; energy level (الطاقة, feminine)
  "Low|energy": "منخفضة", // note: health wording
  "Okay|energy": "مقبولة", // note: health wording
  "Good|energy": "جيدة", // note: health wording
  "Very high|energy": "مرتفعة جدًا", // note: health wording
  "Start pregnancy tracking": "بدء تتبّع الحمل", // note: health wording
  "Cycle tracking is off": "تتبّع الدورة متوقف", // note: health wording
  "Turn on cycle tracking": "تفعيل تتبّع الدورة", // note: health wording
  Endometriosis: "بطانة الرحم المهاجرة", // note: health wording
  "Irregular cycles": "دورات غير منتظمة", // note: health wording
  Perimenopause: "مرحلة ما قبل انقطاع الطمث", // note: health wording
  "Delete all cycle data": "حذف كل بيانات الدورة", // note: health wording; as quoted in the tracker-off sentence
  "Delete everything": "حذف كل شيء", // note: health wording
  "Turn off cycle tracking?": "إيقاف تتبّع الدورة؟", // note: health wording
  "Keep tracking": "متابعة التتبّع", // note: health wording
  "Turn it back on": "إعادة التفعيل", // note: health wording
  "Keep my data": "الإبقاء على بياناتي", // note: health wording
  "Enter a number from {min} to {max} days.": "أدخل رقمًا من {min} إلى {max} يومًا.", // note: health wording
  "Log this day": "تسجيل هذا اليوم", // note: health wording
  "Back to today": "العودة إلى اليوم", // note: health wording
  "Couldn't load your cycle.": "تعذّر تحميل دورتك.", // note: health wording
  "Couldn't load your insights.": "تعذّر تحميل رؤاك.", // note: health wording; «الرؤى» as main's "Insights"
  "Cycle length": "طول الدورة", // note: health wording
  "Period days": "أيام الحيض", // note: health wording
  "Rest of the cycle": "بقية الدورة", // note: health wording
  "Last {n} cycles. Strip length is the cycle in days.": { zero: "لا دورات. طول الشريط هو طول الدورة بالأيام.", one: "آخر دورة. طول الشريط هو طول الدورة بالأيام.", two: "آخر دورتين. طول الشريط هو طول الدورة بالأيام.", few: "آخر {n} دورات. طول الشريط هو طول الدورة بالأيام.", many: "آخر {n} دورة. طول الشريط هو طول الدورة بالأيام.", other: "آخر {n} دورة. طول الشريط هو طول الدورة بالأيام." }, // note: health wording
  "Avg cycle": "متوسط الدورة", // note: health wording
  "Avg period": "متوسط الحيض", // note: health wording
  Variation: "التفاوت", // note: health wording
  "Symptoms by phase": "الأعراض حسب المرحلة", // note: health wording
  "Days you logged each symptom, grouped by the phase it happened in.": "الأيام التي سجّلت فيها كل عَرَض، مجمّعة حسب المرحلة التي حدث فيها.", // note: health wording
  Symptom: "العَرَض", // note: health wording
  "Follic.": "الجُرَيبية", // note: health wording; the grid's short column head; the full word fits
  "Ovul.": "الإباضة", // note: health wording; as above
  Tracking: "التتبّع", // note: health wording
  "Your cycle": "دورتك", // note: health wording
  "Data and privacy": "البيانات والخصوصية", // note: health wording
  "Typical cycle length": "طول الدورة المعتاد", // note: health wording
  "Typical period length": "طول الحيض المعتاد", // note: health wording
  "Luteal length": "طول المرحلة الأصفرية", // note: health wording
  Contraception: "منع الحمل", // note: health wording
  "Set up|action": "إعداد", // note: health wording; the Contraception row's action when no method is set (bare "Set up" is the state «تم الإعداد»)
  "Who can see your cycle phase": "من يمكنه رؤية مرحلة دورتك", // note: health wording
  "Shared with {n}": "مُشارَكة مع {n}", // note: health wording; {n} is a count of professionals
  "Period reminder": "تذكير الحيض", // note: health wording
  "Before your next period is expected.": "قبل موعد حيضك التالي المتوقّع.", // note: health wording
  "How many days before": "كم يومًا قبله", // note: health wording
  "1 day before": "قبل يوم", // note: health wording; period reminder option, as the member branch
  "2 days before": "قبل يومين", // note: health wording
  "3 days before": "قبل 3 أيام", // note: health wording
  "Who can see your cycle": "من يمكنه رؤية دورتك", // note: health wording
  "The same switches are in Profile › Connected professionals.": "المفاتيح نفسها موجودة في الملف الشخصي › المختصون المتصلون.", // note: health wording
  "You haven't connected any professionals.": "لم تتصل بأي مختص بعد.", // note: health wording
  "Couldn't load your professionals.": "تعذّر تحميل المختصين لديك.", // note: health wording
  "Only the phase name, e.g. Luteal": "اسم المرحلة فقط، مثل الأصفرية", // note: health wording
  "Only 'Pregnant' and the week": "«حامل» والأسبوع فقط", // note: health wording

  // Same Arabic as the member and pro branches, which also hold these keys
  "On hormonal contraception": "على وسيلة منع حمل هرمونية", // note: health wording; phase state
  Pregnant: "حامل", // note: health wording; phase state
  "Not enough data": "لا تتوفر بيانات كافية", // note: health wording; phase state
  "Only you": "أنت فقط", // note: health wording
  "Find a professional": "ابحث عن مختص", // note: health wording
  "Shared, but no phase to show right now.": "مُشارَكة، لكن لا مرحلة لعرضها الآن.", // note: health wording; what a professional sees
  Break: "استراحة", // note: health wording; the pill pack break days

  // == Cycle · Pregnancy guidance labels (services/pregnancy/guidance.ts) ==
  "General guidance · your provider's advice comes first": "إرشادات عامة · نصيحة مقدّم الرعاية الصحية تأتي أولًا", // note: health wording; the line on every pregnancy card
  "Apply to my targets": "تطبيق على أهدافي", // note: health wording
  "Remove from my targets": "إزالة من أهدافي", // note: health wording
  "Applied · +{kcal} kcal a day is included in your target.": "تم التطبيق · أُضيفت +{kcal} سعرة يوميًا إلى هدفك.", // note: health wording
  "Stop exercising and contact your provider if you have": "توقّف عن التمرين وتواصل مع مقدّم الرعاية الصحية إذا كان لديك", // note: health wording; heading over a guidance list (the list stays English)
  "Get help right away if you have": "اطلب المساعدة فورًا إذا كان لديك", // note: health wording; heading over the urgent signs (the list stays English)
  Movements: "الحركات", // note: health wording; the kick counter
  Contractions: "الانقباضات", // note: health wording
  "Work it out from my last period": "احسبه من آخر دورة شهرية", // note: health wording
  "I know my due date": "أعرف موعد الولادة المتوقع", // note: health wording
  "First day of your last period": "أول يوم من آخر دورة شهرية", // note: health wording
  "Due date": "موعد الولادة المتوقع", // note: health wording
  "If you know your due date": "إن كنت تعرف موعد الولادة المتوقع", // note: health wording
  "Start tracking": "بدء التتبّع", // note: health wording
  "That date is too long ago for this pregnancy.": "هذا التاريخ بعيد جدًا بالنسبة إلى هذا الحمل.", // note: health wording
  "Due date: {date}": "موعد الولادة المتوقع: {date}", // note: health wording
  "Last period: about {date}": "آخر دورة شهرية: نحو {date}", // note: health wording
  "End pregnancy tracking": "إنهاء تتبّع الحمل", // note: health wording
  "My baby was born": "وُلد طفلي", // note: health wording; said flatly, as the English
  "I lost my pregnancy": "فقدت حملي", // note: health wording; as above
  "End tracking": "إنهاء التتبّع", // note: health wording
  "After birth": "بعد الولادة", // note: health wording
  "We're here when you're ready": "نحن هنا متى شئت", // note: health wording; after a loss; «متى شئت» needs no gender
  "Turn predictions back on": "إعادة تفعيل التقديرات", // note: health wording
  "Read the guidance": "قراءة الإرشادات", // note: health wording

  // == Cycle · Contraception guidance labels (services/contraception/guidance.ts) ==
  "Combined pill": "الحبة المركّبة", // note: health wording; method name; the saved value stays English
  "Progestin-only pill": "حبة البروجستين فقط", // note: health wording
  "Hormonal IUD": "اللولب الهرموني", // note: health wording
  "Copper IUD": "اللولب النحاسي", // note: health wording
  Implant: "الغرسة", // note: health wording
  Injection: "الحقنة", // note: health wording
  "Vaginal ring": "الحلقة المهبلية", // note: health wording
  Patch: "اللصقة", // note: health wording
  Condoms: "الواقي الذكري", // note: health wording
  "Something else": "شيء آخر", // note: health wording
  "Taken|contraception": "أُخذت", // note: health wording; a pill (حبة) outcome
  "Missed|contraception": "فائتة", // note: health wording
  "Late|contraception": "متأخرة", // note: health wording
  "Ring in|contraception": "إدخال الحلقة", // note: health wording
  "Ring out|contraception": "إزالة الحلقة", // note: health wording
  "Patch on|contraception": "وضع اللصقة", // note: health wording
  "Patch off|contraception": "نزع اللصقة", // note: health wording
  "Injection|contraception": "الحقنة", // note: health wording
  "Fitted|contraception": "التركيب", // note: health wording
  "Removed|contraception": "الإزالة", // note: health wording
  "Set up your method": "إعداد وسيلتك", // note: health wording
  "This pack": "هذه العلبة", // note: health wording
  "Active|pill pack": "فعّالة", // note: health wording; an active pill day, as "Active days" «الأيام الفعّالة»
  "Filled days are logged. Today has a ring around it.": "الأيام الممتلئة مسجّلة. اليوم محاط بدائرة.", // note: health wording
  "Not logged yet.": "لم يُسجَّل بعد.", // note: health wording
  "Missed a pill?": "فاتتك حبة؟", // note: health wording
  "Nothing logged yet.": "لم يُسجَّل شيء بعد.", // note: health wording
  "Next pack starts": "تبدأ العلبة التالية", // note: health wording
  "Take the ring out": "أزل الحلقة", // note: health wording
  "Put a new ring in": "أدخل حلقة جديدة", // note: health wording
  "Change your patch": "غيّر لصقتك", // note: health wording
  "Next injection due": "موعد الحقنة التالية", // note: health wording
  "{n} days ago (overdue)": { zero: "منذ {n} يوم (متأخر)", one: "منذ يوم (متأخر)", two: "منذ يومين (متأخر)", few: "منذ {n} أيام (متأخر)", many: "منذ {n} يومًا (متأخر)", other: "منذ {n} يوم (متأخر)" }, // note: health wording
  "In {n} days": { zero: "بعد {n} يوم", one: "بعد يوم", two: "بعد يومين", few: "بعد {n} أيام", many: "بعد {n} يومًا", other: "بعد {n} يوم" }, // note: health wording
  "Daily pill reminder": "تذكير يومي بالحبة", // note: health wording
  "At the time you set, every day.": "في الوقت الذي تحدّده، كل يوم.", // note: health wording
  "Method reminders": "تذكيرات الوسيلة", // note: health wording
  "Ring changes, patch days, injections and replace-by dates.": "تغيير الحلقة وأيام اللصقة والحقن ومواعيد الاستبدال.", // note: health wording
  "Reminder time": "وقت التذكير", // note: health wording
  "Reminders arrive as notifications, so this device needs permission first.": "تصل التذكيرات كإشعارات، لذا يحتاج هذا الجهاز إلى إذن أولًا.", // note: health wording
  "Turn on notifications": "تفعيل الإشعارات", // note: health wording
  "This browser can't receive notifications, so reminders aren't available here.": "لا يستطيع هذا المتصفح تلقّي الإشعارات، لذا التذكيرات غير متاحة هنا.", // note: health wording
  "What the notification says": "ما يقوله الإشعار", // note: health wording
  Neutral: "محايد", // note: health wording
  Detailed: "مفصّل", // note: health wording
  "Reminders are sent at your local time in your time zone, set in Settings": "تُرسل التذكيرات بتوقيتك المحلي في منطقتك الزمنية المحدّدة في الإعدادات", // note: health wording
  "Change method": "تغيير الوسيلة", // note: health wording
  "Stop tracking this method": "إيقاف تتبّع هذه الوسيلة", // note: health wording
  "Stop tracking": "إيقاف التتبّع", // note: health wording
  "Your method": "وسيلتك", // note: health wording
  "Started {date}": "بدأت في {date}", // note: health wording
};

export default cycle;
