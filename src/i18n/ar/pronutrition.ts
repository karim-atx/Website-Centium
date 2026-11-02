import type { Catalogue } from "../core";

// Round G (EH4b), Arabic: the professional's tools, part 2: the Nutrition library (items, recipes, meal plans, targets, food journals).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/pro/nutrition/AddItemSheet.tsx",
  "components/pro/nutrition/AssignSheet.tsx",
  "components/pro/nutrition/hooks.ts",
  "components/pro/nutrition/itemFacts.ts",
  "components/pro/nutrition/Journals.tsx",
  "components/pro/nutrition/kit.tsx",
  "components/pro/nutrition/LibraryHome.tsx",
  "components/pro/nutrition/LibraryMealPlans.tsx",
  "components/pro/nutrition/MealPlansArea.tsx",
  "components/pro/nutrition/nav.ts",
  "components/pro/nutrition/nuFormat.ts",
  "components/pro/nutrition/nutritionModel.ts",
  "components/pro/nutrition/PlanBuilder.tsx",
  "components/pro/nutrition/Recipes.tsx",
  "components/pro/nutrition/Targets.tsx",
  "components/pro/nutrition/useNutritionOverview.ts",
  "pages/pro/MealPlans.tsx",
  "services/pro/nutrition.ts",
];

