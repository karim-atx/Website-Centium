import type { BloodMarker } from "../../types";
import type { BloodPressureReading } from "../blood-pressure/reading";
import { classifyBloodPressure } from "../blood-pressure/classify";
import {
  HAEMATOCRIT,
  HORMONE_MARKERS,
  LIVER_MARKERS,
  THRESHOLD_MARKERS,
  LIVER_SOON_MULTIPLE,
  type FlagLevel,
  type Phase,
} from "./guidance";

// Flags are worked out on the device each time a screen renders, from the
// table in ./guidance. Nothing here is stored or sent anywhere.

export type Flag = { level: FlagLevel; haematocrit?: boolean; bloodPressure?: boolean };

/** Blood pressure: elevated or stage 1 = discuss, stage 2 = soon, above 180 and/or 120 = urgent. */
export function bloodPressureFlag(reading: Pick<BloodPressureReading, "systolic" | "diastolic">): Flag | null {
  switch (classifyBloodPressure(reading.systolic, reading.diastolic)) {
    case "severe":
      return { level: "urgent", bloodPressure: true };
    case "stage2":
      return { level: "soon", bloodPressure: true };
    case "stage1":
    case "elevated":
      return { level: "discuss", bloodPressure: true };
    default:
      return null;
  }
}

/** Haematocrit as a fraction: the list's unit is %, a report may print L/L. */
export function haematocritFraction(value: number, unit: string): number {
  const u = unit.trim().toLowerCase();
  if (u === "%") return value / 100;
  if (u === "l/l") return value;
  return value > 1 ? value / 100 : value;
}

export type LabFlagContext = { sex: "male" | "female" | "other" | undefined; phase: Phase | null };

/**
 * One lab result's flag (clinical review 2026-10-02):
 * - haematocrit: the fixed thresholds by sex, for men and women only;
 * - ALT/AST: 3x the report's upper limit or more is "soon";
 * - hormones, while "Stopped": still low on a repeat test is "soon";
 * - otherwise any result outside the range printed on the user's report is
 *   "discuss", whether or not it is linked to the marker list;
 * - the nine threshold markers: no flag at all;
 * - no range on the report, and none of the above: no flag.
 */
export function labFlag(marker: BloodMarker, ctx: LabFlagContext): Flag | null {
  const key = marker.markerKey ?? null;
  if (key && THRESHOLD_MARKERS.includes(key)) return null;
  const low = marker.rangeLow ?? null;
  const high = marker.rangeHigh ?? null;
  const v = marker.value;
  const outside = (high !== null && v > high) || (low !== null && v < low);

  if (key === "haematocrit" && (ctx.sex === "male" || ctx.sex === "female")) {
    const t = HAEMATOCRIT[ctx.sex];
    const f = haematocritFraction(v, marker.unit);
    if (f > t.urgent) return { level: "urgent", haematocrit: true };
    if (f > t.soon) return { level: "soon", haematocrit: true };
  }

  if (key && LIVER_MARKERS.includes(key) && high !== null && v >= LIVER_SOON_MULTIPLE * high) {
    return { level: "soon" };
  }

  if (key && HORMONE_MARKERS.includes(key) && ctx.phase === "stopped") {
    // The user's phase is all the app knows: the day "Stopped" was chosen
    // is not the day they stopped, so earlier results are not set aside.
    const prev = marker.previous;
    if (low !== null && v < low && prev && prev.low !== null && prev.value < prev.low) return { level: "soon" };
  }

  return outside ? { level: "discuss" } : null;
}
