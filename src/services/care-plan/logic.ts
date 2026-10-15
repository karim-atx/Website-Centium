// Release 3 · CU16: the client's care plan, the pure part (no Supabase), so
// it can be tested.

export type CarePlanItemKind = "goal" | "recommendation" | "monitoring";

export interface CarePlanItem {
  id: string;
  kind: CarePlanItemKind;
  body: string;
  metric: string | null;
  thresholdLow: number | null;
  thresholdHigh: number | null;
  position: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Oct 29" (CU16 v2) from yyyy-mm-dd, no time-zone shift. */
export function shortDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${MONTHS[m - 1]} ${d}`;
}

/** The local yyyy-mm-dd of an instant (published_at). */
export function localIsoDay(at: string | Date): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "today", "tomorrow" or "Sat, Oct 17" for a day relative to `today`. */
export function relativeDay(iso: string, today: string): string {
  if (iso === today) return "today";
  const [y, m, d] = today.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  const tomorrow = t.toISOString().slice(0, 10);
  if (iso === tomorrow) return "tomorrow";
  const [yy, mm, dd] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()];
  return `${wd}, ${shortDay(iso)}`;
}

/**
 * "Alex Morgan, GP" / "Karam, doctor": the name and how the professional
 * describes themselves (specialty as written), else the type in lower case,
 * as CU16 v2 "Sara Ndlovu, dietitian".
 */
export function fromLine(name: string, role: string | null, roleIsSpecialty: boolean): string {
  if (!role) return name;
  return `${name}, ${roleIsSpecialty ? role : role.toLowerCase()}`;
}

/** Items the client sees, in the professional's order, split by kind. */
export function groupItems(items: CarePlanItem[]): Record<CarePlanItemKind, CarePlanItem[]> {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  return {
    goal: sorted.filter((i) => i.kind === "goal"),
    recommendation: sorted.filter((i) => i.kind === "recommendation"),
    monitoring: sorted.filter((i) => i.kind === "monitoring"),
  };
}

/** The follow-up note as a line: trimmed, trailing full stop dropped. */
export function noteLine(note: string | null | undefined): string {
  return (note ?? "").trim().replace(/\.$/, "");
}
