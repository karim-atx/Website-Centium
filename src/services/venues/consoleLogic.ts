// The venue console's pure rules (backend stage A4, Database
// docs/HANDOVER_API.md "Stage A4 · The business side of a venue": my_venues,
// venue_dashboard, venue_members, venue_class_roster, the gym_hours editor and
// the two public image buckets). No Supabase here, so node --test can load it.
//
// WHAT A VENUE IS TOLD ABOUT A MEMBER: a first name and whether they are a
// minor. Nothing else. The row types below carry exactly the columns the
// readers return, so a surname, email or birth date has nowhere to go.

import { formatPrice } from "../../utils/price";
import { formatShortDate } from "../../utils/date";
import { dayMonthYear, memberTag, stage4Message, storagePath, type GymMembershipStatus, type PassState } from "./venueLogic";
import type { HoursRow } from "./hours";

// ---------------------------------------------------------------------------
// my_venues()

export interface MyVenue {
  gymId: string;
  businessId: string;
  name: string;
  kind: "gym" | "studio";
  location: string;
  /** gyms.logo_url: a hosted URL (stage 4d), drawn only when http(s). */
  logoUrl: string | null;
  timezone: string;
  /** Set when an admin has hidden the venue. It still comes back, listed last. */
  hiddenAt: string | null;
  /** venue_is_open_at(): null is "no hours for now", never "closed". */
  isOpenNow: boolean | null;
  activeMembers: number;
  membershipsAwaitingPayment: number;
  upcomingClasses: number;
  reviewsCount: number;
  /** Null with no reviews, which is not 0. */
  reviewsAverage: number | null;
}

export type MyVenueRow = {
  gym_id: string;
  business_id: string;
  name: string;
  venue_kind: "gym" | "studio";
  location: string | null;
  logo_url: string | null;
  timezone: string | null;
  hidden_at: string | null;
  is_open_now: boolean | null;
  active_members: number | null;
  memberships_awaiting_payment: number | null;
  upcoming_classes: number | null;
  reviews_count: number | null;
  reviews_average: number | string | null;
};

