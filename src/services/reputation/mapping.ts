import type {
  BizReview,
  FlagKind,
  InstructorRating,
  MyReport,
  ReviewMetrics,
} from "./types";

// B14 (Reputation) rows → app shapes. Pure: no Supabase, so node:test runs it.
// Every column is read defensively (the generated types predate B14; the
// service casts at its boundary and this file is where the shape is checked).

type Row = Record<string, unknown>;

const s = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const n = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};

/** business_reviews_page → BizReview. `venues` names the business's own gyms. */
export function mapBizReview(r: Row, venues: Map<string, string>): BizReview {
  const id = String(r.review_id);
  const gymId = s(r.gym_id);
  const redacted = r.redacted === true;
  const replyAt = s(r.reply_at);
  const replyRedacted = r.reply_redacted === true;
  return {
    id,
    gymId,
    gymName: gymId ? (venues.get(gymId) ?? null) : null,
    rating: redacted ? null : n(r.rating),
    body: redacted ? null : typeof r.body === "string" ? r.body : null,
    label:
      s(r.reviewer_label) ??
      "Member #" + id.replace(/-/g, "").slice(0, 4).toUpperCase(),
    createdAt: String(r.created_at),
    editedAt: s(r.edited_at),
    redacted,
    classTitle: s(r.class_title),
    instructor: s(r.instructor_first_name),
    // A reply exists when it has a time: the body is null once Centium removed it.
    reply: replyAt
      ? {
          body: replyRedacted ? null : typeof r.reply_body === "string" ? r.reply_body : null,
          at: replyAt,
          redacted: replyRedacted,
        }
      : null,
    flagged: r.flagged === true,
    instructorId: s(r.instructor_id),
    flagKind: r.flagged === true ? flagKindOf(r.flag_kind) : null,
    handledAt: s(r.handled_at),
  };
}

const FLAG_KINDS: FlagKind[] = ["keyword", "injury", "not_about_this_business", "shares_private_information", "harassment", "spam", "other"];
/** flag_kind, or null when absent or unknown. */
export const flagKindOf = (v: unknown): FlagKind | null => (FLAG_KINDS.includes(v as FlagKind) ? (v as FlagKind) : null);

/** business_review_metrics → ReviewMetrics (distribution jsonb keyed "1".."5"). */
export function mapMetrics(r: Row | null | undefined): ReviewMetrics {
  const d = (r?.distribution ?? {}) as Record<string, unknown>;
  const at = (k: number) => n(d[String(k)]) ?? 0;
  return {
    reviews: n(r?.reviews) ?? 0,
    average: n(r?.average),
    previousAverage: n(r?.previous_average),
    previousReviews: n(r?.previous_reviews) ?? 0,
    distribution: [at(5), at(4), at(3), at(2), at(1)],
    replyRate: n(r?.reply_rate),
    averageHoursToReply: n(r?.average_hours_to_reply),
    flagged: n(r?.flagged) ?? 0,
  };
}

/** instructor_ratings → InstructorRating. */
export function mapInstructorRating(r: Row): InstructorRating {
  return {
    professionalId: String(r.professional_id),
    firstName: s(r.first_name) ?? "",
    reviews: n(r.reviews) ?? 0,
    average: n(r.average),
  };
}

const STATUSES: MyReport["status"][] = ["open", "upheld", "dismissed"];

/** gym_review_reports (own rows only, RLS) → MyReport. */
export function mapMyReport(r: Row): MyReport {
  const st = String(r.status) as MyReport["status"];
  return {
    reviewId: String(r.review_id),
    reportedAt: String(r.created_at),
    status: STATUSES.includes(st) ? st : "open",
  };
}

/** In the business's "Flagged for you" queue: flagged and not marked handled (business_reviews_page p_flagged_only). */
export const inFlagQueue = (r: Pick<BizReview, "flagged" | "redacted" | "handledAt">): boolean => r.flagged && !r.redacted && !r.handledAt;

/** The reasons report_review takes (review_report_reason), in the sheet's order. */
export const REPORT_REASONS: { key: string; label: string }[] = [
  // B14 follow-up: injury is a report_review reason; flagged with it, the
  // business sees AN13's injury wording (reputation/parts.tsx INJURY_LINE).
  { key: "injury", label: "Mentions an injury" },
  { key: "harassment", label: "Harassment" },
  { key: "spam", label: "Spam" },
  { key: "not_about_this_business", label: "Not about this business" },
  { key: "shares_private_information", label: "Shares private information" },
  { key: "other", label: "Something else" },
];

/** report_review's note limit (gym_review_reports_note). */
export const REPORT_NOTE_MAX = 300;

/** B14 refusals, in the words a page shows (null = the page's own fallback). */
export function reputationError(code: string | undefined): string | null {
  if (code === "ATXF9") return "This review already has a reply. Edit it instead.";
  if (code === "ATXG0") return "You've already reported this review.";
  if (code === "ATX10") return "Centium removed this, so it can't be changed.";
  if (code === "ATX03") return "You don't have permission to do this.";
  return null;
}
