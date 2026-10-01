/**
 * Advanced health monitoring: every string, threshold, plan row and warning
 * sign the mode shows, in one place.
 *
 * SOURCE: the clinical review document "Advanced health monitoring: clinical
 * content for review". Everything below is copied from it as written. Strings
 * marked NOT IN THE DOCUMENT are interface labels the document does not
 * specify (headings, buttons); they carry no clinical content.
 *
 * REVIEWED gates the whole mode: while it is false the switch is hidden from
 * every user (a dev-only override in ./access shows it for testing), and an
 * account that already has the setting on sees nothing until it is true.
 */

export const REVIEWED = true;

export const APPROVAL = {
  reviewer: "Dr. El Khaldi",
  approvedOn: "2026-10-01",
  document: "https://claude.ai/code/artifact/1b875e66-185a-4d7a-b040-3747aa171bb9",
  note: "Approved as written, no changes.",
} as const;

// ------------------------------------------------------------------ Switch

export const COPY = {
  switchLabel: "Advanced health monitoring",
  switchDescription:
    "Extra health checks and reminders for people using hormones or performance-enhancing substances. Private to you: never shared with anyone, including your professionals.",
  turningOn:
    "This adds a monitoring plan, automatic flags on your blood pressure and lab results, and warning signs to watch for. It doesn't judge or advise on what you use. You can turn it off any time, and turning it off erases it.",
  under18: "Advanced health monitoring is available from age 18.",
  turnedOff: "Advanced health monitoring is off, and its settings have been erased from your account.",
  cautionYoung:
    "At your age, effects on your hormones and fertility are more likely to be lasting, even after short use. Please involve a doctor.",
  cautionWomen:
    "Some effects, like voice changes and changes to periods or fertility, can be permanent. Please involve a doctor, and take a pregnancy test before starting and if a period is missed.",
  planTitle: "Your monitoring plan",
} as const;

// ------------------------------------------------------------------- Phase

/** Stored on the device only, never on the server. */
export type Phase = "starting" | "ongoing" | "stopped";

export const PHASES: { value: Phase; label: string }[] = [
  { value: "starting", label: "Getting started" },
  { value: "ongoing", label: "Ongoing" },
  { value: "stopped", label: "Stopped" },
];

// -------------------------------------------------------------------- Plan

/**
 * Where a row's "last checked" comes from: the newest blood-pressure reading,
 * the newest lab panel holding one of `markers`, the device's own check-in
 * history, or nothing the app records (`none`).
 */
export type LastCheckedSource =
  | { kind: "bp" }
  | { kind: "labs"; markers: string[] }
  | { kind: "checkin" }
  | { kind: "none" };

export type PlanRow = {
  id: string;
  check: string;
  looksFor: string;
  timing: string;
  /** The phases whose checks include this row, read from its timing. */
  phases: Phase[];
  /** Shown only to this sex, when set. */
  sex?: "male" | "female";
  source: LastCheckedSource;
};

const ALL: Phase[] = ["starting", "ongoing", "stopped"];

export const PLAN: PlanRow[] = [
  {
    id: "bp",
    check: "Blood pressure",
    looksFor: "Hypertension",
    timing: "At home weekly; logged in the app's BP tracker",
    phases: ALL,
    source: { kind: "bp" },
  },
  {
    id: "fbc",
    check: "Full blood count (haematocrit, haemoglobin)",
    looksFor: "Polycythaemia, which raises cardiovascular risk",
    timing: "Before starting, every 3 months during, 3 months after stopping",
    phases: ALL,
    source: { kind: "labs", markers: ["haematocrit", "haemoglobin"] },
  },
  {
    id: "lipids",
    check: "Lipid profile",
    looksFor: "Dyslipidaemia (falling HDL is typical)",
    timing: "Before, every 3–6 months during, after stopping",
    phases: ALL,
    source: { kind: "labs", markers: ["total_cholesterol", "ldl_cholesterol", "hdl_cholesterol", "triglycerides"] },
  },
  {
    id: "liver",
    check: "Liver tests (ALT, AST, GGT, bilirubin)",
    looksFor: "Liver injury, especially with oral use",
    timing: "Before, every 3 months during",
    phases: ["starting", "ongoing"],
    source: { kind: "labs", markers: ["alt", "ast", "ggt", "bilirubin_total"] },
  },
  {
    id: "kidney",
    check: "Kidney tests (creatinine, eGFR, urea, electrolytes)",
    looksFor: "Kidney injury",
    timing: "Before, every 3–6 months during",
    phases: ["starting", "ongoing"],
    source: { kind: "labs", markers: ["creatinine", "egfr", "urea", "bun"] },
  },
  {
    id: "hormones",
    check: "Hormones (LH, FSH, testosterone, estradiol, SHBG)",
    looksFor: "Hormone-axis suppression and recovery",
    timing: "Before, and 3 months after stopping (repeat until recovered)",
    phases: ["starting", "stopped"],
    source: { kind: "labs", markers: ["lh", "fsh", "testosterone_total", "estradiol", "shbg"] },
  },
  {
    id: "psa",
    check: "PSA (men)",
    looksFor: "Prostate change",
    timing: "Before; then as the doctor advises by age",
    phases: ALL,
    sex: "male",
    source: { kind: "labs", markers: ["psa"] },
  },
  {
    id: "pregnancy",
    check: "Pregnancy test (women who could become pregnant)",
    looksFor: "Risk to a foetus",
    timing: "Before starting, and if a period is missed",
    phases: ALL,
    sex: "female",
    source: { kind: "none" },
  },
  {
    id: "mood",
    check: "Mood check-in",
    looksFor: "Low mood, anxiety, sleep problems, especially after stopping",
    timing: "In the app, every 2 weeks; weekly for 3 months after stopping",
    phases: ALL,
    source: { kind: "checkin" },
  },
];

