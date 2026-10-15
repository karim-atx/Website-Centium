// Pure types (no runtime imports), so node tests and pure models can use them without pulling the Supabase client into the test project.

/** The business's public reply to a review (B14 RP-02, one per review). */
export interface BizReply {
  /** Null when Centium removed the reply (reply_redacted). */
  body: string | null;
  at: string;
  redacted: boolean;
}

/** business_reviews_page.flag_kind (B14 follow-up). */
export type FlagKind = "keyword" | "injury" | "not_about_this_business" | "shares_private_information" | "harassment" | "spam" | "other";

/** One row of business_reviews_page (B14). */
export interface BizReview {
  id: string;
  /** Null for a business with no venue (RP-01). */
  gymId: string | null;
  /** The venue's name, from the business's own gyms; null with no venue. */
  gymName: string | null;
  /** Null when redacted. */
  rating: number | null;
  body: string | null;
  /** "Member #" + 4 characters of the review id (Q-35): never the person. */
  label: string;
  createdAt: string;
  editedAt: string | null;
  redacted: boolean;
  /** The class the review was written from (write_class_review), if any. */
  classTitle: string | null;
  /** That class's instructor's first name, if any. */
  instructor: string | null;
  /** B14 follow-up: the tagged instructor's professional id (match ratings by this, never by name). */
  instructorId?: string | null;
  /** B14 follow-up: why it's flagged (the first report's reason, or keyword); null when not flagged. */
  flagKind?: FlagKind | null;
  reply: BizReply | null;
  /** Reported, or caught by the blocked-terms list (RP-03). */
  flagged: boolean;
}

/** business_review_metrics (B14) for one period. */
export interface ReviewMetrics {
  reviews: number;
  average: number | null;
  previousAverage: number | null;
  previousReviews: number;
  /** Counts for 5, 4, 3, 2, 1 stars. */
  distribution: [number, number, number, number, number];
  /** Percent of the period's reviews with a reply; null with no reviews. */
  replyRate: number | null;
  averageHoursToReply: number | null;
  flagged: number;
}

/** instructor_ratings (B14 RP-04): one instructor's tagged reviews. */
export interface InstructorRating {
  professionalId: string;
  firstName: string;
  reviews: number;
  average: number | null;
}

/** One of this account's own review reports (gym_review_reports, select-own). */
export interface MyReport {
  reviewId: string;
  reportedAt: string;
  status: "open" | "upheld" | "dismissed";
}
