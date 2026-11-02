import { appLocale } from "../../../i18n/format";

/** Monday-first one-letter day names in the app's language (Arabic: Intl narrow names). */
export function weekLetters(): string[] {
  const fmt = new Intl.DateTimeFormat(appLocale("en-US"), { weekday: "narrow" });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
}
