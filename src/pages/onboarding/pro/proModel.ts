// The professional lane of onboarding (v6 Business UI OB-136 to OB-215):
// the literal content of BizOnboardingV10.dc.html's `PR` branch and the
// specialty cards of SharedOnboardingV4.dc.html's proType screen, plus the
// pure rules the steps share. No React and no storage, so it is tested in node.

import type { ProfessionalSubtype } from "../../../types";

/**
 * The handoff's own short keys for the specialties. Release 3 (Professional UI
 * HANDOVER d, FINAL_PLAN W1) adds nutritionist, coach (coach_instructor) and
 * doctor; the shell's lanes are add-only, so these extend the set.
 */
export type ProKind = "trainer" | "physio" | "diet" | "nutritionist" | "coach" | "doctor" | "other";

export const PRO_KINDS: ProKind[] = ["trainer", "physio", "diet", "nutritionist", "coach", "doctor", "other"];

export const PRO_KIND: Record<ProfessionalSubtype, ProKind> = {
  trainer: "trainer",
  physiotherapist: "physio",
  dietitian: "diet",
  nutritionist: "nutritionist",
  coach_instructor: "coach",
  doctor: "doctor",
  other: "other",
};

export const proKindOf = (s: ProfessionalSubtype | null | undefined): ProKind => PRO_KIND[s ?? "other"] ?? "other";

/**
 * Physiotherapy, dietetics and medicine are regulated: a registering body,
 * number and proof are required (Release 3 J2: a doctor is a regulated lane).
 * Every lane goes live only once checked: Fitness, Nutritionist, Coach or
 * instructor and Other on their certificate.
 */
export const isRegulated = (k: ProKind): boolean => k === "physio" || k === "diet" || k === "doctor";

/** The regulated kinds, for the registration record's name. */
export type RegulatedKind = "physio" | "diet" | "doctor";
export const asRegulated = (k: ProKind): RegulatedKind | null => (k === "physio" || k === "diet" || k === "doctor" ? k : null);

/** The lane's six numbered steps, by name (resume works by name, not position). */
export const PRO_STEP_KEYS = ["about", "work", "services", "creds", "background", "review"] as const;
export type ProStepKey = (typeof PRO_STEP_KEYS)[number];


/** The lane chip text: the specialty (dc PT[1]); Other uses what they typed when they did. */
export const PRO_LABEL: Record<ProKind, string> = {
  trainer: "Personal Trainer",
  physio: "Physiotherapist",
  diet: "Dietitian",
  nutritionist: "Nutritionist",
  coach: "Coach or instructor",
  doctor: "Doctor or GP",
  other: "Other professional",
};

// ---------------------------------------------------------------------------
// Specialty cards (SharedOnboardingV4 proType PDEF)
// ---------------------------------------------------------------------------

export interface SpecialtyCard {
  kind: ProKind;
  subtype: ProfessionalSubtype;
  title: string;
  description: string;
  points: [string, string];
  /** Tile fill: pale (lavender) or tealPale. */
  tile: "pale" | "tealPale";
}

