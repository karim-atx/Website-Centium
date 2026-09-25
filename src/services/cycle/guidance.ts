// ===========================================================================
// FOR CLINICAL REVIEW — every medical and educational sentence this app says
// about the menstrual cycle is in this file, and nowhere else.
// ===========================================================================
//
// The point is reviewability. A clinician should be able to read this module
// top to bottom and see everything the tracker will ever say to a user,
// without opening a component. So:
//
//   • nothing below is assembled at a call site,
//   • no screen writes its own version of any of it,
//   • no sentence is interpolated from data except where a placeholder is
//     shown explicitly here,
//   • and if a sentence about the cycle is not in this file, it should not be
//     on screen.
//
// The arithmetic these words describe is elsewhere on purpose: the prediction
// itself is `my_cycle_prediction()` in the database, the hormone curve shape
// is ./hormones.ts, and the statistics are ./insights.ts. That keeps this file
// readable as prose.
//
// WHAT THIS APP DOES NOT SAY, deliberately:
//   • It never calls a prediction a fact. Every date is an estimate and the
//     UI is required to show it as a range wherever the database gives one.
//   • It never presents the tracker as contraception. DISCLAIMER below is on
//     screen at all times on the overview, not behind a tap.
//   • It never diagnoses. The flag copy suggests a conversation with a doctor
//     and names what was observed; it does not name a condition.
//   • It never claims to measure a hormone. The graph is an illustration of a
//     typical pattern and says so on its face.

import type { CycleFlag, CyclePhase, Confidence } from "./types";

// ---------------------------------------------------------------------------
// The line that is always on screen
// ---------------------------------------------------------------------------

/** Always visible on the overview. Not behind a tap, not in a footer. */
export const DISCLAIMER = "Estimates · Not a method of contraception";

/** Under the overview, once, in full. */
export const DISCLAIMER_LONG =
  "These dates are estimates based on what you've logged. Cycles vary, and a " +
  "prediction is not a method of contraception or a pregnancy test.";

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Period",
  follicular: "Follicular",
  ovulatory: "Ovulation",
  luteal: "Luteal",
  hormonal_contraception: "On hormonal contraception",
  pregnant: "Pregnant",
  unavailable: "Not enough data",
};

/** One plain sentence about what the phase is. Shown under the phase chip. */
export const PHASE_DESCRIPTION: Record<CyclePhase, string> = {
  menstrual: "The lining of the uterus is shed. Bleeding usually lasts a few days.",
  follicular:
    "Follicles in the ovary mature and estrogen rises. This phase runs from the end " +
    "of a period until ovulation.",
  ovulatory: "An egg is released. This is the part of the cycle when pregnancy is possible.",
  luteal:
    "After ovulation, progesterone rises to prepare the lining of the uterus. If there " +
    "is no pregnancy, it falls again and a period follows.",
  hormonal_contraception:
    "Hormonal contraception suppresses ovulation, so a natural cycle isn't happening. " +
    "Any bleeding is usually a withdrawal bleed rather than a period.",
  pregnant: "Cycle tracking is paused while a pregnancy is recorded.",
  unavailable: "Log a period to start seeing estimates.",
};

/**
 * COLOUR IS NEVER THE ONLY SIGNAL. Every surface that tints by phase also
 * prints PHASE_LABEL beside it — the ring has a headline, the bar has names
 * under each segment, the chip is a word on a tint. Roughly one man in twelve
 * cannot separate the rose from the amber.
 */
export const PHASE_COLOR: Record<CyclePhase, string> = {
  menstrual: "#C0577A",
  follicular: "#5BA3B8",
  ovulatory: "#4F9D6B",
  luteal: "#8B6FC7",
  hormonal_contraception: "#8A8FA3",
  pregnant: "#C98A3E",
  unavailable: "#B8BCC4",
};

/** The four phases the bar shows, in order. The other three are states, not phases. */
export const PHASE_BAR: readonly CyclePhase[] = [
  "menstrual",
  "follicular",
  "ovulatory",
  "luteal",
];

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

