// Reporting an offer (the Database follow-up 20261212000000): the rules
// report_offer(p_offer_id uuid, p_reason report_reason, p_note text) holds,
// kept free of the Supabase client so node:test checks them.
// - members only (granted to authenticated; ATX01 signed out);
// - once per person per offer: a repeat returns null and changes nothing
//   (offer_reports_one_per_reporter); a member reads their own report back
//   (offer_reports_select_own);
// - the note is optional, at most 300 characters (22023 over that);
// - ATX08 the offer is gone or hidden; 22023 the owner (or the owning
//   business's marketing staff) reporting their own; ATX02 the review-report
//   allowance (10 an hour, shared with review reports).

import { REVIEW_REPORT_REASONS, type ReviewReportReason } from "../professional-reviews/rules";

/** offer_reports_note_check. */
export const OFFER_REPORT_NOTE_MAX = 300;

export type OfferReportReason = ReviewReportReason;

/**
 * The report_reason values in the words the app's other report sheets use;
 * the two hints that named a person or a review say "offer" instead.
 */
export const OFFER_REPORT_REASONS: { value: OfferReportReason; label: string; hint: string }[] = REVIEW_REPORT_REASONS.map((r) =>
  r.value === "spam"
    ? { ...r, hint: "A scam, misleading, or not a real offer" }
    : r.value === "harmful_health_advice"
      ? { ...r, hint: "A product or claim that could hurt someone" }
      : r.value === "impersonation"
        ? { ...r, hint: "Pretending to be another business, or Centium" }
        : r,
);

/** The note as report_offer stores it: trimmed, empty → null, at most 300 characters. */
export function offerReportNote(text: string): string | null {
  const t = Array.from(text.trim()).slice(0, OFFER_REPORT_NOTE_MAX).join("");
  return t ? t : null;
}

/** A report_offer refusal, in the sheet's words. */
export function offerReportError(e: { code?: string | null; message?: string | null }): string {
  const msg = e.message ?? "";
  switch (e.code) {
    case "ATX01":
      return "Sign in to report this offer.";
    case "ATX08":
      return "This offer isn't available any more, so it can't be reported.";
    case "ATX02":
      return "You've sent a lot of reports in the last hour. Try again later.";
    case "22023":
      if (/own offer/i.test(msg)) return "You can't report your own offer.";
      if (/300/.test(msg)) return "Keep the note under 300 characters.";
      return "Couldn't send the report. Try again.";
    default:
      return "Couldn't send the report. Try again.";
  }
}
