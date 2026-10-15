/**
 * Release 3 (DB-5) · weight from a one-rep max, the TypeScript twin of the
 * database's resolve_weight(p_one_rm, p_intensity_pct, p_unit):
 *
 *   null when either input is missing or not above zero;
 *   lb: round(1RM × intensity ÷ 100 ÷ 5) × 5;
 *   kg (anything else): round(1RM × intensity ÷ 100 ÷ 2.5) × 2.5.
 *
 * Postgres rounds numeric halves away from zero; every value here is
 * positive, so Math.round (halves up) gives the same answer. The product is
 * fixed to 9 decimals first so a binary-float tail (80 × 0.775 = 61.99999…)
 * cannot tip a value that is exactly on a step onto the step below.
 *
 * Templates store intensity only (HANDOVER g); this is for showing the
 * computed weight for one client, labelled "From 1RM", which the coach can
 * override.
 */
export function resolveWeight(oneRm: number | null | undefined, intensityPct: number | null | undefined, unit: "kg" | "lb" = "kg"): number | null {
  if (oneRm == null || intensityPct == null || !Number.isFinite(oneRm) || !Number.isFinite(intensityPct)) return null;
  if (oneRm <= 0 || intensityPct <= 0) return null;
  const step = unit === "lb" ? 5 : 2.5;
  const raw = Number(((oneRm * intensityPct) / 100 / step).toFixed(9));
  return Math.round(raw) * step;
}
