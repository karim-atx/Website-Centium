// Market + Share 3.0 · W2 · My bookings, pure (C-MO.4.5 `bookMembers`,
// `bookUpcoming`, `bookPast`, `bookEmpty`). DB4 my_bookings (optional, PLAN
// §2.2) hasn't landed, so the rows are composed here from the live readers:
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

export type BookingsTab = "memberships" | "upcoming" | "past";

export const BOOKINGS_TABS: readonly { key: BookingsTab; label: string }[] = [
  { key: "memberships", label: "Memberships" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
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

/** "Fri, Oct 16" (D-02). */
export const dayLine = (d: Date): string => `${wd(d)}, ${mon(d)} ${d.getDate()}`;
/** The upcoming stub: "Fri 6:30 PM". */
export const upcomingStub = (d: Date): string => `${wd(d)} ${clock(d)}`;
/** The past stub: "Mon Oct 12". */
export const pastStub = (d: Date): string => `${wd(d)} ${mon(d)} ${d.getDate()}`;

/** "Nov 15, 2026" from a YYYY-MM-DD. */
export function longDate(day: string): string {
  const d = localDateTime(day, null);
  return `${mon(d)} ${d.getDate()}, ${d.getFullYear()}`;
}
/** "Nov 15" from a YYYY-MM-DD. */
export function shortDate(day: string): string {
  const d = localDateTime(day, null);
  return `${mon(d)} ${d.getDate()}`;
}

const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

/** "Fri, Oct 16 · 6:30 PM · 45 min" (+ " · $35"). */
export function sessionMeta(start: Date, end: Date | null, price?: number | null): string {
  const parts = [dayLine(start), clock(start)];
  if (end && end > start) parts.push(`${minutesBetween(start, end)} min`);
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
  const note = m.passState === "awaiting_payment" ? "Pay on your first visit" : m.granted ? "Granted with a code" : null;
  const sortAt = at(localDateTime(m.startedOn, null));
  if (m.status === "upcoming" || m.passState === "upcoming") {
    return { ...base, meta: `Starts ${longDate(m.startedOn)}${price}`, note, stub: `Starts ${shortDate(m.startedOn)}`, tone: "pale", at: sortAt };
  }
  if (m.status === "active") {
    if (ends) return { ...base, meta: `Valid until ${longDate(ends)}${price}`, note, stub: `Ends ${shortDate(ends)}`, tone: "pale", at: sortAt };
    if (m.expiresOn) return { ...base, meta: `Valid until ${longDate(m.expiresOn)}${price}`, note, stub: `Ends ${shortDate(m.expiresOn)}`, tone: "pale", at: sortAt };
    return { ...base, meta: `Since ${longDate(m.startedOn)}${price}`, note, stub: "Active", tone: "teal", at: sortAt };
  }
  const endDay = m.expiresOn ?? m.startedOn;
  if (m.status === "expired" && isPass(m.planType)) return { ...base, meta: `Used ${longDate(endDay)}${price}`, note: null, stub: "Used", tone: "muted", at: sortAt };
  if (m.status === "expired") return { ...base, meta: `Expired ${longDate(endDay)}${price}`, note: null, stub: "Expired", tone: "muted", at: sortAt };
  return { ...base, meta: `Ended${m.expiresOn ? ` ${longDate(m.expiresOn)}` : ""}${price}`, note: null, stub: "Ended", tone: "muted", at: sortAt };
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
  const name = h.professionalFirstName || "Your professional";
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
  if (h.status === "pending") return { ...base, meta: `Requested ${longDate(h.startedOn)}${price}`, stub: "Pending", tone: "pale" };
  if (h.status === "active")
    return h.expiresOn
      ? { ...base, meta: `Valid until ${longDate(h.expiresOn)}${price}`, stub: `Ends ${shortDate(h.expiresOn)}`, tone: "pale" }
      : { ...base, meta: `Since ${longDate(h.startedOn)}${price}`, stub: "Active", tone: "teal" };
  const endDay = h.cancelledAt ? h.cancelledAt.slice(0, 10) : (h.expiresOn ?? h.startedOn);
  return { ...base, meta: `Ended ${longDate(endDay)}${price}`, stub: "Ended", tone: "muted" };
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
  const meta = sessionMeta(start, end > start ? end : null) + (cancelled ? " · Cancelled by the venue" : "");
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
      stub: cancelled ? "Cancelled" : past ? pastStub(start) : upcomingStub(start),
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
      meta: sessionMeta(start, end, s.price) + (off ? " · Cancelled" : requested && !past ? " · Waiting for a reply" : ""),
      note: null,
      stub: off ? "Cancelled" : past ? pastStub(start) : requested ? "Requested" : upcomingStub(start),
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
// Empty states (`bookEmpty`: the Upcoming one is the board's; the other two
// are written in the same style).

export const BOOKINGS_EMPTY: Record<BookingsTab, { title: string; body: string; cta: string; href: string }> = {
  upcoming: { title: "No upcoming classes", body: "Classes you book will show here.", cta: "Browse classes", href: "/app/marketplace?tab=classes" },
  memberships: { title: "No memberships yet", body: "Gym memberships and passes you buy will show here.", cta: "Browse gyms", href: "/app/marketplace?tab=gyms" },
  past: { title: "No past bookings", body: "Classes and sessions you've been to will show here.", cta: "Browse classes", href: "/app/marketplace?tab=classes" },
};
