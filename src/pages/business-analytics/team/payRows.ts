import type { ScorecardRow } from "../../../services/business-analytics";
import type { TeamState } from "./useTeam";

// AN5 Pay figures, shared by the Pay page (AN5-065) and the index Pay tile
// (AN5-001 row 24).

export type PerPerson = NonNullable<TeamState["stats"]>["perPerson"][number];
export type PayRow = { p: PerPerson; rate: number; pay: number; classes: number; revenue: number | null };

/**
 * Each instructor with an agreed rate: instructor_scorecard's pay and revenue
 * when it answered, else rate × classes from the Team service. Shared by this
 * page and the index's Pay tile (AN5-001 row 24), so both show one figure.
 */
export function payRowsOf(scRows: ScorecardRow[] | null, people: PerPerson[]): { rows: PayRow[]; total: number; classes: number; avg: number } {
  const rows: PayRow[] = (
    scRows
      ? scRows.flatMap((r): PayRow[] => {
          const p = people.find((x) => x.person.id === r.professionalId);
          if (!p || r.pay === null) return [];
          return [{ p, rate: p.person.payRate ?? (r.classes ? r.pay / r.classes : 0), pay: r.pay, classes: r.classes, revenue: r.recordedRevenue }];
        })
      : people.filter((p) => p.person.payRate !== null).map((p) => ({ p, rate: p.person.payRate as number, pay: (p.person.payRate as number) * p.sessions, classes: p.sessions, revenue: null }))
  ).sort((a, b) => b.pay - a.pay);
  const total = rows.reduce((a, r) => a + r.pay, 0);
  const classes = rows.reduce((a, r) => a + r.classes, 0);
  return { rows, total, classes, avg: classes ? Math.round(total / classes) : 0 };
}
