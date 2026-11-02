import type { Catalogue } from "../core";

// Round G (EH6), Arabic: Shared food and workout service text.
// Source files this catalogue covers (paths from src/). These modules return
// English that screens in several areas show; the screens wrap it in t(), and
// the modules mark their text with tk() (constants) or call t() (sentences).
export const FILES: string[] = [
  "services/food/index.ts",
  "services/nutrition/client.ts",
  "services/nutrition/clientNutritionModel.ts",
  "services/nutrition/index.ts",
  "services/workout/blocks.ts",
  "services/workout/prescription.ts",
  "services/workout/log.ts",
  "services/workout/setTargets.ts",
  "services/workout/coach.ts",
  "services/workout/index.ts",
  "services/workout/logReplies.ts",
  "services/workout/logReplyLogic.ts",
  "services/workout/nextRoutine.ts",
  "services/routines/folderDepth.ts",
  "services/routines/order.ts",
  "services/templates/index.ts",
  "services/templates/setTypes.ts",
  "services/exercises/index.ts",
  "services/folders/index.ts",
  "services/achievements/index.ts",
  "services/streaks/index.ts",
  "services/music/whichMusic.ts",
  "services/barcode/lookup.ts",
  "data/folderColors.ts",
  "data/levelColors.ts",
  "utils/muscleGroups.ts",
  "context/AppContext.tsx",
  "utils/dietaryRestrictions.ts",
  "services/music/playlistLink.ts",
];