const int = (v: number | string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
const bool3 = (v: boolean | null | undefined): boolean | null => (typeof v === "boolean" ? v : null);

export function toMyVenue(r: MyVenueRow): MyVenue {
  return {
    gymId: r.gym_id,
    businessId: r.business_id,
    name: r.name,
    kind: r.venue_kind,
    location: r.location ?? "",
    logoUrl: r.logo_url,
    timezone: r.timezone || "Asia/Beirut",
    hiddenAt: r.hidden_at,
    isOpenNow: bool3(r.is_open_now),
    activeMembers: int(r.active_members),
    membershipsAwaitingPayment: int(r.memberships_awaiting_payment),
    upcomingClasses: int(r.upcoming_classes),
    reviewsCount: int(r.reviews_count),
    reviewsAverage: numOrNull(r.reviews_average),
  };
}

/** The venue to show: the remembered one if it is still in the list, else the first. */
export function pickVenue(venues: MyVenue[], rememberedId: string | null): MyVenue | null {
  return venues.find((v) => v.gymId === rememberedId) ?? venues[0] ?? null;
}

/** "4.0 (3 reviews)", or "No reviews yet" when the average is null. */
export function reviewsLine(average: number | null, count: number): string {
  if (average === null || count === 0) return "No reviews yet";
  return `${average.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`;
}

// ---------------------------------------------------------------------------
// venue_dashboard()

export interface VenueDashboard {
  gymId: string;
  name: string;
  isOpenNow: boolean | null;
  membersTotal: number;
  activeMembers: number;
  membershipsAwaitingPayment: number;
  /** Agreed and unpaid. Not a payment record, and never "revenue". B15: null without the revenue permission. */
  amountAwaitingPayment: number | null;
  /** What staff marked as received this month. Not a payment record either. B15: null without revenue. */
  amountMarkedPaidThisMonth: number | null;
  classesThisWeek: number;
  bookingsThisWeek: number;
  waitlistWaiting: number;
  cancellationsThisWeek: number;
  reviewsCount: number;
  reviewsAverage: number | null;
}

export type VenueDashboardRow = {
  gym_id: string;
  name: string;
  is_open_now: boolean | null;
  members_total: number | null;
  active_members: number | null;
  memberships_awaiting_payment: number | null;
  amount_awaiting_payment: number | string | null;
  amount_marked_paid_this_month: number | string | null;
  classes_this_week: number | null;
  bookings_this_week: number | null;
  waitlist_waiting: number | null;
  cancellations_this_week: number | null;
  reviews_count: number | null;
  reviews_average: number | string | null;
};

export function toVenueDashboard(r: VenueDashboardRow): VenueDashboard {
  return {
    gymId: r.gym_id,
    name: r.name,
    isOpenNow: bool3(r.is_open_now),
    membersTotal: int(r.members_total),
    activeMembers: int(r.active_members),
    membershipsAwaitingPayment: int(r.memberships_awaiting_payment),
    // B15: venue_dashboard opens for any insider but nulls the money without
    // "revenue"; a null stays null (hidden), never "$0".
    amountAwaitingPayment: numOrNull(r.amount_awaiting_payment),
    amountMarkedPaidThisMonth: numOrNull(r.amount_marked_paid_this_month),
    classesThisWeek: int(r.classes_this_week),
    bookingsThisWeek: int(r.bookings_this_week),
    waitlistWaiting: int(r.waitlist_waiting),
    cancellationsThisWeek: int(r.cancellations_this_week),
    reviewsCount: int(r.reviews_count),
    reviewsAverage: numOrNull(r.reviews_average),
  };
}

/** A money figure as the console prints it: "$0" rather than blank. */
export function money(n: number): string {
  return formatPrice(n) || "$0";
}

// ---------------------------------------------------------------------------
// venue_members()

/** B7 MB-05 adds 'upcoming': a renewal not in force yet. */
export type MembershipStatus = GymMembershipStatus;
export type PaymentStatus = "pending" | "paid" | "refunded";

export interface VenueMember {
  membershipId: string;
  /**
   * The server's label (Q-05, Database 0587c8a): the first name only if the
   * member shared it with this business, else "Member #0042". Render it;
   * never treat it as a name. The desk's check-in reads names through
   * desk_find_member instead.
   */
  label: string;
  isMinor: boolean;
  /**
   * B7 MB-01 (b95ef5c): the person and their number at this business. Never
   * null on the local stack once the stage is there; null on a database
   * without it. The desk searches by number ("42", "0042", "#42").
   */
  personId: string | null;
  memberNumber: number | null;
  planName: string;
  status: MembershipStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  priceAgreed: number;
  /**
   * When the payment was recorded (venue_members, 20261120080000). Shown as
   * "Paid {d Mon}"; never summed into Revenue, which reads B8's payment ledger.
   */
  paidAt: string | null;
  /** Who recorded it: a profile id, not a name. Carried, not shown. */
  markedPaidBy: string | null;
  startedOn: string;
  expiresOn: string | null;
  /** The same derived state my_gym_memberships() shows the member. */
  passState: PassState;
  joinedAt: string;
  /** CN (20261203000000): granted by a member code, not bought. Labelled, never a sale. */
  granted?: boolean;
}

export type VenueMemberRow = {
  membership_id: string;
  member_label: string | null;
  member_is_minor: boolean | null;
  person_id?: string | null;
  member_number?: number | null;
  plan_name: string;
  status: MembershipStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  price_agreed: number | string | null;
  paid_at: string | null;
  marked_paid_by: string | null;
  started_on: string;
  expires_on: string | null;
  pass_state: PassState;
  joined_at: string;
  /** CN: appended by 20261203000000. Absent on an older stack. */
  granted?: boolean | null;
  total_count: number | string | null;
};

/** CN: how a membership granted by a member code is labelled where memberships are listed. */
export const GRANTED_LABEL = "Granted with a code";

export function toVenueMember(r: VenueMemberRow): VenueMember {
  return {
    membershipId: r.membership_id,
    label: r.member_label?.trim() || "Member",
    isMinor: r.member_is_minor === true,
    personId: r.person_id ?? null,
    memberNumber: r.member_number ?? null,
    planName: r.plan_name,
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    priceAgreed: int(r.price_agreed),
    paidAt: r.paid_at ?? null,
    markedPaidBy: r.marked_paid_by ?? null,
    startedOn: r.started_on,
    expiresOn: r.expires_on,
    passState: r.pass_state,
    joinedAt: r.joined_at,
    granted: r.granted === true,
  };
}

/**
 * "Paid 3 Oct", on the desk's own calendar day; null while unpaid, refunded,
 * or paid before paid_at was recorded.
 */
export function paidLine(m: Pick<VenueMember, "paidAt" | "paymentStatus">): string | null {
  if (!m.paidAt || m.paymentStatus !== "paid") return null;
  const d = new Date(m.paidAt);
  if (Number.isNaN(d.getTime())) return null;
  return `Paid ${formatShortDate(d, { day: "numeric", month: "short" })}`;
}

/** total_count rides on every row; an empty page has none, so it is 0 then. */
export function totalOf(rows: { total_count: number | string | null }[]): number {
  return rows.length === 0 ? 0 : int(rows[0].total_count);
}

/** venue_members' own page size default. The server clamps p_limit to 200. */
export const MEMBERS_PAGE_SIZE = 50;

/** "1–50 of 120", or "" for an empty roster. */
export function pageLine(offset: number, shown: number, total: number): string {
  if (total === 0 || shown === 0) return "";
  return `${offset + 1}–${offset + shown} of ${total}`;
}

/** The status filter's choices: null is every status (p_status = null). */
export const MEMBER_FILTERS: { value: MembershipStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "upcoming", label: "Upcoming" },
];

