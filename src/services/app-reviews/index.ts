import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

// Leaving a review. One direction only, exactly like bug-reports.
//
// THERE IS NO READ FUNCTION HERE AND THERE SHOULD NOT BE. `app_reviews` grants
// the client INSERT and nothing else, and has no SELECT policy, so a fetch
// would come back as an empty list rather than an error — a "your reviews"
// screen that silently shows none. Reviews are read with service_role.
//
// NOTHING IS NOTIFIED BY THIS, and the sheet's copy is written to match. No
// mail provider, queue or webhook exists in this project, so a submitted
// review waits until someone queries the table.

export interface ReviewResult {
  ok: boolean;
  message?: string;
}

/** Matches the CHECK on the column, so the UI can refuse before the round trip. */
export const MAX_REVIEW_TEXT = 4000;

/**
 * Trimmed to at most `max` characters, or null when there is nothing to store.
 *
 * Route and user agent are captured rather than typed, so they are the two
 * values a reviewer never sees and never approves. Truncating rather than
 * rejecting is right for them: a long user agent is a verbose browser, not an
 * error, and failing someone's review over it would be absurd.
 */
function clamp(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to send this review.";
  }
  // 23514 covers both CHECKs on this table — the rating range and the text
  // length. The UI refuses an unrated review and an over-long one before this
  // point, so reaching it means the client and the column drifted apart.
  if (code === "23514") {
    return "That review couldn't be sent — check the rating and length, then try again.";
  }
  return "That review couldn't be sent. Check your connection and try again.";
}

/**
 * Submits one review.
 *
 * THE RATING IS REQUIRED AND THE TEXT IS NOT, which is the one place this
 * differs from a bug report. A report with no words is not a report; a review
 * with no words is five stars, and demanding a sentence to accept it is how a
 * product collects people typing "good" to get past the form.
 *
 * EMPTY TEXT BECOMES NULL RATHER THAN "". The column CHECK rejects
 * whitespace-only precisely so there is one representation of "said nothing",
 * and normalising here means the constraint never has to fire for a case the
 * client could have handled.
 */
export async function submitReview(params: {
  userId: string;
  rating: number;
  reviewText: string;
  route: string | null;
  userAgent: string | null;
}): Promise<ReviewResult> {
  const rating = Math.round(params.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Choose a rating from one to five stars." };
  }

  const text = params.reviewText.trim();
  if (text.length > MAX_REVIEW_TEXT) {
    return { ok: false, message: "That review is too long — please shorten it." };
  }

  const { error } = await supabase.from("app_reviews").insert({
    user_id: params.userId,
    rating,
    review_text: text || null,
    route: clamp(params.route),
    user_agent: clamp(params.userAgent),
  });

  if (error) {
    console.error("[app-reviews] Could not submit review:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