export const SPECIALTY_CARDS: SpecialtyCard[] = [
  {
    kind: "trainer",
    subtype: "trainer",
    title: "Personal Trainer",
    description: "Training plans and sessions.",
    points: ["Build programs and track workouts", "Check in on every client"],
    tile: "pale",
  },
  {
    kind: "physio",
    subtype: "physiotherapist",
    title: "Physiotherapist",
    description: "Treatment, rehab and recovery.",
    points: ["Rehab plans and progress notes", "See client health data, with consent"],
    tile: "tealPale",
  },
  {
    kind: "diet",
    subtype: "dietitian",
    title: "Dietitian",
    description: "Nutrition plans and coaching.",
    points: ["Meal plans and food diaries", "Spot patterns in what clients eat"],
    tile: "pale",
  },
  // Release 3 (HANDOVER d): Nutritionist, Coach or instructor and Doctor or GP.
  {
    kind: "nutritionist",
    subtype: "nutritionist",
    title: "Nutritionist",
    description: "Healthy eating and nutrition coaching.",
    points: ["Meal plans and food diaries", "Targets that fit each client"],
    tile: "tealPale",
  },
  {
    kind: "coach",
    subtype: "coach_instructor",
    title: "Coach or instructor",
    description: "Classes, coaching and movement.",
    points: ["Build programs and run classes", "Check in on every client"],
    tile: "pale",
  },
  {
    kind: "doctor",
    subtype: "doctor",
    title: "Doctor or GP",
    description: "Clinical care and follow-ups.",
    points: ["Care plans and follow-ups", "See client health records, with consent"],
    tile: "tealPale",
  },
  {
    kind: "other",
    subtype: "other",
    title: "Other health or fitness professional",
    description: "Wellness and anything not listed above.",
    points: ["Work with clients your way", "Messages and progress in one place"],
    tile: "tealPale",
  },
];

/** The line under the cards (proType cardsNote): a regulated kind (doctor, physiotherapist, dietitian) is checked on its licence. */
export const specialtyNote = (picked: ProKind | null): string =>
  picked ? `Next: about you, your ${credentialWord(picked)} and your background.` : "Next: about you, your background, then a quick review.";

// ---------------------------------------------------------------------------
// Step content (BizOnboardingV10, PR branch)
// ---------------------------------------------------------------------------

/** The tip under About you and Your background (GUIDE). */
export const GUIDE: Record<ProKind, string> = {
  trainer: "Strong trainer profiles name who they help, show one result, and list where they train.",
  physio: "Strong physio profiles name the conditions you treat and how long a first session takes.",
  diet: "Strong dietitian profiles explain your approach to food and who you work with most.",
  nutritionist: "Strong nutritionist profiles explain your approach to food and who you work with most.",
  coach: "Strong coach profiles say what a class or session feels like and who it suits.",
  doctor: "Strong doctor profiles name the conditions you see and how long a first appointment takes.",
  other: "Strong profiles say what a first session feels like and who it suits.",
};

/** The specialty chips (SPEC) and the extra option the "More" menu adds. */
export const SPECIALTIES: Record<ProKind, string[]> = {
  trainer: ["Strength", "Weight loss", "Mobility", "Pre and postnatal", "Sports performance", "Older adults"],
  physio: ["Sports injuries", "Back and neck", "Post-surgery rehab", "Neurological", "Women's health", "Children"],
  diet: ["Weight management", "Sports nutrition", "Diabetes", "Gut health", "Eating disorder support", "Children"],
  nutritionist: ["Weight management", "Sports nutrition", "Healthy eating", "Gut health", "Plant-based eating", "Children"],
  coach: ["Yoga", "Pilates", "Running", "Boxing", "Swimming", "Wellness coaching"],
  doctor: ["General practice", "Sports medicine", "Women's health", "Weight management", "Diabetes", "Heart health"],
  other: ["Yoga", "Pilates", "Mindfulness", "Breathwork", "Stretching", "Wellness coaching"],
};
export const MORE_SPECIALTIES: Record<ProKind, string[]> = {
  trainer: ["Injury prevention"],
  physio: ["Pelvic health"],
  diet: ["Allergies"],
  nutritionist: ["Allergies"],
  coach: ["Meditation"],
  doctor: ["Children"],
  other: ["Meditation"],
};
export const MAX_SPECIALTIES = 5;

/** "How you work with clients" chips (FMT). */
export const FORMATS: Record<ProKind, string[]> = {
  trainer: ["One to one", "Small group", "Online", "At a gym", "Home visits"],
  physio: ["In clinic", "Home visits", "Online follow-ups"],
  diet: ["Online", "In clinic", "Messages between sessions"],
  nutritionist: ["Online", "One to one", "Messages between sessions"],
  coach: ["Group classes", "One to one", "Small group", "Online", "Outdoors"],
  doctor: ["In clinic", "Online follow-ups", "Home visits"],
  other: ["Group classes", "One to one", "Online", "Outdoors"],
};

