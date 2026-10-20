// Names for professional subtypes, shared by the directory list, the map and
// the chips. Kept apart so the card file exports only a component.
// Release 3 added nutritionist and coach_instructor (additions only; the lane
// labels are in components/pro/subtypeLanes.ts).

export const SUBTYPE_LABELS = {
  trainer: "Personal Trainers",
  dietitian: "Dietitians",
  physiotherapist: "Physiotherapists",
  doctor: "Doctors / GPs",
  nutritionist: "Nutritionists",
  coach_instructor: "Coaches and instructors",
  other: "Other",
} as const;

/** One professional, as a single noun ("personal trainer"), for names read aloud. */
export const SUBTYPE_SINGULAR = {
  trainer: "personal trainer",
  dietitian: "dietitian",
  physiotherapist: "physiotherapist",
  doctor: "doctor",
  nutritionist: "nutritionist",
  coach_instructor: "coach or instructor",
  other: "health professional",
} as const;
