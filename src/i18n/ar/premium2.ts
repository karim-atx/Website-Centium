import type { Catalogue } from "../core";

// Round G2, Arabic: the free limits, the full export, Premium's perks (2x
// points, streak shields, Premium-only offers, early booking and waitlist
// priority) and the directory's calm limit line. Every entry is in
// design-handover/round-g/ARABIC_REVIEW_G.md for Karim's review before merge.
// note (whole file): Premium stays «Premium» / «Centium Premium» (brand), as
// in Round G1 (premium.ts). Terms as G1: the free plan «الخطة المجانية»;
// streak «سلسلة», a streak shield «درع السلسلة»; waitlist «قائمة الانتظار».

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "services/premium/g2.ts",
  "services/premium/g2Calls.ts",
  "services/premium/asks.ts",
  "services/directory/eg.ts",
  "components/premium/PremiumAskHost.tsx",
  "components/premium/useFreeLimit.ts",
  "components/premium/HistoryWindowLine.tsx",
  "components/premium/ExportDataRow.tsx",
  "components/premium/PointsPerks.tsx",
  "components/premium/StreakShields.tsx",
  "components/premium/OfferPremium.tsx",
  "components/premium/PremiumBooking.tsx",
];

const premium2: Catalogue = {
  // == The free limits (services/premium/g2, the prompt host) ==
  "Free plan": "الخطة المجانية",
  "OK": "حسنًا",
  "You've reached a free plan limit.": "وصلت إلى أحد حدود الخطة المجانية.",
  "You've reached the free plan's routines.": "وصلت إلى حد الروتينات في الخطة المجانية.",
  "You've reached the free plan's habits.": "وصلت إلى حد العادات في الخطة المجانية.",
  "You've reached the free plan's recipes.": "وصلت إلى حد الوصفات في الخطة المجانية.",
  "You've reached the free plan's locked folders.": "وصلت إلى حد المجلدات المقفلة في الخطة المجانية.",
  "You've used today's free barcode scans. You can still enter the food by hand.": "استخدمت عمليات مسح الباركود المجانية لهذا اليوم. ما زال بإمكانك إدخال الطعام يدويًا.",
  "The free plan keeps {n} routines of your own.": { zero: "تحتفظ الخطة المجانية بـ{n} روتين خاص بك.", one: "تحتفظ الخطة المجانية بروتين واحد خاص بك.", two: "تحتفظ الخطة المجانية بروتينين خاصين بك.", few: "تحتفظ الخطة المجانية بـ{n} روتينات خاصة بك.", many: "تحتفظ الخطة المجانية بـ{n} روتينًا خاصًا بك.", other: "تحتفظ الخطة المجانية بـ{n} روتين خاص بك." },
  "The free plan keeps {n} habits.": { zero: "تحتفظ الخطة المجانية بـ{n} عادة.", one: "تحتفظ الخطة المجانية بعادة واحدة.", two: "تحتفظ الخطة المجانية بعادتين.", few: "تحتفظ الخطة المجانية بـ{n} عادات.", many: "تحتفظ الخطة المجانية بـ{n} عادة.", other: "تحتفظ الخطة المجانية بـ{n} عادة." },
  "The free plan keeps {n} recipes.": { zero: "تحتفظ الخطة المجانية بـ{n} وصفة.", one: "تحتفظ الخطة المجانية بوصفة واحدة.", two: "تحتفظ الخطة المجانية بوصفتين.", few: "تحتفظ الخطة المجانية بـ{n} وصفات.", many: "تحتفظ الخطة المجانية بـ{n} وصفة.", other: "تحتفظ الخطة المجانية بـ{n} وصفة." },
  "The free plan keeps {n} locked journal folders.": { zero: "تحتفظ الخطة المجانية بـ{n} مجلد يوميات مقفل.", one: "تحتفظ الخطة المجانية بمجلد يوميات مقفل واحد.", two: "تحتفظ الخطة المجانية بمجلدَي يوميات مقفلين.", few: "تحتفظ الخطة المجانية بـ{n} مجلدات يوميات مقفلة.", many: "تحتفظ الخطة المجانية بـ{n} مجلدًا مقفلًا.", other: "تحتفظ الخطة المجانية بـ{n} مجلد يوميات مقفل." },
  "The free plan has {n} barcode scans a day.": { zero: "تتضمن الخطة المجانية {n} عملية مسح للباركود يوميًا.", one: "تتضمن الخطة المجانية مسحًا واحدًا للباركود يوميًا.", two: "تتضمن الخطة المجانية مسحين للباركود يوميًا.", few: "تتضمن الخطة المجانية {n} عمليات مسح للباركود يوميًا.", many: "تتضمن الخطة المجانية {n} عملية مسح للباركود يوميًا.", other: "تتضمن الخطة المجانية {n} عملية مسح للباركود يوميًا." },
  "{n} free scans left today": { zero: "بقيت {n} عملية مسح مجانية اليوم", one: "بقي مسح مجاني واحد اليوم", two: "بقي مسحان مجانيان اليوم", few: "بقيت {n} عمليات مسح مجانية اليوم", many: "بقيت {n} عملية مسح مجانية اليوم", other: "بقيت {n} عملية مسح مجانية اليوم" },

  // == 14 days of history (components/premium/HistoryWindowLine) ==
  "Showing from {date}. Older history comes with Premium.": "يُعرض من {date}. السجلّ الأقدم متاح مع Premium.",
  "Showing from {date}.": "يُعرض من {date}.",

  // == The full export (components/premium/ExportDataRow) ==
  "Download my data": "تنزيل بياناتي",
  "Preparing your data…": "جارٍ تجهيز بياناتك…",
  "Everything you've logged, as one file. Locked journal folders are included only while they're unlocked.": "كل ما سجّلته في ملف واحد. لا تُضمَّن مجلدات اليوميات المقفلة إلا وهي مفتوحة.",
  "Your data was saved as a file.": "حُفظت بياناتك في ملف.",
  "You can export 3 times a day. Try again tomorrow.": "يمكنك التصدير 3 مرات يوميًا. حاول مرة أخرى غدًا.",
  "Couldn't export your data. Try again.": "تعذّر تصدير بياناتك. حاول مرة أخرى.",

  // == 2x points (components/premium/PointsPerks) ==
  "2x with Premium": "نقاط مضاعفة مع Premium",
  "Premium members earn 2x points.": "يكسب أعضاء Premium ضعف النقاط.",

  // == Streak shields (components/premium/StreakShields) ==
  "{n} streak shields left this month": { zero: "بقي {n} درع سلسلة هذا الشهر", one: "بقي درع سلسلة واحد هذا الشهر", two: "بقي درعا سلسلة هذا الشهر", few: "بقيت {n} دروع سلسلة هذا الشهر", many: "بقي {n} درعًا للسلسلة هذا الشهر", other: "بقي {n} درع سلسلة هذا الشهر" },
  "A shield covered {day}: {streaks}": "غطّى درعٌ يوم {day}: {streaks}",
  "Logging": "التسجيل",
  "Movement": "الحركة",

  // == Premium-only offers (components/premium/OfferPremium, services/premium/features) ==
  "Premium members only": "لأعضاء Premium فقط",
  "Everyone sees the offer; only Premium members can redeem it.": "يرى الجميع العرض، ولا يستبدله إلا أعضاء Premium.",
  "Only the offer's owner can change this.": "لا يغيّر هذا إلا صاحب العرض.",
  "Premium-only offers": "عروض لأعضاء Premium فقط",
  "Premium lets you redeem the offers kept for Premium members.": "يتيح لك Premium استبدال العروض المخصّصة لأعضاء Premium.",

  // == Early booking and waitlist priority (components/premium/PremiumBooking) ==
  "Premium members": "أعضاء Premium",
  "Early booking": "الحجز المبكر",
  "Premium members can book this many days before everyone else.": "يمكن لأعضاء Premium الحجز قبل الجميع بهذا العدد من الأيام.",
  "Waitlist priority": "أولوية قائمة الانتظار",
  "Premium members on a waitlist are offered a spot first, then everyone in the order they joined.": "يُعرض المكان أولًا على أعضاء Premium في قائمة الانتظار، ثم على الجميع بترتيب انضمامهم.",
  "Premium members can book from {date}": "يمكن لأعضاء Premium الحجز من {date}",
  "Premium members are offered a spot first": "يُعرض المكان أولًا على أعضاء Premium",

  // == The directory's limit (services/premium/g2, EG) ==
  "The directory is busy for you right now. Try again in {n} minutes.": { zero: "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد {n} دقيقة.", one: "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد دقيقة.", two: "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد دقيقتين.", few: "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد {n} دقائق.", many: "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد {n} دقيقة.", other: "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد {n} دقيقة." },
  "The directory is busy for you right now. Try again in a few minutes.": "الدليل مشغول بطلباتك الآن. حاول مرة أخرى بعد بضع دقائق.",
};

export default premium2;
