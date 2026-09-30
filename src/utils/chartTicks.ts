// Axis ticks for TrendChart (WO16, WO4.1).

/** Three round y ticks spanning the data: 96 / 97 / 98 for 96–97.8. */
export function trendTicks(values: number[]): [number, number, number] {
  let lo = Math.floor(Math.min(...values));
  let hi = Math.ceil(Math.max(...values));
  if (hi - lo < 2) {
    const pad = 2 - (hi - lo);
    lo -= Math.floor(pad / 2);
    hi += Math.ceil(pad / 2);
  }
  if ((hi - lo) % 2) hi += 1;
  return [lo, (lo + hi) / 2, hi];
}
