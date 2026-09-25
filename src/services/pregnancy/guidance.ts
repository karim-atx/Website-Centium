// ===========================================================================
// FOR CLINICAL REVIEW — every medical sentence and every number this app says
// about pregnancy is in this file, and nowhere else.
// ===========================================================================
//
// Same contract as services/cycle/guidance.ts: nothing below is assembled at a
// call site, no screen writes its own version, and if a pregnancy fact is not
// in this file it should not be on screen.
//
// SOURCES, named per section below:
//   ACOG   American College of Obstetricians and Gynecologists
//          - Nutrition During Pregnancy (FAQ001)
//          - Physical Activity and Exercise During Pregnancy and the
//            Postpartum Period (Committee Opinion 804)
//          - Weight Gain During Pregnancy (Committee Opinion 548, which adopts
//            the 2009 Institute of Medicine ranges)
//          - Optimizing Postpartum Care (Committee Opinion 736), which
//            defines postpartum care as continuing through 12 weeks
//   CDC    Urgent Maternal Warning Signs (Hear Her campaign)
//   IOM    Institute of Medicine 2009 gestational weight gain ranges
//   NIH    Office of Dietary Supplements, nutrient requirements in pregnancy
//
// EVERY SCREEN CARRIES `PROVIDER_FIRST`, and that is not a disclaimer in the
// legal sense — it is the actual clinical position. These are population-level
// figures for an uncomplicated singleton pregnancy. A twin pregnancy, a
// pre-existing condition, or any individual instruction from a provider
// overrides all of it, and the app has no way to know about any of them.
//
// NOTHING HERE IS APPLIED AUTOMATICALLY. The energy figures below are offered
// behind a button the user presses and can press again to undo. An app that
// silently raised somebody's calorie target because a date passed would be
// prescribing.

// ---------------------------------------------------------------------------
// The line on every pregnancy screen
// ---------------------------------------------------------------------------

export const PROVIDER_FIRST = "General guidance · your provider's advice comes first";

export const PROVIDER_FIRST_LONG =
  "These are general figures for an uncomplicated single pregnancy. Your midwife, " +
  "obstetrician or doctor knows your history — where their advice differs from this, " +
  "follow theirs.";

// ---------------------------------------------------------------------------
// Nutrition — ACOG FAQ001, NIH Office of Dietary Supplements
// ---------------------------------------------------------------------------

export interface Nutrient {
  name: string;
  amount: string;
  note?: string;
}

/** Daily nutrient targets in pregnancy. */
export const NUTRIENTS: readonly Nutrient[] = [
  { name: "Folic acid", amount: "600 mcg", note: "Helps prevent neural tube defects." },
  { name: "Iron", amount: "27 mg", note: "Supports the extra blood volume of pregnancy." },
  { name: "Iodine", amount: "220 mcg" },
  { name: "Choline", amount: "450 mg" },
  {
    name: "Calcium",
    amount: "1,000 mg",
    note: "1,300 mg if you are 14–18.",
  },
  { name: "Vitamin D", amount: "600 IU" },
];

/** Things to limit or avoid. Each is a fact, not an instruction to worry. */
export const NUTRITION_LIMITS: readonly string[] = [
  "Caffeine: under 200 mg a day — roughly one 12 oz cup of coffee.",
  "Alcohol: none. No amount is known to be safe in pregnancy.",
  "Seafood: 8–12 oz a week, from low-mercury choices.",
  "Avoid unpasteurised dairy.",
  "Avoid raw or undercooked meat, eggs and fish.",
];

/**
 * Extra energy per day, by trimester — ACOG.
 *
 * ZERO IN THE FIRST TRIMESTER is the part people are surprised by, and the
 * part an app most often gets wrong by adding a flat "pregnancy bonus" from
 * day one. "Eating for two" is roughly a sandwich, and not until the second
 * trimester.
 */
export const EXTRA_KCAL_BY_TRIMESTER: Record<1 | 2 | 3, number> = {
  1: 0,
  2: 340,
  3: 450,
};

export const ENERGY_EXPLAINER =
  "Most people need no extra energy in the first trimester, about 340 kcal a day more " +
  "in the second, and about 450 in the third.";

export const APPLY_TARGETS_CTA = "Apply to my targets";
export const APPLY_TARGETS_UNDO = "Remove from my targets";

