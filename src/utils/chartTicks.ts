// Axis ticks for TrendChart (WO16, WO19, WO4.1).

/**
 * Three evenly spaced round y ticks covering the data: the smallest step of
 * 1, 2, 4, 5 or 8 × 10^k whose ticks, starting at the data minimum rounded
 * down to that step, reach the maximum. Reproduces both frames: 96 / 97 / 98
 * for a waist of 96–97.8 (WO16), 80 / 88 / 96 for a bench of 84–93 (WO19).
 */
export function trendTicks(values: number[]): [number, number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  for (let k = -1; k < 8; k++) {
    for (const m of [1, 2, 4, 5, 8]) {
      const step = m * 10 ** k;
      if (step < 1) continue;
      const lo = Math.floor(min / step) * step;
      if (lo + 2 * step >= max) return [lo, lo + step, lo + 2 * step];
    }
  }
  return [min, (min + max) / 2, max];
}
