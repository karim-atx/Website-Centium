import type { BloodMarker } from "../../types";
import type { BloodPressureReading } from "../blood-pressure/reading";
import { classifyBloodPressure } from "../blood-pressure/classify";
import {
  HAEMATOCRIT,
  HORMONE_MARKERS,
  KIDNEY_MARKERS,
  LIVER_MARKERS,
  LIVER_SOON_MULTIPLE,
  type FlagLevel,
  type Phase,
} from "./guidance";

// Flags are worked out on the device each time a screen renders, from the
// table in ./guidance. Nothing here is stored or sent anywhere.

export type Flag = { level: FlagLevel; haematocrit?: boolean };

/** Blood pressure: elevated or stage 1 = discuss, stage 2 = soon, above 180 and/or 120 = urgent. */
export function bloodPressureFlag(reading: Pick<BloodPressureReading, "systolic" | "diastolic">): Flag | null {
  switch (classifyBloodPressure(reading.systolic, reading.diastolic)) {
    case "severe":
      return { level: "urgent" };
    case "stage2":
      return { level: "soon" };
    case "stage1":
    case "elevated":
      return { level: "discuss" };
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
 * One lab result's flag. Haematocrit uses the fixed thresholds by sex; ALT,
 * AST, creatinine and eGFR use the range on the user's own report; the
 * hormones are flagged only after stopping. Everything else (lipids, PSA,
 * HbA1c and the rest) has no automatic flag. No range on the report, no flag.
 */
export function labFlag(marker: BloodMarker, ctx: LabFlagContext): Flag | null {
  const key = marker.markerKey;
  if (!key) return null;
  const low = marker.rangeLow ?? null;
  const high = marker.rangeHigh ?? null;
  const v = marker.value;

  if (key === "haematocrit") {
    if (ctx.sex !== "male" && ctx.sex !== "female") return null;
    const t = HAEMATOCRIT[ctx.sex];
    const f = haematocritFraction(v, marker.unit);
    if (f > t.urgent) return { level: "urgent", haematocrit: true };
    if (f > t.soon) return { level: "soon", haematocrit: true };
    return null;
  }

  if (LIVER_MARKERS.includes(key)) {
    if (high === null) return null;
    if (v >= LIVER_SOON_MULTIPLE * high) return { level: "soon" };
    if (v > high) return { level: "discuss" };
    return null;
  }

  if (KIDNEY_MARKERS.includes(key)) {
    if ((high !== null && v > high) || (low !== null && v < low)) return { level: "discuss" };
    return null;
  }

  if (HORMONE_MARKERS.includes(key)) {
    // The user's phase is all the app knows: the day "Stopped" was chosen
    // is not the day they stopped, so earlier results are not set aside.
    if (ctx.phase !== "stopped") return null;
    const below = low !== null && v < low;
    const prev = marker.previous;
    if (below && prev && prev.low !== null && prev.value < prev.low) {
      return { level: "soon" };
    }
    if (below || (high !== null && v > high)) return { level: "discuss" };
    return null;
  }

  return null;
}
