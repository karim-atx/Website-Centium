import type { Catalogue } from "../core";

// Round G (EH6), Arabic: Shared health service text (labs, blood pressure, cycle templates, metrics, health log).
// Source files this catalogue covers (paths from src/). The health screens
// pass these modules' messages through t(); the modules mark them with tk(),
// and the sentences with a number in them call t() with the number filled.
export const FILES: string[] = [
  "services/labs/index.ts",
  "services/labs/results.ts",
  "services/blood-pressure/index.ts",
  "services/cycle/index.ts",
  "services/health-metrics/goals.ts",
  "services/health-metrics/index.ts",
  "services/health-metrics/periods.ts",
  "services/health-log/offlineQueue.ts",
  "services/health-log/waterIntakes.ts",
];

// note (whole file): every term follows feat/eh-health: lab report «تقرير
// المختبر», lab results «نتائج المختبر», systolic «الانقباضي», diastolic
// «الانبساطي», pulse «النبض», mmHg «ملم زئبق», bpm «نبضة/د», cycle length
// «طول الدورة», period length «طول الحيض», luteal length «طول المرحلة
// الأصفرية», temperature «درجة الحرارة», L «ل», ml «مل». Day ranges read
// «بين {min} و{max} يومًا» (the upper bound is always 11 or more). The labs
// load error stays English inside the module: the professional's Biomarkers
// panel reads it; the screens translate it where they show it.
const sharedhealth: Catalogue = {
  // == Lab results (saving, removing, loading) ==
  "Your session expired. Sign in again to save these results.": "انتهت جلستك. سجّل الدخول مجددًا لحفظ هذه النتائج.",
  "Some of these results were out of the range this can store.": "بعض هذه النتائج خارج النطاق الذي يمكن حفظه.", // note: health (lab results)
  "Couldn't save these results. Check your connection and try again.": "تعذّر حفظ هذه النتائج. تحقّق من اتصالك وحاول مرة أخرى.",
  "Select at least one result to save.": "اختر نتيجة واحدة على الأقل لحفظها.",
  "That lab report couldn't be removed.": "تعذّرت إزالة تقرير المختبر هذا.",
  "Could not load your lab reports.": "تعذّر تحميل تقارير المختبر.",
  "Could not load your lab results.": "تعذّر تحميل نتائج المختبر.",
  "Couldn't save. Try again.": "تعذّر الحفظ. حاول مرة أخرى.",
  "Couldn't delete. Try again.": "تعذّر الحذف. حاول مرة أخرى.",
  "under {high}": "أقل من {high}", // note: health wording (a one-sided reference range)
  "above {low}": "أكثر من {low}", // note: health wording (a one-sided reference range)

  // == Blood pressure (checks before saving) ==
  "Your session expired. Sign in again to save this.": "انتهت جلستك. سجّل الدخول مجددًا لحفظ هذا.",
  "Systolic should be higher than diastolic.": "يجب أن يكون الانقباضي أعلى من الانبساطي.", // note: health wording
  "You don't have permission to save blood-pressure readings. Sign in again and try once more.": "ليس لديك إذن بحفظ قراءات ضغط الدم. سجّل الدخول مجددًا وحاول مرة أخرى.", // note: health
  "Couldn't save that. Check your connection and try again.": "تعذّر حفظ ذلك. تحقّق من اتصالك وحاول مرة أخرى.",
  "Enter whole numbers in mmHg.": "أدخل أعدادًا صحيحة بوحدة ملم زئبق.", // note: health wording
  "Systolic should be between {min} and {max} mmHg.": "يجب أن يكون الانقباضي بين {min} و{max} ملم زئبق.", // note: health wording; storage bounds, not clinical ones
  "Diastolic should be between {min} and {max} mmHg.": "يجب أن يكون الانبساطي بين {min} و{max} ملم زئبق.", // note: health wording; storage bounds, not clinical ones
  "Enter a whole number for pulse.": "أدخل عددًا صحيحًا للنبض.", // note: health wording
  "Pulse should be between {min} and {max} bpm.": "يجب أن يكون النبض بين {min} و{max} نبضة/د.", // note: health wording; storage bounds, not clinical ones
  "Choose which arm you measured.": "اختر الذراع التي قست عليها.", // note: health wording
  "Choose your position.": "اختر وضعيتك.", // note: health wording (sitting, standing or lying)
  "Keep the note under {n} characters.": "اجعل الملاحظة أقل من {n} حرف.",

  // == Cycle (settings and day log checks) ==
  "That value is outside the range this can store.": "هذه القيمة خارج النطاق الذي يمكن حفظه.",
  "You don't have permission to save this. Sign in again and try once more.": "ليس لديك إذن بحفظ هذا. سجّل الدخول مجددًا وحاول مرة أخرى.",
  "Cycle length should be between {min} and {max} days.": "يجب أن يكون طول الدورة بين {min} و{max} يومًا.", // note: health wording
  "Period length should be between {min} and {max} days.": "يجب أن يكون طول الحيض بين {min} و{max} يومًا.", // note: health wording
  "Luteal length should be between {min} and {max} days.": "يجب أن يكون طول المرحلة الأصفرية بين {min} و{max} يومًا.", // note: health wording
  "Choose {min} to {max} days before.": "اختر من {min} إلى {max} أيام قبله.", // note: health wording; the period reminder (1 to 3 days)
  "Energy should be between {min} and {max}.": "يجب أن تكون الطاقة بين {min} و{max}.", // note: health (the day log's energy level)
  "Temperature should be between {min} and {max} °C.": "يجب أن تكون درجة الحرارة بين {min} و{max} °C.", // note: health wording; basal body temperature, °C kept as written

  // == Metrics and goals ==
  "Couldn't save your goal. Try again.": "تعذّر حفظ هدفك. حاول مرة أخرى.",
  "Couldn't load your goals. Try again.": "تعذّر تحميل أهدافك. حاول مرة أخرى.",
  "That number is outside the range this can store.": "هذا الرقم خارج النطاق الذي يمكن حفظه.",
  "That doesn't look like a number.": "لا يبدو هذا رقمًا.",
  "Enter a value between {min} and {max} {unit}.": "أدخل قيمة بين {min} و{max} {unit}.", // note: health (weight in kg, water in ml)
  ml: "مل",
  Today: "اليوم",
  "Weekly average": "المتوسط الأسبوعي", // note: health
  "Monthly average": "المتوسط الشهري", // note: health
  "Yearly average": "المتوسط السنوي", // note: health
  "Week {n}": "الأسبوع {n}",
  "{n} readings": { zero: "لا قراءات", one: "قراءة واحدة", two: "قراءتان", few: "{n} قراءات", many: "{n} قراءة", other: "{n} قراءة" }, // note: health

  // == Health log (offline and water) ==
  "Will save when you're back online.": "سيُحفظ عندما يعود الاتصال.",
  "Saved on this device until you reconnect.": "حُفظ على هذا الجهاز إلى أن يعود الاتصال.",
  "That's more than 5 L today. Check the amount.": "هذا أكثر من 5 ل اليوم. تحقّق من الكمية.", // note: health (water intake cap)
};

export default sharedhealth;
