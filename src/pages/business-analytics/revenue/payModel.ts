import {
  dddDMon,
  dMon,
  money,
  monthYear,
  type OwedItem,
  type PaidEntry,
} from "../../../services/business-revenue";
import type { HistRow } from "./PayKit";

export const REVENUE_BASE = "/app/business/analytics/revenue";

/**
 * Whish is "Soon" (user rule, OURS-AN14-pending-whish). While false: no
 * Whish figures, the Whish filter options are disabled with a Soon chip, and
 * the Failed half card, Failed list, failed detail and retry flow (built,
 * V6-44: 2 automatic + 1 manual retry) are not reachable. Turn on with B8's
 * payment_attempts and the Whish callback (HANDOVER_API Stage 5).
 */
export const WHISH_LIVE = false;

/** Retry policy (V6-44 / OD-9): Whish retries twice automatically, then one manual retry: 3 attempts. */
export const AUTO_RETRIES = 2;
export const MANUAL_RETRIES = 1;

/** The chip on an owed row: "9 days overdue" (late, caution), "Due today", "Due Fri 16 Oct". */
export function owedChip(o: Pick<OwedItem, "overdue" | "dueOn">): {
  short: string;
  long: string;
  late: boolean;
  severe: boolean;
} {
  if (o.overdue > 0) {
    const t = `${o.overdue} ${o.overdue === 1 ? "day" : "days"} overdue`;
    return {
      short: `${o.overdue} ${o.overdue === 1 ? "day" : "days"} late`,
      long: t,
      late: true,
      severe: o.overdue >= 14,
    };
  }
  if (o.overdue === 0)
    return {
      short: "Due today",
      long: "Due today",
      late: false,
      severe: false,
    };
  const due = o.dueOn ? dddDMon(o.dueOn) : "";
  return {
    short: `Due ${due}`,
    long: `Due ${due}`,
    late: false,
    severe: false,
  };
}

/** "Monthly · due 1 Oct, cash" / "Spin 45 · 2 Oct, cash" (AN14-024 row 3). */
export function owedSub(
  r: Pick<OwedItem, "item" | "method" | "dueOn" | "sourceKind">,
): string {
  const m = r.method === "whish" ? "Whish" : "cash";
  if (!r.dueOn) return `${r.item}, ${m}`;
  return r.sourceKind === "membership"
    ? `${r.item} · due ${dMon(r.dueOn)}, ${m}`
    : `${r.item} · ${dMon(r.dueOn)}, ${m}`;
}

/** "September": the month a paid payment was for (its due day, else the day paid). */
const monthOfIso = (iso: string) => monthYear(iso).split(" ")[0];

/**
 * Paid history rows (PaySeeAllV2 hist H(): "September · $95", method, paid
 * day). Owed (AN14-044 B1): "Paid in cash" / "Paid with Whish", ", N days
 * late" when paid after its due day. Renewal (AN14-068 row 4): "Cash" / "Whish".
 */
export function paidHistRows(
  rows: readonly PaidEntry[],
  style: "owed" | "renewal",
): HistRow[] {
  return rows.map((r) => {
    const late = r.dueOn && r.paidOn > r.dueOn ? daysFromTo(r.dueOn, r.paidOn) : 0;
    const how =
      style === "renewal"
        ? r.method === "whish" ? "Whish" : "Cash"
        : (r.method === "whish" ? "Paid with Whish" : "Paid in cash") +
          (late > 0 ? `, ${late} ${late === 1 ? "day" : "days"} late` : "");
    return {
      t: `${monthOfIso(r.dueOn ?? r.paidOn)} · ${money(r.amount)}`,
      s: how,
      d: dMon(r.paidOn),
      kind: "ok",
    };
  });
}

const daysFromTo = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
