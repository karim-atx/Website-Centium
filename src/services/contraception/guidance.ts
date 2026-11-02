import type { Method, EventKind } from "./schedule";
import { t, tk, tn } from "../../i18n/core";

// UI labels below are marked with tk() and translated where they are shown; the
// paragraphs stay English for clinical review (F13).
// EVENT_LABEL and PACK_ACTIVE are shown through tx(…, "contraception") and
// tx(…, "pill pack"), since "Taken", "Missed" and "Active" read differently elsewhere.

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
  none: tk("None"),
  pill_combined: tk("Combined pill"),
  pill_progestin: tk("Progestin-only pill"),
  iud_hormonal: tk("Hormonal IUD"),
  iud_copper: tk("Copper IUD"),
  implant: tk("Implant"),
  injection: tk("Injection"),
  ring: tk("Vaginal ring"),
  patch: tk("Patch"),
  condom: tk("Condoms"),
  other: tk("Something else"),
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

export const SETUP_TITLE = tk("Set up your method");
export const SETUP_BODY =
  "Tell the app what you use and when it started, and it will keep track of the pack, " +
  "the dates and any reminders you want.";

/** Said under the method picker, once. */
export const NOT_A_PRESCRIBER =
  "This is a record of what you already use. It doesn't recommend a method, and it " +
  "doesn't judge one. That conversation belongs with your doctor or pharmacist.";

export const PACK_TITLE = tk("This pack");
export const PACK_ACTIVE = "Active";
export const PACK_BREAK = tk("Break");
export const PACK_LEGEND = tk("Filled days are logged. Today has a ring around it.");

export const TODAY_TITLE = tk("Today");
export const TODAY_UNLOGGED = tk("Not logged yet.");

/**
 * THE ONE THING THIS APP SAYS ABOUT A MISSED PILL.
 *
 * Quoted from the brief, unchanged, and deliberately not followed by rules.
 */
export const MISSED_PILL_TITLE = tk("Missed a pill?");
export const MISSED_PILL_BODY =
  "Follow your pack's leaflet or ask a pharmacist: the right steps depend on your pill.";

export const HISTORY_TITLE = tk("History");
export const HISTORY_EMPTY = tk("Nothing logged yet.");

/** The countdown card's verb, per method. */
export const NEXT_TITLE = tk("Next");

/**
 * THE LABELS FOR my_contraception_status()'s OWN KINDS, which are not the
 * strings ./schedule.ts uses.
 *
 * The function answers 'pack_restart', 'ring_removal', 'ring_insertion',
 * 'patch_change', 'injection_due' and 'device_replacement'. Notably a pill
 * user's next event is the next PACK, where schedule.ts announces the break
 * that comes first — both are true, they are just different questions, which
 * is why the wording travels with whichever date is being shown rather than
 * being shared between the two.
 */
export const NEXT_KIND_LABEL: Record<string, string> = {
  pack_restart: tk("Next pack starts"),
  ring_removal: tk("Take the ring out"),
  ring_insertion: tk("Put a new ring in"),
  patch_change: tk("Change your patch"),
  injection_due: tk("Next injection due"),
  device_replacement: tk("Replace by"),
};

export const NEXT_TODAY = tk("Today");
export const NEXT_OVERDUE = (days: number) => tn(days, "{n} day ago (overdue)", "{n} days ago (overdue)");
export const NEXT_IN = (days: number) => tn(days, "In {n} day", "In {n} days");

/** Shown beside a device's replace-by date, which is often years out. */
export const DEVICE_NOTE =
  "Your provider will have told you how long it lasts. This is only the date you entered.";

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export const REMINDERS_TITLE = tk("Reminders");

export const PILL_REMINDER_LABEL = tk("Daily pill reminder");
export const PILL_REMINDER_HELP = tk("At the time you set, every day.");

export const METHOD_REMINDER_LABEL = tk("Method reminders");
export const METHOD_REMINDER_HELP = tk("Ring changes, patch days, injections and replace-by dates.");

export const REMINDER_TIME_LABEL = tk("Reminder time");
/** No time chosen yet. */
export const REMINDER_TIME_NOT_SET = tk("Not set");

/**
 * A REMINDER NEEDS PUSH, and saying so beats a switch that does nothing.
 *
 * queue_contraception_reminders() writes its row and sends an id-only push;
 * without permission and a push_subscriptions row the queue fills and nothing
 * arrives. None of this mentions what the reminder is for — the prompt itself
 * is the browser's, and the lock screen is governed by DETAIL_LABEL below.
 */
export const PUSH_NEEDED =
  tk("Reminders arrive as notifications, so this device needs permission first.");
export const PUSH_ENABLE = tk("Turn on notifications");
export const PUSH_BLOCKED =
  "Notifications are blocked for Centium in this browser. You can allow them again " +
  "in your browser's site settings.";
export const PUSH_UNSUPPORTED =
  tk("This browser can't receive notifications, so reminders aren't available here.");

export const DETAIL_TITLE = tk("What the notification says");

/**
 * NEUTRAL IS THE DEFAULT AND THE ONE THE COPY EXPLAINS.
 *
 * A phone on a table shows its notifications to whoever is in the room. "Time
 * for your pill" is information about somebody's body and their sex life, and
 * it is not the app's to disclose to a passenger, a flatmate or a parent
 * reading over a shoulder. Detailed is offered, not assumed.
 */
export const DETAIL_LABEL: Record<"neutral" | "detailed", string> = {
  neutral: tk("Neutral"),
  detailed: tk("Detailed"),
};

export const DETAIL_HELP: Record<"neutral" | "detailed", string> = {
  neutral: "Hides the reason on your lock screen. It just says you have a reminder.",
  detailed: "Says what the reminder is for, so it's readable to anyone who sees your screen.",
};

export const TIMEZONE_HELP = tk("Reminders are sent at your local time in your time zone, set in Settings");

// ---------------------------------------------------------------------------
// Changing or stopping
// ---------------------------------------------------------------------------

export const CHANGE_METHOD = tk("Change method");
export const STOP_TITLE = tk("Stop tracking this method");
export const STOP_BODY =
  "Your history is kept. Set up a new method whenever you want to.";
export const STOP_CONFIRM = tk("Stop tracking");
/** OURS-contraception-stop-confirm: the cancel. */
export const STOP_KEEP = tk("Keep");

// v6 page labels (HE1.10.b.2).
export const PAGE_TITLE = tk("Contraception");
export const YOUR_METHOD = tk("Your method");
export const STARTED_ON = (date: string) => t("Started {date}", { date });
/** Write failures (handover shared state). */
export const SAVE_FAILED = tk("Couldn't save. Try again.");
