import type { Catalogue } from "../core";

// Round G5, Arabic: class credits for class-slot hires, and professional
// plans bought in the Centium app. Every entry is in the regenerated Arabic
// review for Karim's review before merge.
//
// note (whole file): a class credit is «رصيد حصة» (plural «أرصدة حصص»; «أرصدة
// الحصص» with the article), beside G1's hiring credit «رصيد توظيف». A
// class-slot hire is G1's «التوظيف لحصة محددة». The Buy block's lines,
// «تطبيق Centium», "Bought in the Centium app" «تم شراؤها من تطبيق Centium»,
// "renews {date}", Monthly / Yearly and the pack lines ("{remaining} of {n}
// credits left, until {date}") are reused from Rounds F and G1 unchanged.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. The other G5 screens
// (the hiring pages, the hire confirmation, the plan page, the cap notices)
// are already listed by their own areas.
export const FILES: string[] = ["components/premium/ClassCreditsCard.tsx"];

const premium5: Catalogue = {
  // == Class credits (components/premium/ClassCreditsCard, the hiring pages) ==
  "Class credits": "أرصدة الحصص",
  "Each class-slot hire uses 1 class credit instead of the hiring fee.": "يستخدم كل توظيف لحصة محددة رصيد حصة واحدًا بدلًا من رسم التوظيف.",
  "Each role hire uses 1 hiring credit instead of the hiring fee.": "يستخدم كل توظيف لوظيفة رصيد توظيف واحدًا بدلًا من رسم التوظيف.", // note: G1's hiring credits card while class credits are on (its first sentence, unchanged)
  "Couldn't load your class credits.": "تعذّر تحميل أرصدة الحصص.",

  // == Buy class credits in the Centium app (components/premium/BuyInApp; CLASS_CREDIT_PRICES) ==
  "{one} for 1 class credit, {ten} for 10, valid for {n} months": {
    zero: "{one} لرصيد حصة واحد، {ten} لعشرة، صالحة لمدة {n} شهر",
    one: "{one} لرصيد حصة واحد، {ten} لعشرة، صالحة لمدة شهر واحد",
    two: "{one} لرصيد حصة واحد، {ten} لعشرة، صالحة لمدة شهرين",
    few: "{one} لرصيد حصة واحد، {ten} لعشرة، صالحة لمدة {n} أشهر",
    many: "{one} لرصيد حصة واحد، {ten} لعشرة، صالحة لمدة {n} شهرًا",
    other: "{one} لرصيد حصة واحد، {ten} لعشرة، صالحة لمدة {n} شهر",
  }, // note: {n} is 12 today, so «12 شهرًا»; {one} $3 and {ten} $25 (the store sets the real price)

  // == The hire confirmation, a class-slot offer (pages/business-market/hiring/HireConfirmDialog) ==
  "Uses 1 class credit": "يستخدم رصيد حصة واحدًا",
  "{n} class credits left to use": {
    zero: "لم يبقَ أي رصيد حصة للاستخدام",
    one: "يتبقى رصيد حصة واحد للاستخدام",
    two: "يتبقى رصيدا حصة للاستخدام",
    few: "تتبقى {n} أرصدة حصص للاستخدام",
    many: "يتبقى {n} رصيد حصة للاستخدام",
    other: "يتبقى {n} رصيد حصة للاستخدام",
  },
  "The class credit is used when they accept. No hiring fee is added.": "يُستخدم رصيد الحصة عند قبوله العرض. ولا يُضاف أي رسم توظيف.",
  "Buy a class credit in the Centium app to send this offer.": "اشترِ رصيد حصة من تطبيق Centium لإرسال هذا العرض.", // note: ATXQ4 for a class slot; G1's hiring credit sentence stays for a role

  // == Professional plans in the Centium app (the client limit notices, the client code sheet) ==
  "Disconnect a client to free a place, or buy a bigger plan in the Centium app.": "افصل عميلًا لتحرير مكان، أو اشترِ خطة أكبر من تطبيق Centium.",
};

export default premium5;
