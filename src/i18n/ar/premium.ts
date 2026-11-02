import type { Catalogue } from "../core";

// Round G1, Arabic: Premium, the Premium passes, business plan levels and
// hiring credits. Every entry is in design-handover/round-g/ARABIC_REVIEW_G.md
// for Karim's review before merge.
// note (whole file): Premium stays «Premium» / «Centium Premium» (brand); plan
// names (Base, Starter) stay Latin as elsewhere. Terms: hiring credit «رصيد
// توظيف» (plural «أرصدة»), a Premium pass «تصريح Premium»; seat block
// «حزمة مقاعد», venue «مكان», verification «التحقق», professional «مختص»,
// business «نشاط تجاري». The App Store / Google Play and Apple / Google names
// stay Latin.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "services/premium/model.ts",
  "services/premium/features.ts",
  "services/premium/index.ts",
  "components/premium/BuyInApp.tsx",
  "components/premium/PremiumBadge.tsx",
  "components/premium/PremiumStatusCard.tsx",
  "components/premium/PremiumPrompt.tsx",
  "components/premium/usePremiumPrompt.tsx",
  "components/premium/PremiumFeatureList.tsx",
  "components/premium/GymPremiumSetting.tsx",
  "components/premium/BusinessPlanLevels.tsx",
  "components/premium/BusinessPlanHomeCard.tsx",
  "components/premium/HiringCreditsCard.tsx",
  "pages/pro/more/PremiumPasses.tsx",
  "pages/onboarding/client/TrialOfferStep.tsx",
];