/**
 * Shown beside the button, both before and after.
 *
 * It says what the button DOES — writes a number into the food goal — because
 * "apply to my targets" is otherwise vague enough that somebody might not
 * realise their calorie target changed.
 */
export const APPLY_TARGETS_EXPLAINER =
  "Adds this to your daily calorie target in Food. Nothing changes until you tap it, " +
  "and you can take it off again at any time.";

export const APPLY_TARGETS_APPLIED = (kcal: number) =>
  `Applied · +${kcal} kcal a day is included in your target.`;

export const APPLY_TARGETS_FIRST_TRIMESTER =
  "No extra energy is recommended in the first trimester, so there is nothing to apply yet.";

// ---------------------------------------------------------------------------
// Workout — ACOG Committee Opinion 804
// ---------------------------------------------------------------------------

export const EXERCISE_HEADLINE = "About 150 minutes a week of moderate activity";

export const TALK_TEST =
  "The talk test: moderate activity is a level where you can still hold a conversation. " +
  "If you're too breathless to talk, ease off.";

export const EXERCISE_GOOD: readonly string[] = [
  "Walking",
  "Swimming",
  "Stationary cycling",
  "Low-impact aerobics",
  "Modified yoga or Pilates",
];

export const EXERCISE_IF_ALREADY: readonly string[] = [
  "Strength training",
  "Running or jogging",
];

export const EXERCISE_IF_ALREADY_NOTE =
  "Only if these were already part of your routine, and your provider has said they're " +
  "fine to continue.";

export const EXERCISE_AVOID: readonly string[] = [
  "Contact sports",
  "Anything with a high risk of falling",
  "Scuba diving",
  "Hot yoga or hot Pilates",
  "Exercising in high heat",
];

/** STOP and contact a provider. ACOG 804's own list, not shortened. */
export const EXERCISE_STOP_SIGNS: readonly string[] = [
  "Vaginal bleeding",
  "Regular painful contractions",
  "Fluid leaking",
  "Breathlessness before you start exercising",
  "Dizziness",
  "Headache",
  "Chest pain",
  "Muscle weakness affecting your balance",
  "Calf pain or swelling",
];

export const EXERCISE_STOP_TITLE = "Stop exercising and contact your provider if you have";

// ---------------------------------------------------------------------------
// Health — ACOG, CDC
// ---------------------------------------------------------------------------

export const GLUCOSE_SCREENING =
  "Screening for gestational diabetes usually happens around weeks 24–28.";

export const VACCINES = "Ask your provider about recommended vaccines.";

/**
 * Weight gain ranges for a SINGLETON pregnancy, by pre-pregnancy BMI.
 * IOM 2009, adopted by ACOG Committee Opinion 548.
 *
 * SINGLETON ONLY, and said on screen. Twin ranges are different and this app
 * never asks how many, so it must not imply the figure covers them.
 */
export interface WeightGainRange {
  /** Inclusive lower BMI bound. */
  bmiFrom: number;
  /** Exclusive upper BMI bound, or null for open-ended. */
  bmiTo: number | null;
  label: string;
  minKg: number;
  maxKg: number;
}

export const WEIGHT_GAIN_RANGES: readonly WeightGainRange[] = [
  { bmiFrom: 0, bmiTo: 18.5, label: "Under 18.5", minKg: 12.5, maxKg: 18 },
  { bmiFrom: 18.5, bmiTo: 25, label: "18.5–24.9", minKg: 11.5, maxKg: 16 },
  { bmiFrom: 25, bmiTo: 30, label: "25–29.9", minKg: 7, maxKg: 11.5 },
  { bmiFrom: 30, bmiTo: null, label: "30 and over", minKg: 5, maxKg: 9 },
];

/**
 * Recommended gain across the WHOLE first trimester — ACOG/IOM.
 *
 * It is here rather than in ./weight.ts because it is a clinical figure, and
 * because it is the one that stops a weight-gain band from being a straight
 * line: spreading the term total evenly over forty weeks would tell somebody
 * at week 10 that they are several kilos behind when they are exactly where
 * they should be.
 */
export const FIRST_TRIMESTER_GAIN_KG = { min: 0.5, max: 2 };

