// MO1.8.3's switches as app_preferences columns (Stage A2, HANDOVER_API.md
// "The MO1.8.3 switches"). Pure: no Supabase import, so the mapping, the quiet
// hours rules and the error sentences are unit-tested on their own.
//
// EVERY ROW ON THE SCREEN IS ONE COLUMN, and the database holds the defaults
// (every category and the master on, quiet hours off but stored as 22:00 to
// 07:00). Nothing in here invents a default: a value the server did not send
// is not a value the screen shows.

import { isOffline, OFFLINE_MESSAGE } from "../network-error";

export type NotificationPrefs = {
  /** "Allow notifications", the master (BR-12). Off: the server sends nothing. */
  allow: boolean;
  mealReminders: boolean;
  workoutReminders: boolean;
  water: boolean;
  habits: boolean;
  journal: boolean;
  streakAlerts: boolean;
  weeklySummary: boolean;
  forumReplies: boolean;
  mentions: boolean;
  professionalMessages: boolean;
  calendarEvents: boolean;
  memberships: boolean;
  referralRewards: boolean;
  quietHoursEnabled: boolean;
  /** "HH:MM", 24-hour, in the person's own timezone (profiles.timezone). */
  quietHoursFrom: string;
  /** "HH:MM", exclusive end. From > To is the normal case: it wraps midnight. */
  quietHoursTo: string;
};

export type NotificationPrefKey = keyof NotificationPrefs;
export type NotificationToggleKey = Exclude<NotificationPrefKey, "quietHoursFrom" | "quietHoursTo">;

/** The screen's name for each value -> its column (the contract's table). */
export const NOTIFICATION_COLUMNS = {
  allow: "notification_allow",
  mealReminders: "notification_meal_reminders",
  workoutReminders: "notification_workout_reminders",
  water: "notification_water",
  habits: "notification_habits",
  journal: "notification_journal",
  streakAlerts: "notification_streak_alerts",
  weeklySummary: "notification_weekly_summary",
  forumReplies: "notification_forum_replies",
  mentions: "notification_mentions",
  professionalMessages: "notification_professional_messages",
  calendarEvents: "notification_calendar_events",
  memberships: "notification_memberships",
  referralRewards: "notification_referral_rewards",
  quietHoursEnabled: "quiet_hours_enabled",
  quietHoursFrom: "quiet_hours_from",
  quietHoursTo: "quiet_hours_to",
} as const satisfies Record<NotificationPrefKey, string>;

type Column = (typeof NOTIFICATION_COLUMNS)[NotificationPrefKey];

/**
 * The row as PostgREST returns it. quiet_hours_from / _to are Postgres `time`,
 * which comes back as "22:00:00"; booleans are NOT NULL.
 */
export type NotificationRow = { [C in Column]: C extends "quiet_hours_from" | "quiet_hours_to" ? string : boolean };

/** The SELECT list: exactly the MO1.8.3 columns. */
export const NOTIFICATION_SELECT = Object.values(NOTIFICATION_COLUMNS).join(", ");

const KEYS = Object.keys(NOTIFICATION_COLUMNS) as NotificationPrefKey[];

/** "22:00:00" or "22:00" -> "22:00". Anything unreadable -> null. */
export function toHhmm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * A row -> the screen's values. Null when any column is missing or of the wrong
 * type: the screen then shows the failed state rather than a guess.
 */
export function rowToNotificationPrefs(row: Partial<Record<string, unknown>> | null | undefined): NotificationPrefs | null {
  if (!row) return null;
  const out: Partial<Record<NotificationPrefKey, boolean | string>> = {};
  for (const k of KEYS) {
    const v = row[NOTIFICATION_COLUMNS[k]];
    if (k === "quietHoursFrom" || k === "quietHoursTo") {
      const t = toHhmm(v);
      if (t === null) return null;
      out[k] = t;
    } else {
      if (typeof v !== "boolean") return null;
      out[k] = v;
    }
  }
  return out as NotificationPrefs;
}

/**
 * The changed values -> only their columns (column-level updates: never the
 * whole row). Times go out as "HH:MM", which `time` accepts.
 */
export function notificationPatchToRow(patch: Partial<NotificationPrefs>): Partial<NotificationRow> {
  const out: Record<string, boolean | string> = {};
  for (const k of KEYS) {
    const v = patch[k];
    if (v === undefined) continue;
    out[NOTIFICATION_COLUMNS[k]] = k === "quietHoursFrom" || k === "quietHoursTo" ? (toHhmm(v) ?? String(v)) : v;
  }
  return out as Partial<NotificationRow>;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** The CHECK the table enforces (from <> to), asked before anything is sent. */
export function sameQuietTime(from: string, to: string): boolean {
  return minutes(from) === minutes(to);
}

/** 22:00 to 07:00: the window runs past midnight. That is the normal case. */
export function wrapsMidnight(from: string, to: string): boolean {
  return minutes(from) > minutes(to);
}

/**
 * Whether a local "HH:MM" falls inside the window, exactly as should_notify()
 * reads it: at or after From and before To, or, when it wraps, at or after
 * From OR before To.
 */
export function inQuietWindow(local: string, from: string, to: string): boolean {
  const t = minutes(local);
  const f = minutes(from);
  const e = minutes(to);
  if (f < e) return t >= f && t < e;
  return t >= f || t < e;
}

/** What the window means, in words (the Quiet hours row's description). */
export function describeQuietWindow(from: string, to: string): string {
  const span = wrapsMidnight(from, to)
    ? `from ${from} until ${to} the next morning`
    : `from ${from} until ${to}`;
  return `Notifications that would arrive ${span}, your time, are not sent, and are not saved for later.`;
}

export const SAME_QUIET_TIME_MESSAGE = "Quiet hours can't start and end at the same time. Pick a different time.";

/** A Postgres / PostgREST error on this table -> a sentence. */
export function describeNotificationError(error: unknown, reading = false): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "PGRST301" || code === "42501") return "Your session expired. Sign in again to change this.";
  // app_preferences_quiet_hours_check: from = to. The screen refuses it first;
  // this is the server saying the same if a stale copy got through.
  if (code === "23514") return SAME_QUIET_TIME_MESSAGE;
  return reading ? "Couldn't load your notification settings." : "Couldn't save that. Try again.";
}
