import type { Method, EventKind } from "./schedule";

// ===========================================================================
// FOR CLINICAL REVIEW — every sentence this app says about contraception is in
// this file, and nowhere else.
// ===========================================================================
//
// THE CENTRAL RULE, AND THE REASON THIS FILE IS SHORT: THIS APP GIVES NO
// MISSED-PILL ADVICE. What to do about a missed pill depends on which pill it
// is, which day of the pack it was, and how late — and combined and
// progestin-only pills differ, as do progestin-only pills from each other
// (some have a 3-hour window, some 12). A generic "take it as soon as you
// remember and use backup for 7 days" is right for some pills and wrong for
// others, and being wrong here means an unintended pregnancy.
//
// So MISSED_PILL_BODY points at the leaflet in the pack and at a pharmacist,
// both of which know which pill it is. That is the whole of the advice, it is
// deliberate, and it should not be "improved" into a rules table.
//
// NOTHING HERE IS EFFECTIVENESS GUIDANCE EITHER. The app does not say a method
// is 91% or 99% effective, does not say whether somebody is protected during a
// break week, and does not interpret a logged miss. It records what the user
// tells it and shows them their own schedule.

export const METHOD_LABEL: Record<Method, string> = {
  none: "None",
  pill_combined: "Combined pill",
  pill_progestin: "Progestin-only pill",
  iud_hormonal: "Hormonal IUD",
  iud_copper: "Copper IUD",
  implant: "Implant",
  injection: "Injection",
  ring: "Vaginal ring",
  patch: "Patch",
  condom: "Condoms",
  other: "Something else",
};

export const EVENT_LABEL: Record<EventKind, string> = {
  pill_taken: "Taken",
  pill_missed: "Missed",
  pill_late: "Late",
  ring_inserted: "Ring in",
  ring_removed: "Ring out",
  patch_applied: "Patch on",
  patch_removed: "Patch off",
  injection_given: "Injection",
  device_inserted: "Fitted",
  device_removed: "Removed",
};

export const SETUP_TITLE = "Set up your method";
export const SETUP_BODY =
  "Tell the app what you use and when it started, and it will keep track of the pack, " +
  "the dates and any reminders you want.";

/** Said under the method picker, once. */
export const NOT_A_PRESCRIBER =
  "This is a record of what you already use. It doesn't recommend a method, and it " +
  "doesn't judge one — that conversation belongs with your doctor or pharmacist.";

export const PACK_TITLE = "This pack";
export const PACK_ACTIVE = "Active";
export const PACK_BREAK = "Break";
export const PACK_LEGEND = "Filled days are logged. Today has a ring around it.";

export const TODAY_TITLE = "Today";
export const TODAY_UNLOGGED = "Not logged yet.";

/**
 * THE ONE THING THIS APP SAYS ABOUT A MISSED PILL.
 *
 * Quoted from the brief, unchanged, and deliberately not followed by rules.
 */
export const MISSED_PILL_TITLE = "Missed a pill?";
export const MISSED_PILL_BODY =
  "Follow your pack's leaflet or ask a pharmacist: the right steps depend on your pill.";

export const HISTORY_TITLE = "History";
export const HISTORY_EMPTY = "Nothing logged yet.";

/** The countdown card's verb, per method. */
export const NEXT_TITLE = "Next";

export const NEXT_TODAY = "Today";
export const NEXT_OVERDUE = (days: number) =>
  `${days} day${days === 1 ? "" : "s"} ago — overdue`;
export const NEXT_IN = (days: number) => `In ${days} day${days === 1 ? "" : "s"}`;

/** Shown beside a device's replace-by date, which is often years out. */
export const DEVICE_NOTE =
  "Your provider will have told you how long it lasts. This is only the date you entered.";

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export const REMINDERS_TITLE = "Reminders";

export const PILL_REMINDER_LABEL = "Daily pill reminder";
export const PILL_REMINDER_HELP = "At the time you set, every day.";

export const METHOD_REMINDER_LABEL = "Method reminders";
export const METHOD_REMINDER_HELP =
  "Ring changes, patch days, injections and replace-by dates.";

export const REMINDER_TIME_LABEL = "Reminder time";

export const DETAIL_TITLE = "What the notification says";

/**
 * NEUTRAL IS THE DEFAULT AND THE ONE THE COPY EXPLAINS.
 *
 * A phone on a table shows its notifications to whoever is in the room. "Time
 * for your pill" is information about somebody's body and their sex life, and
 * it is not the app's to disclose to a passenger, a flatmate or a parent
 * reading over a shoulder. Detailed is offered, not assumed.
 */
export const DETAIL_LABEL: Record<"neutral" | "detailed", string> = {
  neutral: "Neutral",
  detailed: "Detailed",
};

export const DETAIL_HELP: Record<"neutral" | "detailed", string> = {
  neutral: "Hides the reason on your lock screen — it just says you have a reminder.",
  detailed: "Says what the reminder is for, so it's readable to anyone who sees your screen.",
};

export const TIMEZONE_HELP =
  "Reminders use this time zone, so they don't shift while you're travelling.";

// ---------------------------------------------------------------------------
// Changing or stopping
// ---------------------------------------------------------------------------

export const CHANGE_METHOD = "Change method";
export const STOP_TITLE = "Stop tracking this method";
export const STOP_BODY =
  "Your history is kept. Set up a new method whenever you want to.";
export const STOP_CONFIRM = "Stop tracking";
