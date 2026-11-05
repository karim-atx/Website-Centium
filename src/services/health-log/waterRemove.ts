// Round I · FA: taking water back (Database 20261226450000, Round I · FA in
// HANDOVER_API.md). Pure rules, apart from the calls, so they are tested
// without a server.
//
// unlog_water(p_ml, p_day, p_request_id) takes p_ml off that day's drinks
// logged by hand (source 'manual'), newest first: each is deleted or shrunk
// (never below 10 ml). It never removes more than asked, never touches water
// imported from Apple Health, Health Connect or Whoop, and stops when the
// hand-logged water runs out, so the day never goes below 0. It answers
// removed_ml, which is what to show (less than asked when there was less).
// clear_water_day(p_day, p_request_id) removes every hand-logged drink of
// the day ("Delete day"). Both rewrite the day's total themselves: nothing
// writes a health_metrics total after them.
//
// Both take only today or the 7 days before it (22023 otherwise), in the
// person's own calendar, and a request id that makes a replay answer
// already_saved and change nothing, so the offline queue can resend them.

import { tk } from "../../i18n/core";

/** The days a removal may name: today and the 7 before it. */
export const WATER_CHANGE_DAYS = 7;

/** "YYYY-MM-DD" minus n days (calendar arithmetic, no time zone). */
function minusDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Whether water on `day` can still be taken back (today or the 7 days before). */
export function canChangeWaterDay(day: string, today: string): boolean {
  return day <= today && day >= minusDays(today, WATER_CHANGE_DAYS);
}

type DrinkLike = { day: string; ml: number; source: string };
type QueuedLike =
  | { kind: "water"; ml: number; day: string }
  | { kind: "water_remove"; ml: number; day: string }
  | { kind: "water_clear"; day: string }
  | { kind: string; day?: string; ml?: number };

/**
 * How much of `day` can be taken back: its hand-logged drinks, plus drinks
 * still waiting in the outbox, less removals already waiting (in order; a
 * waiting "clear" empties it). Imported water never counts.
 */
export function removableWaterMl(day: string, drinks: readonly DrinkLike[], queued: readonly QueuedLike[] = []): number {
  let ml = drinks.filter((k) => k.day === day && k.source === "manual").reduce((s, k) => s + k.ml, 0);
  for (const q of queued) {
    if (q.day !== day) continue;
    if (q.kind === "water") ml += q.ml ?? 0;
    else if (q.kind === "water_remove") ml = Math.max(0, ml - (q.ml ?? 0));
    else if (q.kind === "water_clear") ml = 0;
  }
  return ml;
}

/** The toast after a removal: what was removed (the server's removed_ml), and why it's less when it is. */
export function removedMessage(askedMl: number, removedMl: number): { key: string; n: number } {
  if (removedMl <= 0) return { key: NOTHING_TO_REMOVE, n: 0 };
  if (removedMl < askedMl) return { key: REMOVED_ALL, n: removedMl };
  return { key: REMOVED, n: removedMl };
}

export const REMOVED = tk("{n} ml removed");
export const REMOVED_ALL = tk("{n} ml removed. That was all the water you'd logged.");
export const NOTHING_TO_REMOVE = tk("There's no water you logged to take off.");
export const DAY_CLEARED = tk("Water for the day deleted");
export const OUTSIDE_WINDOW = tk("You can change water for today and the 7 days before only.");
