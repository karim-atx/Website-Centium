import type { Catalogue } from "../core";

// Round K · DW, Arabic: "Before you start" (the exercise readiness form). The
// form's own words (intro, questions, outcomes, the urgent line, the labels,
// the clearance button and the footer) come from the Database in Arabic,
// word for word from docs/before-you-start-form-ar.md, so they are not here;
// these are the screens' controls, states and the notification lines.
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tx/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/readiness/ReadinessCard.tsx",
  "components/readiness/ReadinessProBlock.tsx",
  "components/readiness/ReadinessSheet.tsx",
  "services/readiness/index.ts",
  "services/readiness/model.ts",
];

// note (whole file): the form's name is «قبل أن تبدأ», in «…» as the Database's
// push does («عبّأ Maya نموذج «قبل أن تبدأ».»); "fill in" is «تعبئة»; a doctor's
// clearance is «إذن الطبيب».
const readiness: Catalogue = {
  // == The member ==
  "About a minute": "دقيقة تقريبًا",
  "Filled in {date}": "عُبّئ في {date}",
  "Fill it in again": "تعبئته من جديد",
  "Date (optional)": "التاريخ (اختياري)",
  "The date can't be in the future.": "لا يمكن أن يكون التاريخ في المستقبل.",
  "Cleared on {date}": "أذن الطبيب بذلك في {date}",
  "Cleared by your doctor": "أذن لك طبيبك",
  "{name} asked you to fill in Before you start": "طلب منك {name} تعبئة «قبل أن تبدأ»",
  "Something in your answers wasn't accepted. Check them and try again.": "لم تُقبل إحدى إجاباتك. راجعها وحاول مرة أخرى.",
  "Couldn't send it. Try again.": "تعذّر الإرسال. حاول مرة أخرى.",
  "That's the limit for today. Try again tomorrow.": "بلغت الحدّ لهذا اليوم. حاول مرة أخرى غدًا.",

  // == The professional ==
  "{name} hasn't shared medical history. They share it only if they choose to.": "لم يشارك {name} تاريخه الطبي. لا يشاركه إلا إذا اختار ذلك.",
  "{name} hasn't filled it in yet.": "لم يعبّئه {name} بعد.",
  "Sent {date}. Waiting for {name}.": "أُرسل في {date}. بانتظار {name}.",
  "Ask for a fresh one": "طلب تعبئته من جديد",
  "Withdrawn.": "سُحب الطلب.",
  "This request isn't open any more.": "لم يعد هذا الطلب مفتوحًا.",
  "{name} filled in Before you start": "عبّأ {name} «قبل أن تبدأ»",
  "Open their page to see it": "افتح صفحته لرؤيته",
};

export default readiness;
