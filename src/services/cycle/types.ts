import type { Enums } from "../../../lib/supabase/database.types";

// The cycle vocabulary, with no database attached.
//
// SEPARATE FROM ./index.ts, which opens a Supabase client. Importing that from
// a type module drags `document` and `import.meta.env` into the node test
// runner's type-check — the same trap services/blood-pressure fell into, and
// the reason it has a reading.ts. The generated Enums are types, not values,
// so they cost nothing here.

export type CyclePhase = Enums<"cycle_phase_kind">;
export type Confidence = Enums<"cycle_confidence">;
export type Flow = Enums<"cycle_flow">;
export type CervicalMucus = Enums<"cervical_mucus">;
export type LhResult = Enums<"lh_test_result">;
export type PregnancyTest = Enums<"pregnancy_test_result">;
export type SexActivity = Enums<"sex_activity">;
export type Contraception = Enums<"contraception_method">;

/** The flags my_cycle_prediction can raise. Every one has copy in ./guidance. */
export const CYCLE_FLAGS = [
  "cycle_under_21",
  "cycle_over_35",
  "period_over_7",
  "heavy_flow",
  "intermenstrual_bleeding",
  "no_period_90_days",
] as const;
export type CycleFlag = (typeof CYCLE_FLAGS)[number];

/**
 * The vocabularies, mirrored from the CHECK constraints.
 *
 * `cycle_day_logs_symptoms_check` and `_mood_check` call valid_string_set with
 * these exact lists, so a value outside them is refused by the database. They
 * are repeated here so the UI can offer them and so a typo becomes a compile
 * error rather than a 23514 — and valid_string_set IS executable by
 * `authenticated`, checked, so the dd268ca failure mode does not apply.
 */
export const SYMPTOMS = [
  "cramps",
  "headache",
  "bloating",
  "breast_tenderness",
  "acne",
  "backache",
  "nausea",
  "fatigue",
  "insomnia",
  "cravings",
  "diarrhoea",
  "constipation",
  "dizziness",
  "hot_flashes",
  "other",
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export const MOODS = [
  "calm",
  "happy",
  "energetic",
  "irritable",
  "anxious",
  "sad",
  "sensitive",
  "angry",
  "unmotivated",
  "other",
] as const;
export type Mood = (typeof MOODS)[number];

export const CONDITIONS = [
  "pcos",
  "endometriosis",
  "thyroid",
  "irregular_cycles",
  "perimenopause",
  "other",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const FLOWS: readonly Flow[] = ["none", "spotting", "light", "medium", "heavy"];
export const MUCUS_OPTIONS: readonly CervicalMucus[] = [
  "dry",
  "sticky",
  "creamy",
  "watery",
  "egg_white",
];
export const LH_OPTIONS: readonly LhResult[] = ["negative", "positive", "peak"];
export const PREGNANCY_TEST_OPTIONS: readonly PregnancyTest[] = ["negative", "positive"];
export const SEX_ACTIVITY_OPTIONS: readonly SexActivity[] = ["none", "protected", "unprotected"];
/**
 * STILL THE VOCABULARY, NO LONGER A cycle_settings COLUMN.
 *
 * Database-Atraxia 20260924470000 moved contraception out of cycle_settings
 * into contraception_plans, where a method carries a start date, a pack
 * schedule and reminder times — a plan rather than a label. The enum is
 * unchanged and this list is what part 2's contraception screens will offer;
 * part 1 does not read or write it, because a one-tap chip cannot express a
 * plan and writing half of one would be worse than not offering it.
 */
export const CONTRACEPTION_OPTIONS: readonly Contraception[] = [
  "none",
  "pill_combined",
  "pill_progestin",
  "iud_hormonal",
  "iud_copper",
  "implant",
  "injection",
  "ring",
  "patch",
  "condom",
  "other",
];

/** The bounds cycle_settings' CHECKs enforce. */
export const SETTINGS_LIMITS = {
  cycleLength: { min: 15, max: 90 },
  periodLength: { min: 1, max: 15 },
  lutealLength: { min: 7, max: 20 },
} as const;

/** The bounds cycle_day_logs' CHECKs enforce. */
export const LOG_LIMITS = {
  bbt: { min: 34, max: 40 },
  energy: { min: 1, max: 5 },
  notesMaxLength: 1000,
} as const;

export interface CycleSettings {
  trackerEnabled: boolean;
  typicalCycleLength: number;
  typicalPeriodLength: number;
  lutealLength: number;
  conditions: Condition[];
}

export interface CycleDayLog {
  date: string;
  flow: Flow | null;
  isPeriod: boolean;
  symptoms: Symptom[];
  mood: Mood[];
  energy: number | null;
  cervicalMucus: CervicalMucus | null;
  bbtCelsius: number | null;
  lhTest: LhResult | null;
  pregnancyTest: PregnancyTest | null;
  sexActivity: SexActivity | null;
  notes: string | null;
}

/**
 * One row of my_cycle_prediction(), or nothing.
 *
 * EVERY FIELD IS NULLABLE BUT `phase`, because the function returns a row with
 * holes in it rather than several shapes: a user on hormonal contraception has
 * a next-period estimate and no ovulation date, a pregnant user has neither,
 * and a user with one logged period has a cycle day and a very wide range.
 * The UI reads each field and shows what is there.
 */
export interface CyclePrediction {
  phase: CyclePhase;
  cycleDay: number | null;
  nextPeriodStart: string | null;
  nextPeriodFrom: string | null;
  nextPeriodTo: string | null;
  ovulationEstimate: string | null;
  fertileFrom: string | null;
  fertileTo: string | null;
  confidence: Confidence | null;
  irregular: boolean;
  flags: CycleFlag[];
  pregnancyWeek: number | null;
  pregnancyDay: number | null;
  trimester: number | null;
}
