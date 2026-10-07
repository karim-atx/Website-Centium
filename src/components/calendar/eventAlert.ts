// MO1.6.4.2, New event · Alert options: the eleven options the frame's
// dropdown lists, in its order. Each value IS the `public.calendar_alert` enum
// value stored in calendar_events.alert (Stage 2, HANDOVER_API.md: callouts
// 42–52, named for the offset so the labels stay ours). The new-event default
// is "None", as MO1.6.4 draws the field; MO1.6.4.2's "15 minutes before" is
// the frame's sample selection, not a default.
//
// Delivery is the database's: a per-minute sweep queues one reminder_sends row
// per occurrence for the event's OWNER (owner's timezone; all-day counts back
// from 09:00; over an hour late is dropped; no push subscription, no alert).

export type EventAlert =
  | "none"
  | "at_time"
  | "min_5"
  | "min_10"
  | "min_15"
  | "min_30"
  | "hour_1"
  | "hour_2"
  | "day_1"
  | "day_2"
  | "week_1";

export const ALERT_OPTIONS: { value: EventAlert; label: string }[] = [
  { value: "none", label: "None" },
  { value: "at_time", label: "At time of event" },
  { value: "min_5", label: "5 minutes before" },
  { value: "min_10", label: "10 minutes before" },
  { value: "min_15", label: "15 minutes before" },
  { value: "min_30", label: "30 minutes before" },
  { value: "hour_1", label: "1 hour before" },
  { value: "hour_2", label: "2 hours before" },
  { value: "day_1", label: "1 day before" },
  { value: "day_2", label: "2 days before" },
  { value: "week_1", label: "1 week before" },
];

/**
 * A stored value read back from the column. Anything the enum might grow that
 * this build does not know reads as "None" rather than crashing the sheet.
 */
export const toEventAlert = (v: string | null | undefined): EventAlert =>
  ALERT_OPTIONS.find((o) => o.value === v)?.value ?? "none";

/**
 * Whether the alert needs its own write after the event's (services/calendar
 * writeAlert), given what the saved row holds. Sent whenever the sheet's
 * choice differs, back to "none" included — a new row starts at the column
 * default 'none', so the sheet's choice is always sent explicitly; never when
 * the caller didn't say (the one-time local-event upload).
 */
export const alertNeedsWrite = (stored: EventAlert, wanted: EventAlert | undefined): wanted is EventAlert =>
  wanted !== undefined && wanted !== stored;

export const alertLabel =(v: EventAlert): string => ALERT_OPTIONS.find((o) => o.value === v)?.label ?? "None";
