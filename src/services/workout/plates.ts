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