/** A roster row's tag: an upcoming renewal says when it starts (MB-05), else the pass state. */
export function venueMemberTag(m: { passState: PassState; startedOn: string }): { label: string; tone: "member" | "pending" | "muted" } {
  // pass_state 'upcoming' outranks 'awaiting_payment' (20261121020000); the
  // roster's own payment line says whether it is paid.
  if (m.passState === "upcoming") return { label: `Starts ${dayMonthYear(m.startedOn)}`, tone: "muted" };
  return passStateTag(m.passState);
}

/** The pass state as the member sees it, worded for the desk. */
export function passStateTag(state: PassState): { label: string; tone: "member" | "pending" | "muted" } {
  if (state === "awaiting_payment") return { label: "Awaiting payment", tone: "pending" };
  if (state === "valid") return { label: "Valid", tone: "member" };
  return memberTag(state);
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = { cash: "Cash", whish: "Whish Money" };
export const methodLabel = (m: string | null): string => (m ? (PAYMENT_METHOD_LABEL[m] ?? m) : "");

// ---------------------------------------------------------------------------
// venue_class_roster()

export interface RosterEntry {
  kind: "booked" | "waitlist";
  /** B7 (Database 65e0311): who, for Message clients (start_member_thread). Null without the column. */
  personId: string | null;
  /** Q-05: a first name for the front desk, "Member #0042" for the class's instructor (unless shared). */
  label: string;
  isMinor: boolean;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus | null;
  priceAgreed: number | null;
  at: string;
  waitlistPosition: number | null;
  /**
   * CL-08 (Database 20261121210000): the booking to pass to
   * mark_class_booking_paid. Null on waitlist rows, and without the column.
   */
  bookingId: string | null;
}

export type RosterRow = {
  entry_kind: "booked" | "waitlist";
  person_id?: string | null;
  client_label: string | null;
  client_is_minor: boolean | null;
  payment_method: string | null;
  payment_status: PaymentStatus | null;
  price_agreed: number | string | null;
  at: string;
  waitlist_position: number | null;
  /** CL-08: appended as the last column; read by name. */
  booking_id?: string | null;
};

export function toRosterEntry(r: RosterRow): RosterEntry {
  return {
    kind: r.entry_kind,
    personId: r.person_id ?? null,
    label: r.client_label?.trim() || "Client",
    isMinor: r.client_is_minor === true,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    priceAgreed: numOrNull(r.price_agreed),
    at: r.at,
    waitlistPosition: r.waitlist_position,
    // A waitlist row is never a booking, whatever the row carries.
    bookingId: r.entry_kind === "booked" ? (r.booking_id ?? null) : null,
  };
}

/**
 * CL-08: a booked row the desk may mark paid: payment pending, a booking id
 * to pass (the column exists on this database), and never a waitlist row.
 */
export function canMarkBookingPaid(e: RosterEntry): boolean {
  return e.kind === "booked" && e.paymentStatus === "pending" && !!e.bookingId;
}

/** The roster split as the sheet draws it; the server already orders each half. */
export function splitRoster(entries: RosterEntry[]): { booked: RosterEntry[]; waitlist: RosterEntry[] } {
  return {
    booked: entries.filter((e) => e.kind === "booked"),
    waitlist: entries.filter((e) => e.kind === "waitlist"),
  };
}

// ---------------------------------------------------------------------------
// The hours editor. gym_hours is written directly (owner only), one row per
// weekday, in exactly one of three shapes; the CHECK refuses anything else, so
// the same rule is enforced here before anything is sent.

export type DayShape = "closed" | "open24h" | "range";

export interface DayDraft {
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  /** null: the venue has not published this day yet. Must be chosen before saving. */
  shape: DayShape | null;
  /** "HH:MM"; only meaningful for a range. */
  opensAt: string;
  closesAt: string;
}

/** A gym_hours row as the insider reads it from the table. */
export type GymHoursTableRow = {
  id: string;
  weekday: number;
  closed: boolean;
  open_24h: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_OPENS = "06:00";
const DEFAULT_CLOSES = "22:00";

/** Seven drafts, Monday first, from whatever rows exist (a missing day is unset). */
export function draftsFromRows(rows: GymHoursTableRow[]): DayDraft[] {
  const byDay = new Map(rows.map((r) => [Number(r.weekday), r]));
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const r = byDay.get(weekday);
    if (!r) return { weekday, shape: null, opensAt: DEFAULT_OPENS, closesAt: DEFAULT_CLOSES };
    if (r.closed) return { weekday, shape: "closed", opensAt: DEFAULT_OPENS, closesAt: DEFAULT_CLOSES };
    if (r.open_24h) return { weekday, shape: "open24h", opensAt: DEFAULT_OPENS, closesAt: DEFAULT_CLOSES };
    return {
      weekday,
      shape: "range",
      opensAt: (r.opens_at ?? DEFAULT_OPENS).slice(0, 5),
      closesAt: (r.closes_at ?? DEFAULT_CLOSES).slice(0, 5),
    };
  });
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The table's own rule: closes_at <= opens_at means the range runs past midnight. */
export function draftWrapsMidnight(d: DayDraft): boolean {
  return d.shape === "range" && HHMM.test(d.opensAt) && HHMM.test(d.closesAt) && d.closesAt <= d.opensAt;
}

/** A draft as the existing hours helper reads a row, so labels match the venue page. */
export function draftAsHoursRow(d: DayDraft): HoursRow | undefined {
  if (d.shape === null) return undefined;
  return {
    weekday: d.weekday,
    closed: d.shape === "closed",
    open24h: d.shape === "open24h",
    opensAt: d.shape === "range" ? d.opensAt : null,
    closesAt: d.shape === "range" ? d.closesAt : null,
    wrapsMidnight: draftWrapsMidnight(d),
  };
}

/**
 * Per-weekday problems, keyed by weekday; empty when the seven rows can be
 * saved. Equal times are refused: the CHECK would accept 06:00–06:00 as a
 * 24-hour wrap, but "Open 24 hours" is the shape that says that.
 */
export function validateDrafts(drafts: DayDraft[]): Record<number, string> {
  const errors: Record<number, string> = {};
  const seen = new Set<number>();
  for (const d of drafts) {
    if (d.weekday < 1 || d.weekday > 7 || seen.has(d.weekday)) {
      errors[d.weekday] = "Each day can only appear once.";
      continue;
    }
    seen.add(d.weekday);
    if (d.shape === null) {
      errors[d.weekday] = "Choose Closed, Open 24 hours or a time range.";
    } else if (d.shape === "range") {
      if (!HHMM.test(d.opensAt) || !HHMM.test(d.closesAt)) {
        errors[d.weekday] = "Enter an opening and a closing time.";
      } else if (d.opensAt === d.closesAt) {
        errors[d.weekday] = "Opening and closing times are the same. Choose Open 24 hours instead.";
      }
    }
  }
  for (let w = 1; w <= 7; w++) {
    if (!seen.has(w) && !errors[w]) errors[w] = "Choose Closed, Open 24 hours or a time range.";
  }
  return errors;
}

/** The writable columns of one row, in exactly one of the three shapes. */
export type GymHoursWrite = {
  weekday: number;
  closed: boolean;
  open_24h: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export function toHoursWrite(d: DayDraft): GymHoursWrite {
  if (d.shape === "closed") return { weekday: d.weekday, closed: true, open_24h: false, opens_at: null, closes_at: null };
  if (d.shape === "open24h") return { weekday: d.weekday, closed: false, open_24h: true, opens_at: null, closes_at: null };
  return { weekday: d.weekday, closed: false, open_24h: false, opens_at: d.opensAt, closes_at: d.closesAt };
}

/**
 * Which rows to UPDATE (by id) and which to INSERT. Not an upsert: PostgREST
 * compiles that to ON CONFLICT DO UPDATE SET every column in the payload,
 * gym_id included, and gym_id is outside gym_hours' UPDATE grant on purpose.
 * Unchanged rows are left alone.
 */
export function hoursWritePlan(
  existing: GymHoursTableRow[],
  drafts: DayDraft[]
): { updates: { id: string; row: GymHoursWrite }[]; inserts: GymHoursWrite[] } {
  const byDay = new Map(existing.map((r) => [Number(r.weekday), r]));
  const updates: { id: string; row: GymHoursWrite }[] = [];
  const inserts: GymHoursWrite[] = [];
  for (const d of drafts) {
    if (d.shape === null) continue;
    const row = toHoursWrite(d);
    const old = byDay.get(d.weekday);
    if (!old) {
      inserts.push(row);
      continue;
    }
    const same =
      old.closed === row.closed &&
      old.open_24h === row.open_24h &&
      (old.opens_at?.slice(0, 5) ?? null) === row.opens_at &&
      (old.closes_at?.slice(0, 5) ?? null) === row.closes_at;
    if (!same) updates.push({ id: old.id, row });
  }
  return { updates, inserts };
}

// ---------------------------------------------------------------------------
// Logo and cover. Both buckets are public; the FIRST path segment must be the
// owner's own uid, or the object is refused by the write policy and, worse,
// invisible to the account-deletion purge.

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

/** business-logos: <owner_uid>/<file>. */
export function logoObjectPath(uid: string, fileId: string): string {
  return `${uid}/${fileId}.jpg`;
}

/** gym-covers: <owner_uid>/<gym_id>/<file>. */
export function coverObjectPath(uid: string, gymId: string, fileId: string): string {
  return `${uid}/${gymId}/${fileId}.jpg`;
}

/**
 * The previous object to remove after a replacement, or null. Only a valid
 * path in the caller's own prefix (the only one the delete policy allows),
 * and never the object that was just written.
 */
export function replacedObject(previous: string | null | undefined, uid: string, next: string): string | null {
  const p = storagePath(previous);
  if (!p || p === next || p.split("/")[0] !== uid) return null;
  return p;
}

// ---------------------------------------------------------------------------
// Errors

/**
 * The console's codes as a person reads them: ATX08 / ATX03 from the readers,
 * a refused write (42501, or an update RLS filtered to nothing) for staff,
 * and the gym_hours / gyms CHECKs.
 */
export function consoleMessage(code: string | undefined, serverMessage: string, fallback: string): string {
  switch (code) {
    case "ATX08":
      return "That venue or class couldn't be found.";
    case "ATX03":
      return "You don't manage this venue.";
    case "42501":
      return "You don't have access to change this. Ask the owner.";
    case "23514":
      return "That wasn't saved: each day must be closed, open 24 hours, or a from–to time.";
    case "23505":
      return "Those hours changed in another window. Reload and try again.";
    default:
      return stage4Message(code, serverMessage, fallback);
  }
}

/**
 * A label the server masked (Q-05). The server sends exactly a first name,
 * "Member #0042", or "Guest" (money readers, a payment with no account); a
 * bare "Member" from the server is a Database bug to report, not a state.
 * "Member" / "Client" here are only our own fallbacks for a missing label.
 * Avatars show the person glyph for these rather than an initial, which
 * would be the "M" of "Member".
 */
export function isMaskedLabel(label: string): boolean {
  return /^Member #\d+$/.test(label.trim()) || ["Guest", "Member", "Client"].includes(label.trim());
}
