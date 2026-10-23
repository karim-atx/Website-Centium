// Pure MA1 rules (node --test loads this file): the listing strength list,
// the hours summary, class row flags, the Worth promoting rule, the 7-day
// feature range and the dates / percent formats.

import { hoursLines, type HoursRow } from "../../services/venues/hours";
import type { GymHoursTableRow } from "../../services/venues/consoleLogic";
import { time12 } from "../../utils/time12";

export type StrengthKey =
  | "logo"
  | "cover"
  | "photos"
  | "description"
  | "categories"
  | "address"
  | "hours"
  | "amenities"
  | "delivery"
  | "contact"
  | "firstVisit"
  | "returns"
  | "reviews";

export interface StrengthItem {
  key: StrengthKey;
  title: string;
  done: boolean;
  sub: string;
}

export interface StrengthInput {
  store: boolean;
  logo: boolean;
  cover: boolean;
  photos: number;
  /** B13 listing_strength "photos" (3 or more approved); without it, 6 photos. */
  photosDone?: boolean;
  description: boolean;
  categories: string[];
  address: string | null;
  hoursSummary: string | null;
  amenities: string[];
  /** B13 listing_strength "amenities" (any venue); without it, this venue's list. */
  amenitiesDone?: boolean;
  delivery: boolean;
  contact: boolean;
  firstVisit: boolean;
  returns: boolean;
  reviews: { average: number | null; count: number };
}

/** The 11 items in the board's order (source `CK`, lines 440-442), with live subs. */
export function strengthItems(i: StrengthInput): StrengthItem[] {
  const photosDone = i.photosDone ?? i.photos >= 6;
  const photoSub = photosDone ? "" : i.photos === 0 ? "0 of 6" : i.photos >= 6 ? `${i.photos} of 6` : `${i.photos} of 6 · add ${6 - i.photos} more`;
  const reviewsSub = i.reviews.count > 0 && i.reviews.average !== null ? `${i.reviews.average.toFixed(1)} · ${i.reviews.count} review${i.reviews.count === 1 ? "" : "s"}` : "None yet";
  const common = {
    logo: { key: "logo", title: "Logo", done: i.logo, sub: "" },
    cover: { key: "cover", title: "Cover photo", done: i.cover, sub: "" },
    photos: { key: "photos", title: "Photos", done: photosDone, sub: photoSub },
    description: { key: "description", title: "Description", done: i.description, sub: "" },
    address: { key: "address", title: "Address and map pin", done: !!i.address?.trim(), sub: i.address?.trim() || "Not set" },
    hours: { key: "hours", title: "Opening hours", done: !!i.hoursSummary, sub: i.hoursSummary ?? "Not set" },
    contact: { key: "contact", title: "Contact and social links", done: i.contact, sub: "" },
    reviews: { key: "reviews", title: "Reviews", done: i.reviews.count > 0, sub: reviewsSub },
  } satisfies Record<string, StrengthItem>;
  const cats = i.categories.join(", ");
  if (i.store)
    return [
      common.logo,
      common.cover,
      common.photos,
      common.description,
      { key: "categories", title: "Category", done: i.categories.length > 0, sub: cats || "Not set" },
      common.address,
      common.hours,
      { key: "delivery", title: "Delivery and pickup", done: i.delivery, sub: i.delivery ? "" : "Not set" },
      common.contact,
      { key: "returns", title: "Returns and first-order info", done: i.returns, sub: i.returns ? "" : "Not set" },
      common.reviews,
    ];
  return [
    common.logo,
    common.cover,
    common.photos,
    common.description,
    { key: "categories", title: "Activities", done: i.categories.length > 0, sub: cats || "Not set" },
    common.address,
    common.hours,
    { key: "amenities", title: "Amenities", done: i.amenitiesDone ?? i.amenities.length > 0, sub: i.amenities.join(", ") || "Not set" },
    common.contact,
    { key: "firstVisit", title: "What to bring, first visit", done: i.firstVisit, sub: i.firstVisit ? "" : "Not set" },
    common.reviews,
  ];
}

/** Not-done items first (original order), then done (source `order`). */
export function checklistOrder(items: StrengthItem[]): StrengthItem[] {
  return items
    .map((x, i) => [x, i] as const)
    .sort((a, b) => (a[0].done === b[0].done ? a[1] - b[1] : a[0].done ? 1 : -1))
    .map(([x]) => x);
}

/** The strength line (MA1-001 row 5c). */
export function strengthLine(items: StrengthItem[], emptyLine: string): string {
  const done = items.filter((x) => x.done).length;
  const missing = items.length - done;
  if (missing === 0) return "Your listing is complete.";
  if (done === 0) return emptyLine;
  return `Add ${missing === 1 ? "1 more item" : `${missing} more items`}. Complete listings get more profile opens.`;
}

