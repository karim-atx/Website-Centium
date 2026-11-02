import type { Catalogue } from "../core";

// Round G (EH3), Arabic: Member home, profile and calendar.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area
// file, and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/home/Home.tsx",
  "components/dashboard/CalendarPickerSheet.tsx",
  "components/dashboard/DateSelector.tsx",
  "components/dashboard/HomeWidget.tsx",
  "components/dashboard/NoDeviceSheet.tsx",
  "components/dashboard/QuickActions.tsx",
  "components/dashboard/StreaksBar.tsx",
  "components/dashboard/WidgetBoard.tsx",
  "components/dashboard/WidgetShell.tsx",
  "components/dashboard/widgets/kit.tsx",
  "components/dashboard/widgets/CycleWidget.tsx",
  "components/dashboard/widgets/HabitsWidget.tsx",
  "components/dashboard/widgets/HeartRateWidget.tsx",
  "components/dashboard/widgets/JournalWidget.tsx",
  "components/dashboard/widgets/MeditationWidget.tsx",
  "components/dashboard/widgets/SleepWidget.tsx",
  "components/dashboard/widgets/StepsWidget.tsx",
  "components/dashboard/widgets/WeightWidget.tsx",
  "components/dashboard/widgets/WorkoutWidget.tsx",
  "components/profile/ActivityLevelSheet.tsx",
  "components/profile/GoalsEditSheet.tsx",
  "components/profile/TwoFactorNudge.tsx",
  "components/profile/ProfessionalBioCard.tsx",
  "components/profile/DobPromptCard.tsx",
  "components/profile/NameSharingCard.tsx",
  "components/profile/ProfessionalCodeCard.tsx",
  "components/profile/CertificationSheet.tsx",
  "components/calendar/RepeatScopePopup.tsx",
  "components/calendar/EventComposeSheet.tsx",
  "components/calendar/EventDetailSheet.tsx",
  "components/calendar/YearScroll.tsx",
  "components/calendar/eventAlert.ts",
  "components/calendar/inviteLines.ts",
  "components/profile/MembershipsCard.tsx",
  "components/profile/ReferralPopup.tsx",
  "components/profile/CredentialsPopup.tsx",
  "components/profile/MapAreaSection.tsx",
  "pages/profile/Profile.tsx",
  "pages/profile/More.tsx",
  "pages/profile/ClientCalendarTab.tsx",
];

