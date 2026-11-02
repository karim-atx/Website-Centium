// B15 analytics readers (Database HANDOVER_API "B15 · Analytics, dashboard
// and realtime"): the pure shapes and the mapping from the readers' rows.
// No network and no DOM, so node --test covers it (model.test.ts).
//
// RULES THE READERS SET, KEPT HERE:
//   - A metric the caller may not hold is simply absent from
//     business_period_stats: absent means "no tile", never 0.
//   - `early` is per metric (the business is under 14 days old, or the figure
//     rests on fewer than 10 records): the screens show their early / "Nothing
//     to compare yet" state instead of a delta.
//   - Dates are the business's own calendar days and weeks start on Monday;
//     the readers bucket, the app never re-buckets.
//   - business_client_outcomes is all null below 5 sharers, on purpose.

import { t } from "../../i18n/core";

/** numeric columns arrive as JSON numbers, or as strings from some drivers. */
export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---- business_period_stats ------------------------------------------------------

export type PeriodMetric =
  | "members_joined"
  | "members_ended"
  | "members_net"
  | "class_bookings"
  | "average_fill_pct"
  | "entries"
  | "orders"
  | "appointments"
  | "recorded_revenue";

export interface PeriodStat {
  value: number | null;
  /** The period of equal length just before (null: compare off, or nothing then). */
  previous: number | null;
  early: boolean;
}

/** Only the metrics the caller may hold are keys. */
export type PeriodStats = Partial<Record<PeriodMetric, PeriodStat>>;

export function periodStatsOf(rows: { metric: string; value: unknown; previous: unknown; early: boolean | null }[]): PeriodStats {
  const out: PeriodStats = {};
  for (const r of rows) out[r.metric as PeriodMetric] = { value: num(r.value), previous: num(r.previous), early: !!r.early };
  return out;
}

// ---- business_member_growth --------------------------------------------------------

export interface GrowthWeek {
  /** Monday, the business's calendar. */
  weekStart: string;
  joined: number;
  ended: number;
  net: number;
  /** Members at the end of the week (once per person, both membership systems). */
  active: number;
}

