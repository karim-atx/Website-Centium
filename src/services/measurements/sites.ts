import type { Enums } from "../../../lib/supabase/database.types";

// The vocabulary of body measurements, and the bounds the column enforces.
//
// SEPARATE FROM index.ts BECAUSE IT TOUCHES NOTHING. That file opens the
// Supabase client at import time, which needs import.meta.env and therefore a
// bundler; these are constants and one pure function, and keeping them apart
// means the entry form, the professional's read-only view and the unit tests
// can all have them without any of them reaching for a database connection.

export type MeasurementType = Extract<
  Enums<"health_metric_type">,
  | "waist"
  | "hips"
  | "chest"
  | "neck"
  | "shoulders"
  | "arm_left"
  | "arm_right"
  | "forearm_left"
  | "forearm_right"
  | "thigh_left"
  | "thigh_right"
  | "calf_left"
  | "calf_right"
  | "body_fat_pct"
>;

export type MeasurementGroup = "torso" | "arms" | "legs" | "composition";

export interface MeasurementSite {
  type: MeasurementType;
  label: string;
  group: MeasurementGroup;
  unit: "cm" | "%";
}

/**
 * Every site, in the order the entry form shows them.
 *
 * THE GROUPING IS THE FORM'S, not the database's — the column knows fourteen
 * types and nothing about torsos. Kept here so the form, the summary card and
 * the professional's view all order and name them the same way.
 */
export const MEASUREMENT_SITES: MeasurementSite[] = [
  { type: "neck", label: "Neck", group: "torso", unit: "cm" },
  { type: "shoulders", label: "Shoulders", group: "torso", unit: "cm" },
  { type: "chest", label: "Chest", group: "torso", unit: "cm" },
  { type: "waist", label: "Waist", group: "torso", unit: "cm" },
  { type: "hips", label: "Hips", group: "torso", unit: "cm" },
  { type: "arm_left", label: "Left arm", group: "arms", unit: "cm" },
  { type: "arm_right", label: "Right arm", group: "arms", unit: "cm" },
  { type: "forearm_left", label: "Left forearm", group: "arms", unit: "cm" },
  { type: "forearm_right", label: "Right forearm", group: "arms", unit: "cm" },
  { type: "thigh_left", label: "Left thigh", group: "legs", unit: "cm" },
  { type: "thigh_right", label: "Right thigh", group: "legs", unit: "cm" },
  { type: "calf_left", label: "Left calf", group: "legs", unit: "cm" },
  { type: "calf_right", label: "Right calf", group: "legs", unit: "cm" },
  { type: "body_fat_pct", label: "Body fat", group: "composition", unit: "%" },
];

export const GROUP_LABEL: Record<MeasurementGroup, string> = {
  torso: "Torso",
  arms: "Arms",
  legs: "Legs",
  composition: "Body fat %",
};

export const MEASUREMENT_TYPES: MeasurementType[] = MEASUREMENT_SITES.map((s) => s.type);

const SITE_BY_TYPE = new Map(MEASUREMENT_SITES.map((s) => [s.type, s]));

export const siteFor = (type: MeasurementType): MeasurementSite | undefined => SITE_BY_TYPE.get(type);

export const isMeasurementType = (value: string): value is MeasurementType =>
  SITE_BY_TYPE.has(value as MeasurementType);

/**
 * The bounds health_metrics_measurement_range_check enforces.
 *
 * MIRRORED, NOT GUESSED — and deliberately just as loose. The constraint's own
 * comment says these are not normal ranges and are not trying to be: telling
 * somebody their own body is out of range is worse than an outlier on a chart.
 * What they catch is the mistake class — a tape read in inches, a decimal
 * slip, a millimetre entry, an empty field coerced to 0, and (for body fat) a
 * 0-1 fraction where 2 is the floor precisely so 0.18 is refused.
 *
 * Checked here so a typo becomes a sentence rather than a 23514 that loses the
 * whole entry, and checked there because this is the only thing that makes it
 * true.
 */
export const RANGE: Record<"cm" | "%", { min: number; max: number }> = {
  cm: { min: 10, max: 300 },
  "%": { min: 2, max: 75 },
};

/** The message for a value the column would refuse, or null if it would not. */
export function checkValue(type: MeasurementType, value: number): string | null {
  const site = SITE_BY_TYPE.get(type);
  if (!site) return "That isn't a measurement this app knows.";
  if (!Number.isFinite(value)) return "That doesn't look like a number.";
  const { min, max } = RANGE[site.unit];
  if (value < min || value > max) {
    return site.unit === "%"
      ? `Body fat should be between ${min}% and ${max}%.`
      : `${site.label} should be between ${min} cm and ${max} cm.`;
  }
  return null;
}
