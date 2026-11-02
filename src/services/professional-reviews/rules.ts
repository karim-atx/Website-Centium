// The parts of professional reviews that are rules rather than reads: limits,
// the 30-day edit window, what a rating shows as, and what a refusal says.
// Kept free of the Supabase client so they can be tested under node.
import { BLOCKED_TEXT } from "../moderation/text";
import { appLocale } from "../../i18n/format";
import { t, tk, tn } from "../../i18n/core";

/** professional_reviews_body_check: length(btrim(body)) between 1 and 4000. */
export const REVIEW_BODY_MAX = 4000;
/** professional_review_replies_body_check: between 1 and 2000. */
export const REPLY_BODY_MAX = 2000;
/** edit_my_professional_review refuses ATX71 once created_at is 30 days old. */
export const EDIT_WINDOW_DAYS = 30;
/** An average is shown only once this many reviews count towards it. */
export const MIN_REVIEWS_FOR_AVERAGE = 3;

export const EDIT_WINDOW_OVER = tk("Reviews can be edited for 30 days.");

/**
 * Characters as Postgres counts them. length() counts code points, so an
 * emoji is one; String.length would count it as two and refuse a review the
 * database would take.
 */
export function bodyLength(text: string): number {
  return Array.from(text.trim()).length;
}

/** "3,812 / 4,000". */
export function counterLabel(text: string, max: number): string {
  return `${bodyLength(text).toLocaleString(appLocale("en"))} / ${max.toLocaleString(appLocale("en"))}`;
}

export type RatingLabel = { kind: "new" } | { kind: "average"; value: string; count: number };

/**
 * What a listing shows for its rating. Under three reviews a single
 * unhappy (or glowing) one IS the average, so it reads "New" instead.
 */
export function ratingLabel(average: number | null, count: number): RatingLabel {
  if (average == null || count < MIN_REVIEWS_FOR_AVERAGE) return { kind: "new" };
  return { kind: "average", value: average.toFixed(1), count };
}

/** "12 reviews", "1 review". */
export function reviewCountLabel(count: number): string {
  return tn(count, "{n} review", "{n} reviews");
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Milliseconds left to edit a review created at `createdAt`; never negative. */
export function editMsLeft(createdAt: string, now: number): number {
  return Math.max(0, new Date(createdAt).getTime() + EDIT_WINDOW_DAYS * DAY - now);
}

/**
 * The time left to edit, as the line under the reviewer's own review:
 * "You can edit this for 12 more days." Null once the window has closed —
 * the caller then shows EDIT_WINDOW_OVER.
 */
export function editWindowLabel(createdAt: string, now: number): string | null {
  const ms = editMsLeft(createdAt, now);
  if (ms <= 0) return null;
  if (ms >= DAY) return tn(Math.floor(ms / DAY), "You can edit this for 1 more day.", "You can edit this for {n} more days.");
  if (ms >= HOUR) return tn(Math.floor(ms / HOUR), "You can edit this for 1 more hour.", "You can edit this for {n} more hours.");
  return t("You can edit this for less than an hour.");
}

/** my_reviewable_professionals().my_review_status. */
export type MyReviewStatus = "none" | "editable" | "final" | "withdrawn" | "removed";

export function asReviewStatus(s: string | null | undefined): MyReviewStatus {
  return s === "editable" || s === "final" || s === "withdrawn" || s === "removed" ? s : "none";
}

/**
 * Highest average first, then the most reviews. Listings still "New" follow
 * in their existing order: ranking them by one or two ratings would put a
 * single 5-star above a professional with forty 4.8s.
 */
export function sortByRating<T extends { averageRating: number | null; reviewCount: number }>(list: T[]): T[] {
  const rated = (l: T) => l.averageRating != null && l.reviewCount >= MIN_REVIEWS_FOR_AVERAGE;
  return list
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const ra = rated(a.l);
      const rb = rated(b.l);
      if (ra !== rb) return ra ? -1 : 1;
      if (ra && rb) {
        const d = (b.l.averageRating ?? 0) - (a.l.averageRating ?? 0);
        if (d !== 0) return d;
        if (b.l.reviewCount !== a.l.reviewCount) return b.l.reviewCount - a.l.reviewCount;
      }
      return a.i - b.i;
    })
    .map((x) => x.l);
}

export type ReviewReportReason =
  | "safety_concern"
  | "harmful_health_advice"
  | "harassment"
  | "inappropriate_content"
  | "impersonation"
  | "spam";

