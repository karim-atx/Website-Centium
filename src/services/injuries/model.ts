// Round D · the client's Injuries list (public.injuries, 20261222050000):
// description (1 to 300), body_area (up to 60), since (a date, not in the
// future), status active / resolved. Pure: validation, order and the row line.

export type InjuryStatus = "active" | "resolved";

export interface Injury {
  id: string;
  description: string;
  bodyArea: string | null;
  /** yyyy-mm-dd, or null when not known. */
  since: string | null;
  status: InjuryStatus;
  createdAt: string;
}

export interface InjuryDraft {
  description: string;
  bodyArea: string;
  since: string;
}

export const INJURY_DESCRIPTION_MAX = 300;
export const INJURY_AREA_MAX = 60;

/** Why the draft can't be saved, or null. `today` is the local yyyy-mm-dd. */
export function injuryProblem(d: InjuryDraft, today: string): string | null {
  const t = d.description.trim();
  if (!t) return "Describe the injury.";
  if (t.length > INJURY_DESCRIPTION_MAX) return `Keep the description under ${INJURY_DESCRIPTION_MAX} characters.`;
  if (d.bodyArea.trim().length > INJURY_AREA_MAX) return `Keep the body area under ${INJURY_AREA_MAX} characters.`;
  if (d.since && (!/^\d{4}-\d{2}-\d{2}$/.test(d.since) || d.since > today)) return "Choose a date that isn't in the future.";
  return null;
}

/** The columns a draft writes (empty optional fields as null). */
export function injuryColumns(d: InjuryDraft): { description: string; body_area: string | null; since: string | null } {
  return { description: d.description.trim(), body_area: d.bodyArea.trim() || null, since: d.since || null };
}

/** Current injuries first, then healed ones; newest first within each. */
export function sortInjuries(list: Injury[]): Injury[] {
  return [...list].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "active" ? -1 : 1));
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Knee · since 3 Mar 2026 · healed"; "" when there's nothing to add. */
export function injuryMeta(i: Pick<Injury, "bodyArea" | "since" | "status">): string {
  const since = i.since && /^\d{4}-\d{2}-\d{2}$/.test(i.since) ? `since ${Number(i.since.slice(8, 10))} ${MONTH_SHORT[Number(i.since.slice(5, 7)) - 1]} ${i.since.slice(0, 4)}` : null;
  return [i.bodyArea?.trim() || null, since, i.status === "resolved" ? "healed" : null].filter(Boolean).join(" · ");
}