// note (whole file): the food and workout words follow feat/eh-food-workout-mind:
// set «مجموعة», rep «تكرار», round «جولة», block «مجموعة مركّبة», superset
// «سوبرسِت», warm-up «الإحماء», cool-down «التهدئة», tempo «الإيقاع»; AMRAP,
// EMOM, RPE, kg and BPM stay Latin. The shared food list is «الكتالوج», a food
// entry «إدخال», a template «قالب», a programme «برنامج», a coach «مدرّب».
// Units written after a number: s «ث», min «دقيقة», m «م», km «كم»; the compact
// totals use one letter: m «د», h «س», d «ي», mo «ش», y «سنة». Food, exercise
// and programme names, the professional's notes and the user's own names stay
// as written (F13). The Open Food Facts licence notice is the server's text and
// stays as sent. Exercise disciplines (utils/exerciseTags) stay English, as the
// Workout catalogue decided.
const sharedfood: Catalogue = {
  // == Food diary and custom foods (services/food) ==
  "You don't have permission to do that.": "ليست لديك صلاحية للقيام بذلك.",
  "Something went wrong. Please try again.": "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
  "Too many new products scanned this hour. Try again later.": "مسحت منتجات جديدة كثيرة خلال هذه الساعة. حاول لاحقًا.",
  "Could not add that product.": "تعذّرت إضافة هذا المنتج.",
  "Quantity must be greater than zero.": "يجب أن تكون الكمية أكبر من صفر.",
  "Could not save that entry.": "تعذّر حفظ هذا الإدخال.",
  "Could not save that food.": "تعذّر حفظ هذا الطعام.",
  "Could not copy that entry.": "تعذّر نسخ هذا الإدخال.",
  "That entry could not be deleted.": "تعذّر حذف هذا الإدخال.",
  "That change could not be saved.": "تعذّر حفظ هذا التغيير.",
  "That barcode isn't a product in the catalogue yet.": "هذا الباركود ليس لمنتج في الكتالوج بعد.",
  "That food couldn't be updated.": "تعذّر تحديث هذا الطعام.",
  "That food couldn't be deleted.": "تعذّر حذف هذا الطعام.",

  // == Looking foods up online (services/food/onlineSearchModel) ==
  "Searching online needs a connection.": "يتطلب البحث عبر الإنترنت اتصالًا.",
  "You can search online 30 times an hour. Try again later, or add it yourself.": "يمكنك البحث عبر الإنترنت 30 مرة في الساعة. حاول لاحقًا، أو أضفه بنفسك.",
  "The online food databases aren't answering right now. Try again later, or add it yourself.": "قواعد بيانات الأطعمة على الإنترنت لا تستجيب الآن. حاول لاحقًا، أو أضفه بنفسك.",
  "Search online with 2 to 80 characters.": "ابحث عبر الإنترنت بـ2 إلى 80 حرفًا.",
  "Your session expired. Sign in again to search online.": "انتهت جلستك. سجّل الدخول مجددًا للبحث عبر الإنترنت.",
  "Couldn't search online. Try again.": "تعذّر البحث عبر الإنترنت. حاول مرة أخرى.",
  "Results from {source} only. {missing} isn't available right now.": "النتائج من {source} فقط. {missing} غير متاح الآن.", // note: {source} and {missing} are database names (USDA FoodData Central, Open Food Facts)
  "From USDA FoodData Central (public domain).": "من USDA FoodData Central (ملكية عامة).",
  "Product data from Open Food Facts.": "بيانات المنتج من Open Food Facts.",
  "P {n}g": "ب {n} غ",
  "C {n}g": "ك {n} غ",
  "F {n}g": "د {n} غ",
  "This food's values are outside what we can save. Add it yourself instead.": "قيم هذا الطعام خارج ما يمكننا حفظه. أضفه بنفسك بدلًا من ذلك.",
  "Your session expired. Sign in again to save foods.": "انتهت جلستك. سجّل الدخول مجددًا لحفظ الأطعمة.",
  "Couldn't save that food. Try again.": "تعذّر حفظ هذا الطعام. حاول مرة أخرى.",
  "Sent for review. We'll let you know when it's checked.": "أُرسل للمراجعة. سنخبرك عند الانتهاء من مراجعته.",
  "Foods from Open Food Facts stay in your own foods. Their licence doesn't allow adding them to the catalogue.": "تبقى الأطعمة من Open Food Facts ضمن أطعمتك الخاصة. لا يسمح ترخيصها بإضافتها إلى الكتالوج.",
  "That name can't go into the catalogue. Change the name and try again.": "لا يمكن إضافة هذا الاسم إلى الكتالوج. غيّر الاسم وحاول مرة أخرى.",
  "You can suggest 10 foods an hour. Try again later.": "يمكنك اقتراح 10 أطعمة في الساعة. حاول لاحقًا.",
  "That food isn't in your foods any more.": "لم يعد هذا الطعام ضمن أطعمتك.",
  "Your session expired. Sign in again to suggest foods.": "انتهت جلستك. سجّل الدخول مجددًا لاقتراح الأطعمة.",
  "Couldn't send that suggestion. Try again.": "تعذّر إرسال هذا الاقتراح. حاول مرة أخرى.",
  "Added to the catalogue. Everyone can find it in search.": "أُضيف إلى الكتالوج. يمكن للجميع العثور عليه في البحث.",
  "Not added to the catalogue. {reason}": "لم يُضف إلى الكتالوج. {reason}",

  // == Allergies, conflict badges and the Add Food notice (services/nutrition) ==
  "Couldn't save your allergies. Try again.": "تعذّر حفظ الحساسية لديك. حاول مرة أخرى.", // note: health-related (allergies)
  "Write something first.": "اكتب شيئًا أولًا.",
  "This feedback is no longer available.": "لم تعد هذه الملاحظات متاحة.",
  "Couldn't send your reply. Try again.": "تعذّر إرسال ردّك. حاول مرة أخرى.",
  "Tree nuts": "المكسرات",
  Peanuts: "الفول السوداني",
  Milk: "الحليب",
  Eggs: "البيض",
  "Gluten (cereals)": "الغلوتين (الحبوب)",
  Soya: "الصويا",
  Fish: "السمك",
  Crustaceans: "القشريات",
  Molluscs: "الرخويات",
  Sesame: "السمسم",
  Celery: "الكرفس",
  Mustard: "الخردل",
  Lupin: "الترمس",
  Sulphites: "الكبريتيت",
  Mild: "خفيفة",
  Moderate: "متوسطة",
  Severe: "شديدة",
  "{a} and {b}": "{a} و{b}",
  "Allergy: {list}.": "الحساسية: {list}.", // note: health-related; the client's own recorded allergies with their severity
  "Allergies: {list}.": "الحساسية: {list}.", // note: health-related; several recorded allergies
  "Shared with {names}.": "مُشارَكة مع {names}.",
  "Allergy: {name}": "حساسية: {name}", // note: health-related badge for a confirmed allergen
  "Check this": "تحقّق من هذا", // note: health-related; a keyword match only, never a confirmed allergy
  "Not {restriction}": "لا يتوافق مع {restriction}", // note: {restriction} is a dietary restriction label (vegan, halal…)
  "Not compatible": "غير متوافق",
  Preference: "تفضيل",
  "{food} contains {allergen}": "يحتوي {food} على {allergen}", // note: health-related; {food} is the food's name as listed
  "You're allergic to {allergen} ({severity}). Foods with an allergen you've recorded can't be added. To add it, update your allergies first.": "لديك حساسية تجاه {allergen} ({severity}). لا يمكن إضافة أطعمة تحتوي على مسبّب حساسية سجّلته. لإضافته، حدّث معلومات الحساسية أولًا.", // note: health-related; blocks adding the food
  "You're allergic to {allergen}. Foods with an allergen you've recorded can't be added. To add it, update your allergies first.": "لديك حساسية تجاه {allergen}. لا يمكن إضافة أطعمة تحتوي على مسبّب حساسية سجّلته. لإضافته، حدّث معلومات الحساسية أولًا.", // note: health-related; blocks adding the food
  "The name suggests {food} may contain something you're allergic to. Check the ingredients before you eat it.": "يوحي الاسم بأن {food} قد يحتوي على شيء لديك حساسية تجاهه. تحقّق من المكوّنات قبل أن تأكله.", // note: health-related; neutral, a name match only
  "{food} isn't {restriction}": "{food} لا يتوافق مع {restriction}",
  "{food} isn't compatible": "{food} غير متوافق",
  "You can still add it.": "لا يزال بإمكانك إضافته.",
  "{food} isn't in line with a dietary preference you set.": "{food} لا يتماشى مع تفضيل غذائي حدّدته.",

  // == Targets, meal plan card and feedback (services/nutrition) ==
  "Your targets are set by your professional.": "يحدّد مختصك أهدافك.", // note: nutrition targets set by a professional
  "General reference: add your details for a personal target": "مرجع عام: أضف بياناتك للحصول على هدف شخصي", // note: nutrition target; a general reference, not a personal recommendation
  "Starts {date}": "يبدأ في {date}",
  "{name}, week {n}": "{name}، الأسبوع {n}",
  "Ends {date}": "ينتهي في {date}",
  "{n} meals on {day}": {
    zero: "لا وجبات يوم {day}",
    one: "وجبة واحدة يوم {day}",
    two: "وجبتان يوم {day}",
    few: "{n} وجبات يوم {day}",
    many: "{n} وجبة يوم {day}",
    other: "{n} وجبة يوم {day}",
  },
  "Great choice.": "اختيار رائع.",
  "Love this.": "أحببت هذا.",
  "Strong choice.": "اختيار قوي.",
  "Question.": "سؤال.",

  // == Workout blocks (services/workout/blocks) ==
  "A superset needs at least two exercises.": "يحتاج السوبرسِت إلى تمرينين على الأقل.",
  "Set how long the AMRAP runs for.": "حدّد مدة الـAMRAP.",
  "An EMOM needs an interval and a number of rounds.": "يحتاج الـEMOM إلى فاصل زمني وعدد من الجولات.",
  "Set how many rounds.": "حدّد عدد الجولات.",
  "Pick at least two exercises.": "اختر تمرينين على الأقل.",
  "Something in that selection is no longer here.": "شيء في هذا الاختيار لم يعد موجودًا.",
  "There is a gap in that selection. A block has to be one unbroken run.": "هناك فجوة في هذا الاختيار. يجب أن تكون المجموعة المركّبة تسلسلًا متصلًا واحدًا.",
  "Ungroup those first. They're already in a block.": "فكّ تجميعها أولًا. إنها في مجموعة مركّبة بالفعل.",

  // == Prescription lines (services/workout/prescription) ==
  "{n} s": "{n} ث",
  "{m} min {s} s": "{m} دقيقة {s} ث",
  "{n} km": "{n} كم",
  "{n} m": "{n} م",
  "@ {pace} /km": "@ {pace} /كم",
  "Zone {zone}": "المنطقة {zone}",
  "RPE {value}": "RPE {value}",
  run: "جري",
  jog: "هرولة",
  walk: "مشي",
  rest: "راحة",
  "Warm-up {step}": "الإحماء {step}",
  "{n} × {work}, {recovery}": "{n} × {work}، {recovery}",
  "Cool-down {step}": "التهدئة {step}",
  "@ {pace} min/km": "@ {pace} دقيقة/كم",
  "{n}% incline": "ميل {n}%",
  "{range} sets": "{range} مجموعات",
  "{n} reps": { zero: "0 تكرارات", one: "تكرار واحد", two: "تكراران", few: "{n} تكرارات", many: "{n} تكرارًا", other: "{n} تكرار" },
  "{range} reps": "{range} تكرارات",
  "{n}+ reps (AMRAP)": "{n}+ تكرارات (AMRAP)",
  "up to {n} reps": "حتى {n} تكرار",
  "{time} hold": "ثبات {time}",
  "{reps} per round": "{reps} في كل جولة",
  "{n} kg rep max": "{n} kg أقصى وزن للتكرار",
  Bodyweight: "وزن الجسم",
  "Tempo {tempo}": "الإيقاع {tempo}",
  "Rest {time}": "راحة {time}",
  "Superset {letter}": "سوبرسِت {letter}",
  "no cap set": "بلا حد زمني",
  "EMOM · every {every}": "EMOM · كل {every}",
  "{n} rounds": { zero: "0 جولات", one: "جولة واحدة", two: "جولتان", few: "{n} جولات", many: "{n} جولة", other: "{n} جولة" },
  "for time": "على الوقت",
  "For Time · {rounds} (cap {time})": "على الوقت · {rounds} (الحد {time})",
  "For Time · {rounds}": "على الوقت · {rounds}",

  // == Saving a workout, set targets and durations (services/workout) ==
  "Your session expired. Sign in again to save this workout.": "انتهت جلستك. سجّل الدخول مجددًا لحفظ هذا التمرين.",
  "Some of this workout's numbers were out of range and it couldn't be saved.": "بعض أرقام هذا التمرين خارج النطاق، لذا تعذّر حفظه.",
  "Couldn't save this workout. Check your connection and try again.": "تعذّر حفظ هذا التمرين. تحقّق من اتصالك وحاول مرة أخرى.",
  "Couldn't save this workout.": "تعذّر حفظ هذا التمرين.",
  "That workout couldn't be deleted.": "تعذّر حذف هذا التمرين.",
  "That workout couldn't be updated.": "تعذّر تحديث هذا التمرين.",
  "Set {n}": "المجموعة {n}",
  BW: "و.ج",
  "{n}m": "{n} د",
  "{n}h": "{n} س",
  "{n}d": "{n} ي",
  "{n}mo": "{n} ش",
  "{n}y": "{n} سنة",

  // == A professional's replies to a workout (services/workout/logReplyLogic) ==
  "Write a reply first.": "اكتب ردًّا أولًا.",
  "A reply is up to 1,000 characters.": "الرد 1,000 حرف كحد أقصى.",
  "You're offline. This needs a connection.": "أنت غير متصل. يتطلب هذا اتصالًا.",
  "That reply is already gone.": "هذا الرد لم يعد موجودًا.",
  "This workout isn't shared with you any more.": "لم يعد هذا التمرين مُشارَكًا معك.",
  "Only professionals can reply to a workout.": "يمكن للمختصين فقط الرد على تمرين.",
  "You've sent a lot of replies this hour. Try again later.": "أرسلت ردودًا كثيرة خلال هذه الساعة. حاول لاحقًا.",
  "A reply is 1 to 1,000 characters.": "الرد من 1 إلى 1,000 حرف.",
  "Sign in again to continue.": "سجّل الدخول مجددًا للمتابعة.",
  "Couldn't update the review. Try again.": "تعذّر تحديث المراجعة. حاول مرة أخرى.",
  "Couldn't delete the reply. Try again.": "تعذّر حذف الرد. حاول مرة أخرى.",
  "Couldn't load the replies. Try again.": "تعذّر تحميل الردود. حاول مرة أخرى.",
  "{n} replies": { zero: "لا ردود", one: "ردّ واحد", two: "ردّان", few: "{n} ردود", many: "{n} ردًّا", other: "{n} ردّ" },
  Reviewed: "تم التقييم",
  "Reply from {name}": "ردّ من {name}",
  "your coach": "مدرّبك",

  // == Routine folders and templates (services/routines, services/folders, services/templates) ==
  "Folders go 5 levels deep at most": "يمكن أن تتداخل المجلدات حتى 5 مستويات على الأكثر",
  "A folder name is 1 to 40 characters.": "اسم المجلد من 1 إلى 40 حرفًا.",
  "A folder can't be filed inside itself or one of its own subfolders.": "لا يمكن وضع مجلد داخل نفسه أو داخل أحد مجلداته الفرعية.",
  "That folder belongs to a different account, so it can't be used as a parent.": "هذا المجلد تابع لحساب آخر، لذا لا يمكن استخدامه مجلدًا رئيسيًا.",
  "Something this refers to no longer exists. Try again.": "شيء يشير إليه هذا لم يعد موجودًا. حاول مرة أخرى.",
  "One of those numbers is outside the range this can store.": "أحد هذه الأرقام خارج النطاق الذي يمكن حفظه.",
  "This client has changed their routine since you last assigned it.": "غيّر هذا العميل روتينه منذ آخر مرة عيّنته فيها.",
  "That template no longer exists.": "لم يعد هذا القالب موجودًا.",
  "Only the template's owner can assign it.": "لا يمكن تعيين هذا القالب إلا لمالكه.",
  "That person isn't one of your clients.": "هذا الشخص ليس من عملائك.",
  "Pick a start week inside the programme.": "اختر أسبوع بدء ضمن البرنامج.",
  "Could not save the blocks in this template.": "تعذّر حفظ المجموعات المركّبة في هذا القالب.",
  "\"{name}\" isn't in the exercise library, so this template can't be saved.": "«{name}» غير موجود في مكتبة التمارين، لذا لا يمكن حفظ هذا القالب.", // note: {name} is the exercise's name as written
  "That program is no longer available.": "لم يعد هذا البرنامج متاحًا.",
  "That program can't be added this way.": "لا يمكن إضافة هذا البرنامج بهذه الطريقة.",
  "This program can't be copied. One of its exercises isn't available.": "لا يمكن نسخ هذا البرنامج. أحد تمارينه غير متاح.",
  "That programme has already ended.": "انتهى هذا البرنامج بالفعل.",
  "Only the professional who assigned it can end it.": "لا يمكن إنهاؤه إلا للمختص الذي عيّنه.",

  // == Custom exercises (services/exercises) ==
  "You already have an exercise with this name.": "لديك تمرين بهذا الاسم بالفعل.",
  "Use up to 60 characters.": "استخدم 60 حرفًا كحد أقصى.",
  "Use 2 to 60 characters.": "استخدم من 2 إلى 60 حرفًا.",
  "Pick at least one main muscle group.": "اختر مجموعة عضلية رئيسية واحدة على الأقل.",

  // == Achievements, points and streaks ==
  "Your session expired. Sign in again to see your achievements.": "انتهت جلستك. سجّل الدخول مجددًا لرؤية إنجازاتك.",
  "You don't have permission to read this. Sign in again.": "ليست لديك صلاحية لقراءة هذا. سجّل الدخول مجددًا.",
  "Couldn't load your achievements. Check your connection and try again.": "تعذّر تحميل إنجازاتك. تحقّق من اتصالك وحاول مرة أخرى.",
  "Couldn't load your points. Try again.": "تعذّر تحميل نقاطك. حاول مرة أخرى.",
  "Logging streak": "سلسلة التسجيل",
  "Movement streak": "سلسلة الحركة",
  "Workout streak": "سلسلة التمرين",
  "Nutrition streak": "سلسلة التغذية",
  "Couldn't load your streaks.": "تعذّر تحميل سلاسلك.",

  // == Music and barcode lookups ==
  "{name}'s playlist": "قائمة تشغيل {name}",
  "You've scanned a lot in the last hour. Try again later, or enter it by hand.": "مسحت كثيرًا خلال الساعة الماضية. حاول لاحقًا، أو أدخله يدويًا.",
  "Open Food Facts isn't answering right now. Try again, or enter it by hand.": "Open Food Facts لا يستجيب الآن. حاول مرة أخرى، أو أدخله يدويًا.",
  "Your session expired. Sign in again to look products up.": "انتهت جلستك. سجّل الدخول مجددًا للبحث عن المنتجات.",
  "Couldn't look that barcode up. Try again, or enter it by hand.": "تعذّر البحث عن هذا الباركود. حاول مرة أخرى، أو أدخله يدويًا.",

  // == Folder colours and muscle groups ==
  Lavender: "خزامي",
  Teal: "تركوازي",
  Blue: "أزرق",
  Indigo: "نيلي",
  Plum: "برقوقي",
  Berry: "توتي",
  Terracotta: "طيني",
  Sage: "مريمي",
  Slate: "رمادي أردوازي",
  Black: "أسود",
  Biceps: "البايسبس",
  Calves: "السمانة",
  Forearms: "الساعدان",
  Glutes: "الأرداف",
  Hamstrings: "عضلات الفخذ الخلفية",
  Olympic: "أولمبي",
  Quads: "عضلات الفخذ الأمامية",

  // == Habit suggestions (Mind › Habits) ==
  "Drink water": "شرب الماء",
  "10,000 steps": "10,000 خطوة",
  Meditate: "التأمل",

  // == utils/dietaryRestrictions.ts ==
  Vegan: "نباتية صرفة",
  "Gluten-Free": "خالية من الغلوتين",
  "Dairy-Free": "خالية من الألبان",
  "Nut-Free": "خالية من المكسرات",
  "Low-Carb": "قليلة الكربوهيدرات",
  Pescatarian: "نباتية مع الأسماك",
  Halal: "حلال",
  Kosher: "كوشر",

  // == services/music/playlistLink.ts ==
  "Paste the full playlist link, starting with https://": "الصق رابط قائمة التشغيل كاملًا، بدءًا بـ https://",
  "That link isn't a playlist or an album.": "هذا الرابط ليس قائمة تشغيل ولا ألبومًا.",
};

export default sharedfood;
