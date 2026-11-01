import type { Catalogue } from "../core";

// Round F (DW/AB), Arabic: programme week notes, skipping and moving sessions, and the weekly nutrition check-in trend (DW1–DW4).
// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX. Files that are still
// English elsewhere (Workout, Pro tools, Business: later rounds) keep their
// new sentences in a copy module listed here, so each new string has Arabic.
export const FILES: string[] = [
  "services/programmes/copy.ts",
  "components/pro/programmes/WeekNoteField.tsx",
  "components/pro/programmes/BuilderMoveSheet.tsx",
  "pages/workout/MoveSessionSheet.tsx",
];

const programmes: Catalogue = {
  // DW1–DW3 · days in a day picker
  "Rest day": "يوم راحة",
  "{n} workouts": { zero: "لا تمارين", one: "تمرين واحد", two: "تمرينان", few: "{n} تمارين", many: "{n} تمرينًا", other: "{n} تمرين" },

  // DW1 · week notes
  "Note for week {n} (clients see this)": "ملاحظة للأسبوع {n} (يراها العملاء)",
  "Keep RPE at 7 this week.": "حافظ على مستوى الجهد (RPE) عند 7 هذا الأسبوع.",
  "Your note for week {n}": "ملاحظتك للأسبوع {n}",
  "Couldn't save the note. Try again.": "تعذّر حفظ الملاحظة. حاول مرة أخرى.",

  // DW2 · skip
  "Skip this day": "تخطي هذا اليوم",
  Skipped: "تم التخطي",
  "Undo skip": "التراجع عن التخطي",
  "Day skipped.": "تم تخطي اليوم.",
  "{workout} skipped.": "تم تخطي {workout}.",
  "{n} sessions skipped": {
    zero: "لم تُتخطَّ أي جلسة",
    one: "تُخطّيت جلسة واحدة",
    two: "تُخطّيت جلستان",
    few: "تُخطّيت {n} جلسات",
    many: "تُخطّيت {n} جلسة",
    other: "تُخطّيت {n} جلسة",
  },
  "Couldn't skip that day. Try again.": "تعذّر تخطي هذا اليوم. حاول مرة أخرى.",
  "Couldn't undo the skip. Try again.": "تعذّر التراجع عن التخطي. حاول مرة أخرى.",
  "Yesterday: {workout}": "أمس: {workout}",
  "Do it today": "نفّذه اليوم",
  "Skip {workout} from yesterday": "تخطي {workout} من أمس",

  // DW3 · move
  "Move to another day": "النقل إلى يوم آخر",
  "Options for {day}": "خيارات {day}",
  "Moved from {day}": "منقول من {day}",
  "{workout} moved to {day}.": "نُقل {workout} إلى {day}.",
  "Which workout": "أي تمرين",
  "Which day": "أي يوم",
  "Planned day": "اليوم المخطط له",
  "No other day this week is free to move to.": "لا يوجد يوم آخر متاح للنقل إليه هذا الأسبوع.",
  "Move to {day}": "النقل إلى {day}",
  "Moving…": "جارٍ النقل…",
  "Couldn't move that workout. Try again.": "تعذّر نقل هذا التمرين. حاول مرة أخرى.",
  "Move {workout} to another day": "نقل {workout} إلى يوم آخر",
  "Move {workout} to…": "نقل {workout} إلى…",
  "Drag the grip onto another day, or pick a day here. It goes last on that day.": "اسحب المقبض إلى يوم آخر، أو اختر يومًا هنا. يُضاف في آخر ذلك اليوم.",

  // Refusals (Database 20261226000000)
  "That workout is already done.": "هذا التمرين مُنجز بالفعل.",
  "You can skip a day of this week only.": "يمكنك تخطي يوم من هذا الأسبوع فقط.",
  "A workout moves within its own week, to today or a later day.": "يُنقل التمرين ضمن أسبوعه فقط، إلى اليوم أو إلى يوم لاحق.",
  "That day already has four workouts.": "في هذا اليوم أربعة تمارين بالفعل.",
  "That workout is skipped. Undo the skip first.": "تم تخطي هذا التمرين. تراجع عن التخطي أولًا.",
  "A week note can be up to 280 characters.": "يمكن أن تصل ملاحظة الأسبوع إلى 280 حرفًا.",
  "That workout has changed. Refresh and try again.": "تغيّر هذا التمرين. حدّث الصفحة وحاول مرة أخرى.",
};

export default programmes;