export function growthOf(rows: { week_start: string; joined: unknown; ended: unknown; net: unknown; members_at_end: unknown }[]): GrowthWeek[] {
  return rows
    .map((r) => ({ weekStart: String(r.week_start).slice(0, 10), joined: num(r.joined) ?? 0, ended: num(r.ended) ?? 0, net: num(r.net) ?? 0, active: num(r.members_at_end) ?? 0 }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (iso: string, n: number) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
export const mondayOf = (iso: string) => addDays(iso, -((dateOf(iso).getDay() + 6) % 7));
const weeksBetween = (a: string, b: string) => Math.round((dateOf(mondayOf(b)).getTime() - dateOf(mondayOf(a)).getTime()) / (7 * 86_400_000));

/**
 * How many weeks to ask business_member_growth for (its weeks always end with
 * this week): the chart shows the weeks from the range's first Monday to this
 * week, at least 8 (AN4-005 O10), and the same number again before them for
 * the previous-period line. Capped at the reader's 52.
 */
export function growthWeeksFor(rangeFrom: string, today: string): { shown: number; ask: number } {
  const shown = Math.min(26, Math.max(8, weeksBetween(rangeFrom, today) + 1));
  return { shown, ask: Math.min(52, shown * 2) };
}

/** The chart's weeks and the same number of weeks just before (null when the reader did not go back that far). */
export function growthSeries(weeks: GrowthWeek[], shown: number): { cur: GrowthWeek[]; prev: GrowthWeek[] | null } {
  const cur = weeks.slice(-shown);
  const before = weeks.slice(0, Math.max(0, weeks.length - shown));
  return { cur, prev: before.length >= cur.length ? before.slice(-cur.length) : null };
}

/** Members at the end of the week holding `day` (null: that week is not in the rows). */
export function activeAtWeekOf(weeks: GrowthWeek[], day: string): number | null {
  const w = mondayOf(day);
  return weeks.find((x) => x.weekStart === w)?.active ?? null;
}

// ---- business_people_summary -------------------------------------------------------

export type PeopleMetric =
  | "class_clients"
  | "bookings_per_week_4w"
  | "class_clients_at_risk_21d"
  | "members"
  | "visits_per_week_4w"
  | "members_not_seen_14d"
  | "customers"
  | "customers_ordered_again"
  | "appointment_clients";

export type PeopleSummary = Partial<Record<PeopleMetric, number>>;

export function peopleSummaryOf(rows: { metric: string; value: unknown }[]): PeopleSummary {
  const out: PeopleSummary = {};
  for (const r of rows) {
    const v = num(r.value);
    if (v !== null) out[r.metric as PeopleMetric] = v;
  }
  return out;
}

// ---- business_first_90_days ------------------------------------------------------------

export interface First90 {
  joined: number;
  stillActive: number;
  /** Average check-ins per new member (null: nobody joined). */
  averageVisits: number | null;
  bookedAClass: number;
}

export function first90Of(row: { joined: unknown; still_active: unknown; average_visits: unknown; booked_a_class: unknown } | undefined): First90 | null {
  if (!row) return null;
  return { joined: num(row.joined) ?? 0, stillActive: num(row.still_active) ?? 0, averageVisits: num(row.average_visits), bookedAClass: num(row.booked_a_class) ?? 0 };
}

// ---- business_plan_figures (MB-04) ---------------------------------------------------------

export interface PlanFigure {
  planId: string;
  name: string;
  status: string;
  activeNow: number;
  /** New sales in the range (not renewals). */
  sold: number;
  soldPrevious: number;
}

/** Most members first, then most sold, then by name. */
export function planFiguresOf(rows: { plan_id: string; plan_name: string | null; status: string | null; active_now: unknown; sold: unknown; sold_previous: unknown }[]): PlanFigure[] {
  return rows
    .map((r) => ({ planId: r.plan_id, name: r.plan_name?.trim() || t("Plan"), status: r.status ?? "active", activeNow: num(r.active_now) ?? 0, sold: num(r.sold) ?? 0, soldPrevious: num(r.sold_previous) ?? 0 }))
    .sort((a, b) => b.activeNow - a.activeNow || b.sold - a.sold || a.name.localeCompare(b.name));
}

// ---- business_invites_funnel ---------------------------------------------------------------

export interface InvitesFunnel {
  issued: number;
  redeemed: number;
  expiredUnused: number;
  becameMembers: number;
}

export function funnelOf(row: { codes_issued: unknown; codes_redeemed: unknown; codes_expired_unused: unknown; became_members: unknown } | undefined): InvitesFunnel | null {
  if (!row) return null;
  return { issued: num(row.codes_issued) ?? 0, redeemed: num(row.codes_redeemed) ?? 0, expiredUnused: num(row.codes_expired_unused) ?? 0, becameMembers: num(row.became_members) ?? 0 };
}

// ---- business_day (DI-04) --------------------------------------------------------------------

export interface DayItem {
  kind: "class" | "appointment";
  refId: string;
  startsAt: string;
  endsAt: string;
  title: string;
  booked: number;
  capacity: number;
  staffFirstName: string | null;
  /** Masked unless shared ("Member #NNNN"); appointments only. */
  clientLabel: string | null;
  clientIsMinor: boolean;
  cancelled: boolean;
}

export function dayOf(
  rows: { kind: string; ref_id: string; starts_at: string; ends_at: string | null; title: string | null; booked: unknown; capacity: unknown; staff_first_name: string | null; client_label: string | null; client_is_minor: boolean | null; cancelled: boolean | null }[],
): DayItem[] {
  return rows.map((r) => ({
    kind: r.kind === "appointment" ? "appointment" : "class",
    refId: r.ref_id,
    startsAt: r.starts_at,
    endsAt: r.ends_at ?? r.starts_at,
    title: r.title?.trim() || (r.kind === "appointment" ? t("Appointment") : t("Class")),
    booked: num(r.booked) ?? 0,
    capacity: num(r.capacity) ?? 0,
    staffFirstName: r.staff_first_name?.trim() || null,
    clientLabel: r.client_label,
    clientIsMinor: !!r.client_is_minor,
    cancelled: !!r.cancelled,
  }));
}

// ---- class_analytics (CL-07) ----------------------------------------------------------------

export interface ClassAnalyticsRow {
  /** "" when the class has no type. */
  classType: string;
  title: string;
  sessions: number;
  averageFillPct: number | null;
  bookings: number;
  /** Cancelled by the member (not by the venue). */
  cancellations: number;
  /** Bookings that were the person's first ever with the business. */
  newClients: number;
  returningClients: number;
  /** Of those whose first class was this one, the share who booked again within 30 days. */
  returnRatePct: number | null;
}

export function classAnalyticsOf(
  rows: { class_type: string | null; title: string; sessions: unknown; average_fill_pct: unknown; bookings: unknown; cancellations: unknown; new_clients: unknown; returning_clients: unknown; return_rate_pct: unknown }[],
): ClassAnalyticsRow[] {
  return rows.map((r) => ({
    classType: r.class_type ?? "",
    title: r.title,
    sessions: num(r.sessions) ?? 0,
    averageFillPct: num(r.average_fill_pct),
    bookings: num(r.bookings) ?? 0,
    cancellations: num(r.cancellations) ?? 0,
    newClients: num(r.new_clients) ?? 0,
    returningClients: num(r.returning_clients) ?? 0,
    returnRatePct: num(r.return_rate_pct),
  }));
}

// ---- instructor_scorecard (TM-04) --------------------------------------------------------------

export interface ScorecardRow {
  professionalId: string;
  firstName: string | null;
  classes: number;
  averageFillPct: number | null;
  rating: number | null;
  reviews: number;
  /** pay_rate_per_class × classes (null: no rate agreed). */
  pay: number | null;
  /** Recorded revenue from their classes in the range. */
  recordedRevenue: number;
}

export function scorecardOf(
  rows: { professional_id: string; first_name: string | null; classes: unknown; average_fill_pct: unknown; rating: unknown; reviews: unknown; pay: unknown; recorded_revenue: unknown }[],
): ScorecardRow[] {
  return rows.map((r) => ({
    professionalId: r.professional_id,
    firstName: r.first_name?.trim() || null,
    classes: num(r.classes) ?? 0,
    averageFillPct: num(r.average_fill_pct),
    rating: num(r.rating),
    reviews: num(r.reviews) ?? 0,
    pay: num(r.pay),
    recordedRevenue: num(r.recorded_revenue) ?? 0,
  }));
}

// ---- business_client_outcomes (DI-07) -------------------------------------------------------------

export interface ClientOutcomes {
  sharing: number;
  /** False below 5 sharers: every figure is null then. */
  enough: boolean;
  workoutsPerWeek: number | null;
  dailySteps: number | null;
  restingBpm: number | null;
  bookingsPerWeek: number | null;
}

export function outcomesOf(
  row: { sharing: unknown; enough_to_show: boolean | null; average_workouts_per_week: unknown; average_daily_steps: unknown; average_resting_bpm: unknown; attendance_bookings_per_week: unknown } | undefined,
): ClientOutcomes | null {
  if (!row) return null;
  const enough = !!row.enough_to_show;
  // Below five the reader sends nulls; never show a figure it did not mean to send.
  return {
    sharing: num(row.sharing) ?? 0,
    enough,
    workoutsPerWeek: enough ? num(row.average_workouts_per_week) : null,
    dailySteps: enough ? num(row.average_daily_steps) : null,
    restingBpm: enough ? num(row.average_resting_bpm) : null,
    bookingsPerWeek: enough ? num(row.attendance_bookings_per_week) : null,
  };
}

// ---- wording shared by the screens ----------------------------------------------------------------

const MINUS = "−";
/** "+3", "−2", "0" (U+2212 minus). */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : "0");
/** Percent change, "+6%" / "−4%" / "0%"; null when there is nothing before. */
export function pctChange(now: number, before: number | null): string | null {
  if (before === null || before <= 0) return null;
  const p = Math.round(((now - before) / before) * 100);
  return p > 0 ? `+${p}%` : p < 0 ? `${MINUS}${Math.abs(p)}%` : "0%";
}
