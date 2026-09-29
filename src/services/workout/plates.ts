// Plate calculator maths (handover 2026-09-29, 03 "Plate calculator (WO24)").
//
// working  = target × percentage
// per side = (working − bar − 2 × collar) / 2
//
// THE COLLAR VALUE IS ONE COLLAR, and there is one on each sleeve. The sheet
// has always labelled the selector "Collars (per side)", but the old maths
// (design refinement §6.9b) subtracted it once, as if it were the pair — so
// 90 kg on a 20 kg bar with 2.5 kg collars loaded 33.75 kg a side instead of
// 32.5, and the bar came out 2.5 kg heavy.

/** The standard IPF plate set, heaviest first (kg). */
export const IPF_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Plate weight to load on each sleeve, never negative. */
export function perSideKg(workingKg: number, barKg: number, collarKg: number): number {
  return Math.max(0, (workingKg - barKg - 2 * collarKg) / 2);
}

/** Greedy per-side breakdown from the heaviest plate; what can't be made is the remainder. */
export function plateBreakdown(perSide: number, plateSet: number[] = IPF_PLATES_KG) {
  let remaining = perSide;
  const plates: { kg: number; count: number }[] = [];
  for (const plate of plateSet) {
    const count = Math.floor(remaining / plate + 1e-6);
    if (count > 0) {
      plates.push({ kg: plate, count });
      remaining = +(remaining - count * plate).toFixed(2);
    }
  }
  return { plates, remainderKg: remaining };
}

export type PlateUnit = "kg" | "lb";

/** The lb plate set (03 WO24), heaviest first. */
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

/** Bar and collar choices per unit (approved decision 18: 45/35 lb bars, 5/2.5 lb collars). */
export const BARS: Record<PlateUnit, [number, number]> = { kg: [20, 15], lb: [45, 35] };
export const COLLARS: Record<PlateUnit, [number, number]> = { kg: [5, 2.5], lb: [5, 2.5] };

/**
 * The kg plate an lb plate is drawn as: "LB mode uses 45, 35, 25, 10, 5,
 * 2.5 lb in the nearest kg plate's colour" (WO24).
 */
export function nearestKgPlate(lb: number): number {
  const kg = lb * 0.45359237;
  return IPF_PLATES_KG.reduce((best, p) => (Math.abs(p - kg) < Math.abs(best - kg) ? p : best), IPF_PLATES_KG[0]);
}

export interface PlateLoad {
  /** target × percentage */
  working: number;
  /** Plates actually loaded on each sleeve (the closest lower load when the working weight can't be made). */
  perSide: number;
  plates: { kg: number; count: number }[];
  /** bar + 2 × collar + 2 × perSide: what is on the bar. */
  loaded: number;
  /** Set when the working weight can't be loaded exactly: the closest lower weight. */
  closest: number | null;
}

/**
 * The whole loadout in one unit (kg or lb): per side from the handover
 * formula, greedy fill from the heaviest plate in that unit's set, and an
 * unloadable remainder rounded DOWN to the closest weight that can be made.
 */
export function plateLoad(target: number, pct: number, bar: number, collar: number, unit: PlateUnit): PlateLoad {
  const working = Math.round(target * pct) / 100;
  const wanted = perSideKg(working, bar, collar);
  const { plates, remainderKg } = plateBreakdown(wanted, unit === "kg" ? IPF_PLATES_KG : LB_PLATES);
  const perSide = +(wanted - remainderKg).toFixed(2);
  const loaded = +(bar + 2 * collar + 2 * perSide).toFixed(2);
  return { working, perSide, plates, loaded, closest: remainderKg > 0.001 ? loaded : null };
}
