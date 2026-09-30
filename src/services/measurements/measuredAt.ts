// Handover 2026-09-29 WO4.1, "Measured on": the Add measurements date field
// opens the standard calendar popup with a wheel time picker below it (hours,
// minutes in fives, AM/PM). No future: later days, and on today later hours,
// minutes and PM, are disabled. All in the user's own local time, which is
// what they mean by "9:30 this morning"; the caller converts to an instant.

export type Meridiem = "AM" | "PM";

export interface TimeParts {
  /** 1–12. */
  hour: number;
  /** 0–55 in fives. */
  minute: number;
  meridiem: Meridiem;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of a Date, in local time. */
export const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Now, rounded down to the wheel's five-minute steps: the field's default. */
export function floorToFive(d: Date): Date {
  const out = new Date(d);
  out.setSeconds(0, 0);
  out.setMinutes(out.getMinutes() - (out.getMinutes() % 5));
  return out;
}

export function timeParts(d: Date): TimeParts {
  const h = d.getHours();
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: d.getMinutes() - (d.getMinutes() % 5), meridiem: h < 12 ? "AM" : "PM" };
}

export function combine(day: string, t: TimeParts): Date {
  const [y, m, d] = day.split("-").map(Number);
  const h24 = (t.hour % 12) + (t.meridiem === "PM" ? 12 : 0);
  return new Date(y, m - 1, d, h24, t.minute, 0, 0);
}

/**
 * Which wheel options are later than `now` on `day` — nothing is on an
 * earlier day. An hour is disabled when its first minute is still ahead; a
 * minute when that minute of the chosen hour is; PM when noon is.
 */
export function laterThanNow(day: string, t: TimeParts, now: Date) {
  const after = (parts: TimeParts) => combine(day, parts) > now;
  return {
    hour: (hour: number) => after({ ...t, hour, minute: 0 }),
    minute: (minute: number) => after({ ...t, minute }),
    meridiem: (meridiem: Meridiem) => after({ hour: 12, minute: 0, meridiem }),
  };
}

/** The picked day and time, never later than now. */
export function pickedInstant(day: string, t: TimeParts, now: Date): Date {
  const d = combine(day, t);
  return d > now ? floorToFive(now) : d;
}

/** "Sep 28, 2026 · 9:30 AM". */
export function formatMeasured(d: Date): string {
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const { hour, meridiem } = timeParts(d);
  return `${date} · ${hour}:${pad(d.getMinutes())} ${meridiem}`;
}