const premium: Catalogue = {
  // == Buy in the Centium app (components/premium/BuyInApp) ==
  "Buy in the Centium app": "اشترِ من تطبيق Centium",
  "{monthly} a month or {yearly} a year": "{monthly} شهريًا أو {yearly} سنويًا",
  "{one} for 1 hiring credit, {three} for 3": "{one} لرصيد توظيف واحد، {three} لثلاثة",
  "The {n}-day free trial and billing are handled by Apple or Google.": "تتولّى Apple أو Google التجربة المجانية لمدة {n} أيام والفوترة.", // note: {n} is 7 today (premium_trial_days)
  "The free trial and billing are handled by Apple or Google.": "تتولّى Apple أو Google التجربة المجانية والفوترة.",
  "Billing is handled by Apple or Google.": "تتولّى Apple أو Google الفوترة.",

  // == The prompt sheet and the gate (components/premium/PremiumPrompt) ==
  "Centium Premium": "Centium Premium",
  "Part of Centium Premium": "جزء من Centium Premium",
  "See Premium": "عرض Premium",

  // == Premium features and free limits (services/premium/features) ==
  "Your full history in charts": "سجلّك الكامل في الرسوم البيانية",
  "Unlimited barcode scans": "مسح غير محدود للباركود",
  "Unlimited routines": "روتينات غير محدودة",
  "Unlimited habits": "عادات غير محدودة",
  "Unlimited recipes": "وصفات غير محدودة",
  "More locked journal folders": "مجلدات يوميات مقفلة أكثر",
  "The full meditation library": "مكتبة التأمل كاملة",
  "Every week of Centium programmes": "كل أسابيع برامج Centium",
  "Journal prompts": "مواضيع للكتابة في اليوميات",
  "Online food search": "البحث عن الأطعمة عبر الإنترنت",
  "Lab report scanning": "مسح تقارير المختبر",
  "Report comparison": "مقارنة التقارير",
  "Biomarker trends": "اتجاهات المؤشرات الحيوية", // note: health wording, neutral
  "A summary for your doctor": "ملخّص لطبيبك", // note: health wording, neutral and non-diagnostic
  "AI voice food logging": "تسجيل الطعام بالصوت بالذكاء الاصطناعي",
  "Premium shows your charts over your whole history, not just the last few weeks.": "يعرض Premium رسومك البيانية على امتداد سجلّك كله، لا الأسابيع القليلة الأخيرة فقط.",
  "Premium lets you scan as many barcodes as you like.": "يتيح لك Premium مسح ما تشاء من الباركود.",
  "Premium lets you save as many of your own routines as you like.": "يتيح لك Premium حفظ ما تشاء من روتيناتك.",
  "Premium lets you track as many habits as you like.": "يتيح لك Premium تتبّع ما تشاء من العادات.",
  "Premium lets you save as many recipes as you like.": "يتيح لك Premium حفظ ما تشاء من الوصفات.",
  "Premium lets you lock as many journal folders as you like.": "يتيح لك Premium قفل ما تشاء من مجلدات اليوميات.",
  "Premium opens every meditation in the library.": "يفتح لك Premium كل جلسات التأمل في المكتبة.",
  "Premium opens every week of the programme, not just the first.": "يفتح لك Premium كل أسابيع البرنامج، لا الأسبوع الأول فقط.",
  "Premium gives you a prompt to write about each day.": "يقدّم لك Premium موضوعًا تكتب عنه كل يوم.",
  "Premium searches online food databases when a food isn't in Centium.": "يبحث Premium في قواعد بيانات الأطعمة عبر الإنترنت حين لا يكون الطعام في Centium.",
  "Premium reads your lab report from a photo, so you don't type each value.": "يقرأ Premium تقرير المختبر من صورة، فلا تكتب كل قيمة بنفسك.", // note: health wording
  "Premium puts two lab reports side by side.": "يضع Premium تقريرَي مختبر جنبًا إلى جنب.", // note: health wording
  "Premium shows how each marker has changed over time.": "يعرض Premium كيف تغيّر كل مؤشر مع الوقت.", // note: health wording, neutral
  "Premium makes a summary of your records to share with your doctor.": "يُعدّ Premium ملخّصًا لسجلاتك تشاركه مع طبيبك.", // note: health wording, non-diagnostic
  "Premium lets you log food by saying what you ate.": "يتيح لك Premium تسجيل الطعام بقول ما أكلته.",
  "Settle in": "استقرّ", // note: meditation name (free); content titles may stay English until EC (G3)
  "Box breathing": "التنفّس المربّع", // note: meditation name (free)
  "Wind down for sleep": "استرخِ قبل النوم", // note: meditation name (free)
  "Free: {names}": "مجانًا: {names}",
  "Free: the first week of each programme": "مجانًا: الأسبوع الأول من كل برنامج",
  "Free: the last {n} days": { zero: "مجانًا: آخر {n} يوم", one: "مجانًا: آخر يوم", two: "مجانًا: آخر يومين", few: "مجانًا: آخر {n} أيام", many: "مجانًا: آخر {n} يومًا", other: "مجانًا: آخر {n} يوم" },
  "Free: {n} scans a day": { zero: "مجانًا: {n} مسح يوميًا", one: "مجانًا: مسح واحد يوميًا", two: "مجانًا: مسحان يوميًا", few: "مجانًا: {n} عمليات مسح يوميًا", many: "مجانًا: {n} عملية مسح يوميًا", other: "مجانًا: {n} عملية مسح يوميًا" },
  "Free: {n} routines": { zero: "مجانًا: {n} روتين", one: "مجانًا: روتين واحد", two: "مجانًا: روتينان", few: "مجانًا: {n} روتينات", many: "مجانًا: {n} روتينًا", other: "مجانًا: {n} روتين" },
  "Free: {n} habits": { zero: "مجانًا: {n} عادة", one: "مجانًا: عادة واحدة", two: "مجانًا: عادتان", few: "مجانًا: {n} عادات", many: "مجانًا: {n} عادة", other: "مجانًا: {n} عادة" },
  "Free: {n} recipes": { zero: "مجانًا: {n} وصفة", one: "مجانًا: وصفة واحدة", two: "مجانًا: وصفتان", few: "مجانًا: {n} وصفات", many: "مجانًا: {n} وصفة", other: "مجانًا: {n} وصفة" },
  "Free: {n} locked folders": { zero: "مجانًا: {n} مجلد مقفل", one: "مجانًا: مجلد مقفل واحد", two: "مجانًا: مجلدان مقفلان", few: "مجانًا: {n} مجلدات مقفلة", many: "مجانًا: {n} مجلدًا مقفلًا", other: "مجانًا: {n} مجلد مقفل" },
  "What Premium adds": "ما يضيفه Premium",

  // == Your Premium status (components/premium/PremiumStatusCard, services/premium/model) ==
  "Premium from your professional": "Premium من مختصّك",
  "Premium with your gym membership": "Premium مع اشتراكك في النادي",
  "Premium free trial": "تجربة Premium المجانية",
  "Managed in the app store": "يُدار من متجر التطبيقات",
  "Until {date}": "حتى {date}",

  // == The Round G1 refusals (services/premium/model premiumCodeMessage) ==
  "That isn't available yet.": "هذا غير متاح بعد.",
  "That's part of Centium Premium.": "هذا جزء من Centium Premium.",
  "Start your business plan before you add a venue.": "ابدأ خطة نشاطك التجاري قبل إضافة مكان.",
  "Start your business plan before you submit your verification.": "ابدأ خطة نشاطك التجاري قبل إرسال طلب التحقق.",
  "Start your business plan first.": "ابدأ خطة نشاطك التجاري أولًا.",
  "No hiring credit free. A role offer needs one.": "لا يوجد رصيد توظيف متاح. يحتاج عرض الوظيفة إلى رصيد واحد.",

  // == Premium passes, the professional's page (pages/pro/more/PremiumPasses) ==
  "Premium passes": "تصاريح Premium",
  "Include Centium Premium for your clients": "أضف Centium Premium لعملائك",
  "Premium passes come with your own paid plan, Starter and up. Each one includes Centium Premium for one of your clients.": "تأتي تصاريح Premium مع خطتك المدفوعة الخاصة، من Starter فما فوق. يضيف كل تصريح Centium Premium لأحد عملائك.",
  "{used} of {n} passes used": { zero: "استُخدم {used} من {n} تصريح", one: "استُخدم {used} من تصريح واحد", two: "استُخدم {used} من تصريحين", few: "استُخدم {used} من {n} تصاريح", many: "استُخدم {used} من {n} تصريحًا", other: "استُخدم {used} من {n} تصريح" },
  "A pass you take back ends 7 days later, and so does one whose client stops working with you.": "ينتهي التصريح الذي تسترجعه بعد 7 أيام، وكذلك تصريح العميل الذي يتوقف عن العمل معك.",
  "Clients with Premium": "عملاء لديهم Premium",
  "Your clients": "عملاؤك",
  "Your active clients show here.": "يظهر عملاؤك النشطون هنا.",
  "Your client": "عميلك",
  "Include Premium": "إضافة Premium",
  "Take back": "استرجاع",
  "Take back Premium?": "استرجاع Premium؟",
  "Ending": "ينتهي",
  "Ends {date}": "ينتهي في {date}",
  "Since {date}": "منذ {date}",
  "{name} now has Centium Premium.": "أصبح لدى {name} الآن Centium Premium.",
  "Premium ends in 7 days. {name} is told.": "ينتهي Premium بعد 7 أيام. سيتم إبلاغ {name}.",
  "{name}'s Premium ends in 7 days, and they're told. You can include it for someone else once it has ended.": "ينتهي Premium لدى {name} بعد 7 أيام، وسيتم إبلاغه. يمكنك إضافته لشخص آخر بعد انتهائه.",
  "Couldn't load your Premium passes.": "تعذّر تحميل تصاريح Premium.",
  "Couldn't load your clients.": "تعذّر تحميل عملائك.",
  "Couldn't include Premium. Try again.": "تعذّرت إضافة Premium. حاول مرة أخرى.",
  "Couldn't take Premium back. Try again.": "تعذّر استرجاع Premium. حاول مرة أخرى.",
  "Couldn't load your settings.": "تعذّر تحميل إعداداتك.",
  // Why a client can't have a pass (premium_pass_refusal reasons, ATXQ6's detail).
  "You can't include Premium for yourself.": "لا يمكنك إضافة Premium لنفسك.",
  "They aren't one of your active clients.": "ليس من عملائك النشطين.",
  "They already have Premium through you.": "لديه Premium عن طريقك بالفعل.",
  "Your licence verification isn't current. Renew it to include Premium.": "التحقق من رخصتك غير ساري. جدّده لتتمكن من إضافة Premium.",
  "Passes come with your own paid plan, Starter and up.": "تأتي التصاريح مع خطتك المدفوعة الخاصة، من Starter فما فوق.",
  "You've used all the passes your plan includes.": "استخدمت كل التصاريح التي تتضمنها خطتك.",
  "You can include Premium once you've worked together for 14 days.": "يمكنك إضافة Premium بعد أن تعملا معًا 14 يومًا.",
  "You can include Premium once they've booked or had a session with you, or logged against a programme or meal plan they share with you.": "يمكنك إضافة Premium بعد أن يحجز جلسة معك أو يحضرها، أو يسجّل ضمن برنامج أو خطة وجبات يشاركها معك.",
  "You can't include Premium for someone who signs in on the same device and network as you.": "لا يمكنك إضافة Premium لشخص يسجّل الدخول من الجهاز والشبكة نفسيهما اللذين تستخدمهما.",
  "This client can't have Premium through you yet.": "لا يمكن لهذا العميل الحصول على Premium عن طريقك بعد.",

  // == Include Premium for members, the gym's Settings (components/premium/GymPremiumSetting) ==
  "Include Premium for members": "إضافة Premium للأعضاء",
  "{used} of {n} members have Premium through you": { zero: "لدى {used} من {n} عضو Premium عن طريقك", one: "لدى {used} من عضو واحد Premium عن طريقك", two: "لدى {used} من عضوين Premium عن طريقك", few: "لدى {used} من {n} أعضاء Premium عن طريقك", many: "لدى {used} من {n} عضوًا Premium عن طريقك", other: "لدى {used} من {n} عضو Premium عن طريقك" },
  "Comes with an active business plan": "يأتي مع خطة نشاط تجاري نشطة",
  "Your members with an active membership get Centium Premium, up to your plan's limit.": "يحصل أعضاؤك ذوو الاشتراك النشط على Centium Premium، ضمن حدّ خطتك.",
  "Members with an active membership get Premium, up to your plan's limit. Turning this off ends theirs 7 days later, and they're told.": "يحصل الأعضاء ذوو الاشتراك النشط على Premium، ضمن حدّ خطتك. إيقاف هذا الخيار يُنهي Premium لديهم بعد 7 أيام، ويتم إبلاغهم.",

  // == Business plan levels (components/premium/BusinessPlanLevels, BusinessPlanHomeCard) ==
  "Plan levels": "مستويات الخطة",
  Base: "Base", // note: plan name, kept Latin
  "Base + {n} seats": { zero: "Base + {n} مقعد", one: "Base + مقعد واحد", two: "Base + مقعدان", few: "Base + {n} مقاعد", many: "Base + {n} مقعدًا", other: "Base + {n} مقعد" },
  "Base + {n} seat blocks": { zero: "Base + {n} حزمة مقاعد", one: "Base + حزمة مقاعد واحدة", two: "Base + حزمتا مقاعد", few: "Base + {n} حزم مقاعد", many: "Base + {n} حزمة مقاعد", other: "Base + {n} حزمة مقاعد" },
  "{n} seats": { zero: "{n} مقعد", one: "مقعد واحد", two: "مقعدان", few: "{n} مقاعد", many: "{n} مقعدًا", other: "{n} مقعد" },
  Current: "الحالية",
  "From your next renewal": "من تجديدك التالي",
  "From your next renewal: {level}, billed monthly.": "من تجديدك التالي: {level}، بفوترة شهرية.",
  "From your next renewal: {level}, billed yearly.": "من تجديدك التالي: {level}، بفوترة سنوية.",
  "Start now": "البدء الآن",
  "Starting…": "جارٍ البدء…",
  "An active plan changes at its next renewal; nothing is charged now.": "تتغيّر الخطة النشطة عند تجديدها التالي، ولا يُحتسب أي مبلغ الآن.",
  "Your plan starts once its first payment is recorded.": "تبدأ خطتك بعد تسجيل دفعتها الأولى.",
  "Your plan charge is ready below. Pay by cash or bank transfer; your plan starts once Centium records the payment.": "رسم خطتك جاهز أدناه. ادفع نقدًا أو بتحويل مصرفي، وتبدأ خطتك بعد أن تسجّل Centium الدفعة.",
  "A plan charge is already waiting for payment.": "هناك رسم خطة بانتظار الدفع بالفعل.",
  "See the charge": "عرض الرسم",
  "Only the business owner can choose the plan.": "وحده صاحب النشاط التجاري يمكنه اختيار الخطة.",
  "The business owner chooses the plan.": "صاحب النشاط التجاري هو من يختار الخطة.",
  "Couldn't start the plan. Try again.": "تعذّر بدء الخطة. حاول مرة أخرى.",
  "Choose your plan for your next renewal": "اختر خطتك لتجديدك التالي",
  "Your plan renews on {date}. Pick the level you want from then.": "تتجدّد خطتك في {date}. اختر المستوى الذي تريده من ذلك الحين.",
  "Pick the level you want from your next renewal.": "اختر المستوى الذي تريده من تجديدك التالي.",
  "Start your plan to go live": "ابدأ خطتك لتصبح متاحًا",
  "Your business goes live once your first plan payment is recorded. Until then you can't submit your verification or add a venue.": "يصبح نشاطك التجاري متاحًا بعد تسجيل أول دفعة لخطتك. وحتى ذلك الحين لا يمكنك إرسال طلب التحقق أو إضافة مكان.",
  // pages/business-more/BillingPages.tsx and pages/onboarding/business/PaymentsStep.tsx (Round G1 lines).
  "Your plan charge, {price}, is awaiting payment.": "رسم خطتك، {price}، بانتظار الدفع.",
  "Your plan is paid first: your business goes live, and you can submit your verification, once its first payment is recorded.": "تُدفع خطتك أولًا: يصبح نشاطك التجاري متاحًا، ويمكنك إرسال طلب التحقق، بعد تسجيل دفعتها الأولى.",

  // == Hiring credits (components/premium/HiringCreditsCard, pages/business-market/hiring/HireConfirmDialog) ==
  "Hiring credits": "أرصدة التوظيف",
  "{n} free to use": { zero: "{n} رصيد متاح للاستخدام", one: "رصيد واحد متاح للاستخدام", two: "رصيدان متاحان للاستخدام", few: "{n} أرصدة متاحة للاستخدام", many: "{n} رصيدًا متاحًا للاستخدام", other: "{n} رصيد متاح للاستخدام" },
  "Each role hire uses 1 hiring credit instead of the hiring fee. Class-slot hires are billed as before.": "يستخدم كل توظيف لوظيفة رصيد توظيف واحدًا بدلًا من رسم التوظيف. أما التوظيف لحصص محددة فيُفوتر كما في السابق.",
  "{remaining} of {n} credits left, until {date}": { zero: "يتبقى {remaining} من {n} رصيد، حتى {date}", one: "يتبقى {remaining} من رصيد واحد، حتى {date}", two: "يتبقى {remaining} من رصيدين، حتى {date}", few: "يتبقى {remaining} من {n} أرصدة، حتى {date}", many: "يتبقى {remaining} من {n} رصيدًا، حتى {date}", other: "يتبقى {remaining} من {n} رصيد، حتى {date}" },
  "{remaining} of {n} credits left": { zero: "يتبقى {remaining} من {n} رصيد", one: "يتبقى {remaining} من رصيد واحد", two: "يتبقى {remaining} من رصيدين", few: "يتبقى {remaining} من {n} أرصدة", many: "يتبقى {remaining} من {n} رصيدًا", other: "يتبقى {remaining} من {n} رصيد" },
  "{n} hiring credits": { zero: "{n} رصيد توظيف", one: "رصيد توظيف واحد", two: "رصيدا توظيف", few: "{n} أرصدة توظيف", many: "{n} رصيد توظيف", other: "{n} رصيد توظيف" }, // note: a billing-history row (services/centium-billing/model chargeTitle)
  "Uses 1 hiring credit":"يستخدم رصيد توظيف واحدًا",
  "{n} credits free to use": { zero: "{n} رصيد متاح للاستخدام", one: "رصيد واحد متاح للاستخدام", two: "رصيدان متاحان للاستخدام", few: "{n} أرصدة متاحة للاستخدام", many: "{n} رصيدًا متاحًا للاستخدام", other: "{n} رصيد متاح للاستخدام" },
  "The credit is used when they accept. No hiring fee is added.": "يُستخدم الرصيد عند قبوله العرض. ولا يُضاف أي رسم توظيف.",
  "Couldn't load your hiring credits.": "تعذّر تحميل أرصدة التوظيف.",

  // == The trial card at the end of sign-up (pages/onboarding/client/TrialOfferStep; hidden until the store apps are live) ==
  "Try Premium free for {n} days in the Centium app": "جرّب Premium مجانًا لمدة {n} أيام في تطبيق Centium", // note: {n} is 7 today
  "Try Premium free in the Centium app": "جرّب Premium مجانًا في تطبيق Centium",
  "Maybe later": "لاحقًا",

  // == The Premium pass notices (services/notifications/notificationsModel) ==
  // note: copy awaiting Karim's review (the Database handover's Arabic, with {from_name} as {name} and {ends_on} as {date})
  "You have Centium Premium": "لديك Centium Premium", // note: copy awaiting Karim's review
  "{name} included Centium Premium for you.": "{name} أضاف لك Centium Premium.", // note: copy awaiting Karim's review
  "{name} includes Centium Premium with your membership.": "{name} يقدّم لك Centium Premium مع اشتراكك.", // note: copy awaiting Karim's review
  "Your Premium ends on {date}": "ينتهي Premium في {date}", // note: copy awaiting Karim's review
  "Premium through {name} ends on {date}.": "ينتهي Premium المقدَّم من {name} في {date}.", // note: copy awaiting Karim's review
  "Your Premium has ended": "انتهى Premium", // note: copy awaiting Karim's review
  "Premium through {name} has ended. Everything you logged is still here.": "انتهى Premium المقدَّم من {name}. كل ما سجّلته ما زال هنا.", // note: copy awaiting Karim's review
  "Your Premium is ending": "Premium على وشك الانتهاء", // note: copy awaiting Karim's review; ours, for a row with no ends_on
  "Everything you logged is still here.": "كل ما سجّلته ما زال هنا.", // note: copy awaiting Karim's review
};

export default premium;
