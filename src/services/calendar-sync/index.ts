// Market + Share 3.0 · W5 · calendar sync: the professional calendar's hired
// class events (P-CA; PLAN §2.2 DB9, api.md "Calendar"). The P-CA.5.5
// conflict list comes from accept_hire_offer's `conflicts` refusal (DB8,
// services/team-hiring); check_conflicts has no caller and no binding.
//
// Database stage DB9 has NOT landed (checked 2026-10-22: no Release 2 branch
// in ../Database; neither function on the local stack). The calls follow PLAN
// §2.2 DB9 / api.md; `pending` is the calendar's quiet state: the live
// assigned business classes (services/business-classes
// fetchClassesAssignedToMe) keep showing meanwhile, and when my_calendar
// answers its events replace those rows by class session (no duplicates).

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseMyCalendar, type HiredClassEvent } from "./model";

export * from "./model";

/** my_calendar(p_from, p_to): the hired class events in the range (YYYY-MM-DD, inclusive). */
export function fetchMyCalendar(from: string, to: string): Promise<MarketResult<HiredClassEvent[]>> {
  // awaiting DB stage DB9
  return marketRpc("my_calendar", { p_from: from, p_to: to }, "Couldn't load your calendar.", parseMyCalendar);
}
