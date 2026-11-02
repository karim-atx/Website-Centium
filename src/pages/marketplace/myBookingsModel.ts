// Market + Share 3.0 · W2 · My bookings, pure (C-MO.4.5 `bookMembers`,
// `bookUpcoming`, `bookPast`, `bookEmpty`). The rows are composed here from
// the live readers (Past's classes come from DB4 my_class_bookings, below):
// my_gym_memberships() and my_hires() (Memberships), my_class_schedule (+ the
// class's venue and cancellation) and the member's own professional
// appointments (Upcoming / Past). The row shape is the board's `list.items`
// (`bstub`: tile, n, sub, meta, stub label and tone).
//
// D-02 dates month first, D-03 times 12-hour: the board's "Fri 16 Oct ·
// 18:30 · 45 min" is "Fri, Oct 16 · 6:30 PM · 45 min", its stub "Fri 18:30"
// is "Fri 6:30 PM", "Mon 12 Oct" is "Mon Oct 12", "Valid until 15 Nov 2026"
// is "Valid until Nov 15, 2026" and "Ends 15 Nov" is "Ends Nov 15".

import { formatShortDate } from "../../utils/date";
import { formatPrice } from "../../utils/price";
import { time12 } from "../../utils/time12";
import { getLanguage, t, tk, tx } from "../../i18n/core";
import { reviewMetaTail, targetOf, type PastBooking, type ReviewTarget } from "../../services/instructor-reviews/model";

export type BookingsTab = "memberships" | "upcoming" | "past";

export const BOOKINGS_TABS: readonly { key: BookingsTab; label: string }[] = [
  { key: "memberships", label: tk("Memberships") },
  { key: "upcoming", label: tk("Upcoming") },
  { key: "past", label: tk("Past") },
];

/** ?tab=memberships|upcoming|past; anything else opens Memberships, as the board's first frame. */
export function tabFromQuery(v: string | null): BookingsTab {
  return v === "upcoming" || v === "past" || v === "memberships" ? v : "memberships";
}

/** The board's STUB tones used here: teal (booked / active), pale (soon), muted (used / past / ended). */
export type RowTone = "teal" | "pale" | "muted";

export interface BookingRow {
  key: string;
  kind: "membership" | "package" | "class" | "session";
  /** The 44 tile's initials (the venue's or the professional's). */
  tile: string;
  title: string;
  sub: string;
  meta: string;
  /** A fourth line (a cash payment still owed, a code grant), or null. */
  note: string | null;
  stub: string;
  tone: RowTone;
  /** Sort instant (ms). */
  at: number;
  /** In-app path a tap opens, or null. */
  href: string | null;
  /** The source id (a gym membership's id, for the row menu and the pass). */
  refId: string;
  /** W5 (DB4 / DB10): the "Review" stub opens the instructor review for this class. */
  review?: ReviewTarget | null;
}

/** "Hamra Strength Club" → "HS"; "Noor" → "NO"; two letters, as the board's tiles. */
export function tileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const at = (d: Date) => d.getTime();

/** A local date + "HH:MM(:SS)" time → Date (the venue's wall clock, read on the device). */
export function localDateTime(day: string, hhmm: string | null): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = (hhmm ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0);
}

const wd = (d: Date) => formatShortDate(d, { weekday: "short" });
const mon = (d: Date) => formatShortDate(d, { month: "short" });
const clock = (d: Date) => time12(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);

// In Arabic the dates come whole from the locale (day before month, Arabic month names); English keeps the board's shapes.
const arabic = () => getLanguage() === "ar";

/** "Fri, Oct 16" (D-02). */
export const dayLine = (d: Date): string => (arabic() ? formatShortDate(d, { weekday: "short", month: "short", day: "numeric" }) : `${wd(d)}, ${mon(d)} ${d.getDate()}`);
/** The upcoming stub: "Fri 6:30 PM". */
export const upcomingStub = (d: Date): string => `${wd(d)} ${clock(d)}`;
/** The past stub: "Mon Oct 12". */
export const pastStub = (d: Date): string => (arabic() ? formatShortDate(d, { weekday: "short", month: "short", day: "numeric" }) : `${wd(d)} ${mon(d)} ${d.getDate()}`);

/** "Nov 15, 2026" from a YYYY-MM-DD. */
export function longDate(day: string): string {
  const d = localDateTime(day, null);
  return arabic() ? formatShortDate(d, { month: "short", day: "numeric", year: "numeric" }) : `${mon(d)} ${d.getDate()}, ${d.getFullYear()}`;
}
/** "Nov 15" from a YYYY-MM-DD. */
export function shortDate(day: string): string {
  const d = localDateTime(day, null);
  return arabic() ? formatShortDate(d, { month: "short", day: "numeric" }) : `${mon(d)} ${d.getDate()}`;
}