/**
 * WHY BMI DISAPPEARS, said in one sentence wherever it used to be.
 *
 * BMI is weight over height squared, and in pregnancy the weight includes a
 * baby, a placenta, amniotic fluid and around 50% more blood. The number goes
 * up because the pregnancy is working, and the WHO bands it is read against
 * were never drawn for a pregnant body — so "overweight" or "obese" on a
 * pregnancy weight is not a finding, it is a category error, and a distressing
 * one to be shown by an app.
 *
 * The right answer for this body IS on screen: the IOM gain range, which is
 * picked by the PRE-pregnancy BMI and says how much gain is expected by this
 * week. So this points there rather than just hiding something.
 */
/**
 * What a professional sees, and the whole of it.
 *
 * ORDINAL, BECAUSE IT READS AS A STAGE RATHER THAN A COUNT. "trimester 2" is
 * an index; "2nd trimester" is how it is said out loud and in a note. There is
 * no week number here on purpose — the grant covers a stage, not a due date.
 */
export const TRIMESTER_ORDINAL: Record<1 | 2 | 3, string> = {
  1: "1st trimester",
  2: "2nd trimester",
  3: "3rd trimester",
};

export const BMI_NOT_USED =
  "BMI isn't used during pregnancy. See your weight-gain range in Pregnancy.";

export const WEIGHT_GAIN_SINGLETON_NOTE =
  "Ranges are for a single pregnancy. Ask your provider if you're expecting more than one.";

/** When height or a pre-pregnancy weight is missing — asked for, never assumed. */
export const WEIGHT_GAIN_NEEDS_DATA =
  "A weight-gain range depends on your height and your weight before pregnancy. Add " +
  "your height in Profile and log a weight, and this will fill in.";

/**
 * CDC Urgent Maternal Warning Signs.
 *
 * NOT SHORTENED AND NOT RANKED. Every item on this list is one the CDC put
 * there because people die when it is missed, and the ones most tempting to
 * trim for space — vision changes, overwhelming tiredness, thoughts of self-
 * harm — are among the least recognised.
 */
export const URGENT_SIGNS: readonly string[] = [
  "A headache that won't go away or gets worse",
  "Dizziness or fainting",
  "Changes in your vision",
  "Fever",
  "Trouble breathing",
  "Chest pain or a fast-beating heart",
  "Severe belly pain that doesn't go away",
  "Severe nausea and vomiting",
  "Your baby's movements slowing or stopping",
  "Vaginal bleeding or fluid leaking",
  "Swelling, redness or pain in a leg",
  "Severe swelling of your hands or face",
  "Overwhelming tiredness",
  "Thoughts of harming yourself or your baby",
];

export const URGENT_TITLE = "Get help right away if you have";
export const URGENT_ACTION =
  "Contact your provider now; if you can't, go to emergency care.";

// ---------------------------------------------------------------------------
// Kick counting and contractions
// ---------------------------------------------------------------------------

/**
 * The week the movement counter appears, and the week the contraction timer
 * does. DISPLAY THRESHOLDS ONLY — neither is a clinical boundary, and nothing
 * is withheld: both tools are simply not put on screen before they could be
 * used.
 *
 * 16 is early of the usual range for first feeling movement (roughly 18–25
 * weeks, earlier in a later pregnancy), chosen so the counter is already there
 * when somebody starts feeling something. 28 is the start of the third
 * trimester. Neither figure is in the brief; they are the app's own, and are
 * here rather than in a component so a reviewer sees them.
 */
export const KICKS_FROM_WEEK = 16;
export const CONTRACTIONS_FROM_WEEK = 28;

export const KICKS_TITLE = "Movements";
export const KICKS_EXPLAINER =
  "Counting movements is a way of getting to know what's usual for your baby. What " +
  "matters most is a change from their normal pattern.";
/** The one thing this screen must say, and it is not a threshold. */
export const KICKS_CHANGE_NOTE =
  "If your baby's movements slow down or stop, contact your provider straight away — " +
  "don't wait for a count to finish.";

export const CONTRACTIONS_TITLE = "Contractions";
export const CONTRACTIONS_EXPLAINER =
  "Time from the start of one contraction to the start of the next. Bring these " +
  "numbers to your provider — when to go in depends on your pregnancy.";
