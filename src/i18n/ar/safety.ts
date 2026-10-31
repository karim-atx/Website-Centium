import type { Catalogue } from "../core";

// Round F (DW/AB), Arabic: referrals pending, vouchers, own-business offers, reviews from established accounts and the first-message cap (AB1–AB3, AB7, AB8).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. Files that are still
// English elsewhere (Workout, Pro tools, Business: later rounds) keep their
// new sentences in a copy module listed here, so each new string has Arabic.
export const FILES: string[] = [
  "services/safety/model.ts",
  "hooks/useReviewOpensAt.ts",
  "components/reviews/ReviewWaitNote.tsx",
  "services/offers/voucherRules.ts",
  "components/pro/forms/nutritionTrendModel.ts",
  "components/pro/forms/NutritionCheckInTrend.tsx",
];

const safety: Catalogue = {
  // == Times (services/safety/model.ts whenLabel; "{date} at {time}" is messages') ==
  "today at {time}": "اليوم الساعة {time}",
  "tomorrow at {time}": "غدًا الساعة {time}",

  // == Reviews from established accounts (AB7: services/safety, components/reviews/ReviewWaitNote) ==
  "You can write reviews 7 days after joining Centium (from {date}).": "يمكنك كتابة التقييمات بعد 7 أيام من انضمامك إلى Centium (ابتداءً من {date}).",
  "You can write reviews 7 days after joining Centium.": "يمكنك كتابة التقييمات بعد 7 أيام من انضمامك إلى Centium.",
  "You can't review a business you work for.": "لا يمكنك تقييم نشاط تجاري تعمل فيه.", // note: write_business_review's ATX03, now write_gym_review's too (the owner or staff)
  "You can write up to 5 reviews a day. Try again tomorrow.": "يمكنك كتابة 5 تقييمات كحدّ أقصى في اليوم. حاول مجددًا غدًا.", // note: the professional-review limit, instead of the server's raw "Too many review_professional attempts…"

  // == First messages (AB8: services/safety, shown by services/messaging) ==
  "You've messaged a lot of new people today. You can keep talking with people you've already messaged, and start new conversations again {when}.":
    "راسلت اليوم عددًا كبيرًا من الأشخاص الجدد. يمكنك مواصلة الحديث مع من راسلتهم من قبل، وبدء محادثات جديدة مجددًا {when}.", // note: {when} is «اليوم الساعة …», «غدًا الساعة …» or a date; no number, since the cap is 10 a day, or 3 for a new account
  "You've messaged a lot of new people today. You can keep talking with people you've already messaged, and start new conversations again within a day.":
    "راسلت اليوم عددًا كبيرًا من الأشخاص الجدد. يمكنك مواصلة الحديث مع من راسلتهم من قبل، وبدء محادثات جديدة مجددًا خلال يوم.",

  // == Vouchers and insiders (AB2, AB3: services/offers/voucherRules, the offer page and the desk check) ==
  "Your points keep collecting in the meantime.": "تستمر نقاطك في التجمّع خلال ذلك.",
  "This is your business's offer. You can't redeem it.": "هذا عرض نشاطك التجاري. لا يمكنك استبداله.",
  "Your own voucher": "قسيمتك أنت",
  "Ask a colleague to check this voucher.": "اطلب من زميل التحقق من هذه القسيمة.",
  "New accounts can redeem rewards after 30 days. You can redeem from {date}.": "يمكن للحسابات الجديدة استبدال المكافآت بعد 30 يومًا. يمكنك الاستبدال ابتداءً من {date}.",
  "New accounts can redeem rewards after 30 days.": "يمكن للحسابات الجديدة استبدال المكافآت بعد 30 يومًا.",
  "You can redeem once you've earned points on {need} different days: {n} of {need} days with points so far.":
    "يمكنك الاستبدال بعد أن تكسب نقاطًا في {need} أيام مختلفة: {n} من {need} أيام بنقاط حتى الآن.", // note: {need} is 7, so «أيام» is right
  "You've redeemed {n} vouchers in the last 7 days. The next one frees {when}.": {
    zero: "لم تستبدل أي قسيمة في آخر 7 أيام. تتاح القسيمة التالية {when}.",
    one: "استبدلت قسيمة واحدة في آخر 7 أيام. تتاح القسيمة التالية {when}.",
    two: "استبدلت قسيمتين في آخر 7 أيام. تتاح القسيمة التالية {when}.",
    few: "استبدلت {n} قسائم في آخر 7 أيام. تتاح القسيمة التالية {when}.",
    many: "استبدلت {n} قسيمة في آخر 7 أيام. تتاح القسيمة التالية {when}.",
    other: "استبدلت {n} قسيمة في آخر 7 أيام. تتاح القسيمة التالية {when}.",
  }, // note: {n} is the weekly cap (3 today, a platform setting)
  "You've redeemed {n} vouchers in the last 7 days. Try again in a few days.": {
    zero: "لم تستبدل أي قسيمة في آخر 7 أيام. حاول مجددًا بعد أيام قليلة.",
    one: "استبدلت قسيمة واحدة في آخر 7 أيام. حاول مجددًا بعد أيام قليلة.",
    two: "استبدلت قسيمتين في آخر 7 أيام. حاول مجددًا بعد أيام قليلة.",
    few: "استبدلت {n} قسائم في آخر 7 أيام. حاول مجددًا بعد أيام قليلة.",
    many: "استبدلت {n} قسيمة في آخر 7 أيام. حاول مجددًا بعد أيام قليلة.",
    other: "استبدلت {n} قسيمة في آخر 7 أيام. حاول مجددًا بعد أيام قليلة.",
  },
  "You've reached this week's voucher limit. The next one frees {when}.": "بلغت الحدّ الأقصى للقسائم هذا الأسبوع. تتاح القسيمة التالية {when}.",
  "You've reached this week's voucher limit. Try again in a few days.": "بلغت الحدّ الأقصى للقسائم هذا الأسبوع. حاول مجددًا بعد أيام قليلة.",

  // == Referrals pending (AB1: services/redemption/referralLogic, listed by services) ==
  "{n} points per friend, once they're set up and active": "{n} نقطة عن كل صديق، بعد أن يُعدّ حسابه ويبدأ باستخدام Centium", // note: {n} is 1,500 or 2,000, so the singular noun after it is right
  "{n} points per colleague or client, once they're set up and active": "{n} نقطة عن كل زميل أو عميل، بعد أن يُعدّ حسابه ويبدأ باستخدام Centium",
  "Points arrive once your friend has set up their account and used Centium on 3 different days within 14 days of joining. Up to 10 friends a month earn points.":
    "تصلك النقاط بعد أن يُعدّ صديقك حسابه ويستخدم Centium في 3 أيام مختلفة خلال 14 يومًا من انضمامه. يكسبك ما يصل إلى 10 أصدقاء نقاطًا كل شهر.",
  "A friend": "صديق",
  "{name} · Pending until {date}": "{name} · قيد الانتظار حتى {date}",
  "{name} · Pending": "{name} · قيد الانتظار",
  "Waiting for them to finish setting up their account.": "بانتظار أن يُكمل إعداد حسابه.",
  "Waiting for them to use Centium on 3 different days.": "بانتظار أن يستخدم Centium في 3 أيام مختلفة.",
  "10 friends have earned you points this month. These points arrive next month.": "أكسبك 10 أصدقاء نقاطًا هذا الشهر. تصلك هذه النقاط الشهر المقبل.",
  "Code applied. Your friend gets {n} points once you've set up your account and used Centium on 3 different days.":
    "تم تطبيق الرمز. يحصل صديقك على {n} نقطة بعد أن تُعدّ حسابك وتستخدم Centium في 3 أيام مختلفة.", // note: {n} is 1,500 or 2,000
  "{n} friends joined": {
    zero: "لم ينضم أي صديق",
    one: "انضم صديق واحد",
    two: "انضم صديقان",
    few: "انضم {n} أصدقاء",
    many: "انضم {n} صديقًا",
    other: "انضم {n} صديق",
  },
  "{n} pending": "{n} قيد الانتظار",
  "{points} points earned": "{points} نقطة مكتسبة", // note: {points} is 1,500 or more in practice, so «نقطة» stays singular

  // == Weekly nutrition check-in trend (DW4: components/pro/forms/NutritionCheckInTrend) ==
  "Weekly nutrition check-in": "متابعة التغذية الأسبوعية",
  "Did {name} send it each week?": "هل أرسلها {name} كل أسبوع؟",
  "Check-ins submitted": "متابعات مُرسلة",
  "Check-ins missed": "متابعات فائتة",
  "Check-ins still due": "متابعات لم تُرسل بعد",
  "{n} submitted": { zero: "لم تُرسل أي متابعة", one: "أُرسلت متابعة واحدة", two: "أُرسلت متابعتان", few: "أُرسلت {n} متابعات", many: "أُرسلت {n} متابعة", other: "أُرسلت {n} متابعة" },
  "{n} missed": { zero: "لم تفت أي متابعة", one: "فاتت متابعة واحدة", two: "فاتت متابعتان", few: "فاتت {n} متابعات", many: "فاتت {n} متابعة", other: "فاتت {n} متابعة" },
  "{n} still due": { zero: "لا متابعات مستحقة", one: "متابعة واحدة مستحقة", two: "متابعتان مستحقتان", few: "{n} متابعات مستحقة", many: "{n} متابعة مستحقة", other: "{n} متابعة مستحقة" },
  "Week starting {date}": "الأسبوع الذي يبدأ في {date}",
  "Weekly nutrition check-in: {submitted} submitted and {missed} missed in the last {weeks} weeks.": "متابعة التغذية الأسبوعية: أُرسلت {submitted} وفاتت {missed} في آخر {weeks} أسبوعًا.", // note: {weeks} is 12
  "Drag sideways to scrub, tap a week to pin it": "اسحب جانبيًا للتنقّل، واضغط على أسبوع لتثبيته",
  "Trends start after two check-ins.": "تبدأ الاتجاهات بعد متابعتين.",
  "{name}'s own answer each week": "إجابة {name} نفسه كل أسبوع",
  "Answered {value} of {max}": "أجاب {value} من {max}",
};

export default safety;