// ------------------------------------------------------------------- Flags

export type FlagLevel = "discuss" | "soon" | "urgent";

export const FLAG_LABEL: Record<FlagLevel, string> = {
  discuss: "Discuss with your doctor",
  soon: "See a doctor soon",
  urgent: "Urgent",
};

export const FLAG_TEXT: Record<FlagLevel, string> = {
  discuss: "This result is outside the range on your report. Mention it to your doctor at your next check.",
  soon: "This result needs a doctor's look soon. Please book an appointment this week.",
  urgent: "This result needs urgent attention. Please seek medical care today.",
};

/** Shown under the "soon" text for a high haematocrit. */
export const HAEMATOCRIT_SOON_EXTRA =
  "A high red-cell level thickens the blood and raises heart and stroke risk. A repeat test is recommended.";

/** Haematocrit as a fraction (L/L). Above `soon` is "See a doctor soon"; above `urgent` is "Urgent". */
export const HAEMATOCRIT = {
  male: { soon: 0.52, urgent: 0.6 },
  female: { soon: 0.48, urgent: 0.56 },
} as const;

/** Blood pressure: the app's existing bands for discuss/soon, and the urgent line. */
export const BP_URGENT = { systolicAbove: 180, diastolicAbove: 120 } as const;

/** ALT / AST: above the report's range is "discuss"; this many times its upper limit or more is "soon". */
export const LIVER_SOON_MULTIPLE = 3;

/** Markers flagged against the range on the user's own report. */
export const LIVER_MARKERS = ["alt", "ast"];
export const KIDNEY_MARKERS = ["creatinine", "egfr"];
/** Flagged only while the phase is "stopped". */
export const HORMONE_MARKERS = ["lh", "fsh", "testosterone_total", "estradiol", "shbg"];
// Lipids, PSA and HbA1c: no automatic flag (no thresholds set).

// --------------------------------------------------------- Warning signs

export const WARNING_SIGNS = {
  emergencyTitle: "Call emergency services now",
  emergency: [
    "Chest pain or pressure, or pain spreading to the arm, jaw or back",
    "Sudden shortness of breath",
    "Sudden weakness, numbness or drooping on one side of the face or body, or trouble speaking",
    "A sudden, severe headache unlike any before",
    "Fainting or a racing, irregular heartbeat",
    "Thoughts of ending your life or harming yourself",
  ],
  todayTitle: "See a doctor today",
  today: [
    "Yellowing of the skin or eyes, very dark urine, or pale stools",
    "A painful, swollen, warm calf or leg",
    "A red, hot, swollen or pus-filled area where you injected",
    "Blood pressure readings above 180/120 (the app also flags these)",
    "Severe low mood, anxiety or sleeplessness that doesn't ease",
  ],
} as const;

/** Lebanon's numbers, shown for an Asia/Beirut timezone; elsewhere the generic line. */
export const EMERGENCY_NUMBERS = {
  lebanon: {
    timezone: "Asia/Beirut",
    emergency: [
      { number: "140", name: "Red Cross" },
      { number: "112", name: null },
    ],
    crisis: { number: "1564", name: "Embrace" },
  },
  elsewhere: "your local emergency number",
} as const;

// ------------------------------------------------------------ Check-in

export const CHECKIN_ANSWERS = ["Not at all", "Some days", "Most days", "Nearly every day"] as const;

export const CHECKIN_QUESTIONS = [
  "Over the last two weeks, how often have you felt down or hopeless?",
  "How often have you lost interest in things you usually enjoy?",
  "How often have you felt anxious or on edge?",
  "How often has your sleep been poor?",
] as const;

/** Answer index at or above which the follow-up is shown ("Most days", "Nearly every day"). */
export const CHECKIN_FOLLOW_UP_FROM = 2;

/** Every 2 weeks; weekly for 3 months after stopping. */
export const CHECKIN_EVERY_DAYS = 14;
export const CHECKIN_EVERY_DAYS_AFTER_STOPPING = 7;
export const CHECKIN_WEEKLY_MONTHS_AFTER_STOPPING = 3;