/** DELIBERATELY NOT "5-1-1". That rule is a provider's to give, not an app's. */
export const CONTRACTIONS_NO_RULE =
  "This app doesn't tell you when to travel. Your provider will have given you a rule " +
  "for that; if they haven't, ask.";

// ---------------------------------------------------------------------------
// Starting and ending
// ---------------------------------------------------------------------------

export const START_TITLE = "Start pregnancy tracking";
export const START_BODY =
  "Cycle predictions pause while this is on. You can turn it off at any time, and " +
  "nothing you've already logged is deleted.";
export const START_FROM_LMP = "Work it out from my last period";
export const START_FROM_DUE = "I know my due date";
export const DUE_DATE_HELP =
  "If a scan has changed your due date, enter the date from the scan — it's more " +
  "accurate than counting from a period.";

export const END_TITLE = "End pregnancy tracking";
/**
 * THE THREE OUTCOMES, WORDED FLATLY.
 *
 * `birth` is not "Congratulations!" and `loss` is not "Sorry for your loss" —
 * a list of buttons is not the place for either, and somebody choosing the
 * second one does not need an app's sympathy before it has even registered
 * what happened. The words are plain, the same weight, and in the order the
 * database's enum lists them.
 */
export const END_OUTCOME_LABEL: Record<"birth" | "loss" | "other", string> = {
  birth: "My baby was born",
  loss: "I lost my pregnancy",
  other: "Something else",
};

export const END_CONFIRM = "End tracking";

/**
 * After birth.
 *
 * PREDICTIONS RESUME CAUTIOUSLY AND SAY SO. Cycles after birth are genuinely
 * unpredictable, more so while breastfeeding, and an app that confidently
 * predicts a period six weeks postpartum is wrong in a way that matters — both
 * to somebody hoping to conceive again and to somebody who is not.
 */
/**
 * How long the after-birth note is shown for, written to postpartum_until.
 *
 * TWELVE WEEKS, from ACOG Committee Opinion 736, which frames postpartum care
 * as continuing through twelve weeks rather than ending at the six-week visit.
 * It is a DISPLAY WINDOW ONLY — the database's comment on the column says the
 * prediction ignores it entirely, and nothing clinical hangs on the number.
 */
export const POSTPARTUM_WEEKS = 12;

export const POSTPARTUM_TITLE = "After birth";
export const POSTPARTUM_BODY =
  "Periods can take a while to come back, and they're often irregular at first — " +
  "especially while you're breastfeeding. Estimates will be rough until a few cycles " +
  "have been logged.";

/**
 * After a loss.
 *
 * PREDICTIONS STAY PAUSED UNTIL THE USER CHOOSES. Resuming them automatically
 * would put a fertility estimate in front of somebody who may not want to see
 * one, on a screen they opened for another reason. The choice is theirs and
 * there is no prompt nudging either way.
 */
export const LOSS_TITLE = "We're here when you're ready";
export const LOSS_BODY =
  "Cycle predictions are paused. Turn them back on whenever you want to — there's no " +
  "rush, and nothing you've logged has been deleted.";
export const LOSS_SUPPORT =
  "Your provider can talk you through what happens next, physically and otherwise. " +
  "Please reach out to them.";
export const LOSS_RESUME = "Turn predictions back on";

/**
 * HOW "PAUSED" IS ACTUALLY STORED: cycle_settings.tracker_enabled = false.
 *
 * my_cycle_prediction() returns nothing when the tracker is off, so this is
 * the real mechanism rather than a flag the UI honours — and it is the same
 * switch the Settings tab already has, which means it keeps every logged day
 * (TRACKER_OFF_KEEPS_DATA) and can be turned back on from either place.
 *
 * After a BIRTH the tracker stays on: predictions resume, and
 * POSTPARTUM_BODY says how rough they will be until a few cycles are logged.
 */
export const LOSS_PAUSE_EXPLAINER =
  "Nothing is deleted. This switches cycle estimates off, and you can switch them " +
  "back on from Settings whenever you want.";

// ---------------------------------------------------------------------------
// The workout strip
// ---------------------------------------------------------------------------

/** Replaces the cycle-phase note while a pregnancy is active. */
export const WORKOUT_STRIP_NOTE =
  "About 150 minutes a week of moderate activity, at a level where you can still talk.";
export const WORKOUT_STRIP_LINK = "Read the guidance";