export const strengthPct = (items: StrengthItem[]): number => Math.round((items.filter((x) => x.done).length / Math.max(1, items.length)) * 100);

const toHoursRow = (r: GymHoursTableRow): HoursRow => ({
  weekday: Number(r.weekday),
  closed: r.closed,
  open24h: r.open_24h,
  opensAt: r.opens_at,
  closesAt: r.closes_at,
  wrapsMidnight: !!r.opens_at && !!r.closes_at && r.closes_at.slice(0, 5) <= r.opens_at.slice(0, 5),
});

/**
 * "Mon to Fri 6:00 AM to 9:00 PM, weekends 8:00 AM to 2:00 PM" (MA1-031 row 3,
 * 12-hour). Null until all seven days are published.
 */
export function hoursSummary(rows: GymHoursTableRow[] | null): string | null {
  if (!rows) return null;
  const days = new Set(rows.map((r) => Number(r.weekday)));
  if (![1, 2, 3, 4, 5, 6, 7].every((d) => days.has(d))) return null;
  return hoursLines(rows.map(toHoursRow), null)
    .map((l) => `${l.label === "Sat to Sun" ? "weekends" : l.label} ${l.value}`)
    .join(", ");
}

// ---------------------------------------------------------------------------
// The B-MA tabs (Business Marketplace Screens `topTabs`)

export type MarketTabKey = "overview" | "showcase" | "offers" | "perf";
export const MARKET_TAB_KEYS: MarketTabKey[] = ["overview", "showcase", "offers", "perf"];

/**
 * A `?tab=` value (new or old) to a B-MA tab. The MA1 Marketplace keys
 * (listing, spots → Overview; promo → Offers) and the old Store Products keys
 * (products → Showcase, listing → Overview, performance → Performance,
 * promotions → Offers) keep working; anything else is `fallback`.
 */
export function tabKeyOf(raw: string | null | undefined, fallback: MarketTabKey): MarketTabKey {
  switch (raw) {
    case "overview":
    case "showcase":
    case "offers":
    case "perf":
      return raw;
    case "listing":
    case "spots":
      return "overview";
    case "promo":
    case "promotions":
      return "offers";
    case "performance":
      return "perf";
    case "products":
      return "showcase";
    default:
      return fallback;
  }
}

// ---------------------------------------------------------------------------
// Dates

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const isoOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dateOf = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number): string => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
/** "Oct 6" */
export const dayMonth = (iso: string): string => {
  const d = dateOf(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
/** Inclusive day count from a to b. */
export const daysBetween = (a: string, b: string): number => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86_400_000) + 1;

/** MA1-118 row 1: days left counts today; the last day reads "Last day". */
export function daysLeft(today: string, end: string): string {
  const n = daysBetween(today, end);
  if (n <= 1) return "Last day";
  return `${n} days left`;
}

/** MA1-005 row 6e: one decimal under 10%, whole above. */
export function pct(n: number, d: number): string {
  if (!d) return "0%";
  const v = (n / d) * 100;
  return v < 10 ? `${v.toFixed(1)}%` : `${Math.round(v)}%`;
}

/** "Mon 7:30 PM" (12-hour, X-14). */
export function dowTime(iso: string, hhmm: string): string {
  const d = dateOf(iso);
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} ${time12(hhmm)}`;
}

// ---------------------------------------------------------------------------
// Class rows (MA1-003 row 7b flags) and Worth promoting (MA1-007 W1)

export type ClassFlag = "almost" | "low" | "ended" | null;

export function classFlag(booked: number, capacity: number, startMs: number, endMs: number, nowMs: number): ClassFlag {
  if (endMs <= nowMs) return "ended";
  if (capacity > 0 && booked / capacity >= 0.8) return "almost";
  if (capacity > 0 && booked / capacity < 0.5 && startMs - nowMs <= 48 * 3_600_000) return "low";
  return null;
}

/** "in 4 hours" / "tomorrow" / "today" for the suggestion sub. */
export function whenFromNow(startMs: number, nowMs: number, todayIso: string, dateIso: string): string {
  const h = Math.round((startMs - nowMs) / 3_600_000);
  if (dateIso === todayIso) return h <= 1 ? "within the hour" : `in ${h} hours`;
  if (dateIso === addDays(todayIso, 1)) return "tomorrow";
  return dayMonth(dateIso);
}

/** A class that has not ended yet (date + end time after now). */
export const notEnded = (x: { date: string; endTime: string }, nowMs: number): boolean => new Date(`${x.date}T${x.endTime}:00`).getTime() > nowMs;

/** Monday of the week holding `iso`. */
export function mondayOf(iso: string): string {
  const d = dateOf(iso);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return isoOf(d);
}
