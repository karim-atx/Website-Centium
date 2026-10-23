import { formatShortDate } from "../../utils/date";
import { minutesOfDay, time12, time12Split } from "../../utils/time12";

// Market + Share 3.0 · W2 · the class card (C-MO.4.3 `classCards`), the class
// detail's seat panel (C-MO.4.3.1 `seatPanel`, `seats`, `seatCols`) and the
// booking sheet / confirmation lines (C-MO.4.3.2), as pure rules (no DOM, no
// Supabase) so node --test covers them. Client Explore Screens' script:
//   classCards: booked "{b} of {cap} booked", pct round(b / cap × 100)
//   seatPanel:  bg left <= 3 ? #E6F1EF : #EEEAF8, almost = left <= 3, fig "{left} of {cap}"
//   seatDots:   cap <= 36 (else the bar); seatCols = ceil(cap / ceil(cap / 12))
//   seats:      the first `booked` booked (#AEA1DC), the rest free (#E6F1EF, #4F8F8A ring)
// Times are 12-hour (D-03), dates month first (D-02).

/**
 * The MarketplaceClass fields these rules read (services/marketplace), kept
 * here so the tested module doesn't load the Supabase client.
 */
export interface ClassFacts {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  businessName: string;
  venueName?: string | null;
  instructorName?: string | null;
  maxCapacity: number;
  bookedCount: number;
  spotsRemaining: number;
  isFull: boolean;
  price: string;
  priceValue: number | null;
}
type MarketplaceClass = ClassFacts;

/** Minutes from start to end ("07:00" → "07:45" = 45); an end at or before the start wraps past midnight. Null when unreadable. */
export function durationMinutes(start: string | null | undefined, end: string | null | undefined): number | null {
  const a = minutesOfDay(start);
  const b = minutesOfDay(end);
  if (a === null || b === null) return null;
  const d = b > a ? b - a : b + 1440 - a;
  return d > 0 && d < 1440 ? d : null;
}

/** "45 min" (the board's form, minutes always: "60 min"); "" when unknown. */
export function durationText(start: string | null | undefined, end: string | null | undefined): string {
  const d = durationMinutes(start, end);
  return d === null ? "" : `${d} min`;
}

const atMidnight = (iso: string) => new Date(`${iso}T00:00:00`);

/** A class 7 or more days out, whose weekday alone would not say which week (the card then names the date). */
export function farOff(iso: string, now: Date = new Date()): boolean {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return atMidnight(iso).getTime() - today.getTime() >= 7 * 86_400_000;
}

/** "Rana K." from "Rana Khoury"; a single name stays as it is ("Rana"). */
export function shortName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** The venue the class is held at: the gym's name, else the business's. */
export const venueOf = (c: Pick<MarketplaceClass, "venueName" | "businessName">) => c.venueName?.trim() || c.businessName;

/** The board's "Instructor not listed" when the class names no Team instructor (instructorRule.ts). */
export const NOT_LISTED = "Instructor not listed";

export type ClassStub = "price" | "booked" | "full";

export interface ClassCardLines {
  /** "6:30" and "PM" (the meridiem drawn smaller after the time, D-03). */
  time: { time: string; meridiem: string } | null;
  /** "45 min". */
  dur: string;
  /** "{venue} · {instructor or 'Instructor not listed'}" (the instructor alone on the gym's own tab). */
  sub: string;
  /** "6 of 16 booked", led by the date for a class a week or more out ("Oct 30 · 6 of 16 booked"). */
  booked: string;
  /** The bar's fill, 0–100. */
  pct: number;
  /** For this viewer (viewerSpotsLeft already applied by the caller): "Full", or "2 spots left" when the viewer's own limit is below the class's. */
  extra: string | null;
  stub: ClassStub;
  /** "$12", or "Free". */
  price: string;
}

