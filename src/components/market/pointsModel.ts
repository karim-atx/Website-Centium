import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";
// Market + Share 3.0 · points and ledger rules shared by OfferCard,
// PointsFigure and StatLedger. Pure, from the screen files' script (Client
// Explore Screens `offers`: note / noteInk / pct / line).

/** Points as the board writes them: "1,240". */
export const formatPoints = (n: number): string => Math.round(n).toLocaleString(appLocale("en-US"));

/** How far a balance is toward a cost, 0..1 (a free offer is reached). */
export function progressFraction(balance: number, cost: number): number {
  if (!(cost > 0)) return 1;
  const f = balance / cost;
  return Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0;
}

/** Points still needed (never negative). */
export const pointsToGo = (balance: number, cost: number): number => Math.max(0, Math.ceil(cost - balance));

/**
 * The client OfferCard's note and bottom line: "You can redeem" (teal ink
 * 700, full teal line) or "N to go" (faint 500, lavender line at
 * round(balance / cost × 100)%).
 */
export function offerProgress(balance: number, cost: number): { can: boolean; note: string; pct: number } {
  const can = balance >= cost;
  return can
    ? { can, note: t("You can redeem"), pct: 100 }
    : { can, note: t("{points} to go", { points: formatPoints(pointsToGo(balance, cost)) }), pct: Math.round(progressFraction(balance, cost) * 100) };
}

/**
 * The leaf mark's height for a figure size, as drawn: 14 → 10, 15 → 11,
 * 16 / 17 → 12, 26 → 15, 28 → 20 (the 510 × 915 leaf keeps its ratio).
 * Sizes the board doesn't draw scale at 0.7 of the figure.
 */
export function leafHeight(size: number): number {
  const drawn: Record<number, number> = { 14: 10, 15: 11, 16: 12, 17: 12, 26: 15, 28: 20 };
  return drawn[size] ?? Math.round(size * 0.7);
}

/** The leaf's width for a height (viewBox 510 × 915), to 1 decimal as drawn (12 → 6.7). */
export const leafWidth = (height: number): number => Math.round(((height * 510) / 915) * 10) / 10;

/**
 * A ledger delta's tone (StatLedger, B-MA.1 / P-MA.1 `dInk`): a leading minus
 * ("−" or "-") is red, an empty value ("–") faint, anything else green.
 */
export function deltaTone(delta: string | null | undefined): "good" | "high" | "faint" {
  const d = (delta ?? "").trim();
  if (!d || d === "–") return "faint";
  return d.startsWith("−") || d.startsWith("-") ? "high" : "good";
}
