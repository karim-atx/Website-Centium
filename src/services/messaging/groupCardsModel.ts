// Round D · group chat cards (Database 20261223040000; PLAN DT4): the places
// on a shared session, what its card offers, the group description's and the
// booking's refusals, and a meal plan's length. Pure: no supabase, no React.
//
// PLACES. shared_session_places(p_message_ids) answers, per session card the
// caller can still act on: capacity (null = no limit), taken, booked_by_me,
// bookable (free, not started, not the caller's own) and is_free. Full is not
// a flag: it is taken >= capacity. Free sessions only this round, no waitlist.

import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { BLOCKED_TEXT } from "../moderation/text";

/** The most cards shared_session_places reads at once (22023 over it). */
export const PLACES_BATCH = 200;
/** The longest group description set_group_description accepts. */
export const GROUP_DESCRIPTION_MAX = 500;
/** calendar_events.capacity's range; empty is no limit. */
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 500;

export interface SessionPlaces {
  messageId: string;
  eventId: string;
  capacity: number | null;
  taken: number;
  bookedByMe: boolean;
  bookable: boolean;
  isFree: boolean;
}

const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** shared_session_places rows, by message id. Rows without ids are dropped. */
export function parsePlaces(rows: unknown): Record<string, SessionPlaces> {
  const out: Record<string, SessionPlaces> = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.message_id !== "string" || typeof o.event_id !== "string") continue;
    const capacity = int(o.capacity);
    out[o.message_id] = {
      messageId: o.message_id,
      eventId: o.event_id,
      capacity: capacity !== null && capacity > 0 ? capacity : null,
      taken: Math.max(0, int(o.taken) ?? 0),
      bookedByMe: o.booked_by_me === true,
      bookable: o.bookable === true,
      isFree: o.is_free === true,
    };
  }
  return out;
}

/** Splits ids into batches the reader accepts, without repeats. */
export function placesBatches(ids: readonly string[], size = PLACES_BATCH): string[][] {
  const unique = [...new Set(ids)];
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += size) out.push(unique.slice(i, i + size));
  return out;
}

/** "{taken} of {capacity} places taken"; null with no limit (no line). */
export function placesLine(p: Pick<SessionPlaces, "capacity" | "taken"> | null | undefined): string | null {
  if (!p || p.capacity === null) return null;
  return `${p.taken} of ${p.capacity} ${p.capacity === 1 ? "place" : "places"} taken`;
}

export function isFull(p: Pick<SessionPlaces, "capacity" | "taken">): boolean {
  return p.capacity !== null && p.taken >= p.capacity;
}

/**
 * What the card offers the viewer:
 * - book: free, not started, a place left;
 * - cancel: they have a place and it hasn't started;
 * - booked: they have a place on a session that has started (nothing to do);
 * - ask: a paid session, booked with the professional ("Ask {pro}");
 * - full: free and no place left (no waitlist);
 * - none: their own session, an old card without places, or it has started.
 */
export type SessionAction =
  | { kind: "book" }
  | { kind: "cancel" }
  | { kind: "booked" }
  | { kind: "ask" }
  | { kind: "full"; capacity: number }
  | { kind: "none" };

export function sessionAction(
  p: SessionPlaces | null | undefined,
  opts: { mine: boolean; startsAt: string | null; now: number }
): SessionAction {
  if (!p || opts.mine) return { kind: "none" };
  const startMs = opts.startsAt ? Date.parse(opts.startsAt) : NaN;
  const started = Number.isFinite(startMs) && startMs <= opts.now;
  if (p.bookedByMe) return started ? { kind: "booked" } : { kind: "cancel" };
  if (!p.isFree) return started ? { kind: "none" } : { kind: "ask" };
  // The server's bookable is free, not started and not yours.
  if (!p.bookable || started) return { kind: "none" };
  if (p.capacity !== null && isFull(p)) return { kind: "full", capacity: p.capacity };
  return { kind: "book" };
}

/** After a booking or a cancel, the card's places straight away (the next read confirms). */
export function placesAfter(p: SessionPlaces, booked: boolean): SessionPlaces {
  if (booked === p.bookedByMe) return p;
  return { ...p, bookedByMe: booked, taken: Math.max(0, p.taken + (booked ? 1 : -1)) };
}

type Err = { code?: string | null; message?: string | null } | null | undefined;
const codeOf = (e: Err) => e?.code ?? "";
const isRateLimit = (e: Err) => codeOf(e) === "ATX02" || codeOf(e) === "429" || /rate.?limit/i.test(e?.message ?? "");