// note (whole file): the Home board's names follow the app's sections (Food
// «الطعام», Workout «التمرين», Mind «العقل», Journal «اليوميات»). A widget is
// «أداة» on the board ("Add widget" «إضافة أداة»); a streak is «سلسلة» and
// "day streak" beside a number reads «أيام متتالية» (plural forms by the
// count). Units follow the number: «ل» litres, «مل», «كغ», «غ», «كم», and
// calories «سعرة» as on the landing page. Short sleep and time figures
// «7 س 05 د». Screen-reader sentences use «،» between their parts. Health
// figures (cycle, heart rate, sleep, weight) keep the English's neutral,
// non-diagnostic wording; every such row carries a note. Data from the
// database (routine names, habit names, muscle groups) stays as written.
const member: Catalogue = {
  // == Home ==
  "You're in a recovery-sensitive experience": "أنت في التجربة المراعية للتعافي", // note: health (recovery-sensitive mode), keep the app's name for it
  "Calorie totals, weight, and streaks are hidden. You can turn this off anytime in your Profile. Nothing you've logged is ever lost.":
    "مجاميع السعرات والوزن والسلاسل مخفية. يمكنك إيقاف ذلك متى شئت من ملفك الشخصي. لا يضيع شيء مما سجّلته.", // note: health (recovery-sensitive mode)
  Dismiss: "إغلاق",
  Streaks: "السلاسل",
  "{name} on Centium": "{name} على Centium",
  "Business tools are an early preview": "أدوات الأنشطة التجارية معاينة مبكرة",
  "Connect with a professional": "تواصل مع مختص",
  "Dietitians, trainers, doctors & more": "أخصائيو تغذية ومدرّبون وأطباء والمزيد",

  // == Home: date pill and date picker ==
  "Previous day": "اليوم السابق",
  "Next day": "اليوم التالي",
  "Previous month": "الشهر السابق",
  "Next month": "الشهر التالي",

  // == Home: streaks board ==
  "Change plant species": "تغيير نوع النبتة",
  "day streak": { zero: "يوم متتالٍ", one: "يوم متتالٍ", two: "يومان متتاليان", few: "أيام متتالية", many: "يومًا متتاليًا", other: "يوم متتالٍ" },
  "{n} of 4 goals done today": "{n} من 4 أهداف أُنجزت اليوم",
  "Nothing to share yet. Start a streak first.": "لا شيء للمشاركة بعد. ابدأ سلسلة أولًا.",

  // == Home: quick actions ==
  "Quick actions": "إجراءات سريعة",
  "Log food": "تسجيل طعام",
  "Log workout": "تسجيل تمرين",
  "Tell Centium what you ate": "أخبر Centium بما أكلت",
  "Add metric": "إضافة قياس",

  // == Home: the widget board ==
  "Small or large": "صغيرة أو كبيرة",
  "{widget} widget size": "حجم أداة {widget}",
  Small: "صغيرة",
  Large: "كبيرة",
  "S|widget size": "ص", // note: the first letter of «صغيرة» on the size chip
  "L|widget size": "ك", // note: the first letter of «كبيرة» on the size chip
  "Add widget": "إضافة أداة",
  "Add a widget": "إضافة أداة",
  "All available widgets are already on your board.": "كل الأدوات المتاحة موجودة على لوحتك.",
  "Resize widget": "تغيير حجم الأداة",
  "Remove widget": "إزالة الأداة",
  "Drag to reorder": "اسحب لإعادة الترتيب",
  Offline: "غير متصل",
  "Updated {time}": "حُدّث {time}",
  "Offline · updated {time}": "غير متصل · حُدّث {time}",

  // == Home: Water and Food widgets ==
  "{n} L": "{n} ل",
  "of {n} L": "من {n} ل",
  "{n} L to go": "تبقّى {n} ل",
  "Goal reached!": "بلغت هدفك!",
  Goal: "الهدف",
  "Add {n} ml of water": "إضافة {n} مل من الماء",
  "+{n} ml": "+{n} مل",
  "Nothing logged yet today": "لم تسجّل شيئًا اليوم بعد", // note: recovery-sensitive Food summary, no calories
  "{n} items logged today": {
    zero: "لم يُسجَّل شيء اليوم",
    one: "سُجّل عنصر واحد اليوم",
    two: "سُجّل عنصران اليوم",
    few: "سُجّلت {n} عناصر اليوم",
    many: "سُجّل {n} عنصرًا اليوم",
    other: "سُجّل {n} عنصر اليوم",
  },
  "Meals, notes, and how you're feeling, no calorie counting required.": "الوجبات والملاحظات وشعورك، من دون حساب السعرات.", // note: health (recovery-sensitive mode)
  "of {n} kcal": "من {n} سعرة",
  "{n} kcal left": "متبقٍّ {n} سعرة",
  "{consumed} / {target}g": "{consumed} / {target} غ",

  // == Home: Steps, Sleep, Heart rate and Weight widgets ==
  "No readings yet": "لا قراءات بعد",
  "Connect a source": "اربط مصدرًا",
  "Nothing synced today": "لم تتم مزامنة شيء اليوم",
  "Connect Apple Health or Health Connect": "اربط Apple Health أو Health Connect",
  "Steps, no readings yet. {hint}": "الخطوات، لا قراءات بعد. {hint}",
  "Steps, {steps} today, {pct}% of {goal}": "الخطوات، {steps} اليوم، {pct}% من {goal}",
  "Steps, {steps} that day, {pct}% of {goal}": "الخطوات، {steps} في ذلك اليوم، {pct}% من {goal}",
  "{pct}% of goal": "{pct}% من الهدف",
  "of {goal} · {km} km": "من {goal} · {km} كم",
  "Goal reached": "بلغت الهدف",
  "{n} to go": "تبقّى {n}",
  "{pct}% of {goal}": "{pct}% من {goal}",
  "No sleep recorded last night": "لم يُسجَّل نوم الليلة الماضية", // note: health
  "Connect a source to see your sleep": "اربط مصدرًا لترى نومك", // note: health
  "Sleep, no readings yet. {hint}": "النوم، لا قراءات بعد. {hint}", // note: health
  "{h}h {m}m": "{h} س {m} د",
  Awake: "يقظة", // note: health (sleep stage)
  REM: "REM", // note: health (sleep stage); the usual abbreviation, kept in Latin letters
  Deep: "عميق", // note: health (sleep stage)
  "Same as last wk": "مثل الأسبوع الماضي", // note: health (sleep trend)
  "{arrow} {h} h vs last wk": "{arrow} {h} س مقارنة بالأسبوع الماضي", // note: health (sleep trend)
  "up {h} h vs last wk": "أكثر بـ{h} س من الأسبوع الماضي", // note: health (sleep trend, screen reader)
  "down {h} h vs last wk": "أقل بـ{h} س من الأسبوع الماضي", // note: health (sleep trend, screen reader)
  "Score {score}": "النتيجة {score}", // note: health (the sleep score the source reports)
  "score {score}": "النتيجة {score}", // note: health
  "Sleep, {value}": "النوم، {value}", // note: health
  "Connect a source to see your heart rate": "اربط مصدرًا لترى نبضك", // note: health
  "Heart rate": "معدل النبض", // note: health
  "Heart rate, no readings yet. {hint}": "معدل النبض، لا قراءات بعد. {hint}", // note: health
  "Resting|heart rate": "أثناء الراحة", // note: health (resting heart rate)
  Latest: "الأحدث", // note: health (the latest reading)
  "{low} to {high}": "{low} إلى {high}", // note: health (heart rate range)
  "{low} to {high} today": "{low} إلى {high} اليوم", // note: health (heart rate range)
  "Heart rate {bpm} bpm, {word}": "معدل النبض {bpm} نبضة/د، {word}", // note: health
  "Heart rate {bpm} bpm, {word}, {range}": "معدل النبض {bpm} نبضة/د، {word}، {range}", // note: health
  bpm: "نبضة/د", // note: health (beats per minute, as short as the English)
  "Low {n}": "الأدنى {n}", // note: health
  "High {n}": "الأعلى {n}", // note: health
  "Range|heart rate": "النطاق", // note: health
  "Range today|heart rate": "نطاق اليوم", // note: health
  "Log your weight": "سجّل وزنك", // note: health
  "Log your weight to start tracking": "سجّل وزنك لتبدأ المتابعة", // note: health
  "Goal {n}": "الهدف {n}", // note: health (goal weight)
  "goal {n}": "الهدف {n}", // note: health (goal weight)
  "No change in {n} weigh-ins": {
    zero: "لا تغيير",
    one: "لا تغيير في وزنة واحدة",
    two: "لا تغيير في وزنتين",
    few: "لا تغيير في {n} وزنات",
    many: "لا تغيير في {n} وزنة",
    other: "لا تغيير في {n} وزنة",
  }, // note: health
  "{arrow} {kg} kg in {n} weigh-ins": {
    zero: "{arrow} {kg} كغ",
    one: "{arrow} {kg} كغ في وزنة واحدة",
    two: "{arrow} {kg} كغ في وزنتين",
    few: "{arrow} {kg} كغ في {n} وزنات",
    many: "{arrow} {kg} كغ في {n} وزنة",
    other: "{arrow} {kg} كغ في {n} وزنة",
  }, // note: health
  "At your goal": "بلغت هدفك", // note: health (goal weight)
  "{kg} kg to goal": "{kg} كغ حتى الهدف", // note: health (goal weight)
  "Weight, {value} kilograms": "الوزن، {value} كيلوغرام", // note: health
  "goal {kg} kilograms": "الهدف {kg} كيلوغرام", // note: health

  // == Home: No device connected ==
  "Steps, sleep and heart rate come from Apple Health or Health Connect on your phone. Syncing from the Centium phone app is coming.":
    "تأتي الخطوات والنوم ومعدل النبض من Apple Health أو Health Connect على هاتفك. المزامنة من تطبيق Centium على الهاتف قادمة.",
  "See devices and sources": "عرض الأجهزة والمصادر",
  "Got it": "حسنًا",

  // == Home: Habits, Journal and Meditation widgets ==
  "No habits yet": "لا عادات بعد",
  "Add a habit": "إضافة عادة",
  "Add a habit to see it here": "أضف عادة لتراها هنا",
  "Habits, no habits yet. Add a habit": "العادات، لا عادات بعد. أضف عادة",
  "All done today": "أنجزتها كلها اليوم",
  "habits done today": "عادات أُنجزت اليوم",
  "Habits, {count} of {total} done today": "العادات، أُنجز {count} من {total} اليوم",
  "of {n}": "من {n}",
  "{count} of {total} today": "{count} من {total} اليوم",
  "Habits page {page} of {pages}": "صفحة العادات {page} من {pages}",
  "Not done": "لم تُنجز",
  "For more habits, swipe.": "اسحب لترى المزيد من العادات.",
  "Write your first": "اكتب أول إدخال",
  "Write your first entry": "اكتب أول إدخال لك",
  "Write your first entry to start a streak": "اكتب أول إدخال لتبدأ سلسلة",
  "Journal, no entries yet. Write your first": "اليوميات، لا إدخالات بعد. اكتب أول إدخال",
  "{n} words this week": {
    zero: "لا كلمات هذا الأسبوع",
    one: "كلمة واحدة هذا الأسبوع",
    two: "كلمتان هذا الأسبوع",
    few: "{n} كلمات هذا الأسبوع",
    many: "{n} كلمة هذا الأسبوع",
    other: "{n} كلمة هذا الأسبوع",
  },
  "Journal, written today, {words}": "اليوميات، كتبت اليوم، {words}",
  "Journal, not written today, {words}": "اليوميات، لم تكتب اليوم، {words}",
  "Journal, {streak}, {words}": "اليوميات، {streak}، {words}",
  "Journal, {streak}, {words}, written today": "اليوميات، {streak}، {words}، كتبت اليوم",
  Written: "كتبت",
  "Not yet": "ليس بعد",
  today: "اليوم",
  "Written today": "كتبت اليوم",
  "Not written today": "لم تكتب اليوم",
  "No sessions this week": "لا جلسات هذا الأسبوع",
  "Start a session": "ابدأ جلسة",
  "Meditation, no sessions this week. Start a session": "التأمل، لا جلسات هذا الأسبوع. ابدأ جلسة",
  "{n} sessions this week": {
    zero: "لا جلسات هذا الأسبوع",
    one: "جلسة واحدة هذا الأسبوع",
    two: "جلستان هذا الأسبوع",
    few: "{n} جلسات هذا الأسبوع",
    many: "{n} جلسة هذا الأسبوع",
    other: "{n} جلسة هذا الأسبوع",
  },
  "Meditation, {minutes} minutes today, {sessions}": "التأمل، {minutes} دقيقة اليوم، {sessions}",
  "min today": "دقيقة اليوم",
  "{n} min this week": {
    zero: "0 دقيقة هذا الأسبوع",
    one: "دقيقة واحدة هذا الأسبوع",
    two: "دقيقتان هذا الأسبوع",
    few: "{n} دقائق هذا الأسبوع",
    many: "{n} دقيقة هذا الأسبوع",
    other: "{n} دقيقة هذا الأسبوع",
  },

  // == Home: Workout widget ==
  "No workout planned": "لا تمرين مخطط",
  "Pick a routine": "اختر روتينًا",
  "Pick a routine to start this week": "اختر روتينًا لتبدأ هذا الأسبوع",
  Pick: "اختيار",
  "Workout, no workout planned. Pick a routine": "التمرين، لا تمرين مخطط. اختر روتينًا",
  "Workout, no workout planned. Pick a routine to start this week": "التمرين، لا تمرين مخطط. اختر روتينًا لتبدأ هذا الأسبوع",
  "Next: {name} · {day}": "التالي: {name} · {day}",
  "Workout, rest day. {next}": "التمرين، يوم راحة. {next}",
  "Workout, {name}, {line}": "التمرين، {name}، {line}",
  "Workout, {name}, done, {line}": "التمرين، {name}، تم، {line}",
  "Done today": "تم اليوم",
  "Workout, {name}, {line}, {done} of {n} exercises": {
    zero: "التمرين، {name}، {line}، {done} من 0 تمارين",
    one: "التمرين، {name}، {line}، {done} من تمرين واحد",
    two: "التمرين، {name}، {line}، {done} من تمرينين",
    few: "التمرين، {name}، {line}، {done} من {n} تمارين",
    many: "التمرين، {name}، {line}، {done} من {n} تمرينًا",
    other: "التمرين، {name}، {line}، {done} من {n} تمرين",
  },
  "Workout, {name}, done today, {line}, {done} of {n} exercises": {
    zero: "التمرين، {name}، تم اليوم، {line}، {done} من 0 تمارين",
    one: "التمرين، {name}، تم اليوم، {line}، {done} من تمرين واحد",
    two: "التمرين، {name}، تم اليوم، {line}، {done} من تمرينين",
    few: "التمرين، {name}، تم اليوم، {line}، {done} من {n} تمارين",
    many: "التمرين، {name}، تم اليوم، {line}، {done} من {n} تمرينًا",
    other: "التمرين، {name}، تم اليوم، {line}، {done} من {n} تمرين",
  },
  "Open {name}": "فتح {name}",
  "Resume {name}": "استئناف {name}",
  "Start {name}": "بدء {name}",

  // == Home: Cycle widget ==
  "Cycle, loading": "الدورة، جارٍ التحميل", // note: health (cycle)
  "Cycle, couldn't update, tap to retry": "الدورة، تعذّر التحديث، انقر لإعادة المحاولة", // note: health (cycle)
  "Cycle, you're offline": "الدورة، أنت غير متصل", // note: health (cycle)
  "Cycle, set up cycle tracking": "الدورة، إعداد تتبّع الدورة", // note: health (cycle)
  "Cycle, {phase}, countdown hidden": "الدورة، {phase}، العدّ التنازلي مخفي", // note: health (cycle)
  "Cycle, period, day {day}": "الدورة، الحيض، اليوم {day}", // note: health (cycle)
  "Cycle, period, day {day}, period likely ends {date}, estimate": "الدورة، الحيض، اليوم {day}، يُرجّح أن ينتهي الحيض {date}، تقدير", // note: health (cycle), an estimate as in the English
  "Cycle, day {day}, {phase}, {countdown}, estimate": "الدورة، اليوم {day}، {phase}، {countdown}، تقدير", // note: health (cycle)
  "Cycle, day {day}, not enough data yet": "الدورة، اليوم {day}، لا تتوفر بيانات كافية بعد", // note: health (cycle)
  "Cycle, not enough data yet": "الدورة، لا تتوفر بيانات كافية بعد", // note: health (cycle)
  "Cycle, on hormonal contraception": "الدورة، على وسيلة منع حمل هرمونية", // note: health (cycle)
  "Cycle, pregnant": "الدورة، حامل", // note: health (pregnancy)
  "week {n}": "الأسبوع {n}", // note: health (pregnancy week)
  "trimester {n}": "الثلث {n}", // note: health (pregnancy trimester)
  "Period due": "موعد الحيض الآن", // note: health (cycle estimate)
  "Period in {n} days": {
    zero: "موعد الحيض الآن",
    one: "الحيض بعد يوم واحد",
    two: "الحيض بعد يومين",
    few: "الحيض بعد {n} أيام",
    many: "الحيض بعد {n} يومًا",
    other: "الحيض بعد {n} يوم",
  }, // note: health (cycle estimate)
  "Follicular phase": "المرحلة الجُرَيبية", // note: health (cycle phase)
  "Ovulation phase": "مرحلة الإباضة", // note: health (cycle phase)
  "Luteal phase": "المرحلة الأصفرية", // note: health (cycle phase)
  "On hormonal contraception": "على وسيلة منع حمل هرمونية", // note: health (cycle)
  Pregnant: "حامل", // note: health (pregnancy)
  "Not enough data": "لا تتوفر بيانات كافية", // note: health (cycle)
  "Not enough data yet": "لا تتوفر بيانات كافية بعد", // note: health (cycle)
  Day: "اليوم", // note: health (cycle day, on the ring)
  Week: "الأسبوع", // note: health (pregnancy week, on the ring)
  "Day {n}": "اليوم {n}", // note: health (cycle day)
  "Phase only": "المرحلة فقط", // note: health (recovery-sensitive mode hides the countdown)
  Estimate: "تقدير", // note: health (every predicted date carries it)
  "Log your period to see an estimate": "سجّل حيضك لترى تقديرًا", // note: health (cycle)
  "Trimester {n}": "الثلث {n}", // note: health (pregnancy trimester)
  "Set up cycle tracking": "إعداد تتبّع الدورة", // note: health (cycle)
  "Period · Day {n}": "الحيض · اليوم {n}", // note: health (cycle)
  "Pregnant · week {n}": "حامل · الأسبوع {n}", // note: health (pregnancy)
  "Next period · {date}": "الحيض التالي · {date}", // note: health (cycle estimate)
  "Period likely ends · {date}": "يُرجّح أن ينتهي الحيض · {date}", // note: health (cycle estimate)
  "Countdown hidden": "العدّ التنازلي مخفي", // note: health (recovery-sensitive mode)
  "Log 2 periods for an estimate": "سجّل دورتين للحصول على تقدير", // note: health (cycle)
  "No period estimate while on hormonal contraception": "لا تقدير للحيض أثناء استخدام وسيلة منع حمل هرمونية", // note: health (cycle)
  "Add your last period and usual cycle length.": "أضف آخر حيض وطول دورتك المعتاد.", // note: health (cycle)
  "Set up ›": "إعداد ‹", // note: the arrow points the reading way
  "+ Log": "+ تسجيل",
  "Logged · predicted": "مسجّل · متوقع", // note: health (cycle strip legend)

  // == Profile: goals and activity level ==
  "Edit Goals": "تعديل الأهداف",
  "Save goals": "حفظ الأهداف",
  "Improve my nutrition": "تحسين تغذيتي",
  "Improve my overall health": "تحسين صحتي العامة",
  "Track my health": "تتبّع صحتي",
  "Live healthier": "العيش بصحة أفضل",
  "Activity Level": "مستوى النشاط",
  Sedentary: "قليل الحركة",
  "Little to no exercise": "تمارين قليلة أو معدومة",
  "Lightly active": "نشاط خفيف",
  "1–3 workouts a week": "1–3 تمارين في الأسبوع",
  "Moderately active": "نشاط معتدل",
  "3–5 workouts a week": "3–5 تمارين في الأسبوع",
  "Very active": "نشاط عالٍ",
  "6–7 workouts a week": "6–7 تمارين في الأسبوع",
  "Structured training daily": "تدريب منظّم يوميًا",

  // == Profile: date of birth, two-factor, name and progress sharing ==
  "It keeps your age, calorie targets and health suggestions right. Check it before saving; to change it later, contact support.":
    "يُبقي عمرك وأهداف السعرات والاقتراحات الصحية صحيحة. تحقّق منه قبل الحفظ؛ ولتغييره لاحقًا تواصل مع الدعم.",
  "Add an extra layer of security": "أضف طبقة حماية إضافية",
  "Turn on two-factor authentication so a password alone can't sign in to your account.":
    "فعّل التحقق بخطوتين كي لا تكفي كلمة المرور وحدها لتسجيل الدخول إلى حسابك.",
  "Set it up": "إعداده",
  "Dismiss this reminder": "إغلاق هذا التذكير",
  "A gym or studio": "نادٍ أو استوديو",
  "Gyms and studios see your member number unless you choose to show your first name.":
    "ترى النوادي والاستوديوهات رقم عضويتك ما لم تختر إظهار اسمك الأول.",
  "Sees your first name": "يرى اسمك الأول",
  "Sees you as Member #{number}": "يراك بصفتك العضو #{number}",
  "Show my first name to {name}": "إظهار اسمي الأول لـ{name}",
  "Your progress": "تقدّمك",
  "Let a gym or studio count your progress in its group reports. It only sees totals for groups of 5 or more, never your own figures or whether you're included.":
    "اسمح لنادٍ أو استوديو باحتساب تقدّمك في تقارير مجموعاته. لا يرى إلا المجاميع لمجموعات من 5 أشخاص أو أكثر، ولا يرى أرقامك أبدًا ولا إن كنت مشمولًا.",
  "Counted in their group reports": "محتسب في تقارير مجموعاته",
  "Not shared": "غير مُشارَك",
  "Count my progress in {name}'s group reports": "احتساب تقدّمي في تقارير مجموعات {name}",

  // == Profile: connect with a professional ==
  "You're connected with {name}. Nothing is shared until you turn it on.": "أنت الآن على تواصل مع {name}. لا يُشارَك شيء حتى تفعّله.",
  "Connect with {name}?": "التواصل مع {name}؟",
  "Connect with this professional?": "التواصل مع هذا المختص؟",
  "They'll see that you're their client. Nothing else is shared until you turn it on.": "سيرى أنك عميله. لا يُشارَك شيء آخر حتى تفعّله.",
  Connect: "تواصل",
  "Professional code": "رمز المختص",
  "Got a code from a trainer, dietitian or doctor? Enter it here to connect and start sharing data.":
    "لديك رمز من مدرّب أو أخصائي تغذية أو طبيب؟ أدخله هنا للتواصل وبدء مشاركة البيانات.",

  // == Profile: bio and certification (professionals) ==
  Bio: "النبذة",
  "This will appear to clients on your Explore listing, and to clients you're connected to.": "ستظهر للعملاء في صفحتك على «استكشف»، وللعملاء الذين تتواصل معهم.",
  "Our team checks it and clients see a Verified badge once it's approved.": "يراجعها فريقنا، ويرى العملاء شارة «موثّق» بعد اعتمادها.",
  "This copy is only saved on this device. Upload it again to store it on your account.": "هذه النسخة محفوظة على هذا الجهاز فقط. ارفعها مجددًا لحفظها في حسابك.",
  "No certification uploaded yet.": "لم تُرفع أي شهادة بعد.",
  "You're signed out. Sign in again to upload.": "تم تسجيل خروجك. سجّل الدخول مجددًا للرفع.",
  "You're signed out.": "تم تسجيل خروجك.",
  "Couldn't remove your certification.": "تعذّرت إزالة شهادتك.",
  "This is the first licence on your CV. Add its name and issuer, and any other licences, in More › Edit public profile.":
    "هذه أول رخصة في سيرتك الذاتية. أضف اسمها وجهة إصدارها، وأي رخص أخرى، من المزيد › تعديل الملف العام.",

  // == Calendar: repeating events ==
  "Delete a repeating event": "حذف حدث متكرر",
  "Change a repeating event": "تغيير حدث متكرر",
  "Which events do you want to delete?": "ما الأحداث التي تريد حذفها؟",
  "Which events should these changes apply to?": "على أي أحداث تُطبَّق هذه التغييرات؟",
  "Delete which events": "حذف أي أحداث",
  "Apply changes to": "تطبيق التغييرات على",
  "Delete this event only": "حذف هذا الحدث فقط",
  "Delete this and following": "حذف هذا الحدث والأحداث التالية",
  "Delete all events": "حذف كل الأحداث",
  "This event only": "هذا الحدث فقط",
  "This and following events": "هذا الحدث والأحداث التالية",
  "All events": "كل الأحداث",

  // == Calendar ==
  Calendar: "التقويم",
  "New event": "حدث جديد",
  "Year|calendar view": "سنة",
  "Month|calendar view": "شهر",
  "Week|calendar view": "أسبوع",
  "Day|calendar view": "يوم",
  "Previous week": "الأسبوع السابق",
  "Next week": "الأسبوع التالي",
  "No events": "لا أحداث",
  Invitations: "الدعوات",
  Invitation: "دعوة",
  Going: "سأحضر",
  Accept: "قبول",
  "All day": "طوال اليوم",
  "repeats daily": "يتكرر يوميًا",
  "repeats weekly": "يتكرر أسبوعيًا",
  "repeats monthly": "يتكرر شهريًا",
  "Repeats daily": "يتكرر يوميًا",
  "Repeats weekly": "يتكرر أسبوعيًا",
  "Repeats monthly": "يتكرر شهريًا",
  "Scheduled by your coach": "جدوله مدرّبك",
  Booked: "محجوز",
  "Booked with {name}": "محجوز لدى {name}",
  "Added by a booking": "أُضيف من حجز",
  "To change or cancel it, change the booking.": "لتغييره أو إلغائه، غيّر الحجز.",
  "Open attachment": "فتح المرفق",
  "Open link, {link}": "فتح الرابط، {link}",
  "{name} is no longer listed on Explore. Your booking still stands.": "لم يعد {name} معروضًا في «استكشف». حجزك ما زال قائمًا.",
  "{name} (no longer on Explore)": "{name} (لم يعد في «استكشف»)",
  "{date}, open in Day view": "{date}، افتحه في عرض اليوم",
  "Couldn't load your calendar.": "تعذّر تحميل تقويمك.",
  "Couldn't save your changes. Try again.": "تعذّر حفظ تغييراتك. حاول مرة أخرى.",
  "Couldn't delete that event. Try again.": "تعذّر حذف هذا الحدث. حاول مرة أخرى.",
  "Couldn't delete that event.": "تعذّر حذف هذا الحدث.",
  "Couldn't save your reminder. Try again.": "تعذّر حفظ تذكيرك. حاول مرة أخرى.",
  "Couldn't save your response. Try again.": "تعذّر حفظ ردّك. حاول مرة أخرى.",
  "Session playlist": "قائمة تشغيل الجلسة",
  "View booking": "عرض الحجز",
  "Rate this class": "تقييم هذه الحصة",
  "Your reminder": "تذكيرك",
  "Your reminder, {value}": "تذكيرك، {value}",
  "{month}, {n} days with events": {
    zero: "{month}، لا أيام فيها أحداث",
    one: "{month}، يوم واحد فيه أحداث",
    two: "{month}، يومان فيهما أحداث",
    few: "{month}، {n} أيام فيها أحداث",
    many: "{month}، {n} يومًا فيها أحداث",
    other: "{month}، {n} يوم فيها أحداث",
  },

  // == Calendar: a professional's session invitation ==
  "5 min": "5 دقائق", // note: a reminder offset, read after «قبل» ("5 min before" «قبل 5 دقائق»)
  "10 min": "10 دقائق",
  "15 min": "15 دقيقة",
  "30 min": "30 دقيقة",
  "1 h": "ساعة", // note: read after «قبل»: «قبل ساعة»
  "2 h": "ساعتين", // note: read after «قبل»: «قبل ساعتين»
  "1 day": "يوم", // note: read after «قبل»: «قبل يوم»
  "2 days": "يومين", // note: read after «قبل»: «قبل يومين»
  "{a} before": "قبل {a}",
  "{a} and {b} before": "قبل {a} و{b}",
  "at the start": "عند البدء",
  "{a} and {b}": "{a} و{b}",
  "{name} reminds you {phrase}": "يذكّرك {name} {phrase}",
  "Reminder {phrase} · from {name}": "تذكير {phrase} · من {name}",
  "Reminders {phrase} · from {name}": "تذكيران {phrase} · من {name}",
  "{price} from your session pack · {n} left": "{price} من باقة جلساتك · متبقٍّ {n}",
  "From your session pack · {n} left": "من باقة جلساتك · متبقٍّ {n}",

  // == Calendar: new and edit event ==
  "New Event": "حدث جديد",
  "Edit Event": "تعديل الحدث",
  "Doctor's appointment": "موعد الطبيب",
  "Clinic, gym, video call…": "عيادة، نادٍ، مكالمة فيديو…",
  "Date, {date}": "التاريخ، {date}",
  "{label}, {time}": "{label}، {time}",
  Color: "اللون",
  "Color {c}": "اللون {c}",
  Never: "أبدًا",
  Daily: "يوميًا",
  Weekly: "أسبوعيًا",
  "Repeat, {value}": "التكرار، {value}",
  Alert: "التنبيه",
  "Alert, {value}": "التنبيه، {value}",
  "At time of event": "عند وقت الحدث",
  "1 day before": "قبل يوم",
  "2 days before": "قبل يومين",
  "Repeat ends": "نهاية التكرار",
  "Repeat ends, {date}": "نهاية التكرار، {date}",
  "Repeat ends, never": "نهاية التكرار، أبدًا",
  "On {date}": "في {date}",
  "On a date": "في تاريخ",
  "Anything else to remember…": "أي شيء آخر تريد تذكّره…",
  "Add a link": "إضافة رابط",
  "Links need to be a web address (http or https).": "يجب أن يكون الرابط عنوان ويب (http أو https).",
  "Save changes": "حفظ التغييرات",
  "Save event": "حفظ الحدث",
  "Delete event": "حذف الحدث",

  // == More ==
  "Habits, journal & meditation": "العادات واليوميات والتأمل",
  "Trainers, dietitians & doctors": "مدرّبون وأخصائيو تغذية وأطباء",
  "Forum discussions & fitness courses": "نقاشات المنتدى ودورات اللياقة",
  "Gyms, classes & the marketplace": "النوادي والحصص والسوق",
  "Your account & settings": "حسابك وإعداداتك",
  "Your events, synced with your professional & gym": "أحداثك، متزامنة مع مختصك وناديك",
  "Chat with your professionals": "تحدّث مع مختصيك",
  Referral: "الإحالة",
  "Share your code, earn rewards": "شارك رمزك واكسب المكافآت",
  "Appearance, notifications & more": "المظهر والإشعارات والمزيد",
  "AI logging, deeper insights & rewards": "تسجيل بالذكاء الاصطناعي ورؤى أعمق ومكافآت",

  // == Profile ==
  "My Profile": "ملفي الشخصي",
  Customer: "عميل",
  "Centium Ambassador": "سفير Centium",
  "Change profile picture": "تغيير صورة الملف الشخصي",
  "Weight, {n} kg. Edit": "الوزن، {n} كغ. تعديل", // note: health
  "Sex, {sex}. Edit": "الجنس، {sex}. تعديل",
  "Height, {n} cm. Edit": "الطول، {n} سم. تعديل",
  "Age, {n}. Date of birth": "العمر، {n}. تاريخ الميلاد",
  sex: "الجنس",
  years: "سنة",
  "My orders": "طلباتي",
  "My appointments": "مواعيدي",
  "Connected professionals": "المختصون المتصلون",
  "Manage data sharing": "إدارة مشاركة البيانات",
  "Connect with a professional code": "التواصل برمز مختص",
  "Training plan": "خطة التدريب",
  Goals: "الأهداف",
  "Safety & content": "الأمان والمحتوى",
  "Personalize food tracking to reduce number-focused and potentially triggering content. Numbers like calories, weight and streaks are hidden, and you can change this at any time.":
    "خصّص تتبّع الطعام لتقليل المحتوى المركّز على الأرقام والذي قد يثير الانزعاج. تُخفى أرقام مثل السعرات والوزن والسلاسل، ويمكنك تغيير ذلك متى شئت.", // note: health (recovery-sensitive mode)
  "Your experience has been updated: calorie totals, weight-related content, deficit language, and streaks are hidden. Meal logging can focus on meals, notes, feelings, and hunger/fullness instead.":
    "حُدّثت تجربتك: أُخفيت مجاميع السعرات والمحتوى المتعلق بالوزن ولغة العجز والسلاسل. يمكن أن يركّز تسجيل الوجبات بدلًا من ذلك على الوجبات والملاحظات والمشاعر والجوع والشبع.", // note: health (recovery-sensitive mode)
  "Saved to your account, so it's the same on every device you sign in on. Professionals you work with are never told whether it's on.":
    "يُحفظ في حسابك، فيبقى نفسه على كل جهاز تسجّل الدخول منه. لا يُبلَّغ المختصون الذين تعمل معهم أبدًا إن كان مفعّلًا.", // note: health (privacy of recovery-sensitive mode)
  "This isn't clinical care. If tracking feels unhelpful right now, consider discussing it with a": "هذا ليس رعاية سريرية. إن شعرت أن التتبّع غير مفيد الآن، ففكّر في مناقشة ذلك مع", // note: health; the link word «مختص» follows
  professional: "مختص",
  "Sign Out": "تسجيل الخروج",
  "Sign out?": "تسجيل الخروج؟",
  "You can sign back in at any time.": "يمكنك تسجيل الدخول مجددًا في أي وقت.",
  "Sign out anyway": "تسجيل الخروج على أي حال",
  "Used to estimate your calorie needs and to suggest which health checks may be relevant.": "يُستخدم لتقدير احتياجك من السعرات ولاقتراح الفحوص الصحية التي قد تناسبك.", // note: health
  "Used for your calorie targets, and shown to any professional you share weight with.": "يُستخدم لأهداف السعرات، ويُعرض لأي مختص تشارك معه وزنك.", // note: health
  "Used for your calorie targets and health recommendations.": "يُستخدم لأهداف السعرات والتوصيات الصحية.", // note: health
  "Your age is calculated from this, and is used for calorie targets and health recommendations. A date of birth can't be changed once it's saved.":
    "يُحسب عمرك منه، ويُستخدم لأهداف السعرات والتوصيات الصحية. لا يمكن تغيير تاريخ الميلاد بعد حفظه.",
  "Your age is calculated from this, and is used for calorie targets and health recommendations. Check it before saving; to change it later, contact support.":
    "يُحسب عمرك منه، ويُستخدم لأهداف السعرات والتوصيات الصحية. تحقّق منه قبل الحفظ؛ ولتغييره لاحقًا تواصل مع الدعم.",
  "Need to correct it?": "تحتاج إلى تصحيحه؟",
  "Contact support": "التواصل مع الدعم",
  "Data sharing": "مشاركة البيانات",
  "Couldn't remove your picture.": "تعذّرت إزالة صورتك.",
  "Could not save that. Try again.": "تعذّر حفظ ذلك. حاول مرة أخرى.",

  // == Profile: credentials ==
  "Couldn't save your phone number.": "تعذّر حفظ رقم هاتفك.",
  "Phone number": "رقم الهاتف",
  Social: "التواصل الاجتماعي",
  "Instagram handle": "حساب Instagram",
  "X handle": "حساب X",
  "Couldn't load your Instagram and X. Close and open Credentials to try again.": "تعذّر تحميل حسابَي Instagram وX. أغلق «بيانات الدخول» وافتحها لتحاول مجددًا.",
  "Your phone number, Instagram and X are saved to your account. Only professionals you're connected with can see your Instagram and X.":
    "يُحفظ رقم هاتفك وحسابا Instagram وX في حسابك. لا يرى حسابَي Instagram وX إلا المختصون الذين تتواصل معهم.",
  nickname: "الاسم المستعار",
  "Forum nickname": "الاسم المستعار في المنتدى",
  "Shown on your Community posts and replies.": "يظهر على منشوراتك وردودك في المجتمع.",

  // == Profile: map area (professionals) ==
  "Show my area on the map": "إظهار منطقتي على الخريطة",
  "Clients see you near {area}. Only an approximate area (about 1 km) is shown, never your address.": "يراك العملاء قرب {area}. لا تظهر إلا منطقة تقريبية (نحو 1 كم)، وليس عنوانك أبدًا.",
  "Clients see you near your chosen area. Only an approximate area (about 1 km) is shown, never your address.": "يراك العملاء قرب المنطقة التي اخترتها. لا تظهر إلا منطقة تقريبية (نحو 1 كم)، وليس عنوانك أبدًا.",
  "Off. Clients can still find you in the list. Only an approximate area (about 1 km) is ever shown.": "متوقف. لا يزال بإمكان العملاء إيجادك في القائمة. لا تظهر إلا منطقة تقريبية (نحو 1 كم).",
  "Change area": "تغيير المنطقة",
  "Choose your area by": "اختيار منطقتك عبر",
  "Pick from list": "الاختيار من القائمة",
  "Drop a pin": "وضع دبوس",
  "Tap the map near where you work. It's saved to about 1 km.": "انقر على الخريطة قرب مكان عملك. يُحفظ بدقة نحو 1 كم.",
  "Map for choosing your area. Tap to drop a pin, or pick from the list instead.": "خريطة لاختيار منطقتك. انقر لوضع دبوس، أو اختر من القائمة بدلًا من ذلك.",
  "Use this area": "استخدام هذه المنطقة",
  "Use this area (near {area})": "استخدام هذه المنطقة (قرب {area})",
  "Tap the map first": "انقر على الخريطة أولًا",

  // == Profile: memberships ==
  "Couldn't load your memberships.": "تعذّر تحميل عضوياتك.",
  "Member code": "رمز العضوية",
  "Check code": "التحقق من الرمز",
  "A business": "نشاط تجاري",
  "Invited {date}": "دُعيت في {date}",
  "Options for this membership": "خيارات هذه العضوية",
  "Got a code from a gym or studio? Enter it and check what it comes with before you join.": "لديك رمز من نادٍ أو استوديو؟ أدخله وتحقّق مما يتضمنه قبل الانضمام.",
  "{name}. Press left arrow for End membership": "{name}. اضغط السهم الأيسر لإنهاء العضوية",
  "Check what the code comes with before you join.": "تحقّق مما يتضمنه الرمز قبل الانضمام.",
  "Join another gym or studio": "الانضمام إلى نادٍ أو استوديو آخر",
  "End it today instead (your pass stops now)": "إنهاؤها اليوم بدلًا من ذلك (تتوقف بطاقتك الآن)",
  "Keep membership": "الإبقاء على العضوية",
  "End this membership?": "إنهاء هذه العضوية؟",
  "You'll stop being a member of {name}.": "لن تبقى عضوًا في {name}.",
  "You'll stop being a member of this business.": "لن تبقى عضوًا في هذا النشاط التجاري.",
  "Your membership at {gym} ends today.": "تنتهي عضويتك في {gym} اليوم.",
  "Your membership at this gym ends today.": "تنتهي عضويتك في هذا النادي اليوم.",

  // == Profile: referrals ==
  "Join me on Centium with my referral code {code}.": "انضم إليّ على Centium برمز الإحالة الخاص بي {code}.",
  "Refer a colleague": "إحالة زميل",
  "Invite friends": "دعوة الأصدقاء",
  Ambassador: "سفير",
  "Clients and colleagues can both use your code.": "يمكن للعملاء والزملاء استخدام رمزك.",
  "Points count toward your tier. Rewards for points are coming soon.": "تُحتسب النقاط ضمن مستواك. مكافآت النقاط قريبًا.",
  "Your code": "رمزك",
  "Getting your code…": "جارٍ إحضار رمزك…",
  "Get my code": "الحصول على رمزي",
  Unavailable: "غير متاح",
  "Share code": "مشاركة الرمز",
  "See points history": "عرض سجل النقاط",
  "Share Centium often?": "تشارك Centium كثيرًا؟",
  "Apply to be an ambassador": "قدّم لتصبح سفيرًا",
  "Have a code?": "لديك رمز؟",
  "Applying…": "جارٍ التطبيق…",
  "Enter a code": "أدخل رمزًا",
  "A friend's referral code": "رمز إحالة من صديق",
  Apply: "تطبيق",
};

export default member;
