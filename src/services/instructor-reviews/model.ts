// Market + Share 3.0 · W5 · instructor reviews (C-MO.4.5 `revPrompt`,
// `revFilled`, `revSent`; HANDOVER §4 "My bookings" + "Review popup", §9
// "Work history, reviews, ranking"; PLAN §2.2 DB4 / DB10, D-42, D-43).
// Pure parsers and display rules (no Supabase import, so node:test runs them).
//
// D-43 (Karim): an instructor review is one per member per CLASS SERIES,
// written in one dialog, stored as a gym review on the server and shown on the
// instructor's profile with the gym's name. Reviewability per past class comes
// from my_class_bookings(p_tab 'past') (DB4: `can_review`, `my_rating`); the
// write is review_instructor(p_class_id, p_rating, p_body) (Database Release
// 2: one per member per class series, a second review of the series EDITS
// the first; write_class_review now delegates to it when the class names an
// instructor).

import { bool, num, rows, str } from "../market/parse";

// ---------------------------------------------------------------- my_class_bookings (DB4)

/**
 * One my_class_bookings(p_tab 'past') row (Database 20261211100000,
 * HANDOVER_API Release 1 "Bookings (DB4)"): booking_id, session_id (=
 * business_class_id, the occurrence), series_id, class_title, starts_at,
 * ends_at, business_id, business_name, gym_id, instructor_id,
 * instructor_name, instructor_avatar, payment_method, payment_status,
 * price_agreed, cancelled_at, my_rating (the caller's own), can_review
 * (happened, not cancelled, not already rated), booked_at.
 */
export interface PastBooking {
  /** booking_id. */
  refId: string;
  /** session_id: the class occurrence (business_classes row) a review is written for. */
  sessionId: string | null;
  seriesId: string | null;
  title: string;
  /** The venue's name (the caller fills it from gym_id), else business_name. */
  providerName: string;
  gymId: string | null;
  /** The class's instructor (instructor_id / _name / _avatar). */
  professionalId: string | null;
  professionalName: string | null;
  professionalPhotoUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  /** cancelled_at is set: the venue cancelled the class. */
  cancelled: boolean;
  /** can_review. */
  reviewable: boolean;
  /** my_rating is set. */
  reviewed: boolean;
  /** my_rating ("you rated 5"). */
  myRating: number | null;
}

export function parseClassBookings(data: unknown): PastBooking[] {
  const out: PastBooking[] = [];
  for (const r of rows(data)) {
    const refId = str(r.booking_id);
    if (!refId) continue;
    const rating = num(r.my_rating);
    const myRating = rating !== null && rating >= 1 && rating <= 5 ? Math.round(rating) : null;
    out.push({
      refId,
      sessionId: str(r.session_id),
      seriesId: str(r.series_id),
      title: str(r.class_title) ?? "",
      providerName: str(r.business_name) ?? "",
      gymId: str(r.gym_id),
      professionalId: str(r.instructor_id),
      professionalName: str(r.instructor_name),
      professionalPhotoUrl: str(r.instructor_avatar),
      startsAt: str(r.starts_at),
      endsAt: str(r.ends_at),
      cancelled: !!str(r.cancelled_at),
      reviewable: bool(r.can_review),
      reviewed: myRating !== null,
      myRating,
    });
  }
  return out;
}

/** Past means over: a class still running reads as Upcoming (the composed rows keep it until it ends). */
export function isOver(b: Pick<PastBooking, "startsAt" | "endsAt">, now: Date): boolean {
  const t = new Date(b.endsAt ?? b.startsAt ?? "");
  return !Number.isNaN(t.getTime()) && t.getTime() <= now.getTime();
}

// ---------------------------------------------------------------- the review target

/** What the dialog needs: the class, the gym, the date, the Team instructor. */
export interface ReviewTarget {
  /** The booking (my_class_bookings booking_id), to mark the row reviewed. */
  bookingId: string;
  sessionId: string;
  title: string;
  gymName: string;
  startsAt: string | null;
  professionalId: string;
  professionalName: string;
  photoUrl: string | null;
}

/**
 * A past class the server says this member may review (DB4 `can_review`,
 * no `my_rating` yet) and that names its instructor; anything else is not an
 * instructor review (null).
 */
export function targetOf(b: PastBooking): ReviewTarget | null {
  if (b.cancelled || !b.reviewable || b.reviewed) return null;
  if (!b.sessionId || !b.professionalId || !b.professionalName) return null;
  return {
    bookingId: b.refId,
    sessionId: b.sessionId,
    title: b.title,
    gymName: b.providerName,
    startsAt: b.startsAt,
    professionalId: b.professionalId,
    professionalName: b.professionalName,
    photoUrl: b.professionalPhotoUrl,
  };
}

