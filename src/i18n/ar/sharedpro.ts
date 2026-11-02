import type { Catalogue } from "../core";

// Round G (EH6), Arabic: Shared professional service text (programmes, courses, pro marketplace).
// Source files this catalogue covers (paths from src/). Screens in several
// areas show these modules' text; the modules mark it with tk() or call t().
export const FILES: string[] = [
  "services/programmes/model.ts",
  "services/programmes/index.ts",
  "services/pro-market/model.ts",
  "services/courses/authorRules.ts",
  "services/courses/index.ts",
  "services/courses/extras.ts",
  "services/courses/markdown.ts",
  "services/courses/author.ts",
  "services/courses/drip.ts",
];

// note (whole file): EH6 round 2 (found by EH4b). Every entry reuses the Arabic the
// professional's screens (feat/eh-pro-2: prolibrary, promarket, procourses,
// proclients, proprofile) already give the same English, so the module and
// the screen read the same. New lines follow them: the Showcase is
// «المعروضات», a credential «شهادة», a course revision «نسخة معدّلة». The
// course levels and "Free" live in services/courses/rules.ts, which is listed
// in services.ts and being changed on feat/eh-member-2, so they aren't here.
const sharedpro: Catalogue = {
  // == services/programmes/model.ts ==
  "{n} workouts a week": { zero: "لا تمارين في الأسبوع", one: "تمرين واحد في الأسبوع", two: "تمرينان في الأسبوع", few: "{n} تمارين في الأسبوع", many: "{n} تمرينًا في الأسبوع", other: "{n} تمرين في الأسبوع" },
  "{lo}–{hi} workouts a week": "{lo}–{hi} تمارين في الأسبوع",
  "No workouts yet": "لا تمارين بعد",
  "used by {n} clients": { zero: "لا يستخدمه أي عميل", one: "يستخدمه عميل واحد", two: "يستخدمه عميلان", few: "يستخدمه {n} عملاء", many: "يستخدمه {n} عميلًا", other: "يستخدمه {n} عميل" },
  "Not shared": "غير مُشارَك",
  "{done} of {n} sessions done": { zero: "{done} من 0 جلسة مُنجزة", one: "{done} من جلسة واحدة مُنجزة", two: "{done} من جلستين مُنجزة", few: "{done} من {n} جلسات مُنجزة", many: "{done} من {n} جلسة مُنجزة", other: "{done} من {n} جلسة مُنجزة" },
  Ended: "انتهى",
  Finished: "انتهى",
  "Week {n} of {of}": "الأسبوع {n} من {of}",
  "That person isn't your client any more.": "لم يعد هذا الشخص عميلك.",
  "Only your own workouts can go in a programme.": "لا يدخل البرنامج إلا تمارينك الخاصة.",
  "Programmes are built by professionals.": "يُنشئ المختصون البرامج.",
  "Only the professional who made this programme can change it.": "لا يغيّر هذا البرنامج إلا المختص الذي أنشأه.",
  "This programme isn't available any more.": "لم يعد هذا البرنامج متاحًا.",
  "Week {n} has workouts. Clear it before shortening the programme.": "في الأسبوع {n} تمارين. أفرغه قبل تقصير البرنامج.",
  "Nothing is planned from that week on. Pick an earlier week or add workouts.": "لا شيء مخطط له من ذلك الأسبوع فصاعدًا. اختر أسبوعًا أبكر أو أضف تمارين.",
  "Pick a week within the programme.": "اختر أسبوعًا ضمن البرنامج.",
  "A day can hold up to four workouts.": "يتسع اليوم لأربعة تمارين كحد أقصى.",
  "Pick a different week to copy to.": "اختر أسبوعًا آخر للنسخ إليه.",
  "That day isn't in the programme.": "هذا اليوم ليس ضمن البرنامج.",
  "Give the programme a name (up to 120 characters) and 1 to 52 weeks.": "أعطِ البرنامج اسمًا (حتى 120 حرفًا) ومدة من 1 إلى 52 أسبوعًا.",

  // == services/programmes/index.ts ==
  "Couldn't create the programme. Try again.": "تعذّر إنشاء البرنامج. حاول مرة أخرى.",
  "Couldn't save the programme. Try again.": "تعذّر حفظ البرنامج. حاول مرة أخرى.",
  "Couldn't save the playlist. Try again.": "تعذّر حفظ قائمة التشغيل. حاول مرة أخرى.",
  "Couldn't delete the programme. Try again.": "تعذّر حذف البرنامج. حاول مرة أخرى.",
  "Couldn't save that day. Try again.": "تعذّر حفظ ذلك اليوم. حاول مرة أخرى.",
  "Couldn't copy the week. Try again.": "تعذّر نسخ الأسبوع. حاول مرة أخرى.",
  "Couldn't assign the programme. Try again.": "تعذّر تعيين البرنامج. حاول مرة أخرى.",
  "Couldn't end the programme. Try again.": "تعذّر إنهاء البرنامج. حاول مرة أخرى.",

  // == services/pro-market/model.ts ==
  "Shows once clients start finding you": "يظهر عندما يبدأ العملاء في العثور عليك",
  "Active clients": "العملاء النشطون",
  "Gyms working with": "النوادي التي تعمل معها",
  Daily: "يوميًا",
  "Every 6 months": "كل 6 أشهر",
  "{n} sessions": { zero: "لا جلسات", one: "جلسة واحدة", two: "جلستان", few: "{n} جلسات", many: "{n} جلسة", other: "{n} جلسة" },
  "In person or online": "حضوريًا أو عبر الإنترنت",
  "Hidden by Centium": "أخفته Centium",
  Hidden: "مخفي",
  "Not offered": "غير متاح",
  "You can show your Showcase once your licence or certificate is verified.": "يمكنك إظهار معروضاتك بعد التحقق من ترخيصك أو شهادتك.",
  "Accounts under 18 can't show a Showcase to clients and gyms.": "لا يمكن للحسابات دون 18 عامًا إظهار معروضاتها للعملاء والنوادي.",
  "Add your date of birth to show your Showcase.": "أضف تاريخ ميلادك لإظهار معروضاتك.",
  "Only a professional account has a Showcase.": "المعروضات متاحة لحسابات المختصين فقط.",
  "{n} services": { zero: "لا خدمات", one: "خدمة واحدة", two: "خدمتان", few: "{n} خدمات", many: "{n} خدمة", other: "{n} خدمة" },
  "Credential · expired {date}": "شهادة · انتهت صلاحيتها في {date}",
  "Credential · renews {date}": "شهادة · تتجدد في {date}",
  Credential: "شهادة",
  "Phone, email and social links": "الهاتف والبريد الإلكتروني وروابط التواصل الاجتماعي",
  "Share them in Messages if you choose": "شاركها في الرسائل إن أردت",
  "Not shown": "غير ظاهر",
  "{n} reviews": { zero: "لا تقييمات", one: "تقييم واحد", two: "تقييمان", few: "{n} تقييمات", many: "{n} تقييمًا", other: "{n} تقييم" },

  // == services/courses/authorRules.ts ==
  Draft: "مسودة",
  "Only you can see this. Submit it when you're ready.": "أنت وحدك ترى هذه الدورة. أرسلها عندما تكون جاهزًا.",
  "We're reading it. You can't edit it while it's with us.": "نراجعها الآن. لا يمكنك تعديلها ما دامت لدينا.",
  "Live in the catalogue. Edit it by opening a revision.": "منشورة في الدليل. عدّلها بفتح نسخة معدّلة.",
  "Changes requested": "مطلوب تعديلات",
  "Make the changes below, then submit it again.": "أجرِ التعديلات أدناه، ثم أرسلها مرة أخرى.",
  Unpublished: "أُلغي نشرها",
  "Taken down by a reviewer. It isn't in the catalogue.": "أزالها أحد المراجعين. لم تعد في الدليل.",
  "Revision in progress": "نسخة معدّلة قيد الإعداد",
  "Your course stays live while you edit this copy.": "تبقى دورتك منشورة أثناء تعديلك لهذه النسخة.",
  "Revision in review": "النسخة المعدّلة قيد المراجعة",
  "Your course stays live until we approve the changes.": "تبقى دورتك منشورة حتى نوافق على التعديلات.",
  "Make the changes below, then submit the revision again.": "أجرِ التعديلات أدناه، ثم أرسل النسخة المعدّلة مرة أخرى.",
  "Revision applied": "طُبّقت النسخة المعدّلة",
  "Your changes are live.": "تعديلاتك منشورة.",
  "Revision withdrawn": "سُحبت النسخة المعدّلة",
  "Those draft changes were discarded.": "تم تجاهل تلك التعديلات غير المنشورة.",
  "Add at least one lesson before submitting.": "أضف درسًا واحدًا على الأقل قبل الإرسال.",
  "“{title}” has no lessons yet.": "ليس في «{title}» دروس بعد.",
  "{n} weeks have no lessons yet.": { zero: "لا أسابيع بلا دروس", one: "أسبوع واحد ليس فيه دروس بعد", two: "أسبوعان ليس فيهما دروس بعد", few: "{n} أسابيع ليس فيها دروس بعد", many: "{n} أسبوعًا ليس فيها دروس بعد", other: "{n} أسبوع ليس فيه دروس بعد" },
  "There's no subtitle. It's the line under the title in the catalogue.": "لا يوجد عنوان فرعي. إنه السطر الذي يظهر تحت العنوان في الدليل.",
  "“What you'll learn” is empty.": "«ما ستتعلّمه» فارغ.",
  "Renaming a lesson resets it for learners who have already completed it. Editing what's inside it doesn't.": "إعادة تسمية درس تعيد ضبطه للمتعلّمين الذين أكملوه. أما تعديل محتواه فلا.",
  "Your course stays live and unchanged while you edit this copy. Learners see the changes only once we've approved them.": "تبقى دورتك منشورة ودون تغيير أثناء تعديلك لهذه النسخة. لا يرى المتعلّمون التعديلات إلا بعد موافقتنا عليها.",
  "Your published course isn't affected. Only these draft changes are lost.": "لا تتأثر دورتك المنشورة. تضيع هذه التعديلات غير المنشورة فقط.",
  "Lesson text can't contain HTML tags. Use the formatting listed under the text box instead.": "لا يمكن أن يحتوي نص الدرس على وسوم HTML. استخدم التنسيق المذكور تحت مربع النص بدلًا من ذلك.",
  "Health education": "التثقيف الصحي",
  "{n} selected clients": { zero: "لم يُختر أي عميل", one: "عميل واحد محدّد", two: "عميلان محدّدان", few: "{n} عملاء محدّدين", many: "{n} عميلًا محدّدًا", other: "{n} عميل محدّد" },
  "Only professionals with a verified licence can publish courses. Check your licence in Profile.": "لا ينشر الدورات إلا المختصون الذين تم التحقق من ترخيصهم. تحقق من ترخيصك في الملف الشخصي.",
  "That isn't a link to a single YouTube video. Paste a youtube.com/watch, youtu.be or /embed link, not a playlist.": "هذا ليس رابطًا لفيديو واحد على YouTube. الصق رابط youtube.com/watch أو youtu.be أو ‎/embed، لا قائمة تشغيل.",
  "That file wasn't uploaded by you. Try choosing it again.": "لم ترفع أنت هذا الملف. جرّب اختياره مرة أخرى.",
  "This course already has a revision open, or it isn't published yet.": "لهذه الدورة نسخة معدّلة مفتوحة بالفعل، أو أنها لم تُنشر بعد.",
  "This course isn't in a state that can be submitted.": "لا يمكن إرسال هذه الدورة في حالتها الحالية.",
  "You can't edit this right now. A published course is edited through a revision, and one that's in review is frozen until we've read it.": "لا يمكنك تعديل هذا الآن. تُعدَّل الدورة المنشورة عبر نسخة معدّلة، والدورة قيد المراجعة مجمّدة حتى ننتهي من قراءتها.",
  "You've started a lot of courses today. Try again tomorrow.": "بدأت دورات كثيرة اليوم. حاول مرة أخرى غدًا.",
  "That's a lot of uploads at once. Give it a minute.": "هذه ملفات كثيرة دفعة واحدة. انتظر دقيقة.",
  "You've submitted a lot today. Try again tomorrow.": "أرسلت كثيرًا اليوم. حاول مرة أخرى غدًا.",
  "That check-in isn't one of yours.": "هذه المتابعة ليست من متابعاتك.",
  "That course no longer exists.": "لم تعد هذه الدورة موجودة.",
  "Only clients you work with now can be chosen. Check the list and try again.": "يمكن اختيار العملاء الذين تعمل معهم الآن فقط. راجع القائمة وحاول مرة أخرى.",
  "A question needs between 2 and 8 answers, with exactly one marked correct.": "يحتاج السؤال إلى ما بين 2 و8 إجابات، واحدة منها فقط صحيحة.",
  "Choose between 1 and 500 clients.": "اختر بين 1 و500 عميل.",
  "The description is up to 2,000 characters and the focus up to 300.": "يصل الوصف إلى 2,000 حرف والمحور إلى 300.",
  "A check-in needs a question for your clients.": "تحتاج المتابعة إلى سؤال لعملائك.",
  "That isn't a value this field accepts.": "هذه ليست قيمة يقبلها هذا الحقل.",
  "That doesn't fit. Check the lengths and numbers, and try again.": "هذا لا يناسب. راجع الأطوال والأرقام، وحاول مرة أخرى.",
  "{n}% complete": "مكتمل بنسبة {n}%",

  // == services/courses/index.ts ==
  "The PDF couldn't be opened. Try again.": "تعذّر فتح ملف PDF. حاول مرة أخرى.",

  // == services/courses/extras.ts ==
  "Choose a JPEG, PNG or WebP image.": "اختر صورة JPEG أو PNG أو WebP.",
  "That image couldn't be uploaded. Check your connection and try again.": "تعذّر رفع هذه الصورة. تحقق من اتصالك وحاول مرة أخرى.",
  "A learner": "متعلّم",
  "Couldn't send your answer. Try again.": "تعذّر إرسال ردّك. حاول مرة أخرى.",
  "Couldn't load the numbers. Try again.": "تعذّر تحميل الأرقام. حاول مرة أخرى.",

  // == services/courses/markdown.ts ==
  "You can use # Heading, **bold**, *italic*, - lists, 1. numbered lists and [links](https://…). HTML isn't allowed.": "يمكنك استخدام # عنوان، و**غامق**، و*مائل*، و- قوائم، و1. قوائم مرقّمة، و[روابط](https://…). لا يُسمح بـ HTML.",
};

export default sharedpro;
