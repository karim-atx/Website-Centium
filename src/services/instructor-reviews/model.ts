// Market + Share 3.0 · W5 · instructor reviews (C-MO.4.5 `revPrompt`,
// `revFilled`, `revSent`; HANDOVER §4 "My bookings" + "Review popup", §9
// "Work history, reviews, ranking"; PLAN §2.2 DB4 / DB10, D-42, D-43).
// Pure parsers and display rules (no Supabase import, so node:test runs them).
//
// D-43 (Karim): an instructor review is one per member per CLASS SERIES,
// written in one dialog, stored as a gym review on the server and shown on the
// instructor's profile with the gym's name. Reviewability per past class comes
// from my_bookings(p_tab 'past') (DB4: `reviewable`, `reviewed`); the write is
// review_instructor(p_session_id, p_rating, p_text, p_request_id) (DB10).

import { bool, num, rows, str } from "../market/parse";

// ---------------------------------------------------------------- my_bookings (past)

export type PastKind = "membership" | "day_pass" | "class" | "professional_session" | "professional_package";

/** One my_bookings(p_tab 'past') row (PLAN §2.2 DB4), read tolerantly. */
export interface PastBooking {
  kind: PastKind;
  /** ref_id: the booking (or appointment / membership) the row is about. */
  refId: string;
  /** The class session (business_classes row) a class review is written for. */
  sessionId: string | null;
  title: string;
  /** The venue (gym) or the professional's practice. */
  providerName: string;
  /** The class's Team instructor, or the hired professional. */
  professionalId: string | null;
  professionalName: string | null;
  professionalPhotoUrl: string | null;
  /** The professional's type line on a hired session ("Trainer"). */
  professionalType: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
  reviewable: boolean;
  reviewed: boolean;
  /** The rating this member gave, when the reader sends it ("you rated 5"). */
  myRating: number | null;
}

const KINDS: readonly PastKind[] = ["membership", "day_pass", "class", "professional_session", "professional_package"];
const kindOf = (v: unknown): PastKind | null => (typeof v === "string" && (KINDS as readonly string[]).includes(v) ? (v as PastKind) : null);

export function parsePastBookings(data: unknown): PastBooking[] {
  const out: PastBooking[] = [];
  for (const r of rows(data)) {
    const kind = kindOf(r.kind);
    const refId = str(r.ref_id) ?? str(r.booking_id) ?? str(r.id);
    if (!kind || !refId) continue;
    const rating = num(r.my_rating) ?? num(r.rating);
    out.push({
      kind,
      refId,
      sessionId: str(r.class_session_id) ?? str(r.session_id) ?? str(r.class_id),
      title: str(r.title) ?? "",
      providerName: str(r.provider_name) ?? str(r.business_name) ?? "",
      professionalId: str(r.professional_id) ?? str(r.instructor_id),
      professionalName: str(r.professional_name) ?? str(r.instructor_name),
      professionalPhotoUrl: str(r.professional_photo_url) ?? str(r.instructor_photo_url) ?? str(r.photo_url),
      professionalType: str(r.professional_type) ?? str(r.specialty),
      startsAt: str(r.starts_at),
      endsAt: str(r.ends_at),
      status: str(r.status),
      reviewable: bool(r.reviewable),
      reviewed: bool(r.reviewed),
      myRating: rating !== null && rating >= 1 && rating <= 5 ? Math.round(rating) : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- the review target

/** What the dialog needs: the class, the gym, the date, the Team instructor. */
export interface ReviewTarget {
  /** The booking (my_bookings ref_id), to mark the row reviewed. */
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
 * A past class the server says this member may review (DB4 `reviewable`,
 * not yet `reviewed`) and that names its Team instructor; anything else is
 * not an instructor review (null).
 */
export function targetOf(b: PastBooking): ReviewTarget | null {
  if (b.kind !== "class" || !b.reviewable || b.reviewed) return null;
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
  return list.find((b) => b.refId === bookingId) ?? (sessionId ? (list.find((b) => b.kind === "class" && b.sessionId === sessionId) ?? null) : null);
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

export type ReviewError = "not_attended" | "already_reviewed";
const ERRORS: readonly ReviewError[] = ["not_attended", "already_reviewed"];

/** The documented error name in a PostgREST error (code, message, details or hint), or null. */
export function reviewErrorOf(e: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null | undefined): ReviewError | null {
  if (!e) return null;
  const hay = [e.code, e.message, e.details, e.hint].filter(Boolean).join(" ").toLowerCase();
  for (const k of ERRORS) if (hay.includes(k)) return k;
  return null;
}

/** Not drawn on the board: written in its voice (listed in the W5 report). */
export const REVIEW_ERROR_TEXT: Record<ReviewError, string> = {
  not_attended: "You can review a class once you've been to it.",
  already_reviewed: "You've already reviewed this class.",
};
