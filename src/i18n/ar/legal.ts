import type { Catalogue } from "../core";

// Round F (AV), Arabic: the legal pages (Terms, Privacy, Health) and the in-app legal summaries.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
//
// The legal DOCUMENTS are not here: their Arabic is a parallel structure of
// the same shape as the English, chosen by language at render:
//   marketing/legal/text.ar.ts        the Terms, Privacy Policy and Health & Medical Disclaimer
//   marketing/legal/guidelines.ar.ts  the Community guidelines
//   pages/settings/legalCopy.ar.ts    the in-app Privacy and Terms summaries
// note: the lawyer must confirm those legal translations. The English says
// nothing about which language version prevails, so no such line is added;
// whether the Arabic pages need one is Karim's decision.
export const FILES: string[] = [
  "marketing/pages/Legal.tsx",
  "marketing/legal/anchors.ts",
  "pages/settings/TermsPage.tsx",
  "pages/settings/PrivacyPage.tsx",
  "components/settings/LegalText.tsx",
];

const legal: Catalogue = {
  // == Legal page (website) ==
  Legal: "قانوني",
  "Centium's Terms of Service, Privacy Policy, and Health & Medical Disclaimer.": "شروط خدمة Centium وسياسة الخصوصية وإخلاء المسؤولية الصحية والطبية.",
  "Terms, privacy and health": "الشروط والخصوصية والصحة",
  "Last updated {date}": "آخر تحديث: {date}", // note: as the Arabic Refund and Cancellation Policy writes it
  Contents: "المحتويات",
  "ON THIS PAGE": "في هذه الصفحة",
  "Privacy Policy": "سياسة الخصوصية",
  "Health & Medical Disclaimer": "إخلاء المسؤولية الصحية والطبية",
  "In detail": "بالتفصيل",
  "Back to home": "العودة إلى الرئيسية",

  // == Settings › Terms of Service ==
  // The app's HEALTH_DISCLAIMER (services/legal/disclaimer.ts), shown as t(HEALTH_DISCLAIMER): the same words as text.ar.ts INTRO.health.
  "Centium supports your health journey. It does not provide medical diagnosis or treatment.": "تدعم Centium رحلتك الصحية. ولا تقدّم تشخيصًا أو علاجًا طبيًا.",
  "Health and Medical Disclaimer": "إخلاء المسؤولية الصحية والطبية",
  "Read the full Terms of Service": "قراءة شروط الخدمة كاملةً",

  // == Settings › Privacy ==
  "Your controls": "عناصر التحكم لديك",
  "Sharing with professionals": "المشاركة مع المختصين",
  "Manage what each professional can see": "تحكّم في ما يمكن لكل مختص رؤيته",
  "Read receipts": "إيصالات القراءة",
  "Turn off to stop sharing when you've read messages. You won't be able to see others' read receipts either.":
    "أوقفها لتتوقّف عن إظهار أنك قرأت الرسائل. ولن تتمكّن أنت أيضًا من رؤية إيصالات قراءة الآخرين.",
  "Delete my account": "حذف حسابي",
  "Delete business account": "حذف حساب النشاط التجاري",
  "Schedules deletion after a 30-day grace period": "يُجدوَل الحذف بعد مهلة سماح مدتها 30 يومًا",
  "Read the full Privacy Policy": "قراءة سياسة الخصوصية كاملةً",
};

export default legal;
