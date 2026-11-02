import { tk } from "../../i18n/core";

// Names for professional subtypes, shared by the directory list, the map and
// the chips. Kept apart so the card file exports only a component. The labels
// are English keys (tk), shown through t().
// Release 3 added nutritionist and coach_instructor (additions only; the lane
// labels are in components/pro/subtypeLanes.ts).

export const SUBTYPE_LABELS = {
  trainer: tk("Personal Trainers"),
  dietitian: tk("Dietitians"),
  physiotherapist: tk("Physiotherapists"),
  doctor: tk("Doctors / GPs"),
  nutritionist: tk("Nutritionists"),
  coach_instructor: tk("Coaches and instructors"),
  other: tk("Other"),
} as const;

/** One professional, as a single noun ("personal trainer"), for names read aloud (English keys, shown through t()). */
export const SUBTYPE_SINGULAR = {
  trainer: tk("personal trainer"),
  dietitian: tk("dietitian"),
  physiotherapist: tk("physiotherapist"),
  doctor: tk("doctor"),
  nutritionist: tk("nutritionist"),
  coach_instructor: tk("coach or instructor"),
  other: tk("health professional"),
} as const;
