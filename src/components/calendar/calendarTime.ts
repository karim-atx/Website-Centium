// Calendar time and link helpers (mobile v5.1 R16). Times are stored as
// "HH:MM" (24-hour, the database's `time`). Handover-complete pass: every
// Calendar view shows them as MO1.6–MO1.6.3 draw them, 24-hour and padded
// ("12:30 – 13:00"); only the event sheet's Starts / Ends fields and wheel stay
// 12-hour, as MO1.6.4 draws them. Links are http(s) only (B38).

export type Meridiem = "AM" | "PM";
export interface TimeParts {
  hour: number; // 1–12
  minute: number; // 0–59
  meridiem: Meridiem;
}

/** Minutes since midnight of an "HH:MM" value; 0 when missing. */
export function minutesOf(hhmm?: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "HH:MM" from minutes since midnight, clamped to the day. */
export function fromMinutes(total: number): string {
  const t = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function toParts(hhmm: string): TimeParts {
  const t = minutesOf(hhmm);
  const h24 = Math.floor(t / 60);
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, minute: t % 60, meridiem: h24 < 12 ? "AM" : "PM" };
}

export function fromParts(p: TimeParts): string {
  const h24 = (p.hour % 12) + (p.meridiem === "PM" ? 12 : 0);
  return fromMinutes(h24 * 60 + p.minute);
}

/** "09:00 AM": the event sheet's Starts / Ends field (MO1.6.4 draws it padded). */
export function fieldTime(hhmm: string): string {
  const p = toParts(hhmm);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")} ${p.meridiem}`;
}

/** "18:00 – 19:00": the views' time line (MO1.6, MO1.6.2, MO1.6.3). */
export function range24(start?: string, end?: string): string {
  const one = (t?: string) => (t ? fromMinutes(minutesOf(t)) : "");
  return `${one(start)} – ${one(end)}`;
}

/**
 * The wheel's minute column: 5-minute steps, plus the event's own minute when
 * it is not on a step, so an existing 18:07 keeps its time unless it is
 * changed (B37).
 */
export function minuteOptions(current: number): number[] {
  const steps = Array.from({ length: 12 }, (_, i) => i * 5);
  return steps.includes(current) ? steps : [...steps, current].sort((a, b) => a - b);
}

/**
 * A link as typed, made safe to open. A bare "zoom.us/j/1" gets https://;
 * anything with another scheme (javascript:, mailto:, file:) is refused.
 * Returns null for an empty or refused value.
 */
export function normaliseLink(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** What a stored link shows as: the host and path, without the scheme. */
export function linkLabel(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
