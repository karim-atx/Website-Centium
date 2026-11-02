import { appLocale } from "../../i18n/format";

// Round G (EH4): weekday and short date labels for the professional screens,
// in the app's language. English output matches the old hand-built labels
// ("Mon", "Mon, Jan 5"); Arabic gets Arabic day and month names.

/** "Mon" for a Monday-first column (0 = Monday … 6 = Sunday). */
export function weekdayShort(column: number): string {
  return new Date(2024, 0, 1 + column).toLocaleDateString(appLocale("en-US"), { weekday: "short" });
}

/** "Monday" for a Monday-first column. */
export function weekdayLong(column: number): string {
  return new Date(2024, 0, 1 + column).toLocaleDateString(appLocale("en-US"), { weekday: "long" });
}

/** "Jan" for a month index (0 = January). */
export function monthShort(month: number): string {
  return new Date(2024, month, 1).toLocaleDateString(appLocale("en-US"), { month: "short" });
}

/** "January" for a month index. */
export function monthLong(month: number): string {
  return new Date(2024, month, 1).toLocaleDateString(appLocale("en-US"), { month: "long" });
}

/** "M" for a Monday-first column (a one-letter day label). */
export function weekdayNarrow(column: number): string {
  return new Date(2024, 0, 1 + column).toLocaleDateString(appLocale("en-US"), { weekday: "narrow" });
}