const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

/** "Fri, Oct 16 · 6:30 PM · 45 min" (+ " · $35"). */
export function sessionMeta(start: Date, end: Date | null, price?: number | null): string {
  const parts = [dayLine(start), clock(start)];
  if (end && end > start) parts.push(t("{n} min", { n: minutesBetween(start, end) }));
  if (price !== undefined && price !== null && price > 0) parts.push(formatPrice(price));
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Memberships

/** The fields of services/venues GymMembership this tab reads. */
export interface MembershipInput {
  id: string;
  gymId: string;
  gymName: string;
  planName: string;
  status: "active" | "expired" | "cancelled" | "upcoming";
  passState: string;
  priceAgreed: number;
  startedOn: string;
  expiresOn: string | null;
  cancelAtPeriodEnd: boolean;
  granted?: boolean;
  planType?: string | null;
}

const isPass = (planType: string | null | undefined) => planType === "day_pass" || planType === "drop_in";

/**
 * A gym membership as the board's row: the venue, the plan, "Valid until
 * Nov 15, 2026 · $45", and the stub: "Ends Nov 15" pale while it runs (the
 * board's `soon`), "Starts Nov 1" pale before it starts, "Active" teal when
 * it has no end, "Used" muted for a day pass that has run out (the board's
 * `used`), "Expired" / "Ended" muted otherwise. `endsOn` is an end requested
 * this session (MembershipsCard's rule).
 */
export function membershipRow(m: MembershipInput, endsOn?: string): BookingRow {
  const price = m.priceAgreed > 0 ? ` · ${formatPrice(m.priceAgreed)}` : "";
  const ends = endsOn ?? (m.cancelAtPeriodEnd && m.expiresOn ? m.expiresOn : undefined);
  const base = { key: `m-${m.id}`, kind: "membership" as const, tile: tileInitials(m.gymName), title: m.gymName, sub: m.planName, href: `/app/marketplace/gym?id=${encodeURIComponent(m.gymId)}`, refId: m.id };
  const note = m.passState === "awaiting_payment" ? t("Pay on your first visit") : m.granted ? t("Granted with a code") : null;
  const sortAt = at(localDateTime(m.startedOn, null));
  if (m.status === "upcoming" || m.passState === "upcoming") {
    return { ...base, meta: t("Starts {date}", { date: longDate(m.startedOn) }) + price, note, stub: t("Starts {date}", { date: shortDate(m.startedOn) }), tone: "pale", at: sortAt };
  }
  if (m.status === "active") {
    if (ends) return { ...base, meta: t("Valid until {date}", { date: longDate(ends) }) + price, note, stub: t("Ends {date}", { date: shortDate(ends) }), tone: "pale", at: sortAt };
    if (m.expiresOn) return { ...base, meta: t("Valid until {date}", { date: longDate(m.expiresOn) }) + price, note, stub: t("Ends {date}", { date: shortDate(m.expiresOn) }), tone: "pale", at: sortAt };
    return { ...base, meta: t("Since {date}", { date: longDate(m.startedOn) }) + price, note, stub: tx("Active", "membership"), tone: "teal", at: sortAt };
  }
  const endDay = m.expiresOn ?? m.startedOn;
  if (m.status === "expired" && isPass(m.planType)) return { ...base, meta: t("Used {date}", { date: longDate(endDay) }) + price, note: null, stub: t("Used"), tone: "muted", at: sortAt };
  if (m.status === "expired") return { ...base, meta: t("Expired {date}", { date: longDate(endDay) }) + price, note: null, stub: t("Expired"), tone: "muted", at: sortAt };
  return { ...base, meta: (m.expiresOn ? t("Ended {date}", { date: longDate(m.expiresOn) }) : t("Ended")) + price, note: null, stub: t("Ended"), tone: "muted", at: sortAt };
}

/** A professional's plan (my_hires): the fields this tab reads. */
export interface HireInput {
  id: string;
  professionalId: string;
  professionalFirstName: string;
  planName: string;
  status: "pending" | "active" | "cancelled" | "expired";
  priceAgreed: number;
  startedOn: string;
  expiresOn: string | null;
  cancelledAt: string | null;
}

/**
 * A hired professional's plan (DB4 kind professional_package) in the
 * Memberships list, in the same row: the professional, the plan, the dates;
 * stub "Pending" pale until they confirm, "Ends Nov 20" pale / "Active" teal
 * while it runs, "Ended" muted after.
 */
export function hireRow(h: HireInput, typeLabel: string | null): BookingRow {
  const price = h.priceAgreed > 0 ? ` · ${formatPrice(h.priceAgreed)}` : "";
  const name = h.professionalFirstName || t("Your professional");
  const base = {
    key: `h-${h.id}`,
    kind: "package" as const,
    tile: tileInitials(name),
    title: name,
    sub: typeLabel ? `${h.planName} · ${typeLabel}` : h.planName,
    href: `/app/professionals/${encodeURIComponent(h.professionalId)}`,
    refId: h.id,
    note: null,
    at: at(localDateTime(h.startedOn, null)),
  };
  if (h.status === "pending") return { ...base, meta: t("Requested {date}", { date: longDate(h.startedOn) }) + price, stub: t("Pending"), tone: "pale" };
  if (h.status === "active")
    return h.expiresOn
      ? { ...base, meta: t("Valid until {date}", { date: longDate(h.expiresOn) }) + price, stub: t("Ends {date}", { date: shortDate(h.expiresOn) }), tone: "pale" }
      : { ...base, meta: t("Since {date}", { date: longDate(h.startedOn) }) + price, stub: tx("Active", "membership"), tone: "teal" };
  const endDay = h.cancelledAt ? h.cancelledAt.slice(0, 10) : (h.expiresOn ?? h.startedOn);
  return { ...base, meta: t("Ended {date}", { date: longDate(endDay) }) + price, stub: t("Ended"), tone: "muted" };
}

/** Running ones first (active, then upcoming / pending), each newest first; ended ones after. */
export function arrangeMemberships(rows: readonly BookingRow[]): BookingRow[] {
  const rank = (r: BookingRow) => (r.tone === "muted" ? 1 : 0);
  return [...rows].sort((a, b) => rank(a) - rank(b) || b.at - a.at);
}

// ---------------------------------------------------------------------------
// Classes and sessions

export interface ClassInput {
  bookingId: string;
  classId: string;
  title: string;
  /** The venue (gyms.name), else the business. */
  place: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  cancelledAt: string | null;
}

export interface SessionInput {
  id: string;
  serviceName: string;
  professionalId: string | null;
  /** "Rami · Coach or instructor" (the board's "Rana Khoury · Trainer"). */
  who: string;
  startsAt: string;
  endsAt: string;
  status: string;
  price: number;
}

/** Upcoming until it ends. */
const isOver = (end: Date, now: Date) => end.getTime() <= now.getTime();

export function classRow(c: ClassInput, now: Date): { row: BookingRow; past: boolean } {
  const start = localDateTime(c.eventDate, c.startTime);
  const end = c.endTime ? localDateTime(c.eventDate, c.endTime) : start;
  const past = isOver(end > start ? end : start, now);
  const cancelled = !!c.cancelledAt;
  const meta = sessionMeta(start, end > start ? end : null) + (cancelled ? ` · ${t("Cancelled by the venue")}` : "");
  return {
    past,
    row: {
      key: `c-${c.bookingId}`,
      kind: "class",
      tile: tileInitials(c.place),
      title: c.title,
      sub: c.place,
      meta,
      note: null,
      stub: cancelled ? t("Cancelled") : past ? pastStub(start) : upcomingStub(start),
      tone: cancelled || past ? "muted" : "teal",
      at: at(start),
      href: `/app/marketplace/class?id=${encodeURIComponent(c.classId)}`,
      refId: c.bookingId,
    },
  };
}

/** appointment_status values that are not a live session. */
const OFF = new Set(["cancelled", "late_cancel", "declined", "no_show", "rejected"]);

export function sessionRow(s: SessionInput, now: Date): { row: BookingRow; past: boolean } {
  const start = new Date(s.startsAt);
  const end = new Date(s.endsAt);
  const past = isOver(end, now);
  const off = OFF.has(s.status);
  const requested = s.status === "requested";
  const name = s.who.split(" · ")[0] || s.serviceName;
  return {
    past,
    row: {
      key: `s-${s.id}`,
      kind: "session",
      tile: tileInitials(name),
      title: s.serviceName,
      sub: s.who,
      meta: sessionMeta(start, end, s.price) + (off ? ` · ${t("Cancelled")}` : requested && !past ? ` · ${t("Waiting for a reply")}` : ""),
      note: null,
      stub: off ? t("Cancelled") : past ? pastStub(start) : requested ? t("Requested") : upcomingStub(start),
      tone: off || past ? "muted" : requested ? "pale" : "teal",
      at: at(start),
      href: s.professionalId ? `/app/professionals/${encodeURIComponent(s.professionalId)}` : null,
      refId: s.id,
    },
  };
}

/** Upcoming ascending, Past descending (PLAN §2.2 DB4). */
export function splitSchedule(rows: readonly { row: BookingRow; past: boolean }[]): { upcoming: BookingRow[]; past: BookingRow[] } {
  return {
    upcoming: rows.filter((r) => !r.past).map((r) => r.row).sort((a, b) => a.at - b.at),
    past: rows.filter((r) => r.past).map((r) => r.row).sort((a, b) => b.at - a.at),
  };
}

// ---------------------------------------------------------------------------
// Past classes from my_class_bookings (DB4 `can_review` / `my_rating`, D-43)
//
// When my_class_bookings(p_tab 'past') answers, Past's CLASS rows are its
// rows (the composed class rows leave Past; the professional sessions stay
// composed, DB4 carries classes only), so a past class taught by an
// instructor carries the server's reviewability (C-MO.4.5 `bookPast`, Client
// Professional Screens `pastItems`):
// - can_review, no my_rating: meta "Fri, Oct 9 · 6:30 PM · Rate your
//   instructor", the stub "Review" teal (a button → the review popup);
// - my_rating (or sent this session): meta "… · you rated 5", the stub
//   "Reviewed" muted;
// - anything else: as the composed class rows ("Mon Oct 12" muted; the
//   venue's cancellation "Cancelled").
// While it is pending or failed, Past stays the composed rows (no Review stub).

/** A my_class_bookings past row; `sentRating` is a review sent this session. */
export function pastRow(b: PastBooking, sentRating?: number | null): BookingRow {
  const start = b.startsAt ? new Date(b.startsAt) : null;
  const end = b.endsAt ? new Date(b.endsAt) : null;
  const okStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const off = b.cancelled;
  const sent = sentRating !== undefined && sentRating !== null;
  const target = sent ? null : targetOf(b);
  const reviewed = sent || b.reviewed;
  const sub = [b.providerName, b.professionalName].filter(Boolean).join(" · ");
  const tile = tileInitials(b.providerName || b.title);
  const tail = target || reviewed ? reviewMetaTail({ reviewed, rating: sent ? (sentRating as number) : b.myRating }) : null;
  const meta = okStart
    ? (target || reviewed) && !off
      ? [dayLine(okStart), clock(okStart), tail].filter(Boolean).join(" · ")
      : sessionMeta(okStart, end && !Number.isNaN(end.getTime()) ? end : null) + (off ? ` · ${t("Cancelled by the venue")}` : "")
    : (tail ?? "");
  const stub = off ? t("Cancelled") : target ? tx("Review", "rate") : reviewed ? t("Reviewed") : okStart ? pastStub(okStart) : t("Past");
  return {
    key: `p-class-${b.refId}`,
    kind: "class",
    tile,
    title: b.title,
    sub,
    meta,
    note: null,
    stub,
    tone: target && !off ? "teal" : "muted",
    at: okStart ? okStart.getTime() : 0,
    href: b.sessionId ? `/app/marketplace/class?id=${encodeURIComponent(b.sessionId)}` : null,
    refId: b.refId,
    review: off ? null : target,
  };
}

/** Past: the DB4 class rows plus the composed rows that aren't classes (the professional sessions), newest first. */
export function pastRows(list: readonly PastBooking[], sent: Readonly<Record<string, number>>, others: readonly BookingRow[] = []): BookingRow[] {
  return [...list.map((b) => pastRow(b, sent[b.refId])), ...others.filter((r) => r.kind !== "class")].sort((a, b) => b.at - a.at);
}

// ---------------------------------------------------------------------------
// Empty states (`bookEmpty`: the Upcoming one is the board's; the other two
// are written in the same style).

export const BOOKINGS_EMPTY: Record<BookingsTab, { title: string; body: string; cta: string; href: string }> = {
  upcoming: { title: tk("No upcoming classes"), body: tk("Classes you book will show here."), cta: tk("Browse classes"), href: "/app/marketplace?tab=classes" },
  memberships: { title: tk("No memberships yet"), body: tk("Gym memberships and passes you buy will show here."), cta: tk("Browse gyms"), href: "/app/marketplace?tab=gyms" },
  past: { title: tk("No past bookings"), body: tk("Classes and sessions you've been to will show here."), cta: tk("Browse classes"), href: "/app/marketplace?tab=classes" },
};
