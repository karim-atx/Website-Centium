// Market + Share 3.0 · W5 · instructor reviews (C-MO.4.5 review popup; D-43).
//
// DB4 has landed (Database 20261211100000, HANDOVER_API Release 1 "Bookings
// (DB4)"): my_class_bookings(p_tab, p_limit) is the past list's reader, with
// `can_review` and the caller's own `my_rating`. The write is Database
// Release 2's review_instructor(p_class_id, p_rating, p_body): one review per
// member per class series (D-43); a second one EDITS the first.

import { supabase } from "../../../lib/supabase/client";
import { marketRpc, marketRpcRaw, isPendingError, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { t, tk } from "../../i18n/core";
import { reviewRefusalLine } from "../safety/model";
import { findPast, isOver, parseClassBookings, REVIEW_ERROR_TEXT, reviewErrorOf, targetOf, type PastBooking, type ReviewError, type ReviewTarget } from "./model";
import { contactRefusal } from "../moderation/text";

export * from "./model";

/** my_class_bookings clamps p_limit to 1..200. */
const PAST_LIMIT = 200;

/**
 * my_class_bookings(p_tab 'past', 200): the member's class bookings that have
 * started, newest first, with the venue's name filled from `gyms` (public for
 * a listed business, as the composed rows read it; the business name when the
 * class has no venue or the read fails). Only classes that have ENDED are
 * kept: one still running stays under Upcoming, where the composed rows keep
 * it until it ends.
 */
export async function fetchPastBookings(now: Date = new Date()): Promise<MarketResult<PastBooking[]>> {
  const r = await marketRpc("my_class_bookings", { p_tab: "past", p_limit: PAST_LIMIT }, t("Couldn't load your bookings."), parseClassBookings);
  if (!r.ok) return r;
  const list = r.value.filter((b) => isOver(b, now));
  const gymIds = [...new Set(list.map((b) => b.gymId).filter((x): x is string => !!x))];
  if (gymIds.length === 0) return { ok: true, value: list };
  try {
    const { data, error } = await supabase.from("gyms").select("id, name").in("id", gymIds);
    if (error) return { ok: true, value: list };
    const names = new Map(((data ?? []) as { id: string; name: string | null }[]).map((g) => [g.id, g.name?.trim() || ""]));
    return { ok: true, value: list.map((b) => (b.gymId && names.get(b.gymId) ? { ...b, providerName: names.get(b.gymId) as string } : b)) };
  } catch {
    return { ok: true, value: list };
  }
}

/**
 * The calendar's Rate (D-43): the instructor review target for this booking
 * when the class had an instructor and my_class_bookings says it's
 * reviewable; null otherwise, and Rate keeps the live write_class_review
 * sheet (the venue review, for a class with nobody named).
 */
export async function findReviewTarget(bookingId: string, sessionId?: string | null): Promise<ReviewTarget | null> {
  const r = await fetchPastBookings();
  if (!r.ok) return null;
  const b = findPast(r.value, bookingId, sessionId);
  return b ? targetOf(b) : null;
}

export type ReviewWrite = { ok: true } | { ok: false; pending?: boolean; offline?: boolean; error?: ReviewError; message: string };

const FALLBACK = tk("Couldn't send your review. Try again.");

/** review_instructor(p_class_id, p_rating, p_body) → the review id. One per member per series; a second one edits it. */
export async function reviewInstructor(classId: string, rating: number, text: string | null): Promise<ReviewWrite> {
  // Round C Release 2: contact details belong in messages, said at save time.
  const contact = contactRefusal(text);
  if (contact) return { ok: false, message: contact };
  const res = await marketRpcRaw("review_instructor", { p_class_id: classId, p_rating: rating, p_body: text });
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: t(FALLBACK) };
  if (res.error) {
    if (isPendingError(res.error)) return { ok: false, pending: true, message: t("Instructor reviews are coming soon. Nothing was sent.") };
    if (isOffline(res.error)) return { ok: false, offline: true, message: t("You're offline. Your review wasn't sent.") };
    // Round F (AB7): an account under 7 days old (ATXW0, with when it may).
    const young = reviewRefusalLine(res.error);
    if (young) return { ok: false, message: young };
    const k = reviewErrorOf(res.error);
    if (k) return { ok: false, error: k, message: t(REVIEW_ERROR_TEXT[k]) };
    console.error("[instructor-reviews] review_instructor:", res.error.message);
    return { ok: false, message: t(FALLBACK) };
  }
  return { ok: true };
}
