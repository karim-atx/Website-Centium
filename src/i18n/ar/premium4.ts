import type { Catalogue } from "../core";

// Round G4, Arabic: every label around the member's own meal planner and
// grocery list, progress photos, the Premium colour themes and share-card
// designs, and cycle phase insights. Every entry is in
// design-handover/round-g/ARABIC_REVIEW_G.md for Karim's review before merge.
//
// note (whole file): the cycle insights themselves (titles and bodies) are
// Database copy in the member's language, loaded after Karim approves it;
// they are not here. Premium stays «Premium» / «Centium Premium» (brand), as
// in Rounds G1 to G3. Terms: meal plan «خطة الوجبات», grocery list «قائمة
// المشتريات», progress photo «صورة التقدّم» (as the professional's «صور
// التقدّم»), colour theme «سمة الألوان», share card «بطاقة المشاركة», phase
// «المرحلة». Keys shared with the open EH branches carry their Arabic exactly
// (the clash check); where the same English means something else there
// («Amount» as money, «Bold» as type weight, «Back» as go back), this file
// uses a context key (tx).

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "services/premium/g4.ts",
  "services/premium/g4Calls.ts",
  "components/premium/g4/useG4.ts",
  "components/premium/g4/parts.tsx",
  "pages/food/planner/MealPlannerEntry.tsx",
  "pages/food/planner/MealPlannerPage.tsx",
  "pages/food/planner/PlanItemSheet.tsx",
  "pages/food/planner/GroceryListSheet.tsx",
  "pages/workout/photos/ProgressPhotosEntry.tsx",
  "pages/workout/photos/ProgressPhotosPage.tsx",
  "theme/colorThemes.ts",
  "components/share/client/premiumDesigns.ts",
  "components/share/client/PremiumDesignChips.tsx",
  "components/cycle/PhaseInsightsCard.tsx",
];

