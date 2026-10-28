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
  /** B3 (Database 20261217050000): is_ambassador(auth.uid()). */
  is_ambassador?: boolean | null;
  /** B3: what the caller earns per friend now (2,000 ambassador, 1,500 otherwise). */
  referrer_points?: number | null;
  /** B3: what a friend gets. Read by nothing here: points only (BR). */
  friend_discount_pct?: number | string | null;
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
  /** B3: the caller holds Centium Ambassador status (the Rewards chip, PLAN S4). */
  isAmbassador: boolean;
  /** B3: points per friend who joins, from the server; null when it named none. */
  referrerPoints: number | null;
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
    isAmbassador: row?.is_ambassador === true,
    referrerPoints: typeof row?.referrer_points === "number" && row.referrer_points > 0 ? row.referrer_points : null,
  };
}

/** The standard figure every account earned before B3, and still earns unless an ambassador. */
export const STANDARD_REFERRER_POINTS = 1500;

/**
 * The popup's "You" reward row (PLAN S4), from referral_summary's
 * referrer_points: "2,000 points per friend who joins" for an ambassador,
 * "1,500 …" otherwise. POINTS ONLY (Karim, BR): friend_discount_pct is never
 * shown, since no bill applies it. Until the summary answers (or when it names
 * no figure) the standard 1,500.
 */
export function rewardLine(referrerPoints: number | null | undefined, colleague = false): string {
  const n = referrerPoints && referrerPoints > 0 ? referrerPoints : STANDARD_REFERRER_POINTS;
  return `${n.toLocaleString("en-US")} points per ${colleague ? "colleague or client" : "friend"} who joins`;
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

/** MO1.10.1's row: "Code applied. 1,500 points for your friend." POINTS ONLY
 *  (Karim, BR, 2026-10-27): the row still carries referee_discount_pct, but no
 *  bill ever applied it (billing is in the app stores), so no discount is
 *  promised until one is. The points are the referrer's, so they are named as
 *  the friend's. */
export function appliedLine(pointsAwarded = 0): string {
  return pointsAwarded > 0 ? `Code applied. ${pointsAwarded.toLocaleString("en-US")} points for your friend.` : "Code applied.";
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

/**
 * DM: whether the typed code is the caller's own, compared the way the
 * server reads codes (upper(btrim(code))). preview_referral_code answers
 * not_valid for your own code on purpose (no lookup oracle), so without this
 * check MO1.10.2's "You can't use your own code." was never shown. Checked
 * before the preview, so it spends no rate-limit attempt.
 */
export function isOwnReferralCode(draft: string, myCode: string | null | undefined): boolean {
  if (!myCode) return false;
  const norm = (s: string) => s.trim().toUpperCase();
  return norm(draft) !== "" && norm(draft) === norm(myCode);
}

/** Words a redeem_referral_code() row. A refusal is an ordinary outcome, not
 *  an error. `ok` and `reason` must agree before anything reads as applied. */
export function interpretRedeemReferral(row: RedeemReferralRow | null | undefined): RedeemReferralOutcome {
  const reason = row?.reason ?? null;
  if (row?.ok === true && reason === "redeemed") {
    const discountPct = toPct(row.referee_discount_pct);
    const pointsAwarded = row.points_awarded ?? 0;
    return { status: "redeemed", line: appliedLine(pointsAwarded), discountPct, pointsAwarded };
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

/**
 * preview_referral_code() (A6 follow-up): the "{name} invited you" confirm
 * before anything is redeemed. Its reasons are its own and are NOT mapped onto
 * redeem's: not_valid covers an unknown, own, used, expired or blank code
 * alike (one answer, so the preview cannot be used to probe codes).
 */
export type PreviewReason = "found" | "not_valid" | "already_referred";

export interface PreviewReferralRow {
  ok: boolean | null;
  reason: string | null;
  referrer_first_name: string | null;
  referee_discount_pct: number | string | null;
  referrer_discount_pct: number | string | null;
}

export type PreviewReferralOutcome =
  | { status: "found"; referrerFirstName: string; refereeDiscountPct: number | null; referrerDiscountPct: number | null }
  | { status: "refused"; reason: Exclude<PreviewReason, "found"> | "unknown"; line: string };

export const PREVIEW_REFUSAL_LINES: Record<Exclude<PreviewReason, "found">, string> = {
  not_valid: "That code isn't valid. Check it and try again.",
  already_referred: "This code has already been used on your account.",
};

export function interpretPreviewReferral(row: PreviewReferralRow | null | undefined): PreviewReferralOutcome {
  const reason = row?.reason ?? null;
  if (row?.ok === true && reason === "found" && row.referrer_first_name) {
    return {
      status: "found",
      referrerFirstName: row.referrer_first_name,
      refereeDiscountPct: toPct(row.referee_discount_pct),
      referrerDiscountPct: toPct(row.referrer_discount_pct),
    };
  }
  if (reason === "not_valid" || reason === "already_referred") {
    return { status: "refused", reason, line: PREVIEW_REFUSAL_LINES[reason] };
  }
  return { status: "refused", reason: "unknown", line: UNKNOWN_REFUSAL_LINE };
}

/** The confirm row's second line. Points only (BR): the previewed discount
 *  rates are never promised, since no bill applies them. */
export function previewOfferLine(p: { referrerFirstName: string }): string {
  return `${p.referrerFirstName} earns points when you join with their code.`;
}
