// Market + Share 3.0 · W4 · the one-time hiring fee, mirrored for DISPLAY only.
//
// HANDOVER §9 "Hiring fee" and types.ts `quoteHiringFee`: Role fee =
// max(8% × base, $25); Class slot fee = max(8% × base, $3). Base = the first
// month's agreed pay for a role (pay per class × classes a month, or the
// monthly pay) or the total agreed pay for a class slot. Rounded to the cent.
// `minimumApplied` only when the minimum is STRICTLY higher than 8% (a $37.50
// slot: 8% = $3.00 = the minimum, not flagged).
//
// The server decides (`quote_hiring_fee`, `accept_hire_offer` recompute it,
// PLAN §2.2 DB8). The screens show this mirror while composing an offer and
// the server's quote once it answers; the two must agree (fee.test.ts runs
// every §14 example).

export type OpeningType = "role" | "class_slot";
export type PayUnit = "per_class" | "per_month" | "per_slot";

export const HIRING_FEE = { rate: 0.08, minimum: { role: 25, class_slot: 3 } } as const;

/** The board's footer notice on the opening form and the direct-offer sheet. */
export const FEE_NOTICE = "One-time 8% hiring fee (min. $25 per role, $3 per class slot) when you hire";

export interface HiringFeeQuote {
  type: OpeningType;
  base: number;
  basis: "first_month_pay" | "slot_total_pay";
  percentAmount: number;
  minimum: number;
  fee: number;
  minimumApplied: boolean;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** The fee for a base (USD). */
export function quoteHiringFee(type: OpeningType, base: number): HiringFeeQuote {
  const b = cents(Math.max(0, base));
  const pct = cents(b * HIRING_FEE.rate);
  const min = HIRING_FEE.minimum[type];
  return {
    type,
    base: b,
    basis: type === "role" ? "first_month_pay" : "slot_total_pay",
    percentAmount: pct,
    minimum: min,
    fee: Math.max(pct, min),
    minimumApplied: min > pct,
  };
}

/**
 * The base for an offer: a role's first month's pay (per class × classes a
 * month, or the monthly pay); a class slot's total pay. null while the pay
 * (or, per class, the count) isn't filled in yet.
 */
export function feeBase(type: OpeningType, pay: number | null, unit: PayUnit, classesPerMonth: number | null): number | null {
  if (pay == null || !Number.isFinite(pay) || pay <= 0) return null;
  if (type === "class_slot") return cents(pay);
  if (unit === "per_month") return cents(pay);
  if (classesPerMonth == null || !Number.isFinite(classesPerMonth) || classesPerMonth <= 0) return null;
  return cents(pay * classesPerMonth);
}

/** "$25.60": fees always show cents. */
export function feeMoney(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "$320", "$37.50": pay and bases show cents only when there are some. */
export function payMoney(n: number): string {
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return "$" + n.toLocaleString("en-US", whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const basisText = (q: HiringFeeQuote) => (q.basis === "first_month_pay" ? "the first month's pay" : "the total pay for the slot");

/**
 * The confirmation's calculation line (B-MA.8.3): "8% of $320, the first
 * month's pay"; with the minimum: "8% of $240, the first month's pay, is
 * $19.20".
 */
export function feeCalcLine(q: HiringFeeQuote): string {
  const head = `8% of ${payMoney(q.base)}, ${basisText(q)}`;
  return q.minimumApplied ? `${head}, is ${feeMoney(q.percentAmount)}` : head;
}

/** "The minimum for a role is $25." / "The minimum for a class slot is $3." */
export function minimumSentence(type: OpeningType): string {
  return `The minimum for a ${type === "role" ? "role" : "class slot"} is $${HIRING_FEE.minimum[type]}.`;
}

/** B-MA.8.5 rows: Base used, 8% of base, Minimum applied. */
export function feeRows(q: HiringFeeQuote): [string, string][] {
  const basis = q.basis === "first_month_pay" ? "first month's pay" : "total pay for the slot";
  return [
    ["Base used", `${payMoney(q.base)} · ${basis}`],
    ["8% of base", feeMoney(q.percentAmount)],
    ["Minimum applied", q.minimumApplied ? `Yes · $${q.minimum}` : `No · minimum $${q.minimum}`],
  ];
}

/** "$80 per class", "$900 a month", "$60 for the slot" (B-MA.8 cards). */
export function payText(pay: number, unit: PayUnit): string {
  const m = payMoney(pay);
  return unit === "per_class" ? `${m} per class` : unit === "per_month" ? `${m} a month` : `${m} for the slot`;
}