// note (whole file): professional «مختص», client «عميل» / «العملاء», as in
// pro.ts. A meal plan is «خطة وجبات»; a template «نموذج» (as the bare
// "Template" on main; the plural "Templates" there is «القوالب»); a client's
// own copy «نسخة»; assigning «تعيين»; a swap «بديل» / «استبدال»; a food
// journal «يوميات الطعام»; a target «هدف»; an allergen «مسبّب حساسية»; a
// conflict (a food against a client's allergy or diet) «تعارض»; nutrition
// coaching «التدريب الغذائي» (as "Include nutrition coaching"); the TDEE
// estimate «احتياج الحفاظ على الوزن» (as "Maintenance calories"). Food,
// recipe and serving names are data and stay as written (F13); the diet
// names (Vegetarian, Halal…) come from utils/dietaryRestrictions, which no
// catalogue lists yet, so they show in English until that file is done.
// Allergy, diet, target and weigh-in lines are health-related: they stay
// neutral and only repeat what the client recorded or shared.
const pronutrition: Catalogue = {
  // == Meal plans library (NU1) ==
  "Journals to review": "يوميات للمراجعة",
  "{n} set|targets": "محدّدة: {n}", // note: how many clients have targets you set; the bare "{n} set" (Food) reads «معبّأ»
  "Search meal plans and recipes": "ابحث في خطط الوجبات والوصفات",
  "Build a template once, then give each client their own copy.": "أنشئ نموذجًا مرة واحدة، ثم امنح كل عميل نسخته الخاصة.",
  "No templates match.": "لا نماذج مطابقة.",
  "No templates yet.": "لا نماذج بعد.",
  "No assigned plans match.": "لا خطط معيّنة مطابقة.",
  "No meal plans assigned yet.": "لم تُعيَّن أي خطط وجبات بعد.",
  "{pct}% on plan": "{pct}% ضمن الخطة", // note: health-related; the client's adherence over 14 days
  "Assign to clients": "التعيين للعملاء",
  "Assigned to {n} clients.": { zero: "عُيّنت لـ{n} عميل.", one: "عُيّنت لعميل واحد.", two: "عُيّنت لعميلين.", few: "عُيّنت لـ{n} عملاء.", many: "عُيّنت لـ{n} عميلًا.", other: "عُيّنت لـ{n} عميل." },
  "Delete this meal plan?": "حذف خطة الوجبات هذه؟",
  "Name the meal plan first.": "سمِّ خطة الوجبات أولًا.",
  "Keep the name under {n} characters.": "اجعل الاسم أقل من {n} حرفًا.",
  "Couldn't create the meal plan. Try again.": "تعذّر إنشاء خطة الوجبات. حاول مرة أخرى.",
  "Couldn't delete the meal plan. Try again.": "تعذّر حذف خطة الوجبات. حاول مرة أخرى.",

  // == Assign a template (NU13) ==
  "Assign template": "تعيين النموذج",
  "Assign to {n} clients": { zero: "التعيين لـ{n} عميل", one: "التعيين لعميل واحد", two: "التعيين لعميلين", few: "التعيين لـ{n} عملاء", many: "التعيين لـ{n} عميلًا", other: "التعيين لـ{n} عميل" },
  "{name} template · {days}": "نموذج {name} · {days}",
  "Loading clients…": "جارٍ تحميل العملاء…",
  "No clients yet.": "لا عملاء بعد.",
  "No clients with nutrition coaching on. Turn it on from a client's Plan tab.": "لا عملاء فُعّل لهم التدريب الغذائي. فعّله من تبويب «الخطة» لدى العميل.",
  "Already on this plan": "معيّن لهذه الخطة بالفعل",
  "Checking dietary needs…": "جارٍ التحقق من الاحتياجات الغذائية…", // note: health-related
  "Couldn't check dietary needs. Try again later.": "تعذّر التحقق من الاحتياجات الغذائية. حاول لاحقًا.", // note: health-related
  "{conflicts} Swap it in the template first.": "{conflicts} استبدله في النموذج أولًا.", // note: health-related; follows the conflict line for a confirmed allergy
  "Each client gets their own copy, where you can swap items. Foods with an allergen the client has recorded are never added.": "يحصل كل عميل على نسخته الخاصة، ويمكنك فيها استبدال العناصر. لا تُضاف أبدًا أطعمة تحتوي على مسبّب حساسية سجّله العميل.", // note: health-related
  "The end date must be after the start.": "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء.",
  "This plan contains an allergen the client has.": "تحتوي هذه الخطة على مسبّب حساسية لدى العميل.", // note: health-related
  "Nutrition coaching isn't on for this client.": "التدريب الغذائي غير مفعّل لهذا العميل.",
  "Couldn't assign the meal plan. Try again.": "تعذّر تعيين خطة الوجبات. حاول مرة أخرى.",

  // == Conflicts: a food against the client's allergies or diet (NU11–NU13) ==
  "{food} ({allergen} allergy, blocked)": "{food} (حساسية {allergen}، محظور)", // note: health-related
  "{food} (check for {allergen})": "{food} (تحقّق من وجود {allergen})", // note: health-related; a name match only
  "{food} (prefers {restriction})": "{food} (يفضّل {restriction})", // note: health-related
  "No conflicts": "لا تعارضات",
  "{n} conflicts: {list}.": { zero: "{n} تعارض: {list}.", one: "تعارض واحد: {list}.", two: "تعارضان: {list}.", few: "{n} تعارضات: {list}.", many: "{n} تعارضًا: {list}.", other: "{n} تعارض: {list}." }, // note: health-related
  "Allergies aren't shared, so they can't be checked.": "الحساسيات غير مُشارَكة، لذا لا يمكن التحقق منها.", // note: health-related; never implies the food is safe
  "{food} contains {allergen}": "يحتوي {food} على {allergen}", // note: health-related (as sharedfood on feat/eh-shared)
  "{food} may contain {allergen}. Check this.": "قد يحتوي {food} على {allergen}. تحقّق من هذا.", // note: health-related; a name match only
  "{food} isn't {restriction}": "{food} لا يتوافق مع {restriction}", // note: health-related (as sharedfood on feat/eh-shared)
  "{name} is allergic to {allergen} ({severity}). Foods with an allergen are blocked by default.": "لدى {name} حساسية تجاه {allergen} ({severity}). الأطعمة التي تحتوي على مسبّب حساسية محظورة افتراضيًا.", // note: health-related
  "{name} is allergic to {allergen}. Foods with an allergen are blocked by default.": "لدى {name} حساسية تجاه {allergen}. الأطعمة التي تحتوي على مسبّب حساسية محظورة افتراضيًا.", // note: health-related
  "The name suggests it. Check the ingredients with {name}.": "يوحي الاسم بذلك. تحقّق من المكوّنات مع {name}.", // note: health-related; a name match only
  "{name} follows {restriction}. You can still add it if you've agreed this with {name}.": "يتّبع {name} نظام {restriction}. يمكنك إضافته مع ذلك إن اتفقت على هذا مع {name}.", // note: health-related
  "{name} follows {restriction}.": "يتّبع {name} نظام {restriction}.", // note: health-related
  mild: "خفيفة", // note: health-related; an allergy's severity as the client recorded it
  moderate: "متوسطة", // note: health-related
  severe: "شديدة", // note: health-related
  "Keep it out": "استبعاده",
  "To allow it, {name} must update their allergies first.": "للسماح به، يجب أن يحدّث {name} معلومات الحساسية أولًا.", // note: health-related
  "Choose a swap": "اختيار بديل",

  // == Shared pieces (flags, the dietary-needs strip) ==
  "{allergen} allergy": "حساسية {allergen}", // note: health-related
  "Check this": "تحقّق من هذا", // note: health-related; a keyword match only (as sharedfood on feat/eh-shared)
  "Not {restriction}": "لا يتوافق مع {restriction}", // note: health-related; as "{food} isn't {restriction}"
  "{name}'s dietary needs": "الاحتياجات الغذائية لـ{name}", // note: health-related
  "Allergy: {allergen}": "حساسية: {allergen}", // note: health-related

  // == Add food (NU4) ==
  Meals: "الوجبات",
  "Your recipe · {n} servings": { zero: "وصفتك · {n} حصة", one: "وصفتك · حصة واحدة", two: "وصفتك · حصتان", few: "وصفتك · {n} حصص", many: "وصفتك · {n} حصة", other: "وصفتك · {n} حصة" },
  "Your meal · {n} foods": { zero: "وجبتك · {n} طعام", one: "وجبتك · طعام واحد", two: "وجبتك · طعامان", few: "وجبتك · {n} أطعمة", many: "وجبتك · {n} طعامًا", other: "وجبتك · {n} طعام" },
  "{serving} · your food": "{serving} · طعامك",
  "{serving} · verified": "{serving} · موثّق",
  "Add to {name}'s plan": "إضافة إلى خطة {name}",
  "Add to plan": "إضافة إلى الخطة",
  "{day} {meal}": "{meal}، {day}",
  "Swapping {item} · {where}": "استبدال {item} · {where}",
  "Adding to {where}": "إضافة إلى {where}",
  "Search foods, recipes and meals": "ابحث في الأطعمة والوصفات والوجبات",
  "Couldn't search foods. Check your connection and try again.": "تعذّر البحث في الأطعمة. تحقّق من اتصالك وحاول مرة أخرى.",
  "Nothing here yet.": "لا شيء هنا بعد.",
  "{line} · blocked": "{line} · محظور", // note: health-related; a confirmed allergen
  "Portion for {name}": "حصة {name}",
  Portion: "الحصة",
  "Portion in grams": "الحصة بالغرام",
  "Portion in servings": "الحصة بعدد الحصص",
  "Also add to the template": "الإضافة إلى النموذج أيضًا",
  "{plan}, for all clients on it": "{plan}، لجميع العملاء المعيّن لهم",
  "Clients already on the plan keep their own copy. The template change applies to new assignments.": "يحتفظ العملاء المعيّن لهم بنسختهم الخاصة. يسري تغيير النموذج على التعيينات الجديدة.",
  "Enter a portion above 0.": "أدخل حصة أكبر من 0.",
  "Couldn't add that. Try again.": "تعذّرت إضافة ذلك. حاول مرة أخرى.",
  "Couldn't swap that. Try again.": "تعذّر استبدال ذلك. حاول مرة أخرى.",
  "Couldn't remove that. Try again.": "تعذّرت إزالة ذلك. حاول مرة أخرى.",

  // == Meal plan builder (NU2) ==
  "No nutrition data": "لا بيانات غذائية",
  "Recipe · {n} servings · {kcal}": { zero: "وصفة · {n} حصة · {kcal}", one: "وصفة · حصة واحدة · {kcal}", two: "وصفة · حصتان · {kcal}", few: "وصفة · {n} حصص · {kcal}", many: "وصفة · {n} حصة · {kcal}", other: "وصفة · {n} حصة · {kcal}" },
  "Meal · {n} servings · {kcal}": { zero: "وجبة · {n} حصة · {kcal}", one: "وجبة · حصة واحدة · {kcal}", two: "وجبة · حصتان · {kcal}", few: "وجبة · {n} حصص · {kcal}", many: "وجبة · {n} حصة · {kcal}", other: "وجبة · {n} حصة · {kcal}" },
  "{lo} to {hi} kcal": "{lo} إلى {hi} سعرة",
  "Day {n} total": "مجموع اليوم {n}",
  "{day} total": "مجموع {day}",
  "This meal plan isn't available": "خطة الوجبات هذه غير متاحة",
  "It may have been deleted.": "ربما حُذفت.",
  "Pick a day first.": "اختر يومًا أولًا.",
  "The template has no matching day.": "لا يوجد في النموذج يوم مطابق.",
  "Added to {name}'s plan. The template couldn't be updated: {message}": "أُضيف إلى خطة {name}. تعذّر تحديث النموذج: {message}",
  "Plan targets": "أهداف الخطة",
  "Add a playlist": "إضافة قائمة تشغيل",
  "End {name}'s plan": "إنهاء خطة {name}",
  "End this plan": "إنهاء هذه الخطة",
  "Delete template": "حذف النموذج",
  "{name}'s copy": "نسخة {name}",
  "This plan has ended. Changes won't reach the client.": "انتهت هذه الخطة. لن تصل التغييرات إلى العميل.",
  "Add food to {meal}": "إضافة طعام إلى {meal}",
  "End {name}'s plan?": "إنهاء خطة {name}؟",
  "It stops today. Nothing is deleted.": "تتوقف اليوم. لا يُحذف شيء.",
  "End plan": "إنهاء الخطة",
  "{n} of {target} kcal": "{n} من {target} سعرة",
  "Nothing planned yet": "لا شيء مخطط بعد",
  "{macro} {n} g over.": "{macro} أعلى من الهدف بـ{n} غ.", // note: health-related; the plan's day against its own target
  "Meal plan name": "اسم خطة الوجبات",
  "Shown with this client's plan.": "تظهر مع خطة هذا العميل.",
  "Shown with the plan. Clients you assign it to get it with their copy.": "تظهر مع الخطة. يحصل عليها العملاء الذين تعيّنها لهم مع نسختهم.",
  "Your playlist": "قائمة تشغيلك",
  "Daily calories": "السعرات اليومية",
  "kcal / day": "سعرة / يوم",
  "Couldn't save the meal plan. Try again.": "تعذّر حفظ خطة الوجبات. حاول مرة أخرى.",
  "Couldn't end the meal plan. Try again.": "تعذّر إنهاء خطة الوجبات. حاول مرة أخرى.",

  // == Food journals (NU5 / NU6) ==
  "Reviewed|journal": "تمت المراجعة", // note: a day you've left feedback on; the bare "Reviewed" (member reviews) reads «تم التقييم»
  "Waiting {n}": "بالانتظار {n}",
  "Nothing reviewed yet": "لم تُراجَع أي أيام بعد",
  "Days your clients log show here when they share their food diary with you.": "تظهر هنا الأيام التي يسجّلها عملاؤك عندما يشاركون يوميات طعامهم معك.",
  "Days you've left feedback on show here.": "تظهر هنا الأيام التي تركت عليها ملاحظاتك.",
  "{n} days logged · {range}": { zero: "لا أيام مسجّلة · {range}", one: "يوم واحد مسجّل · {range}", two: "يومان مسجّلان · {range}", few: "{n} أيام مسجّلة · {range}", many: "{n} يومًا مسجّلًا · {range}", other: "{n} يوم مسجّل · {range}" },
  "Protein under target {under} of {n} days": { zero: "البروتين دون الهدف في {under} من {n} يوم", one: "البروتين دون الهدف في {under} من يوم واحد", two: "البروتين دون الهدف في {under} من يومين", few: "البروتين دون الهدف في {under} من {n} أيام", many: "البروتين دون الهدف في {under} من {n} يومًا", other: "البروتين دون الهدف في {under} من {n} يوم" }, // note: health-related; a count of logged days, no judgement
  "Protein on target": "البروتين ضمن الهدف", // note: health-related
  "Great choice": "اختيار رائع",
  "Love this": "أحببت هذا",
  "Strong choice": "اختيار قوي",
  Question: "سؤال",
  "Food journal · {date}": "يوميات الطعام · {date}",
  "Asked.": "تم الطلب.",
  "Nothing logged": "لا شيء مسجّل",
  "{name} hasn't logged anything on this day.": "لم يسجّل {name} أي شيء في هذا اليوم.",
  "{kcal} kcal · {protein} g protein": "{kcal} سعرة · {protein} غ بروتين",
  Comment: "تعليق",
  "A note for the whole day and Mark reviewed. A day counts as reviewed once you've left feedback on it.": "ملاحظة لليوم كله و«تحديد كمراجَع». يُحتسب اليوم مراجَعًا بمجرد أن تترك ملاحظة عليه.",
  "Swap suggestion": "اقتراح بديل",
  "Target {n}": "الهدف {n}",
  "No target set": "لم يُحدَّد هدف",
  "{title} · You": "{title} · أنت",
  "{name}:": "{name}:",
  "Keep it under {n} characters.": "اجعله أقل من {n} حرفًا.",
  "Couldn't send that. Try again.": "تعذّر إرسال ذلك. حاول مرة أخرى.",
  "{n} to go": "تبقّى {n}", // note: as member.ts on feat/eh-member; feat/eh-health has «متبقٍّ {n}» for the same key (a clash between those two branches)

  // == Recipes (NU9) ==
  "New recipe": "وصفة جديدة",
  "Search recipes": "ابحث في الوصفات",
  "Recipes you save here can go into any meal plan.": "يمكن إضافة الوصفات التي تحفظها هنا إلى أي خطة وجبات.",
  "No matches": "لا نتائج مطابقة",
  "Try another name.": "جرّب اسمًا آخر.",
  Sort: "الترتيب",
  "Most protein": "الأكثر بروتينًا",

  // == Targets (NU8) ==
  "Targets and dietary needs": "الأهداف والاحتياجات الغذائية", // note: health-related
  "{name} sees this as an Existing plan, locked to you.": "يرى {name} هذا «خطةً قائمة» لا يعدّلها سواك.",
  "{name} can still change these targets.": "لا يزال بإمكان {name} تغيير هذه الأهداف.",
  "Protein, carbs and fat must add up to 100%.": "يجب أن يكون مجموع البروتين والكربوهيدرات والدهون 100%.",
  "Saved. {name} has been notified.": "تم الحفظ. أُبلغ {name}.",
  "Lock these targets": "قفل هذه الأهداف",
  "Only you can change them while {name}'s plan is locked.": "أنت وحدك تستطيع تغييرها ما دامت خطة {name} مقفلة.",
  "Micronutrient targets": "أهداف المغذيات الدقيقة", // note: health-related
  "Sodium, fibre and vitamin targets per client.": "أهداف الصوديوم والألياف والفيتامينات لكل عميل.", // note: health-related
  "You set these on {date}.": "حدّدت هذه الأهداف في {date}.",
  "Save and notify {name}": "حفظ وإبلاغ {name}",
  "This client": "هذا العميل",
  "Nutrition targets": "الأهداف الغذائية", // note: health-related
  "No targets set": "لا أهداف محدّدة",
  "{name} hasn't set nutrition targets yet.": "لم يحدّد {name} أهدافًا غذائية بعد.",
  "Read only. Set by a professional on {date}.": "للقراءة فقط. حدّدها مختص في {date}.",
  "Read only. Set by {name} on {date}.": "للقراءة فقط. حدّدها {name} في {date}.",
  "Protein {p}%, carbs {c}%, fat {f}%": "البروتين {p}%، الكربوهيدرات {c}%، الدهون {f}%",
  "Protein {n} g": "البروتين {n} غ",
  "Carbs {n} g": "الكربوهيدرات {n} غ",
  "Fat {n} g": "الدهون {n} غ",
  "Targets you set for clients show here.": "تظهر هنا الأهداف التي تحدّدها لعملائك.",
  "Turn on nutrition coaching from a client's Plan tab to set targets.": "فعّل التدريب الغذائي من تبويب «الخطة» لدى العميل لتحديد الأهداف.",
  "{kcal} kcal · {pct}% protein · locked": "{kcal} سعرة · {pct}% بروتين · مقفلة",
  "{kcal} kcal · {pct}% protein": "{kcal} سعرة · {pct}% بروتين",
  "Not set by you": "لم تحدّدها أنت",
  "Set a daily target first.": "حدّد هدفًا يوميًا أولًا.",
  "Enter a target weight between 1 and 500 kg.": "أدخل وزنًا مستهدفًا بين 1 و500 كغ.", // note: health-related
  "Couldn't save the targets. Try again.": "تعذّر حفظ الأهداف. حاول مرة أخرى.",

  // == Targets · the maintenance estimate (TDEE) ==
  "Needs height, age, sex and activity": "يلزم الطول والعمر والجنس والنشاط", // note: health-related
  "{name} hasn't shared their height, age, sex and activity level with you, so no maintenance estimate is made.": "لم يشارك {name} طوله وعمره وجنسه ومستوى نشاطه معك، لذا لا يُقدَّر احتياج الحفاظ على الوزن.", // note: health-related
  height: "الطول",
  "date of birth": "تاريخ الميلاد",
  "activity level": "مستوى النشاط",
  "{name} hasn't added their {list} yet, so no maintenance estimate is made.": "لم يُضف {name} {list} بعد، لذا لا يُقدَّر احتياج الحفاظ على الوزن.", // note: health-related; {list} is «الطول» / «تاريخ الميلاد» / «الجنس» / «مستوى النشاط» joined with «و»
  "Needs a weigh-in": "يلزم قياس وزن", // note: health-related
  "{name} hasn't logged a weigh-in yet. Mifflin-St Jeor needs a current weight.": "لم يسجّل {name} قياس وزن بعد. تحتاج معادلة Mifflin-St Jeor إلى وزن حالي.", // note: health-related; the formula's name stays in Latin letters
  "{name}'s weigh-ins aren't shared with you. Mifflin-St Jeor needs a current weight.": "قياسات وزن {name} غير مُشارَكة معك. تحتاج معادلة Mifflin-St Jeor إلى وزن حالي.", // note: health-related

  // == Shared words these screens use (the same Arabic as the food, member and business areas) ==
  "Recipes": "الوصفات",
  "Foods": "الأطعمة",
  "Swap": "استبدال",
  "Add anyway": "إضافة رغم ذلك",
  "Add Food": "إضافة طعام",
  "Searching…": "جارٍ البحث…",
  "Nothing matches that search.": "لا شيء يطابق هذا البحث.",
  "{n} kcal": "{n} سعرة",
  "serving": "حصة",
  "protein": "بروتين",
  "carbs": "كربوهيدرات",
  "fat": "دهون",
  "Ends (optional)": "ينتهي (اختياري)",
  "Waiting": "بالانتظار",
  "{name} options": "خيارات {name}",
  "Starts {date}": "يبدأ في {date}",
  "Create": "إنشاء",
  "Length": "المدة",
  "{n} over": "{n} فوق الهدف",
  "Sedentary": "قليل الحركة",
  "Lightly active": "نشاط خفيف",
  "Moderately active": "نشاط معتدل",
  "Very active": "نشاط عالٍ",
  "sex": "الجنس",
  "Rename": "إعادة التسمية",
  "of {n} kcal": "من {n} سعرة",
  "{n} left": "متبقٍّ {n}",
  "No recipes yet": "لا وصفات بعد",
  "Macro distribution": "توزيع العناصر الكبرى",

  // == Shared with other pro areas (same Arabic as proforms and provitals) ==
  "{name}: {message}": "{name}: {message}",
  Day: "اليوم",
  kcal: "سعرة",
  Unit: "الوحدة",
};

export default pronutrition;
