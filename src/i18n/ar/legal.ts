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
// note: the lawyer must confirm those legal translations. Every legal page
// says it is published in English and Arabic and the Arabic prevails (Karim,
// A11).
export const FILES: string[] = [
  "marketing/pages/Legal.tsx",
  "marketing/legal/anchors.ts",
  "pages/settings/TermsPage.tsx",
  "pages/settings/PrivacyPage.tsx",
  "components/settings/LegalText.tsx",
  "marketing/legal/refund.ts",
  "components/legal/RefundPolicyLink.tsx",
  "services/legal/billingHelp.ts",
  "pages/settings/BillingHelpPage.tsx",
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

  // == Refund and Cancellation Policy links ==
  "Refund and Cancellation Policy": "سياسة الاسترداد والإلغاء", // note: the policy's title, as Karim's Arabic file has it; the Terms sentence links these words
  "Refund and cancellation policy": "سياسة الاسترداد والإلغاء", // note: the link on every plan screen and in Settings › Legal
  "Refund policy": "سياسة الاسترداد", // note: the website footer's short link

  // == Billing and refunds (Settings, and the business Help centre) ==
  "Billing and refunds": "الفوترة والاسترداد",
  "Centium plans are bought in the Centium app, through the App Store or Google Play.": "تُشترى خطط Centium في تطبيق Centium، عبر App Store أو Google Play.",
  "To cancel, open the subscriptions in your Apple or Google account settings. Your plan stays active until the end of the period you've paid for, then stops renewing.":
    "للإلغاء، افتح الاشتراكات في إعدادات حسابك على Apple أو Google. تبقى خطتك فعّالة حتى نهاية الفترة التي دفعت ثمنها، ثم يتوقف تجديدها.",
  "Refunds are made by Apple or Google, under their own rules. Ask Apple at reportaproblem.apple.com, or Google through Google Play. Centium can't issue refunds for App Store purchases.":
    "تتولّى Apple أو Google ردّ المبالغ، وفق قواعدهما الخاصة. اطلب ذلك من Apple على reportaproblem.apple.com، أو من Google عبر Google Play. ولا تستطيع Centium ردّ مبالغ مشتريات App Store.",
  "If you were charged twice, charged after cancelling in time, or charged the wrong amount, contact us below with your account email, what you bought, the date and the reason. We'll support your request and reply within 5 business days.":
    "إذا احتُسب عليك المبلغ مرتين، أو احتُسب بعد أن ألغيت في الوقت المحدد، أو احتُسب مبلغ خاطئ، فتواصل معنا أدناه مع ذكر البريد الإلكتروني لحسابك وما اشتريته والتاريخ والسبب. سندعم طلبك ونردّ خلال 5 أيام عمل.",
  "Read more": "اقرأ المزيد",
  Billing: "الفوترة",
};

export default legal;
