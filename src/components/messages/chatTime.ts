// How times read in Messages: the list shows the time for today, "Yesterday",
// a weekday within the week, then a date ("Sep 27"; "Sep 27, 2025" in another
// year); bubbles show the time.

import { clock12 } from "../../utils/time12";
import { formatShortDate } from "../../utils/date";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// The clock in Messages. v6 X-14: always 12-hour through the shared
// formatter ("6:42 PM", unpadded hour), whatever the device's own hour cycle
// (this replaces MO1.2.1.3's "follow the device setting").

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function listTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return clock12(d);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return t("Yesterday");
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  // v6 MO1.7 D2: "Tue" within the week, then month first as drawn ("Sep 27"),
  // with the year once it is another year ("Sep 27, 2025").
  if (days < 7 && days > -7) return d.toLocaleDateString(appLocale("en-US"), { weekday: "short" });
  return d.toLocaleDateString(appLocale("en-US"), {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : null),
  });
}

/**
 * The business list's time (OP1-190 row 7, ClientChatV2 list): as listTime up
 * to a week, then the month first ("Oct 2"; "Oct 2, 2025" in another
 * year), through the shared short-date formatter ("Sep", never "Sept").
 */
export function bizListTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7 && days > -7) return listTime(iso, now);
  return formatShortDate(d, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : null),
  });
}

/** MO1.2.1.3.2's search result time: the day, then the clock ("Today · 8:14 AM"). */
export function dayAndTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = sameDay(d, now) ? t("Today") : listTime(iso, now);
  return `${day} · ${clockTime(iso)}`;
}

export function clockTime(iso: string): string {
  return clock12(iso);
}
