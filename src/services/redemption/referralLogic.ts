// A6 Referrals: the pure parts, tested without a database
// (referralLogic.test.ts). The I/O lives in ./index.ts.
//
// Contract: "Stage A6 · Referrals (the Referrals screen)" in
// ../Database/docs/HANDOVER_API.md, migration
// 20261104000000_permanent_referral_codes.sql.
//
// A code is an ACCOUNT now (referral_codes, one permanent row each, no
// expiry) and a referrals row is only the redemption record, "X referred Y".
// Nothing here reads referrals.code or referrals.expires_at: both are being
// retired (phase two drops them once every app has stopped reading them).

/** One row of referral_summary(). Always exactly one, nulls and zeroes for an
 *  account that has done nothing. */
export interface ReferralSummaryRow {
  code: string | null;
  code_created_at: string | null;
  redemptions: number | null;
  points_earned: number | null;
  last_redeemed_at: string | null;
  i_was_referred: boolean | null;
  my_discount_pct: number | string | null;
}

export interface ReferralSummary {
  /** NULL until my_referral_code() has minted one: the summary creates nothing. */
  code: string | null;
  redemptions: number;
  pointsEarned: number;
  lastRedeemedAt: string | null;
  iWasReferred: boolean;
  /** The discount this account got for being referred, if it was. */
  myDiscountPct: number | null;
}

/** numeric arrives from PostgREST as a number or a string; either way, or null. */
export function toPct(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A whole-number percentage reads "10", a fractional one keeps its places. */
export function pctLabel(pct: number): string {
  return Number.isInteger(pct) ? String(pct) : String(Number(pct.toFixed(2)));
}

export function toReferralSummary(row: ReferralSummaryRow | null | undefined): ReferralSummary {
  return {
    code: row?.code || null,
    redemptions: row?.redemptions ?? 0,
    pointsEarned: row?.points_earned ?? 0,
    lastRedeemedAt: row?.last_redeemed_at ?? null,
    iWasReferred: row?.i_was_referred === true,
    myDiscountPct: toPct(row?.my_discount_pct),
  };
}

/** redeem_referral_code()'s stable machine strings. */
export type RedeemReason = "redeemed" | "not_valid" | "already_used" | "own_code" | "already_referred";

/** The referral_redeem_result composite. */
export interface RedeemReferralRow {
  ok: boolean | null;
  reason: string | null;
  /** A readable fallback, NOT a contract: never shown. */
  message: string | null;
  referral_id: string | null;
  referee_discount_pct: number | string | null;
  referrer_discount_pct: number | string | null;
  points_awarded: number | null;
}

export type RedeemReferralOutcome =
  | { status: "redeemed"; line: string; discountPct: number | null; pointsAwarded: number }
  | { status: "refused"; reason: RedeemReason | "unknown"; line: string };

/** "Code applied. 10% off your subscription." — MO1.10.1's row. The frame's
 *  "first payment" wording waits on the D25 reward model; the discount today
 *  is on the subscription. The points are the referrer's, so they are named
 *  as the friend's. */
export function appliedLine(discountPct: number | null, pointsAwarded = 0): string {
  const points = pointsAwarded > 0 ? `${pointsAwarded.toLocaleString("en-US")} points for your friend` : "";
  if (discountPct && discountPct > 0) {
    return `Code applied. ${pctLabel(discountPct)}% off your subscription${points ? `, and ${points}` : ""}.`;
  }
  return points ? `Code applied. ${points[0].toUpperCase()}${points.slice(1)}.` : "Code applied.";
}

/** MO1.10.2's refusal lines, chosen from `reason` (never from `message`).
 *  own_code and already_referred are the frame's own words; not_valid and
 *  already_used are not drawn on the board. */
export const REFUSAL_LINES: Record<Exclude<RedeemReason, "redeemed">, string> = {
  not_valid: "Code not found. Check it and try again.",
  already_used: "That code has already been used.",
  own_code: "You can't use your own code.",
  already_referred: "This code has already been used on your account.",
};

export const UNKNOWN_REFUSAL_LINE = "That code could not be applied. Try again.";

/** Words a redeem_referral_code() row. A refusal is an ordinary outcome, not
 *  an error. `ok` and `reason` must agree before anything reads as applied. */
export function interpretRedeemReferral(row: RedeemReferralRow | null | undefined): RedeemReferralOutcome {
  const reason = row?.reason ?? null;
  if (row?.ok === true && reason === "redeemed") {
    const discountPct = toPct(row.referee_discount_pct);
    const pointsAwarded = row.points_awarded ?? 0;
    return { status: "redeemed", line: appliedLine(discountPct, pointsAwarded), discountPct, pointsAwarded };
  }
  if (reason && reason !== "redeemed" && Object.prototype.hasOwnProperty.call(REFUSAL_LINES, reason)) {
    const known = reason as Exclude<RedeemReason, "redeemed">;
    return { status: "refused", reason: known, line: REFUSAL_LINES[known] };
  }
  return { status: "refused", reason: "unknown", line: UNKNOWN_REFUSAL_LINE };
}

/** The line in the frame's progress-line slot: what the code has done so far.
 *  null when nobody has used it yet (the frame's own "N of 12 discount rewards"
 *  needs the D25 reward model, which this stage does not add). */
export function redemptionsLine(summary: Pick<ReferralSummary, "redemptions" | "pointsEarned">): string | null {
  if (summary.redemptions <= 0) return null;
  const friends = summary.redemptions === 1 ? "1 friend joined" : `${summary.redemptions} friends joined`;
  const points = summary.pointsEarned > 0 ? ` · ${summary.pointsEarned.toLocaleString("en-US")} points earned` : "";
  return `${friends} with your code${points}`;
}