/**
 * WHY the confidence is what it is. Shown beside the estimate, because
 * "Period in 3 days" reads very differently once you know it is based on two
 * cycles rather than twelve.
 */
export const CONFIDENCE_WHY: Record<Confidence, string> = {
  low: "Based on only a little history, so this could be out by several days.",
  medium: "Based on a few cycles. Expect some variation.",
  high: "Based on several consistent cycles.",
};

// ---------------------------------------------------------------------------
// The hormone illustration
// ---------------------------------------------------------------------------

export const HORMONE_TITLE = "Typical hormone pattern";

/**
 * ON THE FACE OF THE GRAPH, not in a tooltip.
 *
 * Nothing in this app measures a hormone. The curve is the textbook shape of
 * an average cycle, stretched to the length this user's own cycle is predicted
 * to be — useful for seeing where you are, and not a measurement of anything.
 */
export const HORMONE_DISCLAIMER = "Illustrative, not measured";

export const HORMONE_EXPLAINER =
  "This is the pattern a typical cycle follows, stretched to your predicted cycle " +
  "length. It is drawn from your dates, not from a blood test.";

export const HORMONE_LABEL: Record<string, string> = {
  estrogen: "Estrogen",
  progesterone: "Progesterone",
  lh: "LH",
  fsh: "FSH",
  testosterone: "Testosterone",
};

/** Why the graph is absent rather than flat, for each case that hides it. */
export const HORMONE_HIDDEN_CONTRACEPTION =
  "Hormonal contraception suppresses the natural cycle, so a typical pattern wouldn't " +
  "describe what's happening.";
export const HORMONE_HIDDEN_PREGNANT =
  "Hormone patterns in pregnancy are different, and this illustration doesn't cover them.";

// ---------------------------------------------------------------------------
// Flags — observations, never diagnoses
// ---------------------------------------------------------------------------

/**
 * WHAT WAS OBSERVED, AND THE SUGGESTION TO ASK SOMEBODY.
 *
 * Each of these names a pattern in the user's own logs and stops there. None
 * names a condition, none says what it means, and none tells anybody to do
 * anything other than have a conversation. A tracker that says "you may have
 * PCOS" is making a diagnosis from a phone.
 */
export const FLAG_TITLE: Record<CycleFlag, string> = {
  cycle_under_21: "Short cycles",
  cycle_over_35: "Long cycles",
  period_over_7: "Long periods",
  heavy_flow: "Heavy flow",
  intermenstrual_bleeding: "Bleeding between periods",
  no_period_90_days: "No period logged in 90 days",
};

export const FLAG_BODY: Record<CycleFlag, string> = {
  cycle_under_21: "Some of your cycles have been shorter than 21 days.",
  cycle_over_35: "Some of your cycles have been longer than 35 days.",
  period_over_7: "Some of your periods have lasted longer than 7 days.",
  heavy_flow: "You've logged heavy flow on several days.",
  intermenstrual_bleeding: "You've logged bleeding outside your period.",
  no_period_90_days: "You haven't logged a period in the last 90 days.",
};

/** Appended to every flag. One sentence, the same one, every time. */
export const FLAG_ADVICE = "It might be worth mentioning to your doctor.";

/** Above the list, when there is one. */
export const FLAGS_HEADING = "Worth a conversation";

// ---------------------------------------------------------------------------
// Empty and setup states
// ---------------------------------------------------------------------------

export const SETUP_TITLE = "When did your last period start?";
export const SETUP_BODY =
  "That's all it takes to start. Everything else — cycle length, phases, estimates — " +
  "is worked out from the days you log.";
export const SETUP_CTA = "Log my last period";

export const NO_PREDICTION =
  "There isn't enough logged yet to estimate your cycle. Log a period and the " +
  "estimates will start.";

export const INSIGHTS_TOO_LITTLE =
  "Not enough cycles logged yet to show patterns. Insights appear once you've " +
  "logged a couple of periods.";

export const SYMPTOM_GRID_TOO_LITTLE =
  "No symptoms logged yet. Anything you log will show up here, grouped by the phase " +
  "it happened in.";

// ---------------------------------------------------------------------------
// Logging a day
// ---------------------------------------------------------------------------

