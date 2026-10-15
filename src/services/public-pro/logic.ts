// Release 3 · W7 public professional pages (/i/{code}, /p/{handle},
// /p/{handle}/book) and the client profile's MO3 sections: the pure rules.
// No Supabase import, so node --test loads it.

import { rangeClock12 } from "../../utils/time12";

/** The error codes the booking readers and request raise (HANDOVER_API Release 3). */
export const NOT_TAKING_BOOKINGS = "This professional isn't taking bookings from you.";
export const SLOT_TAKEN = "That time is no longer free.";

/** A booking error code as the words the contract gives. */
export function describeBookingError(code: string | undefined, offline = false): string {
  if (offline) return "You're offline. Try again when you're connected.";
  if (code === "ATXG5") return NOT_TAKING_BOOKINGS;
  if (code === "ATXG6") return SLOT_TAKEN;
  if (code === "ATXF4") return "That session type isn't available any more.";
  if (code === "ATX02") return "You've sent several booking requests in the last hour. Try again later.";
  if (code === "ATX01" || code === "PGRST301") return "Sign in to book this session.";
  return "Couldn't book this session. Try again.";
}

/** Local "YYYY-MM-DD" (the device's calendar day, not UTC). */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The Monday that starts the week holding `d` (weeks start on Monday). */
export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** The seven days of a Monday-first week, from its Monday. */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

/** M T W T F S S, Monday first. */
export const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;
export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface Slot {
  startsAt: string;
  endsAt: string;
}

/** Slots grouped by the device's local day, each day in time order. */
export function slotsByDay(slots: Slot[]): Map<string, Slot[]> {
  const out = new Map<string, Slot[]>();
  for (const s of [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = localDay(new Date(s.startsAt));
    const list = out.get(key);
    if (list) list.push(s);
    else out.set(key, [s]);
  }
  return out;
}

/**
 * How many sessions fit in a day's open starts. The slot engine offers a
 * start every 15 minutes, so the raw count overstates what can be booked;
 * this counts the sessions that could all be booked together (the earliest
 * start, then the next one after it ends).
 */
export function sessionsThatFit(slots: Slot[]): number {
  let n = 0;
  let freeFrom = -Infinity;
  for (const s of [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const start = new Date(s.startsAt).getTime();
    if (start >= freeFrom) {
      n += 1;
      freeFrom = new Date(s.endsAt).getTime();
    }
  }
  return n;
}

/** "6:00 to 7:00 PM" for a slot, in the device's local time. */
export function slotLabel(s: Slot): string {
  return rangeClock12(s.startsAt, s.endsAt);
}

/** "Mon 19 Oct" for a local day key. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${WEEKDAY_SHORT[(date.getDay() + 6) % 7]} ${d} ${month}`;
}

/** What an invite link lets the visitor do. */
export type InviteView =
  | { kind: "unusable"; message: string }
  | { kind: "signed_out" }
  | { kind: "not_client" }
  | { kind: "own" }
  | { kind: "client" };

export function inviteView(
  preview: { usable: boolean; usableMessage: string | null; professionalId: string },
  viewer: { userId: string | null; accountType: string | null }
): InviteView {
  if (!preview.usable) return { kind: "unusable", message: preview.usableMessage?.trim() || "That invite link can't be used any more." };
  if (!viewer.userId) return { kind: "signed_out" };
  if (viewer.userId === preview.professionalId) return { kind: "own" };
  if (viewer.accountType && viewer.accountType !== "customer") return { kind: "not_client" };
  return { kind: "client" };
}

/** A request's decline as the client reads it: the professional's note, else the reason's label. */
export function declineText(label: string | null, message: string | null): string | null {
  const note = message?.trim();
  if (note) return `"${note}"`;
  const l = label?.trim();
  return l ? `${l}.` : null;
}

/**
 * The professional can undo a decline for 5 minutes, and the client hears of
 * it only once that has passed (HANDOVER_API "Five small additions").
 */
export const DECLINE_UNDO_MS = 5 * 60 * 1000;
export function declineIsFinal(resolvedAt: string | null, now = Date.now()): boolean {
  if (!resolvedAt) return false;
  const t = new Date(resolvedAt).getTime();
  return Number.isFinite(t) && now - t >= DECLINE_UNDO_MS;
}

/** The request message's limit (pending_client_requests.message ≤ 500). */
export const REQUEST_MESSAGE_MAX = 500;

// ---------------------------------------------------------------------------
// Coming back after signing in
// ---------------------------------------------------------------------------

/** Only our own public pages are kept as a place to return to. */
export function isPublicReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  return /^\/(i\/[A-Za-z0-9-]{1,64}|p\/[a-z0-9._-]{1,64}(\/book)?)(\?[A-Za-z0-9=&_:.%-]{0,200})?$/.test(path);
}

/** A stored return lasts an hour: long enough to sign up, short enough to never surprise. */
export const RETURN_TTL_MS = 60 * 60 * 1000;

export function readReturn(raw: string | null, now = Date.now()): string | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof v.path !== "string" || typeof v.at !== "number") return null;
    if (now - v.at > RETURN_TTL_MS || now < v.at - 60_000) return null;
    return isPublicReturnPath(v.path) ? v.path : null;
  } catch {
    return null;
  }
}
