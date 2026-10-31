// Round F (AB2, AB3), pure: who may buy a voucher, and insiders refused on
// their own business's offers (Database
// 20261226040000_vouchers_need_an_established_account_and_insiders_are_refused).
// Tested in voucherRules.test.ts.
//
// - voucher_eligibility() → eligible, account_opens_at (30 days after the
//   account was created), points_days of points_days_needed (7 days with
//   points earned by using Centium), this_week of weekly_cap (3 in a rolling
//   7 days, a platform setting) and next_frees_at. The offer page reads it
//   before the tap and says why in place of Redeem, in redeem_offer's order:
//   account age, then points days, then the weekly cap.
// - redeem_offer refuses with the same facts in DETAIL: ATXV0 (when the
//   account opens, ISO), ATXV1 (the days so far), ATXV2 (when the next frees,
//   ISO), ATXV3 (the caller's own business's offer).
// - offer_catalogue / offer_detail flag is_own_business; the page shows the
//   own-business line instead of the button.
// - At the till, check_voucher answers 'own_voucher' and mark_voucher_used
//   raises ATXV4 for the caller's own voucher: OWN_VOUCHER_LINE.

import { t, tk, tn } from "../../i18n/core";
import { bool, num, rows, str } from "../market/parse";
import { dayLabel, instant, whenLabel } from "../safety/model";

export interface VoucherEligibility {
  eligible: boolean;
  accountOpensAt: string | null;
  pointsDays: number;
  pointsDaysNeeded: number;
  thisWeek: number;
  weeklyCap: number;
  nextFreesAt: string | null;
}

/** voucher_eligibility()'s one row, or null when it doesn't read (the server still decides at Redeem). */
export function parseVoucherEligibility(data: unknown): VoucherEligibility | null {
  const r = rows(data)[0];
  if (!r || typeof r.eligible !== "boolean") return null;
  return {
    eligible: bool(r.eligible),
    accountOpensAt: str(r.account_opens_at),
    pointsDays: num(r.points_days) ?? 0,
    pointsDaysNeeded: num(r.points_days_needed) ?? 7,
    thisWeek: num(r.this_week) ?? 0,
    weeklyCap: num(r.weekly_cap) ?? 3,
    nextFreesAt: str(r.next_frees_at),
  };
}

/** Under the reason: the points aren't lost meanwhile. */
export const POINTS_KEEP_COLLECTING = tk("Your points keep collecting in the meantime.");

/** offer_catalogue / offer_detail is_own_business, and ATXV3. */
export const OWN_BUSINESS_OFFER_LINE = tk("This is your business's offer. You can't redeem it.");

/** check_voucher 'own_voucher' and mark_voucher_used ATXV4, at the desk. */
export const OWN_VOUCHER_TITLE = tk("Your own voucher");
export const OWN_VOUCHER_LINE = tk("Ask a colleague to check this voucher.");

const accountLine = (opensAt: Date | null, now: Date): string =>
  opensAt
    ? t("New accounts can redeem rewards after 30 days. You can redeem from {date}.", { date: dayLabel(opensAt, now) })
    : t("New accounts can redeem rewards after 30 days.");

const pointsDaysLine = (days: number, needed: number): string =>
  t("You can redeem once you've earned points on {need} different days: {n} of {need} days with points so far.", { n: Math.max(0, days), need: needed });

const weeklyLine = (cap: number, frees: Date | null, now: Date): string =>
  frees && frees.getTime() > now.getTime()
    ? tn(cap, "You've redeemed {n} voucher in the last 7 days. The next one frees {when}.", "You've redeemed {n} vouchers in the last 7 days. The next one frees {when}.", { when: whenLabel(frees, now) })
    : tn(cap, "You've redeemed {n} voucher in the last 7 days. Try again in a few days.", "You've redeemed {n} vouchers in the last 7 days. Try again in a few days.");

/**
 * Why Redeem isn't offered yet, or null when the account may buy. The same
 * order as redeem_offer: account age, points days, the weekly cap.
 */
export function voucherGateLine(el: VoucherEligibility | null, now: Date = new Date()): string | null {
  if (!el || el.eligible) return null;
  const opens = instant(el.accountOpensAt);
  if (opens && opens.getTime() > now.getTime()) return accountLine(opens, now);
  if (el.pointsDays < el.pointsDaysNeeded) return pointsDaysLine(el.pointsDays, el.pointsDaysNeeded);
  if (el.thisWeek >= el.weeklyCap) return weeklyLine(el.weeklyCap, instant(el.nextFreesAt), now);
  return null;
}

/**
 * redeem_offer's F2 refusals (ATXV0–ATXV3) as sentences, from their DETAIL;
 * null for any other code. ATXV1's DETAIL is the days so far (7 needed);
 * ATXV2's carries no cap (a platform setting), so its sentence names none.
 */
export function voucherRefusalLine(e: { code?: string | null; details?: string | null } | null | undefined, now: Date = new Date()): string | null {
  switch (e?.code) {
    case "ATXV0":
      return accountLine(instant(e.details), now);
    case "ATXV1":
      return pointsDaysLine(num(e.details) ?? 0, 7);
    case "ATXV2": {
      const frees = instant(e.details);
      return frees && frees.getTime() > now.getTime()
        ? t("You've reached this week's voucher limit. The next one frees {when}.", { when: whenLabel(frees, now) })
        : t("You've reached this week's voucher limit. Try again in a few days.");
    }
    case "ATXV3":
      return t(OWN_BUSINESS_OFFER_LINE);
    default:
      return null;
  }
}
