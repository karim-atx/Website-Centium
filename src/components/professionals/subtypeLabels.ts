// Names for professional subtypes, shared by the directory list, the map and
// the chips. Kept apart so the card file exports only a component.

export const SUBTYPE_LABELS = {
  trainer: "Personal Trainers",
  dietitian: "Dietitians",
  physiotherapist: "Physiotherapists",
  doctor: "Doctors / GPs",
  other: "Other",
} as const;

/** One professional, as a single noun ("personal trainer"), for names read aloud. */
export const SUBTYPE_SINGULAR = {
  trainer: "personal trainer",
  dietitian: "dietitian",
  physiotherapist: "physiotherapist",
  doctor: "doctor",
  other: "health professional",
} as const;