export const FLOW_LABEL: Record<string, string> = {
  none: "None",
  spotting: "Spotting",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

export const MUCUS_LABEL: Record<string, string> = {
  dry: "Dry",
  sticky: "Sticky",
  creamy: "Creamy",
  watery: "Watery",
  egg_white: "Egg white",
};

export const LH_LABEL: Record<string, string> = {
  negative: "Negative",
  positive: "Positive",
  peak: "Peak",
};

export const PREGNANCY_TEST_LABEL: Record<string, string> = {
  negative: "Negative",
  positive: "Positive",
};

export const SEX_ACTIVITY_LABEL: Record<string, string> = {
  none: "None",
  protected: "Protected",
  unprotected: "Unprotected",
};

/** Beside the sexual-activity row. It is the truth: no sharing category covers it. */
export const SEX_ACTIVITY_PRIVACY = "Private: never shared";

export const SYMPTOM_LABEL: Record<string, string> = {
  cramps: "Cramps",
  headache: "Headache",
  bloating: "Bloating",
  breast_tenderness: "Breast tenderness",
  acne: "Acne",
  backache: "Backache",
  nausea: "Nausea",
  fatigue: "Fatigue",
  insomnia: "Insomnia",
  cravings: "Cravings",
  diarrhoea: "Diarrhoea",
  constipation: "Constipation",
  dizziness: "Dizziness",
  hot_flashes: "Hot flashes",
  other: "Other",
};

export const MOOD_LABEL: Record<string, string> = {
  calm: "Calm",
  happy: "Happy",
  energetic: "Energetic",
  irritable: "Irritable",
  anxious: "Anxious",
  sad: "Sad",
  sensitive: "Sensitive",
  angry: "Angry",
  unmotivated: "Unmotivated",
  other: "Other",
};

/** The 1–5 energy scale, named at both ends and in between. */
export const ENERGY_LABEL: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Very high",
};

export const BBT_HELP =
  "Basal body temperature — taken at the same time each morning, before getting up.";

/**
 * Shown when a positive pregnancy test is logged.
 *
 * GENTLE, AND IT STILL CHANGES NOTHING BY ITSELF. A single test result does
 * not switch the app into pregnancy mode. Tracking exists now and this offers
 * it, but the button has to be pressed: a positive test is one piece of
 * information about a day, and an app that silently reinterprets everything
 * after one tap has made a decision that was not its to make.
 */
export const POSITIVE_TEST_PROMPT =
  "You've logged a positive test. Nothing changes automatically — you can switch " +
  "pregnancy tracking on whenever you're ready.";
export const POSITIVE_TEST_CTA = "Start pregnancy tracking";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * The time-zone row.
 *
 * IT IS NOT A PREFERENCE, IT IS WHERE THE PHONE IS — the app keeps it in step
 * with the browser on every load, and says so, because a value that changes
 * itself without explanation is worse than one that never changed. It is still
 * editable: somebody travelling who wants their pill reminder on home time is
 * making a real choice, and once made it is kept until they change it back.
 */
/**
 * The way in for an account the tracker was never switched on for.
 *
 * SEX DECIDES THE DEFAULT, NEVER THE AVAILABILITY — which was the stated rule
 * from the start, and was not true in practice: a male profile gets no
 * cycle_settings row, and with no row there was no Settings tab, so there was
 * nothing to switch. The offer has to live on the one screen that renders
 * without a row.
 */
export const TRACKER_OFF_TITLE = "Cycle tracking is off";
export const TRACKER_OFF_BODY =
  "It's off by default for this profile. Switch it on if you want to track a cycle — " +
  "everything stays private to you unless you share it.";
export const TRACKER_OFF_CTA = "Turn on cycle tracking";

export const TIMEZONE_TITLE = "Time zone";
export const TIMEZONE_BODY =
  "Reminders are sent at your local time in this zone. It follows this device unless " +
  "you pick one yourself.";
export const TIMEZONE_USE_DEVICE = "Use this device's zone";