export function classCardLines(
  c: Pick<
    MarketplaceClass,
    "date" | "startTime" | "endTime" | "title" | "businessName" | "venueName" | "instructorName" | "maxCapacity" | "bookedCount" | "spotsRemaining" | "isFull" | "price" | "priceValue"
  >,
  opts: { booked: boolean; hideVenue?: boolean; now?: Date }
): ClassCardLines {
  const cap = Math.max(0, c.maxCapacity);
  const b = Math.min(cap, Math.max(0, c.bookedCount));
  const who = c.instructorName?.trim() ? shortName(c.instructorName) : NOT_LISTED;
  const full = c.isFull || c.spotsRemaining <= 0;
  // The viewer's own limit (B13 MK-04) when it is below what the class has left.
  const limited = !full && c.spotsRemaining < cap - b;
  const date = farOff(c.date, opts.now) ? formatShortDate(atMidnight(c.date), { month: "short", day: "numeric" }) : null;
  const t = time12Split(c.startTime);
  return {
    time: t,
    dur: durationText(c.startTime, c.endTime),
    sub: opts.hideVenue ? who : `${venueOf(c)} · ${who}`,
    booked: `${date ? `${date} · ` : ""}${b} of ${cap} booked`,
    pct: cap > 0 ? Math.round((b / cap) * 100) : 0,
    extra: opts.booked ? null : full ? "Full" : limited ? `${c.spotsRemaining} ${c.spotsRemaining === 1 ? "spot" : "spots"} left` : null,
    stub: opts.booked ? "booked" : full ? "full" : "price",
    price: c.priceValue ? c.price : "Free",
  };
}

// ---------------------------------------------------------------------------
// The class detail's seat panel

export type SeatTone = "open" | "almost" | "full";

/** The panel's state: "almost" with 1 to 3 left (the board's `left <= 3`), "full" with none (not drawn: the lavender panel and "Class full"). */
export function seatTone(left: number): SeatTone {
  if (left <= 0) return "full";
  return left <= 3 ? "almost" : "open";
}

export interface SeatLayout {
  /** Dots up to 36 places, the thin bar above. */
  kind: "dots" | "bar";
  /** The dot grid's columns: ceil(cap / ceil(cap / 12)). */
  cols: number;
  /** One entry per place, true = taken; the taken ones first. */
  seats: boolean[];
}

export function seatLayout(capacity: number, taken: number): SeatLayout {
  const cap = Math.max(0, Math.floor(capacity));
  const t = Math.min(cap, Math.max(0, Math.floor(taken)));
  const dots = cap <= 36;
  return {
    kind: dots ? "dots" : "bar",
    cols: dots && cap > 0 ? Math.ceil(cap / Math.ceil(cap / 12)) : 1,
    seats: Array.from({ length: cap }, (_, i) => i < t),
  };
}

// ---------------------------------------------------------------------------
// Dates and the booking lines (D-02 month first, D-03 12-hour)

/** The time card's caps line: "Friday, October 16" (the board's "Friday 16 October", month first). */
export const longDate = (iso: string) => formatShortDate(atMidnight(iso), { weekday: "long", month: "long", day: "numeric" });

/** "Fri, Oct 16". */
export const shortDate = (iso: string) => formatShortDate(atMidnight(iso), { weekday: "short", month: "short", day: "numeric" });

/** The sheet's ticket line: "Fri, Oct 16 · 6:30 PM · 45 min" (the board's "Fri 16 Oct · 18:30 · 45 min"). */
export function sheetWhen(c: Pick<MarketplaceClass, "date" | "startTime" | "endTime">): string {
  return [shortDate(c.date), time12(c.startTime), durationText(c.startTime, c.endTime)].filter(Boolean).join(" · ");
}

/** The confirmation's When row: "Fri, Oct 16, 6:30 PM" (the board's "Fri 16 Oct, 6:30 PM"). */
export function doneWhen(c: Pick<MarketplaceClass, "date" | "startTime">): string {
  const t = time12(c.startTime);
  return t ? `${shortDate(c.date)}, ${t}` : shortDate(c.date);
}

/** The sheet's place line: "{venue} · {instructor short}", the venue alone when nobody is listed. */
export function sheetPlace(c: Pick<MarketplaceClass, "venueName" | "businessName" | "instructorName">): string {
  const who = shortName(c.instructorName);
  return who ? `${venueOf(c)} · ${who}` : venueOf(c);
}

/** The confirmation's Payment row: "$12 · Cash before class", or "Free". */
export const paymentLine = (price: string, free: boolean) => (free ? "Free" : `${price} · Cash before class`);

/** "Spin 45 is in your bookings." plus the venue's own first-visit line when it has one. */
export function doneBody(title: string, firstVisit: string | null | undefined): string {
  const first = firstVisit?.trim();
  return first ? `${title} is in your bookings. ${first}` : `${title} is in your bookings.`;
}