/** book_shared_session's refusals. `pro` is the professional's first name. */
export function describeBookingError(e: Err, pro: string): string {
  if (isOffline(e)) return OFFLINE_MESSAGE;
  if (isRateLimit(e)) return "You've booked a lot of sessions in the last hour. Try again later.";
  switch (codeOf(e)) {
    case "ATXM0":
      return "This session is full.";
    case "ATXM1":
      return `This is a paid session. Ask ${pro} to book it.`;
    case "ATX10":
      return "This session has already started.";
    case "ATX08":
      return "This session isn't available any more.";
    case "22023":
      return "You can't book your own session.";
    default:
      return "Couldn't book a place. Try again.";
  }
}

/** cancel_shared_session_booking's refusals. */
export function describeCancelError(e: Err): string {
  if (isOffline(e)) return OFFLINE_MESSAGE;
  if (codeOf(e) === "ATX08") return "You don't have a place on this session any more.";
  return "Couldn't cancel your booking. Try again.";
}

/** set_group_description's refusals (ATX44 / ATX45 / ATX08 as rename_group). */
export function describeDescriptionError(e: Err): string {
  if (isOffline(e)) return OFFLINE_MESSAGE;
  switch (codeOf(e)) {
    case "ATX60":
      return BLOCKED_TEXT;
    case "22023":
      return `Keep the description to ${GROUP_DESCRIPTION_MAX} characters or fewer.`;
    case "ATX44":
      return "Only the group's host can do that.";
    case "ATX45":
      return "This group has been closed.";
    case "ATX08":
      return "That group isn't available any more.";
    default:
      return "Couldn't save the description. Try again.";
  }
}

/** The description to send: trimmed, '' clears. Null when it is too long. */
export function descriptionToSend(text: string): string | null {
  const t = text.trim();
  return t.length > GROUP_DESCRIPTION_MAX ? null : t;
}

/** A meal plan's length on its card: "7 days". Never calories or macros. */
export function daysLabel(days: number | null | undefined): string | null {
  if (days === null || days === undefined || !Number.isFinite(days) || days < 1) return null;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** The capacity field: '' is no limit; otherwise a whole number 1 to 500. */
export function parseCapacity(text: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = text.trim();
  if (!t) return { ok: true, value: null };
  if (!/^\d+$/.test(t)) return { ok: false, message: `Places is a whole number from ${CAPACITY_MIN} to ${CAPACITY_MAX}. Leave it empty for no limit.` };
  const n = Number(t);
  if (n < CAPACITY_MIN || n > CAPACITY_MAX)
    return { ok: false, message: `Places is a whole number from ${CAPACITY_MIN} to ${CAPACITY_MAX}. Leave it empty for no limit.` };
  return { ok: true, value: n };
}

// ---------------------------------------------------------------------------
// A shared meal plan, opened from its card (Database 20261223060000,
// shared_meal_plan_detail): one row per item, in day and meal order. No
// calories or macros for anybody, and not the plan's own notes.
// ---------------------------------------------------------------------------

const SLOT_NAMES: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snacks", dinner: "Dinner" };

export interface SharedPlanItem {
  name: string;
  grams: number | null;
  servings: number | null;
  note: string | null;
}
export interface SharedPlanDay {
  index: number;
  /** "Day 1" when the plan has no label for it. */
  label: string;
  meals: { slot: string; title: string; items: SharedPlanItem[] }[];
}
export interface SharedPlan {
  id: string;
  name: string;
  days: number | null;
  dayList: SharedPlanDay[];
}

const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const textOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The rows grouped by day, then meal, keeping the server's order. Null when there are none (not a member, or the card is gone). */
export function parseSharedPlan(rows: unknown): SharedPlan | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const first = rows[0] as Record<string, unknown>;
  const id = textOrNull(first.meal_plan_id);
  if (!id) return null;
  const dayList: SharedPlanDay[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    const index = numOrNull(raw.day_index) ?? 0;
    let day = dayList[dayList.length - 1];
    if (!day || day.index !== index) {
      day = { index, label: textOrNull(raw.day_label) ?? `Day ${index + 1}`, meals: [] };
      dayList.push(day);
    }
    const slot = typeof raw.meal_slot === "string" ? raw.meal_slot : "snack";
    let meal = day.meals[day.meals.length - 1];
    if (!meal || meal.slot !== slot) {
      meal = { slot, title: SLOT_NAMES[slot] ?? "Meal", items: [] };
      day.meals.push(meal);
    }
    meal.items.push({ name: textOrNull(raw.name) ?? "Removed item", grams: numOrNull(raw.grams), servings: numOrNull(raw.servings), note: textOrNull(raw.note) });
  }
  return { id, name: textOrNull(first.plan_name) ?? "Meal plan", days: numOrNull(first.days_count), dayList };
}

/** "150 g", "1 serving", "1.5 servings", or null. Grams first when both are set. */
export function portionLabel(item: Pick<SharedPlanItem, "grams" | "servings">): string | null {
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (item.grams !== null && item.grams > 0) return `${trim(item.grams)} g`;
  if (item.servings !== null && item.servings > 0) return `${trim(item.servings)} ${item.servings === 1 ? "serving" : "servings"}`;
  return null;
}
