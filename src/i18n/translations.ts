// V6 (QA 6.0): i18n foundation for the English/Arabic settings toggle.
// Scope is a representative core subset (nav, Settings, Home) rather than
// an exhaustive full-app translation — t() falls back to the English key
// for anything not yet in the dictionary, so partial coverage never
// breaks or blanks out untranslated screens.

export type Language = "en" | "ar";

export const translations: Record<Language, Record<string, string>> = {
  en: {},
  ar: {
    // Navigation
    Home: "الرئيسية",
    Food: "الطعام",
    Workout: "التمرين",
    Health: "الصحة",
    More: "المزيد",
    Clients: "العملاء",
    Mind: "العقل",
    Professionals: "المختصون",
    Explore: "استكشف",
    Profile: "الملف الشخصي",
    "My Clients": "عملائي",
    Back: "رجوع",

    // Settings page
    Settings: "الإعدادات",
    Appearance: "المظهر",
    "Dark Mode": "الوضع الداكن",
    "Currently on": "مفعّل حاليًا",
    // MO1.8.5.1 (the frame's Arabic copy, handover-complete pass).
    "Currently off": "متوقف حاليًا",
    "Applies throughout Centium": "يُطبَّق على كل Centium",
    "Color theme": "سمة الألوان",
    Centium: "سنتيوم",
    Sky: "سماء",
    Rose: "وردي",
    Gold: "ذهبي",
    Coral: "مرجاني",
    Permissions: "الأذونات",
    Microphone: "الميكروفون",
    "Needed for AI voice logging": "مطلوب للتسجيل الصوتي بالذكاء الاصطناعي",
    Granted: "تم المنح",
    Denied: "مرفوض",
    "Re-check": "إعادة التحقق",
    Allow: "السماح",
    Camera: "الكاميرا",
    Location: "الموقع",
    "Blocked in browser settings": "محظور في إعدادات المتصفح",
    "Change this in your browser settings": "غيّر ذلك من إعدادات المتصفح",
    "Needed to find gyms & businesses near you": "مطلوب للعثور على النوادي والأعمال القريبة منك",
    "Needed for scanning biomarkers & photos": "مطلوب لمسح المؤشرات الحيوية والصور",
    "Push notifications": "الإشعارات الفورية",
    "Needed for calls & messages when Centium is closed":
      "مطلوب للمكالمات والرسائل عند إغلاق التطبيق",
    "Not available in this browser": "غير متاح في هذا المتصفح",
    "Add Centium to your Home Screen to receive call notifications when the app is closed":
      "أضف Centium إلى الشاشة الرئيسية لتلقي إشعارات المكالمات عند إغلاق التطبيق",
    "Connected devices": "الأجهزة المتصلة",
    Security: "الأمان",
    "Two-factor authentication": "المصادقة الثنائية",
    General: "عام",
    Notifications: "الإشعارات",
    Language: "اللغة",
    English: "English",
    Arabic: "العربية",
    Privacy: "الخصوصية",
    "Contact us": "اتصل بنا",
    Accessibility: "إمكانية الوصول",
    "Terms of Service": "شروط الخدمة",
    "Report a bug": "الإبلاغ عن خطأ",
    "Rate this app": "قيّم التطبيق",
    "Delete account": "حذف الحساب",

    // Home page
    "Good morning": "صباح الخير",
    "Good afternoon": "مساء الخير",
    "Good evening": "مساء الخير",
    "Here's your day": "إليك يومك",
    "Your business dashboard": "لوحة تحكم عملك",
  },
};