const premium4: Catalogue = {
  // == The features table (services/premium/features, Round G4's entries) ==
  "Meal planner and grocery list": "مخطط الوجبات وقائمة المشتريات",
  "Premium lets you plan your week of meals and turns it into a grocery list.": "يتيح لك Premium تخطيط وجبات أسبوعك ويحوّلها إلى قائمة مشتريات.",
  "Progress photos": "صور التقدّم",
  "Premium keeps private progress photos and puts two side by side.": "يحفظ Premium صور تقدّمك بخصوصية ويضع صورتين جنبًا إلى جنب.",
  "Extra colour themes": "سمات ألوان إضافية",
  "Premium adds more colour themes for the app.": "يضيف Premium سمات ألوان أخرى للتطبيق.",
  "Extra share card designs": "تصاميم إضافية لبطاقات المشاركة",
  "Premium adds more designs for the cards you share.": "يضيف Premium تصاميم أخرى للبطاقات التي تشاركها.",
  "Cycle phase insights": "معلومات عن مراحل الدورة",
  "Premium explains the phase of your cycle you are in.": "يشرح لك Premium المرحلة التي أنت فيها من دورتك.",

  // == The meal planner (pages/food/planner, services/premium/g4) ==
  "Meal planner": "مخطط الوجبات",
  "Plan your week and get a grocery list": "خطّط لأسبوعك واحصل على قائمة مشتريات",
  "Previous week": "الأسبوع السابق",
  "Next week": "الأسبوع التالي",
  "Week of {day}": "أسبوع {day}",
  "Back to this week": "العودة إلى هذا الأسبوع",
  "Nothing planned for this week yet.": "لا شيء مخطّط لهذا الأسبوع بعد.",
  "Plan this week": "خطّط لهذا الأسبوع",
  "Nothing planned.": "لا شيء مخطّط.",
  "Add": "إضافة",
  "Add to {day}": "إضافة إلى {day}",
  "Move up": "نقل لأعلى",
  "Move down": "نقل لأسفل",
  "Delete this week's plan": "حذف خطة هذا الأسبوع",
  "Delete this week's plan?": "حذف خطة هذا الأسبوع؟",
  "Its meals and grocery ticks are deleted too.": "تُحذف وجباتها وعلامات قائمة المشتريات أيضًا.",
  "Couldn't delete the plan. Try again.": "تعذّر حذف الخطة. حاول مرة أخرى.",
  "This week already has a plan.": "لهذا الأسبوع خطة بالفعل.",
  "Check the amount and try again.": "تحقّق من الكمية وحاول مرة أخرى.",
  "{n} kcal": "{n} سعرة",
  "Note": "ملاحظة",
  "What to add": "ما الذي تضيفه",
  "Recipe": "وصفة",
  "Servings": "الحصص",
  "Amount|food quantity": "الكمية",
  "Unit": "الوحدة",
  "serving": "حصة",
  "cup": "كوب",
  "ml": "مل",
  "tbsp": "ملعقة كبيرة",
  "tsp": "ملعقة صغيرة",
  "{n} cups": { zero: "{n} أكواب", one: "كوب واحد", two: "كوبان", few: "{n} أكواب", many: "{n} كوبًا", other: "{n} كوب" }, // note: a fractional count (2.5) takes "other": «2.5 كوب»
  "{n} tbsp": "{n} ملعقة كبيرة",
  "{n} tsp": "{n} ملعقة صغيرة",
  "Search foods": "ابحث عن الأطعمة",
  "No foods found.": "لم يُعثر على أطعمة.",
  "You have no recipes yet. Create one in Food › Custom › Recipes.": "ليست لديك وصفات بعد. أنشئ واحدة من الطعام › مخصّص › الوصفات.",
  "For example: eat out with friends": "مثلًا: عشاء خارج المنزل مع الأصدقاء",
  "Write a note.": "اكتب ملاحظة.",
  "Keep the note to 200 characters.": "اجعل الملاحظة 200 حرف أو أقل.",
  "Choose a recipe.": "اختر وصفة.",
  "Choose a food.": "اختر طعامًا.",
  "Servings must be more than 0 and at most 20.": "يجب أن تكون الحصص أكثر من 0 و20 على الأكثر.",
  "The amount must be more than 0 and at most 10,000.": "يجب أن تكون الكمية أكثر من 0 و10,000 على الأكثر.",

  // == The grocery list (pages/food/planner/GroceryListSheet) ==
  "Grocery list": "قائمة المشتريات",
  "Everything this week's plan needs": "كل ما تحتاجه خطة هذا الأسبوع",
  "Add meals to the plan and they show up here.": "أضف وجبات إلى الخطة وستظهر هنا.",
  "In the basket": "في السلة",
  "For {recipes}": "لـ {recipes}",

  // == Progress photos (pages/workout/photos, services/premium/g4) ==
  "Private to you. Compare two side by side.": "خاصة بك وحدك. قارن صورتين جنبًا إلى جنب.",
  "Only you can see these photos.": "لا يرى هذه الصور أحد غيرك.",
  "No progress photos yet.": "لا توجد صور تقدّم بعد.",
  "Add one to start. Choose two to compare them side by side.": "أضف صورة لتبدأ. اختر صورتين لمقارنتهما جنبًا إلى جنب.",
  "Choose two photos to compare them.": "اختر صورتين لمقارنتهما.",
  "Progress photo, {pose}, {day}": "صورة تقدّم، {pose}، {day}",
  "Progress photo, {day}": "صورة تقدّم، {day}",
  "Delete photo": "حذف الصورة",
  "Delete this photo?": "حذف هذه الصورة؟",
  "It is deleted for good.": "ستُحذف نهائيًا.",
  "Couldn't delete the photo. Try again.": "تعذّر حذف الصورة. حاول مرة أخرى.",
  "Photo added.": "أُضيفت الصورة.",
  "Side by side": "جنبًا إلى جنب",
  "Earlier · {day}": "الأقدم · {day}",
  "Later · {day}": "الأحدث · {day}",
  "{n} days apart": { zero: "بينهما {n} يوم", one: "بينهما يوم واحد", two: "بينهما يومان", few: "بينهما {n} أيام", many: "بينهما {n} يومًا", other: "بينهما {n} يوم" },
  "Same day": "في اليوم نفسه",
  "Choose two of your own photos.": "اختر صورتين من صورك.",
  "Add a progress photo": "إضافة صورة تقدّم",
  "Choose a photo": "اختر صورة",
  "Choose a photo.": "اختر صورة.",
  "The photo you chose": "الصورة التي اخترتها",
  "JPEG, PNG, WebP or HEIC, up to 10 MB": "JPEG أو PNG أو WebP أو HEIC، حتى 10 ميغابايت",
  "Choose a JPEG, PNG, WebP or HEIC photo.": "اختر صورة بصيغة JPEG أو PNG أو WebP أو HEIC.",
  "That file is empty.": "هذا الملف فارغ.",
  "Choose a photo under 10 MB.": "اختر صورة أصغر من 10 ميغابايت.",
  "Taken on": "تاريخ التقاطها",
  "Choose a date that isn't in the future.": "اختر تاريخًا ليس في المستقبل.",
  "Pose": "الوضعية",
  "Front|photo pose": "من الأمام",
  "Side|photo pose": "من الجانب",
  "Back|photo pose": "من الخلف",
  "Other|photo pose": "أخرى",
  "Note (optional)": "ملاحظة (اختياري)",
  "Save photo": "حفظ الصورة",
  "Couldn't save the photo. Try again.": "تعذّر حفظ الصورة. حاول مرة أخرى.",

  // == Colour themes (theme/colorThemes, components/profile/ColorThemePicker, services/presentation/save) ==
  "Premium themes": "سمات Premium",
  "Forest sage": "أخضر الغابة",
  "Midnight indigo": "نيلي منتصف الليل",
  "Plum lilac": "برقوقي ليلكي",
  "That colour theme is part of Centium Premium.": "سمة الألوان هذه جزء من Centium Premium.",

  // == Share-card designs (components/share/client/PremiumDesignChips) ==
  "Bold|share card design": "جريء",
  "Gradient": "متدرّج",
  "Premium badge": "شارة Premium",

  // == Cycle phase insights (components/cycle/PhaseInsightsCard) ==
  "Phase insights": "معلومات المرحلة",
  "{phase} · day {n}": "{phase} · اليوم {n}",
  "Day {n} of your cycle": "اليوم {n} من دورتك",
  // == Round J · the phone's camera (App-Centium ROUND_J.md §4) ==
  "The camera couldn't start. Choose a photo from your gallery instead.": "تعذّر تشغيل الكاميرا. اختر صورة من معرض الصور بدلًا من ذلك.",
  "Camera access is off for Centium. Allow it in your phone's settings.": "الوصول إلى الكاميرا متوقف لـCentium. اسمح به من إعدادات الهاتف.",
  "Choose from gallery": "الاختيار من معرض الصور",
};

export default premium4;
