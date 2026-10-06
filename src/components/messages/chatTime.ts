// How times read in Messages: the list shows the time for today, "Yesterday",
// a weekday within the week, then a date; bubbles show the time.

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function listTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** MO1.2.1.3.2's search result time: the day, then the clock ("Today · 08:14"). */
export function dayAndTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = sameDay(d, now) ? "Today" : listTime(iso, now);
  return `${day} · ${clockTime(iso)}`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
