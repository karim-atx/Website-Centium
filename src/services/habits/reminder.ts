// Batch D FZ: a reminder time per habit (habit_items.reminder_time).
//
// THE SERVER SENDS THE PUSH. The column is a Postgres `time`, a local
// wall-clock in the member's profile time zone (null = no reminder); a cron
// each minute pushes once per habit per day when that time has come, the habit
// isn't archived and isn't ticked that day. The app only sets, clears and
// shows the time, so everything here is about the value's shape.
//
// Pure (no Supabase import), so node --test loads it.

/** A new reminder's first value (FZ: the brief names none; OURS). */
export const DEFAULT_REMINDER = "08:00";

/**
 * A stored or typed time -> "HH:MM" (24-hour, zero-padded), or null.
 * The server sends `time` as "07:05:00"; "7:05" and "07:05" read the same.
 * Null, empty and anything unreadable are null: an unreadable time is never
 * shown as if it were set.
 */
export function parseReminderTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59 || (m[3] !== undefined && Number(m[3]) > 59)) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Minutes since midnight of a reminder time, or null. */
export function reminderMinutes(value: unknown): number | null {
  const hhmm = parseReminderTime(value);
  if (hhmm === null) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight -> "HH:MM" (wraps past midnight either way). */
export function reminderFromMinutes(minutes: number): string {
  const t = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Two reminder values are the same time (null = none; "07:05:00" = "07:05"). */
export function sameReminder(a: unknown, b: unknown): boolean {
  return parseReminderTime(a) === parseReminderTime(b);
}

/**
 * The read or write failed because habit_items has no reminder_time yet: the
 * Database migration (20261227120000) isn't live. PostgREST says PGRST204
 * ("Could not find the 'reminder_time' column ... in the schema cache") for a
 * write and 42703 ("column habit_items.reminder_time does not exist") for a
 * select. Only an error naming the column counts, so any other failure is
 * still shown as one.
 */
export function isMissingReminderColumn(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (!/reminder_time/.test(message)) return false;
  return code === "PGRST204" || code === "42703" || /does not exist|schema cache|could not find/i.test(message);
}

/** Why a habit's reminder would not arrive, from MO1.8.3's switches; null = it would. */
export type HabitRemindersOff = "all" | "paused" | "habits" | null;

/**
 * The master switch off stops everything; Pause reminders stops the reminder
 * family; the Habits switch stops habit reminders (FZ: all three apply to the
 * per-habit push as to the 20:00 nudge). Unknown prefs (not read yet, or the
 * read failed) say nothing rather than guess.
 */
export function habitRemindersOff(prefs: { allow: boolean; habits: boolean; remindersPaused: boolean } | null | undefined): HabitRemindersOff {
  if (!prefs) return null;
  if (!prefs.allow) return "all";
  if (prefs.remindersPaused) return "paused";
  if (!prefs.habits) return "habits";
  return null;
}