export const CONTRACEPTION_LABEL: Record<string, string> = {
  none: "None",
  pill_combined: "Combined pill",
  pill_progestin: "Progestin-only pill",
  iud_hormonal: "Hormonal IUD",
  iud_copper: "Copper IUD",
  implant: "Implant",
  injection: "Injection",
  ring: "Ring",
  patch: "Patch",
  condom: "Condoms",
  other: "Other",
};

export const CONDITION_LABEL: Record<string, string> = {
  pcos: "PCOS",
  endometriosis: "Endometriosis",
  thyroid: "Thyroid condition",
  irregular_cycles: "Irregular cycles",
  perimenopause: "Perimenopause",
  other: "Other",
};

export const CONDITIONS_HELP =
  "Recorded so estimates can be read in context. Nothing here is a diagnosis, and " +
  "nothing is shared unless you switch sharing on.";

export const DELETE_ALL_TITLE = "Delete all cycle data";
export const DELETE_ALL_BODY =
  "This removes every day you've logged, your cycle settings and any pregnancy record. " +
  "It cannot be undone, and anyone you're sharing with stops seeing your phase " +
  "immediately.";
export const DELETE_ALL_CONFIRM = "Delete everything";

/** Shown when the tracker is switched off, rather than deleting anything. */
export const TRACKER_OFF_KEEPS_DATA =
  "Switching the tracker off hides it and stops sharing your phase. Your logs are kept " +
  "— use Delete all cycle data if you want them gone.";

// ---------------------------------------------------------------------------
// Changing sex in Profile
// ---------------------------------------------------------------------------

/**
 * Asked, never assumed.
 *
 * Changing this recalculates calorie targets, which is arithmetic. It must not
 * touch the tracker, because somebody's cycle data is not a consequence of a
 * profile field — and a trans or non-binary user changing this field should
 * not lose their logs to a rule nobody told them about.
 */
export const SEX_CHANGE_TRACKER_TITLE = "Keep cycle tracking on?";
export const SEX_CHANGE_TRACKER_BODY =
  "You have cycle tracking switched on. Changing your sex doesn't affect it either way " +
  "— your logs are kept whatever you choose here.";
export const SEX_CHANGE_KEEP = "Keep it on";
export const SEX_CHANGE_TURN_OFF = "Switch it off";

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export const SHARE_PHASE_LABEL = "Cycle phase";
export const SHARE_PHASE_DESCRIPTION = "Only the phase name, e.g. Luteal";
export const SHARE_PREGNANCY_LABEL = "Pregnancy";
export const SHARE_PREGNANCY_DESCRIPTION = "Only 'Pregnant' and the trimester";

export const PHASE_NOT_SHARED = "Not sharing cycle phase.";
export const PREGNANCY_NOT_SHARED = "Not sharing pregnancy status.";

/**
 * What the professional sees when the function returns `unavailable`.
 *
 * DIFFERENT FROM "not sharing", and the difference matters: the client HAS
 * shared, and there is simply no phase to report — no logs, tracker off, or a
 * pregnancy they have not also shared. Reporting that as "not sharing" would
 * blame the client for a gap they did not create.
 */
export const PHASE_UNAVAILABLE = "Shared, but no phase to show right now.";

// ---------------------------------------------------------------------------
// The workout surfaces
// ---------------------------------------------------------------------------

/**
 * One short note per phase, for the Routines strip and the session chip.
 *
 * NON-PRESCRIPTIVE, WHICH IS THE WHOLE CONSTRAINT. The evidence for training
 * by cycle phase is thin and contested, and a tracker telling somebody to lift
 * less this week is making a training decision from a date. Each of these
 * describes what people commonly report and leaves the decision alone. None
 * says "should", "avoid", or "best time to".
 */
export const PHASE_TRAINING_NOTE: Record<CyclePhase, string | null> = {
  menstrual: "Some people train as usual here; some ease off. Both are fine.",
  follicular: "Energy often picks up through this phase.",
  ovulatory: "Many people feel strongest around now.",
  luteal: "Some notice more fatigue late in this phase.",
  hormonal_contraception: null,
  pregnant: null,
  unavailable: null,
};
