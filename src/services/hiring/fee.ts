// Market + Share 3.0 · the one-time hiring fee: the server's numbers and the
// words around them. No arithmetic of our own.
//
// Database Release 2 (abf4b2c, 20261213010000 / 20261213030000): the rule is
// max(rate × base, floor), rounded to the cent, with the base a role's first
// month (pay × classes a month, or the monthly pay) and a class slot's total.
// The rate (0.08) and the two floors ($25 a role, $3 a class slot) are ROWS in
// platform_settings (hiring_fee_pct, hiring_fee_min_role,
// hiring_fee_min_class; SELECT granted to authenticated), never constants
// here, so a pricing change is an UPDATE and the screens follow it:
// - the quote on the offer's confirmation is quote_hiring_fee's
//   (parseFeeQuote), recomputed by accept_hire_offer and kept on the fee row
//   beside what the gym was shown (my_hiring_fees: amount, quoted_amount);
// - the words that name the rule before any quote exists (the footer notice
//   on the opening form and the direct-offer sheet, the minimum sentence, the
//   Fees page's explanation, the "8% of" labels) read HiringFeeRules from
//   platform_settings (services/hiring fetchHiringFeeRules).

import { bool, num, str } from "../market/parse";
import { appLocale } from "../../i18n/format";

export type OpeningType = "role" | "class_slot";
export type PayUnit = "per_class" | "per_month" | "per_slot";

/** platform_settings' hiring numbers. */
export interface HiringFeeRules {
  /** hiring_fee_pct, 0..1 (0.08). */
  rate: number;
  /** hiring_fee_min_role ($25). */
  minimumRole: number;
  /** hiring_fee_min_class ($3). */
  minimumClass: number;
}

/** platform_settings' row → the rules, or null when a number is missing. */
export function parseFeeRules(r: Record<string, unknown> | null | undefined): HiringFeeRules | null {
  if (!r) return null;
  const rate = num(r.hiring_fee_pct);
  const minimumRole = num(r.hiring_fee_min_role);
  const minimumClass = num(r.hiring_fee_min_class);
  if (rate == null || minimumRole == null || minimumClass == null || rate < 0 || rate > 1) return null;
  return { rate, minimumRole, minimumClass };
}

/** A fee as the server worked it out (quote_hiring_fee, my_hiring_fees). */
export interface HiringFeeQuote {
  type: OpeningType;
  base: number;
  basis: "first_month_pay" | "slot_total_pay";
  percentAmount: number;
  minimum: number;
  fee: number;
  /** The server's flag: the floor is strictly higher than the percentage. */
  minimumApplied: boolean;
}

/**
 * quote_hiring_fee's row (base, basis, percent_amount, minimum, fee,
 * minimum_applied) or my_hiring_fees' (amount in place of fee); null when the
 * server's numbers aren't all there.
 */
export function parseFeeQuote(type: OpeningType, r: Record<string, unknown> | null | undefined): HiringFeeQuote | null {
  if (!r) return null;
  const base = num(r.base);
  const percentAmount = num(r.percent_amount);
  const minimum = num(r.minimum);
  const fee = num(r.fee) ?? num(r.amount);
  if (base == null || percentAmount == null || minimum == null || fee == null) return null;
  const basis = str(r.basis);
  return {
    type,
    base,
    basis: basis === "slot_total_pay" || basis === "first_month_pay" ? basis : type === "role" ? "first_month_pay" : "slot_total_pay",
    percentAmount,
    minimum,
    fee,
    minimumApplied: bool(r.minimum_applied),
  };
}

/** "8%", "7.5%". */
export function ratePercent(rate: number): string {
  const p = Math.round(rate * 10000) / 100;
  return `${p.toLocaleString(appLocale("en-US"), { maximumFractionDigits: 2 })}%`;
}

/** "$25", "$2.50": a floor shows cents only when it has some. */
const floorMoney = (n: number): string => payMoney(n);

/** The board's footer notice on the opening form and the direct-offer sheet: "One-time 8% hiring fee (min. $25 per role, $3 per class slot) when you hire". */
export function feeNotice(r: HiringFeeRules): string {
  return `One-time ${ratePercent(r.rate)} hiring fee (min. ${floorMoney(r.minimumRole)} per role, ${floorMoney(r.minimumClass)} per class slot) when you hire`;
}

/** The notice before the rules have loaded (the numbers are the server's, so none are printed). */
export const FEE_NOTICE_PLAIN = "One-time hiring fee when you hire";

/** The Fees page's explanation (ours), with the server's numbers. */
export function feeExplanation(r: HiringFeeRules | null): string {
  if (!r) return "Each hire through Centium has one fee, a share of the base or the minimum, whichever is higher. It shows here with how it was worked out.";
  return `Each hire through Centium has one fee: ${ratePercent(r.rate)} of the base, or the minimum (${floorMoney(r.minimumRole)} per role, ${floorMoney(r.minimumClass)} per class slot), whichever is higher. It shows here with how it was worked out.`;
}

/** "$25.60": fees always show cents. */
export function feeMoney(n: number): string {
  return "$" + n.toLocaleString(appLocale("en-US"), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "$320", "$37.50": pay and bases show cents only when there are some. */
export function payMoney(n: number): string {
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return "$" + n.toLocaleString(appLocale("en-US"), whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const basisText = (q: HiringFeeQuote) => (q.basis === "first_month_pay" ? "the first month's pay" : "the total pay for the slot");

/** "8% of": the rule's rate when known, else the share the server's own figures show. */
function rateOf(q: HiringFeeQuote, rate: number | null): string {
  if (rate != null) return ratePercent(rate);
  return q.base > 0 ? ratePercent(Math.round((q.percentAmount / q.base) * 10000) / 10000) : "";
}

/**
 * The confirmation's calculation line (B-MA.8.3): "8% of $320, the first
 * month's pay"; with the minimum: "8% of $240, the first month's pay, is
 * $19.20".
 */
export function feeCalcLine(q: HiringFeeQuote, rate: number | null): string {
  const head = `${rateOf(q, rate)} of ${payMoney(q.base)}, ${basisText(q)}`;
  return q.minimumApplied ? `${head}, is ${feeMoney(q.percentAmount)}` : head;
}

/** "The minimum for a role is $25." / "The minimum for a class slot is $3." (the quote's own floor). */
export function minimumSentence(q: Pick<HiringFeeQuote, "type" | "minimum">): string {
  return `The minimum for a ${q.type === "role" ? "role" : "class slot"} is ${floorMoney(q.minimum)}.`;
}

/** B-MA.8.5 rows: Base used, 8% of base, Minimum applied (my_hiring_fees' figures). */
export function feeRows(q: HiringFeeQuote, rate: number | null): [string, string][] {
  const basis = q.basis === "first_month_pay" ? "first month's pay" : "total pay for the slot";
  return [
    ["Base used", `${payMoney(q.base)} · ${basis}`],
    [`${rateOf(q, rate)} of base`, feeMoney(q.percentAmount)],
    ["Minimum applied", q.minimumApplied ? `Yes · ${floorMoney(q.minimum)}` : `No · minimum ${floorMoney(q.minimum)}`],
  ];
}

/** "$80 per class", "$900 a month", "$60 for the slot" (B-MA.8 cards). */
export function payText(pay: number, unit: PayUnit): string {
  const m = payMoney(pay);
  return unit === "per_class" ? `${m} per class` : unit === "per_month" ? `${m} a month` : `${m} for the slot`;
}
