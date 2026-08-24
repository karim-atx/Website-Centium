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
    "Currently on": "مفعّل حالياً",
    "Currently off": "غير مفعّل حالياً",
    "applies throughout Centium": "يُطبَّق في جميع أنحاء التطبيق",
    "Color theme": "لون السمة",
    Permissions: "الأذونات",
    Microphone: "الميكروفون",
    "Needed for AI voice logging": "مطلوب للتسجيل الصوتي بالذكاء الاصطناعي",
    Granted: "تم المنح",
    Denied: "مرفوض",
    "Re-check": "إعادة التحقق",
    Allow: "السماح",
    Camera: "الكاميرا",
    "Needed for scanning biomarkers & photos": "مطلوب لمسح المؤشرات الحيوية والصور",
    "Connected devices": "الأجهزة المتصلة",
    General: "عام",
    Notifications: "الإشعارات",
    Language: "اللغة",
    English: "English",
    Arabic: "العربية",
    Privacy: "الخصوصية",
    "Contact us": "تواصل معنا",

    // Home page
    "Good morning": "صباح الخير",
    "Good afternoon": "مساء الخير",
    "Good evening": "مساء الخير",
    "Here's your day": "إليك يومك",
    "Your business dashboard": "لوحة تحكم عملك",
  },
};
