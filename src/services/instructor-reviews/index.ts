// Market + Share 3.0 · W5 · instructor reviews (C-MO.4.5 review popup; D-43).
//
// Database stages DB4 (my_bookings) and DB10 (review_instructor) have NOT
// landed (checked 2026-10-22: no Release 2 branch in ../Database; neither
// function on the local stack). The calls follow PLAN §2.2 DB4 / DB10 and
// api.md "Reviews and work history"; PostgREST answers PGRST202 meanwhile,
// which is `pending`: My bookings shows no Review stub, the calendar's Rate
// keeps the live write_class_review sheet, and a send that comes back
// pending changes nothing (a calm note in the dialog).

import { marketRpc, marketRpcRaw, isPendingError, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { findPast, parsePastBookings, REVIEW_ERROR_TEXT, reviewErrorOf, targetOf, type PastBooking, type ReviewError, type ReviewTarget } from "./model";

export * from "./model";

/** my_bookings(p_tab 'past'): the member's past bookings with `reviewable` / `reviewed` (DB4). */
export function fetchPastBookings(): Promise<MarketResult<PastBooking[]>> {
  // awaiting DB stage DB4
  return marketRpc("my_bookings", { p_tab: "past" }, "Couldn't load your bookings.", parsePastBookings);
}

/**
 * The calendar's Rate (D-43): the instructor review target for this booking
 * when the class had a Team instructor and the server says it is reviewable;
 * null otherwise (including while DB4 is pending), and the live Rate flow
 * opens instead.
 */
export async function findReviewTarget(bookingId: string, sessionId?: string | null): Promise<ReviewTarget | null> {
  const r = await fetchPastBookings();
  if (!r.ok) return null;
  const b = findPast(r.value, bookingId, sessionId);
  return b ? targetOf(b) : null;
}

export type ReviewWrite = { ok: true } | { ok: false; pending?: boolean; offline?: boolean; error?: ReviewError; message: string };

const FALLBACK = "Couldn't send your review. Try again.";

/** review_instructor ⟳ (idempotent by p_request_id). Errors: not_attended, already_reviewed. */
export async function reviewInstructor(sessionId: string, rating: number, text: string | null, requestId: string): Promise<ReviewWrite> {
  // awaiting DB stage DB10
  const res = await marketRpcRaw("review_instructor", { p_session_id: sessionId, p_rating: rating, p_text: text, p_request_id: requestId });
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: FALLBACK };
  if (res.error) {
    if (isPendingError(res.error)) return { ok: false, pending: true, message: "Instructor reviews are coming soon. Nothing was sent." };
    if (isOffline(res.error)) return { ok: false, offline: true, message: "You're offline. Your review wasn't sent." };
    const k = reviewErrorOf(res.error);
    if (k) return { ok: false, error: k, message: REVIEW_ERROR_TEXT[k] };
    console.error("[instructor-reviews] review_instructor:", res.error.message);
    return { ok: false, message: FALLBACK };
  }
  return { ok: true };
}
