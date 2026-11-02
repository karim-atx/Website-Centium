import { clock12 } from "../../../utils/time12";
import { shortDate } from "../../../services/store/format";
import { getLanguage, t } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";
import { DAY_SHORT, mondayIndex } from "../../../utils/week";
import type { DiaryAppt } from "../../../services/appointments";

// The client is the server's label (business_appointments.client_label:
// "Member #0042" unless the client shared their name). Render it as is.

export const serviceTitle = (a: Pick<DiaryAppt, "serviceName" | "durationMin">) => t("{service}, {n} min", { service: a.serviceName, n: a.durationMin });

/** "Tue, Oct 14" in English (services/store shortDate); the app's language otherwise (Arabic day and month names). */
export function dayDate(d: Date): string {
  return getLanguage() === "en" ? shortDate(d) : d.toLocaleDateString(appLocale(), { weekday: "short", month: "short", day: "numeric" });
}

/** "Tue": the day strip's weekday, in the app's language. */
export function weekdayShort(d: Date): string {
  return getLanguage() === "en" ? DAY_SHORT[mondayIndex(d.getDay())] : d.toLocaleDateString(appLocale(), { weekday: "short" });
}

/** "Today, Tue 14 Oct" (OP1-020 #4, OURS sub). */
export function todaySub(now = new Date()): string {
  return t("Today, {date}", { date: dayDate(now) });
}

export const time = (iso: string) => clock12(iso);