/**
 * The report_reason values, in the words the message report sheet uses, plus
 * the forum's health-advice reason — a review can carry advice as a post can.
 */
export const REVIEW_REPORT_REASONS: { value: ReviewReportReason; label: string; hint: string }[] = [
  { value: "safety_concern", label: tk("Safety concern"), hint: tk("Someone may be at risk of harm") },
  { value: "harmful_health_advice", label: tk("Harmful or unsafe health advice"), hint: tk("Advice that could hurt someone who follows it") },
  { value: "harassment", label: tk("Harassment"), hint: tk("Bullying, threats or personal attacks") },
  { value: "inappropriate_content", label: tk("Inappropriate content"), hint: tk("Sexual, violent or offensive material") },
  { value: "impersonation", label: tk("Impersonation"), hint: tk("Pretending to be someone else, or Centium") },
  { value: "spam", label: tk("Spam"), hint: tk("Advertising, scams or nothing to do with the professional") },
];

export type ReviewAction = "create" | "edit" | "withdraw" | "report" | "reply" | "editReply" | "removeReply";

/** A Postgres/PostgREST refusal, turned into a sentence for the action that hit it. */
export function describeReviewError(error: { code?: string; message?: string }, action: ReviewAction): string {
  const code = error.code ?? "";
  const msg = error.message ?? "";
  const isReply = action === "reply" || action === "editReply" || action === "removeReply";
  switch (code) {
    // Round C Release 2: the word lists (reviews and replies alike).
    case "ATX60":
      return BLOCKED_TEXT;
    case "ATX02":
      switch (action) {
        case "edit":
          return t("You've reached the limit of 20 review edits a day. Try again tomorrow.");
        case "report":
          return t("You've reached the limit of 10 reports a day. Try again tomorrow.");
        case "reply":
        case "editReply":
        case "removeReply":
          return t("You've reached the limit of 30 replies a day. Try again tomorrow.");
        default:
          return t("That's too many in a short time. Try again later.");
      }
    case "ATX71":
      return t(EDIT_WINDOW_OVER);
    case "ATX10":
      return isReply
        ? t("A moderator removed your reply, so it can't be changed.")
        : t("A moderator removed this review, so it can't be edited.");
    case "ATX72":
      if (action === "reply" || action === "report") return t("This review isn't shown any more.");
      return isReply ? t("You've already removed this reply.") : t("You've withdrawn this review.");
    case "ATX73":
      return t("You've already replied to this review. Edit your reply instead.");
    case "ATX08":
      return t("That review isn't available any more.");
    case "ATX09":
      return t("Your session expired. Sign in again.");
    case "42501":
      return t("You can only review a professional you've worked with.");
    case "23505":
      return t("You've already reviewed this professional.");
    case "22023":
      if (/empty/i.test(msg)) return t("Write a reply first.");
      break;
    case "23514":
      if (/body/i.test(msg)) {
        return isReply
          ? t("A reply can be up to {max} characters.", { max: REPLY_BODY_MAX.toLocaleString(appLocale("en")) })
          : t("A review can be up to {max} characters.", { max: REVIEW_BODY_MAX.toLocaleString(appLocale("en")) });
      }
      return t("A review needs a rating from 1 to 5.");
  }
  if (/jwt|not authenticated/i.test(msg)) return t("Your session expired. Sign in again.");
  switch (action) {
    case "withdraw":
      return t("Couldn't withdraw your review. Try again.");
    case "report":
      return t("Couldn't send the report. Try again.");
    case "reply":
    case "editReply":
      return t("Couldn't save your reply. Try again.");
    case "removeReply":
      return t("Couldn't remove your reply. Try again.");
    default:
      return t("Couldn't save your review. Try again.");
  }
}

/**
 * The star breakdown for MO1.2.1.1's summary card (B9), counted from the rows
 * the reader already has. Redacted reviews are left out, as the aggregate
 * leaves them out; withdrawn ones never reach a reader. Index 0 is one star.
 */
export function ratingDistribution(rows: { rating: number; redactedAt: string | null }[]): number[] {
  const out = [0, 0, 0, 0, 0];
  for (const r of rows) {
    if (r.redactedAt) continue;
    const i = Math.round(r.rating) - 1;
    if (i >= 0 && i < 5) out[i] += 1;
  }
  return out;
}
