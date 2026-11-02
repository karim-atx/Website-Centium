import type { Catalogue } from "../core";

// Round G (EH2), Arabic: the cycle tracker, pregnancy and contraception screens.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. Clinical guidance
// (services/cycle/guidance.ts, services/pregnancy/guidance.ts,
// services/contraception/guidance.ts) stays English (F13).
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
  // == Cycle · Contraception ==
  "pages/contraception/Contraception.tsx",
  "components/contraception/MethodSetupSheet.tsx",
  "components/contraception/PillPack.tsx",
  "components/contraception/ReminderSettings.tsx",
  "services/contraception/index.ts",
  "services/contraception/schedule.ts",
];

// note (whole file): cycle «الدورة»; period in a sentence «الدورة الشهرية»,
// and the ring's short "Period" line reuses the existing «الحيض» (so "Period
// in" is «الحيض بعد»); phase «مرحلة»; fertile window «فترة الخصوبة»; flow
// «غزارة الدم»; trimester «الثلث» (of the pregnancy: «الثلث 2»); due date
// «موعد الولادة المتوقع»; contraction «انقباض»; kicks/movements «حركة»;
// contraception method «وسيلة»; pill pack «علبة»; ring «حلقة»; patch «لصقة»;
// injection «حقنة»; fitted (implant/IUD) «التركيب»; LH and pregnancy tests at
// home «اختبار» (not the lab «فحص»). The phase names, symptom/mood/flow option
// labels, button labels such as "Log this day" and every pregnancy and
// contraception sentence come from the guidance modules and stay English
// (F13), so several sentences here hold an English {phase} or {label}. The
// unit after a number ("28 d", "5 days") is a plural whose forms carry no
// number: «يوم / أيام / يومًا».
const cycle: Catalogue = {
  // == Cycle · Overview (the ring, chips and scrubber) ==
  "Period in": "الحيض بعد", // note: health wording; the ring's first line over "{n} days" ("Period" alone is the existing «الحيض»)
  "due|period": "متوقّع", // note: health wording; the ring's second line under "Period" (a period expected now)
  "{phase} phase.": "مرحلة {phase}.", // note: health wording; screen-reader sentence, {phase} is the English phase name from guidance
  "Cycle day {day} of about {length}. {date}. {phase} phase.": "اليوم {day} من الدورة من أصل {length} تقريبًا. {date}. مرحلة {phase}.", // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. Period, day {day}.": "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية، اليوم {day}.", // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. Period due. {phase} phase.": "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية متوقّعة. مرحلة {phase}.", // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. Period in {n} days. {phase} phase.": {
    zero: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد 0 أيام. مرحلة {phase}.",
    one: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد يوم واحد. مرحلة {phase}.",
    two: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد يومين. مرحلة {phase}.",
    few: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد {n} أيام. مرحلة {phase}.",
    many: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد {n} يومًا. مرحلة {phase}.",
    other: "اليوم {day} من الدورة من أصل {length} تقريبًا. الدورة الشهرية بعد {n} يوم. مرحلة {phase}.",
  }, // note: health wording; screen-reader sentence
  "Cycle day {day} of about {length}. {phase} phase.": "اليوم {day} من الدورة من أصل {length} تقريبًا. مرحلة {phase}.", // note: health wording; screen-reader sentence
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
    zero: "قبل 0 أيام",
    one: "قبل يوم واحد",
    two: "قبل يومين",
    few: "قبل {n} أيام",
    many: "قبل {n} يومًا",
    other: "قبل {n} يوم",
  }, // note: health wording; the scrubber, a day behind today in the cycle
  "Today · Day {n}": "اليوم · يوم {n}", // note: health wording; «يوم {n}» here rather than the shared «اليوم {n}», which would read «اليوم · اليوم 14»
  "Day {n} · {relative}": "يوم {n} · {relative}", // note: health wording; same as the line above
  "{phase}, {date}": "{phase}، {date}", // note: health wording; the scrubber's spoken value (recovery-sensitive mode)
  "Day {n}, {phase}, {date}": "اليوم {n}، {phase}، {date}", // note: health wording; the scrubber's spoken value
  "Cycle phases": "مراحل الدورة", // note: health wording
  "Move through the cycle": "التنقّل عبر الدورة", // note: health wording; the scrubber's name for screen readers
  "{title}, {disclaimer}. Day {n} marked": "{title}، {disclaimer}. اليوم {n} محدّد", // note: health wording; the hormone illustration; {title} and {disclaimer} stay English (guidance)
  Working: "جارٍ التنفيذ", // the spinner in a popup's confirm button

  // == Cycle · Insights ==
  d: { zero: "يوم", one: "يوم", two: "يوم", few: "أيام", many: "يومًا", other: "يوم" }, // note: health wording; the small unit after a cycle length ("28 d"), so the forms carry no number
  days: { zero: "يوم", one: "يوم", two: "يوم", few: "أيام", many: "يومًا", other: "يوم" }, // note: health wording; the unit after an average ("28 days"), forms without the number

  // == Cycle · Settings ==
  "Pregnancy tracking": "تتبّع الحمل", // note: health wording
  "Week {week} · day {day} · trimester {trimester}": "الأسبوع {week} · اليوم {day} · الثلث {trimester}", // note: health wording; trimester «الثلث» (of the pregnancy)
  "Decrease {label}": "إنقاص {label}", // note: health wording; {label} is the English setting name (cycle/period/luteal length, guidance)
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
  "{label} is still not shared with {name}. Set it again to retry.": "لا تزال مشاركة «{label}» مع {name} غير مفعّلة. اضبطها مجددًا لإعادة المحاولة.", // note: health wording; {label} is the English category name from guidance; «مشاركة» keeps the sentence free of the label's gender
  "{label} is still shared with {name}. Set it again to retry.": "لا تزال مشاركة «{label}» مع {name} مفعّلة. اضبطها مجددًا لإعادة المحاولة.", // note: health wording; as above
  "Share {label} with {name}": "مشاركة {label} مع {name}", // note: health wording; the switch's name for screen readers

  // == Cycle · Log a day ==
  "Save day": "حفظ اليوم", // note: health wording
  Flow: "غزارة الدم", // note: health wording; the option labels under it stay English (guidance FLOW_LABEL)
  "Count this as a period day": "احتساب هذا اليوم من أيام الدورة الشهرية", // note: health wording
  Symptoms: "الأعراض", // note: health wording; the option labels stay English (guidance SYMPTOM_LABEL)
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
  "{phase} phase · day {n}": "مرحلة {phase} · اليوم {n}", // note: health wording; {phase} stays English (guidance PHASE_LABEL)
  "{phase} phase": "مرحلة {phase}", // note: health wording; as above

  // == Cycle · Pregnancy overview ==
  "Week {n}": "الأسبوع {n}", // note: health wording; the pregnancy ring's headline
  "Day {day} · trimester {trimester}": "اليوم {day} · الثلث {trimester}", // note: health wording
  "Trimester {n}": "الثلث {n}", // note: health wording; the trimester bar
  "Log today": "تسجيل اليوم", // note: health wording
  "Guidance for week {n}": "إرشادات الأسبوع {n}", // note: health wording
  "This pregnancy has no start date recorded, so there's nothing to count from.": "لا يوجد تاريخ بداية مسجّل لهذا الحمل، لذا لا يوجد ما يُحتسب منه.", // note: health wording
  "These dates give a week that doesn't look right. Check the date you entered, or ask your provider for the dating from your scan.":
    "تعطي هذه التواريخ أسبوعًا لا يبدو صحيحًا. تحقّق من التاريخ الذي أدخلته، أو اطلب من مقدّم الرعاية الصحية تحديد عمر الحمل وفق صورتك الطبية.", // note: health wording; "provider" «مقدّم الرعاية الصحية», "scan" (pregnancy ultrasound) «صورتك الطبية» per the glossary
  "Due today": "موعد الولادة المتوقع اليوم", // note: health wording
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
  "Couldn't save that. Check your connection and try again.": "تعذّر الحفظ. تحقّق من اتصالك وحاول مرة أخرى.",

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
  Method: "الوسيلة", // note: health wording; contraception method
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
};

export default cycle;