/**
 * The chips that have a `session_formats` value (B5 closed set: one_to_one,
 * small_group, class, online_call, programme_only). The rest are places,
 * stored in session_places (PLACE_TO_DB, Database 20261120020000).
 */
export const FORMAT_TO_DB: Record<string, "one_to_one" | "small_group" | "class" | "online_call"> = {
  "One to one": "one_to_one",
  "Small group": "small_group",
  "Group classes": "class",
  Online: "online_call",
  "Online follow-ups": "online_call",
};

export function formatsForDb(chips: string[]): ("one_to_one" | "small_group" | "class" | "online_call")[] {
  const out: ("one_to_one" | "small_group" | "class" | "online_call")[] = [];
  for (const c of chips) {
    const v = FORMAT_TO_DB[c];
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** The two session-length boxes (NUMS) with their default minutes. */
export const SESSION_BOXES: Record<ProKind, [{ label: string; min: number }, { label: string; min: number }]> = {
  trainer: [
    { label: "Session, min", min: 60 },
    { label: "Online session, min", min: 45 },
  ],
  physio: [
    { label: "First assessment, min", min: 45 },
    { label: "Treatment, min", min: 30 },
  ],
  diet: [
    { label: "First consultation, min", min: 60 },
    { label: "Follow-up, min", min: 30 },
  ],
  nutritionist: [
    { label: "First consultation, min", min: 60 },
    { label: "Follow-up, min", min: 30 },
  ],
  coach: [
    { label: "Session, min", min: 60 },
    { label: "Online session, min", min: 45 },
  ],
  doctor: [
    { label: "First appointment, min", min: 30 },
    { label: "Follow-up, min", min: 15 },
  ],
  other: [
    { label: "Session, min", min: 60 },
    { label: "Online session, min", min: 45 },
  ],
};

/** The lengths the database accepts (professional_profiles_session_lengths_check). */
export const SESSION_LENGTHS = [15, 30, 45, 60, 75, 90, 120] as const;

/** The next allowed length up (+1) or down (-1), clamped at the ends. */
export function stepLength(current: number, dir: 1 | -1): number {
  const at = SESSION_LENGTHS.findIndex((v) => v === current);
  const i = at < 0 ? SESSION_LENGTHS.findIndex((v) => v >= current) : at;
  const next = Math.min(SESSION_LENGTHS.length - 1, Math.max(0, (i < 0 ? SESSION_LENGTHS.length - 1 : i) + dir));
  return SESSION_LENGTHS[next];
}

/** session_lengths is a distinct set: two equal boxes store one value. */
export function lengthsForDb(lengths: number[]): number[] {
  return [...new Set(lengths.filter((v) => (SESSION_LENGTHS as readonly number[]).includes(v)))];
}

// ---------------------------------------------------------------------------
// Where you work
// ---------------------------------------------------------------------------

export type WorkMode = "independent" | "business" | "online" | "mix";

export const WORK_MODES: { value: WorkMode; title: string; description: string }[] = [
  { value: "independent", title: "Independent", description: "Your own clients, your own place" },
  { value: "business", title: "At a business", description: "Join a gym, studio or clinic with its business ID" },
  { value: "online", title: "Online only", description: "Video sessions and messages" },
  { value: "mix", title: "A mix", description: "Some in person, some online" },
];

/** professional_work_mode has three values: both "Independent" and "At a business" are in person. */
export const WORK_MODE_TO_DB: Record<WorkMode, "in_person" | "online" | "both"> = {
  independent: "in_person",
  business: "in_person",
  online: "online",
  mix: "both",
};

/** Home-visit radii offered for "Home visits cover" (km; null = no home visits). */
export const HOME_VISIT_KM = [2, 5, 8, 10, 15, 20, 30] as const;

// ---------------------------------------------------------------------------
// Other professional (D10, OURS-other-professional-fields)
// ---------------------------------------------------------------------------

/** closest_group is its own type since Database 20261120020000: professional_group. */
export type ClosestGroup = "fitness" | "clinical" | "nutrition" | "other";
export const CLOSEST_GROUPS: { value: ClosestGroup; label: string }[] = [
  { value: "fitness", label: "Fitness" },
  { value: "clinical", label: "Clinical" },
  { value: "nutrition", label: "Nutrition" },
  { value: "other", label: "Other" },
];
export const WHAT_YOU_DO_MAX = 40;

/** The "What do you do?" error, or null. Empty is allowed (Optional). */
export function whatYouDoError(v: string): string | null {
  const t = v.trim();
  if (t.length > WHAT_YOU_DO_MAX) return "Keep it under 40 characters.";
  if (t.length === 1) return "Use at least 2 characters.";
  return null;
}

// ---------------------------------------------------------------------------
// The lane's draft
// ---------------------------------------------------------------------------

export interface ProArea {
  label: string;
  lat: number;
  lng: number;
}

export interface ProLaneDraft {
  /** Other only: other_discipline (≤ 40). */
  whatYouDo: string;
  /** Other only: closest_group. */
  closestGroup: ClosestGroup | null;
  workMode: WorkMode | null;
  /** "At a business": the business ID typed, sent as a join request on submit (Database B6). */
  businessCode: string;
  area: ProArea | null;
  /** Physiotherapist "Home visits cover"; null = none. */
  homeVisitKm: number | null;
  specialties: string[];
  formats: string[];
  /** The two session-length boxes, in minutes. */
  lengths: [number, number];
  /** Fitness / Other: who issued the certificate (licence #1's issuing body). */
  issuedBy: string;
  /** Physiotherapist / Dietitian: free-text registering body (V6-67). */
  registeringBody: string;
  licenceNumber: string;
  /** The registration licence row once the proof is uploaded (professional_licences.id). */
  registrationLicenceId: string | null;
  /** What the upload rows show: the picked file's name and size (the stored path is a uuid). */
  proofFile: { name: string; bytes: number } | null;
  certificateFile: { name: string; bytes: number } | null;
  termsAccepted: boolean;
}

export const emptyProDraft = (kind: ProKind): ProLaneDraft => ({
  whatYouDo: "",
  closestGroup: null,
  workMode: null,
  businessCode: "",
  area: null,
  homeVisitKm: null,
  specialties: [],
  formats: [],
  lengths: [SESSION_BOXES[kind][0].min, SESSION_BOXES[kind][1].min],
  issuedBy: "",
  registeringBody: "",
  licenceNumber: "",
  registrationLicenceId: null,
  proofFile: null,
  certificateFile: null,
  termsAccepted: false,
});

/** Merges a saved draft over the defaults, so a field added later is never undefined. */
export function restoreProDraft(kind: ProKind, saved: Partial<ProLaneDraft> | null | undefined): ProLaneDraft {
  const base = emptyProDraft(kind);
  if (!saved || typeof saved !== "object") return base;
  const lengths =
    Array.isArray(saved.lengths) && saved.lengths.length === 2 && saved.lengths.every((n) => typeof n === "number")
      ? (saved.lengths as [number, number])
      : base.lengths;
  return {
    ...base,
    ...saved,
    specialties: Array.isArray(saved.specialties) ? saved.specialties.slice(0, MAX_SPECIALTIES) : [],
    formats: Array.isArray(saved.formats) ? saved.formats : [],
    lengths,
  };
}

/** Whether "Where you work" can continue: a mode, and a business ID when at a business. */
export function workComplete(d: Pick<ProLaneDraft, "workMode" | "businessCode">): boolean {
  if (!d.workMode) return false;
  if (d.workMode === "business") return d.businessCode.trim().length > 0;
  return true;
}

/** The licence number rule for a regulated professional (OB-176). */
export function licenceNumberError(v: string): string | null {
  return v.trim() ? null : "Add your licence number as it appears on your card.";
}

/** Whether Credentials can continue (regulated: body, number and proof). */
export function credentialsComplete(
  kind: ProKind,
  d: Pick<ProLaneDraft, "registeringBody" | "licenceNumber">,
  proofUploaded: boolean
): boolean {
  if (!isRegulated(kind)) return true;
  return d.registeringBody.trim().length >= 2 && !licenceNumberError(d.licenceNumber) && proofUploaded;
}

/** The Review "Where you work" line, from the real answers. */
export function workSummary(d: Pick<ProLaneDraft, "workMode" | "area" | "homeVisitKm">, kind: ProKind): string {
  const mode = WORK_MODES.find((m) => m.value === d.workMode)?.title ?? "Not set";
  const parts = [mode];
  if (d.workMode !== "online" && d.area) {
    parts.push((kind === "physio" || kind === "doctor") && d.workMode === "independent" ? `clinic in ${d.area.label}` : d.area.label);
  }
  let line = parts.join(" · ");
  if (d.workMode === "mix") line += " and online";
  if (d.homeVisitKm && d.workMode !== "online" && d.workMode !== "business") line += ", home visits";
  return line;
}

/** Initials for the profile preview avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * onboarding_progress item set when a professional (every lane, user decision
 * 14 Oct 2026) submits onboarding: the Get set up card and the verification
 * screen list them on Explore once their licence or certificate is verified
 * (fetchGoLiveStatus), then dismiss the item (so a later "off" is respected).
 */
export const GO_LIVE_ON_VERIFICATION = "pro_go_live_on_verification";

/** What a lane's checked document is called: a regulated licence, or a certificate. */
export const credentialWord = (k: ProKind): "licence" | "certificate" => (isRegulated(k) ? "licence" : "certificate");

const CHIP_MAX = 22;

/** The lane chip's text: the specialty, or an Other professional's own words (BizOnboardingV10 chip = PT[1]). */
export function proChipLabel(kind: ProKind, whatYouDo: string): string {
  const t = whatYouDo.trim();
  if (kind !== "other" || t.length < 2 || t.length > WHAT_YOU_DO_MAX) return PRO_LABEL[kind];
  // The chip is one line beside "Step n of 6": a long title is shortened there
  // (it shows in full on the profile).
  return t.length > CHIP_MAX ? `${t.slice(0, CHIP_MAX - 1).trimEnd()}…` : t;
}

/** "licence-card.jpg · 1.8 MB" */
export function fileLine(name: string, bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${name} · ${mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`}`;
}

/** The flow step keys of the professional lane (onboardingSteps.ts), mapped to the lane's own by ProLane. */
export const PRO_FLOW_STEPS = ["subtype", "proAbout", "proWork", "proServices", "proCreds", "background", "proReview"] as const;
export type ProFlowStep = (typeof PRO_FLOW_STEPS)[number];

/** "How you work with clients" chips that are places (professional_profiles.session_places, closed set). */
export const PLACE_TO_DB: Record<string, "at_gym" | "home_visit" | "in_clinic" | "outdoors" | "messages_between_sessions"> = {
  "At a gym": "at_gym",
  "Home visits": "home_visit",
  "In clinic": "in_clinic",
  Outdoors: "outdoors",
  "Messages between sessions": "messages_between_sessions",
};
export const HOME_VISITS_CHIP = "Home visits";

/**
 * The places to store. A home-visit radius and the Home visits place always
 * agree: a radius adds the place, and the place is only stored with a radius
 * (the Services step asks for one when the chip is on).
 */
export function placesForDb(chips: string[], homeVisitKm: number | null): string[] {
  const out: string[] = [];
  for (const c of chips) {
    const v = PLACE_TO_DB[c];
    if (v && !out.includes(v) && (v !== "home_visit" || homeVisitKm)) out.push(v);
  }
  if (homeVisitKm && !out.includes("home_visit")) out.push("home_visit");
  return out;
}

