// Market + Share 3.0 · calendar sync: the class sessions on the professional's
// calendar (P-CA). Database Release 2 (20261213040000): a hired class IS a
// class_series with professional_id, so no second calendar copy exists;
// my_calendar(p_from, p_to) returns every class session the caller is the
// named instructor of (hired or not, told apart by hire_id), and the client
// merges them with the repo's own calendar_events (classModel.mergeClasses,
// one row per session). A range is at most a year ("ask for a year at a
// time", 22023) and 1000 rows, so a longer range is read in windows.
// The P-CA.5.5 clash list comes from check_conflicts (services/team-hiring).

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseMyCalendar, type HiredClassEvent } from "./model";

export * from "./model";

/** The longest range my_calendar answers (its limit is 370 days). */
const WINDOW_DAYS = 365;

const addDays = (ymd: string, n: number): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

/** my_calendar(p_from, p_to) over YYYY-MM-DD..YYYY-MM-DD (inclusive), a year at a time. */
export async function fetchMyCalendar(from: string, to: string): Promise<MarketResult<HiredClassEvent[]>> {
  const out: HiredClassEvent[] = [];
  for (let a = from; a <= to; a = addDays(a, WINDOW_DAYS + 1)) {
    const b = addDays(a, WINDOW_DAYS) < to ? addDays(a, WINDOW_DAYS) : to;
    const r = await marketRpc("my_calendar", { p_from: a, p_to: b }, "Couldn't load your calendar.", parseMyCalendar);
    if (!r.ok) return r;
    out.push(...r.value);
  }
  return { ok: true, value: out };
}
