import { t, tn } from "../../i18n/core";
import { appLocale } from "../../i18n/format";

// Round F (DW1–DW3): the new sentences of week notes, skipping and moving a
// programme session. The Workout and Pro tool screens they appear on are
// still English (later rounds), so their new copy lives here, translated in
// i18n/ar/programmes.ts, and the screens render it through these helpers.
// Pure: model.ts and its tests use it too.

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

/** A weekday's name in the app's language, 1 = Monday … 7 = Sunday. */
export function weekdayName(day: number, style: "long" | "short" = "long"): string {
  // 2026-10-26 was a Monday.
  return new Date(Date.UTC(2026, 9, 25 + day)).toLocaleDateString(appLocale("en-US"), { weekday: style, timeZone: "UTC" });
}

/** A date as its weekday and day ("Tue, Nov 3"), in the app's language. */
export function weekdayAndDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
}

/** A day's size in a day picker: "Rest day" or "{n} workouts". */
export const dayCount = (n: number): string => (n === 0 ? t("Rest day") : tn(n, "{n} workout", "{n} workouts", { n }));

export const fullLabel = (): string => t("Full");

// ---------------------------------------------------------------------------
// DW1 · week notes
// ---------------------------------------------------------------------------

export const weekNoteLabel = (week: number): string => t("Note for week {n} (clients see this)", { n: week });
export const weekNotePlaceholder = (): string => t("Keep RPE at 7 this week.");
export const yourWeekNote = (week: number): string => t("Your note for week {n}", { n: week });
export const noteSaveFailed = (): string => t("Couldn't save the note. Try again.");

// ---------------------------------------------------------------------------
// DW2 · skip
// ---------------------------------------------------------------------------

export const skipDayLabel = (): string => t("Skip this day");
export const skipLabel = (): string => t("Skip");
export const skippedLabel = (): string => t("Skipped");
export const undoSkipLabel = (): string => t("Undo skip");
export const daySkipped = (): string => t("Day skipped.");
export const workoutSkipped = (workout: string): string => t("{workout} skipped.", { workout });
export const skippedCount = (n: number): string => tn(n, "{n} session skipped", "{n} sessions skipped", { n });
export const skipFailed = (): string => t("Couldn't skip that day. Try again.");
export const undoFailed = (): string => t("Couldn't undo the skip. Try again.");

/** Round D D-S4, the card for yesterday's unfinished session. */
export const yesterdayLine = (workout: string): string => t("Yesterday: {workout}", { workout });
export const doItToday = (): string => t("Do it today");
export const skipYesterdayLabel = (workout: string): string => t("Skip {workout} from yesterday", { workout });

// ---------------------------------------------------------------------------
// DW3 · move
// ---------------------------------------------------------------------------

export const moveDayLabel = (): string => t("Move to another day");
export const dayOptionsLabel = (day: string): string => t("Options for {day}", { day });
export const movedFrom = (day: string): string => t("Moved from {day}", { day });
export const movedTo = (workout: string, day: string): string => t("{workout} moved to {day}.", { workout, day });
export const whichWorkout = (): string => t("Which workout");
export const whichDay = (): string => t("Which day");
export const plannedDayLabel = (): string => t("Planned day");
export const noFreeDay = (): string => t("No other day this week is free to move to.");
export const moveToDay = (day: string): string => t("Move to {day}", { day });
export const movingLabel = (): string => t("Moving…");
export const moveFailed = (): string => t("Couldn't move that workout. Try again.");

/** The builder: the grip (drag it, or press it for the day picker) and the picker. */
export const moveGripLabel = (workout: string): string => t("Move {workout} to another day", { workout });
export const moveToTitle = (workout: string): string => t("Move {workout} to…", { workout });
export const builderMoveHint = (): string => t("Drag the grip onto another day, or pick a day here. It goes last on that day.");

// ---------------------------------------------------------------------------
// Refusals (20261226000000)
// ---------------------------------------------------------------------------

/** A sentence for Round F's programme refusals, or null for the older codes (model.ts maps those). */
export function programmeCodeMessage(code: string, msg: string): string | null {
  switch (code) {
    case "ATXP0":
      return t("That workout is already done.");
    case "ATXP1":
      return t("You can skip a day of this week only.");
    case "ATXP2":
      return t("A workout moves within its own week, to today or a later day.");
    case "ATXP3":
      return t("That day already has four workouts.");
    case "ATXP4":
      return t("That workout is skipped. Undo the skip first.");
  }
  if (code === "22023" && msg.includes("note of up to 280")) return t("A week note can be up to 280 characters.");
  // "no session of this programme on that day", "nothing skipped on that day",
  // "no such session of this programme", "no session there".
  if (code === "ATX08" && (msg.includes("session") || msg.includes("nothing skipped"))) return t("That workout has changed. Refresh and try again.");
  return null;
}
