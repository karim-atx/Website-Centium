import type { EventAlert } from "./eventAlert";
import { t, tk } from "../../i18n/core";

// CU7 (Release 3): the two lines a professional's session invitation gains on
// the client's calendar. Pure, so the wording is tested without Supabase.
//
//   Day / Week card: "$60 from your session pack · 6 left"
//                    "Alex reminds you 1 h before"
//   Month agenda:    "Reminder 1 h before · from Alex"

/** How far before, as the frames write it ("1 h"); null for none and at_time. */
const SHORT: Partial<Record<EventAlert, string>> = {
  min_5: tk("5 min"),
  min_10: tk("10 min"),
  min_15: tk("15 min"),
  min_30: tk("30 min"),
  hour_1: tk("1 h"),
  hour_2: tk("2 h"),
  day_1: tk("1 day"),
  day_2: tk("2 days"),
  week_1: tk("1 week"),
};

/** Minutes before the start, to put the earlier reminder first. */
const OFFSET: Record<EventAlert, number> = {
  none: -1,
  at_time: 0,
  min_5: 5,
  min_10: 10,
  min_15: 15,
  min_30: 30,
  hour_1: 60,
  hour_2: 120,
  day_1: 1440,
  day_2: 2880,
  week_1: 10080,
};

/**
 * The professional's reminders (calendar_event_invitees.alert / alert_2) as
 * one phrase: "1 h before", "1 day and 1 h before", "at the start",
 * "1 h before and at the start". Null when neither is set.
 */
export function reminderPhrase(a: EventAlert, b: EventAlert): string | null {
  const set = [...new Set([a, b])].filter((x) => x !== "none").sort((x, y) => OFFSET[y] - OFFSET[x]);
  if (set.length === 0) return null;
  const before = set
    .filter((x) => x !== "at_time")
    .map((x) => SHORT[x])
    .filter((k): k is string => !!k)
    .map((k) => t(k));
  const parts: string[] = [];
  if (before.length === 1) parts.push(t("{a} before", { a: before[0] }));
  else if (before.length > 1) parts.push(t("{a} and {b} before", { a: before[0], b: before[1] }));
  if (set.includes("at_time")) parts.push(t("at the start"));
  return parts.length > 1 ? t("{a} and {b}", { a: parts[0], b: parts[1] }) : parts[0];
}

/** Day / Week card line: "Alex reminds you 1 h before". */
export function reminderLine(first: string, a: EventAlert, b: EventAlert): string | null {
  const phrase = reminderPhrase(a, b);
  return phrase ? t("{name} reminds you {phrase}", { name: first, phrase }) : null;
}

/** Month agenda line: "Reminder 1 h before · from Alex" (two: "Reminders …"). */
export function monthReminderLine(first: string, a: EventAlert, b: EventAlert): string | null {
  const phrase = reminderPhrase(a, b);
  if (!phrase) return null;
  const two = a !== "none" && b !== "none" && a !== b;
  return two ? t("Reminders {phrase} · from {name}", { phrase, name: first }) : t("Reminder {phrase} · from {name}", { phrase, name: first });
}

/** "$60 from your session pack · 6 left"; without a price, "From your session pack · 6 left". */
export function packLine(price: string, left: number): string {
  return price ? t("{price} from your session pack · {n} left", { price, n: left }) : t("From your session pack · {n} left", { n: left });
}
