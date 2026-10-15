import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  classAnalyticsOf,
  dayOf,
  first90Of,
  funnelOf,
  growthOf,
  outcomesOf,
  peopleSummaryOf,
  periodStatsOf,
  planFiguresOf,
  scorecardOf,
  type ClassAnalyticsRow,
  type ClientOutcomes,
  type DayItem,
  type First90,
  type GrowthWeek,
  type InvitesFunnel,
  type PeopleSummary,
  type PeriodStats,
  type PlanFigure,
  type ScorecardRow,
} from "./model";

export * from "./model";

// B15 analytics readers (Database HANDOVER_API "B15 · Analytics, dashboard
// and realtime", DI-01 … DI-07, CL-07, MB-04, TM-04). Not in the generated
// database.types.ts yet, so each call goes through one narrow cast here and
// the rows are mapped by model.ts.
//
// Every answer says which of three things happened:
//   - ok: the rows (already filtered by the server to what the caller holds);
//   - pending: the function is not on this database (PGRST202 / 42883), so
//     the screen keeps its drawn pending state;
//   - denied: ATX03, the caller lacks the reader's permission (members /
//     schedule / revenue): the screen shows no tile for it, never a 0.

export type Read<T> = { ok: true; value: T } | { ok: false; pending?: boolean; denied?: boolean; message: string };

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

const LOAD_FAIL = "Couldn't load your numbers.";

async function call<R, T>(fn: string, args: Record<string, unknown>, map: (rows: R[]) => T): Promise<Read<T>> {
  try {
    const { data, error } = await rpc<R[]>(fn, args);
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") return { ok: false, pending: true, message: LOAD_FAIL };
      if (error.code === "ATX03") return { ok: false, denied: true, message: LOAD_FAIL };
      console.error(`[analytics] ${fn} failed:`, error.message);
      return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : LOAD_FAIL };
    }
    return { ok: true, value: map(Array.isArray(data) ? data : data ? [data as R] : []) };
  } catch (e) {
    console.error(`[analytics] ${fn} failed:`, e);
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : LOAD_FAIL };
  }
}

/** DI-02: rows of metric / value / previous / early, only the metrics the caller may hold. */
export const fetchPeriodStats = (businessId: string, from: string, to: string, compare: boolean): Promise<Read<PeriodStats>> =>
  call("business_period_stats", { p_business_id: businessId, p_from: from, p_to: to, p_compare: compare }, periodStatsOf);

/** DI-02: weekly joined / ended / net / members at the end, ending with this week (gate members). */
export const fetchMemberGrowth = (businessId: string, weeks: number): Promise<Read<GrowthWeek[]>> =>
  call("business_member_growth", { p_business_id: businessId, p_weeks: weeks }, growthOf);

/** Members summary (gate members): fixed windows, no range. */
export const fetchPeopleSummary = (businessId: string): Promise<Read<PeopleSummary>> => call("business_people_summary", { p_business_id: businessId }, peopleSummaryOf);

/** The last 90 days' new members (gate members). */
export const fetchFirst90Days = (businessId: string): Promise<Read<First90 | null>> =>
  call("business_first_90_days", { p_business_id: businessId }, (rows: Parameters<typeof first90Of>[0][]) => first90Of(rows[0]));

/** MB-04: per plan, active now and new sales in the range (gate members). */
export const fetchPlanFigures = (businessId: string, from: string, to: string): Promise<Read<PlanFigure[]>> =>
  call("business_plan_figures", { p_business_id: businessId, p_from: from, p_to: to }, planFiguresOf);

/** Member codes issued / redeemed / expired / became members (gate members). */
export const fetchInvitesFunnel = (businessId: string, days = 90): Promise<Read<InvitesFunnel | null>> =>
  call("business_invites_funnel", { p_business_id: businessId, p_days: days }, (rows: Parameters<typeof funnelOf>[0][]) => funnelOf(rows[0]));

/** DI-04: the day's classes and appointments for the Live now clock (gate schedule). */
export const fetchBusinessDay = (businessId: string, date: string): Promise<Read<DayItem[]>> => call("business_day", { p_business_id: businessId, p_date: date }, dayOf);

/** CL-07: per class (type + title) for the range: sessions, fill, bookings, member cancellations, new vs returning, 30-day return rate (gate schedule). */
export const fetchClassAnalytics = (businessId: string, from: string, to: string): Promise<Read<ClassAnalyticsRow[]>> =>
  call("class_analytics", { p_business_id: businessId, p_from: from, p_to: to }, classAnalyticsOf);

/** TM-04: per instructor, for the range (gate revenue). */
export const fetchInstructorScorecard = (businessId: string, from: string, to: string): Promise<Read<ScorecardRow[]>> =>
  call("instructor_scorecard", { p_business_id: businessId, p_from: from, p_to: to }, scorecardOf);

/** DI-07: aggregates of the clients currently sharing; all null below 5 (gate members). No range, on purpose. */
export const fetchClientOutcomes = (businessId: string): Promise<Read<ClientOutcomes | null>> =>
  call("business_client_outcomes", { p_business_id: businessId }, (rows: Parameters<typeof outcomesOf>[0][]) => outcomesOf(rows[0]));
