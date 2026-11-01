import { appLocale } from "../../i18n/format";
import { t, tk, tn } from "../../i18n/core";
import { dayLabel, instant } from "../safety/model";
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
//
// Round F (AB1, Database 20261226030000): the referrer's points wait until the
// friend has finished onboarding and been active on 3 different days within
// 14 days of redeeming (Karim F18); at most 10 are rewarded a calendar month,
// the rest wait for a month with room. referral_summary() adds pending,
// pending_points, lapsed and pending_friends (first_name, redeemed_at,
// lapses_at, waiting_for onboarding | active_days | monthly_cap). A lapsed
// referral is silent: counted by the summary, shown nowhere.

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
  /** Round F (AB1): redemptions whose points wait, and how many. */
  pending?: number | null;
  pending_points?: number | null;
  /** Round F (AB1): not qualified within 14 days. Silent: read by nothing here. */
  lapsed?: number | null;
  /** Round F (AB1): one object per pending friend, oldest first. */
  pending_friends?: unknown;
}

/** Why a friend's points still wait (referral_summary pending_friends[].waiting_for). */
export type WaitingFor = "onboarding" | "active_days" | "monthly_cap";

export interface PendingFriend {
  firstName: string | null;
  redeemedAt: string | null;
  /** When it lapses if they don't qualify; null once qualified (waiting for a month with room). */
  lapsesAt: string | null;
  waitingFor: WaitingFor;
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
  /** Round F (AB1): friends whose points wait, and the points waiting. */
  pending: number;
  pendingPoints: number;
  pendingFriends: PendingFriend[];
}

const WAITING: readonly WaitingFor[] = ["onboarding", "active_days", "monthly_cap"];

/** pending_friends as sent (a jsonb array); an unknown waiting_for reads as active_days, the usual wait. */
export function toPendingFriends(value: unknown): PendingFriend[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const r = v as Record<string, unknown>;
    const s = (x: unknown) => (typeof x === "string" && x.trim() ? x : null);
    const w = WAITING.includes(r.waiting_for as WaitingFor) ? (r.waiting_for as WaitingFor) : "active_days";
    return [{ firstName: s(r.first_name), redeemedAt: s(r.redeemed_at), lapsesAt: s(r.lapses_at), waitingFor: w }];
  });
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
    pending: row?.pending ?? 0,
    pendingPoints: row?.pending_points ?? 0,
    pendingFriends: toPendingFriends(row?.pending_friends),
  };
}

/** The standard figure every account earned before B3, and still earns unless an ambassador. */
export const STANDARD_REFERRER_POINTS = 1500;

/**
 * The popup's "You" reward row (PLAN S4), from referral_summary's
 * referrer_points: "2,000 points per friend, once they're set up and active"
 * for an ambassador, "1,500 …" otherwise (Round F, AB1: the points wait for
 * the friend; REFERRAL_RULE_LINE says exactly when). POINTS ONLY (Karim, BR):
 * friend_discount_pct is never shown, since no bill applies it. Until the
 * summary answers (or when it names no figure) the standard 1,500.
 */
export function rewardLine(referrerPoints: number | null | undefined, colleague = false): string {
  const n = referrerPoints && referrerPoints > 0 ? referrerPoints : STANDARD_REFERRER_POINTS;
  const points = n.toLocaleString(appLocale("en-US"));
  return colleague
    ? t("{n} points per colleague or client, once they're set up and active", { n: points })
    : t("{n} points per friend, once they're set up and active", { n: points });
}

/** Round F (AB1): the rule under the reward row, as the Database built it (F18; 10 rewarded a month). */
export const REFERRAL_RULE_LINE = tk(
  "Points arrive once your friend has set up their account and used Centium on 3 different days within 14 days of joining. Up to 10 friends a month earn points."
);

/** Round F (AB1): a pending friend's two lines, "Rana · Pending until Nov 14" and why. */
export function pendingFriendLines(f: PendingFriend, now: Date = new Date()): { title: string; reason: string } {
  const name = f.firstName ?? t("A friend");
  const lapses = instant(f.lapsesAt);
  const title = lapses ? t("{name} · Pending until {date}", { name, date: dayLabel(lapses, now) }) : t("{name} · Pending", { name });
  const reason =
    f.waitingFor === "onboarding"
      ? t("Waiting for them to finish setting up their account.")
      : f.waitingFor === "monthly_cap"
        ? t("10 friends have earned you points this month. These points arrive next month.")
        : t("Waiting for them to use Centium on 3 different days.");
  return { title, reason };
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

/** MO1.10.1's row: "Code applied. Your friend gets 1,500 points once you've
 *  set up your account and used Centium on 3 different days." POINTS ONLY
 *  (Karim, BR, 2026-10-27): the row still carries referee_discount_pct, but no
 *  bill ever applied it (billing is in the app stores), so no discount is
 *  promised until one is. The points are the referrer's, so they are named as
 *  the friend's; since Round F (AB1) they are paid later, so nothing promises
 *  them now (points_awarded is still the referrer's figure). */
export function appliedLine(pointsAwarded = 0): string {
  return pointsAwarded > 0
    ? t("Code applied. Your friend gets {n} points once you've set up your account and used Centium on 3 different days.", { n: pointsAwarded.toLocaleString(appLocale("en-US")) })
    : tk("Code applied.");
}

/** MO1.10.2's refusal lines, chosen from `reason` (never from `message`).
 *  own_code and already_referred are the frame's own words; not_valid and
 *  already_used are not drawn on the board. */
export const REFUSAL_LINES: Record<Exclude<RedeemReason, "redeemed">, string> = {
  not_valid: tk("Code not found. Check it and try again."),
  already_used: tk("That code has already been used."),
  own_code: tk("You can't use your own code."),
  already_referred: tk("This code has already been used on your account."),
};

export const UNKNOWN_REFUSAL_LINE = tk("That code could not be applied. Try again.");

/**
 * DM: whether the typed code is the caller's own, compared the way the
 * server reads codes (upper(btrim(code))). preview_referral_code answers
 * not_valid for your own code on purpose (no lookup oracle), so without this
 * check MO1.10.2's tk("You can't use your own code.") was never shown. Checked
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

/** The line in the frame's progress-line slot: what the code has done so far,
 *  "3 friends joined · 2 pending · 1,500 points earned" (Round F, AB1; each
 *  later part only when it isn't zero). null when nobody has used it yet (the
 *  frame's own "N of 12 discount rewards" needs the D25 reward model, which
 *  this stage does not add). Lapsed referrals are not named. */
export function redemptionsLine(summary: Pick<ReferralSummary, "redemptions" | "pointsEarned"> & { pending?: number }): string | null {
  if (summary.redemptions <= 0) return null;
  const parts = [tn(summary.redemptions, "{n} friend joined", "{n} friends joined")];
  if (summary.pending && summary.pending > 0) parts.push(t("{n} pending", { n: summary.pending }));
  if (summary.pointsEarned > 0) parts.push(t("{points} points earned", { points: summary.pointsEarned.toLocaleString(appLocale("en-US")) }));
  return parts.join(" · ");
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
  not_valid: tk("That code isn't valid. Check it and try again."),
  already_referred: tk("This code has already been used on your account."),
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
  return t("{name} earns points when you join with their code.", { name: p.referrerFirstName });
}
