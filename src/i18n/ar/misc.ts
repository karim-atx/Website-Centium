import type { Catalogue } from "../core";

// Round G (EH3b), Arabic: the remaining member screens (the coach's programme
// on Workout, music cards, folders, hiring a professional, the ambassador
// application, the personal reminder, the promotion picker, recovery codes,
// the filter summary) and the profile badge's subtype.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area
// file, and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/workout/ProgrammeSection.tsx",
  "components/music/MusicSection.tsx",
  "components/music/PlaylistCard.tsx",
  "components/folders/FolderParts.tsx",
  "components/folders/folderList.ts",
  "components/promotions/PromotionUsedHost.tsx",
  "components/ambassador/AmbassadorApplySheet.tsx",
  "components/hire/HireSheet.tsx",
  "components/hire/YourHireCard.tsx",
  "components/reminders/PersonalReminderSheet.tsx",
  "components/security/recoveryCodesText.ts",
  "components/market/filterModel.ts",
];

// note (whole file): "hire" is «توظيف» as decided in Round F (a hire «توظيف»,
// "Cancel hire" «إلغاء التوظيف»); a hire plan is «خطة»; the ambassador
// programme is «السفراء» (main: "Ambassador" «سفير»); a promotion is «عرض
// ترويجي» as on the business side. {name} is the professional's first name
// and {plan} the plan's name (user data). The personal reminder quotes the
// server's notification; its Arabic wording there is the Database's.
const misc: Catalogue = {
  // == Workout › From your coach (programme card and week view) ==
  "Your programme needs a connection.": "يحتاج برنامجك إلى اتصال.",
  "Couldn't load your programme.": "تعذّر تحميل برنامجك.",
  "Week {n} of {total}": "الأسبوع {n} من {total}",
  Finished: "انتهى",
  "{n} workouts this week": {
    zero: "لا تمارين هذا الأسبوع",
    one: "تمرين واحد هذا الأسبوع",
    two: "تمرينان هذا الأسبوع",
    few: "{n} تمارين هذا الأسبوع",
    many: "{n} تمرينًا هذا الأسبوع",
    other: "{n} تمرين هذا الأسبوع",
  },
  "from {name}": "من {name}",
  "Your coach's playlist": "قائمة تشغيل مدرّبك",
  "Rest day. Next: {workout}, {day} {date}.": "يوم راحة. التالي: {workout}، {day} {date}.",
  "Nothing planned today.": "لا شيء مخطط اليوم.",
  "Week by week": "أسبوعًا بأسبوع",
  "You're offline. Some of your programme couldn't load.": "أنت غير متصل. تعذّر تحميل جزء من برنامجك.",
  "Some of your programme couldn't load.": "تعذّر تحميل جزء من برنامجك.",
  "~{n} min": "~{n} د",
  "No longer in your routines": "لم يعد ضمن روتيناتك",
  Weeks: "الأسابيع",
  "Week {n} · now": "الأسبوع {n} · الآن",
  "{n} workouts planned": {
    zero: "لا تمارين مخططة",
    one: "تمرين واحد مخطط",
    two: "تمرينان مخططان",
    few: "{n} تمارين مخططة",
    many: "{n} تمرينًا مخططًا",
    other: "{n} تمرين مخطط",
  },
  "Nothing scheduled.": "لا شيء مجدول.",
  "Today · {day} {date}": "اليوم · {day} {date}",

  // == Music (playlist card, Play your music) ==
  "Play in {service}": "تشغيل في {service}",
  "Play your music": "شغّل موسيقاك",
  "Opens {service}": "يفتح {service}",
  "Choose your music app in Settings": "اختر تطبيق الموسيقى في الإعدادات",

  // == Folders (routines and templates) ==
  "{n} templates": { zero: "لا قوالب", one: "قالب واحد", two: "قالبان", few: "{n} قوالب", many: "{n} قالبًا", other: "{n} قالب" },
  "{n} routines": { zero: "لا روتينات", one: "روتين واحد", two: "روتينان", few: "{n} روتينات", many: "{n} روتينًا", other: "{n} روتين" },
  "Drag {name}": "سحب {name}",

  // == Promotion used (after a payment is recorded, staff) ==
  "Promotion used? Record it on this payment.": "هل استُخدم عرض ترويجي؟ سجّله على هذه الدفعة.",
  "Promotion used": "العرض الترويجي المستخدم",
  Record: "تسجيل",
  "Optional. Pick the promotion this payment used. The price stays what you charged.": "اختياري. اختر العرض الترويجي الذي استُخدم في هذه الدفعة. يبقى السعر كما تقاضيته.",
  "Promotion recorded.": "سُجّل العرض الترويجي.",

  // == Apply to be an ambassador ==
  "Send application": "إرسال الطلب",
  "Ambassadors earn more for each friend who joins with their code. We review every application.": "يكسب السفراء أكثر عن كل صديق ينضم برمزهم. نراجع كل طلب.",
  "What you get": "ما تحصل عليه",
  "Who can apply": "من يمكنه التقديم",
  ", not yet": "، ليس بعد",
  "Why you'd like to be one": "لماذا تودّ أن تصبح سفيرًا",
  "Where you share (optional)": "أين تشارك (اختياري)",
  "Instagram, TikTok, a blog…": "Instagram أو TikTok أو مدوّنة…",
  "I agree to the": "أوافق على",
  "Ambassador terms": "شروط السفراء",

  // == Hire a professional (the hire sheet) ==
  "You already have {plan} with {name}.": "لديك {plan} مع {name} بالفعل.",
  "That plan isn't on offer any more. Choose from {name}'s current plans.": "لم تعد هذه الخطة معروضة. اختر من خطط {name} الحالية.",
  "Not available under 18": "غير متاح لمن هم دون 18 عامًا",
  "Not taking new clients": "لا يقبل عملاء جددًا",
  "No plans yet": "لا خطط بعد",
  "{name} hasn't set up any plans to hire. Send a request to work together, or message them.": "لم يُعدّ {name} أي خطط للتوظيف بعد. أرسل طلبًا للعمل معًا، أو راسله.",
  "{name} hasn't set up any plans to hire. Message them to ask about working together.": "لم يُعدّ {name} أي خطط للتوظيف بعد. راسله لتسأله عن العمل معًا.",
  "Not taking requests right now": "لا يقبل طلبات حاليًا",
  "Send a request": "إرسال طلب",
  "Choose a plan {name} offers": "اختر خطة يقدّمها {name}",
  "Already hired": "موظَّف بالفعل",
  "Choose {name}": "اختيار {name}",
  "Send {name} a request instead": "أرسل طلبًا إلى {name} بدلًا من ذلك",
  "Your request to {name} is waiting for an answer.": "طلبك إلى {name} بانتظار الرد.",
  "{name} can accept your request or message you about it.": "يمكن لـ{name} قبول طلبك أو مراسلتك بشأنه.",
  "No particular plan": "بلا خطة محددة",
  "Ask {name} to work with you. Nothing is shared until you choose to share it.": "اطلب من {name} العمل معك. لا يُشارك أي شيء حتى تختار مشاركته.",
  "Plan (optional)": "الخطة (اختيارية)",
  "Message (optional)": "رسالة (اختيارية)",
  "What would you like to work on with {name}?": "على ماذا تودّ العمل مع {name}؟",
  "Centium doesn't take the payment. Your hire stays Pending payment until {name} confirms they've been paid, and you can cancel for free until then.":
    "لا يتقاضى Centium الدفعة. يبقى توظيفك «بانتظار الدفع» حتى يؤكّد {name} أنه قبض المبلغ، ويمكنك الإلغاء مجانًا حتى ذلك الحين.",

  // == Your plan (the hire card on a professional's Services tab) ==
  "Pay {name} in person.": "ادفع لـ{name} شخصيًا.",
  "Pay them in person.": "ادفع له شخصيًا.",
  "Your hire becomes active once they confirm they've been paid.": "يصبح توظيفك نشطًا بعد أن يؤكّد أنه قبض المبلغ.",
  "Cancel hire": "إلغاء التوظيف",
  "Cancel this hire?": "إلغاء هذا التوظيف؟",

  // == Hire states and refusals (services/hires) ==
  "Active|hire": "نشط",
  "Accounts under 18 can't hire a professional.": "لا يمكن للحسابات دون 18 عامًا توظيف مختص.",
  "That plan isn't available any more.": "لم تعد هذه الخطة متاحة.",
  "You can't hire yourself.": "لا يمكنك توظيف نفسك.",
  "You already have a plan with this professional. Cancel it before choosing another.": "لديك خطة مع هذا المختص بالفعل. ألغها قبل اختيار خطة أخرى.",
  "This professional is not taking new clients right now.": "لا يقبل هذا المختص عملاء جددًا حاليًا.",
  "Couldn't complete the hire. Try again.": "تعذّر إتمام التوظيف. حاول مرة أخرى.",
  "This hire has already been cancelled.": "أُلغي هذا التوظيف بالفعل.",
  "Couldn't cancel the hire. Try again.": "تعذّر إلغاء التوظيف. حاول مرة أخرى.",
  "{name} hasn't confirmed a payment yet, so cancelling is free.": "لم يؤكّد {name} أي دفعة بعد، لذا الإلغاء مجاني.",
  "The professional hasn't confirmed a payment yet, so cancelling is free.": "لم يؤكّد المختص أي دفعة بعد، لذا الإلغاء مجاني.",
  "You agreed to {plan} at {price}, and {name} has confirmed your payment. Centium records the cancellation only; anything already paid is between you and them.":
    "اتفقت على {plan} بسعر {price}، وأكّد {name} دفعتك. يسجّل Centium الإلغاء فقط؛ وأي مبلغ دُفع بالفعل يبقى بينك وبينه.",
  "You agreed to {plan} at {price}, and The professional has confirmed your payment. Centium records the cancellation only; anything already paid is between you and them.":
    "اتفقت على {plan} بسعر {price}، وأكّد المختص دفعتك. يسجّل Centium الإلغاء فقط؛ وأي مبلغ دُفع بالفعل يبقى بينك وبينه.",
  "Hire cancelled. No payment had been confirmed, so there's nothing to settle.": "أُلغي التوظيف. لم تُؤكَّد أي دفعة، فلا شيء لتسويته.",
  "Hire cancelled. Centium has recorded it; anything already paid is between you and {name}.": "أُلغي التوظيف. سجّله Centium؛ وأي مبلغ دُفع بالفعل يبقى بينك وبين {name}.",
  "Hire cancelled. Centium has recorded it; anything already paid is between you and the professional.": "أُلغي التوظيف. سجّله Centium؛ وأي مبلغ دُفع بالفعل يبقى بينك وبين المختص.",

  // == Personal reminder ==
  "Personal reminder": "تذكير شخصي",
  "Remind me every": "ذكّرني كل",
  "Next reminder on": "التذكير التالي في",
  "Reminder on": "التذكير مفعّل",
  // note: quotes the server's push text («لديك تذكير اليوم»); the Database writes its own Arabic, so check the two match
  'Arrives as a notification from 9:00 AM in your timezone, reading "You have a reminder today". Turn on notifications in Settings to receive it.':
    "يصلك إشعار ابتداءً من الساعة 9:00 صباحًا بتوقيتك، نصّه «لديك تذكير اليوم». فعّل الإشعارات في الإعدادات لتصلك.",

  // == Recovery codes (the downloaded file) ==
  "Centium recovery codes": "رموز الاسترداد في Centium",
  "Each code signs you in once if you lose your phone. Keep them somewhere safe.": "يسجّل كل رمز دخولك مرة واحدة إن فقدت هاتفك. احتفظ بها في مكان آمن.",

  // == A professional's profile › Where (the workplace role, ROLE_LABEL through t(); same Arabic as the business catalogues) ==
  Manager: "مدير",
  "Shop assistant": "مساعد متجر",

  // == Profile › the account badge's subtype ==
  "general|customer type": "عام",
  "client|customer type": "عميل",
  "regular|customer type": "منتظم",
  "athlete|customer type": "رياضي",
};

export default misc;
