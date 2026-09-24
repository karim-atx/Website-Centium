import type { BpCategory } from "./classify";

// EVERY MEDICAL SENTENCE THIS APP SAYS ABOUT BLOOD PRESSURE, in one file.
//
// The point is reviewability: a clinician should be able to read this module
// and see all of it, without opening a component. So nothing below is
// assembled at a call site, nothing is interpolated from data, and no screen
// writes its own version of any of it. If a sentence about blood pressure is
// not in here, it should not be on screen.
//
// The thresholds these words describe live in ./classify.ts, separately, so
// the arithmetic can be checked against the guideline without reading prose.
//
// SOURCE: 2025 AHA/ACC guideline for the categories, and the AHA's home
// blood-pressure monitoring advice for the measurement steps.

/** What each category is called on screen. */
export const BP_CATEGORY_LABEL: Record<BpCategory, string> = {
  normal: "Normal",
  elevated: "Elevated",
  stage1: "Stage 1 high",
  stage2: "Stage 2 high",
  severe: "Very high",
};

/**
 * The range each category covers, said plainly.
 *
 * Written as the guideline writes them, including the "or" — because "or" is
 * what makes 118/84 Stage 1, and a reader looking at that reading deserves to
 * see why.
 */
export const BP_CATEGORY_RANGE: Record<BpCategory, string> = {
  normal: "Under 120 and under 80",
  elevated: "120–129 and under 80",
  stage1: "130–139 or 80–89",
  stage2: "140 or above, or 90 or above",
  severe: "Above 180 and/or above 120",
};

/**
 * COLOUR IS NEVER THE ONLY SIGNAL. Every place these are used also prints
 * BP_CATEGORY_LABEL, because roughly one man in twelve cannot separate the
 * amber from the red, and a category is the whole meaning of the chip.
 */
export const BP_CATEGORY_COLOR: Record<BpCategory, string> = {
  normal: "#2C6A4A",
  elevated: "#7A7320",
  stage1: "#8F6512",
  stage2: "#A8442B",
  severe: "#A4231C",
};

/**
 * Shown the moment a reading above 180 and/or above 120 is saved, and on the
 * card for as long as the latest reading is one.
 *
 * NOT A DIAGNOSIS AND NOT A DISMISSAL. It asks for the one thing that
 * distinguishes a mis-measurement from an emergency — measure again — and then
 * names the symptoms that mean do not wait and measure again. The symptom list
 * is the AHA's own for a hypertensive crisis; it is not shortened, because the
 * ones most easily dropped for brevity (vision changes, difficulty speaking)
 * are strokes.
 */
export const SEVERE_READING_MESSAGE =
  "This reading is very high. Rest for a few minutes and measure again. If it's still this " +
  "high, contact your doctor. If you have chest pain, shortness of breath, back pain, " +
  "numbness or weakness, vision changes or difficulty speaking, call emergency services.";

/** Sits under the detail view, always, whatever the readings say. */
export const BP_DETAIL_FOOTER =
  "Readings alone don't diagnose high blood pressure. Talk to your doctor about your numbers.";

/** The empty state, where a number would be. */
export const BP_NO_READINGS = "No readings yet";

/**
 * The AHA's home-measurement steps.
 *
 * COLLAPSED BY DEFAULT and offered beside the entry fields, because these are
 * what make two readings comparable — a reading taken over clothing, or five
 * minutes after coffee, is not the same measurement as one taken properly, and
 * the app records arm and position precisely so that difference is visible.
 */
export const BP_HOW_TO_MEASURE_TITLE = "How to measure";

export const BP_HOW_TO_MEASURE_STEPS: readonly string[] = [
  "Don't smoke, drink caffeine or exercise for 30 minutes beforehand.",
  "Empty your bladder and sit quietly for 5 minutes before you start.",
  "Sit with your back supported and both feet flat on the floor — don't cross your legs.",
  "Rest your arm on a flat surface with the cuff at heart height.",
  "Put the cuff on bare skin, not over clothing.",
  "Don't talk during the measurement.",
  "Take two or three readings a minute apart and record them all.",
  "Measure at the same time each day.",
];

/** Under the steps — why the app asks which arm and what position. */
export const BP_WHY_ARM_AND_POSITION =
  "Arm and position change the reading by a meaningful amount, so recording them is what " +
  "makes two readings comparable.";

/**
 * What the professional-side section says when nothing is shared.
 *
 * The same shape every other category uses: not sharing, loading, nothing
 * recorded, and data are four different states and each gets its own sentence.
 */
export const BP_NOT_SHARED = "Not sharing blood pressure.";
export const BP_NONE_LOGGED = "No blood-pressure readings yet.";

/** The consent row's own description, kept here with the rest of the copy. */
export const BP_SHARING_DESCRIPTION =
  "Your blood-pressure readings, with pulse, arm and position";