/** The past row for a booking (by its booking id, or its class session), as the calendar's Rate asks. */
export function findPast(list: readonly PastBooking[], bookingId: string, sessionId?: string | null): PastBooking | null {
  return list.find((b) => b.refId === bookingId) ?? (sessionId ? (list.find((b) => b.sessionId === sessionId) ?? null) : null);
}

// ---------------------------------------------------------------- copy (the board's, D-02)

/** "Rana" from "Rana Khoury". */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

/** "How was Rana's class?" */
export const reviewTitle = (name: string): string => `How was ${firstName(name)}'s class?`;

/** "Shown on Rana's profile with your first name and the gym's name." */
export const reviewNote = (name: string): string => `Shown on ${firstName(name)}'s profile with your first name and the gym's name.`;

/** "Review sent · it shows on Rana's profile with Hamra Strength Club" */
export const sentText = (name: string, gym: string): string => `Review sent · it shows on ${firstName(name)}'s profile with ${gym}`;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Fri, Oct 9" (the board's "Fri 9 Oct", month first, D-02), on the device's clock. */
export function shortDay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`;
}

/** "Spin 45 · Hamra Strength Club · Fri, Oct 9". */
export function contextLine(t: Pick<ReviewTarget, "title" | "gymName" | "startsAt">): string {
  return [t.title, t.gymName, shortDay(t.startsAt)].filter(Boolean).join(" · ");
}

/** The Past row's meta tail: "Rate your instructor" until reviewed, then "you rated 5" (or nothing when the rating isn't known). */
export function reviewMetaTail(state: { reviewed: boolean; rating: number | null }): string | null {
  if (!state.reviewed) return "Rate your instructor";
  return state.rating ? `you rated ${state.rating}` : null;
}

// ---------------------------------------------------------------- the stars

/** Send is enabled once a star is set (the board's revOp 0.4 → 1). */
export const canSend = (rating: number): boolean => Number.isInteger(rating) && rating >= 1 && rating <= 5;

/**
 * The radiogroup's keys (WAI-ARIA rating pattern): Right / Up one more, Left /
 * Down one less, Home 1, End 5; from no rating, Right starts at 1 and Left at
 * 5. Null for any other key.
 */
export function starKey(current: number, key: string): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return current <= 0 ? 1 : Math.min(5, current + 1);
    case "ArrowLeft":
    case "ArrowDown":
      return current <= 0 ? 5 : Math.max(1, current - 1);
    case "Home":
      return 1;
    case "End":
      return 5;
    default:
      return null;
  }
}

/** The short review's limit (the live ReviewForm's REVIEW_BODY_MAX; not drawn). */
export const REVIEW_TEXT_MAX = 2000;

// ---------------------------------------------------------------- errors

/**
 * review_instructor's refusals (HANDOVER_API Release 2 "Instructor reviews"):
 * ATXH22 (ATX94) no booking of that class; ATX10 before it has happened;
 * ATXH23 (ATX08) nobody named, or never on that gym's team; ATX91 a rating
 * outside 1–5; 22023 over 2,000 characters; ATX02 rate limited. Stars
 * alone are a review since Database #38 (gym_reviews.body is nullable and
 * its CHECK allows null), so an empty text is sent as null and accepted.
 */
export type ReviewError = "not_attended" | "not_yet" | "no_instructor" | "bad_rating" | "too_long" | "rate_limited";

export function reviewErrorOf(e: { code?: string | null; message?: string | null } | null | undefined): ReviewError | null {
  if (!e) return null;
  const msg = e.message ?? "";
  if (/\bATXH22\b/.test(msg) || e.code === "ATX94") return "not_attended";
  if (/\bATXH23\b/.test(msg)) return "no_instructor";
  if (e.code === "ATX10") return "not_yet";
  if (e.code === "ATX91") return "bad_rating";
  if (e.code === "22023") return "too_long";
  if (e.code === "ATX02") return "rate_limited";
  return null;
}

/** Not drawn on the board: written in its voice. */
export const REVIEW_ERROR_TEXT: Record<ReviewError, string> = {
  not_attended: "You can review a class once you've been to it.",
  not_yet: "You can rate a class once it has happened.",
  no_instructor: "This class had no instructor from the gym's team to review.",
  bad_rating: "Choose from 1 to 5 stars.",
  too_long: "Keep it under 2,000 characters.",
  rate_limited: "Too many reviews in a short time. Try again later.",
};
