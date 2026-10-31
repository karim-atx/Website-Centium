import type { Catalogue } from "../core";

// Round F · 3, Arabic: Your certificates (Courses › Certificates, a certificate's page and its card).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. Courses and Profile
// are still English (a later round); their one new label each ("Certificates",
// "My certificates") is here too, so the way in reads in Arabic.
export const FILES: string[] = [
  "components/courses/certificates/CertificateCard.tsx",
  "components/courses/certificates/CertificatesList.tsx",
  "components/courses/certificates/CertificateView.tsx",
];

const certificates: Catalogue = {
  // The ways in
  Certificates: "الشهادات",
  "My certificates": "شهاداتي",
  "Your certificates": "شهاداتك",

  // The list
  "No certificates yet": "لا شهادات بعد",
  "Finish every lesson and pass every quiz in a course to earn one.": "أكمل كل دروس الدورة وانجح في كل اختباراتها لتحصل على شهادة.",
  "Earned {date}": "حصلت عليها في {date}",
  Shared: "مُشارَكة",

  // A certificate's page
  "We couldn't find that certificate.": "لم نتمكن من العثور على هذه الشهادة.",
  "This course is no longer available. Your certificate stays yours, and a shared link still works.":
    "لم تعد هذه الدورة متاحة. تبقى شهادتك لك، ويظل الرابط الذي شاركته يعمل.",
  "Open the course": "فتح الدورة",

  // The certificate card (also on the course page)
  "Certificate of completion": "شهادة إتمام",
  "Share certificate": "مشاركة الشهادة",
  "Anyone with the link can see your first name, this course, the professional and the date.":
    "يمكن لأي شخص لديه الرابط أن يرى اسمك الأول وهذه الدورة والمختص والتاريخ.",
  "Anyone with the link can see your first name, this course and the date.":
    "يمكن لأي شخص لديه الرابط أن يرى اسمك الأول وهذه الدورة والتاريخ.",
  "Off. Only you can see it.": "متوقفة. لا يراها أحد غيرك.",
  "Couldn't copy the link. Select it and copy it by hand.": "تعذّر نسخ الرابط. حدّده وانسخه يدويًا.",
  "Finish every lesson and pass every quiz to earn it.": "أكمل كل الدروس وانجح في كل الاختبارات لتحصل عليها.",
};

export default certificates;
