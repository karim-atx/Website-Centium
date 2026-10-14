import {
  dddDMon,
  dMon,
  type OwedItem,
} from "../../../services/business-revenue";

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
